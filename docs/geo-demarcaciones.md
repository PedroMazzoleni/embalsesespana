# Geometrías de las demarcaciones hidrográficas

Fichero resultante: `data/geo/demarcaciones.geojson` (generado, no editar a mano).
Script: `node scripts/fase0/geo-demarcaciones.mjs` (`--download` para volver a descargar las fuentes; `--pct=N` para probar otro nivel de simplificación). Alcance: **solo demarcaciones peninsulares**, según [ADR 0001](adr/0001-cobertura-solo-peninsula.md).

## Fuente

| | Capa principal | Máscara de tierra |
|---|---|---|
| Capa | Demarcaciones hidrográficas PHC 2022-2027 (tercer ciclo) | Demarcaciones hidrográficas, ámbito terrestre (PH 2016-2021) |
| Organismo | MITECO, Dirección General del Agua | ídem |
| Servicio | WFS `https://gis.miteco.gob.es/geoserver/agua/wfs`, capa `agua:demarhidro_2027` | misma URL, capa `agua:Demarcaciones_ET` |
| Original (no versionado) | `data/raw/geo/demarhidro_2027_wfs-shape.zip` (19,6 MB) | `data/raw/geo/demarcaciones_et_wfs-shape.zip` (26,6 MB) |
| Metadatos | [5a58c83b-…](https://catalogo.datosabiertos.miteco.gob.es/csw?SERVICE=CSW&VERSION=2.0.2&REQUEST=GetRecordById&outputSchema=http://www.isotc211.org/2005/gmd&ElementSetName=full&ID=5a58c83b-345a-44c0-81fe-7459947620cb) | [ea8ca652-…](https://catalogo.datosabiertos.miteco.gob.es/csw?SERVICE=CSW&VERSION=2.0.2&REQUEST=GetRecordById&outputSchema=http://www.isotc211.org/2005/gmd&ElementSetName=full&ID=ea8ca652-1e55-4ac1-b4de-433d39c84304) |
| Licencia (según metadatos) | Creative Commons Atribución 4.0 (CC BY 4.0) | CC BY 4.0 |
| SRC original | ETRS89 geográficas (EPSG:4258), shapefile con DBF en ISO-8859-1 | ídem |

Página de descargas: <https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/agua/demarcaciones-hidrograficas-phc-2022-2027.html>.
La descarga directa del ZIP en esa página exige ahora resolver un captcha (ALTCHA), así que se usa el WFS oficial del mismo ministerio, que sirve la misma capa en SHAPE-ZIP sin intervención. Los ZIP **no se versionan** (están en `.gitignore`); sí se versiona el `.json` que tiene al lado cada uno, con URL, tamaño, sha256, fecha de descarga (16/11/2026), registro de metadatos, licencia y `version_id`. Para reconstruir: `node scripts/fase0/geo-demarcaciones.mjs --download`.

**Procedencia y reproducibilidad.** Sin `--download`, el script verifica tamaño y sha256 de cada ZIP contra su `.json` y falla si no coinciden. El sha256 **cambia en cada descarga del WFS** (el ZIP se genera al vuelo, con fechas distintas en sus entradas), así que una descarga nueva no implica datos nuevos: el criterio de cambio de capa es el campo `version_id` de las entidades. En la capa 2022-2027 hay dos valores (`2023-02-07`, `2023-03-01`), registrados en `SOURCES`; el script falla si cambian, para forzar a revisar la capa. La capa de máscara no tiene campo `version_id` (`null` en el sidecar). El fichero de salida sí es reproducible byte a byte a partir de unos ZIP dados (dos ejecuciones, mismo sha256).

Atribución propuesta: «Demarcaciones hidrográficas: MITECO (PHC 2022-2027), CC BY 4.0. Geometría simplificada».

## Por qué dos capas

La capa 2022-2027 es la oficial y vigente, pero cada demarcación incluye sus **aguas costeras** (zona marina). En un mapa para ciudadanos eso se ve raro (manchas en el mar), así que se recorta con la unión de la capa de **ámbito terrestre**. De esta segunda solo se usa el contorno de tierra; los límites interiores, códigos y nombres salen siempre de la 2022-2027. El MITECO advierte que el ámbito terrestre «se define únicamente para visualización y carece de oficialidad», que es justo nuestro uso. Superficie de tierra que queda fuera de la máscara: ver «medición manual de fase 0» más abajo (despreciable).

## Proceso (mapshaper 0.7.101)

```
-i demarcaciones_et_wfs-shape.zip encoding=latin1 -target Demarcaciones_ETPolygon -dissolve + name=land
-i demarhidro_2027_wfs-shape.zip encoding=latin1 -target demarhidro_2027Polygon
-each "…propiedades…" -filter "ambito == 'peninsula'"
-clip land -clean -simplify 0.5% keep-shapes -clean -proj wgs84
-o stage1.geojson precision=0.0001          # redondeo a 1e-4 grados
-i stage1.geojson -clean -o demarcaciones.geojson precision=0.0001
mapshaper demarcaciones.geojson -check-geometry   # debe dar 0 intersecciones
```

El filtro peninsular se aplica antes de recortar y simplificar (la simplificación es por arco, así que no altera la península). El redondeo a 4 decimales tras el último `-clean` creaba 2 intersecciones; por eso se vuelve a importar el fichero ya redondeado, se limpia y se exporta de nuevo (los vértices ya están en la rejilla, y el segundo redondeo no los mueve). El script ejecuta `-check-geometry` sobre el fichero final y falla si encuentra alguna.

Niveles probados (porcentaje de vértices conservados; salida del script con `--pct`, solo península). «Partes» = polígonos disjuntos de la unión (península + islotes/exclaves que sobreviven):

| `-simplify` | Tamaño | gzip | Vértices | Partes |
|---|---|---|---|---|
| 2 % | 693 KB | 209 KB | 39 970 | 22 |
| 1 % | 356 KB | 109 KB | 20 471 | 10 |
| 0,8 % | 288 KB | 87 KB | 16 537 | 10 |
| 0,6 % | 221 KB | 65 KB | 12 617 | 5 |
| **0,5 %** (elegido) | **186,7 KB** | **53,6 KB** | **10 665** | 5 |
| 0,4 % | 153 KB | 43 KB | 8 683 | 4 |
| 0,3 % | 118 KB | 34 KB | 6 711 | 3 |
| 0,2 % | 84 KB | 24 KB | 4 721 | 1 |

Se elige 0,5 %: es el nivel más detallado que entra en el presupuesto de 200 KB y conserva todas las partes que sobreviven hasta 0,6 %. Por debajo de 0,4 % empiezan a desaparecer islotes. La inspección visual del detalle a zoom 5-8 es una **medición manual de fase 0** pendiente de repetir en MapLibre en la fase 2; si hace falta más detalle al acercar, se sirve como PMTiles con varios niveles en lugar de subir este fichero.

## Resultado

Salida del script (`node scripts/fase0/geo-demarcaciones.mjs`):

- **15 demarcaciones**, 10 665 vértices, **186,7 KB** (53,6 KB con gzip), sha256 `543ed113…c94c3df`.
- **SRC:** WGS84 (EPSG:4326), coordenadas con 4 decimales (~11 m).
- **Superficie** de las 15: 494 038 km² (oficial sin aguas costeras, `area_rbd_e`: 493 791 km²). La máscara de tierra elimina 14 192 km² de aguas costeras (508 271 → 494 079 km²) y la simplificación con el redondeo cambian el área en −41,2 km² (−0,008 %).
- **Desviación del área por demarcación** frente a `area_rbd_e`: entre −0,64 % (ES014) y +0,17 % (ES050). El script imprime la tabla completa en cada ejecución.
- **Propiedades:**
  - `codigo` — código europeo (euRBDCode), p. ej. `ES030`.
  - `nombre` — nombre en español (campo `label` del MITECO, sin saltos de línea). Ojo: Cataluña aparece como «Cuencas Internas de Cataluña»; su nombre oficial en la fuente es «Distrito de Cuenca Fluvial de Cataluña».
  - `tipo` — `intercomunitaria` (gestión estatal) o `intracomunitaria` (gestión autonómica: ES014, ES060, ES063, ES064, ES100), según la lista de la ficha del servicio `DDHH2027.pdf` del MITECO.
  - `internacional` — `true` si comparte cuenca con otro país (campo `internacio` de la fuente).
  - `ambito` — siempre `peninsula` en este fichero; se conserva por si cambia la cobertura.

Códigos: ES010, ES014, ES017, ES018, ES020, ES030, ES040, ES050, ES060, ES063, ES064, ES070, ES080, ES091, ES100.

## Comprobaciones

El script falla si algo de esto no se cumple:

- La **lista exacta de códigos** es la esperada (15, sin ninguno de más ni de menos) y todos tienen `ambito = peninsula`.
- **Sin solapes:** suma de áreas de las demarcaciones frente al área de su unión (diferencia < 0,01 km²; en la última ejecución 0,0000).
- **Sin huecos:** la unión no tiene agujeros interiores (0).
- **`-check-geometry` = 0 intersecciones** sobre el fichero escrito.
- Los ZIP coinciden con su sidecar (sha256) y el `version_id` de la capa es el registrado.

Medición manual de fase 0 (no sale del script): la superficie de tierra de la capa 2022-2027 que queda fuera de la máscara era de 3,9 km² con la cobertura completa (franjas costeras, despreciable). Revisión visual de la península: sin huecos ni solapes visibles.
