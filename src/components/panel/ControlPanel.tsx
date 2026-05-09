"use client";

import { useMemo, useState } from "react";
import {
  useModuleStore,
  type TemplateType,
  TEMPLATES,
} from "@/lib/store";
import { detectCollisions, magnetCount } from "@/lib/geometry";
import { exportModuleStl } from "@/lib/exportStl";

const HOLLOW_TYPES: TemplateType[] = ["stackable_box", "postit_box", "pen_box", "pen_holder"];
const TILTED_TYPES: TemplateType[] = ["phone_stand_tilted"];

export function ControlPanel() {
  // ── Global magnet params ─────────────────────────────────────────────────
  const magnetHeightMm  = useModuleStore(s => s.magnetHeightMm);
  const magnetMarginMm  = useModuleStore(s => s.magnetMarginMm);
  const magnetSpacingMm = useModuleStore(s => s.magnetSpacingMm);
  const mirrorEnabled   = useModuleStore(s => s.mirrorEnabled);
  const setMagnetHeight  = useModuleStore(s => s.setMagnetHeight);
  const setMagnetMargin  = useModuleStore(s => s.setMagnetMargin);
  const setMagnetSpacing = useModuleStore(s => s.setMagnetSpacing);
  const setMirrorEnabled = useModuleStore(s => s.setMirrorEnabled);

  // ── Module list ──────────────────────────────────────────────────────────
  const modules          = useModuleStore(s => s.modules);
  const selectedModuleId = useModuleStore(s => s.selectedModuleId);
  const addModule        = useModuleStore(s => s.addModule);
  const addConnected     = useModuleStore(s => s.addConnectedModule);
  const removeModule     = useModuleStore(s => s.removeModule);
  const selectModule     = useModuleStore(s => s.selectModule);
  const updateModule     = useModuleStore(s => s.updateModule);
  const applyTemplate    = useModuleStore(s => s.applyTemplateToModule);
  const separate         = useModuleStore(s => s.separate);
  const join             = useModuleStore(s => s.join);
  const joinStatus       = useModuleStore(s => s.joinStatus);
  const clearJoinStatus  = useModuleStore(s => s.clearJoinStatus);

  // ── Collisions (derived) ─────────────────────────────────────────────────
  const collisions = useMemo(() => detectCollisions(modules), [modules]);
  const collisionMessage = useMemo(() => {
    if (collisions.pairs.length === 0) return null;
    const indexById = new Map(modules.map((m, i) => [m.id, i + 1]));
    const labels = collisions.pairs.map(
      ({ aId, bId }) => `${indexById.get(aId)}↔${indexById.get(bId)}`,
    );
    return collisions.pairs.length === 1
      ? `⚠ Colisión: módulos ${labels[0].replace("↔", " ↔ ")} se solapan`
      : `⚠ Colisión en ${collisions.pairs.length} pares: ${labels.join(" · ")}`;
  }, [collisions.pairs, modules]);

  // ── Selected module ──────────────────────────────────────────────────────
  const sel = modules.find(m => m.id === selectedModuleId) ?? null;

  // ── Local state: template to use when connecting or adding ───────────────
  const [addTpl, setAddTpl] = useState(TEMPLATES[0]);

  // ── Derived counts (based on selected or first module for reference) ─────
  const refMod = sel ?? modules[0];
  const countNS = magnetCount(refMod?.widthMm ?? 120, mirrorEnabled, magnetSpacingMm, magnetMarginMm);
  const countEW = magnetCount(refMod?.depthMm ?? 80,  mirrorEnabled, magnetSpacingMm, magnetMarginMm);

  const isHollow = sel ? HOLLOW_TYPES.includes(sel.templateType) : false;
  const isTilted = sel ? TILTED_TYPES.includes(sel.templateType) : false;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const upd = (patch: Parameters<typeof updateModule>[1]) => {
    if (sel) updateModule(sel.id, patch);
  };

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-r border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-200">
      <h1 className="text-base font-semibold tracking-tight">Módulo paramétrico</h1>
      <p className="mt-1 text-xs text-neutral-500">Multi-módulo · conectores magnéticos</p>

      {/* ── MODULE LIST ─────────────────────────────────────────────────── */}
      <Section title="Módulos en el plano">
        <div className="space-y-1">
          {modules.map((mod, idx) => {
            const tpl = TEMPLATES.find(t => t.type === mod.templateType)!;
            const isSel = mod.id === selectedModuleId;
            return (
              <div
                key={mod.id}
                onClick={() => selectModule(isSel ? null : mod.id)}
                className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 transition-colors ${
                  isSel
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-100"
                    : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                <span className="flex-shrink-0 w-6 h-6">
                  <TemplateThumbnail type={mod.templateType} active={isSel} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium leading-tight truncate">
                    {idx + 1}. {tpl.label}
                  </span>
                  <span className="block text-[10px] text-neutral-500 truncate">
                    {mod.widthMm}×{mod.depthMm}×{mod.heightMm} mm
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeModule(mod.id); }}
                  className="flex-shrink-0 text-neutral-600 hover:text-red-400 transition-colors"
                  title="Eliminar"
                >
                  <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 fill-current">
                    <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Add module */}
        <div className="mt-2 flex gap-1.5">
          <select
            value={addTpl.type}
            onChange={e => setAddTpl(TEMPLATES.find(t => t.type === e.target.value)!)}
            className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 outline-none focus:border-neutral-500"
          >
            {TEMPLATES.map(t => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => addModule(addTpl)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:border-neutral-500 transition-colors"
          >
            + Añadir
          </button>
        </div>

        {/* Separate / Join */}
        {modules.length > 1 && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => separate()}
                className="flex-1 rounded border border-amber-600/40 bg-amber-600/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:border-amber-500/60 hover:bg-amber-600/20 transition-colors"
              >
                ↔ Separar
              </button>
              <button
                type="button"
                onClick={() => { join(); }}
                className="flex-1 rounded border border-emerald-600/40 bg-emerald-600/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-500/60 hover:bg-emerald-600/20 transition-colors"
              >
                ⊞ Unir
              </button>
            </div>
            {collisionMessage ? (
              <div className="rounded border px-3 py-2 text-xs leading-snug border-red-600/30 bg-red-600/10 text-red-300">
                {collisionMessage}
              </div>
            ) : joinStatus && (
              <div
                className={`rounded border px-3 py-2 text-xs leading-snug ${
                  joinStatus.startsWith("✓")
                    ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}
              >
                {joinStatus}
                <button
                  type="button"
                  onClick={clearJoinStatus}
                  className="ml-2 text-neutral-500 hover:text-neutral-300"
                >×</button>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── SELECTED MODULE ──────────────────────────────────────────────── */}
      {sel && (
        <>
          <Section title="Plantilla">
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => applyTemplate(sel.id, t)}
                  className={`flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                    sel.templateType === t.type
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-100"
                      : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <span className="flex-shrink-0 w-7 h-7">
                    <TemplateThumbnail type={t.type} active={sel.templateType === t.type} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium leading-tight truncate">{t.label}</span>
                    <span className="block text-[10px] leading-tight text-neutral-500 truncate">{t.description}</span>
                  </span>
                </button>
              ))}
            </div>

            {isHollow && (
              <NumberRow label="Grosor pared" value={sel.wallThicknessMm}
                onChange={v => upd({ wallThicknessMm: Math.max(1, Math.min(20, v)) })}
                step={0.5} hint="≥ 2 mm" />
            )}
            {isTilted && (
              <>
                <NumberRow label="Ángulo ranura" value={sel.slotAngleDeg}
                  onChange={v => upd({ slotAngleDeg: Math.max(5, Math.min(40, v)) })}
                  step={1} hint="5–40°" unit="°" />
                <NumberRow label="Ancho ranura" value={sel.slotWidthMm}
                  onChange={v => upd({ slotWidthMm: Math.max(4, Math.min(30, v)) })}
                  step={1} hint="grosor dispositivo" />
              </>
            )}
          </Section>

          <Section title="Dimensiones">
            <NumberRow label="Ancho (X)" value={sel.widthMm}
              onChange={v => upd({ widthMm: Math.max(20, Math.min(400, v)) })} step={10} />
            <NumberRow label="Profundidad (Z)" value={sel.depthMm}
              onChange={v => upd({ depthMm: Math.max(20, Math.min(400, v)) })} step={10} />
            <NumberRow label="Altura (Y)" value={sel.heightMm}
              onChange={v => upd({ heightMm: Math.max(10, Math.min(300, v)) })} step={5} />
          </Section>

          {/* ── CONNECT ─────────────────────────────────────────────────── */}
          <Section title="Conectar módulo adyacente">
            <p className="text-[10px] text-neutral-500 -mt-1">
              Elige plantilla y cara para añadir un módulo encajado.
            </p>
            <select
              value={addTpl.type}
              onChange={e => setAddTpl(TEMPLATES.find(t => t.type === e.target.value)!)}
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 outline-none focus:border-neutral-500"
            >
              {TEMPLATES.map(t => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
            {/* Compass layout */}
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              <div />
              <ConnectBtn label="Norte" onClick={() => addConnected(sel.id, "north", addTpl)} />
              <div />
              <ConnectBtn label="Oeste" onClick={() => addConnected(sel.id, "west", addTpl)} />
              <div className="flex items-center justify-center rounded border border-neutral-800 text-neutral-600">
                <svg viewBox="0 0 14 14" className="w-4 h-4 fill-neutral-600">
                  <circle cx="7" cy="7" r="2" />
                </svg>
              </div>
              <ConnectBtn label="Este" onClick={() => addConnected(sel.id, "east", addTpl)} />
              <div />
              <ConnectBtn label="Sur" onClick={() => addConnected(sel.id, "south", addTpl)} />
              <div />
            </div>
          </Section>

          {/* Export for selected module */}
          <button
            type="button"
            onClick={() =>
              exportModuleStl(sel, {
                magnetHeightMm,
                magnetMarginMm,
                magnetSpacingMm,
                mirrorEnabled,
              })
            }
            className="mt-2 w-full rounded border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition-colors hover:border-emerald-500/60 hover:bg-emerald-600/20 active:scale-95"
          >
            ↓ Exportar STL — {TEMPLATES.find(t => t.type === sel.templateType)?.label}
          </button>
        </>
      )}

      {/* ── GLOBAL MAGNET PARAMS ─────────────────────────────────────────── */}
      <Section title="Imanes (global)">
        <ToggleRow label="Modo espejo (centrado)" value={mirrorEnabled} onChange={setMirrorEnabled} />
        <NumberRow label="Altura centro"  value={magnetHeightMm}  onChange={setMagnetHeight}  step={1} hint="desde la base" />
        <NumberRow label="Margen mínimo"  value={magnetMarginMm}  onChange={setMagnetMargin}  step={1} hint="≥ 10 mm" />
        {mirrorEnabled && (
          <NumberRow label="Separación"   value={magnetSpacingMm} onChange={setMagnetSpacing} step={5} hint="centro a centro" />
        )}
        <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2.5 text-xs text-neutral-400">
          <p>
            <span className="text-neutral-300">N/S</span> ({refMod?.widthMm ?? 0} mm):{" "}
            <span className="text-neutral-200">{countNS}</span> imán{countNS === 1 ? "" : "es"}
          </p>
          <p className="mt-0.5">
            <span className="text-neutral-300">E/O</span> ({refMod?.depthMm ?? 0} mm):{" "}
            <span className="text-neutral-200">{countEW}</span> imán{countEW === 1 ? "" : "es"}
          </p>
        </div>
      </Section>

      <div className="mt-4 rounded border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-500">
        <p className="font-medium text-neutral-300">Imán de referencia</p>
        <p className="mt-1">Ø 8.2 mm · prof. 3.1 mm</p>
        <p className="mt-0.5">Cuadrícula: 80 mm / 10 mm</p>
      </div>
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-300">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function NumberRow({
  label, value, onChange, step, hint, unit = "mm",
}: {
  label: string; value: number; onChange: (v: number) => void;
  step: number; hint?: string; unit?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-neutral-400">{label}</span>
        {hint && <span className="text-[10px] text-neutral-500">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 outline-none focus:border-neutral-500"
        />
        <span className="text-xs text-neutral-500">{unit}</span>
      </div>
    </label>
  );
}

function ToggleRow({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left transition-colors ${
        value
          ? "border-blue-500/40 bg-blue-500/10 text-blue-100"
          : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-[10px] font-semibold ${value ? "text-blue-300" : "text-neutral-500"}`}>
        {value ? "ON" : "OFF"}
      </span>
    </button>
  );
}

function ConnectBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded border border-neutral-700 bg-neutral-900 py-1.5 text-[10px] text-neutral-400 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-200 transition-colors"
    >
      <span className="text-neutral-500 text-base leading-none">+</span>
      {label}
    </button>
  );
}

// ── SVG thumbnails ────────────────────────────────────────────────────────────

function TemplateThumbnail({ type, active }: { type: TemplateType; active: boolean }) {
  const color = active ? "#93afff" : "#6b7280";
  const bg    = active ? "#1e2d5a" : "#1f2937";
  const sw    = 1.6;

  switch (type) {
    case "base":
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <rect x="4" y="9" width="24" height="16" rx="1.5" fill={bg} stroke={color} strokeWidth={sw} />
          <rect x="8" y="13" width="16" height="8" rx="1" fill={color} opacity="0.35" />
        </svg>
      );

    case "tablet_stand":
    case "phone_stand":
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <rect x="4" y="6" width="24" height="21" rx="1.5" fill={bg} stroke={color} strokeWidth={sw} />
          <rect x="4" y="20" width="10" height="8" fill={active ? "#0f172a" : "#111827"} />
          <path d="M4 20 H14 V27" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
          <line x1="4" y1="27" x2="28" y2="27" stroke={color} strokeWidth={sw} />
          <rect x="10" y="10" width="5" height="12" rx="0.5" fill={color} opacity="0.4" />
        </svg>
      );

    case "phone_stand_tilted":
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <rect x="4" y="6" width="24" height="21" rx="1.5" fill={bg} stroke={color} strokeWidth={sw} />
          <line x1="17" y1="5" x2="12" y2="28" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <line x1="21" y1="5" x2="16" y2="28" stroke={active ? "#0f172a" : "#111827"} strokeWidth={2} strokeLinecap="round" />
        </svg>
      );

    case "stackable_box":
    case "postit_box":
    case "pen_box":
    case "pen_holder": {
      const tall    = type === "pen_holder";
      const wide    = type === "pen_box";
      const shallow = type === "postit_box";
      const [bx, by, bw, bh] = tall ? [8, 4, 16, 24] : wide ? [2, 10, 28, 14] : shallow ? [4, 12, 24, 13] : [4, 8, 24, 17];
      const wall = 3;
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d={`M${bx} ${by} V${by + bh} H${bx + bw} V${by}`} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
          <line x1={bx} y1={by + bh} x2={bx + bw} y2={by + bh} stroke={color} strokeWidth={sw} />
          <rect x={bx + wall} y={by + wall} width={bw - 2 * wall} height={bh - wall}
            fill={active ? "#0f172a" : "#111827"} stroke={color} strokeWidth={0.8} opacity="0.7" />
        </svg>
      );
    }

    default:
      return null;
  }
}
