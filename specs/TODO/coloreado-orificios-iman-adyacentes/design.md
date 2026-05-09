---
title: Coloreado de orificios de imán según adyacencia
created: 2026-05-08
updated: 2026-05-09
---

# Design — Coloreado de orificios de imán según adyacencia

## Overview
Calcular el estado de cada orificio de imán (verde / amarillo / rojo) cruzando los `LabeledHole` de todos los módulos contra las superficies y orificios de los módulos vecinos. El cálculo vive como selector derivado del store de zustand: se ejecuta de forma síncrona en el hilo principal solo cuando cambian módulos, posiciones u orificios, y lo consumen tanto la escena 3D como el panel **IMANES (GLOBAL)** sin recalcular.

## Architecture

Componentes:

- **`src/lib/magnetMatching.ts`** (nuevo): función pura `computeHoleStates(modules)` → `Map<holeKey, "green" | "yellow" | "red">`. Solo depende de tipos/geometría, no del renderer.
- **`src/lib/store.ts`**: selector derivado `useHoleStates()` que recalcula solo cuando cambian módulos, posiciones u orificios.
- **`src/components/scene/SingleModule.tsx`** (o donde se rendericen los orificios): consume el estado por `holeKey` y aplica color al material del orificio.
- **`src/components/panel/PropertiesPanel.tsx`**: añade la sección **IMANES (GLOBAL)** con el contador y su color derivado (verde si 0, rojo si hay al menos un rojo, amarillo en otro caso).

Flujo de datos:

```
modules (zustand)
   │
   ▼
computeHoleStates  ──►  holeStates: Map<key, color>
   │                          │
   │                          ├──► Scene → tinta cada orificio
   │                          └──► PropertiesPanel · IMANES (GLOBAL) → contador + color
```

## Data model

Estado por orificio (palabra semántica + color asociado):

| Estado     | Color    | Significado                                                     |
| ---------- | -------- | --------------------------------------------------------------- |
| `matched`  | verde    | Tiene contraparte que casa en otra pieza.                       |
| `isolated` | amarillo | No toca ninguna otra pieza.                                     |
| `blocked`  | rojo     | Toca otra pieza pero ahí no hay orificio que case.              |

Estado global del panel:

| Estado    | Color    | Regla                                                           |
| --------- | -------- | --------------------------------------------------------------- |
| `ok`      | verde    | Sin orificios `isolated` ni `blocked`.                          |
| `warning` | amarillo | Hay `isolated` pero ningún `blocked`.                           |
| `error`   | rojo     | Hay al menos un `blocked`.                                      |

Tipos:

```ts
// src/lib/magnetMatching.ts
export type HoleState = "matched" | "isolated" | "blocked";
export type HoleStates = Map<string, HoleState>; // key = LabeledHole.key

export type GlobalMagnetStatus = "ok" | "warning" | "error";

export type GlobalMagnetSummary = {
  unmatchedCount: number;        // isolated + blocked
  status: GlobalMagnetStatus;
};
```

El mapeo estado → color vive en un único lugar (p. ej. `HOLE_STATE_COLOR` y `GLOBAL_STATUS_COLOR`) para que la UI no defina sus propios colores ad hoc.

## API / Interfaces

Funciones puras (en `src/lib/magnetMatching.ts`):

```ts
export function computeHoleStates(modules: Module[]): HoleStates;
export function summarizeMagnets(states: HoleStates): GlobalMagnetSummary;

export const HOLE_STATE_COLOR: Record<HoleState, string>;
export const GLOBAL_STATUS_COLOR: Record<GlobalMagnetStatus, string>;
```

Hook único expuesto desde el store (un solo cálculo por cambio relevante):

```ts
// src/lib/store.ts
export function useMagnetMatching(): {
  states: HoleStates;
  summary: GlobalMagnetSummary;
};
```

Razón de un único hook: el resumen depende de los estados, así que recalcularlos en hooks separados duplicaría trabajo y abriría la puerta a desincronizaciones. Con un solo hook, escena y panel leen la misma instantánea.

## UI / UX

### Escena 3D

- Cada orificio (mesh cilíndrico interior) se pinta con el color de su estado vía `HOLE_STATE_COLOR[state]` aplicado al `MeshStandardMaterial.color`. Se añade un valor pequeño de `emissiveIntensity` para que el color se distinga dentro del orificio aun con poca luz.
- Sin animaciones; el cambio de color es inmediato al recalcular el estado.

### `PropertiesPanel` — sección IMANES (GLOBAL)

- Sección siempre visible mientras el panel esté abierto, con título `IMANES (GLOBAL)`.
- Línea principal: `Imanes sin match: N`, donde `N = summary.unmatchedCount` (cuenta `isolated` + `blocked`).
- Color del bloque (badge o background) según `GLOBAL_STATUS_COLOR[summary.status]`:
  - `ok` (verde) cuando `N = 0`.
  - `warning` (amarillo) cuando hay `isolated` pero ningún `blocked`.
  - `error` (rojo) cuando hay al menos un `blocked`.
- La información es agregada de toda la escena, no de la pieza seleccionada.

## Trade-offs & alternatives considered
- **Síncrono vs. Web Worker**: elegimos síncrono; más simple. Si el número de módulos crece y se nota en el rendimiento, se migra a worker.
- **Un hook vs. dos hooks**: un único `useMagnetMatching()` evita recalcular el resumen de forma separada y desincronizaciones.
- **Tintar material vs. mesh extra (anillo/halo)**: tintar el material existente; menos geometría y suficiente para distinguir los estados visualmente.

## Risks
- Falsos positivos en `blocked` por imprecisión geométrica con la tolerancia de 0.1 mm.
- Coste del cálculo si crece el número de módulos/orificios (mitigable con Web Worker o índice espacial).
- Inestabilidad de `LabeledHole.key` entre cambios de módulo → el mapa de estados fallaría; hay que garantizar que las claves sean estables.

## Dependencies
- Usa `Vector3` y tipos existentes de `src/lib/geometry.ts` y `src/lib/store.ts`.
- No introduce dependencias nuevas.
