"""Genera hinge_stamp.stl: embosser a cerniera (print-in-place no, perno da 1.75 mm)
con il logo completo ISAR THINGS SHOP. Uso: python3 build_hinge_stamp.py"""
import numpy as np, trimesh, shapely
from PIL import Image
from shapely.geometry import Polygon
from shapely.ops import unary_union
from skimage import measure
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, "..", "src", "assets", "isar-logo-clear.webp")

# --- parametri (mm) ---
PLATE_T, PLATE_Y = 4.0, 44.0
X_IN, X_OUT = 7.4, 48.0       # distanza dall'asse: bordo interno / esterno piastra
BARREL_R, PIN_D = 4.0, 2.0    # perno: filamento 1.75 mm
KNUCKLES, GAP = 5, 0.5
LOGO_W, RELIEF, POCKET_D, CLEAR = 34.0, 0.9, 1.4, 0.3

# --- logo -> poligono (mm), lettere con buchi via XOR ---
im = Image.open(LOGO).convert("RGBA")
a = im.split()[3].resize((im.width * 4, im.height * 4), Image.LANCZOS)
mask = np.pad(np.array(a) > 128, 1)
poly = Polygon()
for c in measure.find_contours(mask.astype(float), 0.5):
    p = Polygon(c[:, ::-1]).buffer(0)
    if p.area > 40:
        poly = poly.symmetric_difference(p)
poly = poly.simplify(0.6)
minx, miny, maxx, maxy = poly.bounds
s = LOGO_W / (maxx - minx)
poly = shapely.affinity.affine_transform(poly, [s, 0, 0, -s, -(minx + maxx) / 2 * s, (miny + maxy) / 2 * s])  # y su, centrato

def extrude(g, h, z0, dx, dy, mirror=False):
    if mirror:
        g = shapely.affinity.scale(g, -1, 1, origin=(0, 0))
    g = shapely.affinity.translate(g, dx, dy)
    parts = g.geoms if hasattr(g, "geoms") else [g]
    ms = [trimesh.creation.extrude_polygon(p, h) for p in parts if p.area > 0]
    m = trimesh.util.concatenate(ms)
    m.apply_translation([0, 0, z0])
    return m

def box(x0, x1, y0, y1, z0, z1):
    m = trimesh.creation.box(extents=[x1 - x0, y1 - y0, z1 - z0])
    m.apply_translation([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    return m

def cyl_y(r, y0, y1, z):
    m = trimesh.creation.cylinder(radius=r, height=y1 - y0, sections=64)
    m.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    m.apply_translation([0, (y0 + y1) / 2, z])
    return m

U = lambda ms: trimesh.boolean.union(ms, engine="manifold")
D = lambda a, bs: trimesh.boolean.difference([a] + bs, engine="manifold")

cx = (X_IN + X_OUT) / 2
cy = PLATE_Y / 2
w = (PLATE_Y - (KNUCKLES - 1) * GAP) / KNUCKLES

def plate(sign):
    parts = [box(*sorted((sign * X_IN, sign * X_OUT)), 0, PLATE_Y, 0, PLATE_T)]
    for i in range(KNUCKLES):
        if (i % 2 == 0) == (sign < 0):
            y0 = i * (w + GAP); y1 = y0 + w
            parts.append(cyl_y(BARREL_R, y0, y1, PLATE_T))
            parts.append(box(*sorted((sign * (X_IN + 0.3), 0)), y0, y1, 0, PLATE_T))
    return U(parts)

A = plate(-1)   # piastra maschio: logo in rilievo
B = plate(+1)   # piastra femmina: tasca a specchio (si chiude ribaltandosi sull'asse)
A = U([A, extrude(poly, RELIEF, PLATE_T, -cx, cy)])
pocket = extrude(poly.buffer(CLEAR), POCKET_D, PLATE_T - POCKET_D, cx, cy, mirror=True)
B = D(B, [pocket])
pin = cyl_y(PIN_D / 2, -1, PLATE_Y + 1, PLATE_T)
A = D(A, [pin]); B = D(B, [pin])

A.export(os.path.join(HERE, "piastra_A_logo_rilievo.stl"))
B.export(os.path.join(HERE, "piastra_B_logo_incavo.stl"))
U([A, B]).export(os.path.join(HERE, "hinge_stamp.stl"))
print("A", A.is_watertight, "B", B.is_watertight, trimesh.util.concatenate([A, B]).bounds.tolist())

# --- versione in un unico pezzo (print-in-place): perno fuso alla piastra A,
# foro della piastra B con gioco radiale; si stampa tutto insieme, aperto e piatto ---
PIP_PIN_D, PIP_CLEAR = 3.0, 0.35
A1 = U([plate(-1), extrude(poly, RELIEF, PLATE_T, -cx, cy), cyl_y(PIP_PIN_D / 2, 0, PLATE_Y, PLATE_T)])
B1 = D(plate(+1), [pocket, cyl_y(PIP_PIN_D / 2 + PIP_CLEAR, -1, PLATE_Y + 1, PLATE_T)])
one = trimesh.util.concatenate([A1, B1])
one.export(os.path.join(HERE, "hinge_stamp_unico.stl"))
print("unico: componenti separati =", len(one.split(only_watertight=False)), "(attesi 2: A col perno, B)", one.bounds.tolist())
