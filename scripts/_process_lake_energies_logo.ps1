<#
.SYNOPSIS
  Convert LG24 Energies (black plate) into a trimmed transparent PNG for navbar use.
  Keys out near-black background so yellow + white wordmarks stay intact.
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $PSScriptRoot
$Src = Join-Path $Root 'docs\All Logos\LG - All Logo PNG\LG24 - Energies.png'
$Dst = Join-Path $Root 'assets\images\logos\companies\lake-energies.png'
$Backup = Join-Path $Root 'assets\images\logos\companies\_pretrim\lake-energies.png'

$srcImg = [System.Drawing.Image]::FromFile($Src)
$w = $srcImg.Width; $h = $srcImg.Height
$bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($srcImg, 0, 0, $w, $h)
$g.Dispose()
$srcImg.Dispose()

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $bmpData.Stride
$bytes = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $bytes, 0, $bytes.Length)

# Soft-key near-black plate; preserve yellow mark + white ENERGIES wordmark.
$lowT = 18
$highT = 48
$range = [Math]::Max(1, $highT - $lowT)
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $row + ($x * 4)
    $b = $bytes[$i]; $gg = $bytes[$i + 1]; $r = $bytes[$i + 2]
    # Skip clearly chromatic / bright logo pixels
    $max = [Math]::Max($r, [Math]::Max($gg, $b))
    $min = [Math]::Min($r, [Math]::Min($gg, $b))
    if (($max - $min) -gt 40 -or $max -gt 90) { continue }
    $brightness = ($r + $gg + $b) / 3.0
    if ($brightness -le $lowT) {
      $bytes[$i + 3] = 0
    } elseif ($brightness -lt $highT) {
      $t = ($brightness - $lowT) / $range
      $bytes[$i + 3] = [byte]([Math]::Round(255 * $t))
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bmpData.Scan0, $bytes.Length)
$bmp.UnlockBits($bmpData)

$minX = $w; $maxX = 0; $minY = $h; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $stride
  for ($x = 0; $x -lt $w; $x++) {
    if ($bytes[$row + ($x * 4) + 3] -gt 10) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
if ($maxX -lt $minX) { throw 'No opaque pixels found after black-key' }

$pad = [int]([Math]::Max($maxX - $minX, $maxY - $minY) * 0.04)
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($w - 1, $maxX + $pad)
$maxY = [Math]::Min($h - 1, $maxY + $pad)
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1

$cropped = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gc = [System.Drawing.Graphics]::FromImage($cropped)
$gc.DrawImage($bmp,
  (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)),
  (New-Object System.Drawing.Rectangle($minX, $minY, $cropW, $cropH)),
  [System.Drawing.GraphicsUnit]::Pixel)
$gc.Dispose()
$bmp.Dispose()

New-Item -ItemType Directory -Force -Path (Split-Path $Backup) | Out-Null
Copy-Item $Src $Backup -Force
$cropped.Save($Dst, [System.Drawing.Imaging.ImageFormat]::Png)

$c00 = $cropped.GetPixel(0, 0)
$sampleX = [Math]::Min([int]($cropW * 0.72), $cropW - 1)
$sampleY = [Math]::Min([int]($cropH * 0.78), $cropH - 1)
$cs = $cropped.GetPixel($sampleX, $sampleY)
Write-Host ("Saved {0}: {1}x{2}" -f $Dst, $cropW, $cropH)
Write-Host ("corner A={0} sampleRGBA=({1},{2},{3},A{4})" -f $c00.A, $cs.R, $cs.G, $cs.B, $cs.A)
$cropped.Dispose()
