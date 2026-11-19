// Marcadores del explicador "¿Es grave la situación de los embalses?".
// Cada cifra sale de public/data (resumen.json y tiempo/demarcaciones.json); aquí solo hay
// constantes de MÉTODO (no datos). Definiciones: src/content/explicadores/es-grave.mdx (tabla final).
//
// Métodos propios documentados:
// - Semana equivalente: fecha publicada más cercana al mismo día del año que la última (±3 días,
//   como el ADR 0006), en la serie nacional "tal como se publicó" de tiempo/demarcaciones.json
//   (ADR 0008: el conjunto de embalses cambia con los años). Se excluyen las semanas de
//   baja_cobertura y el año en curso.
// - Grupos norte / sur y este: agregan las demarcaciones por capacidad. % = suma hm³ / suma
//   capacidad (resumen.json). media10 = media de las media10 de cada demarcación ponderada por su
//   capacidad actual (aproximación; conserva el conjunto común del ADR 0006 dentro de cada
//   demarcación). La serie temporal del grupo pondera con la capacidad actual de cada demarcación.
//   Guadalquivir es ES050 (el borrador decía ES040, que es Guadiana).
// - Sin datos de `datos` todavía: umbral de capacidad del boletín y fecha de actualización de la
//   fuente. No existen en resumen.json, así que sus frases se omiten (regla del borrador).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TiempoDemarcaciones, PuntoSerie } from 'schema';
import { resumen, nacional as N, demarcaciones, f, fechaLarga } from '../datos';
import { anioHidro, diaHidro } from '../serieHistorica';

// ---------- constantes de método ----------
export const IGUAL_PTS = 0.5;          // por debajo de esta diferencia se dice "casi igual"
export const MARGEN_CERCANIA = 5;      // puntos: "cerca de los peores años" (pendiente de publicar en el método)
export const SEMANAS_SOSTENIDAS = 4;   // semanas seguidas bajando para decir "sostenida"
export const PISCINA_M3 = 2500;        // piscina olímpica (50 x 25 x 2 m)
export const TOL_DIAS = 3;
export const UMBRAL_DIF = 10;          // puntos de diferencia para la escala del mapa del paso 5
const DIA = 86400000;
export const GRUPO_NORTE = ['ES010', 'ES014', 'ES017', 'ES018'];
export const GRUPO_SURESTE = ['ES050', 'ES060', 'ES063', 'ES064', 'ES070', 'ES080'];

export const tiempo = JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'tiempo', 'demarcaciones.json'), 'utf8')) as TiempoDemarcaciones;
const nacSerie = tiempo.series.nacional;
const utc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };

// ---------- semana equivalente ----------
export interface Equiv { anio: number; fecha: string; pct: number }
const bajas = new Set(tiempo.baja_cobertura.nacional ?? []);
function equivalentes(): Equiv[] {
  const [, m, d] = resumen.fecha.split('-').map(Number);
  const anioAct = Number(resumen.fecha.slice(0, 4));
  const primer = Number(tiempo.fechas[0].slice(0, 4));
  const out: Equiv[] = [];
  for (let y = primer; y < anioAct; y++) {
    const objetivo = Date.UTC(y, m - 1, d);
    let mejor = -1;
    tiempo.fechas.forEach((fe, i) => {
      const v = nacSerie[i];
      if (v == null || bajas.has(i)) return;
      const k = Math.abs(utc(fe) - objetivo);
      if (k <= TOL_DIAS * DIA && (mejor < 0 || k < Math.abs(utc(tiempo.fechas[mejor]) - objetivo))) mejor = i;
    });
    if (mejor >= 0) out.push({ anio: y, fecha: tiempo.fechas[mejor], pct: nacSerie[mejor] as number });
  }
  return out;
}
export const equiv = equivalentes();
export const secos = [...equiv].sort((a, b) => a.pct - b.pct);

// ---------- grupos ----------
function grupo(codigos: string[]) {
  const ds = demarcaciones.filter((d) => codigos.includes(d.codigo));
  const hm3 = ds.reduce((s, d) => s + d.hm3, 0), cap = ds.reduce((s, d) => s + d.capacidad, 0);
  const conMedia = ds.filter((d) => d.media10 != null);
  const capM = conMedia.reduce((s, d) => s + d.capacidad, 0);
  const pct = (hm3 / cap) * 100;
  const media10 = conMedia.length === ds.length && capM > 0 ? conMedia.reduce((s, d) => s + (d.media10 as number) * d.capacidad, 0) / capM : null;
  const serie = tiempo.fechas.map((_, i) => {
    let a = 0, b = 0;
    for (const d of ds) { const v = tiempo.series[d.codigo]?.[i]; if (v != null) { a += v * d.capacidad; b += d.capacidad; } }
    return b > 0 ? a / b : null;
  });
  return { codigos, n: ds.length, pct, media10, dif: media10 == null ? null : pct - media10, serie };
}
export const norte = grupo(GRUPO_NORTE);
export const sureste = grupo(GRUPO_SURESTE);

// ---------- marcadores ----------
const dMejor = [...demarcaciones].filter((d) => d.dif_media_pts != null).sort((a, b) => (b.dif_media_pts as number) - (a.dif_media_pts as number));
const mejor = dMejor[0], peor = dMejor[dMejor.length - 1];
const anios = resumen.anios.map((a) => ({ anio: Number(a.fecha.slice(0, 4)), fecha: a.fecha, pct: a.pct }));
const aSort = [...anios].sort((a, b) => a.pct - b.pct);
const pct = N.pct;

let semanasBajando = 0;
for (let i = nacSerie.length - 1; i > 0; i--) {
  const a = nacSerie[i], b = nacSerie[i - 1];
  if (a == null || b == null || a - b >= 0) break;
  semanasBajando++;
}
const seco1 = secos[0], seco2 = secos[1], seco3 = secos[2];
const piscinas = (hm3: number) => (hm3 * 1e6) / PISCINA_M3;
const millones = (n: number) => `${f(n / 1e6, 1)} millones`;

export const M = {
  pct, pctTxt: f(pct), fechaLarga: fechaLarga(resumen.fecha),
  hm3Txt: `${f(N.hm3, 0)} hm³`, km3Txt: `${f(N.hm3 / 1000, 1)} km³`, capacidadTxt: `${f(N.capacidad, 0)} hm³`,
  piscinasTxt: millones(piscinas(N.hm3)),
  varPts: N.var_pts, varAbs: f(Math.abs(N.var_pts ?? 0)),
  media10: N.media10, media10Txt: N.media10 == null ? null : f(N.media10),
  nAnios: resumen.fechas_media.length,
  primerAnioMedia: Number(resumen.fechas_media[0].slice(0, 4)), ultimoAnioMedia: Number(resumen.fechas_media[resumen.fechas_media.length - 1].slice(0, 4)),
  difMedia: N.dif_media_pts, difMediaAbs: f(Math.abs(N.dif_media_pts ?? 0)),
  nPorDebajoHoy: anios.filter((a) => a.pct < pct).length, nPorEncimaHoy: anios.filter((a) => a.pct > pct).length,
  anios, humedoReciente: aSort[aSort.length - 1], secoReciente: aSort[0],
  primerAnio: Number(tiempo.fechas[0].slice(0, 4)),
  seco1, seco2, seco3,
  difSeco1Abs: f(Math.abs(pct - seco1.pct)),
  nAniosSerie: equiv.length, nAniosPeoresQueHoy: equiv.filter((e) => e.pct < pct).length,
  nCuencas: demarcaciones.length, nCuencasPorDebajo: demarcaciones.filter((d) => (d.dif_media_pts ?? 0) < 0).length,
  mejor, peor,
  norte, sureste,
  semanasBajando,
  nEmbalses: N.n_embalses,
};
export const signo = (x: number | null) => (x == null || Math.abs(x) < IGUAL_PTS ? 0 : x > 0 ? 1 : -1);

// ---------- datos para los visuales ----------
export const nacionalPuntos: PuntoSerie[] = tiempo.fechas.flatMap((fecha, i) => (nacSerie[i] == null ? [] : [{ fecha, volumen_hm3: 0, pct: nacSerie[i] as number }]));

/** Años hidrológicos anteriores al actual (los N de la media): banda mín-máx por día hidrológico. */
export function bandaAnios() {
  const por = new Map<number, { d: number; pct: number }[]>();
  for (const p of nacionalPuntos) {
    const a = anioHidro(p.fecha);
    if (!por.has(a)) por.set(a, []);
    por.get(a)!.push({ d: diaHidro(p.fecha), pct: p.pct });
  }
  const act = anioHidro(resumen.fecha);
  const previos = [...por.keys()].filter((a) => a < act && a >= act - M.nAnios);
  const rej = Array.from({ length: 52 }, (_, i) => i * 7 + 3);
  const cerca = (pts: { d: number; pct: number }[], d: number) => pts.filter((p) => Math.abs(p.d - d) <= TOL_DIAS).sort((a, b) => Math.abs(a.d - d) - Math.abs(b.d - d))[0]?.pct ?? null;
  const banda = rej.map((d) => {
    const v = previos.map((a) => cerca(por.get(a)!, d)).filter((x): x is number => x != null);
    return v.length >= 3 ? { d, min: Math.min(...v), max: Math.max(...v) } : null;
  }).filter((x): x is { d: number; min: number; max: number } => x != null);
  return { banda, actual: por.get(act) ?? [], anioActual: act };
}

// ---------- mapa del paso 5 ----------
/** Clase de la escala divergente: 0 muy por debajo, 1 por debajo, 2 por encima, 3 muy por encima de su media. */
export const claseDif = (d: number | null) => (d == null ? -1 : d <= -UMBRAL_DIF ? 0 : d < 0 ? 1 : d < UMBRAL_DIF ? 2 : 3);
