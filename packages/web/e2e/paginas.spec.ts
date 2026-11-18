import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const resumen = JSON.parse(readFileSync(new URL('../public/data/resumen.json', import.meta.url), 'utf8'));
const pctNacional = (resumen.nacional.pct as number).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const paginas = [
  { nombre: 'portada', ruta: '/' },
  { nombre: 'mapa', ruta: '/mapa/' },
  { nombre: 'embalses', ruta: '/embalses/' },
  { nombre: 'ficha de embalse', ruta: '/embalse/yesa/' },
  { nombre: 'cuenca', ruta: '/cuenca/duero/' },
];

for (const p of paginas) {
  test.describe(p.nombre, () => {
    test('basicos: 200, h1, title, pie, sin errores de consola', async ({ page }) => {
      const errores: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
      page.on('pageerror', (e) => errores.push(e.message));
      const res = await page.goto(p.ruta);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1').first()).toBeVisible();
      expect((await page.title()).trim().length).toBeGreaterThan(0);
      const pie = page.locator('footer');
      await expect(pie).toContainText('MITECO');
      await expect(pie).toContainText('CC BY 4.0');
      expect(errores).toEqual([]);
    });

    test('sin desbordamiento horizontal en movil', async ({ page }, info) => {
      test.skip(info.project.name !== 'movil');
      await page.goto(p.ruta);
      await page.waitForLoadState('networkidle');
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      expect(sw).toBeLessThanOrEqual(iw);
    });

    test('accesibilidad (axe): sin violaciones serious/critical', async ({ page }) => {
      await page.goto(p.ruta);
      await page.waitForLoadState('networkidle');
      const { violations } = await new AxeBuilder({ page }).analyze();
      const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  });
}

test('portada: cifra nacional igual que resumen.json', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText(`${pctNacional} %`);
  await expect(page.locator('.gigante')).toContainText(pctNacional);
});

test('portada: no carga ningun script de modulo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('script[type="module"]')).toHaveCount(0);
});

test('mapa: aparece el canvas (WebGL) o queda el SVG', async ({ page }) => {
  await page.goto('/mapa/');
  await page.waitForLoadState('networkidle');
  const canvas = page.locator('canvas');
  const svg = page.locator('svg');
  await expect.poll(async () => (await canvas.count()) + (await svg.count())).toBeGreaterThan(0);
});
