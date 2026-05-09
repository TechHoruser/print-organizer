import { create } from "zustand";
import { computeAllPotentialHoles, type ModuleParams } from "./geometry";

export type LateralFace = "north" | "south" | "east" | "west";

export type TemplateType =
  | "base"
  | "tablet_stand"
  | "phone_stand"
  | "phone_stand_tilted"
  | "stackable_box"
  | "postit_box"
  | "pen_box"
  | "pen_holder";

export type TemplatePreset = {
  type: TemplateType;
  label: string;
  description: string;
  defaults: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
    wallThicknessMm?: number;
  };
};

export const TEMPLATES: TemplatePreset[] = [
  {
    type: "base",
    label: "Base",
    description: "Bloque sólido",
    defaults: { widthMm: 120, depthMm: 80, heightMm: 50 },
  },
  {
    type: "tablet_stand",
    label: "Soporte tablet",
    description: "Ranura frontal para tablet",
    defaults: { widthMm: 200, depthMm: 100, heightMm: 80 },
  },
  {
    type: "phone_stand",
    label: "Soporte móvil",
    description: "Ranura frontal para smartphone",
    defaults: { widthMm: 90, depthMm: 80, heightMm: 70 },
  },
  {
    type: "phone_stand_tilted",
    label: "Soporte inclinado",
    description: "Ranura diagonal, ángulo fijo",
    defaults: { widthMm: 90, depthMm: 80, heightMm: 80 },
  },
  {
    type: "stackable_box",
    label: "Caja apilable",
    description: "Caja hueca apilable",
    defaults: { widthMm: 120, depthMm: 80, heightMm: 50, wallThicknessMm: 3 },
  },
  {
    type: "postit_box",
    label: "Caja post-its",
    description: "Bandeja para taco de notas",
    defaults: { widthMm: 100, depthMm: 100, heightMm: 35, wallThicknessMm: 3 },
  },
  {
    type: "pen_box",
    label: "Caja bolis",
    description: "Caja horizontal para bolígrafos",
    defaults: { widthMm: 200, depthMm: 80, heightMm: 40, wallThicknessMm: 3 },
  },
  {
    type: "pen_holder",
    label: "Porta bolis",
    description: "Soporte vertical para bolígrafos",
    defaults: { widthMm: 80, depthMm: 80, heightMm: 120, wallThicknessMm: 4 },
  },
];

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

let _uid = 1;
function newId() { return `mod-${_uid++}`; }

export type ModuleInstance = {
  id: string;
  x: number;   // world-space centre X (mm)
  z: number;   // world-space centre Z (mm)
  widthMm: number;
  depthMm: number;
  heightMm: number;
  templateType: TemplateType;
  wallThicknessMm: number;
  slotAngleDeg: number;
  slotWidthMm: number;
  /** Keys of magnet holes that are drilled (e.g. "north-0", "south-1") */
  activeHoles: string[];
};

function createModule(
  template: TemplatePreset,
  x = 0,
  z = 0,
  id?: string,
): ModuleInstance {
  return {
    id: id ?? newId(),
    x,
    z,
    widthMm:         template.defaults.widthMm,
    depthMm:         template.defaults.depthMm,
    heightMm:        template.defaults.heightMm,
    templateType:    template.type,
    wallThicknessMm: template.defaults.wallThicknessMm ?? 3,
    slotAngleDeg:    15,
    slotWidthMm:     12,
    activeHoles:     [],
  };
}

export type ModuleState = {
  // ── Global magnet params (shared so every face stays compatible) ─────────
  magnetHeightMm:  number;
  magnetMarginMm:  number;
  magnetSpacingMm: number;
  mirrorEnabled:   boolean;

  // ── Module instances ──────────────────────────────────────────────────────
  modules: ModuleInstance[];
  selectedModuleId: string | null;

  /** Null = none, string = last join result message */
  joinStatus: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  /** Add a free-standing module; auto-placed to the east of existing ones */
  addModule: (template: TemplatePreset) => void;
  /** Add a new module snapped to a specific face of an existing module */
  addConnectedModule: (sourceId: string, face: LateralFace, template: TemplatePreset) => void;
  removeModule: (id: string) => void;
  selectModule: (id: string | null) => void;
  updateModule: (id: string, patch: Partial<Omit<ModuleInstance, "id">>) => void;
  applyTemplateToModule: (id: string, preset: TemplatePreset) => void;
  moveModule: (id: string, x: number, z: number) => void;
  /** Toggle a single magnet hole on/off */
  toggleHole: (moduleId: string, holeKey: string) => void;
  /** Spread touching modules 20 mm apart for inspection */
  separate: () => void;
  /** Snap touching modules back to zero gap, verify shared holes */
  join: () => void;
  clearJoinStatus: () => void;

  setMagnetHeight:  (v: number) => void;
  setMagnetMargin:  (v: number) => void;
  setMagnetSpacing: (v: number) => void;
  setMirrorEnabled: (v: boolean) => void;

  /** Rotate the selected module 90° clockwise or counter-clockwise */
  rotateModule: (id: string, deg: 90 | -90) => void;
  /** Mirror the selected module along the vertical axis (left↔right) */
  mirrorModule: (id: string) => void;
};

// ── Rotation / mirror helpers ──────────────────────────────────────────────

function remapHoles(holes: string[], map: Record<string, string>): string[] {
  return holes.map(key => {
    const dashIdx = key.indexOf("-");
    const face = key.slice(0, dashIdx);
    const rest = key.slice(dashIdx);          // e.g. "-0"
    return `${map[face] ?? face}${rest}`;
  });
}

const ROTATE_CW: Record<string, string>  = { north: "east",  east: "south", south: "west",  west: "north" };
const ROTATE_CCW: Record<string, string> = { north: "west",  west: "south", south: "east",  east: "north" };
const MIRROR_V: Record<string, string>   = { east:  "west",  west: "east",  north: "north", south: "south" };

const BASE = TEMPLATES[0];

// ── BFS layout helper ──────────────────────────────────────────────────────
const EPS = 1.5;             // mm tolerance for adjacency detection (touching)
const SEPARATE_GAP_MM = 20;  // gap applied by `separate()` for inspection
const JOIN_EPS = SEPARATE_GAP_MM * 2; // tolerance used by `join()` so it can recover pieces that were separated
const JOIN_MATCH_TOL = 0.1;  // mm — magnet-position alignment tolerance (matches magnetMatching.ts)

type MagnetGlobalParams = {
  magnetHeightMm:  number;
  magnetMarginMm:  number;
  magnetSpacingMm: number;
  mirrorEnabled:   boolean;
};

function toModuleParams(m: ModuleInstance, g: MagnetGlobalParams): ModuleParams {
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

type Edge = { aId: string; bId: string; axis: "x" | "z"; dir: 1 | -1 };

function buildEdges(modules: ModuleInstance[], eps: number = EPS): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const a = modules[i], b = modules[j];
      const aE = a.x + a.widthMm / 2, aW = a.x - a.widthMm / 2;
      const aN = a.z + a.depthMm / 2, aS = a.z - a.depthMm / 2;
      const bE = b.x + b.widthMm / 2, bW = b.x - b.widthMm / 2;
      const bN = b.z + b.depthMm / 2, bS = b.z - b.depthMm / 2;

      if (Math.abs(aN - bS) < eps) {
        edges.push({ aId: a.id, bId: b.id, axis: "z", dir:  1 });
      } else if (Math.abs(aS - bN) < eps) {
        edges.push({ aId: a.id, bId: b.id, axis: "z", dir: -1 });
      } else if (Math.abs(aE - bW) < eps) {
        edges.push({ aId: a.id, bId: b.id, axis: "x", dir:  1 });
      } else if (Math.abs(aW - bE) < eps) {
        edges.push({ aId: a.id, bId: b.id, axis: "x", dir: -1 });
      }
    }
  }
  return edges;
}

/**
 * For two modules joined by `edge` (cur is the parent), pick the shift S along
 * the edge's perpendicular axis such that `nb.perp = cur.perp + S` aligns one
 * pair of active magnets while moving `nb` as little as possible from its
 * current world position.
 *
 * Each candidate S = curLats[i] - nbLats[j] aligns the (i, j) pair exactly,
 * so the "≥1 match" requirement is satisfied by construction. Among
 * candidates we pick the one minimising |S - currentOffset|, where
 * currentOffset is nb's existing perpendicular displacement relative to cur.
 * This snaps the magnets that are already closest to each other instead of
 * sliding nb to a far-away pairing just because it would align more pairs.
 *
 * Returns null when either side has no active holes on the touching face — in
 * that case the perpendicular position is left untouched.
 */
function bestPerpShift(
  cur:        ModuleInstance,
  nb:         ModuleInstance,
  edge:       Edge,
  curIsAside: boolean,
  g:          MagnetGlobalParams,
): number | null {
  const dir: 1 | -1 = curIsAside ? edge.dir : (-edge.dir as 1 | -1);

  let curFace: LateralFace, nbFace: LateralFace;
  if (edge.axis === "x") {
    curFace = dir === 1 ? "east"  : "west";
    nbFace  = dir === 1 ? "west"  : "east";
  } else {
    curFace = dir === 1 ? "north" : "south";
    nbFace  = dir === 1 ? "south" : "north";
  }

  const curHoles = computeAllPotentialHoles(toModuleParams(cur, g))
    .filter(h => h.face === curFace && cur.activeHoles.includes(h.key));
  const nbHoles  = computeAllPotentialHoles(toModuleParams(nb, g))
    .filter(h => h.face === nbFace  && nb.activeHoles.includes(h.key));

  if (curHoles.length === 0 || nbHoles.length === 0) return null;

  // Lateral coord along the perpendicular axis (Z for E-W edges, X for N-S).
  const lat = (h: { position: { x: number; z: number } }) =>
    edge.axis === "x" ? h.position.z : h.position.x;

  const curLats = curHoles.map(lat);
  const nbLats  = nbHoles.map(lat);

  // nb's current perpendicular offset relative to cur, before any snapping.
  const currentOffset = edge.axis === "x" ? (nb.z - cur.z) : (nb.x - cur.x);

  let bestShift = currentOffset;
  let bestDelta = Infinity;

  for (const cl of curLats) {
    for (const nl of nbLats) {
      const S = cl - nl;
      const delta = Math.abs(S - currentOffset);
      if (delta < bestDelta) {
        bestShift = S;
        bestDelta = delta;
      }
    }
  }

  return bestShift;
}

function bfsLayout(
  modules: ModuleInstance[],
  gap: number,
  eps: number = EPS,
  alignParams?: MagnetGlobalParams,
): ModuleInstance[] {
  if (modules.length === 0) return modules;
  const edges = buildEdges(modules, eps);
  if (edges.length === 0) return modules;

  const byId = new Map(modules.map(m => [m.id, { ...m }]));
  const adj = new Map<string, { neighborId: string; edge: Edge }[]>();
  for (const m of modules) adj.set(m.id, []);
  for (const e of edges) {
    adj.get(e.aId)!.push({ neighborId: e.bId, edge: e });
    adj.get(e.bId)!.push({ neighborId: e.aId, edge: e });
  }

  const visited = new Set<string>();
  const root = modules[0].id;
  visited.add(root);
  const queue = [root];

  while (queue.length > 0) {
    const curId = queue.shift()!;
    const cur = byId.get(curId)!;
    for (const { neighborId, edge } of adj.get(curId)!) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      const nb = byId.get(neighborId)!;

      // Determine which side of the edge current is
      const isAside = edge.aId === curId;
      const dir = isAside ? edge.dir : -edge.dir as 1 | -1;

      if (edge.axis === "x") {
        if (dir === 1) {
          // cur is west of nb: nb.x = cur.x + cur.widthMm/2 + gap + nb.widthMm/2
          nb.x = cur.x + cur.widthMm / 2 + gap + nb.widthMm / 2;
        } else {
          nb.x = cur.x - cur.widthMm / 2 - gap - nb.widthMm / 2;
        }
        if (alignParams) {
          const shift = bestPerpShift(cur, nb, edge, isAside, alignParams);
          if (shift !== null) nb.z = cur.z + shift;
        }
      } else {
        if (dir === 1) {
          nb.z = cur.z + cur.depthMm / 2 + gap + nb.depthMm / 2;
        } else {
          nb.z = cur.z - cur.depthMm / 2 - gap - nb.depthMm / 2;
        }
        if (alignParams) {
          const shift = bestPerpShift(cur, nb, edge, isAside, alignParams);
          if (shift !== null) nb.x = cur.x + shift;
        }
      }
      queue.push(neighborId);
    }
  }

  return modules.map(m => byId.get(m.id)!);
}


/**
 * Returns world-space {y, lat} for every active hole on the given face.
 * `lat` is the coordinate along the face's length axis:
 *   – east/west (axis "x"): Z component → a.z + hole.position.z
 *   – north/south (axis "z"): X component → a.x + hole.position.x
 */
function activeHoleWorldCoords(
  m: ModuleInstance,
  face: LateralFace,
  edgeAxis: "x" | "z",
  g: MagnetGlobalParams,
): { y: number; lat: number }[] {
  const params = toModuleParams(m, g);
  return computeAllPotentialHoles(params)
    .filter(h => h.face === face && m.activeHoles.includes(h.key))
    .map(h => ({
      y:   h.position.y + m.heightMm / 2,
      lat: edgeAxis === "x" ? m.z + h.position.z : m.x + h.position.x,
    }));
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  magnetHeightMm:  10,
  magnetMarginMm:  10,
  magnetSpacingMm: 40,
  mirrorEnabled:   true,

  modules:          [createModule(BASE, 0, 0, "mod-0")],
  selectedModuleId: null,
  joinStatus:       null,

  // ── addModule ─────────────────────────────────────────────────────────────
  addModule: (template) => {
    const { modules } = get();
    const maxEast = modules.reduce(
      (m, mod) => Math.max(m, mod.x + mod.widthMm / 2),
      0,
    );
    const newX = maxEast + template.defaults.widthMm / 2 + 10;
    const mod  = createModule(template, newX, 0);
    set(s => ({ modules: [...s.modules, mod], selectedModuleId: mod.id }));
  },

  // ── addConnectedModule ────────────────────────────────────────────────────
  addConnectedModule: (sourceId, face, template) => {
    const { modules } = get();
    const src = modules.find(m => m.id === sourceId);
    if (!src) return;

    const nw = template.defaults.widthMm;
    const nd = template.defaults.depthMm;
    let nx = src.x, nz = src.z;

    switch (face) {
      case "north": nz = src.z + src.depthMm / 2 + nd / 2; break;
      case "south": nz = src.z - src.depthMm / 2 - nd / 2; break;
      case "east":  nx = src.x + src.widthMm / 2 + nw / 2; break;
      case "west":  nx = src.x - src.widthMm / 2 - nw / 2; break;
    }

    const mod = createModule(template, nx, nz);
    set(s => ({ modules: [...s.modules, mod], selectedModuleId: mod.id }));
  },

  removeModule: (id) =>
    set(s => ({
      modules:          s.modules.filter(m => m.id !== id),
      selectedModuleId: s.selectedModuleId === id ? null : s.selectedModuleId,
    })),

  selectModule: (id) => set({ selectedModuleId: id }),

  updateModule: (id, patch) =>
    set(s => ({
      modules: s.modules.map(m => (m.id === id ? { ...m, ...patch } : m)),
    })),

  applyTemplateToModule: (id, preset) =>
    set(s => ({
      modules: s.modules.map(m =>
        m.id === id
          ? {
              ...m,
              templateType: preset.type,
              widthMm:      preset.defaults.widthMm,
              depthMm:      preset.defaults.depthMm,
              heightMm:     preset.defaults.heightMm,
              ...(preset.defaults.wallThicknessMm !== undefined
                ? { wallThicknessMm: preset.defaults.wallThicknessMm }
                : {}),
            }
          : m,
      ),
    })),

  moveModule: (id, x, z) =>
    set(s => ({
      modules: s.modules.map(m => (m.id === id ? { ...m, x, z } : m)),
    })),

  toggleHole: (moduleId, holeKey) =>
    set(s => ({
      modules: s.modules.map(m => {
        if (m.id !== moduleId) return m;
        const has = m.activeHoles.includes(holeKey);
        return {
          ...m,
          activeHoles: has
            ? m.activeHoles.filter(k => k !== holeKey)
            : [...m.activeHoles, holeKey],
        };
      }),
    })),

  separate: () => {
    const { modules } = get();
    set({ modules: bfsLayout(modules, SEPARATE_GAP_MM) });
  },

  join: () => {
    const { modules, magnetHeightMm, magnetMarginMm, magnetSpacingMm, mirrorEnabled } = get();

    const globalParams: MagnetGlobalParams = {
      magnetHeightMm, magnetMarginMm, magnetSpacingMm, mirrorEnabled,
    };

    // Use a wider tolerance so pieces previously spread by `separate()` are
    // still detected as adjacent. `alignParams` makes the BFS slide each
    // child perpendicular to the contact axis so its magnets line up with
    // the parent's.
    const joined = bfsLayout(modules, 0, JOIN_EPS, globalParams);

    // Verify each adjacent connection for proper magnet alignment
    const edges   = buildEdges(joined);
    const warnings: string[] = [];
    const byId    = new Map(joined.map(m => [m.id, m]));

    for (const { aId, bId, axis, dir } of edges) {
      const a = byId.get(aId)!;
      const b = byId.get(bId)!;

      const aFace: LateralFace = axis === "x" ? (dir === 1 ? "east"  : "west")
                                               : (dir === 1 ? "north" : "south");
      const bFace: LateralFace = axis === "x" ? (dir === 1 ? "west"  : "east")
                                               : (dir === 1 ? "south" : "north");

      const aHoles = activeHoleWorldCoords(a, aFace, axis, globalParams);
      const bHoles = activeHoleWorldCoords(b, bFace, axis, globalParams);

      const modNums = [modules.indexOf(a) + 1, modules.indexOf(b) + 1];

      if (aHoles.length === 0 || bHoles.length === 0) {
        const missing = aHoles.length === 0 ? aFace : bFace;
        warnings.push(`Módulos ${modNums[0]}↔${modNums[1]}: falta imán en cara ${missing}`);
        continue;
      }

      // Check that at least one hole from A aligns positionally with one from B
      const anyAligned = aHoles.some(aw =>
        bHoles.some(
          bw =>
            Math.abs(aw.y   - bw.y)   <= JOIN_MATCH_TOL &&
            Math.abs(aw.lat - bw.lat) <= JOIN_MATCH_TOL,
        ),
      );

      if (!anyAligned) {
        warnings.push(
          `Módulos ${modNums[0]}↔${modNums[1]}: imanes no alineados en ${aFace}↔${bFace}`,
        );
      }
    }

    const status = warnings.length === 0
      ? `✓ Unión correcta (${edges.length} conexión${edges.length !== 1 ? "es" : ""})`
      : warnings.join(" · ");

    set({ modules: joined, joinStatus: status });
  },

  clearJoinStatus: () => set({ joinStatus: null }),

  setMagnetHeight:  (v) => set({ magnetHeightMm:  clamp(v, 5,  280) }),
  setMagnetMargin:  (v) => set({ magnetMarginMm:  clamp(v, 10, 200) }),
  setMagnetSpacing: (v) => set({ magnetSpacingMm: clamp(v, 10, 200) }),
  setMirrorEnabled: (v) => set({ mirrorEnabled: v }),

  rotateModule: (id, deg) =>
    set(s => ({
      modules: s.modules.map(m => {
        if (m.id !== id) return m;
        const map = deg === 90 ? ROTATE_CW : ROTATE_CCW;
        return {
          ...m,
          widthMm:     m.depthMm,
          depthMm:     m.widthMm,
          activeHoles: remapHoles(m.activeHoles, map),
        };
      }),
    })),

  mirrorModule: (id) =>
    set(s => ({
      modules: s.modules.map(m => {
        if (m.id !== id) return m;
        return {
          ...m,
          activeHoles: remapHoles(m.activeHoles, MIRROR_V),
        };
      }),
    })),
}));
