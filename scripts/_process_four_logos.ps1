$ErrorActionPreference = "Continue"
Add-Type -AssemblyName System.Drawing

$root = "c:\Users\aisha\Desktop\LakeGroup\lake.group.web"
$outDir = Join-Path $root "assets\images\logos\companies"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Is-NearWhite([int]$r,[int]$g,[int]$b) {
  return ($r -gt 240 -and $g -gt 240 -and $b -gt 240)
}

function Is-YellowBg([int]$r,[int]$g,[int]$b) {
  if ($b -gt 120) { return $false }
  if ($r -lt 180 -or $g -lt 180) { return $false }
  if (($r + $g) -lt 380) { return $false }
  return $true
}

function Make-Transparent([System.Drawing.Bitmap]$src, [switch]$YellowKey) {
  $w = $src.Width; $h = $src.Height
  $out = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $src.GetPixel($x, $y)
      $r = [int]$c.R; $g = [int]$c.G; $b = [int]$c.B
      $transparent = $false
      if ($YellowKey) {
        $transparent = (Is-NearWhite $r $g $b) -or (Is-YellowBg $r $g $b)
      } else {
        $transparent = Is-NearWhite $r $g $b
      }
      if ($transparent) {
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $r, $g, $b))
      } else {
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $g, $b))
      }
    }
  }
  return $out
}

function Get-ContentBounds([System.Drawing.Bitmap]$bmp, [int]$pad = 2) {
  $w = $bmp.Width; $h = $bmp.Height
  $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      if ($bmp.GetPixel($x, $y).A -gt 10) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { return $null }
  $minX = [Math]::Max(0, $minX - $pad)
  $minY = [Math]::Max(0, $minY - $pad)
  $maxX = [Math]::Min($w - 1, $maxX + $pad)
  $maxY = [Math]::Min($h - 1, $maxY + $pad)
  return @{ X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }
}

function Crop-Bmp([System.Drawing.Bitmap]$bmp, $bounds) {
  $crop = New-Object System.Drawing.Bitmap $bounds.W, $bounds.H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($crop)
  $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0,0,$bounds.W,$bounds.H), (New-Object System.Drawing.Rectangle $bounds.X,$bounds.Y,$bounds.W,$bounds.H), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $crop
}

function Scale-ToMinWidth([System.Drawing.Bitmap]$bmp, [int]$minW) {
  if ($bmp.Width -ge $minW) { return $bmp }
  $scale = $minW / $bmp.Width
  $nw = [int][Math]::Round($bmp.Width * $scale)
  $nh = [int][Math]::Round($bmp.Height * $scale)
  $scaled = New-Object System.Drawing.Bitmap $nw, $nh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($scaled)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($bmp, 0, 0, $nw, $nh)
  $g.Dispose()
  return $scaled
}

function Process-Logo([string]$inPath, [string]$outPath, [switch]$YellowKey, [int]$MinWidth = 0) {
  Write-Host "Processing $inPath -> $outPath"
  if (-not (Test-Path $inPath)) { Write-Host "MISSING: $inPath"; return $false }
  $src = [System.Drawing.Image]::FromFile((Resolve-Path $inPath))
  $bmp = New-Object System.Drawing.Bitmap $src
  $src.Dispose()
  $t = Make-Transparent $bmp -YellowKey:$YellowKey
  $bmp.Dispose()
  $b = Get-ContentBounds $t
  if (-not $b) { Write-Host "No opaque pixels"; $t.Dispose(); return $false }
  $cropped = Crop-Bmp $t $b
  $t.Dispose()
  if ($MinWidth -gt 0) {
    $final = Scale-ToMinWidth $cropped $MinWidth
    if ($final -ne $cropped) { $cropped.Dispose() }
  } else { $final = $cropped }
  Save-Png $final $outPath
  Write-Host "Saved $($final.Width)x$($final.Height)"
  $final.Dispose()
  return $true
}

function Download-File([string]$url, [string]$dest) {
  try {
    Write-Host "Downloading $url"
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 60
    if ((Get-Item $dest).Length -gt 500) { return $true }
  } catch { Write-Host "Download failed: $_" }
  return $false
}

# --- Lake Agro ---
$agroTmp = Join-Path $env:TEMP "lake-agro-logo-candidate.png"
$agroOk = $false
if (Download-File "https://lakeagro.com/wp-content/themes/lakeagro/images/logo.png" $agroTmp) { $agroOk = $true }
if (-not $agroOk) {
  try {
    $html = (Invoke-WebRequest -Uri "https://lakeagro.com/" -UseBasicParsing -TimeoutSec 60).Content
    if ($html -match 'src="([^"]+logo[^"]+\.(png|jpg|jpeg|svg))"') {
      $logoUrl = $Matches[1]
      if ($logoUrl -notmatch '^https?') { $logoUrl = "https://lakeagro.com" + ($logoUrl -replace '^\.\.', '') -replace '^\.', '' }
      if ($logoUrl -match '\.png|\.jpg|\.jpeg') {
        $agroOk = Download-File $logoUrl $agroTmp
      }
    }
  } catch { Write-Host "Homepage probe failed: $_" }
}
$agroIn = $null
if ($agroOk -and (Test-Path $agroTmp)) { $agroIn = $agroTmp }
$fallbacks = @(
  (Join-Path $root "scripts\_scraped\agro_logoresizey.png"),
  (Join-Path $root "scripts\_scraped\agro_logo2.png"),
  (Join-Path $root "scripts\_scraped\agro_logo.png")
)
foreach ($fb in $fallbacks) {
  if (-not $agroIn -and (Test-Path $fb)) { $agroIn = $fb; Write-Host "Agro fallback: $fb"; break }
}
if ($agroIn) {
  Process-Logo $agroIn (Join-Path $outDir "lake-agro.png") -MinWidth 800 | Out-Null
} else { Write-Host "No agro source" }

# --- ATL ---
$atlTmp = Join-Path $env:TEMP "atl-logo-candidate.jpg"
$atlIn = Join-Path $root "scripts\_scraped\atl_logo_src.jpg"
if (-not (Test-Path $atlIn)) {
  Download-File "https://atl-tz.com/wp-content/uploads/2025/04/logo_yellow.jpg" (Join-Path $env:TEMP "atl-dl.jpg") | Out-Null
  if (Test-Path (Join-Path $env:TEMP "atl-dl.jpg")) { $atlIn = (Join-Path $env:TEMP "atl-dl.jpg") }
}
Process-Logo $atlIn (Join-Path $outDir "atl.png") -YellowKey -MinWidth 800 | Out-Null

# --- Ocean Galleria & Cross Country ---
$ogJ = Join-Path $root "docs\All Logos\LG New Logos - 2024\ocean-galleria.jpeg"
$ccJ = Join-Path $root "docs\All Logos\LG New Logos - 2024\cross-country.jpeg"
Process-Logo $ogJ (Join-Path $outDir "ocean-galleria.png") -MinWidth 800 | Out-Null
Process-Logo $ccJ (Join-Path $outDir "cross-country.png") -MinWidth 800 | Out-Null

Write-Host "`n=== Final PNG stats ==="
foreach ($name in @("lake-agro.png","atl.png","ocean-galleria.png","cross-country.png")) {
  $p = Join-Path $outDir $name
  if (Test-Path $p) {
    $img = [System.Drawing.Image]::FromFile($p)
    $sz = (Get-Item $p).Length
    Write-Host "$name : $($img.Width)x$($img.Height) , $([math]::Round($sz/1024,1)) KB"
    $img.Dispose()
  } else { Write-Host "$name : MISSING" }
}
