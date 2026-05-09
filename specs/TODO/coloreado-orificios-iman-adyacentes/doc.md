---
title: Coloreado de orificios de imán según adyacencia
created: 2026-05-08
updated: 2026-05-08
---

# Documentación complementaria

## Flujo de datos del coloreado de orificios

```
modules (zustand)
   │
   ▼
computeHoleStates  ──►  holeStates: Map<key, color>
   │                          │
   │                          ├──► Scene → tinta cada orificio
   │                          └──► Panel global → contador + color
```

- `modules` son la fuente de verdad en el store de zustand.
- `computeHoleStates(modules)` es una función pura en `src/lib/magnetMatching.ts` que devuelve un `Map<holeKey, "green" | "yellow" | "red">`.
- El selector derivado `useHoleStates()` solo recalcula cuando cambian módulos, posiciones u orificios.
- Dos consumidores leen el mismo mapa:
  - La escena 3D, que aplica color a cada orificio por su `holeKey`.
  - El panel **IMANES (GLOBAL)**, que cuenta y colorea el indicador agregado.
