import type { Embalse, PuntoSerie, TiempoDemarcaciones, TiempoEmbalses } from "schema";
import { CODIGOS_DEMARCACION } from "schema";
import type { Obs } from "./clean.ts";

const r1 = (x: number) => Math.round(x * 10) / 10;
/** El historico del contrato empieza en 1988 (las 2 filas sueltas de 1987 no cuentan). */
export const FECHA_INICIO = "1988-01-01";
/** Una semana tiene cobertura baja si su n.o de embalses es < este factor del esperado por las semanas vecinas. */
export const UMBRAL_COBERTURA = 0.9;
const VECINAS = 4;

export const METODO_AGREGACION =
  "pct = suma de volumenes / suma de capacidades de los embalses con dato esa semana (capacidad de cada fila). " +
  "El conjunto de embalses cambia con los anios (ADR 0006), asi que no es una media sobre conjunto fijo. " +
  "baja_cobertura marca las semanas cuyo n.o de embalses cae por debajo del 90 % del de las semanas vecinas.";

export const slugCuenca = (nombre: string) =>
  nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Indices con n < 90 % del minimo de las medianas de las 4 semanas previas y las 4 siguientes (con dato). */
export function bajaCobertura(n: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < n.length; i++) {
    if (n[i] === 0) continue; // sin datos: ya es null en la serie
    const prev = n.slice(Math.max(0, i - VECINAS), i).filter((x) => x > 0);
    const next = n.slice(i + 1, i + 1 + VECINAS).filter((x) => x > 0);
    const refs = [prev, next].filter((a) => a.length).map(mediana);
    if (refs.length && n[i] < UMBRAL_COBERTURA * Math.min(...refs)) out.push(i);
  }
  return out;
}

export interface Tiempo {
  fechas: string[];
  demarcaciones: TiempoDemarcaciones;
  /** series agregadas por demarcacion, mismo formato que series/{id}.json de un embalse */
  seriesCuenca: { id: string; data: { id: string; serie: PuntoSerie[] } }[];
}

export function buildTiempo(obs: Obs[], embalses: Embalse[], datosHasta: string, fuente: string): Tiempo {
  const fechas = [...new Set(obs.filter((o) => o.fecha >= FECHA_INICIO).map((o) => o.fecha))].sort();
  const idx = new Map(fechas.map((f, i) => [f, i]));
  const porId = new Map(embalses.map((e) => [e.id, e]));
  const codigos = CODIGOS_DEMARCACION.filter((c) => embalses.some((e) => e.demarcacion_codigo === c));
  const claves = [...codigos, "nacional"];
  const acc = new Map(claves.map((k) => [k, { vol: new Float64Array(fechas.length), cap: new Float64Array(fechas.length), n: new Int32Array(fechas.length) }]));

  for (const o of obs) {
    const i = idx.get(o.fecha);
    if (i === undefined) continue;
    const e = porId.get(o.id)!;
    for (const k of [e.demarcacion_codigo, "nacional"]) {
      const a = acc.get(k)!;
      a.vol[i] += o.vol; a.cap[i] += o.cap; a.n[i]++;
    }
  }

  const series: Record<string, (number | null)[]> = {};
  const baja: Record<string, number[]> = {};
  for (const k of claves) {
    const a = acc.get(k)!;
    series[k] = fechas.map((_, i) => (a.n[i] ? r1((a.vol[i] / a.cap[i]) * 100) : null));
    baja[k] = bajaCobertura(Array.from(a.n));
  }

  const nombre = new Map(embalses.map((e) => [e.demarcacion_codigo, e.demarcacion]));
  const seriesCuenca = codigos.map((c) => {
    const a = acc.get(c)!;
    const id = `cuenca-${slugCuenca(nombre.get(c)!)}`;
    const serie: PuntoSerie[] = [];
    fechas.forEach((f, i) => {
      if (a.n[i]) serie.push({ fecha: f, volumen_hm3: r1(a.vol[i]), pct: series[c][i]! });
    });
    return { id, data: { id, serie } };
  });

  return {
    fechas,
    demarcaciones: {
      datos_hasta: datosHasta, fuente, metodo: METODO_AGREGACION, fechas, series,
      n_nacional: Array.from(acc.get("nacional")!.n), baja_cobertura: baja,
    },
    seriesCuenca,
  };
}

/** Primera semana publicada de cada mes (mas la ultima fecha, para que termine en datos_hasta). */
export function muestreoMensual(fechas: string[]): string[] {
  const out: string[] = [];
  let mes = "";
  for (const f of fechas) if (f.slice(0, 7) !== mes) { mes = f.slice(0, 7); out.push(f); }
  const last = fechas[fechas.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Formato columnar: pct[i][j] del embalse ids[i] en fechas[j]. */
export function buildTiempoEmbalses(
  obs: Obs[], embalses: Embalse[], fechasTodas: string[], datosHasta: string, fuente: string,
  muestreo: "semanal" | "mensual",
): TiempoEmbalses {
  const fechas = muestreo === "semanal" ? fechasTodas : muestreoMensual(fechasTodas);
  const idx = new Map(fechas.map((f, i) => [f, i]));
  const ids = embalses.map((e) => e.id);
  const row = new Map(ids.map((id, i) => [id, i]));
  const pct: (number | null)[][] = ids.map(() => fechas.map(() => null));
  for (const o of obs) {
    const j = idx.get(o.fecha);
    if (j !== undefined) pct[row.get(o.id)!][j] = r1((o.vol / o.cap) * 100);
  }
  return { datos_hasta: datosHasta, fuente, muestreo, fechas, ids, pct };
}
