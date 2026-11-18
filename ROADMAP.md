# Roadmap — Embalses de España

Proyecto de una sola persona. Las duraciones son orientativas (dedicación a tiempo parcial) y se revisan al cerrar cada fase.
Cada tarea indica el agente responsable entre corchetes.

**Fase actual: 3**

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
- [x] Monorepo pnpm con `schema`, `pipeline`, `web` [datos]
- [x] Contrato Zod: `embalses`, `series`, `resumen` (`historico` pendiente) [datos]
- [x] Pipeline completo: fetch → clean → validate → export, con tests sobre un Excel de muestra [datos]
- [x] Workflow semanal: si falla la validación, no despliega y abre una incidencia [datos]
- [x] Deploy en Cloudflare Pages + dominio (de momento `embalses-espana.pages.dev`) [frontend]

### Páginas
- [x] Layout base, tipografía, cabecera, pie con atribución [frontend]
- [x] Portada: % de reserva, variación semanal, comparación con media de 10 años, frase "¿es grave?" [frontend + editorial]
- [x] Mapa: demarcaciones coloreadas + puntos de embalses; clic → cuenca → embalse; con relieve (hillshade/terrain de MapLibre) e inclinación para dar sensación 3D, cargado de forma diferida; navegable con teclado (flechas entre demarcaciones) [mapas]
- [x] Ficha de embalse (una página estática por embalse, con SEO): datos, foto, serie histórica [frontend + dataviz] — sin foto: las del Inventario no son reutilizables (R1)
- [x] Gráfico de serie histórica con año actual vs. media vs. años secos [dataviz]
- [x] Página de cuenca [frontend] — falta el gráfico agregado de la cuenca
- [x] Alternativas accesibles (tablas) para mapa y gráficos [frontend]

### Calidad
- [x] Playwright: pruebas básicas de las páginas principales [qa]
- [x] Lighthouse CI en cada cambio con los presupuestos del CLAUDE.md [qa]

**Criterio de salida:** web pública, actualizada automáticamente una semana tras otra sin intervención manual.

---

## Fase 3 — Diferenciación (≈ 4–6 semanas)

Objetivo: lo que nadie más tiene.

- [ ] Máquina del tiempo v1 en 2D: deslizador semana a semana desde 1988 [mapas + dataviz]
- [ ] Máquina del tiempo v2 con deck.gl: columnas de agua 3D animadas (con alternativa 2D) [mapas]
- [ ] Vista técnica 3D de cada embalse con deck.gl: relieve real del vaso (modelo de elevación recortado al polígono del Inventario) lleno hasta un nivel aproximado a partir del volumen, rotulado como aproximación; carga diferida y alternativa 2D [mapas]
- [ ] Primer explicador con scrollama: "¿Es grave la situación?" [editorial + frontend]
- [ ] Explicadores siguientes: sequías históricas, y un tercero que salga de nuestros datos (p. ej. por qué unas cuencas tienen más agua que otras, o usos: regar, beber, luz). Se descarta "de dónde viene el agua de tu ciudad" por falta de fuente unificada [editorial]
- [ ] Comparador de años y cuencas con DuckDB-WASM [dataviz]
- [ ] (Idea, fuera de la Fase 3) Red de trasvases con react-force-graph — requiere buscar fuente de datos [datos]

**Criterio de salida:** máquina del tiempo publicada y al menos 2 explicadores.

---



---

## Registro de cambios del roadmap

- 2026-11-16 — Versión inicial.
- 2026-11-17 — Cobertura: solo península (ADR 0001). Licencias: código MIT, datos CC BY 4.0 (ADR 0002).
- 2026-11-17 — Fase 1: las direcciones visuales siguen el método huashu-design (github.com/alchaincyf/huashu-design, MIT). Se descarta Godot (export web de decenas de MB, fuera del stack); la vista técnica 3D del embalse irá con deck.gl en la Fase 3.
- 2026-11-17 — Fase 0 cerrada: 368 de 375 embalses de la última semana emparejados con coordenadas (98,13 %, `data/master/maestra-stats.json`), histórico documentado, scraping semanal funcionando. ADR 0003 (lector Access) y 0004 (CSV por año). Pendientes para la Fase 2: 7 embalses sin pareja (`data/master/sin-emparejar.csv`), diferencia de capacidad total frente a la prensa, criterio de comparación con la media cuando cambia el conjunto de embalses, revisar emparejamientos de confianza media/baja.
- 2026-11-17 — Fase 1: el mapa SVG de las maquetas es solo de diseño. El mapa real de la Fase 2 llevará relieve e inclinación 3D (MapLibre); las columnas 3D siguen en la Fase 3 (deck.gl).
- 2026-11-17 — Fase 1 cerrada: dirección "Conversación" (ADR 0005), `tokens.css` y `agua.css` cerrados, maquetas de portada, mapa y ficha en `design/maquetas/` (escritorio en dos columnas, modo oscuro azul mar #0b1e30, mapa navegable con flechas). Revisión de qa: bloqueantes corregidos. Pendiente Fase 2: gráficos con Observable Plot renderizados a SVG en build (sin JS) salvo los interactivos; cifras de texto con Montserrat en subconjunto de dígitos.
- 2026-11-18 — Fase 2 cerrada: web pública en https://embalses-espana.pages.dev, actualizada sola (scraping → commit del bot → despliegue; probado con el boletín del 17-11-2026). Si los datos no validan no se publica y se abre incidencia; también si falla el scraping. Playwright 31/31 y Lighthouse móvil 99–100 en CI. ADR 0007: mapa 3D automático solo en escritorio. Pendiente para la Fase 3: gráfico agregado por cuenca, `historico.parquet`, fotos con licencia libre.
- 2026-11-18 — Plan de la Fase 3: primero histórico, máquina del tiempo 2D y 2 explicadores (criterio de salida); después comparador y deck.gl. Decisiones del titular: vista 3D con relieve real del vaso; tercer explicador con tema basado en nuestros datos; trasvases fuera de esta fase.
