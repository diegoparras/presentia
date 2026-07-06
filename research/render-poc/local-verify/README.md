# Verificación local de Presentia (correr y probar la UI)

Receta para levantar Presentia con **SQLite + auth deshabilitada + config LLM
dummy** y cargar una presentación de prueba de 40 slides, sin necesidad de un
LLM ni de generar nada. Sirve para verificar cambios del editor (virtualización,
re-renders, navegación, drag-and-drop) contra una app real.

Rutas asumen el repo en `/home/user/presentia`. Ajustar `APP_DATA_DIRECTORY`.

## 1. Backend (FastAPI, SQLite)

```bash
cd servers/fastapi
uv sync                                        # instala deps python
export APP_DATA_DIRECTORY=/tmp/presentia-appdata
mkdir -p "$APP_DATA_DIRECTORY"
DISABLE_AUTH=true MIGRATE_DATABASE_ON_STARTUP=true CAN_CHANGE_KEYS=true \
  uv run python server.py --port 8000
```
- Crea `$APP_DATA_DIRECTORY/fastapi.db` y corre las migraciones al arrancar.
- El icon-finder falla al bajar su modelo (proxy) — es no-fatal, se ignora.
- Verificar: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/docs` → 200.

## 2. Sembrar una presentación de 40 slides (sin LLM)

Con el backend detenido o vivo (usa el mismo `APP_DATA_DIRECTORY`):
```bash
cd servers/fastapi
APP_DATA_DIRECTORY=/tmp/presentia-appdata \
  uv run python /home/user/presentia/research/render-poc/local-verify/seed.py
# imprime: PRESENTATION_ID=<uuid>
```
Inserta vía el ORM de la app (para que la codificación de UUID coincida — un
INSERT crudo por sqlite3 hace que `GET /presentation/{id}` devuelva 404). Las
slides usan layouts reales del template `general` con content mínimo; los
layouts renderizan sus defaults inline, así que no hace falta contenido real.

## 3. Config LLM dummy (si no, el editor redirige a `/` o `/upload`)

`ConfigurationInitializer` bloquea el grupo `(presentation-generator)` si no hay
un LLM válido. `openai` NO hace verificación de disponibilidad, así que una key
dummy alcanza:
```bash
cat > /tmp/presentia-appdata/userConfig.json <<'JSON'
{ "LLM": "openai", "OPENAI_API_KEY": "sk-dummy", "OPENAI_MODEL": "gpt-4o",
  "DISABLE_IMAGE_GENERATION": true, "IMAGE_PROVIDER": "dall-e-3" }
JSON
```

## 4. Frontend (Next.js dev)

```bash
cd servers/nextjs
CYPRESS_INSTALL_BINARY=0 PUPPETEER_SKIP_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  npm install                                  # Cypress baja un binario bloqueado por el proxy; se saltea
NEXT_PUBLIC_FAST_API=http://127.0.0.1:8000 FAST_API_INTERNAL_URL=http://127.0.0.1:8000 \
NEXT_PUBLIC_URL=http://127.0.0.1:3000 DISABLE_AUTH=true CAN_CHANGE_KEYS=true \
USER_CONFIG_PATH=/tmp/presentia-appdata/userConfig.json \
APP_DATA_DIRECTORY=/tmp/presentia-appdata \
  npm run dev
```

## 5. Cargar el editor y verificar

El cliente pega same-origin `/api/v1/ppt/*`, pero en dev no hay nginx que lo
proxye. Solución: pasar `?fastapiUrl=` para que pegue directo al backend (el
CORSMiddleware permite el origin). `drive.js` ya lo arma:
```bash
cd research/render-poc/local-verify
npm i puppeteer-core
HTTPS_PROXY="" HTTP_PROXY="" PRESENTATION_ID=<uuid-del-paso-2> node drive.js
# -> slide elements (#slide-N): 40 ; screenshot editor_loaded.png
```

## Gotchas (aprendidos a los tumbos)

- **Proxy**: el Chromium headless enruta `127.0.0.1` por el proxy del agente →
  `ERR_TUNNEL_CONNECTION_FAILED`. Lanzar con `--no-proxy-server
  --proxy-bypass-list=<-loopback>` y `HTTPS_PROXY=""` (ya en `drive.js`).
- **UUID**: sembrar por el ORM, no por sqlite3 crudo (mismatch de codificación).
- **Auth cliente**: `DISABLE_AUTH` no es `NEXT_PUBLIC_*`, así que el server lo ve
  pero el cliente no. Igual funciona porque el gate del editor es server-side +
  la config LLM válida evita el redirect.
- **Navegación/scroll**: el editor scrollea por `document.getElementById(\`slide-\${i}\`)`
  (`usePresentationNavigation.ts`, `PresentationPage.tsx`). Cualquier
  virtualización debe preservar esos ids o reemplazar el scroll por la API del
  virtualizador. Es lo que hay que verificar acá antes de mergear.
