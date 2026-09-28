[CmdletBinding(SupportsShouldProcess = $true)]
param([string]$ProjectRoot)

$ErrorActionPreference = 'Stop'
$root = if ($ProjectRoot) { (Resolve-Path $ProjectRoot).Path } else { (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
$base = Join-Path $env:ProgramData 'LakeGroup\FormsLocal'; $pgRoot = Join-Path $base 'Postgres'; $data = Join-Path $pgRoot 'data'; $envPath = Join-Path $base 'forms-local.env'
if (-not (Test-Path (Join-Path $root 'backend\src\forms-local-index.js'))) { throw 'Approved project root was not found.' }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 22.6+ must be installed.' }
$version = (& $node.Source --version).Trim()
if ($version -notmatch '^v(\d+)\.(\d+)' -or [int]$Matches[1] -lt 22 -or ([int]$Matches[1] -eq 22 -and [int]$Matches[2] -lt 6)) { throw 'Node.js 22.6+ must be installed.' }
function Get-FormsPostgresBin {
  $service = Get-CimInstance Win32_Service -Filter "Name='postgresql-x64-18'" -ErrorAction SilentlyContinue
  if ($service -and $service.PathName -match '"([^"]+\\bin)\\postgres(?:\.exe)?"') { return $Matches[1] }
  $candidate = 'C:\Program Files\PostgreSQL\18\bin'
  if ((Test-Path (Join-Path $candidate 'initdb.exe')) -and (Test-Path (Join-Path $candidate 'pg_ctl.exe'))) { return $candidate }
  throw 'PostgreSQL 18 binaries were not found. The existing PostgreSQL service is not modified.'
}
function New-SafePassword { $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; -join (1..48 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] }) }
function Read-FormsEnv([string]$Path) { $values = @{}; Get-Content -LiteralPath $Path | ForEach-Object { if ($_ -match '^([A-Z0-9_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2].Trim('"') } }; return $values }
function Get-UrlParts([string]$Url) { $match = [regex]::Match($Url, '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)'); if (-not $match.Success) { throw 'The protected local database URL is malformed.' }; return @{ User = $match.Groups[1].Value; Password = $match.Groups[2].Value; Host = $match.Groups[3].Value; Port = $match.Groups[4].Value; Database = $match.Groups[5].Value } }
function Protect-FormsEnv([string]$Path) {
  $acl = Get-Acl $Path; $acl.SetAccessRuleProtection($true, $false); foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRule($rule) }
  $current = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  foreach ($account in @('BUILTIN\Administrators', 'NT AUTHORITY\SYSTEM', $current)) { $rights = if ($account -eq $current) { 'Read' } else { 'FullControl' }; [void]$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($account, $rights, 'Allow'))) }
  Set-Acl -LiteralPath $Path -AclObject $acl
}
$bin = Get-FormsPostgresBin
if ($WhatIfPreference) { Write-Host '[INFO] Would initialize or reuse the dedicated loopback PostgreSQL cluster and protected local configuration.'; exit 0 }
New-Item -ItemType Directory -Path $pgRoot -Force | Out-Null
$created = $false
if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
  $created = $true; $ownerPassword = New-SafePassword; $runtimePassword = New-SafePassword; $pwFile = Join-Path $pgRoot ('initdb-' + [guid]::NewGuid().ToString('N') + '.txt')
  [IO.File]::WriteAllText($pwFile, $ownerPassword)
  try { & (Join-Path $bin 'initdb.exe') -D $data --username=lake_forms_owner --pwfile=$pwFile --auth=scram-sha-256 --encoding=UTF8 --locale=C | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Dedicated PostgreSQL initialization failed.' } } finally { Remove-Item $pwFile -Force -ErrorAction SilentlyContinue }
  Add-Content -LiteralPath (Join-Path $data 'postgresql.conf') -Value "`n# Lake Group local forms lab only`nlisten_addresses = '127.0.0.1'`nport = 55432"
} elseif (-not (Test-Path $envPath)) { throw 'The dedicated forms cluster exists but its protected configuration is missing. Refusing to reset or guess credentials.' }
& (Join-Path $bin 'pg_ctl.exe') -D $data status *> $null
if ($LASTEXITCODE -ne 0) { & (Join-Path $bin 'pg_ctl.exe') -D $data -l (Join-Path $pgRoot 'postgres.log') -w start | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Dedicated PostgreSQL cluster failed to start.' } }
if ($created) {
  $sql = Join-Path $pgRoot ('bootstrap-' + [guid]::NewGuid().ToString('N') + '.sql'); $env:PGPASSWORD = $ownerPassword
  try { @"
CREATE ROLE lake_forms_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '$runtimePassword';
CREATE DATABASE lakegroup_forms_test OWNER lake_forms_owner;
"@ | Set-Content -LiteralPath $sql -Encoding ascii; & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p 55432 -U lake_forms_owner -d postgres -v ON_ERROR_STOP=1 -f $sql | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Dedicated forms roles/database creation failed.' } } finally { Remove-Item $sql -Force -ErrorAction SilentlyContinue; Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
  $tokenBytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($tokenBytes); $token = [Convert]::ToBase64String($tokenBytes)
  @('FORMS_MODE=local-test', 'NODE_ENV=development', 'PORT=8080', "DATABASE_URL=postgresql://lake_forms_owner:$ownerPassword@127.0.0.1:55432/lakegroup_forms_test?schema=public", "DATABASE_URL_RUNTIME=postgresql://lake_forms_runtime:$runtimePassword@127.0.0.1:55432/lakegroup_forms_test?schema=public", "PUBLIC_FORM_TOKEN_SECRET=$token", 'SMTP_HOST=smtp.gmail.com', 'SMTP_PORT=587', 'SMTP_SECURE=false', 'SMTP_USER=projectdevemail001@gmail.com', 'MAIL_FROM="Lake Group Website Test <projectdevemail001@gmail.com>"', 'CONTACT_RECIPIENT_EMAIL=projectdevemail001@gmail.com', 'CAREERS_RECIPIENT_EMAIL=projectdevemail001@gmail.com', 'CONTACT_ALLOWED_ORIGINS=http://127.0.0.1:8080', 'CAREERS_ALLOWED_ORIGINS=http://127.0.0.1:8080', 'CAREERS_CLAMD_HOST=127.0.0.1', 'CAREERS_CLAMD_PORT=3310') | Set-Content -LiteralPath $envPath -Encoding UTF8; Protect-FormsEnv $envPath
}
$existing = Read-FormsEnv $envPath; $owner = Get-UrlParts $existing.DATABASE_URL; $env:PGPASSWORD = $owner.Password
try { Push-Location (Join-Path $root 'backend'); try { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }; $env:DATABASE_URL = $existing.DATABASE_URL; npm.cmd run db:generate; if ($LASTEXITCODE -ne 0) { throw 'Prisma generate failed.' }; npm.cmd run db:migrate; if ($LASTEXITCODE -ne 0) { throw 'Prisma migrations failed.' } } finally { Pop-Location }; & (Join-Path $bin 'psql.exe') -h $owner.Host -p $owner.Port -U $owner.User -d $owner.Database -v ON_ERROR_STOP=1 -c 'GRANT CONNECT ON DATABASE lakegroup_forms_test TO lake_forms_runtime; GRANT USAGE ON SCHEMA public TO lake_forms_runtime; GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rate_limit TO lake_forms_runtime;' | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Runtime role grant failed.' } } finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue; Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
if (-not $existing.SMTP_PASS) { $secure = Read-Host 'Gmail App Password' -AsSecureString; $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }; if (-not $password) { throw 'A Gmail App Password is required after the database passes setup.' }; Add-Content -LiteralPath $envPath -Value "SMTP_PASS=$password" -Encoding UTF8; Protect-FormsEnv $envPath }
Write-Host '[PASS] Dedicated PostgreSQL database is ready; Gmail credentials were requested only after database setup.'
