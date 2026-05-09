import { useMemo } from "react";
import { Vector3 } from "three";
import { computeAllPotentialHoles } from "./geometry";
import type { ModuleParams } from "./geometry";
import { useModuleStore, type ModuleInstance } from "./store";

// ── Types ────────────────────────────────────────────────────────────────────

export type GlobalMagnetParams = {
  magnetHeightMm:  number;
  magnetMarginMm:  number;
  magnetSpacingMm: number;
  mirrorEnabled:   boolean;
};

export type HoleState = "matched" | "isolated" | "blocked";
/** key = `${moduleId}:${holeKey}` (e.g. "mod-1:north-0") */
export type HoleStates = Map<string, HoleState>;

export type GlobalMagnetStatus = "ok" | "warning" | "error";

export type GlobalMagnetSummary = {
  /** isolated + blocked */
  unmatchedCount: number;
  status: GlobalMagnetStatus;
};

// ── Color maps ───────────────────────────────────────────────────────────────

export const HOLE_STATE_COLOR: Record<HoleState, string> = {
  matched:  "#22c55e", // green-500
  isolated: "#eab308", // yellow-500
  blocked:  "#ef4444", // red-500
};

export const GLOBAL_STATUS_COLOR: Record<GlobalMagnetStatus, string> = {
  ok:      "#22c55e",
  warning: "#eab308",
  error:   "#ef4444",
};

// ── Internal helpers ─────────────────────────────────────────────────────────

const MATCH_TOLERANCE = 0.1; // mm

function toModuleParams(m: ModuleInstance, g: GlobalMagnetParams): ModuleParams {
  return {
    widthMm:         m.widthMm,
    depthMm:         m.depthMm,
    heightMm:        m.heightMm,
    magnetHeightMm:  g.magnetHeightMm,
    magnetMarginMm:  g.magnetMarginMm,
    magnetSpacingMm: g.magnetSpacingMm,
    mirrorEnabled:   g.mirrorEnabled,
    faces:           { north: false, south: false, east: false, west: false },
    templateType:    m.templateType,
    wallThicknessMm: m.wallThicknessMm,
    slotAngleDeg:    m.slotAngleDeg,
    slotWidthMm:     m.slotWidthMm,
  };
}

/**
 * Convert a hole local position (relative to module centre at y=0) to world space.
 * The module group sits at (m.x, 0, m.z) and the body mesh is offset by heightMm/2 in Y,
 * so hole world Y = localPos.y + heightMm/2.
 */
function toWorldPos(m: ModuleInstance, localPos: Vector3): Vector3 {
  return new Vector3(
    m.x + localPos.x,
    localPos.y + m.heightMm / 2,
    m.z + localPos.z,
  );
}

/**
 * Returns true when module B has a face opposite to `normal` from module A
 * that is within MATCH_TOLERANCE of A's face plane AND `worldPos` (the hole
 * center projected laterally) falls within B's face bounds.
 */
function isFaceAdjacentTo(
  worldPos: Vector3,
  normal:   Vector3,
  mA:       ModuleInstance,
  mB:       ModuleInstance,
): boolean {
  const nx = Math.round(normal.x); // ±1 or 0 (normals are axis-aligned)
  const nz = Math.round(normal.z);

  if (nx !== 0) {
    // east (+1) or west (-1) face
    const aFace = mA.x + nx * (mA.widthMm / 2);
    const bFace = mB.x - nx * (mB.widthMm / 2); // opposite face of B
    if (Math.abs(aFace - bFace) > MATCH_TOLERANCE) return false;
    // hole Z must fall within B's Z bounds
    if (worldPos.z < mB.z - mB.depthMm  / 2 - MATCH_TOLERANCE) return false;
    if (worldPos.z > mB.z + mB.depthMm  / 2 + MATCH_TOLERANCE) return false;
  } else {
    // north (+1) or south (-1) face
    const aFace = mA.z + nz * (mA.depthMm / 2);
    const bFace = mB.z - nz * (mB.depthMm / 2);
    if (Math.abs(aFace - bFace) > MATCH_TOLERANCE) return false;
    // hole X must fall within B's X bounds
    if (worldPos.x < mB.x - mB.widthMm / 2 - MATCH_TOLERANCE) return false;
    if (worldPos.x > mB.x + mB.widthMm / 2 + MATCH_TOLERANCE) return false;
  }

  // hole Y must fall within B's height
  if (worldPos.y < -MATCH_TOLERANCE)              return false;
  if (worldPos.y > mB.heightMm + MATCH_TOLERANCE) return false;

  return true;
}

// ── Core functions ───────────────────────────────────────────────────────────

export function computeHoleStates(
  modules: ModuleInstance[],
  global:  GlobalMagnetParams,
): HoleStates {
  type Entry = {
    moduleId:  string;
    holeKey:   string;
    worldPos:  Vector3;
    normal:    Vector3;
    moduleRef: ModuleInstance;
  };

  // Build world-space entries for every active hole
  const allHoles: Entry[] = [];
  for (const m of modules) {
    const params = toModuleParams(m, global);
    for (const h of computeAllPotentialHoles(params)) {
      if (!m.activeHoles.includes(h.key)) continue;
      allHoles.push({
        moduleId:  m.id,
        holeKey:   h.key,
        worldPos:  toWorldPos(m, h.position),
        normal:    h.normal,
        moduleRef: m,
      });
    }
  }

  // Index active world holes by moduleId for fast matching lookup
  const holesByModule = new Map<string, Entry[]>();
  for (const m of modules) holesByModule.set(m.id, []);
  for (const h of allHoles)  holesByModule.get(h.moduleId)!.push(h);

  const states = new Map<string, HoleState>();

  for (const ha of allHoles) {
    const stateKey = `${ha.moduleId}:${ha.holeKey}`;
    let state: HoleState = "isolated";

    for (const mb of modules) {
      if (mb.id === ha.moduleId) continue;
      if (!isFaceAdjacentTo(ha.worldPos, ha.normal, ha.moduleRef, mb)) continue;

      // B is adjacent — look for a hole in B that matches position and has opposite normal
      const matched = holesByModule.get(mb.id)!.some(
        hb =>
          ha.worldPos.distanceTo(hb.worldPos) <= MATCH_TOLERANCE &&
          ha.normal.dot(hb.normal) <= -0.9,
      );

      if (matched) {
        state = "matched";
        break; // matched wins — no need to check other modules
      }
      // Adjacent but no matching hole → blocked; keep checking other modules
      // in case a different module provides a match
      state = "blocked";
    }

    states.set(stateKey, state);
  }

  return states;
}

export function summarizeMagnets(states: HoleStates): GlobalMagnetSummary {
  let isolated = 0;
  let blocked  = 0;
  for (const s of states.values()) {
    if      (s === "isolated") isolated++;
    else if (s === "blocked")  blocked++;
  }
  const unmatchedCount = isolated + blocked;
  const status: GlobalMagnetStatus =
    unmatchedCount === 0 ? "ok"
    : blocked > 0        ? "error"
    :                      "warning";
  return { unmatchedCount, status };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMagnetMatching() {
  const modules         = useModuleStore(s => s.modules);
  const magnetHeightMm  = useModuleStore(s => s.magnetHeightMm);
  const magnetMarginMm  = useModuleStore(s => s.magnetMarginMm);
  const magnetSpacingMm = useModuleStore(s => s.magnetSpacingMm);
  const mirrorEnabled   = useModuleStore(s => s.mirrorEnabled);

  return useMemo(() => {
    const global: GlobalMagnetParams = {
      magnetHeightMm,
      magnetMarginMm,
      magnetSpacingMm,
      mirrorEnabled,
    };
    const states  = computeHoleStates(modules, global);
    const summary = summarizeMagnets(states);
    return { states, summary };
  }, [modules, magnetHeightMm, magnetMarginMm, magnetSpacingMm, mirrorEnabled]);
}
