// Marcadores del explicador "Los embalses del Júcar durante la DANA de octubre de 2024".
// Todo sale de public/data: tiempo/demarcaciones.json (serie por demarcación "tal como se publicó", ADR 0008),
// series/cuenca-*.json (hm³ por cuenca), series/{slug}.json (embalses) y embalses.json (capacidad).
// Definiciones: src/content/explicadores/dana-2024.mdx (tabla final). Solo constantes de MÉTODO aquí, ninguna cifra de datos.
//
// Diferencias con el borrador (valores calculados en lugar de estimaciones):
// - "n_anios_jucar_peores / n_anios_jucar_serie", "jucar_parte_subida_nac_pct" y "jucar_min_anio" se calculan; la frase usa lo calculado.
// - Capacidad de cada embalse y "jucar_parte_capacidad_pct" salen de embalses.json y de hm³/pct de series/cuenca-*.json
//   (no del CSV bruto): misma aritmética que la agregación publicada.
import { embalses, resumen, serieDe, f, fechaLarga } from '../datos';
import { tiempo as T, IGUAL_PTS, PISCINA_M3, TOL_DIAS } from './es-grave';

/** Hecho externo (AEMET / MITECO): día de la DANA. Si no está en las semanas publicadas, la construcción falla. */
export const FECHA_EPISODIO = '2024-10-29';
export const COD_JUCAR = 'ES080';
/** Lista editorial (nombres, no cifras). Orden de aparición en el paso 5. */
export const SLUGS_DANA = ['forata', 'buseo', 'loriguilla', 'benageber', 'tous-la-ribera', 'bellus', 'arenos', 'contreras'];
/** Por debajo de este % de la capacidad del embalse se dice "casi no se movió" (publicado en #metodo). */
export const UMBRAL_CAMBIO_EMBALSE = IGUAL_PTS * 2;
/** Ventana de los gráficos: meses de septiembre a diciembre del año del episodio. */
export const MES_INICIO_VENTANA = 9;
const DIA = 86400000;

export { IGUAL_PTS };
const ms = (iso: string) => new Date(iso + 'T00:00:00Z').getTime();
const fechas = T.fechas;
const iPre = fechas.indexOf(FECHA_EPISODIO);
if (iPre < 0) throw new Error(`dana-2024: ${FECHA_EPISODIO} no está en tiempo/demarcaciones.json; no se publica la página`);
const iPost = iPre + 1;
const anioEp = Number(FECHA_EPISODIO.slice(0, 4));
const anioDe = (i: number) => Number(fechas[i].slice(0, 4));
const iCierre = fechas.reduce((a, fe, i) => (anioDe(i) === anioEp ? i : a), -1);
const ult = fechas.length - 1;

const jucar = T.series[COD_JUCAR] as (number | null)[];
const nac = T.series.nacional as (number | null)[];
const baja = new Set([...(T.baja_cobertura[COD_JUCAR] ?? []), ...(T.baja_cobertura.nacional ?? [])]);
const validos = jucar.map((_, i) => i).filter((i) => !baja.has(i) && jucar[i] != null);
const media = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const jMedia = media(validos.map((i) => jucar[i] as number));
const iMinJ = validos.reduce((a, b) => ((jucar[b] as number) < (jucar[a] as number) ? b : a));

/** Semana publicada más cercana al mismo día del año (±TOL_DIAS) en `anio`, ADR 0006. */
function equivalente(anio: number): number | null {
  const objetivo = ms(`${anio}${FECHA_EPISODIO.slice(4)}`);
  let mejor: number | null = null, dif = Infinity;
  for (let i = 0; i < fechas.length; i++) { const d = Math.abs(ms(fechas[i]) - objetivo); if (d < dif) { dif = d; mejor = i; } }
  return mejor != null && dif <= TOL_DIAS * DIA ? mejor : null;
}
const primerAnio = anioDe(0);
const aniosPrevios: { anio: number; i: number; pct: number }[] = [];
for (let a = primerAnio; a < anioEp; a++) {
  const i = equivalente(a);
  if (i != null && !baja.has(i) && jucar[i] != null) aniosPrevios.push({ anio: a, i, pct: jucar[i] as number });
}
const pctPre = jucar[iPre] as number, pctPost = jucar[iPost] as number;

// ---- cuencas: hm³ ----
const cuencas = Object.keys(T.series).filter((c) => c !== 'nacional');
const slugCuenca = (nombre: string) => 'cuenca-' + nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nombreCuenca = new Map<string, string>();
for (const e of embalses) nombreCuenca.set(e.demarcacion_codigo, e.demarcacion);
const hm3En = (serie: { fecha: string; volumen_hm3: number }[], fecha: string) => serie.find((p) => p.fecha === fecha)?.volumen_hm3 ?? null;
const serieJucar = serieDe('cuenca-jucar');
const porCuenca = cuencas.map((c) => {
  const nombre = nombreCuenca.get(c) ?? c;
  let s: ReturnType<typeof serieDe> | null = null;
  try { s = serieDe(slugCuenca(nombre)); } catch { s = null; }
  const pre = s ? s.find((p) => p.fecha === fechas[iPre]) : null, post = s ? s.find((p) => p.fecha === fechas[iPost]) : null;
  const capPre = pre && pre.pct > 0 ? (pre.volumen_hm3 * 100) / pre.pct : null;
  return { c, nombre, pctPre: T.series[c][iPre] as number | null, pctPost: T.series[c][iPost] as number | null, hm3Pre: pre?.volumen_hm3 ?? null, hm3Post: post?.volumen_hm3 ?? null, capPre };
});
const conHm3 = porCuenca.filter((x) => x.hm3Pre != null && x.hm3Post != null);
const subeNacHm3 = conHm3.reduce((s, x) => s + (x.hm3Post as number) - (x.hm3Pre as number), 0);
const capTotal = porCuenca.reduce((s, x) => s + (x.capPre ?? 0), 0);
const capJucar = porCuenca.find((x) => x.c === COD_JUCAR)?.capPre ?? 0;
const hm3PreJ = hm3En(serieJucar, fechas[iPre]) as number, hm3PostJ = hm3En(serieJucar, fechas[iPost]) as number;
const ordenSube = porCuenca.filter((x) => x.pctPre != null && x.pctPost != null)
  .map((x) => ({ ...x, sube: (x.pctPost as number) - (x.pctPre as number) })).sort((a, b) => b.sube - a.sube);
const rankJ = ordenSube.findIndex((x) => x.c === COD_JUCAR) + 1;

// ---- embalses citados ----
export interface EmbalseDana {
  slug: string; nombre: string; capacidad: number;
  hm3Pre: number; hm3Post: number; hm3Cierre: number | null; pctPre: number; pctPost: number;
  subeHm3: number; subePctCap: number; hueco: number; casiNoSeMovio: boolean;
  serie: { i: number; fecha: string; hm3: number; pct: number }[];
}
const iVentana = fechas.findIndex((fe) => fe >= `${anioEp}-${String(MES_INICIO_VENTANA).padStart(2, '0')}-01`);
export const embalsesDana: EmbalseDana[] = [];
for (const slug of SLUGS_DANA) {
  const e = embalses.find((x) => x.slug === slug);
  if (!e) throw new Error(`dana-2024: el embalse ${slug} no existe en embalses.json`);
  const s = serieDe(slug);
  const mp = new Map(s.map((p) => [p.fecha, p]));
  const pre = mp.get(fechas[iPre]), post = mp.get(fechas[iPost]);
  if (!pre || !post) continue; // sin dato: se omite, sin hueco ni ceros
  const cierre = mp.get(fechas[iCierre]);
  const sube = post.volumen_hm3 - pre.volumen_hm3;
  const sc = (sube / e.capacidad_hm3) * 100;
  embalsesDana.push({
    slug, nombre: e.nombre, capacidad: e.capacidad_hm3, hm3Pre: pre.volumen_hm3, hm3Post: post.volumen_hm3, hm3Cierre: cierre?.volumen_hm3 ?? null,
    pctPre: pre.pct, pctPost: post.pct, subeHm3: sube, subePctCap: sc, hueco: e.capacidad_hm3 - pre.volumen_hm3, casiNoSeMovio: sc < UMBRAL_CAMBIO_EMBALSE,
    serie: fechas.map((fe, i) => ({ i, fecha: fe, p: mp.get(fe) })).filter((x) => x.i >= iVentana && x.i <= iCierre + 0 && x.p).map((x) => ({ i: x.i, fecha: x.fecha, hm3: x.p!.volumen_hm3, pct: x.p!.pct })),
  });
}
const huecos = embalsesDana.map((e) => e.hueco);

// ---- embalses del Júcar que más suben ----
const cambiosJ: { nombre: string; sube: number }[] = [];
for (const e of embalses.filter((x) => x.demarcacion_codigo === COD_JUCAR)) {
  let s; try { s = serieDe(e.slug); } catch { continue; }
  const a = s.find((p) => p.fecha === fechas[iPre]), b = s.find((p) => p.fecha === fechas[iPost]);
  if (a && b) cambiosJ.push({ nombre: e.nombre, sube: b.volumen_hm3 - a.volumen_hm3 });
}
cambiosJ.sort((a, b) => b.sube - a.sube);
const masSuben = cambiosJ.slice(0, 3);
const lista = (a: string[]) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`);

// ---- después ----
let seguidas = 0;
for (let i = iPost + 1; i <= iCierre && jucar[i] != null && (jucar[i] as number) >= (jucar[i - 1] as number); i++) seguidas++;
const iUnAnio = equivalente(anioEp + 1);
const iSig = fechas.map((_, i) => i).filter((i) => anioDe(i) === anioEp + 1 && jucar[i] != null && !baja.has(i));
const iMaxSig = iSig.length ? iSig.reduce((a, b) => ((jucar[b] as number) > (jucar[a] as number) ? b : a)) : null;
const pctCierre = jucar[iCierre] as number;
const pctHoy = jucar[ult] as number;

/** Ventana de los gráficos: del 1 de septiembre al último martes del año del episodio. */
export const ventana = fechas.map((fe, i) => ({ i, fecha: fe, d: new Date(fe + 'T00:00:00Z'), pct: jucar[i] })).filter((x) => x.i >= iVentana && x.i <= iCierre && x.pct != null) as { i: number; fecha: string; d: Date; pct: number }[];
/** Desde septiembre del año del episodio hasta hoy. */
export const hastaHoy = fechas.map((fe, i) => ({ i, fecha: fe, d: new Date(fe + 'T00:00:00Z'), pct: jucar[i] })).filter((x) => x.i >= iVentana && x.pct != null) as { i: number; fecha: string; d: Date; pct: number }[];

const pts = (x: number) => f(Math.abs(x));
export const Q = {
  anioEp, anioSig: anioEp + 1, primerAnio,
  iPre, iPost, iCierre, ult, fechas,
  fechaPreIso: fechas[iPre], fechaPostIso: fechas[iPost], fechaPre: fechaLarga(fechas[iPre]), fechaPost: fechaLarga(fechas[iPost]),
  fechaDato: fechaLarga(resumen.fecha), fechaCierre: fechaLarga(fechas[iCierre]),
  piscinas1hm3: Math.round(1e6 / PISCINA_M3),
  jPctPre: pctPre, jPctPost: pctPost, jHm3Pre: hm3PreJ, jHm3Post: hm3PostJ,
  jSubeHm3: hm3PostJ - hm3PreJ, jSubePts: pctPost - pctPre, jSubePiscinas: Math.round(((hm3PostJ - hm3PreJ) * 1e6) / PISCINA_M3),
  jVarPrevia: pctPre - (jucar[iPre - 1] as number), jSinCambioPrevio: Math.abs(pctPre - (jucar[iPre - 1] as number)) < IGUAL_PTS,
  jVarPreviaAbs: pts(pctPre - (jucar[iPre - 1] as number)),
  aniosPrevios3: aniosPrevios.slice(-3), aniosPrevios,
  jBajoUltimos3: pctPre < Math.min(...aniosPrevios.slice(-3).map((a) => a.pct)),
  nAniosSerie: aniosPrevios.length, nAniosPeores: aniosPrevios.filter((a) => a.pct < pctPre).length,
  jMedia, jMediaTxt: f(jMedia), jMinPct: jucar[iMinJ] as number, jMinAnio: anioDe(iMinJ),
  nCuencas: cuencas.length, nCuencasSuben: ordenSube.filter((x) => x.sube > 0).length, rankJ, jEsLaMayor: rankJ === 1,
  nacPre: nac[iPre] as number, nacPost: nac[iPost] as number,
  jParteSubidaNacPct: subeNacHm3 > 0 ? ((hm3PostJ - hm3PreJ) / subeNacHm3) * 100 : null,
  jParteCapacidadPct: capTotal > 0 ? (capJucar / capTotal) * 100 : null,
  ordenSube,
  nEmbalsesDana: embalsesDana.length, huecoMin: Math.min(...huecos), huecoMax: Math.max(...huecos),
  nEmbalsesJucar: cambiosJ.length,
  masSubenLista: lista(masSuben.map((x) => `${x.nombre} (+${f(x.sube, 0)} hm³)`)),
  jSeguidas: seguidas, jPctCierre: pctCierre, jSubeTotalPts: pctCierre - pctPre,
  jCierreMasAltoQuePost: pctCierre >= pctPost,
  iUnAnio, fechaUnAnio: iUnAnio != null ? fechaLarga(fechas[iUnAnio]) : null, jPctUnAnio: iUnAnio != null ? (jucar[iUnAnio] as number | null) : null,
  jPctMaxSig: iMaxSig != null ? (jucar[iMaxSig] as number) : null, fechaMaxSig: iMaxSig != null ? fechaLarga(fechas[iMaxSig]) : null,
  jPctHoy: pctHoy, jBajasCobertura: [...baja].length,
};
export const tablaDemarcaciones = ordenSube;
export const umbralCambio = UMBRAL_CAMBIO_EMBALSE;
export const hm3Cuenca = (c: string) => porCuenca.find((x) => x.c === c);
