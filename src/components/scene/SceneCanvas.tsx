"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useModuleStore } from "@/lib/store";
import { MultiModuleScene } from "./MultiModuleScene";

export function SceneCanvas() {
  const selectModule = useModuleStore(s => s.selectModule);

  return (
    <Canvas
      shadows
      camera={{ position: [220, 200, 240], fov: 45, near: 1, far: 5000 }}
      className="!bg-neutral-900"
      onPointerMissed={() => selectModule(null)}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[180, 280, 220]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Grid
        args={[1000, 1000]}
        cellSize={10}
        cellThickness={0.6}
        cellColor="#3a3a3a"
        sectionSize={80}
        sectionThickness={1.2}
        sectionColor="#7a7a7a"
        fadeDistance={1500}
        fadeStrength={1}
        infiniteGrid
        followCamera={false}
      />

      <MultiModuleScene />

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
