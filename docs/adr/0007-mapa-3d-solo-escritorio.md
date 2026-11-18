# 0007 — Mapa 3D: automático en escritorio, a petición en móvil

- Fecha: 2026-11-18
- Estado: aceptada
- Decide: titular del proyecto

## Contexto

El mapa interactivo de `/mapa` (MapLibre GL con relieve e inclinación) añade unos 300 KB comprimidos de JS. Cuando se cargaba solo al entrar en pantalla, Lighthouse móvil daba 66 de rendimiento en `/mapa`, por debajo del mínimo de 90 que fija el `CLAUDE.md`. El mapa SVG generado en build ya funciona sin JS de mapa: se selecciona con clic o teclado y tiene tabla.

## Decisión

- **Escritorio** (ancho ≥ 64rem, sin ahorro de datos): el mapa 3D se carga solo, como hasta ahora.
- **Móvil o ahorro de datos**: se muestra el mapa SVG con un botón «Ver en 3D con relieve», que descarga MapLibre al pulsarlo.

## Consecuencias

- Lighthouse móvil de `/mapa` pasa a 98, sin excepciones al presupuesto.
- El comportamiento depende del dispositivo. Las pruebas de Playwright aceptan las dos variantes (canvas 3D o SVG).
- Si en el futuro se reduce mucho el peso del mapa (p. ej. otro motor más ligero), se puede revisar esta decisión.
