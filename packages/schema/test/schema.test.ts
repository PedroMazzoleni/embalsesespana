import { describe, expect, it } from "vitest";
import { embalseSchema, puntoSerieSchema, resumenSchema } from "../src/index.ts";

const base = {
  id: "a", slug: "a", nombre: "A", demarcacion: "Tajo", demarcacion_codigo: "ES030",
  provincia: null, lat: 40, lon: -3, capacidad_hm3: 10, uso: null, foto: null,
  activo: true, primera_fecha: "1988-01-05", ultima_fecha: "2026-11-10",
};

describe("schema", () => {
  it("acepta un embalse valido y uno sin coordenadas", () => {
    expect(embalseSchema.safeParse(base).success).toBe(true);
    expect(embalseSchema.safeParse({ ...base, lat: null, lon: null }).success).toBe(true);
  });
  it("rechaza coordenadas a medias, capacidad <= 0 y fechas mal formadas", () => {
    expect(embalseSchema.safeParse({ ...base, lat: null }).success).toBe(false);
    expect(embalseSchema.safeParse({ ...base, capacidad_hm3: 0 }).success).toBe(false);
    expect(puntoSerieSchema.safeParse({ fecha: "10/11/2026", volumen_hm3: 1, pct: 1 }).success).toBe(false);
  });
  it("rechaza un resumen vacio", () => {
    expect(resumenSchema.safeParse({}).success).toBe(false);
  });
});
