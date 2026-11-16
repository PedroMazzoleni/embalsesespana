# 0002 — Licencias: MIT para el código, CC BY 4.0 para los datos derivados

- Fecha: 2026-11-17
- Estado: aceptada
- Decide: titular del proyecto

## Contexto

Las opciones y su compatibilidad con las fuentes están analizadas en `docs/reutilizacion-atribucion.md` (sección 4). Las capas del MITECO (Inventario de Presas, demarcaciones) son CC BY 4.0, y el histórico del boletín se rige por las condiciones generales de la Ley 37/2007 y del RD 1495/2011 (citar la fuente, indicar la fecha de actualización, no desvirtuar).

## Decisión

- **Código:** MIT (`LICENSE` en la raíz).
- **Datos derivados: CC BY 4.0**, con obligación de mantener la atribución al MITECO en cascada. Incluye todo lo que genera el pipeline (`packages/web/public/data/`: `embalses.json`, `series/`, `resumen.json`, `historico.parquet`) y las tablas curadas de `data/master/` y `data/geo/`.
- **Datos de origen** (`data/raw/`): no son nuestros. Conservan las condiciones de su fuente, MITECO (RD 1495/2011; CC BY 4.0 en las capas IDE).
- **Quedan fuera:** las fotos, que conservan cada una su licencia; los textos editoriales, que se decidirán aparte si hace falta; y el mapa base, que se rige por ODbL/OSM si se usa.

## Consecuencias

- **Dónde se declara cada licencia:** `LICENSE` (MIT) solo cubre el código; `README.md` y `data/LICENSE.md` explican las licencias de los datos. El pipeline generará un aviso equivalente en `public/data/`, que no se edita a mano.
- **Pie de la web:** "Código: MIT · Datos: CC BY 4.0", junto a la atribución al MITECO.
- **Metadatos de los datos publicados:** deben llevar la atribución, las fechas de actualización de la fuente (Anexo de `docs/reutilizacion-atribucion.md`), `licencia`, `licencia_url` y una nota de modificaciones (p. ej., geometrías simplificadas). Es un cambio de contrato para `datos` en la Fase 2, con su ADR.
- **OpenStreetMap:** si algún día se mezclan sus datos en la tabla maestra, habrá que revisar esta decisión, porque ODbL pasaría a ser obligatoria para esa parte.
