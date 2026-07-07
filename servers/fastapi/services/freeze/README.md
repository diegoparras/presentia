# Freeze service — export sin navegador (Fase 3)

Pipeline que reemplaza la rasterización de slides en Chromium headless por un
render **vectorial** (PDF) y **nativo editable** (PPTX) a partir de una única
pasada de congelado.

```
JSON del slide + tema
        │
        ▼
  freeze_driver.cjs   ← ÚNICA pasada headless: inyecta freeze_extractor.js en /pdf-maker
        │              (los charts ya son SVG tras la Fase 2; no hay <canvas>)
        ▼
   frozen.json  =  [{ html, scene }, ...]   (una entrada por slide)
        │
        ├─▶ weasy_pdf.py   → PDF vectorial (WeasyPrint, sin navegador)
        └─▶ build_pptx.py  → PPTX con texto/formas/imágenes NATIVOS editables (python-pptx)
```

## Por qué funciona

`freeze_extractor.js` **aplana** el DOM vivo de cada slide a HTML **posicionado en
absoluto** leyendo `getBoundingClientRect` + `getComputedStyle` de cada elemento.
Al ser absoluto, desaparece toda dependencia de flex/grid anidado —el punto donde
WeasyPrint difería del navegador (32.7% vs 2.3% en el PoC)— y el HTML congelado
rasteriza igual que el browser pero vectorial y con texto seleccionable.

- **Charts**: se clona el SVG resolviendo `var(--graph-N)`/`currentColor` a colores
  concretos (el wrapper de tema se pierde al aplanar), así WeasyPrint los pinta bien.
- **Texto**: se emite en el ancestro inline más alto preservando formato inline
  (negritas/spans con color), evitando fragmentos absolutos superpuestos.
- **Escena IR** (`scene`): geometría + estilos + datos, insumo del PPTX nativo.

## Uso

```bash
# 1) Congelar (una pasada headless)
NODE_PATH=<node_modules_con_puppeteer-core> \
  node freeze_driver.cjs <presentationId> frozen.json [baseUrl] [fastapiUrl] [chromePath]

# 2) PDF vectorial (sin navegador)
python3 weasy_pdf.py frozen.json out.pdf

# 3) PPTX con texto/formas nativos editables (charts como imagen)
python3 build_pptx.py frozen.json out.pptx
```

## PPTX: nativo vs el export actual

El export actual rasteriza **cada slide entero** a una imagen (no editable). Acá,
cada bloque de la escena IR se emite como objeto **nativo de PowerPoint**:

| Bloque | PPTX |
|---|---|
| texto | textbox nativo (fuente, tamaño, negrita, color, alineación) — **editable** |
| rect / card | autoshape (rect / rounded-rect) con relleno — **editable** |
| imagen local | picture nativa |
| chart / arte SVG | PNG nítido capturado en la pasada de freeze |

Medido en el deck de 41 slides: **222 objetos nativos-editables** (155 formas +
67 textboxes) + 54 charts-imagen; PPTX válido de 124 KB (round-trip con
python-pptx OK). La reconstrucción de charts a **gráfico nativo editable**
(datos → chart de PowerPoint) es un follow-up por template.

## Medido en este entorno (deck real de 41 slides, 54 charts SVG)

| Etapa | Tiempo | Salida |
|---|---|---|
| Freeze (1 pasada headless) | ~14 s (mayormente overhead fijo del dev-render) | frozen.json 176 KB |
| WeasyPrint PDF | **1.97 s** (~0.048 s/slide) | PDF vectorial 88 KB, 41 páginas |

Chromium PDF de referencia: 0.57–1.7 s **por slide**. → 4–10× más rápido y vectorial.

## Pendiente

- **Embeber fuentes** (`@font-face`) en el HTML congelado: hoy WeasyPrint cae a la
  fuente por defecto y el texto reflowa levemente (métricas distintas). Con las
  fuentes embebidas el PDF queda pixel-perfect. Idem `font.name` ya se guarda en el
  PPTX (PowerPoint usa la fuente correcta si está instalada).
- **Charts nativos en PPTX**: reconstruir datos (categorías/series) → gráfico nativo
  editable de PowerPoint, por template (hoy van como imagen nítida).
- **Imágenes remotas**: al integrar al backend, las imágenes viven en `/app_data`
  (disco), así que se embeben nativas; en el modo standalone sin red se saltan.
- **Integración**: exponer como modo de export en `export_task_service.py` detrás de
  un flag, manteniendo el PPTX-imagen/Chromium actual como fallback.
