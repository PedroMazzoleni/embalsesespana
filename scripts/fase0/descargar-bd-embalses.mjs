// Downloads the MITECO historical reservoir database (BD-Embalses.zip) and its
// data-model PDF into data/raw/, byte-for-byte as published.
//
// Usage: node scripts/fase0/descargar-bd-embalses.mjs
//
// The download is treated as untrusted: it is written to a temp file, its magic
// bytes are checked (ZIP / PDF) and only then moved into data/raw/. A sidecar
// JSON with HTTP metadata (Last-Modified, size, sha256, download date) is written
// next to each file so the provenance is reproducible.

import { createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW_DIR = join(ROOT, 'data', 'raw', 'boletin-hidrologico');

const PAGE_URL =
  'https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico.html';

const FILES = [
  {
    url: 'https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/Historico-de-embalses/BD-Embalses.zip',
    name: 'BD-Embalses.zip',
    magic: [0x50, 0x4b, 0x03, 0x04], // "PK\3\4"
  },
  {
    url: 'https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/modelo-de-datos-bd-embalses-1988-2022_tcm30-538818.pdf',
    name: 'modelo-de-datos-bd-embalses-1988-2022.pdf',
    magic: [0x25, 0x50, 0x44, 0x46], // "%PDF"
  },
];

const MAX_BYTES = 200 * 1024 * 1024; // sanity cap for an untrusted download
const UA = 'embalses-data-pipeline/0.1 (+open data reuse)';

async function checkPageStillLinks() {
  const res = await fetch(PAGE_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Page ${PAGE_URL} returned HTTP ${res.status}`);
  const html = await res.text();
  const links = [...html.matchAll(/href="([^"]+\.(?:zip|xlsx?|mdb|accdb|csv))"/gi)].map((m) => m[1]);
  return [...new Set(links)];
}

// The MITECO CDN sometimes drops the connection mid-transfer: retry a few times
// and verify the received size against Content-Length.
async function fetchFull(url, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const expected = Number(res.headers.get('content-length'));
      if (expected && buf.length !== expected) throw new Error(`truncated: ${buf.length}/${expected} bytes`);
      return { res, buf };
    } catch (err) {
      lastErr = err;
      console.warn(`Attempt ${i}/${attempts} failed for ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw lastErr;
}

async function download({ url, name, magic }) {
  const { res, buf } = await fetchFull(url);
  if (buf.length > MAX_BYTES) throw new Error(`${name}: ${buf.length} bytes exceeds cap`);
  if (!magic.every((b, i) => buf[i] === b)) {
    throw new Error(`${name}: unexpected file signature ${buf.subarray(0, 4).toString('hex')}`);
  }
  await mkdir(RAW_DIR, { recursive: true });
  const target = join(RAW_DIR, name);
  const tmp = `${target}.part`;
  await writeFile(tmp, buf);
  await rename(tmp, target);
  const meta = {
    url,
    downloaded_at: new Date().toISOString(),
    http_last_modified: res.headers.get('last-modified'),
    content_type: res.headers.get('content-type'),
    bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
  };
  await writeFile(`${target}.meta.json`, JSON.stringify(meta, null, 2) + '\n');
  return { target, ...meta };
}

const links = await checkPageStillLinks();
console.log('Data-file links found on the Boletín page:', links);
if (!links.some((l) => l.endsWith('/Historico-de-embalses/BD-Embalses.zip'))) {
  console.warn('WARNING: the page no longer links BD-Embalses.zip at the expected path. Review FILES.');
}
for (const f of FILES) {
  const r = await download(f);
  console.log(`OK ${r.target}  ${r.bytes} bytes  Last-Modified: ${r.http_last_modified}  sha256 ${r.sha256}`);
}
