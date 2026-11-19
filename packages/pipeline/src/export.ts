import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parquetWriteBuffer } from "hyparquet-writer";
import {
  embalsesSchema, historicoFilaSchema, resumenSchema, serieSchema,
  tiempoDemarcacionesSchema, tiempoEmbalsesSchema,
} from "schema";
import type { Embalse, PuntoSerie, Resumen } from "schema";
import type { ZodType } from "zod";
import type { Obs } from "./clean.ts";
import { PipelineError } from "./clean.ts";
import { buildTiempo, buildTiempoEmbalses, FECHA_INICIO } from "./tiempo.ts";

export const FUENTE = "MITECO, Boletín Hidrológico (datos provisionales)";

/** Una fila por embalse y semana desde 1988, en columnas (para parquet). */
export interface HistoricoCols {
  fecha: string[]; id: string[]; slug: string[]; demarcacion_codigo: string[];
  volumen_hm3: number[]; capacidad_hm3: number[]; pct: number[];
}

export interface Salida {
  embalses: unknown;
  resumen: unknown;
  /** series de embalse (id = id del embalse) y de cuenca (id = cuenca-{slug}) */
  series: { id: string; data: unknown }[];
  tiempoDemarcaciones: unknown;
  tiempoEmbalses: unknown;
  historico: HistoricoCols;
}

/** semanal pesa ~3,8 MB (~0,5 MB gzip), dentro del presupuesto de 1,5 MB gz; "mensual" queda disponible. */
export const MUESTREO_TIEMPO_EMBALSES: "semanal" | "mensual" = "semanal";

export function buildSalida(embalses: Embalse[], obs: Obs[], resumen: Resumen): Salida {
  const porId = new Map<string, PuntoSerie[]>();
  for (const o of obs) {
    let s = porId.get(o.id);
    if (!s) porId.set(o.id, (s = []));
    s.push({ fecha: o.fecha, volumen_hm3: o.vol, pct: Math.round((o.vol / o.cap) * 1000) / 10 });
  }
  const tiempo = buildTiempo(obs, embalses, resumen.fecha, FUENTE);
  const emb = new Map(embalses.map((e) => [e.id, e]));
  const h: HistoricoCols = { fecha: [], id: [], slug: [], demarcacion_codigo: [], volumen_hm3: [], capacidad_hm3: [], pct: [] };
  for (const o of obs) {
    if (o.fecha < FECHA_INICIO) continue;
    const e = emb.get(o.id)!;
    h.fecha.push(o.fecha); h.id.push(o.id); h.slug.push(e.slug); h.demarcacion_codigo.push(e.demarcacion_codigo);
    h.volumen_hm3.push(o.vol); h.capacidad_hm3.push(o.cap); h.pct.push(Math.round((o.vol / o.cap) * 1000) / 10);
  }
  // orden del parquet: por fecha y luego id (los filtros por semana de la maquina del tiempo leen pocos row groups)
  const ord = h.fecha.map((_, i) => i).sort((a, b) => (h.fecha[a] < h.fecha[b] ? -1 : h.fecha[a] > h.fecha[b] ? 1 : h.id[a] < h.id[b] ? -1 : 1));
  const sorted = Object.fromEntries(Object.entries(h).map(([k, v]) => [k, ord.map((i) => (v as unknown[])[i])])) as unknown as HistoricoCols;

  return {
    embalses: { datos_hasta: resumen.fecha, fuente: FUENTE, embalses },
    resumen,
    series: [...[...porId].map(([id, serie]) => ({ id, data: { id, serie } })), ...tiempo.seriesCuenca],
    tiempoDemarcaciones: tiempo.demarcaciones,
    tiempoEmbalses: buildTiempoEmbalses(obs, embalses, tiempo.fechas, resumen.fecha, FUENTE, MUESTREO_TIEMPO_EMBALSES),
    historico: sorted,
  };
}

function check(name: string, schema: ZodType, value: unknown, errors: string[]) {
  const r = schema.safeParse(value);
  if (r.success) return;
  for (const i of r.error.issues.slice(0, 5)) {
    errors.push(`${name}: campo ${i.path.join(".") || "(raiz)"}: ${i.message}`);
  }
  if (r.error.issues.length > 5) errors.push(`${name}: y ${r.error.issues.length - 5} errores mas`);
}

/** Valida fila a fila; se detiene a los 5 errores. */
function checkHistorico(h: HistoricoCols, errors: string[]) {
  const n = h.fecha.length;
  let malas = 0;
  for (let i = 0; i < n && malas < 5; i++) {
    const r = historicoFilaSchema.safeParse({
      fecha: h.fecha[i], id: h.id[i], slug: h.slug[i], demarcacion_codigo: h.demarcacion_codigo[i],
      volumen_hm3: h.volumen_hm3[i], capacidad_hm3: h.capacidad_hm3[i], pct: h.pct[i],
    });
    if (!r.success) {
      malas++;
      const q = r.error.issues[0];
      errors.push(`historico.parquet: fila ${i} (${h.id[i]} ${h.fecha[i]}): campo ${q.path.join(".")}: ${q.message}`);
    }
  }
}

/** Valida TODO antes de escribir nada. Lanza PipelineError con la lista de problemas. */
export function validateSalida(s: Salida): void {
  const errors: string[] = [];
  check("embalses.json", embalsesSchema, s.embalses, errors);
  check("resumen.json", resumenSchema, s.resumen, errors);
  check("tiempo/demarcaciones.json", tiempoDemarcacionesSchema, s.tiempoDemarcaciones, errors);
  check("tiempo/embalses.json", tiempoEmbalsesSchema, s.tiempoEmbalses, errors);
  checkHistorico(s.historico, errors);
  for (const { id, data } of s.series) {
    check(`series/${id}.json`, serieSchema, data, errors);
    if (errors.length > 30) break;
  }
  if (errors.length) throw new PipelineError("Validacion fallida, no se escribe nada:\n  " + errors.join("\n  "));
}

export function historicoParquet(h: HistoricoCols): ArrayBuffer {
  return parquetWriteBuffer({
    columnData: [
      { name: "fecha", data: h.fecha, type: "STRING" },
      { name: "id", data: h.id, type: "STRING" },
      { name: "slug", data: h.slug, type: "STRING" },
      { name: "demarcacion_codigo", data: h.demarcacion_codigo, type: "STRING" },
      { name: "volumen_hm3", data: h.volumen_hm3, type: "DOUBLE" },
      { name: "capacidad_hm3", data: h.capacidad_hm3, type: "DOUBLE" },
      { name: "pct", data: h.pct, type: "DOUBLE" },
    ],
  });
}

export function writeSalida(s: Salida, outDir: string): void {
  validateSalida(s);
  const sdir = join(outDir, "series");
  const tdir = join(outDir, "tiempo");
  rmSync(sdir, { recursive: true, force: true });
  rmSync(tdir, { recursive: true, force: true });
  mkdirSync(sdir, { recursive: true });
  mkdirSync(tdir, { recursive: true });
  writeFileSync(join(outDir, "embalses.json"), JSON.stringify(s.embalses));
  writeFileSync(join(outDir, "resumen.json"), JSON.stringify(s.resumen, null, 2));
  writeFileSync(join(tdir, "demarcaciones.json"), JSON.stringify(s.tiempoDemarcaciones));
  writeFileSync(join(tdir, "embalses.json"), JSON.stringify(s.tiempoEmbalses));
  writeFileSync(join(outDir, "historico.parquet"), new Uint8Array(historicoParquet(s.historico)));
  for (const { id, data } of s.series) writeFileSync(join(sdir, `${id}.json`), JSON.stringify(data));
}
