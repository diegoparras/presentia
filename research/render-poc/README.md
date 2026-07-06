# render-poc — pruebas de concepto del motor de render

Prototipos y harness de verificación que respaldan el plan de performance del
motor de render de Presentia (editor veloz, export sin navegador, PPTX nativo
editable, website responsive). **No es código de producción**: es evidencia
reproducible para tomar decisiones e implementar por fases.

Rama de trabajo: `chore/render-poc` (separada de `main`, solo para probar).

## Hallazgos medidos (en un sandbox Linux, no teoría)

| Tema | Resultado |
|---|---|
| **PDF sin navegador (WeasyPrint 69)** | 0.15–0.23 s/slide vs Chromium 0.57–1.7 s (**4–10× más rápido**); PDF vectorial 10–18 KB vs 75–83 KB. |
| **Fidelidad WeasyPrint vs Chromium** | grid + gráfico SVG: **2.3%** de diferencia de píxeles (idéntica). Flexbox anidado: **32.7%** (se rompe). La misma slide con grid: **0.6%** (pixel-perfect). |
| **PPTX nativo (python-pptx)** | Cobertura: tabla **100% nativo**, dashboard **75% nativo + 25% aprox** (gradientes→sólido), **0% fallback-imagen**. Gráfico y tabla **editables**, texto seleccionable, 29–35 KB (vs screenshots del PPTX actual). |

Conclusión: se puede desprender a Chromium del camino crítico **si** el HTML
congelado usa CSS que el motor liviano soporta (grid/absoluto, no flexbox
anidado frágil) y los gráficos son SVG. El PPTX pasa de "screenshot en una caja"
a formas nativas editables desde el mismo JSON del slide.

## Estructura

- `prototypes/` — generadores y fixtures del pipeline "una escena, muchos renderers":
  - `extract_scene.js` — extractor headless: slide renderizada → escena estructurada (JSON).
  - `build_pptx.py` — escena JSON → PPTX **nativo** editable; reporta cobertura nativo/aprox/fallback.
  - `render_bench.py` — WeasyPrint vs Chromium: tiempo + diff de píxeles + comparativo PNG.
  - `slide_*.html`, `real_*.html` — slides "congeladas" de ejemplo (intro flex vs grid, chart, tabla, dashboard).
  - `real_*.scene.json` — escenas ya extraídas.
- `local-verify/` — harness para correr Presentia localmente y verificar cambios de UI:
  - `seed.py` — siembra una presentación de 40 slides (sin LLM) para probar el editor.
  - `drive.js` — puppeteer: carga el editor, cuenta slides, reporta errores de consola, screenshot.
  - `README.md` — receta completa de arranque (backend + frontend + los trucos que hacen falta).
- `samples/` — salidas curadas como documentación visual:
  - `real_dashboard.pptx`, `native_chart.pptx` — **abrí en PowerPoint**: gráfico y tabla editables.
  - `compare_chart.png`, `compare_intro.png`, `compare_intro2.png` — WeasyPrint (abajo) vs Chromium (arriba).
  - `pptx_recon_real_dashboard.png` — original vs escena extraída.

## Cómo reproducir

Prototipos (rápido, sin la app):
```bash
pip install weasyprint pymupdf pillow python-pptx numpy
cd prototypes
python render_bench.py slide_intro.html slide_intro2.html slide_chart.html   # WeasyPrint vs Chromium
npm i puppeteer-core                                                          # solo para extract_scene
node extract_scene.js real_dashboard.html real_dashboard.scene.json
python build_pptx.py real_dashboard.scene.json out.pptx                       # PPTX nativo + cobertura
```

Verificación en la app corriendo: ver `local-verify/README.md`.
