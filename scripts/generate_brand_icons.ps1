<#
.SYNOPSIS
  Regenerates Lake Group logo/icon assets from the 2024 brand mark.

  Source of truth: docs/All Logos/LG - All Logo PNG/LG24 - Group.png (transparent
  yellow "Lake" wordmark + droplet mark + white "GROUP").

  Outputs:
  - assets/images/logos/LAKE_GROUP_LOGO.png — trimmed transparent lockup for HTML chrome
  - favicon.ico + assets/icons/pwa/* — droplet mark on Deep Blue (#0181BB) tiles
  - Optional legacy LAKE_GROUP_LOGO.jpg blue-pill (not used by HTML)

  Re-run this whenever LG24 - Group.png changes.
#>
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root "docs\All Logos\LG - All Logo PNG\LG24 - Group.png"
if (-not (Test-Path $srcPath)) { throw "Source logo not found: $srcPath" }

$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0181BB")
$white = [System.Drawing.Color]::White
$transparent = [System.Drawing.Color]::Transparent

function Get-AlphaBounds {
    param([System.Drawing.Image]$img)
    $w = $img.Width; $h = $img.Height
    $thumbW = 200
    $thumbH = [int]([math]::Round($thumbW * $h / $w))
    $thumb = New-Object System.Drawing.Bitmap($thumbW, $thumbH)
    $g = [System.Drawing.Graphics]::FromImage($thumb)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $thumbW, $thumbH)
    $g.Dispose()

    $minX = $thumbW; $maxX = 0; $minY = $thumbH; $maxY = 0
    for ($y = 0; $y -lt $thumbH; $y++) {
        for ($x = 0; $x -lt $thumbW; $x++) {
            $p = $thumb.GetPixel($x, $y)
            if ($p.A -gt 10) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $thumb.Dispose()
    $scaleX = $w / $thumbW
    $scaleY = $h / $thumbH
    return New-Object PSObject -Property @{
        X = [int]($minX * $scaleX)
        Y = [int]($minY * $scaleY)
        Width = [int](($maxX - $minX + 1) * $scaleX)
        Height = [int](($maxY - $minY + 1) * $scaleY)
    }
}

function Crop {
    param([System.Drawing.Image]$img, $rect)
    $bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $dest = New-Object System.Drawing.Rectangle(0, 0, $rect.Width, $rect.Height)
    $src = New-Object System.Drawing.Rectangle($rect.X, $rect.Y, $rect.Width, $rect.Height)
    $g.DrawImage($img, $dest, $src, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    return $bmp
}

function New-Tile {
    param(
        [System.Drawing.Image]$logo,
        [int]$canvasW,
        [int]$canvasH,
        [double]$fillRatio,
        [double]$cornerRadiusRatio,
        [System.Drawing.Color]$bg,
        [System.Drawing.Color]$outerBg = $transparent
    )
    $bmp = New-Object System.Drawing.Bitmap($canvasW, $canvasH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($outerBg -ne $transparent) { $g.Clear($outerBg) }

    if ($cornerRadiusRatio -gt 0) {
        $r = [double]([System.Math]::Min($canvasW, $canvasH)) * $cornerRadiusRatio
        $d = $r * 2
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($canvasW - $d, 0, $d, $d, 270, 90)
        $path.AddArc($canvasW - $d, $canvasH - $d, $d, $d, 0, 90)
        $path.AddArc(0, $canvasH - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $brush = New-Object System.Drawing.SolidBrush($bg)
        $g.FillPath($brush, $path)
        $brush.Dispose(); $path.Dispose()
    } else {
        $g.Clear($bg)
    }

    $scale = [System.Math]::Min(($canvasW * $fillRatio) / $logo.Width, ($canvasH * $fillRatio) / $logo.Height)
    $lw = [int]($logo.Width * $scale)
    $lh = [int]($logo.Height * $scale)
    $lx = [int](($canvasW - $lw) / 2)
    $ly = [int](($canvasH - $lh) / 2)
    $g.DrawImage($logo, $lx, $ly, $lw, $lh)
    $g.Dispose()
    return $bmp
}

function Save-Png($bmp, $path) {
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Get-PngBytes($bmp) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    return $ms.ToArray()
}

function Get-IconRightEdge {
    # Finds the x-coordinate (full-res) where the icon glyph (droplet) ends and the
    # wordmark begins, by scanning the thumbnail for the first empty-column gap
    # after the initial run of content within the full lockup's row band.
    param([System.Drawing.Image]$img, $bounds)
    $thumbW = 200
    $w = $img.Width; $h = $img.Height
    $thumbH = [int]([math]::Round($thumbW * $h / $w))
    $thumb = New-Object System.Drawing.Bitmap($thumbW, $thumbH)
    $g = [System.Drawing.Graphics]::FromImage($thumb)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $thumbW, $thumbH)
    $g.Dispose()

    $scaleX = $w / $thumbW
    $scaleY = $h / $thumbH
    $minXThumb = [int]($bounds.X / $scaleX)
    $maxXThumb = [int](($bounds.X + $bounds.Width) / $scaleX)
    $minYThumb = [int]($bounds.Y / $scaleY)
    $maxYThumb = [int](($bounds.Y + $bounds.Height) / $scaleY)

    $colHasContent = New-Object System.Collections.ArrayList
    for ($x = $minXThumb; $x -le $maxXThumb; $x++) {
        $has = $false
        if ($x -ge 0 -and $x -lt $thumbW) {
            for ($y = $minYThumb; $y -le $maxYThumb; $y++) {
                if ($y -ge 0 -and $y -lt $thumbH) {
                    $p = $thumb.GetPixel($x, $y)
                    if ($p.A -gt 10) { $has = $true; break }
                }
            }
        }
        [void]$colHasContent.Add($has)
    }
    $thumb.Dispose()

    $seenContent = $false
    $gapCount = 0
    $gapStartIdx = -1
    for ($i = 0; $i -lt $colHasContent.Count; $i++) {
        if ($colHasContent[$i]) {
            $seenContent = $true
            $gapCount = 0
        } elseif ($seenContent) {
            if ($gapCount -eq 0) { $gapStartIdx = $i }
            $gapCount++
            if ($gapCount -ge 2) { break }
        }
    }
    if ($gapStartIdx -lt 0) { return $bounds.X + $bounds.Height }
    return [int]((($minXThumb + $gapStartIdx)) * $scaleX)
}

$src = [System.Drawing.Image]::FromFile($srcPath)
$fullBounds = Get-AlphaBounds -img $src
Write-Host "Full lockup bounds: x=$($fullBounds.X) y=$($fullBounds.Y) w=$($fullBounds.Width) h=$($fullBounds.Height)"

$iconRightEdge = Get-IconRightEdge -img $src -bounds $fullBounds
$iconWidth = $iconRightEdge - $fullBounds.X
Write-Host "Detected icon-glyph width: $iconWidth (right edge at x=$iconRightEdge)"

$iconRect = New-Object PSObject -Property @{ X = $fullBounds.X; Y = $fullBounds.Y; Width = $iconWidth; Height = $fullBounds.Height }
$iconBmp = Crop -img $src -rect $iconRect
$fullBmp = Crop -img $src -rect $fullBounds

$debugDir = Join-Path $root "scripts\_brand_icon_debug"
New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
Save-Png $iconBmp (Join-Path $debugDir "debug-icon-crop.png")
Save-Png $fullBmp (Join-Path $debugDir "debug-full-crop.png")

$pwaDir = Join-Path $root "assets\icons\pwa"
New-Item -ItemType Directory -Path $pwaDir -Force | Out-Null

# Rounded-square "badge" icons (transparent corners) for PWA/manifest use
(New-Tile -logo $iconBmp -canvasW 192 -canvasH 192 -fillRatio 0.62 -cornerRadiusRatio 0.5 -bg $bgColor) | ForEach-Object { Save-Png $_ (Join-Path $pwaDir "icon-192.png") }
(New-Tile -logo $iconBmp -canvasW 512 -canvasH 512 -fillRatio 0.62 -cornerRadiusRatio 0.5 -bg $bgColor) | ForEach-Object { Save-Png $_ (Join-Path $pwaDir "icon-512.png") }

# Maskable icons: full-bleed square, larger safe-zone padding, no rounding (OS applies its own mask)
(New-Tile -logo $iconBmp -canvasW 192 -canvasH 192 -fillRatio 0.42 -cornerRadiusRatio 0 -bg $bgColor) | ForEach-Object { Save-Png $_ (Join-Path $pwaDir "icon-maskable-192.png") }
(New-Tile -logo $iconBmp -canvasW 512 -canvasH 512 -fillRatio 0.42 -cornerRadiusRatio 0 -bg $bgColor) | ForEach-Object { Save-Png $_ (Join-Path $pwaDir "icon-maskable-512.png") }

# Apple touch icon: square, opaque, iOS rounds it itself
(New-Tile -logo $iconBmp -canvasW 180 -canvasH 180 -fillRatio 0.6 -cornerRadiusRatio 0 -bg $bgColor) | ForEach-Object { Save-Png $_ (Join-Path $pwaDir "apple-touch-icon.png") }

# Favicon.ico: hand-built multi-resolution ICO container with embedded PNG frames
# Slightly larger glyph fill than earlier tiles so tab-bar ICO bytes differ from
# any previously cached favicon.ico (browsers often ignore ?v= on /favicon.ico).
$fav16 = New-Tile -logo $iconBmp -canvasW 16 -canvasH 16 -fillRatio 0.78 -cornerRadiusRatio 0 -bg $bgColor
$fav32 = New-Tile -logo $iconBmp -canvasW 32 -canvasH 32 -fillRatio 0.74 -cornerRadiusRatio 0 -bg $bgColor
$fav48 = New-Tile -logo $iconBmp -canvasW 48 -canvasH 48 -fillRatio 0.70 -cornerRadiusRatio 0.15 -bg $bgColor

$frames = @(
    @{ Size = 16; Bytes = (Get-PngBytes $fav16) },
    @{ Size = 32; Bytes = (Get-PngBytes $fav32) },
    @{ Size = 48; Bytes = (Get-PngBytes $fav48) }
)

$icoPath = Join-Path $root "favicon.ico"
$fs = [System.IO.File]::Open($icoPath, 'Create')
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$frames.Count)
$offset = 6 + (16 * $frames.Count)
foreach ($f in $frames) {
    $sizeByte = if ($f.Size -ge 256) { 0 } else { [byte]$f.Size }
    $bw.Write([byte]$sizeByte)
    $bw.Write([byte]$sizeByte)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]32)
    $bw.Write([UInt32]$f.Bytes.Length)
    $bw.Write([UInt32]$offset)
    $offset += $f.Bytes.Length
}
foreach ($f in $frames) {
    $bytes = [byte[]]$f.Bytes
    $fs.Write($bytes, 0, $bytes.Length)
}
$bw.Flush(); $bw.Close(); $fs.Close()

# Canonical web lockup: trimmed transparent PNG (yellow mark + white "GROUP").
# Served on dark nav/footer without a white plate so the white wordmark stays visible.
$logoDir = Join-Path $root "assets\images\logos"
New-Item -ItemType Directory -Path $logoDir -Force | Out-Null
$pngPath = Join-Path $logoDir "LAKE_GROUP_LOGO.png"
Save-Png $fullBmp $pngPath

$companyDir = Join-Path $logoDir "company"
New-Item -ItemType Directory -Path $companyDir -Force | Out-Null
Save-Png $fullBmp (Join-Path $companyDir "LAKE_GROUP_LOGO.png")

# Optional legacy blue-pill JPEG (not referenced by HTML chrome; kept for tools/back-compat).
$pill = New-Tile -logo $fullBmp -canvasW 1000 -canvasH 280 -fillRatio 0.72 -cornerRadiusRatio 0.5 -bg $bgColor -outerBg $white
$pill.Save((Join-Path $logoDir "LAKE_GROUP_LOGO.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$pill.Save((Join-Path $companyDir "LAKE_GROUP_LOGO.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$pill.Dispose()

$fullBmp.Dispose()
$iconBmp.Dispose()
$src.Dispose()

Write-Host "Done. Regenerated favicon.ico, PWA icons, apple-touch-icon, and transparent LAKE_GROUP_LOGO.png."
