(function () {
  var U = window.U; U.NA = U.M.anios.length; U.mes = new Date(U.M.fecha + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long' }); U.licencia = 'CC BY 4.0';
  Array.prototype.forEach.call(document.querySelectorAll('.na'), function (n) { n.textContent = U.NA; });
  U.cortes = [20, 35, 50, 65, 80];
  U.nombres = ['Casi seco', 'Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
  U.rangos = ['0 a 20 %', '20 a 35 %', '35 a 50 %', '50 a 65 %', '65 a 80 %', '80 a 100 %'];
  U.agua = function (p) { return U.clase(p, U.cortes); };
  U.leyendaHTML = function () { return U.nombres.map(function (n, i) { return '<li><i class="c' + i + '"></i>' + n + ' (' + U.rangos[i] + ')</li>'; }).join(''); };
})();
