using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class CutPrincipleBg5
{
    public static void Cut(string sourcePath, string destPath)
    {
        using (var loaded = new Bitmap(sourcePath))
        using (var bmp = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(bmp))
            {
                graphics.DrawImage(loaded, 0, 0, loaded.Width, loaded.Height);
            }

            int width = bmp.Width;
            int height = bmp.Height;
            var rect = new Rectangle(0, 0, width, height);
            var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            var bytes = new byte[stride * height];
            Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

            int origin = 4 * stride + 16;
            int bgB = bytes[origin];
            int bgG = bytes[origin + 1];
            int bgR = bytes[origin + 2];

            var protect = new bool[width * height];
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    int pixel = y * stride + x * 4;
                    int b = bytes[pixel];
                    int g = bytes[pixel + 1];
                    int r = bytes[pixel + 2];
                    bool lightObject = r >= bgR + 4 && g >= bgG + 6 && b >= bgB + 8;
                    bool darkObject = r < 170 && g < 190;
                    if (lightObject || darkObject) protect[y * width + x] = true;
                }
            }

            var grown = (bool[])protect.Clone();
            var dark = new bool[width * height];
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    int pixel = y * stride + x * 4;
                    if (bytes[pixel + 2] < 170 && bytes[pixel + 1] < 190) dark[y * width + x] = true;
                }
            }
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    if (!dark[y * width + x]) continue;
                    for (int dy = -1; dy <= 1; dy++)
                    {
                        int ny = y + dy;
                        if (ny < 0 || ny >= height) continue;
                        for (int dx = -1; dx <= 1; dx++)
                        {
                            int nx = x + dx;
                            if (nx < 0 || nx >= width) continue;
                            grown[ny * width + nx] = true;
                        }
                    }
                }
            }

            var seen = new bool[width * height];
            var queue = new int[width * height];
            int head = 0;
            int tail = 0;

            Action<int, int> consider = null;
            consider = (x, y) =>
            {
                if (x < 0 || y < 0 || x >= width || y >= height) return;
                int id = y * width + x;
                if (seen[id] || grown[id]) return;
                seen[id] = true;
                int pixel = y * stride + x * 4;
                int delta = Math.Max(
                    Math.Abs(bytes[pixel + 2] - bgR),
                    Math.Max(Math.Abs(bytes[pixel + 1] - bgG), Math.Abs(bytes[pixel] - bgB)));
                if (delta > 16) return;
                bytes[pixel + 3] = 0;
                queue[tail++] = id;
            };

            for (int x = 0; x < width; x++)
            {
                consider(x, 0);
                consider(x, height - 1);
            }
            for (int y = 0; y < height; y++)
            {
                consider(0, y);
                consider(width - 1, y);
            }
            while (head < tail)
            {
                int id = queue[head++];
                int x = id % width;
                int y = id / width;
                consider(x + 1, y);
                consider(x - 1, y);
                consider(x, y + 1);
                consider(x, y - 1);
            }

            Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
            bmp.UnlockBits(data);
            bmp.Save(destPath, ImageFormat.Png);
            Console.WriteLine(bgR + "," + bgG + "," + bgB);
        }
    }
}
