$script:AllowedLocalAiCodes = @(
  'ai_disabled',
  'no_approved_evidence',
  'sensitive_input',
  'input_rejected',
  'request_aborted',
  'provider_timeout',
  'provider_http_error',
  'provider_content_filtered',
  'provider_transport_error',
  'provider_invalid_response',
  'provider_non_json',
  'provider_unexpected_content_type',
  'provider_missing_choices',
  'provider_empty_choices',
  'provider_empty_content',
  'provider_invalid_message_shape',
  'provider_incomplete_generation',
  'model_mismatch',
  'output_not_grounded',
  'output_too_large',
  'model_answer_accepted',
  'catalog_unavailable',
  'catalog_timeout',
  'catalog_http_error',
  'catalog_network_error',
  'catalog_invalid_response',
  'catalog_schema_mismatch',
  'catalog_no_approved_free_model',
  'total_request_timeout'
)

function Read-BoundedLogText([string]$Path, [int]$MaximumBytes) {
  $stream = [System.IO.File]::Open(
    $Path,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete
  )
  try {
    $byteCount = [int][Math]::Min($stream.Length, $MaximumBytes)
    if ($byteCount -eq 0) { return '' }
    $null = $stream.Seek(-$byteCount, [System.IO.SeekOrigin]::End)
    $buffer = [byte[]]::new($byteCount)
    $offset = 0
    while ($offset -lt $byteCount) {
      $read = $stream.Read($buffer, $offset, $byteCount - $offset)
      if ($read -eq 0) { break }
      $offset += $read
    }
    return [System.Text.Encoding]::UTF8.GetString($buffer, 0, $offset)
  } finally {
    $stream.Dispose()
  }
}

function ConvertTo-SafeDiagnosticEvent($Event) {
  if ($Event.code -notin $script:AllowedLocalAiCodes) { return $null }
  $safe = [ordered]@{
    code = [string]$Event.code
    providerCallAttempted = ($Event.providerCallAttempted -eq $true)
  }
  if ($null -ne $Event.elapsedMs) {
    $elapsed = 0.0
    if ([double]::TryParse([string]$Event.elapsedMs, [ref]$elapsed) -and -not [double]::IsNaN($elapsed) -and -not [double]::IsInfinity($elapsed)) {
      $safe.elapsedMs = [int][Math]::Min(60000, [Math]::Max(0, [Math]::Round($elapsed)))
    }
  }
  if ($null -ne $Event.overallElapsedMs) {
    $overallElapsed = 0.0
    if ([double]::TryParse([string]$Event.overallElapsedMs, [ref]$overallElapsed) -and -not [double]::IsNaN($overallElapsed) -and -not [double]::IsInfinity($overallElapsed)) {
      $safe.overallElapsedMs = [int][Math]::Min(60000, [Math]::Max(0, [Math]::Round($overallElapsed)))
    }
  }
  if ($Event.usageMetadataInconsistent -eq $true) { $safe.usageMetadataInconsistent = $true }
  foreach ($field in @('completionTokens','reasoningTokens')) {
    if ($null -ne $Event.$field) {
      $tokenCount = 0
      if ([int]::TryParse([string]$Event.$field, [ref]$tokenCount) -and $tokenCount -ge 0 -and $tokenCount -le 1000000) {
        $safe[$field] = $tokenCount
      }
    }
  }
  if ($null -ne $Event.httpStatus) {
    $status = 0
    if ([int]::TryParse([string]$Event.httpStatus, [ref]$status) -and $status -ge 100 -and $status -le 599) {
      $safe.httpStatus = $status
    }
  }
  foreach ($field in @('httpStatusReceived','responseHeadersReceived')) {
    if ($Event.$field -is [bool]) { $safe[$field] = $Event.$field }
  }
  if ($Event.timeoutSource -in @('attempt_deadline','adapter_deadline')) { $safe.timeoutSource = [string]$Event.timeoutSource }
  if ($Event.abortSource -eq 'client_request') { $safe.abortSource = 'client_request' }
  if ($null -ne $Event.attemptNumber) {
    $attemptNumber = 0
    if ([int]::TryParse([string]$Event.attemptNumber, [ref]$attemptNumber) -and $attemptNumber -ge 1 -and $attemptNumber -le 2) {
      $safe.attemptNumber = $attemptNumber
    }
  }
  if ($Event.modelId -in @('nvidia/nemotron-3.5-super-vl:free','dots-studio/dots-3-note-preview:free')) {
    $safe.modelId = [string]$Event.modelId
  }
  if ($null -ne $Event.choicesCount) {
    $count = 0
    if ([int]::TryParse([string]$Event.choicesCount, [ref]$count) -and $count -ge 0 -and $count -le 1000) {
      $safe.choicesCount = $count
    }
  }
  if ($Event.contentType -in @('application/json','application/problem+json','text/event-stream','text/plain','missing','other')) {
    $safe.contentType = [string]$Event.contentType
  }
  if ($Event.finishReason -in @('stop','length','tool_calls','content_filter')) {
    $safe.finishReason = [string]$Event.finishReason
  }
  return [pscustomobject]$safe
}

function Read-AskMarkKiloDiagnostics {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Paths,
    [ValidateRange(1, 20)]
    [int]$MaxAttempts = 12,
    [ValidateRange(0, 500)]
    [int]$RetryDelayMilliseconds = 100,
    [ValidateRange(1024, 1048576)]
    [int]$MaximumBytesPerLog = 262144
  )

  $hadReadableFile = $false
  $hadMissingFile = $false
  $hadLockOrIoFailure = $false
  $hadAccessFailure = $false

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt += 1) {
    $events = @()
    $hadReadableFile = $false
    $hadMissingFile = $false
    $hadLockOrIoFailure = $false
    $hadAccessFailure = $false

    foreach ($path in $Paths) {
      try {
        $text = Read-BoundedLogText $path $MaximumBytesPerLog
        $hadReadableFile = $true
        $matches = [regex]::Matches($text, 'ASK_MARK_LOCAL_AI_DIAGNOSTIC\s+(\{[^\r\n]+?\})')
        foreach ($match in $matches) {
          try {
            $event = $match.Groups[1].Value | ConvertFrom-Json
            $safeEvent = ConvertTo-SafeDiagnosticEvent $event
            if ($null -ne $safeEvent) { $events += $safeEvent }
          } catch {
            # Malformed or partial log lines are ignored; their contents stay private.
          }
        }
      } catch [System.IO.FileNotFoundException] {
        $hadMissingFile = $true
      } catch [System.IO.DirectoryNotFoundException] {
        $hadMissingFile = $true
      } catch [System.UnauthorizedAccessException] {
        $hadAccessFailure = $true
      } catch [System.IO.IOException] {
        $hadLockOrIoFailure = $true
      } catch [System.Exception] {
        $hadAccessFailure = $true
      }
    }

    if ($events.Count -gt 0) {
      return [pscustomobject]@{ status = 'found'; events = [object[]]$events }
    }
    if (-not $hadLockOrIoFailure -and -not $hadAccessFailure -and -not $hadMissingFile -and $hadReadableFile) {
      return [pscustomobject]@{ status = 'no_event'; events = [object[]]@() }
    }
    if ($attempt -lt $MaxAttempts -and $RetryDelayMilliseconds -gt 0) {
      Start-Sleep -Milliseconds $RetryDelayMilliseconds
    }
  }

  $status = if ($hadAccessFailure -or $hadLockOrIoFailure) { 'inaccessible' } else { 'missing' }
  return [pscustomobject]@{ status = $status; events = [object[]]@() }
}

function Remove-AskMarkKiloRunRoot {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [ValidateRange(1, 20)]
    [int]$MaxAttempts = 20,
    [ValidateRange(0, 500)]
    [int]$RetryDelayMilliseconds = 250
  )

  $tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
  $target = [System.IO.Path]::GetFullPath($Path)
  if ([System.IO.Path]::GetDirectoryName($target) -ne $tempBase -or [System.IO.Path]::GetFileName($target) -notmatch '^ask-mark-kilo-[0-9a-f]{32}$') {
    return [pscustomobject]@{ status = 'refused' }
  }
  if (-not (Test-Path -LiteralPath $target)) { return [pscustomobject]@{ status = 'already_absent' } }

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt += 1) {
    try {
      Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
      if (-not (Test-Path -LiteralPath $target)) { return [pscustomobject]@{ status = 'removed' } }
    } catch {
      if ($attempt -eq $MaxAttempts) { return [pscustomobject]@{ status = 'inaccessible' } }
    }
    if ($attempt -lt $MaxAttempts -and $RetryDelayMilliseconds -gt 0) {
      Start-Sleep -Milliseconds $RetryDelayMilliseconds
    }
  }
  return [pscustomobject]@{ status = 'inaccessible' }
}

Export-ModuleMember -Function Read-AskMarkKiloDiagnostics, Remove-AskMarkKiloRunRoot
