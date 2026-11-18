// Mejora progresiva de /mapa: MapLibre con relieve, cargado de forma diferida.
// El SVG generado en build sigue siendo la base sin JS y la alternativa accesible.
import type { Map as GLMap, GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl';

const caja = document.getElementById('mapa-caja') as HTMLElement | null;
const lienzo = document.getElementById('mapa-gl') as HTMLElement | null;
const svgWrap = document.getElementById('mapa-svg') as HTMLElement | null;
const panel = document.getElementById('panel') as HTMLElement | null;
const aviso = document.getElementById('mapa-aviso') as HTMLElement | null;
const ctl = document.getElementById('mapa-ctl') as HTMLElement | null;
const btnPlano = document.getElementById('mapa-plano') as HTMLButtonElement | null;
const btnCerrar = document.getElementById('mapa-cerrar') as HTMLButtonElement | null;

const DEM_URL = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';
const ATRIB = [
  'Datos: <a href="https://www.miteco.gob.es/" target="_blank" rel="noopener">MITECO</a> (<a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noopener">CC BY 4.0</a>)',
  'Relieve: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles (AWS)</a> con datos de USGS (SRTM, GMTED2010), NOAA (ETOPO1) y Copernicus (EU-DEM)',
];
const N = (n: number, d = 1) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const NOMBRES = ['casi seco', 'muy bajo', 'bajo', 'medio', 'alto', 'muy alto'];

function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

async function arrancar() {
  if (!caja || !lienzo || !svgWrap || !panel || !aviso || !ctl || !btnPlano || !btnCerrar || !hayWebGL()) return;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = (ms: number) => (reducido ? 0 : ms);
  try {
    const [mod, datos] = await Promise.all([
      import('maplibre-gl'),
      fetch('/geo/mapa.json').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ]);
    // maplibre-gl 6 ships named ESM exports only; older builds expose a default
    const ml = ((mod as { default?: typeof mod }).default ?? mod) as typeof mod;
    ml.setWorkerUrl('/maplibre-gl-worker.mjs');
    const dem = datos.dem as GeoJSON.FeatureCollection;
    const puntos = datos.puntos as GeoJSON.FeatureCollection;
    const orden = Array.from(svgWrap.querySelectorAll('path[data-c]')).map((p) => p.getAttribute('data-c')!);
    const feat = (c: string) => dem.features.find((f) => f.properties!.codigo === c)!;

    const bbox = (fs: GeoJSON.Feature[]): LngLatBoundsLike => {
      let a = 180, b = 90, c = -180, d = -90;
      const rec = (x: any): void => { if (typeof x[0] === 'number') { a = Math.min(a, x[0]); c = Math.max(c, x[0]); b = Math.min(b, x[1]); d = Math.max(d, x[1]); } else x.forEach(rec); };
      fs.forEach((f) => rec((f.geometry as any).coordinates));
      return [[a, b], [c, d]];
    };
    const todo = bbox(dem.features);
    const pad = { top: 24, bottom: 24, left: 24, right: 24 };
    const css = (n: string) => getComputedStyle(lienzo).getPropertyValue(n).trim();
    const colores = () => ({
      cls: ['match', ['get', 'cls'], 0, css('--agua-0'), 1, css('--agua-1'), 2, css('--agua-2'), 3, css('--agua-3'), 4, css('--agua-4'), 5, css('--agua-5'), '#888'] as any,
      mar: css('--mar'), tinta: css('--tinta'), fondo: css('--fondo'), borde: css('--agua-borde'),
    });
    const c = colores();
    // Máscara de mar: el hillshade del DEM dibujaría el fondo marino; se tapa fuera de España
    const anillos: number[][][] = [];
    for (const ft of dem.features) { const g = ft.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon; for (const poly of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) anillos.push(poly[0]); }
    const mascara: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-30, -80], [60, -80], [60, 80], [-30, 80], [-30, -80]], ...anillos] } };
    const rad = (k: number) => ['interpolate', ['linear'], ['get', 'cap'], 0, 2 * k, 50, 3.5 * k, 500, 6 * k, 2000, 9 * k] as any;

    lienzo.hidden = false;
    const map: GLMap = new ml.Map({
      container: lienzo,
      style: {
        version: 8,
        sources: {
          relieve: { type: 'raster-dem', tiles: [DEM_URL], tileSize: 256, maxzoom: 10, encoding: 'terrarium', attribution: '' },
          sombras: { type: 'raster-dem', tiles: [DEM_URL], tileSize: 256, maxzoom: 10, encoding: 'terrarium', attribution: '' },
          mascara: { type: 'geojson', data: mascara },
          dem: { type: 'geojson', data: dem },
          emb: { type: 'geojson', data: puntos },
        },
        layers: [
          { id: 'mar', type: 'background', paint: { 'background-color': c.mar } },
          { id: 'sombras', type: 'hillshade', source: 'sombras', paint: { 'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#0a1a2a', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#0a1a2a' } },
          { id: 'mascara', type: 'fill', source: 'mascara', paint: { 'fill-color': c.mar } },
          { id: 'dem-fill', type: 'fill', source: 'dem', paint: { 'fill-color': c.cls, 'fill-opacity': 0.82 } },
          { id: 'dem-linea', type: 'line', source: 'dem', paint: { 'line-color': c.fondo, 'line-width': 1.2 } },
          { id: 'dem-linea0', type: 'line', source: 'dem', filter: ['==', ['get', 'cls'], 0], paint: { 'line-color': c.borde, 'line-width': 1.5 } },
          { id: 'sel-ext', type: 'line', source: 'dem', filter: ['==', ['get', 'codigo'], ''], layout: { 'line-join': 'round' }, paint: { 'line-color': c.tinta, 'line-width': 6 } },
          { id: 'sel-int', type: 'line', source: 'dem', filter: ['==', ['get', 'codigo'], ''], layout: { 'line-join': 'round' }, paint: { 'line-color': c.fondo, 'line-width': 2.5 } },
          { id: 'puntos', type: 'circle', source: 'emb', paint: {
            'circle-color': c.cls, 'circle-opacity': 0.95,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, rad(0.8), 9, rad(1.6)] as any,
            'circle-stroke-color': ['case', ['==', ['get', 'cls'], 0], c.borde, c.fondo] as any, 'circle-stroke-width': 1.25 } },
        ],
      },
      bounds: todo, fitBoundsOptions: { padding: pad }, pitch: 45, bearing: -8, maxPitch: 65,
      keyboard: false, attributionControl: false, cooperativeGestures: false,
    });
    // fitting bounds at 45° pitch leaves the peninsula small: fit flat, then zoom in a bit and tilt
    const cam = map.cameraForBounds(todo, { padding: pad });
    if (cam) map.jumpTo({ ...cam, zoom: (cam.zoom ?? 5) + 0.45, pitch: 45, bearing: -8 });
    map.addControl(new ml.AttributionControl({ compact: true, customAttribution: ATRIB }), 'bottom-right');
    map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-left');


    // Los colores del agua cambian con el modo claro/oscuro
    const pintar = () => {
      const n = colores();
      map.setPaintProperty('mar', 'background-color', n.mar);
      map.setPaintProperty('mascara', 'fill-color', n.mar);
      map.setPaintProperty('dem-fill', 'fill-color', n.cls);
      map.setPaintProperty('dem-linea', 'line-color', n.fondo);
      map.setPaintProperty('dem-linea0', 'line-color', n.borde);
      map.setPaintProperty('sel-ext', 'line-color', n.tinta);
      map.setPaintProperty('sel-int', 'line-color', n.fondo);
      map.setPaintProperty('puntos', 'circle-color', n.cls);
      map.setPaintProperty('puntos', 'circle-stroke-color', ['case', ['==', ['get', 'cls'], 0], n.borde, n.fondo] as any);
    };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => requestAnimationFrame(pintar));

    // ---- Selección de demarcación ----
    let popup: import('maplibre-gl').Popup | null = null;
    let cursor = -1;    // demarcación resaltada con el teclado
    let abierta = '';   // demarcación con el panel abierto
    const anunciar = (t: string) => { aviso.textContent = t; };
    const resaltar = (cod: string) => {
      for (const id of ['sel-ext', 'sel-int']) map.setFilter(id, ['==', ['get', 'codigo'], cod]);
    };
    const mostrarPanel = (cod: string) => {
      Array.from(panel.children).forEach((x) => { (x as HTMLElement).hidden = x.getAttribute('data-p') !== cod; });
    };
    const textoZona = (cod: string) => {
      const p = feat(cod).properties!;
      return `${p.nombre}: ${p.pct == null ? 'sin dato' : N(p.pct) + ' %, nivel ' + NOMBRES[p.cls]}`;
    };
    const listaEmbalses = (cod: string) => {
      const bloque = panel.querySelector(`[data-p="${cod}"]`);
      if (!bloque || bloque.querySelector('.todos')) return;
      const lista = puntos.features.filter((f) => f.properties!.dem === cod)
        .sort((a, b) => b.properties!.cap - a.properties!.cap);
      if (!lista.length) return;
      bloque.querySelectorAll('ul, p.peq').forEach((x) => x.remove());
      const t = document.createElement('p'); t.className = 'peq todos';
      t.textContent = `Embalses de la zona, de mayor a menor capacidad (${lista.length}):`;
      const ul = document.createElement('ul'); ul.className = 'todos-lista';
      for (const f of lista) {
        const li = document.createElement('li');
        const a = document.createElement('a'); a.href = `/embalse/${f.properties!.slug}`; a.textContent = f.properties!.nombre;
        const s = document.createElement('span'); s.className = 'cifra'; s.textContent = ` ${N(f.properties!.pct)} %`;
        li.append(a, ',', s); ul.append(li);
      }
      bloque.append(t, ul);
    };
    const abrir = (cod: string) => {
      const i = orden.indexOf(cod); if (i < 0) return;
      cursor = i; abierta = cod; popup?.remove();
      resaltar(cod); listaEmbalses(cod); mostrarPanel(cod);
      btnCerrar.hidden = false;
      map.fitBounds(bbox([feat(cod)]), { padding: pad, duration: dur(900) });
      anunciar(`${textoZona(cod)}. Panel de detalle abierto.`);
    };
    const cerrar = () => {
      abierta = ''; popup?.remove(); resaltar(''); mostrarPanel(''); btnCerrar.hidden = true;
      map.fitBounds(todo, { padding: pad, duration: dur(700) });
      anunciar('Detalle cerrado. Vista de toda la península.');
    };

    // ---- Popup de embalse ----
    const abrirEmbalse = (f: GeoJSON.Feature, lngLat: [number, number]) => {
      const p = f.properties!;
      const cuerpo = document.createElement('div'); cuerpo.className = 'pop';
      const h = document.createElement('strong'); h.textContent = p.nombre;
      const v = document.createElement('p'); v.textContent = `${N(p.pct)} % lleno, ${NOMBRES[p.cls]}`;
      const a = document.createElement('a'); a.href = `/embalse/${p.slug}`; a.textContent = 'Ver el embalse';
      cuerpo.append(h, v, a);
      popup?.remove();
      popup = new ml.Popup({ closeButton: true, maxWidth: '16rem', offset: 8 }).setLngLat(lngLat).setDOMContent(cuerpo).addTo(map);
    };

    map.on('click', (e) => {
      const pt = map.queryRenderedFeatures(e.point, { layers: ['puntos'] })[0];
      if (pt) { abrirEmbalse(pt, (pt.geometry as GeoJSON.Point).coordinates as [number, number]); return; }
      const d = map.queryRenderedFeatures(e.point, { layers: ['dem-fill'] })[0];
      if (d) abrir(d.properties!.codigo);
    });
    for (const capa of ['puntos', 'dem-fill']) {
      map.on('mouseenter', capa, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', capa, () => { map.getCanvas().style.cursor = ''; });
    }

    // ---- Teclado: el lienzo es un único punto de tabulación ----
    lienzo.addEventListener('keydown', (e) => {
      if (e.target !== lienzo) return;
      const n = orden.length; let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (cursor + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (cursor - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      else if (e.key === 'Enter' || e.key === ' ') { if (cursor >= 0) { e.preventDefault(); abrir(orden[cursor]); } return; }
      else if (e.key === 'Escape') { if (abierta) { e.preventDefault(); cerrar(); } else if (popup) { e.preventDefault(); popup.remove(); } return; }
      if (j < 0) return;
      e.preventDefault(); cursor = j; resaltar(orden[j]);
      anunciar(`${textoZona(orden[j])}. Pulsa Intro para abrir el detalle.`);
    });
    btnCerrar.addEventListener('click', cerrar);

    // ---- Vista plana / 3D ----
    let en3d = true;
    btnPlano.addEventListener('click', () => {
      en3d = !en3d;
      map.setTerrain(en3d ? { source: 'relieve', exaggeration: 1.3 } : null);
      map.easeTo({ pitch: en3d ? 45 : 0, bearing: en3d ? -8 : 0, duration: dur(800) });
      btnPlano.textContent = en3d ? 'Vista plana' : 'Vista 3D';
      btnPlano.setAttribute('aria-pressed', String(!en3d));
      anunciar(en3d ? 'Vista 3D con relieve.' : 'Vista plana.');
    });

    const volverASVG = () => {
      try { map.remove(); } catch { /* ya estaba quitado */ }
      lienzo.hidden = true; ctl.hidden = true; caja.classList.remove('gl-activo');
    };
    map.once('load', () => {
      map.setTerrain({ source: 'relieve', exaggeration: 1.3 });
      ctl.hidden = false; caja.classList.add('gl-activo');
    });
    // Un error en las capas base (no en las teselas de relieve) devuelve al SVG
    map.on('error', (ev) => { console.warn('[mapa] error', (ev as { error?: Error }).error?.message, (ev as { sourceId?: string }).sourceId); if (!map.loaded() && !(ev as { sourceId?: string }).sourceId) volverASVG(); });
    // Sin conexión al relieve, el mapa sigue funcionando sin él

  } catch (err) {
    console.warn('[mapa] MapLibre no disponible; se mantiene el SVG', err);
    lienzo.hidden = true; ctl.hidden = true;
  }
}

function cuandoToque() {
  if (!caja) return;
  const lanzar = () => { void arrancar(); };
  const idle = () => ('requestIdleCallback' in window
    ? (window as unknown as { requestIdleCallback: (f: () => void, o: object) => void }).requestIdleCallback(lanzar, { timeout: 3000 })
    : setTimeout(lanzar, 1200));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); idle(); } }, { rootMargin: '200px' });
    io.observe(caja);
  } else idle();
}
cuandoToque();
