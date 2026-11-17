# Seis direcciones para la portada

Método: huashu-design (`references/directions.md`, fases 4a a 4d), adaptado a Embalses de España. Todas las cifras de las maquetas salen de `datos-muestra.js` (generado desde los CSV del MITECO por `design/scripts/generar-muestra.mjs`). Las tres primeras con portada completa están en `1-cartel.html`, `2-unidades.html` y `3-conversacion.html`; las otras tres, solo en `thumbs.html`.

Limitaciones declaradas:
- No se ejecutaron los scripts del skill (`ref_board.py`, `polish.py`, `design_lint.py`) ni se abrieron las imágenes de muestra del catálogo; no hay capturas. Las referencias reales se leyeron como texto (WebFetch), no se vieron en pantalla: lo que se toma de ellas es estructura editorial, no aspecto exacto. La revisión visual queda para el jefe de proyecto.
- Los nombres de diseñadores se usan como método de pensamiento, no como imitación de una obra concreta; lo que se afirma de ellos es de conocimiento general, sin verificar en línea.

Ruleta (segundos de `date +%S`): lectura 20 en el catálogo web (20 estilos): 20 % 20 + 1 = nº 1. Lectura 24 en el catálogo Asia oriental (12 estilos): 24 % 12 + 1 = nº 1. Dos lecturas distintas, una por categoría.

## Contenido común (spec)
Público: ciudadano curioso, móvil, 5 segundos. Mensaje: "% de reserva peninsular, comparado con la media de 10 años y con los 10 años anteriores, variación semanal, dónde hay más y menos, tres embalses". Formato: portada web 375 px a 1440 px. Sin fotos (riesgo R1 de reutilización).

## Tarjetas

| Campo | 1. Cartel tipográfico | 2. Unidades |
|---|---|---|
| Lógica y fuente | Mejor diseñador, audaz: Paula Scher (Pentagram) como método: la letra como imagen y los mapas hechos de nombres | Mejor diseñador, contenido: Otto Neurath y Gerd Arntz (Isotype) como método: una unidad = una cantidad fija |
| Qué se toma | Contraste de escala extremo (cifra a 40 % del ancho), color plano saturado, nombres de lugar como parte de la geografía | Contar con unidades repetidas en vez de ejes; filas de unidades con el mismo tamaño; nada de decoración; la unidad se declara |
| Material protagonista | Cifra gigante en Montserrat 800 y mapa de demarcaciones con los nombres de las cuencas grandes encima | Cuadrícula de 100 unidades (1 % de la capacidad cada una) y tiras de 20 unidades por demarcación |
| Esqueleto | Cartel apilado a sangre: cifra, frase, mapa con rótulos, lista de tres embalses en filas anchas | Dos módulos lado a lado: la cuadrícula de nivel (con la media como línea) y el texto; debajo tabla de tiras |
| Dónde va la audacia | La cifra ocupa casi todo el ancho del móvil, sobre un azul plano | La media de 10 años como línea que cruza la cuadrícula: se ve a ojo si estamos por encima |
| La forma sale de | Los nombres de las cuencas (Ebro, Duero, Tajo) son lo que la gente reconoce del territorio | Un embalse es un recipiente con un nivel; 100 unidades hacen visible ese nivel sin eje |

| Campo | 3. Conversación | 4. Apertura de diario |
|---|---|---|
| Lógica y fuente | Referencia real: The Pudding (pudding.cool; leída como texto, sin captura) | Referencia real: pieza de elDiario.es sobre reservas "embalse a embalse" (brief, ref. 3; leída como texto, sin captura) |
| Qué se toma | Titulares en forma de pregunta, minúsculas en negrita, respuestas que empiezan por verbo o por "sí/no", columna estrecha | Cifra clave en una línea de apertura y comparación con la última década como argumento |
| Material protagonista | Preguntas y respuestas tipográficas, resaltado de color sobre la cifra, tira de 10 años | Tira de los 10 años en la misma semana, mini-mapa, titular serif |
| Esqueleto | Una sola columna de pregunta, respuesta, pregunta, respuesta; el mapa responde a "¿dónde?" | Rejilla de tres columnas con filetes: titular, tira de década, mapa y lista |
| Dónde va la audacia | Que la portada sea literalmente la conversación que el lector tiene en la cabeza | La tira de 10 años: el año actual es la barra más alta |
| La forma sale de | Las tres preguntas del brief ("¿hay agua?", "¿es grave?", "¿mi embalse?") ya son el guion | La pregunta "¿es grave?" se contesta con el pasado: 10 barras, una por año |

| Campo | 5. Rejilla brutalista (ruleta web nº 1) | 6. Libro de lectura lenta (ruleta Asia oriental nº 1) |
|---|---|---|
| Lógica y fuente | Estilo nº 1 del catálogo web: Editorial Brutalism (referencia del catálogo: Bloomberg Businessweek, Richard Turley) | Estilo nº 1 del catálogo oriental: Lü Jingren, diseño de libros |
| Qué se toma | Titular gigante comprimido contra texto de 14-16 px, filetes de 1 px que parten módulos, negro, blanco, azul de enlace y un naranja de señal | Mancha de texto desplazada, columna estrecha de notas al margen, un único acento de color, mucho blanco |
| Material protagonista | Cifra y titular tipográficos, módulos de datos separados por filetes | Texto con notas laterales y mapa en el margen |
| Esqueleto | Rejilla modular de celdas con filetes, alta densidad | Página con folio asimétrico: cuerpo estrecho y columna de notas |
| Dónde va la audacia | Ninguna zona de aire: la cifra pisa el texto | Casi todo el espacio vacío salvo la cifra |
| La forma sale de | El boletín del MITECO es un parte semanal: densidad de parte | Los datos tienen 38 años de memoria: lectura de archivo |

Nota sobre la 6: es el aspecto "papel cálido + serif + acento rojo" que el skill señala como predeterminado. Se deja como alternativa y no se desarrolla.

## Elección de las tres completas
Criterio del skill: fuertes por sí solas, distintas en estructura y no del mismo grupo de aspecto.
- 1 Cartel: estructura apilada a sangre, tipografía como imagen, fondo azul plano saturado.
- 2 Unidades: estructura de módulos en rejilla con unidades contables, fondo claro frío y sobrio.
- 3 Conversación: estructura de una columna narrativa, texto como protagonista, fondo claro con resaltador.
Quedan fuera la 4 (próxima a la 3 en el uso de la tira de 10 años, que la 3 ya incorpora), la 5 (muy cercana a la 1 en contraste de escala y a un periódico denso) y la 6 (aspecto por defecto).
