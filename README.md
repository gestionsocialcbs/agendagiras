# Agenda de Giras

Herramienta web para elaborar la **Agenda de visita de acompañamiento** (agenda de giras) del Titular de la Unidad de Prestaciones Sociales a Unidades Operativas del IMSS y exportarla a Word (.docx) conservando el encabezado y pie de página institucionales.

## Qué hace

- Captura de datos generales, participantes (DPES y personal de uno o varios OOAD) y actividades por día: vuelos, traslados, recorridos, reuniones, comidas y check-in.
- Calcula horarios y traslados automáticamente y muestra una vista previa de la ficha.
- Mapa de recorridos: generado con calles reales mediante el conector de Mapbox (arrastrar, zoom con la rueda y centrar), captura de Google Maps pegada, o recuadro en blanco.
- Exporta el documento .docx a partir de la plantilla oficial.

## Estructura

- `index.html`: interfaz y estilos (paleta Gobierno de México, Noto Sans).
- `app.js`: lógica de la interfaz, mapa y exportación.
- `docgen.js`: cálculo de la agenda y generación del .docx (JSZip).
- `data/`: catálogo de unidades y OOAD, plantilla Word (base64) y contornos de estados.
- `config.example.js`: plantilla del token público de Mapbox; copiarla como `config.js` (no se sube al repositorio).
- `leaflet.css`: estilos de Leaflet (el mapa interactivo vectorial ya no se usa en pantalla).

## Uso

Se publica como artefacto de Claude; la generación del mapa con Mapbox requiere el conector de Mapbox. Para uso local basta servir la carpeta con cualquier servidor estático (`python3 -m http.server`); la carga de JSZip y Leaflet requiere internet.
