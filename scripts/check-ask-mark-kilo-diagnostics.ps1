$ErrorActionPreference = 'Stop'
$modulePath = Join-Path $PSScriptRoot 'ask-mark-kilo-diagnostics.psm1'
Import-Module $modulePath -Force

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function New-TestRunRoot {
  $candidate = Join-Path ([System.IO.Path]::GetTempPath()) ('ask-mark-kilo-' + [guid]::NewGuid().ToString('N'))
  if (Test-Path -LiteralPath $candidate) { throw 'Test temp root collision.' }
  New-Item -ItemType Directory -Path $candidate | Out-Null
  return $candidate
}

function Start-TestHelper([string]$HelperPath, [string]$SettingsPath) {
  $powershellExe = Join-Path $PSHOME 'powershell.exe'
  $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $HelperPath + '"'), '-Settings', ('"' + $SettingsPath + '"'))
  return Start-Process -FilePath $powershellExe -ArgumentList $arguments -PassThru -WindowStyle Hidden
}

function Wait-ForFile([string]$Path, [System.Diagnostics.Process]$Process) {
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    if (Test-Path -LiteralPath $Path -PathType Leaf) { return $true }
    if ($Process.HasExited) { return $false }
    Start-Sleep -Milliseconds 50
  }
  return $false
}

function Release-TestHelper([System.Diagnostics.Process]$Process, [string]$ReleasePath) {
  [System.IO.File]::WriteAllText($ReleasePath, 'release')
  if (-not $Process.WaitForExit(5000)) {
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    throw 'Test helper did not stop within its bound.'
  }
  $Process.Dispose()
}

$testRoot = New-TestRunRoot
$createdRoots = @($testRoot)
$helperPath = Join-Path $testRoot 'log-helper.ps1'
$helperSource = @'
param([Parameter(Mandatory=$true)][string]$Settings)
$ErrorActionPreference = 'Stop'
$settingsValue = Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json
if ($settingsValue.action -eq 'lock') {
  $held = [System.IO.File]::Open($settingsValue.path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
  [System.IO.File]::WriteAllText($settingsValue.readyPath, 'ready')
  $deadline = [DateTime]::UtcNow.AddSeconds(8)
  while (-not (Test-Path -LiteralPath $settingsValue.releasePath) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 50 }
  $held.Dispose()
} elseif ($settingsValue.action -eq 'delayed-write') {
  Start-Sleep -Milliseconds $settingsValue.delayMilliseconds
  [System.IO.File]::WriteAllText($settingsValue.path, $settingsValue.content)
}
'@
[System.IO.File]::WriteAllText($helperPath, $helperSource)
$lockProcess = $null
$cleanupLockProcess = $null

try {
  $lockLog = Join-Path $testRoot 'worker.stdout.log'
  $eventText = 'ASK_MARK_LOCAL_AI_DIAGNOSTIC {"code":"provider_timeout","providerCallAttempted":true,"elapsedMs":10002,"overallElapsedMs":10125,"responseHeadersReceived":false,"httpStatusReceived":false,"timeoutSource":"attempt_deadline","attemptNumber":1,"modelId":"nvidia/nemotron-3.5-super-vl:free","prompt":"RAW_PRIVATE_SENTINEL","apiKey":"TEST_SECRET_SENTINEL","response":"RAW_RESPONSE_SENTINEL","reasoningText":"RAW_REASONING_SENTINEL","providerMessage":"RAW_ERROR_SENTINEL"}' + [Environment]::NewLine + 'ASK_MARK_LOCAL_AI_DIAGNOSTIC {"code":"request_aborted","providerCallAttempted":true,"elapsedMs":42,"overallElapsedMs":128,"responseHeadersReceived":true,"httpStatusReceived":true,"httpStatus":200,"abortSource":"client_request","attemptNumber":1,"modelId":"nvidia/nemotron-3.5-super-vl:free"}' + [Environment]::NewLine + 'ASK_MARK_LOCAL_AI_DIAGNOSTIC {"code":"provider_incomplete_generation","providerCallAttempted":true,"elapsedMs":81,"overallElapsedMs":220,"httpStatus":200,"completionTokens":240,"usageMetadataInconsistent":true,"finishReason":"length","attemptNumber":2,"modelId":"dots-studio/dots-3-note-preview:free"}'
  [System.IO.File]::WriteAllText($lockLog, $eventText)
  $lockReady = Join-Path $testRoot 'lock.ready'
  $lockRelease = Join-Path $testRoot 'lock.release'
  $lockSettings = Join-Path $testRoot 'lock-settings.json'
  [System.IO.File]::WriteAllText($lockSettings, (@{ action = 'lock'; path = $lockLog; readyPath = $lockReady; releasePath = $lockRelease } | ConvertTo-Json -Compress))
  $lockProcess = Start-TestHelper $helperPath $lockSettings
  Assert-True (Wait-ForFile $lockReady $lockProcess) 'Exclusive log lock helper failed to signal readiness.'

  $lockedResult = Read-AskMarkKiloDiagnostics -Paths @($lockLog) -MaxAttempts 3 -RetryDelayMilliseconds 20
  Assert-True ($lockedResult.status -eq 'inaccessible') 'An exclusively locked log was not classified inaccessible.'
  Write-Output 'PASS: log held open by another process is reported inaccessible within bounded retries.'

  Release-TestHelper $lockProcess $lockRelease
  $lockProcess = $null
  $releasedResult = Read-AskMarkKiloDiagnostics -Paths @($lockLog) -MaxAttempts 3 -RetryDelayMilliseconds 20
  Assert-True ($releasedResult.status -eq 'found') 'Released log was not read.'
  Assert-True ($releasedResult.events[0].code -eq 'provider_timeout') 'Released diagnostic reason was not extracted.'
  Assert-True ($releasedResult.events[0].providerCallAttempted -eq $true) 'Provider-call flag was not extracted.'
  Assert-True ($releasedResult.events[0].elapsedMs -eq 10002) 'Bounded attempt duration was not extracted.'
  Assert-True ($releasedResult.events[0].overallElapsedMs -eq 10125) 'Overall adapter elapsed time was not extracted.'
  Assert-True ($releasedResult.events[0].responseHeadersReceived -eq $false) 'Response-header receipt was not extracted.'
  Assert-True ($releasedResult.events[0].httpStatusReceived -eq $false) 'HTTP-status receipt was not extracted.'
  Assert-True ($releasedResult.events[0].timeoutSource -eq 'attempt_deadline') 'Timeout source was not extracted.'
  Assert-True ($releasedResult.events[0].attemptNumber -eq 1) 'Bounded provider attempt number was not extracted.'
  Assert-True ($releasedResult.events[0].modelId -eq 'nvidia/nemotron-3.5-super-vl:free') 'Allowlisted model ID was not extracted.'
  Assert-True ($releasedResult.events.Count -eq 3) 'All safe provider diagnostics were not extracted.'
  Assert-True ($releasedResult.events[1].code -eq 'request_aborted' -and $releasedResult.events[1].abortSource -eq 'client_request') 'Client abort source was not extracted.'
  Assert-True ($releasedResult.events[1].responseHeadersReceived -eq $true -and $releasedResult.events[1].httpStatus -eq 200) 'Headers and status after client cancellation were not extracted.'
  Assert-True ($releasedResult.events[2].usageMetadataInconsistent -eq $true -and $releasedResult.events[2].completionTokens -eq 240) 'Inconsistent usage metadata was not safely flagged.'
  $safeJson = $releasedResult.events | ConvertTo-Json -Compress
  Assert-True ($safeJson -notmatch 'RAW_PRIVATE_SENTINEL|TEST_SECRET_SENTINEL|RAW_RESPONSE_SENTINEL|RAW_REASONING_SENTINEL|RAW_ERROR_SENTINEL|prompt|apiKey|reasoningText|providerMessage') 'Raw fields leaked from a diagnostic event.'
  Write-Output 'PASS: clean log release permits safe allowlisted diagnostic extraction.'

  $delayedLog = Join-Path $testRoot 'delayed.stderr.log'
  $delayedSettings = Join-Path $testRoot 'delayed-settings.json'
  $delayedText = 'ASK_MARK_LOCAL_AI_DIAGNOSTIC {"code":"output_not_grounded","providerCallAttempted":true,"elapsedMs":81,"httpStatus":null,"response":"RAW_RESPONSE_SENTINEL"}'
  [System.IO.File]::WriteAllText($delayedSettings, (@{ action = 'delayed-write'; path = $delayedLog; delayMilliseconds = 150; content = $delayedText } | ConvertTo-Json -Compress))
  $delayedProcess = Start-TestHelper $helperPath $delayedSettings
  $delayedResult = Read-AskMarkKiloDiagnostics -Paths @($delayedLog) -MaxAttempts 20 -RetryDelayMilliseconds 200
  Assert-True ($delayedResult.status -eq 'found' -and $delayedResult.events[0].code -eq 'output_not_grounded') 'Delayed diagnostic log was not collected.'
  Assert-True ($delayedProcess.WaitForExit(3000)) 'Delayed log helper did not terminate.'
  $delayedProcess.Dispose()
  Write-Output 'PASS: delayed log creation is collected within the bounded retry window.'

  $missingResult = Read-AskMarkKiloDiagnostics -Paths @(Join-Path $testRoot 'missing.log') -MaxAttempts 2 -RetryDelayMilliseconds 10
  Assert-True ($missingResult.status -eq 'missing') 'Missing log was not distinguished from a provider failure.'
  Write-Output 'PASS: missing diagnostic log is reported without inventing a provider reason.'

  $unknownCodeLog = Join-Path $testRoot 'unknown-code.log'
  [System.IO.File]::WriteAllText($unknownCodeLog, 'ASK_MARK_LOCAL_AI_DIAGNOSTIC {"code":"not_allowlisted","providerCallAttempted":true,"modelId":"paid/model","apiKey":"TEST_SECRET_SENTINEL"}')
  $unknownCodeResult = Read-AskMarkKiloDiagnostics -Paths @($unknownCodeLog) -MaxAttempts 1 -RetryDelayMilliseconds 0
  Assert-True ($unknownCodeResult.status -eq 'no_event' -and $unknownCodeResult.events.Count -eq 0) 'Non-allowlisted diagnostic code was accepted.'
  Write-Output 'PASS: only allowlisted codes and metadata are returned.'

  $successRoot = New-TestRunRoot
  $createdRoots += $successRoot
  [System.IO.File]::WriteAllText((Join-Path $successRoot 'fixture.txt'), 'synthetic')
  $successCleanup = Remove-AskMarkKiloRunRoot -Path $successRoot -MaxAttempts 2 -RetryDelayMilliseconds 10
  Assert-True ($successCleanup.status -eq 'removed' -and -not (Test-Path -LiteralPath $successRoot)) 'Successful-run temp cleanup failed.'
  Write-Output 'PASS: successful-run disposable cleanup removes only its unique temp root.'

  $failedRoot = New-TestRunRoot
  $createdRoots += $failedRoot
  $failedLog = Join-Path $failedRoot 'worker.log'
  [System.IO.File]::WriteAllText($failedLog, 'synthetic failure output')
  $cleanupReady = Join-Path $failedRoot 'lock.ready'
  $cleanupRelease = Join-Path $failedRoot 'lock.release'
  $cleanupSettings = Join-Path $failedRoot 'lock-settings.json'
  [System.IO.File]::WriteAllText($cleanupSettings, (@{ action = 'lock'; path = $failedLog; readyPath = $cleanupReady; releasePath = $cleanupRelease } | ConvertTo-Json -Compress))
  $cleanupLockProcess = Start-TestHelper $helperPath $cleanupSettings
  Assert-True (Wait-ForFile $cleanupReady $cleanupLockProcess) 'Cleanup lock helper failed to signal readiness.'
  $failedCleanup = Remove-AskMarkKiloRunRoot -Path $failedRoot -MaxAttempts 2 -RetryDelayMilliseconds 10
  Assert-True ($failedCleanup.status -eq 'inaccessible' -and (Test-Path -LiteralPath $failedRoot)) 'Locked failed-run root was removed unsafely or misclassified.'
  Release-TestHelper $cleanupLockProcess $cleanupRelease
  $cleanupLockProcess = $null
  $retryCleanup = Remove-AskMarkKiloRunRoot -Path $failedRoot -MaxAttempts 3 -RetryDelayMilliseconds 10
  Assert-True ($retryCleanup.status -eq 'removed' -and -not (Test-Path -LiteralPath $failedRoot)) 'Failed-run temp cleanup did not succeed after release.'
  Write-Output 'PASS: failed-run cleanup is bounded, preserves locked data, and succeeds after release.'

  Assert-True ($releasedResult.events[0].code -eq 'provider_timeout' -and $releasedResult.events[0].providerCallAttempted) 'Deterministic fallback diagnostic was altered.'
  Write-Output 'PASS: diagnostic collection preserves deterministic fallback reason and provider-call status.'
  Write-Output 'All Kilo diagnostic log tests passed.'
} finally {
  foreach ($helperProcess in @($lockProcess, $cleanupLockProcess)) {
    if ($null -ne $helperProcess) {
      try { Stop-Process -Id $helperProcess.Id -Force -ErrorAction SilentlyContinue } catch { }
      try { $helperProcess.Dispose() } catch { }
    }
  }
  foreach ($rootPath in $createdRoots) {
    if (Test-Path -LiteralPath $rootPath) {
      $result = Remove-AskMarkKiloRunRoot -Path $rootPath -MaxAttempts 20 -RetryDelayMilliseconds 100
      if ($result.status -notin @('removed','already_absent')) { throw 'A test-created temp root could not be cleaned.' }
    }
  }
}
