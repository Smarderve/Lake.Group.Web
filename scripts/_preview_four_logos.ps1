Add-Type -AssemblyName System.Drawing
$comp = Join-Path $PSScriptRoot '..\assets\images\logos\companies'
$outDir = Join-Path $env:TEMP 'lg-logo-preview'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$bg = [System.Drawing.Color]::FromArgb(255, 245, 247, 250) # light page-like
foreach ($f in @('atl.png','lake-agro.png','cross-country.png','ocean-galleria.png')) {
  $src = [System.Drawing.Bitmap]::FromFile((Resolve-Path (Join-Path $comp $f)))
  $canvas = New-Object System.Drawing.Bitmap $src.Width, $src.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear($bg)
  $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $g.Dispose()
  $dest = Join-Path $outDir $f
  $canvas.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "preview $dest"
  $canvas.Dispose(); $src.Dispose()
}
Write-Host "OUT=$outDir"
