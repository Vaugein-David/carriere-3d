"""
Maquette 3D de la carrière SMBP de Viabon.

- Relief réel : MNS haute résolution IGN, filtré des structures fines (sources/3d/terrain.f32,
  préparé par scripts/3d/prepare_lidar.py), avec l'orthophoto drapée (sources/3d/ortho.jpg).
- Installations modélisées d'après les photos du site : scripts/blender/installations.py
  (convoyeurs dont la hauteur est lue sur le MNS, silos, clarificateurs, usine, hangar, trémie…).
- Flèches de circulation et panneaux du plan 1 : sources/plan-1-3d.json
  (généré par `node scripts/export-3d-data.mjs`), posés sur le relief.

Sorties : public/models/carriere.glb (page /plan-3d) et public/renders/*.webp (accueil).

En ligne de commande (rendus + export) :
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/blender/build_carriere.py
ou `npm run model`. Dans l'interface de Blender, le script crée sa propre scène « Carriere3D ».

Repère : 1 unité Blender = 10 unités du plan (961 × 667), soit environ 5,6 m.
Centre du plan à l'origine, haut du plan vers +Y, altitude 0 = fond de la cour des installations.
"""

import importlib.util
import json
import math
import os
import random
import re

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = globals().get('ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = json.load(open(os.path.join(ROOT, 'sources', 'plan-1-3d.json'), encoding='utf-8'))
W, H = DATA['width'], DATA['height']
S = 0.1

_spec = importlib.util.spec_from_file_location('installations', os.path.join(ROOT, 'scripts', 'blender', 'installations.py'))
INST = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(INST)

random.seed(7)

# ---------------------------------------------------------------- relief (MNS IGN)

TMETA = json.load(open(os.path.join(ROOT, 'sources', '3d', 'terrain.json')))
GW, GH = TMETA['width'], TMETA['height']
TER = np.fromfile(os.path.join(ROOT, 'sources', '3d', 'terrain.f32'), '<f4').reshape(GH, GW)
SUR = np.fromfile(os.path.join(ROOT, 'sources', '3d', 'surface.f32'), '<f4').reshape(GH, GW)
SOL = np.fromfile(os.path.join(ROOT, 'sources', '3d', 'sol.f32'), '<f4').reshape(GH, GW)
# Relief réel conservé seulement autour de la carrière : dans l'emprise du plan, le sol est le fond
# de fouille lissé (sans les anciens tas du relevé IGN), les stocks viennent du plan 1.
RELIEF_HORS_PLAN = True
TRANSITION = 25   # largeur du raccord, en unités du plan, de part et d'autre du bord du plan
Z0 = TMETA['z0']
MPU = TMETA['meters_per_plan_unit']
M2BU = 1 / (MPU * 10)               # mètres -> unités Blender
_P2G = np.linalg.inv(np.vstack([np.array(TMETA['pix_to_plan']), [0, 0, 1]]))[:2]   # plan -> pixel de grille


def grid_px(x, y):
    x = np.asarray(x, float)
    y = np.asarray(y, float)
    return _P2G[0, 0] * x + _P2G[0, 1] * y + _P2G[0, 2], _P2G[1, 0] * x + _P2G[1, 1] * y + _P2G[1, 2]


def sample(grid, x, y):
    """Valeur bilinéaire d'une grille aux points (x, y) du plan"""
    c, r = grid_px(x, y)
    c = np.clip(c - 0.5, 0, GW - 1.001)
    r = np.clip(r - 0.5, 0, GH - 1.001)
    c0 = np.floor(c).astype(int)
    r0 = np.floor(r).astype(int)
    fc, fr = c - c0, r - r0
    g = grid
    return (g[r0, c0] * (1 - fc) * (1 - fr) + g[r0, c0 + 1] * fc * (1 - fr)
            + g[r0 + 1, c0] * (1 - fc) * fr + g[r0 + 1, c0 + 1] * fc * fr)


def flatten_footprints():
    """
    Les grosses structures (silos, hangar, cuves…) restent dans le relief filtré : sous chaque
    emprise modélisée, le sol est ramené au niveau du terrain qui l'entoure.
    """
    Mp = np.array(TMETA['pix_to_plan'])
    shapes = []
    for x, y in INST.BIG_SILOS:
        shapes.append(('c', x, y, INST.BIG_SILO_RADIUS_M / MPU + 3))
    for t in INST.THICKENERS:
        shapes.append(('c', *t['c'], t['r'] + 2))
    rects = INST.PLANT_TOWERS + INST.BUILDINGS + [INST.BUILD_BETTER, INST.HANGAR, INST.TREMIE, INST.BOUES['building'], INST.CENTRALE['tower'],
                                                  INST.CENTRALE['hoppers'], INST.BUNKERS, INST.BASCULE, INST.LAVEUR] + INST.FLATTEN
    for r in rects:
        shapes.append(('r', r['x0'] - 2, r['y0'] - 2, r['x1'] + 2, r['y1'] + 2))
    for x, y, r_m, _h in INST.TREMIE['silos'] + INST.BOUES['silos'] + INST.CENTRALE['silos']:
        shapes.append(('c', x, y, r_m / MPU + 2))
    shapes.append(('c', *INST.BOUES['tank']['c'], INST.BOUES['tank']['r'] + 2))

    for sh in shapes:
        if sh[0] == 'c':
            _, cx, cy, r = sh
            box = (cx - r - 10, cy - r - 10, cx + r + 10, cy + r + 10)
            inside = lambda X, Y, m=0: (X - cx) ** 2 + (Y - cy) ** 2 <= (r + m) ** 2
        else:
            _, x0, y0, x1, y1 = sh
            box = (x0 - 10, y0 - 10, x1 + 10, y1 + 10)
            inside = lambda X, Y, m=0, x0=x0, y0=y0, x1=x1, y1=y1: (X >= x0 - m) & (X <= x1 + m) & (Y >= y0 - m) & (Y <= y1 + m)
        cs, rs = grid_px([box[0], box[2], box[0], box[2]], [box[1], box[1], box[3], box[3]])
        c0, c1 = max(int(min(cs)) - 1, 0), min(int(max(cs)) + 2, GW)
        r0, r1 = max(int(min(rs)) - 1, 0), min(int(max(rs)) + 2, GH)
        if c1 <= c0 or r1 <= r0:
            continue
        C, R = np.meshgrid(np.arange(c0, c1) + 0.5, np.arange(r0, r1) + 0.5)
        X = Mp[0, 0] * C + Mp[0, 1] * R + Mp[0, 2]
        Y = Mp[1, 0] * C + Mp[1, 1] * R + Mp[1, 2]
        core = inside(X, Y)
        ring = inside(X, Y, 8) & ~inside(X, Y, 2)
        if not core.any() or not ring.any():
            continue
        win = TER[r0:r1, c0:c1]
        floor = np.percentile(win[ring], 25)
        win[core] = np.minimum(win[core], floor)
        # Raccord doux sur la bordure
        edge = inside(X, Y, 2) & ~core
        win[edge] = np.minimum(win[edge], (win[edge] + floor) / 2)


flatten_footprints()


def clear_conveyor_ridges(half=3.5, probe=8.0):
    """
    Là où un convoyeur passe bas au-dessus d'un tas, le relief filtré garde une crête à sa forme.
    Dans un couloir sous chaque convoyeur, le sol est ramené au plus haut des deux côtés (sondés à ±probe).
    """
    Mp = np.array(TMETA['pix_to_plan'])
    ref = TER.copy()
    for c in INST.CONVEYORS:
        (ax, ay), (bx, by) = c['a'], c['b']
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        xs = [ax, bx, ax + nx * half, bx - nx * half, ax - nx * half, bx + nx * half]
        ys = [ay, by, ay + ny * half, by - ny * half, ay - ny * half, by + ny * half]
        cs, rs = grid_px(xs, ys)
        c0, c1 = max(int(min(cs)) - 2, 0), min(int(max(cs)) + 3, GW)
        r0, r1 = max(int(min(rs)) - 2, 0), min(int(max(rs)) + 3, GH)
        C, R = np.meshgrid(np.arange(c0, c1) + 0.5, np.arange(r0, r1) + 0.5)
        X = Mp[0, 0] * C + Mp[0, 1] * R + Mp[0, 2]
        Y = Mp[1, 0] * C + Mp[1, 1] * R + Mp[1, 2]
        t = (X - ax) * ux + (Y - ay) * uy
        d = (X - ax) * nx + (Y - ay) * ny
        m = (np.abs(d) < half) & (t > 0) & (t < L)
        if not m.any():
            continue
        px, py = ax + ux * t[m], ay + uy * t[m]
        left = sample(ref, px + nx * probe, py + ny * probe)
        right = sample(ref, px - nx * probe, py - ny * probe)
        win = TER[r0:r1, c0:c1]
        win[m] = np.minimum(win[m], np.maximum(left, right))


clear_conveyor_ridges()


def ground_m(x, y):
    """Altitude du sol en mètres au-dessus du fond de la cour (sans tas dans l'emprise du plan)"""
    x = np.asarray(x, float)
    y = np.asarray(y, float)
    floor = sample(SOL, x, y)
    if not RELIEF_HORS_PLAN:
        return floor - Z0
    # 0 à l'intérieur du plan, 1 au-delà de son bord (raccord progressif)
    outside = np.maximum.reduce([-x, x - W, -y, y - H])
    w = np.clip((outside + TRANSITION) / (2 * TRANSITION), 0, 1)
    return floor * (1 - w) + sample(TER, x, y) * w - Z0


def gz(x, y):
    """Altitude du sol en unités Blender"""
    return float(ground_m(x, y) * M2BU)


def surface_max_m(x, y, r=3):
    """Point le plus haut du MNS autour d'un point (structures comprises), en mètres"""
    xs, ys = np.meshgrid(np.linspace(x - r, x + r, 7), np.linspace(y - r, y + r, 7))
    return float((sample(SUR, xs, ys) - Z0).max())


def xy(px, py):
    return ((px - W / 2) * S, -(py - H / 2) * S)


def P(px, py, z):
    return Vector((*xy(px, py), z))


def hex_rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


# ---------------------------------------------------------------- scène

def fresh_scene():
    if bpy.app.background:
        # Ligne de commande (--factory-startup) : la scène par défaut, vidée, sert de maquette
        sc = bpy.context.scene
        for o in list(bpy.data.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        sc.name = 'Carriere3D'
        return sc
    old = bpy.data.scenes.get('Carriere3D')
    if old:
        datas = [o.data for o in old.collection.all_objects if o.data]
        for o in list(old.collection.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.scenes.remove(old)
        for d in datas:
            if d.users == 0:
                for coll in (bpy.data.meshes, bpy.data.lights, bpy.data.cameras):
                    if d.name in coll and coll[d.name] == d:
                        coll.remove(d)
                        break
    sc = bpy.data.scenes.new('Carriere3D')
    if bpy.context.window:
        bpy.context.window.scene = sc
    return sc


scene = fresh_scene()
col = scene.collection


def link(obj):
    col.objects.link(obj)
    return obj


# ---------------------------------------------------------------- matériaux

def material(name, color, rough=0.85, metal=0.0, emit=0.0, alpha=1.0, vcol=False):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = hex_rgb(color)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = hex_rgb(color)
        bsdf.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    if vcol:
        # Couleur portée par les sommets (exportée en COLOR_0 dans le glTF)
        attr = nt.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return m


M = {
    'side': material('Socle', '#d9d5cc', 0.9),
    'galva': material('Acier galvanisé', '#b9c0c6', 0.38, 0.75),
    'cover': material('Capot convoyeur', '#c9d0d5', 0.32, 0.8),
    'frame': material('Charpente', '#8e979f', 0.5, 0.6),
    'black': material('Acier noir', '#33373c', 0.55, 0.5),
    'concrete': material('Béton', '#c9c5bc', 0.85),
    'blocks': material('Blocs béton', '#d6d3cb', 0.9),
    'clad': material('Bardage blanc', '#eceeee', 0.55, 0.1),
    'roof': material('Toiture', '#a9b0b6', 0.45, 0.5),
    'dark': material('Sombre', '#2b2e33', 0.6),
    'glass': material('Vitrage', '#3c5566', 0.15, 0.3),
    'water': material('Eau', '#7fc6b8', 0.08),
    'red': material('Rouge', '#c8102e', 0.5),
    'white': material('Blanc', '#f2f2f0', 0.55),
    'blue': material('Bleu machine', '#1f4f9e', 0.45, 0.3),
    'yellow': material('Jaune engin', '#f2b705', 0.4, 0.2),
    'rubber': material('Pneu', '#161616', 0.9),
    'cake': material('Boues', '#cdbb94', 0.95),
    'sludge': material('Boues liquides', '#7a6a4f', 0.3),
    'screen': material('Crible', '#cdb48a', 0.6, 0.2),
    'frame_warm': material('Charpente galvanisée', '#b7b19f', 0.45, 0.6),
    'drum': material('Tambour laveur', '#ddd5c4', 0.5, 0.3),
    'screen_body': material('Caisse de crible', '#e6e2da', 0.55, 0.2),
    'orange': material('Toile polyuréthane', '#e89a2c', 0.6),
    'logo': material('Logo vert', '#2f8f3a', 0.5),
    'tree': material('Peuplier', '#3f5a2c', 0.9),
    'light': material('Projecteur', '#fff6d8', 0.3, emit=2.0),
    'stone': material('Bloc calcaire', '#e3ddcf', 0.95),
    'gravel': material('Granulats', '#b8b2a6', 0.95),
    'gravel_vc': material('Stocks', '#ffffff', 0.95, vcol=True),
    'sand': material('Sable', '#d6c39b', 0.95),
    'cont_grey': material('Conteneur gris', '#4b5258', 0.6, 0.3),
    'cont_blue': material('Conteneur bleu', '#2f4f7a', 0.6, 0.3),
    'trunk': material('Écorce', '#5b4a3a', 0.9),
}
ARROW_MATS = {}


def arrow_mat(color):
    if color not in ARROW_MATS:
        ARROW_MATS[color] = material(f'Flèche {color}', color, 0.5, emit=0.35)
    return ARROW_MATS[color]


def mesh_obj(name, verts, faces, mats, mat_idx=None, smooth=False, extras=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for m in mats:
        me.materials.append(m)
    if mat_idx:
        for p, i in zip(me.polygons, mat_idx):
            p.material_index = i
    if smooth:
        me.shade_smooth()
    o = link(bpy.data.objects.new(name, me))
    for k, v in (extras or {}).items():
        o[k] = v
    return o


# ---------------------------------------------------------------- outils bmesh

class Kit:
    """Assemble plusieurs primitives (avec un matériau chacune) dans un seul objet."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def _mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _tag(self, verts, mat):
        mi = self._mi(mat)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = mi

    def box(self, c, size, mat, rot=0.0):
        m = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal((*size, 1))
        r = bmesh.ops.create_cube(self.bm, size=1, matrix=m)
        self._tag(r['verts'], mat)

    def beam(self, p0, p1, w, h, mat):
        """Poutre de section w × h entre deux points 3D"""
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        if d.length < 1e-6:
            return
        q = d.normalized().to_track_quat('X', 'Z')
        m = Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((d.length, w, h, 1))
        r = bmesh.ops.create_cube(self.bm, size=1, matrix=m)
        self._tag(r['verts'], mat)

    def tube(self, p0, p1, r, mat, seg=12, r2=None, cap=True):
        """Cylindre (ou tronc de cône) entre deux points 3D"""
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        if d.length < 1e-6:
            return
        q = d.normalized().to_track_quat('Z', 'Y')
        m = Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4()
        res = bmesh.ops.create_cone(self.bm, cap_ends=cap, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=d.length, matrix=m)
        self._tag(res['verts'], mat)

    def cyl(self, c, r, h, mat, r2=None, seg=28, rot=0.0):
        """Cylindre vertical : c = centre de la base"""
        c = Vector(c)
        self.tube(c, c + Vector((0, 0, h)), r, mat, seg, r2)

    def sphere(self, c, r, mat, sz=1.0, seg=10):
        m = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((1, 1, sz, 1))
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r, matrix=m)
        self._tag(res['verts'], mat)

    def prism(self, pts, z0, z1, mat, top_mat=None):
        bottom = [self.bm.verts.new((x, y, z0)) for x, y in pts]
        top = [self.bm.verts.new((x, y, z1)) for x, y in pts]
        mi, ti = self._mi(mat), self._mi(top_mat or mat)
        self.bm.faces.new(top).material_index = ti
        self.bm.faces.new(list(reversed(bottom))).material_index = mi
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            self.bm.faces.new((bottom[i], bottom[j], top[j], top[i])).material_index = mi

    def done(self, smooth=False, extras=None):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        if smooth:
            me.shade_smooth()
        o = link(bpy.data.objects.new(self.name, me))
        for k, v in (extras or {}).items():
            o[k] = v
        return o


def rect_bu(r):
    """Emprise {x0, x1, y0, y1} du plan -> centre (Blender) et dimensions (Blender)"""
    cx, cy = (r['x0'] + r['x1']) / 2, (r['y0'] + r['y1']) / 2
    return cx, cy, (r['x1'] - r['x0']) * S, (r['y1'] - r['y0']) * S


def base_z(r):
    """Altitude du sol sous une emprise (point le plus bas, pour ne pas flotter)"""
    xs = [r['x0'], r['x1'], (r['x0'] + r['x1']) / 2]
    ys = [r['y0'], r['y1'], (r['y0'] + r['y1']) / 2]
    return min(gz(x, y) for x in xs for y in ys)


# ---------------------------------------------------------------- terrain

def terrain():
    margin, step = 100, 2.0
    xs = np.arange(-margin, W + margin + 0.01, step)
    ys = np.arange(-margin, H + margin + 0.01, step)
    X, Y = np.meshgrid(xs, ys)
    Z = ground_m(X, Y) * M2BU
    nx, ny = len(xs), len(ys)
    co = np.stack([(X - W / 2) * S, -(Y - H / 2) * S, Z], -1).reshape(-1, 3).astype(np.float32)

    # Faces en quadrilatères (rangées le long de x)
    idx = np.arange(nx * ny).reshape(ny, nx)
    q = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)

    me = bpy.data.meshes.new('Sol')
    me.vertices.add(len(co))
    me.vertices.foreach_set('co', co.ravel())
    me.loops.add(q.size)
    me.loops.foreach_set('vertex_index', q.ravel().astype(np.int32))
    me.polygons.add(len(q))
    me.polygons.foreach_set('loop_start', np.arange(0, q.size, 4, dtype=np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(q), 4, dtype=np.int32))

    # UV : position dans l'orthophoto (mêmes bords que la grille d'altitude)
    c, r = grid_px(X, Y)
    uv = np.stack([c / GW, 1 - r / GH], -1).reshape(-1, 2)
    layer = me.uv_layers.new(name='UVMap')
    layer.data.foreach_set('uv', uv[q.ravel()].astype(np.float32).ravel())
    me.update(calc_edges=True)
    me.validate()

    img = bpy.data.images.load(os.path.join(ROOT, 'sources', '3d', 'ortho.jpg'), check_existing=True)
    m = bpy.data.materials.get('Orthophoto') or bpy.data.materials.new('Orthophoto')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.extension = 'EXTEND'
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Roughness'].default_value = 0.95
    me.materials.append(m)
    me.shade_smooth()
    o = link(bpy.data.objects.new('Sol', me))
    # Allège le maillage en gardant les formes (crêtes des tas, fronts de taille)
    dec = o.modifiers.new('Allègement', 'DECIMATE')
    dec.decimate_type = 'COLLAPSE'
    dec.ratio = 0.32

    # Socle : bords verticaux de la maquette
    zmin = float(Z.min()) - 0.6
    border = ([(0, i) for i in range(nx)] + [(j, nx - 1) for j in range(1, ny)]
              + [(ny - 1, i) for i in range(nx - 2, -1, -1)] + [(j, 0) for j in range(ny - 2, 0, -1)])
    border = border[::2]
    verts, faces = [], []
    for j, i in border:
        x, y, z = co[j * nx + i]
        verts += [(x, y, z - 0.02), (x, y, zmin)]
    n = len(border)
    for k in range(n):
        a, b = 2 * k, 2 * ((k + 1) % n)
        faces.append((a, b, b + 1, a + 1))
    faces.append(tuple(range(2 * n - 1, 0, -2)))
    mesh_obj('Socle', verts, faces, [M['side']])
    return zmin


# ---------------------------------------------------------------- détails communs

U = M2BU                     # 1 mètre en unités Blender
UP = Vector((0, 0, 1))


def railing(k, pts, h=1.1, closed=False, spacing=1.6, mat=None):
    """Garde-corps : poteaux, lisse haute et sous-lisse le long d'une polyligne 3D"""
    mat = mat or M['galva']
    pts = [Vector(p) for p in pts]
    seq = pts + ([pts[0]] if closed else [])
    for a, b in zip(seq, seq[1:]):
        L = (b - a).length / U
        n = max(1, int(L / spacing))
        for i in range(n):
            p = a + (b - a) * (i / n)
            k.beam(p, p + UP * h * U, 0.05 * U, 0.05 * U, mat)
        k.beam(a + UP * h * U, b + UP * h * U, 0.06 * U, 0.06 * U, mat)
        k.beam(a + UP * h * 0.5 * U, b + UP * h * 0.5 * U, 0.04 * U, 0.04 * U, mat)
    if not closed:
        k.beam(seq[-1], seq[-1] + UP * h * U, 0.05 * U, 0.05 * U, mat)


def circle_pts(c, r, z, n):
    return [Vector((c.x + math.cos(i / n * math.tau) * r, c.y + math.sin(i / n * math.tau) * r, z)) for i in range(n)]


def truss(k, A, B, hw, depth, panel=3.0, mat=None):
    """Poutre treillis (deux faces latérales) sous un tablier A -> B"""
    mat = mat or M['frame']
    d = B - A
    side = Vector((-d.y, d.x, 0)).normalized()
    n = max(2, int(d.length / U / panel))
    down = Vector((0, 0, -depth))
    t = 0.12 * U
    for s in (-1, 1):
        o = side * s * hw
        k.beam(A + o, B + o, t, t, mat)
        k.beam(A + o + down, B + o + down, t, t, mat)
        for i in range(n + 1):
            p = A + d * (i / n) + o
            k.beam(p, p + down, t * 0.8, t * 0.8, mat)
            if i < n:
                q = A + d * ((i + 1) / n) + o
                if i % 2:
                    k.beam(p, q + down, t * 0.7, t * 0.7, mat)
                else:
                    k.beam(p + down, q, t * 0.7, t * 0.7, mat)
    for i in range(0, n + 1, 2):
        p = A + d * (i / n)
        k.beam(p - side * hw + down, p + side * hw + down, t * 0.7, t * 0.7, mat)


def lattice_tower(k, x, y, z0, z1, lx, ly, ang, mat=None):
    """Chevalet treillis à 4 montants (convoyeurs hauts, tours), tourné de `ang` (radians)"""
    mat = mat or M['frame']
    R = Matrix.Rotation(ang, 3, 'Z')
    corners = [R @ Vector((sx * lx / 2, sy * ly / 2, 0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    base = Vector((x, y, 0))
    h = z1 - z0
    levels = max(1, int(h / U / 3.0))
    t = 0.2 * U
    for c in corners:
        k.beam(base + c + UP * z0, base + c + UP * z1, t, t, mat)
    for i in range(1, levels + 1):
        za = z0 + h * (i - 1) / levels
        zb = z0 + h * i / levels
        for j in range(4):
            a, b = corners[j], corners[(j + 1) % 4]
            k.beam(base + a + UP * zb, base + b + UP * zb, t * 0.6, t * 0.6, mat)
            k.beam(base + a + UP * za, base + b + UP * zb, t * 0.45, t * 0.45, mat)
    for c in corners:
        k.box(base + c + UP * (z0 + 0.15 * U), (0.9 * U, 0.9 * U, 0.3 * U), M['concrete'])


def pylon(k, apex, g, side, dn, mat=None):
    """Grand chevalet pyramidal à trois pieds sous une galerie haute (vidéo du site)"""
    mat = mat or M['frame']
    h = apex.z - g
    spread = h * 0.42
    feet = [Vector((apex.x, apex.y, g)) + side * spread - dn * spread * 0.25,
            Vector((apex.x, apex.y, g)) - side * spread - dn * spread * 0.25,
            Vector((apex.x, apex.y, g)) + dn * spread * 0.55]
    t = 0.28 * U
    for f in feet:
        k.beam(f, apex, t, t, mat)
        k.box(f + UP * 0.2 * U, (1.2 * U, 1.2 * U, 0.4 * U), M['concrete'])
    rings = []
    for fr in (0.3, 0.58, 0.8):
        rings.append([f.lerp(apex, fr) for f in feet])
    for ring in rings:
        for i in range(3):
            k.beam(ring[i], ring[(i + 1) % 3], t * 0.55, t * 0.55, mat)
    levels = [feet] + rings
    for a, b in zip(levels, levels[1:]):
        for i in range(3):
            k.beam(a[i], b[(i + 1) % 3], t * 0.4, t * 0.4, mat)
    # Chevêtre sous la galerie
    k.beam(apex - side * 1.0 * U, apex + side * 1.0 * U, 0.3 * U, 0.3 * U, mat)


def ladder(k, base, z0, z1, out, cage=True):
    """Échelle à crinoline le long d'une paroi (out = direction vers l'extérieur)"""
    out = Vector((out.x, out.y, 0)).normalized()
    side = Vector((-out.y, out.x, 0))
    p = Vector((base.x, base.y, 0)) + out * 0.25 * U
    for s in (-1, 1):
        k.beam(p + side * s * 0.22 * U + UP * z0, p + side * s * 0.22 * U + UP * z1, 0.05 * U, 0.05 * U, M['galva'])
    if cage:
        z = z0 + 2.4 * U
        while z < z1:
            pts = [p + out * 0.35 * U + side * 0.4 * U * math.cos(a) + out * 0.4 * U * math.sin(a) + UP * z
                   for a in (-math.pi / 2, -math.pi / 4, 0, math.pi / 4, math.pi / 2)]
            for a, b in zip(pts, pts[1:]):
                k.beam(a, b, 0.04 * U, 0.04 * U, M['galva'])
            z += 1.2 * U


def stairs(k, foot, top, width=1.0):
    """Escalier droit : limons et marches entre deux points 3D"""
    d = top - foot
    flat = Vector((d.x, d.y, 0))
    side = Vector((-flat.y, flat.x, 0)).normalized()
    for s in (-1, 1):
        k.beam(foot + side * s * width / 2 * U, top + side * s * width / 2 * U, 0.08 * U, 0.25 * U, M['galva'])
    n = max(3, int(d.z / U / 0.2))
    for i in range(1, n):
        p = foot + d * (i / n)
        k.box(p, (0.25 * U if abs(flat.x) > abs(flat.y) else width * U, width * U if abs(flat.x) > abs(flat.y) else 0.25 * U, 0.04 * U), M['galva'])
    railing(k, [foot + side * width / 2 * U, top + side * width / 2 * U], h=1.0, spacing=2.0)


def ribs(k, c, lx, ly, z0, h, mat, step_m=0.9):
    """Nervures du bardage (tôle ondulée) sur les quatre faces d'un bâtiment"""
    for axis, length, depth in (('x', lx, ly), ('y', ly, lx)):
        n = int(length / U / step_m)
        for i in range(1, n):
            o = -length / 2 + length * i / n
            for s in (-1, 1):
                if axis == 'x':
                    p = c + Vector((o, s * (depth / 2 + 0.02 * U), z0 + h / 2))
                    k.box(p, (0.07 * U, 0.06 * U, h * 0.98), mat)
                else:
                    p = c + Vector((s * (depth / 2 + 0.02 * U), o, z0 + h / 2))
                    k.box(p, (0.06 * U, 0.07 * U, h * 0.98), mat)


# ---------------------------------------------------------------- convoyeurs

def conveyor_heights(c):
    """Altitudes (m) des deux bouts : données, ou lues sur le MNS"""
    (ax, ay), (bx, by) = c['a'], c['b']
    if 'h' in c:
        return float(ground_m(ax, ay)) + c['h'][0], float(ground_m(bx, by)) + c['h'][1]
    out = []
    for t in (0.06, 0.94):
        x, y = ax + (bx - ax) * t, ay + (by - ay) * t
        g = float(ground_m(x, y))
        s = surface_max_m(x, y, 2.5)
        out.append(min(max(s, g + 1.2), g + 24))
    return out[0], out[1]


def conveyor(c):
    (ax, ay), (bx, by) = c['a'], c['b']
    za, zb = (z * M2BU for z in conveyor_heights(c))
    stacker = c['kind'] == 'stacker'
    k = Kit(f"convoyeur_{c['id']}")
    A, B = P(ax, ay, za), P(bx, by, zb)
    d = B - A
    dn = d.normalized()
    side = Vector((-d.y, d.x, 0)).normalized()
    hw = 0.7 * U
    L_m = d.length / U

    # Treillis porteur, bande, capots galvanisés par tronçons (photos)
    truss(k, A, B, hw, 1.1 * U, panel=3.0)
    k.beam(A + UP * 0.05 * U, B + UP * 0.05 * U, 1.1 * U, 0.06 * U, M['rubber'])
    n = max(1, int(L_m / 3.0))
    for i in range(n):
        p0 = A + d * (i / n) + UP * 0.45 * U
        p1 = A + d * ((i + 0.93) / n) + UP * 0.45 * U
        k.tube(p0, p1, 0.6 * U, M['cover'], seg=10)
    # Passerelle latérale avec garde-corps
    wp = side * (hw + 0.45 * U)
    k.beam(A + wp, B + wp, 0.8 * U, 0.06 * U, M['galva'])
    railing(k, [A + side * (hw + 0.85 * U), B + side * (hw + 0.85 * U)], h=1.0, spacing=2.0)

    # Tête : caisson de jetée (rouge sur les stockeurs, vidéo), motoréducteur bleu, goulotte, projecteur
    k.box(B + UP * 0.4 * U, (2.6 * U, 2.6 * U, 2.4 * U), M['red'] if stacker else M['galva'])
    k.box(B + dn * 1.0 * U - UP * 1.4 * U, (1.1 * U, 1.1 * U, 1.8 * U), M['galva'])
    k.tube(B - side * 1.4 * U + UP * 0.2 * U, B - side * 2.6 * U + UP * 0.2 * U, 0.35 * U, M['blue'], seg=12)
    k.box(B - side * 1.6 * U + UP * 0.2 * U, (0.8 * U, 0.6 * U, 0.7 * U), M['blue'])
    k.beam(B + UP * 1.6 * U, B + UP * 3.4 * U, 0.08 * U, 0.08 * U, M['galva'])
    k.box(B + UP * 3.5 * U + dn * 0.2 * U, (0.5 * U, 0.6 * U, 0.35 * U), M['light'])
    # Pied : tambour et trémie de réception
    k.tube(A - side * hw, A + side * hw, 0.4 * U, M['black'], seg=12)
    k.cyl(A + UP * 0.3 * U - dn * 0.6 * U, 0.4 * U, 1.0 * U, M['galva'], r2=1.0 * U, seg=4)

    ang = math.atan2(d.y, d.x)
    if stacker:
        # Stockeur radial : pivot au pied, chevalet en A treillissé et bogie à roues (photos)
        t = 0.62
        top = A + d * t
        g = gz(ax + (bx - ax) * t, ay + (by - ay) * t)
        feet = []
        for s in (-1, 1):
            foot = Vector((top.x, top.y, g + 0.9 * U)) + side * s * 2.8 * U - dn * 1.0 * U
            feet.append(foot)
            k.beam(foot, top - UP * 1.1 * U + side * s * hw, 0.3 * U, 0.3 * U, M['frame'])
            for w in (-1, 1):
                k.tube(foot + dn * w * 0.6 * U - side * 0.25 * U - UP * 0.35 * U, foot + dn * w * 0.6 * U + side * 0.25 * U - UP * 0.35 * U,
                       0.55 * U, M['rubber'], seg=12)
            k.box(foot, (2.0 * U, 0.6 * U, 0.4 * U), M['frame'], ang)
        for f in (0.35, 0.7):
            a = feet[0].lerp(top - UP * 1.1 * U - side * hw, f)
            b = feet[1].lerp(top - UP * 1.1 * U + side * hw, f)
            k.beam(a, b, 0.15 * U, 0.15 * U, M['frame'])
        k.beam(feet[0], feet[1].lerp(top, 0.5), 0.12 * U, 0.12 * U, M['frame'])
        k.cyl(Vector((A.x, A.y, gz(ax, ay))), 1.2 * U, 1.0 * U, M['concrete'], seg=16)
    else:
        # Galerie sur chevalets : pylône pyramidal quand c'est très haut, treillis 4 montants, sinon portique
        n = max(1, int(L_m // 14))
        for i in range(1, n + 1):
            t = i / (n + 1)
            p = A + d * t
            g = gz(ax + (bx - ax) * t, ay + (by - ay) * t)
            h = p.z - 1.1 * U - g
            if h < 0.6 * U:
                continue
            if h > 7.0 * U:
                pylon(k, p - UP * 1.1 * U, g, side, dn)
            elif h > 4.5 * U:
                lattice_tower(k, p.x, p.y, g, p.z - 1.1 * U, 1.4 * U, 2.0 * U, ang)
            else:
                for s in (-1, 1):
                    foot = Vector((p.x, p.y, g)) + side * s * 1.0 * U
                    k.beam(foot, Vector((p.x, p.y, p.z - 1.1 * U)) + side * s * hw, 0.22 * U, 0.22 * U, M['frame'])
                k.beam(Vector((p.x, p.y, (p.z + g) / 2)) + side * hw, Vector((p.x, p.y, (p.z + g) / 2)) - side * hw, 0.12 * U, 0.12 * U, M['frame'])
                k.box(Vector((p.x, p.y, g + 0.15 * U)), (1.0 * U, 3.0 * U, 0.3 * U), M['concrete'], ang)
    k.done(extras={'kind': 'convoyeur'})


# ---------------------------------------------------------------- silos, cuves, bâtiments

def big_silos():
    k = Kit('silos')
    r = INST.BIG_SILO_RADIUS_M * U
    tops = []
    for n_silo, (x, y) in enumerate(INST.BIG_SILOS):
        g = gz(x, y)
        c = P(x, y, g)
        # Piètement : 8 poteaux, ceinture et croix de Saint-André
        legs = circle_pts(c, r * 0.9, g, 8)
        for p in legs:
            k.beam(p, p + UP * 6.2 * U, 0.5 * U, 0.5 * U, M['black'])
            k.box(p + UP * 0.15 * U, (1.0 * U, 1.0 * U, 0.3 * U), M['concrete'])
        for i in range(8):
            a, b = legs[i], legs[(i + 1) % 8]
            k.beam(a + UP * 3.2 * U, b + UP * 3.2 * U, 0.22 * U, 0.22 * U, M['black'])
            k.beam(a + UP * 0.5 * U, b + UP * 5.9 * U, 0.16 * U, 0.16 * U, M['black'])
            k.beam(b + UP * 0.5 * U, a + UP * 5.9 * U, 0.16 * U, 0.16 * U, M['black'])
        # Trémie conique, fût raidi, toiture conique, équipements
        k.cyl(c + UP * 6.0 * U, 0.6 * U, 3.5 * U, M['black'], r2=r, seg=48)
        k.cyl(c + UP * 9.5 * U, r, 7.5 * U, M['black'], seg=48)
        for i in range(16):
            a = i / 16 * math.tau
            p = c + Vector((math.cos(a) * r * 1.01, math.sin(a) * r * 1.01, 9.5 * U))
            k.beam(p, p + UP * 7.5 * U, 0.22 * U, 0.3 * U, M['dark'])
        for z in (11.5, 13.5, 15.5):
            k.cyl(c + UP * z * U, r * 1.015, 0.18 * U, M['dark'], seg=48)
        k.cyl(c + UP * 17 * U, r * 1.02, 1.6 * U, M['galva'], r2=0.8 * U, seg=48)
        railing(k, circle_pts(c, r * 0.98, g + 17.1 * U, 24), h=1.1, closed=True)
        k.box(c + UP * 19.2 * U, (2.4 * U, 2.4 * U, 1.8 * U), M['galva'])
        # Goulotte de vidange dans les cases béton
        k.tube(c + UP * 6.0 * U, c + UP * 3.4 * U + Vector((0, 0.6 * U, 0)), 0.35 * U, M['galva'], seg=10)
        # Échelle à crinoline côté extérieur
        out = Vector((0, 1, 0)) if n_silo == 0 else Vector((1, 0.4, 0))
        ladder(k, c + out.normalized() * r, g + 6.2 * U, g + 17.2 * U, out)
        tops.append(c + UP * 18.6 * U)
    # Passerelle entre les deux silos
    k.beam(tops[0], tops[1], 1.4 * U, 0.3 * U, M['galva'])
    dd = (tops[1] - tops[0]).normalized()
    sd = Vector((-dd.y, dd.x, 0))
    for s in (-1, 1):
        railing(k, [tops[0] + sd * s * 0.7 * U, tops[1] + sd * s * 0.7 * U], h=1.1)

    b = INST.BUNKERS
    g = base_z(b)
    x0, y0 = xy(b['x0'], b['y0'])
    x1, y1 = xy(b['x1'], b['y1'])
    hb = b['h_m'] * U
    t = 0.6 * U
    k.box(((x0 + x1) / 2, y0, g + hb / 2), (abs(x1 - x0), t, hb), M['concrete'])
    for i in range(b['bays'] + 1):
        x = x0 + (x1 - x0) * i / b['bays']
        k.box((x, (y0 + y1) / 2, g + hb / 2), (t, abs(y1 - y0), hb), M['concrete'])
        k.box((x, y1 + 0.3 * U, g + hb * 0.4), (t * 1.6, 0.6 * U, hb * 0.8), M['concrete'])
    # Granulats dans les cases (petits tas)
    for i in range(b['bays']):
        xc = x0 + (x1 - x0) * (i + 0.5) / b['bays']
        k.cyl(Vector((xc, (y0 + y1) / 2, g)), abs(x1 - x0) / b['bays'] * 0.42, hb * 0.55, M['gravel'], r2=0.2 * U, seg=16)
    k.done(extras={'kind': 'silo'})


def thickeners():
    k = Kit('clarificateurs')
    for t in INST.THICKENERS:
        x, y = t['c']
        g = gz(x, y)
        r = t['r'] * S
        h = (4.5 if t['bridge'] else 3.5) * U
        c = P(x, y, g)
        k.cyl(c, r, h, M['galva'], seg=64)
        for z in (h * 0.33, h * 0.66):
            k.cyl(c + UP * z, r * 1.01, 0.12 * U, M['frame'], seg=64)
        k.cyl(c + UP * (h - 0.25 * U), r * 0.97, 0.28 * U, M['water'], seg=64)
        k.cyl(c + UP * (h - 0.35 * U), r * 0.9, 0.4 * U, M['galva'], r2=r * 0.9, seg=64)
        k.cyl(c + UP * (h - 0.3 * U), r * 0.88, 0.33 * U, M['water'], seg=64)
        railing(k, circle_pts(c, r, g + h, max(16, int(r / U / 1.2))), h=1.1, closed=True)
        ladder(k, c + Vector((r, 0, 0)), g, g + h, Vector((1, 0, 0)), cage=False)
        if t['bridge']:
            hb = h + 0.5 * U
            k.beam(c + Vector((-r, 0, hb)), c + Vector((r, 0, hb)), 1.6 * U, 0.7 * U, M['galva'])
            for s in (-1, 1):
                railing(k, [c + Vector((-r, s * 0.8 * U, hb + 0.35 * U)), c + Vector((r, s * 0.8 * U, hb + 0.35 * U))], h=1.1)
            k.box(c + UP * (hb + 1.2 * U), (2.6 * U, 2.2 * U, 2.0 * U), M['red'])
            k.cyl(c + UP * (hb - 3.0 * U), 1.2 * U, 2.5 * U, M['galva'], seg=20)
            k.tube(c + Vector((-r * 1.15, 0.9 * U, hb - 0.2 * U)), c + Vector((-1.2 * U, 0.9 * U, hb - 0.2 * U)), 0.3 * U, M['blue'], seg=10)
    k.done(extras={'kind': 'cuve'})


def frustum(k, c, w0, d0, w1, d1, z0, z1, mat):
    """Trémie en tronc de pyramide : base w0 × d0 en z0, ouverture w1 × d1 en z1 (c = centre, au sol)"""
    lo = [k.bm.verts.new(c + Vector((sx * w0 / 2, sy * d0 / 2, z0))) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    hi = [k.bm.verts.new(c + Vector((sx * w1 / 2, sy * d1 / 2, z1))) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    mi = k._mi(mat)
    k.bm.faces.new(list(reversed(lo))).material_index = mi
    for i in range(4):
        j = (i + 1) % 4
        k.bm.faces.new((lo[i], lo[j], hi[j], hi[i])).material_index = mi


def steel_frame(k, c, lx, ly, h, nx=2, ny=1, mat=None, brace=True):
    """Charpente à poteaux sur une grille (nx × ny travées), lisses en tête et croix de contreventement"""
    mat = mat or M['frame']
    pts = [[c + Vector((-lx / 2 + lx * i / nx, -ly / 2 + ly * j / ny, 0)) for j in range(ny + 1)] for i in range(nx + 1)]
    for row in pts:
        for p in row:
            k.beam(p, p + UP * h, 0.4 * U, 0.4 * U, mat)
            k.box(p + UP * 0.15 * U, (0.9 * U, 0.9 * U, 0.3 * U), M['concrete'])
    for i in range(nx + 1):
        for j in range(ny + 1):
            p = pts[i][j]
            if i < nx:
                q = pts[i + 1][j]
                k.beam(p + UP * h, q + UP * h, 0.3 * U, 0.4 * U, mat)
                if brace and j in (0, ny):
                    k.beam(p + UP * 0.4 * U, q + UP * h * 0.95, 0.14 * U, 0.14 * U, mat)
                    k.beam(q + UP * 0.4 * U, p + UP * h * 0.95, 0.14 * U, 0.14 * U, mat)
            if j < ny:
                q = pts[i][j + 1]
                k.beam(p + UP * h, q + UP * h, 0.3 * U, 0.4 * U, mat)
                if brace and i in (0, nx):
                    k.beam(p + UP * 0.4 * U, q + UP * h * 0.95, 0.14 * U, 0.14 * U, mat)
    return [p for row in pts for p in row]


def vibrating_screen(k, c, length, width, tilt_m, color, motor):
    """Crible vibrant : caisson incliné, bords hauts, moteurs, goulotte de sortie"""
    a = c - Vector((length / 2, 0, -tilt_m / 2 * U))
    b = c + Vector((length / 2, 0, -tilt_m / 2 * U))
    k.beam(a, b, width, 0.9 * U, color)
    for s in (-1, 1):
        k.beam(a + Vector((0, s * width / 2, 0.5 * U)), b + Vector((0, s * width / 2, 0.5 * U)), 0.12 * U, 0.6 * U, color)
        k.tube(c + Vector((0, s * (width / 2 + 0.3 * U), 0.3 * U)), c + Vector((0, s * (width / 2 + 0.9 * U), 0.3 * U)), 0.35 * U, motor, seg=12)
    k.box(b + Vector((0.4 * U, 0, -0.9 * U)), (0.8 * U, width * 0.8, 1.2 * U), M['galva'])
    for s in (-1, 1):
        for e in (a, b):
            k.cyl(e + Vector((0, s * width * 0.45, -0.9 * U)), 0.12 * U, 0.5 * U, M['dark'], seg=8)


def cyclone(k, base, h_m, r_m, tilt=0.0):
    """Hydrocyclone : cylindre court, cône long, tuyau d'alimentation et de surverse"""
    d = Vector((math.sin(tilt), 0, math.cos(tilt)))
    top = base + d * h_m * U
    k.tube(base, base + d * h_m * 0.65 * U, 0.08 * U, M['white'], seg=14, r2=r_m * U)
    k.tube(base + d * h_m * 0.65 * U, top, r_m * U, M['white'], seg=14)
    k.tube(top, top + UP * 1.2 * U + Vector((0.8 * U, 0, 0)), 0.15 * U, M['galva'], seg=8)
    k.tube(base + d * h_m * 0.85 * U, base + d * h_m * 0.85 * U - Vector((1.2 * U, 0, 0)), 0.18 * U, M['blue'], seg=8)


def washing_plant(t):
    """
    Usine de lavage (photos du site) : plancher galvanisé sur poteaux (~6 m), abri à deux pentes
    bardé d'un seul côté au-dessus du grand tambour laveur, caisson d'alimentation galvanisé,
    crible vibrant blanc à toile orange et rampes d'arrosage, capot galvanisé incliné en bout,
    escalier, paire d'hydrocyclones sur leur plateforme, tuyauterie bleue.
    """
    k = Kit(f"usine_lavage_{t['x0']}")
    cx, cy = (t['x0'] + t['x1']) / 2, (t['y0'] + t['y1']) / 2
    if t['axis'] == 'y':
        length, width = (t['y1'] - t['y0']) * S, (t['x1'] - t['x0']) * S
        feed = P(cx, t['y1'] if t['feed'] == '+' else t['y0'], 0)
        other = P(cx, t['y0'] if t['feed'] == '+' else t['y1'], 0)
    else:
        length, width = (t['x1'] - t['x0']) * S, (t['y1'] - t['y0']) * S
        feed = P(t['x1'] if t['feed'] == '+' else t['x0'], cy, 0)
        other = P(t['x0'] if t['feed'] == '+' else t['x1'], cy, 0)
    ax = (other - feed).normalized()
    ay = Vector((-ax.y, ax.x, 0))
    ang = math.atan2(ax.y, ax.x)
    g = base_z(t)
    L, W = length, width
    deck = 6.0 * U

    def pt(s, v, z):
        return Vector((feed.x, feed.y, g)) + ax * s + ay * v + UP * z

    def box(s, v, z, sl, sw, sh, mat):
        k.box(pt(s, v, z), (sl, sw, sh), mat, ang)

    fw = M['frame_warm']
    # Poteaux, pieds béton, croix de contreventement sur les longs pans
    n = max(3, int(L / U / 4.0))
    stations = [L * (0.04 + 0.92 * i / n) for i in range(n + 1)]
    for i, s in enumerate(stations):
        for v in (-W / 2, W / 2):
            k.beam(pt(s, v, 0), pt(s, v, deck), 0.4 * U, 0.4 * U, fw)
            box(s, v, 0.15 * U, 0.9 * U, 0.9 * U, 0.3 * U, M['concrete'])
            if i < n and i % 2 == 0:
                s2 = stations[i + 1]
                k.beam(pt(s, v, 0.4 * U), pt(s2, v, deck * 0.95), 0.15 * U, 0.15 * U, fw)
                k.beam(pt(s2, v, 0.4 * U), pt(s, v, deck * 0.95), 0.15 * U, 0.15 * U, fw)
        k.beam(pt(s, -W / 2, deck), pt(s, W / 2, deck), 0.3 * U, 0.4 * U, fw)
    for v in (-W / 2, W / 2):
        k.beam(pt(0, v, deck), pt(L, v, deck), 0.3 * U, 0.45 * U, fw)
        k.beam(pt(0, v, deck * 0.5), pt(L, v, deck * 0.5), 0.2 * U, 0.25 * U, fw)
    box(L / 2, 0, deck + 0.1 * U, L, W * 1.2, 0.2 * U, M['dark'])
    railing(k, [pt(0, -W * 0.6, deck), pt(L, -W * 0.6, deck), pt(L, W * 0.6, deck), pt(0, W * 0.6, deck)], h=1.1, closed=True, spacing=1.4)

    # Abri à deux pentes au-dessus du tambour (bardé côté +ay et en pignon d'entrée, ouvert côté -ay)
    s0, s1 = 0.0, L * 0.6
    eave = deck + 5.0 * U
    ridge = deck + 6.4 * U
    for s in np.linspace(s0 + 0.2 * U, s1, max(3, int((s1 - s0) / U / 4) + 1)):
        for v in (-W / 2, W / 2):
            k.beam(pt(s, v, deck), pt(s, v, eave), 0.3 * U, 0.3 * U, M['galva'])
            k.beam(pt(s, v, eave), pt(s, 0, ridge), 0.2 * U, 0.25 * U, M['galva'])
        k.beam(pt(s, -W / 2, eave), pt(s, W / 2, eave), 0.15 * U, 0.15 * U, M['galva'])
    ov = 0.4 * U
    mi = k._mi(M['roof'])
    for side in (-1, 1):
        q = [k.bm.verts.new(pt(s, v, z)) for s, v, z in ((s0 - ov, side * (W / 2 + ov), eave - 0.2 * U), (s1 + ov, side * (W / 2 + ov), eave - 0.2 * U),
                                                         (s1 + ov, 0, ridge), (s0 - ov, 0, ridge))]
        k.bm.faces.new(q).material_index = mi
    wall_h = eave - deck
    k.box(pt((s0 + s1) / 2, W / 2 + 0.05 * U, deck + wall_h / 2), (s1 - s0, 0.1 * U, wall_h), M['clad'], ang)
    for i in range(int((s1 - s0) / U / 0.6)):
        k.box(pt(s0 + (i + 0.5) * 0.6 * U, W / 2 + 0.12 * U, deck + wall_h / 2), (0.07 * U, 0.06 * U, wall_h * 0.98), M['clad'], ang)
    k.box(pt(s0 - 0.05 * U, 0, deck + wall_h / 2), (0.1 * U, W, wall_h), M['clad'], ang)
    tri = [k.bm.verts.new(pt(s0 - 0.05 * U, v, z)) for v, z in ((-W / 2, eave), (0, ridge), (W / 2, eave))]
    k.bm.faces.new(tri).material_index = k._mi(M['clad'])

    # Tambour laveur horizontal, cerclages, motorisation
    drum_z = deck + 2.2 * U
    k.tube(pt(L * 0.06, 0, drum_z), pt(L * 0.55, 0, drum_z), 1.7 * U, M['drum'], seg=24)
    for f in (0.18, 0.43):
        k.tube(pt(L * f, 0, drum_z), pt(L * f + 0.4 * U, 0, drum_z), 1.85 * U, M['galva'], seg=24)
    box(L * 0.3, -W * 0.35, deck + 0.7 * U, 1.6 * U, 1.0 * U, 1.2 * U, M['blue'])
    # Caisson d'alimentation galvanisé avec plateforme
    fb = L * 0.6
    box(fb, 0, deck + 1.6 * U, 3.0 * U, W * 0.6, 3.2 * U, M['galva'])
    for i in range(4):
        box(fb, -W * 0.3 - 0.03 * U, deck + 0.4 * U + i * 0.8 * U, 3.0 * U, 0.06 * U, 0.08 * U, M['frame'])
    railing(k, [pt(fb - 2.2 * U, -W * 0.45, deck + 3.2 * U), pt(fb + 2.2 * U, -W * 0.45, deck + 3.2 * U),
                pt(fb + 2.2 * U, W * 0.45, deck + 3.2 * U), pt(fb - 2.2 * U, W * 0.45, deck + 3.2 * U)], h=1.1, closed=True)
    box(fb, 0, deck + 3.2 * U, 4.4 * U, W * 0.9, 0.12 * U, M['dark'])

    # Crible vibrant : caisse blanche, toile orange, rampes d'arrosage, moteur et carter rouge
    sa, sb = L * 0.64, L * 0.88
    sz = deck - 0.4 * U
    box((sa + sb) / 2, 0, sz, sb - sa, W * 0.62, 1.6 * U, M['screen_body'])
    box((sa + sb) / 2, 0, sz + 0.82 * U, (sb - sa) * 0.96, W * 0.56, 0.06 * U, M['orange'])
    for i in range(6):
        s = sa + (sb - sa) * (i + 0.5) / 6
        k.tube(pt(s, -W * 0.3, sz + 1.3 * U), pt(s, W * 0.3, sz + 1.3 * U), 0.06 * U, M['red'], seg=6)
        for v in (-W * 0.3, W * 0.3):
            k.beam(pt(s, v, sz + 0.8 * U), pt(s, v, sz + 1.3 * U), 0.05 * U, 0.05 * U, M['galva'])
    box((sa + sb) / 2, -W * 0.38, sz - 0.2 * U, (sb - sa) * 0.35, 0.3 * U, 0.9 * U, M['red'])
    k.tube(pt((sa + sb) / 2, -W * 0.42, sz - 0.9 * U), pt((sa + sb) / 2, -W * 0.62, sz - 0.9 * U), 0.35 * U, M['blue'], seg=12)
    for v in (-W * 0.48, W * 0.48):
        k.beam(pt(sa, v, sz - 0.6 * U), pt(sb, v, sz - 0.6 * U), 0.8 * U, 0.06 * U, M['galva'])
        railing(k, [pt(sa, v * 1.12, sz - 0.6 * U), pt(sb, v * 1.12, sz - 0.6 * U)], h=1.1)
    # Capot galvanisé incliné en bout (sortie du crible)
    box((sb + L) / 2, 0, sz - 0.3 * U, L - sb, W * 0.66, 2.0 * U, M['galva'])
    k.beam(pt(sb, 0, sz + 1.9 * U), pt(L, 0, sz + 0.7 * U), W * 0.66, 0.1 * U, M['galva'])
    for i in range(3):
        k.beam(pt(sb, -W * 0.33 + W * 0.33 * i, sz + 1.95 * U), pt(L, -W * 0.33 + W * 0.33 * i, sz + 0.75 * U), 0.1 * U, 0.08 * U, M['frame'])
    k.box(pt(L * 0.94, 0, sz - 1.6 * U), (1.4 * U, W * 0.5, 1.2 * U), M['galva'], ang)

    # Puisard béton sous le crible, tuyaux bleus jusqu'au sol
    box(L * 0.76, 0, 0.7 * U, L * 0.3, W * 0.7, 1.4 * U, M['concrete'])
    box(L * 0.76, 0, 1.35 * U, L * 0.28, W * 0.62, 0.1 * U, M['sludge'])
    for i, s in enumerate((L * 0.5, L * 0.66)):
        p0 = pt(s, -W * 0.55, deck - 0.2 * U)
        p1 = pt(s - 0.6 * U, -W * 0.55, 1.4 * U)
        p2 = pt(s - 2.0 * U, -W * 0.55 - 0.6 * U, 0.4 * U)
        k.tube(p0, p1, 0.22 * U, M['blue'], seg=10)
        k.tube(p1, p2, 0.22 * U, M['blue'], seg=10)

    # Escalier d'accès sur le long pan bardé
    top = pt(L * 0.42, W / 2 + 1.3 * U, deck)
    stairs(k, top - ax * deck * 0.9 - UP * deck, top, width=1.0)
    # Paire d'hydrocyclones sur leur plateforme, côté ouvert
    pc = pt(L * 0.74, -(W / 2 + 3.5 * U), 0)
    ph = 4.5 * U
    for su in (-1, 1):
        for sv in (-1, 1):
            p = pc + ax * su * 1.6 * U + ay * sv * 1.4 * U
            k.beam(p, p + UP * ph, 0.25 * U, 0.25 * U, fw)
    k.box(pc + UP * ph, (3.6 * U, 3.2 * U, 0.2 * U), M['dark'], ang)
    railing(k, [pc + ax * su * 1.8 * U + ay * sv * 1.6 * U + UP * ph for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1))], h=1.1, closed=True)
    for su in (-1, 1):
        cc = pc + ax * su * 0.8 * U
        k.cyl(cc + UP * (ph - 2.6 * U), 0.12 * U, 2.6 * U, M['galva'], r2=0.55 * U, seg=16)
        k.cyl(cc + UP * ph, 0.55 * U, 1.4 * U, M['galva'], seg=16)
        k.tube(cc + UP * (ph + 1.0 * U), cc + UP * (ph + 1.0 * U) + ay * 1.6 * U, 0.2 * U, M['galva'], seg=8)
    k.tube(pc + UP * (ph + 0.6 * U), pt(L * 0.74, -W * 0.5, deck), 0.25 * U, M['blue'], seg=10)
    k.done(extras={'kind': 'usine'})


def plant_towers():
    for n, t in enumerate(INST.PLANT_TOWERS):
        cx, cy, lx, ly = rect_bu(t)
        g = base_z(t)
        c = P(cx, cy, g)
        if t['type'] == 'lavage':
            washing_plant(t)
            continue
        k = Kit(f"usine_{t['type']}")
        if t['type'] == 'tremie':
            # Grand caisson galvanisé sur poteaux, fond pyramidal, pompes bleues au pied (photo)
            legs_h = 4.5 * U
            cone_h = 3.0 * U
            box_h = t['h_m'] * U - legs_h - cone_h
            for sx in (-1, 1):
                for sy in (-1, 1):
                    p = c + Vector((sx * lx * 0.42, sy * ly * 0.42, 0))
                    k.beam(p, p + UP * (legs_h + cone_h), 0.45 * U, 0.45 * U, M['frame'])
                    k.box(p + UP * 0.15 * U, (0.9 * U, 0.9 * U, 0.3 * U), M['concrete'])
            frustum(k, c, 1.2 * U, 1.2 * U, lx * 0.9, ly * 0.9, legs_h, legs_h + cone_h, M['galva'])
            zb = legs_h + cone_h
            k.box(c + UP * (zb + box_h / 2), (lx * 0.9, ly * 0.9, box_h), M['galva'])
            for i in range(9):
                o = -lx * 0.45 + lx * 0.9 * i / 8
                for s in (-1, 1):
                    k.box(c + Vector((o, s * (ly * 0.45 + 0.05 * U), zb + box_h / 2)), (0.15 * U, 0.1 * U, box_h), M['frame'])
            for z in (zb + box_h * 0.33, zb + box_h * 0.66):
                k.box(c + UP * z, (lx * 0.92, ly * 0.92, 0.15 * U), M['frame'])
            top = zb + box_h
            k.box(c + UP * (top + 0.1 * U), (lx * 0.95, ly * 0.95, 0.2 * U), M['dark'])
            railing(k, [c + Vector((sx * lx * 0.47, sy * ly * 0.47, top + 0.2 * U)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))],
                    h=1.1, closed=True)
            ladder(k, c + Vector((lx * 0.45, 0, 0)), legs_h, top, Vector((1, 0, 0)))
            # Pompes bleues au sol, tuyaux vers le caisson
            for i, s in enumerate((-1, 1)):
                p = c + Vector((s * lx * 0.2, -ly * 0.75, 0))
                k.box(p + UP * 0.6 * U, (1.6 * U, 1.0 * U, 1.2 * U), M['blue'])
                k.tube(p + Vector((0.9 * U, 0, 0.7 * U)), p + Vector((1.8 * U, 0, 0.7 * U)), 0.4 * U, M['blue'], seg=12)
                k.tube(p + UP * 1.2 * U, Vector((p.x, c.y - ly * 0.46, g + zb + 1.0 * U)), 0.2 * U, M['blue'], seg=8)
            k.cyl(c + UP * (legs_h - 0.6 * U), 0.4 * U, 0.6 * U, M['red'], seg=12)
        else:
            # Tour de criblage ouverte : deux planchers, cribles à moteurs rouges, goulottes (photo)
            h = t['h_m'] * U
            steel_frame(k, c, lx, ly, h, nx=2, ny=1)
            for fz in (h * 0.38, h * 0.72):
                k.box(c + UP * fz, (lx, ly, 0.22 * U), M['dark'])
                railing(k, [c + Vector((sx * lx / 2, sy * ly / 2, fz)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))],
                        h=1.1, closed=True)
                vibrating_screen(k, c + UP * (fz + 1.2 * U), lx * 0.7, ly * 0.55, 1.2, M['screen'], M['red'])
                for s in (-1, 1):
                    k.cyl(c + Vector((s * lx * 0.2, 0, fz - 2.4 * U)), 0.3 * U, 2.3 * U, M['galva'], r2=ly * 0.18, seg=4)
            k.box(c + UP * (h + 0.3 * U), (lx * 1.05, ly * 1.05, 0.15 * U), M['galva'])
            stairs(k, c + Vector((lx / 2 + 1.0 * U, -ly / 2 - h * 0.38 / U * 0.85 * U, 0)), c + Vector((lx / 2 + 1.0 * U, -ly / 2, h * 0.38)))
        k.done(extras={'kind': 'usine'})


def build_better():
    """Local à côté des clarificateurs : bâtiment bas, volume central plus haut, toit à lames (photo)"""
    b = INST.BUILD_BETTER
    k = Kit('bat_build-better')
    cx, cy, lx, ly = rect_bu(b)
    g = base_z(b)
    c = P(cx, cy, g)
    low = 3.2 * U
    k.box(c + UP * low / 2, (lx, ly, low), M['white'])
    for i in range(int(lx / U / 0.6)):
        k.box(c + Vector((-lx / 2 + (i + 0.5) * 0.6 * U, 0, low + 0.08 * U)), (0.3 * U, ly * 1.04, 0.12 * U), M['galva'])
    mid = c + Vector((-lx * 0.05, -ly * 0.05, 0))
    k.box(mid + UP * 2.8 * U, (lx * 0.3, ly * 0.75, 5.6 * U), M['white'])
    k.box(mid + UP * 5.7 * U, (lx * 0.32, ly * 0.78, 0.2 * U), M['galva'])
    for i in range(4):
        x = -lx / 2 + lx * (i + 0.5) / 4
        if abs(x + lx * 0.05) < lx * 0.15:
            continue
        k.box(c + Vector((x, -ly / 2 - 0.03 * U, 1.3 * U)), (1.4 * U, 0.06 * U, 2.2 * U), M['dark'])
    k.box(c + Vector((lx * 0.12, -ly / 2 - 0.04 * U, 1.9 * U)), (2.0 * U, 0.06 * U, 1.2 * U), M['white'])
    k.box(c + Vector((lx * 0.12 - 0.6 * U, -ly / 2 - 0.06 * U, 1.9 * U)), (0.5 * U, 0.04 * U, 0.6 * U), M['logo'])
    k.done(extras={'kind': 'batiment'})


def buildings():
    for b in INST.BUILDINGS:
        k = Kit(f"bat_{b['id']}")
        cx, cy, lx, ly = rect_bu(b)
        g = base_z(b)
        h = b['h_m'] * U
        color = bpy.data.materials.get(f"Bardage {b['color']}") or material(f"Bardage {b['color']}", b['color'], 0.55, 0.1)
        c = P(cx, cy, g)
        k.box(c + UP * h / 2, (lx, ly, h), color)
        ribs(k, c, lx, ly, 0, h * 0.97, color)
        k.box(c + UP * (h + 0.08 * U), (lx + 0.3 * U, ly + 0.3 * U, 0.2 * U), M['roof'])
        long_x = lx >= ly
        if long_x:
            for i in range(max(1, int(lx / U / 3))):
                xw = -lx / 2 + lx * (i + 0.5) / max(1, int(lx / U / 3))
                k.box(c + Vector((xw, -ly / 2 - 0.03 * U, h * 0.6)), (1.4 * U, 0.06 * U, 0.9 * U), M['glass'])
            k.box(c + Vector((lx * 0.35, -ly / 2 - 0.03 * U, 1.05 * U)), (1.0 * U, 0.06 * U, 2.1 * U), M['dark'])
        else:
            for i in range(max(1, int(ly / U / 3))):
                yw = -ly / 2 + ly * (i + 0.5) / max(1, int(ly / U / 3))
                k.box(c + Vector((lx / 2 + 0.03 * U, yw, h * 0.6)), (0.06 * U, 1.4 * U, 0.9 * U), M['glass'])
            k.box(c + Vector((lx / 2 + 0.03 * U, ly * 0.35, 1.05 * U)), (0.06 * U, 1.0 * U, 2.1 * U), M['dark'])
        # Groupe de climatisation sur le toit
        k.box(c + UP * (h + 0.5 * U) + Vector((lx * 0.25, 0, 0)), (1.0 * U, 0.8 * U, 0.6 * U), M['galva'])
        k.done(extras={'kind': 'batiment'})


def hangar():
    hg = INST.HANGAR
    k = Kit('bat_hangar')
    g = base_z(hg)
    x0, y0 = xy(hg['x0'], hg['y0'])
    x1, y1 = xy(hg['x1'], hg['y1'])
    n = hg['naves']
    wall = hg['wall_m'] * U
    nave_w = (x1 - x0) / n
    rr = nave_w / 2
    ylo, yhi = min(y0, y1), max(y0, y1)
    for i in range(n):
        cx = x0 + nave_w * (i + 0.5)
        # Murs en blocs béton empilés (photos : « Lego » 1,6 × 0,8 m)
        for s in (-1, 1):
            rows = int(hg['wall_m'] / 0.8)
            for row in range(rows):
                y = ylo + (0.8 if row % 2 else 0) * U
                while y < yhi - 0.2 * U:
                    yl = min(1.6 * U, yhi - y)
                    k.box((cx + s * rr * 0.95, y + yl / 2, g + (row + 0.5) * 0.8 * U), (0.8 * U, yl * 0.97, 0.78 * U), M['blocks'])
                    y += 1.6 * U
        # Toiture en arc (demi-cylindre) et arceaux de structure
        seg = 20
        ring = [(cx + math.cos(math.pi * j / seg) * rr, g + wall + math.sin(math.pi * j / seg) * rr * 0.95) for j in range(seg + 1)]
        verts = [k.bm.verts.new((x, y, z)) for y in (ylo, yhi) for x, z in ring]
        mi = k._mi(M['black'])
        for j in range(seg):
            k.bm.faces.new((verts[j], verts[j + 1], verts[seg + 2 + j], verts[seg + 1 + j])).material_index = mi
        for y in np.linspace(ylo + 0.3 * U, yhi - 0.3 * U, max(3, int((yhi - ylo) / U / 4))):
            for j in range(seg):
                a = Vector((ring[j][0], y, ring[j][1])) * 1.0
                b = Vector((ring[j + 1][0], y, ring[j + 1][1]))
                c0 = Vector((cx, y, g + wall))
                k.beam(c0 + (a - c0) * 1.012, c0 + (b - c0) * 1.012, 0.15 * U, 0.15 * U, M['frame'])
        # Pignons clairs avec grande ouverture en arc (vidéo)
        for yy, sgn in ((ylo, -1), (yhi, 1)):
            pts = [k.bm.verts.new((x, yy, z)) for x, z in ring]
            k.bm.faces.new(pts).material_index = k._mi(M['blocks'])
            inner = [(cx + (x - cx) * 0.72, g + (z - g - wall) * 0.72 + wall * 0.2) for x, z in ring]
            pts2 = [k.bm.verts.new((x, yy + sgn * 0.02, z)) for x, z in inner]
            k.bm.faces.new(pts2).material_index = k._mi(M['dark'])
    k.done(extras={'kind': 'batiment'})


def drive_through(k, r, h_walls, h_box, clad=None):
    """Bâtiment bardé posé sur deux murs béton (passage couvert pour les camions), escalier extérieur"""
    clad = clad or M['clad']
    cx, cy, lx, ly = rect_bu(r)
    g = base_z(r)
    c = P(cx, cy, g)
    hw = h_walls * U
    hb = h_box * U
    for s in (-1, 1):
        k.box(c + Vector((0, s * ly * 0.42, hw / 2)), (lx, ly * 0.16, hw), M['concrete'])
    k.box(c + UP * (hw + hb / 2), (lx * 1.05, ly, hb), clad)
    ribs(k, c, lx * 1.05, ly, hw, hb, clad, 0.8)
    k.box(c + UP * (hw + hb + 0.1 * U), (lx * 1.1, ly * 1.04, 0.25 * U), M['roof'])
    k.box(c + Vector((0, -ly / 2 - 0.03 * U, hw + hb * 0.85)), (lx * 0.9, 0.06 * U, 0.8 * U), M['glass'])
    # Escalier et palier d'accès (photo trémie)
    land = c + Vector((-lx * 0.55 - 1.0 * U, -ly * 0.3, hw))
    k.box(land, (2.0 * U, 2.0 * U, 0.15 * U), M['galva'])
    stairs(k, land + Vector((0, -hw / U * 0.95 * U, -hw)), land + Vector((0, -1.0 * U, 0)))
    k.box(c + Vector((-lx * 0.525 - 0.02 * U, -ly * 0.3, hw + 1.1 * U)), (0.06 * U, 1.0 * U, 2.1 * U), M['dark'])
    # Descente d'eau pluviale
    k.beam(c + Vector((lx * 0.52, ly * 0.52, 0)), c + Vector((lx * 0.52, ly * 0.52, hw + hb)), 0.12 * U, 0.12 * U, M['galva'])
    return g


def white_silo(k, x, y, r_m, h_m, band=False, cage=True):
    g = gz(x, y)
    c = P(x, y, g)
    r = r_m * U
    leg = 3.0 * U
    legs = [c + Vector((math.cos(a), math.sin(a), 0)) * r * 0.8 for a in (math.pi / 4 + i * math.pi / 2 for i in range(4))]
    for p in legs:
        k.beam(p, p + UP * leg, 0.25 * U, 0.25 * U, M['galva'])
    for i in range(4):
        k.beam(legs[i] + UP * 0.3 * U, legs[(i + 1) % 4] + UP * (leg - 0.2 * U), 0.08 * U, 0.08 * U, M['galva'])
    k.cyl(c + UP * leg, 0.3 * U, 2.2 * U, M['white'], r2=r, seg=28)
    k.cyl(c + UP * (leg + 2.2 * U), r, h_m * U - leg - 2.2 * U, M['white'], seg=28)
    if band:
        k.cyl(c + UP * (h_m * U * 0.74), r * 1.02, 1.8 * U, M['red'], seg=28)
    k.cyl(c + UP * h_m * U, r, 0.4 * U, M['white'], r2=r * 0.3, seg=28)
    k.box(c + UP * (h_m * U + 0.6 * U), (1.0 * U, 1.0 * U, 0.9 * U), M['galva'])
    railing(k, circle_pts(c, r * 0.95, g + h_m * U, 12), h=1.0, closed=True)
    if cage:
        ladder(k, c + Vector((r, 0, 0)), g + leg, g + h_m * U, Vector((1, 0, 0)))


def tremie():
    t = INST.TREMIE
    k = Kit('bat_tremie')
    drive_through(k, t, 5.0, 5.0)
    for x, y, r, h in t['silos']:
        white_silo(k, x, y, r, h)
    k.done(extras={'kind': 'batiment', 'label': 'TRÉMIE'})


def boues():
    b = INST.BOUES
    k = Kit('bat_usine-boues')
    drive_through(k, b['building'], 5.0, b['building']['h_m'] - 5.0)
    x, y = b['tank']['c']
    g = gz(x, y)
    r = b['tank']['r'] * S
    c = P(x, y, g)
    th = b['tank']['h_m'] * U
    k.cyl(c, r, th, M['black'], seg=64)
    for z in (th * 0.3, th * 0.6, th * 0.9):
        k.cyl(c + UP * z, r * 1.01, 0.12 * U, M['dark'], seg=64)
    k.cyl(c + UP * (th - 0.3 * U), r * 0.97, 0.32 * U, M['sludge'], seg=64)
    railing(k, circle_pts(c, r, g + th, 28), h=1.1, closed=True)
    ladder(k, c + Vector((-r, 0, 0)), g, g + th, Vector((-1, 0, 0)))
    for x, y, r_m, h in b['silos']:
        white_silo(k, x, y, r_m, h)
    k.done(extras={'kind': 'batiment'})


def centrale():
    ce = INST.CENTRALE
    k = Kit('bat_centrale-beton')
    t = ce['tower']
    cx, cy, lx, ly = rect_bu(t)
    g = base_z(t)
    c = P(cx, cy, g)
    th = t['h_m'] * U
    # Châssis du malaxeur et cabine bardée (photo centrale)
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = c + Vector((sx * lx * 0.45, sy * ly * 0.45, 0))
            k.beam(p, p + UP * 6.0 * U, 0.35 * U, 0.35 * U, M['galva'])
    k.box(c + UP * 6.3 * U, (lx, ly, 0.6 * U), M['galva'])
    k.cyl(c + UP * 6.6 * U, 1.4 * U, 1.8 * U, M['galva'], seg=20)
    k.box(c + UP * (6.0 * U + (th - 6 * U) / 2), (lx * 0.8, ly * 0.7, th - 6 * U), M['clad'])
    ribs(k, c, lx * 0.8, ly * 0.7, 6.0 * U, th - 6 * U, M['clad'], 0.8)
    k.box(c + UP * (th + 0.1 * U), (lx * 0.85, ly * 0.75, 0.25 * U), M['roof'])
    stairs(k, c + Vector((lx * 0.6, -ly * 0.5 - 5.5 * U, 0)), c + Vector((lx * 0.6, -ly * 0.5, 6.0 * U)))
    mixer_top = c + UP * th
    for x, y, r, h in ce['silos']:
        white_silo(k, x, y, r, h, band=True)
        # Vis à ciment inclinée du bas du silo vers le malaxeur (photos)
        k.tube(P(x, y, gz(x, y) + 4.5 * U), mixer_top - UP * 1.5 * U, 0.22 * U, M['galva'], seg=10)
    hp = ce['hoppers']
    hx, hy, hlx, hly = rect_bu(hp)
    hg = base_z(hp)
    n = 4
    x0 = xy(hp['x0'], hp['y0'])[0]
    yc = xy(hx, hy)[1]
    # Trémies à granulats : caissons sur pieds, granulats visibles dessus, tapis peseur dessous (photo centrale)
    bw = hlx / n
    for i in range(n):
        px = x0 + bw * (i + 0.5)
        k.box(Vector((px, yc, hg + 3.2 * U)), (bw * 0.96, hly * 0.8, 1.8 * U), M['galva'])
        for sx in (-1, 1):
            for sy in (-1, 1):
                p = Vector((px + sx * bw * 0.4, yc + sy * hly * 0.36, hg))
                k.beam(p, p + UP * 2.3 * U, 0.18 * U, 0.18 * U, M['galva'])
        k.cyl(Vector((px, yc, hg + 4.1 * U)), bw * 0.42, 0.9 * U, M['sand'] if i % 2 else M['gravel'], r2=0.25 * U, seg=12)
    k.beam(Vector((x0, yc, hg + 1.6 * U)), Vector((x0 + hlx, yc, hg + 1.6 * U)), 1.2 * U, 0.4 * U, M['frame'])
    # Murs de blocs béton autour des granulats et du bac de décantation (photo centrale)
    for i in range(10):
        for row in range(3):
            k.box(Vector((*xy(hp['x0'] - 6 + i * 3.2, hp['y1'] + 6), hg + (row + 0.5) * 0.8 * U)), (1.55 * U, 0.8 * U, 0.78 * U), M['blocks'])
    k.prism([xy(hp['x1'] + 4, hp['y0']), xy(hp['x1'] + 14, hp['y0']), xy(hp['x1'] + 14, hp['y0'] + 10), xy(hp['x1'] + 4, hp['y0'] + 10)],
            hg, hg + 1.2 * U, M['concrete'], M['water'])
    k.done(extras={'kind': 'batiment'})


def bascule_laveur():
    k = Kit('bat_bascule')
    b = INST.BASCULE
    cx, cy, lx, ly = rect_bu(b)
    g = base_z(b)
    c = P(cx, cy, g)
    k.box(c + UP * 0.15 * U, (lx * 0.6, ly, 0.3 * U), M['dark'])
    for i in range(6):
        k.box(c + Vector((0, -ly / 2 + ly * (i + 0.5) / 6, 0.31 * U)), (lx * 0.58, 0.08 * U, 0.02 * U), M['galva'])
    cab = c + Vector((lx * 0.55, -ly * 0.3, 0))
    k.box(cab + UP * 1.3 * U, (2.4 * U, 3.6 * U, 2.6 * U), M['white'])
    k.box(cab + Vector((-1.22 * U, 0, 1.6 * U)), (0.05 * U, 2.6 * U, 1.0 * U), M['glass'])
    k.box(cab + UP * 2.7 * U, (2.8 * U, 4.0 * U, 0.15 * U), M['roof'])
    for s in (-1, 1):
        p = c + Vector((-lx * 0.35, s * ly * 0.5, 0))
        k.beam(p, p + UP * 1.1 * U, 0.12 * U, 0.12 * U, M['red'])
    k.done(extras={'kind': 'batiment'})
    k = Kit('bat_laveur')
    lv = INST.LAVEUR
    cx, cy, lx, ly = rect_bu(lv)
    g = base_z(lv)
    c = P(cx, cy, g)
    k.box(c + UP * 0.1 * U, (lx * 0.6, ly, 0.2 * U), M['dark'])
    for s in (-1, 1):
        k.box(c + Vector((s * lx * 0.32, 0, 1.0 * U)), (0.3 * U, ly, 2.0 * U), M['galva'])
        for i in range(8):
            p = c + Vector((s * lx * 0.3, -ly / 2 + ly * (i + 0.5) / 8, 0.5 * U))
            k.tube(p, p - Vector((s * 0.6 * U, 0, -0.2 * U)), 0.06 * U, M['blue'], seg=6)
    k.cyl(c + Vector((lx * 0.7, 0, 0)), 1.2 * U, 2.5 * U, M['blue'], seg=16)
    k.done(extras={'kind': 'batiment'})


# ---------------------------------------------------------------- stocks de granulats (plan 1)

STOCK_KINDS = {'stock', 'reserve', 'green', 'blue', 'orange', 'navy', 'dark'}


def gravel_color(label, kind):
    l = label.replace('\n', ' ').upper()
    if kind == 'orange':
        return '#b58b5c'
    if kind == 'navy':
        return '#86827a'
    if l.startswith('0-1'):
        return '#d9ccb2'
    if l.startswith('0-4'):
        return '#c8b18a'
    if l.startswith('0-'):
        return '#aaa293'
    if kind == 'dark':
        return '#8b8478'
    return '#9b9890'


def point_in_poly(x, y, pts):
    """Test vectorisé (x, y tableaux) : dedans / dehors d'un polygone"""
    inside = np.zeros_like(x, dtype=bool)
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        cond = ((yi > y) != (yj > y)) & (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        inside ^= cond
        j = i
    return inside


def edge_distance(x, y, pts):
    best = np.full_like(x, 1e9, dtype=float)
    for i in range(len(pts)):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % len(pts)]
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        t = np.clip(((x - ax) * dx + (y - ay) * dy) / (L or 1), 0, 1)
        best = np.minimum(best, np.hypot(x - ax - t * dx, y - ay - t * dy))
    return best


def pile(a, n):
    """
    Tas d'un produit, à l'emprise du plan 1 : il épouse le relief réel là où le tas existe déjà
    dans le MNS, et prend une forme de tas (talus d'éboulement) là où le sol est plat.
    Couleur selon le produit (sables, graviers…), sommets nommés pour la mise en évidence du site.
    """
    pts = [tuple(p) for p in a['points']]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    step = 2.0                                   # unités du plan (~1,1 m)
    gx = np.arange(min(xs) - step, max(xs) + step * 1.5, step)
    gy = np.arange(min(ys) - step, max(ys) + step * 1.5, step)
    X, Y = np.meshgrid(gx, gy)
    inn = point_in_poly(X, Y, pts)
    if not inn.any():
        return None
    d_bu = edge_distance(X, Y, pts) * S
    area_bu = abs(sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))) / 2 * S * S
    hmax = max(0.6, min(2.2, math.sqrt(area_bu) * 0.36))
    ground = ground_m(X, Y) * M2BU
    border = ground[~inn & (d_bu < step * S * 1.6)]
    base = float(np.percentile(border, 30)) if border.size else float(ground[inn].min())
    # Ondulation douce (pas de bruit aléatoire : il crée des facettes sombres une fois lissé)
    shape = hmax * np.tanh(d_bu * 0.8 / hmax) * (1 + 0.04 * np.sin(X * 0.31 + n) * np.cos(Y * 0.27 - n))
    Z = np.where(inn, np.maximum(ground + 0.03, base + shape), ground + 0.02)
    # Lissage 3 × 3 à l'intérieur de l'emprise (le relief MNS est granuleux à cette échelle)
    for _ in range(2):
        P_ = np.pad(Z, 1, mode='edge')
        avg = sum(P_[1 + dy:1 + dy + Z.shape[0], 1 + dx:1 + dx + Z.shape[1]] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
        Z = np.where(inn, np.maximum(avg, ground + 0.03), Z)

    ny, nx = X.shape
    idx = np.arange(nx * ny).reshape(ny, nx)
    quads = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
    keep = inn.ravel()[quads].any(1)
    quads = quads[keep]
    used = np.unique(quads)
    remap = np.full(nx * ny, -1)
    remap[used] = np.arange(len(used))
    co = np.stack([(X - W / 2) * S, -(Y - H / 2) * S, Z], -1).reshape(-1, 3)[used]
    faces = remap[quads]

    name = 'pile_' + (a['id'] or f'z{n}')
    o = mesh_obj(name, [tuple(v) for v in co], [tuple(f) for f in faces], [M['gravel_vc']], smooth=True,
                 extras={'areaId': a['id'] or '', 'label': a['label'], 'kind': a['kind']})
    me = o.data
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    col = hex_rgb(gravel_color(a['label'], a['kind']))
    rel = (co[:, 2] - base) / hmax
    for loop in me.loops:
        vi = loop.vertex_index
        x, y = co[vi, 0], co[vi, 1]
        v = 1 + 0.1 * math.sin(x * 9.1 + y * 4.3) * math.cos(y * 7.7 - x * 2.9) - 0.06 * (rel[vi] < 0.15)
        ca.data[loop.index].color = (col[0] * v, col[1] * v, col[2] * v, 1)
    me.color_attributes.active_color = ca
    return o


def piles():
    for n, a in enumerate(DATA['areas']):
        if a['kind'] in STOCK_KINDS:
            pile(a, n)


def poplars():
    k = Kit('arbres')
    p = INST.POPLARS
    y = p['y0']
    while y <= p['y1']:
        x = p['x'] + random.uniform(-1.5, 1.5)
        g = gz(x, y)
        h = random.uniform(16, 22) * U
        c = P(x, y, g)
        k.cyl(c, 0.3 * U, h * 0.35, M['trunk'], r2=0.15 * U, seg=6)
        for f, rr in ((0.38, 1.0), (0.58, 0.9), (0.78, 0.65)):
            off = Vector((random.uniform(-0.3, 0.3) * U, random.uniform(-0.3, 0.3) * U, 0))
            k.sphere(c + off + UP * h * f, 1.9 * U * rr, M['tree'], sz=h * 0.2 / (1.9 * U * rr), seg=8)
        y += p['step'] + random.uniform(-1, 1)
    k.done(smooth=True, extras={'kind': 'arbre'})


def boulders():
    """Rangées de gros blocs calcaires le long des pistes (visibles sur l'orthophoto et les photos)"""
    k = Kit('blocs')
    for row in INST.BOULDER_ROWS:
        pts = densify(row, 3.6)
        for x, y in pts:
            x += random.uniform(-0.6, 0.6)
            y += random.uniform(-0.6, 0.6)
            g = gz(x, y)
            s = random.uniform(0.8, 1.3) * U
            m = (Matrix.Translation(Vector((*xy(x, y), g + 0.35 * s))) @ Matrix.Rotation(random.uniform(0, math.pi), 4, 'Z')
                 @ Matrix.Diagonal((1.3 * s, 0.9 * s, 0.75 * s, 1)))
            res = bmesh.ops.create_icosphere(k.bm, subdivisions=1, radius=0.6, matrix=m)
            for v in res['verts']:
                v.co += Vector((random.uniform(-0.08, 0.08), random.uniform(-0.08, 0.08), random.uniform(-0.05, 0.05))) * s
            k._tag(res['verts'], M['stone'])
    k.done(extras={'kind': 'bloc'})


def masts_and_props():
    k = Kit('equipements')
    for x, y in INST.LIGHT_MASTS:
        g = gz(x, y)
        c = P(x, y, g)
        k.cyl(c, 0.35 * U, 18 * U, M['galva'], r2=0.15 * U, seg=10)
        k.box(c + UP * 18 * U, (2.4 * U, 0.3 * U, 0.3 * U), M['galva'])
        for s in (-1, 0, 1):
            k.box(c + UP * 18.4 * U + Vector((s * 0.8 * U, 0, 0)), (0.6 * U, 0.4 * U, 0.5 * U), M['light'])
        k.box(c + UP * 0.2 * U, (1.2 * U, 1.2 * U, 0.4 * U), M['concrete'])
    for x, y, ang, color in INST.CONTAINERS:
        g = gz(x, y)
        mat = M['cont_blue'] if color == 'bleu' else M['cont_grey']
        c = P(x, y, g)
        R = math.radians(ang)
        k.box(c + UP * 1.3 * U, (6.1 * U, 2.45 * U, 2.6 * U), mat, R)
        for i in range(12):
            o = Matrix.Rotation(R, 3, 'Z') @ Vector((-2.8 * U + i * 0.51 * U, 1.24 * U, 1.3 * U))
            k.box(c + o, (0.08 * U, 0.04 * U, 2.4 * U), mat, R)
    for x, y in INST.PIPES:
        g = gz(x, y)
        c = P(x, y, g)
        for i in range(10):
            p = c + Vector(((i % 5) * 0.45 * U, 0, 0.25 * U + (i // 5) * 0.4 * U))
            k.tube(p - Vector((0, 3 * U, 0)), p + Vector((0, 3 * U, 0)), 0.2 * U, M['red'], seg=8)
    k.done(extras={'kind': 'equipement'})


# ---------------------------------------------------------------- engins

def vehicle(kind, x, y, heading, n):
    g = gz(x, y)
    rot = math.radians(-heading) + math.pi / 2   # cap 0 = vers le haut du plan (+Y)
    R = Matrix.Rotation(rot, 3, 'Z')
    c = Vector((*xy(x, y), g))
    k = Kit(f'engin_{kind}_{n}')
    at = lambda dx, dy, dz: c + R @ Vector((dx * U, dy * U, dz * U))
    box = lambda dx, dy, dz, sx, sy, sz, mat: k.box(at(dx, dy, dz), (sx * U, sy * U, sz * U), mat, rot)

    def wheels(xs, half, r, width=0.7, rim=M['galva']):
        for wx in xs:
            for s in (-1, 1):
                p = at(wx, s * half, r)
                ax = R @ Vector((0, width / 2 * U, 0))
                k.tube(p - ax, p + ax, r * U, M['rubber'], seg=16)
                k.tube(p + ax * s * 0.9, p + ax * s * 1.05, r * 0.55 * U, rim, seg=12)

    def cab(dx, dz, sx, sy, sz, body):
        box(dx, 0, dz, sx, sy, sz * 0.35, body)
        box(dx, 0, dz + sz * 0.55, sx * 0.96, sy * 0.96, sz * 0.5, M['glass'])
        for px in (-1, 1):
            for py in (-1, 1):
                k.beam(at(dx + px * sx * 0.47, py * sy * 0.47, dz + sz * 0.2), at(dx + px * sx * 0.47, py * sy * 0.47, dz + sz * 0.85), 0.1 * U, 0.1 * U, body)
        box(dx, 0, dz + sz * 0.88, sx * 1.04, sy * 1.04, 0.12, body)

    if kind == 'dumper':
        # Tombereau articulé (photos : Volvo jaunes)
        box(3.6, 0, 1.8, 2.2, 2.4, 1.2, M['yellow'])
        box(4.8, 0, 1.6, 0.4, 2.0, 0.9, M['dark'])
        cab(2.8, 2.4, 1.8, 2.2, 2.0, M['yellow'])
        box(1.4, 0, 1.4, 1.0, 1.0, 0.8, M['dark'])
        # Benne à fond relevé à l'arrière
        k.prism([tuple((at(-0.3, -1.6, 0))[:2]), tuple((at(-5.6, -1.6, 0))[:2]), tuple((at(-5.6, 1.6, 0))[:2]), tuple((at(-0.3, 1.6, 0))[:2])],
                g + 1.6 * U, g + 3.6 * U, M['yellow'])
        box(-0.2, 0, 3.3, 0.4, 3.2, 0.8, M['yellow'])
        box(-3.0, 0, 3.5, 4.8, 2.8, 0.3, M['gravel'])
        box(-2.6, 0, 1.2, 5.0, 1.0, 0.5, M['dark'])
        wheels((3.4, -2.0, -4.0), 1.35, 0.85)
    elif kind == 'chargeur':
        box(-1.4, 0, 1.6, 3.0, 2.4, 1.5, M['yellow'])
        box(-3.0, 0, 1.4, 0.6, 2.5, 1.2, M['yellow'])
        for i in range(5):
            box(-1.8 + i * 0.35, 0, 2.38, 0.08, 2.3, 0.06, M['dark'])
        cab(0.6, 1.4, 1.8, 1.9, 2.4, M['yellow'])
        for s in (-1, 1):
            k.beam(at(0.4, s * 0.9, 1.6), at(3.4, s * 0.9, 1.0), 0.3 * U, 0.4 * U, M['yellow'])
        k.beam(at(1.4, 0, 2.2), at(3.2, 0, 1.4), 0.3 * U, 0.3 * U, M['yellow'])
        k.prism([tuple(at(3.2, -1.6, 0)[:2]), tuple(at(4.4, -1.6, 0)[:2]), tuple(at(4.4, 1.6, 0)[:2]), tuple(at(3.2, 1.6, 0)[:2])],
                g + 0.2 * U, g + 1.4 * U, M['galva'])
        wheels((1.5, -1.7), 1.2, 0.85, width=0.75)
    elif kind == 'pelle':
        # Pelle sur chenilles (photos : pelle jaune près des stocks)
        for s in (-1, 1):
            box(0, s * 1.3, 0.5, 4.6, 0.7, 1.0, M['dark'])
            for i in range(6):
                k.tube(at(-1.9 + i * 0.75, s * 1.0, 0.45), at(-1.9 + i * 0.75, s * 1.6, 0.45), 0.35 * U, M['rubber'], seg=10)
        k.cyl(at(0, 0, 1.0), 1.2 * U, 0.4 * U, M['dark'], seg=16)
        box(-0.6, 0, 2.0, 3.6, 2.6, 1.2, M['yellow'])
        box(-2.3, 0, 2.0, 0.6, 2.6, 1.2, M['dark'])
        cab(0.6, 1.4, 1.4, 1.0, 2.2, M['yellow'])
        k.beam(at(0.6, -0.7, 2.4), at(3.6, -0.7, 4.6), 0.5 * U, 0.6 * U, M['yellow'])
        k.beam(at(3.6, -0.7, 4.6), at(5.2, -0.7, 1.4), 0.4 * U, 0.5 * U, M['yellow'])
        box(5.3, -0.7, 0.8, 1.0, 1.2, 1.0, M['galva'])
    elif kind == 'nacelle':
        box(0, 0, 0.6, 3.0, 2.0, 0.8, M['red'] if n % 2 else M['yellow'])
        wheels((1.0, -1.0), 0.95, 0.45)
        k.beam(at(-0.6, 0, 1.0), at(2.5, 0, 9.0), 0.3 * U, 0.3 * U, M['yellow'])
        box(2.7, 0, 9.4, 1.2, 1.6, 1.0, M['galva'])
    else:
        # Camion 8×4 benne des clients
        cab(3.6, 1.2, 2.0, 2.5, 2.4, M['white'])
        box(4.65, 0, 1.3, 0.1, 2.3, 0.8, M['dark'])
        box(4.62, 0, 0.7, 0.2, 2.5, 0.35, M['galva'])
        k.prism([tuple(at(2.3, -1.25, 0)[:2]), tuple(at(-4.2, -1.25, 0)[:2]), tuple(at(-4.2, 1.25, 0)[:2]), tuple(at(2.3, 1.25, 0)[:2])],
                g + 1.4 * U, g + 3.0 * U, M['galva'])
        box(-0.9, 0, 2.95, 6.3, 2.3, 0.1, M['gravel'])
        box(0.0, 0, 0.9, 8.6, 1.0, 0.4, M['dark'])
        wheels((3.6, 2.2, -2.2, -3.6), 1.05, 0.55, width=0.6)
    k.done(extras={'kind': 'engin'})


# ---------------------------------------------------------------- flèches et panneaux posés sur le relief

def bezier(p0, p1, p2, p3, n=14):
    out = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        out.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return out


def parse_path(d):
    toks = re.findall(r'[MLC]|-?\d*\.?\d+', d)
    pts, cmd, i, cur = [], None, 0, None
    while i < len(toks):
        t = toks[i]
        if t in ('M', 'L', 'C'):
            cmd = t
            i += 1
            continue
        if cmd in ('M', 'L'):
            cur = (float(toks[i]), float(toks[i + 1]))
            pts.append(cur)
            i += 2
        else:
            c = [float(v) for v in toks[i:i + 6]]
            pts += bezier(cur, c[0:2], c[2:4], c[4:6])
            cur = (c[4], c[5])
            i += 6
    return pts


def densify(pts, step=3.0):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step))
        out += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(1, n + 1)]
    return out


def ribbon(pts, w, lift, head):
    """Ruban plat qui épouse le relief, terminé par une pointe de flèche"""
    pts2 = [Vector(xy(*p)) for p in pts]
    total = sum((pts2[i + 1] - pts2[i]).length for i in range(len(pts2) - 1))
    head = min(head, total * 0.5)
    while len(pts2) > 2 and (pts2[-1] - pts2[-2]).length < head:
        pts2.pop(-2)
    tip = pts2[-1]
    d_end = (pts2[-1] - pts2[-2]).normalized()
    pts2[-1] = tip - d_end * head
    h = lambda v: gz(v.x / S + W / 2, -v.y / S + H / 2) + lift
    verts, faces = [], []
    for i, p in enumerate(pts2):
        a = pts2[max(i - 1, 0)]
        b = pts2[min(i + 1, len(pts2) - 1)]
        t = (b - a).normalized()
        nrm = Vector((-t.y, t.x))
        for s in (1, -1):
            q = p + nrm * s * w / 2
            verts.append((q.x, q.y, h(q)))
        if i:
            k = 2 * i
            faces.append((k - 2, k - 1, k + 1, k))
    nrm = Vector((-d_end.y, d_end.x))
    k = len(verts)
    for q in (pts2[-1] + nrm * w * 1.3, pts2[-1] - nrm * w * 1.3, tip):
        verts.append((q.x, q.y, h(q)))
    faces.append((k, k + 1, k + 2))
    return verts, faces


def arrows():
    for n, ar in enumerate(DATA['arrows']):
        pts = densify(parse_path(ar['d']))
        v1, f1 = ribbon(pts, 0.95, 0.08, 1.3)
        v2, f2 = ribbon(pts, 0.6, 0.1, 1.1)
        off = len(v1)
        mesh_obj(f'fleche_{n}', v1 + v2, f1 + [tuple(i + off for i in f) for f in f2],
                 [M['dark'], arrow_mat(ar['color'])], [0] * len(f1) + [1] * len(f2), extras={'color': ar['color']})


def no_entry():
    k = Kit('sens_interdits')
    for px, py in DATA['noEntry']:
        x, y = xy(px, py)
        g = gz(px, py)
        k.cyl((x, y, g), 0.05, 1.2, M['galva'], seg=8)
        k.tube((x, y - 0.03, g + 1.35), (x, y - 0.09, g + 1.35), 0.42, M['red'], seg=28)
        k.box((x, y - 0.1, g + 1.35), (0.56, 0.02, 0.13), M['white'])
    k.done()


# ---------------------------------------------------------------- construction

zmin = terrain()
for c in INST.CONVEYORS:
    conveyor(c)
big_silos()
thickeners()
plant_towers()
build_better()
buildings()
hangar()
tremie()
boues()
centrale()
bascule_laveur()
piles()
poplars()
boulders()
masts_and_props()
for n, (kind, x, y, heading) in enumerate(INST.VEHICLES):
    vehicle(kind, x, y, heading, n)
arrows()
no_entry()

# ---------------------------------------------------------------- lumière et rendu

world = bpy.data.worlds.get('Carriere ciel') or bpy.data.worlds.new('Carriere ciel')
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value = hex_rgb('#d4dee5')
bg.inputs['Strength'].default_value = 0.65
scene.world = world

sun_data = bpy.data.lights.new('Soleil', 'SUN')
sun_data.energy = 4.0
sun_data.angle = math.radians(2)
sun = link(bpy.data.objects.new('Soleil', sun_data))
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))

scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 64
try:
    scene.eevee.use_shadows = True
    scene.eevee.use_raytracing = True
except AttributeError:
    pass
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = -0.35

cam_data = bpy.data.cameras.new('Camera')
cam_data.clip_end = 1000
cam = link(bpy.data.objects.new('Camera', cam_data))
scene.camera = cam


def shot(name, loc, target, lens, res, transparent=False):
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_data.lens = lens
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    scene.render.image_settings.quality = 86
    scene.render.filepath = os.path.join(ROOT, 'public', 'renders', name + '.webp')
    bpy.ops.render.render(write_still=True, scene=scene.name)


def shot_plan(name, x, y, offset, lens, res, transparent=False, lift=0.5):
    """Vue rapprochée : cible au point (x, y) du plan, caméra décalée de `offset` (unités Blender)"""
    t = P(x, y, gz(x, y) + lift)
    shot(name, tuple(t + Vector(offset)), tuple(t), lens, res, transparent)


def export_glb():
    bpy.context.view_layer.update()
    for o in scene.objects:
        o.select_set(o.type == 'MESH')
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(ROOT, 'public', 'models', 'carriere.glb'),
        export_format='GLB',
        use_selection=True,
        export_extras=True,
        export_apply=True,
        export_image_format='WEBP',
        export_image_quality=82,
        export_vertex_color='ACTIVE',
        # Compression Draco : le site charge le décodeur depuis public/draco/
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=16,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=14,
        export_cameras=False,
        export_lights=False,
    )


def render_all():
    shot('vue-ensemble', (58, -86, 66), (0, -2, 0), 50, (1800, 1125), transparent=True)
    shot_plan('tremie', 168, 188, (8, -14, 5), 30, (900, 1125), lift=1.2)
    shot_plan('silos', 525, 190, (12, -16, 7), 30, (900, 1125), lift=1.6)
    shot_plan('stocks', 420, 400, (6, -22, 9), 30, (900, 1125), lift=0.6)
    shot_plan('boues', 700, 395, (12, -14, 6), 32, (900, 1125), lift=0.8)
    shot('dessus', (0, 0, 150), (0, 0.001, 0), 50, (1600, 1110))


# CARRIERE_RENDER : 1 (défaut) = rendus + export, export = export seul, 0 = rien (essais)
MODE = os.environ.get('CARRIERE_RENDER', '1')
if MODE == '1':
    render_all()
if MODE in ('1', 'export'):
    export_glb()

result = {'objects': len(col.objects), 'verts': sum(len(o.data.vertices) for o in col.objects if o.type == 'MESH')}
print('MAQUETTE', result)
