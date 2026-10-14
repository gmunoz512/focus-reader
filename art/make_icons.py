# Builds all icons from art/logo-source.png (user-supplied EMPsize logo, white background).
from PIL import Image, ImageDraw
import numpy as np
src = Image.open('art/logo-source.png')
if src.mode in ('RGBA', 'LA', 'P'):
    src = src.convert('RGBA'); bgw = Image.new('RGBA', src.size, (255, 255, 255, 255)); src = Image.alpha_composite(bgw, src)
src = src.convert('RGB')
src.resize((1024, 1024), Image.LANCZOS).save('art/icon-1024.png')   # full design, opaque white
a = np.asarray(src).astype(int); nw = a.min(axis=2) < 235
nw[860:] = False                                                    # E mark only (above wordmark)
ys, xs = np.where(nw); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
s = max(x1 - x0, y1 - y0) + 20; cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
E = src.crop((cx - s // 2, cy - s // 2, cx - s // 2 + s, cy - s // 2 + s))
def tile(img, s, pad, radius=.22):
    t = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    mk = Image.new('L', (s, s), 0); ImageDraw.Draw(mk).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius), fill=255)
    base = Image.new('RGBA', (s, s), (255, 255, 255, 255)); inner = s - 2 * pad
    base.paste(img.resize((inner, inner), Image.LANCZOS), (pad, pad)); t.paste(base, (0, 0), mk); return t
out = {16: tile(E, 16, 1), 32: tile(E, 32, 2), 48: tile(E, 48, 3), 128: tile(src, 128, 0)}
for k, img in out.items():
    img.save(f'src/icons/icon{k}.png')
    g = img.convert('LA').convert('RGBA'); g.putalpha(img.split()[3].point(lambda v: int(v * .5))); g.save(f'src/icons/icon{k}-off.png')
tile(E, 64, 3).save('src/icons/logo-mark.png')
print('E box', x0, x1, y0, y1)
