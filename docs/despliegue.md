# Publicación

## Flujo semanal
1. `scrape.yml` (martes a jueves) descarga el boletín del MITECO y, si hay datos nuevos, hace commit en `main`.
2. Al terminar con éxito, `deploy.yml` se dispara por `workflow_run` (también en cada push a `main` que toque `packages/**` o `data/**`).
3. Pasos: `pnpm install --frozen-lockfile` → `pnpm test` → `pnpm data` (valida con Zod; sale con código 1 si no valida) → `pnpm --filter web build` → `wrangler pages deploy packages/web/dist` al proyecto `embalses-espana`.
4. `packages/web/public/data/` no se versiona: se regenera completo en cada ejecución.

Las ramas distintas de `main` publican una preview (`<rama>.embalses-espana.pages.dev`) y no abren incidencias.

## Secretos (Settings > Secrets and variables > Actions)
- `CLOUDFLARE_API_TOKEN`: token con permiso "Cloudflare Pages: Edit".
- `CLOUDFLARE_ACCOUNT_ID`.

## Si falla
Test, validación o build rotos: no se despliega (la web sigue con la última versión buena) y se abre una issue con etiqueta `pipeline-fallido`; si ya hay una abierta, se comenta en ella con el enlace a la ejecución. Cerrar la issue a mano al arreglarlo.

## Forzar un despliegue
Actions > "Deploy to Cloudflare Pages" > Run workflow (rama `main`), o `gh workflow run deploy.yml --ref main`.

## Límites de Cloudflare Pages
Máx. 20 000 ficheros y 25 MiB por fichero. Build actual: ~812 ficheros, ~42 MB, ningún fichero > 20 MB.
