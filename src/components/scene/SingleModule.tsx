"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import type { ModuleInstance } from "@/lib/store";
import {
  buildModuleGeometry,
  computeAllPotentialHoles,
  MAGNET_RADIUS_MM,
} from "@/lib/geometry";
import {
  type GlobalMagnetParams,
  type HoleStates,
  HOLE_STATE_COLOR,
} from "@/lib/magnetMatching";

export type { GlobalMagnetParams };

/** Torus rotation so the ring faces outward from each face normal */
function torusRotation(nx: number): [number, number, number] {
  return Math.abs(nx) > 0.5 ? [0, Math.PI / 2, 0] : [0, 0, 0];
}

/** Y=0 drag plane */
const DRAG_PLANE = new Plane(new Vector3(0, 1, 0), 0);

type Props = {
  instance:      ModuleInstance;
  global:        GlobalMagnetParams;
  isSelected:    boolean;
  isInCollision: boolean;
  holeStates?:   HoleStates;
  onSelect:      () => void;
  onMove:        (x: number, z: number) => void;
  onToggleHole:  (holeKey: string) => void;
};

export function SingleModule({
  instance,
  global,
  isSelected,
  isInCollision,
  holeStates,
  onSelect,
  onMove,
  onToggleHole,
}: Props) {
  const { camera, gl } = useThree();

  // ── Geometry & holes (memoised) ──────────────────────────────────────────
  const params = useMemo(
    () => ({
      widthMm:         instance.widthMm,
      depthMm:         instance.depthMm,
      heightMm:        instance.heightMm,
      magnetHeightMm:  global.magnetHeightMm,
      magnetMarginMm:  global.magnetMarginMm,
      magnetSpacingMm: global.magnetSpacingMm,
      mirrorEnabled:   global.mirrorEnabled,
      // faces not used for geometry drilling – activeHoles drives it
      faces: { north: false, south: false, east: false, west: false } as Record<"north"|"south"|"east"|"west", boolean>,
      templateType:    instance.templateType,
      wallThicknessMm: instance.wallThicknessMm,
      slotAngleDeg:    instance.slotAngleDeg,
      slotWidthMm:     instance.slotWidthMm,
    }),
    [
      instance.widthMm, instance.depthMm, instance.heightMm,
      global.magnetHeightMm, global.magnetMarginMm, global.magnetSpacingMm,
      global.mirrorEnabled,
      instance.templateType, instance.wallThicknessMm,
      instance.slotAngleDeg, instance.slotWidthMm,
    ],
  );

  // Pass activeHoles to actually drill the selected holes
  const activeKey = instance.activeHoles.join(",");
  const geometry = useMemo(
    () => buildModuleGeometry(params, instance.activeHoles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, activeKey],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  // All potential holes (grey rings)
  const allHoles = useMemo(() => computeAllPotentialHoles(params), [params]);

  // ── Drag state ───────────────────────────────────────────────────────────
  const dragging   = useRef(false);
  const dragOffset = useRef({ x: 0, z: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const worldFromEvent = useCallback(
    (clientX: number, clientY: number): Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = new Vector3();
      const ok = ray.ray.intersectPlane(DRAG_PLANE, hit);
      return ok ? hit : null;
    },
    [camera, gl],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only left-button drag
      if (e.button !== 0) return;
      e.stopPropagation();

      const hit = worldFromEvent(e.clientX, e.clientY);
      if (!hit) return;

      dragging.current   = true;
      dragOffset.current = { x: hit.x - instance.x, z: hit.z - instance.z };
      setIsDragging(true);
      onSelect();

      const onMove_ = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const w = worldFromEvent(ev.clientX, ev.clientY);
        if (!w) return;
        onMove(w.x - dragOffset.current.x, w.z - dragOffset.current.z);
      };

      const onUp_ = () => {
        dragging.current = false;
        setIsDragging(false);
        document.removeEventListener("pointermove", onMove_);
        document.removeEventListener("pointerup",   onUp_);
      };

      document.addEventListener("pointermove", onMove_);
      document.addEventListener("pointerup",   onUp_);
    },
    [worldFromEvent, instance.x, instance.z, onSelect, onMove],
  );

  return (
    <group position={[instance.x, 0, instance.z]}>
      {/* ── Body ── */}
      <mesh
        position={[0, instance.heightMm / 2, 0]}
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = isDragging ? "grabbing" : "grab"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <meshStandardMaterial
          color={isInCollision ? "#ef4444" : isSelected ? "#93afff" : "#6b8eff"}
          roughness={0.6}
          metalness={0.05}
          emissive={isInCollision ? "#7f1d1d" : isSelected ? "#1a2a66" : "#000000"}
          emissiveIntensity={isInCollision ? 0.45 : isSelected ? 0.35 : 0}
        />
      </mesh>

      {/* ── Magnet indicators ── */}
      {allHoles.map((hole) => {
        const isActive = instance.activeHoles.includes(hole.key);
        const nx = hole.normal.x;
        const ny = hole.normal.y;
        const nz = hole.normal.z;
        const p  = isActive ? 0.5 : 1.5; // active rings are closer to flush
        return (
          <mesh
            key={hole.key}
            position={[
              hole.position.x + nx * p,
              hole.position.y + ny * p + instance.heightMm / 2,
              hole.position.z + nz * p,
            ]}
            rotation={torusRotation(nx)}
            onClick={(e) => { e.stopPropagation(); onToggleHole(hole.key); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { document.body.style.cursor = "default"; }}
          >
            <torusGeometry args={[MAGNET_RADIUS_MM - 0.5, 1, 8, 24]} />
            {isActive ? (() => {
              const state = holeStates?.get(`${instance.id}:${hole.key}`);
              const color = state ? HOLE_STATE_COLOR[state] : "#fbbf24";
              return (
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.35}
                  roughness={0.2}
                  metalness={0.9}
                />
              );
            })() : (
              <meshStandardMaterial
                color="#6b7280"
                emissive="#374151"
                emissiveIntensity={0.2}
                roughness={0.5}
                metalness={0.3}
                transparent
                opacity={0.7}
              />
            )}
          </mesh>
        );
      })}
    </group>
  );
}
