---
title: Detección de colisiones con error
created: 2026-05-08
updated: 2026-05-08
---

# Tasks — Detección de colisiones con error

## Milestone 1 — Detección + UI
- [x] `detectCollisions(modules)` en `src/lib/geometry.ts` (test AABB 3D, `EPS = 1.5 mm`).
- [x] Tipos `CollisionPair` y `CollisionInfo` exportados desde `geometry.ts`.
- [x] Selector derivado en `ControlPanel.tsx` (`useMemo` sobre `modules`).
- [x] Mensaje de error en rojo con prioridad sobre `joinStatus` y formato 1 par / N pares.
- [x] Resaltado rojo translúcido de los módulos en colisión en `SingleModule.tsx` vía nueva prop `isInCollision`, alimentada desde `MultiModuleScene.tsx`.

## Follow-ups (post-MVP)
- [ ] Decidir si listar pares uno a uno o agrupar cuando hay 3+ módulos solapados.
- [ ] Migrar a OBB / SAT si en el futuro los módulos pueden rotar.
- [ ] Considerar broadphase si el número de módulos crece (hoy O(n²) basta).
