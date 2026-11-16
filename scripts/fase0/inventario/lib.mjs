// Shared helpers for the Inventario de Presas y Embalses (fase 0).
// Reads the official MITECO shapefile zips IN MEMORY (no extraction to disk):
// downloaded files are untrusted data and data/raw must stay untouched.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { unzipSync } from 'fflate';
import * as shapefile from 'shapefile';
import proj4 from 'proj4';

export const ROOT = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
export const RAW_DIR_DEFAULT = join(ROOT, 'data/raw/inventario');

export function parseArgs(argv, defaults) {
  const out = { ...defaults };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    out[key] = argv[i + 1];
    i++;
  }
  return out;
}

/** Normalise a DBF field name for matching: upper case, no accents, no separators. */
export function normField(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Normalise a free-text name for variant detection. */
export function normName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(presa|embalse|pantano|de|del|la|el|las|los)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isEmpty(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

/** List the inventory zips (excludes the ArcGIS .lyr zips). */
export function listInventoryZips(rawDir) {
  if (!existsSync(rawDir)) return [];
  return readdirSync(rawDir)
    .filter((f) => f.toLowerCase().endsWith('.zip') && !f.toLowerCase().startsWith('lyr-'))
    .map((f) => join(rawDir, f));
}

/** List inventory sources: ZIPs (not the .lyr ones) and/or folders (unzipped shapefiles) that contain a .shp. */
export function listInventorySources(rawDir) {
  if (!existsSync(rawDir)) return [];
  const out = [];
  for (const f of readdirSync(rawDir).sort()) {
    const p = join(rawDir, f);
    if (f.toLowerCase().startsWith('lyr-')) continue;
    if (statSync(p).isDirectory()) {
      if (readdirSync(p).some((x) => x.toLowerCase().endsWith('.shp'))) out.push(p);
    } else if (f.toLowerCase().endsWith('.zip')) out.push(p);
  }
  return out;
}

/** Open the shapefiles of a source (ZIP in memory, or a folder). */
export function shapefilesFromSource(src) {
  return statSync(src).isDirectory() ? shapefilesInDir(src) : shapefilesInZip(src);
}

export function shapefilesInDir(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!/.shp$/i.test(f)) continue;
    const stem = f.slice(0, -4);
    const rd = (ext) => {
      const p = join(dir, stem + '.' + ext);
      return existsSync(p) ? readFileSync(p) : null;
    };
    const shp = rd('shp'), dbf = rd('dbf');
    if (!dbf) throw new Error(dir + ': falta el .dbf de ' + f);
    const prj = rd('prj'), cpg = rd('cpg');
    out.push({ zip: basename(dir), name: stem, prj: prj ? prj.toString('latin1').trim() : null, cpg: cpg ? cpg.toString('latin1').trim() : null, shp: new Uint8Array(shp), dbf: new Uint8Array(dbf) });
  }
  if (!out.length) throw new Error(dir + ': no contiene ningún .shp');
  return out;
}

function isZip(buf) {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

/**
 * Open every shapefile inside a zip. Returns
 * [{ zip, name, prj, cpg, encoding, shp, dbf }] with Uint8Array buffers.
 */
export function shapefilesInZip(zipPath) {
  const buf = readFileSync(zipPath);
  if (!isZip(buf)) {
    const head = buf.subarray(0, 200).toString('utf8');
    throw new Error(
      `${basename(zipPath)} no es un ZIP (¿página HTML del captcha en vez del fichero?). ` +
        `Primeros bytes: ${JSON.stringify(head.slice(0, 80))}`,
    );
  }
  const files = unzipSync(new Uint8Array(buf));
  const byStem = new Map();
  for (const [path, data] of Object.entries(files)) {
    const m = path.match(/^(.*)\.(shp|dbf|prj|cpg|shx)$/i);
    if (!m) continue;
    const stem = m[1];
    const ext = m[2].toLowerCase();
    if (!byStem.has(stem)) byStem.set(stem, {});
    byStem.get(stem)[ext] = data;
  }
  const out = [];
  for (const [stem, parts] of byStem) {
    if (!parts.shp || !parts.dbf) continue;
    const prj = parts.prj ? Buffer.from(parts.prj).toString('latin1').trim() : null;
    const cpg = parts.cpg ? Buffer.from(parts.cpg).toString('latin1').trim() : null;
    out.push({ zip: basename(zipPath), name: basename(stem), prj, cpg, shp: parts.shp, dbf: parts.dbf });
  }
  if (out.length === 0) throw new Error(`${basename(zipPath)}: no contiene ningún .shp con su .dbf`);
  return out;
}

function encodingFromCpg(cpg) {
  if (!cpg) return null;
  const c = cpg.toUpperCase();
  if (c.includes('UTF')) return 'utf-8';
  if (c.includes('1252') || c.includes('8859')) return 'windows-1252';
  return null;
}

async function readAll(layer, encoding) {
  const src = await shapefile.open(layer.shp.slice().buffer, layer.dbf.slice().buffer, { encoding });
  const features = [];
  for (;;) {
    const r = await src.read();
    if (r.done) break;
    features.push(r.value);
  }
  return features;
}

function countReplacementChars(features) {
  let n = 0;
  for (const f of features)
    for (const v of Object.values(f.properties))
      if (typeof v === 'string' && v.includes('�')) n++;
  return n;
}

/** Read a layer, choosing the DBF encoding (.cpg, else UTF-8 unless it shows U+FFFD, else windows-1252). */
export async function readLayer(layer) {
  let encoding = encodingFromCpg(layer.cpg);
  let features;
  if (encoding) {
    features = await readAll(layer, encoding);
  } else {
    features = await readAll(layer, 'utf-8');
    encoding = 'utf-8';
    if (countReplacementChars(features) > 0) {
      features = await readAll(layer, 'windows-1252');
      encoding = 'windows-1252 (deducida)';
    }
  }
  return { ...layer, encoding, features };
}

/**
 * Build a projector from the .prj text to WGS84 lon/lat.
 * ETRS89 geographic (EPSG:4258) is treated as WGS84: the difference is < 1 m,
 * irrelevant at 6 decimals for a web map.
 */
export function projectorFromPrj(prj) {
  if (!prj) return { kind: 'desconocido', describe: 'sin .prj', project: null };
  const p = prj.toUpperCase();
  if (p.startsWith('GEOGCS')) {
    const datum = (p.match(/DATUM\["([^"]+)"/) || [])[1] || '?';
    return { kind: 'geografico', describe: `geográficas ${datum} (sin reproyectar)`, project: (x, y) => [x, y] };
  }
  const zone = (p.match(/UTM[_ ]ZONE[_ ](\d{2})N/) || p.match(/UTM_(\d{2})N/) || [])[1];
  if (zone) {
    const datum = (p.match(/DATUM\["([^"]+)"/) || [])[1] || '?';
    const def = `+proj=utm +zone=${Number(zone)} +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`;
    return {
      kind: 'utm',
      describe: `UTM huso ${Number(zone)}N, ${datum} → WGS84`,
      project: (x, y) => proj4(def, 'WGS84', [x, y]),
    };
  }
  return { kind: 'desconocido', describe: `CRS no reconocido: ${prj.slice(0, 80)}`, project: null };
}

/** Representative point of a GeoJSON geometry, in source CRS. */
export function representativePoint(geom) {
  if (!geom) return null;
  if (geom.type === 'Point') return geom.coordinates;
  if (geom.type === 'MultiPoint') return geom.coordinates[0] ?? null;
  // Polygons: area-weighted centroid of all outer rings (good enough for a label point).
  const rings =
    geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.type === 'MultiPolygon' ? geom.coordinates.map((p) => p[0]) : [];
  // Work relative to the first vertex: with UTM coordinates (~4e6) the cross products lose precision otherwise.
  const [ox, oy] = rings[0]?.[0] ?? [0, 0];
  let A = 0, cx = 0, cy = 0;
  for (const r of rings) {
    for (let i = 0; i < r.length - 1; i++) {
      const x0 = r[i][0] - ox, y0 = r[i][1] - oy;
      const x1 = r[i + 1][0] - ox, y1 = r[i + 1][1] - oy;
      const f = x0 * y1 - x1 * y0;
      A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
  }
  if (A === 0) return rings[0]?.[0] ?? null;
  return [ox + cx / (3 * A), oy + cy / (3 * A)];
}

/** Classify a WGS84 point by territory (rough bounding boxes, documented in docs/inventario-presas.md). */
export function territorio(lat, lon) {
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return 'sin_coordenadas';
  if (lat >= 27.4 && lat <= 29.5 && lon >= -18.4 && lon <= -13.2) return 'canarias';
  if (lat >= 38.6 && lat <= 40.15 && lon >= 1.1 && lon <= 4.4) return 'baleares';
  if (lat >= 35.85 && lat <= 35.93 && lon >= -5.40 && lon <= -5.25) return 'ceuta';
  if (lat >= 35.26 && lat <= 35.33 && lon >= -2.97 && lon <= -2.92) return 'melilla';
  // Bounding box only: points in Portugal, Andorra or southern France would fall here too.
  // build.mjs cross-checks with the provincia field when it exists.
  if (lat >= 35.95 && lat <= 43.85 && lon >= -9.4 && lon <= 3.4) return 'peninsula';
  return 'fuera_de_espana';
}

// ---------- Geometry helpers (planar, in the source CRS) ----------

/** Polygons of a (Multi)Polygon as arrays of rings [outer, ...holes]. */
export function polygonsOf(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point in (Multi)Polygon, holes respected. */
export function pointInPolygons(x, y, polys) {
  for (const rings of polys) {
    if (inRing(x, y, rings[0]) && !rings.slice(1).some((h) => inRing(x, y, h))) return true;
  }
  return false;
}

/** Minimum distance from a point to any ring segment (same units as the coordinates). */
export function distToPolygons(x, y, polys) {
  let best = Infinity;
  for (const rings of polys)
    for (const r of rings)
      for (let i = 0; i < r.length - 1; i++) {
        const [x0, y0] = r[i];
        const [x1, y1] = r[i + 1];
        const dx = x1 - x0, dy = y1 - y0;
        const l2 = dx * dx + dy * dy;
        let t = l2 ? ((x - x0) * dx + (y - y0) * dy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy));
        if (d < best) best = d;
      }
  return best;
}

/**
 * Point guaranteed to lie inside the polygon: the area centroid if it is inside,
 * otherwise the middle of the longest horizontal chord through the centroid's latitude.
 * Returns { point, method } with method 'centroide' | 'punto_interior'.
 */
export function interiorPoint(geom) {
  const polys = polygonsOf(geom);
  const c = representativePoint(geom);
  if (!c || !polys.length) return { point: c, method: 'centroide' };
  if (pointInPolygons(c[0], c[1], polys)) return { point: c, method: 'centroide' };
  const y = c[1];
  const xs = [];
  for (const rings of polys)
    for (const r of rings)
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i];
        const [xj, yj] = r[j];
        if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
      }
  xs.sort((a, b) => a - b);
  let best = null;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const mid = (xs[i] + xs[i + 1]) / 2;
    if (!best || xs[i + 1] - xs[i] > best.w) best = { w: xs[i + 1] - xs[i], mid };
  }
  if (best && pointInPolygons(best.mid, y, polys)) return { point: [best.mid, y], method: 'punto_interior' };
  return { point: c, method: 'centroide_fuera' };
}
