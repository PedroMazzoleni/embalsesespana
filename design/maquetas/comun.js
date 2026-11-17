/* Cabecera y pie comunes. Sin cifras propias. */
(function () {
  var U = window.U; U.NA = U.M.anios.length; U.mes = new Date(U.M.fecha + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long' }); U.licencia = 'CC BY 4.0';
  var  actual = document.body.getAttribute('data-pag'), ancha = ' ancha';
  function a(href, t, p) { return '<a href="' + href + '"' + (p === actual ? ' aria-current="page"' : '') + '>' + t + '</a>'; }
  document.body.insertAdjacentHTML('afterbegin', '<a class="salto" href="#main">Saltar al contenido</a>');
  var m = document.querySelector('main'); if (m) m.id = 'main';
  Array.prototype.forEach.call(document.querySelectorAll('.na'), function (n) { n.textContent = U.NA; });
  document.getElementById('cab').innerHTML = '<div class="col' + ancha + '"><p class="marca"><a href="portada.html">Embalses de España</a></p>' +
    '<nav aria-label="Principal">' + a('mapa.html', 'Mapa', 'mapa') + a('embalse.html', 'Embalses', 'embalse') + '<span class="prox">Explicadores (próximamente)</span>' + '</nav></div>';
  document.getElementById('pie').innerHTML = '<div class="col' + ancha + '"><p class="fuente">Fuente: MITECO, Boletín Hidrológico</p><p>' + U.atrib() + '</p><p>Código: MIT · Datos: ' + U.licencia + '</p></div>';
  // Escala del agua (cortes en % de llenado; ver agua.css)
  U.cortes = [20, 35, 50, 65, 80];
  U.nombres = ['Casi seco', 'Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
  U.rangos = ['0 a 20 %', '20 a 35 %', '35 a 50 %', '50 a 65 %', '65 a 80 %', '80 a 100 %'];
  U.agua = function (p) { return U.clase(p, U.cortes); };
  U.leyendaHTML = function () { return U.nombres.map(function (n, i) { return '<li><i class="c' + i + '"></i>' + n + ' (' + U.rangos[i] + ')</li>'; }).join(''); };
})();
