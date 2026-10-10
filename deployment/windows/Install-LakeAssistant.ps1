#Requires -RunAsAdministrator
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory)][string]$IisSiteName,
  [string]$InstallRoot = (Join-Path $env:ProgramData 'Lake Group\Assistant'),
  [string]$AssistantBackendPort = '4001',
  [string[]]$PublicOrigins = @()
)
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$ollamaTask = 'LakeAssistant-Ollama'
$backendTask = 'LakeAssistant-Backend'
$taskDescription = 'Managed by Lake Group self-hosted Assistant installer.'
$webConfigBackup = $null
$webConfigPath = $null
$tasksChanged = @()

function Stop-Install([string]$Message) { throw "Lake Assistant preflight failed: $Message" }
function Test-ContainedPath([string]$Parent, [string]$Candidate) {
  $parentPath = [IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
  $candidatePath = [IO.Path]::GetFullPath($Candidate).TrimEnd('\') + '\'
  return $candidatePath.StartsWith($parentPath, [StringComparison]::OrdinalIgnoreCase)
}
function Test-KnowledgeIndex([string]$Path) {
  $index = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  if ($index.schemaVersion -ne 1 -or $index.records.Count -lt 1) { Stop-Install 'Knowledge index schema or record count is invalid.' }
  foreach ($record in $index.records) {
    if ($record.verification -notin @('PUBLISHED', 'PUBLISHED_LOCALE_COPY')) { continue }
    $uri = [uri]$record.sourceUrl
    if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'www.lakeoilgroup.com') { Stop-Install "Record $($record.id) has an unapproved source." }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes([string]$record.text)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
    if ($hash -ne $record.contentHash) { Stop-Install "Record $($record.id) failed its content hash." }
  }
  return $index.records.Count
}
function Set-AssistantProxyRule([string]$Path, [string]$Port) {
  $doc = New-Object Xml.XmlDocument
  $doc.PreserveWhitespace = $true
  $doc.Load($Path)
  $server = $doc.SelectSingleNode('/configuration/system.webServer')
  if (-not $server) { $server = $doc.CreateElement('system.webServer'); [void]$doc.DocumentElement.AppendChild($server) }
  $rewrite = $server.SelectSingleNode('rewrite')
  if (-not $rewrite) { $rewrite = $doc.CreateElement('rewrite'); [void]$server.AppendChild($rewrite) }
  $rules = $rewrite.SelectSingleNode('rules')
  if (-not $rules) { $rules = $doc.CreateElement('rules'); [void]$rewrite.AppendChild($rules) }
  $existing = $rules.SelectSingleNode("rule[@name='Lake Assistant private API']")
  if ($existing) {
    $existingAction = $existing.SelectSingleNode('action')
    $url = if ($existingAction) { $existingAction.GetAttribute('url') } else { '' }
    if ($url -ne "http://127.0.0.1:$Port/api/assistant/{R:1}") { Stop-Install 'An existing Lake Assistant proxy rule differs; inspect it manually.' }
    return
  }
  $rule = $doc.CreateElement('rule'); $rule.SetAttribute('name', 'Lake Assistant private API'); $rule.SetAttribute('stopProcessing', 'true')
  $match = $doc.CreateElement('match'); $match.SetAttribute('url', '^api/assistant/(.*)$'); [void]$rule.AppendChild($match)
  $action = $doc.CreateElement('action'); $action.SetAttribute('type', 'Rewrite'); $action.SetAttribute('url', "http://127.0.0.1:$Port/api/assistant/{R:1}"); $action.SetAttribute('appendQueryString', 'true'); [void]$rule.AppendChild($action)
  [void]$rules.PrependChild($rule)
  $doc.Save($Path)
}

if ([Environment]::Is64BitOperatingSystem -ne $true -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { Stop-Install 'A 64-bit AMD64 Windows host is required.' }
$os = Get-CimInstance Win32_OperatingSystem
$cpuInventory = @(Get-CimInstance Win32_Processor)
$cpuName = ($cpuInventory | Select-Object -First 1 -ExpandProperty Name)
$gpuNames = @(Get-CimInstance Win32_VideoController | ForEach-Object { [string]$_.Name } | Where-Object { $_ })
if ([int]$os.ProductType -eq 1 -or [version]$os.Version -lt [version]'10.0') { Stop-Install 'Windows Server 2016 or later is required; client Windows and older server versions are not supported by this installer.' }
$minimumRamKb = (12 * 1GB) / 1KB
if ([uint64]$os.TotalVisibleMemorySize -lt $minimumRamKb) { Stop-Install 'At least 12 GiB RAM is required for the 4B model and Windows services.' }
$availableRamBytes = [uint64]$os.FreePhysicalMemory * 1KB
if ($availableRamBytes -lt 4GB) { Stop-Install 'At least 4 GiB physical RAM must be available at install time to safely load and verify the model; close or reschedule unrelated workloads and rerun.' }
$cores = ($cpuInventory | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum
if ($cores -lt 4) { Stop-Install 'At least four logical CPU cores are required.' }
if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'ai\runtime\ollama\ollama.exe') -PathType Leaf)) { Stop-Install 'Bundled Ollama runtime is missing from this package.' }
$runtimeRoot = Join-Path $sourceRoot 'ai\runtime\ollama'
if (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'lib\ollama\llama-server.exe') -PathType Leaf) -or -not @(Get-ChildItem (Join-Path $runtimeRoot 'lib\ollama') -Filter '*.dll' -File -ErrorAction SilentlyContinue).Count) { Stop-Install 'Bundled Ollama inference runtime dependencies are incomplete.' }
$manifestPath = Join-Path $sourceRoot 'ai\config\runtime-manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$ollamaVersion = (& (Join-Path $sourceRoot 'ai\runtime\ollama\ollama.exe') --version 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $ollamaVersion -notmatch [regex]::Escape($manifest.runtime.version)) { Stop-Install 'Bundled Ollama version does not match the pinned manifest.' }
$modelBlob = Join-Path $sourceRoot ("ai\models\blobs\sha256-" + $manifest.model.primaryLayerDigest.Substring(7))
if (-not (Test-Path -LiteralPath $modelBlob -PathType Leaf)) { Stop-Install 'The approved model blob is not complete in the project payload.' }
if ((Get-Item -LiteralPath $modelBlob).Length -ne [long]$manifest.model.primaryLayerBytes) { Stop-Install 'The model blob has the wrong byte count.' }
$blobHash = (Get-FileHash -LiteralPath $modelBlob -Algorithm SHA256).Hash.ToLowerInvariant()
if ($blobHash -ne $manifest.model.primaryLayerDigest.Substring(7)) { Stop-Install 'The approved model blob failed SHA-256 verification.' }
$recordCount = Test-KnowledgeIndex (Join-Path $sourceRoot 'ai\knowledge\lake-group-index.json')
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { Stop-Install 'Node.js 22.6 or later is required; no machine-accessible node.exe was found.' }
$nodeCommand = Get-Command node.exe -ErrorAction Stop
if ($env:USERPROFILE -and (Test-ContainedPath $env:USERPROFILE $nodeCommand.Source)) { Stop-Install 'The selected Node.js executable is under the administrator profile and may not be accessible to LocalService; install Node.js machine-wide and rerun.' }
$nodeVersion = (& $nodeCommand.Source --version).Trim().TrimStart('v')
if ([version]$nodeVersion -lt [version]'22.6.0') { Stop-Install "Node.js 22.6 or later is required; found $nodeVersion." }
Import-Module WebAdministration -ErrorAction Stop
$site = Get-Website -Name $IisSiteName -ErrorAction Stop
$siteRoot = [IO.Path]::GetFullPath($site.PhysicalPath)
if ((Test-ContainedPath $siteRoot $InstallRoot) -or (Test-ContainedPath $InstallRoot $siteRoot)) { Stop-Install 'Private application storage and the IIS public web root must not overlap.' }
$allowedPublicOrigins = @()
if ($PublicOrigins.Count) {
  $allowedPublicOrigins = @($PublicOrigins)
} else {
  foreach ($binding in @(Get-WebBinding -Name $IisSiteName -Protocol https)) {
    $bindingParts = ([string]$binding.bindingInformation) -split ':', 3
    $hostName = if ($bindingParts.Count -eq 3) { $bindingParts[2].Trim() } else { '' }
    if ($hostName -and $hostName -notin @('*', '+')) {
      $bindingPort = [int]$bindingParts[1]
      $portPart = if ($bindingPort -eq 443) { '' } else { ":$bindingPort" }
      $allowedPublicOrigins += "https://$hostName$portPart"
    }
  }
}
$allowedPublicOrigins = @($allowedPublicOrigins | ForEach-Object {
  $originUri = $null
  if (-not [uri]::TryCreate([string]$_, [UriKind]::Absolute, [ref]$originUri) -or $originUri.Scheme -ne 'https' -or $originUri.UserInfo -or $originUri.AbsolutePath -ne '/' -or $originUri.Query -or $originUri.Fragment) { Stop-Install "Public origin '$_' must be a bare HTTPS origin." }
  $originUri.GetLeftPart([UriPartial]::Authority).ToLowerInvariant()
} | Sort-Object -Unique)
if (-not $allowedPublicOrigins.Count) { Stop-Install 'No explicit HTTPS host binding was found; supply -PublicOrigins with the approved public site origin(s).' }
$webConfigPath = Join-Path $siteRoot 'web.config'
if (-not (Test-Path -LiteralPath $webConfigPath -PathType Leaf)) { Stop-Install 'IIS web.config is absent; refusing to invent site-level configuration.' }
$rewriteDll = Join-Path $env:SystemRoot 'System32\inetsrv\rewrite.dll'
if (-not (Test-Path -LiteralPath $rewriteDll -PathType Leaf)) { Stop-Install 'IIS URL Rewrite is required for a path-scoped same-origin proxy.' }
$proxy = Get-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name enabled -ErrorAction SilentlyContinue
if (-not $proxy -or $proxy.Value -ne $true) { Stop-Install 'IIS ARR proxy is not enabled; enable it through the approved IIS change process, then rerun.' }
$backendPort = [int]$AssistantBackendPort
if ($backendPort -lt 1024 -or $backendPort -gt 65535) { Stop-Install 'Assistant backend port must be a non-privileged port.' }
$ollamaPort = 11434
if (Get-NetTCPConnection -State Listen -LocalPort $ollamaPort -ErrorAction SilentlyContinue) {
  $ollamaPort = $null
  foreach ($candidate in 11435..11449) {
    if ($candidate -ne $backendPort -and -not (Get-NetTCPConnection -State Listen -LocalPort $candidate -ErrorAction SilentlyContinue)) { $ollamaPort = $candidate; break }
  }
  if (-not $ollamaPort) { Stop-Install 'Ollama default port is occupied and no isolated loopback port is available in 11435-11449.' }
}
if ($backendPort -eq $ollamaPort -or (Get-NetTCPConnection -State Listen -LocalPort $backendPort -ErrorAction SilentlyContinue)) { Stop-Install "Assistant backend port $backendPort is occupied or conflicts with Ollama; no process will be stopped." }
$drive = [IO.Path]::GetPathRoot($InstallRoot)
if ((Get-PSDrive -Name $drive.TrimEnd(':\') -ErrorAction Stop).Free -lt 8GB) { Stop-Install 'At least 8 GiB free disk space is required at the installation target.' }
if ((Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue) -eq $null) { Stop-Install 'Windows Task Scheduler cmdlets are required.' }
foreach ($taskName in @($ollamaTask, $backendTask)) {
  $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existingTask) {
    $existingXml = [xml](Export-ScheduledTask -TaskName $taskName)
    if ($existingXml.Task.RegistrationInfo.Description -eq $taskDescription) { Stop-Install "Managed task $taskName already exists; verify the current installation or run the scoped rollback before reinstalling." }
    Stop-Install "Task $taskName already exists and is not managed by this installer."
  }
}

if (-not $PSCmdlet.ShouldProcess($InstallRoot, 'Install Lake Assistant private payload and same-origin IIS proxy')) { return }
$backupRoot = Join-Path $InstallRoot ('rollback\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
try {
  New-Item -ItemType Directory -Force -Path $InstallRoot, (Join-Path $InstallRoot 'ai'), (Join-Path $InstallRoot 'backend'), (Join-Path $InstallRoot 'scripts'), (Join-Path $InstallRoot 'logs') | Out-Null
  foreach ($folder in @('runtime', 'models', 'knowledge', 'config', 'licenses')) {
    $source = Join-Path $sourceRoot "ai\$folder"; if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $InstallRoot 'ai') -Recurse -Force }
  }
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'backend\src') -Destination (Join-Path $InstallRoot 'backend') -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'backend\package.json') -Destination (Join-Path $InstallRoot 'backend\package.json') -Force
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'backend\package-lock.json') -Destination (Join-Path $InstallRoot 'backend\package-lock.json') -Force
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'backend\prisma') -Destination (Join-Path $InstallRoot 'backend') -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'backend\prisma.config.ts') -Destination (Join-Path $InstallRoot 'backend\prisma.config.ts') -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Run-LakeAssistantOllama.ps1') -Destination (Join-Path $InstallRoot 'scripts') -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Run-LakeAssistantBackend.ps1') -Destination (Join-Path $InstallRoot 'scripts') -Force
  Push-Location (Join-Path $InstallRoot 'backend'); try { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed; the private backend was not registered.' }; & npm.cmd run db:generate; if ($LASTEXITCODE -ne 0) { throw 'Prisma client generation failed; the private backend was not registered.' } } finally { Pop-Location }
  & icacls.exe $InstallRoot /inheritance:r /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not protect the private application directory ACL.' }
  $acl = 'NT AUTHORITY\LOCAL SERVICE:(OI)(CI)RX'
  & icacls.exe $InstallRoot /grant 'BUILTIN\Administrators:(OI)(CI)F' 'NT AUTHORITY\SYSTEM:(OI)(CI)F' $acl /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not grant the least-privilege Local Service read access.' }
  & icacls.exe (Join-Path $InstallRoot 'ai\models') /grant 'NT AUTHORITY\LOCAL SERVICE:(OI)(CI)M' /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not grant Ollama access to its private model store.' }
  & icacls.exe (Join-Path $InstallRoot 'logs') /grant 'NT AUTHORITY\LOCAL SERVICE:(OI)(CI)M' /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not grant service log write access.' }
  $principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LOCAL SERVICE' -LogonType ServiceAccount -RunLevel Limited
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
  $allowedOriginsValue = [string]::Join(',', $allowedPublicOrigins)
  foreach ($entry in @(@{ Name = $ollamaTask; File = 'Run-LakeAssistantOllama.ps1'; Args = "-InstallRoot `"$InstallRoot`" -OllamaPort $ollamaPort" }, @{ Name = $backendTask; File = 'Run-LakeAssistantBackend.ps1'; Args = "-InstallRoot `"$InstallRoot`" -NodeExecutable `"$($nodeCommand.Source)`" -AllowedOrigins `"$allowedOriginsValue`"" })) {
    $runner = Join-Path $InstallRoot "scripts\$($entry.File)"
    if ($entry.Name -eq $backendTask) { $entry.Args += " -BackendPort $backendPort -OllamaPort $ollamaPort" }
    $action = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runner`" $($entry.Args)"
    Register-ScheduledTask -TaskName $entry.Name -Description $taskDescription -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
    $tasksChanged += $entry.Name
  }
  New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
  Copy-Item -LiteralPath $webConfigPath -Destination $backupRoot -Force
  $webConfigBackup = Join-Path $backupRoot 'web.config'
  Set-AssistantProxyRule -Path $webConfigPath -Port $backendPort
  Start-ScheduledTask -TaskName $ollamaTask
  Start-ScheduledTask -TaskName $backendTask
  $deadline = (Get-Date).AddMinutes(3)
  $backendReady = $false
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/api/assistant/health" -TimeoutSec 3
      if ($health.status -eq 'ready') { $backendReady = $true; break }
    } catch { }
  }
  if (-not $backendReady) { throw 'Backend/model health did not become ready within 3 minutes; inspect private service logs and use rollback if needed.' }
  $inferenceWatch = [Diagnostics.Stopwatch]::StartNew()
  $inference = Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/api/assistant/chat" -Method Post -ContentType 'application/json' -Body (@{ message = 'What is Lake Group?'; locale = 'en' } | ConvertTo-Json -Compress) -TimeoutSec 240
  $inferenceWatch.Stop()
  if ([string]::IsNullOrWhiteSpace($inference.answer) -or -not $inference.grounded -or @($inference.sources).Count -lt 1) { throw 'The real local inference check did not return a grounded answer with at least one approved source.' }
  [pscustomobject]@{ Status = 'INSTALLED'; InstallRoot = $InstallRoot; IisSite = $IisSiteName; AllowedPublicOrigins = $allowedPublicOrigins; PrivateApiPort = $backendPort; OllamaLoopbackPort = $ollamaPort; KnowledgeRecords = $recordCount; BackupWebConfig = $webConfigBackup; Runtime = $manifest.runtime.version; Model = $manifest.model.name; Cpu = $cpuName; LogicalCpuCores = $cores; OsCaption = $os.Caption; OsVersion = $os.Version; OsBuild = $os.BuildNumber; TotalRamBytes = [uint64]$os.TotalVisibleMemorySize * 1KB; AvailableRamBytesAtInstall = $availableRamBytes; GpuDevices = $gpuNames; InitialInferenceSeconds = [math]::Round($inferenceWatch.Elapsed.TotalSeconds, 2); GroundedSourceCount = @($inference.sources).Count } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $InstallRoot 'install-report.json') -Encoding UTF8
  Write-Host "Installed private payload under $InstallRoot. Run Verify-LakeAssistant.ps1 and review the report before approving traffic."
} catch {
  foreach ($name in $tasksChanged) { Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue }
  if ($webConfigBackup -and (Test-Path -LiteralPath $webConfigBackup)) { Copy-Item -LiteralPath $webConfigBackup -Destination $webConfigPath -Force }
  try {
    [pscustomobject]@{ Status = 'FAILED'; AttemptedAt = (Get-Date).ToString('o'); InstallRoot = $InstallRoot; Reason = $_.Exception.Message } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $InstallRoot 'install-report.json') -Encoding UTF8
  } catch { }
  throw
}
