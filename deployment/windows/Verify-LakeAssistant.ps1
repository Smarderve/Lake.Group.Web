[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$InstallRoot,
  [Parameter(Mandatory)][uri]$WebsiteBaseUrl,
  [string]$ReportPath = (Join-Path $env:ProgramData 'Lake Group\Assistant\verification-report.json')
)
$ErrorActionPreference = 'Stop'
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$results = [Collections.Generic.List[object]]::new()
$timings = [Collections.Generic.List[double]]::new()
$manifest = $null
$ollamaPort = 11434
$ollamaWorkingSetPeak = 0L
$ollamaCpuPercentSamples = [Collections.Generic.List[double]]::new()
$generationTokenRates = [Collections.Generic.List[double]]::new()
$groundedReplies = 0
$responseExamples = [Collections.Generic.List[object]]::new()
$installReport = $null
function Add-Result([string]$Name, [string]$Status, [string]$Evidence) { $results.Add([pscustomobject]@{ Name = $Name; Status = $Status; Evidence = $Evidence }) }
function Test-Index([string]$Path) {
  $index = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  foreach ($record in $index.records) {
    $uri = [uri]$record.sourceUrl
    if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'www.lakeoilgroup.com') { throw "Unapproved source in record $($record.id)" }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes([string]$record.text)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
    if ($hash -ne $record.contentHash) { throw "Hash mismatch in record $($record.id)" }
  }
  return $index.records.Count
}
try {
  $manifest = Get-Content -LiteralPath (Join-Path $InstallRoot 'ai\config\runtime-manifest.json') -Raw | ConvertFrom-Json
  $installReportPath = Join-Path $InstallRoot 'install-report.json'
  if (-not (Test-Path -LiteralPath $installReportPath)) { throw 'Install report is missing; run the installer successfully first.' }
  $installReport = Get-Content -LiteralPath $installReportPath -Raw | ConvertFrom-Json
  if ($installReport.Status -ne 'INSTALLED') { throw "Install report status is $($installReport.Status), not INSTALLED." }
  if ($installReport.OllamaLoopbackPort) { $ollamaPort = [int]$installReport.OllamaLoopbackPort }
  $ollama = Join-Path $InstallRoot 'ai\runtime\ollama\ollama.exe'
  if ((Test-Path -LiteralPath $ollama -PathType Leaf) -and (& $ollama --version 2>&1 | Out-String) -match [regex]::Escape($manifest.runtime.version)) { Add-Result 'Bundled Ollama version' 'PASS' $manifest.runtime.version } else { Add-Result 'Bundled Ollama version' 'FAIL' 'Expected pinned executable/version was not found.' }
  $listener = @(Get-NetTCPConnection -State Listen -LocalPort $ollamaPort -ErrorAction SilentlyContinue)
  if ($listener.Count -gt 0 -and @($listener | Where-Object LocalAddress -ne '127.0.0.1').Count -eq 0) { Add-Result 'Ollama loopback binding' 'PASS' "$ollamaPort listens only on 127.0.0.1." } else { Add-Result 'Ollama loopback binding' 'FAIL' "Port $ollamaPort is absent or bound to a non-loopback interface." }
  $env:OLLAMA_MODELS = Join-Path $InstallRoot 'ai\models'
  $env:OLLAMA_HOST = "127.0.0.1:$ollamaPort"
  $tags = Invoke-RestMethod -Uri "http://127.0.0.1:$ollamaPort/api/tags" -TimeoutSec 5
  $model = @($tags.models | Where-Object { $_.name -eq $manifest.model.name -or $_.model -eq $manifest.model.name }) | Select-Object -First 1
  if ($model -and $model.details.quantization_level -eq $manifest.model.quantization -and [long]$model.size -ge [long]$manifest.model.primaryLayerBytes) {
    Add-Result 'Approved model availability' 'PASS' "$($manifest.model.name), $($model.details.parameter_size) $($model.details.quantization_level), local manifest digest $($model.digest), $($model.size) bytes."
  } else { Add-Result 'Approved model availability' 'FAIL' 'Exact model tag, expected Q4_K_M quantization, or expected minimum blob size was not verified.' }
} catch { Add-Result 'Ollama/runtime checks' 'FAIL' $_.Exception.Message }
try { $recordCount = Test-Index (Join-Path $InstallRoot 'ai\knowledge\lake-group-index.json'); Add-Result 'Knowledge index integrity' 'PASS' "$recordCount provenance-checked records." } catch { Add-Result 'Knowledge index integrity' 'FAIL' $_.Exception.Message }
foreach ($taskName in @('LakeAssistant-Ollama', 'LakeAssistant-Backend')) {
  try { $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop; $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName; if ($task.State -eq 'Running') { Add-Result "$taskName startup task" 'PASS' "Running; last result $($taskInfo.LastTaskResult)." } else { Add-Result "$taskName startup task" 'FAIL' "State $($task.State); last result $($taskInfo.LastTaskResult)." } }
  catch { Add-Result "$taskName startup task" 'NOT TESTED' 'Managed automatic-start task not found.' }
}
try {
  $scenarios = @(
    @{ Name = 'General introduction and follow-up'; Messages = @('Hi', "I'm interested in Lake Group.", 'Tell me everything about it.', 'Can you explain further?'); Grounded = @($false, $true, $true, $true) },
    @{ Name = 'Lake Aviation'; Messages = @('What is Lake Aviation?', 'What services does it provide?', 'What services does it provide?', 'Where does it operate?'); Grounded = @($true, $true, $true, $true) },
    @{ Name = 'Lake Steel'; Messages = @('What about Lake Steel?', 'What products does that company manufacture?'); Grounded = @($true, $true) },
    @{ Name = 'Locations and typo'; Messages = @('Where is Lake Group headquarters?', 'location', 'locaton', 'Where are the fuel stations?'); Grounded = @($true, $true, $true, $true) },
    @{ Name = 'Unsupported information'; Messages = @('What is the weather on Mars today?'); Grounded = @($false); ExpectNoEvidence = $true }
  )
  foreach ($scenario in $scenarios) {
    if ($scenario.Name -eq 'Locations and typo' -or $scenario.ExpectNoEvidence) { Start-Sleep -Seconds 61 }
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    for ($messageIndex = 0; $messageIndex -lt $scenario.Messages.Count; $messageIndex += 1) {
      $message = $scenario.Messages[$messageIndex]
      $ollamaBefore = @(Get-Process -Name 'ollama*' -ErrorAction SilentlyContinue)
      $cpuBefore = ($ollamaBefore | Measure-Object -Property CPU -Sum).Sum
      $watch = [Diagnostics.Stopwatch]::StartNew()
      $reply = Invoke-RestMethod -Uri ([uri]::new($WebsiteBaseUrl, '/api/assistant/chat')) -Method Post -WebSession $session -Headers @{ Origin = $WebsiteBaseUrl.GetLeftPart([UriPartial]::Authority) } -ContentType 'application/json' -Body (@{ message = $message; locale = 'en' } | ConvertTo-Json -Compress) -TimeoutSec 180
      $watch.Stop(); $timings.Add($watch.Elapsed.TotalSeconds)
      if ([string]::IsNullOrWhiteSpace($reply.answer)) { throw "Empty answer for '$($scenario.Name)' prompt: $message" }
      $expectedGrounded = [bool]$scenario.Grounded[$messageIndex]
      if ([bool]$reply.grounded -ne $expectedGrounded) { throw "Unexpected grounding state for '$($scenario.Name)' prompt: $message" }
      if ($expectedGrounded -and @($reply.sources).Count -lt 1) { throw "Expected at least one approved citation for '$($scenario.Name)' prompt: $message" }
      if ($expectedGrounded) { $groundedReplies += 1 }
      if ($scenario.ExpectNoEvidence -and $reply.status -ne 'no_evidence') { throw 'Unsupported Mars-weather prompt did not return no_evidence.' }
      if ($reply.metrics -and $reply.metrics.generatedTokens -gt 0 -and $reply.metrics.generationDurationNs -gt 0) { $generationTokenRates.Add([double]$reply.metrics.generatedTokens / ([double]$reply.metrics.generationDurationNs / 1e9)) }
      $sourceSummaries = @($reply.sources | ForEach-Object { [pscustomobject]@{ title = $_.title; url = $_.url } })
      $responseExamples.Add([pscustomobject]@{ scenario = $scenario.Name; prompt = $message; answer = ([string]$reply.answer).Substring(0, [math]::Min(320, ([string]$reply.answer).Length)); grounded = [bool]$reply.grounded; sources = $sourceSummaries })
      $ollamaAfter = @(Get-Process -Name 'ollama*' -ErrorAction SilentlyContinue)
      $workingSet = [long](($ollamaAfter | Measure-Object -Property WorkingSet64 -Sum).Sum)
      if ($workingSet -gt $ollamaWorkingSetPeak) { $ollamaWorkingSetPeak = $workingSet }
      $cpuAfter = ($ollamaAfter | Measure-Object -Property CPU -Sum).Sum
      if ($null -ne $cpuBefore -and $null -ne $cpuAfter -and $watch.Elapsed.TotalSeconds -gt 0) {
        $logicalCores = [math]::Max(1, [int]$installReport.LogicalCpuCores)
        $ollamaCpuPercentSamples.Add([math]::Max(0, 100 * ($cpuAfter - $cpuBefore) / $watch.Elapsed.TotalSeconds / $logicalCores))
      }
    }
  }
  Add-Result 'Same-origin chat conversations' 'PASS' "$($timings.Count) messages across general/company/location topics and unsupported-query safety; first=$([math]::Round($timings[0],2))s, warm=$([math]::Round($timings[$timings.Count - 1],2))s, grounded answers=$groundedReplies."
} catch { Add-Result 'Same-origin chat conversations' 'FAIL' $_.Exception.Message }
try {
  $crossOriginBlocked = $false
  try {
    Invoke-RestMethod -Uri ([uri]::new($WebsiteBaseUrl, '/api/assistant/chat')) -Method Post -Headers @{ Origin = 'https://attacker.invalid' } -ContentType 'application/json' -Body (@{ message = 'Hi'; locale = 'en' } | ConvertTo-Json -Compress) -TimeoutSec 10 | Out-Null
  } catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 403) { $crossOriginBlocked = $true } else { throw }
  }
  if ($crossOriginBlocked) { Add-Result 'Cross-origin request rejection' 'PASS' 'Unapproved Origin received HTTP 403.' } else { Add-Result 'Cross-origin request rejection' 'FAIL' 'Unapproved Origin was accepted.' }
} catch { Add-Result 'Cross-origin request rejection' 'FAIL' $_.Exception.Message }
try {
  $loaded = Invoke-RestMethod -Uri "http://127.0.0.1:$ollamaPort/api/ps" -TimeoutSec 5
  if (@($loaded.models | Where-Object { $_.name -eq $manifest.model.name -or $_.model -eq $manifest.model.name }).Count -gt 0) { Add-Result 'Model loaded in memory' 'PASS' $manifest.model.name } else { Add-Result 'Model loaded in memory' 'FAIL' 'Model tag was not present in Ollama /api/ps after conversation.' }
} catch { Add-Result 'Model loaded in memory' 'FAIL' $_.Exception.Message }
$memory = Get-CimInstance Win32_OperatingSystem
$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('o')
  website = $WebsiteBaseUrl.ToString()
  model = if ($manifest) { $manifest.model.name } else { $null }
  cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)
  totalRamBytes = [uint64]$memory.TotalVisibleMemorySize * 1KB
  availableRamBytes = [uint64]$memory.FreePhysicalMemory * 1KB
  firstResponseSeconds = if ($timings.Count) { $timings[0] } else { $null }
  warmResponseSeconds = if ($timings.Count -gt 1) { $timings[$timings.Count - 1] } else { $null }
  averageGenerationTokensPerSecond = if ($generationTokenRates.Count) { [math]::Round(($generationTokenRates | Measure-Object -Average).Average, 2) } else { $null }
  sampledOllamaWorkingSetPeakBytes = if ($ollamaWorkingSetPeak) { $ollamaWorkingSetPeak } else { $null }
  approximateOllamaCpuPercentOfLogicalCapacity = if ($ollamaCpuPercentSamples.Count) { [math]::Round(($ollamaCpuPercentSamples | Measure-Object -Average).Average, 2) } else { $null }
  gpuUtilization = 'NOT TESTED'
  restartAfterServiceRestartOrReboot = 'NOT TESTED; no service restart or host reboot was triggered.'
  ollamaLoopbackPort = $ollamaPort
  gpuDevices = if ($installReport) { $installReport.GpuDevices } else { @() }
  responseExamples = $responseExamples
  results = $results
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath) | Out-Null
$report | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
$report.results | Format-Table -AutoSize
Write-Host "Report written to $ReportPath"
if (@($results | Where-Object Status -eq 'FAIL').Count) { exit 1 }
