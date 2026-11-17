// Comprueba la escala del agua (packages/web/src/styles/agua.css).
// Uso: node design/escala-agua/verificar.mjs   (sin dependencias; sale con código 1 si algo falla)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------- color ----------
export const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export const rgb2hex = c => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
const lin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
export const toLin = c => c.map(lin);
export const fromLin = c => c.map(v => gam(Math.min(1, Math.max(0, v))));
export const lum = c => { const [r, g, b] = toLin(c); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

export function lab(c) {
  const [r, g, b] = toLin(c);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function oklch(c) {
  const [r, g, b] = toLin(c);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
export function de2000(l1, l2) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (b, a) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) * deg + 360) % 360);
  const hp1 = hp(b1, ap1), hp2 = hp(b2, ap2);
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) { dh = hp2 - hp1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * rad / 2);
  const Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2;
  let hm = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) hm = Math.abs(hp1 - hp2) <= 180 ? hm / 2 : (hp1 + hp2 < 360 ? (hm + 360) / 2 : (hm - 360) / 2);
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + 0.015 * (Lm - 50) ** 2 / Math.sqrt(20 + (Lm - 50) ** 2);
  const SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T;
  const RT = -2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

// ---------- simulaciones (Machado, Oliveira y Fernandes 2009, severidad 1,0, en RGB lineal) ----------
export const SIM = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
export const simular = (c, M) => fromLin(M.map(f => f[0] * lin(c[0]) + f[1] * lin(c[1]) + f[2] * lin(c[2])));
export const gris = c => { const y = gam(lum(c)); return [y, y, y]; };
export const VISTAS = { normal: c => c, ...Object.fromEntries(Object.entries(SIM).map(([k, M]) => [k, c => simular(c, M)])), grises: gris };

// ---------- lectura del CSS ----------
export function leerCss(ruta) {
  const css = readFileSync(ruta, 'utf8');
  const bloque = (ini) => { const i = css.indexOf(ini); const j = css.indexOf('}', i); return css.slice(i, j); };
  const claro = bloque(':root {'), oscuro = bloque('@media (prefers-color-scheme: dark)');
  const vars = (t, p) => [...t.matchAll(new RegExp("--" + p + "-(\\d+):\\s*(#[0-9a-fA-F]{6})", "g"))].map(m => m[2].toLowerCase());
  return {
    claro: { fondo: '#fbfaf5', borde: '#181818', col: vars(claro, 'agua'), txt: vars(claro, 'agua-texto') },
    oscuro: { fondo: '#0b1e30', borde: '#f2f0e8', col: vars(oscuro, 'agua'), txt: vars(oscuro, 'agua-texto') },
  };
}

// ---------- chequeos ----------
export const UMBRAL_DE = 10, UMBRAL_DE_GRIS = 8;
export function evaluar(modo, { fondo, col, txt, borde }, oscuro) {
  const fallos = [], out = [];
  const log = (ok, s) => { out.push((ok ? 'PASA   ' : 'NO PASA') + ' ' + s); if (!ok) fallos.push(s); };
  if (col.length !== 6 || txt.length !== 6) throw new Error("Se esperaban 6 clases en agua.css");
  const rgb = col.map(hex2rgb), bg = hex2rgb(fondo);
  const L = rgb.map(c => lab(c)[0]), OK = rgb.map(c => oklch(c)[0]);
  const sentido = oscuro ? 1 : -1; // claro: más lleno = más oscuro; oscuro: más lleno = más claro
  log(L.every((v, i) => i === 0 || (v - L[i - 1]) * sentido > 0), `[${modo}] luminosidad monótona CIELAB L*: ${L.map(v => v.toFixed(1)).join(' → ')}`);
  log(OK.every((v, i) => i === 0 || (v - OK[i - 1]) * sentido > 0), `[${modo}] luminosidad monótona OKLCH L: ${OK.map(v => v.toFixed(3)).join(' → ')}`);
  for (const [nombre, f] of Object.entries(VISTAS)) {
    const labs = rgb.map(c => lab(f(c)));
    const d = labs.slice(1).map((l, i) => de2000(labs[i], l));
    const min = Math.min(...d), u = nombre === 'grises' ? UMBRAL_DE_GRIS : UMBRAL_DE;
    log(min >= u, `[${modo}] ΔE2000 contiguas, ${nombre}: ${d.map(v => v.toFixed(1)).join(' · ')} (mín ${min.toFixed(1)} ≥ ${u})`);
  }
  rgb.forEach((c, i) => {
    const r = ratio(c, bg);
    if (i === 0) { // excepción documentada: la clase más clara/pobre lleva borde
      const rb = ratio(hex2rgb(borde), bg);
      log(rb >= 3, `[${modo}] clase 0 ${col[0]} frente a fondo ${fondo}: ${r.toFixed(2)}:1 (EXCEPCIÓN: lleva borde ${borde}, ${rb.toFixed(2)}:1 ≥ 3)`);
    } else log(r >= 3, `[${modo}] clase ${i} ${col[i]} frente a fondo ${fondo}: ${r.toFixed(2)}:1 (≥ 3)`);
    const t = hex2rgb(txt[i]);
    log(ratio(c, t) >= 4.5, `[${modo}] clase ${i} texto ${txt[i]} sobre ${col[i]}: ${ratio(c, t).toFixed(2)}:1 (≥ 4,5)`);
  });
  return { out, fallos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const css = fileURLToPath(new URL('../../packages/web/src/styles/agua.css', import.meta.url));
  const e = leerCss(css);
  let n = 0;
  for (const [modo, esc] of Object.entries(e)) {
    const { out, fallos } = evaluar(modo, esc, modo === 'oscuro');
    console.log(out.join('\n') + '\n'); n += fallos.length;
  }
  console.log(n ? `${n} comprobaciones NO pasan` : 'Todas las comprobaciones pasan');
  process.exit(n ? 1 : 0);
}
