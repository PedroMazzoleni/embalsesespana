// Visuales del explicador de sequías: SVG en build (ver visuales.ts). Cero JS en el cliente.
import * as Plot from '@observablehq/plot';
import { f, resumen } from '../datos';
import { tiempo } from './es-grave';
import { plot, HALO } from './visuales';
import { Q, sequias, validos, bajaIdx, iMin, iMax, ult } from './sequias';

const d = (i: number) => new Date(tiempo.fechas[i] + 'T00:00:00Z');
const nac = tiempo.series.nacional as number[];
const pts = (a: number, b: number) => validos.filter((i) => i >= a && i <= b).map((i) => ({ d: d(i), pct: nac[i] }));
const EJES = {
  x: { type: 'utc', label: null, ticks: 5, tickFormat: '%Y', tickSize: 4 },
  y: { domain: [0, 100], ticks: [0, 25, 50, 75, 100], tickFormat: (v: number) => `${v} %`, label: null, tickSize: 0 },
};
const BASE = { marginLeft: 52, marginRight: 14, marginTop: 14, marginBottom: 30 };
const reglas = Plot.ruleY([0, 25, 50, 75, 100], { stroke: 'var(--linea)', strokeWidth: 1 });
const umbralMarks = () => [
  Plot.ruleY([Q.umbral], { stroke: 'var(--alerta)', strokeWidth: 1.5, strokeDasharray: '4 4' }),
  Plot.text([{ d: d(ult), y: Q.umbral }], { x: 'd', y: 'y', text: () => `umbral ${f(Q.umbral)} %`, fill: 'var(--alerta)', textAnchor: 'end', dy: -7, fontWeight: 700, ...HALO }),
];
const linea = () => Plot.line(pts(0, ult), { x: 'd', y: 'pct', stroke: 'var(--tinta-2)', strokeOpacity: 0.6, strokeWidth: 1.25 });
const etiquetasSeq = (conPct: boolean) => sequias.map((s, k) => Plot.text([{ d: d(s.i), pct: s.pct }], { x: 'd', y: 'pct', text: () => (conPct ? `${s.anio} · ${f(s.pct)} %` : s.anio), fill: 'var(--alerta)', fontWeight: 700, textAnchor: k === 0 ? 'start' : 'middle', dx: k === 0 ? -6 : 0, dy: 18 + 16 * (k % 2), ...HALO }));
const puntosSeq = () => Plot.dot(sequias.map((s) => ({ d: d(s.i), pct: s.pct })), { x: 'd', y: 'pct', r: 5, fill: 'var(--alerta)', stroke: 'var(--fondo)', strokeWidth: 1.5 });
const tablaTxt = `${sequias.map((s) => `${s.anio} (${f(s.pct)} %)`).join(', ')}`;

/** Paso 2: serie con umbral y mínimos detectados. */
export function vDeteccion() {
  return plot(300, { ...BASE, ...EJES, marks: [reglas, linea(), ...umbralMarks(), puntosSeq()] },
    `Gráfico de la reserva nacional semana a semana desde ${Q.primerAnio}, con el umbral de reserva baja en el ${f(Q.umbral)} % y los grandes mínimos detectados: ${tablaTxt}.`);
}
/** Paso 3: cada sequía resaltada (de la racha bajo el umbral a la recuperación). */
export function vSequias() {
  return plot(300, {
    ...BASE, ...EJES,
    marks: [reglas, linea(), ...umbralMarks(),
      ...sequias.map((s) => Plot.line(pts(s.ini, s.j ?? ult), { x: 'd', y: 'pct', stroke: 'var(--alerta)', strokeWidth: 2.75 })),
      puntosSeq(), ...etiquetasSeq(true)],
  }, `Gráfico de la reserva nacional desde ${Q.primerAnio} con cada sequía resaltada: ${tablaTxt}.`);
}
/** Paso 4: línea de Cuencas Internas de Cataluña alrededor del episodio de los barcos. */
export function vCataluna() {
  if (!Q.catCodigo || Q.iBarco < 0) return '';
  const serie = tiempo.series[Q.catCodigo];
  const a = Math.max(0, Q.iBarco - 52), b = Math.min(ult, Q.iBarco + 52);
  const p = tiempo.fechas.map((_, i) => ({ d: d(i), pct: serie[i], i })).filter((o) => o.i >= a && o.i <= b && o.pct != null);
  const barco = p.find((o) => o.i === Q.iBarco)!;
  return plot(260, {
    ...BASE, ...EJES, x: { type: 'utc', label: null, ticks: 4, tickFormat: '%m/%Y', tickSize: 4 },
    marks: [reglas, Plot.line(p, { x: 'd', y: 'pct', stroke: 'var(--rio)', strokeWidth: 2.5 }),
      Plot.ruleX([barco.d], { stroke: 'var(--alerta)', strokeWidth: 1.5, strokeDasharray: '4 3' }),
      Plot.dot([barco], { x: 'd', y: 'pct', r: 5, fill: 'var(--alerta)', stroke: 'var(--fondo)', strokeWidth: 1.5 }),
      Plot.text([barco], { x: 'd', y: 'pct', text: () => `barco · ${f(barco.pct as number)} %`, fill: 'var(--alerta)', fontWeight: 700, dy: -12, ...HALO })],
  }, `Gráfico de Cuencas Internas de Cataluña un año antes y un año después de la llegada del primer barco con agua a Barcelona. Ese día estaba al ${f(barco.pct as number)} %.`);
}
/** Paso 6: recuperaciones sombreadas del mínimo a la vuelta a la media. */
export function vRecuperacion() {
  const rec = sequias.filter((s) => s.j != null);
  return plot(300, {
    ...BASE, ...EJES,
    marks: [reglas, linea(),
      Plot.ruleY([Q.mediaSerie], { stroke: 'var(--tinta-2)', strokeWidth: 1.5, strokeDasharray: '2 4' }),
      ...rec.map((s) => Plot.line(pts(s.i, s.j as number), { x: 'd', y: 'pct', stroke: 'var(--rio)', strokeWidth: 3 })),
      ...rec.map((s, k) => Plot.text([{ d: d(s.i), pct: s.pct }], { x: 'd', y: 'pct', text: () => `${s.semanasRec} sem.`, fill: 'var(--rio)', fontWeight: 700, textAnchor: k === 0 ? 'start' : 'middle', dx: k === 0 ? -6 : 0, dy: 18 + 16 * (k % 2), ...HALO })),
      puntosSeq()],
  }, `Gráfico de la reserva nacional con las recuperaciones en azul, del mínimo a la vuelta a la media de la serie (${f(Q.mediaSerie)} %): ${rec.map((s) => `${s.anio}, ${s.semanasRec} semanas`).join('; ')}.`);
}
/** Paso 7 y 8: serie con hoy, umbral y mínimo; opcionalmente las semanas de baja cobertura. */
export function vHoy(conBajas = false) {
  const hoy = { d: d(ult), pct: resumen.nacional.pct };
  return plot(300, {
    ...BASE, ...EJES,
    marks: [reglas,
      ...(conBajas ? [Plot.ruleX(bajaIdx.map(d), { stroke: 'var(--alerta)', strokeOpacity: 0.35, strokeWidth: 1 })] : []),
      linea(), ...(conBajas ? [] : [...umbralMarks(),
        Plot.dot([{ d: d(iMin), pct: nac[iMin] }], { x: 'd', y: 'pct', r: 5, fill: 'var(--alerta)', stroke: 'var(--fondo)', strokeWidth: 1.5 }),
        Plot.text([{ d: d(iMin), pct: nac[iMin] }], { x: 'd', y: 'pct', text: () => `mínimo ${Q.anioMinAbs} · ${f(nac[iMin])} %`, fill: 'var(--alerta)', fontWeight: 700, dy: 18, textAnchor: 'start', dx: -6, ...HALO }),
        Plot.dot([hoy], { x: 'd', y: 'pct', r: 6, fill: 'var(--rio)', stroke: 'var(--fondo)', strokeWidth: 2 }),
        Plot.text([hoy], { x: 'd', y: 'pct', text: () => `hoy ${f(hoy.pct)} %`, fill: 'var(--rio)', fontWeight: 700, textAnchor: 'end', dy: -12, dx: 4, ...HALO })])],
  }, conBajas
    ? `Gráfico de la reserva nacional desde ${Q.primerAnio}, con marcas en las semanas de cobertura baja, que se excluyen de los cálculos.`
    : `Gráfico de la reserva nacional desde ${Q.primerAnio}: hoy está al ${f(hoy.pct)} %, el mínimo de la serie fue ${f(nac[iMin])} % en ${Q.anioMinAbs} y el máximo ${f(nac[iMax])} % en ${Q.anioMaxAbs}.`);
}
