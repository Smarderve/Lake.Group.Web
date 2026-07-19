# Remove solid plates from Lake Agro + ATL logos; ATL = mark-only (no tagline).
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$ROOT = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$COMP = Join-Path $ROOT 'assets\images\logos\companies'
$SCRAPED = Join-Path $ROOT 'scripts\_scraped'

function New-BitmapCopy([System.Drawing.Image]$img) {
  $bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
  $g.Dispose()
  return $bmp
}

function Test-NearColor([System.Drawing.Color]$c, [int]$tr, [int]$tg, [int]$tb, [int]$tol) {
  return ([Math]::Abs([int]$c.R - $tr) -le $tol) -and ([Math]::Abs([int]$c.G - $tg) -le $tol) -and ([Math]::Abs([int]$c.B - $tb) -le $tol)
}

function Clear-Plate([System.Drawing.Bitmap]$bmp, [scriptblock]$isPlate) {
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $px = $bmp.GetPixel($x, $y)
      if (& $isPlate $px) {
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      }
    }
  }
}

function Get-ContentBounds([System.Drawing.Bitmap]$bmp, [int]$alphaMin = 16) {
  $minX = $bmp.Width; $minY = $bmp.Height; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      if ($bmp.GetPixel($x, $y).A -ge $alphaMin) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { return $null }
  return @{ X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }
}

function Crop-Pad([System.Drawing.Bitmap]$bmp, $b, [int]$pad = 8) {
  $x = [Math]::Max(0, $b.X - $pad)
  $y = [Math]::Max(0, $b.Y - $pad)
  $r = [Math]::Min($bmp.Width - 1, $b.X + $b.W - 1 + $pad)
  $bot = [Math]::Min($bmp.Height - 1, $b.Y + $b.H - 1 + $pad)
  $w = $r - $x + 1
  $h = $bot - $y + 1
  $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  return $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Find-MarkBottom([System.Drawing.Bitmap]$bmp) {
  # After yellow cleared, find largest vertical gap below the dense mark band.
  $rowCounts = New-Object int[] $bmp.Height
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    $n = 0
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      if ($bmp.GetPixel($x, $y).A -ge 20) { $n++ }
    }
    $rowCounts[$y] = $n
  }
  $peak = ($rowCounts | Measure-Object -Maximum).Maximum
  if ($peak -lt 10) { return [int]($bmp.Height * 0.55) }
  $thresh = [Math]::Max(8, [int]($peak * 0.08))
  # Find first solid content from top
  $start = 0
  while ($start -lt $bmp.Height -and $rowCounts[$start] -lt $thresh) { $start++ }
  # Walk through mark; find sustained low-density gap (tagline separator)
  $inGap = 0
  $gapStart = -1
  for ($y = $start; $y -lt $bmp.Height; $y++) {
    if ($rowCounts[$y] -lt $thresh) {
      if ($gapStart -lt 0) { $gapStart = $y }
      $inGap++
      if ($inGap -ge [Math]::Max(10, [int]($bmp.Height * 0.03)) -and ($y - $start) -gt [int]($bmp.Height * 0.22)) {
        return $gapStart
      }
    } else {
      $inGap = 0
      $gapStart = -1
    }
  }
  # Fallback: keep upper 52% of content height
  $end = $bmp.Height - 1
  while ($end -gt $start -and $rowCounts[$end] -lt $thresh) { $end-- }
  return $start + [int](($end - $start + 1) * 0.52)
}

# --- ATL: HD logo_yellow first (crop to mark); screenshot is low-res fallback ---
$screenshot = 'C:\Users\aisha\.cursor\projects\c-Users-aisha-Desktop-LakeGroup-lake-group-web\assets\c__Users_aisha_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-53f5c4ce-dc47-4bbe-9e1c-02c5af056a37.png'
$atlSources = @(
  (Join-Path $SCRAPED 'atl_logo_src.jpg'),
  $screenshot,
  (Join-Path $COMP 'atl.png')
)
$atlSrc = $atlSources | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $atlSrc) { throw 'No ATL source image found' }
Write-Host "ATL source: $atlSrc"

$atlImg = [System.Drawing.Image]::FromFile($atlSrc)
$atlBmp = New-BitmapCopy $atlImg
$atlImg.Dispose()

# Yellow / near-yellow plate -> transparent (screenshot + logo_yellow)
Clear-Plate $atlBmp {
  param($c)
  if ($c.A -lt 8) { return $true }
  # bright yellow / gold plate
  if ($c.R -gt 200 -and $c.G -gt 180 -and $c.B -lt 120) { return $true }
  if ($c.R -gt 230 -and $c.G -gt 210 -and $c.B -lt 160) { return $true }
  # green plate leftover from prior asset
  if ($c.G -gt 90 -and $c.G -gt $c.R + 25 -and $c.G -gt $c.B + 25 -and $c.R -lt 120 -and $c.B -lt 120) { return $true }
  return $false
}

# If source was full logo with tagline (tall content), crop to mark only
$isScreenshot = $atlSrc -like '*image-53f5c4ce*'
if (-not $isScreenshot) {
  $markBottom = Find-MarkBottom $atlBmp
  Write-Host "ATL mark bottom row: $markBottom / $($atlBmp.Height)"
  $rect = [System.Drawing.Rectangle]::new(0, 0, $atlBmp.Width, [Math]::Max(40, $markBottom))
  $cropped = $atlBmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $atlBmp.Dispose()
  $atlBmp = $cropped
}

$bounds = Get-ContentBounds $atlBmp
if (-not $bounds) { throw 'ATL content empty after plate removal' }
$atlOut = Crop-Pad $atlBmp $bounds 10
$atlBmp.Dispose()
$atlDest = Join-Path $COMP 'atl.png'
$atlOut.Save($atlDest, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Wrote $atlDest $($atlOut.Width)x$($atlOut.Height)"
$atlOut.Dispose()

# Also write webp sibling skip (png only)
$atlWebp = Join-Path $COMP 'atl.webp'
if (Test-Path $atlWebp) { Remove-Item $atlWebp -Force }

# --- Lake Agro: remove white / near-white plate ---
$agroSrc = Join-Path $SCRAPED 'agro_logoresizey.png'
if (-not (Test-Path $agroSrc)) { $agroSrc = Join-Path $COMP 'lake-agro.png' }
if (-not (Test-Path $agroSrc)) { $agroSrc = Join-Path $SCRAPED 'agro_logo2.png' }
Write-Host "Agro source: $agroSrc"

$agroImg = [System.Drawing.Image]::FromFile($agroSrc)
$agroBmp = New-BitmapCopy $agroImg
$agroImg.Dispose()

Clear-Plate $agroBmp {
  param($c)
  if ($c.A -lt 8) { return $true }
  # white / off-white rectangle
  if ($c.R -gt 235 -and $c.G -gt 235 -and $c.B -gt 235) { return $true }
  if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220 -and ([Math]::Abs([int]$c.R - [int]$c.G) -lt 12) -and ([Math]::Abs([int]$c.G - [int]$c.B) -lt 12)) { return $true }
  return $false
}

$ab = Get-ContentBounds $agroBmp
if (-not $ab) { throw 'Agro content empty after plate removal' }
$agroOut = Crop-Pad $agroBmp $ab 6
$agroBmp.Dispose()
$agroDest = Join-Path $COMP 'lake-agro.png'
$agroOut.Save($agroDest, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Wrote $agroDest $($agroOut.Width)x$($agroOut.Height)"
$agroOut.Dispose()

Write-Host 'Logo processing complete.'
