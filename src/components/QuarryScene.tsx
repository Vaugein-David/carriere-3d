'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { AnnotationArea, PlanData, Route } from '../types';
import { pairs, type Point } from '../lib/geometry';
import { samplePath } from '../lib/svgPath';
import type { PlanFix } from '../lib/geo';
import { AREA } from './AnnotationLayer';
import { useT, type Txt } from '../i18n';
import { withBase } from '../lib/base';

/** 1 unité 3D = 10 px du repère du plan (même échelle que scripts/blender/build_carriere.py) */
const S = 0.1;
// Index spatial (BVH) : les lancers de rayons qui posent étiquettes et tracés deviennent quasi instantanés
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree as unknown as THREE.BufferGeometry['computeBoundsTree'];
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/** Décodeur Draco servi par le site (copié de three/examples/jsm/libs/draco/gltf), sans CDN */
const DRACO = withBase('/draco/');

export interface CameraView {
  pos: [number, number, number];
  target: [number, number, number];
}

export const VIEW_OVERVIEW: CameraView = { pos: [40, 46, 62], target: [0, 0, 3] };
export const VIEW_TOP: CameraView = { pos: [0, 118, 0.01], target: [0, 0, 0] };

export function planTo3d(data: PlanData, [x, y]: Point, h = 0): [number, number, number] {
  return [(x - data.width / 2) * S, h, (y - data.height / 2) * S];
}

/** Vue rapprochée sur un point du plan */
export function viewOn(data: PlanData, p: Point): CameraView {
  const [x, , z] = planTo3d(data, p);
  return { pos: [x + 16, 20, z + 26], target: [x, 1, z] };
}

export function areaCenter(a: AnnotationArea): Point {
  if (a.labelAt) return a.labelAt;
  const pts: Point[] = 'rect' in a ? [[a.rect[0], a.rect[1]], [a.rect[0] + a.rect[2], a.rect[1] + a.rect[3]]] : pairs(a.polygon);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

const BUILDING_KINDS = new Set(['building', 'plant', 'tremie']);
/** Objets ignorés pour poser les étiquettes (on vise le sol, les stocks et les bâtiments) */
const LABEL_SKIP = /^(Socle|fleche|sens_interdits|engin|convoyeur|arbres)/;
const NO_SHADOW = /^(Socle|fleche)/;

/** Altitude de la maquette en un point (x, z) de la scène */
export interface Relief {
  /** Dessus du sol, des stocks et des bâtiments (étiquettes) */
  top: (x: number, z: number) => number;
  /** Sol seul : relief réel du MNS (itinéraires, point GPS) */
  ground: (x: number, z: number) => number;
}

// ---------------------------------------------------------------- maquette

function Model({ url, target, onRelief }: { url: string; target: string | null; onRelief: (r: Relief) => void }) {
  const { scene } = useGLTF(url, DRACO);
  const gl = useThree((s) => s.gl);

  // Tas de granulats (objets pile_*) : un matériau propre à chacun pour pouvoir l'allumer seul
  const piles = useMemo(() => {
    const map = new Map<string, THREE.MeshStandardMaterial>();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = mesh.name || mesh.parent?.name || '';
      mesh.castShadow = !NO_SHADOW.test(name);
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.anisotropy = gl.capabilities.getMaxAnisotropy();
      if (name.startsWith('pile_') && mesh.userData.areaId) {
        const own = mat.clone();
        mesh.material = own;
        map.set(String(mesh.userData.areaId), own);
      }
    });
    return map;
  }, [scene, gl]);

  const lit = useRef<THREE.MeshStandardMaterial | null>(null);
  useFrame(({ clock }) => {
    const mat = target ? piles.get(target) : undefined;
    if (lit.current && lit.current !== mat) {
      lit.current.emissive.setRGB(0, 0, 0);
      lit.current.emissiveIntensity = 0;
    }
    lit.current = mat ?? null;
    if (mat) {
      mat.emissive.set('#ff3b1f');
      mat.emissiveIntensity = 0.3 + 0.25 * Math.sin(clock.elapsedTime * 4);
    }
  });

  // Relief : lancer de rayons vers le bas sur la maquette chargée
  useEffect(() => {
    scene.updateMatrixWorld(true);
    const solids: THREE.Object3D[] = [];
    const ground: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const name = o.name || o.parent?.name || '';
      if (name.startsWith('Sol')) ground.push(o);
      if (!LABEL_SKIP.test(name)) solids.push(o);
    });
    for (const o of new Set([...solids, ...ground])) {
      const geo = (o as THREE.Mesh).geometry;
      if (!geo.boundsTree) geo.computeBoundsTree();
    }
    const ray = new THREE.Raycaster();
    ray.firstHitOnly = true;
    const down = new THREE.Vector3(0, -1, 0);
    const from = new THREE.Vector3();
    const cast = (objs: THREE.Object3D[]) => (x: number, z: number) => {
      ray.set(from.set(x, 80, z), down);
      return ray.intersectObjects(objs, false)[0]?.point.y ?? 0;
    };
    onRelief({ top: cast(solids), ground: cast(ground) });
  }, [scene, onRelief]);

  return <primitive object={scene} />;
}

// ---------------------------------------------------------------- itinéraire

function RouteTube({ data, route, ground }: { data: PlanData; route: Route; ground: Relief['ground'] }) {
  const { curve, geometry } = useMemo(() => {
    const pts = samplePath(route.d, 4).map((p) => {
      const [x, , z] = planTo3d(data, p);
      return new THREE.Vector3(x, ground(x, z) + 0.45, z);
    });
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    return { curve: c, geometry: new THREE.TubeGeometry(c, Math.max(80, pts.length * 3), 0.32, 10, false) };
  }, [data, route.d, ground]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const dot = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!dot.current) return;
    t.current = (t.current + (dt * 9) / curve.getLength()) % 1;
    dot.current.position.copy(curve.getPointAt(t.current));
  });

  const end = curve.getPointAt(1);
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={route.color} emissive={route.color} emissiveIntensity={0.45} roughness={0.4} />
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[0.75, 24, 24]} />
        <meshStandardMaterial color="#ffffff" emissive={route.color} emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[end.x, end.y + 1.6, end.z]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.7, 1.8, 24]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- stock choisi

/** Contour lumineux du stock choisi, posé sur le relief, et colonne de repère au-dessus */
function TargetOutline({ data, areaId, relief }: { data: PlanData; areaId: string; relief: Relief }) {
  const area = data.annotations?.areas.find((a) => a.id === areaId);
  const geo = useMemo(() => {
    if (!area) return null;
    const corners: Point[] =
      'rect' in area
        ? [
            [area.rect[0], area.rect[1]],
            [area.rect[0] + area.rect[2], area.rect[1]],
            [area.rect[0] + area.rect[2], area.rect[1] + area.rect[3]],
            [area.rect[0], area.rect[1] + area.rect[3]],
          ]
        : pairs(area.polygon);
    const pts: THREE.Vector3[] = [];
    corners.forEach((a, i) => {
      const b = corners[(i + 1) % corners.length]!;
      const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
      for (let k = 0; k < n; k++) {
        const [x, , z] = planTo3d(data, [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
        pts.push(new THREE.Vector3(x, relief.ground(x, z) + 0.3, z));
      }
    });
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), pts.length * 2, 0.22, 8, true);
    const [cx, , cz] = planTo3d(data, areaCenter(area));
    return { tube, center: new THREE.Vector3(cx, relief.top(cx, cz), cz) };
  }, [area, data, relief]);
  useEffect(() => () => geo?.tube.dispose(), [geo]);

  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const k = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4);
    if (mat.current) mat.current.emissiveIntensity = 0.6 + 0.9 * k;
    if (beam.current) beam.current.opacity = 0.18 + 0.2 * k;
  });

  if (!geo) return null;
  return (
    <group>
      <mesh geometry={geo.tube}>
        <meshStandardMaterial ref={mat} color="#ff3b1f" emissive="#ff3b1f" />
      </mesh>
      <mesh position={[geo.center.x, geo.center.y + 4, geo.center.z]}>
        <cylinderGeometry args={[0.35, 0.35, 8, 16, 1, true]} />
        <meshBasicMaterial ref={beam} color="#ffd400" transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- caméra

function Rig({
  view,
  controls,
  onUserMove,
}: {
  view: CameraView;
  controls: RefObject<OrbitControlsImpl | null>;
  onUserMove?: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const left = useRef(0);
  const goal = useMemo(() => {
    const target = new THREE.Vector3(...view.target);
    // Écran en hauteur (téléphone) : on recule pour garder la cour entière dans le cadre
    const back = Math.min(2.2, Math.max(1, 1.3 / aspect));
    const pos = new THREE.Vector3(...view.pos).sub(target).multiplyScalar(back).add(target);
    return { pos, target };
  }, [view, aspect]);

  useEffect(() => {
    left.current = 1.6;
    const c = controls.current;
    // L'utilisateur reprend la main : on arrête l'animation (et le suivi GPS)
    const stop = () => {
      left.current = 0;
      onUserMove?.();
    };
    c?.addEventListener('start', stop);
    return () => c?.removeEventListener('start', stop);
  }, [goal, controls, onUserMove]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (left.current <= 0 || !c) return;
    left.current -= dt;
    const k = 1 - Math.pow(0.004, dt);
    camera.position.lerp(goal.pos, k);
    c.target.lerp(goal.target, k);
    c.update();
  });
  return null;
}

// ---------------------------------------------------------------- position GPS

/** Point bleu « vous êtes ici » sur la maquette, qui glisse d'une position à la suivante */
function GpsMarker({ data, fix, ground }: { data: PlanData; fix: PlanFix; ground: Relief['ground'] }) {
  const group = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const goal = useMemo(() => {
    const [x, , z] = planTo3d(data, [fix.x, fix.y]);
    return new THREE.Vector3(x, ground(x, z) + 0.35, z);
  }, [data, fix.x, fix.y, ground]);
  const placed = useRef(false);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    if (!placed.current) {
      g.position.copy(goal);
      placed.current = true;
    } else {
      g.position.lerp(goal, 1 - Math.pow(0.02, dt));
    }
    if (arrow.current && fix.heading !== null) {
      // 0° = haut du plan = -z ; sens horaire vu de dessus
      arrow.current.rotation.y = THREE.MathUtils.lerp(arrow.current.rotation.y, (-fix.heading * Math.PI) / 180, 0.2);
    }
    if (pulse.current) {
      const k = (clock.elapsedTime % 2) / 2;
      pulse.current.scale.setScalar(1 + k * 3);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
    }
  });

  const accuracy = Math.max(fix.accuracy * S, 1);
  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[accuracy, 48]} />
        <meshBasicMaterial color="#1a73e8" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.7, 0.95, 40]} />
        <meshBasicMaterial color="#1a73e8" transparent depthWrite={false} />
      </mesh>
      {fix.heading !== null && (
        <group ref={arrow}>
          <mesh position={[0, 0.6, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.6, 1.3, 3]} />
            <meshStandardMaterial color="#1a73e8" emissive="#1a73e8" emissiveIntensity={0.4} />
          </mesh>
        </group>
      )}
      <mesh position={[0, 0.7, 0]} castShadow>
        <sphereGeometry args={[0.75, 24, 24]} />
        <meshStandardMaterial color="#1a73e8" emissive="#1a73e8" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.95, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- scène

export interface SceneLabel {
  id: string;
  text: string;
  at: Point;
  building: boolean;
  color: string;
  /** Produit dont l'itinéraire s'affiche quand on touche l'étiquette */
  product?: string;
}

interface Props {
  data: PlanData;
  url: string;
  view: CameraView;
  routes: Route[];
  targetArea: string | null;
  showLabels: boolean;
  loadingLabel: string;
  onPickProduct: (id: string) => void;
  /** Position GPS de l'appareil */
  position?: PlanFix | null;
  /** L'utilisateur a tourné ou déplacé la vue */
  onUserMove?: () => void;
}

/** Étiquettes : construites à partir des annotations du plan (déjà traduites) */
export function useSceneLabels(data: PlanData): SceneLabel[] {
  const t = useT();
  return useMemo(() => {
    const byArea = new Map<string, string>();
    data.products?.forEach((g) => g.products.forEach((p) => byArea.has(p.area) || byArea.set(p.area, p.id)));
    return (data.annotations?.areas ?? [])
      .filter((a) => a.label && a.kind !== 'wait' && a.kind !== 'parking')
      .map((a, i) => ({
        id: a.id ?? `zone-${i}`,
        text: t(a.label as Txt).replace(/\n/g, ' '),
        at: areaCenter(a),
        building: BUILDING_KINDS.has(a.kind),
        color: AREA[a.kind],
        product: a.id ? byArea.get(a.id) : undefined,
      }));
  }, [data, t]);
}

/**
 * Étiquettes en HTML ordinaire, posées au-dessus du canvas : leur position à l'écran
 * est recalculée à chaque image (plus léger qu'une racine React par étiquette).
 */
function LabelProjector({
  points,
  els,
}: {
  points: RefObject<THREE.Vector3[]>;
  els: RefObject<(HTMLElement | null)[]>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    points.current.forEach((p, i) => {
      const el = els.current[i];
      if (!el) return;
      v.copy(p).project(camera);
      if (v.z > 1) {
        el.style.visibility = 'hidden';
        return;
      }
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      const scale = Math.min(1.25, Math.max(0.6, 62 / camera.position.distanceTo(p)));
      el.style.visibility = '';
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      el.style.zIndex = String(Math.round((1 - v.z) * 10000));
    });
  });
  return null;
}

function SceneLoader({ label }: { label: string }) {
  const { progress, active } = useProgress();
  if (!active && progress === 100) return null;
  return (
    <div className="scene-loading" role="status">
      {label}
      <span style={{ '--p': `${progress}%` } as CSSProperties} />
    </div>
  );
}

export function QuarryScene({
  data,
  url,
  view,
  routes,
  targetArea,
  showLabels,
  loadingLabel,
  onPickProduct,
  position = null,
  onUserMove,
}: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  const labels = useSceneLabels(data);
  const els = useRef<(HTMLElement | null)[]>([]);
  const points = useRef<THREE.Vector3[]>([]);
  const [ready, setReady] = useState(false);

  // Relief de la maquette, connu une fois le modèle chargé
  const [relief, setRelief] = useState<Relief | null>(null);
  const onRelief = useCallback((r: Relief) => setRelief(r), []);

  // Position 3D de chaque étiquette, posée sur le sommet du stock ou du bâtiment
  useEffect(() => {
    if (!relief) return;
    points.current = labels.map((l) => {
      const [x, , z] = planTo3d(data, l.at);
      return new THREE.Vector3(x, relief.top(x, z) + 0.3, z);
    });
    setReady(true);
  }, [data, labels, relief]);

  return (
    <div className="scene">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: VIEW_OVERVIEW.pos, fov: 35, near: 0.5, far: 800 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.AgXToneMapping;
          gl.toneMappingExposure = 0.9;
        }}
      >
        <hemisphereLight args={['#ffffff', '#8f8a7e', 0.9]} />
        <directionalLight
          position={[-45, 80, 40]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
          shadow-normalBias={0.04}
          shadow-camera-left={-66}
          shadow-camera-right={66}
          shadow-camera-top={56}
          shadow-camera-bottom={-56}
          shadow-camera-far={260}
        />
        <Suspense fallback={null}>
          <Model url={url} target={targetArea} onRelief={onRelief} />
          {relief && (
            <>
              {routes.map((r) => (
                <RouteTube key={r.id} data={data} route={r} ground={relief.ground} />
              ))}
              {targetArea && <TargetOutline key={targetArea} data={data} areaId={targetArea} relief={relief} />}
              {position && !position.outside && <GpsMarker data={data} fix={position} ground={relief.ground} />}
            </>
          )}
        </Suspense>
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={8}
          maxDistance={190}
          maxPolarAngle={Math.PI * 0.47}
          screenSpacePanning={false}
        />
        <Rig view={view} controls={controls} onUserMove={onUserMove} />
        <LabelProjector points={points} els={els} />
      </Canvas>

      {showLabels && ready && (
        <div className="scene-labels">
          {labels.map((l, i) => {
            const cls = `label3d${l.building ? ' label3d--building' : ''}${l.id === targetArea ? ' is-target' : ''}`;
            const ref = (el: HTMLElement | null) => {
              els.current[i] = el;
            };
            const style = { '--dot': l.color } as CSSProperties;
            return l.product ? (
              <button key={l.id} ref={ref} type="button" className={cls} style={style} onClick={() => onPickProduct(l.product!)}>
                <i aria-hidden="true" />
                {l.text}
              </button>
            ) : (
              <span key={l.id} ref={ref} className={cls} style={style}>
                {!l.building && <i aria-hidden="true" />}
                {l.text}
              </span>
            );
          })}
        </div>
      )}
      <SceneLoader label={loadingLabel} />
    </div>
  );
}

useGLTF.preload(withBase('/models/carriere.glb'), DRACO);
