# 0005 — Dirección visual: "Conversación"

- Fecha: 2026-11-17
- Estado: aceptada
- Decide: titular del proyecto

## Contexto

Siguiendo el método huashu-design se plantearon 6 direcciones (`design/direcciones/directions.md`, `thumbs.html`) y se desarrollaron 3 portadas completas con datos reales: 1 Cartel tipográfico, 2 Unidades y 3 Conversación. Las tres funcionan en móvil.

## Decisión

Se elige la **3, Conversación** (`design/direcciones/3-conversacion.html`) como base de la identidad visual:
- La portada es una sola columna estrecha de preguntas y respuestas ("¿hay agua?", "¿es grave?", "¿sube o baja?", "¿dónde hay más y dónde menos?", "¿y mi embalse?"). Cada respuesta empieza por "sí" o "no", o por un verbo.
- Los títulos van en minúscula y negrita, con Bricolage Grotesque. El texto va en Atkinson Hyperlegible.
- El único acento fuerte es un resaltador amarillo sobre la cifra clave. El fondo es papel claro y el color de los datos es azul río.
- Hay una tira de 10 años para contestar "¿es grave?".

## Consecuencias

- `tokens.css` parte de las variables de esa maqueta. Antes de cerrarlo hay que revisar:
  - los ceros con barra de Atkinson en las cifras, buscando alternativa o una fuente para números;
  - si Montserrat, que gusta al titular, entra en algún papel.
- El tono editorial queda ligado a la estructura: cada página nueva se escribe como respuesta a una pregunta del lector.
- Hay que corregir en las maquetas definitivas el mapa, que en escritorio sale más ancho que la columna, y que el resaltador pisa la línea anterior.
- La escala del mapa de la maqueta es provisional y la sustituye la escala del agua de `dataviz`.
- Las direcciones 1 y 2 se quedan en `design/` como referencia. La cuadrícula de unidades de la 2 puede reaparecer en la ficha de embalse.
