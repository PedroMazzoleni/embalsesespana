/* Utilidades de las maquetas: formatea y redacta a partir de window.MUESTRA. No contiene cifras. */
(function () {
  var M = window.MUESTRA, N = M.nacional, U = { M: M, N: N };
  U.f = function (n, d) {
    d = d == null ? 1 : d;
    return n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
  };
  U.abs = Math.abs;
  U.signo = function (n) { return n > 0 ? '+' : n < 0 ? '−' : ''; };
  U.fecha = new Date(M.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  U.fechaCorta = new Date(M.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  U.rel = N.dif_media_pts > 1 ? 'por encima de' : N.dif_media_pts < -1 ? 'por debajo de' : 'en línea con';
  U.masMenos = N.dif_media_pts > 1 ? 'más llenos' : N.dif_media_pts < -1 ? 'más vacíos' : 'como de costumbre';
  U.anioMax = Math.max.apply(null, M.anios.map(function (a) { return a.pct; }));
  U.anioMin = Math.min.apply(null, M.anios.map(function (a) { return a.pct; }));
  U.aniosPeores = M.anios.filter(function (a) { return a.pct < N.pct; }).length;
  U.anioDe = function (a) { return a.fecha.slice(0, 4); };
  U.veredicto = function () {
    if (N.dif_media_pts > 1) return N.pct >= 50 ? 'Sí, más de lo habitual.' : 'Menos de la mitad, pero más de lo habitual.';
    if (N.dif_media_pts < -1) return N.pct >= 50 ? 'Sí, aunque menos de lo habitual.' : 'Poca, menos de lo habitual.';
    return 'Lo habitual para esta época.';
  };
  U.esGrave = function () {
    if (N.dif_media_pts > 1) return 'Por ahora, no: la reserva está por encima de la media de los últimos 10 años.';
    if (N.dif_media_pts < -1) return 'Es motivo de atención: la reserva está por debajo de la media de los últimos 10 años.';
    return 'No más de lo habitual: la reserva está en línea con la media de los últimos 10 años.';
  };
  U.frase = function () {
    return 'Los embalses están al ' + U.f(N.pct) + ' %, ' + U.f(U.abs(N.dif_media_pts)) + ' puntos ' + U.rel + ' la media de los últimos 10 años.';
  };
  U.semana = function () {
    var v = N.var_pts;
    return (v === 0 ? 'Sin cambios' : (v > 0 ? 'Suben ' : 'Bajan ') + U.f(U.abs(v)) + ' puntos') + ' frente a la semana anterior (' + U.f(N.pct_previa) + ' %).';
  };
  U.piscinas = N.hm3 * 1e6 / 2500; // piscina olímpica: 2.500 m3 (equivalencia calculada)
  U.ej = function (rol) { return M.ejemplos.filter(function (e) { return e.rol === rol; })[0]; };
  U.atrib = function () {
    return 'Datos: Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO), Boletín Hidrológico, ' + U.fecha + '. ' + N.n_embalses + ' embalses peninsulares. Datos provisionales; pueden cambiar la semana que viene.';
  };
  U.provisional = 'Media de 10 años: cálculo provisional de maqueta.';
  // Luminancia y contraste (WCAG)
  U.lum = function (hex) {
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  U.ratio = function (a, b) {
    var x = U.lum(a), y = U.lum(b), hi = Math.max(x, y), lo = Math.min(x, y);
    return (hi + 0.05) / (lo + 0.05);
  };
  U.texto = function (fondo, claro, oscuro) { return U.ratio(fondo, claro) >= U.ratio(fondo, oscuro) ? claro : oscuro; };
  // Clase 0..n-1 según cortes ascendentes
  U.clase = function (p, cortes) { for (var i = 0; i < cortes.length; i++) if (p < cortes[i]) return i; return cortes.length; };
  /* Paths del mapa. o.fill(d) -> color; o.attrs -> atributos comunes */
  U.paths = function (o) {
    return M.demarcaciones.map(function (d) {
      return '<path d="' + d.d + '" fill="' + (d.pct == null ? 'none' : o.fill(d)) + '"' + (o.attrs || '') + '><title>' + d.nombre + ': ' + (d.pct == null ? 'sin dato' : U.f(d.pct) + ' %') + '</title></path>';
    }).join('');
  };
  U.filas = function (orden) {
    return M.demarcaciones.slice().sort(function (a, b) { return orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : b.pct - a.pct; });
  };
  U.set = function (id, txt) { var e = document.getElementById(id); if (e) e.textContent = txt; return e; };
  window.U = U;
})();
