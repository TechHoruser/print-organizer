---
title: Mejora navegación de cámara
created: 2026-05-09
updated: 2026-05-09
---

# Tasks — Mejora navegación de cámara

## Milestone 1 — Congelar cámara durante drag
- [ ] En `src/components/scene/SingleModule.tsx`, leer `controls` con `useThree(s => s.controls)`.
- [ ] En `onPointerDown`, tras marcar `dragging.current = true`, poner `controls.enabled = false`.
- [ ] En el handler `onUp_`, restaurar `controls.enabled = true`. Añadir también listener de `pointercancel` con la misma lógica.
- [ ] Cleanup defensivo: si el componente se desmonta a mitad de drag, asegurar `controls.enabled = true`.

## Follow-ups (post-MVP)
- [ ] (Fuera de scope) Vistas predefinidas y zoom-to-fit como spec separada si se decide.
