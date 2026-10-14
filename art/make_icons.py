# Builds all icons from art/logo-source.png (user-supplied EMPsize logo).
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
src = Image.open('art/logo-source.png').convert('RGB'); im = np.asarray(src).astype(int); H, W, _ = im.shape
x0, x1, y0, y1 = 63, 1188, 68, 1188               # tile edges (measured)
m = Image.new('L', (W, H), 0)
ImageDraw.Draw(m).rounded_rectangle([x0 + 24, y0 + 24, x1 - 24, y1 - 38], radius=200, fill=255)
m = m.filter(ImageFilter.GaussianBlur(10))
# per-row cream colour sampled from tile interior columns away from the artwork
rows = np.median(np.concatenate([im[:, 110:200], im[:, 1060:1140]], axis=1), axis=1)
k = np.ones(81) / 81
for c in range(3): rows[:, c] = np.convolve(np.pad(rows[:, c], 40, mode='edge'), k, 'valid')
rows[:y0 + 60] = rows[y0 + 60]; rows[y1 - 60:] = rows[y1 - 60]
bg = Image.fromarray(np.repeat(rows[:, None, :], W, axis=1).clip(0, 255).astype('uint8'))
full = Image.composite(src, bg, m).crop((x0, y0, x1, y1))
full.resize((1024, 1024), Image.LANCZOS).save('art/icon-1024.png')
CREAM = tuple(int(v) for v in rows[(y0 + y1) // 2])
# E mark only (for small toolbar sizes)
E = full.crop((272, 112, 902, 742))   # in tile coords (tile is 1125 px)
def rounded(img, s, pad):
    t = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    mk = Image.new('L', (s, s), 0); ImageDraw.Draw(mk).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * .22), fill=255)
    base = Image.new('RGBA', (s, s), CREAM + (255,)); inner = s - 2 * pad
    base.paste(img.resize((inner, inner), Image.LANCZOS), (pad, pad))
    t.paste(base, (0, 0), mk); return t
out = {}
for s in (16, 32, 48):
    out[s] = rounded(E, s, max(1, s // 10))
out[128] = rounded(full, 128, 0)
for s, img in out.items():
    img.save(f'src/icons/icon{s}.png')
    g = img.convert('LA').convert('RGBA'); a = img.split()[3].point(lambda v: int(v * .5)); g.putalpha(a)
    g.save(f'src/icons/icon{s}-off.png')
rounded(E, 64, 4).save('src/icons/logo-mark.png')
print('cream', CREAM, 'E crop check')
