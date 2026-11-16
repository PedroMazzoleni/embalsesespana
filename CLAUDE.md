# Embalses de España — CLAUDE.md

Web que cuenta el estado de los embalses de España a **ciudadanos curiosos**, con datos públicos del MITECO.
No competimos en cantidad de datos (embalses.es ya tiene 449 embalses en tiempo real): **competimos contando la historia**.

> Antes de empezar cualquier tarea, lee `ROADMAP.md` para saber en qué fase estamos y qué toca.

## Principios (no negociables)

1. **Datos y web separados.** El pipeline produce ficheros; la web solo los lee. Se comunican a través del contrato de `packages/schema`.
2. **Ninguna cifra inventada.** Todo número que aparezca en la web sale de los datos generados por el pipeline. Nada de cifras a mano en componentes ni en textos MDX: se importan.
3. **Si los datos no validan, no se publica.** La web sigue mostrando la última versión buena.
4. **Para personas, no para analistas.** Lenguaje claro, contexto ("¿es grave?"), comparaciones con la media y con años secos.
5. **Móvil primero y accesible.** Cada mapa y gráfico tiene alternativa en tabla o texto.
6. **Identidad propia.** Nada de estética genérica de plantilla.

## Stack

| Capa | Decisión |
|---|---|
| Lenguaje | Node + TypeScript en todo el proyecto |
| Monorepo | pnpm workspaces |
| Web | Astro (estático) + islas React solo donde haya interactividad |
| Estilos | CSS nativo + tokens en `packages/web/src/styles/tokens.css`. **Prohibido Tailwind** y librerías de componentes con estética propia |
| Contrato de datos | Zod en `packages/schema`, compartido por pipeline y web |
| Excel | SheetJS (instalado desde su CDN oficial) o ExcelJS |
| Transformación | Arquero o funciones propias |
| Parquet | DuckDB para Node |
| Mapa | MapLibre GL + PMTiles; deck.gl solo en fase 3 |
| Gráficos | Observable Plot |
| Narrativa | scrollama (explicadores) |
| Geometrías | mapshaper |
| Tests | Vitest (pipeline/schema) · Playwright (web) · Lighthouse CI |
| CI | GitHub Actions semanal |
| Hosting | Cloudflare Pages |

## Estructura

```
embalses/
├─ packages/
│  ├─ schema/      Zod: contrato de datos (fuente única de tipos)
│  ├─ pipeline/    fetch → clean → validate → export
│  └─ web/         Astro
│     ├─ src/pages/       portada, mapa, embalse/[slug], cuenca/[slug], comparador
│     ├─ src/content/     explicadores en MDX
│     ├─ src/components/  componentes .astro + islas React
│     ├─ src/styles/      tokens.css, base.css
│     └─ public/data/     SALIDA DEL PIPELINE — nunca editar a mano
├─ data/
│  ├─ raw/         Excel del MITECO tal cual (git-scraping, un commit por semana)
│  ├─ master/      tabla maestra de embalses (curada + Inventario de Presas)
│  └─ geo/         demarcaciones simplificadas
├─ docs/
│  ├─ adr/         decisiones de arquitectura (una nota corta por decisión)
│  └─ contrato-datos.md
└─ .github/workflows/  scrape.yml (semanal) · deploy.yml
```

## Contrato de datos (resumen; la verdad está en `packages/schema`)

- `embalses.json` — id, slug, nombre, demarcacion, provincia, lat, lon, capacidad_hm3, uso, foto
- `series/{id}.json` — [{ fecha, volumen_hm3, pct }]
- `resumen.json` — totales nacionales y por demarcación de la última semana + medias 5 y 10 años
- `historico.parquet` — todo el histórico (máquina del tiempo, comparador)

Cambiar el contrato = cambiar `packages/schema` + nota en `docs/adr/` + adaptar pipeline y web en el mismo commit.

## Fuentes de datos

- **Boletín Hidrológico semanal (MITECO)** y su Excel histórico de embalses peninsulares > 5 hm³ desde 1988.
- **Inventario de Presas y Embalses (MITECO / SNCZI)** para coordenadas, datos técnicos y fotos.
- Los datos del boletín son **provisionales**: el pipeline debe poder reescribir semanas ya publicadas.
- Atribución obligatoria a la fuente en el pie de la web.

## Convenciones

- Contenido y textos de interfaz: **español**. Código, nombres de variables y commits: inglés.
- Commits pequeños y descriptivos. Una rama principal (`main`) siempre desplegable; ramas cortas para trabajo en curso (Cloudflare genera una preview por rama).
- Decisión relevante = nota en `docs/adr/NNNN-titulo.md` (contexto, decisión, consecuencias; máximo media página).

## Presupuestos de calidad

- Portada: < 150 KB de JS. Mapa y deck.gl cargados de forma diferida.
- Lighthouse ≥ 90 en rendimiento y accesibilidad (móvil).
- Contraste WCAG AA en todo, incluida la escala de color del agua.

## Equipo de agentes

El hilo principal actúa como **jefe de proyecto**: lee el roadmap, reparte tareas y revisa. Delega en:

| Agente | Se ocupa de |
|---|---|
| `datos` | `packages/schema`, `packages/pipeline`, `data/`, workflow semanal |
| `mapas` | MapLibre, PMTiles, mapshaper, geometrías, deck.gl |
| `frontend` | Astro, páginas, componentes, CSS y tokens, accesibilidad |
| `dataviz` | Gráficos con Observable Plot, escalas, paletas, leyendas |
| `editorial` | Explicadores MDX, microcopy, tono, verificación de cifras en textos |
| `qa` | Revisión: tests, rendimiento, accesibilidad, cumplimiento de estas reglas. No edita código |

Regla: cada agente trabaja solo en su zona. Si una tarea cruza zonas (p. ej. un campo nuevo en el contrato), primero `datos`, luego el resto. `qa` revisa antes de dar una tarea por terminada.

## Definición de "hecho"

- [ ] Funciona en móvil y escritorio
- [ ] Tests pasan (`pnpm test`)
- [ ] Sin cifras escritas a mano
- [ ] Alternativa accesible para mapas y gráficos
- [ ] `qa` lo ha revisado
- [ ] `ROADMAP.md` actualizado (casilla marcada)