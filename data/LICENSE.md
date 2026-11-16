# Licencias de los datos

El código de este repositorio se publica bajo MIT (`../LICENSE`). **Los datos no están cubiertos por esa licencia.** Ver `docs/adr/0002-licencias-mit-y-cc-by.md`.

| Carpeta | Condiciones |
|---|---|
| `data/raw/` | Datos originales del **Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)**, sin modificar. Mantienen las condiciones de su fuente: condiciones generales de reutilización de la Ley 37/2007 y del RD 1495/2011 (Boletín Hidrológico) y [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es) (capas del Inventario de Presas y de demarcaciones). El detalle por fuente está en `docs/reutilizacion-atribucion.md`. |
| `data/master/`, `data/geo/` | Datos derivados, bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es). Al reutilizarlos hay que citar este proyecto **y** al MITECO como origen de los datos ("Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico") e indicar la fecha de actualización. Las geometrías de `data/geo/` están **simplificadas** y no tienen valor oficial. |

Los datos del Boletín Hidrológico son provisionales según el propio MITECO.
