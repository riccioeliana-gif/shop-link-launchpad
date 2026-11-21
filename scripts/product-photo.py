# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = ["pillow>=10", "numpy>=1.26", "rembg[cpu]>=2.0.59"]
# ///
"""Isar Things product photo: cut the product out and hang it on the white/pink kitchen-tile wall.

Deterministic: same input + same flags = same output.
- Wall: the 9 real tile faces are cut out of scripts/assets/tile-photo.jpg and laid on an even
  pink grout grid (seeded choice per position), so grout is uniform but tiles look real.
- Cut-out: local rembg model (birefnet-general, downloaded once to ~/.rembg, ~1 GB).
- Hook: a thin brass hanger hook is drawn on top of the hanger when the cut-out looks like a hanger
  (narrow top). Product photos usually crop the hook off.

Usage:
  uv run scripts/product-photo.py IN.jpg [IN2.jpg ...] [-o OUT_DIR] [options]

Options:
  -o, --out DIR        output folder (default: next to input, suffix -tiles.jpg)
  --size WxH           output size (default 1536x2048, 3:4 like Vinted/Shopify)
  --fill 0.74          product height (incl. hook) as a fraction of the image height
  --tile PX            one tile incl. grout, in px at output size (default 205)
  --hook auto|on|off   draw the metal hook (default auto: only when a hanger is detected)
  --model NAME         rembg model (default birefnet-general; u2net is faster, lower quality)
  --no-cutout          input is already a transparent PNG
  --save-cutout        also write the transparent cut-out PNG
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PHOTO = Path(__file__).parent / "assets" / "tile-photo.jpg"
# grout centre lines in tile-photo.jpg (measured): 3x3 complete tiles between them
GRID_X = (73, 223, 373, 523)
GRID_Y = (71, 217, 365, 516)
GROUT_RATIO = 0.06  # grout width / tile pitch, as in the photo (~9 px of 150)


def real_tiles() -> tuple[list[Image.Image], tuple[int, int, int]]:
    """Cut the 9 real tile faces out of the photo (without grout) + the median grout colour."""
    photo = Image.open(PHOTO).convert("RGB")
    a = np.asarray(photo).astype(int)
    pink = (a[..., 0] - a[..., 1]) > 45
    grout = tuple(int(v) for v in np.median(a[pink], axis=0))
    faces = []
    for x0, x1 in zip(GRID_X, GRID_X[1:]):
        for y0, y1 in zip(GRID_Y, GRID_Y[1:]):
            cell = ~pink[y0:y1, x0:x1]
            ys, xs = np.where(cell)
            faces.append(photo.crop((x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)))
    return faces, grout


def tile_wall(w: int, h: int, tile: int, seed: int = 7) -> Image.Image:
    """Even pink grid; each tile face is one of the 9 real tiles (seeded choice), soft light."""
    faces, grout = real_tiles()
    g = max(3, round(tile * GROUT_RATIO))
    body = tile - g
    faces = [f.resize((body, body), Image.LANCZOS) for f in faces]
    rng = np.random.default_rng(seed)
    wall = Image.new("RGB", (w, h), grout)
    # centre the grid so a tile sits in the middle of the image
    ox = round(w / 2 - tile / 2) % tile - tile
    oy = round(h / 2 - tile / 2) % tile - tile
    for y in range(oy, h, tile):
        for x in range(ox, w, tile):
            # no flipping: keeps the photo's light direction consistent on every tile
            wall.paste(faces[rng.integers(len(faces))], (x + g // 2, y + g // 2))

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx - w / 2) / w) ** 2 + ((yy - h * 0.35) / h) ** 2)
    light = 1.02 - 0.08 * r**2 - 0.02 * (yy / h)
    a = np.asarray(wall).astype(np.float32) * light[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def cutout(img: Image.Image, model: str) -> Image.Image:
    from rembg import new_session, remove

    return remove(img.convert("RGB"), session=new_session(model), post_process_mask=True)


def trim(rgba: Image.Image) -> Image.Image:
    box = rgba.getchannel("A").point(lambda p: 255 if p > 12 else 0).getbbox()
    if not box:
        raise SystemExit("cut-out is empty: try --model u2net or a cleaner photo")
    return rgba.crop(box)


def hanger_apex(prod: Image.Image) -> tuple[float, int] | None:
    """If the top of the cut-out is a narrow peak (a hanger), return its centre x and top y."""
    a = np.asarray(prod.getchannel("A")) > 128
    rows = np.where(a.any(1))[0]
    if rows.size == 0:
        return None
    top = rows[0]
    band = a[top : top + max(3, prod.height // 60)]
    xs = np.where(band.any(0))[0]
    if xs.size == 0 or (xs[-1] - xs[0]) > prod.width * 0.2:
        return None
    return float(xs.mean()), int(top)


def add_hook(prod: Image.Image, apex: tuple[float, int]) -> Image.Image:
    """Draw a thin brass hook rising from the hanger apex (like a classic wooden hanger). Taller image."""
    W = prod.width
    t = max(3.0, W * 0.0075)  # wire thickness
    R = W * 0.042  # curl radius
    stem = W * 0.055  # straight part above the hanger
    pad = int(stem + 2 * R + t * 3)
    ss = 4  # supersampling for smooth edges

    out = Image.new("RGBA", (W, prod.height + pad), (0, 0, 0, 0))
    x0, ytop = apex[0], apex[1] + pad

    # stem rises with a slight lean, curls over to the left and comes down to a short tail
    pts = []
    for i in range(13):
        k = i / 12
        pts.append((x0 + R * 0.08 * math.sin(k * math.pi), ytop + t * 3 - (stem + t * 3) * k))
    cx, cy = x0 - R, ytop - stem
    for deg in range(0, 236, 4):
        th = math.radians(deg)
        pts.append((cx + R * math.cos(th), cy - R * math.sin(th)))
    ex, ey = pts[-1]
    pts.append((ex + R * 0.12, ey + R * 0.18))  # little flick at the end

    layer = Image.new("RGBA", (out.width * ss, out.height * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    P = [(x * ss, y * ss) for x, y in pts]

    def stroke(points, width, colour):
        d.line(points, fill=colour, width=max(1, round(width * ss)), joint="curve")
        r = width * ss / 2
        for px, py in (points[0], points[-1]):
            d.ellipse((px - r, py - r, px + r, py + r), fill=colour)

    stroke(P, t, (112, 82, 40, 255))  # dark rim
    stroke(P, t * 0.7, (176, 136, 74, 255))  # brass body
    off = -t * 0.16 * ss
    stroke([(x + off, y + off) for x, y in P], t * 0.25, (232, 204, 148, 255))  # highlight
    out.alpha_composite(layer.resize(out.size, Image.LANCZOS))
    out.alpha_composite(prod, (0, pad))  # hanger covers the bottom of the stem
    return out


def compose(bg: Image.Image, prod: Image.Image, fill: float) -> Image.Image:
    W, H = bg.size
    scale = min(H * fill / prod.height, W * 0.84 / prod.width)
    prod = prod.resize((round(prod.width * scale), round(prod.height * scale)), Image.LANCZOS)
    x = (W - prod.width) // 2
    y = round((H - prod.height) * 0.45)

    alpha = prod.getchannel("A")
    canvas = bg.convert("RGBA")
    # contact shadow (tight) + ambient shadow (wide), offset down-right
    for blur, (dx, dy), strength in (
        (W * 0.005, (W * 0.004, H * 0.006), 0.30),
        (W * 0.022, (W * 0.012, H * 0.02), 0.20),
    ):
        sh = Image.new("L", canvas.size, 0)
        sh.paste(alpha.point(lambda p, s=strength: int(p * s)), (x + round(dx), y + round(dy)))
        dark = Image.new("RGBA", canvas.size, (70, 30, 55, 0))
        dark.putalpha(sh.filter(ImageFilter.GaussianBlur(blur)))
        canvas = Image.alpha_composite(canvas, dark)
    canvas.alpha_composite(prod, (x, y))
    return canvas.convert("RGB")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+", type=Path)
    ap.add_argument("-o", "--out", type=Path)
    ap.add_argument("--size", default="1536x2048")
    ap.add_argument("--fill", type=float, default=0.74)
    ap.add_argument("--tile", type=int, default=205)
    ap.add_argument("--hook", choices=["auto", "on", "off"], default="auto")
    ap.add_argument("--model", default="birefnet-general")
    ap.add_argument("--no-cutout", action="store_true")
    ap.add_argument("--save-cutout", action="store_true")
    a = ap.parse_args()

    W, H = (int(v) for v in a.size.lower().split("x"))
    bg = tile_wall(W, H, a.tile)

    for src in a.inputs:
        img = Image.open(src)
        rgba = img.convert("RGBA") if a.no_cutout else cutout(img, a.model)
        prod = trim(rgba)
        out_dir = a.out or src.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        if a.save_cutout:
            prod.save(out_dir / f"{src.stem}-cutout.png")
        if a.hook != "off":
            apex = hanger_apex(prod)
            if apex is None and a.hook == "on":
                apex = (prod.width / 2, 0)
            if apex is not None:
                prod = add_hook(prod, apex)
        dst = out_dir / f"{src.stem}-tiles.jpg"
        compose(bg, prod, a.fill).save(dst, quality=90, optimize=True, progressive=True)
        print(dst)


if __name__ == "__main__":
    main()
