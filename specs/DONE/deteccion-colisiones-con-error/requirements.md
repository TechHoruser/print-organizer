---
title: Detección de colisiones con error
created: 2026-05-08
updated: 2026-05-08
---

# Requirements — Detección de colisiones con error

## Problem
Hoy el editor permite añadir y posicionar módulos en el plano sin validar que sus volúmenes no se intersequen. Es posible dejar dos módulos físicamente acoplados/penetrándose y la UI sigue indicando estados positivos (p. ej. "Unión correcta (0 conexiones)"), sin ningún aviso de error.

Esto produce diseños imprimibles inválidos: piezas que en el mundo real no encajarían, magnetismo mal calculado y pérdida de tiempo/material al detectarlo solo al imprimir o ensamblar.

## Goals
- Detectar cuando dos o más módulos del plano se intersecan (sus volúmenes 3D se solapan).
- Mostrar un mensaje de error claro en el panel lateral, en lugar del estado "Unión correcta".
- Resaltar visualmente en el 3D los módulos involucrados en la colisión (cambio de color/outline) para que el usuario los identifique de un vistazo.

## Non-goals
- Bloquear o impedir la acción "Unir" cuando hay colisión — solo avisamos, el usuario decide.
- Auto-resolver colisiones moviendo módulos automáticamente.
- Detectar "casi colisión" (módulos demasiado cerca sin tocarse); eso lo cubre `MARGEN MÍNIMO`.
- Validar colisiones con elementos que no sean módulos (imanes individuales, plano base, etc.).

## User stories / scenarios
- Como diseñador de la pieza, quiero que el editor me avise cuando dos módulos se intersecan, para no exportar/imprimir un diseño físicamente inválido.
- Como diseñador, quiero ver resaltados en el 3D los módulos que colisionan, para identificar rápidamente cuáles tengo que mover.

## Acceptance criteria
- [ ] Cuando dos módulos del plano tienen volúmenes que se intersecan (solapamiento > 0), el panel muestra un mensaje de error en rojo en el mismo lugar donde hoy aparece "Unión correcta".
- [ ] El mensaje indica cuántos módulos están en colisión y cuáles (por nombre/índice).
- [ ] Los módulos en colisión se renderizan en el 3D con un color/outline distinto al normal.
- [ ] Si los módulos solo se tocan tangencialmente (caras coincidentes, sin solapar volumen), no se considera colisión.
- [ ] Al separar/mover los módulos hasta eliminar la intersección, el error desaparece y el resaltado vuelve al estado normal.

## Constraints & assumptions
- Los módulos actuales son cajas axis-aligned (AABB), así que la detección puede resolverse con un test AABB simple y barato.
- La validación tiene que correr en cada cambio relevante (añadir, mover, separar, unir) sin lag perceptible en la UI.

## Open questions
- Color exacto del resaltado de módulos en colisión.
- Formato del mensaje: ¿agrupado (n módulos en colisión) o listando los pares uno a uno?
- Comportamiento esperado cuando 3+ módulos se solapan a la vez.
