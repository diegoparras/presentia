<div align="center">

<img src="servers/nextjs/public/presentia-logo.svg" alt="Presentia" width="96">

# Presentia

**Decks from documents, data and markdown.**

An open‑source, self‑hosted AI presentation generator — the deck satellite of the
**[Escriba Suite](https://getescriba.com)**. Turn a **prompt, a document, a dataset
or a markdown file** into a presentation, refine it in a **Canva‑class editor**
(per‑element styling, slide backgrounds, overlay icons, any Google Font, per‑series
chart colors — everything survives the export) and ship it as **PPTX, PDF, MP4 or a
published web page**. On top of its upstream
([Presenton](https://github.com/presenton/presenton)) it adds the **pro editor**,
**live Gamma‑style generation**, **charts that can't hallucinate** (every number is
validated against your data), a **per‑deck LLM cost panel**, an optional
**PII‑anonymization gateway**, a **guided model picker** (one OpenRouter key unlocks
the whole catalog) and a UI in **7 languages**.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-e25a4e.svg)](LICENSE)
[![Fork of Presenton](https://img.shields.io/badge/fork%20of-Presenton-8b5cf6.svg)](https://github.com/presenton/presenton)
[![UI: 7 languages](https://img.shields.io/badge/UI-7%20languages-ef8175.svg)](#-internationalization)
![Self-hosted](https://img.shields.io/badge/self--hosted-✓-30d158.svg)
[![Escriba Suite](https://img.shields.io/badge/Escriba%20Suite-satellite-e06a3a.svg)](https://getescriba.com)

**English** · [Español](docs/i18n/README.es.md)

</div>

---

## ✨ Features

### Generate

- 🎤 **Prompt → deck** — describe the topic, review the generated outline, pick a template and watch the deck **stream in live, Gamma‑style**: ghost cards fill in one by one as each slide is generated.
- 📄 **Documents → deck** — upload PDF, Word, PowerPoint, spreadsheets, images or plain text and build the deck from their content. Optionally delegate parsing to [Escriba](https://github.com/diegoparras/escriba) for best‑in‑class conversion with OCR ([see below](#-escriba-suite-integration)).
- 🧾 **Markdown → deck (Gamma mode)** — paste or drop a `.md` file: every section split by `---` or by `#`/`##` headings becomes a card. Three text modes: **Preserve** (your text travels verbatim; the AI only picks layouts and generates images), **Condense** (summarizes) and **Generate** (rewrites and expands). Comes with a **built‑in markdown editor**: toolbar, live per‑card preview and drag & drop.
- 📊 **Charts grounded in your data** — generate a deck from a CSV/TSV/JSON dataset. Every figure in every chart is **validated against the dataset**: it must exist in the data or be an exact column aggregate (sum, average, min, max, count). If the model invents a number it gets retried with feedback; if it insists, the slide is rejected. No hallucinated charts, period.

### Edit like Canva

- 🎛️ **Docked properties panel** — a contextual right‑hand panel (Canva/Figma style): select any box, card or image and edit its **background, text color, border, shadow, corner radius, size and position** in place. Everything you change survives reloads *and* exports.
- 🧲 **Real element control** — move by dragging edges, resize from corners with a **lockable aspect ratio**, align to the slide (left/center/right × top/middle/bottom), **rotate**, set **opacity**, bring to front / send to back, and nudge with the **arrow keys** (Shift = 10 px).
- ✍️ **Pro text editing** — a full formatting toolbar docked in the panel: bold/italic/underline, size, color, highlight, links, sub/superscript, **AI rewrite actions**, and **any Google Font by name** — just type "Lobster" and it loads, persists and even gets **embedded into the PPTX** so it renders on machines that don't have it installed. Text blocks align within their box (H + V) and resize by **reflow** — the container changes, the typography doesn't.
- 🖼️ **Slide backgrounds** — set a background image per slide (or several, or all) from an **upload, an AI generation or a URL** (external images are cached locally so exports always include them), with fit and opacity controls.
- ⭐ **Overlay icons** — drop icons anywhere on a slide, drag/resize them, and restyle them with the icon customizer (search, weight, icon color, shape color).
- 📈 **Per‑series chart colors** — click any chart and recolor each series/category individually; works across **every template family** and carries into exports.
- 🤝 **Collaboration** — comments, live presence, version history and live sync when someone else edits the deck.

### Ship it

- 📦 **Faithful exports** — PPTX and PDF rendered from the *same* React pipeline you see in the editor: element styles, backgrounds, icons and embedded fonts all arrive intact. Plus **MP4 video export** and **one‑click web publishing**.
- 💸 **LLM cost panel** — every model call is logged and attributed to its presentation, stage and slide, priced with a versioned catalog. See what each deck actually cost and compare providers.
- 🧭 **Guided model picker** — models ranked by curated quality and blended price, with *Best quality* / *Best price‑quality* / *Cheapest* badges. **One OpenRouter key unlocks almost the entire catalog**; switching models is one click.

### Platform

- 🛡️ **PII gateway (optional)** — with [Anonimal](https://github.com/diegoparras/anonimal) enabled, user content and extracted document text are anonymized **before** reaching the LLM provider. **Fail‑closed**: if the anonymizer is down, generation stops instead of leaking raw PII.
- 🔎 **Web search** — ground generations with [Searchgirl](https://getescriba.com) (the suite's private metasearch), SearXNG, Tavily, Exa or Brave — or use the model's native grounding.
- 🤖 **Bring your own model** — OpenAI, Anthropic, Google, DeepSeek, OpenRouter, **Ollama / LM Studio (local)**, LiteLLM, Azure OpenAI, AWS Bedrock, Google Vertex or any OpenAI‑compatible endpoint.
- 🖼️ **Images your way** — GPT Image 1.5, DALL‑E 3, Gemini Flash, **ComfyUI (local)**, free stock from Pexels/Pixabay, or no images at all. Optional per‑deck style instructions ("photorealistic", "minimal line art"…).
- 🎨 **17 template families & themes** — from corporate to playful, including the fork's own **Aurora** (keynote‑style minimalism), **Nocturno** (premium dark — the only dark family in the set) and **Prisma** (bold creative shapes), plus **Institucional** (es‑AR) and the upstream families. Custom templates generated from your own PPTX, a full theme editor (colors, fonts, logo) and per‑template `style_instructions` that shape the writing tone.
- 🌍 **7 UI languages** — English, Español, Français, Português, Italiano, 中文, 日本語 — switchable from the sidebar, remembered per browser.
- 🔒 **Self‑hosted & private** — built‑in login, SQLite by default (PostgreSQL via `DATABASE_URL`), your keys and content never leave your server.

---

## 🚀 Quick start

```bash
git clone https://github.com/diegoparras/presentia.git
cd presentia
docker compose up -d --build production
```

Open **http://localhost:5001**, create your login and pick a text provider in the
onboarding — an **OpenRouter API key** is the fastest way to unlock every model in
the catalog at once.

> **GPU host?** `docker compose up -d --build production-gpu` enables NVIDIA
> acceleration for local models. Change the port with `PRESENTON_HTTP_HOST_PORT`.

---

## 🛳️ Deployment

The single `Dockerfile` (multi-stage, `EXPOSE 80`) builds the whole app — backend,
frontend and assets — so any platform that builds from a Dockerfile works. Copy
[`.env.example`](.env.example) to `.env` and set what you need.

> **The one rule that matters:** everything persistent — presentations, login,
> config, cost history, **generated images, exports and uploads** — lives under
> `/app_data`. **Always mount a persistent volume there.** This holds true even
> with an external Postgres, because images and exports still write to `/app_data`.

<details open>
<summary><b>EasyPanel</b></summary>

1. **+ Service → App**, **Source → GitHub** → `diegoparras/presentia` (branch `main`), **Build → Dockerfile**.
2. **(Recommended) + Service → Postgres** in the same project (e.g. `presentia-db`). Note its internal host — services talk to each other by name, e.g. `<project>_presentia-db:5432` (**not** `host.docker.internal`).
3. In the App's **Environment**:
   ```env
   DATABASE_URL=postgresql://user:password@<project>_presentia-db:5432/presentia
   MIGRATE_DATABASE_ON_STARTUP=true
   # If you run Ollama in the same project:
   OLLAMA_URL=http://<project>_ollama:11434
   ```
   Use the **plain** `postgresql://` scheme — the app adds the async driver itself. Add `?sslmode=require` only if your Postgres enforces TLS. Leave `DATABASE_URL` empty to use the built-in SQLite instead.
4. **Mounts → Volume** → mount a persistent volume at **`/app_data`**.
5. **Domains → Container Port `80`**, add your domain, enable HTTPS.
6. **Deploy.** On first boot the migrations create the full schema automatically.
</details>

<details>
<summary><b>Docker Compose (self-hosted)</b></summary>

```bash
git clone https://github.com/diegoparras/presentia.git
cd presentia
cp .env.example .env          # optional: set Postgres, Ollama, keys…
docker compose up -d --build production
```

The compose file already mounts `./app_data` and ships commented service blocks
for Escriba, Anonimal and a GPU variant.
</details>

<details>
<summary><b>Plain Docker / reverse proxy</b></summary>

```bash
docker build -t presentia .
docker run -d --name presentia --restart unless-stopped \
  -p 5001:80 -v presentia_data:/app_data \
  -e MIGRATE_DATABASE_ON_STARTUP=true \
  presentia
```

Put a reverse proxy in front for TLS. Example `Caddyfile`:

```caddy
presentia.example.com {
    reverse_proxy localhost:5001
}
```
</details>

> **Build note:** the image compiles Python + Next.js, downloads the export
> runtime and bundles Chromium — it's a heavy build and a multi-GB image. Give the
> builder a host with generous RAM and disk.

<details>
<summary><b>⚠️ PPTX/PDF export fails with "Failed to launch browser"</b></summary>

Export renders slides with a **headless Chromium**. On some hosts the container's
default **seccomp** profile blocks a syscall that recent Chromium needs, so it
crashes on launch (`Trace/breakpoint trap (core dumped)`) even though generation
worked. This is a host/runtime issue, not the app — the same image exports fine on
a permissive Docker.

The fix is to grant Chromium the capability it needs. **On EasyPanel** (the panel
doesn't expose seccomp, but does expose capabilities):

1. Service **presentia** → **Advanced** → **Cap Add**: `SYS_ADMIN`
2. **Save** → **Deploy**.

On plain Docker / Compose the equivalent is `--cap-add=SYS_ADMIN` (or
`--security-opt seccomp=unconfined`). Quick check inside the host:

```bash
docker run --rm --entrypoint chromium --cap-add SYS_ADMIN \
  <image> --headless=new --no-sandbox --disable-gpu --dump-dom about:blank
# prints HTML instead of "core dumped" → the cap is the fix
```

`SYS_ADMIN` is a broad capability (it widens what the container can do, which
matters on shared/multi-tenant hosts). For a single-tenant, self-hosted instance
behind login it's the standard, accepted way to run Chromium in Docker. The more
hardened alternative is a custom Chrome seccomp profile on the daemon.
</details>

---

## ⚙️ Configuration

Everything can be configured **from the Settings UI** — environment variables are
for headless / locked‑down deployments. The most useful ones:

| Variable | Default | Description |
|---|---|---|
| `LLM` | — | Text provider: `openai`, `anthropic`, `google`, `deepseek`, `openrouter`, `ollama`, `lmstudio`, `litellm`, `azure_openai`, `bedrock`, `vertex`, `custom`. |
| `<PROVIDER>_API_KEY` / `<PROVIDER>_MODEL` | — | Credentials and model per provider (e.g. `OPENROUTER_API_KEY` + `OPENROUTER_MODEL=openai/gpt-4o`). |
| `IMAGE_PROVIDER` | — | `gpt-image-1.5`, `dall-e-3`, `gemini_flash`, `pexels`, `pixabay`, `comfyui`. |
| `WEB_GROUNDING` / `WEB_SEARCH_PROVIDER` | off | Web search: `searchgirl`, `searxng`, `tavily`, `exa`, `brave` or `auto` (model‑native). |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | — | Seed the login instead of the first‑run form. |
| `CAN_CHANGE_KEYS` | `true` | `false` locks API keys so the UI can't edit them. |
| `DATABASE_URL` | SQLite | Point at PostgreSQL for multi‑user deployments. |
| `DATASET_MAX_ROWS` | `200` | Row cap for the charts‑from‑data endpoint. |
| `DISABLE_ANONYMOUS_TRACKING` | — | Set `true` to disable the upstream's anonymous telemetry. |

The full provider matrix (Azure, Bedrock, Vertex, ComfyUI, Codex OAuth, Mem0
semantic memory…) is in [`docker-compose.yml`](docker-compose.yml).

### ☁️ Export storage on S3 / Cloudflare R2 (optional)

By default, exported files (MP4 video today) are stored on the server's disk.
Set these five variables and they are uploaded to any S3‑compatible bucket
instead — the local copy is deleted, so exports use **zero server disk** and
are **preserved** in your bucket:

| Variable | Example |
|---|---|
| `PRESENTIA_S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `PRESENTIA_S3_BUCKET` | `my-bucket` |
| `PRESENTIA_S3_ACCESS_KEY_ID` | — |
| `PRESENTIA_S3_SECRET_ACCESS_KEY` | — |
| `PRESENTIA_S3_REGION` | `auto` (R2) |

Privacy by design: downloads are **streamed through your own domain** by the
backend (session‑protected). The bucket endpoint, account id, bucket name and
access key are never exposed to the browser, and the bucket stays fully
private — no public access, no presigned URLs leaving the server. Files land
under the `presentia/exports/` prefix, so one bucket can be shared across the
Escriba Suite. If the upload ever fails, the export gracefully falls back to
the local download. Completely invisible to end users.

---

## 🧩 Escriba Suite integration

Presentia works **standalone** — without any of these variables it behaves exactly
like vanilla Presenton. Each integration is opt‑in and independent; the
[`docker-compose.yml`](docker-compose.yml) ships commented service blocks for all of them.

<details open>
<summary><b>📄 Escriba — document parsing with OCR</b></summary>

Delegates document → markdown conversion to an [Escriba](https://github.com/diegoparras/escriba)
service (scanned PDFs, rotated pages, images, 20+ formats). If Escriba is down or
fails on a file, Presentia **falls back automatically** to its local parsers.

| Variable | Default | Description |
|---|---|---|
| `ESCRIBA_ENABLED` | `false` | Turns the adapter on |
| `ESCRIBA_URL` | — | Base URL, e.g. `http://escriba:8000` |
| `ESCRIBA_API_TOKEN` | — | Escriba's `API_TOKEN` (sent as `X-API-Key`) |
| `ESCRIBA_TIMEOUT` | `600` | Conversion timeout (seconds) |
</details>

<details>
<summary><b>🛡️ Anonimal — PII anonymization before the LLM</b></summary>

With [Anonimal](https://github.com/diegoparras/anonimal) enabled, user prompts and
extracted document text are anonymized **before** they travel to the LLM provider
(and before being indexed into semantic memory). **Fail‑closed**: if the service
doesn't answer, generation stops with a clear error instead of sending raw PII.
Original text never leaves your host.

| Variable | Default | Description |
|---|---|---|
| `ANONIMAL_ENABLED` | `false` | Turns the sidecar on |
| `ANONIMAL_URL` | — | Base URL, e.g. `http://anonimal:8000` |
| `ANONIMAL_TOKEN` | — | Service token if required (`X-Anonimal-Token`) |
| `ANONIMAL_MODE` | `pseudo` | `typed`, `anon`, `pseudo` (reversible), `mask`, `hash` |
| `ANONIMAL_ENGINE` | `auto` | `lite` (regex, instant) or `ml` (NER: names, addresses) |
| `ANONIMAL_TIMEOUT` | `120` | Timeout (seconds) |
</details>

<details>
<summary><b>🔎 Searchgirl — the suite's private metasearch</b></summary>

Select **Searchgirl** as the web‑search provider to ground generations through your
own metasearch instance instead of a third‑party API.

| Variable | Default | Description |
|---|---|---|
| `WEB_SEARCH_PROVIDER` | — | Set to `searchgirl` |
| `SEARCHGIRL_BASE_URL` | — | e.g. `http://host.docker.internal:8089` |
| `SEARCHGIRL_API_TOKEN` | — | Bearer token (matches Searchgirl's `SEARCHGIRL_MCP_TOKEN`), optional if the instance is open |
</details>

<details>
<summary><b>🔑 Lockatus — single sign‑on (SSO) for the whole suite</b></summary>

Set `AUTH_MODE=federado` and Presentia signs users in through the suite's
**[Lockatus](https://getescriba.com)** identity hub (OpenID Connect, Authorization
Code + PKCE, public client — no secret). One login for every suite app. With
`AUTH_MODE` unset it keeps Presenton's built‑in single‑user login.

| Variable | Default | Description |
|---|---|---|
| `AUTH_MODE` | `local` | Set to `federado` to enable Lockatus SSO |
| `LOCKATUS_ISSUER` | — | Hub URL, reachable by the **same** URL from browser and container (e.g. `http://host.docker.internal:8081` locally, or `https://lockatus.example.com` behind a domain) |
| `LOCKATUS_CLIENT_ID` | `presentia` | Client id registered in Lockatus |
| `LOCKATUS_REDIRECT_URI` | — | `https://<your-presentia>/api/v1/auth/sso/callback` |
| `SESSION_SECRET` | — | Signs federated session cookies (`openssl rand -hex 32`) |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS |

**Register the client in Lockatus** (once), pointing at Presentia's callback:

```bash
curl -X PUT "$LOCKATUS_ISSUER/api/admin/apps/presentia/redirect-uris" \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris":["https://<your-presentia>/api/v1/auth/sso/callback"]}'
# then grant a role to your user:
curl -X PUT "$LOCKATUS_ISSUER/api/admin/users/1/role" \
  -H "Content-Type: application/json" \
  -d '{"app":"presentia","role":"admin"}'
```

> **Issuer reachability is the gotcha.** The token's `iss` must match on both the
> browser redirect (front‑channel) and the container's token/JWKS calls
> (back‑channel), so `LOCKATUS_ISSUER` has to resolve to the same URL from both.
> In the suite's local compose that's `host.docker.internal`; behind EasyPanel or a
> domain, use Lockatus's **public** URL.
</details>

---

## 🧾 Markdown → deck (Gamma mode)

The **Markdown** page has a full editor — toolbar, live preview that shows exactly
how your text splits into cards, card counter, drag & drop — plus template,
language, image source/style and export pickers. The same power is available
over the API:

```bash
curl -X POST http://localhost:5001/api/v1/ppt/presentation/generate-from-markdown \
  -H "Content-Type: application/json" \
  -d '{
        "markdown": "# Q3 Review\nIntro...\n\n---\n\n## Results\n- Revenue up 20%",
        "text_mode": "preserve",
        "template": "general",
        "export_as": "pptx"
      }'
```

| `text_mode` | What happens |
|---|---|
| `preserve` | Your text goes into the deck **verbatim** — the AI only picks layouts and generates images |
| `condense` | The AI summarizes each card while keeping its structure |
| `generate` | The AI rewrites and expands each card |

---

## 📊 Charts from real data

`POST /api/v1/ppt/presentation/generate-from-data` builds a deck from a CSV, TSV or
JSON dataset (multipart: `file`, plus `content`, `n_slides`, `language`, `template`,
`instructions`, `export_as`). The anti‑hallucination guard checks **every chart
figure** against the dataset — exact values or exact column aggregates only; wrong
numbers get one retry with feedback and are rejected if the model insists.

```bash
curl -X POST http://localhost:5001/api/v1/ppt/presentation/generate-from-data \
  -F "file=@monthly_summary.csv" \
  -F "content=Monthly reconciliation report" \
  -F "n_slides=6" -F "language=English" -F "export_as=pdf"
```

Datasets are expected pre‑aggregated (e.g. a reconciliation summary); the row cap is
`DATASET_MAX_ROWS` (default 200). The default template is **Report**, which carries
the chart layouts.

---

## 💸 Costs & 🧭 Models

Two dashboard pages the upstream doesn't have:

- **Models** — the catalog of text and image models with curated quality dots,
  blended price per million tokens, availability computed from *your* keys and
  recommendation badges. Click a card to switch; with an OpenRouter key nearly
  everything lights up at once.
- **Costs** — summary cards (calls, tokens in/out, estimated cost) and per‑deck
  breakdowns by stage, slide and model, plus a provider comparison table. Pricing
  comes from a versioned catalog in the repo, so cost history is auditable.

---

## 🌍 Internationalization

The whole interface — dashboard, onboarding, settings, template & theme libraries,
the presentation editor and its AI assistant — ships in **7 languages**: English,
Español, Français, Português, Italiano, 中文, 日本語. Switch from the sidebar
selector; the choice is remembered per browser.

---

## 💻 Development

```bash
docker compose up -d --build development   # hot reload for both servers
```

Backend tests (the fork adds 100+ unit tests over its features):

```bash
cd servers/fastapi
python -m pytest tests/unit
```

The code map — services, seams, request flow and where each fork feature lives —
is in [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

---

## 📜 Credits & license

**Presentia** is a fork of **[Presenton](https://github.com/presenton/presenton)**
— an excellent open‑source AI presentation generator by the
[Presenton team](https://presenton.ai) ([docs](https://docs.presenton.ai)). The
core generation machinery is theirs; the fork adds the **pro editor** (docked
properties panel, per‑element styling, slide backgrounds, overlay icons, Google
Fonts with PPTX embedding, per‑series chart colors), **live Gamma‑style
generation**, the **Aurora/Nocturno/Prisma template families**, collaboration
(comments, presence, versions), the Escriba Suite integrations, the
grounded‑charts guard, the cost panel, the model picker, the markdown editor,
the i18n layer and the suite branding.

Maintained by **Diego Parras** as part of the **[Escriba Suite](https://getescriba.com)**
— a self‑hosted ecosystem for turning documents into AI‑ready, privacy‑safe workflows.

Licensed under [Apache 2.0](LICENSE), same as the upstream.
