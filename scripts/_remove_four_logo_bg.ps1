# Remove baked-in plates from ATL, Lake Agro, Cross Country, Ocean Galleria.
# Prefer clean source assets (white/yellow plates) over the black-backed site PNGs.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$ROOT = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$COMP = Join-Path $ROOT 'assets\images\logos\companies'
$BACKUP = Join-Path $COMP '_pretrim'
$SCRAPED = Join-Path $ROOT 'scripts\_scraped'
$DOCS = Join-Path $ROOT 'docs\All Logos\LG New Logos - 2024'
New-Item -ItemType Directory -Force -Path $BACKUP | Out-Null

function New-BitmapCopy([System.Drawing.Image]$img) {
  $bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
  $g.Dispose()
  return $bmp
}

function Clear-PlateSoft([System.Drawing.Bitmap]$bmp, [scriptblock]$plateAlpha) {
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $a = [int](& $plateAlpha $c)
      if ($a -lt 255) {
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb([Math]::Max(0, $a), $c.R, $c.G, $c.B))
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

function Find-AtlMarkBottom([System.Drawing.Bitmap]$bmp) {
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
  $thresh = [Math]::Max(12, [int]($peak * 0.06))
  $start = 0
  while ($start -lt $bmp.Height -and $rowCounts[$start] -lt $thresh) { $start++ }
  $minMarkH = [Math]::Max(80, [int]($bmp.Width * 0.22))
  $gapNeeded = [Math]::Max(18, [int]($bmp.Height * 0.035))
  $inGap = 0
  $gapStart = -1
  for ($y = $start; $y -lt $bmp.Height; $y++) {
    if ($rowCounts[$y] -lt $thresh) {
      if ($gapStart -lt 0) { $gapStart = $y }
      $inGap++
      if ($inGap -ge $gapNeeded -and ($gapStart - $start) -ge $minMarkH) {
        return $gapStart
      }
    } else {
      $inGap = 0
      $gapStart = -1
    }
  }
  return $start + [int](($bmp.Height - $start) * 0.48)
}

function Save-Processed([System.Drawing.Bitmap]$bmp, [string]$destName, [int]$pad = 10) {
  $bounds = Get-ContentBounds $bmp
  if (-not $bounds) { throw "No content for $destName" }
  $out = Crop-Pad $bmp $bounds $pad
  $dest = Join-Path $COMP $destName
  if (Test-Path $dest) {
    Copy-Item $dest (Join-Path $BACKUP $destName) -Force
  }
  $out.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host ("Wrote {0}: {1}x{2}" -f $destName, $out.Width, $out.Height)
  $out.Dispose()
}

function Process-WhitePlate([string]$srcPath, [string]$destName, [int]$pad = 10) {
  Write-Host "White-key: $srcPath -> $destName"
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath))
  $bmp = New-BitmapCopy $img
  $img.Dispose()
  Clear-PlateSoft $bmp {
    param($c)
    $brightness = ([int]$c.R + [int]$c.G + [int]$c.B) / 3.0
    $chroma = [Math]::Max([Math]::Abs([int]$c.R - [int]$c.G), [Math]::Abs([int]$c.G - [int]$c.B))
    # Near-white / light gray plate (keep logo ink, gold, navy)
    if ($brightness -ge 248 -and $chroma -lt 18) { return 0 }
    if ($brightness -ge 235 -and $chroma -lt 14) {
      $t = ($brightness - 235) / 13.0
      return [int][Math]::Round(255 * (1 - $t))
    }
    return 255
  }
  Save-Processed $bmp $destName $pad
  $bmp.Dispose()
}

function Process-BlackPlate([string]$srcPath, [string]$destName, [int]$pad = 10) {
  Write-Host "Black-key: $srcPath -> $destName"
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath))
  $bmp = New-BitmapCopy $img
  $img.Dispose()
  Clear-PlateSoft $bmp {
    param($c)
    $sum = [int]$c.R + [int]$c.G + [int]$c.B
    # Pure / near-black plate only (preserve navy logo ink ~ sum > 40 with blue bias)
    if ($sum -le 28 -and [int]$c.R -le 18 -and [int]$c.G -le 18 -and [int]$c.B -le 22) { return 0 }
    if ($sum -le 48 -and [Math]::Abs([int]$c.R - [int]$c.G) -le 8 -and [Math]::Abs([int]$c.G - [int]$c.B) -le 8) {
      $t = $sum / 48.0
      return [int][Math]::Round(255 * $t)
    }
    return 255
  }
  Save-Processed $bmp $destName $pad
  $bmp.Dispose()
}

# --- Lake Agro (white source) ---
$agroSrc = Join-Path $SCRAPED 'agro_logoresizey.png'
if (-not (Test-Path $agroSrc)) { $agroSrc = Join-Path $SCRAPED 'agro_logo_hires.png' }
Process-WhitePlate $agroSrc 'lake-agro.png' 6

# --- Cross Country & Ocean Galleria (white JPEG masters) ---
Process-WhitePlate (Join-Path $DOCS 'cross-country.jpeg') 'cross-country.png' 12
Process-WhitePlate (Join-Path $DOCS 'ocean-galleria.jpeg') 'ocean-galleria.png' 12

# --- ATL: yellow plate source, crop to mark only ---
$atlSrc = Join-Path $SCRAPED 'atl_logo_src.jpg'
if (-not (Test-Path $atlSrc)) { $atlSrc = Join-Path $COMP 'atl.png' }
Write-Host "ATL yellow-key: $atlSrc"
$atlImg = [System.Drawing.Image]::FromFile((Resolve-Path $atlSrc))
$atlBmp = New-BitmapCopy $atlImg
$atlImg.Dispose()
Clear-PlateSoft $atlBmp {
  param($c)
  # Yellow / gold plate
  if ($c.R -gt 200 -and $c.G -gt 180 -and $c.B -lt 120) { return 0 }
  if ($c.R -gt 230 -and $c.G -gt 210 -and $c.B -lt 160) { return 0 }
  if ($c.R -gt 245 -and $c.G -gt 245 -and $c.B -gt 245) { return 0 }
  # Soft yellow fringe
  if ($c.R -gt 190 -and $c.G -gt 170 -and $c.B -lt 140 -and ($c.R + $c.G) -gt ($c.B * 3)) {
    $t = [Math]::Min(1.0, ([int]$c.B) / 120.0)
    return [int][Math]::Round(255 * $t)
  }
  return 255
}
if ($atlSrc -like '*atl_logo_src*') {
  $markBottom = Find-AtlMarkBottom $atlBmp
  Write-Host "ATL mark bottom: $markBottom / $($atlBmp.Height)"
  $rect = [System.Drawing.Rectangle]::new(0, 0, $atlBmp.Width, [Math]::Max(40, $markBottom))
  $cropped = $atlBmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $atlBmp.Dispose()
  $atlBmp = $cropped
}
Save-Processed $atlBmp 'atl.png' 20
$atlBmp.Dispose()

Write-Host 'Done.'
