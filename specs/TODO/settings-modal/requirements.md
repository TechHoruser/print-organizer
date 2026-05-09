---
title: Settings modal
created: 2026-05-08
updated: 2026-05-08
---

# Requirements — Settings modal

## Problem
El panel lateral mezcla parámetros que el usuario toca en cada sesión (módulos, plantillas, dimensiones, conexiones) con parámetros que casi nunca cambia una vez configurados (altura/margen/separación de imanes, gap de separación, dimensiones del imán de referencia). Eso satura el panel y dificulta el flujo de diseño habitual. Estos parámetros "estables" deberían vivir en un modal de configuración, accesible desde un botón inferior, fuera del panel principal.

## Goals
- Añadir un botón de "Configuración" en la parte inferior del panel lateral que abra un modal.
- El modal contiene los parámetros editables que hoy están en la sección **Imanes (global)** y el nuevo gap de `separar`:
  - Modo espejo (centrado).
  - Altura centro de imán.
  - Margen mínimo.
  - Separación de imanes.
  - Gap de `separar` (default 20mm).
- Mostrar dentro del modal, como referencia no editable: Ø imán, profundidad del imán, valores de la cuadrícula.
- Eliminar la sección **Imanes (global)** del panel lateral; queda en el panel sólo lo que se toca durante el diseño (lista de módulos, plantilla, dimensiones, conexiones, unir/separar, exportar).
- Los cambios en el modal aplican inmediatamente al estado global y se reflejan en la escena 3D y en el panel lateral sin reabrir el modal.

## Non-goals
- Persistir la configuración entre sesiones — hoy no se persiste y este spec no lo añade. (Posible follow-up.)
- Añadir parámetros editables nuevos más allá de los que se mueven; Ø imán, profundidad y cuadrícula siguen siendo constantes.
- Rediseñar el panel lateral más allá de quitar la sección que se mueve y añadir el botón de configuración.
- Importar/exportar configuración a archivo.

## User stories / scenarios
- As a <role>, I want <action>, so that <outcome>.

## Acceptance criteria
- [ ] <Observable, testable condition>

## Constraints & assumptions
- <Technical, product, or timing constraints>

## Open questions
- <Unresolved decisions>
