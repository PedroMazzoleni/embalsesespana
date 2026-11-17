# 0006 — Media de 10 años sobre el conjunto común de embalses

- Fecha: 2026-11-17
- Estado: aceptada
- Decide: agente de datos (a revisar por el titular)

## Contexto

El conjunto de embalses del boletín cambia con los años (349 en 1988, 375 en 2026). Comparar el % de hoy con el de hace 8 años usando todos los embalses de cada momento mezcla "el agua ha variado" con "han entrado o salido embalses".

## Decisión

- **Misma semana**: para cada uno de los 10 años anteriores se toma la fecha publicada más cercana al mismo día del año (tolerancia ±3 días; los datos son siempre martes). Si no hay, ese año no cuenta.
- **Conjunto común**: el % de cada año anterior se calcula solo con los embalses que tienen dato en esa semana **y** en la última semana publicada (suma de hm³ / suma de capacidades de esas filas). Lo mismo para la variación semanal y para cada demarcación.
- `media10` = media aritmética de los porcentajes anuales disponibles; si hay menos de 5 años, `null`. `dif_media_pts` = pct actual − media10.
- Capacidad: la de cada fila (el MITECO la revisa con el tiempo), no la actual.
- Filas con volumen > 150 % de la capacidad se descartan como error de la fuente (12 filas, avisadas en cada ejecución). Filas con capacidad 0 o vacías se descartan. Entre 100 % y 150 % se conservan (desbordes y revisiones de capacidad reales).
- Demarcación = la de la tabla maestra (no el "ámbito" del MITECO), por eso Cantábrico Oriental cuenta 6 embalses y no 4.

## Consecuencias

- La media es comparable año a año, pero puede diferir un punto de la "media de todos los embalses de ese año". Con los datos actuales coincide con la muestra de diseño (44,4 %).
- Hay que citar este criterio en la web ("mismos embalses que hoy").
