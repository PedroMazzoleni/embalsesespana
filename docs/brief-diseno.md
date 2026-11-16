# Brief de diseño — Embalses de España

Fase 1, tarea 1. Para `frontend` y `dataviz`. Fecha: 2026-11-17. Todos los números de este documento son marcadores (`{pct}`): en la web salen siempre de los datos.

## 1. Público y situaciones de uso

**Quién:** ciudadano curioso, sin formación técnica. Llega desde el móvil, casi siempre desde una noticia, una búsqueda ("embalses España hoy", "pantano de X") o un enlace compartido. Lee de pie, con poco tiempo y con datos móviles.

**Qué pregunta trae** (la portada y cada ficha deben responderlas, por este orden):
1. **"¿Hay agua?"** Respuesta en los primeros 5 segundos: el % de reserva y una palabra.
2. **"¿Es grave?"** Contexto inmediato: frente a hace una semana, frente a la media de 10 años, frente a los años secos.
3. **"¿Cómo está mi embalse?"** Buscar por nombre o provincia y ver su ficha sin pasar por el mapa.
4. **"¿Me afecta?"** (secundaria) De qué cuenca bebe mi zona. Se resuelve con enlaces a la cuenca.

**Situaciones:** ojeada de 10 segundos en el móvil; lectura de 2 minutos de la ficha de un embalse (pueblo, vacaciones, pesca, riego); exploración tranquila en escritorio (mapa, histórico). El diseño se prueba primero a 360 px de ancho.

## 2. Tono editorial y voz

Periodismo de datos: riguroso, cercano, sin alarmismo ni triunfalismo. Frases cortas. Un número, una comparación, una conclusión. Si hay hm³, se traducen a algo imaginable la primera vez. Se dice cuándo un dato es provisional y de dónde viene (MITECO). La web habla de la **reserva peninsular** (ADR 0001), no de "toda España".

| Bueno | Malo |
|---|---|
| "Los embalses están al {pct} %. Es {comparacion} que la media de los últimos 10 años." | "¡ALERTA! Los pantanos se secan" |
| "Esta semana han ganado {pct_var} puntos. Aún están por debajo de lo habitual." | "Récord histórico de euforia hídrica" |
| "Este embalse está al {pct} %. En esta época suele estar al {pct_media} %." | "Nivel de llenado: {pct} % (σ = ...)" |
| "Datos provisionales del MITECO; pueden cambiar la semana que viene." | "Fuente: varios" / sin fuente |
| "¿Es grave? Depende de la cuenca: esta está {estado}." | "La situación es crítica" (sin comparación) |
| "Capacidad: {hm3} hm³, el equivalente a {piscinas} piscinas olímpicas." (la equivalencia se calcula, no se escribe) | "Capacidad útil: {hm3} hm³" sin explicar |

Reglas rápidas: verbo antes que adjetivo; "reserva" y "embalse" mejor que "stock hídrico" o "volumen embalsado"; nunca "crisis", "colapso" o "recuperación total" sin un dato que lo respalde; el titular dice qué pasa, no cómo sentirse.

## 3. Identidad

**Debe transmitir:**
- **Agua:** materia, profundidad, nivel que sube y baja. No gotas de clip-art.
- **Territorio:** España peninsular reconocible; cuencas, valles, presas. Cartografía con carácter.
- **Tiempo:** estaciones, años hidrológicos, memoria desde 1988. El dato nunca está solo: tiene pasado.
- **Rigor:** fuente visible, provisionalidad declarada, escala honesta (el eje del % empieza en 0).

**Evitar:**
- Estética de plantilla o dashboard SaaS: tarjetas idénticas con sombra suave, KPI gigantes con flechita verde/roja, esquinas redondas por defecto.
- Look Tailwind (gris-azulado, utilidades visibles, tipografía del sistema sin criterio).
- Azul corporativo genérico (#0d6efd y primos) como único recurso de "agua".
- Iconografía de stock: gotas, olas, presas dibujadas en 3D, fotos de manos con agua.
- Rojo/verde como única codificación (daltonismo) y semáforos alarmistas.

## 4. Referencias

Verificación hecha el 2026-11-17. "Carga" = la URL se abrió desde el entorno del editor. Los dominios marcados como bloqueados no se pudieron abrir desde aquí (el entorno no los permite); su URL consta en buscadores y es la canónica, pero conviene abrirla a mano antes de citarla.

| # | Referencia | URL | Estado | Qué tomar |
|---|---|---|---|---|
| 1 | The Pudding | https://pudding.cool | Carga | Narrativa: titulares en forma de pregunta y respuesta directa; tono conversacional; personalidad propia sin perder rigor. |
| 2 | Civio (España en llamas, Verba) | https://civio.es | Carga | Datos públicos españoles contados para ciudadanos; mapas de territorio español; transparencia de fuentes y metodología. |
| 3 | elDiario.es, embalse a embalse | https://www.eldiario.es/sociedad/lluvias-disparan-reservas-agua-mayor-nivel-decada-datos-embalse-embalse_1_12958278.html | Carga | Competencia directa: reserva por año hidrológico (octubre a septiembre) y comparación con la última década. Copiar el enfoque de comparación; superarlo en ficha por embalse. |
| 4 | Maldita.es, lluvias y reservas | https://maldita.es/clima/20240806/situacion-sequia-espana-lluvia/ | Carga (parcial) | Comparación con medias de 5 y 10 años y con la lluvia. Verificación y lenguaje claro. |
| 5 | FT Chart Doctor / Visual Vocabulary | https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md | Aparece en buscador; no abierta | Criterio: qué gráfico para qué pregunta (series temporales, rango, desviación). Anotaciones directas sobre el gráfico en lugar de leyendas. |
| 6 | Reuters Graphics (Graphics Kit) | https://reuters-graphics.github.io/docs_graphics-kit | Aparece en buscador; no abierta. `reuters.com/graphics` bloqueado | Gráficos pensados primero para móvil, con anotación y un solo mensaje por pieza; peso contenido. |
| 7 | NYT The Upshot | https://www.nytimes.com/section/upshot | Bloqueado | Scrollytelling y "tu zona frente a la media": poner al lector dentro del dato. Tipografía serif editorial con cifras claras. |

No se incluyen RTVE Lab, El País ni Berliner Morgenpost: no se encontró una pieza concreta y verificable sobre embalses o sequía. Si el jefe de proyecto quiere sumarlas, necesitamos una URL de pieza, no de portada.

## 5. Restricciones de diseño

- **JS en portada < 150 KB.** Mapa y gráficos pesados, diferidos. Sin librerías de UI.
- **Contraste WCAG AA** en texto y en la escala de color del agua (3:1 mínimo para elementos gráficos; 4,5:1 para texto). Comprobar también con daltonismo.
- **Alternativa textual** para cada mapa y gráfico: tabla o frase resumen visible o accesible.
- **CSS nativo + tokens** en `packages/web/src/styles/tokens.css`. Prohibido Tailwind y librerías de componentes con estética propia.
- **Fuentes con licencia libre** (Google Fonts u otras OFL), autoalojadas, subconjunto latino, WOFF2. Máximo 2 familias y 3 a 4 variantes en total (por ejemplo 400 y 700, cursiva solo si hace falta). `font-display: swap`.
- Móvil primero; el escritorio añade espacio, no funciones.

## 6. Encargo para la tarea 2: tres direcciones distintas

Las tres deben diferenciarse a simple vista (tipografía, paleta, forma del dato y del mapa). Las fuentes y colores son orientativos; las decide cada exploración.

**Preferencia del titular: Montserrat.** Al menos una dirección la usa como tipografía principal (encaja de forma natural en la B, como sans geométrica). Las otras pueden emparejarla con su serif o con su sans de acento para que se vea cómo funciona en contextos distintos.

**A. "Periódico" (editorial).**
- Tipografía: serif de texto con carácter (p. ej. Source Serif 4, Newsreader o Fraunces) + sans sobria para etiquetas (p. ej. Inter Tight o IBM Plex Sans).
- Paleta: papel crudo, tinta casi negra, un acento tinta azul profunda y un ocre para "seco". Muy poco color; el agua aparece solo en el dato.
- % de reserva: cifra tipográfica enorme en serif, como titular, con una frase debajo ("{pct} %: {comparacion} que la media").
- Mapa: tinta sobre papel, cuencas con tramas finas y rótulos serif; puntos pequeños y anotaciones al estilo FT/Reuters.

**B. "Cartográfico" (técnico).**
- Tipografía: sans geométrica o grotesca con cifras tabulares (p. ej. Space Grotesk, IBM Plex Sans) + monoespaciada para valores (IBM Plex Mono, JetBrains Mono).
- Paleta: fondo claro o muy oscuro de "plano", líneas finas, rampa del agua de arena a azul-verdoso profundo; acento cian/naranja de aviso.
- % de reserva: medidor tipo "nivel" (un depósito/escala vertical con graduaciones y la media marcada), con lectura numérica en mono.
- Mapa: protagonista desde la portada; curvas de nivel, retícula, cuencas como unidades; el mapa es la navegación.

**C. "Cálido" (humano).**
- Tipografía: sans redondeada o humanista con personalidad (p. ej. Nunito Sans, Outfit o DM Sans) + una serif cursiva de acento puntual.
- Paleta: tierras cálidas (arcilla, trigo, oliva) como base y azules lacustres y turquesas solo para el agua; fondos suaves, no blancos puros.
- % de reserva: una "vasija" o ilustración sencilla de un embalse que se llena, con frase en primera persona del plural ("Los embalses están al {pct} %").
- Mapa: formas orgánicas y suaves; cuencas como manchas de color; menos cuadrícula. Las fotos del inventario no se pueden reutilizar (riesgo R1 de `docs/reutilizacion-atribucion.md`): en las maquetas se usan huecos o ilustración, y en el futuro solo fotos con licencia libre (Wikimedia Commons) y autor visible.

**Criterio de comparación** para el ADR: las tres deben cumplir la sección 5; se juzgan por (1) ¿se responde "¿hay agua?" en 5 segundos en móvil?, (2) coste en KB de fuentes y JS, (3) contraste de la escala del agua, (4) carácter propio frente a una plantilla.
