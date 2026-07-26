# Fast C#-backed plate removal for ATL / Lake Agro / Cross Country / Ocean Galleria.
$ErrorActionPreference = 'Stop'

$ROOT = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$COMP = Join-Path $ROOT 'assets\images\logos\companies'
$BACKUP = Join-Path $COMP '_pretrim'
$SCRAPED = Join-Path $ROOT 'scripts\_scraped'
$DOCS = Join-Path $ROOT 'docs\All Logos\LG New Logos - 2024'
New-Item -ItemType Directory -Force -Path $BACKUP | Out-Null

$cs = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class LogoAlphaFix2 {
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

  static int YellowAlpha(byte b, byte g, byte r) {
    if (r > 200 && g > 180 && b < 120) return 0;
    if (r > 230 && g > 210 && b < 160) return 0;
    if (r > 245 && g > 245 && b > 245) return 0;
    if (r > 190 && g > 170 && b < 140 && ((r + g) > (b * 3))) {
      double t = Math.Min(1.0, b / 120.0);
      return (int)Math.Round(255 * t);
    }
    return 255;
  }

  static Bitmap ToArgb(Image img) {
    var bmp = new Bitmap(img.Width, img.Height, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(bmp)) {
      g.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
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

  static void FloodPlate(Bitmap bmp, Func<byte,byte,byte,int> plateAlpha) {
    BitmapData data; int stride, w, h;
    byte[] bytes = LockBytes(bmp, out data, out stride, out w, out h);
    bool[] visited = new bool[w * h];
    var q = new Queue<int>();

    Action<int> trySeed = (idx) => {
      if (visited[idx]) return;
      int x = idx % w, y = idx / w;
      int i = y * stride + x * 4;
      if (plateAlpha(bytes[i], bytes[i+1], bytes[i+2]) >= 255) return;
      visited[idx] = true;
      q.Enqueue(idx);
    };

    for (int x = 0; x < w; x++) { trySeed(x); trySeed((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { trySeed(y * w); trySeed(y * w + (w - 1)); }

    int[] dx = { -1,0,1,-1,1,-1,0,1 };
    int[] dy = { -1,-1,-1,0,0,1,1,1 };
    while (q.Count > 0) {
      int idx = q.Dequeue();
      int x = idx % w, y = idx / w;
      int i = y * stride + x * 4;
      int alpha = plateAlpha(bytes[i], bytes[i+1], bytes[i+2]);
      if (alpha >= 255) continue;
      if (alpha < bytes[i+3]) bytes[i+3] = (byte)alpha;
      for (int k = 0; k < 8; k++) {
        int nx = x + dx[k], ny = y + dy[k];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        int nidx = ny * w + nx;
        if (visited[nidx]) continue;
        int ni = ny * stride + nx * 4;
        if (plateAlpha(bytes[ni], bytes[ni+1], bytes[ni+2]) < 255) {
          visited[nidx] = true;
          q.Enqueue(nidx);
        }
      }
    }
    UnlockBytes(bmp, data, bytes);
  }

  // Key ALL matching plate pixels (reaches enclosed counters like ATL A / letter holes)
  static void GlobalPlate(Bitmap bmp, Func<byte,byte,byte,int> plateAlpha) {
    BitmapData data; int stride, w, h;
    byte[] bytes = LockBytes(bmp, out data, out stride, out w, out h);
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int i = y * stride + x * 4;
        int alpha = plateAlpha(bytes[i], bytes[i+1], bytes[i+2]);
        if (alpha < bytes[i+3]) bytes[i+3] = (byte)alpha;
      }
    }
    UnlockBytes(bmp, data, bytes);
  }

  static Rectangle ContentBounds(Bitmap bmp, int alphaMin) {
    BitmapData data; int stride, w, h;
    byte[] bytes = LockBytes(bmp, out data, out stride, out w, out h);
    bmp.UnlockBits(data);
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
    if (maxX < 0) throw new Exception("No opaque content");
    return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
  }

  static Bitmap CropPad(Bitmap bmp, Rectangle b, int pad) {
    int x = Math.Max(0, b.X - pad);
    int y = Math.Max(0, b.Y - pad);
    int r = Math.Min(bmp.Width, b.Right + pad);
    int bot = Math.Min(bmp.Height, b.Bottom + pad);
    return bmp.Clone(new Rectangle(x, y, r - x, bot - y), PixelFormat.Format32bppArgb);
  }

  static int FindAtlMarkBottom(Bitmap bmp) {
    BitmapData data; int stride, w, h;
    byte[] bytes = LockBytes(bmp, out data, out stride, out w, out h);
    bmp.UnlockBits(data);
    int[] counts = new int[h];
    int peak = 0;
    for (int y = 0; y < h; y++) {
      int n = 0;
      for (int x = 0; x < w; x++) if (bytes[y * stride + x * 4 + 3] >= 20) n++;
      counts[y] = n;
      if (n > peak) peak = n;
    }
    if (peak < 10) return (int)(h * 0.55);
    int thresh = Math.Max(12, (int)(peak * 0.06));
    int start = 0;
    while (start < h && counts[start] < thresh) start++;
    int minMarkH = Math.Max(80, (int)(w * 0.22));
    int gapNeeded = Math.Max(18, (int)(h * 0.035));
    int inGap = 0, gapStart = -1;
    for (int y = start; y < h; y++) {
      if (counts[y] < thresh) {
        if (gapStart < 0) gapStart = y;
        inGap++;
        if (inGap >= gapNeeded && (gapStart - start) >= minMarkH) return gapStart;
      } else { inGap = 0; gapStart = -1; }
    }
    return start + (int)((h - start) * 0.48);
  }

  public static void ProcessWhite(string src, string dest, int pad, bool clearEnclosedWhite) {
    using (var img = Image.FromFile(src))
    using (var bmp = ToArgb(img)) {
      FloodPlate(bmp, WhiteAlpha);
      if (clearEnclosedWhite) GlobalPlate(bmp, WhiteAlpha);
      var bounds = ContentBounds(bmp, 12);
      using (var cropped = CropPad(bmp, bounds, pad))
        cropped.Save(dest, ImageFormat.Png);
    }
  }

  public static void ProcessAtlYellow(string src, string dest, int pad) {
    using (var img = Image.FromFile(src))
    using (var bmp = ToArgb(img)) {
      FloodPlate(bmp, YellowAlpha);
      GlobalPlate(bmp, YellowAlpha); // clear yellow trapped in letter counters (A)
      int markBottom = FindAtlMarkBottom(bmp);
      Console.WriteLine("ATL mark bottom: " + markBottom + " / " + bmp.Height);
      using (var mark = bmp.Clone(new Rectangle(0, 0, bmp.Width, Math.Max(40, markBottom)), PixelFormat.Format32bppArgb)) {
        var bounds = ContentBounds(mark, 12);
        using (var cropped = CropPad(mark, bounds, pad))
          cropped.Save(dest, ImageFormat.Png);
      }
    }
  }

  public static string SampleCorners(string path) {
    using (var bmp = new Bitmap(path)) {
      var pts = new[] {
        new Point(0,0), new Point(bmp.Width-1,0),
        new Point(0,bmp.Height-1), new Point(bmp.Width-1,bmp.Height-1),
        new Point(bmp.Width/2, bmp.Height/2)
      };
      string[] names = { "TL","TR","BL","BR","C" };
      int transparent = 0, opaque = 0, yellow = 0;
      for (int y = 0; y < bmp.Height; y++)
        for (int x = 0; x < bmp.Width; x++) {
          var c = bmp.GetPixel(x,y);
          if (c.A < 16) { transparent++; continue; }
          opaque++;
          if (c.R > 200 && c.G > 180 && c.B < 120) yellow++;
        }
      var sb = new System.Text.StringBuilder();
      sb.AppendFormat("{0} {1}x{2} opaque={3} trans={4} yellowLeft={5}\n",
        System.IO.Path.GetFileName(path), bmp.Width, bmp.Height, opaque, transparent, yellow);
      for (int i = 0; i < pts.Length; i++) {
        var c = bmp.GetPixel(pts[i].X, pts[i].Y);
        sb.AppendFormat("  {0}: A={1} R={2} G={3} B={4}\n", names[i], c.A, c.R, c.G, c.B);
      }
      return sb.ToString();
    }
  }
}
'@

Add-Type -TypeDefinition $cs -ReferencedAssemblies System.Drawing

function Backup-IfExists([string]$dest) {
  if (Test-Path $dest) {
    $name = [IO.Path]::GetFileNameWithoutExtension($dest)
    Copy-Item $dest (Join-Path $BACKUP ("{0}.bak-before-alpha.png" -f $name)) -Force
  }
}

$jobs = @(
  @{ Src = (Join-Path $SCRAPED 'agro_logoresizey.png'); Dest = (Join-Path $COMP 'lake-agro.png'); Mode = 'white-enclosed'; Pad = 8 },
  # Enclosed white key also clears letter counters / leftover plate islands (safe: no white logo ink)
  @{ Src = (Join-Path $DOCS 'cross-country.jpeg'); Dest = (Join-Path $COMP 'cross-country.png'); Mode = 'white-enclosed'; Pad = 12 },
  @{ Src = (Join-Path $DOCS 'ocean-galleria.jpeg'); Dest = (Join-Path $COMP 'ocean-galleria.png'); Mode = 'white-enclosed'; Pad = 12 },
  @{ Src = (Join-Path $SCRAPED 'atl_logo_src.jpg'); Dest = (Join-Path $COMP 'atl.png'); Mode = 'atl'; Pad = 18 }
)

foreach ($j in $jobs) {
  if (-not (Test-Path $j.Src)) { throw "Missing source: $($j.Src)" }
  Write-Host "$($j.Mode): $($j.Src) -> $($j.Dest)"
  Backup-IfExists $j.Dest
  if ($j.Mode -eq 'atl') {
    [LogoAlphaFix2]::ProcessAtlYellow($j.Src, $j.Dest, $j.Pad)
  } elseif ($j.Mode -eq 'white-enclosed') {
    [LogoAlphaFix2]::ProcessWhite($j.Src, $j.Dest, $j.Pad, $true)
  } else {
    [LogoAlphaFix2]::ProcessWhite($j.Src, $j.Dest, $j.Pad, $false)
  }
  Write-Host ([LogoAlphaFix2]::SampleCorners($j.Dest))
}

Write-Host 'Done.'
