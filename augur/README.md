# Augur

**Predicción tabular zero-shot, self-hosted, sin alucinar.**

Microservicio que expone un foundation model tabular
([TabFM](https://github.com/google-research/tabfm), Apache 2.0) sobre una API HTTP
simple: subís una tabla, obtenés predicciones, drivers, validación y anomalías —
**sin entrenar nada** y **sin que los datos salgan de tu host**. El satélite de
*datos estructurados* de la Escriba Suite (el complemento de Presentia: si Presentia
es "documentos → decks", Augur es "planillas → predicciones").

> Estado: **MVP (M1)**. El servicio y sus endpoints andan y están testeados con un
> motor `fake`. El motor TabFM real requiere red a HuggingFace para bajar pesos
> (ver [SPIKE](../docs/exploration/tabfm/SPIKE.md)).

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/v1/health` | Estado, motor y device. |
| `POST` | `/v1/predict` | Predice una columna objetivo (clasificación/regresión, auto-detectado). |
| `POST` | `/v1/importance` | Drivers de la variable objetivo (permutation importance). |
| `POST` | `/v1/anomalies` | Filas atípicas (IsolationForest). |
| `POST` | `/v1/validate` | Calidad esperada sobre estos datos, out-of-fold (sin fuga). |

Contrato completo en [`docs/exploration/tabfm/DISENO-MVP.md`](../docs/exploration/tabfm/DISENO-MVP.md).

### Ejemplo

```bash
curl -X POST http://localhost:8000/v1/predict -H "Content-Type: application/json" -d '{
  "target": "churn",
  "train":   {"rows": [
    {"dias_inactivo": 3,  "plan": "pro",   "churn": "stay"},
    {"dias_inactivo": 60, "plan": "free",  "churn": "churn"}
  ]},
  "predict": {"rows": [{"dias_inactivo": 45, "plan": "free"}]},
  "options": {"n_estimators": 8, "return_proba": true}
}'
```

## Correr

```bash
# Servicio (con motor fake, sin pesos):
pip install -e .[dev]
AUGUR_ENGINE=fake uvicorn augur.main:app --reload

# Con el motor real TabFM (baja ~16 GB de pesos de HuggingFace la primera vez;
# safetensors es requerido por el backend PyTorch y el extra no lo trae):
pip install "tabfm[pytorch] @ git+https://github.com/google-research/tabfm.git" safetensors
AUGUR_ENGINE=tabfm uvicorn augur.main:app   # GPU muy recomendada: en CPU predict es lento

# Docker:
docker build -t augur . && docker run -p 8000:8000 -v augur_weights:/weights augur
```

## Tests

```bash
pip install -e .[dev]
pytest        # corren con el motor fake — no requieren red ni GPU
```

## Configuración

Variables `AUGUR_*` (ver [`.env.example`](.env.example)): `AUGUR_ENGINE`
(`tabfm`|`fake`), `AUGUR_DEVICE` (`auto`|`cpu`|`cuda`), `AUGUR_N_ESTIMATORS`
(velocidad↔calidad), `AUGUR_TOKEN` (auth opcional), `AUGUR_MAX_ROWS`,
`AUGUR_MAX_FEATURES`.

## Arquitectura

El servicio está desacoplado del modelo por `augur/engine/base.py::PredictionEngine`.
Implementaciones: `TabFMEngine` (real) y `FakeEngine` (tests). Cambiar de motor
—o agregar TabPFN— no toca los endpoints.

Licencia: Apache 2.0 (igual que TabFM y el resto de la suite).
