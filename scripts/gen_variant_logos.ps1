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

function Measure-InternalLeading([single]$fontSize) {
  # Render a tall capital "O" on a temp bitmap and measure where the first
  # visible pixel appears vs where DrawString was called. The difference is
  # the internal leading that GDI+ adds above the cap line.
  $tmp = New-Object System.Drawing.Bitmap 200, 400
  $tg = [System.Drawing.Graphics]::FromImage($tmp)
  $tg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $tg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $tFont = New-Object System.Drawing.Font 'Arial', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $tBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,255,255,255))
  $tg.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
  $tg.DrawString('O', $tFont, $tBrush, 10.0, 10.0)
  
  # Find topmost non-transparent pixel
  $topY = -1
  :outer for ($y = 0; $y -lt $tmp.Height; $y++) {
    for ($x = 0; $x -lt $tmp.Width; $x++) {
      $c = $tmp.GetPixel($x, $y)
      if ($c.A -gt 60) { $topY = $y; break outer }
    }
  }
  $tFont.Dispose(); $tBrush.Dispose(); $tg.Dispose(); $tmp.Dispose()
  
  # DrawString was called at Y=10. The first visible pixel is at $topY.
  # Offset = 10 - topY (positive = text starts below draw point)
  $leading = 10.0 - [single]$topY
  Write-Host "  Internal leading: $([Math]::Round($leading,1)) px (fontSize=$([Math]::Round($fontSize))px)"
  return $leading
}

function New-Logo([string]$subtitle, [string]$outName) {
  $bmp = $src.Clone()

  # Bold weight — font size calculated to produce a cap height matching the
  # original GROUP band height. Arial's cap height is ~73.5% of em height,
  # so multiply band height by 1/0.735 ≈ 1.36 to match reference logos.
  $targetH = [Math]::Max(14, ($maxY - $minY + 1))
  $fontSize = [single]($targetH * 1.36)
  $font = New-Object System.Drawing.Font 'Arial', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)

  # Measure GDI+ internal leading so we can offset text upward to sit where GROUP was.
  # leading is negative (text appears below draw point), so minY + leading shifts text UP.
  $leading = Measure-InternalLeading $fontSize
  $textY = [single]($minY) + $leading
  if ($textY -lt 0) { $textY = 0 }

  # Wipe band: y0 now uses the adjusted textY position, giving ~13px more upward clearance
  $padY = 14
  $x0 = 0
  $y0 = [Math]::Max(0, [int][Math]::Floor($textY) - 2)
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
