# Generate Lake Cylinders / AFICD / AILL PNGs from lake-group-placeholder.png
# Wipe entire GROUP subtitle band (all opaque pixels), then redraw subtitle.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot '..\assets\images\logos\companies'
$srcPath = (Resolve-Path (Join-Path $dir 'lake-group-placeholder.png')).Path
Write-Host "Loading $srcPath"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Size: $($src.Width) x $($src.Height)"

# Locate opaque white "GROUP"
$minX = $src.Width; $maxX = -1; $minY = $src.Height; $maxY = -1; $count = 0
for ($y = 0; $y -lt $src.Height; $y++) {
  for ($x = 0; $x -lt $src.Width; $x++) {
    $c = $src.GetPixel($x, $y)
    if ($c.A -lt 200) { continue }
    if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
      $count++
    }
  }
}
Write-Host "GROUP: $count  X=$minX-$maxX  Y=$minY-$maxY"

$yellowCols = New-Object int[] $src.Width
$maxYX = 0
for ($x = 0; $x -lt $src.Width; $x++) {
  $n = 0
  for ($y = 0; $y -lt $src.Height; $y++) {
    $c = $src.GetPixel($x, $y)
    if ($c.A -lt 200) { continue }
    if ($c.R -gt 200 -and $c.G -gt 180 -and $c.B -lt 90) {
      $n++; if ($x -gt $maxYX) { $maxYX = $x }
    }
  }
  $yellowCols[$x] = $n
}
$iconStart = -1; $gapStart = -1; $lakeStart = $src.Width
for ($x = 0; $x -lt $src.Width; $x++) {
  if ($iconStart -lt 0 -and $yellowCols[$x] -gt 0) { $iconStart = $x }
  elseif ($iconStart -ge 0 -and $gapStart -lt 0 -and $yellowCols[$x] -eq 0) { $gapStart = $x }
  elseif ($gapStart -ge 0 -and $lakeStart -eq $src.Width -and $yellowCols[$x] -gt 0) { $lakeStart = $x; break }
}
Write-Host "LakeStart=$lakeStart LakeEnd=$maxYX"

function Wipe-Band([System.Drawing.Bitmap]$bmp, [int]$x0, [int]$y0, [int]$x1, [int]$y1) {
  $clear = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
  for ($y = $y0; $y -le $y1; $y++) {
    for ($x = $x0; $x -le $x1; $x++) {
      if ($x -lt 0 -or $y -lt 0 -or $x -ge $bmp.Width -or $y -ge $bmp.Height) { continue }
      $c = $bmp.GetPixel($x, $y)
      if ($c.A -eq 0) { continue }
      # Never wipe yellow (Lake / icon) — safety if band overlaps
      if ($c.R -gt 200 -and $c.G -gt 180 -and $c.B -lt 100 -and $c.A -gt 80) { continue }
      $bmp.SetPixel($x, $y, $clear)
    }
  }
}

function New-Logo([string]$subtitle, [string]$outName) {
  $bmp = $src.Clone()
  $padY = 14
  $x0 = 0
  $y0 = [Math]::Max(0, $minY - $padY)
  $x1 = $src.Width - 1
  $y1 = [Math]::Min($src.Height - 1, $maxY + $padY)
  # Full-width wipe of subtitle band eliminates GROUP ghosts between letters
  Wipe-Band $bmp $x0 $y0 $x1 $y1

  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Match optical weight of real Lake subtitles (GAS/OIL): medium, not heavy Bold.
  $targetH = [Math]::Max(14, ($maxY - $minY + 1))
  $fontSize = [single]($targetH * 0.92)
  $font = New-Object System.Drawing.Font 'Arial', $fontSize, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)

  $chars = $subtitle.ToCharArray()
  $charWidths = New-Object System.Collections.Generic.List[double]
  $natural = 0.0
  foreach ($ch in $chars) {
    $sz = $g.MeasureString([string]$ch, $font)
    $w = [Math]::Max(1.0, $sz.Width * 0.66)
    $charWidths.Add($w) | Out-Null
    $natural += $w
  }

  $spanLeft = $minX
  $spanWidth = $maxX - $minX
  $maxRight = [Math]::Min($src.Width - 6, $maxYX + 4)

  if ($subtitle.Length -ge 8) {
    $desired = [Math]::Min($maxRight - $spanLeft, [Math]::Max($spanWidth, $natural * 1.15))
  } else {
    # Short acronyms: match original GROUP span (wide tracking)
    $desired = $spanWidth
  }

  $gaps = [Math]::Max(1, $chars.Length - 1)
  $extra = ($desired - $natural) / $gaps
  if ($extra -lt 4) { $extra = 4 }
  $totalW = $natural + ($extra * ($chars.Length - 1))
  if ($totalW -gt ($maxRight - $spanLeft + 8)) {
    $extra = [Math]::Max(3.0, (($maxRight - $spanLeft) - $natural) / $gaps)
    $totalW = $natural + ($extra * ($chars.Length - 1))
  }

  $startX = $spanLeft + ($spanWidth - $totalW) / 2.0
  if ($startX -lt $lakeStart) { $startX = $lakeStart }
  if ($startX + $totalW -gt $maxRight) { $startX = $maxRight - $totalW }

  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $textY = [single]($minY)
  $xPos = $startX
  for ($i = 0; $i -lt $chars.Length; $i++) {
    $g.DrawString([string]$chars[$i], $font, $brush, [single]$xPos, $textY)
    $xPos += $charWidths[$i] + $extra
  }

  $brush.Dispose(); $font.Dispose(); $g.Dispose()

  $outPath = Join-Path $dir $outName
  if (Test-Path $outPath) { Remove-Item $outPath -Force }
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $outName  startX=$([int]$startX) totalW=$([int]$totalW) extra=$([Math]::Round($extra,1))"
}

New-Logo 'CYLINDERS' 'lake-cylinders.png'
New-Logo 'AFICD' 'aficd.png'
New-Logo 'AILL' 'aill.png'
$src.Dispose()
Write-Host 'Done.'
