// Visuales del explicador de la DANA de 2024: SVG en build (ver visuales.ts). Cero JS en el cliente.
// Tono sobrio: un solo azul para los datos, tinta para la fecha del episodio, sin rojos ni ocres de alarma.
import * as Plot from '@observablehq/plot';
import { f, fechaDiaMes } from '../datos';
import { zonas, alto } from '../mapa';
import { plot, HALO, W } from './visuales';
import { Q, ventana, hastaHoy, embalsesDana, COD_JUCAR, FECHA_EPISODIO } from './dana-2024';

const dEp = new Date(FECHA_EPISODIO + 'T00:00:00Z');
const dPost = new Date(Q.fechaPostIso + 'T00:00:00Z');
const BASE = { marginLeft: 52, marginRight: 16, marginTop: 16, marginBottom: 30 };
const Y = { domain: [0, 100], ticks: [0, 25, 50, 75, 100], tickFormat: (v: number) => `${v} %`, label: null, tickSize: 0 };
const X = { type: 'utc', label: null, ticks: 4, tickFormat: '%b', tickSize: 4 };
const reglas = Plot.ruleY([0, 25, 50, 75, 100], { stroke: 'var(--linea)', strokeWidth: 1 });
const marcaEp = Plot.ruleX([dEp], { stroke: 'var(--tinta)', strokeWidth: 1.5, strokeDasharray: '4 3' });

/** Paso 1: demarcación del Júcar sobre la península (sin datos, sin colores de alarma). */
export function vMapa() {
  const paths = zonas.filter((z: any) => z.r).map((z: any) => `<path d="${z.d}" fill="${z.codigo === COD_JUCAR ? 'var(--rio)' : 'var(--linea)'}" stroke="var(--fondo)" stroke-width="2" stroke-linejoin="round"/>`).join('');
  return `<svg class="ex-svg" viewBox="0 0 1000 ${alto}" role="img" aria-label="Mapa de la demarcación del Júcar, resaltada, dentro de la península. Es la zona de los embalses que se comentan en este texto.">${paths}</svg>`;
}

/** Paso 2: cada semana publicada como una marca; las dos que se comparan, destacadas. */
export function vSemanas() {
  const pts = ventana.map((v) => ({ d: v.d, y: 0 }));
  const dos = [{ d: dEp, t: 'antes' }, { d: dPost, t: 'después' }];
  return plot(200, {
    marginLeft: 20, marginRight: 20, marginTop: 24, marginBottom: 34,
    x: { ...X, ticks: 4 }, y: { domain: [-1, 1], axis: null },
    marks: [
      Plot.ruleY([0], { stroke: 'var(--linea)', strokeWidth: 2 }),
      Plot.dot(pts, { x: 'd', y: 'y', r: 4, fill: 'var(--tinta-2)', fillOpacity: 0.55 }),
      Plot.dot(dos, { x: 'd', y: 'y', r: 8, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 2 }),
      Plot.text([dos[0]], { x: 'd', y: 'y', text: () => 'antes', dy: -20, dx: 6, textAnchor: 'end', fontWeight: 700, fill: 'var(--tinta)', ...HALO }),
      Plot.text([dos[1]], { x: 'd', y: 'y', text: () => 'después', dy: -20, dx: -6, textAnchor: 'start', fontWeight: 700, fill: 'var(--tinta)', ...HALO }),
    ],
  }, `Línea de tiempo con las semanas publicadas de septiembre a diciembre de ${Q.anioEp}, una marca por semana. Se comparan dos: la del ${Q.fechaPre}, antes, y la del ${Q.fechaPost}, después. Lo que pasó entre ambas no se ve.`);
}

/** Paso 3: % del Júcar en la misma semana de cada año. */
export function vAnios() {
  const datos = [...Q.aniosPrevios.map((a) => ({ anio: a.anio, pct: a.pct, ep: false })), { anio: Q.anioEp, pct: Q.jPctPre, ep: true }];
  return plot(300, {
    ...BASE, marginLeft: 52,
    x: { domain: [Q.primerAnio - 1, Q.anioEp + 1], tickFormat: (v: number) => String(v), ticks: 5, label: null, tickSize: 4 },
    y: Y,
    marks: [reglas,
      Plot.ruleY([Q.jMedia], { stroke: 'var(--tinta-2)', strokeWidth: 1.5, strokeDasharray: '2 4' }),
      Plot.text([{ x: Q.primerAnio, y: Q.jMedia }], { x: 'x', y: 'y', text: () => `media de la serie ${f(Q.jMedia)} %`, textAnchor: 'start', dy: -8, fill: 'var(--tinta-2)', ...HALO }),
      Plot.dot(datos.filter((d) => !d.ep), { x: 'anio', y: 'pct', r: 4, fill: 'var(--tinta-2)', fillOpacity: 0.8 }),
      Plot.dot(datos.filter((d) => d.ep), { x: 'anio', y: 'pct', r: 7, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 2 }),
      Plot.text(datos.filter((d) => d.ep), { x: 'anio', y: 'pct', text: (d: any) => `${d.anio} · ${f(d.pct)} %`, textAnchor: 'end', dy: 20, dx: 4, fontWeight: 700, fill: 'var(--rio)', ...HALO })],
  }, `Gráfico de puntos: el porcentaje de reserva del Júcar en la semana del ${Q.fechaPre.replace(/ de \d{4}$/, '')} de cada año desde ${Q.primerAnio}. En ${Q.anioEp} estaba al ${f(Q.jPctPre)} %; la media de la serie es ${f(Q.jMedia)} %. La tabla de debajo da los mismos datos.`);
}

/** Pasos 4 y 7: Júcar semana a semana con la fecha marcada. `hoy`: hasta la última semana. */
export function vJucar(hoy = false) {
  const serie = hoy ? hastaHoy : ventana;
  const ultimo = serie[serie.length - 1];
  const pre = serie.find((v) => +v.d === +dEp)!, post = serie.find((v) => +v.d === +dPost)!;
  return plot(300, {
    ...BASE, x: { ...X, ticks: hoy ? 3 : 4, tickFormat: hoy ? '%Y' : '%b' }, y: Y,
    marks: [reglas, marcaEp,
      ...(hoy ? [Plot.ruleX([dPost], { stroke: 'var(--tinta-2)', strokeWidth: 1, strokeDasharray: '2 3' })] : []),
      Plot.line(serie, { x: 'd', y: 'pct', stroke: 'var(--rio)', strokeWidth: 2.5, strokeLinejoin: 'round' }),
      Plot.dot([pre, post], { x: 'd', y: 'pct', r: 5, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 1.5 }),
      Plot.text([pre], { x: 'd', y: 'pct', text: () => `${f(pre.pct)} %`, textAnchor: 'end', dx: -8, dy: 16, fontWeight: 700, fill: 'var(--tinta)', ...HALO }),
      Plot.text([post], { x: 'd', y: 'pct', text: () => `${f(post.pct)} %`, textAnchor: 'start', dx: 8, dy: -10, fontWeight: 700, fill: 'var(--rio)', ...HALO }),
      Plot.text([{ d: dEp, y: 100 }], { x: 'd', y: 'y', text: () => fechaDiaMes(FECHA_EPISODIO), textAnchor: hoy ? 'start' : 'end', dx: hoy ? 5 : -5, dy: 4, fill: 'var(--tinta)', ...HALO }),
      ...(hoy ? [Plot.dot([ultimo], { x: 'd', y: 'pct', r: 6, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 2 }),
        Plot.text([ultimo], { x: 'd', y: 'pct', text: () => `hoy ${f(ultimo.pct)} %`, textAnchor: 'end', dy: -12, dx: 4, fontWeight: 700, fill: 'var(--rio)', ...HALO })] : [])],
  }, hoy
    ? `Gráfico de la reserva del Júcar desde septiembre de ${Q.anioEp} hasta hoy. Antes del episodio, ${f(Q.jPctPre)} %; una semana después, ${f(Q.jPctPost)} %; a final de ${Q.anioEp}, ${f(Q.jPctCierre)} %; hoy, ${f(Q.jPctHoy)} %.`
    : `Gráfico de la reserva del Júcar semana a semana de septiembre a diciembre de ${Q.anioEp}. La semana del ${Q.fechaPre} estaba al ${f(Q.jPctPre)} % y la siguiente, al ${f(Q.jPctPost)} %. Línea discontinua: día del episodio.`);
}

/** Paso 5: un panel por embalse (% de su capacidad, de septiembre a diciembre), con la fecha marcada. */
export function vEmbalses() {
  const n = embalsesDana.length, cols = 2, filas = Math.ceil(n / cols);
  const datos = embalsesDana.flatMap((e, k) => e.serie.map((p) => ({ d: new Date(p.fecha + 'T00:00:00Z'), pct: p.pct, c: k % cols, r: Math.floor(k / cols) })));
  const rot = embalsesDana.map((e, k) => ({ nombre: e.nombre, c: k % cols, r: Math.floor(k / cols) }));
  return plot(330, {
    marginLeft: 8, marginRight: 8, marginTop: 6, marginBottom: 6,
    x: { type: 'utc', axis: null }, y: { domain: [0, 100], axis: null }, fx: { axis: null, domain: [...Array(cols).keys()] }, fy: { axis: null, domain: [...Array(filas).keys()] },
    marks: [
      Plot.frame({ stroke: 'var(--linea)' }),
      Plot.ruleY([0, 100], { stroke: 'var(--linea)', strokeWidth: 1 }),
      Plot.ruleX([dEp], { stroke: 'var(--tinta)', strokeWidth: 1, strokeDasharray: '3 3' }),
      Plot.line(datos, { x: 'd', y: 'pct', fx: 'c', fy: 'r', stroke: 'var(--rio)', strokeWidth: 2 }),
      Plot.text(rot, { fx: 'c', fy: 'r', text: 'nombre', frameAnchor: 'top-left', dx: 6, dy: 6, fontWeight: 700, fill: 'var(--tinta)', ...HALO }),
    ],
  }, `Ocho paneles, uno por embalse (${embalsesDana.map((e) => e.nombre).join(', ')}), con el porcentaje de su capacidad de septiembre a diciembre de ${Q.anioEp} y el día del episodio marcado. La tabla de debajo da los hectómetros cúbicos.`);
}

/** Paso 6: esquema (no son datos) de un embalse que guarda parte de una crecida y la suelta más despacio. */
export function vEsquema() {
  const t = (x: number, y: number, s: string, extra = '') => `<text x="${x}" y="${y}" fill="var(--tinta)" font-family="var(--f-cifras)" font-size="13" ${extra}>${s}</text>`;
  return `<svg class="ex-svg" viewBox="0 0 ${W} 300" role="img" aria-label="Esquema, no son datos: un río entra a un embalse con una flecha gruesa y sale con una flecha más fina y más larga. Una parte del embalse está vacía y se rotula como espacio libre. Antes del episodio, los embalses citados tenían entre ${f(Q.huecoMin, 0)} y ${f(Q.huecoMax, 0)} hm³ libres.">
  <rect x="120" y="80" width="130" height="120" fill="none" stroke="var(--tinta)" stroke-width="2"/>
  <rect x="121" y="130" width="128" height="69" fill="var(--rio)" fill-opacity=".35"/>
  <line x1="121" x2="249" y1="130" y2="130" stroke="var(--tinta)" stroke-width="1.5" stroke-dasharray="4 3"/>
  ${t(185, 108, 'espacio libre', 'text-anchor="middle"')}
  ${t(185, 168, 'agua guardada', 'text-anchor="middle"')}
  <path d="M10 140 H100" stroke="var(--rio)" stroke-width="16" fill="none"/><path d="M96 126 L116 140 L96 154 Z" fill="var(--rio)"/>
  <path d="M254 170 H340" stroke="var(--rio)" stroke-width="6" fill="none"/><path d="M338 162 L352 170 L338 178 Z" fill="var(--rio)"/>
  ${t(10, 118, 'entra de golpe')}${t(352, 154, 'sale despacio', 'text-anchor="end"')}
  ${t(180, 250, `Antes del episodio: entre ${f(Q.huecoMin, 0)} y ${f(Q.huecoMax, 0)} hm³ libres`, 'text-anchor="middle"')}
  ${t(180, 270, 'en los embalses citados', 'text-anchor="middle"')}
</svg>`;
}
