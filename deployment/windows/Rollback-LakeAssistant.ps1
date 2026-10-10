#Requires -RunAsAdministrator
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory)][string]$IisSiteName,
  [string]$InstallRoot = (Join-Path $env:ProgramData 'Lake Group\Assistant')
)
$ErrorActionPreference = 'Stop'
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$taskDescription = 'Managed by Lake Group self-hosted Assistant installer.'
Import-Module WebAdministration -ErrorAction Stop
$site = Get-Website -Name $IisSiteName -ErrorAction Stop
$webConfig = Join-Path ([IO.Path]::GetFullPath($site.PhysicalPath)) 'web.config'
if ($PSCmdlet.ShouldProcess('LakeAssistant-Ollama', 'Stop and remove only the Lake Group assistant startup task')) {
  foreach ($name in @('LakeAssistant-Backend', 'LakeAssistant-Ollama')) {
    $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if (-not $task) { continue }
    $xml = [xml](Export-ScheduledTask -TaskName $name)
    if ($xml.Task.RegistrationInfo.Description -ne $taskDescription) { throw "Task $name is not identified as Lake-managed; refusing removal." }
    Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
  }
}
if (Test-Path -LiteralPath $webConfig -PathType Leaf) {
  $doc = New-Object Xml.XmlDocument; $doc.PreserveWhitespace = $true; $doc.Load($webConfig)
  $rule = $doc.SelectSingleNode("/configuration/system.webServer/rewrite/rules/rule[@name='Lake Assistant private API']")
  if ($rule -and $PSCmdlet.ShouldProcess($webConfig, 'Remove only the Lake Assistant-owned IIS rewrite rule')) {
    $backupDirectory = Join-Path $InstallRoot ('rollback\manual-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
    Copy-Item -LiteralPath $webConfig -Destination (Join-Path $backupDirectory 'web.config') -Force
    [void]$rule.ParentNode.RemoveChild($rule)
    $doc.Save($webConfig)
  }
}
Write-Host 'Assistant routing and managed startup tasks were rolled back. Runtime/model files and all unrelated IIS content were preserved.'
