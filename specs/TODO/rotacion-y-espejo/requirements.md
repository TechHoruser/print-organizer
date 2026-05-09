---
title: Rotación y espejo
created: 2026-05-08
updated: 2026-05-08
---

# Requirements — Rotación y espejo

## Problem
Una pieza no simétrica puede necesitar cambiar de orientación para que sus huecos o formas queden mejor ubicados. Hoy no hay forma de rotarla 90°/-90° ni de reflejarla (modo espejo) dentro del editor.

## Goals
- Rotar la pieza seleccionada 90° y -90°.
- Reflejar (modo espejo) la pieza seleccionada sobre el eje vertical (flip izquierda↔derecha), preservando la base con los imanes.
- Operación aplicada a una sola pieza a la vez (la seleccionada).

## Non-goals
- Espejo sobre eje horizontal (invertiría la base con los imanes).
- Rotaciones libres por ángulos arbitrarios.
- Aplicar la transformación a varias piezas a la vez o a todo el canvas.

## User stories / scenarios
- Como usuario, quiero rotar la pieza seleccionada 90° (horario) para reorientar sus huecos.
- Como usuario, quiero rotar la pieza seleccionada -90° (antihorario) para lo mismo.
- Como usuario, quiero reflejarla sobre el eje vertical para invertir la disposición de los huecos sin cambiar la base.

## Acceptance criteria
- [ ] Existe acción "Rotar 90°" que rota la pieza seleccionada en sentido horario.
- [ ] Existe acción "Rotar -90°" que rota la pieza seleccionada en sentido antihorario.
- [ ] Existe acción "Espejo vertical" que refleja la pieza seleccionada izquierda↔derecha.
- [ ] Las acciones solo están disponibles cuando hay una pieza seleccionada.
- [ ] Tras la operación, la pieza queda dentro de los límites del canvas (o se respeta la regla actual de límites del editor).
- [ ] Las colisiones con otras piezas se recalculan tras la transformación.

## Constraints & assumptions
- La rotación se aplica alrededor del centro propio de la pieza.
- Si tras la transformación la pieza queda fuera del canvas o colisiona con otra, no se bloquea ni se reposiciona: se respeta el comportamiento existente de detección de colisiones con error.

## Open questions
- ¿Atajos de teclado para rotar/reflejar?
- ¿Dónde se exponen las acciones en la UI (toolbar, menú contextual, panel de propiedades)?
