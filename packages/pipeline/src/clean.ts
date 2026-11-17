import type { Embalse } from "schema";
import { CODIGOS_DEMARCACION } from "schema";

export interface RawRow { file: string; line: number; rec: Record<string, string> }
export interface MasterRow { file: string; line: number; rec: Record<string, string> }
/** Observacion limpia: un embalse en una fecha. */
export interface Obs { id: string; fecha: string; vol: number; cap: number }
export interface CleanResult {
  embalses: Embalse[];
  obs: Obs[];
  stats: { filas: number; nulos_descartados: number; duplicados_identicos: number; incoherentes: string[] };
}

/** Por encima de este cociente volumen/capacidad el dato se considera erroneo. */
export const MAX_RATIO = 1.5;

export class PipelineError extends Error {}

export const CODIGO_POR_DEMARCACION: Record<string, (typeof CODIGOS_DEMARCACION)[number]> = {
  "Miño-Sil": "ES010", "Galicia-Costa": "ES014", "Cantábrico Oriental": "ES017",
  "Cantábrico Occidental": "ES018", Duero: "ES020", Tajo: "ES030", Guadiana: "ES040",
  Guadalquivir: "ES050", "Cuencas Mediterráneas Andaluzas": "ES060",
  "Guadalete y Barbate": "ES063", "Tinto, Odiel y Piedras": "ES064", Segura: "ES070",
  Júcar: "ES080", Ebro: "ES091", "Cuencas Internas de Cataluña": "ES100",
};

/** "91,00" -> 91. Devuelve null si esta vacio; lanza si no es un numero valido. */
export function parseHm3(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  if (!/^\d+(,\d+)?$/.test(t)) throw new Error(`numero no valido "${s}"`);
  return Number(t.replace(",", "."));
}

/** "Barca, La" -> "La Barca". */
export function nombreLegible(n: string): string {
  const m = n.match(/^(.+), (El|La|Los|Las|Lo)$/);
  return m ? `${m[2]} ${m[1]}` : n;
}

const num = (s: string | undefined) => (s && s.trim() !== "" ? Number(s) : null);

export function cleanData(raw: RawRow[], master: MasterRow[]): CleanResult {
  // Indice de la tabla maestra por (nombre MITECO, ambito)
  const byKey = new Map<string, MasterRow>();
  for (const m of master) {
    const k = `${m.rec.nombre_miteco}|${m.rec.ambito_miteco}`;
    if (byKey.has(k)) throw new PipelineError(`${m.file}:${m.line}: clave duplicada en la tabla maestra (${k})`);
    byKey.set(k, m);
  }

  const seen = new Map<string, Obs>();
  const used = new Map<string, { first: string; last: string; cap: number }>();
  const stats = { filas: raw.length, nulos_descartados: 0, duplicados_identicos: 0, incoherentes: [] as string[] };

  for (const { file, line, rec } of raw) {
    const where = `${file}:${line}`;
    const m = byKey.get(`${rec.EMBALSE_NOMBRE}|${rec.AMBITO_NOMBRE}`);
    if (!m) throw new PipelineError(`${where}: embalse "${rec.EMBALSE_NOMBRE}" (${rec.AMBITO_NOMBRE}) no esta en la tabla maestra; campo EMBALSE_NOMBRE`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.FECHA)) throw new PipelineError(`${where}: campo FECHA no valido "${rec.FECHA}"`);
    let cap: number | null, vol: number | null;
    try { cap = parseHm3(rec.AGUA_TOTAL); } catch (e) { throw new PipelineError(`${where}: campo AGUA_TOTAL: ${(e as Error).message}`); }
    try { vol = parseHm3(rec.AGUA_ACTUAL); } catch (e) { throw new PipelineError(`${where}: campo AGUA_ACTUAL: ${(e as Error).message}`); }
    if (cap === null || vol === null || cap <= 0) { stats.nulos_descartados++; continue; } // sin pct calculable
    // Volumen > 150 % de la capacidad: error de la fuente (p. ej. 70 hm3 en un embalse de 10). Se descarta y se avisa.
    if (vol > cap * MAX_RATIO) { stats.incoherentes.push(`${where} ${m.rec.id} ${rec.FECHA}: ${vol} hm3 con capacidad ${cap}`); continue; }
    const id = m.rec.id;
    const key = `${id}|${rec.FECHA}`;
    const prev = seen.get(key);
    if (prev) {
      if (prev.vol === vol && prev.cap === cap) { stats.duplicados_identicos++; continue; }
      throw new PipelineError(`${where}: ${id} ya tiene otro valor para ${rec.FECHA} (campo AGUA_ACTUAL)`);
    }
    seen.set(key, { id, fecha: rec.FECHA, vol, cap });
    const u = used.get(id);
    if (!u) used.set(id, { first: rec.FECHA, last: rec.FECHA, cap });
    else {
      if (rec.FECHA < u.first) u.first = rec.FECHA;
      if (rec.FECHA >= u.last) { u.last = rec.FECHA; u.cap = cap; }
    }
  }

  const obs = [...seen.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.fecha < b.fecha ? -1 : 1));
  const maxFecha = obs.reduce((mx, o) => (o.fecha > mx ? o.fecha : mx), "");

  const embalses: Embalse[] = [];
  for (const m of master) {
    const u = used.get(m.rec.id);
    if (!u) continue; // en la maestra pero sin datos en el raw
    const r = m.rec;
    const lat = num(r.lat), lon = num(r.lon);
    const codigo = CODIGO_POR_DEMARCACION[r.demarcacion];
    if (!codigo) throw new PipelineError(`${m.file}:${m.line}: demarcacion desconocida "${r.demarcacion}"`);
    const coords = lat !== null && lon !== null;
    embalses.push({
      id: r.id, slug: r.slug, nombre: nombreLegible(r.nombre_miteco),
      demarcacion: r.demarcacion, demarcacion_codigo: codigo,
      provincia: r.provincia || null,
      lat: coords ? lat : null,
      lon: coords ? lon : null,
      capacidad_hm3: u.cap,
      uso: r.uso || null,
      foto: null,
      activo: u.last === maxFecha,
      primera_fecha: u.first, ultima_fecha: u.last,
    });
  }
  embalses.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { embalses, obs, stats };
}
