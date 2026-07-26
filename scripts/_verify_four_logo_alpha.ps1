Add-Type -AssemblyName System.Drawing
$files = @('atl.png','lake-agro.png','cross-country.png','ocean-galleria.png')
$dir = Join-Path $PSScriptRoot '..\assets\images\logos\companies'
foreach ($f in $files) {
  $p = Join-Path $dir $f
  $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p))
  Write-Host ""
  Write-Host ("{0} {1}x{2} pf={3} size={4}" -f $f, $bmp.Width, $bmp.Height, $bmp.PixelFormat, (Get-Item $p).Length)
  foreach ($s in @(
    @{n='TL';x=0;y=0},
    @{n='TR';x=($bmp.Width-1);y=0},
    @{n='BL';x=0;y=($bmp.Height-1)},
    @{n='BR';x=($bmp.Width-1);y=($bmp.Height-1)},
    @{n='C';x=[int]($bmp.Width/2);y=[int]($bmp.Height/2)}
  )) {
    $px = $bmp.GetPixel($s.x, $s.y)
    Write-Host ("  {0}: A={1} R={2} G={3} B={4}" -f $s.n, $px.A, $px.R, $px.G, $px.B)
  }
  $trans = 0; $opaque = 0
  $stepY = [Math]::Max(1, [int]($bmp.Height / 50))
  $stepX = [Math]::Max(1, [int]($bmp.Width / 50))
  for ($y = 0; $y -lt $bmp.Height; $y += $stepY) {
    for ($x = 0; $x -lt $bmp.Width; $x += $stepX) {
      if ($bmp.GetPixel($x, $y).A -lt 16) { $trans++ } else { $opaque++ }
    }
  }
  Write-Host ("  grid transparent={0} opaque={1}" -f $trans, $opaque)
  $bmp.Dispose()
}
