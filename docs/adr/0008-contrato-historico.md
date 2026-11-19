# 0008 — Contrato del histórico (parquet, máquina del tiempo, series por cuenca)

- Fecha: 2026-11-18
- Estado: aceptada
- Decide: agente de datos

## Contexto

La máquina del tiempo, el comparador y el gráfico del año hidrológico por cuenca necesitan todo el histórico (1988→hoy, ~2 029 semanas, 402 embalses). Los 402 ficheros `series/{id}.json` no sirven para eso (37 MB en total).

## Decisión

Se añaden, todos validados con Zod (`packages/schema`) y regenerados completos en cada `pnpm data`:

- `historico.parquet`: una fila por embalse y semana desde 1988-01-05 (`fecha, id, slug, demarcacion_codigo, volumen_hm3, capacidad_hm3, pct`), ordenado por fecha e id. Escrito con **`hyparquet-writer` 0.16.13** (JS puro, publicada el 2026-10-19) y leído en tests con `hyparquet` 1.32.0. **No se usa DuckDB para Node**: es una dependencia nativa (binarios por plataforma) que complica Windows y CI sin aportar nada a la escritura; DuckDB (wasm) sigue siendo el lector previsto en el navegador, que lee parquet estándar.
- `tiempo/demarcaciones.json`: formato columnar `{fechas[], series:{ES0xx|nacional: pct[]}, n_nacional[], baja_cobertura:{serie: índices}}`. **Agregación**: suma de volúmenes / suma de capacidades de los embalses con dato esa semana (capacidad de cada fila). Es la cifra "tal como se publicó", **no** la del conjunto común del ADR 0006; el conjunto cambia con los años, así que no sirve para afirmar "más agua que en X" sin esa salvedad. Una semana tiene cobertura baja si su nº de embalses cae por debajo del 90 % del mínimo de las medianas de las 4 semanas previas y las 4 siguientes (caída puntual; un cambio permanente de conjunto no se marca).
- `tiempo/embalses.json`: `{fechas[], ids[], pct[i][j]}` con `null` donde no hay dato. Muestreo **semanal** (0,5 MB gzip, bajo el umbral de 1,5 MB); `mensual` queda como opción en `MUESTREO_TIEMPO_EMBALSES`.
- `series/cuenca-{slug}.json` (15 ficheros): mismo formato que la serie de un embalse (`volumen_hm3` = suma de la cuenca, `pct` = método anterior), para reutilizar `SerieHistorica`. El slug es el de `slugCuenca` de la web.

## Consecuencias

- Cambio **aditivo**: no se tocan `embalses.json`, `resumen.json` ni las series existentes. Afecta a la web solo si consume lo nuevo; `series/` pasa de 402 a 417 ficheros (los `cuenca-*` no son ids de embalse: no iterar `series/` para listar embalses).
- La máquina del tiempo y el gráfico de cuenca deben citar el criterio de agregación y marcar las semanas de `baja_cobertura`.
- Los volúmenes publicados tienen precisión de 1 hm³; los datos son provisionales y todo se reescribe cada semana.
