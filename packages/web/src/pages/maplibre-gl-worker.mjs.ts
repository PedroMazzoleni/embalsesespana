// MapLibre 6 carga su worker como fichero aparte; Vite no lo emite con el build de Astro.
// Se publica tal cual desde node_modules en /maplibre-gl-worker.mjs (misma versión que la librería).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';

export function GET() {
  const pkg = createRequire(import.meta.url).resolve('maplibre-gl/package.json');
  const src = readFileSync(join(dirname(pkg), 'dist', 'maplibre-gl-worker.mjs'), 'utf8');
  return new Response(src, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
}
