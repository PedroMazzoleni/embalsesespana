// Datos de la serie histórica por año hidrológico (1 oct -> 30 sep).
// Todo se calcula de la serie del embalse; solo hay constantes de método.
import type { PuntoSerie } from 'schema';

export const N_MEDIA = 10;        // años hidrológicos anteriores que entran en la media
export const MIN_MEDIA = 3;       // mínimo de años con dato en una semana para dibujar la media
export const N_SECOS = 2;         // años secos de referencia
const MIN_PUNTOS_COMPLETO = 45;   // un año con menos semanas medidas no cuenta como "año completo"
const TOL = 3;                    // ± días para decir que un punto es "la misma semana"
const DIA = 86400000;

const utc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
/** Año hidrológico = año en que empieza (oct 2025 .. sep 2026 -> 2025). */
export const anioHidro = (iso: string) => { const [y, m] = iso.split('-').map(Number); return m >= 10 ? y : y - 1; };
export const etiquetaAnio = (a: number) => `${a}-${String((a + 1) % 100).padStart(2, '0')}`;
/** Días desde el 1 de octubre de su año hidrológico (0..365). */
export const diaHidro = (iso: string) => Math.round((utc(iso) - Date.UTC(anioHidro(iso), 9, 1)) / DIA);

/** Días de inicio de cada mes del año hidrológico (calendario no bisiesto). */
export const INICIO_MES = [0, 31, 61, 92, 123, 151, 182, 212, 243, 273, 304, 335];
export const MESES = ['octubre', 'noviembre', 'diciembre', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre'];
const mesIdx = (d: number) => { let m = 0; for (let i = 0; i < 12; i++) if (d >= INICIO_MES[i]) m = i; return m; };

export interface PuntoDia { d: number; pct: number }
export interface Seco { anio: number; media: number; puntos: (number | null)[]; mensual: (number | null)[] }
export interface SerieHist {
  anioActual: number;
  ultimo: PuntoSerie;
  actual: PuntoDia[];
  rejilla: number[];                        // centro de cada semana: 3, 10, ... 360
  media: (number | null)[] | null;          // null: serie demasiado corta
  nMedia: number;                           // años anteriores con algún dato
  mediaAhora: number | null;                // media de esos años en el día del último dato
  secos: Seco[];
  mensualActual: (number | null)[];         // 12 meses desde octubre
  mensualMedia: (number | null)[];
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/** Valor de un año hidrológico en el día d (punto más cercano dentro de ±TOL días). */
function valorEn(pts: PuntoDia[], d: number): number | null {
  let best: PuntoDia | null = null;
  for (const p of pts) { const k = Math.abs(p.d - d); if (k <= TOL && (!best || k < Math.abs(best.d - d))) best = p; }
  return best ? best.pct : null;
}
const mensual = (pts: PuntoDia[]) => Array.from({ length: 12 }, (_, m) => {
  const v = pts.filter((q) => mesIdx(q.d) === m).map((q) => q.pct);
  return v.length ? mean(v) : null;
});

export function serieHistorica(serie: PuntoSerie[]): SerieHist | null {
  if (!serie.length) return null;
  const ultimo = serie[serie.length - 1];
  const anioActual = anioHidro(ultimo.fecha);
  const por = new Map<number, PuntoDia[]>();
  for (const p of serie) {
    const a = anioHidro(p.fecha);
    if (!por.has(a)) por.set(a, []);
    por.get(a)!.push({ d: diaHidro(p.fecha), pct: p.pct });
  }
  const actual = por.get(anioActual)!;
  const rejilla = Array.from({ length: 52 }, (_, i) => i * 7 + 3);

  const previos = [...por.keys()].filter((a) => a < anioActual && a >= anioActual - N_MEDIA).sort();
  const nMedia = previos.length;
  const mediaEn = (d: number) => {
    const v = previos.map((a) => valorEn(por.get(a)!, d)).filter((x): x is number => x != null);
    return v.length >= MIN_MEDIA ? mean(v) : null;
  };
  const hayMedia = nMedia >= MIN_MEDIA;
  const media = hayMedia ? rejilla.map(mediaEn) : null;
  const mediaAhora = hayMedia ? mediaEn(diaHidro(ultimo.fecha)) : null;

  // años secos: los N_SECOS años hidrológicos completos con menor % medio de todo el histórico
  const completos = [...por.entries()].filter(([a, p]) => a < anioActual && p.length >= MIN_PUNTOS_COMPLETO);
  const secos: Seco[] = completos.length >= MIN_MEDIA
    ? completos.map(([a, p]) => ({ anio: a, media: mean(p.map((q) => q.pct)), puntos: rejilla.map((d) => valorEn(p, d)), mensual: mensual(p) }))
        .sort((x, y) => x.media - y.media).slice(0, N_SECOS)
    : [];

  const porAnio = previos.map((a) => mensual(por.get(a)!));
  const mensualMedia = hayMedia ? Array.from({ length: 12 }, (_, m) => {
    const v = porAnio.map((x) => x[m]).filter((x): x is number => x != null);
    return v.length >= MIN_MEDIA ? mean(v) : null;
  }) : (Array(12).fill(null) as null[]);

  return { anioActual, ultimo, actual, rejilla, media, nMedia, mediaAhora, secos, mensualActual: mensual(actual), mensualMedia };
}
