#!/usr/bin/env node
// Fase 0, T4: tabla maestra de embalses.
// Empareja cada embalse del histórico del MITECO (solo nombre + ámbito) con un registro del
// Inventario de Presas (data/master/inventario.csv) y escribe:
//   data/master/embalses-maestra.csv      una fila por embalse del histórico (emparejado o no)
//   data/master/sin-emparejar.csv         los que quedan sin pareja, con motivo y candidatos
//   data/master/maestra-stats.json        cifras de control (las usa docs/tabla-maestra.md)
//   data/master/kepler/*.csv              ficheros pequeños para la revisión visual (T6)
// Entrada manual: data/master/emparejamientos-manuales.csv (nombre_miteco,codigo_inventario,motivo).
//   codigo_inventario vacío = "no existe en el inventario" (queda sin emparejar con ese motivo).
//
// Uso: node scripts/fase0/maestra/construir-maestra.mjs
// Es determinista y no escribe en data/raw. Falla si falta una entrada o si la manual apunta a un código inexistente.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const P = {
  raw: join(ROOT, 'data/raw/boletin-hidrologico'),
  inv: join(ROOT, 'data/master/inventario.csv'),
  geo: join(ROOT, 'data/geo/demarcaciones.geojson'),
  manual: join(ROOT, 'data/master/emparejamientos-manuales.csv'),
  out: join(ROOT, 'data/master'),
  kepler: join(ROOT, 'data/master/kepler'),
};
const fail = (m) => { console.error(`ERROR: ${m}`); process.exit(1); };

// ---------- CSV ----------
function parseCsv(text) {
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function readTable(path) {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  const head = rows.shift();
  return rows.filter((r) => r.length > 1 || r[0] !== '').map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
const num = (s) => { if (s === '' || s == null) return null; const n = Number(String(s).replace(',', '.')); return Number.isFinite(n) ? n : null; };

// ---------- 1. Histórico del MITECO ----------
const embMap = new Map();
let nFilas = 0;
const series = new Map(); // key -> [{fecha, total, actual}]
for (const f of readdirSync(P.raw).filter((x) => /^embalses-\d{4}\.csv$/.test(x)).sort()) {
  const rows = readTable(join(P.raw, f));
  for (const r of rows) {
    nFilas++;
    const k = `${r.AMBITO_NOMBRE}|${r.EMBALSE_NOMBRE}`;
    let e = embMap.get(k);
    if (!e) { e = { ambito: r.AMBITO_NOMBRE, nombre: r.EMBALSE_NOMBRE, primera: r.FECHA, ultima: r.FECHA, cap: null, electrico: null }; embMap.set(k, e); series.set(k, []); }
    const total = num(r.AGUA_TOTAL), actual = num(r.AGUA_ACTUAL);
    if (r.FECHA >= e.ultima) { e.ultima = r.FECHA; if (total != null) e.cap = total; e.electrico = r.ELECTRICO_FLAG; e.actual = actual; }
    if (r.FECHA < e.primera) e.primera = r.FECHA;
    series.get(k).push({ fecha: r.FECHA, total, actual });
  }
}
const miteco = [...embMap.values()].sort((a, b) => a.ambito.localeCompare(b.ambito, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
const ULTIMA_FECHA = miteco.reduce((m, e) => (e.ultima > m ? e.ultima : m), '');
for (const e of miteco) e.enUltima = e.ultima === ULTIMA_FECHA;

// ---------- 2. Ámbito -> demarcación ----------
const AMBITO_A_DH = {
  'Cantábrico Occidental': 'Cantábrico Occidental',
  'Cantábrico Oriental': 'Cantábrico Oriental',
  'Cuencas Internas del País Vasco': 'Cantábrico Oriental', // intracomunitaria vasca: geometría dentro de la DH Cantábrico Oriental
  'Cuenca Mediterránea Andaluza': 'Cuencas Mediterráneas Andaluzas',
  'Cuencas Internas de Cataluña': 'Cuencas Internas de Cataluña',
  Duero: 'Duero', Ebro: 'Ebro', 'Galicia Costa': 'Galicia-Costa', 'Guadalete-Barbate': 'Guadalete y Barbate',
  Guadalquivir: 'Guadalquivir', Guadiana: 'Guadiana', Júcar: 'Júcar', 'Miño - Sil': 'Miño-Sil', Segura: 'Segura',
  Tajo: 'Tajo', 'Tinto, Odiel y Piedras': 'Tinto, Odiel y Piedras',
};
const stripAcc = (s) => s.toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ');
const dhKey = (s) => stripAcc(s).replace(/[^a-zñ]+/g, '');
for (const e of miteco) {
  e.dh = AMBITO_A_DH[e.ambito];
  if (!e.dh) fail(`ámbito del MITECO sin demarcación asignada: "${e.ambito}"`);
}

// ---------- 3. Inventario ----------
if (!existsSync(P.inv)) fail('falta data/master/inventario.csv (ejecuta scripts/fase0/inventario/construir.mjs)');
const invAll = readTable(P.inv);
const inv = [];
let descartadasInsulares = 0;
for (const r of invAll) {
  if (r.territorio !== 'peninsula') { descartadasInsulares++; continue; } // ADR 0001
  r.codigo = r.codigo_presa || (r.codigo_embalse ? `E${r.codigo_embalse}` : '');
  r.cap = num(r.capacidad_hm3);
  r.capPol = num(r.capacidad_poligono_hm3);
  r.latN = num(r.lat); r.lonN = num(r.lon);
  r.dhKey = dhKey(r.demarcacion.split('\n')[0].split('|')[0]);
  inv.push(r);
}
const invByCodigo = new Map(inv.map((r) => [r.codigo, r]));

// ---------- 4. Normalización de nombres ----------
const ARTS = '(?:el|la|los|las|os|as|o|a|els|les)';
const STOP = new Set(['el', 'la', 'los', 'las', 'os', 'as', 'o', 'a', 'els', 'les', 'de', 'del', 'd', 'l', 'en', 'dels']);
const ROMAN = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8' };
function tokensOf(txt) {
  let s = txt.toLowerCase()
    .replace(/n[ªº°]\.?\s*s[ªº°]\.?/g, 'nuestra senora')
    .replace(/[ªº°]/g, '');
  s = stripAcc(s).replace(/['’`]/g, ' ').replace(/[^a-zñ0-9]+/g, ' ').trim();
  let t = s.split(' ').filter(Boolean).map((w) => ({ sta: 'santa', sto: 'santo', pto: 'puerto', s: 'san', sn: 'san' }[w] ?? w));
  if (t.length > 1 && ROMAN[t[t.length - 1]]) t[t.length - 1] = ROMAN[t[t.length - 1]];
  return t;
}
/** Variantes de un nombre: [{ strict, loose, loosest, tokens, kind }] */
function variantes(raw) {
  const out = [];
  const push = (txt, kind) => {
    const t = tokensOf(txt);
    if (!t.length) return;
    const lo = t.filter((w) => !STOP.has(w));
    if (!lo.length) return;
    out.push({ strict: t.join(' '), loose: lo.join(' '), loosest: lo.join(' ').replace(/ñ/g, 'n'), tokens: lo.map((w) => w.replace(/ñ/g, 'n')), kind });
  };
  for (let part of String(raw).split(' | ')) {
    part = part.replace(/\(\s*/g, '(').replace(/\s*\)/g, ')').replace(/-\(/g, ' (').replace(/,\s*/g, ', ').replace(/\s+/g, ' ').trim();
    if (!part) continue;
    const alts = [];
    let main = part.replace(/\(([^)]*)\)/g, (_, c) => { alts.push(c.trim()); return ' '; }).replace(/\s+/g, ' ').trim();
    let art = '';
    const aart = alts.findIndex((a) => new RegExp(`^${ARTS}$`, 'i').test(a));
    if (aart >= 0) { art = alts[aart]; alts.splice(aart, 1); }
    const m = main.match(new RegExp(`^(.+?),\\s*(${ARTS})$`, 'i'));
    if (m) { main = m[1]; art = m[2]; }
    const comma = main.match(/^([^,]+),\s*(.+)$/);
    if (comma) { main = comma[1]; }
    push(`${art} ${main}`.trim(), 'full');
    for (const a of alts) if (!/^(balsa|lago)\b/i.test(a)) push(a, 'alt');
    const pieces = main.split(/\s+-\s+|\s+ó\s+|\s*\/\s*|-/).map((x) => x.trim()).filter(Boolean);
    if (pieces.length > 1) { for (const p of pieces) push(p, 'parte'); push(pieces.join(' '), 'full'); }
  }
  return out;
}
const lev = (a, b) => {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
};
function nameLevel(va, vb) {
  let best = 9;
  for (const a of va) for (const b of vb) {
    let l = 9;
    const parte = a.kind === 'parte' || b.kind === 'parte';
    if (!parte && a.strict === b.strict) l = 1;
    else if (!parte && a.loose === b.loose) l = 2;
    else if (!parte && a.loosest === b.loosest) l = 3;
    else if (parte && a.loosest === b.loosest && a.loosest.length >= 4) l = 4;
    else {
      const sa = new Set(a.tokens), sb = new Set(b.tokens);
      const [small, big] = sa.size <= sb.size ? [sa, sb] : [sb, sa];
      const common = [...small].filter((w) => big.has(w));
      if (common.length === small.size && common.some((w) => w.length >= 4) && small.size * 2 >= big.size) l = 4;
      else if (a.loosest.length >= 6 && lev(a.loosest, b.loosest) <= (a.loosest.length >= 10 ? 2 : 1)) l = 5;
    }
    if (l < best) best = l;
  }
  return best;
}
for (const e of miteco) e.vars = variantes(e.nombre);
// Dos vistas por registro: la presa (nombre y capacidad de la presa) y el polígono de embalse (nombre y capacidad del polígono).
// La presa manda; el polígono solo se usa si la presa no casa (en el inventario el nombre de la presa a veces es el del municipio).
for (const r of inv) {
  r.varsPresa = variantes(r.nombre_presa);
  r.varsPoligono = variantes([r.nombre_embalse, r.nombre_poligono].filter(Boolean).join(' | '));
  r.esSoloPoligono = !r.codigo_presa;
  if (r.esSoloPoligono) r.varsPresa = variantes(r.nombre_embalse || r.nombre_poligono);
}

// ---------- 5. Emparejamiento automático ----------
const capEstado = (a, b) => {
  if (a == null || b == null || b <= 0) return 'desconocida';
  const d = Math.abs(a - b);
  if (d <= Math.max(1.5, 0.2 * Math.max(a, b))) return 'ok';
  if (d <= Math.max(3, 0.5 * Math.max(a, b))) return 'cercana';
  return 'distinta';
};
const FASE_MALA = new Set(['Proyecto', 'Proyecto abandonado', 'Construcción', 'Inundada', 'Aterrada']);
function candidatos(e) {
  const out = [];
  for (const r of inv) {
    const mismaDH = r.dhKey === dhKey(e.dh);
    const vistas = [
      { vista: 'presa', nl: nameLevel(e.vars, r.varsPresa), capE: capEstado(e.cap, r.cap ?? (r.esSoloPoligono ? r.capPol : null)), extra: r.esSoloPoligono ? -6 : 4 },
      { vista: 'poligono', nl: nameLevel(e.vars, r.varsPoligono), capE: capEstado(e.cap, r.capPol ?? r.cap), extra: -2 },
    ].filter((v) => v.nl <= 5);
    if (!vistas.length) continue;
    const sc = (v) => (6 - v.nl) * 10 + { ok: 20, cercana: 8, desconocida: 0, distinta: -15 }[v.capE] + v.extra;
    const v = vistas.sort((a, b) => sc(b) - sc(a))[0];
    const score = sc(v) + (mismaDH ? 20 : -12) - (FASE_MALA.has(r.fase) ? 25 : 0);
    out.push({ r, nl: v.nl, capE: v.capE, vista: v.vista, mismaDH, score, dcap: Math.abs((e.cap ?? 0) - (v.vista === 'presa' ? r.cap ?? r.capPol ?? 1e9 : r.capPol ?? r.cap ?? 1e9)) });
  }
  return out.sort((a, b) => b.score - a.score || a.dcap - b.dcap || (b.r.cap ?? 0) - (a.r.cap ?? 0));
}

// ---------- 6. Emparejamientos manuales ----------
const manuales = new Map();
if (existsSync(P.manual)) {
  for (const m of readTable(P.manual)) {
    if (!m.nombre_miteco) continue;
    if (!miteco.some((e) => e.nombre === m.nombre_miteco)) fail(`emparejamientos-manuales.csv: "${m.nombre_miteco}" no existe en el histórico del MITECO`);
    if (m.codigo_inventario && !invByCodigo.has(m.codigo_inventario)) fail(`emparejamientos-manuales.csv: código "${m.codigo_inventario}" (${m.nombre_miteco}) no existe en el inventario peninsular`);
    if (!m.motivo) fail(`emparejamientos-manuales.csv: "${m.nombre_miteco}" sin motivo`);
    manuales.set(m.nombre_miteco, m);
  }
}

// Evita que dos embalses del MITECO se lleven el mismo registro: gana el de mejor puntuación.
const decisiones = [];
for (const e of miteco) {
  const man = manuales.get(e.nombre);
  if (man) {
    if (man.codigo_inventario) decisiones.push({ e, r: invByCodigo.get(man.codigo_inventario), metodo: 'manual', confianza: man.confianza || 'alta', motivo: man.motivo, cands: [] });
    else decisiones.push({ e, r: null, metodo: '', confianza: '', motivo: man.motivo, cands: [], forzadoSin: true });
    continue;
  }
  const c = candidatos(e);
  const top = c[0];
  const mismoSitio = (a, b) => Math.hypot((a.latN - b.latN) * 111, (a.lonN - b.lonN) * 84) < 3;
  const rival = c.find((x) => x.r !== top?.r && !mismoSitio(x.r, top.r));
  if (top) top.hermanas = c.filter((x) => x.r !== top.r && mismoSitio(x.r, top.r) && x.nl <= top.nl).map((x) => x.r.codigo);
  let aceptado = top && top.score >= 40 && (top.mismaDH || top.nl <= 3) && top.capE !== 'distinta';
  if (top && !aceptado && top.nl <= 3 && top.mismaDH && top.capE === 'distinta') aceptado = false; // nombre igual pero capacidad incompatible: a revisión
  decisiones.push({ e, r: aceptado ? top.r : null, top, rival, cands: c.slice(0, 4), motivo: '' });
}
// Un registro del inventario no puede ser de dos embalses del MITECO: el de mejor puntuación se lo queda.
const dueño = new Map();
for (const d of decisiones) {
  if (!d.r || d.metodo === 'manual') continue;
  const prev = dueño.get(d.r.codigo);
  if (!prev || d.top.score > prev.top.score) dueño.set(d.r.codigo, d);
}
for (const d of decisiones) {
  if (d.r && d.metodo !== 'manual' && dueño.get(d.r.codigo) !== d) { d.conflicto = d.r.codigo; d.r = null; }
}
const NIVEL = { 1: 'nombre_exacto', 2: 'nombre_sin_articulos', 3: 'nombre_sin_tildes', 4: 'nombre_parcial', 5: 'nombre_aproximado' };
for (const d of decisiones) {
  if (!d.r || d.metodo === 'manual') continue;
  const { top, rival } = d;
  const empate = rival && rival.score >= top.score - 5;
  d.metodo = `${top.vista === 'poligono' ? 'poligono:' : ''}${NIVEL[top.nl]}${top.capE === 'ok' ? '+capacidad' : ''}${top.mismaDH ? '+demarcacion' : ''}`;
  if (top.nl <= 3 && top.mismaDH && top.capE === 'ok' && !empate) d.confianza = 'alta';
  else if (empate || top.capE === 'cercana' || top.capE === 'desconocida' || !top.mismaDH || top.nl >= 4 && top.capE !== 'ok') d.confianza = 'baja';
  else d.confianza = 'media';
  if (top.nl >= 4 && top.capE === 'ok' && top.mismaDH && !empate) d.confianza = 'media';
  if (top.nl <= 3 && top.mismaDH && top.capE === 'cercana' && !empate) d.confianza = 'media';
  if (empate) d.motivo = `empate con ${rival.r.codigo} ${rival.r.nombre_presa}`;
  else if (top.hermanas?.length) d.motivo = `otras presas del mismo emplazamiento: ${top.hermanas.join(', ')}`;
}

// ---------- 7. Validación geográfica ----------
const gj = JSON.parse(readFileSync(P.geo, 'utf8'));
const dhGeo = new Map(gj.features.map((f) => [dhKey(f.properties.nombre), f]));
const inRing = (x, y, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
const polysOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const inGeom = (x, y, g) => polysOf(g).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
function distKm(x, y, g) {
  const kx = 111.32 * Math.cos((y * Math.PI) / 180), ky = 110.57;
  let best = Infinity;
  for (const p of polysOf(g)) for (const r of p) for (let i = 0; i < r.length - 1; i++) {
    const ax = (r[i][0] - x) * kx, ay = (r[i][1] - y) * ky, bx = (r[i + 1][0] - x) * kx, by = (r[i + 1][1] - y) * ky;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) best = d;
  }
  return best;
}
function validarGeo(lat, lon, dh) {
  if (lat == null || lon == null) return { estado: 'sin_coordenadas', nota: '' };
  if (!(lat >= 35.95 && lat <= 43.85 && lon >= -9.4 && lon <= 3.4)) return { estado: 'fuera_de_peninsula', nota: `(${lat}, ${lon})` };
  const g = dhGeo.get(dhKey(dh));
  if (!g) return { estado: 'sin_geometria_demarcacion', nota: dh };
  if (inGeom(lon, lat, g.geometry)) return { estado: 'ok', nota: '' };
  const d = distKm(lon, lat, g.geometry);
  const otra = gj.features.find((f) => f !== g && inGeom(lon, lat, f.geometry));
  if (d <= 3) return { estado: 'borde', nota: `a ${d.toFixed(1)} km del límite de ${dh} (geometría simplificada)` };
  return { estado: otra ? 'otra_demarcacion' : 'fuera_de_demarcaciones', nota: `${d.toFixed(1)} km fuera de ${dh}${otra ? `; cae en ${otra.properties.nombre}` : ''}` };
}

// ---------- 8. Slugs estables ----------
const slugify = (s) => stripAcc(s).replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function slugBase(nombre) {
  const v = variantes(nombre).find((x) => x.kind === 'full');
  return slugify(v ? v.strict.replace(/ñ/g, 'ñ') : nombre);
}
const usados = new Map();
for (const d of decisiones) {
  let s = slugBase(d.e.nombre);
  if (usados.has(s)) s = `${s}-${slugify(d.e.ambito)}`;
  if (usados.has(s)) fail(`slug duplicado: ${s}`);
  usados.set(s, d.e.nombre);
  d.slug = s;
}

// ---------- 9. Filas de salida ----------
const dhName = (e) => e.dh;
const filas = decisiones.map((d) => {
  const e = d.e, r = d.r;
  const geo = r ? validarGeo(r.latN, r.lonN, dhName(e)) : { estado: '', nota: '' };
  const usoMiteco = e.electrico === '1' ? 'hidroeléctrico' : 'consuntivo';
  return {
    id: d.slug, slug: d.slug,
    nombre_miteco: e.nombre, ambito_miteco: e.ambito,
    nombre_inventario: r ? (r.nombre_embalse && r.nombre_embalse !== r.nombre_presa ? `${r.nombre_presa} / ${r.nombre_embalse}` : r.nombre_presa || r.nombre_embalse) : '',
    codigo_inventario: r ? r.codigo : '',
    demarcacion: e.dh, demarcacion_inventario: r ? r.demarcacion : '',
    provincia: r ? r.provincia : '', ccaa: r ? r.ccaa : '', rio: r ? r.rio : '',
    lat: r ? r.lat : '', lon: r ? r.lon : '',
    lat_embalse: r ? r.lat_embalse : '', lon_embalse: r ? r.lon_embalse : '',
    capacidad_miteco_hm3: e.cap ?? '', capacidad_inventario_hm3: r ? r.capacidad_hm3 || r.capacidad_poligono_hm3 : '',
    uso: r ? r.uso : '', uso_miteco: usoMiteco,
    metodo_emparejamiento: d.metodo || '', confianza: d.confianza || '',
    validacion_geo: geo.estado, nota_geo: geo.nota,
    primera_fecha: e.primera, ultima_fecha: e.ultima, en_ultima_fecha: e.enUltima ? 'si' : 'no',
    ficha_url: r ? r.ficha_url : '', notas: d.motivo || '',
    _d: d, _geo: geo,
  };
});
// capacidad discrepante (solo emparejados)
for (const f of filas) {
  if (!f.codigo_inventario) { f.estado_capacidad = ''; continue; }
  const a = num(f.capacidad_miteco_hm3), b = num(f.capacidad_inventario_hm3);
  f.estado_capacidad = capEstado(a, b);
}

const COLS = ['id', 'slug', 'nombre_miteco', 'ambito_miteco', 'nombre_inventario', 'codigo_inventario', 'demarcacion', 'demarcacion_inventario',
  'provincia', 'ccaa', 'rio', 'lat', 'lon', 'lat_embalse', 'lon_embalse', 'capacidad_miteco_hm3', 'capacidad_inventario_hm3', 'estado_capacidad',
  'uso', 'uso_miteco', 'metodo_emparejamiento', 'confianza', 'validacion_geo', 'nota_geo', 'primera_fecha', 'ultima_fecha', 'en_ultima_fecha', 'ficha_url', 'notas'];
mkdirSync(P.out, { recursive: true });
writeFileSync(join(P.out, 'embalses-maestra.csv'), toCsv(COLS, filas), 'utf8');

// sin emparejar
const sin = filas.filter((f) => !f.codigo_inventario).map((f) => {
  const d = f._d;
  let motivo = d.motivo;
  if (!motivo) {
    if (d.conflicto) motivo = `su mejor candidato (${d.conflicto}) se asigna a otro embalse del MITECO con mejor puntuación`;
    else if (d.top) motivo = `mejor candidato descartado: ${d.top.r.codigo} ${d.top.r.nombre_presa} (nombre nivel ${d.top.nl}, capacidad ${d.top.capE}, ${d.top.mismaDH ? 'misma' : 'distinta'} demarcación)`;
    else motivo = 'ningún registro del inventario peninsular con nombre parecido';
  }
  return {
    nombre_miteco: f.nombre_miteco, ambito_miteco: f.ambito_miteco, capacidad_miteco_hm3: f.capacidad_miteco_hm3,
    en_ultima_fecha: f.en_ultima_fecha, primera_fecha: f.primera_fecha, ultima_fecha: f.ultima_fecha, motivo,
    candidatos: d.cands.map((c) => `${c.r.codigo} ${c.r.nombre_presa}${c.r.nombre_poligono && c.r.nombre_poligono !== c.r.nombre_presa ? ' / ' + c.r.nombre_poligono : ''} [${c.r.demarcacion}; cap ${c.r.capacidad_hm3 || c.r.capacidad_poligono_hm3 || '?'}; n${c.nl} c:${c.capE}]`).join(' ; '),
  };
});
writeFileSync(join(P.out, 'sin-emparejar.csv'), toCsv(['nombre_miteco', 'ambito_miteco', 'capacidad_miteco_hm3', 'en_ultima_fecha', 'primera_fecha', 'ultima_fecha', 'motivo', 'candidatos'], sin), 'utf8');

// ---------- 10. Estadísticas ----------
const cnt = (arr, k) => { const t = {}; for (const x of arr) t[x[k] === '' ? '(vacío)' : x[k]] = (t[x[k] === '' ? '(vacío)' : x[k]] || 0) + 1; return t; };
const ult = filas.filter((f) => f.en_ultima_fecha === 'si');
const emp = (a) => a.filter((f) => f.codigo_inventario);
const conCoord = (a) => a.filter((f) => f.codigo_inventario && f.lat !== '');
const pct = (n, d) => Number(((100 * n) / d).toFixed(2));
const geoOk = (a) => a.filter((f) => ['ok', 'borde'].includes(f.validacion_geo));
const codUsados = new Map();
for (const f of emp(filas)) codUsados.set(f.codigo_inventario, (codUsados.get(f.codigo_inventario) || 0) + 1);
const stats = {
  generado: new Date().toISOString(),
  fuente_historico: { filas: nFilas, embalses_distintos: miteco.length, ultima_fecha: ULTIMA_FECHA, embalses_en_ultima_fecha: ult.length },
  inventario: { registros_leidos: invAll.length, peninsulares_usados: inv.length, descartados_no_peninsulares: descartadasInsulares },
  emparejados: {
    sobre_ultima_fecha: { total: ult.length, emparejados: emp(ult).length, con_coordenadas: conCoord(ult).length, pct_emparejados: pct(emp(ult).length, ult.length), pct_con_coordenadas: pct(conCoord(ult).length, ult.length) },
    sobre_historico: { total: filas.length, emparejados: emp(filas).length, con_coordenadas: conCoord(filas).length, pct_emparejados: pct(emp(filas).length, filas.length), pct_con_coordenadas: pct(conCoord(filas).length, filas.length) },
  },
  por_metodo: cnt(emp(filas).map((f) => ({ m: f.metodo_emparejamiento.startsWith('manual') ? 'manual' : 'automático' })), 'm'),
  por_metodo_detalle: cnt(emp(filas), 'metodo_emparejamiento'),
  por_confianza_ultima_fecha: cnt(emp(ult), 'confianza'),
  por_confianza_historico: cnt(emp(filas), 'confianza'),
  manuales_aplicados: [...manuales.values()].filter((m) => m.codigo_inventario).length,
  manuales_sin_pareja_documentados: [...manuales.values()].filter((m) => !m.codigo_inventario).length,
  registros_inventario_usados_por_mas_de_un_embalse: [...codUsados.entries()].filter(([, n]) => n > 1).map(([c]) => c),
  validacion_geo: { ultima_fecha: cnt(emp(ult), 'validacion_geo'), historico: cnt(emp(filas), 'validacion_geo'), ok_o_borde_pct_ultima: pct(geoOk(emp(ult)).length, emp(ult).length) },
  capacidad: { ultima_fecha: cnt(emp(ult), 'estado_capacidad'), historico: cnt(emp(filas), 'estado_capacidad') },
  por_demarcacion_ultima_fecha: Object.fromEntries([...new Set(miteco.map((e) => e.dh))].sort().map((dh) => {
    const a = ult.filter((f) => f.demarcacion === dh);
    return [dh, { embalses: a.length, emparejados: emp(a).length }];
  })),
  sin_emparejar: { ultima_fecha: sin.filter((s) => s.en_ultima_fecha === 'si').map((s) => s.nombre_miteco), historico: sin.map((s) => s.nombre_miteco) },
  capacidad_total_miteco_ultima_hm3: Number(ult.reduce((s, f) => s + (num(f.capacidad_miteco_hm3) || 0), 0).toFixed(1)),
  capacidad_emparejada_ultima_hm3: Number(emp(ult).reduce((s, f) => s + (num(f.capacidad_miteco_hm3) || 0), 0).toFixed(1)),
};
writeFileSync(join(P.out, 'maestra-stats.json'), JSON.stringify(stats, null, 2) + '\n', 'utf8');

// ---------- 11. Ficheros para kepler.gl (revisión visual, T6) ----------
mkdirSync(P.kepler, { recursive: true });
const keyOf = (e) => `${e.ambito}|${e.nombre}`;
const pctDe = (s) => (s.total ? Number(((100 * s.actual) / s.total).toFixed(1)) : '');
const puntos = conCoord(ult).map((f) => {
  const e = embMap.get(`${f.ambito_miteco}|${f.nombre_miteco}`);
  return { lat: f.lat, lon: f.lon, nombre: f.nombre_miteco, capacidad_hm3: f.capacidad_miteco_hm3, pct_ultimo_dato: pctDe({ total: e.cap, actual: e.actual }), fecha: e.ultima, demarcacion: f.demarcacion };
});
writeFileSync(join(P.kepler, 'embalses-puntos.csv'), toCsv(['lat', 'lon', 'nombre', 'capacidad_hm3', 'pct_ultimo_dato', 'fecha', 'demarcacion'], puntos), 'utf8');
const grandes = conCoord(ult).sort((a, b) => num(b.capacidad_miteco_hm3) - num(a.capacidad_miteco_hm3)).slice(0, 20);
const d3 = new Date(`${ULTIMA_FECHA}T00:00:00Z`); d3.setUTCFullYear(d3.getUTCFullYear() - 3);
const desde = d3.toISOString().slice(0, 10);
const muestra = [];
for (const f of grandes) {
  for (const s of series.get(`${f.ambito_miteco}|${f.nombre_miteco}`).sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (s.fecha < desde) continue;
    muestra.push({ id: f.id, nombre: f.nombre_miteco, lat: f.lat, lon: f.lon, fecha: s.fecha, volumen_hm3: s.actual ?? '', capacidad_hm3: s.total ?? '', pct: s.total && s.actual != null ? Number(((100 * s.actual) / s.total).toFixed(1)) : '' });
  }
}
writeFileSync(join(P.kepler, 'serie-muestra.csv'), toCsv(['id', 'nombre', 'lat', 'lon', 'fecha', 'volumen_hm3', 'capacidad_hm3', 'pct'], muestra), 'utf8');

// ---------- 12. Resumen ----------
const E = stats.emparejados;
console.log(`Histórico: ${miteco.length} embalses; última fecha ${ULTIMA_FECHA} con ${ult.length}.`);
console.log(`Emparejados sobre última fecha: ${E.sobre_ultima_fecha.emparejados}/${E.sobre_ultima_fecha.total} (${E.sobre_ultima_fecha.pct_emparejados} %); con coordenadas ${E.sobre_ultima_fecha.pct_con_coordenadas} %`);
console.log(`Emparejados sobre histórico: ${E.sobre_historico.emparejados}/${E.sobre_historico.total} (${E.sobre_historico.pct_emparejados} %)`);
console.log('Confianza (última fecha):', JSON.stringify(stats.por_confianza_ultima_fecha), '| manuales:', stats.manuales_aplicados);
console.log('Geo (última fecha):', JSON.stringify(stats.validacion_geo.ultima_fecha), '| capacidad:', JSON.stringify(stats.capacidad.ultima_fecha));
console.log(`Sin emparejar: ${sin.length} (en última fecha: ${stats.sin_emparejar.ultima_fecha.length})`);
if (stats.registros_inventario_usados_por_mas_de_un_embalse.length) console.log('AVISO registros usados varias veces:', stats.registros_inventario_usados_por_mas_de_un_embalse.join(', '));
