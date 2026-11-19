// Visuales del explicador "¿Es grave?": SVG generados en build (Observable Plot + linkedom).
// Cero JS en el cliente. Cada función devuelve el SVG como cadena, con role="img" y su aria-label.
import * as Plot from '@observablehq/plot';
import { parseHTML } from 'linkedom';
import { f, clase, fechaLarga, resumen } from '../datos';
import { INICIO_MES, MESES } from '../serieHistorica';
import { M, equiv, secos, bandaAnios, norte, sureste, tiempo } from './es-grave';

export const W = 360;               // viewBox; el texto de 13 px se queda en >= 12 px en un móvil de 375
const FUENTE = { fontFamily: 'var(--f-cifras)', fontSize: '13px', color: 'var(--tinta-2)', background: 'transparent', overflow: 'visible' };
const HALO = { stroke: 'var(--fondo)', strokeWidth: 4, paintOrder: 'stroke' } as const;
const { document } = parseHTML('<html><body></body></html>');

function limpio(chart: Element, etiqueta: string, h: number) {
  chart.removeAttribute('width'); chart.removeAttribute('height');
  // un solo role="img" para todo el SVG; los aria-label de cada marca de Plot sobran (axe aria-prohibited-attr)
  chart.querySelectorAll('[aria-label], [aria-description]').forEach((n: Element) => { n.removeAttribute('aria-label'); n.removeAttribute('aria-description'); });
  chart.setAttribute('viewBox', `0 0 ${W} ${h}`);
  chart.setAttribute('role', 'img'); chart.setAttribute('aria-label', etiqueta); chart.setAttribute('class', 'ex-svg');
  return chart.outerHTML;
}
const plot = (h: number, opts: any, etiqueta: string) =>
  limpio(Plot.plot({ document: document as any, width: W, height: h, style: FUENTE, ...opts }) as unknown as Element, etiqueta, h);

// ---- 1. depósito nacional ----
export function visual1() {
  const H = 300, y0 = 24, alto = 240, x0 = 52, ancho = 110;
  const lleno = Math.min(Math.max(M.pct, 0), 100) * alto / 100;
  const k = clase(M.pct);
  const etiqueta = `Reserva peninsular al ${M.pctTxt} % el ${M.fechaLarga}.`;
  return `<svg class="ex-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${etiqueta}" style="overflow:visible">
  <rect x="${x0}" y="${y0 + alto - lleno}" width="${ancho}" height="${lleno}" fill="var(--agua-${k})" ${k === 0 ? 'stroke="var(--agua-borde)" stroke-width="1"' : ''}/>
  <rect x="${x0}" y="${y0}" width="${ancho}" height="${alto}" fill="none" stroke="var(--tinta)" stroke-width="2"/>
  ${[0, 50, 100].map((t) => `<g><line x1="${x0 - 6}" x2="${x0}" y1="${y0 + alto - t * alto / 100}" y2="${y0 + alto - t * alto / 100}" stroke="var(--tinta)" stroke-width="2"/><text x="${x0 - 10}" y="${y0 + alto - t * alto / 100 + 4}" text-anchor="end" fill="var(--tinta-2)" font-family="var(--f-cifras)" font-size="13">${t} %</text></g>`).join('')}
  <text x="${x0 + ancho + 22}" y="${y0 + 70}" fill="var(--tinta)" font-family="var(--f-cifras)" font-weight="700" font-size="46" letter-spacing="-2">${M.pctTxt} %</text>
  <text x="${x0 + ancho + 22}" y="${y0 + 98}" fill="var(--tinta-2)" font-family="var(--f-cifras)" font-size="13">de la capacidad</text>
  <text x="${x0 + ancho + 22}" y="${y0 + 118}" fill="var(--tinta-2)" font-family="var(--f-cifras)" font-size="13">peninsular</text>
  <text x="${x0 + ancho + 22}" y="${y0 + 170}" fill="var(--tinta-2)" font-family="var(--f-cifras)" font-size="13">${fechaLarga(resumen.fecha).replace(/ de (\d{4})$/, '')}</text>
  <text x="${x0 + ancho + 22}" y="${y0 + 188}" fill="var(--tinta-2)" font-family="var(--f-cifras)" font-size="13">de ${resumen.fecha.slice(0, 4)}</text>
</svg>`;
}

// ---- 2. año hidrológico frente a la banda de años anteriores ----
export function visual2() {
  const H = 300, { banda, actual } = bandaAnios();
  const ult = actual[actual.length - 1];
  const ref = banda[Math.floor(banda.length * 0.62)];
  const etiqueta = `Gráfico del año hidrológico: la reserva nacional hoy está al ${M.pctTxt} %, la media de la misma semana en los ${M.nAnios} años anteriores es ${M.media10Txt} %. En gris, el rango que recorrieron esos años.`;
  return plot(H, {
    marginLeft: 52, marginRight: 8, marginTop: 14, marginBottom: 30,
    x: { domain: [0, 365], ticks: INICIO_MES, tickFormat: (d: number) => MESES[INICIO_MES.indexOf(d)]?.slice(0, 1).toUpperCase() ?? '', label: null, tickSize: 4 },
    y: { domain: [0, 100], ticks: [0, 25, 50, 75, 100], tickFormat: (d: number) => `${d} %`, label: null, tickSize: 0 },
    marks: [
      Plot.ruleY([0, 25, 50, 75, 100], { stroke: 'var(--linea)', strokeWidth: 1 }),
      Plot.areaY(banda, { x: 'd', y1: 'min', y2: 'max', className: 'ex-banda' }),
      Plot.text([{ d: ref.d, y: ref.max }], { x: 'd', y: 'y', text: () => `rango de los ${M.nAnios} años anteriores`, fill: 'var(--tinta-2)', dy: -9, ...HALO }),
      Plot.line(actual, { x: 'd', y: 'pct', stroke: 'var(--rio)', strokeWidth: 3.5, strokeLinejoin: 'round' }),
      Plot.ruleY([M.media10 ?? 0], { x1: Math.max(ult.d - 14, 0), x2: ult.d + 14, stroke: 'var(--alerta)', strokeWidth: 3.5 }),
      Plot.dot([ult], { x: 'd', y: 'pct', r: 5.5, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 2 }),
      Plot.text([ult], { x: 'd', y: 'pct', text: () => `hoy ${M.pctTxt} %`, fill: 'var(--rio)', textAnchor: 'start', dx: 12, dy: -10, fontWeight: 700, ...HALO }),
      Plot.text([ult], { x: 'd', y: () => M.media10 ?? 0, text: () => `media ${M.media10Txt} %`, fill: 'var(--alerta)', textAnchor: 'start', dx: 18, dy: 16, fontWeight: 700, ...HALO }),
    ],
  }, etiqueta);
}

// ---- 3. un punto por año, en la misma semana ----
export function visual3() {
  const datos = [...M.anios.map((a) => ({ et: String(a.anio), pct: a.pct, hoy: false })), { et: 'hoy', pct: M.pct, hoy: true }].sort((a, b) => a.pct - b.pct);
  const vs = datos.map((d) => d.pct);
  const lo = Math.floor((Math.min(...vs) - 8) / 10) * 10, hi = Math.ceil((Math.max(...vs) + 8) / 10) * 10;
  const H = 50 + datos.length * 24;
  const etiqueta = `Gráfico de puntos: el porcentaje de reserva en la misma semana de cada uno de los ${M.nAnios} años anteriores, ordenado de menos a más, y el de hoy (${M.pctTxt} %). La tabla de debajo da los mismos datos.`;
  return plot(H, {
    marginLeft: 52, marginRight: 14, marginTop: 14, marginBottom: 34,
    x: { domain: [lo, hi], label: null, tickFormat: (d: number) => `${d} %`, ticks: 5, tickSize: 4 },
    y: { type: 'band', domain: datos.map((d) => d.et), label: null, tickSize: 0 },
    marks: [
      Plot.ruleX([lo, ...[1, 2, 3, 4].map((i) => lo + ((hi - lo) / 5) * i)], { stroke: 'var(--linea)', strokeWidth: 1 }),
      ...(M.media10 != null ? [Plot.ruleX([M.media10], { stroke: 'var(--alerta)', strokeWidth: 2, strokeDasharray: '5 3' }), Plot.text([{ x: M.media10 }], { x: 'x', frameAnchor: 'top', dy: -6, text: () => `media ${M.media10Txt} %`, fill: 'var(--alerta)', fontWeight: 700 })] : []),
      Plot.dot(datos.filter((d) => !d.hoy), { x: 'pct', y: 'et', r: 5, fill: 'var(--tinta-2)' }),
      Plot.dot(datos.filter((d) => d.hoy), { x: 'pct', y: 'et', r: 7.5, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 2 }),
      Plot.text(datos, { x: 'pct', y: 'et', text: (d: any) => f(d.pct), dx: 13, textAnchor: 'start', fill: (d: any) => (d.hoy ? 'var(--rio)' : 'var(--tinta-2)'), fontWeight: (d: any) => (d.hoy ? 700 : 400) }),
    ],
  }, etiqueta);
}

// ---- 4. serie completa con los tres mínimos de la semana equivalente ----
export function visual4() {
  const H = 300;
  const pts = tiempo.fechas.map((fe, i) => ({ d: new Date(fe + 'T00:00:00Z'), pct: tiempo.series.nacional[i] })).filter((p) => p.pct != null);
  const top = secos.slice(0, 3).map((s) => ({ ...s, d: new Date(s.fecha + 'T00:00:00Z') }));
  const hoy = { d: new Date(resumen.fecha + 'T00:00:00Z'), pct: M.pct };
  const etiqueta = `Gráfico de la reserva nacional semana a semana desde ${M.primerAnio}. En la misma semana del año, los años más secos fueron ${top.map((s) => `${s.anio} (${f(s.pct)} %)`).join(', ')}; hoy está al ${M.pctTxt} %.`;
  return plot(H, {
    marginLeft: 52, marginRight: 14, marginTop: 14, marginBottom: 30,
    x: { type: 'utc', label: null, ticks: 5, tickFormat: '%Y', tickSize: 4 },
    y: { domain: [0, 100], ticks: [0, 25, 50, 75, 100], tickFormat: (d: number) => `${d} %`, label: null, tickSize: 0 },
    marks: [
      Plot.ruleY([0, 25, 50, 75, 100], { stroke: 'var(--linea)', strokeWidth: 1 }),
      Plot.line(pts, { x: 'd', y: 'pct', stroke: 'var(--tinta-2)', strokeOpacity: 0.55, strokeWidth: 1.25 }),
      Plot.dot(top, { x: 'd', y: 'pct', r: 5, fill: 'var(--alerta)', stroke: 'var(--fondo)', strokeWidth: 1.5 }),
      ...top.slice().sort((a, b) => +a.d - +b.d).map((s, i) => Plot.text([s], { x: 'd', y: 'pct', text: () => `${s.anio} · ${f(s.pct)} %`, fill: 'var(--alerta)', fontWeight: 700, textAnchor: i === 0 ? 'start' : 'middle', dx: i === 0 ? -6 : 0, dy: 18 + 18 * (i % 2), ...HALO })),
      Plot.dot([hoy], { x: 'd', y: 'pct', r: 6, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 2 }),
      Plot.text([hoy], { x: 'd', y: 'pct', text: () => `hoy ${M.pctTxt} %`, fill: 'var(--rio)', fontWeight: 700, textAnchor: 'end', dy: -12, dx: 4, ...HALO }),
    ],
  }, etiqueta);
}

// ---- 6. norte frente a sur y este (últimos años de la media) ----
export function visual6() {
  const H = 300;
  const ini = resumen.fechas_media[0];
  const fila = (serie: (number | null)[], grupo: string) => tiempo.fechas.flatMap((fe, i) => (fe >= ini && serie[i] != null ? [{ d: new Date(fe + 'T00:00:00Z'), pct: serie[i] as number, grupo }] : []));
  const dn = fila(norte.serie, 'Norte'), ds = fila(sureste.serie, 'Sur y este');
  const un = (100 * 15) / (H - 44);
  const fin = [{ y: dn[dn.length - 1].pct, t: 'Norte', c: 'var(--rio)' }, { y: ds[ds.length - 1].pct, t: 'Sur y este', c: 'var(--alerta)' }].sort((a, b) => a.y - b.y);
  if (fin[1].y - fin[0].y < un) fin[1].y = fin[0].y + un;
  const etiqueta = `Gráfico de las dos zonas en los últimos años: el norte está al ${f(norte.pct)} % y el sur y este al ${f(sureste.pct)} %. Las rayas de puntos marcan la media de cada zona para esta semana.`;
  return plot(H, {
    marginLeft: 52, marginRight: 76, marginTop: 14, marginBottom: 30,
    x: { type: 'utc', label: null, ticks: 5, tickFormat: '%Y', tickSize: 4 },
    y: { domain: [0, 100], ticks: [0, 25, 50, 75, 100], tickFormat: (d: number) => `${d} %`, label: null, tickSize: 0 },
    marks: [
      Plot.ruleY([0, 25, 50, 75, 100], { stroke: 'var(--linea)', strokeWidth: 1 }),
      Plot.line(dn, { x: 'd', y: 'pct', stroke: 'var(--rio)', strokeWidth: 2.25 }),
      Plot.line(ds, { x: 'd', y: 'pct', stroke: 'var(--alerta)', strokeWidth: 2.25 }),
      ...(norte.media10 != null ? [Plot.ruleY([norte.media10], { stroke: 'var(--rio)', strokeWidth: 2, strokeDasharray: '1 4', strokeLinecap: 'round' })] : []),
      ...(sureste.media10 != null ? [Plot.ruleY([sureste.media10], { stroke: 'var(--alerta)', strokeWidth: 2, strokeDasharray: '1 4', strokeLinecap: 'round' })] : []),
      Plot.text(fin, { x: () => dn[dn.length - 1].d, y: 'y', text: 't', fill: 'c', textAnchor: 'start', dx: 8, fontWeight: 700, ...HALO }),
    ],
  }, etiqueta);
}
