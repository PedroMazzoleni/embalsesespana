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

export type Embalse = z.infer<typeof embalseSchema>;
export type Embalses = z.infer<typeof embalsesSchema>;
export type PuntoSerie = z.infer<typeof puntoSerieSchema>;
export type Serie = z.infer<typeof serieSchema>;
export type Resumen = z.infer<typeof resumenSchema>;
