<div align="center">

<img src="../../servers/nextjs/public/presentia-logo.svg" alt="Presentia" width="96">

# Presentia

**Decks desde documentos, datos y markdown.**

Un generador de presentaciones con IA, open source y self‑hosted — el satélite de
decks de la **[Suite Escriba](https://getescriba.com)**. Transformá un **prompt, un
documento, un dataset o un markdown** en una presentación editable y exportala a
**PPTX o PDF**. Sobre su upstream ([Presenton](https://github.com/presenton/presenton))
suma **gráficos que no pueden alucinar** (cada cifra se valida contra tus datos), un
**panel de costos LLM por deck**, un **gateway opcional de anonimización de PII**, un
**selector guiado de modelos** (una key de OpenRouter habilita todo el catálogo) y
una interfaz en **7 idiomas**.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-e25a4e.svg)](../../LICENSE)
[![Fork de Presenton](https://img.shields.io/badge/fork%20de-Presenton-8b5cf6.svg)](https://github.com/presenton/presenton)
[![UI: 7 idiomas](https://img.shields.io/badge/UI-7%20idiomas-ef8175.svg)](#-internacionalización)
![Self-hosted](https://img.shields.io/badge/self--hosted-✓-30d158.svg)
[![Suite Escriba](https://img.shields.io/badge/Suite%20Escriba-satélite-e06a3a.svg)](https://getescriba.com)

[English](../../README.md) · **Español**

</div>

---

## ✨ Qué hace

- 🎤 **Prompt → deck** — describí el tema, revisá el outline generado, elegí una plantilla y obtené la presentación completa: layouts, texto e imágenes, lista para retocar en un editor completo con asistente de IA.
- 📄 **Documentos → deck** — subí PDF, Word, PowerPoint, planillas, imágenes o texto plano y armá el deck desde su contenido. Opcionalmente el parsing se delega a [Escriba](https://github.com/diegoparras/escriba) para la mejor conversión con OCR ([ver abajo](#-integración-con-la-suite-escriba)).
- 🧾 **Markdown → deck (modo Gamma)** — pegá o arrastrá un `.md`: cada sección separada por `---` o por encabezados `#`/`##` se convierte en una tarjeta. Tres modos de texto: **Preservar** (tu texto viaja tal cual; la IA solo elige layouts y genera imágenes), **Condensar** (resume) y **Generar** (reescribe y expande). Con **editor de markdown integrado**: toolbar, vista previa en vivo por tarjeta y drag & drop.
- 📊 **Gráficos anclados a tus datos** — generá un deck desde un dataset CSV/TSV/JSON. Cada cifra de cada gráfico se **valida contra el dataset**: tiene que existir en los datos o ser un agregado exacto de columna (suma, promedio, mínimo, máximo, conteo). Si el modelo inventa una cifra, se reintenta con feedback; si insiste, el slide se rechaza. Gráficos alucinados: cero.
- 💸 **Panel de costos LLM** — cada llamada al modelo queda registrada y atribuida a su presentación, etapa y slide, con un catálogo de precios versionado. Mirá cuánto costó realmente cada deck y compará proveedores.
- 🧭 **Selector guiado de modelos** — modelos rankeados por calidad curada y precio combinado, con badges *Mejor calidad* / *Mejor precio‑calidad* / *Más económico*. **Una key de OpenRouter habilita casi todo el catálogo**; cambiar de modelo es un click.
- 🛡️ **Gateway de PII (opcional)** — con [Anonimal](https://github.com/diegoparras/anonimal) activo, el contenido del usuario y el texto extraído de documentos se anonimizan **antes** de llegar al proveedor de LLM. **Fail‑closed**: si el anonimizador no responde, la generación se corta en vez de filtrar PII cruda.
- 🔎 **Búsqueda web** — fundamentá las generaciones con [Searchgirl](https://getescriba.com) (la metabúsqueda privada de la suite), SearXNG, Tavily, Exa o Brave — o usá el grounding nativo del modelo.
- 🤖 **Traé tu propio modelo** — OpenAI, Anthropic, Google, DeepSeek, OpenRouter, **Ollama / LM Studio (local)**, LiteLLM, Azure OpenAI, AWS Bedrock, Google Vertex o cualquier endpoint compatible con OpenAI.
- 🖼️ **Imágenes a tu manera** — GPT Image 1.5, DALL‑E 3, Gemini Flash, **ComfyUI (local)**, stock gratuito de Pexels/Pixabay, o sin imágenes. Con instrucciones de estilo por deck ("fotorrealista", "line art minimalista"…).
- 🎨 **Plantillas y temas** — familias integradas (General, Modern, Standard, Swift, Report con gráficos, **Institucional** en es‑AR), plantillas personalizadas generadas desde tu propio PPTX, editor de temas completo (colores, fuentes, logo) y `style_instructions` por plantilla que moldean el tono de escritura.
- 🌍 **7 idiomas de interfaz** — English, Español, Français, Português, Italiano, 中文, 日本語 — cambiables desde el sidebar, recordados por navegador.
- 🔒 **Self‑hosted y privado** — login integrado, SQLite por defecto (PostgreSQL vía `DATABASE_URL`), tus keys y tu contenido nunca salen de tu servidor.

---

## 🚀 Arranque rápido

```bash
git clone https://github.com/diegoparras/presentia.git
cd presentia
docker compose up -d --build production
```

Abrí **http://localhost:5001**, creá tu login y elegí un proveedor de texto en el
onboarding — una **API key de OpenRouter** es la forma más rápida de habilitar todos
los modelos del catálogo de una.

> **¿Host con GPU?** `docker compose up -d --build production-gpu` activa la
> aceleración NVIDIA para modelos locales. El puerto se cambia con
> `PRESENTON_HTTP_HOST_PORT`.

---

## ⚙️ Configuración

Todo se configura **desde la UI de Ajustes** — las variables de entorno son para
deploys headless o con keys bloqueadas. Las más útiles:

| Variable | Default | Descripción |
|---|---|---|
| `LLM` | — | Proveedor de texto: `openai`, `anthropic`, `google`, `deepseek`, `openrouter`, `ollama`, `lmstudio`, `litellm`, `azure_openai`, `bedrock`, `vertex`, `custom`. |
| `<PROVEEDOR>_API_KEY` / `<PROVEEDOR>_MODEL` | — | Credenciales y modelo por proveedor (ej. `OPENROUTER_API_KEY` + `OPENROUTER_MODEL=openai/gpt-4o`). |
| `IMAGE_PROVIDER` | — | `gpt-image-1.5`, `dall-e-3`, `gemini_flash`, `pexels`, `pixabay`, `comfyui`. |
| `WEB_GROUNDING` / `WEB_SEARCH_PROVIDER` | off | Búsqueda web: `searchgirl`, `searxng`, `tavily`, `exa`, `brave` o `auto` (nativa del modelo). |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | — | Precargar el login en vez del formulario inicial. |
| `CAN_CHANGE_KEYS` | `true` | `false` bloquea la edición de API keys desde la UI. |
| `DATABASE_URL` | SQLite | Apuntá a PostgreSQL para deploys multiusuario. |
| `DATASET_MAX_ROWS` | `200` | Tope de filas del endpoint de gráficos desde datos. |
| `DISABLE_ANONYMOUS_TRACKING` | — | `true` desactiva la telemetría anónima del upstream. |

La matriz completa de proveedores (Azure, Bedrock, Vertex, ComfyUI, Codex OAuth,
memoria semántica Mem0…) está en [`docker-compose.yml`](../../docker-compose.yml).

---

## 🧩 Integración con la Suite Escriba

Presentia funciona **standalone** — sin estas variables se comporta exactamente
como Presenton vanilla. Cada integración es opcional e independiente; el
[`docker-compose.yml`](../../docker-compose.yml) trae bloques de servicio comentados
para todas.

<details open>
<summary><b>📄 Escriba — parsing de documentos con OCR</b></summary>

Delega la conversión documento → markdown a un servicio
[Escriba](https://github.com/diegoparras/escriba) (PDFs escaneados, páginas rotadas,
imágenes, más de 20 formatos). Si Escriba está caído o falla con un archivo,
Presentia **cae automáticamente** a sus parsers locales.

| Variable | Default | Descripción |
|---|---|---|
| `ESCRIBA_ENABLED` | `false` | Activa el adaptador |
| `ESCRIBA_URL` | — | URL base, ej. `http://escriba:8000` |
| `ESCRIBA_API_TOKEN` | — | `API_TOKEN` de Escriba (viaja como `X-API-Key`) |
| `ESCRIBA_TIMEOUT` | `600` | Timeout de conversión (segundos) |
</details>

<details>
<summary><b>🛡️ Anonimal — anonimización de PII antes del LLM</b></summary>

Con [Anonimal](https://github.com/diegoparras/anonimal) activo, los prompts del
usuario y el texto extraído de documentos se anonimizan **antes** de viajar al
proveedor de LLM (y antes de indexarse en la memoria semántica). **Fail‑closed**: si
el servicio no responde, la generación se corta con un error claro en vez de mandar
PII cruda. El texto original nunca sale de tu host.

| Variable | Default | Descripción |
|---|---|---|
| `ANONIMAL_ENABLED` | `false` | Activa el sidecar |
| `ANONIMAL_URL` | — | URL base, ej. `http://anonimal:8000` |
| `ANONIMAL_TOKEN` | — | Token de servicio si se exige (`X-Anonimal-Token`) |
| `ANONIMAL_MODE` | `pseudo` | `typed`, `anon`, `pseudo` (reversible), `mask`, `hash` |
| `ANONIMAL_ENGINE` | `auto` | `lite` (regex, instantáneo) o `ml` (NER: nombres, direcciones) |
| `ANONIMAL_TIMEOUT` | `120` | Timeout (segundos) |
</details>

<details>
<summary><b>🔎 Searchgirl — la metabúsqueda privada de la suite</b></summary>

Elegí **Searchgirl** como proveedor de búsqueda web para fundamentar las
generaciones a través de tu propia instancia de metabúsqueda en vez de una API de
terceros.

| Variable | Default | Descripción |
|---|---|---|
| `WEB_SEARCH_PROVIDER` | — | Poné `searchgirl` |
| `SEARCHGIRL_BASE_URL` | — | ej. `http://host.docker.internal:8089` |
| `SEARCHGIRL_API_TOKEN` | — | Bearer token (coincide con el `SEARCHGIRL_MCP_TOKEN` de Searchgirl), opcional si la instancia es abierta |
</details>

---

## 🧾 Markdown → deck (modo Gamma)

La página **Markdown** trae un editor completo — toolbar, vista previa en vivo que
muestra exactamente cómo se corta tu texto en tarjetas, contador de tarjetas, drag &
drop — más selectores de plantilla, idioma, fuente/estilo de imágenes y exportación.
El mismo poder está disponible por API:

```bash
curl -X POST http://localhost:5001/api/v1/ppt/presentation/generate-from-markdown \
  -H "Content-Type: application/json" \
  -d '{
        "markdown": "# Informe Q3\nIntro...\n\n---\n\n## Resultados\n- Ingresos +20%",
        "text_mode": "preserve",
        "template": "general",
        "export_as": "pptx"
      }'
```

| `text_mode` | Qué pasa |
|---|---|
| `preserve` | Tu texto entra al deck **tal cual** — la IA solo elige layouts y genera imágenes |
| `condense` | La IA resume cada tarjeta manteniendo su estructura |
| `generate` | La IA reescribe y expande cada tarjeta |

---

## 📊 Gráficos desde datos reales

`POST /api/v1/ppt/presentation/generate-from-data` arma un deck desde un dataset
CSV, TSV o JSON (multipart: `file`, más `content`, `n_slides`, `language`,
`template`, `instructions`, `export_as`). El guard anti‑alucinación chequea **cada
cifra de cada gráfico** contra el dataset — solo valores exactos o agregados exactos
de columna; una cifra ajena recibe un reintento con feedback y, si el modelo
insiste, el slide se rechaza.

```bash
curl -X POST http://localhost:5001/api/v1/ppt/presentation/generate-from-data \
  -F "file=@resumen_mensual.csv" \
  -F "content=Informe mensual de conciliación" \
  -F "n_slides=6" -F "language=Spanish" -F "export_as=pdf"
```

El dataset se espera ya agregado (por ejemplo, un resumen de conciliación); el tope
es `DATASET_MAX_ROWS` (default 200). La plantilla por defecto es **Report**, que
trae los layouts con gráficos.

---

## 💸 Costos y 🧭 Modelos

Dos páginas del dashboard que el upstream no tiene:

- **Modelos** — el catálogo de modelos de texto e imágenes con puntos de calidad
  curados, precio combinado por millón de tokens, disponibilidad calculada según
  *tus* keys y badges de recomendación. Un click en la tarjeta cambia el modelo; con
  una key de OpenRouter se enciende casi todo de una.
- **Costos** — tarjetas de resumen (llamadas, tokens de entrada/salida, costo
  estimado) y desgloses por deck: etapa, slide y modelo, más una tabla comparativa
  por proveedor. Los precios salen de un catálogo versionado en el repo, así que el
  historial de costos es auditable.

---

## 🌍 Internacionalización

Toda la interfaz — panel, onboarding, ajustes, bibliotecas de plantillas y temas, el
editor de presentaciones y su asistente de IA — viene en **7 idiomas**: English,
Español, Français, Português, Italiano, 中文, 日本語. Se cambia desde el selector del
sidebar y la elección se recuerda por navegador.

---

## 💻 Desarrollo

```bash
docker compose up -d --build development   # hot reload de los dos servers
```

Tests del backend (el fork suma más de 100 tests unitarios sobre sus features):

```bash
cd servers/fastapi
python -m pytest tests/unit
```

El mapa del código — servicios, seams, flujo de requests y dónde vive cada feature
del fork — está en [`docs/ARQUITECTURA.md`](../ARQUITECTURA.md).

---

## 📜 Créditos y licencia

**Presentia** es un fork de **[Presenton](https://github.com/presenton/presenton)**
— un excelente generador open source de presentaciones con IA del
[equipo de Presenton](https://presenton.ai) ([docs](https://docs.presenton.ai)).
Toda la maquinaria central de generación es de ellos; el fork agrega las
integraciones con la Suite Escriba, el guard de gráficos anclados a datos, el panel
de costos, el selector de modelos, el editor de markdown, la capa de i18n y el
branding de la suite.

Mantenido por **Diego Parras** como parte de la **[Suite Escriba](https://getescriba.com)**
— un ecosistema self‑hosted para convertir documentos en flujos listos para IA y
seguros para la privacidad.

Licenciado bajo [Apache 2.0](../../LICENSE), igual que el upstream.
