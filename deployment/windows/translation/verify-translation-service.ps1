[CmdletBinding()]
param([string]$InstallRoot = "$env:ProgramData\Lake Group\Translation")
$ErrorActionPreference = 'Stop'
$task = Get-ScheduledTask -TaskName 'LakeGroupTranslation' -ErrorAction SilentlyContinue
$info = if ($task) { Get-ScheduledTaskInfo -TaskName 'LakeGroupTranslation' } else { $null }
$report = [ordered]@{ TaskPresent = [bool]$task; State = if ($task) { $task.State } else { 'absent' }; LastRun = if ($info) { $info.LastRunTime } else { $null }; LastTaskResult = if ($info) { $info.LastTaskResult } else { $null }; ConfigPresent = Test-Path (Join-Path $InstallRoot 'config\engine.json'); ModelWeightsDetected = 'NOT TESTED'; DatabaseMigration = 'NOT TESTED'; TranslationQuality = 'NOT TESTED'; PublicTranslationEndpoint = 'None provided by worker shell' }
$report | ConvertTo-Json -Depth 4
