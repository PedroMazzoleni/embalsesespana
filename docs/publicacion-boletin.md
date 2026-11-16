# Cuándo publica el MITECO el Boletín Hidrológico

Investigación de fase 0 (T2), hecha el 16 y 17 de noviembre de 2026. Las cifras de la BD y las comprobaciones HTTP se pueden reproducir con `node scripts/fase0/auditar-publicacion-boletin.mjs [BD-Embalses.zip]`. Si no se le pasa un ZIP, lo descarga en un directorio temporal fuera del repo y lo borra al terminar.

## Conclusión

| | |
|---|---|
| **Día** | **Martes**. Es la fecha nominal de todos los boletines de la BD |
| **Franja** | La nota de prensa sale normalmente entre las **12:00 y las 15:00, hora peninsular**. Alguna vez sale por la tarde, hacia las 16:00–16:30. El ZIP puede actualizarse algo después: hay un indicio de las 15:21 del 10-11-2026 (ver evidencia 5) |
| **Retrasos** | Hay notas de prensa publicadas en **miércoles** para boletines con fecha del martes. No consta cuándo se actualizaron esas semanas el boletín PDF y el ZIP |
| **Dato vs. publicación** | El periodo del boletín va de lunes a lunes. El boletín y la columna `FECHA` de la BD llevan la fecha del **martes** siguiente |
| **Confianza** | **Alta** para el día y para el desfase entre dato y publicación. **Media** para la franja horaria y para los retrasos al miércoles, porque solo hay metadatos de notas de prensa y cabeceras HTTP poco fiables |

## URLs exactas

- Página del boletín: https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html
- Histórico de embalses (ZIP): https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/Historico-de-embalses/BD-Embalses.zip
  - La ruta que enlaza la página (`/es/agua/temas/.../Historico-de-embalses/BD-Embalses.zip`) responde con un 301 a esta.
  - **No es un Excel.** Es un ZIP de unos 10 MB que contiene una base Access, `BD-Embalses.mdb` (unos 223 MB), con una sola tabla: `T_Datos Embalses 1988-2026`. Esa tabla tiene 724 967 filas.
  - Es **acumulativo**: cada versión trae el histórico completo desde 1987.
- Boletín PDF (aplicación BoleHWeb). Se puede descargar directamente, sin sesión:
  `https://sede.miteco.gob.es/BoleHWeb/accion/cargador_archivo.htm?file=cache/pdf/{AAAA}{SS}/{AAAA}{SS}{NN}_es.pdf&mimetype=application/pdf`
  - `NN` indica la sección: 40 resumen, 50 pluviometría, 60 reserva hidráulica, 70 análisis de la reserva, 80 tendencia, 90 caudales.
  - Ejemplo, el resumen del 10-11-2026: https://sede.miteco.gob.es/BoleHWeb/accion/cargador_archivo.htm?file=cache/pdf/202645/20264540_es.pdf&mimetype=application/pdf
  - **`SS` no se debe calcular a mano.** En las muestras de 2025 y 2026 coincide con la semana `%W` (semanas que empiezan en lunes, no ISO): 202507 es el 18-02-2025, 202544 el 04-11-2025, 202551 el 23-12-2025, 202552 el 30-12-2025, 202601 el 06-01-2026 y 202645 el 10-11-2026. Los bordes de año no se pueden comprobar:
    - 201900, 201901, 201902, 202453, 202500 y 202501 devuelven un cuerpo vacío.
    - El propio formulario de BoleHWeb no da enlace para fechas de 2019 a 2025.
    - Para 2026 el formulario devuelve el boletín de la semana siguiente: al pedir el 13-01-2026 da 202603, cuyo PDF lleva FECHA 20-01-2026.
    - Si alguna vez hace falta el PDF, hay que leer la `FECHA:` impresa dentro del documento.
  - Si el PDF no existe, el servidor responde **200** con `Content-Type: application/pdf` y **0 bytes**. Hay que comprobar la firma `%PDF`, no el código HTTP.
- En `www.miteco.gob.es` las peticiones **HEAD no son fiables**. La nota del 10-11-2026 y la del 27-10-2026 dan **404 con HEAD (curl) y 200 con GET**. Desde Node, el HEAD dio 200 pero con otro `Last-Modified`. **Cualquier comprobación de disponibilidad debe hacerse con GET.**

## Evidencias

1. **Texto oficial.** La nota del MITECO sobre la nueva aplicación dice que los datos "se publican todos los martes en formato pdf": https://www.miteco.gob.es/content/dam/miteco/es/prensa/220330nuevoboletinhidrologico_tcm30-538829.pdf. La página del boletín solo habla de "periodicidad semanal".
2. **Calendario de la BD** (salida del script, sección 1, ZIP del 10-11-2026):
   - Hay **2030 fechas distintas**, todas en **martes**. Ninguna fila tiene hora distinta de 00:00 ni fecha vacía.
   - **2 son fechas sueltas** de 1987: 1987-10-06 y 1987-10-13. Después hay un salto de 84 días.
   - Las otras **2028** forman la serie principal, del 1988-01-05 al 2026-11-10. Son exactamente los 2028 martes de ese intervalo, sin huecos ni duplicados.
3. **Embalses por semana** (script, sección 2):
   - **375** en la última fecha, 2026-11-10, y en todas desde el 2026-10-06.
   - **374** desde el 2023-10-03 hasta el 2026-09-29.
   - Antes hubo cambios en 2022 (de 371 a 372) y 2023 (de 372 a 374).
4. **Periodo de los PDF.** Leído con `pdftotext` en la portada del resumen (`NN=40`):

   | Boletín | FECHA | Periodo |
   |---|---|---|
   | 202645 | 10-11-2026 | 2 nov – 9 nov 2026 |
   | 202644 | 03-11-2026 | 26 oct – 2 nov 2026 |
   | 202601 | 06-01-2026 (festivo de Reyes) | 29 dic 2025 – 5 ene 2026 |
   | 202551 | 23-12-2025 | 15 dic – 22 dic 2025 |
   | 202544 | 04-11-2025 | 27 oct – 3 nov 2025 |
   | 202507 | 18-02-2025 | 10 feb – 17 feb 2025 |

5. **Hora de publicación.** Se toma de las notas de prensa semanales "La reserva hídrica española se encuentra al X %", que se publican con el boletín. Todas las horas están en **hora peninsular**: CET (UTC+1) o CEST (UTC+2) en verano.
   - **Hora del PDF**: el `CreationDate` interno. Es fiable porque lleva su zona horaria.
   - **Subida**: el `Last-Modified` de un GET, pasado a hora peninsular. Solo se usa cuando cae el mismo día y minutos después del `CreationDate`. Si no coincide, se descarta (ver evidencia 6).
   - **Página**: el `datePublished` del JSON-LD de la noticia web. Viene marcado como `Z`, pero el 10-11-2026 encaja mejor con que sea hora local: `12:38Z` frente a una subida del PDF a las 12:37 CET. Por eso se dan las dos lecturas.

   | Nota | Día | Hora del PDF | Subida (Last-Modified) | Página (JSON-LD) |
   |---|---|---|---|---|
   | [10-11-2026](https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/noviembre/la-reserva-hidrica-espanola-se-encuentra-al-55-3---de-su-capacid.html) | martes | 12:24 | 12:37 (indicio: otro GET dio 11-11 19:32 GMT) | 12:38 local o 13:38 |
   | [27-10-2026](https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/octubre/la-reserva-hidrica-espanola-se-encuentra-al-56-8---de-su-capacid.html) | martes | 12:31 | 12:53 | 13:54 local o 14:54 |
   | [29-09-2026](https://www.miteco.gob.es/content/dam/miteco/es/prensa/septiembre-2026/20260929_NdP_La_reserva_h%C3%ADdrica_espa%C3%B1ola_se_encuentra_al_59,2.pdf) | martes | 12:21 CEST | 12:32 CEST | — |
   | [24-02-2026](https://www.miteco.gob.es/content/dam/miteco/es/prensa/20260224_NdP_La_reserva_h%C3%ADdrica_espa%C3%B1ola_se_encuentra_al_83.pdf) | martes | — | 13:42 (indicio, no hay `CreationDate` para contrastar) | — |
   | [05-11-2025](https://www.miteco.gob.es/content/dam/miteco/es/prensa/25_11_05_La_reserva_h%C3%ADdrica_espa%C3%B1ola_se_encuentra_al_51,3.pdf) | **miércoles** (boletín del 04-11) | 13:14 | 13:23 | — |
   | [19-02-2025](https://www.miteco.gob.es/content/dam/miteco/es/prensa/25.02.19.%20La%20reserva%20h%C3%ADdrica%20espa%C3%B1ola%20se%20encuentra%20al%2058%20por%20ciento.pdf) | **miércoles** (boletín del 18-02) | 14:27 | 14:37 | — |
   | [07-01-2025](https://www.miteco.gob.es/content/dam/miteco/es/prensa/25_01_07_La%20reserva%20hidrica.pdf) | martes, tras el festivo del lunes 6 | **16:01** | 16:33 | — |
   | [10-12-2024](https://www.miteco.gob.es/content/dam/miteco/es/prensa/24.12.10.%20La%20reserva%20h%C3%ADdrica%20espa%C3%B1ola%20se%20encuentra%20al%2051,5%20por%20ciento.pdf) | martes | 13:07 | 13:12 | — |

   - Otras notas de 2025 y 2026 consultadas también son de martes, según la fecha del nombre de fichero o de la URL: 18-08-2026, 30-06-2026, 02-06-2026, 19-08-2025, 15-07-2025 y 03-06-2025.
   - **ZIP (indicio).** El `.mdb` dentro del ZIP tiene fecha interna **2026-11-10 13:58**, en hora local y sin zona. Un GET al ZIP devolvió `Last-Modified: Tue, 10 Nov 2026 14:21:41 GMT`, es decir, las 15:21 CET. La página rotula la descarga como "10-11-2026". Así que el ZIP se habría actualizado el martes entre las 14:00 y las 15:20, probablemente después de la nota de prensa.
6. **Las cabeceras HTTP no sirven para detectar cambios.** Comprobado con `curl -I` y con GET desde Node el 16 y 17-11-2026:
   - Para el mismo ZIP se obtuvieron **dos `Last-Modified` distintos** según la petición: `Mon, 16 Nov 2026 13:15:43 GMT` con `ETag "9c3d56-66064933f929d"` y `Tue, 10 Nov 2026 14:21:41 GMT` sin ETag. El contenido era el mismo, la semana del 10-11.
   - Notas de prensa antiguas muestran `Last-Modified` de noviembre de 2026. El CMS (AEM) vuelve a publicar ficheros sin que cambie su contenido.
   - Los PDF de BoleHWeb no envían `Last-Modified` ni `ETag`.
   - Por eso en la evidencia 5 un `Last-Modified` solo cuenta cuando lo corrobora un `CreationDate` del mismo día unos minutos antes. Si no, se marca como indicio.

## Festivos y retrasos

- **Martes festivo.** El boletín conserva la fecha del martes, como muestra el 06-01-2026 en la serie. No consta a qué hora se publicó.
- **Lunes festivo.** Puede llevar la publicación a la tarde del martes: el 07-01-2025 la nota salió a las 16:01.
- **Notas en miércoles sin festivo aparente.** Las semanas del 04-11-2025 y del 18-02-2025 tuvieron la nota el miércoles a mediodía (13:14 y 14:27). Lo que se sabe es que **la nota** salió el miércoles. **No consta** cuándo se actualizaron el boletín y el ZIP; pudo ser el martes. Confianza media.
- **Próximo riesgo.** El martes **8-12-2026** es festivo nacional (Inmaculada). Lo esperable es que se publique el miércoles 9 o más tarde.
- **Hora peninsular y UTC.** La diferencia es de 1 h en invierno y de 2 h en verano.

## Recomendación de cron (GitHub Actions, UTC)

```yaml
on:
  schedule:
    - cron: "37 17 * * 2"   # martes 17:37 UTC = 18:37 CET / 19:37 CEST
    - cron: "37 15 * * 3"   # miércoles 15:37 UTC = 16:37 CET / 17:37 CEST
    - cron: "37 15 * * 4"   # jueves 15:37 UTC: último intento y aviso
  workflow_dispatch:
```

- **Martes.** El margen es de unas 3 h 40 min en invierno y 4 h 40 min en verano sobre el final de la franja habitual (15:00). Sobre el indicio del ZIP (15:21 CET) son unas 3 h 15 min en invierno. También cubre los casos de tarde (16:00–16:30).
- **Miércoles.** La ejecución está a las 15:37 UTC y no a primera hora porque los retrasos documentados salieron a mediodía (13:14 y 14:27). Una ejecución el miércoles a las 07:37 UTC no habría recogido ninguno de los dos.
- **Jueves.** Es el último intento. Si para entonces sigue sin haber semana nueva, se abre una incidencia de aviso, sin bloquear nada. Una publicación aún más tardía no hace perder datos: el ZIP es acumulativo, así que la recoge la ejecución del martes siguiente.
- **Minuto 37.** Se evitan las horas en punto porque GitHub retrasa o descarta ejecuciones programadas cuando hay mucha carga.
- **Cuándo hacer commit.** Se decide por el **contenido**, no por la fecha:
  - Se exporta la tabla del `.mdb` a un CSV normalizado: columnas ordenadas, `FECHA` como `AAAA-MM-DD`, valores como texto sin espacios sobrantes y filas ordenadas.
  - Se calcula su **sha256** y se compara con el de la última versión guardada en `data/raw`. Si **cambia**, se guarda y se hace commit, **aunque la última `FECHA` sea la misma**.
  - Así se conservan las **revisiones de semanas pasadas**. Son datos provisionales y CLAUDE.md exige poder reescribirlos.
  - No vale el hash del ZIP ni del `.mdb` crudo, que pueden cambiar sin cambios de datos.
  - El script de auditoría implementa este hash (sección 3). Para el ZIP del 10-11-2026 da `f43e509887e6245d254e7f4c0b16ba71763b4d69be08f2c19687a7b5e0a300f9`.
- **Para qué sirve la última `FECHA`.** Solo para saber si hay **semana nueva**. Con ella se decide si el reintento del jueves debe avisar y se registra en el commit qué semana trae.

## Anomalías que afectan a otras tareas

- **El "Excel histórico" es una base Access (.mdb) comprimida en ZIP.** SheetJS y ExcelJS no la leen. El repo ya usa `mdb-reader` (Node puro) en `scripts/fase0/`. Esto cambia el stack del CLAUDE.md, así que conviene un ADR del jefe de proyecto.
- La BD tiene **dos fechas sueltas de 1987** (1987-10-06 y 1987-10-13), separadas 84 días del inicio real de la serie, el 1988-01-05.
- `FECHA` en la BD es la fecha del boletín (martes). El periodo que cubre termina el **lunes anterior**, y el contrato debería documentarlo.
- La nota de prensa de agosto de 2026 llama al fichero `BD-Embalses_1988-2022.zip`, pero el nombre real es `BD-Embalses.zip`.
- El formulario de BoleHWeb no ofrece PDF de 2019 a 2025 y, para fechas de 2026, devuelve el boletín de la semana siguiente.
