// Marcadores del explicador "Las grandes sequías vistas desde los embalses".
// Todo sale de tiempo/demarcaciones.json (serie nacional "tal como se publicó", ADR 0008) y de
// resumen.json. Mismo criterio que src/pages/tiempo.astro: semanas de baja cobertura fuera,
// mínimo de cada año natural y mínimo local (menor que el del año anterior y el del siguiente).
// Añade un filtro por umbral: nac < percentil PERCENTIL_SECO de la serie válida (interpolación lineal).
// Una semana de la serie = un índice; "semanas hasta recuperar" = diferencia de índices.
// Los grupos norte y sur y este y sus series se reutilizan de es-grave.ts. Corrección del borrador:
// Guadalquivir es ES050 y Cuencas Internas de Cataluña ES100.
import { resumen, demarcaciones, f, fechaLarga } from '../datos';
import { tiempo, norte, sureste, equiv, IGUAL_PTS } from './es-grave';

export const PERCENTIL_SECO = 10;   // percentil de la serie que marca "reserva baja" (documentado en #metodo)
export const MAX_SEQUIAS = 6;       // sequías mostradas (las más profundas)
export const N_CAIDA = 3;           // cuencas citadas por mayor caída
/** Hecho externo (Nació Digital): llegada del primer barco con agua al puerto de Barcelona. No es dato nuestro. */
export const FECHA_BARCO_BCN = '2008-05-13';

const T = tiempo;
const nac = T.series.nacional as number[];
const baja = new Set(T.baja_cobertura.nacional ?? []);
const anio = (i: number) => T.fechas[i].slice(0, 4);
export const validos = nac.map((_, i) => i).filter((i) => !baja.has(i) && nac[i] != null);
export const iMin = validos.reduce((a, b) => (nac[b] < nac[a] ? b : a));
export const iMax = validos.reduce((a, b) => (nac[b] > nac[a] ? b : a));
export const ult = T.fechas.length - 1;
export const bajaIdx = [...baja];

const media = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const vals = validos.map((i) => nac[i]).sort((a, b) => a - b);
const percentil = (p: number) => { const k = ((vals.length - 1) * p) / 100, lo = Math.floor(k); return vals[lo] + (vals[Math.min(lo + 1, vals.length - 1)] - vals[lo]) * (k - lo); };
export const mediaSerie = media(validos.map((i) => nac[i]));
export const umbral = percentil(PERCENTIL_SECO);

// mínimo de cada año natural -> mínimos locales bajo el umbral
const minAnio = new Map<string, number>();
for (const i of validos) { const y = anio(i); const c = minAnio.get(y); if (c === undefined || nac[i] < nac[c]) minAnio.set(y, i); }
const ys = [...minAnio.keys()].sort();
const locales = ys.map((y) => minAnio.get(y)!).filter((i, k, a) => (k === 0 || nac[i] < nac[a[k - 1]]) && (k === a.length - 1 || nac[i] < nac[a[k + 1]]));

/** Primer índice válido tras `desde` en que `serie` alcanza `meta`; null si nunca. */
const recupera = (serie: (number | null)[], desde: number, meta: number) => validos.find((j) => j > desde && serie[j] != null && (serie[j] as number) >= meta) ?? null;
/** Racha de semanas consecutivas bajo el umbral alrededor de i (las de baja cobertura ni cortan ni cuentan). */
function racha(i: number) {
  const p = validos.indexOf(i);
  let a = p, b = p;
  while (a > 0 && nac[validos[a - 1]] < umbral) a--;
  while (b < validos.length - 1 && nac[validos[b + 1]] < umbral) b++;
  return { ini: validos[a], semanas: b - a + 1 };
}

export interface Sequia { i: number; anio: string; pct: number; fechaLarga: string; fechaIso: string; semanasBajo: number; ini: number; j: number | null; semanasRec: number | null; fechaRecLarga: string | null }
const sequiaDe = (i: number): Sequia => {
  const r = racha(i), j = recupera(nac, i, mediaSerie);
  return { i, anio: anio(i), pct: nac[i], fechaLarga: fechaLarga(T.fechas[i]), fechaIso: T.fechas[i], semanasBajo: r.semanas, ini: r.ini, j, semanasRec: j == null ? null : j - i, fechaRecLarga: j == null ? null : fechaLarga(T.fechas[j]) };
};
export const sequias: Sequia[] = locales.filter((i) => nac[i] < umbral)
  .sort((a, b) => nac[a] - nac[b]).slice(0, MAX_SEQUIAS).sort((a, b) => a - b).map(sequiaDe);
const sMin = sequiaDe(iMin);
const recup = sequias.filter((s) => s.semanasRec != null);
const lenta = recup.length ? recup.reduce((a, b) => ((b.semanasRec as number) > (a.semanasRec as number) ? b : a)) : null;
const ultimaRecup = recup.length ? recup[recup.length - 1] : null;
const siguiente = sequias.find((s) => s.i > iMin);
const finMax = siguiente ? siguiente.i : ult;
const pctMaxTras = Math.max(...validos.filter((i) => i >= iMin && i <= finMax).map((i) => nac[i]));

// cuencas
const cods = Object.keys(T.series).filter((c) => c !== 'nacional');
const nombreDe = (c: string) => demarcaciones.find((d) => d.codigo === c)?.nombre ?? c;
const enMin = cods.filter((c) => T.series[c][iMin] != null).map((c) => ({ c, v: T.series[c][iMin] as number }));
const cMin = enMin.reduce((a, b) => (b.v < a.v ? b : a)), cMax = enMin.reduce((a, b) => (b.v > a.v ? b : a));
const caidas = cods.map((c) => {
  const v = T.series[c][iMin]; const prop = validos.map((i) => T.series[c][i]).filter((x): x is number => x != null);
  return { c, caida: v == null || !prop.length ? -Infinity : media(prop) - v };
}).sort((a, b) => b.caida - a.caida).slice(0, N_CAIDA).filter((x) => x.caida > -Infinity);
const lista = (a: string[]) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`);
const mediaGrupo = (s: (number | null)[]) => media(validos.map((i) => s[i]).filter((x): x is number => x != null));
const recG = (g: { serie: (number | null)[] }) => (ultimaRecup ? recupera(g.serie, ultimaRecup.i, mediaGrupo(g.serie)) : null);
const rn = recG(norte), rs = recG(sureste);
const cat = demarcaciones.find((d) => d.nombre.includes('Cataluña'));
const iBarco = T.fechas.indexOf(FECHA_BARCO_BCN);

export const Q = {
  primerAnio: Number(T.fechas[0].slice(0, 4)),
  mediaSerie, mediaSerieTxt: f(mediaSerie), umbral, umbralTxt: f(umbral),
  percentil: PERCENTIL_SECO, umbralInverso: Math.round(100 / PERCENTIL_SECO),
  nSequias: sequias.length,
  min: sMin, anioMinAbs: anio(iMin), pctMinAbs: nac[iMin],
  anioMaxAbs: anio(iMax), pctMaxAbs: nac[iMax],
  lenta, pctMaxTrasMin: pctMaxTras,
  cMin: { c: cMin.c, nombre: nombreDe(cMin.c), pct: cMin.v }, cMax: { c: cMax.c, nombre: nombreDe(cMax.c), pct: cMax.v },
  rangoCuencas: cMax.v - cMin.v, nCuencas: cods.length,
  pctNorteMin: norte.serie[iMin], pctSurMin: sureste.serie[iMin],
  caidasLista: lista(caidas.map((x) => nombreDe(x.c))),
  recNorte: rn == null || !ultimaRecup ? null : rn - ultimaRecup.i, recSur: rs == null || !ultimaRecup ? null : rs - ultimaRecup.i,
  ultimaRecup,
  catCodigo: cat?.codigo ?? null, iBarco,
  pctNacional: resumen.nacional.pct, fechaDato: fechaLarga(resumen.fecha),
  difMinHoyAbs: f(Math.abs(resumen.nacional.pct - nac[iMin])),
  nacional: nac, fechas: T.fechas, aniosEquiv: equiv.length,
};
export const igual = (x: number) => Math.abs(x) < IGUAL_PTS;
export const tablaCuencas = cods.map((c) => {
  const prop = validos.filter((i) => T.series[c][i] != null);
  const iPropio = prop.length ? prop.reduce((a, b) => ((T.series[c][b] as number) < (T.series[c][a] as number) ? b : a)) : null;
  return { c, nombre: nombreDe(c), pctMin: T.series[c][iMin], propio: iPropio == null ? null : T.series[c][iPropio], fechaPropia: iPropio == null ? null : T.fechas[iPropio] };
}).sort((a, b) => (a.pctMin ?? 999) - (b.pctMin ?? 999));
export const tiempoMin = (c: string) => (T.series[c]?.[iMin] ?? null) as number | null;
