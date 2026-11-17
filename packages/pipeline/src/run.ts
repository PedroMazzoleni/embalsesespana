import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readMaster, readRaw, buildFromRows } from "./pipeline.ts";
import { writeSalida } from "./export.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const rawDir = resolve(root, "data/raw/boletin-hidrologico");
const masterPath = resolve(root, "data/master/embalses-maestra.csv");
const outDir = resolve(root, "packages/web/public/data");

try {
  const { clean, resumen, salida } = buildFromRows(readRaw(rawDir), readMaster(masterPath));
  writeSalida(salida, outDir);
  for (const w of clean.stats.incoherentes) console.warn("AVISO dato incoherente descartado: " + w);
  const conCoord = clean.embalses.filter((e) => e.lat !== null).length;
  console.log(`OK -> ${outDir}`);
  console.log(`filas raw: ${clean.stats.filas} (nulos descartados: ${clean.stats.nulos_descartados}, duplicados identicos: ${clean.stats.duplicados_identicos})`);
  console.log(`embalses: ${clean.embalses.length} (activos: ${clean.embalses.filter((e) => e.activo).length}, con coordenadas: ${conCoord})`);
  const n = resumen.nacional;
  console.log(`ultima fecha: ${resumen.fecha} | nacional ${n.pct}% (${n.hm3}/${n.capacidad} hm3, ${n.n_embalses} embalses), var ${n.var_pts}, media10 ${n.media10}`);
  console.log("anios:", resumen.anios.map((a) => `${a.fecha}=${a.pct}`).join(" "));
} catch (e) {
  console.error("ERROR del pipeline:", e instanceof Error ? e.message : e);
  process.exit(1);
}
