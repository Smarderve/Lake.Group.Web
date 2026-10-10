[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$InstallRoot,
  [Parameter(Mandatory)][string]$NodeExecutable,
  [int]$BackendPort = 4001,
  [int]$OllamaPort = 11434,
  [Parameter(Mandatory)][string]$AllowedOrigins
)
$ErrorActionPreference = 'Stop'
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$NodeExecutable = [IO.Path]::GetFullPath($NodeExecutable)
$backend = Join-Path $InstallRoot 'backend'
$logs = Join-Path $InstallRoot 'logs'
if (-not (Test-Path -LiteralPath $NodeExecutable -PathType Leaf)) { throw 'Node.js executable is missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $backend 'node_modules\express\package.json') -PathType Leaf)) { throw 'Backend dependencies are not installed.' }
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$env:LAKE_ASSISTANT_OLLAMA_PORT = [string]$OllamaPort
$env:LAKE_ASSISTANT_ALLOWED_ORIGINS = $AllowedOrigins
$env:NODE_ENV = 'production'
$env:OLLAMA_MODELS = Join-Path $InstallRoot 'ai\models'
$env:OLLAMA_HOST = "127.0.0.1:$OllamaPort"
$env:PORT = [string]$BackendPort
Push-Location $backend
try {
  $process = Start-Process -FilePath $NodeExecutable -ArgumentList @('src/assistant-index.js') -WorkingDirectory $backend -NoNewWindow -Wait -PassThru -RedirectStandardOutput (Join-Path $logs 'backend.stdout.log') -RedirectStandardError (Join-Path $logs 'backend.stderr.log')
  exit $process.ExitCode
} finally { Pop-Location }
