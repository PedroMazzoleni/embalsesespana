// Builds data/geo/demarcaciones.geojson from the official MITECO layers
// (data/raw/geo/*.zip, byte-for-byte as served; the ZIPs are NOT versioned, only
// their sidecar .json with sha256 is. See .gitignore and docs/geo-demarcaciones.md).
//
// Usage:
//   node scripts/fase0/geo-demarcaciones.mjs              # rebuild from data/raw/geo
//   node scripts/fase0/geo-demarcaciones.mjs --download   # re-download raw layers first
//   node scripts/fase0/geo-demarcaciones.mjs --pct=0.8    # try another simplification level
//
// Scope: peninsular districts only (docs/adr/0001-cobertura-solo-peninsula.md).
//
// Sources (MITECO GeoServer, WFS 1.0.0, SHAPE-ZIP, EPSG:4258):
//   - agua:demarhidro_2027   River basin districts, 3rd planning cycle 2022-2027
//                            (land + coastal waters). Provides districts and attributes.
//   - agua:Demarcaciones_ET  Land-only districts (2016-2021). Used ONLY as a land mask
//                            to cut off the coastal-water part of the 2022-2027 polygons.
//
// Pipeline (mapshaper, in memory): import -> dissolve land mask -> keep peninsular
// districts -> clip by land -> clean -> simplify (keep-shapes) -> reproject to WGS84
// -> round to 1e-4 deg -> clean again (rounding creates intersections) -> export ->
// -check-geometry on the written file (must report 0 intersections).
//
// Downloads are untrusted: fetched to a temp file, checked for the ZIP magic bytes
// and only then moved into data/raw/geo/. A sidecar JSON records URL, size, sha256,
// download date, metadata record, license and layer version_id.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import mapshaper from 'mapshaper';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW_DIR = join(ROOT, 'data', 'raw', 'geo');
const OUT_DIR = join(ROOT, 'data', 'geo');
const OUT_FILE = join(OUT_DIR, 'demarcaciones.geojson');

const CSW =
  'https://catalogo.datosabiertos.miteco.gob.es/csw?SERVICE=CSW&VERSION=2.0.2&REQUEST=GetRecordById' +
  '&outputSchema=http://www.isotc211.org/2005/gmd&ElementSetName=full&ID=';
const WFS = 'https://gis.miteco.gob.es/geoserver/agua/wfs';
const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const SOURCES = {
  ddhh2027: {
    file: 'demarhidro_2027_wfs-shape.zip',
    layer: 'demarhidro_2027Polygon',
    url: `${WFS}?service=WFS&version=1.0.0&request=GetFeature&typeName=agua:demarhidro_2027&outputFormat=SHAPE-ZIP`,
    metadata: `${CSW}5a58c83b-345a-44c0-81fe-7459947620cb`,
    license: CC_BY,
    // Distinct values of the feature field "version_id" (checked against the data at build time).
    version_id: ['2023-02-07', '2023-03-01'],
  },
  landMask: {
    file: 'demarcaciones_et_wfs-shape.zip',
    layer: 'Demarcaciones_ETPolygon',
    url: `${WFS}?service=WFS&version=1.0.0&request=GetFeature&typeName=agua:Demarcaciones_ET&outputFormat=SHAPE-ZIP`,
    metadata: `${CSW}ea8ca652-1e55-4ac1-b4de-433d39c84304`,
    license: CC_BY,
    version_id: null, // this layer has no version_id field
  },
};

// Percentage of removable vertices to retain (see docs/geo-demarcaciones.md).
const DEFAULT_PCT = 0.5;

// Exact list of districts expected in the output (peninsular scope, ADR 0001).
const EXPECTED_CODES = [
  'ES010', 'ES014', 'ES017', 'ES018', 'ES020', 'ES030', 'ES040', 'ES050',
  'ES060', 'ES063', 'ES064', 'ES070', 'ES080', 'ES091', 'ES100',
];

// Intra-community districts (regional water authority), as listed in MITECO's
// service description DDHH2027.pdf. Every other district is managed by the State.
// (Only the peninsular ones are kept in the output.)
const INTRACOMUNITARIAS = ['ES014', 'ES060', 'ES063', 'ES064', 'ES100'];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function download({ url, file, metadata, license, version_id }) {
  await mkdir(RAW_DIR, { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': 'embalses-pipeline/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!(buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04)) {
    throw new Error(`Not a ZIP file: ${url} (content-type ${res.headers.get('content-type')})`);
  }
  const tmp = join(RAW_DIR, `${file}.part`);
  await writeFile(tmp, buf);
  await rename(tmp, join(RAW_DIR, file));
  const meta = {
    url,
    file,
    bytes: buf.length,
    sha256: sha256(buf),
    downloadedAt: new Date().toISOString(),
    metadata,
    license,
    version_id,
  };
  await writeFile(join(RAW_DIR, `${file}.json`), JSON.stringify(meta, null, 2) + '\n');
  console.log(`Downloaded ${file} (${(buf.length / 1e6).toFixed(1)} MB) sha256 ${meta.sha256.slice(0, 12)}...`);
}

// Loads a raw ZIP and verifies it against its sidecar JSON (size and sha256).
async function loadVerified({ file }) {
  const buf = await readFile(join(RAW_DIR, file)).catch(() => {
    throw new Error(`Missing ${file} in data/raw/geo. Run with --download to fetch it.`);
  });
  const meta = JSON.parse(await readFile(join(RAW_DIR, `${file}.json`), 'utf8'));
  if (buf.length !== meta.bytes || sha256(buf) !== meta.sha256) {
    throw new Error(
      `${file} does not match its sidecar (expected ${meta.bytes} B / ${meta.sha256}, ` +
        `got ${buf.length} B / ${sha256(buf)}). The WFS output changes on every download: ` +
        `use --download to refresh both ZIP and sidecar, then check version_id.`,
    );
  }
  return buf;
}

function buildCommands(pct) {
  const intra = JSON.stringify(INTRACOMUNITARIAS).replaceAll('"', "'");
  const each = [
    `codigo = cod_ddhh`,
    // Spanish display name: MITECO's own "label" field without line breaks.
    `nombre = label.replace(/\\s*\\n\\s*/g, ' ').trim()`,
    `tipo = ${intra}.indexOf(cod_ddhh) > -1 ? 'intracomunitaria' : 'intercomunitaria'`,
    `internacional = internacio == 'Yes'`,
    `ambito = /^ES12/.test(cod_ddhh) ? 'canarias' : cod_ddhh == 'ES110' ? 'baleares' : cod_ddhh == 'ES150' ? 'ceuta' : cod_ddhh == 'ES160' ? 'melilla' : 'peninsula'`,
  ].join('; ');
  const m = SOURCES.landMask;
  const d = SOURCES.ddhh2027;

  const stage1 = [
    `-i ${m.file} encoding=latin1`,
    `-target ${m.layer}`,
    `-dissolve + name=land`,
    `-i ${d.file} encoding=latin1`,
    `-target ${d.layer}`,
    `-each "${each}"`,
    `-filter "ambito == 'peninsula'"`,
    // Diagnostics (km2): official area without coastal waters, and area before clip.
    `-each "a_oficial = area_rbd_e; a_pre = this.area / 1e6; ver = version_id"`,
    `-clip land`,
    `-clean`,
    `-each "a_clip = this.area / 1e6"`,
    `-simplify ${pct}% keep-shapes`,
    `-clean`,
    `-proj wgs84`,
    `-each "a_final = this.area / 1e6"`,
    `-sort codigo`,
    `-o report.json format=json`,
    `-filter-fields codigo,nombre,tipo,internacional,ambito`,
    `-o stage1.geojson format=geojson precision=0.0001`,
  ];
  // Rounding to 1e-4 deg after the last -clean can create intersections, so the
  // rounded file is re-imported, cleaned and exported again (already on the grid).
  const stage2 = [`-i stage1.geojson`, `-clean`, `-o final.geojson format=geojson precision=0.0001`];
  return { stage1: stage1.join(' '), stage2: stage2.join(' ') };
}

function countVertices(gj) {
  let n = 0;
  const walk = (c) => (typeof c[0] === 'number' ? n++ : c.forEach(walk));
  gj.features.forEach((f) => walk(f.geometry.coordinates));
  return n;
}

// Runs the CLI (not the API) so that the message of -check-geometry can be read.
function checkGeometry(file) {
  const require = createRequire(import.meta.url);
  const bin = join(dirname(require.resolve('mapshaper/package.json')), 'bin', 'mapshaper');
  return execFileSync(process.execPath, [bin, file, '-check-geometry'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main() {
  const args = process.argv.slice(2);
  const pctArg = args.find((a) => a.startsWith('--pct='));
  const pct = pctArg ? Number(pctArg.slice(6)) : DEFAULT_PCT;
  if (!(pct > 0 && pct <= 100)) throw new Error(`Invalid --pct: ${pctArg}`);

  if (args.includes('--download')) {
    for (const src of Object.values(SOURCES)) await download(src);
  }
  const inputs = {
    [SOURCES.landMask.file]: await loadVerified(SOURCES.landMask),
    [SOURCES.ddhh2027.file]: await loadVerified(SOURCES.ddhh2027),
  };

  const cmds = buildCommands(pct);
  const out1 = await mapshaper.applyCommands(cmds.stage1, inputs);
  const out2 = await mapshaper.applyCommands(cmds.stage2, { 'stage1.geojson': out1['stage1.geojson'] });
  const text = out2['final.geojson'].toString();
  const report = JSON.parse(out1['report.json']);

  // Provenance: the layer version must be the one recorded in SOURCES.
  const versions = [...new Set(report.map((r) => r.ver))].sort();
  if (JSON.stringify(versions) !== JSON.stringify(SOURCES.ddhh2027.version_id)) {
    throw new Error(
      `version_id of ${SOURCES.ddhh2027.layer} is ${JSON.stringify(versions)}, expected ` +
        `${JSON.stringify(SOURCES.ddhh2027.version_id)}. The layer changed: review it and update SOURCES.`,
    );
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, text);
  const gj = JSON.parse(text);
  const { size } = await stat(OUT_FILE);
  const gz = gzipSync(Buffer.from(text), { level: 9 }).length;
  console.log(
    `\n${OUT_FILE}\n  ${gj.features.length} demarcaciones | simplify ${pct}% | ` +
      `${countVertices(gj)} vertices | ${(size / 1024).toFixed(1)} KB (${(gz / 1024).toFixed(1)} KB gzip) | ` +
      `sha256 ${sha256(Buffer.from(text))}`,
  );
  console.log(`  layer version_id ${versions.join(', ')}`);

  console.log('\n  codigo  oficial km2  pre-clip km2  clip km2  final km2  dev. final vs oficial');
  for (const r of report) {
    const dev = ((r.a_final / r.a_oficial - 1) * 100).toFixed(2);
    console.log(
      `  ${r.codigo}  ${r.a_oficial.toFixed(0).padStart(11)}  ${r.a_pre.toFixed(0).padStart(12)}  ` +
        `${r.a_clip.toFixed(0).padStart(8)}  ${r.a_final.toFixed(0).padStart(9)}  ${dev.padStart(8)} %`,
    );
  }
  const sum = (k) => report.reduce((s, r) => s + r[k], 0);
  console.log(
    `  TOTAL  ${sum('a_oficial').toFixed(0).padStart(11)}  ${sum('a_pre').toFixed(0).padStart(12)}  ` +
      `${sum('a_clip').toFixed(0).padStart(8)}  ${sum('a_final').toFixed(0).padStart(9)}`,
  );
  console.log(
    `  area removed by the land mask (coastal waters): ${(sum('a_pre') - sum('a_clip')).toFixed(0)} km2; ` +
      `change due to simplification+rounding: ${(sum('a_final') - sum('a_clip')).toFixed(1)} km2`,
  );

  await checkCoverage(text, gj.features);

  const msg = checkGeometry(OUT_FILE);
  const found = /Found (\d+) intersection/.exec(msg);
  const nInter = found ? Number(found[1]) : 0;
  if (!found && msg.trim()) console.log(`  -check-geometry: ${msg.trim()}`);
  console.log(`  -check-geometry: ${nInter} intersecciones`);
  if (nInter > 0) throw new Error(`-check-geometry found ${nInter} intersections in ${OUT_FILE}`);
}

// Content, gaps and overlaps check on the final file:
//  - exact list of district codes, peninsular scope only;
//  - overlaps: the sum of feature areas must equal the area of their union;
//  - gaps: the union must have no interior holes.
async function checkCoverage(text, features) {
  const out = await mapshaper.applyCommands(
    '-i d.geojson -each "a=this.area" -o areas.json format=json ' +
      '-dissolve + name=u -each "a=this.area" -o u.geojson format=geojson',
    { 'd.geojson': text },
  );
  const sum = JSON.parse(out['areas.json']).reduce((s, r) => s + r.a, 0);
  const union = JSON.parse(out['u.geojson']).features[0];
  const g = union.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const holes = polys.reduce((s, p) => s + p.length - 1, 0);
  const overlapKm2 = (sum - union.properties.a) / 1e6;
  console.log(
    `  area total ${(sum / 1e6).toFixed(0)} km2 | union parts ${polys.length} | ` +
      `interior holes (gaps) ${holes} | overlap ${overlapKm2.toFixed(4)} km2`,
  );
  const codes = features.map((f) => f.properties.codigo).sort();
  const problems = [];
  const missing = EXPECTED_CODES.filter((c) => !codes.includes(c));
  const extra = codes.filter((c) => !EXPECTED_CODES.includes(c));
  if (missing.length || extra.length) problems.push(`codes missing [${missing}] / unexpected [${extra}]`);
  if (features.some((f) => f.properties.ambito !== 'peninsula')) problems.push('non-peninsular feature in output');
  if (holes > 0) problems.push(`${holes} gap(s) between districts`);
  if (Math.abs(overlapKm2) > 0.01) problems.push(`overlap of ${overlapKm2.toFixed(4)} km2`);
  if (problems.length) throw new Error(`Coverage check failed: ${problems.join('; ')}`);
  console.log(`  OK: ${codes.length} codigos esperados, sin huecos ni solapes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
