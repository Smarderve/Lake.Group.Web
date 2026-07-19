const fs = require('fs');
const { execFileSync } = require('child_process');
const ps1 = String.raw`$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Set-Location 'c:\Users\aisha\Desktop\LakeGroup\lake.group.web'

function Sample-Corners([string]$path) {
  $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
  foreach ($c in @(
    @{n='TL'; x=0; y=0},
    @{n='TR'; x=($bmp.Width-1); y=0},
    @{n='BL'; x=0; y=($bmp.Height-1)},
    @{n='BR'; x=($bmp.Width-1); y=($bmp.Height-1)}
  )) {
    $px = $bmp.GetPixel($c.x, $c.y)
    Write-Output ("  {0}: A={1} R={2} G={3} B={4}" -f $c.n, $px.A, $px.R, $px.G, $px.B)
  }
  $bmp.Dispose()
}

function Process-Logo([string]$sourcePath, [string]$destPath, [bool]$useYellowChroma) {
  $src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $sourcePath))
  $w = $src.Width; $h = $src.Height
  $scale = if ($w -lt 400) { 2 } else { 1 }

  $work = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($work)
  $g.DrawImage($src, 0, 0, $w, $h)
  $g.Dispose(); $src.Dispose()

  $minX=$w; $minY=$h; $maxX=-1; $maxY=-1
  for ($y=0; $y -lt $h; $y++) {
    for ($x=0; $x -lt $w; $x++) {
      $px = $work.GetPixel($x,$y)
      $transparent = $false
      if ($useYellowChroma) {
        if ($px.R -gt 200 -and $px.G -gt 180 -and $px.B -lt 120) { $transparent = $true }
        elseif ($px.R -gt 245 -and $px.G -gt 245 -and $px.B -gt 245) { $transparent = $true }
      } else {
        if ($px.R -gt 245 -and $px.G -gt 245 -and $px.B -gt 245) { $transparent = $true }
      }
      if ($transparent) {
        $work.SetPixel($x,$y, [System.Drawing.Color]::FromArgb(0,0,0,0))
      } elseif ($px.A -gt 10) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt $minX) { throw 'No opaque pixels found' }

  $pad = 2
  $minX = [Math]::Max(0, $minX - $pad)
  $minY = [Math]::Max(0, $minY - $pad)
  $maxX = [Math]::Min($w-1, $maxX + $pad)
  $maxY = [Math]::Min($h-1, $maxY + $pad)
  $cropW = $maxX - $minX + 1
  $cropH = $maxY - $minY + 1

  $cropped = New-Object System.Drawing.Bitmap $cropW, $cropH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gc = [System.Drawing.Graphics]::FromImage($cropped)
  $gc.DrawImage($work, (New-Object System.Drawing.Rectangle 0,0,$cropW,$cropH), (New-Object System.Drawing.Rectangle $minX,$minY,$cropW,$cropH), [System.Drawing.GraphicsUnit]::Pixel)
  $gc.Dispose(); $work.Dispose()

  $finalW = $cropW * $scale
  $finalH = $cropH * $scale
  if ($scale -eq 1) {
    $final = $cropped
  } else {
    $final = New-Object System.Drawing.Bitmap $finalW, $finalH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gf = [System.Drawing.Graphics]::FromImage($final)
    $gf.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gf.DrawImage($cropped, 0, 0, $finalW, $finalH)
    $gf.Dispose(); $cropped.Dispose()
  }

  $destFull = Join-Path (Get-Location) $destPath
  $final.Save($destFull, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = (Get-Item $destFull).Length
  Write-Output ("Saved {0}: {1}x{2}, {3} bytes (scale {4}x, source {5}x{6})" -f $destPath, $finalW, $finalH, $bytes, $scale, $w, $h)
  $final.Dispose()
}

Write-Output '=== Source candidates ==='
foreach ($p in @('scripts\_scraped\agro_logo_hires.png','scripts\_scraped\agro_logoresizey.png','scripts\_scraped\agro_fetched.png')) {
  if (Test-Path $p) {
    $i = [System.Drawing.Image]::FromFile((Resolve-Path $p))
    Write-Output ("{0}: {1}x{2}, {3} bytes" -f $p, $i.Width, $i.Height, (Get-Item $p).Length)
    $i.Dispose()
  }
}

Write-Output '=== atl.png corner samples (before) ==='
Sample-Corners 'assets\images\logos\companies\atl.png'
$atlBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'assets\images\logos\companies\atl.png'))
$tl = $atlBmp.GetPixel(0,0)
$needsAtlFix = ($tl.A -gt 200) -and ($tl.R -gt 200 -and $tl.G -gt 180 -and $tl.B -lt 120)
$atlBmp.Dispose()
Write-Output ("atl opaque yellow corners: {0}" -f $needsAtlFix)
if ($needsAtlFix) {
  $atlSrc = 'assets\images\logos\companies\atl.png'
  if (Test-Path 'scripts\_scraped\atl_logo_src.jpg') { $atlSrc = 'scripts\_scraped\atl_logo_src.jpg' }
  Process-Logo $atlSrc 'assets\images\logos\companies\atl.png' $true
  Write-Output '=== atl.png corner samples (after) ==='
  Sample-Corners 'assets\images\logos\companies\atl.png'
}

Write-Output '=== Processing lake-agro (no upscale; source width 532) ==='
Process-Logo 'scripts\_scraped\agro_logo_hires.png' 'assets\images\logos\companies\lake-agro.png' $false
Write-Output '=== lake-agro corner samples ==='
Sample-Corners 'assets\images\logos\companies\lake-agro.png'
`;
const out = 'c:/Users/aisha/Desktop/LakeGroup/lake.group.web/scripts/_reprocess_logos_noscale.ps1';
fs.writeFileSync(out, ps1, 'utf8');
console.log('Wrote', out);
const r = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', out], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
process.stdout.write(r);
