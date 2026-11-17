import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { embalsesSchema, resumenSchema, serieSchema } from "schema";
import type { Embalse, PuntoSerie, Resumen } from "schema";
import type { ZodType } from "zod";
import type { Obs } from "./clean.ts";
import { PipelineError } from "./clean.ts";

export const FUENTE = "MITECO, Boletín Hidrológico (datos provisionales)";

export interface Salida {
  embalses: unknown;
  resumen: unknown;
  series: { id: string; data: unknown }[];
}

export function buildSalida(embalses: Embalse[], obs: Obs[], resumen: Resumen): Salida {
  const porId = new Map<string, PuntoSerie[]>();
  for (const o of obs) {
    let s = porId.get(o.id);
    if (!s) porId.set(o.id, (s = []));
    s.push({ fecha: o.fecha, volumen_hm3: o.vol, pct: Math.round((o.vol / o.cap) * 1000) / 10 });
  }
  return {
    embalses: { datos_hasta: resumen.fecha, fuente: FUENTE, embalses },
    resumen,
    series: [...porId].map(([id, serie]) => ({ id, data: { id, serie } })),
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

/** Valida TODO antes de escribir nada. Lanza PipelineError con la lista de problemas. */
export function validateSalida(s: Salida): void {
  const errors: string[] = [];
  check("embalses.json", embalsesSchema, s.embalses, errors);
  check("resumen.json", resumenSchema, s.resumen, errors);
  for (const { id, data } of s.series) {
    check(`series/${id}.json`, serieSchema, data, errors);
    if (errors.length > 30) break;
  }
  if (errors.length) throw new PipelineError("Validacion fallida, no se escribe nada:\n  " + errors.join("\n  "));
}

export function writeSalida(s: Salida, outDir: string): void {
  validateSalida(s);
  const sdir = join(outDir, "series");
  rmSync(sdir, { recursive: true, force: true });
  mkdirSync(sdir, { recursive: true });
  writeFileSync(join(outDir, "embalses.json"), JSON.stringify(s.embalses));
  writeFileSync(join(outDir, "resumen.json"), JSON.stringify(s.resumen, null, 2));
  for (const { id, data } of s.series) writeFileSync(join(sdir, `${id}.json`), JSON.stringify(data));
}
