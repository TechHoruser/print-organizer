"use client";

import { useModuleStore, TEMPLATES, type TemplateType } from "@/lib/store";
import { useMagnetMatching, GLOBAL_STATUS_COLOR } from "@/lib/magnetMatching";

const DETAILS: Record<TemplateType, { purpose: string; tips: string[] }> = {
  base:               { purpose: "Bloque sólido magnético. Base universal.", tips: ["Ideal como módulo de esquina", "Apila varios para ganar altura"] },
  tablet_stand:       { purpose: "Soporte para tablet con ranura frontal.", tips: ["La ranura sujeta el borde inferior", "Ajusta la altura para distintos ángulos"] },
  phone_stand:        { purpose: "Soporte compacto para smartphone.", tips: ["Ranura más estrecha que el soporte tablet", "Compatible con fundas finas"] },
  phone_stand_tilted: { purpose: "Soporte inclinado con ranura diagonal.", tips: ["Permite ver la pantalla mientras carga", "Ajusta ángulo y grosor según tu móvil"] },
  stackable_box:      { purpose: "Caja hueca apilable para almacenamiento.", tips: ["Aumenta grosor de pared para más resistencia"] },
  postit_box:         { purpose: "Bandeja baja para tacos de notas adhesivas.", tips: ["Dimensiones para post-its 76×76 mm"] },
  pen_box:            { purpose: "Caja horizontal para bolígrafos y lápices.", tips: ["Orientación apaisada facilita el acceso"] },
  pen_holder:         { purpose: "Soporte vertical tipo cubilete.", tips: ["Altura mínima recomendada: 100 mm"] },
};

export function PropertiesPanel() {
  const modules          = useModuleStore(s => s.modules);
  const selectedModuleId = useModuleStore(s => s.selectedModuleId);
  const selectModule     = useModuleStore(s => s.selectModule);
  const magnetHeightMm   = useModuleStore(s => s.magnetHeightMm);
  const mirrorEnabled    = useModuleStore(s => s.mirrorEnabled);
  const magnetSpacingMm  = useModuleStore(s => s.magnetSpacingMm);

  const rotateModule = useModuleStore(s => s.rotateModule);
  const mirrorModule = useModuleStore(s => s.mirrorModule);

  // Must be called before early return (React hook rules)
  const { summary } = useMagnetMatching();

  const sel = modules.find(m => m.id === selectedModuleId);
  if (!sel) return null;

  const preset  = TEMPLATES.find(t => t.type === sel.templateType)!;
  const details = DETAILS[sel.templateType];

  // Derive which faces have at least one active hole
  const activeFaces = (["north", "south", "east", "west"] as const).filter(
    f => sel.activeHoles.some(k => k.startsWith(f)),
  );

  const faceLabel: Record<string, string> = {
    north: "Norte (+Z)", south: "Sur (−Z)", east: "Este (+X)", west: "Oeste (−X)",
  };

  const isHollow = ["stackable_box","postit_box","pen_box","pen_holder"].includes(sel.templateType);
  const isTilted = sel.templateType === "phone_stand_tilted";
  const hasGroove = ["tablet_stand","phone_stand"].includes(sel.templateType);

  return (
    <div className="absolute right-0 top-0 h-full w-72 overflow-y-auto border-l border-neutral-800 bg-neutral-950/95 backdrop-blur-sm text-sm text-neutral-200 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-800 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-0.5">Módulo seleccionado</p>
          <h2 className="text-base font-semibold text-white">{preset.label}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{details.purpose}</p>
        </div>
        <button type="button" onClick={() => selectModule(null)}
          className="ml-3 mt-0.5 text-neutral-500 hover:text-neutral-200 transition-colors flex-shrink-0">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Transform actions */}
      <div className="flex gap-1.5 border-b border-neutral-800 px-4 py-2">
        <TransformBtn title="Rotar −90°" onClick={() => rotateModule(sel.id, -90)}>
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8a5 5 0 1 0 5-5"/>
            <path d="M3 4v4H7"/>
          </svg>
        </TransformBtn>
        <TransformBtn title="Rotar +90°" onClick={() => rotateModule(sel.id, 90)}>
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 8a5 5 0 1 1-5-5"/>
            <path d="M13 4v4H9"/>
          </svg>
        </TransformBtn>
        <TransformBtn title="Espejo ↔" onClick={() => mirrorModule(sel.id)}>
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 2v12M3 5l-2 3 2 3M13 5l2 3-2 3"/>
          </svg>
        </TransformBtn>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Dimensions */}
        <PSection title="Dimensiones">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Ancho" value={sel.widthMm} unit="mm" />
            <Stat label="Prof." value={sel.depthMm}  unit="mm" />
            <Stat label="Alto"  value={sel.heightMm} unit="mm" />
          </div>
          <div className="mt-2 rounded border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-xs text-neutral-500">
            Vol. sólido:{" "}
            <span className="text-neutral-300">
              {((sel.widthMm * sel.depthMm * sel.heightMm) / 1000).toFixed(1)} cm³
            </span>
          </div>
        </PSection>

        {/* Template params */}
        {(isHollow || isTilted || hasGroove) && (
          <PSection title="Parámetros de plantilla">
            {isHollow   && <Row label="Grosor de pared" value={`${sel.wallThicknessMm} mm`} />}
            {isTilted   && <>
              <Row label="Ángulo de ranura" value={`${sel.slotAngleDeg}°`} />
              <Row label="Ancho de ranura"  value={`${sel.slotWidthMm} mm`} />
            </>}
            {hasGroove  && <>
              <Row label="Alto ranura (auto)"  value={`${Math.round(Math.min(14, sel.heightMm * 0.18))} mm`} />
              <Row label="Prof. ranura (auto)" value={`${Math.round(Math.min(10, sel.depthMm * 0.12))} mm`} />
            </>}
          </PSection>
        )}

        {/* Magnets */}
        <PSection title="Imanes">
          <Row label="Altura centro"  value={`${magnetHeightMm} mm`} />
          <Row label="Modo"           value={mirrorEnabled ? "Espejo" : "Individual"} />
          {mirrorEnabled && <Row label="Separación" value={`${magnetSpacingMm} mm`} />}
          <div className="mt-1 space-y-1">
            {activeFaces.map(f => {
              const count = sel.activeHoles.filter(k => k.startsWith(f)).length;
              return (
                <div key={f} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{faceLabel[f]}</span>
                  <span className="text-neutral-200">{count} imán{count !== 1 ? "es" : ""}</span>
                </div>
              );
            })}
          </div>
        </PSection>

        {/* Imanes (Global) */}
        <PSection title="Imanes (Global)">
          <div
            className="rounded border px-3 py-2 text-xs font-medium flex items-center justify-between"
            style={{
              borderColor: GLOBAL_STATUS_COLOR[summary.status],
              backgroundColor: `${GLOBAL_STATUS_COLOR[summary.status]}18`,
              color: GLOBAL_STATUS_COLOR[summary.status],
            }}
          >
            <span>Imanes sin match</span>
            <span className="text-sm font-semibold">{summary.unmatchedCount}</span>
          </div>
        </PSection>

        {/* Tips */}
        {details.tips.length > 0 && (
          <PSection title="Consejos">
            <ul className="space-y-1.5">
              {details.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-xs text-neutral-400">
                  <span className="mt-0.5 text-blue-400 flex-shrink-0">›</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </PSection>
        )}
      </div>

      <div className="border-t border-neutral-800 p-4">
        <p className="text-[10px] text-neutral-600">Haz clic fuera del módulo para deseleccionar.</p>
      </div>
    </div>
  );
}

function PSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2 text-center">
      <p className="text-[10px] text-neutral-500">{label}</p>
      <p className="text-sm font-semibold text-white">
        {value}<span className="text-[10px] font-normal text-neutral-400 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-neutral-400 shrink-0">{label}</span>
      <span className="text-neutral-200 text-right">{value}</span>
    </div>
  );
}

function TransformBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-[10px] text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
    >
      {children}
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}
