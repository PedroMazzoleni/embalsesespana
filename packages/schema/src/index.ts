import { z } from "zod";

/** Contrato de datos: fuente unica de tipos para pipeline y web. */

export const SCHEMA_VERSION = 1;

export const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha esperada YYYY-MM-DD");
const pct = z.number().min(0).max(150);
const hm3 = z.number().min(0);

export const CODIGOS_DEMARCACION = [
  "ES010", "ES014", "ES017", "ES018", "ES020", "ES030", "ES040", "ES050",
  "ES060", "ES063", "ES064", "ES070", "ES080", "ES091", "ES100",
] as const;
export const codigoDemarcacion = z.enum(CODIGOS_DEMARCACION);

// ---------- embalses.json ----------
export const embalseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  nombre: z.string().min(1),
  demarcacion: z.string().min(1),
  demarcacion_codigo: codigoDemarcacion,
  provincia: z.string().nullable(),
  lat: z.number().min(35).max(44.5).nullable(),
  lon: z.number().min(-10).max(5).nullable(),
  capacidad_hm3: z.number().positive(),
  uso: z.string().nullable(),
  foto: z.string().nullable(),
  /** true si tiene dato en la ultima semana publicada */
  activo: z.boolean(),
  primera_fecha: fechaIso,
  ultima_fecha: fechaIso,
}).refine((e) => (e.lat === null) === (e.lon === null), { message: "lat y lon van juntas" });
export const embalsesSchema = z.object({
  datos_hasta: fechaIso,
  fuente: z.string(),
  embalses: z.array(embalseSchema),
});

// ---------- series/{id}.json ----------
export const puntoSerieSchema = z.object({
  fecha: fechaIso,
  volumen_hm3: hm3,
  pct,
});
export const serieSchema = z.object({
  id: z.string().min(1),
  serie: z.array(puntoSerieSchema).min(1),
});

// ---------- resumen.json ----------
const bloqueResumen = {
  pct,
  hm3,
  capacidad: z.number().positive(),
  n_embalses: z.number().int().positive(),
  /** pct de la semana anterior y variacion en puntos porcentuales */
  pct_previa: pct,
  var_pts: z.number(),
  /** media de la misma semana de los 10 anios anteriores (pct) y diferencia en puntos */
  media10: pct.nullable(),
  dif_media_pts: z.number().nullable(),
};
export const resumenSchema = z.object({
  datos_hasta: fechaIso,
  fuente: z.string(),
  fecha: fechaIso,
  fecha_previa: fechaIso,
  /** fechas usadas para la media de 10 anios (una por anio) */
  fechas_media: z.array(fechaIso),
  /** pct nacional de cada uno de esos anios en la misma semana */
  anios: z.array(z.object({ fecha: fechaIso, pct })),
  nacional: z.object(bloqueResumen),
  demarcaciones: z.array(
    z.object({
      codigo: codigoDemarcacion,
      nombre: z.string(),
      ...bloqueResumen,
    }),
  ),
});

// ---------- historico.parquet (una fila por embalse y semana, desde 1988) ----------
export const historicoFilaSchema = z.object({
  fecha: fechaIso,
  id: z.string().min(1),
  slug: z.string().min(1),
  demarcacion_codigo: codigoDemarcacion,
  volumen_hm3: hm3,
  capacidad_hm3: z.number().positive(),
  pct,
});

// ---------- tiempo/demarcaciones.json (maquina del tiempo 2D) ----------
/** Claves de `series`: las demarcaciones (ESxxx) y `nacional`. Un valor por fecha (null = sin embalses). */
export const tiempoDemarcacionesSchema = z.object({
  datos_hasta: fechaIso,
  fuente: z.string(),
  metodo: z.string(),
  fechas: z.array(fechaIso).min(1),
  series: z.record(z.string(), z.array(pct.nullable())),
  /** n.o de embalses con dato cada semana en el total nacional */
  n_nacional: z.array(z.number().int().nonnegative()),
  /** indices de `fechas` con cobertura baja (caida puntual del n.o de embalses), por serie */
  baja_cobertura: z.record(z.string(), z.array(z.number().int().nonnegative())),
}).superRefine((t, ctx) => {
  const n = t.fechas.length;
  for (const [k, v] of Object.entries(t.series)) {
    if (v.length !== n) ctx.addIssue({ code: "custom", path: ["series", k], message: `longitud ${v.length} distinta de ${n} fechas` });
  }
  if (t.n_nacional.length !== n) ctx.addIssue({ code: "custom", path: ["n_nacional"], message: "longitud distinta de fechas" });
  if (!t.series.nacional) ctx.addIssue({ code: "custom", path: ["series"], message: "falta la serie nacional" });
});

// ---------- tiempo/embalses.json (puntos en el tiempo) ----------
export const tiempoEmbalsesSchema = z.object({
  datos_hasta: fechaIso,
  fuente: z.string(),
  /** 'semanal' o 'mensual' (primera semana publicada de cada mes) */
  muestreo: z.enum(["semanal", "mensual"]),
  fechas: z.array(fechaIso).min(1),
  ids: z.array(z.string().min(1)),
  /** pct[i][j]: embalse ids[i] en fechas[j]; null si no hay dato */
  pct: z.array(z.array(pct.nullable())),
}).superRefine((t, ctx) => {
  if (t.pct.length !== t.ids.length) ctx.addIssue({ code: "custom", path: ["pct"], message: "n.o de filas distinto de ids" });
  t.pct.forEach((row, i) => {
    if (row.length !== t.fechas.length) ctx.addIssue({ code: "custom", path: ["pct", i], message: "longitud distinta de fechas" });
  });
});

export type HistoricoFila = z.infer<typeof historicoFilaSchema>;
export type TiempoDemarcaciones = z.infer<typeof tiempoDemarcacionesSchema>;
export type TiempoEmbalses = z.infer<typeof tiempoEmbalsesSchema>;
export type Embalse = z.infer<typeof embalseSchema>;
export type Embalses = z.infer<typeof embalsesSchema>;
export type PuntoSerie = z.infer<typeof puntoSerieSchema>;
export type Serie = z.infer<typeof serieSchema>;
export type Resumen = z.infer<typeof resumenSchema>;
