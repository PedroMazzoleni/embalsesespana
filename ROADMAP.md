# Roadmap — Embalses de España

Proyecto de una sola persona. Las duraciones son orientativas (dedicación a tiempo parcial) y se revisan al cerrar cada fase.
Cada tarea indica el agente responsable entre corchetes.

**Fase actual: 2**

---

## Fase 0 — ¿Aguantan los datos? (≈ 1–2 semanas)

Objetivo: saber si los datos públicos sostienen el proyecto antes de escribir la web.

- [x] Descargar el Excel histórico de embalses del MITECO y documentar su estructura (hojas, columnas, unidades, rarezas) en `docs/contrato-datos.md` [datos]
- [x] Confirmar qué día y a qué hora publica el MITECO el boletín semanal [datos]
- [x] Descargar el Inventario de Presas y Embalses y extraer coordenadas, capacidad, uso y fotos [datos]
- [x] Construir la tabla maestra cruzando ambas fuentes; medir % de embalses emparejados [datos]
- [x] Obtener el GeoJSON de demarcaciones hidrográficas y simplificarlo con mapshaper [mapas]
- [x] Cargar todo en kepler.gl: comprobar coordenadas y probar a ojo columnas 3D y animación temporal [mapas]
- [x] Revisar condiciones de reutilización y texto de atribución [editorial]
- [x] Decidir cobertura: ¿solo península o también Baleares y Canarias? → ADR [jefe de proyecto]
- [x] Montar el git-scraping semanal del Excel (solo guardar `data/raw`, sin procesar todavía) [datos]

**Criterio de salida:** ≥ 95 % de embalses del Excel emparejados con coordenadas; estructura del Excel documentada; scraping semanal funcionando.

---

## Fase 1 — Dirección visual (≈ 1–2 semanas)

Objetivo: identidad propia antes de construir componentes.

- [x] Brief de diseño: público, tono editorial, referencias (secciones de datos de periódicos) [editorial]
- [x] Explorar 3 direcciones con huashu-design y elegir una → ADR [jefe de proyecto] (elegida: 3 Conversación, ADR 0005)
- [x] Definir `tokens.css`: tipografías, escala tipográfica, espaciado, colores [frontend]
- [x] Diseñar la escala de color del agua (de vacío a lleno) accesible y comprobada en daltonismo [dataviz]
- [x] Maquetas móvil y escritorio de: portada, mapa, ficha de embalse [frontend]
- [x] Revisión de contraste y legibilidad de las maquetas [qa]

**Criterio de salida:** tokens cerrados y maquetas aprobadas de las 3 pantallas del MVP.

---

## Fase 2 — MVP publicado (≈ 3–5 semanas)

Objetivo: primera versión en internet con datos reales que se actualizan solos.

### Cimientos
- [ ] Monorepo pnpm con `schema`, `pipeline`, `web` [datos]
- [ ] Contrato Zod: `embalses`, `series`, `resumen`, `historico` [datos]
- [ ] Pipeline completo: fetch → clean → validate → export, con tests sobre un Excel de muestra [datos]
- [ ] Workflow semanal: si falla la validación, no despliega y abre una incidencia [datos]
- [ ] Deploy en Cloudflare Pages + dominio [frontend]

### Páginas
- [ ] Layout base, tipografía, cabecera, pie con atribución [frontend]
- [ ] Portada: % de reserva, variación semanal, comparación con media de 10 años, frase "¿es grave?" [frontend + editorial]
- [ ] Mapa: demarcaciones coloreadas + puntos de embalses; clic → cuenca → embalse; con relieve (hillshade/terrain de MapLibre) e inclinación para dar sensación 3D, cargado de forma diferida; navegable con teclado (flechas entre demarcaciones) [mapas]
- [ ] Ficha de embalse (una página estática por embalse, con SEO): datos, foto, serie histórica [frontend + dataviz]
- [ ] Gráfico de serie histórica con año actual vs. media vs. años secos [dataviz]
- [ ] Página de cuenca [frontend]
- [ ] Alternativas accesibles (tablas) para mapa y gráficos [frontend]

### Calidad
- [ ] Playwright: pruebas básicas de las páginas principales [qa]
- [ ] Lighthouse CI en cada cambio con los presupuestos del CLAUDE.md [qa]

**Criterio de salida:** web pública, actualizada automáticamente una semana tras otra sin intervención manual.

---

## Fase 3 — Diferenciación (≈ 4–6 semanas)

Objetivo: lo que nadie más tiene.

- [ ] Máquina del tiempo v1 en 2D: deslizador semana a semana desde 1988 [mapas + dataviz]
- [ ] Máquina del tiempo v2 con deck.gl: columnas de agua 3D animadas (con alternativa 2D) [mapas]
- [ ] Vista técnica 3D de cada embalse con deck.gl (presa, vaso y nivel del agua), cargada de forma diferida, con alternativa 2D [mapas]
- [ ] Primer explicador con scrollama: "¿Es grave la situación?" [editorial + frontend]
- [ ] Explicadores siguientes: sequías históricas, de dónde viene el agua de tu ciudad [editorial]
- [ ] Comparador de años y cuencas con DuckDB-WASM [dataviz]
- [ ] (Idea) Red de trasvases con react-force-graph — requiere buscar fuente de datos [datos]

**Criterio de salida:** máquina del tiempo publicada y al menos 2 explicadores.

---

## Fase 4 — Lanzamiento y crecimiento (continuo)

- [ ] Imágenes para compartir en redes generadas por embalse y por semana [frontend]
- [ ] SEO: sitemap, datos estructurados, títulos por embalse [frontend]
- [ ] Analítica respetuosa con la privacidad (Cloudflare Web Analytics) [frontend]
- [ ] Difusión: periodistas de datos, comunidades de datos abiertos, datos.gob.es (catálogo de aplicaciones) [jefe de proyecto]
- [ ] Ideas futuras: alertas por embalse, datos diarios de los SAIH, newsletter semanal

---

## Registro de cambios del roadmap

- 2026-11-16 — Versión inicial.
- 2026-11-17 — Cobertura: solo península (ADR 0001). Licencias: código MIT, datos CC BY 4.0 (ADR 0002).
- 2026-11-17 — Fase 1: las direcciones visuales siguen el método huashu-design (github.com/alchaincyf/huashu-design, MIT). Se descarta Godot (export web de decenas de MB, fuera del stack); la vista técnica 3D del embalse irá con deck.gl en la Fase 3.
- 2026-11-17 — Fase 0 cerrada: 368 de 375 embalses de la última semana emparejados con coordenadas (98,13 %, `data/master/maestra-stats.json`), histórico documentado, scraping semanal funcionando. ADR 0003 (lector Access) y 0004 (CSV por año). Pendientes para la Fase 2: 7 embalses sin pareja (`data/master/sin-emparejar.csv`), diferencia de capacidad total frente a la prensa, criterio de comparación con la media cuando cambia el conjunto de embalses, revisar emparejamientos de confianza media/baja.
- 2026-11-17 — Fase 1: el mapa SVG de las maquetas es solo de diseño. El mapa real de la Fase 2 llevará relieve e inclinación 3D (MapLibre); las columnas 3D siguen en la Fase 3 (deck.gl).
- 2026-11-17 — Fase 1 cerrada: dirección "Conversación" (ADR 0005), `tokens.css` y `agua.css` cerrados, maquetas de portada, mapa y ficha en `design/maquetas/` (escritorio en dos columnas, modo oscuro azul mar #0b1e30, mapa navegable con flechas). Revisión de qa: bloqueantes corregidos. Pendiente Fase 2: gráficos con Observable Plot renderizados a SVG en build (sin JS) salvo los interactivos; cifras de texto con Montserrat en subconjunto de dígitos.
