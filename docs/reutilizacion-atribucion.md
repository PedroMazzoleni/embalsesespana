# Reutilización de las fuentes y texto de atribución

> Tarea T7 · Fase 0 · Responsable: editorial · Revisado el 2026-11-16.
> Esto no es asesoramiento jurídico: es una lectura cuidadosa de los avisos legales y metadatos publicados. Las condiciones pueden cambiar sin aviso, así que conviene volver a revisarlas antes del lanzamiento (fase 2) y una vez al año.

## Resumen en cinco líneas

1. **Datos de reserva (boletín y Excel):** reutilización libre, también comercial, con las condiciones generales del RD 1495/2011: citar la fuente, indicar la fecha de actualización, no desvirtuar la información y no sugerir que el MITECO nos respalda. No hay una licencia con nombre (tipo CC BY).
2. **Inventario de Presas (capas geográficas):** **CC BY 4.0** explícita en los metadatos oficiales.
3. **Fotos de las presas:** **no hemos encontrado ninguna condición de uso específica.** Es el punto de mayor riesgo: no se deben publicar sin confirmación por escrito (ver riesgo R1).
4. **Demarcaciones hidrográficas:** **CC BY 4.0** explícita en los metadatos oficiales.
5. **Mapa base OSM/Protomaps (fase 2):** ODbL. Hay que atribuir a OpenStreetMap en el propio mapa.

---

## 1. Tabla por fuente

| Fuente | Licencia / condiciones | Fuente legal (URL) | Obligaciones | Restricciones | Confianza |
|---|---|---|---|---|---|
| **Boletín Hidrológico semanal y Excel histórico de embalses** (`BD-Embalses.zip`) — MITECO, Área de Información Hidrológica | Sin licencia con nombre. Se aplican las **condiciones generales** de la Ley 37/2007 y del RD 1495/2011 (art. 7), recogidas en el aviso legal del MITECO: uso total o parcial "sin necesidad de autorización expresa". El uso comercial se apoya en la propia Ley 37/2007 (art. 3.1, letras a y b: la reutilización puede tener fines comerciales o no comerciales) y en el art. 8.1 del RD 1495/2011 (modalidad general, sin condiciones específicas más allá del art. 7). *Referencia análoga, no vinculante para este fichero:* el aviso legal de datosabiertos.miteco.gob.es permite expresamente uso comercial, copia, modificación y combinación, pero solo se aplica a los documentos de ese portal; el Excel se publica en miteco.gob.es. | Página del boletín: https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html · Aviso legal: https://www.miteco.gob.es/es/atencion-al-ciudadano/aviso-legal.html · Ley 37/2007: https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814 · RD 1495/2011: https://www.boe.es/buscar/act.php?id=BOE-A-2011-17560 · Referencia análoga (aviso de datos abiertos): https://www.datosabiertos.miteco.gob.es/es/aviso-legal.html · Descarga: https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/Historico-de-embalses/BD-Embalses.zip · Modelo de datos: https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/modelo-de-datos-bd-embalses-1988-2022_tcm30-538818.pdf | (a) No desvirtuar el sentido de la información. (b) Citar la fuente; la fórmula recomendada es "Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico". (c) Indicar la fecha de la última actualización. (d) No sugerir que el MITECO participa, patrocina o apoya el proyecto. (e) Conservar los metadatos de fecha de actualización y de condiciones de reutilización. | Los datos son **provisionales**: la página dice que "todos los datos son provisionales y sujetos a revisión y validación", y el enlace de descarga se etiqueta "(Sin Validación)". El MITECO no garantiza que la información sea completa ni actualizada. No se pueden usar el logo ni las marcas del ministerio. Está prohibido el *framing* (incrustar su web). | **Media-alta.** Las condiciones generales son claras, pero no hay ficha en datos.gob.es ni licencia con nombre para este fichero concreto. |
| **Notas de prensa semanales** de la reserva hídrica (MITECO) | Cada nota dice: "Esta información puede ser usada en parte o en su integridad sin necesidad de citar fuentes". | Ejemplo: https://www.miteco.gob.es/content/dam/miteco/es/prensa/20260224_NdP_La_reserva_h%C3%ADdrica_espa%C3%B1ola_se_encuentra_al_83.pdf | Ninguna formal. | Esa frase se refiere al texto de la nota de prensa, **no** al Excel. No es nuestra fuente de datos: citaremos igualmente. | Alta (sobre la nota). No es aplicable al Excel. |
| **Inventario de Presas y Embalses: capas geográficas** (shapefiles de presas y embalses, WMS) — MITECO, SG de Dominio Público Hidráulico e Infraestructuras | **CC BY 4.0.** Los metadatos de la capa "Presas" dicen: "Nombrar a la fuente: Ministerio para la Transición Ecológica y el Reto Demográfico". La página de descargas indica uso "libre y gratuito" citando "© Ministerio para la Transición Ecológica y el Reto Demográfico". | Metadatos (IDEE): https://www.idee.es/csw-codsi-idee/srv/api/records/4f218701-1004-4b15-93b1-298551ae9446 · Descargas: https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/agua/inventario-presas-embalses.html · Ficha en datos.gob.es: https://datos.gob.es/es/catalogo/e05068001-inventario-de-presas-y-embalses · CC BY 4.0: https://creativecommons.org/licenses/by/4.0/deed.es | Atribución al MITECO, enlace a la licencia e indicación de si hemos hecho cambios (CC BY 4.0, sección 3). Además, las condiciones generales del RD 1495/2011 (fecha de actualización, no sugerir respaldo). | La página de descargas, consultada el 2026-11-16, indica como fecha de actualización 31/12/2021 (Embalses) y 30/12/2021 (Presas); los metadatos IDEE de Presas dan revisión 2021-12-16. La frecuencia declarada es anual pese a ello, así que hay que comprobar la fecha en cada descarga y tomarla de los metadatos, no de este documento. La ficha de datos.gob.es no nombra la licencia y solo enlaza al aviso legal antiguo (magrama.gob.es). Manda la licencia de los metadatos INSPIRE, que es más concreta. | **Alta** para las capas. No pudimos abrir los metadatos de la capa "Embalses" (`7d559e97-…`), aunque es razonable suponer que siguen el mismo patrón. |
| **Inventario de Presas: FOTOS** de las fichas del visor SNCZI | **No hay condiciones publicadas.** Ni el aviso legal, ni la ficha de datos.gob.es, ni los metadatos de la capa dicen nada sobre las fotografías. Los metadatos solo mencionan que la ficha técnica de cada presa incluye un apartado de "FOTOGRAFÍAS". | Visor: https://sig.mapama.gob.es/snczi/index.html?herramienta=Presas · Página del inventario: https://www.miteco.gob.es/es/agua/temas/seguridad-de-presas-y-embalses/inventario-presas-y-embalses.html · Exclusión por derechos de terceros: art. 3.3 de la Ley 37/2007 (https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814) y el propio aviso legal del MITECO | Si se autorizan: atribución por foto (autor o titular) y fecha. | **Riesgo alto.** Tanto el aviso legal como la Ley 37/2007 excluyen de la reutilización los contenidos con derechos de propiedad intelectual de terceros. Muchas presas tienen titulares privados (por ejemplo, eléctricas) o confederaciones, y no sabemos quién hizo cada foto. La licencia CC BY 4.0 de la capa cubre los datos geográficos; **no consta que cubra las imágenes**. | **Baja.** No hay ninguna fuente que lo aclare. |
| **Demarcaciones hidrográficas** (PHC 2022-2027 y "ámbito terrestre y marino") — MITECO, DGA, SG de Planificación Hidrológica | **CC BY 4.0.** Los metadatos dicen: "Nombrar a la fuente: Ministerio para la Transición Ecológica y el Reto Demográfico". | Metadatos PHC 2022-2027: https://www.idee.es/csw-codsi-idee/srv/api/records/5a58c83b-345a-44c0-81fe-7459947620cb · Metadatos terrestre y marino: https://www.idee.es/csw-codsi-idee/srv/api/records/95b8abce-2083-40b3-bd6b-83a7d8a72307 · Acceso rápido a datos del agua: https://www.miteco.gob.es/es/agua/servicios/acceso-rapido-datos-agua.html | Atribución al MITECO, enlace a la licencia e indicación de cambios (en nuestro caso, **simplificación con mapshaper**). | Los metadatos avisan de que "las fronteras pueden diferir de las oficialmente definidas", de que el límite de la demarcación de Ceuta es provisional y de que algunos planes no estaban aprobados. Al simplificar, los límites quedan aún más aproximados: hay que decirlo. | **Alta.** |
| **Marco general** | Ley 37/2007 de reutilización de la información del sector público (modificada, entre otros, por el RDL 24/2021, que transpone la Directiva (UE) 2019/1024). RD 1495/2011 para el sector público estatal: el art. 8.1 fija como modalidad general la reutilización sin condiciones específicas, con solo las condiciones generales del art. 7. | Ley 37/2007: https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814 · RD 1495/2011: https://www.boe.es/buscar/act.php?id=BOE-A-2011-17560 · Aviso legal de datos.gob.es: https://datos.gob.es/es/aviso-legal | Las cinco condiciones del art. 7 del RD 1495/2011, enumeradas arriba. | Régimen sancionador del art. 11 de la Ley 37/2007. Omitir la cita de la fuente o la fecha de actualización es una **infracción leve**. La infracción **muy grave** por desnaturalizar o alterar muy gravemente la información solo se aplica a información **sometida a licencia**. En la modalidad general (sin licencia), que es la del Excel, una alteración del contenido encajaría como **grave** (art. 11.2.c) o **leve** (art. 11.3.b), y un incumplimiento de condiciones como **grave** (art. 11.2.d) o **leve** (art. 11.3.d), según su entidad. Fuente: art. 11 de la Ley 37/2007, texto consolidado del BOE (última actualización publicada el 09/05/2023): https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814 | **Alta.** |
| **Mapa base OpenStreetMap / Protomaps** (solo si se usa en la fase 2) | Datos OSM con licencia **ODbL**. Protomaps distribuye su mapa base como "Produced Work" bajo ODbL; el software es BSD. | https://www.openstreetmap.org/copyright · https://docs.protomaps.com/basemaps/downloads · ODbL: https://opendatacommons.org/licenses/odbl/ | Mostrar "© OpenStreetMap" (o "© colaboradores de OpenStreetMap") con enlace a https://www.openstreetmap.org/copyright, **visible en el propio mapa**. MapLibre lo hace con su control de atribución. | Un mapa renderizado es una "obra producida" y no obliga a licenciar nuestros datos con ODbL. Solo obligaría si **mezclamos datos de OSM en nuestras bases de datos** (por ejemplo, coordenadas de presas sacadas de OSM). | **Alta.** |

**Nota sobre datos de alto valor.** El Reglamento de Ejecución (UE) 2023/138 obliga a publicar ciertos conjuntos de datos geoespaciales y medioambientales con CC BY 4.0 o una licencia más permisiva (https://eur-lex.europa.eu/eli/reg_impl/2023/138/oj). Eso explica probablemente la CC BY 4.0 de las capas del IDE. No sabemos si el Excel del boletín se considera dato de alto valor. Confianza: media.

---

## 2. Riesgos concretos

**R1 — Fotos de las presas (riesgo alto).**
- No hay condiciones publicadas, y la ley excluye expresamente los contenidos con derechos de terceros. Si publicamos una foto cuyo autor es una eléctrica o un fotógrafo, la reclamación iría contra nosotros, no contra el MITECO.
- Copiar las fotos o enlazarlas directamente desde el visor SNCZI es además frágil: es un visor, no un servicio de descarga, y las URL pueden cambiar.
- **Recomendación:**
  1. No publicar fotos del SNCZI hasta tener una respuesta por escrito. Se puede pedir a `buzon-itdga@miteco.es` (contacto de los metadatos de Presas) o a `bzn-datos@miteco.es` (contacto de la ficha de datos.gob.es).
  2. Alternativa inmediata: fotos de **Wikimedia Commons** con licencia libre, guardando autor, licencia y URL de cada una. Suelen ser CC BY-SA, que exige atribución por foto y compartir igual *esa foto*, no la web.
  3. Si no hay foto, usar una ilustración o un hueco neutro, sin ninguna imagen "de relleno" que parezca la presa real.
- **Petición a `datos`:** el contrato tiene un campo `foto`. Hace falta que cada foto lleve asociados `foto_autor`, `foto_licencia` y `foto_fuente_url`. Sin esos campos no podemos atribuir. Es un cambio de contrato, así que requiere un ADR.

**R2 — Datos provisionales (riesgo medio).**
- El MITECO dice que todos los datos son provisionales, y la descarga está marcada "Sin Validación". Las semanas ya publicadas pueden cambiar.
- Si mostramos una cifra que el MITECO corrige después y no la actualizamos, podríamos estar "desvirtuando" la información (art. 7.a).
- **Recomendación:**
  - El pipeline reescribe el histórico completo en cada ejecución, como ya prevé el CLAUDE.md.
  - La web dice siempre que los datos son provisionales, junto a la fecha del dato.
  - Los explicadores no presentan una cifra semanal como definitiva.

**R3 — Cálculos propios presentados como si fueran del MITECO (riesgo medio).**
- Las medias plurianuales (corta y larga), las comparaciones con años secos y las agregaciones las calculamos nosotros. La [página del Boletín Hidrológico](https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html) indica que compara con la media de los cinco y de los diez años anteriores, referidas a la misma fecha. Nuestras medias pueden no coincidir con las suyas por periodo, por conjunto de embalses o por método de cálculo. En los textos web, los periodos de las medias se importan (`{anios_media_corta}`, `{anios_media_larga}`), nunca se escriben a mano.
- **Recomendación:** separar siempre "dato del MITECO" de "cálculo propio a partir de datos del MITECO". Explicar el método en la página de metodología. Si las dos medias no coinciden, explicarlo en lugar de esconderlo.

**R4 — Sugerir respaldo oficial (riesgo bajo, fácil de evitar).**
- No usar el logo ni el escudo del ministerio.
- No llamarnos "oficial".
- No incrustar sus visores o paneles en un iframe (el aviso legal prohíbe el *framing*).
- Incluir una frase explícita de independencia (ver textos más abajo).

**R5 — Fecha de actualización y metadatos (riesgo bajo, pero es infracción leve si falla).**
- Omitir la fecha de actualización es una infracción leve según el art. 11 de la Ley 37/2007.
- **Petición a `datos`:** que el pipeline exporte, por cada fuente, la **fecha del dato** (semana del boletín), la **fecha de actualización publicada por el MITECO** (la etiqueta del enlace o la cabecera `Last-Modified` del ZIP) y la **fecha de descarga**. Para el Inventario y las demarcaciones, la fecha de los metadatos.
- Propuesta: un `fuentes.json` o un bloque `meta` dentro de `resumen.json`. Lo decide `datos` con su ADR.
- Además, conservar en `data/raw` los ficheros tal cual, que ya está previsto, y enlazar al aviso legal del MITECO.

**R6 — Límites de las demarcaciones simplificados (riesgo bajo).**
- La fuente ya advierte que sus límites no son oficiales. Al simplificar con mapshaper se pierde aún más precisión.
- Basta con decirlo en la metodología. CC BY 4.0 obliga además a indicar que hemos modificado la capa.

**R7 — Cambios de URL y de nombre de fichero (riesgo operativo).**
- Las notas de prensa siguen llamando al fichero `BD-Embalses_1988-2022.zip`, pero hoy se descarga como `BD-Embalses.zip`.
- Hay enlaces repartidos entre `mapama.gob.es`, `magrama.gob.es` y `miteco.gob.es`.
- Que el scraping falle de forma visible si cambian (para `datos`).

**R8 — Cobertura (informativo).**
- El Excel cubre solo los embalses peninsulares por encima de un umbral de capacidad. Las capas del IDE incluyen islas, Ceuta y Melilla.
- La atribución y la metodología deben decir qué cubre cada cosa. El umbral y el año de inicio se importan de los datos, no se escriben a mano.
- **Resuelto:** cobertura solo peninsular ([ADR 0001](adr/0001-cobertura-solo-peninsula.md)). Las presas insulares del Inventario y las demarcaciones de Baleares, Canarias, Ceuta y Melilla se descartan. Los textos web hablan de la **reserva peninsular**. Los detalles de cobertura (número de embalses, umbral, año de inicio) se importan de los datos.

---

## 3. Textos de atribución propuestos

Convención: lo que va entre llaves `{…}` **se importa de los datos** (`public/data/`), nunca se escribe a mano. Los campos necesarios están en la lista final.

### 3.1 Pie de página (versión corta)

> Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO), Boletín Hidrológico semanal e Inventario de Presas y Embalses. Reserva peninsular: {n_embalses} embalses. Datos provisionales de la semana del {fecha_dato}, actualizados por el MITECO el {fecha_actualizacion_fuente}. Cálculos y gráficos propios. Este proyecto es independiente y no está vinculado al MITECO. Código: MIT · Datos: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es). [Fuentes y metodología](/fuentes)

En las páginas con mapa, el control de atribución de MapLibre añade además:

> © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) · Demarcaciones: MITECO ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es)) · Presas: MITECO ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es))

(La mención a OpenStreetMap solo aplica si en la fase 2 se usa el mapa base OSM/Protomaps.)

En las fichas de embalse con foto, al pie de la imagen (**condicional:** bloqueado hasta resolver R1):

> Foto: {foto_autor} · {foto_licencia} · [fuente]({foto_fuente_url})

### 3.2 Página "Fuentes y metodología" (versión larga)

> ## De dónde salen los datos
>
> Todo lo que ves en esta web sale de datos públicos. No escribimos ninguna cifra a mano: un programa descarga los datos cada semana, los comprueba y genera las páginas. Si los datos de una semana no pasan las comprobaciones, no se publican y la web sigue mostrando la última versión correcta.
>
> ### Reserva de agua en los embalses
>
> **Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO).** Usamos el [Boletín Hidrológico semanal](https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html) y su fichero histórico, que recoge la capacidad y el agua almacenada en los embalses peninsulares de más de {umbral_capacidad_hm3} hm³ desde {primer_anio}.
>
> **Esta web cuenta la reserva peninsular:** {n_embalses} embalses de la Península. Los embalses de Baleares, Canarias, Ceuta y Melilla no están en el histórico del MITECO, así que no aparecen ni en los mapas ni en los totales.
>
> - Último dato: semana del {fecha_dato}.
> - Actualizado por el MITECO: {fecha_actualizacion_fuente}.
> - Descargado por nosotros: {fecha_descarga}.
>
> **Son datos provisionales.** El propio MITECO avisa de que están "sujetos a revisión y validación". Si corrige una semana ya publicada, nosotros también la corregimos en la siguiente actualización. Por eso una cifra de esta web puede cambiar ligeramente de una semana a otra.
>
> ### Situación de las presas y embalses
>
> **Origen de los datos: MITECO,** [Inventario de Presas y Embalses](https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/agua/inventario-presas-embalses.html), con licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es). Versión del {fecha_inventario}. De aquí sacamos la ubicación y los datos técnicos de cada embalse. Para unir el inventario con el boletín hemos cruzado los nombres y los códigos de ambas fuentes. Ese cruce es trabajo nuestro y puede contener errores; si encuentras uno, avísanos.
>
> ### Cuencas (demarcaciones hidrográficas)
>
> **Origen de los datos: MITECO,** [Demarcaciones hidrográficas](https://www.miteco.gob.es/es/agua/servicios/acceso-rapido-datos-agua.html), con licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es). Versión del {fecha_demarcaciones}. Solo mostramos las demarcaciones peninsulares. **Hemos simplificado los límites** para que el mapa cargue rápido en el móvil, así que son aproximados. El propio MITECO advierte de que pueden no coincidir con los límites oficiales.
>
> ### Mapa de fondo
>
> *[Condicional: solo si en la fase 2 se usa el mapa base OSM/Protomaps. Si no, se elimina este bloque.]*
>
> © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright), datos con licencia ODbL. Teselas generadas con [Protomaps](https://protomaps.com).
>
> ### Fotos
>
> *[Condicional: bloqueado por el riesgo R1. Solo se publica cuando haya fotos con licencia confirmada.]*
>
> Cada foto indica su autor, su licencia y de dónde procede.
>
> ### Qué calculamos nosotros
>
> El MITECO publica los volúmenes. Nosotros calculamos:
>
> - el porcentaje de llenado;
> - la variación semanal;
> - las medias de los últimos {anios_media_corta} y {anios_media_larga} años;
> - las comparaciones con años secos.
>
> Son **cálculos propios**, no cifras oficiales. Pueden no coincidir exactamente con los del boletín, por ejemplo si el MITECO calcula su media de otra forma o con otros embalses. [Explicamos aquí cómo lo hacemos](#metodo).
>
> <h3 id="metodo">Cómo calculamos</h3>
>
> *[Pendiente: el texto depende del método que fije `datos` en el pipeline y en `docs/contrato-datos.md`. Debe explicar, sin cifras escritas a mano:]*
>
> - *qué embalses entran en cada total y qué pasa cuando falta el dato de una semana;*
> - *cómo se calcula el porcentaje (volumen entre capacidad, con la capacidad de qué fecha);*
> - *qué semanas y qué años entran en cada media ({anios_media_corta} y {anios_media_larga} años) y cómo se emparejan las semanas de años distintos;*
> - *qué consideramos "año seco" y de dónde sale esa lista;*
> - *en qué se diferencia de las medias que publica el boletín.*
>
> ### Lo que no somos
>
> Este proyecto es **independiente**. El MITECO no participa en él, no lo patrocina y no lo respalda. Para cualquier uso oficial, consulta siempre la [fuente original](https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html).
>
> Reutilizamos esta información de acuerdo con la [Ley 37/2007](https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814), el [Real Decreto 1495/2011](https://www.boe.es/buscar/act.php?id=BOE-A-2011-17560) y el [aviso legal del MITECO](https://www.miteco.gob.es/es/atencion-al-ciudadano/aviso-legal.html).
>
> ### Reutiliza nuestros datos
>
> Puedes usar lo que publicamos, también con fines comerciales, con estas condiciones:
>
> - **El código** de la web y del programa que procesa los datos tiene licencia **MIT**. Puedes copiarlo y adaptarlo. Solo tienes que conservar el aviso de licencia.
> - **Los datos que generamos** (series, resúmenes, tabla de embalses y límites de las cuencas) tienen licencia [**CC BY 4.0**](https://creativecommons.org/licenses/by/4.0/deed.es). Puedes copiarlos, transformarlos y redistribuirlos si citas este proyecto.
> - **Hay que citar también al MITECO.** Los datos de origen son suyos. Indica "Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico" y la fecha de actualización que acompaña a cada fichero.
> - **No cambies el sentido de los datos.** Tampoco des a entender que el MITECO o este proyecto respaldan tu trabajo.
> - **Los límites de las cuencas están simplificados.** Sirven para hacer mapas a escala de país, no tienen valor oficial y no sirven para medir distancias ni superficies. Para eso, usa la [capa original del MITECO](https://www.miteco.gob.es/es/agua/servicios/acceso-rapido-datos-agua.html).
> - **Son datos provisionales:** pueden cambiar cuando el MITECO revise semanas ya publicadas.
> - **Las fotos** no están incluidas: cada una tiene su propia licencia, indicada junto a ella.
>
> Si los datos te sirven para algo, nos encantará saberlo.

*Pendiente para editorial:* la nota sobre "más de {umbral_capacidad_hm3} hm³" necesitará traducir el hm³ a algo imaginable la primera vez que aparezca en la web. Lo resolveremos en el glosario o en el primer explicador.

---

## 4. Licencia del proyecto — Decidido (ADR 0002)

**Decisión del titular del proyecto, 2026-11-17:** código **MIT** y datos derivados **CC BY 4.0**, manteniendo en cascada la atribución al MITECO. Ver [ADR 0002](adr/0002-licencias-mit-y-cc-by.md) y `data/LICENSE.md`. Los datos de origen (`data/raw/`) conservan las condiciones de su fuente. El pie lleva "Código: MIT · Datos: CC BY 4.0" (sección 3.1).

Las tablas siguientes se conservan como **antecedente** del análisis. Las opciones elegidas aparecen marcadas como "(elegida)".

### 4.1 Código

| Opción | A favor | En contra | Compatibilidad con las fuentes |
|---|---|---|---|
| **MIT** (elegida) | La más simple y conocida. Nadie duda de si puede reutilizar el código. Fomenta forks y que lo use la prensa. | No protege frente a que alguien cierre una versión mejorada y la explote sin compartir. No incluye cláusula de patentes. | No interfiere: las licencias de los datos van aparte del código. |
| **Apache-2.0** | Tan permisiva como MIT, pero con concesión explícita de patentes y aviso de cambios. Está bien vista en organizaciones. | Algo más verbosa: exige el fichero NOTICE y marcar los cambios. Es incompatible con GPLv2 (no nos afecta). | No interfiere. |
| **AGPL-3.0** | Si alguien publica una web derivada, tiene que compartir su código. Protege la idea de "bien común". | Echa para atrás a medios y empresas, que podrían no reutilizarlo. Exige más cuidado con las dependencias. Puede frenar la difusión que se busca en la fase 4. | No interfiere con los datos. Las dependencias (Astro, MapLibre, Observable Plot…) son permisivas, así que es compatible. |
| **EUPL-1.2** | Licencia de la Comisión Europea, con versión oficial en español y pensada para el sector público europeo. Es *copyleft* también en red, pero compatible con GPL, AGPL, MPL y otras. Encaja con un proyecto sobre datos públicos españoles. | Menos conocida fuera de las administraciones públicas. Tiene parte del mismo efecto disuasorio que la AGPL. | No interfiere. |

### 4.2 Datos derivados (`public/data/`: series, resumen, tabla maestra cruzada)

| Opción | A favor | En contra | Compatibilidad con las fuentes |
|---|---|---|---|
| **CC BY 4.0** (elegida) | Es la misma licencia que usan las capas del IDE (Inventario y demarcaciones) y la recomendada para datos de alto valor en la UE. Muy conocida. Basta con atribuir. | No impide que alguien cierre una versión mejorada. Hay que dejar claro que la atribución al MITECO se mantiene "en cascada". | **Alta.** Hereda bien la atribución del CC BY 4.0. Para el Excel del boletín, las condiciones del RD 1495/2011 (citar, fechar, no desvirtuar) se cumplen si exigimos mantener la atribución y las fechas que ya viajan en los datos. |
| **ODbL 1.0** | *Share-alike* para bases de datos: quien mejore la tabla maestra tiene que compartirla. Es la licencia natural si algún día **incorporamos datos de OSM** (por ejemplo, coordenadas). | Más compleja, poco conocida fuera del mundo OSM y frena reutilizaciones sencillas, como la de un periodista. Hoy no la necesitamos, porque no mezclamos datos de OSM. | **Aceptable.** Las fuentes MITECO (CC BY 4.0 y condiciones generales) permiten la adaptación con atribución. Si se mezcla OSM, pasa a ser **obligatoria**. |
| **"Mismas condiciones que la fuente"** (reproducir las condiciones generales del RD 1495/2011 o el aviso del MITECO) | Coherencia total con el origen: quien reutilice sabe exactamente lo mismo que si fuera al MITECO. | No es una licencia estándar ni legible por máquinas, lo que complica catalogarla en datos.gob.es. Mezcla un régimen pensado para administraciones con un proyecto privado. Y no permite elegir: las capas del IDE ya son CC BY 4.0. Las obligaciones que impone son prácticamente las mismas que las de CC BY 4.0, que además es estándar. | **Alta.** |
| **CC0 / dominio público** | Máxima libertad para quien reutilice. | Puede dar a entender que quien reutilice no tiene que citar al MITECO, cuando sí debe hacerlo (art. 7 del RD 1495/2011 y CC BY 4.0). El proyecto no puede liberar a terceros de esa obligación, así que haría falta un aviso aparte que la recuerde. | **Baja.** Choca con la obligación de atribución de las fuentes. |

**Fuera de esta decisión:**
- **Fotos:** cada una conserva su propia licencia.
- **Textos editoriales (MDX):** se puede decidir aparte. Las opciones habituales son CC BY 4.0 o CC BY-SA 4.0.
- **Mapa base:** lo cubre ODbL/OSM.

---

## Anexo: datos que el pie y la página de fuentes necesitan importar (petición a `datos`)

| Campo | Para qué | Origen previsto |
|---|---|---|
| `fecha_dato` | Semana a la que corresponde el último dato | Excel del boletín |
| `fecha_actualizacion_fuente` | Fecha de actualización publicada por el MITECO (art. 7.c) | Etiqueta del enlace de la página del boletín, o `Last-Modified` del ZIP |
| `fecha_descarga` | Trazabilidad | Pipeline |
| `primer_anio` | "desde {primer_anio}" | Excel (mínimo de las fechas) |
| `umbral_capacidad_hm3` | "embalses de más de {umbral_capacidad_hm3} hm³" | Configuración del pipeline, documentada en `docs/contrato-datos.md` |
| `n_embalses` | "Reserva peninsular: {n_embalses} embalses" | Pipeline (recuento en `embalses.json` / `resumen.json`) |
| `anios_media_corta` | "medias de los últimos {anios_media_corta} años" | Contrato (`resumen.json`, medias) / configuración del pipeline |
| `anios_media_larga` | "medias de los últimos {anios_media_larga} años" | Contrato (`resumen.json`, medias) / configuración del pipeline |
| `fecha_inventario` | Versión del Inventario de Presas | Metadatos del shapefile o de la ficha IDE |
| `fecha_demarcaciones` | Versión de las demarcaciones | Metadatos IDE |
| `foto_autor`, `foto_licencia`, `foto_fuente_url` | Atribución por foto | Tabla maestra (`data/master`) |

Añadir estos campos al contrato implica cambiar `packages/schema` y escribir un ADR (responsable: `datos`).
