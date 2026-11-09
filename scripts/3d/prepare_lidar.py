"""
Prépare le relief et la photo de la maquette 3D à partir des données IGN (Géoplateforme) :

- MNS haute résolution (ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES.MNS) : la surface vue d'avion,
  avec le vrai volume des stocks et des fronts de taille ;
- orthophoto (ORTHOIMAGERY.ORTHOPHOTOS) sur la même emprise, drapée sur le relief.

Les structures fines (convoyeurs, silos, bâtiments) sont retirées du relief par une ouverture
morphologique : elles sont modélisées à part dans Blender. Le résultat est écrit dans sources/3d/ :

  terrain.json   emprise, matrice pixel -> repère du plan, altitude de référence (fond de fouille)
  terrain.f32    hauteurs filtrées (float32, ligne par ligne, du nord au sud)
  surface.f32    MNS brut (pour lire la hauteur des structures)
  sol.f32        fond de fouille sans les tas (utilisé dans l'emprise du plan : les stocks y sont ceux du plan)
  ortho.jpg      photo drapée (mêmes bords que les grilles), contraste renforcé

Usage : python prepare_lidar.py   (numpy, opencv-python-headless ; accès internet)
"""
import json
import os
import re
import urllib.request

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'sources', '3d')
WMS = 'https://data.geopf.fr/wms-r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&STYLES=&CRS=EPSG:4326'
MARGIN = 100        # marge autour du plan, en unités du plan (~56 m)
DEM_RES = 0.5       # pas des grilles d'altitude (m)
ORTHO_W = 4096      # largeur de la photo drapée (px)
OPEN_M = 4.5        # largeur sous laquelle un relief est considéré comme une structure (m)

# Calage plan <-> GPS (src/data/plan-1-gps.ts)
src = open(os.path.join(ROOT, 'src', 'data', 'plan-1-gps.ts'), encoding='utf-8').read()
P = np.array([[float(v) for v in m] for m in re.findall(r'lat: ([\d.]+), lon: ([\d.]+), x: (-?\d+), y: (-?\d+)', src)])
to_ll = np.linalg.lstsq(np.c_[P[:, 2:], np.ones(len(P))], P[:, :2], rcond=None)[0]
to_xy = np.linalg.lstsq(np.c_[P[:, :2], np.ones(len(P))], P[:, 2:], rcond=None)[0]

corners = np.c_[[-MARGIN, 961 + MARGIN, 961 + MARGIN, -MARGIN], [-MARGIN, -MARGIN, 667 + MARGIN, 667 + MARGIN], np.ones(4)] @ to_ll
lat1, lon1 = corners.min(0)
lat2, lon2 = corners.max(0)
m_lat = 111320.0
m_lon = 111320.0 * np.cos(np.radians((lat1 + lat2) / 2))
w = int(round((lon2 - lon1) * m_lon / DEM_RES))
h = int(round((lat2 - lat1) * m_lat / DEM_RES))
bbox = f'{lat1},{lon1},{lat2},{lon2}'


def fetch(params, size):
    url = f'{WMS}&BBOX={bbox}&WIDTH={size[0]}&HEIGHT={size[1]}&{params}'
    return urllib.request.urlopen(url, timeout=300).read()


def grid(layer):
    d = fetch(f'LAYERS={layer}&FORMAT=image/x-bil;bits=32', (w, h))
    if len(d) != w * h * 4:
        raise RuntimeError(f'{layer} : réponse inattendue {d[:200]!r}')
    a = np.frombuffer(d, '<f4').reshape(h, w).copy()
    if (a < -1000).mean() > 0.01:
        raise RuntimeError(f'{layer} : pas de données sur cette zone')
    return a


mns = grid('ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES.MNS')

# Relief sans les structures fines : ouverture (érosion puis dilatation) puis léger lissage
k = int(round(OPEN_M / DEM_RES)) | 1
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
terrain = cv2.morphologyEx(mns, cv2.MORPH_OPEN, kernel)
terrain = cv2.GaussianBlur(terrain, (0, 0), 1.0)

# Altitude de référence : fond de la cour des installations (centre du plan)
# Matrice pixel (colonne, ligne) -> repère du plan : pixel -> (lat, lon) puis calage
A_ll = np.array([[0, -(lat2 - lat1) / h, lat2 - 0.5 * (lat2 - lat1) / h],   # lat = f(col, row)
                 [(lon2 - lon1) / w, 0, lon1 + 0.5 * (lon2 - lon1) / w]])  # lon = f(col, row)
A3 = np.vstack([A_ll, [0, 0, 1]])
pix_to_plan = (to_xy.T @ A3)  # 2 x 3 : [x, y] = M @ [col, row, 1]
inv = np.linalg.inv(np.vstack([pix_to_plan, [0, 0, 1]]))[:2]
cx, cy = inv @ [480, 330, 1]
core = terrain[int(cy) - 100:int(cy) + 100, int(cx) - 100:int(cx) + 100]
z0 = float(np.percentile(core, 20))

ortho_h = int(round(ORTHO_W * h / w))
ortho = fetch('LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg', (ORTHO_W, ortho_h))

# Fond de fouille sans les tas : les stocks bougent, le relevé IGN en montre d'anciens.
# Érosion large (le point le plus bas à ~30 m à la ronde) puis lissage : il ne reste que le sol de la carrière.
FLOOR_M = 60
kf = int(round(FLOOR_M / DEM_RES)) | 1
floor = cv2.erode(terrain, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kf, kf)))
floor = cv2.GaussianBlur(floor, (0, 0), 10 / DEM_RES)

os.makedirs(OUT, exist_ok=True)
terrain.astype('<f4').tofile(os.path.join(OUT, 'terrain.f32'))
floor.astype('<f4').tofile(os.path.join(OUT, 'sol.f32'))
mns.astype('<f4').tofile(os.path.join(OUT, 'surface.f32'))
# Photo très claire sur la carrière : niveaux et gamma pour garder du relief visuel sur les tas
img = cv2.imdecode(np.frombuffer(ortho, np.uint8), cv2.IMREAD_COLOR).astype(np.float32) / 255
lo, hi = np.percentile(img, 0.5), np.percentile(img, 99.7)
img = np.clip((img - lo) / (hi - lo), 0, 1) ** 1.35
cv2.imwrite(os.path.join(OUT, 'ortho.jpg'), (img * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
meta = {
    'source': 'IGN Géoplateforme : ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES.MNS et ORTHOIMAGERY.ORTHOPHOTOS (EPSG:4326)',
    'bbox_latlon': [lat1, lon1, lat2, lon2],
    'width': w, 'height': h, 'resolution_m': DEM_RES,
    'pix_to_plan': pix_to_plan.tolist(),
    'meters_per_plan_unit': float(np.sqrt(abs(np.linalg.det(pix_to_plan[:, :2]))) ** -1 * DEM_RES),
    'z0': z0,
    'ortho': [ORTHO_W, ortho_h],
}
json.dump(meta, open(os.path.join(OUT, 'terrain.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in meta.items() if k != 'pix_to_plan'}, indent=1))
print('relief', round(float(terrain.min() - z0), 1), 'à', round(float(terrain.max() - z0), 1), 'm autour du fond de fouille')
