import type { Embalse, Resumen } from "schema";
import { CODIGOS_DEMARCACION } from "schema";
import type { Obs } from "./clean.ts";

const r1 = (x: number) => Math.round(x * 10) / 10;
const DAY = 86400000;
const toMs = (f: string) => Date.parse(f + "T00:00:00Z");

export const ANIOS_MEDIA = 10;
/** Maximo desvio (dias) entre la fecha buscada y la fecha real de un anio anterior. */
export const TOLERANCIA_DIAS = 3;
/** Minimo de anios con dato para publicar una media. */
export const MIN_ANIOS_MEDIA = 5;

type Grupo = { vol: number; cap: number; n: number };
const pctDe = (g: Grupo) => (g.vol / g.cap) * 100;

/** Fecha disponible mas cercana al mismo dia del anio, `k` anios antes; null si queda fuera de tolerancia. */
export function fechaMismaSemana(fechas: string[], ref: string, k: number): string | null {
  const d = new Date(toMs(ref));
  d.setUTCFullYear(d.getUTCFullYear() - k);
  const target = d.getTime();
  let best: string | null = null, bestDiff = Infinity;
  for (const f of fechas) {
    const diff = Math.abs(toMs(f) - target);
    if (diff < bestDiff) { bestDiff = diff; best = f; }
  }
  return best !== null && bestDiff <= TOLERANCIA_DIAS * DAY ? best : null;
}

/**
 * Criterio de la media (ADR 0006): para cada anio se calcula el % de llenado de la misma
 * semana sobre el conjunto de embalses con dato en esa semana Y en la ultima (conjunto
 * comun), de modo que la comparacion no cambia porque entren o salgan embalses.
 * media10 = media aritmetica de los porcentajes anuales disponibles (minimo 5).
 */
export function computeResumen(obs: Obs[], embalses: Embalse[], fuente: string): Resumen {
  const porFecha = new Map<string, Map<string, Obs>>();
  for (const o of obs) {
    let m = porFecha.get(o.fecha);
    if (!m) porFecha.set(o.fecha, (m = new Map()));
    m.set(o.id, o);
  }
  const fechas = [...porFecha.keys()].sort();
  const fecha = fechas[fechas.length - 1];
  if (!fecha) throw new Error("sin datos");
  const fechaPrevia = fechas[fechas.length - 2];
  if (!fechaPrevia) throw new Error("falta la semana previa");
  const actual = porFecha.get(fecha)!;
  const demDe = new Map(embalses.map((e) => [e.id, e.demarcacion_codigo]));
  const nombreDem = new Map(embalses.map((e) => [e.demarcacion_codigo, e.demarcacion]));

  const suma = (src: Map<string, Obs>, dem: string | null, comun: boolean): Grupo | null => {
    const g: Grupo = { vol: 0, cap: 0, n: 0 };
    for (const [id, o] of src) {
      if ((comun && !actual.has(id)) || (dem && demDe.get(id) !== dem)) continue;
      g.vol += o.vol; g.cap += o.cap; g.n++;
    }
    return g.n ? g : null;
  };

  const fechasMedia: string[] = [];
  const mapas: { fecha: string; m: Map<string, Obs> }[] = [];
  for (let k = ANIOS_MEDIA; k >= 1; k--) {
    const f = fechaMismaSemana(fechas, fecha, k);
    if (f) { fechasMedia.push(f); mapas.push({ fecha: f, m: porFecha.get(f)! }); }
  }

  const bloque = (dem: string | null) => {
    const g = suma(actual, dem, false)!;
    const pct = pctDe(g);
    const prev = suma(porFecha.get(fechaPrevia)!, dem, true);
    const pctPrevia = prev ? pctDe(prev) : pct;
    const anuales = mapas.map(({ m }) => suma(m, dem, true)).filter((x): x is Grupo => !!x).map(pctDe);
    const media = anuales.length >= MIN_ANIOS_MEDIA ? anuales.reduce((a, b) => a + b, 0) / anuales.length : null;
    return {
      pct: r1(pct), hm3: r1(g.vol), capacidad: r1(g.cap), n_embalses: g.n,
      pct_previa: r1(pctPrevia), var_pts: r1(pct - pctPrevia),
      media10: media === null ? null : r1(media),
      dif_media_pts: media === null ? null : r1(pct - media),
    };
  };

  const anios = mapas.flatMap(({ fecha: f, m }) => {
    const g = suma(m, null, true);
    return g ? [{ fecha: f, pct: r1(pctDe(g)) }] : [];
  });

  return {
    datos_hasta: fecha, fuente, fecha, fecha_previa: fechaPrevia,
    fechas_media: fechasMedia, anios,
    nacional: bloque(null),
    demarcaciones: CODIGOS_DEMARCACION.filter((c) => nombreDem.has(c)).map((c) => ({
      codigo: c, nombre: nombreDem.get(c)!, ...bloque(c),
    })),
  };
}
