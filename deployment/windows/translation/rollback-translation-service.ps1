[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference = 'Stop'
$task = Get-ScheduledTask -TaskName 'LakeGroupTranslation' -ErrorAction SilentlyContinue
if ($task) { Stop-ScheduledTask -TaskName 'LakeGroupTranslation' -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName 'LakeGroupTranslation' -Confirm:$false }
Write-Output 'Removed only the LakeGroupTranslation scheduled task. Database rows, model files, CMS, IIS, Qwen, Whisper and forms were not changed.'
