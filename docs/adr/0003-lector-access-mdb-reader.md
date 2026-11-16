# 0003 — El histórico del MITECO es una base Access: leerla con mdb-reader

- Fecha: 2026-11-17
- Estado: aceptada
- Decide: titular del proyecto

## Contexto

El stack preveía SheetJS o ExcelJS para el "Excel histórico" del Boletín Hidrológico. En la Fase 0 (`docs/contrato-datos.md`) se vio que `BD-Embalses.zip` contiene una base **Microsoft Access** (`BD-Embalses.mdb`, formato Access 2000–2003) con una sola tabla. Las librerías de Excel no la leen. La alternativa nativa, `mdb-tools`, exige un binario que no está en Windows de serie y rompe el criterio de "Node + TypeScript en todo".

## Decisión

Leer la fuente con **`mdb-reader`** (JavaScript puro) y descomprimir el ZIP en memoria con **`fflate`**. Sustituyen a SheetJS/ExcelJS en la fila "Excel" del stack de `CLAUDE.md`.

## Consecuencias

- Funciona igual en local (Windows) y en GitHub Actions, sin dependencias nativas. Ya está probado con el fichero real en los scripts de `scripts/fase0/`.
- El nombre de la tabla incluye el año (`T_Datos Embalses 1988-AAAA`). El pipeline debe localizarla por prefijo, no por nombre exacto.
- Si el MITECO vuelve a publicar en Excel o CSV, habrá que revisar esta decisión.
