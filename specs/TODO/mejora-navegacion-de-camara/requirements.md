---
title: Mejora navegación de cámara
created: 2026-05-09
updated: 2026-05-09
---

# Requirements — Mejora navegación de cámara

## Problem
Al arrastrar una pieza con click izquierdo, los `OrbitControls` siguen activos y la cámara orbita/desplaza a la vez que se mueve la pieza. Eso hace incómodo y poco preciso colocar piezas.

## Goals
- Mover una pieza no debe alterar la cámara (orbit, pan ni zoom).
- Al soltar la pieza, la interacción de cámara vuelve a comportarse como hasta ahora.

## Non-goals
- Vistas predefinidas (top/front/side/iso).
- Zoom-to-fit / encuadre rápido.
- Modo cámara vs modo edición explícito.
- Cambios en el pan con rueda/medio botón.

## User stories / scenarios
- Como usuario, quiero arrastrar una pieza sin que la cámara se mueva, para colocarla con precisión sin recolocar también la vista.

## Acceptance criteria
- [ ] Durante el drag de una pieza la cámara no rota, no se desplaza ni hace zoom.
- [ ] Al soltar (pointerup, también si ocurre fuera del lienzo o se cancela), `OrbitControls` vuelve a responder.
- [ ] Hover/click sobre el fondo o áreas no draggables sigue permitiendo orbitar normalmente.

## Constraints & assumptions
- Se asume drei `OrbitControls makeDefault`, accesible vía `useThree(s => s.controls)`.
- No se introducen modos modales ni atajos nuevos.

## Open questions
- Ninguna.
