// Prints Lighthouse CI results as GitHub Actions annotations, so they can be read
// from the public API without downloading artifacts.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = '.lighthouseci';
if (!existsSync(dir)) { console.log('::warning::No .lighthouseci directory'); process.exit(0); }

for (const f of readdirSync(dir).filter((n) => /^lhr-.*\.json$/.test(n))) {
  const lhr = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const c = lhr.categories;
  const s = (k) => Math.round((c[k]?.score ?? 0) * 100);
  const url = new URL(lhr.finalUrl ?? lhr.requestedUrl).pathname;
  console.log(`::notice::Lighthouse ${url} perf=${s('performance')} a11y=${s('accessibility')} LCP=${Math.round(lhr.audits['largest-contentful-paint']?.numericValue ?? 0)}ms TBT=${Math.round(lhr.audits['total-blocking-time']?.numericValue ?? 0)}ms`);
}

const ar = join(dir, 'assertion-results.json');
if (existsSync(ar)) {
  for (const a of JSON.parse(readFileSync(ar, 'utf8')).filter((x) => !x.passed)) {
    const url = (() => { try { return new URL(a.url).pathname; } catch { return a.url; } })();
    console.log(`::error::LHCI ${url} ${a.auditId ?? a.name}: ${a.operator ?? ''} expected ${a.expected}, got ${a.actual}`);
  }
}
