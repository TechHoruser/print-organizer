"use client";

import { useModuleStore } from "@/lib/store";
import { ControlPanel } from "@/components/panel/ControlPanel";
import { PropertiesPanel } from "@/components/panel/PropertiesPanel";
import { SceneCanvas } from "@/components/scene/SceneCanvas";

export default function Page() {
  const selectedModuleId = useModuleStore(s => s.selectedModuleId);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-neutral-900">
      <ControlPanel />
      <div className="relative flex-1">
        <SceneCanvas />
        {selectedModuleId !== null && <PropertiesPanel />}
      </div>
    </main>
  );
}
