$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$cs = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class CheckerPreview {
  public static void Make(string src, string dest) {
    using (var logo = new Bitmap(src)) {
      int w = logo.Width, h = logo.Height;
      int cell = Math.Max(8, Math.Min(w, h) / 16);
      using (var board = new Bitmap(w, h, PixelFormat.Format32bppArgb))
      using (var g = Graphics.FromImage(board)) {
        for (int y = 0; y < h; y += cell)
          for (int x = 0; x < w; x += cell) {
            bool light = ((x / cell) + (y / cell)) % 2 == 0;
            using (var br = new SolidBrush(light ? Color.FromArgb(220, 220, 220) : Color.FromArgb(160, 160, 160)))
              g.FillRectangle(br, x, y, cell, cell);
          }
        g.DrawImage(logo, 0, 0, w, h);
        board.Save(dest, ImageFormat.Png);
      }
    }
  }
}
'@
Add-Type -TypeDefinition $cs -ReferencedAssemblies System.Drawing

$dir = Join-Path $PSScriptRoot '..\assets\images\logos\companies'
$prev = Join-Path $dir '_alpha_preview'
New-Item -ItemType Directory -Force -Path $prev | Out-Null
foreach ($f in @('atl.png', 'lake-agro.png', 'cross-country.png', 'ocean-galleria.png')) {
  [CheckerPreview]::Make((Join-Path $dir $f), (Join-Path $prev $f))
  Write-Host "preview $f"
}
