---
title: Mejora navegación de cámara
created: 2026-05-09
updated: 2026-05-09
---

# Design — Mejora navegación de cámara

## Overview
Suspender los `OrbitControls` mientras dura el drag de una `SingleModule` y restaurarlos al soltar. Cambio puntual y reversible, sin tocar el flujo de cámara fuera del drag.

## Architecture
- `SceneCanvas.tsx` ya monta `<OrbitControls makeDefault … />`, lo que registra el control en el estado de R3F (`useThree(s => s.controls)`).
- `SingleModule.tsx` gestiona el drag con listeners en `document`. Se añade ahí la conmutación `controls.enabled = false/true`.
- No se modifica `MultiModuleScene` ni el store.

## Data model
Sin cambios.

## API / Interfaces
Sin cambios públicos. Internamente, `SingleModule` lee `controls` de `useThree`.

## UI / UX
- Comportamiento de cámara intacto cuando no se está arrastrando una pieza.
- Durante el drag: la cámara queda congelada hasta soltar.

## Trade-offs & alternatives considered
- **Modo modal "cámara/edición"**: descartado, añade fricción y un click extra para algo que el sistema puede deducir.
- **Modificador (Alt/Space) para forzar cámara**: descartado por no ser necesario; el conflicto se resuelve simplemente desactivando los controles durante el drag.
- **`event.stopPropagation` adicional**: ya está; el problema no es propagación, sino que los `OrbitControls` escuchan en el canvas/document.

## Risks
- Si por algún motivo el `pointerup` no llega (ventana pierde foco), los controls quedarían deshabilitados. Mitigación: re-habilitar también en `pointercancel` y en el cleanup del efecto.

## Dependencies
- Ninguna nueva.
