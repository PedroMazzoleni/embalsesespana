// Datos del mapa interactivo, generados en build desde data/geo y los datos del pipeline.
// Una sola petición: demarcaciones (GeoJSON con % y clase) + puntos de embalses.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { demarcaciones, embalses, estadoDe, clase } from '../../lib/datos';

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function GET() {
  const geo = JSON.parse(readFileSync(join(process.cwd(), '..', '..', 'data', 'geo', 'demarcaciones.geojson'), 'utf8'));
  const dem = {
    type: 'FeatureCollection',
    features: geo.features.map((ft: any) => {
      const r = demarcaciones.find((d) => d.codigo === ft.properties.codigo);
      return {
        type: 'Feature',
        geometry: ft.geometry,
        properties: { codigo: ft.properties.codigo, nombre: ft.properties.nombre, pct: r ? Math.round(r.pct * 10) / 10 : null, cls: r ? clase(r.pct) : -1 },
      };
    }),
  };
  const puntos = {
    type: 'FeatureCollection',
    features: embalses
      .filter((e) => e.activo && e.lat != null && e.lon != null)
      .map((e) => ({ e, actual: estadoDe(e).actual }))
      .filter((x) => x.actual)
      .map(({ e, actual }) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r4(e.lon!), r4(e.lat!)] },
        properties: { slug: e.slug, nombre: e.nombre, dem: e.demarcacion_codigo, cap: e.capacidad_hm3, pct: Math.round(actual!.pct * 10) / 10, cls: clase(actual!.pct) },
      })),
  };
  return new Response(JSON.stringify({ dem, puntos }), { headers: { 'Content-Type': 'application/json' } });
}
