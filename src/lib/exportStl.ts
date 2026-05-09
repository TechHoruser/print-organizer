"use client";

import { Mesh, MeshStandardMaterial } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { buildModuleGeometry } from "./geometry";
import type { ModuleInstance } from "./store";

type GlobalMagnetParams = {
  magnetHeightMm:  number;
  magnetMarginMm:  number;
  magnetSpacingMm: number;
  mirrorEnabled:   boolean;
};

export function exportModuleStl(
  instance: ModuleInstance,
  global: GlobalMagnetParams,
): void {
  const params = {
    widthMm:         instance.widthMm,
    depthMm:         instance.depthMm,
    heightMm:        instance.heightMm,
    magnetHeightMm:  global.magnetHeightMm,
    magnetMarginMm:  global.magnetMarginMm,
    magnetSpacingMm: global.magnetSpacingMm,
    mirrorEnabled:   global.mirrorEnabled,
    faces:           { north: false, south: false, east: false, west: false } as Record<"north"|"south"|"east"|"west", boolean>,
    templateType:    instance.templateType,
    wallThicknessMm: instance.wallThicknessMm,
    slotAngleDeg:    instance.slotAngleDeg,
    slotWidthMm:     instance.slotWidthMm,
  };

  const geometry = buildModuleGeometry(params, instance.activeHoles);
  const mat      = new MeshStandardMaterial();
  const mesh     = new Mesh(geometry, mat);

  const exporter  = new STLExporter();
  const stlString = exporter.parse(mesh, { binary: false });

  const blob = new Blob([stlString], { type: "model/stl" });
  const url  = URL.createObjectURL(blob);

  const filename = `modulo_${instance.templateType}_${instance.widthMm}x${instance.depthMm}.stl`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
  geometry.dispose();
  mat.dispose();
}
