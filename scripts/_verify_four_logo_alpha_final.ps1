$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot '..\assets\images\logos\companies'
foreach ($f in @('atl.png', 'lake-agro.png', 'cross-country.png', 'ocean-galleria.png')) {
  $p = Join-Path $dir $f
  $bmp = [System.Drawing.Bitmap]::FromFile(((Resolve-Path $p).Path))
  $corners = @(
    @{ n = 'TL'; x = 0; y = 0 },
    @{ n = 'TR'; x = ($bmp.Width - 1); y = 0 },
    @{ n = 'BL'; x = 0; y = ($bmp.Height - 1) },
    @{ n = 'BR'; x = ($bmp.Width - 1); y = ($bmp.Height - 1) }
  )
  $ok = $true
  $msg = "$f $($bmp.Width)x$($bmp.Height) $($bmp.PixelFormat)"
  foreach ($c in $corners) {
    $px = $bmp.GetPixel($c.x, $c.y)
    if ($px.A -ge 16) { $ok = $false }
    $msg += (" | {0}:A={1}" -f $c.n, $px.A)
  }
  $trans = 0; $opaque = 0; $darkPlate = 0; $yellowPlate = 0
  for ($y = 0; $y -lt $bmp.Height; $y += [Math]::Max(1, [int]($bmp.Height / 80))) {
    for ($x = 0; $x -lt $bmp.Width; $x += [Math]::Max(1, [int]($bmp.Width / 80))) {
      $px = $bmp.GetPixel($x, $y)
      if ($px.A -lt 16) { $trans++ }
      else {
        $opaque++
        $sum = [int]$px.R + [int]$px.G + [int]$px.B
        if ($sum -le 30 -and $px.A -gt 200) { $darkPlate++ }
        if ($px.R -gt 200 -and $px.G -gt 180 -and $px.B -lt 120 -and $px.A -gt 200) { $yellowPlate++ }
      }
    }
  }
  $status = if ($ok -and $trans -gt $opaque) { 'PASS' } else { 'FAIL' }
  Write-Host ("[{0}] {1} gridT={2} gridO={3} darkPlateHits={4} yellowPlateHits={5}" -f $status, $msg, $trans, $opaque, $darkPlate, $yellowPlate)
  $bmp.Dispose()
}
