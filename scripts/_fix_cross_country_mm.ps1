# Rebuild Cross Country megamenu logo from JPEG master:
# white-plate -> transparent, tight crop, 1.5x upscale for sharper CSS display.
$ErrorActionPreference = 'Stop'

$ROOT = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SRC  = Join-Path $ROOT 'docs\All Logos\LG New Logos - 2024\cross-country.jpeg'
$DEST = Join-Path $ROOT 'assets\images\logos\companies\cross-country.png'
$BACKUP = Join-Path $ROOT 'assets\images\logos\companies\_pretrim'
New-Item -ItemType Directory -Force -Path $BACKUP | Out-Null

if (-not (Test-Path $SRC)) { throw "Missing source: $SRC" }

$cs = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class CrossCountryLogoFix {
  static int WhiteAlpha(byte b, byte g, byte r) {
    double avg = (r + g + b) / 3.0;
    int chroma = Math.Max(Math.Abs(r - g), Math.Max(Math.Abs(g - b), Math.Abs(r - b)));
    const int soft = 232, hard = 248;
    if (avg >= hard && chroma <= 22) return 0;
    if (avg >= soft && chroma <= 30) {
      double t = (avg - soft) / (hard - soft);
      return (int)Math.Round(255 * (1 - t));
    }
    return 255;
  }

  static Bitmap ToArgb(Image img) {
    var bmp = new Bitmap(img.Width, img.Height, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(bmp)) {
      g.CompositingMode = CompositingMode.SourceCopy;
      g.DrawImage(img, 0, 0, img.Width, img.Height);
    }
    return bmp;
  }

  static byte[] LockBytes(Bitmap bmp, out BitmapData data, out int stride, out int w, out int h) {
    w = bmp.Width; h = bmp.Height;
    data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    stride = data.Stride;
    byte[] bytes = new byte[stride * h];
    Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
    return bytes;
  }

  static void UnlockBytes(Bitmap bmp, BitmapData data, byte[] bytes) {
    Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
    bmp.UnlockBits(data);
  }

  static void FloodPlate(Bitmap bmp) {
    BitmapData data; int stride, w, h;
    byte[] bytes = LockBytes(bmp, out data, out stride, out w, out h);
    bool[] visited = new bool[w * h];
    var q = new Queue<int>();

    Action<int> trySeed = (idx) => {
      if (visited[idx]) return;
      int x = idx % w, y = idx / w;
      int i = y * stride + x * 4;
      if (WhiteAlpha(bytes[i], bytes[i+1], bytes[i+2]) >= 255) return;
      visited[idx] = true;
      q.Enqueue(idx);
    };

    for (int x = 0; x < w; x++) { trySeed(x); trySeed((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { trySeed(y * w); trySeed(y * w + (w - 1)); }

    int[] dx = { -1, 1, 0, 0 };
    int[] dy = { 0, 0, -1, 1 };
    while (q.Count > 0) {
      int idx = q.Dequeue();
      int x = idx % w, y = idx / w;
      int i = y * stride + x * 4;
      int a = WhiteAlpha(bytes[i], bytes[i+1], bytes[i+2]);
      bytes[i+3] = (byte)Math.Min(bytes[i+3], a);
      for (int k = 0; k < 4; k++) {
        int nx = x + dx[k], ny = y + dy[k];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        int nidx = ny * w + nx;
        if (visited[nidx]) continue;
        int ni = ny * stride + nx * 4;
        if (WhiteAlpha(bytes[ni], bytes[ni+1], bytes[ni+2]) >= 255) continue;
        visited[nidx] = true;
        q.Enqueue(nidx);
      }
    }
    UnlockBytes(bmp, data, bytes);
  }

  static void GlobalPlate(Bitmap bmp) {
    BitmapData data; int stride, w, h;
    byte[] bytes = LockBytes(bmp, out data, out stride, out w, out h);
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int i = y * stride + x * 4;
        int a = WhiteAlpha(bytes[i], bytes[i+1], bytes[i+2]);
        if (a < bytes[i+3]) bytes[i+3] = (byte)a;
      }
    }
    UnlockBytes(bmp, data, bytes);
  }

  static Rectangle ContentBounds(Bitmap bmp, byte alphaMin) {
    BitmapData data; int stride, w, h;
    byte[] bytes = LockBytes(bmp, out data, out stride, out w, out h);
    int minX = w, minY = h, maxX = -1, maxY = -1;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        if (bytes[y * stride + x * 4 + 3] >= alphaMin) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    UnlockBytes(bmp, data, bytes);
    if (maxX < 0) return new Rectangle(0, 0, w, h);
    return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
  }

  static Bitmap CropPad(Bitmap src, Rectangle bounds, int pad) {
    int x = Math.Max(0, bounds.X - pad);
    int y = Math.Max(0, bounds.Y - pad);
    int r = Math.Min(src.Width, bounds.Right + pad);
    int b = Math.Min(src.Height, bounds.Bottom + pad);
    var rect = Rectangle.FromLTRB(x, y, r, b);
    return src.Clone(rect, PixelFormat.Format32bppArgb);
  }

  static Bitmap Upscale(Bitmap src, double scale) {
    int nw = Math.Max(1, (int)Math.Round(src.Width * scale));
    int nh = Math.Max(1, (int)Math.Round(src.Height * scale));
    var dest = new Bitmap(nw, nh, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(dest)) {
      g.CompositingMode = CompositingMode.SourceCopy;
      g.CompositingQuality = CompositingQuality.HighQuality;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.SmoothingMode = SmoothingMode.HighQuality;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.DrawImage(src, new Rectangle(0, 0, nw, nh));
    }
    return dest;
  }

  public static string Process(string src, string dest, int pad, double scale) {
    using (var img = Image.FromFile(src))
    using (var bmp = ToArgb(img)) {
      FloodPlate(bmp);
      GlobalPlate(bmp); // clear letter counters / leftover plate islands
      var bounds = ContentBounds(bmp, 12);
      using (var cropped = CropPad(bmp, bounds, pad))
      using (var scaled = Upscale(cropped, scale)) {
        scaled.Save(dest, ImageFormat.Png);
        // sample corners
        var tl = scaled.GetPixel(0, 0);
        var c = scaled.GetPixel(scaled.Width / 2, scaled.Height / 2);
        return string.Format("{0}x{1} TL A={2} C A={3} R={4} G={5} B={6}",
          scaled.Width, scaled.Height, tl.A, c.A, c.R, c.G, c.B);
      }
    }
  }
}
'@

Add-Type -TypeDefinition $cs -ReferencedAssemblies System.Drawing

Copy-Item $DEST (Join-Path $BACKUP 'cross-country.bak-before-alpha.png') -Force
$info = [CrossCountryLogoFix]::Process($SRC, $DEST, 8, 1.6)
Write-Host "Wrote $DEST ($info)"
Write-Host 'Done.'
