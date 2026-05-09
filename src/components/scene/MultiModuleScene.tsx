"use client";

import { useMemo } from "react";
import { useModuleStore, type ModuleInstance } from "@/lib/store";
import { detectCollisions } from "@/lib/geometry";
import { useMagnetMatching } from "@/lib/magnetMatching";
import { SingleModule, type GlobalMagnetParams } from "./SingleModule";

// Two modules are "connected" on a face when their surfaces are flush
// (within 1.5 mm tolerance) and they overlap on the perpendicular axis.
type Connection = {
  x: number; z: number;
  sizeX: number; sizeZ: number;
  height: number;
};

const EPS = 1.5; // mm tolerance

function detectConnections(modules: ModuleInstance[]): Connection[] {
  const result: Connection[] = [];

  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const a = modules[i];
      const b = modules[j];

      const aE = a.x + a.widthMm / 2;  const aW = a.x - a.widthMm / 2;
      const aN = a.z + a.depthMm / 2;  const aS = a.z - a.depthMm / 2;
      const bE = b.x + b.widthMm / 2;  const bW = b.x - b.widthMm / 2;
      const bN = b.z + b.depthMm / 2;  const bS = b.z - b.depthMm / 2;

      const h = Math.min(a.heightMm, b.heightMm);

      // North A ↔ South B
      if (Math.abs(aN - bS) < EPS) {
        const overlapX = Math.min(aE, bE) - Math.max(aW, bW);
        if (overlapX > 0)
          result.push({ x: (Math.max(aW, bW) + Math.min(aE, bE)) / 2, z: aN, sizeX: overlapX, sizeZ: 0, height: h });
      }
      // South A ↔ North B
      if (Math.abs(aS - bN) < EPS) {
        const overlapX = Math.min(aE, bE) - Math.max(aW, bW);
        if (overlapX > 0)
          result.push({ x: (Math.max(aW, bW) + Math.min(aE, bE)) / 2, z: aS, sizeX: overlapX, sizeZ: 0, height: h });
      }
      // East A ↔ West B
      if (Math.abs(aE - bW) < EPS) {
        const overlapZ = Math.min(aN, bN) - Math.max(aS, bS);
        if (overlapZ > 0)
          result.push({ x: aE, z: (Math.max(aS, bS) + Math.min(aN, bN)) / 2, sizeX: 0, sizeZ: overlapZ, height: h });
      }
      // West A ↔ East B
      if (Math.abs(aW - bE) < EPS) {
        const overlapZ = Math.min(aN, bN) - Math.max(aS, bS);
        if (overlapZ > 0)
          result.push({ x: aW, z: (Math.max(aS, bS) + Math.min(aN, bN)) / 2, sizeX: 0, sizeZ: overlapZ, height: h });
      }
    }
  }

  return result;
}

export function MultiModuleScene() {
  const modules          = useModuleStore(s => s.modules);
  const selectedModuleId = useModuleStore(s => s.selectedModuleId);
  const selectModule     = useModuleStore(s => s.selectModule);
  const moveModule       = useModuleStore(s => s.moveModule);
  const toggleHole       = useModuleStore(s => s.toggleHole);
  const magnetHeightMm   = useModuleStore(s => s.magnetHeightMm);
  const magnetMarginMm   = useModuleStore(s => s.magnetMarginMm);
  const magnetSpacingMm  = useModuleStore(s => s.magnetSpacingMm);
  const mirrorEnabled    = useModuleStore(s => s.mirrorEnabled);

  const globalParams: GlobalMagnetParams = useMemo(
    () => ({ magnetHeightMm, magnetMarginMm, magnetSpacingMm, mirrorEnabled }),
    [magnetHeightMm, magnetMarginMm, magnetSpacingMm, mirrorEnabled],
  );

  const connections = useMemo(() => detectConnections(modules), [modules]);
  const collisionIds = useMemo(
    () => detectCollisions(modules).idsInCollision,
    [modules],
  );
  const { states: holeStates } = useMagnetMatching();

  return (
    <>
      {modules.map(mod => (
        <SingleModule
          key={mod.id}
          instance={mod}
          global={globalParams}
          isSelected={mod.id === selectedModuleId}
          isInCollision={collisionIds.has(mod.id)}
          holeStates={holeStates}
          onSelect={() => selectModule(mod.id)}
          onMove={(x, z) => moveModule(mod.id, x, z)}
          onToggleHole={(key) => toggleHole(mod.id, key)}
        />
      ))}

      {/* ── Connection glow planes ── */}
      {connections.map((c, i) => {
        const isNS = c.sizeZ === 0;
        return (
          <mesh key={i} position={[c.x, c.height / 2, c.z]}>
            <boxGeometry
              args={[
                isNS ? c.sizeX : 1.2,
                c.height,
                isNS ? 1.2 : c.sizeZ,
              ]}
            />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}
