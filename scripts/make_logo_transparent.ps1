<#
.SYNOPSIS
  Converts a white-background logo JPEG/PNG into a trimmed, transparent PNG by
  keying out near-white background pixels (soft-edged, so anti-aliased borders
  fade out instead of leaving a white halo).
#>
param(
    [Parameter(Mandatory = $true)][string]$SrcPath,
    [Parameter(Mandatory = $true)][string]$DstPath,
    [int]$LowThreshold = 235,
    [int]$HighThreshold = 252
)

Add-Type -AssemblyName System.Drawing

function ConvertTo-Transparent {
    param($srcPath, $dstPath, $lowT, $highT)

    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $w = $srcImg.Width; $h = $srcImg.Height
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($srcImg, 0, 0, $w, $h)
    $g.Dispose()
    $srcImg.Dispose()

    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $bmpData.Stride
    $bytes = $stride * $h
    $buffer = New-Object byte[] $bytes
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $buffer, 0, $bytes)

    $range = $highT - $lowT
    if ($range -le 0) { $range = 1 }

    for ($y = 0; $y -lt $h; $y++) {
        $rowStart = $y * $stride
        for ($x = 0; $x -lt $w; $x++) {
            $idx = $rowStart + ($x * 4)
            $b = $buffer[$idx]
            $gg = $buffer[$idx + 1]
            $r = $buffer[$idx + 2]
            $brightness = ($r + $gg + $b) / 3.0
            if ($brightness -ge $highT) {
                $buffer[$idx + 3] = 0
            } elseif ($brightness -gt $lowT) {
                $t = ($brightness - $lowT) / $range
                $buffer[$idx + 3] = [byte]([Math]::Round(255 * (1 - $t)))
            }
        }
    }

    [System.Runtime.InteropServices.Marshal]::Copy($buffer, 0, $bmpData.Scan0, $bytes)
    $bmp.UnlockBits($bmpData)

    # trim to content bounding box with a small margin
    $minX = $w; $maxX = 0; $minY = $h; $maxY = 0
    for ($y = 0; $y -lt $h; $y++) {
        $rowStart = $y * $stride
        for ($x = 0; $x -lt $w; $x++) {
            $idx = $rowStart + ($x * 4)
            if ($buffer[$idx + 3] -gt 10) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $pad = [int]([Math]::Max($maxX - $minX, $maxY - $minY) * 0.04)
    $minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad)
    $maxX = [Math]::Min($w - 1, $maxX + $pad); $maxY = [Math]::Min($h - 1, $maxY + $pad)
    $cropW = $maxX - $minX + 1; $cropH = $maxY - $minY + 1

    $cropped = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gc = [System.Drawing.Graphics]::FromImage($cropped)
    $gc.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
    $srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $cropW, $cropH)
    $gc.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $gc.Dispose()
    $bmp.Dispose()

    $cropped.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
}

ConvertTo-Transparent -srcPath $SrcPath -dstPath $DstPath -lowT $LowThreshold -highT $HighThreshold
Write-Host "Saved transparent PNG: $DstPath"
