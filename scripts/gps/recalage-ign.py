# Recalage de la photo du plan 1 sur l orthophoto IGN géoréférencée (calage GPS).
# Usage : python recalage-ign.py ign.jpg public/plan-1.webp dossier-de-sortie (opencv-python-headless et numpy)
# ign.jpg : WMS IGN ORTHOIMAGERY.ORTHOPHOTOS en EPSG:4326 sur la BBOX codée ci-dessous, 3000 × 2400 px.
import json, sys
import cv2
import numpy as np

ign_path, plan_path, out_dir = sys.argv[1:4]
LAT1, LAT2, LON1, LON2 = 48.2370, 48.2530, 1.6990, 1.7270
ign = cv2.imread(ign_path)
H, W = ign.shape[:2]
plan_full = cv2.imdecode(np.fromfile(plan_path, np.uint8), cv2.IMREAD_COLOR)
plan = cv2.resize(plan_full, (961, 667), interpolation=cv2.INTER_AREA)  # 1 px = 1 unité du plan

clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
g1 = clahe.apply(cv2.cvtColor(plan, cv2.COLOR_BGR2GRAY))
g2 = clahe.apply(cv2.cvtColor(ign, cv2.COLOR_BGR2GRAY))
sift = cv2.SIFT_create(nfeatures=20000)
k1, d1 = sift.detectAndCompute(g1, None)
k2, d2 = sift.detectAndCompute(g2, None)
matches = cv2.BFMatcher().knnMatch(d1, d2, k=2)
good = [m for m, n in matches if m.distance < 0.75 * n.distance]
src = np.float32([k1[m.queryIdx].pt for m in good])
dst = np.float32([k2[m.trainIdx].pt for m in good])

M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0, maxIters=20000, confidence=0.999)
inl = inl.ravel().astype(bool)
# Affinage : affine complète sur les seuls points retenus
M2, inl2 = cv2.estimateAffine2D(src[inl], dst[inl], method=cv2.RANSAC, ransacReprojThreshold=2.0)
proj = (np.c_[src[inl], np.ones(inl.sum())] @ M2.T)
res = np.linalg.norm(proj - dst[inl], axis=1)

m_per_px_x = (LON2 - LON1) * np.cos(np.radians((LAT1 + LAT2) / 2)) * 111320 / W
m_per_px_y = (LAT2 - LAT1) * 111320 / H
scale = np.sqrt(abs(np.linalg.det(M2[:, :2])))
angle = np.degrees(np.arctan2(M[1, 0], M[0, 0]))

def to_ll(u, v):
    return LAT2 - (v + 0.5) / H * (LAT2 - LAT1), LON1 + (u + 0.5) / W * (LON2 - LON1)

pts = [(60, 60), (480, 40), (900, 60), (920, 330), (900, 610), (480, 630), (60, 610), (40, 330), (480, 330)]
cps = []
for x, y in pts:
    u, v = M2 @ [x, y, 1]
    lat, lon = to_ll(u, v)
    cps.append({'lat': round(lat, 7), 'lon': round(lon, 7), 'x': x, 'y': y})

# Contrôle visuel : plan déformé sur l'orthophoto IGN, en fondu
warp = cv2.warpAffine(plan, M2, (W, H))
mask = cv2.warpAffine(np.full(plan.shape[:2], 255, np.uint8), M2, (W, H)) > 0
blend = ign.copy()
blend[mask] = (0.5 * ign[mask] + 0.5 * warp[mask]).astype(np.uint8)
xs, ys = np.where(mask)[1], np.where(mask)[0]
crop = blend[max(ys.min() - 80, 0):ys.max() + 80, max(xs.min() - 80, 0):xs.max() + 80]
cv2.imwrite(f'{out_dir}/overlay.jpg', crop)
# Damier plan / IGN pour juger l'alignement des bords
check = ign.copy()
tile = 60
for yy in range(0, H, tile):
    for xx in range(0, W, tile):
        if ((xx // tile) + (yy // tile)) % 2 == 0:
            sl = (slice(yy, yy + tile), slice(xx, xx + tile))
            check[sl] = np.where(mask[sl][..., None], warp[sl], ign[sl])
cv2.imwrite(f'{out_dir}/checker.jpg', check[max(ys.min() - 40, 0):ys.max() + 40, max(xs.min() - 40, 0):xs.max() + 40])

print(json.dumps({
    'keypoints': [len(k1), len(k2)], 'good': len(good), 'inliers': int(inl.sum()), 'inliers2': int(inl2.sum()),
    'rotation_deg': round(float(angle), 2), 'ign_px_per_plan_unit': round(float(scale), 4),
    'meters_per_plan_unit': round(float(scale * (m_per_px_x + m_per_px_y) / 2), 4),
    'residual_px_median': round(float(np.median(res)), 2), 'residual_m_median': round(float(np.median(res) * m_per_px_x), 2),
    'M': M2.round(6).tolist(), 'control_points': cps,
}, indent=1))
