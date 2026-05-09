---
title: Rotación y espejo
created: 2026-05-09
updated: 2026-05-09
---

# Tasks — Rotación y espejo

> Cada milestone es una unidad mergeable.

## Milestone 1 — Lógica en el store
- [x] Añadir función auxiliar `remapHoles(holes, map)` en `store.ts`
- [x] Añadir acción `rotateModule(id, deg: 90 | -90)` en `store.ts`
- [x] Añadir acción `mirrorModule(id)` en `store.ts`
- [x] Exponer ambas acciones en el tipo `ModuleState`

## Milestone 2 — UI en PropertiesPanel
- [x] Añadir botones ⟲ −90°, ⟳ +90°, ⇔ Espejo en la cabecera del `PropertiesPanel`
- [x] Los botones llaman a `rotateModule` / `mirrorModule` del store

## Follow-ups (post-MVP)
- [ ] Integrar con historial de deshacer cuando se implemente esa spec
