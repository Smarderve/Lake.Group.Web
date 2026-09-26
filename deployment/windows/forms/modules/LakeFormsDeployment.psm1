Set-StrictMode -Version Latest

$script:FormsDataRoot = Join-Path $env:ProgramData 'LakeGroup\Forms'
$script:FormsEnvPath = Join-Path $script:FormsDataRoot 'forms.env'
$script:FormsLogDirectory = Join-Path $script:FormsDataRoot 'logs'
$script:FormsBackupDirectory = Join-Path $script:FormsDataRoot 'backups'
$script:TaskName = 'LakeGroupForms'
$script:TestRecipient = 'projectdevemail001@gmail.com'
$script:ExpectedOrigin = 'https://www.lakeoilgroup.com'

function Write-FormsStatus {
  [CmdletBinding()]
  param([ValidateSet('PASS', 'WARN', 'FAIL', 'INFO')][string]$Status, [string]$Name, [string]$Detail = '')
  $line = '[{0}] {1}{2}' -f $Status, $Name, $(if ($Detail) { ' — ' + $Detail } else { '' })
  Write-Host $line
  if (Test-Path $script:FormsLogDirectory) { Add-Content -LiteralPath (Join-Path $script:FormsLogDirectory 'deployment.log') -Value $line }
}

function Test-FormsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Initialize-FormsDirectories {
  foreach ($directory in @($script:FormsDataRoot, $script:FormsLogDirectory, $script:FormsBackupDirectory)) {
    if (-not (Test-Path $directory) -and -not $WhatIfPreference) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
  }
}

function Protect-FormsText {
  param([AllowNull()][string]$Text)
  if ($null -eq $Text) { return '' }
  $redacted = $Text -replace '(?im)(SMTP_PASS|PUBLIC_FORM_TOKEN_SECRET|DATABASE_URL_RUNTIME)\s*=\s*[^\r\n]+', '$1=<redacted>'
  return $redacted -replace '(?i)(postgres(?:ql)?://)[^\s"'']+', '$1<redacted>'
}

function Resolve-LakeFormsProjectRoot {
  param([string]$ScriptRoot, [string]$ProjectRoot)
  $candidate = if ($ProjectRoot) { $ProjectRoot } else { (Resolve-Path (Join-Path $ScriptRoot '..\..\..')).Path }
  $candidate = (Resolve-Path $candidate -ErrorAction Stop).Path
  $required = @('web.config', 'backend\package.json', 'backend\src\forms-index.js', 'contact.html', 'careers.html')
  $missing = @($required | Where-Object { -not (Test-Path (Join-Path $candidate $_)) })
  if ($missing.Count) { throw "Project integrity check failed. Missing: $($missing -join ', ')" }
  return $candidate
}

function Get-FormsEnvValues {
  param([string]$Path = $script:FormsEnvPath)
  $values = @{}
  if (-not (Test-Path $Path)) { return $values }
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*([A-Z0-9_]+)=(.*)$') {
      $values[$Matches[1]] = $Matches[2].Trim().Trim('"')
    }
  }
  return $values
}

function New-FormsSecret {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

function ConvertTo-Plaintext {
  param([Security.SecureString]$SecureValue)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Find-FormsDatabaseUrl {
  param([string]$ProjectRoot, [string]$ProvidedValue)
  if ($ProvidedValue) { return $ProvidedValue }
  $existing = Get-FormsEnvValues
  if ($existing.DATABASE_URL_RUNTIME) { return $existing.DATABASE_URL_RUNTIME }
  $machineValue = [Environment]::GetEnvironmentVariable('DATABASE_URL_RUNTIME', 'Machine')
  if ($machineValue) { return $machineValue }
  $backendEnv = Join-Path $ProjectRoot 'backend\.env'
  if (Test-Path $backendEnv) {
    $found = (Get-FormsEnvValues -Path $backendEnv).DATABASE_URL_RUNTIME
    if ($found) { return $found }
  }
  return ''
}

function Test-FormsNode {
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $node -or -not $npm) { return @{ Pass = $false; Detail = 'Node.js 22+ must be installed.' } }
  $raw = (& $node.Source --version 2>$null).Trim()
  if ($raw -notmatch '^v(\d+)\.(\d+)') { return @{ Pass = $false; Detail = 'Node.js version could not be read.' } }
  $major = [int]$Matches[1]; $minor = [int]$Matches[2]
  if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 6)) { return @{ Pass = $false; Detail = 'Node.js 22.6+ must be installed.' } }
  return @{ Pass = $true; Detail = $raw; NodePath = $node.Source; NpmPath = $npm.Source }
}

function Invoke-FormsDependencies {
  param([string]$ProjectRoot)
  if ($WhatIfPreference) { Write-FormsStatus INFO 'Backend dependencies' 'Would run npm ci --omit=dev'; return }
  Push-Location (Join-Path $ProjectRoot 'backend')
  try { & npm.cmd ci --omit=dev; if ($LASTEXITCODE -ne 0) { throw 'npm ci --omit=dev failed.' } }
  finally { Pop-Location }
}

function New-FormsSnapshot {
  param([string]$ProjectRoot, [string]$SiteName)
  $stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
  $path = Join-Path $script:FormsBackupDirectory $stamp
  if ($WhatIfPreference) { Write-FormsStatus INFO 'Restore snapshot' "Would create $path"; return $path }
  New-Item -ItemType Directory -Path $path -Force | Out-Null
  if (Test-Path $script:FormsEnvPath) { Copy-Item $script:FormsEnvPath (Join-Path $path 'forms.env') -Force }
  if (Test-Path (Join-Path $ProjectRoot 'web.config')) { Copy-Item (Join-Path $ProjectRoot 'web.config') (Join-Path $path 'web.config') -Force }
  if (Get-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue) {
    Export-ScheduledTask -TaskName $script:TaskName | Set-Content -LiteralPath (Join-Path $path 'LakeGroupForms.task.xml') -Encoding UTF8
  }
  $clam = Test-FormsClamAv
  if ($clam.ClamdConfig -and (Test-Path $clam.ClamdConfig)) { Copy-Item $clam.ClamdConfig (Join-Path $path 'clamd.conf') -Force }
  if ($clam.FreshclamConfig -and (Test-Path $clam.FreshclamConfig)) { Copy-Item $clam.FreshclamConfig (Join-Path $path 'freshclam.conf') -Force }
  $manifest = [ordered]@{ createdAt = (Get-Date).ToString('o'); projectRoot = $ProjectRoot; siteName = $SiteName; taskName = $script:TaskName; formsEnv = $script:FormsEnvPath; clamdConfig = $clam.ClamdConfig; freshclamConfig = $clam.FreshclamConfig; files = @('forms.env', 'web.config', 'LakeGroupForms.task.xml', 'clamd.conf', 'freshclam.conf') }
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $path 'manifest.json') -Encoding UTF8
  return $path
}

function Set-FormsConfiguration {
  param([string]$DatabaseUrlRuntime, [Security.SecureString]$SmtpPassword)
  $current = Get-FormsEnvValues
  $secret = $current.PUBLIC_FORM_TOKEN_SECRET
  if (-not $secret -or $secret.Length -lt 43) { $secret = New-FormsSecret }
  $password = if ($SmtpPassword) { ConvertTo-Plaintext $SmtpPassword } elseif ($current.SMTP_PASS) { $current.SMTP_PASS } else { '' }
  if (-not $password -and -not $WhatIfPreference) { throw 'Gmail App Password is required.' }
  $lines = @(
    'NODE_ENV=production', 'PORT=4000', "DATABASE_URL_RUNTIME=$DatabaseUrlRuntime", "PUBLIC_FORM_TOKEN_SECRET=$secret",
    'SMTP_HOST=smtp.gmail.com', 'SMTP_PORT=587', 'SMTP_SECURE=false', "SMTP_USER=$script:TestRecipient", "SMTP_PASS=$password",
    "MAIL_FROM=Lake Group Website Test <$script:TestRecipient>", "CONTACT_RECIPIENT_EMAIL=$script:TestRecipient", "CAREERS_RECIPIENT_EMAIL=$script:TestRecipient",
    "CONTACT_ALLOWED_ORIGINS=$script:ExpectedOrigin", "CAREERS_ALLOWED_ORIGINS=$script:ExpectedOrigin", 'CAREERS_CLAMD_HOST=127.0.0.1', 'CAREERS_CLAMD_PORT=3310', 'TRUST_PROXY=1'
  )
  if ($WhatIfPreference) { Write-FormsStatus INFO 'Forms configuration' "Would write protected $script:FormsEnvPath"; return }
  [IO.File]::WriteAllLines($script:FormsEnvPath, $lines, [Text.UTF8Encoding]::new($false))
  $acl = Get-Acl $script:FormsEnvPath
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRule($rule) }
  foreach ($identity in @('BUILTIN\Administrators', 'NT AUTHORITY\SYSTEM')) {
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'Allow')
    [void]$acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $script:FormsEnvPath -AclObject $acl
}

function Test-FormsRecipientLock {
  $env = Get-FormsEnvValues
  return $env.CONTACT_RECIPIENT_EMAIL -eq $script:TestRecipient -and $env.CAREERS_RECIPIENT_EMAIL -eq $script:TestRecipient
}

function Get-LakeIisSite {
  param([string]$SiteName)
  Import-Module WebAdministration -ErrorAction Stop
  $sites = Get-Website
  if ($SiteName) { $site = $sites | Where-Object Name -eq $SiteName | Select-Object -First 1 }
  else { $site = $sites | Where-Object { (Get-WebBinding -Name $_.Name | Where-Object { $_.bindingInformation -match 'www\.lakeoilgroup\.com' -and $_.protocol -eq 'https' }) } | Select-Object -First 1 }
  if (-not $site) { throw 'No IIS HTTPS site bound to www.lakeoilgroup.com was found.' }
  return $site
}

function Test-FormsIisComponents {
  $result = @{ IIS = $false; Rewrite = $false; ARR = $false; Proxy = $false; Detail = '' }
  try {
    Import-Module WebAdministration -ErrorAction Stop
    $result.IIS = $true
    $rewrite = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\IIS Extensions\URL Rewrite' -ErrorAction SilentlyContinue
    $arr = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\IIS Extensions\Application Request Routing' -ErrorAction SilentlyContinue
    $result.Rewrite = $null -ne $rewrite
    $result.ARR = $null -ne $arr
    if ($result.ARR) { $result.Proxy = (Get-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name 'enabled').Value -eq $true }
  } catch { $result.Detail = 'IIS management tools are unavailable.' }
  return $result
}

function Test-FormsWebConfigRoutes {
  param([string]$ProjectRoot)
  $content = Get-Content -LiteralPath (Join-Path $ProjectRoot 'web.config') -Raw
  return $content -match 'api/contact/\(\.\*\)' -and $content -match 'api/careers/\(\.\*\)' -and $content -match '127\.0\.0\.1:4000'
}

function Test-FormsClamAv {
  $clamd = Get-Command clamd.exe -ErrorAction SilentlyContinue
  if (-not $clamd) { $clamd = Get-ChildItem 'C:\Program Files' -Filter clamd.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 }
  $freshclam = Get-Command freshclam.exe -ErrorAction SilentlyContinue
  if (-not $freshclam) { $freshclam = Get-ChildItem 'C:\Program Files' -Filter freshclam.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 }
  $listener = Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  $dbFiles = Get-ChildItem 'C:\ProgramData\ClamAV' -Include '*.cvd', '*.cld' -Recurse -ErrorAction SilentlyContinue
  $clamdPath = if ($clamd -and $clamd.PSObject.Properties.Name -contains 'Source') { $clamd.Source } elseif ($clamd) { $clamd.FullName } else { '' }
  $freshclamPath = if ($freshclam -and $freshclam.PSObject.Properties.Name -contains 'Source') { $freshclam.Source } elseif ($freshclam) { $freshclam.FullName } else { '' }
  $clamdConfig = if ($clamdPath) { Get-ChildItem (Split-Path $clamdPath -Parent) -Filter clamd.conf -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName } else { '' }
  $freshclamConfig = if ($freshclamPath) { Get-ChildItem (Split-Path $freshclamPath -Parent) -Filter freshclam.conf -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName } else { '' }
  return @{ Installed = $null -ne $clamd -and $null -ne $freshclam; Listening = $null -ne $listener; Loopback = $listener -and $listener.LocalAddress -in @('127.0.0.1', '::1'); Signatures = @($dbFiles).Count -gt 0; Clamd = $clamd; Freshclam = $freshclam; ClamdPath = $clamdPath; FreshclamPath = $freshclamPath; ClamdConfig = $clamdConfig; FreshclamConfig = $freshclamConfig }
}

function Set-FormsClamConfigValue {
  param([string]$Path, [string]$Name, [string]$Value)
  $lines = @(Get-Content -LiteralPath $Path | Where-Object { $_ -notmatch '^\s*Example\s*$' })
  $pattern = '^\s*#?\s*' + [regex]::Escape($Name) + '\s+.*$'
  $updated = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index] -match $pattern) { $lines[$index] = "$Name $Value"; $updated = $true }
  }
  if (-not $updated) { $lines += "$Name $Value" }
  Set-Content -LiteralPath $Path -Value $lines -Encoding UTF8
}

function Update-FormsClamAv {
  param([hashtable]$State)
  if (-not $State.Installed) {
    if ($WhatIfPreference) { Write-FormsStatus WARN 'ClamAV' 'Installation requires IT software approval.'; return }
    throw 'ClamAV installation requires IT software approval. All other deployment preparation is complete.'
  }
  if (-not $State.ClamdConfig -or -not $State.FreshclamConfig) { throw 'ClamAV configuration files could not be located safely.' }
  if ($WhatIfPreference) { Write-FormsStatus INFO 'ClamAV configuration' 'Would enforce clamd loopback address and port 3310'; return }
  Set-FormsClamConfigValue -Path $State.ClamdConfig -Name 'TCPSocket' -Value '3310'
  Set-FormsClamConfigValue -Path $State.ClamdConfig -Name 'TCPAddr' -Value '127.0.0.1'
  $service = Get-Service -Name clamd -ErrorAction SilentlyContinue
  if (-not $service) {
    & $State.ClamdPath --install-service | Out-Null
    $service = Get-Service -Name clamd -ErrorAction SilentlyContinue
  }
  if (-not $service) { throw 'ClamAV service could not be installed from the detected official binary.' }
  $freshclamPath = $State.FreshclamPath
  & $freshclamPath | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'ClamAV signature update failed.' }
  Restart-Service -Name clamd -Force
  $updated = Test-FormsClamAv
  if (-not $updated.Signatures -or -not $updated.Listening -or -not $updated.Loopback) { throw 'ClamAV must have signatures and listen only on 127.0.0.1:3310.' }
}

function Register-LakeFormsTask {
  param([string]$ProjectRoot, [string]$NodePath)
  $formsIndex = Join-Path $ProjectRoot 'backend\src\forms-index.js'
  $workingDirectory = Join-Path $ProjectRoot 'backend'
  $command = 'set "DOTENV_CONFIG_PATH={0}"&& "{1}" "{2}"' -f $script:FormsEnvPath, $NodePath, $formsIndex
  if ($WhatIfPreference) { Write-FormsStatus INFO 'Node startup task' 'Would create/update LakeGroupForms'; return }
  $action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\cmd.exe" -Argument "/d /c $command" -WorkingDirectory $workingDirectory
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Days 365)
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  Register-ScheduledTask -TaskName $script:TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Lake Group public contact and careers forms service' -Force | Out-Null
  Start-ScheduledTask -TaskName $script:TaskName
}

function Invoke-FormsSmtpVerification {
  param([string]$ProjectRoot)
  if ($WhatIfPreference) { Write-FormsStatus INFO 'SMTP' 'Would verify SMTP without sending email'; return $true }
  $oldPath = $env:DOTENV_CONFIG_PATH
  try {
    $env:DOTENV_CONFIG_PATH = $script:FormsEnvPath
    Push-Location (Join-Path $ProjectRoot 'backend')
    & npm.cmd run forms:verify-smtp | Out-Null
    return $LASTEXITCODE -eq 0
  } finally { Pop-Location; $env:DOTENV_CONFIG_PATH = $oldPath }
}

function Test-FormsEndpoint {
  param([string]$Uri)
  try { $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 15; return @{ Pass = $response.StatusCode -eq 200; Status = $response.StatusCode } }
  catch { $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }; return @{ Pass = $false; Status = $status } }
}

function Test-FormsPrivatePorts {
  $node = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  $clam = Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return @{ Node = $node -and $node.LocalAddress -in @('127.0.0.1', '::1'); Clam = $clam -and $clam.LocalAddress -in @('127.0.0.1', '::1') }
}

function Find-FormsDangerousFirewallRules {
  $matches = @()
  foreach ($rule in Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -ErrorAction SilentlyContinue) {
    $filter = $rule | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
    if ($filter.LocalPort -in @('4000', '3310', '5432')) { $matches += $rule.DisplayName }
  }
  return $matches
}

function Start-LakeFormsDeployment {
  [CmdletBinding()]
  param([string]$ScriptRoot, [string]$ProjectRoot, [string]$SiteName, [string]$DatabaseUrlRuntime, [switch]$SkipSoftwareInstall, [switch]$VerifyOnly)
  Write-Host "Lake Group Forms Deployment`n---------------------------"
  if (-not (Test-FormsAdministrator)) { throw 'Administrator rights are required. Right-click PowerShell and choose "Run as Administrator".' }
  Initialize-FormsDirectories; Write-FormsStatus PASS 'Administrator'
  $root = Resolve-LakeFormsProjectRoot -ScriptRoot $ScriptRoot -ProjectRoot $ProjectRoot; Write-FormsStatus PASS 'Website located' $root
  if ($VerifyOnly) { Invoke-LakeFormsVerification -ScriptRoot $ScriptRoot -ProjectRoot $root -SiteName $SiteName; return }
  $node = Test-FormsNode; if (-not $node.Pass) { throw $node.Detail }; Write-FormsStatus PASS 'Node.js' $node.Detail
  $iisSite = Get-LakeIisSite -SiteName $SiteName
  if ((Resolve-Path $iisSite.physicalPath).Path -ne $root) { throw 'IIS site physical root does not match the approved project root. Refusing to overwrite another site.' }
  $snapshot = New-FormsSnapshot -ProjectRoot $root -SiteName $iisSite.Name; Write-FormsStatus PASS 'Restore snapshot' $snapshot
  $db = Find-FormsDatabaseUrl -ProjectRoot $root -ProvidedValue $DatabaseUrlRuntime
  if (-not $db) { $db = Read-Host 'Private local DATABASE_URL_RUNTIME' }
  if (-not $db) { throw 'DATABASE_URL_RUNTIME is required; replay and rate-limit security cannot be weakened.' }
  $current = Get-FormsEnvValues
  $appPassword = $null
  if (-not $current.SMTP_PASS -and -not $WhatIfPreference) { $appPassword = Read-Host 'Gmail App Password' -AsSecureString }
  Set-FormsConfiguration -DatabaseUrlRuntime $db -SmtpPassword $appPassword
  if (-not (Test-FormsRecipientLock)) { throw 'Recipient lock failed. Both forms must use the temporary test recipient.' }; Write-FormsStatus PASS 'Forms configuration'
  Invoke-FormsDependencies -ProjectRoot $root; Write-FormsStatus PASS 'Backend dependencies'
  $clam = Test-FormsClamAv; Update-FormsClamAv -State $clam; Write-FormsStatus PASS 'ClamAV and signatures'
  $iis = Test-FormsIisComponents
  if (-not $iis.IIS -or -not $iis.Rewrite -or -not $iis.ARR -or -not $iis.Proxy) { throw 'IIS URL Rewrite and ARR Proxy must be installed and enabled.' }
  if (-not (Test-FormsWebConfigRoutes -ProjectRoot $root)) { throw 'Approved web.config does not contain both loopback forms proxy routes.' }; Write-FormsStatus PASS 'IIS, URL Rewrite, ARR Proxy'
  if (-not (Invoke-FormsSmtpVerification -ProjectRoot $root)) { throw 'SMTP authentication failed. Check the Gmail App Password.' }; Write-FormsStatus PASS 'SMTP'
  Register-LakeFormsTask -ProjectRoot $root -NodePath $node.NodePath; Start-Sleep -Seconds 3; Write-FormsStatus PASS 'Node startup task'
  Invoke-LakeFormsVerification -ScriptRoot $ScriptRoot -ProjectRoot $root -SiteName $iisSite.Name
}

function Invoke-LakeFormsVerification {
  [CmdletBinding()]
  param([string]$ScriptRoot, [string]$ProjectRoot, [string]$SiteName)
  Initialize-FormsDirectories; Write-Host "Lake Group Forms Verification`n============================="
  $root = Resolve-LakeFormsProjectRoot -ScriptRoot $ScriptRoot -ProjectRoot $ProjectRoot
  $node = Test-FormsNode; Write-FormsStatus $(if ($node.Pass) { 'PASS' } else { 'FAIL' }) 'Node runtime' $node.Detail
  $task = Get-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue; Write-FormsStatus $(if ($task) { 'PASS' } else { 'FAIL' }) 'Forms process'
  $contact = Test-FormsEndpoint 'http://127.0.0.1:4000/api/contact/token'; Write-FormsStatus $(if ($contact.Pass) { 'PASS' } else { 'FAIL' }) 'Contact localhost' ([string]$contact.Status)
  $careers = Test-FormsEndpoint 'http://127.0.0.1:4000/api/careers/token'; Write-FormsStatus $(if ($careers.Pass) { 'PASS' } else { 'FAIL' }) 'Careers localhost' ([string]$careers.Status)
  $clam = Test-FormsClamAv; Write-FormsStatus $(if ($clam.Listening -and $clam.Loopback) { 'PASS' } else { 'FAIL' }) 'ClamAV'; Write-FormsStatus $(if ($clam.Signatures) { 'PASS' } else { 'FAIL' }) 'ClamAV signatures'
  $iis = Test-FormsIisComponents; Write-FormsStatus $(if ($iis.IIS) { 'PASS' } else { 'FAIL' }) 'IIS'; Write-FormsStatus $(if ($iis.Rewrite) { 'PASS' } else { 'FAIL' }) 'URL Rewrite'; Write-FormsStatus $(if ($iis.ARR -and $iis.Proxy) { 'PASS' } else { 'FAIL' }) 'ARR Proxy'
  $publicContact = Test-FormsEndpoint "$script:ExpectedOrigin/api/contact/token"; Write-FormsStatus $(if ($publicContact.Pass) { 'PASS' } else { 'FAIL' }) 'Contact public API' ([string]$publicContact.Status)
  $publicCareers = Test-FormsEndpoint "$script:ExpectedOrigin/api/careers/token"; Write-FormsStatus $(if ($publicCareers.Pass) { 'PASS' } else { 'FAIL' }) 'Careers public API' ([string]$publicCareers.Status)
  $ports = Test-FormsPrivatePorts; Write-FormsStatus $(if ($ports.Node) { 'PASS' } else { 'FAIL' }) 'Node private binding'; Write-FormsStatus $(if ($ports.Clam) { 'PASS' } else { 'FAIL' }) 'ClamAV private binding'
  Write-FormsStatus $(if (Test-FormsRecipientLock) { 'PASS' } else { 'FAIL' }) 'Recipient lock'
  $acl = if (Test-Path $script:FormsEnvPath) { (Get-Acl $script:FormsEnvPath).AreAccessRulesProtected } else { $false }; Write-FormsStatus $(if ($acl) { 'PASS' } else { 'FAIL' }) 'Secret file ACL'
  $dangerous = Find-FormsDangerousFirewallRules; Write-FormsStatus $(if ($dangerous.Count -eq 0) { 'PASS' } else { 'WARN' }) 'Private-port firewall' ($dangerous -join ', ')
  $active = Get-Content -LiteralPath (Join-Path $root 'backend\src\forms-index.js') -Raw; $zeroCost = $active -notmatch 'resend|render|vercel|s3|redis'; Write-FormsStatus $(if ($zeroCost) { 'PASS' } else { 'FAIL' }) 'No paid service dependency'
  if ($node.Pass -and $task -and $contact.Pass -and $careers.Pass -and $clam.Listening -and $clam.Loopback -and $clam.Signatures -and $iis.IIS -and $iis.Rewrite -and $iis.ARR -and $iis.Proxy -and $publicContact.Pass -and $publicCareers.Pass -and $ports.Node -and $ports.Clam -and (Test-FormsRecipientLock) -and $acl -and $dangerous.Count -eq 0 -and $zeroCost) { Write-Host "`nOVERALL: READY FOR CONTROLLED EMAIL TESTING"; return $true }
  Write-Host "`nOVERALL: NOT READY FOR FORM TESTING"; return $false
}

function Restore-LakeFormsDeployment {
  [CmdletBinding()]
  param([string]$Snapshot)
  if (-not (Test-FormsAdministrator)) { throw 'Administrator rights are required.' }
  if (-not $Snapshot) { $Snapshot = Get-ChildItem $script:FormsBackupDirectory -Directory | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName }
  if (-not $Snapshot -or -not (Test-Path (Join-Path $Snapshot 'manifest.json'))) { throw 'No deployment snapshot was found.' }
  $manifest = Get-Content (Join-Path $Snapshot 'manifest.json') -Raw | ConvertFrom-Json
  if ($WhatIfPreference) { Write-FormsStatus INFO 'Rollback' "Would restore $Snapshot"; return }
  Stop-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue
  if (Test-Path (Join-Path $Snapshot 'forms.env')) { Copy-Item (Join-Path $Snapshot 'forms.env') $script:FormsEnvPath -Force }
  if (Test-Path (Join-Path $Snapshot 'web.config')) { Copy-Item (Join-Path $Snapshot 'web.config') (Join-Path $manifest.projectRoot 'web.config') -Force }
  if ($manifest.clamdConfig -and (Test-Path (Join-Path $Snapshot 'clamd.conf'))) { Copy-Item (Join-Path $Snapshot 'clamd.conf') $manifest.clamdConfig -Force }
  if ($manifest.freshclamConfig -and (Test-Path (Join-Path $Snapshot 'freshclam.conf'))) { Copy-Item (Join-Path $Snapshot 'freshclam.conf') $manifest.freshclamConfig -Force }
  if (Test-Path (Join-Path $Snapshot 'LakeGroupForms.task.xml')) { Register-ScheduledTask -TaskName $script:TaskName -Xml (Get-Content (Join-Path $Snapshot 'LakeGroupForms.task.xml') -Raw) -Force | Out-Null }
  Restart-Service -Name clamd -Force -ErrorAction SilentlyContinue
  & "$env:SystemRoot\System32\inetsrv\appcmd.exe" recycle apppool /apppool.name:$manifest.siteName 2>$null
  Write-FormsStatus PASS 'Rollback' 'Snapshot restored; shared prerequisites were not removed.'
}

function Uninstall-LakeFormsDeployment {
  if (-not (Test-FormsAdministrator)) { throw 'Administrator rights are required.' }
  if ($WhatIfPreference) { Write-FormsStatus INFO 'Uninstall' 'Would remove deployment-owned task and protected forms configuration'; return }
  Stop-ScheduledTask -TaskName $script:TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $script:TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $script:FormsEnvPath -Force -ErrorAction SilentlyContinue
  Write-FormsStatus PASS 'Uninstall' 'Removed only Lake Group Forms task and configuration.'
}

Export-ModuleMember -Function Write-FormsStatus, Start-LakeFormsDeployment, Invoke-LakeFormsVerification, Restore-LakeFormsDeployment, Uninstall-LakeFormsDeployment, Resolve-LakeFormsProjectRoot, Test-FormsRecipientLock, Protect-FormsText
