import { readFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import {
  historicoFilaSchema, serieSchema, tiempoDemarcacionesSchema, tiempoEmbalsesSchema,
} from "schema";
import { parseCsvObjects } from "../src/csv.ts";
import { buildFromRows, readMaster, readRaw } from "../src/pipeline.ts";
import { writeSalida, validateSalida } from "../src/export.ts";
import { bajaCobertura, muestreoMensual, slugCuenca } from "../src/tiempo.ts";
import { parseHm3 } from "../src/clean.ts";

const fx = (f: string) => join(import.meta.dirname, "../fixtures", f);
const load = (f: string) => parseCsvObjects(readFileSync(fx(f), "utf8")).map(({ line, rec }) => ({ file: f, line, rec }));

describe("tiempo (fixture)", () => {
  const { salida } = buildFromRows(load("raw-muestra.csv"), load("maestra-muestra.csv"));
  it("forma: una columna por demarcacion + nacional, todas con tantos valores como fechas", () => {
    const t = tiempoDemarcacionesSchema.parse(salida.tiempoDemarcaciones);
    expect(t.fechas).toHaveLength(8);
    expect(Object.keys(t.series).sort()).toEqual(["ES030", "ES091", "nacional"]);
    // 2020-11-10: (50+10+10)/170
    expect(t.series.nacional[0]).toBe(41.2);
    expect(t.series.ES091[0]).toBe(50);
  });
  it("serie de cuenca con el formato de serie de embalse", () => {
    const c = salida.series.find((s) => s.id === "cuenca-tajo")!;
    const s = serieSchema.parse(c.data);
    expect(s.serie[0]).toEqual({ fecha: "2020-11-10", volumen_hm3: 60, pct: 40 });
  });
  it("puntos en el tiempo: filas alineadas con fechas", () => {
    const t = tiempoEmbalsesSchema.parse(salida.tiempoEmbalses);
    expect(t.ids).toEqual(["alfa", "beta", "gamma"]);
    expect(t.pct[0][0]).toBe(50);
  });
  it("cobertura baja: caida puntual si, cambio permanente no", () => {
    expect(bajaCobertura([10, 10, 10, 10, 5, 10, 10, 10])).toEqual([4]);
    expect(bajaCobertura([10, 10, 10, 10, 8, 8, 8, 8, 8])).toEqual([]);
  });
  it("muestreo mensual y slug", () => {
    expect(muestreoMensual(["2020-01-07", "2020-01-14", "2020-02-04", "2020-02-11"])).toEqual(["2020-01-07", "2020-02-04", "2020-02-11"]);
    expect(slugCuenca("Cuencas Mediterráneas Andaluzas")).toBe("cuencas-mediterraneas-andaluzas");
  });
  it("un dato invalido en el tiempo o el historico bloquea la exportacion", () => {
    const s = buildFromRows(load("raw-muestra.csv"), load("maestra-muestra.csv")).salida;
    s.historico.pct[3] = 999;
    expect(() => validateSalida(s)).toThrow(/historico\.parquet: fila 3 .*campo pct/);
    const s2 = buildFromRows(load("raw-muestra.csv"), load("maestra-muestra.csv")).salida;
    (s2.tiempoDemarcaciones as any).series.nacional.pop();
    expect(() => validateSalida(s2)).toThrow(/tiempo\/demarcaciones\.json: campo series\.nacional/);
  });
  it("parquet: se escribe y se lee de vuelta con las mismas filas", async () => {
    const out = mkdtempSync(join(tmpdir(), "pipe-"));
    writeSalida(salida, out);
    const rows = await parquetReadObjects({ file: await asyncBufferFromFile(join(out, "historico.parquet")) });
    expect(rows).toHaveLength(24);
    for (const r of rows) historicoFilaSchema.parse(r);
    expect(rows[0]).toMatchObject({ fecha: "2020-11-10", id: "alfa", pct: 50 });
  });
});

const root = resolve(import.meta.dirname, "../../..");
describe("tiempo (datos reales de data/raw)", () => {
  const rawDir = join(root, "data/raw/boletin-hidrologico");
  const raw = readRaw(rawDir);
  const { salida, clean } = buildFromRows(raw, readMaster(join(root, "data/master/embalses-maestra.csv")));
  const t = tiempoDemarcacionesSchema.parse(salida.tiempoDemarcaciones);

  it("n.o de semanas = fechas distintas del raw desde 1988", () => {
    const f = new Set(raw.map((r) => r.rec.FECHA).filter((x) => x >= "1988-01-01"));
    expect(t.fechas).toHaveLength(f.size);
    expect(t.fechas[0]).toBe("1988-01-05");
    expect(new Set(salida.historico.fecha).size).toBe(f.size);
    expect(t.fechas[t.fechas.length - 1]).toBe(clean.obs.reduce((m, o) => (o.fecha > m ? o.fecha : m), ""));
  });

  it("una semana de una demarcacion cuadra con el calculo directo desde los CSV", () => {
    const fecha = "2015-03-03";
    const master = readMaster(join(root, "data/master/embalses-maestra.csv"));
    const dem = new Map(master.map((m) => [`${m.rec.nombre_miteco}|${m.rec.ambito_miteco}`, m.rec.demarcacion]));
    let vol = 0, cap = 0;
    for (const { rec } of raw) {
      if (rec.FECHA !== fecha || dem.get(`${rec.EMBALSE_NOMBRE}|${rec.AMBITO_NOMBRE}`) !== "Tajo") continue;
      const c = parseHm3(rec.AGUA_TOTAL), v = parseHm3(rec.AGUA_ACTUAL);
      if (c === null || v === null || c <= 0 || v > c * 1.5) continue;
      vol += v; cap += c;
    }
    const j = t.fechas.indexOf(fecha);
    expect(j).toBeGreaterThan(0);
    expect(t.series.ES030[j]).toBe(Math.round((vol / cap) * 1000) / 10);
    const cuenca = (salida.series.find((s) => s.id === "cuenca-tajo")!.data as any).serie.find((p: any) => p.fecha === fecha);
    expect(cuenca.pct).toBe(t.series.ES030[j]);
    expect(cuenca.volumen_hm3).toBe(Math.round(vol * 10) / 10);
  });

  it("la ultima semana nacional coincide con resumen.json", () => {
    const r = salida.resumen as any;
    expect(t.series.nacional[t.fechas.length - 1]).toBe(r.nacional.pct);
  });

  it("el historico tiene una fila por obs desde 1988 y la serie por cuenca existe para cada demarcacion", () => {
    expect(salida.historico.fecha.length).toBe(clean.obs.filter((o) => o.fecha >= "1988-01-01").length);
    expect(salida.series.filter((s) => s.id.startsWith("cuenca-"))).toHaveLength(15);
    expect(readdirSync(rawDir).some((f) => f.endsWith(".csv"))).toBe(true);
  });
});
