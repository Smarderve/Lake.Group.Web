[CmdletBinding()]
param([Parameter(Mandatory)][string]$InstallRoot, [int]$OllamaPort = 11434)
$ErrorActionPreference = 'Stop'
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$runtime = Join-Path $InstallRoot 'ai\runtime\ollama\ollama.exe'
$models = Join-Path $InstallRoot 'ai\models'
$logs = Join-Path $InstallRoot 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
if (-not (Test-Path -LiteralPath $runtime -PathType Leaf)) { throw 'Bundled Ollama runtime is missing.' }
$env:OLLAMA_MODELS = $models
$env:OLLAMA_HOST = "127.0.0.1:$OllamaPort"
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_TRANSFER_STREAMS = '4'
$env:OLLAMA_NO_CLOUD = '1'
$process = Start-Process -FilePath $runtime -ArgumentList @('serve') -WorkingDirectory $InstallRoot -NoNewWindow -Wait -PassThru -RedirectStandardOutput (Join-Path $logs 'ollama.stdout.log') -RedirectStandardError (Join-Path $logs 'ollama.stderr.log')
exit $process.ExitCode
