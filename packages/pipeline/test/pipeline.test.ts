import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvObjects } from "../src/csv.ts";
import { cleanData, nombreLegible, parseHm3, PipelineError } from "../src/clean.ts";
import { computeResumen, fechaMismaSemana } from "../src/compute.ts";
import { buildFromRows } from "../src/pipeline.ts";
import { writeSalida } from "../src/export.ts";

const fx = (f: string) => join(import.meta.dirname, "../fixtures", f);
const load = (f: string, name: string) =>
  parseCsvObjects(readFileSync(fx(f), "utf8")).map(({ line, rec }) => ({ file: name, line, rec }));
const raw = () => load("raw-muestra.csv", "raw-muestra.csv");
const master = () => load("maestra-muestra.csv", "maestra-muestra.csv");

describe("csv y clean", () => {
  it("parsea comillas y comas decimales", () => {
    expect(parseCsv('a,b\n"x, y","1,00"\n')).toEqual([["a", "b"], ["x, y", "1,00"]]);
    expect(parseHm3("91,00")).toBe(91);
    expect(parseHm3("")).toBeNull();
    expect(() => parseHm3("1.000,5")).toThrow();
  });
  it("normaliza nombres con articulo", () => {
    expect(nombreLegible("Barca, La")).toBe("La Barca");
    expect(nombreLegible("Agavanzal, Nª Sª de")).toBe("Agavanzal, Nª Sª de");
  });
  it("limpia, empareja por id y deja sin coordenadas al que no tiene", () => {
    const c = cleanData(raw(), master());
    expect(c.embalses.map((e) => e.id)).toEqual(["alfa", "beta", "gamma"]);
    expect(c.embalses[0]).toMatchObject({ nombre: "La Alfa", capacidad_hm3: 100, activo: true, primera_fecha: "2020-11-10" });
    expect(c.embalses[2]).toMatchObject({ lat: null, lon: null });
    expect(c.obs).toHaveLength(24);
  });
  it("descarta nulos e incoherentes y avisa", () => {
    const r = raw();
    r[0].rec.AGUA_ACTUAL = "";
    r[1].rec.AGUA_ACTUAL = "900,00";
    const c = cleanData(r, master());
    expect(c.stats.nulos_descartados).toBe(1);
    expect(c.stats.incoherentes).toHaveLength(1);
    expect(c.obs).toHaveLength(22);
  });
  it("falla con fichero y linea si el embalse no esta en la maestra", () => {
    const r = raw();
    r[2].rec.EMBALSE_NOMBRE = "Inventado";
    expect(() => cleanData(r, master())).toThrow(/raw-muestra\.csv:4: .*Inventado.*EMBALSE_NOMBRE/);
  });
});

describe("resumen", () => {
  it("elige la fecha mas cercana dentro de tolerancia", () => {
    const f = ["2025-11-11", "2025-11-04", "2025-11-18"];
    expect(fechaMismaSemana(f, "2026-11-10", 1)).toBe("2025-11-11");
    expect(fechaMismaSemana(["2025-10-01"], "2026-11-10", 1)).toBeNull();
  });
  it("calcula nacional, variacion y media de anios anteriores", () => {
    const { resumen } = buildFromRows(raw(), master());
    expect(resumen.fecha).toBe("2026-11-10");
    expect(resumen.fecha_previa).toBe("2026-11-03");
    // 68+42+12 = 122 hm3 de 170
    expect(resumen.nacional).toMatchObject({ hm3: 122, capacidad: 170, n_embalses: 3, pct: 71.8 });
    // previa: 70+40+10 = 120 / 170 = 70.6
    expect(resumen.nacional.pct_previa).toBe(70.6);
    expect(resumen.nacional.var_pts).toBe(1.2);
    // anios 2021..2025 (5 disponibles): 2020 queda fuera (6 anios atras tiene dato, 2016-2019 no)
    const esperados = [
      (40 + 20 + 10) / 170, (30 + 15 + 10) / 170, (45 + 25 + 10) / 170,
      (60 + 30 + 10) / 170, (55 + 20 + 10) / 170,
    ].map((x) => x * 100);
    const media = esperados.reduce((a, b) => a + b, 0) / 5;
    expect(resumen.anios).toHaveLength(6); // incluye 2020
    expect(resumen.nacional.media10).not.toBeNull();
    const con2020 = [...esperados, ((50 + 10 + 10) / 170) * 100];
    const m6 = con2020.reduce((a, b) => a + b, 0) / 6;
    expect(resumen.nacional.media10).toBe(Math.round(m6 * 10) / 10);
    expect(Math.abs(m6 - media)).toBeGreaterThan(0);
  });
  it("usa conjunto comun: un embalse que no existia no altera la media", () => {
    const r = raw().filter((x) => !(x.rec.EMBALSE_NOMBRE === "Beta" && x.rec.FECHA < "2024-01-01"));
    const { resumen } = buildFromRows(r, master());
    const a2022 = resumen.anios.find((a) => a.fecha === "2022-11-08")!;
    expect(a2022.pct).toBe(Math.round(((30 + 10) / 120) * 1000) / 10);
  });
  it("sin media si hay menos de 5 anios", () => {
    const r = raw().filter((x) => x.rec.FECHA >= "2024-01-01");
    const c = cleanData(r, master());
    const res = computeResumen(c.obs, c.embalses, "x");
    expect(res.nacional.media10).toBeNull();
    expect(res.nacional.dif_media_pts).toBeNull();
  });
});

describe("exportacion", () => {
  it("escribe los ficheros cuando todo valida", () => {
    const out = mkdtempSync(join(tmpdir(), "pipe-"));
    writeSalida(buildFromRows(raw(), master()).salida, out);
    expect(existsSync(join(out, "embalses.json"))).toBe(true);
    expect(existsSync(join(out, "resumen.json"))).toBe(true);
    expect(existsSync(join(out, "series", "alfa.json"))).toBe(true);
  });
  it("un dato invalido bloquea la exportacion y no escribe nada", () => {
    const out = mkdtempSync(join(tmpdir(), "pipe-"));
    const { salida } = buildFromRows(raw(), master());
    (salida.series[0].data as any).serie[0].pct = -5;
    expect(() => writeSalida(salida, out)).toThrow(PipelineError);
    expect(() => writeSalida(salida, out)).toThrow(/series\/alfa\.json: campo serie\.0\.pct/);
    expect(existsSync(join(out, "embalses.json"))).toBe(false);
    expect(existsSync(join(out, "series"))).toBe(false);
  });
});
