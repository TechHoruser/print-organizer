---
title: Detección de colisiones con error
created: 2026-05-08
updated: 2026-05-08
---

# Design — Detección de colisiones con error

## Overview
Añadimos detección de colisiones entre módulos como una función pura sobre la lista de `ModuleInstance`. El resultado (pares en colisión + set de IDs implicados) se expone como un selector derivado del store, sin nuevo estado persistido. El panel lo lee para mostrar un error en rojo cuando hay colisión, y la escena 3D lo lee para resaltar los módulos implicados. La detección se recalcula automáticamente en cada cambio de `modules` (añadir, mover, separar, unir).

## Architecture

```
src/lib/geometry.ts
  └─ detectCollisions(modules)  ← pure function (AABB intersection test)

src/lib/store.ts
  └─ useModuleStore
       └─ selector: collisions  (recomputed from `modules`)

src/components/panel/ControlPanel.tsx
  └─ lee `collisions` → renderiza error en rojo en el bloque de joinStatus

src/components/scene/MultiModuleScene.tsx (+ SingleModule.tsx)
  └─ lee `collisions.idsInCollision` → cambia material/outline de los módulos implicados
```

Flujo:
1. Usuario añade/mueve/separa/une un módulo → `modules` cambia en el store.
2. El selector `collisions` se recalcula (función pura, O(n²) sobre AABBs, n pequeño).
3. Panel y escena re-renderizan automáticamente con el nuevo resultado.

## Data model
No se introducen cambios persistidos en el store. Solo tipos derivados, calculados a partir de `modules`:

```ts
// src/lib/geometry.ts
export type CollisionPair = { aId: string; bId: string };

export type CollisionInfo = {
  pairs: CollisionPair[];
  idsInCollision: Set<string>;
};
```

## API / Interfaces

```ts
// src/lib/geometry.ts
export function detectCollisions(modules: ModuleInstance[]): CollisionInfo;
```

Reglas del test (AABB 3D axis-aligned):
- Para cada par `(a, b)` se calcula el solapamiento en cada eje (`x`, `y`, `z`).
- Hay colisión si el solapamiento es **estrictamente mayor que `EPS = 1.5 mm`** en **todos** los ejes.
- Si en algún eje el solapamiento es ≤ `EPS`, los módulos son tangenciales y **no** cuentan como colisión.

Reusamos el mismo `EPS = 1.5 mm` que ya emplea `buildEdges` en `store.ts`. No es una distancia física: es una tolerancia para absorber errores de coma flotante tras los reposicionamientos (BFS, drags) y mantener el criterio coherente con la detección de adyacencia que usa `join()`.

> Nota de implementación: el porqué de `EPS` debe quedar documentado como comentario en `geometry.ts` junto a la constante / función, para que un futuro lector no lo confunda con un margen de seguridad físico.

## UI / UX

### Mensaje de error en el panel
Se reutiliza el bloque que hoy muestra `joinStatus` en `ControlPanel.tsx:145`, añadiendo una tercera variante en rojo (`border-red-600/30 bg-red-600/10 text-red-300`).

Formato del texto:
- Un solo par: `⚠ Colisión: módulos 1 ↔ 2 se solapan`.
- Varios pares: `⚠ Colisión en N pares: 1↔2 · 2↔3 · 1↔3`.

Prioridad: si hay colisión, el bloque muestra el error en rojo aunque `join()` haya escrito un `joinStatus` previo. La colisión gana al estado de unión.

### Resaltado en el 3D
Los módulos cuyo `id` esté en `collisions.idsInCollision` se renderizan con un material rojo translúcido (`#ef4444` con un toque de emisivo) en lugar del color normal. Al resolverse la colisión, el material vuelve al estado por defecto sin acción del usuario.

## Trade-offs & alternatives considered
- O(n²) sobre AABBs: simple y correcto para el número de módulos esperado (decenas). No hace falta broadphase ni spatial hashing por ahora.
- Selector derivado vs. estado en el store: el derivado evita inconsistencias y paga un recálculo por render. Aceptable porque es O(n²) sobre n pequeño.
- Reusar el bloque de `joinStatus` en lugar de crear uno nuevo: menos UI, pero acopla colisión y unión en el mismo widget. Asumido OK porque la prioridad (colisión > unión) es clara.

## Risks
- Los templates con geometría no rectangular (ranuras, paredes huecas) usan el bounding box completo, no la forma real. Aceptable para el MVP: el usuario quiere que las cajas nominales no se solapen.
- Si en el futuro los módulos pueden rotar, el test AABB deja de ser válido y habrá que migrar a OBB / SAT.

## Dependencies
- Ninguna nueva. Three.js / React Three Fiber y Zustand ya están en el proyecto.
