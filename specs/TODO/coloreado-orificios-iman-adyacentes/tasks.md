---
title: Coloreado de orificios de imán según adyacencia
created: 2026-05-08
updated: 2026-05-08
---

# Tasks — Coloreado de orificios de imán según adyacencia

> Break the design into ordered, mergeable units of work. Each task should be small enough to ship in one PR.

## Milestone 1 — Lógica de matching
- [ ] Crear `src/lib/magnetMatching.ts` con tipos `HoleState`, `GlobalMagnetStatus`, `HoleStates`, `GlobalMagnetSummary`.
- [ ] Añadir constantes `HOLE_STATE_COLOR` y `GLOBAL_STATUS_COLOR`.
- [ ] Implementar `computeHoleStates(modules)` con la lógica de matching (tolerancia 0.1 mm, mismo diámetro/profundidad/eje, separación entre piezas < 0.1 mm).
- [ ] Implementar `summarizeMagnets(states)`.
- [ ] Añadir hook `useMagnetMatching()` en `src/lib/store.ts`.

## Milestone 2 — Coloreado en escena 3D
- [ ] Consumir `useMagnetMatching()` en `src/components/scene/SingleModule.tsx`.
- [ ] Aplicar `HOLE_STATE_COLOR[state]` al `MeshStandardMaterial` de cada orificio de imán con `emissiveIntensity` suave.

## Milestone 3 — Sección IMANES (GLOBAL) en PropertiesPanel
- [ ] Añadir sección `IMANES (GLOBAL)` en `src/components/panel/PropertiesPanel.tsx`.
- [ ] Mostrar `Imanes sin match: N` con color de fondo según `GLOBAL_STATUS_COLOR[summary.status]`.

## Follow-ups (post-MVP)
- [ ] Tests unitarios de `computeHoleStates` (tolerancia límite, pieza sin orificios, orificio en borde).
- [ ] Migrar cálculo a Web Worker si hay degradación de rendimiento.
