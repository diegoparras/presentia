<div align="center">

<img src="../../servers/nextjs/public/presentia-logo.svg" alt="Presentia" width="96">

# Presentia

**Decks desde documentos, datos y markdown.**

Un generador de presentaciones con IA, open source y self‑hosted — el satélite de
decks de la **[Suite Escriba](https://getescriba.com)**. Transformá un **prompt, un
documento, un dataset o un markdown** en una presentación, retocala en un **editor
de clase Canva** (estilos por elemento, fondos de slide, iconos superpuestos,
cualquier Google Font, colores de gráfico por serie — y todo sobrevive al export) y
publicala como **PPTX, PDF, MP4 o página web**. Sobre su upstream
([Presenton](https://github.com/presenton/presenton)) suma el **editor pro**, la
**generación en vivo estilo Gamma**, **gráficos que no pueden alucinar** (cada cifra
se valida contra tus datos), un **panel de costos LLM por deck**, un **gateway
opcional de anonimización de PII**, un **selector guiado de modelos** (una key de
OpenRouter habilita todo el catálogo) y una interfaz en **7 idiomas**.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-e25a4e.svg)](../../LICENSE)
[![Fork de Presenton](https://img.shields.io/badge/fork%20de-Presenton-8b5cf6.svg)](https://github.com/presenton/presenton)
[![UI: 7 idiomas](https://img.shields.io/badge/UI-7%20idiomas-ef8175.svg)](#-internacionalización)
![Self-hosted](https://img.shields.io/badge/self--hosted-✓-30d158.svg)
[![Suite Escriba](https://img.shields.io/badge/Suite%20Escriba-satélite-e06a3a.svg)](https://getescriba.com)

[English](../../README.md) · **Español**

</div>

---

## ✨ Qué hace

### Generá

- 🎤 **Prompt → deck** — describí el tema, revisá el outline generado, elegí una plantilla y mirá cómo el deck **se arma en vivo, estilo Gamma**: tarjetas fantasma que se van completando a medida que cada slide se genera.
- 📄 **Documentos → deck** — subí PDF, Word, PowerPoint, planillas, imágenes o texto plano y armá el deck desde su contenido. Opcionalmente el parsing se delega a [Escriba](https://github.com/diegoparras/escriba) para la mejor conversión con OCR ([ver abajo](#-integración-con-la-suite-escriba)).
- 🧾 **Markdown → deck (modo Gamma)** — pegá o arrastrá un `.md`: cada sección separada por `---` o por encabezados `#`/`##` se convierte en una tarjeta. Tres modos de texto: **Preservar** (tu texto viaja tal cual; la IA solo elige layouts y genera imágenes), **Condensar** (resume) y **Generar** (reescribe y expande). Con **editor de markdown integrado**: toolbar, vista previa en vivo por tarjeta y drag & drop.
- 📊 **Gráficos anclados a tus datos** — generá un deck desde un dataset CSV/TSV/JSON. Cada cifra de cada gráfico se **valida contra el dataset**: tiene que existir en los datos o ser un agregado exacto de columna (suma, promedio, mínimo, máximo, conteo). Si el modelo inventa una cifra, se reintenta con feedback; si insiste, el slide se rechaza. Gráficos alucinados: cero.

### Editá como en Canva

- 🎛️ **Panel de propiedades acoplado** — un panel contextual a la derecha (estilo Canva/Figma): seleccioná cualquier caja, tarjeta o imagen y editá su **fondo, color de texto, borde, sombra, redondeo, tamaño y posición** en el lugar. Todo lo que cambiás sobrevive a recargas *y* a los exports.
- 🧲 **Control real de elementos** — mové arrastrando los bordes, redimensioná desde las esquinas con **proporción fijable**, alineá en la slide (izquierda/centro/derecha × arriba/medio/abajo), **rotá**, ajustá la **opacidad**, traé al frente / mandá atrás, y mové con las **flechas del teclado** (Shift = 10 px).
- ✍️ **Edición de texto pro** — toolbar de formato completo acoplado al panel: negrita/itálica/subrayado, tamaño, color, resaltado, enlaces, sub/superíndice, **acciones de reescritura con IA**, y **cualquier Google Font por nombre** — escribís "Lobster", se carga, persiste y hasta queda **incrustada en el PPTX** para que se vea en máquinas que no la tienen instalada. El texto se alinea dentro de su bloque (H + V) y los bloques se redimensionan por **reflujo** — cambia el contenedor, no la tipografía.
- 🖼️ **Fondos de slide** — imagen de fondo por slide (o varias, o todas) desde un **archivo, una generación con IA o un link** (las imágenes externas se cachean localmente para que el export siempre las incluya), con ajuste y opacidad.
- ⭐ **Iconos superpuestos** — soltá iconos en cualquier parte de la slide, movelos y redimensionalos, y personalizalos con el buscador de iconos (búsqueda, peso, color del icono, color de la forma).
- 📈 **Colores de gráfico por serie** — hacé clic en cualquier gráfico y recoloreá cada serie/categoría individualmente; funciona en **todas las familias de plantillas** y viaja al export.
- 🤝 **Colaboración** — comentarios, presencia en vivo, historial de versiones y sincronización cuando otra persona edita el deck.

### Publicalo

- 📦 **Exports fieles** — PPTX y PDF renderizados por el *mismo* pipeline React que ves en el editor: estilos por elemento, fondos, iconos y fuentes incrustadas llegan intactos. Más **export a video MP4** y **publicación web con un clic**.
- 💸 **Panel de costos LLM** — cada llamada al modelo queda registrada y atribuida a su presentación, etapa y slide, con un catálogo de precios versionado. Mirá cuánto costó realmente cada deck y compará proveedores.
- 🧭 **Selector guiado de modelos** — modelos rankeados por calidad curada y precio combinado, con badges *Mejor calidad* / *Mejor precio‑calidad* / *Más económico*. **Una key de OpenRouter habilita casi todo el catálogo**; cambiar de modelo es un click.

### Plataforma

- 🛡️ **Gateway de PII (opcional)** — con [Anonimal](https://github.com/diegoparras/anonimal) activo, el contenido del usuario y el texto extraído de documentos se anonimizan **antes** de llegar al proveedor de LLM. **Fail‑closed**: si el anonimizador no responde, la generación se corta en vez de filtrar PII cruda.
- 🔎 **Búsqueda web** — fundamentá las generaciones con [Searchgirl](https://getescriba.com) (la metabúsqueda privada de la suite), SearXNG, Tavily, Exa o Brave — o usá el grounding nativo del modelo.
- 🤖 **Traé tu propio modelo** — OpenAI, Anthropic, Google, DeepSeek, OpenRouter, **Ollama / LM Studio (local)**, LiteLLM, Azure OpenAI, AWS Bedrock, Google Vertex o cualquier endpoint compatible con OpenAI.
- 🖼️ **Imágenes a tu manera** — GPT Image 1.5, DALL‑E 3, Gemini Flash, **ComfyUI (local)**, stock gratuito de Pexels/Pixabay, o sin imágenes. Con instrucciones de estilo por deck ("fotorrealista", "line art minimalista"…).
- 🎨 **17 familias de plantillas y temas** — de corporativo a lúdico, incluidas las propias del fork: **Aurora** (minimalismo tipo keynote), **Nocturno** (oscura premium — la única familia oscura del set) y **Prisma** (formas creativas y color), más **Institucional** (es‑AR) y las familias del upstream. Plantillas personalizadas generadas desde tu propio PPTX, editor de temas completo (colores, fuentes, logo) y `style_instructions` por plantilla que moldean el tono de escritura.
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

## 🛳️ Deployment

El único `Dockerfile` (multi-stage, `EXPOSE 80`) buildea toda la app — backend,
frontend y assets — así que sirve cualquier plataforma que buildee desde un
Dockerfile. Copiá [`.env.example`](../../.env.example) a `.env` y seteá lo que
necesites.

> **La única regla que importa:** todo lo persistente — presentaciones, login,
> config, historial de costos, **imágenes generadas, exports y uploads** — vive
> en `/app_data`. **Montá siempre un volumen persistente ahí.** Vale incluso con
> Postgres externo, porque las imágenes y los exports siguen escribiéndose en
> `/app_data`.

<details open>
<summary><b>EasyPanel</b></summary>

1. **+ Service → App**, **Source → GitHub** → `diegoparras/presentia` (rama `main`), **Build → Dockerfile**.
2. **(Recomendado) + Service → Postgres** en el mismo proyecto (ej. `presentia-db`). Anotá su host interno — los servicios se alcanzan por nombre, ej. `<proyecto>_presentia-db:5432` (**no** `host.docker.internal`).
3. En **Environment** de la App:
   ```env
   DATABASE_URL=postgresql://usuario:password@<proyecto>_presentia-db:5432/presentia
   MIGRATE_DATABASE_ON_STARTUP=true
   # Si corrés Ollama en el mismo proyecto:
   OLLAMA_URL=http://<proyecto>_ollama:11434
   ```
   Usá el esquema `postgresql://` **plano** — la app agrega el driver async sola. Sumá `?sslmode=require` solo si tu Postgres exige TLS. Dejá `DATABASE_URL` vacío para usar el SQLite integrado.
4. **Mounts → Volume** → montá un volumen persistente en **`/app_data`**.
5. **Domains → Container Port `80`**, agregá tu dominio, activá HTTPS.
6. **Deploy.** En el primer arranque las migraciones crean todo el schema solas.
</details>

<details>
<summary><b>Docker Compose (self-hosted)</b></summary>

```bash
git clone https://github.com/diegoparras/presentia.git
cd presentia
cp .env.example .env          # opcional: Postgres, Ollama, keys…
docker compose up -d --build production
```

El compose ya monta `./app_data` y trae bloques de servicio comentados para
Escriba, Anonimal y una variante GPU.
</details>

<details>
<summary><b>Docker plano / reverse proxy</b></summary>

```bash
docker build -t presentia .
docker run -d --name presentia --restart unless-stopped \
  -p 5001:80 -v presentia_data:/app_data \
  -e MIGRATE_DATABASE_ON_STARTUP=true \
  presentia
```

Poné un reverse proxy adelante para TLS. Ejemplo `Caddyfile`:

```caddy
presentia.example.com {
    reverse_proxy localhost:5001
}
```
</details>

> **Nota de build:** la imagen compila Python + Next.js, descarga el runtime de
> export y trae Chromium — es un build pesado y una imagen de varios GB. Dale al
> builder un host con RAM y disco holgados.

<details>
<summary><b>⚠️ El export a PPTX/PDF falla con "Failed to launch browser"</b></summary>

El export renderiza las slides con un **Chromium headless**. En algunos hosts el
perfil **seccomp** default del contenedor bloquea una syscall que el Chromium
reciente necesita, y crashea al arrancar (`Trace/breakpoint trap (core dumped)`)
aunque la generación haya funcionado. Es un tema del host/runtime, no de la app —
la misma imagen exporta bien en un Docker más permisivo.

El fix es darle a Chromium la capability que necesita. **En EasyPanel** (el panel
no expone seccomp, pero sí las capabilities):

1. Servicio **presentia** → **Avanzado** → **Cap Add**: `SYS_ADMIN`
2. **Guardar** → **Implementar**.

En Docker plano / Compose el equivalente es `--cap-add=SYS_ADMIN` (o
`--security-opt seccomp=unconfined`). Chequeo rápido en el host:

```bash
docker run --rm --entrypoint chromium --cap-add SYS_ADMIN \
  <imagen> --headless=new --no-sandbox --disable-gpu --dump-dom about:blank
# imprime HTML en vez de "core dumped" → la cap es el fix
```

`SYS_ADMIN` es una capability amplia (ensancha lo que el contenedor puede hacer,
lo que importa en hosts compartidos / multi-inquilino). Para una instancia
self-hosted de un solo dueño detrás de login es la forma estándar y aceptada de
correr Chromium en Docker. La alternativa más endurecida es un perfil seccomp
propio de Chrome en el daemon.
</details>

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

### ☁️ Almacenamiento de exports en S3 / Cloudflare R2 (opcional)

Por defecto, los archivos exportados (video MP4 hoy) se guardan en el disco del
servidor. Con estas cinco variables se suben a cualquier bucket compatible con
S3 — la copia local se borra, así que los exports usan **cero disco del
servidor** y quedan **preservados** en tu bucket:

| Variable | Ejemplo |
|---|---|
| `PRESENTIA_S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `PRESENTIA_S3_BUCKET` | `mi-bucket` |
| `PRESENTIA_S3_ACCESS_KEY_ID` | — |
| `PRESENTIA_S3_SECRET_ACCESS_KEY` | — |
| `PRESENTIA_S3_REGION` | `auto` (R2) |

Privacidad por diseño: las descargas se **streamean por tu propio dominio**
desde el backend (protegidas por sesión). El endpoint del bucket, el account
id, el nombre del bucket y el access key **nunca llegan al navegador**, y el
bucket queda totalmente privado — sin acceso público ni URLs prefirmadas que
salgan del servidor. Los archivos van bajo el prefijo `presentia/exports/`,
así que un mismo bucket se puede compartir entre las apps de la Suite Escriba.
Si la subida falla, el export cae con gracia a la descarga local. Totalmente
invisible para el usuario final.

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

<details>
<summary><b>🔑 Lockatus — inicio de sesión único (SSO) de toda la suite</b></summary>

Con `AUTH_MODE=federado`, Presentia autentica a los usuarios a través del hub de
identidad **[Lockatus](https://getescriba.com)** de la suite (OpenID Connect,
Authorization Code + PKCE, cliente público — sin secret). Un solo login para todas
las apps. Sin `AUTH_MODE`, mantiene el login single‑user propio de Presenton.

| Variable | Default | Descripción |
|---|---|---|
| `AUTH_MODE` | `local` | Poné `federado` para activar el SSO de Lockatus |
| `LOCKATUS_ISSUER` | — | URL del hub, alcanzable por la **misma** URL desde el browser y el contenedor (ej. `http://host.docker.internal:8081` local, o `https://lockatus.example.com` con dominio) |
| `LOCKATUS_CLIENT_ID` | `presentia` | client id registrado en Lockatus |
| `LOCKATUS_REDIRECT_URI` | — | `https://<tu-presentia>/api/v1/auth/sso/callback` |
| `SESSION_SECRET` | — | Firma las cookies de sesión federada (`openssl rand -hex 32`) |
| `COOKIE_SECURE` | `false` | `true` detrás de HTTPS |

**Registrá el cliente en Lockatus** (una vez), apuntando al callback de Presentia:

```bash
curl -X PUT "$LOCKATUS_ISSUER/api/admin/apps/presentia/redirect-uris" \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris":["https://<tu-presentia>/api/v1/auth/sso/callback"]}'
# y asigná un rol a tu usuario:
curl -X PUT "$LOCKATUS_ISSUER/api/admin/users/1/role" \
  -H "Content-Type: application/json" \
  -d '{"app":"presentia","role":"admin"}'
```

> **El detalle clave es la URL del issuer.** El `iss` del token tiene que coincidir
> tanto en el redirect del browser (front‑channel) como en las llamadas de
> token/JWKS del contenedor (back‑channel), así que `LOCKATUS_ISSUER` debe resolver
> a la misma URL desde los dos lados. En el compose local de la suite eso es
> `host.docker.internal`; detrás de EasyPanel o un dominio, usá la URL **pública**
> de Lockatus.
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
La maquinaria central de generación es de ellos; el fork agrega el **editor pro**
(panel de propiedades acoplado, estilos por elemento, fondos de slide, iconos
superpuestos, Google Fonts con incrustado en PPTX, colores de gráfico por serie),
la **generación en vivo estilo Gamma**, las **familias de plantillas
Aurora/Nocturno/Prisma**, la colaboración (comentarios, presencia, versiones), las
integraciones con la Suite Escriba, el guard de gráficos anclados a datos, el panel
de costos, el selector de modelos, el editor de markdown, la capa de i18n y el
branding de la suite.

Mantenido por **Diego Parras** como parte de la **[Suite Escriba](https://getescriba.com)**
— un ecosistema self‑hosted para convertir documentos en flujos listos para IA y
seguros para la privacidad.

Licenciado bajo [Apache 2.0](../../LICENSE), igual que el upstream.
