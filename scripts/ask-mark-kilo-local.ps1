[CmdletBinding()]
param(
  [ValidateSet('PRECHECK', 'SMOKE')]
  [string]$Mode = 'PRECHECK',
  [switch]$OwnerAuthorizedSyntheticSmoke
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Worker = Join-Path $Root 'workers/ask-mark'
$ConfigPath = Join-Path $Worker 'wrangler.jsonc'
$MigrationPath = Join-Path $Worker 'migrations'
$SeedPath = Join-Path $Worker 'seeds/approved-knowledge.v1.json'
$ImporterPath = Join-Path $Root 'scripts/import-ask-mark-seed.mjs'
$SmokePath = Join-Path $Root 'scripts/smoke-ask-mark-kilo.mjs'
$WorkerLauncher = Join-Path $Root 'scripts/ask-mark-kilo-worker.mjs'
$NodePath = 'C:\Users\Mark\.codex\toolchains\node-v22.23.4\node.exe'
$WranglerPath = Join-Path $Root 'node_modules/wrangler/bin/wrangler.js'
$SecretPath = Join-Path $Worker '.dev.vars'
$BaseUrl = 'http://127.0.0.1:8787'
$ModelIds = @('nvidia/nemotron-3.5-super-vl:free', 'dots-studio/dots-3-note-preview:free')
$CatalogUrl = 'https://ai-gateway.kilo.ai/api/v1/models'
Import-Module (Join-Path $PSScriptRoot 'ask-mark-kilo-diagnostics.psm1') -Force

function Stop-Run([string]$Message) {
  throw $Message
}

function Test-PortAvailable([int]$Port) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), $Port)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    $listener.Stop()
  }
}

function Invoke-QuietNode([string[]]$Arguments, [string]$StdoutPath, [string]$StderrPath, [int]$TimeoutMilliseconds = 0) {
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $NodePath
  $startInfo.WorkingDirectory = $Root
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $quoted = @($Arguments | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' })
  $startInfo.Arguments = $quoted -join ' '
  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $stdoutFile = [System.IO.File]::Create($StdoutPath)
  $stderrFile = [System.IO.File]::Create($StderrPath)
  try {
    if (-not $process.Start()) { Stop-Run 'A local validation process could not be started.' }
    $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdoutFile)
    $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderrFile)
    $processExited = $true
    if ($TimeoutMilliseconds -gt 0) { $processExited = $process.WaitForExit($TimeoutMilliseconds) }
    else { $process.WaitForExit() }
    if (-not $processExited) {
      try { $process.Kill() } catch { }
      if (-not $process.WaitForExit(5000)) {
        try { & taskkill.exe /PID $process.Id /T /F *> $null } catch { }
        $null = $process.WaitForExit(5000)
      }
      if (-not $process.HasExited) { Stop-Run 'A timed-out local validation process could not be stopped.' }
    }
    $null = $stdoutTask.GetAwaiter().GetResult()
    $null = $stderrTask.GetAwaiter().GetResult()
    if (-not $processExited) { return 124 }
    return $process.ExitCode
  } finally {
    $stdoutFile.Dispose()
    $stderrFile.Dispose()
    $process.Dispose()
  }
}

function Get-CatalogModels($Catalog) {
  if ($Catalog -is [System.Array]) { return $Catalog }
  if ($Catalog.models -is [System.Array]) { return $Catalog.models }
  if ($Catalog.data -is [System.Array]) { return $Catalog.data }
  return @()
}

function Test-ExplicitZero([object]$Value) {
  if ($null -eq $Value -or $Value -is [bool]) { return $false }
  $number = 0.0
  if (-not [double]::TryParse([string]$Value, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) { return $false }
  return $number -eq 0.0
}

$RunRoot = $null
$WorkerProcess = $null
$WorkerChildPidPath = $null
$WorkerStopped = $false
$WorkerWasStarted = $false
$CreatedRunRoot = $false
$ExitCode = 0
$SavedApiUrl = $env:ASK_MARK_LOCAL_API_URL
$SavedWranglerWriteLogs = $env:WRANGLER_WRITE_LOGS
$SavedWranglerMetrics = $env:WRANGLER_SEND_METRICS
$SavedCi = $env:CI
$PortAvailableAfterCleanup = $false

function Test-ProcessPresent([int]$ProcessIdValue) {
  try {
    $null = Get-Process -Id $ProcessIdValue -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Stop-LocalWorker {
  if ($WorkerStopped) { return (Test-PortAvailable 8787) }
  if ($null -eq $WorkerProcess) {
    $script:WorkerStopped = Test-PortAvailable 8787
    return $script:WorkerStopped
  }
  if (-not $WorkerWasStarted) {
    try { $workerOutStream.Dispose() } catch { }
    try { $workerErrStream.Dispose() } catch { }
    try { $WorkerProcess.Dispose() } catch { }
    $script:WorkerStopped = Test-PortAvailable 8787
    return $script:WorkerStopped
  }

  $processIds = @()
  if (Test-Path -LiteralPath $WorkerChildPidPath -PathType Leaf) {
    try {
      $childPidText = [System.IO.File]::ReadAllText($WorkerChildPidPath)
      $childPid = 0
      if ([int]::TryParse($childPidText.Trim(), [ref]$childPid) -and $childPid -gt 0) { $processIds += $childPid }
    } catch { }
  }
  $processIds += $WorkerProcess.Id
  $processIds = @($processIds | Select-Object -Unique)

  foreach ($processIdValue in $processIds) {
    if (Test-ProcessPresent $processIdValue) {
      try { & taskkill.exe /PID $processIdValue /T /F *> $null } catch { }
    }
  }

  try {
    if (-not $WorkerProcess.HasExited) { $null = $WorkerProcess.WaitForExit(5000) }
  } catch { }

  $processesStopped = $false
  for ($verifyAttempt = 0; $verifyAttempt -lt 20; $verifyAttempt += 1) {
    $remaining = @($processIds | Where-Object { Test-ProcessPresent $_ })
    if ($remaining.Count -eq 0) { $processesStopped = $true; break }
    if ($verifyAttempt -lt 19) { Start-Sleep -Milliseconds 250 }
  }

  $streamsStopped = $true
  foreach ($copyTask in @($workerOutTask, $workerErrTask)) {
    if ($null -ne $copyTask) {
      try {
        if (-not $copyTask.Wait(5000)) { $streamsStopped = $false }
        elseif ($copyTask.IsFaulted) { $copyTask.GetAwaiter().GetResult() | Out-Null }
      } catch { $streamsStopped = $false }
    }
  }
  try { $workerOutStream.Dispose() } catch { }
  try { $workerErrStream.Dispose() } catch { }
  try { $WorkerProcess.Dispose() } catch { }

  $portReleased = $false
  for ($portAttempt = 0; $portAttempt -lt 20; $portAttempt += 1) {
    if (Test-PortAvailable 8787) { $portReleased = $true; break }
    if ($portAttempt -lt 19) { Start-Sleep -Milliseconds 250 }
  }

  $script:WorkerStopped = $processesStopped -and $streamsStopped -and $portReleased
  return $script:WorkerStopped
}

try {
  $env:WRANGLER_WRITE_LOGS = 'false'
  $env:WRANGLER_SEND_METRICS = 'false'
  $env:CI = '1'
  if ($Mode -eq 'SMOKE') {
    if (-not $OwnerAuthorizedSyntheticSmoke) { Stop-Run 'SMOKE requires -OwnerAuthorizedSyntheticSmoke after separate owner authorization.' }
    if ($env:ASK_MARK_KILO_SMOKE_APPROVED -cne 'YES') { Stop-Run 'SMOKE requires ASK_MARK_KILO_SMOKE_APPROVED=YES after separate owner authorization.' }
  }

  if ((Get-Location).Path -ne $Root) { Stop-Run 'Run this script from the repository root.' }
  if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { Stop-Run 'The pinned Node.js 22 executable is missing.' }
  $nodeVersion = (& $NodePath --version 2>$null | Out-String).Trim()
  if ($nodeVersion -ne 'v22.23.4') { Stop-Run 'The pinned Node.js runtime did not report v22.23.4.' }
  if (-not (Test-Path -LiteralPath $WranglerPath -PathType Leaf)) { Stop-Run 'The project-local Wrangler installation is missing.' }
  if (-not (Test-Path -LiteralPath $ImporterPath -PathType Leaf) -or -not (Test-Path -LiteralPath $SmokePath -PathType Leaf) -or -not (Test-Path -LiteralPath $WorkerLauncher -PathType Leaf)) { Stop-Run 'An existing Ask Mark seed, Worker launcher, or smoke script is missing.' }
  if (-not (Test-Path -LiteralPath $MigrationPath -PathType Container) -or -not (Test-Path -LiteralPath $SeedPath -PathType Leaf)) { Stop-Run 'Ask Mark migrations or approved synthetic knowledge are missing.' }
  if (-not (Test-Path -LiteralPath $SecretPath -PathType Leaf)) { Stop-Run 'The required ignored local secret file workers/ask-mark/.dev.vars is missing.' }

  & git -C $Root check-ignore --quiet -- workers/ask-mark/.dev.vars 2>$null
  if ($LASTEXITCODE -ne 0) { Stop-Run 'The local secret file is not Git-ignored.' }

  try {
    $configText = [System.IO.File]::ReadAllText($ConfigPath)
    $config = $configText | ConvertFrom-Json
  } catch {
    Stop-Run 'Ask Mark local Wrangler configuration is invalid JSON.'
  }
  if ($config.name -ne 'ask-mark-foundation-local' -or $config.workers_dev -ne $false) { Stop-Run 'Ask Mark local Wrangler identity or exposure settings do not match the expected local configuration.' }
  if (@($config.compatibility_flags) -notcontains 'enable_request_signal') { Stop-Run 'Local Worker request-cancellation signaling is not enabled.' }
  if ($config.d1_databases.Count -ne 1 -or $config.d1_databases[0].binding -ne 'ASK_MARK_DB' -or $config.d1_databases[0].database_name -ne 'ask-mark-knowledge-local' -or $config.d1_databases[0].database_id -ne '00000000-0000-0000-0000-000000000000') { Stop-Run 'Ask Mark local D1 configuration does not match the expected placeholder database.' }
  if ($config.d1_databases[0].migrations_dir -ne 'migrations') { Stop-Run 'Ask Mark migration directory is not the expected local directory.' }
  if ($config.d1_databases[0].remote -eq $true) { Stop-Run 'Remote D1 bindings are not allowed by this runner.' }

  if (-not (Test-PortAvailable 8787)) { Stop-Run 'Port 8787 on 127.0.0.1 is already occupied; no Worker was started.' }

  $RunRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('ask-mark-kilo-' + [guid]::NewGuid().ToString('N'))
  if (Test-Path -LiteralPath $RunRoot) { Stop-Run 'The unique disposable run directory unexpectedly already exists.' }
  New-Item -ItemType Directory -Path $RunRoot -ErrorAction Stop | Out-Null
  $CreatedRunRoot = $true
  $StatePath = Join-Path $RunRoot 'd1-state'
  $ScratchPath = Join-Path $RunRoot 'seed-import-scratch'
  $WorkerChildPidPath = Join-Path $RunRoot 'worker.child.pid'
  $MigrationOut = Join-Path $RunRoot 'migrations.stdout.log'
  $MigrationErr = Join-Path $RunRoot 'migrations.stderr.log'
  $SeedOut = Join-Path $RunRoot 'seed.stdout.log'
  $SeedErr = Join-Path $RunRoot 'seed.stderr.log'
  $WorkerOut = Join-Path $RunRoot 'worker.stdout.log'
  $WorkerErr = Join-Path $RunRoot 'worker.stderr.log'

  $migrationArgs = @($WranglerPath, 'd1', 'migrations', 'apply', 'ask-mark-knowledge-local', '--local', '--persist-to', $StatePath, '--config', $ConfigPath)
  $migrationStatus = Invoke-QuietNode $migrationArgs $MigrationOut $MigrationErr
  if ($migrationStatus -ne 0) { Stop-Run "Disposable local D1 migrations failed (exit $migrationStatus); no log contents were displayed." }

  $seedArgs = @($ImporterPath, '--persist-to', $StatePath, '--scratch-dir', $ScratchPath)
  if ((Invoke-QuietNode $seedArgs $SeedOut $SeedErr) -ne 0) { Stop-Run 'Approved synthetic knowledge could not be loaded into the disposable local D1 database; no log contents were displayed.' }

  if (Test-Path -LiteralPath $ScratchPath) { Stop-Run 'Seed importer scratch data remains after a successful import.' }
  if (-not (Test-Path -LiteralPath $StatePath -PathType Container)) { Stop-Run 'The disposable local D1 persistence directory was not created.' }

  $launcherSettings = @{ state = $StatePath; config = $ConfigPath; pidFile = $WorkerChildPidPath; port = 8787 } | ConvertTo-Json -Compress
  $encodedSettings = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($launcherSettings))
  $devArgs = @('"' + $WorkerLauncher + '"', '--settings', $encodedSettings)
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $NodePath
  $startInfo.WorkingDirectory = $Root
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.Arguments = $devArgs -join ' '
  $WorkerProcess = [System.Diagnostics.Process]::new()
  $WorkerProcess.StartInfo = $startInfo
  $workerOutStream = [System.IO.FileStream]::new($WorkerOut, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  $workerErrStream = [System.IO.FileStream]::new($WorkerErr, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
  if (-not $WorkerProcess.Start()) { Stop-Run 'The local Worker process could not be started.' }
  $WorkerWasStarted = $true
  $workerOutTask = $WorkerProcess.StandardOutput.BaseStream.CopyToAsync($workerOutStream)
  $workerErrTask = $WorkerProcess.StandardError.BaseStream.CopyToAsync($workerErrStream)

  $healthy = $false
  $lastHealthStatus = 'no-response'
  for ($attempt = 0; $attempt -lt 80; $attempt += 1) {
    if ($WorkerProcess.HasExited) { break }
    try {
      $health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/v1/health" -TimeoutSec 2
      $lastHealthStatus = 'HTTP-200'
      if ($health.ok -eq $true -and $health.mode -eq 'deterministic-d1' -and $health.release.seedVersion) { $healthy = $true; break }
    } catch {
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $lastHealthStatus = 'HTTP-' + [int]$_.Exception.Response.StatusCode }
    }
    Start-Sleep -Milliseconds 250
  }
  if (-not $healthy) {
    if ($WorkerProcess.HasExited) {
      $startupCategory = 'unclassified Wrangler startup error'
      $workerExitCode = $WorkerProcess.ExitCode
      if (Stop-LocalWorker) {
        try {
          $startupText = ([System.IO.File]::ReadAllText($WorkerOut) + [System.IO.File]::ReadAllText($WorkerErr))
          $missingModule = [regex]::Match($startupText, 'Could not resolve "([^"]+)"')
          if ($missingModule.Success) {
            $moduleName = $missingModule.Groups[1].Value
            if ($moduleName -match '(?i)secret|token|credential|dev\.vars|[A-Za-z0-9_-]{32,}') { $startupCategory = 'Worker module resolution failed' }
            else {
              $normalizedModuleName = $moduleName -replace '\\\\', '\'
              $safeModuleName = $normalizedModuleName.Replace($Root, '<repository>').Replace($RunRoot, '<temporary-run>')
              if ($safeModuleName.Length -gt 180) { $safeModuleName = [System.IO.Path]::GetFileName($moduleName) }
              $existsNote = if ([System.IO.Path]::IsPathRooted($normalizedModuleName)) { "; target exists: $(Test-Path -LiteralPath $normalizedModuleName)" } else { '' }
              $startupCategory = "Worker bundle could not resolve '$safeModuleName'$existsNote"
            }
          }
          elseif ($startupText -match 'ERR_MODULE_NOT_FOUND|Cannot find module') { $startupCategory = 'a local Worker module is missing' }
          elseif ($startupText -match 'EPERM|EACCES|permission denied') { $startupCategory = 'the operating system denied a local Worker operation' }
          elseif ($startupText -match 'EADDRINUSE|address already in use') { $startupCategory = 'the local port became occupied during startup' }
          elseif ($startupText -match 'Invalid config|JSONC|config file') { $startupCategory = 'Wrangler rejected local configuration' }
        } catch {
          $startupCategory = 'startup log unavailable after shutdown'
        }
      } else {
        $startupCategory = 'Worker process shutdown could not be verified'
      }
      Stop-Run "The loopback Worker exited during startup (exit $workerExitCode); health status $lastHealthStatus; $startupCategory."
    }
    Stop-Run "The loopback Worker did not pass deterministic health (status $lastHealthStatus)."
  }

  $queryBody = @{
    message = 'Synthetic test: describe the approved MarkHQ operations project.'
    generative = $false
    contextKey = 'project.markhq'
  } | ConvertTo-Json -Compress
  $query = Invoke-RestMethod -Method Post -Uri "$BaseUrl/v1/query" -ContentType 'application/json' -Body $queryBody -TimeoutSec 8
  if ($query.ok -ne $true -or $query.mode -ne 'deterministic-d1' -or $query.matched -ne $true -or $query.item.key -ne 'project.markhq') { Stop-Run 'Deterministic approved-knowledge retrieval did not return the expected synthetic project.' }

  if ($Mode -eq 'SMOKE') {
    try {
      $catalogResponse = Invoke-WebRequest -Uri $CatalogUrl -Method Get -TimeoutSec 15 -UseBasicParsing
      $catalog = $catalogResponse.Content | ConvertFrom-Json
    } catch {
      Stop-Run 'Kilo live model catalog could not be verified; no generation request was sent.'
    }
    $verifiedModels = @()
    foreach ($modelId in $ModelIds) {
      $model = Get-CatalogModels $catalog | Where-Object { $_.id -ceq $modelId } | Select-Object -First 1
      if ($null -eq $model) { continue }
      $pricing = $model.pricing
      $textInput = @($model.architecture.input_modalities) -contains 'text'
      $textOutput = @($model.architecture.output_modalities) -contains 'text'
      $supportsMaxTokens = @($model.supported_parameters) -contains 'max_tokens'
      if ((Test-ExplicitZero $pricing.prompt) -and (Test-ExplicitZero $pricing.completion) -and $textInput -and $textOutput -and $supportsMaxTokens) {
        $verifiedModels += $modelId
      }
    }
    if ($verifiedModels.Count -eq 0) { Stop-Run 'No approved Kilo model was explicitly verified at zero input/output pricing with text-completion support; no generation request was sent.' }
    Write-Output "Live Kilo catalog verified $($verifiedModels.Count) approved free text model(s)."

    $env:ASK_MARK_LOCAL_API_URL = $BaseUrl
    $SmokeOut = Join-Path $RunRoot 'smoke.stdout.log'
    $SmokeErr = Join-Path $RunRoot 'smoke.stderr.log'
    $smokeArgs = @($SmokePath, '--owner-authorized-synthetic-smoke')
    $smokeStatus = Invoke-QuietNode $smokeArgs $SmokeOut $SmokeErr 46000
    if ($smokeStatus -eq 124) { Stop-Run 'The local smoke client exceeded its 46-second process deadline; the Worker will be stopped and only files created by this run will be removed.' }
    $smokeText = [System.IO.File]::ReadAllText($SmokeOut)
    $localStatus = [regex]::Match($smokeText, 'Local API status:\s*(\d{3})')
    if ($localStatus.Success) { Write-Output "Local API HTTP status: $($localStatus.Groups[1].Value)." }
    if ($smokeText -match 'Synthetic Kilo response used:\s*True') {
      Write-Output 'Synthetic Kilo response used: True (genuine kilo-local response).'
    } elseif ($smokeText -match 'Synthetic Kilo response used:\s*False') {
      Write-Output 'Synthetic Kilo response used: False (deterministic fallback occurred).'
    } else {
      Stop-Run 'The existing synthetic smoke test did not return a recognized safe result; no response content was displayed.'
    }
    Write-Output 'Smoke-script invocation count: 1 (this is not a provider-call count).'
    if (-not (Stop-LocalWorker)) {
      Write-Output 'Local diagnostic collection failed: Worker shutdown or log release could not be verified.'
      Write-Output 'Provider outcome: unknown; no reason is inferred.'
      $ExitCode = 1
    } else {
      $diagnosticResult = Read-AskMarkKiloDiagnostics -Paths @($WorkerOut, $WorkerErr) -MaxAttempts 12 -RetryDelayMilliseconds 100
      if ($diagnosticResult.status -ne 'found') {
        Write-Output "Local diagnostic collection failed: $($diagnosticResult.status)."
        Write-Output 'Provider outcome: unknown; no reason is inferred.'
        $ExitCode = 1
      } else {
        foreach ($attemptEvent in $diagnosticResult.events | Where-Object { $null -ne $_.modelId }) {
          Write-Output "Provider attempt $($attemptEvent.attemptNumber): $($attemptEvent.modelId) ($($attemptEvent.code))."
          if ($null -ne $attemptEvent.elapsedMs) { Write-Output "Attempt duration: $($attemptEvent.elapsedMs) ms." }
          if ($null -ne $attemptEvent.httpStatusReceived) { Write-Output "Provider HTTP status received: $($attemptEvent.httpStatusReceived)." }
          if ($null -ne $attemptEvent.responseHeadersReceived) { Write-Output "Provider response headers received: $($attemptEvent.responseHeadersReceived)." }
          if ($null -ne $attemptEvent.timeoutSource) { Write-Output "Timeout source: $($attemptEvent.timeoutSource)." }
          if ($null -ne $attemptEvent.abortSource) { Write-Output "Abort source: $($attemptEvent.abortSource)." }
          if ($null -ne $attemptEvent.overallElapsedMs) { Write-Output "Adapter elapsed time: $($attemptEvent.overallElapsedMs) ms." }
          if ($null -ne $attemptEvent.httpStatus) { Write-Output "Provider HTTP status: $($attemptEvent.httpStatus)." }
          if ($null -ne $attemptEvent.completionTokens) { Write-Output "Provider completion tokens: $($attemptEvent.completionTokens)." }
          if ($null -ne $attemptEvent.reasoningTokens) { Write-Output "Provider reasoning tokens: $($attemptEvent.reasoningTokens)." }
          if ($null -ne $attemptEvent.contentType) { Write-Output "Provider content type: $($attemptEvent.contentType)." }
          if ($null -ne $attemptEvent.choicesCount) { Write-Output "Provider choices count: $($attemptEvent.choicesCount)." }
          if ($null -ne $attemptEvent.finishReason) { Write-Output "Provider finish reason: $($attemptEvent.finishReason)." }
          if ($attemptEvent.usageMetadataInconsistent -eq $true) { Write-Output 'Provider usage metadata inconsistent: reported reasoning tokens exceeded completion tokens; reasoning count omitted.' }
        }
        $diagnostic = $diagnosticResult.events[-1]
        Write-Output "Local diagnostic reason: $($diagnostic.code)."
        Write-Output "Provider call attempted: $($diagnostic.providerCallAttempted)."
        switch ($diagnostic.code) {
          'model_answer_accepted' { Write-Output 'AI outcome: model answer accepted.' }
          { $_ -in @('provider_timeout','provider_http_error','provider_transport_error','request_aborted') -and $diagnostic.providerCallAttempted } { Write-Output "AI outcome: provider call attempted but failed ($($diagnostic.code))." }
          { $_ -in @('provider_invalid_response','provider_non_json','provider_unexpected_content_type','provider_missing_choices','provider_empty_choices','provider_empty_content','provider_invalid_message_shape','provider_incomplete_generation','provider_content_filtered','model_mismatch','output_not_grounded','output_too_large') } { Write-Output "AI outcome: provider response received but rejected ($($diagnostic.code))." }
          default { Write-Output "AI outcome: no generation call attempted ($($diagnostic.code))." }
        }
        if ($null -ne $diagnostic.elapsedMs -and $null -eq $diagnostic.modelId) { Write-Output "Local diagnostic elapsed time: $($diagnostic.elapsedMs) ms." }
      }
    }
    if ($smokeStatus -ne 0) { $ExitCode = 1 }
  }

  if ($Mode -eq 'PRECHECK') {
    Write-Output 'PRECHECK passed: local configuration, ignored secret-file presence, disposable D1 migrations and seed, Worker health, and deterministic retrieval verified.'
    Write-Output 'Kilo generation requests: 0.'
  }
} catch {
  Write-Error $_.Exception.Message
  $ExitCode = 1
} finally {
  $stopped = Stop-LocalWorker
  if ($WorkerWasStarted -and $stopped) { Write-Output 'Worker process tree shutdown, output-stream release, and loopback port release: verified.' }
  elseif (-not $stopped) {
    Write-Error 'Worker process tree shutdown or loopback port release could not be verified.'
    $ExitCode = 1
  }

  if ($CreatedRunRoot -and (Test-Path -LiteralPath $RunRoot)) {
    $cleanupResult = Remove-AskMarkKiloRunRoot -Path $RunRoot -MaxAttempts 20 -RetryDelayMilliseconds 250
    if ($cleanupResult.status -in @('removed','already_absent')) {
      Write-Output 'Disposable D1 state, logs, and importer scratch cleanup: verified.'
    } else {
      Write-Error 'Disposable run directory cleanup failed; inspect only this uniquely created temporary directory.'
      $ExitCode = 1
    }
  }

  if ($SavedApiUrl -eq $null) { Remove-Item Env:\ASK_MARK_LOCAL_API_URL -ErrorAction SilentlyContinue } else { $env:ASK_MARK_LOCAL_API_URL = $SavedApiUrl }
  if ($SavedWranglerWriteLogs -eq $null) { Remove-Item Env:\WRANGLER_WRITE_LOGS -ErrorAction SilentlyContinue } else { $env:WRANGLER_WRITE_LOGS = $SavedWranglerWriteLogs }
  if ($SavedWranglerMetrics -eq $null) { Remove-Item Env:\WRANGLER_SEND_METRICS -ErrorAction SilentlyContinue } else { $env:WRANGLER_SEND_METRICS = $SavedWranglerMetrics }
  if ($SavedCi -eq $null) { Remove-Item Env:\CI -ErrorAction SilentlyContinue } else { $env:CI = $SavedCi }
}

exit $ExitCode
