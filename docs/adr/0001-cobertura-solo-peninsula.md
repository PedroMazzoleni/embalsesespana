# 0001 — Cobertura: solo embalses peninsulares

- Fecha: 2026-11-17
- Estado: aceptada
- Decide: titular del proyecto

## Contexto

La fuente principal, el histórico de reserva del Boletín Hidrológico del MITECO (`BD-Embalses.zip`), solo incluye embalses **peninsulares** por encima de un umbral de capacidad, con serie semanal desde el inicio del histórico. Los valores exactos están documentados en `docs/contrato-datos.md` y en la web se importan de los datos. Para Baleares y Canarias habría que integrar otras fuentes, de las administraciones autonómicas e insulares, con frecuencia y formato distintos. Según una revisión rápida, sin verificar a fondo, no ofrecen un histórico homogéneo comparable.

## Decisión

El proyecto cubre **solo los embalses peninsulares** que publica el MITECO en el Boletín Hidrológico. No se planea ampliar a las islas.

## Consecuencias

- El denominador del % de emparejados de la tabla maestra (Fase 0) son los embalses del histórico del MITECO. Las presas insulares del Inventario se descartan al cruzar.
- Las demarcaciones de Baleares, Canarias, Ceuta y Melilla se excluyen del mapa y de los totales.
- La web debe decir con claridad que los datos son de la **reserva peninsular** del MITECO, para no prometer más de lo que da el título "Embalses de España". El texto exacto lo redacta `editorial` y la cobertura se importa de los datos, no se escribe a mano.
