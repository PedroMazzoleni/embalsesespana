// Genera design/direcciones/datos-muestra.js y demarcaciones.svg a partir de datos reales.
// Uso: node design/scripts/generar-muestra.mjs
// CALCULO PROVISIONAL DE MAQUETA: no es el pipeline. La media de 10 anios es la media simple de los
// 10 anios previos, tomando para cada uno la fecha del boletin mas cercana al mismo dia del anio
// (reserva total / capacidad total de esa fecha, sin ajustar por cambios en el conjunto de embalses).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'design', 'direcciones');

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
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...r] = rows;
  return r.filter(x => x.length === h.length).map(x => Object.fromEntries(h.map((k, i) => [k, x[i]])));
}
const num = s => { const n = parseFloat(String(s).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const load = y => parseCsv(readFileSync(join(root, 'data/raw/boletin-hidrologico', `embalses-${y}.csv`), 'utf8'))
  .map(r => ({ ambito: r.AMBITO_NOMBRE, nombre: r.EMBALSE_NOMBRE, fecha: r.FECHA, total: num(r.AGUA_TOTAL), actual: num(r.AGUA_ACTUAL) }))
  .filter(r => r.total > 0 && Number.isFinite(r.actual)); // capacidad 0 = ausente

const byYear = {};
for (let y = 2015; y <= 2026; y++) byYear[y] = load(y);
const rows26 = byYear[2026];
const fechas = [...new Set(rows26.map(r => r.fecha))].sort();
const ultima = fechas.at(-1), previa = fechas.at(-2);

const agg = rs => {
  const t = rs.reduce((a, r) => a + r.total, 0), v = rs.reduce((a, r) => a + r.actual, 0);
  return { hm3: v, cap: t, pct: 100 * v / t };
};
const en = (rows, f) => rows.filter(r => r.fecha === f);
const lastRows = en(rows26, ultima), prevRows = en(rows26, previa);
const nac = agg(lastRows), nacPrev = agg(prevRows);

const [, mm, dd] = ultima.split('-').map(Number);
const medias = [], fechasMedia = [], anios = [];
const mediaPorAmbito = {}, mediaPorEmb = {};
const key = r => r.ambito + '|' + r.nombre;
for (let y = 2016; y <= 2025; y++) {
  const target = Date.UTC(y, mm - 1, dd);
  const fs = [...new Set(byYear[y].map(r => r.fecha))];
  const f = fs.sort((a, b) => Math.abs(Date.parse(a) - target) - Math.abs(Date.parse(b) - target))[0];
  fechasMedia.push(f);
  const rs = en(byYear[y], f);
  medias.push(agg(rs).pct); anios.push({ fecha: f, pct: +agg(rs).pct.toFixed(1) });
  const amb = {};
  rs.forEach(r => (amb[r.ambito] ??= []).push(r));
  for (const [a, l] of Object.entries(amb)) (mediaPorAmbito[a] ??= []).push(agg(l).pct);
  rs.forEach(r => (mediaPorEmb[key(r)] ??= []).push(100 * r.actual / r.total));
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const media10 = mean(medias);

const alias = {
  'Cuenca Mediterránea Andaluza': 'Cuencas Mediterráneas Andaluzas',
  'Galicia Costa': 'Galicia-Costa',
  'Miño - Sil': 'Miño-Sil',
  'Guadalete-Barbate': 'Guadalete y Barbate',
};
const geo = JSON.parse(readFileSync(join(root, 'data/geo/demarcaciones.geojson'), 'utf8'));
const ambitos = {};
lastRows.forEach(r => (ambitos[r.ambito] ??= []).push(r));
const porGeo = {};
for (const [a, l] of Object.entries(ambitos)) {
  porGeo[alias[a] ?? a] = { ambito: a, ...agg(l), media10: mean(mediaPorAmbito[a]), n: l.length };
}

// Proyeccion equirectangular corregida por cos(latitud media), con simplificacion por distancia
const lats = [], lons = [];
const polys = f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
geo.features.forEach(f => polys(f).forEach(p => p.forEach(r => r.forEach(([x, y]) => { lons.push(x); lats.push(y); }))));
const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
const k = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
const W = 1000, scale = W / ((maxLon - minLon) * k), H = Math.round((maxLat - minLat) * scale);
const P = ([x, y]) => [(x - minLon) * k * scale, (maxLat - y) * scale];
function pathOf(f) {
  let d = '';
  for (const poly of polys(f)) for (const ring of poly) {
    let last = null, s = '';
    ring.map(P).forEach((p, i, arr) => {
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 2.2 || i === arr.length - 1) {
        s += (last ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
        last = p;
      }
    });
    d += s + 'Z';
  }
  return d;
}
function centro(f) {
  let best = null, ba = 0;
  for (const poly of polys(f)) {
    const r = poly[0].map(P); let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < r.length - 1; i++) { const c = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; a += c; cx += (r[i][0] + r[i + 1][0]) * c; cy += (r[i][1] + r[i + 1][1]) * c; }
    a /= 2; if (Math.abs(a) > ba) { ba = Math.abs(a); best = [cx / (6 * a), cy / (6 * a)]; }
  }
  return { cx: Math.round(best[0]), cy: Math.round(best[1]), area: Math.round(ba) };
}
const demarcaciones = geo.features.map(f => {
  const g = porGeo[f.properties.nombre];
  return {
    codigo: f.properties.codigo, nombre: f.properties.nombre, d: pathOf(f), ...centro(f),
    pct: g ? +g.pct.toFixed(1) : null, hm3: g ? Math.round(g.hm3) : null, capacidad: g ? Math.round(g.cap) : null,
    media10: g ? +g.media10.toFixed(1) : null, embalses: g?.n ?? 0,
  };
});

const master = parseCsv(readFileSync(join(root, 'data/master/embalses-maestra.csv'), 'utf8'));
const mIdx = {};
master.forEach(m => { mIdx[m.ambito_miteco + '|' + m.nombre_miteco] = m; });
const prevIdx = {};
prevRows.forEach(r => { prevIdx[key(r)] = r; });
const limpio = n => { const m = n.match(/^(.*) \((La|El|Los|Las)\)$/); if (m) return m[2] + ' ' + m[1]; return n.includes(', ') ? n.split(', ').reverse().join(' ') : n; };
const cand = lastRows.map(r => {
  const m = mIdx[key(r)], p = prevIdx[key(r)], mx = mediaPorEmb[key(r)];
  if (!(m && p && mx && mx.length >= 8)) return null;
  const pct = 100 * r.actual / r.total;
  return {
    slug: m.slug, nombre: limpio(m.nombre_miteco), provincia: m.provincia, demarcacion: m.demarcacion, rio: m.rio, uso: m.uso,
    hm3: r.actual, capacidad: r.total, pct: +pct.toFixed(1),
    var_pts: +(pct - 100 * p.actual / p.total).toFixed(1), media10: +mean(mx).toFixed(1),
  };
}).filter(Boolean);
const grandes = cand.filter(c => c.capacidad >= 100);
const pick = (arr, fn) => arr.reduce((a, b) => (fn(b) > fn(a) ? b : a));
const grande = pick(cand, c => c.capacidad);
const lleno = pick(grandes.filter(c => c !== grande), c => c.pct);
const bajo = pick(grandes.filter(c => ![grande, lleno].includes(c)), c => -c.pct);
const sube = pick(grandes.filter(c => ![grande, lleno, bajo].includes(c)), c => c.var_pts);
const cercano = pick(grandes.filter(c => ![grande, lleno, bajo, sube].includes(c) && c.capacidad > 300), c => -Math.abs(c.pct - c.media10));
const ejemplos = [
  { rol: 'el más grande', ...grande }, { rol: 'casi lleno', ...lleno }, { rol: 'muy bajo', ...bajo },
  { rol: 'mayor subida semanal', ...sube }, { rol: 'cerca de su media', ...cercano },
];

const r1 = x => +x.toFixed(1);
const MUESTRA = {
  _nota: 'Datos reales del boletin del MITECO (provisionales). Media 10 anios: calculo provisional de maqueta, no es el pipeline.',
  fuente: 'MITECO, Boletín Hidrológico (datos provisionales)',
  fecha: ultima, fecha_previa: previa, fechas_media: fechasMedia, anios,
  nacional: {
    pct: r1(nac.pct), hm3: Math.round(nac.hm3), capacidad: Math.round(nac.cap),
    var_pts: r1(nac.pct - nacPrev.pct), pct_previa: r1(nacPrev.pct), media10: r1(media10),
    dif_media_pts: r1(nac.pct - media10), n_embalses: lastRows.length,
  },
  demarcaciones, mapa: { ancho: W, alto: H },
  ejemplos,
};
writeFileSync(join(out, 'datos-muestra.js'), '// Generado por design/scripts/generar-muestra.mjs. No editar a mano.\nwindow.MUESTRA = ' + JSON.stringify(MUESTRA) + ';\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Demarcaciones hidrográficas peninsulares">\n` +
  demarcaciones.map(d => `<path id="${d.codigo}" d="${d.d}" fill="#ccc" stroke="#333" stroke-width="1"><title>${d.nombre}</title></path>`).join('\n') + '\n</svg>\n';
writeFileSync(join(out, 'demarcaciones.svg'), svg);
console.log(JSON.stringify({ ...MUESTRA, demarcaciones: demarcaciones.map(d => [d.nombre, d.pct, d.media10, d.embalses]) }, null, 1));
