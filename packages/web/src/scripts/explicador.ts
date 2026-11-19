// Scrollytelling del explicador: scrollama activa el visual del paso que se está leyendo.
// Mejora progresiva: sin JS (o sin IntersectionObserver) todos los pasos y visuales se ven en orden.
import scrollama from 'scrollama';

const raiz = document.querySelector<HTMLElement>('.ex-js');
if (raiz && 'IntersectionObserver' in window) {
  const pasos = [...raiz.querySelectorAll<HTMLElement>('.paso-t')];
  const visuales = [...raiz.querySelectorAll<HTMLElement>('.visual')];
  const mapa = document.getElementById('ex-mapa');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const ancho = matchMedia('(min-width: 64rem)');
  let tMapa = 0;

  const activar = (n: number) => {
    raiz.dataset.paso = String(n);
    visuales.forEach((v) => {
      const on = v.dataset.paso === String(n);
      v.classList.toggle('activo', on);
      v.toggleAttribute('inert', !on);
    });
    pasos.forEach((p) => p.classList.toggle('activo', p.dataset.paso === String(n)));
    if (mapa) {
      // el mapa pasa del color por % al color por diferencia con la media al entrar en el paso 5
      clearTimeout(tMapa);
      if (n === 5) tMapa = window.setTimeout(() => { mapa.dataset.fase = 'dif'; }, quieto.matches ? 0 : 700);
      else mapa.dataset.fase = 'abs';
    }
  };

  if (mapa) mapa.dataset.fase = 'abs';
  activar(1);
  const offset = () => {
    const v = visuales[0];
    return ancho.matches ? 0.5 : Math.min((v.getBoundingClientRect().height + innerHeight * 0.2) / innerHeight, 0.85);
  };
  const sc = scrollama();
  const montar = () => {
    sc.destroy();
    sc.setup({ step: pasos, offset: offset() }).onStepEnter(({ element }) => activar(Number((element as HTMLElement).dataset.paso)));
  };
  montar();
  ancho.addEventListener('change', montar);
  addEventListener('resize', sc.resize);
}
