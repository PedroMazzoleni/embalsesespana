import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const resumen = JSON.parse(readFileSync(new URL('../public/data/resumen.json', import.meta.url), 'utf8'));
const pctNacional = (resumen.nacional.pct as number).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const paginas = [
  { nombre: 'portada', ruta: '/' },
  { nombre: 'mapa', ruta: '/mapa/' },
  { nombre: 'embalses', ruta: '/embalses/' },
  { nombre: 'maquina del tiempo', ruta: '/tiempo/' },
  { nombre: 'ficha de embalse', ruta: '/embalse/yesa/' },
  { nombre: 'cuenca', ruta: '/cuenca/duero/' },
  { nombre: 'explicadores', ruta: '/explicadores/' },
  { nombre: 'explicador es-grave', ruta: '/explicadores/es-grave/' },
  { nombre: 'explicador sequias', ruta: '/explicadores/sequias/' },
  { nombre: 'explicador dana-2024', ruta: '/explicadores/dana-2024/' },
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

test('tiempo: el deslizador cambia el porcentaje mostrado', async ({ page }) => {
  const res = await page.goto('/tiempo/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  const slider = page.locator('#t-slider');
  await expect(slider).toBeVisible();
  const pct = page.locator('#t-pct');
  const antes = await pct.textContent();
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(pct).not.toHaveText(antes!);
  await expect(slider).toHaveAttribute('aria-valuetext', /1988/);
  await expect(page.locator('#t-tabla tbody tr').first().locator('.pc')).toContainText('%');
});

test('explicador es-grave: la cifra nacional coincide con resumen.json y todos los pasos existen', async ({ page }) => {
  await page.goto('/explicadores/es-grave/');
  await expect(page.locator('h1')).toContainText('¿es grave la situación de los embalses?', { ignoreCase: true });
  await expect(page.locator(".paso-t").first()).toContainText(`${pctNacional} %`);
  await expect(page.locator('.paso')).toHaveCount(9);
  await expect(page.locator('svg[role="img"]').first()).toHaveAttribute('aria-label', new RegExp(pctNacional));
  const texto = (await page.locator(".paso-t, .ex-intro").allTextContents()).join(" ");
  expect(texto).not.toMatch(/undefined|NaN|object Object/);
});

test.describe('explicador es-grave sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('todos los visuales se ven en orden', async ({ page }) => {
    await page.goto('/explicadores/es-grave/');
    const visuales = page.locator('.visual');
    expect(await visuales.count()).toBe(9);
    for (let i = 0; i < 9; i++) await expect(visuales.nth(i)).toBeVisible();
  });
});

test('explicador es-grave: scrollama activa el visual del paso', async ({ page }) => {
  await page.goto('/explicadores/es-grave/');
  await expect(page.locator('.ex-js .visual.activo')).toHaveCount(1);
  await expect(page.locator('.visual.activo')).toHaveAttribute('data-paso', '1');
  await page.locator('#p5').scrollIntoViewIfNeeded();
  await page.locator('#p5').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(page.locator('.visual.activo')).toHaveAttribute('data-paso', '5');
});

test('explicador sequias: sin undefined/NaN y el enlace a /tiempo abre en esa semana', async ({ page }) => {
  await page.goto('/explicadores/sequias/');
  await expect(page.locator('.paso')).toHaveCount(8);
  const texto = (await page.locator('.paso-t, .ex-intro, .ex-fuentes').allTextContents()).join(' ');
  expect(texto).not.toMatch(/undefined|NaN|object Object/);
  const enlace = page.locator('a[href^="/tiempo?semana="]').first();
  const href = (await enlace.getAttribute('href')) as string;
  const iso = href.split('=')[1];
  const largo = new Date(iso + 'T00:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  await page.goto(href);
  await expect(page.locator('#t-et')).toHaveText(largo);
});

test('explicador dana-2024: 8 pasos sin undefined/NaN, enlaces a fichas y a /tiempo', async ({ page }) => {
  await page.goto('/explicadores/dana-2024/');
  await expect(page.locator('.paso')).toHaveCount(8);
  const texto = (await page.locator('.paso-t, .ex-intro, .ex-fuentes').allTextContents()).join(' ');
  expect(texto).not.toMatch(/undefined|NaN|object Object/);
  await expect(page.locator('a[href="/embalse/forata"]').first()).toBeAttached();
  await expect(page.locator('a[href="/cuenca/jucar"]').first()).toBeAttached();
  await expect(page.locator('#metodo')).toBeAttached();
  const href = (await page.locator('a[href^="/tiempo?semana="]').first().getAttribute('href')) as string;
  const iso = href.split('=')[1];
  const largo = new Date(iso + 'T00:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  await page.goto(href);
  await expect(page.locator('#t-et')).toHaveText(largo);
});
