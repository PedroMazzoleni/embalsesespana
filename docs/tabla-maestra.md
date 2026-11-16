# Tabla maestra de embalses (Fase 0, T4)

Script: `node scripts/fase0/maestra/construir-maestra.mjs` (determinista; lee `data/raw/boletin-hidrologico/embalses-*.csv`, `data/master/inventario.csv`, `data/geo/demarcaciones.geojson` y `data/master/emparejamientos-manuales.csv`).
Salidas: `data/master/embalses-maestra.csv`, `data/master/sin-emparejar.csv`, `data/master/maestra-stats.json` y `data/master/kepler/` (`embalses-puntos.csv`, `serie-muestra.csv`, para la revisión visual T6).

## Método

1. Se identifican los embalses del histórico por (ámbito, nombre): 402, de los que 375 están en la última fecha (2026-11-10).
2. Se descartan del inventario las presas no peninsulares (168 filas; ADR 0001). Quedan 3.205.
3. Normalización de nombres: minúsculas, sin tildes (la `ñ` se conserva, para no fusionar `Pena` y `Peña, La`), artículos pospuestos (`Peña, La`, `Parras (Las)`) movidos al inicio, `Sta/Sto/Pto/S.` expandidos, números romanos finales a cifras, partes entre paréntesis o separadas por ` - ` como variantes.
4. Cada registro del inventario se compara por dos vistas: la presa (nombre y capacidad de la presa) y el polígono de embalse (su nombre y su capacidad). La presa manda.
5. Puntuación: nivel de nombre (exacto, sin artículos, sin tildes, parcial, aproximado) + capacidad (ok si difiere ≤ 20 %, mínimo 1,5 hm³; cercana ≤ 50 %) + misma demarcación (ámbito del MITECO mapeado a la demarcación; Cuencas Internas del País Vasco cuenta como Cantábrico Oriental) − penalización por fases «Proyecto», «Construcción», etc. Un registro del inventario solo se asigna a un embalse (gana la mejor puntuación). Las presas del mismo emplazamiento (< 3 km) no cuentan como empate.
6. Se aplican después los emparejamientos manuales. El CSV tiene `nombre_miteco, codigo_inventario, motivo, confianza`; con `codigo_inventario` vacío documenta un caso que se deja sin pareja.
7. Coordenadas: las de la presa (`lat`, `lon`); el punto interior del polígono va aparte (`lat_embalse`, `lon_embalse`). Validación: dentro de la caja peninsular y dentro de su demarcación (punto en polígono; se acepta «borde» a ≤ 3 km, por la geometría simplificada).
8. `id`/`slug`: derivado del nombre del MITECO (artículo al frente, sin tildes), único, estable mientras el MITECO no renombre el embalse.

## Cifras de control (generadas por el script)

| | Última fecha (2026-11-10) | Histórico |
|---|---:|---:|
| Embalses del MITECO | 375 | 402 |
| Emparejados con coordenadas | 368 (**98,13 %**) | 389 (**96,77 %**) |
| Sin emparejar | 7 | 13 |

Criterio de salida (≥ 95 % con coordenadas): **cumplido** sobre ambos denominadores.

- Método: 378 automáticos, 11 manuales.
- Confianza (histórico): alta 329, media 46, baja 14. Última fecha: alta 314, media 40, baja 14.
- Validación geográfica (última fecha): 366 dentro de su demarcación, 2 en el borde (≤ 3 km); ninguna fuera.
- Capacidad MITECO vs inventario (última fecha): 343 coinciden, 16 cercanas, 1 distinta (Contreras, 361 vs 852,4), 8 sin dato en el inventario.
- Capacidad de los 368 emparejados: 55.921 hm³ de los 56.049 hm³ de la última fecha (99,8 %).
- El inventario pierde capacidad en 19 presas con valores absurdos (> 5.000 hm³, errores de unidad en origen; ver `docs/inventario-presas.md`). El script no los corrige.

## No emparejados

Listado completo, con candidatos, en `data/master/sin-emparejar.csv`; motivos en `emparejamientos-manuales.csv`. Pendiente de Fase 2.

- En la última fecha (7): los seis `Sistema …` del Pirineo (agregados de lagos/embalses sin equivalente único) y `Santolea` (el MITECO la parte en tres series: Santolea, Puente de Santolea y Cañón de Santolea; el inventario tiene dos registros con 48 y 93,7 hm³).
- Solo en el histórico (6): `Somiedo (Lagos)`, `Bramatuero Alto`, `Saburo (Lago)`, `Carpio, El`, `Hornachuelos`, `Marmolejo`.

## Revisar en Fase 2

- 14 emparejamientos de confianza baja y 46 de media (columnas `confianza`, `metodo_emparejamiento`, `notas` de la maestra).
- Los 11 manuales, con evidencia moderada (nombre, río, capacidad): `Riocobo`, `Olivargas`, `Sta Uxia`, `La Cabezuela` (= Marisánchez según iAgua), `Contreras`, `Guadalhorce-Guadalteba`, `Terroba`, entre otros.
- Series MITECO con varias presas en el inventario (Bárcena, Rosarito, Alsa-Mediajo, Aguilar, Monteagudo…): la elección entre presas del mismo embalse no está afinada; el punto puede estar en otra presa del mismo embalse.
- Las coordenadas de las presas del inventario son de 2021; los `Sistema …` no tienen coordenadas.
