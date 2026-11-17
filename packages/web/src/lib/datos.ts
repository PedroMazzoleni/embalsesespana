import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Embalse, Embalses, Resumen, Serie, PuntoSerie } from 'schema';

const DATOS = join(process.cwd(), 'public', 'data');
const leer = <T>(f: string): T => JSON.parse(readFileSync(join(DATOS, f), 'utf8')) as T;

export const embalsesDoc = leer<Embalses>('embalses.json');
export const resumen = leer<Resumen>('resumen.json');
export const embalses: Embalse[] = embalsesDoc.embalses;
export const nacional = resumen.nacional;
export const NA = resumen.anios.length;

export const f = (n: number, d = 1) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
const dia = (iso: string) => new Date(iso + 'T00:00:00');
export const fechaLarga = (iso: string) => dia(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
export const fechaDiaMes = (iso: string) => dia(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
export const fechaCorta = (iso: string) => dia(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
export const mesDe = (iso: string) => dia(iso).toLocaleDateString('es-ES', { month: 'long' });
export const fechaDatos = fechaLarga(resumen.fecha);

// Escala del agua (misma que agua.css)
export const CORTES = [20, 35, 50, 65, 80];
export const NOMBRES = ['Casi seco', 'Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
export const RANGOS = ['0 a 20 %', '20 a 35 %', '35 a 50 %', '50 a 65 %', '65 a 80 %', '80 a 100 %'];
export const clase = (p: number) => { for (let i = 0; i < CORTES.length; i++) if (p < CORTES[i]) return i; return CORTES.length; };

export const rel = (d: number) => (d > 1 ? 'por encima de' : d < -1 ? 'por debajo de' : 'en línea con');
export const veredicto = (d: number, pct: number) =>
  d > 1 ? (pct >= 50 ? 'Sí, más de lo habitual.' : 'Menos de la mitad, pero más de lo habitual.')
  : d < -1 ? (pct >= 50 ? 'Sí, aunque menos de lo habitual.' : 'Poca, menos de lo habitual.')
  : 'Lo habitual para esta época.';

// ---------- series ----------
const cacheSeries = new Map<string, PuntoSerie[]>();
export function serieDe(id: string): PuntoSerie[] {
  let s = cacheSeries.get(id);
  if (!s) { s = leer<Serie>(`series/${id}.json`).serie; cacheSeries.set(id, s); }
  return s;
}
const ms = (iso: string) => dia(iso).getTime();
const DIA = 86400000;

export interface Estado {
  e: Embalse;
  actual: PuntoSerie | null;     // punto de la última semana publicada
  previa: PuntoSerie | null;     // punto de la semana anterior
  media10: number | null;        // media de la misma semana de los años anteriores (calculada con su serie)
  nMedia: number;
}
export function estadoDe(e: Embalse): Estado {
  const s = serieDe(e.id);
  const actual = s.find((p) => p.fecha === resumen.fecha) ?? null;
  const previa = s.find((p) => p.fecha === resumen.fecha_previa) ?? null;
  const vals: number[] = [];
  for (const fm of resumen.fechas_media) {
    const p = s.find((q) => Math.abs(ms(q.fecha) - ms(fm)) <= 3 * DIA);
    if (p) vals.push(p.pct);
  }
  const media10 = vals.length >= 5 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return { e, actual, previa, media10, nMedia: vals.length };
}
export const ultimas52 = (id: string) => {
  const s = serieDe(id);
  const fin = ms(s[s.length - 1].fecha);
  return s.filter((p) => ms(p.fecha) > fin - 364 * DIA);
};

// ---------- ejemplos de la portada ----------
const MIN_EJEMPLO_HM3 = 20; // evita que un charco de pocos hm³ copie los titulares
export function ejemplos() {
  const todos = embalses.filter((e) => e.activo).map(estadoDe).filter((x) => x.actual);
  const grandes = todos.filter((x) => x.e.capacidad_hm3 >= MIN_EJEMPLO_HM3);
  const por = (a: Estado[], k: (x: Estado) => number, dir: 1 | -1) => a.slice().sort((x, y) => dir * (k(x) - k(y)))[0];
  return [
    { rol: 'casi lleno', ...por(grandes, (x) => x.actual!.pct, -1) },
    { rol: 'muy bajo', ...por(grandes, (x) => x.actual!.pct, 1) },
    { rol: 'el más grande', ...por(todos, (x) => x.e.capacidad_hm3, -1) },
  ];
}

// ---------- demarcaciones ----------
export const demarcaciones = resumen.demarcaciones;
export const porNombre = [...demarcaciones].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
export const porPct = [...demarcaciones].sort((a, b) => b.pct - a.pct);
