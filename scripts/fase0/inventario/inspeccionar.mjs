#!/usr/bin/env node
// Paso 1: inspecciona los ZIP oficiales del Inventario de Presas y Embalses.
// Lista capas, CRS (.prj), codificación, nº de registros y, por campo,
// nº de valores no vacíos, nº de valores distintos y tres ejemplos.
// Sirve para revisar/ajustar mapeo-campos.json antes de construir.
//
// Uso: node scripts/fase0/inventario/inspeccionar.mjs [--raw data/raw/inventario]
import { listInventorySources as listInventoryZips, shapefilesFromSource as shapefilesInZip, readLayer, projectorFromPrj, isEmpty, parseArgs, RAW_DIR_DEFAULT } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { raw: RAW_DIR_DEFAULT });
const zips = listInventoryZips(args.raw);
if (zips.length === 0) {
  console.error(
    `No hay ZIP del inventario en ${args.raw}.\n` +
      'Descárgalos a mano (la descarga tiene captcha) desde\n' +
      'https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/agua/inventario-presas-embalses.html\n' +
      '(egis_presa_geoetrs89.zip y egis_embalse_geoetrs89.zip) y guárdalos ahí sin renombrar.',
  );
  process.exit(1);
}

for (const zip of zips) {
  for (const raw of shapefilesInZip(zip)) {
    const layer = await readLayer(raw);
    const proj = projectorFromPrj(layer.prj);
    const geomTypes = {};
    for (const f of layer.features) geomTypes[f.geometry?.type ?? 'null'] = (geomTypes[f.geometry?.type ?? 'null'] || 0) + 1;
    console.log(`\n=== ${layer.zip} :: ${layer.name}`);
    console.log(`registros: ${layer.features.length}`);
    console.log(`geometrías: ${JSON.stringify(geomTypes)}`);
    console.log(`CRS: ${proj.describe}`);
    console.log(`codificación DBF: ${layer.encoding}${layer.cpg ? ` (.cpg = ${layer.cpg})` : ' (sin .cpg)'}`);
    const fields = Object.keys(layer.features[0]?.properties ?? {});
    console.log('campo | no vacíos | distintos | ejemplos');
    for (const k of fields) {
      const vals = layer.features.map((f) => f.properties[k]).filter((v) => !isEmpty(v));
      const distinct = new Set(vals.map(String));
      const ex = [...distinct].slice(0, 3).map((v) => JSON.stringify(v.length > 60 ? v.slice(0, 60) + '…' : v));
      console.log(`${k} | ${vals.length} | ${distinct.size} | ${ex.join(', ')}`);
    }
  }
}
