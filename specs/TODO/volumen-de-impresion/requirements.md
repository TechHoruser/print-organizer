---
title: Volumen de impresión
created: 2026-05-08
updated: 2026-05-08
---

# Requirements — Volumen de impresión

## Problem
Hoy el usuario diseña piezas en el espacio 3D sin ninguna referencia visual del volumen real de su impresora. No hay forma de saber, antes de exportar, si una pieza cabe en el área imprimible. Esto se descubre tarde (al fallar la impresión) y obliga a rehacer el diseño.

## Goals
- Detectar piezas que excedan el volumen de impresión (caja X×Y×Z) y dejar el problema evidente a simple vista.
- El volumen de impresión está **oculto por defecto**: solo se muestra cuando al menos una pieza lo excede.
- Cuando se muestra, el feedback visual consiste en:
  - Las **aristas** del cubo X×Y×Z dibujadas en naranja, centrado en el centro del **AABB** de la pieza que excede (un cubo por cada pieza que excede).
  - El **plano de intersección** entre la(s) cara(s) del cubo y la pieza que se sale, dibujado también en naranja.
  - La **pieza** que excede el volumen, repintada en naranja.
- Las dimensiones X, Y, Z se leen del estado global, configurable desde el modal de configuración (spec `settings-modal`).

## Non-goals
- Persistir las dimensiones del volumen entre sesiones (sigue la misma política que el resto de settings).
- Reorientar/empaquetar automáticamente piezas para que quepan.
- Soportar volúmenes no-rectangulares (delta, cilíndricos, etc.).
- Validar otros límites físicos (peso, tiempo de impresión, soportes).

## User stories / scenarios
- Como diseñador, quiero que las piezas que no caben en el volumen de impresión se resalten automáticamente en naranja, para detectar el problema sin medir manualmente.
- Como diseñador, quiero ver el recuadro del volumen y el plano donde la pieza se sale, para entender por qué borde y cuánto se está excediendo.
- Como diseñador, no quiero ver el recuadro cuando todo cabe, para no saturar la escena con elementos innecesarios.

## Acceptance criteria
- [ ] Cuando ninguna pieza excede el volumen, ni el cubo ni los planos de intersección son visibles.
- [ ] Cuando una pieza excede el volumen, se dibuja un cubo X×Y×Z centrado en el centro de su AABB, con las aristas en naranja.
- [ ] Si varias piezas exceden simultáneamente, se dibuja un cubo por cada pieza (cada uno centrado en el AABB de su propia pieza).
- [ ] Para cada pieza que excede, se dibuja en naranja el plano (o planos) de intersección entre la cara del cubo correspondiente y la pieza.
- [ ] La pieza que excede se repinta en naranja, reemplazando su color habitual.
- [ ] Mover, escalar o rotar una pieza actualiza el estado visual en tiempo real: el cubo, los planos de intersección y el color de la pieza aparecen, desaparecen o se reposicionan según el AABB actual.
- [ ] Cambiar X/Y/Z desde el modal de configuración recalcula la detección y actualiza la escena inmediatamente, sin reabrir el modal.

## Constraints & assumptions
- El AABB se calcula sobre la pieza en sus coordenadas de escena (tras rotación, escala y posición) y se recomputa ante cualquier cambio de transformación.
- La detección y el render ocurren en cliente, sobre la escena 3D existente.
- Las dimensiones X, Y, Z viven en el estado global y se exponen vía la spec `settings-modal`; esta spec depende de esa.
- El feature solo se activa si X, Y, Z tienen valores definidos (>0).

## Open questions
- La spec `settings-modal` actual no contempla X/Y/Z: ¿se amplía esa spec o se añade aquí la extensión de settings?
- ¿Hay un valor por defecto razonable para X/Y/Z (p. ej. 256×256×256 mm) o se deja sin definir hasta que el usuario lo introduzca?
- Tono exacto de naranja: ¿reusar el de la spec `coloreado-orificios-iman-adyacentes` o uno distinto?
- Cuando varias piezas exceden y sus AABBs se solapan, los cubos también pueden solaparse visualmente; ¿pasa nada o necesitamos un comportamiento especial?
