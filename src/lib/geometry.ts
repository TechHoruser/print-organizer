import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { CSG } from "three-csg-ts";
import type { LateralFace, ModuleInstance, TemplateType } from "./store";

export const MAGNET_DIAMETER_MM = 8.2;
export const MAGNET_DEPTH_MM = 3.1;
export const MAGNET_RADIUS_MM = MAGNET_DIAMETER_MM / 2;

const CSG_OVERSHOOT_MM = 0.5;
const MIN_MARGIN_MM = 10;

export type ModuleParams = {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  magnetHeightMm: number;
  magnetMarginMm: number;
  magnetSpacingMm: number;
  mirrorEnabled: boolean;
  faces: Record<LateralFace, boolean>;
  templateType: TemplateType;
  wallThicknessMm: number;
  slotAngleDeg: number;
  slotWidthMm: number;
};

export type MagnetHole = { position: Vector3; normal: Vector3 };
export type LabeledHole = MagnetHole & { key: string; face: LateralFace; faceIdx: number };

type FaceDef = {
  normal: Vector3;
  halfDim: number;
  lengthAxis: Vector3;
  faceLength: number;
};

function faceConfigs(w: number, d: number): Record<LateralFace, FaceDef> {
  return {
    north: { normal: new Vector3(0, 0, 1),  halfDim: d / 2, lengthAxis: new Vector3(1, 0, 0), faceLength: w },
    south: { normal: new Vector3(0, 0, -1), halfDim: d / 2, lengthAxis: new Vector3(1, 0, 0), faceLength: w },
    east:  { normal: new Vector3(1, 0, 0),  halfDim: w / 2, lengthAxis: new Vector3(0, 0, 1), faceLength: d },
    west:  { normal: new Vector3(-1, 0, 0), halfDim: w / 2, lengthAxis: new Vector3(0, 0, 1), faceLength: d },
  };
}

export function magnetCount(
  faceLength: number,
  mirror: boolean,
  spacingMm: number,
  marginMm: number,
): number {
  const margin = Math.max(MIN_MARGIN_MM, marginMm);
  if (mirror) {
    const available = faceLength - 2 * margin - 2 * MAGNET_RADIUS_MM;
    if (available < 0) return 0;
    return 1 + Math.floor(available / spacingMm);
  }
  return faceLength / 2 >= margin + MAGNET_RADIUS_MM ? 1 : 0;
}

export function computeMagnetHoles(p: ModuleParams): MagnetHole[] {
  const margin = Math.max(MIN_MARGIN_MM, p.magnetMarginMm);
  const yc = p.magnetHeightMm - p.heightMm / 2;
  const cfg = faceConfigs(p.widthMm, p.depthMm);
  const holes: MagnetHole[] = [];

  (Object.keys(cfg) as LateralFace[]).forEach((key) => {
    if (!p.faces[key]) return;
    const { normal, halfDim, lengthAxis, faceLength } = cfg[key];

    const n = magnetCount(faceLength, p.mirrorEnabled, p.magnetSpacingMm, margin);
    if (n === 0) return;

    const offsets = p.mirrorEnabled
      ? Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * p.magnetSpacingMm)
      : [0];

    const sinkAlongNormal = halfDim + (CSG_OVERSHOOT_MM - MAGNET_DEPTH_MM) / 2;

    for (const off of offsets) {
      const position = new Vector3(0, yc, 0)
        .addScaledVector(normal, sinkAlongNormal)
        .addScaledVector(lengthAxis, off);
      holes.push({ position, normal: normal.clone() });
    }
  });

  return holes;
}

/**
 * Returns ALL potential magnet holes for every face, regardless of p.faces.
 * Each hole is labeled with `key = "${face}-${faceIdx}"`.
 */
export function computeAllPotentialHoles(p: ModuleParams): LabeledHole[] {
  const margin = Math.max(MIN_MARGIN_MM, p.magnetMarginMm);
  const yc = p.magnetHeightMm - p.heightMm / 2;
  const cfg = faceConfigs(p.widthMm, p.depthMm);
  const holes: LabeledHole[] = [];

  (Object.keys(cfg) as LateralFace[]).forEach((face) => {
    const { normal, halfDim, lengthAxis, faceLength } = cfg[face];

    const n = magnetCount(faceLength, p.mirrorEnabled, p.magnetSpacingMm, margin);
    if (n === 0) return;

    const offsets = p.mirrorEnabled
      ? Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * p.magnetSpacingMm)
      : [0];

    const sinkAlongNormal = halfDim + (CSG_OVERSHOOT_MM - MAGNET_DEPTH_MM) / 2;

    offsets.forEach((off, faceIdx) => {
      const position = new Vector3(0, yc, 0)
        .addScaledVector(normal, sinkAlongNormal)
        .addScaledVector(lengthAxis, off);
      holes.push({
        position,
        normal: normal.clone(),
        key: `${face}-${faceIdx}`,
        face,
        faceIdx,
      });
    });
  });

  return holes;
}

// ── Template shape helpers ─────────────────────────────────────────────────

/**
 * Front groove for flat stands: carves a ledge at the bottom of the north (+Z) face
 * where the device bottom edge rests.
 */
function makeGrooveMesh(p: ModuleParams, mat: MeshStandardMaterial): Mesh {
  const grooveH = Math.min(14, p.heightMm * 0.18);
  const grooveD = Math.min(10, p.depthMm * 0.12);

  const mesh = new Mesh(
    new BoxGeometry(
      p.widthMm + 2 * CSG_OVERSHOOT_MM,
      grooveH,
      grooveD + CSG_OVERSHOOT_MM,
    ),
    mat,
  );
  mesh.position.set(
    0,
    -p.heightMm / 2 + grooveH / 2,
    p.depthMm / 2 - grooveD / 2 + CSG_OVERSHOOT_MM / 2,
  );
  mesh.updateMatrix();
  return mesh;
}

/**
 * Diagonal slot for tilted stands.
 * Opens through the top face; slotAngleDeg tilts the device toward north (+Z).
 */
function makeTiltedSlotMesh(p: ModuleParams, mat: MeshStandardMaterial): Mesh {
  const tiltRad = (p.slotAngleDeg * Math.PI) / 180;
  const slotLength = p.heightMm * 0.85;

  const mesh = new Mesh(
    new BoxGeometry(
      p.widthMm + 2 * CSG_OVERSHOOT_MM,
      slotLength,
      p.slotWidthMm,
    ),
    mat,
  );
  mesh.rotation.x = tiltRad;

  // Place slot so its top end exits through the stand's top face
  const topY = p.heightMm / 2 + CSG_OVERSHOOT_MM;
  const centerY = topY - (Math.cos(tiltRad) * slotLength) / 2;
  mesh.position.set(0, centerY, 0);
  mesh.updateMatrix();
  return mesh;
}

/**
 * Inner void for hollow templates: open top, solid floor, solid walls.
 * Returns null when walls are too thin to carve.
 */
function makeInnerVoidMesh(
  p: ModuleParams,
  mat: MeshStandardMaterial,
): Mesh | null {
  const wall = Math.max(2, p.wallThicknessMm);
  const innerW = p.widthMm - 2 * wall;
  const innerD = p.depthMm - 2 * wall;
  const innerH = p.heightMm - wall + CSG_OVERSHOOT_MM;

  if (innerW < 4 || innerD < 4 || innerH < 4) return null;

  const mesh = new Mesh(new BoxGeometry(innerW, innerH, innerD), mat);
  // Bottom of void sits at (-heightMm/2 + wall); top exits past top face
  mesh.position.set(0, (wall + CSG_OVERSHOOT_MM) / 2, 0);
  mesh.updateMatrix();
  return mesh;
}

// ── Main geometry builder ──────────────────────────────────────────────────

export function buildModuleGeometry(
  p: ModuleParams,
  activeHoleKeys?: string[],
): BufferGeometry {
  const mat = new MeshStandardMaterial();

  // Collect all meshes to subtract before starting any CSG
  // so we can short-circuit if there's nothing to subtract
  const toSubtract: (Mesh | null)[] = [];

  // 1. Template shape
  switch (p.templateType) {
    case "tablet_stand":
    case "phone_stand":
      toSubtract.push(makeGrooveMesh(p, mat));
      break;
    case "phone_stand_tilted":
      toSubtract.push(makeTiltedSlotMesh(p, mat));
      break;
    case "stackable_box":
    case "postit_box":
    case "pen_box":
    case "pen_holder":
      toSubtract.push(makeInnerVoidMesh(p, mat));
      break;
    default:
      break;
  }

  // 2. Magnet holes — use activeHoleKeys if supplied, else fall back to legacy faces filter
  const holes = activeHoleKeys !== undefined
    ? computeAllPotentialHoles(p).filter(h => activeHoleKeys.includes(h.key))
    : computeMagnetHoles(p);
  const yAxis = new Vector3(0, 1, 0);
  const cylTotalLength = MAGNET_DEPTH_MM + CSG_OVERSHOOT_MM;

  for (const hole of holes) {
    const cylGeom = new CylinderGeometry(MAGNET_RADIUS_MM, MAGNET_RADIUS_MM, cylTotalLength, 32);
    const cylMesh = new Mesh(cylGeom, mat);
    cylMesh.position.copy(hole.position);
    cylMesh.quaternion.setFromUnitVectors(yAxis, hole.normal);
    cylMesh.updateMatrix();
    toSubtract.push(cylMesh);
  }

  const validSubtracts = toSubtract.filter((m): m is Mesh => m !== null);

  // Short-circuit: no CSG needed → return plain BoxGeometry
  if (validSubtracts.length === 0) {
    mat.dispose();
    return new BoxGeometry(p.widthMm, p.heightMm, p.depthMm);
  }

  // Run CSG
  const baseMesh = new Mesh(
    new BoxGeometry(p.widthMm, p.heightMm, p.depthMm),
    mat,
  );
  baseMesh.updateMatrix();

  let csg = CSG.fromMesh(baseMesh);

  for (const m of validSubtracts) {
    csg = csg.subtract(CSG.fromMesh(m));
    m.geometry.dispose();
  }

  baseMesh.geometry.dispose();
  const result = CSG.toMesh(csg, baseMesh.matrix, mat);
  return result.geometry;
}

// ── Collision detection ────────────────────────────────────────────────────

export type CollisionPair = { aId: string; bId: string };

export type CollisionInfo = {
  pairs: CollisionPair[];
  idsInCollision: Set<string>;
};

// Same tolerance used by buildEdges in store.ts to detect adjacency.
// Not a physical safety margin: it absorbs floating-point drift after
// repositioning (BFS, drags) so tangential faces are not mistakenly
// reported as overlapping.
const COLLISION_EPS_MM = 1.5;

export function detectCollisions(modules: ModuleInstance[]): CollisionInfo {
  const pairs: CollisionPair[] = [];
  const idsInCollision = new Set<string>();

  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const a = modules[i];
      const b = modules[j];

      const aE = a.x + a.widthMm / 2, aW = a.x - a.widthMm / 2;
      const aN = a.z + a.depthMm / 2, aS = a.z - a.depthMm / 2;
      const bE = b.x + b.widthMm / 2, bW = b.x - b.widthMm / 2;
      const bN = b.z + b.depthMm / 2, bS = b.z - b.depthMm / 2;

      const overlapX = Math.min(aE, bE) - Math.max(aW, bW);
      const overlapZ = Math.min(aN, bN) - Math.max(aS, bS);
      const overlapY = Math.min(a.heightMm, b.heightMm); // both sit at y=0

      if (
        overlapX > COLLISION_EPS_MM &&
        overlapZ > COLLISION_EPS_MM &&
        overlapY > COLLISION_EPS_MM
      ) {
        pairs.push({ aId: a.id, bId: b.id });
        idsInCollision.add(a.id);
        idsInCollision.add(b.id);
      }
    }
  }

  return { pairs, idsInCollision };
}

