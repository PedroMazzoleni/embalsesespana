import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsvObjects } from "./csv.ts";
import { cleanData } from "./clean.ts";
import type { MasterRow, RawRow } from "./clean.ts";
import { computeResumen } from "./compute.ts";
import { buildSalida, FUENTE } from "./export.ts";

export function readRaw(dir: string): RawRow[] {
  const files = readdirSync(dir).filter((f) => /^embalses-\d{4}\.csv$/.test(f)).sort();
  if (!files.length) throw new Error(`no hay CSV embalses-AAAA.csv en ${dir}`);
  return files.flatMap((file) =>
    parseCsvObjects(readFileSync(join(dir, file), "utf8")).map(({ line, rec }) => ({ file, line, rec })),
  );
}

export function readMaster(path: string): MasterRow[] {
  return parseCsvObjects(readFileSync(path, "utf8")).map(({ line, rec }) => ({ file: "embalses-maestra.csv", line, rec }));
}

export function buildFromRows(raw: RawRow[], master: MasterRow[]) {
  const c = cleanData(raw, master);
  const resumen = computeResumen(c.obs, c.embalses, FUENTE);
  return { clean: c, resumen, salida: buildSalida(c.embalses, c.obs, resumen) };
}
