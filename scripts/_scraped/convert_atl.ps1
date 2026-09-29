
Add-Type -AssemblyName System.Drawing
$src = 'C:\Users\aisha\Desktop\LakeGroup\lake.group.web\scripts\_scraped\atl_logo_src.jpg'
$dst = 'C:\Users\aisha\Desktop\LakeGroup\lake.group.web\assets\images\logos\companies\atl.png'
$img = [System.Drawing.Image]::FromFile($src)
$img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "saved" $dst
