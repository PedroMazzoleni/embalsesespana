# Contrato de datos

> Estado: **Fase 0**. Este documento describe, por ahora, la **fuente** (la base de datos histórica de embalses del MITECO) tal como se publica. El contrato de salida (`embalses.json`, `series/{id}.json`, `resumen.json`, `historico.parquet`) se definirá en `packages/schema` en la Fase 2 y se documentará aquí.

Todas las cifras de este documento salen de ejecutar:

```bash
node scripts/fase0/descargar-bd-embalses.mjs          # descarga a data/raw/boletin-hidrologico/
node scripts/fase0/inspeccionar-bd-embalses.mjs       # imprime todas las cifras
node scripts/fase0/inspeccionar-bd-embalses.mjs --json informe.json   # además, informe JSON completo
```

La inspección tarda unos 3–4 minutos (la mayor parte es leer las 725 000 filas del `.mdb` con `mdb-reader`). Dependencias (devDependencies en la raíz): `mdb-reader` (lectura de Access en JS puro) y `fflate` (descompresión ZIP en memoria).

---

## 1. La fuente: «Descarga de datos históricos de embalses desde 1988 (Sin Validación)»

### 1.1 Dónde está

| | |
|---|---|
| Página | https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html |
| Enlace en la página | «Descarga de datos históricos de embalses desde 1988 (Sin Validación) 10-11-2026» |
| **URL de descarga** | https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/Historico-de-embalses/BD-Embalses.zip |
| Documentación oficial | «Modelo de Datos BD Embalses-1988-2022»: https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/modelo-de-datos-bd-embalses-1988-2022_tcm30-538818.pdf (PDF de 1 página, `Last-Modified` 28-03-2023) |
| Fecha de descarga | 2026-11-16 (22:54 UTC) |
| `Last-Modified` HTTP | Tue, 10 Nov 2026 14:21:41 GMT |
| Tamaño ZIP | 10 239 318 bytes (≈ 9,8 MB) |
| SHA-256 ZIP | `420d71d5060722f15473e8fde7117a040b47eaa2ac894c123e8b4346b30d827c` |
| Copia local | `data/raw/boletin-hidrologico/BD-Embalses.zip` (+ `.meta.json` con URL, fecha, `Last-Modified`, tamaño y hash) |

**¿Es estable la URL?** La ruta del ZIP no lleva identificador de versión (no tiene el sufijo `_tcm30-NNNNNN` que usa el MITECO en otros ficheros), y el ZIP se **sobrescribe** cada semana en la misma ruta; lo que cambia cada semana es la fecha en el texto del enlace. Pero el nombre **sí ha cambiado en el pasado**: el PDF de modelo de datos y la prensa hablan de `BD-Embalses_1988-2022.zip`. Conclusión: tratarla como «estable hasta que deje de serlo». El script de descarga comprueba en cada ejecución que la página sigue enlazando a esa ruta y avisa si no; además valida la firma ZIP y el `Content-Length` (el CDN del MITECO cortó una descarga a medias durante esta prueba: el script reintenta).

### 1.2 ¡No es un Excel!

Aunque la página lo describe como «fichero excel», lo que se descarga es un **ZIP con una base de datos Microsoft Access**:

| | |
|---|---|
| Contenido del ZIP | un único fichero, `BD-Embalses.mdb` |
| Tamaño descomprimido | 222 760 960 bytes (≈ 212 MB) |
| Formato | Jet 4 (Access 2000–2003) — ver salida del script |
| Fecha de creación (metadato Access) | 2024-06-04 |
| Tablas de usuario | **1** |
| Codificación | Texto Unicode de Access (UTF-16). Sin mojibake: los únicos caracteres no ASCII son `á é í ó ú Á Ú ñ ª` |

Consecuencias:
- El `.mdb` (212 MB) supera el límite de 100 MB por fichero de GitHub: **en `data/raw/` se guarda el ZIP tal cual**, no el `.mdb`.
- El pipeline necesita leer Access (no SheetJS/ExcelJS). `mdb-reader` funciona en Node sin binarios nativos.
- **Git-scraping:** cada semana el ZIP entero cambia (≈ 10 MB binarios). Guardarlo cada semana hace crecer el repositorio ≈ 0,5 GB al año. Hay que decidirlo al montar el scraping (opciones: Git LFS, guardar solo cuando cambie el hash, o guardar además un CSV extraído que sí comprime bien en git) → ADR.

### 1.3 Tabla `T_Datos Embalses 1988-2026`

> El **nombre de la tabla incluye el año final** (`1988-2022` en el PDF de 2023, `1988-2026` hoy): cambia con el año. El pipeline debe localizarla por prefijo (`T_Datos Embalses`), nunca por nombre exacto.

724 967 filas. Una fila = un embalse en una fecha.

| Columna | Tipo Access | Significado (según PDF del MITECO) | Unidades / formato real | Nulos |
|---|---|---|---|---|
| `AMBITO_NOMBRE` | Texto (100) | Administración hidráulica explotadora (confederación hidrográfica o administración autonómica) | 16 valores, ver 1.6 | 0 |
| `EMBALSE_NOMBRE` | Texto (100) | Nombre del embalse | texto libre, ver 1.7 | 0 |
| `FECHA` | Fecha/hora | Fecha del dato | siempre medianoche (0 valores con hora), siempre **martes** | 0 |
| `AGUA_TOTAL` | **Texto (50)** | Capacidad total a nivel máximo normal | hm³, **cadena con coma decimal**: `"91,00"` | 2 |
| `AGUA_ACTUAL` | **Texto (50)** | Reserva en la fecha | hm³, **cadena con coma decimal**: `"44,00"` | 2 |
| `ELECTRICO_FLAG` | Numérico (decimal 18,0) | 0 = uso consuntivo, 1 = uso hidroeléctrico | 0: 529 594 filas, 1: 195 373 | 0 |

Detalles de formato:
- Los dos campos de volumen son **texto**, no números: 724 965 valores con el patrón `^\d+,\d\d$` y 2 nulos. Ninguno con separador de miles, punto decimal, espacios ni signo negativo.
- **Precisión real: 1 hm³.** Todos los valores terminan en `,00` (0 valores con decimales distintos de cero). El porcentaje de llenado de un embalse pequeño es por tanto muy grueso (un embalse de 5 hm³ solo puede estar al 0, 20, 40… %).
- Las fechas de Access no llevan zona horaria; `mdb-reader` las devuelve como medianoche UTC. Trabajar siempre con métodos UTC.
- No hay columnas de provincia, coordenadas, río ni código: todo eso tendrá que venir del Inventario de Presas.

### 1.4 Rango y frecuencia

| | |
|---|---|
| Primera fecha | **1987-10-06** — pero son solo 2 filas sueltas (Aceña, Tajo, 1987-10-06 y 1987-10-13) |
| Primera fecha completa | **1988-01-05** (349 embalses) |
| Última fecha | **2026-11-10** (375 embalses) |
| Fechas distintas | 2 030 |
| Frecuencia | **semanal, todos los martes**. Entre fechas consecutivas siempre hay 7 días, salvo el salto 1987-10-13 → 1988-01-05 (84 días) |
| Publicación | el ZIP con datos del martes 10-11-2026 tiene `Last-Modified` del mismo martes a las 14:21 GMT (el horario exacto de publicación se documenta en `docs/publicacion-boletin.md`) |

Filas por año: 18 148 (1988) → 19 822 (2024); 2026 lleva 16 836 (45 semanas).

### 1.5 Número de embalses

| | |
|---|---|
| Nombres de embalse distintos | **402** |
| Pares (ámbito, nombre) distintos | 402 (ningún nombre aparece en dos ámbitos) |
| Presentes en la última fecha (2026-11-10) | **375** |
| Con serie completa 1988-01-05 → 2026-11-10 sin huecos | 321 |
| Dados de alta después de 1988-01-05 | 53 |
| Dejan de aparecer antes de 2026-11-10 | 27 |
| Embalses por fecha | 349 (1988–1999) → 355–369 (2010–2013) → 374–375 (2024–2026) |

Totales de control de la última semana (suma directa de las filas):

| Fecha | Embalses | Capacidad | Reserva | % |
|---|---|---|---|---|
| 2026-11-03 | 375 | 56 049 hm³ | 31 402 hm³ | 56,03 % |
| 2026-11-10 | 375 | 56 049 hm³ | 31 000 hm³ | 55,31 % |

Contraste externo (no lo calcula el script): la prensa citando el boletín del 3-11-2026 da **31 402 hm³** (coincide exactamente) sobre **56 043 hm³** de capacidad (6 hm³ menos que nuestra suma). Habrá que averiguar de dónde salen esos 6 hm³ antes de publicar capacidades totales (¿un embalse excluido del total oficial, p. ej. Flix, recién incorporado?).

Por uso en 2026-11-10: consuntivo (flag 0) 281 embalses, 38 798 hm³ de capacidad; hidroeléctrico (flag 1) 94 embalses, 17 251 hm³.

### 1.6 Ámbitos (`AMBITO_NOMBRE`) y cobertura geográfica

16 valores, todos presentes de 1988 a 2026 y con el mismo texto durante todo el periodo:

Cantábrico Occidental (10 embalses), Cantábrico Oriental (4), Cuenca Mediterránea Andaluza (12), Cuencas Internas de Cataluña (9), Cuencas Internas del País Vasco (2), Duero (35), Ebro (84), Galicia Costa (11), Guadalete-Barbate (8), Guadalquivir (62), Guadiana (40), Júcar (23), Miño - Sil (29), Segura (15), Tajo (51), Tinto, Odiel y Piedras (7).

- **Solo península.** No hay ningún ámbito de Baleares, Canarias, Ceuta ni Melilla. Si se quieren las islas, hará falta otra fuente → ADR de cobertura.
- `AMBITO_NOMBRE` es la **administración que explota** el embalse, no exactamente la demarcación hidrográfica (p. ej. «Cuencas Internas del País Vasco» va aparte de «Cantábrico Oriental»; las intracomunitarias andaluzas y catalana aparecen con nombre propio). Para colorear el mapa por demarcación habrá que mapear ámbito → demarcación en la tabla maestra.

### 1.7 Identificación de embalses

**No hay código: solo el nombre.** El emparejamiento con el Inventario de Presas tendrá que hacerse por nombre + ámbito, a mano donde haga falta, y fijarse en `data/master/` con un ID propio.

A favor: dentro de este fichero el nombre es único (402 nombres = 402 pares ámbito-nombre; 0 duplicados (nombre, fecha); 0 nombres con espacios sobrantes al principio/final ni dobles). En contra:

- **Convenciones de nombre inconsistentes**, que complicarán el cruce con el Inventario:
  - Artículo pospuesto con coma: `Peña, La`, `Castro, El`, `Peares, Os`, `Vellón,El-(Pedrezuela)` (sin espacio).
  - Artículo delante: `La Serena`, `La Cabezuela`, `El Vicario`, `Las Fitas`.
  - Artículo entre paréntesis: `Parras (Las)`, `Loteta (La)`.
  - Abreviaturas: `San. Estevo`, `Sta Uxia`, `Pto. Vallehermoso`, `Agavanzal, Nª Sª de`.
  - Nombres alternativos dentro del nombre: `Tremp ó Talárn`, `Pías (San Agustín)`, `Agrio (Aznalcollar)`, `Alcañiz (Estanca)`, `Torrejón (Tajo - Tietar)`, `Porma-(Juan Benet)`, `Burguillo - Puente Nuevo`, `Malpasillo ( Jauja )` (espacios dentro del paréntesis).
  - Tildes ausentes: `Borbollon`, `Aznalcollar`, `Tietar`.
  - Agregados que no son un embalse: `Sistema Aguas Limpias`, `Sistema Alto Caldarés`, `Sistema Capdella`, `Sistema Escarra`, `Sistema Lagos Espot`, `Sistema Valle de Arán` (Ebro), `Somiedo (Lagos)`, y lagos pirenaicos `Mar (Lago)`, `Negro (Lago)`, etc.
- **Nombres que se parecen pero son embalses distintos** (no fusionar): `Pena` y `Peña, La` (ambos en el Ebro, ambos con serie completa); `Castro` (Duero) y `Castro, El` (Tajo); `Arenoso` (Guadalquivir) y `Arenós` (Júcar). El script lista 56 pares a distancia de edición ≤ 2 para revisión; ninguno resultó ser una variante del mismo embalse.
- **Sucesiones (mismo embalse o sustituto con otro nombre)**, a decidir en la tabla maestra:
  - `Breña, La` termina el 2009-12-22 y `Breña II, La` empieza el 2009-12-29 (nueva presa que sustituye a la anterior).
  - Ebro, 2006-09-26 → 2006-10-03: desaparecen `Bachimaña (Lago)`, `Bramatuero Alto`, `Escarra`, `Mar (Lago)`, `Negro (Lago)`, `Respomuso`, `Saburo (Lago)`, `Tort (Lago)` y aparecen los `Sistema …` (cambio de criterio: lagos individuales → sistemas agregados).
  - `Santolea` (Ebro) baja a 5 hm³ de capacidad y aparecen `Puente de Santolea` (2017) y `Cañón de Santolea` (2022): obras de recrecimiento/sustitución.

### 1.8 Altas, bajas y huecos

- **Altas (53)**: la mayoría al inicio del año hidrológico — 32 en octubre (p. ej. 2006-10-03, 2017-10-03, 2020-10-06, 2021-10-05, 2022-10-04, 2023-10-03, 2026-10-06 con `Flix`). El resto, repartidas (6 el 2003-04-22, 6 entre febrero y marzo de 2010…).
- **Bajas (27)**: Guillena (2003), los 8 lagos del Ebro (2006), Villafranca (2008), La Breña (2009), Foix (2011), **12 embalses del Guadalquivir el 2012-06-19/26** (Cordobilla, Alcalá del Río, Cantillana, El Carpio, Derivación Retortillo, Doña Aldonza, Encinarejo, Hornachuelos, Malpasillo, Marmolejo, Pedro Marín, Zocueca), Catllar (2012), Castilseras (2017), Somiedo (Lagos) (2017).
  → El total nacional **no es comparable directamente entre años**: el conjunto de embalses cambia (349 → 375). Para «comparar con la media» habrá que decidir si se usa el conjunto actual, el de cada semana (como el boletín) o porcentajes.
- **Huecos internos**: 4 embalses, 665 semanas en total: Andévalo (Guadiana) faltan 491 de 1 230 semanas; Pajares (Ebro) 172 de 1 230; Zufre y Lanuza, 1 semana cada uno.

### 1.9 Valores raros

| Rareza | Cifra |
|---|---|
| `AGUA_TOTAL` / `AGUA_ACTUAL` nulos | 2 filas: Pajares (Ebro), 2003-05-13 y 2003-05-27 |
| Valores negativos | 0 |
| Reserva = 0 | 27 481 filas |
| **Capacidad = 0** | 18 960 filas en 71 embalses: 18 867 con reserva 0 (embalse sin dato: hay que tratarlo como **nulo**, no como vacío) y **93 con reserva > 0 y capacidad 0**. Concentradas en 1988–1999 (3 420 filas en 1988, bajando hasta 105 en 1999) y algunas en 2003–2005. **Ninguna en la última fecha.** |
| **Reserva > capacidad** | 1 171 filas (584 de ellas en más de un 5 %), en 82 embalses. Máximo: Villar del Rey, 1988-02-02, 70 hm³ con capacidad 10 hm³ (×7). Casi todas antes de 2015; 5 en 2026, ninguna en la última fecha. Embalses con más casos: Lanuza 145, Peñarroya 117, La Cabezuela 107, Almodóvar 102 |
| **La capacidad cambia en el tiempo** | 232 de 402 embalses tienen más de un valor de `AGUA_TOTAL`. Muchos son ajustes pequeños (p. ej. Ebro 540 → 541, Alcántara 3 162 → 3 160), pero hay saltos grandes: Guadalcacín II 77 → 800, Casares de Arbas 7 → 37, Montoro 45 → 105, Torre de Abrahán 60 → 183, Camarasa 113 → 163, Contreras 874 → 852 → 361, Zújar 723 → 309. Algunos son puesta en servicio o recrecimiento real; otros parecen errores de las primeras semanas |
| `ELECTRICO_FLAG` | constante para cada embalse (0 embalses cambian de valor) |
| Capacidad < 5 hm³ en la última fecha | 2 embalses (Cornalbo 3 hm³, Rioseco 4 hm³) pese a que la fuente dice «> 5 hm³» |

### 1.10 Reglas que se derivan para el pipeline

1. Leer el ZIP en memoria, abrir el `.mdb` con `mdb-reader` y localizar la tabla por prefijo `T_Datos Embalses`.
2. Convertir `AGUA_TOTAL` y `AGUA_ACTUAL` de texto con coma a número; fallar con mensaje claro (fila, campo, valor) ante cualquier otro formato.
3. **La capacidad va con cada fila**: calcular el % de cada semana con la capacidad de esa semana, no con la actual.
4. Capacidad 0 → dato ausente (`null`), no 0 %. Reserva > capacidad → marcar (no recortar en silencio); decidir en el contrato si se publica.
5. Descartar o marcar las 2 filas de 1987.
6. Embalse = nombre + ámbito → ID propio en `data/master/`. Las sucesiones (La Breña → La Breña II, lagos → sistemas, Santolea) se documentan en la tabla maestra con su motivo.
7. Los totales agregados deben indicar con cuántos embalses se calcularon, porque el conjunto cambia con los años.
8. Los datos son **provisionales** («Sin Validación»): el fichero se reescribe entero cada semana y puede corregir semanas anteriores; el export se regenera completo. Los datos validados están en el Anuario de Aforos (según el PDF del MITECO).
