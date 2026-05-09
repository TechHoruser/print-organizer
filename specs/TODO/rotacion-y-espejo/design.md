---
title: Rotación y espejo
created: 2026-05-09
updated: 2026-05-09
---

# Design — Rotación y espejo

## Overview
Las piezas (`ModuleInstance`) son cajas alineadas con los ejes — no tienen campo de rotación en el modelo. Las tres operaciones (rotar ±90°, espejo vertical) se implementan como **transformaciones puras sobre los datos**: intercambio de dimensiones y remapeo de claves de `activeHoles`. No se necesita ningún cambio en el pipeline de geometría Three.js ni en CSG.

## Architecture

```
PropertiesPanel (UI)
   └── botones Rotar +90° / Rotar −90° / Espejo ↔
         └── llaman a nuevas acciones del store:
               rotateModule(id, +90 | -90)
               mirrorModule(id)
                     └── updateModule(id, patch)  ← ya existe
```

- `store.ts` recibe dos nuevas acciones que calculan el patch y lo aplican vía `updateModule`.
- `PropertiesPanel.tsx` añade los tres botones de acción en la sección de cabecera (visible solo cuando hay módulo seleccionado).

## Data model

`ModuleInstance` (sin cambios de esquema):

| Campo | Descripción |
|---|---|
| `widthMm` | Extensión en eje X |
| `depthMm` | Extensión en eje Z |
| `activeHoles` | Claves `"<face>-<idx>"` p.ej. `"north-0"`, `"east-1"` |

No se añaden campos nuevos — las transformaciones son stateless.

## API / Interfaces

### `rotateModule(id: string, deg: 90 | -90): void`

Swap `widthMm` ↔ `depthMm` y remap de `activeHoles`:

**Rotación +90° (horario, vista cenital):**
```
north → east
east  → south
south → west
west  → north
```

**Rotación −90° (antihorario):**
```
north → west
west  → south
south → east
east  → north
```

Los índices de cada hueco (`-0`, `-1`, …) se conservan.

### `mirrorModule(id: string): void`

Solo remap de caras (`widthMm`/`depthMm` sin cambio):
```
east  ↔ west
north → north  (sin cambio)
south → south  (sin cambio)
```

### Función auxiliar `remapHoles`
```ts
function remapHoles(
  holes: string[],
  map: Record<string, string>,   // { north: "east", east: "south", ... }
): string[] {
  return holes.map(key => {
    const [face, idx] = key.split("-");
    return `${map[face] ?? face}-${idx}`;
  });
}
```

## UI / UX

Los tres botones se añaden al `PropertiesPanel`, en la cabecera debajo del nombre de la plantilla, solo visibles cuando hay módulo seleccionado. Iconografía de rotación (⟳ / ⟲) y espejo (⇔).

```
[ ⟲ −90° ]  [ ⟳ +90° ]  [ ⇔ Espejo ]
```

## Trade-offs & alternatives considered

- **Transform matrix en Three.js**: añadir un campo `rotationDeg` a `ModuleInstance` y aplicar una rotación en el renderizado. Descartado — la geometría ya se genera a partir de `widthMm`/`depthMm`, y los agujeros de imán dependen de las caras nombradas. Un campo de rotación requeriría propagar el ángulo a `computeAllPotentialHoles`, `buildEdges` y al exportador STL.
- **Transformación pura sobre datos** (elegido): más simple, no rompe ningún sistema existente, y el resultado es idéntico a haber creado la pieza ya rotada.

## Risks

- `activeHoles` con índices altos podría no coincidir si `depthMm` → `widthMm` genera menos huecos disponibles. Tras la rotación, el recálculo de geometría ignorará los huecos inválidos (ya sucede hoy con `computeAllPotentialHoles` + filtro).

## Dependencies

- Spec `deteccion-colisiones-con-error`: las colisiones se recalculan automáticamente porque `detectCollisions` usa `widthMm`/`depthMm` actualizados.
- Spec futura de **deshacer/redo**: las acciones de rotación y espejo deben ser registradas en el historial cuando esa spec se implemente.
