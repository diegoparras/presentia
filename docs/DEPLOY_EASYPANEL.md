# Deploy de Presentia en EasyPanel (imagen Docker)

Presentia se despliega como **una sola imagen Docker all-in-one** (nginx + Next.js
+ FastAPI + Chromium + WeasyPrint, todo adentro). **No usa docker-compose** — en
EasyPanel se crea como una **App** que corre la imagen y se configura por
variables de entorno. El contenedor escucha en el **puerto 80**.

## 1. Publicar la imagen (una vez)

El repo trae el workflow `.github/workflows/docker-release.yml` que buildea y
publica la imagen en **GitHub Container Registry**:

```
ghcr.io/diegoparras/presentia:latest
ghcr.io/diegoparras/presentia:<tag-del-release>
```

Cómo dispararlo:

- **A mano**: GitHub → Actions → *Publish image* → *Run workflow*.
- **Por release**: publicá un Release (ver abajo) y se buildea solo.

> Tras el **primer** push, hacé el package **público** para que EasyPanel lo pullee
> sin credenciales: `github.com/users/diegoparras/packages` → `presentia` →
> *Package settings* → *Change visibility* → *Public*.
> (Si lo dejás privado, en EasyPanel cargás un Registry con un PAT `read:packages`.)

## 2. Crear la App en EasyPanel

1. **Create → App**.
2. **Source → Image**: `ghcr.io/diegoparras/presentia:latest` (o el tag del release).
3. **Ports**: contenedor `80` → dominio de EasyPanel (HTTP). Activá HTTPS con el
   certificado de EasyPanel.
4. **Volumes**: montá un volumen persistente en **`/app_data`**
   (presentaciones, login, imágenes, exports, uploads viven ahí — incluso con
   Postgres).
5. **Environment**: pegá las variables (ver punto 3). Como mínimo un proveedor de
   LLM y el login.
6. Deploy.

## 3. Variables de entorno mínimas

Ver `.env.example` (completo). Lo esencial:

```env
APP_DATA_DIRECTORY=/app_data
MIGRATE_DATABASE_ON_STARTUP=true      # crea/actualiza el schema al arrancar

AUTH_USERNAME=admin                   # login de usuario único
AUTH_PASSWORD=<algo-seguro>
SESSION_SECRET=<openssl rand -hex 32>

LLM=openai                            # o anthropic / google / openrouter / ...
OPENAI_API_KEY=<tu-key>
OPENAI_MODEL=gpt-4o

IMAGE_PROVIDER=pexels                 # o dall-e-3 / gemini_flash / ...
PEXELS_API_KEY=<tu-key>
```

- **DB**: por defecto SQLite dentro de `/app_data`. Para Postgres, seteá
  `DATABASE_URL=postgresql://user:pass@host:5432/presentia` (esquema plano; la app
  agrega el driver async sola).
- **Actualizar de 0.8.7 → 0.9.0 con datos existentes**: dejá
  `MIGRATE_DATABASE_ON_STARTUP=true` para que corra la migración que agrega las
  columnas de publicación pública. En una DB nueva no hace falta (se crea el
  schema completo).

## 4. Novedades de la 0.9.0 y su config

| Feature | Cómo se activa |
|---|---|
| **Charts SVG** (Fase 2) | Nada — es interno. |
| **Publicación web pública** (Fase 4) | Nada — el botón **"Publicar"** del editor genera `/<dominio>/p/<token>`. |
| **Export sin navegador** (Fase 3) | Opcional: `PRESENTIA_EXPORT_ENGINE=freeze`. PDF vectorial (WeasyPrint) + PPTX nativo, 4–10× más rápido. La imagen ya trae todo; si algo falla cae al motor Chromium. |

## 5. Downgrade / rollback

Cada versión queda marcada como rama en el repo:

- `release/0.9.0` → versión nueva.
- `release/0.8.7` → versión previa (punto de retorno).

Para volver atrás: en EasyPanel apuntá la App a la imagen del tag anterior
(`ghcr.io/diegoparras/presentia:v0.8.7` si publicaste ese release), o rebuildeá
desde la rama `release/0.8.7`.

## 6. Cortar un Release (recomendado para versionar la imagen)

GitHub → Releases → *Draft a new release* → Tag `v0.9.0` (target `main` o
`release/0.9.0`) → *Publish*. Esto dispara `docker-release.yml`, que buildea y
sube `ghcr.io/diegoparras/presentia:v0.9.0` y `:latest`. Después en EasyPanel
usás ese tag inmutable (mejor que `:latest` para poder downgradear con precisión).
