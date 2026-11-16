# Inventario de Presas y Embalses (MITECO / SNCZI)

Fase 0, tarea T3. Documenta de dónde sale `data/master/inventario.csv` y qué rarezas tiene.

> **Estado (2026-11-17): procesado.** Descarga manual del usuario (captcha), ficheros descomprimidos en `data/raw/inventario/egis_*/` (no versionados; ver `PROCEDENCIA.json` con tamaños y sha256). Genera `data/master/inventario.csv`.

> **Hallazgos:** CRS ETRS89 UTM 30N (también para Canarias); el nombre/código de los polígonos de embalse NO enlaza con las presas (el enlace es espacial, a ≤ 300 m); no hay campo de foto ni de año de construcción; la ficha es el campo `INFORME` (URL del visor SNCZI); 19 capacidades con valores absurdos (> 5.000 hm³) se descartan; `NMN_CAPAC` está en hm³.

## Fuente

| | |
|---|---|
| Organismo | Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO), Subdirección General de Dominio Público Hidráulico e Infraestructuras |
| Página de descarga | https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/agua/inventario-presas-embalses.html |
| Presas (puntos) | https://gis.miteco.gob.es/descargas/app/DescargaFichero?f=egis_presa_geoetrs89.zip (la página indica 296 KB) |
| Embalses (polígonos) | https://gis.miteco.gob.es/descargas/app/DescargaFichero?f=egis_embalse_geoetrs89.zip (la página indica 15,4 MB) |
| Simbología ArcGIS (.lyr) | `lyr-presasybalsas_tcm30-175858.zip` y `lyr-embalses_tcm30-175854.zip`, en la misma página. Ya están en `data/raw/inventario/`. |
| Ficha en datos.gob.es | https://datos.gob.es/es/catalogo/e05068001-inventario-de-presas-y-embalses |
| Ficha en el catálogo MITECO | https://catalogo.datosabiertos.miteco.gob.es/catalogo/dataset/4f218701-1004-4b15-93b1-298551ae9446 (conjunto «Presas») |
| Visor | https://gis.miteco.gob.es/web/snczi |
| Fecha de actualización declarada | Embalses: 31/12/2021 · Presas: 30/12/2021 (página de descarga, consultada el 2026-11-16) |
| Formato | Shapefile, «Cartografía digital ETRS89». Según los .lyr, coordenadas geográficas ETRS89 (`GCS_ETRS_1989`, EPSG:4258), sin proyección UTM |
| Ámbito declarado | Nacional |

### Licencia y condiciones

- **Página de descarga:** «Esta información se puede usar de modo libre y gratuito siempre que se mencione al Ministerio para la Transición Ecológica y el Reto Demográfico como autor y propietario de la información de la siguiente manera: Fuente: «© Ministerio para la Transición Ecológica y el Reto Demográfico».»
- **Catálogo de datos abiertos del MITECO:** `CC-BY-4.0`.
- **datos.gob.es:** remite al aviso legal del ministerio. Gratuito.
- Texto de atribución propuesto (lo valida `editorial`): «Inventario de Presas y Embalses. Fuente: © Ministerio para la Transición Ecológica y el Reto Demográfico».

### Otras vías de acceso comprobadas (2026-11-16)

| Vía | Resultado |
|---|---|
| WMS `https://wms.mapama.gob.es/sig/Agua/Presas/wms.aspx` y `/Embalses/wms.aspx` | `GetCapabilities` devuelve una excepción del servidor (`NullReferenceException`). No sirve para descarga masiva. |
| OGC API Features `https://gis.miteco.gob.es/geoserver/ogc/features/v1/collections` (534 colecciones) y `https://wmts.mapama.gob.es/sig-api/ogc/features/v1` (30) | No hay colección del inventario. Solo aparecen `agua:embalses_et` (estaciones SAIH de nivel/volumen) y `agua:zi_presasdemolidas`. |
| WFS del geoserver de MITECO | Las mismas dos capas; el inventario no está. |
| Feed ATOM `…/ide/inspire/atom/CategAgua/downloadservice.xml` | 404 o dominio `mapama.gob.es` sin resolver. |
| Ficha técnica / fotos por presa | No se ha podido verificar el patrón de URL de las fichas del visor SNCZI (el visor es una SPA y no expone un servicio público documentado). Si el shapefile trae campos de foto o ficha, los recoge `construir.mjs` (columnas `foto` y `ficha_url`). Si no, queda como tarea abierta. |

En datos.gob.es el ministerio anuncia que publicará en 2026 una versión depurada con más formatos, API y años de construcción. Conviene revisarlo antes de fase 2.

## Cómo reproducir

1. En un navegador, abrir la página de descarga, resolver el captcha y descargar `egis_presa_geoetrs89.zip` y `egis_embalse_geoetrs89.zip`.
2. Guardarlos en (ZIP o descomprimidos en una carpeta, ambos valen) `data/raw/inventario/`.
3. `node scripts/fase0/inventario/inspeccionar.mjs` lista las capas, el CRS, la codificación y los campos con ejemplos. Hay que revisar que el campo elegido para cada columna sea el correcto y, si no, fijarlo en `scripts/fase0/inventario/mapeo-campos.json`.
4. `node scripts/fase0/inventario/construir.mjs` escribe `data/master/inventario.csv` y `data/master/inventario-stats.json`, y regenera el bloque de cifras de este documento.

Los scripts leen los ZIP en memoria y no escriben nunca en `data/raw/`. Fallan con un mensaje claro en estos casos:
- el «ZIP» es en realidad la página HTML del captcha;
- falta el campo de código o de nombre de presa;
- el CRS no se reconoce;
- la capacidad máxima pasa de 5.000. El mayor embalse ronda los 3.200 hm³, así que esa cifra indica que la unidad no es hm³ y hay que fijar `capacidad_factor_a_hm3`.

## Decisiones de tratamiento

- **Coordenadas:** se toma el punto de la presa. ETRS89 geográficas se trata como WGS84 sin transformar, porque la diferencia es inferior a 1 m. Si un shapefile viniera en UTM (`.prj` con `UTM_Zone_NN`), se reproyecta con proj4 usando el huso indicado en el `.prj`; las filas de Canarias en REGCAN95 UTM 28 también se cubren por esa vía. Si la presa no tiene geometría, se usa el centroide del polígono de embalse (`origen_coord = centroide_embalse`). Se redondea a 6 decimales.
- **Una fila por presa.** Los polígonos de embalse se enlazan por el campo de código de presa. Si el configurado no solapa al menos el 50 %, se elige automáticamente el campo que más solapa y el elegido queda registrado en las cifras. Si una presa tiene varios polígonos, sus nombres se unen con ` | ` y, si la presa no trae capacidad, se suman las de los polígonos (`origen_capacidad = suma_embalses`). Los polígonos sin presa se conservan como filas con `codigo_presa` vacío.
- **Territorio:** se asigna por coordenadas con cajas aproximadas: Canarias (lat 27,4–29,5; lon −18,4 a −13,2), Baleares (lat 38,6–40,15; lon 1,1–4,4), Ceuta, Melilla, península (lat 35,95–43,85; lon −9,4 a 3,4); el resto cuenta como `fuera_de_espana`. Después se contrasta con el campo provincia y los desacuerdos se listan como rareza. La caja peninsular incluye Portugal y Andorra, así que un punto mal situado allí solo se detecta por la provincia.
- **Año:** se extrae el primer año de 4 cifras (1500–2099) del campo. Los valores no interpretables se cuentan aparte.
- **Columnas de `inventario.csv`:** `codigo_presa, codigo_embalse, nombre_presa, nombre_embalse, tipo, rio, demarcacion, cuenca, provincia, municipio, lat, lon, origen_coord, territorio, capacidad_hm3, origen_capacidad, uso, titular, anio, foto, ficha_url, n_embalses, capa_origen, notas`.

## Cifras y rarezas

Todas las cifras de este apartado las genera `construir.mjs`.

<!-- cifras:inicio -->

_Bloque generado por `scripts/fase0/inventario/construir.mjs` el 2026-11-16. No editar a mano._

**Ficheros procesados**

- `egis_embalse_geoetrs89/egis_embalse_geoetrs89sinTitular.cpg` — 5 bytes — sha256 `3ad3031f5503a440…`
- `egis_embalse_geoetrs89/egis_embalse_geoetrs89sinTitular.dbf` — 2219578 bytes — sha256 `99ad7e024e6bc70a…`
- `egis_embalse_geoetrs89/egis_embalse_geoetrs89sinTitular.prj` — 404 bytes — sha256 `03329a8b83248ce6…`
- `egis_embalse_geoetrs89/egis_embalse_geoetrs89sinTitular.qmd` — 651 bytes — sha256 `bec2f651ecd449e8…`
- `egis_embalse_geoetrs89/egis_embalse_geoetrs89sinTitular.shp` — 21694440 bytes — sha256 `bcb56766d8c947c4…`
- `egis_embalse_geoetrs89/egis_embalse_geoetrs89sinTitular.shx` — 25460 bytes — sha256 `c7bb25f4aa761949…`
- `egis_presa_geoetrs89/egis_presa_geoetrs89sinTitular.cpg` — 5 bytes — sha256 `3ad3031f5503a440…`
- `egis_presa_geoetrs89/egis_presa_geoetrs89sinTitular.dbf` — 4347578 bytes — sha256 `3aa9b893a0a81a1d…`
- `egis_presa_geoetrs89/egis_presa_geoetrs89sinTitular.prj` — 404 bytes — sha256 `03329a8b83248ce6…`
- `egis_presa_geoetrs89/egis_presa_geoetrs89sinTitular.qmd` — 651 bytes — sha256 `bec2f651ecd449e8…`
- `egis_presa_geoetrs89/egis_presa_geoetrs89sinTitular.shp` — 89924 bytes — sha256 `3f9a1f53643638de…`
- `egis_presa_geoetrs89/egis_presa_geoetrs89sinTitular.shx` — 25764 bytes — sha256 `4def43a9382d70af…`

**Capas**

- egis_presa_geoetrs89 :: egis_presa_geoetrs89sinTitular: 3208 registros; CRS UTM huso 30N, D_ETRS_1989 → WGS84; DBF utf-8
- egis_embalse_geoetrs89 :: egis_embalse_geoetrs89sinTitular: 3170 registros; CRS UTM huso 30N, D_ETRS_1989 → WGS84; DBF utf-8

Campos usados (presas): capa=egis_presa_geoetrs89 :: egis_presa_geoetrs89sinTitular, codigo_presa=CODIGO, nombre_presa=NOMBRE, nombre_embalse=—, tipo=TIPO, rio=CAUCE, demarcacion=DEMARC, cuenca=—, provincia=PROVINCIA, municipio=—, capacidad=NMN_CAPAC, uso=USO, titular=USUARIOS, anio=—, foto=—, ficha=INFORME, fase=FASE, categoria=CATEGORIA, ccaa=CCAA

Enlace polígono de embalse → presa: egis_embalse_geoetrs89 :: egis_embalse_geoetrs89sinTitular: espacial (distancia <= 300 m)

**Totales**

| Indicador | Nº | % de presas |
|---|---:|---:|
| Presas (puntos) | 3208 | |
| Polígonos de embalse | 3170 | |
| Filas en inventario.csv | 3373 | |
| Presas con coordenadas | 3208 | 100.0 % |
| Presas con capacidad > 0 | 2809 | 87.6 % |
| Presas con capacidad > 5 hm³ | 688 | 21.4 % |
| Presas enlazadas a un polígono de embalse | 3176 | 99.0 % |
| Presas con nombre de embalse | 3005 | 93.7 % |
| Presas con uso | 2641 | 82.3 % |
| Presas con titular | 917 | 28.6 % |
| Presas con año | 0 | 0.0 % |
| Presas con foto (cualquier valor) | 0 | 0.0 % |
| Presas con foto como URL | 0 | 0.0 % |
| Presas con enlace a ficha | 3208 | 100.0 % |

Capacidad (hm³): mínima 0.001, mediana 0.436, máxima 3219 (factor aplicado: 1).

**Cobertura por territorio (todas las presas)**

| Valor | Nº |
|---|---:|
| peninsula | 3046 |
| canarias | 153 |
| baleares | 6 |
| ceuta | 2 |
| melilla | 1 |

**Cobertura por territorio (presas con capacidad > 5 hm³, el umbral del boletín)**

| Valor | Nº |
|---|---:|
| peninsula | 682 |
| canarias | 4 |
| baleares | 2 |

**Por ámbito del inventario (campo DEMARC, todas las presas; incluye islas)**

| Valor | Nº |
|---|---:|
| EBRO | 535 |
| GUADALQUIVIR | 495 |
| TAJO | 432 |
| GUADIANA | 341 |
| DUERO | 290 |
| JUCAR | 239 |
| SEGURA | 118 |
| CUENCAS MEDITERRANEAS ANDALUZAS | 111 |
| MIÑO-SIL | 105 |
| GUADALETE Y BARBATE | 86 |
| CANTABRICO ORIENTAL | 77 |
| GRAN CANARIA | 75 |
| TINTO, ODIEL Y PIEDRAS | 73 |
| CANTABRICO OCCIDENTAL | 64 |
| TENERIFE | 42 |
| GALICIA-COSTA | 41 |
| CUENCAS INTERNAS DE CATALUÑA | 39 |
| LA GOMERA | 23 |
| LA PALMA | 9 |
| ISLAS BALEARES | 6 |
| CEUTA | 2 |
| FUERTEVENTURA | 2 |
| MELILLA | 1 |
| LANZAROTE | 1 |
| EL HIERRO | 1 |

**Por ámbito (presas con capacidad > 5 hm³)**

| Valor | Nº |
|---|---:|
| EBRO | 130 |
| DUERO | 89 |
| TAJO | 89 |
| GUADALQUIVIR | 89 |
| GUADIANA | 70 |
| MIÑO-SIL | 41 |
| JUCAR | 33 |
| SEGURA | 32 |
| CUENCAS MEDITERRANEAS ANDALUZAS | 21 |
| TINTO, ODIEL Y PIEDRAS | 17 |
| CUENCAS INTERNAS DE CATALUÑA | 17 |
| GALICIA-COSTA | 16 |
| CANTABRICO OCCIDENTAL | 15 |
| GUADALETE Y BARBATE | 14 |
| CANTABRICO ORIENTAL | 9 |
| ISLAS BALEARES | 2 |
| GRAN CANARIA | 2 |
| LA PALMA | 2 |

**Fase de la infraestructura**

| Valor | Nº |
|---|---:|
| Explotación | 1910 |
| (vacío) | 646 |
| Proyecto | 491 |
| Puesta en carga | 39 |
| Proyecto abandonado | 39 |
| Fuera de servicio | 30 |
| Construcción | 26 |
| Inundada | 20 |
| Recrecida (fuera de servicio) | 4 |
| Aterrada | 3 |

**Punto representativo del polígono de embalse**

| Valor | Nº |
|---|---:|
| centroide | 2928 |
| punto_interior | 413 |

**Tipos de infraestructura**

| Valor | Nº |
|---|---:|
| Presa de fábrica de gravedad (hormigón vibrado) | 975 |
| Presa de materiales sueltos homogénea | 904 |
| (vacío) | 277 |
| Presa de materiales sueltos zonificada o de núcleo | 250 |
| Presa de fábrica de mampostería | 202 |
| Presa de materiales sueltos de pantalla de material sintético | 183 |
| Presa de materiales sueltos de pantalla de hormigón | 83 |
| Presa de fábrica de bóveda | 72 |
| Presa de fábrica de gravedad (hormigón compactado) | 55 |
| Presa de fábrica de arco-gravedad | 48 |
| Presa de materiales sueltos de pantalla asfáltica | 48 |
| Presa mixta | 43 |
| Presa de fábrica de contrafuertes | 35 |
| Presa de materiales sueltos de pantalla de mampostería | 19 |
| Presa móvil o hinchable | 7 |
| Presa de fábrica de bóvedas múltiples | 4 |
| Presa de fábrica de gaviones | 3 |

**Rarezas**

- Capacidades de presa descartadas por valor absurdo (> 5.000 hm³; errores de unidad en origen): 19
  - 14150015 RIBEIRA, LA: 32800000000
  - 1330018 SUARNA: 12933000000
  - 9250077 CERTESCANS: 16370000000
  - 9250079 CERTESCANS: 16370000000
  - 9250006 TERRADETS: 33191000000
  - 9500005 TRAPA, LA: 10230000000
  - 8440006 ALCAMINES, LOS: 16350000000
  - 12350020 HOYAS, LAS: 10130000000
  - 9500036 MONEVA: 8029999999.999999
  - 5140083 PATAMULO: 20950000000
  - 7300029 PUERTO DEL GARRUCHAL: 41400000000
  - 4130070 REZNOS, LOS: 32370000000
  - 9260015 SOTO TERROBA: 8136000000
  - 2370001 BAJO HUEBRA: 8300000000
  - 1330020 TRASONA: 41000000000
  - 12350032 CAIDERO DE LA NIÑA: 20299999999.999996
  - 12350025 CHIRA: 40300000000
  - 9220100 FITAS, LAS: 8085000000
  - 1330012 ALFILORIOS, LOS: 8156000000
- Códigos de presa vacíos: 0
- Códigos de presa duplicados: 0
  - (ninguno)
- Presas sin polígono de embalse: 203
- Presas con varios polígonos de embalse: 0
  - (ninguno)
- Polígonos de embalse sin presa enlazada: 165
- Presas cuyo nombre de embalse difiere del de la presa: 1210
- Nombres de presa repetidos (con códigos distintos): 313
  - estany gento: 3267, 9250065
  - aves canal: 3280, 3281
  - quebradas: 3285, 8030085
  - irabia: 3291, 9310034
  - losar vera: 3296, 3100121
  - valles navalmedio: 3299, 3317
  - rozuelas: 3301, 4140008
  - ramblilla: 3304, 5410253
  - garza: 3308, 4060006
  - buendia: 3314, 3190007
  - castillejo: 3322, 2370020
  - barcena: 1000001, 1240001, 1240003, 1240004, 1240011, 1240012, 1240024
  - lareo: 1200001, 1200009
  - santa elena: 1240005, 9220115
  - campanana: 1240009, 1240016, 1240018
- Nombres con variantes entre paréntesis o con barra: 1175
- Años presentes pero no interpretables: 0
- Coordenadas fuera de España: 0
  - (ninguno)
- Territorio por coordenadas que no cuadra con la provincia: 0
  - (ninguno)

<!-- cifras:fin -->

## Rarezas conocidas antes de procesar

- La capa de presas se llama «Infraestructuras» en el `.lyr` («presas y balsas»). Es probable que incluya balsas además de presas. La columna `tipo` y la tabla «Tipos de infraestructura» lo aclararán.
- La fecha de actualización declarada es de diciembre de 2021. Las presas o recrecimientos posteriores no estarán.
- La metadata del catálogo MITECO indica `modified: 2011-05-27`, lo que contradice la fecha de la página de descarga.
