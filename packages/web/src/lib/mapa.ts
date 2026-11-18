import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { geoConicConformal, geoPath } from 'd3-geo';
import { demarcaciones } from './datos';

const W = 1000;
const geo = JSON.parse(readFileSync(join(process.cwd(), '..', '..', 'data', 'geo', 'demarcaciones.geojson'), 'utf8'));
const proy = geoConicConformal().parallels([36, 44]).rotate([4, 0]);
// d3 espera anillos exteriores en sentido horario; el GeoJSON los trae al revés
for (const ft of geo.features) {
  const g = ft.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) ring.reverse();
}
proy.fitWidth(W, geo);
const gen = geoPath(proy);
const [[, y0], [, y1]] = gen.bounds(geo);
export const alto = Math.ceil(y1 + y0);
export const sinDato: string[] = [];
export const zonas = geo.features.map((ft: any) => {
  const r = demarcaciones.find((d) => d.codigo === ft.properties.codigo);
  if (!r) sinDato.push(ft.properties.codigo);
  const [[ax, ay], [bx, by]] = gen.bounds(ft);
  return { codigo: ft.properties.codigo as string, nombre: ft.properties.nombre as string, d: gen(ft)!, r, caja: [ax, ay, bx, by] as [number, number, number, number], y: Math.round((ay + by) / 2 / 60), x: (ax + bx) / 2 };
});
// Orden del teclado: de norte a sur y, a igual altura, de oeste a este
zonas.sort((a: any, b: any) => a.y - b.y || a.x - b.x);
const sinGeo = demarcaciones.filter((d) => !geo.features.some((ft: any) => ft.properties.codigo === d.codigo));
console.log(`[mapa] ${zonas.length - sinDato.length}/${demarcaciones.length} demarcaciones casan geo-resumen`, sinDato, sinGeo.map((d) => d.codigo));
