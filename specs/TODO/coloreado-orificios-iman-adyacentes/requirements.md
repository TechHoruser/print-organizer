---
title: Coloreado de orificios de imán según adyacencia
created: 2026-05-08
updated: 2026-05-08
---

# Requirements — Coloreado de orificios de imán según adyacencia

## Problem
Cuando se crean dos piezas con orificios de imán, los orificios de una pieza tienen que alinear con los de la otra para que el imán una ambas y las piezas encajen. Hoy es posible marcar orificios en pieza A y en pieza B sin que lleguen a coincidir en posición, y no hay señal visual que lo advierta — el resultado es que se imprimen piezas incompatibles que no se unen.

## Goals
- Pintar en **verde** los orificios de imán que casan con otro orificio de otra pieza (formarán par).
- Pintar en **amarillo** los orificios sin contraparte y sin contacto con otra pieza (aislados).
- Pintar en **rojo** los orificios que tocan otra pieza pero esa pieza no tiene orificio en ese punto (incompatibilidad: el imán chocaría contra material macizo).
- Mostrar un contador "Imanes sin match" en la sección **IMANES (GLOBAL)** con la suma de orificios amarillos + rojos. Color: **verde** si vale 0, **rojo** si hay al menos un orificio rojo, **amarillo** en otro caso.

## Non-goals
- Ninguno explícito.

## User stories / scenarios
- Como diseñador de piezas, quiero ver qué orificios de imán casan con otra pieza y cuáles no, para corregir incompatibilidades antes de imprimir.

## Acceptance criteria
- [ ] Un orificio de imán se pinta **verde** si tiene otro orificio de imán en otra pieza que casa con él.
- [ ] Un orificio de imán se pinta **amarillo** si no tiene contacto con ninguna otra pieza.
- [ ] Un orificio de imán se pinta **rojo** si toca otra pieza y en ese punto la otra pieza no tiene orificio de imán.
- [ ] La sección **IMANES (GLOBAL)** muestra el contador "Imanes sin match" con la suma de orificios amarillos + rojos.
- [ ] El contador se pinta **verde** si vale 0, **rojo** si existe al menos un orificio rojo, y **amarillo** en otro caso.
- [ ] Los colores y el contador se actualizan al añadir, mover o eliminar orificios o piezas.

## Constraints & assumptions
- Dos orificios "casan" cuando se cumple todo lo siguiente:
  - Distancia entre centros < 0.1 mm.
  - Mismo diámetro y profundidad.
  - Ejes alineados (orientación coincidente / colineal).
  - Distancia entre las dos piezas (separación de superficies en el punto de contacto) < 0.1 mm.

## Open questions
- Ninguna por ahora.
