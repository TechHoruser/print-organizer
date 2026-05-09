---
title: Implementación correcta de unir/separar
created: 2026-05-08
updated: 2026-05-08
---

# Requirements — Implementación correcta de unir/separar

## Problem
Hoy `unir` y `separar` sólo reorganizan piezas que ya están perfectamente adyacentes (tolerancia ~1.5mm en `buildEdges`). Si el usuario coloca dos piezas "cerca" pero no exactamente tocándose, el sistema las ignora: no las pega ni las separa. Además, cuando sí las pega, alinea por los centros — sin tener en cuenta los orificios de imán, así que aunque queden tocándose pueden quedar desalineadas y los imanes no casan.

## Goals
- `unir` debe pegar (gap=0) cualquier par de piezas que estén "cerca" entre sí, no sólo las ya adyacentes.
- `separar` debe tratar como conectadas a las piezas cercanas (mismo criterio que `unir`) y aplicar el gap habitual entre ellas.
- Al pegar, deslizar la pieza a lo largo de la cara de contacto buscando el **menor desplazamiento** posible que haga casar al menos un par de orificios de imán.
- Criterio de "cerca": distancia entre piezas ≤ `gap × 2` (con el gap de separación actual).
- El gap de `separar` pasa a ser configurable (parámetro en el store, default 20mm). La UI para editarlo va en una spec aparte (modal de settings).

## Non-goals
- Rotar piezas automáticamente al pegar — sólo desplazamiento a lo largo de la cara de contacto.
- "Atracción global": piezas que no estén cerca (> `gap × 2`) no se mueven.
- Bloquear `unir` cuando no se logra alinear ningún imán — se pega igualmente; el aviso visual lo da `coloreado-orificios-iman-adyacentes`.
- Resolver colisiones que pueda producir el snap — lo cubre `deteccion-colisiones-con-error`.

## User stories / scenarios
- Como diseñador, cuando coloco dos piezas más o menos juntas y pulso `Unir`, quiero que se peguen sin tener que alinearlas a mano.
- Como diseñador, cuando pulso `Unir`, quiero que las piezas se desplacen lo justo para que sus orificios de imán casen, en lugar de quedar pegadas pero con los imanes desalineados.
- Como diseñador, cuando pulso `Separar`, quiero que todas las piezas queden con al menos el gap configurado (default 20mm) entre ellas, incluso las que estaban cerca pero no exactamente tocándose.

## Acceptance criteria
- [ ] Pulsar `Unir` con dos piezas separadas por ≤ `gap × 2` las deja con distancia 0 entre las caras enfrentadas.
- [ ] Pulsar `Unir` con dos piezas separadas por > `gap × 2` no las mueve.
- [ ] Al pegar dos piezas, el desplazamiento lateral elegido es el menor posible que haga casar al menos un par de orificios de imán de las caras enfrentadas.
- [ ] Si ninguna combinación de desplazamiento dentro de los límites de la cara hace casar imanes, las piezas se pegan alineadas como hasta ahora (sin desplazamiento extra).
- [ ] Pulsar `Separar` deja entre cada par de piezas cercanas exactamente el gap configurado.
- [ ] El gap de `separar` se lee de un parámetro del store (default 20mm); cambiar ese valor cambia el resultado de `Separar` sin tocar código.
- [ ] Las piezas que estaban a > `gap × 2` de cualquier otra no se mueven al pulsar `Unir` ni `Separar`.

## Constraints & assumptions
- <Technical, product, or timing constraints>

## Open questions
- <Unresolved decisions>
