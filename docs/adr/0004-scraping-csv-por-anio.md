# 0004 — Git-scraping: guardar la tabla del MITECO como CSV por año, no el ZIP

- Fecha: 2026-11-17
- Estado: aceptada
- Decide: titular del proyecto

## Contexto

El MITECO sobrescribe cada semana `BD-Embalses.zip` (~10 MB) con todo el histórico, y puede corregir semanas pasadas porque los datos son provisionales. Versionar el ZIP cada semana añadiría unos 0,5 GB de historial al año con diffs binarios ilegibles. El `.mdb` descomprimido supera el límite de 100 MB de GitHub. Git LFS agotaría la cuota gratuita en pocos años.

## Decisión

- El workflow semanal descarga el ZIP, extrae la tabla y la guarda en `data/raw/` como **CSV normalizados, uno por año**: UTF-8, orden estable por fecha y embalse, sin transformar los valores.
- **El ZIP original no se versiona.** Solo se guarda su procedencia en un `.meta.json`: URL, fecha de descarga, tamaño y sha256 del ZIP y de los CSV.
- Hay commit cuando cambia el contenido de algún CSV, aunque no haya semana nueva. Así queda registro de las revisiones del MITECO.

## Consecuencias

- Repositorio ligero. Cada semana cambia sobre todo el CSV del año en curso, y las correcciones de años anteriores se ven en el diff.
- `data/raw/` deja de ser "el fichero tal cual": es la tabla tal cual, en otro formato. El extractor no debe limpiar ni corregir nada; eso es tarea del pipeline.
- Si el MITECO cambia algo que el extractor no captura (columnas nuevas, otra tabla), no queda el original para reprocesar. El extractor debe **fallar** si la estructura no es la esperada, en vez de guardar datos incompletos.
- El ZIP que entró en el commit `cf68fce` se deja en el historial y se deja de seguir a partir de aquí.
