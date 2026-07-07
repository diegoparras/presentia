# Diseño MVP — Motor de predicción tabular ("satélite de datos" de la Escriba Suite)

> Nombre provisional: **Augur** (siguiendo la nomenclatura latina de la suite:
> Escriba, Anonimal, Lockatus, Presentia, Concilius). Cambiable.

## 1. Tesis

Millones de personas tienen **planillas** y quieren una **predicción** (¿qué cliente se
va?, ¿qué factura no se paga?, ¿cuánto vendo?) pero no tienen data scientist ni pipeline
de ML. Un foundation model tabular zero-shot (TabFM / TabPFN) colapsa eso a
**"subí el CSV → tenés la respuesta"**, sin entrenar, corriendo **local**.

Encaja como el satélite que le falta a la suite: si Presentia es *"documentos → decks"*,
esto es **"planillas → predicciones"**. Mismo ADN: **self-hosted, privacy-first, sin
alucinar**. La diferencia clave con un LLM: las cifras las produce un modelo numérico
**calculado y verificable**, no texto generado.

## 2. Forma del producto (dos capas)

```
┌─────────────────────────────────────────────────────────────┐
│  Capa 2 — App "planilla predictiva"  (cara visible, opcional)│
│  UI: subí CSV · elegí columna objetivo · ves predicción +    │
│  drivers + outliers · exportá (y → deck via Presentia)       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│  Capa 1 — Microservicio sidecar  (el motor, primero)         │
│  FastAPI · patrón Anonimal/Escriba · /predict /importance …  │
│  ┌─────────────── engine adapter (swappable) ─────────────┐  │
│  │  TabFMEngine   │  TabPFNEngine  │  (futuro: otros)      │  │
│  └────────────────────────────────────────────────────────┘  │
│  Inferencia 100% local · pesos cacheados · datos no salen     │
└──────────────────────────────────────────────────────────────┘
        ▲                                   ▲
        │ consume                           │ consume
   Presentia (slides                   Cualquier app
   predictivas)                        de la suite / externa
```

**Por qué el motor primero:** es tu patrón conocido (servicio FastAPI self-hosted +
integración opt-in, igual que Anonimal y Escriba), da valor sin UI (Presentia ya lo
consume), y desacopla el engine para poder cambiar TabFM ↔ TabPFN sin tocar los clientes.

## 3. Contrato de API (v0)

Todos los endpoints reciben el dataset inline o por multipart; ninguno persiste datos por
defecto (privacy-first, igual que Anonimal).

### `POST /v1/predict`
Predice una columna objetivo para filas nuevas (clasificación o regresión, auto-detectado).
```jsonc
// request
{
  "task": "auto",                 // "auto" | "classification" | "regression"
  "target": "churn",
  "train": { "columns": [...], "rows": [ {...}, ... ] },   // filas etiquetadas
  "predict": { "rows": [ {...}, ... ] },                    // filas a predecir
  "options": { "n_estimators": 8, "return_proba": true }    // 8 = rápido; 32 = preciso
}
// response
{
  "task": "classification",
  "predictions": ["stay", "churn", ...],
  "probabilities": [ {"stay": 0.82, "churn": 0.18}, ... ],  // si return_proba
  "engine": "tabfm-1.0.0", "n_estimators": 8, "latency_ms": 1234
}
```

### `POST /v1/importance`
Drivers de la variable objetivo (permutation importance sobre un holdout interno).
```jsonc
{ "target": "churn", "dataset": {...}, "options": { "n_repeats": 5 } }
// →
{ "importance": [ {"feature": "dias_inactivo", "score": 0.21, "std": 0.03}, ... ],
  "note": "cost = n_features × n_repeats forwards; cacheado por hash de dataset" }
```

### `POST /v1/anomalies`
Filas atípicas (baja verosimilitud / desacuerdo del ensemble).
```jsonc
{ "dataset": {...}, "options": { "top_k": 20 } }
// → { "anomalies": [ {"row_index": 42, "score": 0.91, "reason": "..."}, ... ] }
```

### `POST /v1/validate`  *(out-of-fold)*
Calidad esperada del modelo sobre **estos** datos, sin fuga, usando `predict_oof`.
```jsonc
{ "target": "churn", "dataset": {...} }
// → { "metric": "accuracy", "value": 0.87, "per_class": {...}, "n_folds": ... }
```

### `GET /v1/health`
`{ "status": "ok", "engine": "tabfm-1.0.0", "device": "cuda|cpu", "weights_loaded": true }`

## 4. Contrato del engine adapter

Una sola interfaz; las implementaciones envuelven TabFM o TabPFN.

```python
class PredictionEngine(Protocol):
    name: str
    def predict(self, train_X, train_y, X, *, task, n_estimators, return_proba): ...
    def importance(self, X, y, *, n_repeats): ...   # via permutation_importance
    def anomalies(self, X, *, top_k): ...
    def validate(self, X, y, *, task): ...          # via predict_oof
    def health(self) -> dict: ...
```

`TabFMEngine` carga `google/tabfm-1.0.0-pytorch` una vez al boot (o lazy), mantiene el
modelo en memoria y reusa `TabFMClassifier` / `TabFMRegressor`. `n_estimators` expuesto
como palanca rápido/preciso (default 8 en API, 32 disponible).

## 5. Integración con la suite (env vars, estilo existente)

Copiando el patrón de Escriba/Anonimal en el README de Presentia:

| Variable | Default | Descripción |
|---|---|---|
| `AUGUR_ENABLED` | `false` | Enciende el adaptador en Presentia |
| `AUGUR_URL` | — | Base URL, ej. `http://augur:8000` |
| `AUGUR_TOKEN` | — | Token de servicio (`X-Augur-Token`) |
| `AUGUR_ENGINE` | `tabfm` | `tabfm` \| `tabpfn` |
| `AUGUR_DEVICE` | `auto` | `auto` \| `cpu` \| `cuda` |
| `AUGUR_N_ESTIMATORS` | `8` | Palanca velocidad/robustez por defecto |
| `AUGUR_TIMEOUT` | `120` | Timeout (s) |

Bloque comentado en `docker-compose.yml` de la suite (GPU opcional):
```yaml
  augur:
    build: ../augur
    environment:
      AUGUR_ENGINE: tabfm
      AUGUR_DEVICE: auto
    volumes:
      - augur_weights:/root/.cache/huggingface   # pesos cacheados, se bajan 1 vez
    # deploy: { resources: { reservations: { devices: [{capabilities: [gpu]}] } } }
```

## 6. Cómo lo consume Presentia — "insights que no alucinan"

Extiende exactamente la filosofía de `utils/chart_data_guard.py`. Hoy el guard permite
solo *"números que existen en el dataset o agregados de columna entera"*. Con Augur se
suma una tercera fuente **igual de verificable**: *"números que son salida trazable de un
modelo tabular"* (predicción, importancia, score de anomalía).

Slides nuevas, con las cifras siempre calculadas (nunca inventadas por el LLM):
- **"Factores clave"** → barras de `importance`.
- **"Proyección" / "Riesgo por segmento"** → `predict` sobre filas futuras.
- **"Casos atípicos"** → `anomalies`.

El LLM solo escribe la **narrativa** alrededor; los números vienen del sidecar. Misma
promesa "grounded, sin alucinar", ahora predictiva.

## 7. Envelope y decisiones abiertas (del spike)

- **GPU recomendada** para la app; CPU ok en datasets chicos (el segmento pyme). Cortar
  el tamaño soportado con `bench.py` → poner un `DATASET_MAX_ROWS`/`MAX_FEATURES` como en
  Presentia.
- **`n_estimators` como parámetro de producto**: "rápido" (8) vs "preciso" (32).
- **Clases**: confirmar `max_classes` real del checkpoint antes de prometer multiclase
  amplia. Regresión es nativa.
- **Importancia cacheada** por hash de dataset (es cara).
- **Engine swappable** desde el día 1: TabFM (Apache 2.0, Google) como default, TabPFN
  como alternativa/fallback.

## 8. Alcance MVP (hitos)

| Hito | Estado | Entrega |
|---|---|---|
| **M0 — Spike cerrado** | ✅ hecho (CPU) — ver `RESULTS.md` | motor real medido: fit instantáneo, **predict ~13 s/miembro en CPU → GPU obligatoria**, pesos ~16 GB, OOF de `validate()` confirmado. Falta la medición en **GPU**. |
| **M1 — Motor** | ✅ hecho (`augur/`) | FastAPI + `TabFMEngine` + `/predict` `/importance` `/anomalies` `/validate` `/health`. Dockerfile. 15 tests verdes. |
| **M2 — Suite** | ✅ costura hecha | adaptador `AugurService` (`AUGUR_*`, degradación elegante) + guard extendido (scores de Augur = tercera fuente permitida) + instrucciones de insights inyectadas. 18 tests. Falta el *slide/layout* dedicado "Factores clave" (necesita app corriendo + trabajo de template). |
| **M3 — App** | pendiente | UI mínima (subí CSV → predicción + drivers + export). |
| **M4 — Vertical** | pendiente | envoltura de un caso concreto (cobranzas/churn) como producto vendible. |

## 9. Riesgos

- **HF egress**: los pesos requieren `huggingface.co` en build/boot. Documentar
  pre-descarga + volumen cacheado para entornos cerrados (mismo tema que apareció en el spike).
- **Latencia CPU** en tablas grandes → mitigado con `n_estimators` bajo + límite de filas
  + GPU opcional.
- **Expectativas**: no es big data. El mensaje es "planillas", no "data lake". La
  limitación coincide con el segmento, no lo contradice.
