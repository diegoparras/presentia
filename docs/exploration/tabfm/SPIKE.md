# Spike técnico — TabFM v1.0.0

**Fecha:** 2026-07-07 · **Objetivo:** validar si TabFM sirve como motor de un producto
self-hosted de predicción tabular para la Escriba Suite.

## TL;DR

TabFM es **viable como base de producto** en licencia y arquitectura. El único punto
que **no pude medir en esta sesión** es la latencia real: la política de egress de la
organización bloquea `huggingface.co` (donde viven los pesos), así que el modelo no se
pudo cargar aquí. La medición de runtime queda pendiente de correr en un entorno con
salida a HuggingFace (script listo: [`bench.py`](./bench.py)).

## Qué se validó (sin bajar pesos)

| Aspecto | Resultado | Fuente |
|---|---|---|
| **Licencia** | **Apache 2.0** — misma que Presentia y el resto de la suite. Uso comercial y redistribución permitidos. | `LICENSE`, `pyproject.toml` |
| **Instalación** | `pip install -e .[pytorch]` limpio en Python 3.11, CPU. Torch 2.12.1. | ejecutado ✅ |
| **API** | `scikit-learn`-compatible: `TabFMClassifier` / `TabFMRegressor`, `.fit()` / `.predict()` / `.predict_proba()`. | ejecutado ✅ |
| **Extras útiles** | `predict_oof` / `predict_oof_proba` (out-of-fold, sirve para validar sobre el propio train sin fuga). | API inspeccionada ✅ |
| **Feature importance** | **NO hay `feature_importances_` nativo.** Se obtiene con `sklearn.inspection.permutation_importance` (model-agnostic, funciona por ser sklearn-compatible), a costo de N·repeats forwards. | API inspeccionada ✅ |
| **Pesos** | Se descargan solos de HF: repo `google/tabfm-1.0.0-pytorch`, subcarpetas `classification` / `regression`. Requiere red a `huggingface.co`. | `tabfm/src/pytorch/tabfm_v1_0_0.py:25` |

## Bloqueo encontrado

```
httpx.ProxyError: 403 Forbidden  →  CONNECT huggingface.co:443
```

Es una **denegación de política de egress**, no un error de TLS ni algo a sortear. Los
pesos de TabFM solo se publican en HuggingFace Hub. Para completar el benchmark:

- correr `bench.py` en un entorno/red con salida a `huggingface.co`, **o**
- pre-descargar los pesos (`huggingface-cli download google/tabfm-1.0.0-pytorch`) donde
  haya red y montarlos vía cache de HF.

## Envelope técnico real (leído del código)

Estos son los datos que definen el **tamaño de problema** que el producto puede prometer:

- **In-context, un solo forward por el fold completo.** El comentario en
  `pytorch/model.py:427` lo dice explícito: *"TabFM runs the whole training fold as one
  in-context sequence"* → la memoria crece con `filas × features`. Tareas grandes
  hacen OOM en GPU; por eso hay chunking siempre activo.
- **Diseñado para escala TabArena en GPU de 40 GB.** Los chunks (`_ROW_CHUNK_SIZE=4096`,
  `_COL_CHUNK_SIZE=16`, `_FFN_CHUNK_SIZE=8192`) están *"chosen for memory safety on a
  40 GB GPU across TabArena-scale tasks"*. Traducción: **el runtime pensado es GPU**;
  CPU funciona pero será lento en tablas grandes.
- **Ensemble de 32 por defecto** (`n_estimators=32`): cada `.predict()` corre **32
  forwards** con feature-shuffles distintos y promedia. Es la palanca #1 de
  latencia/calidad — bajarlo a 4–8 acelera mucho a cambio de algo de robustez.
- **Clases acotadas por el checkpoint** (`max_classes` es parámetro de arquitectura). El
  ejemplo oficial usa 3 clases; hay que confirmar el límite real del checkpoint v1.0.0
  antes de prometer clasificación multiclase amplia. Regresión es nativa.

## Implicancias para el producto

1. **GPU recomendada** para la app de cara a usuario; CPU sirve para datasets chicos
   (planillas de pyme, que es el segmento). Confirmar el corte exacto con `bench.py`.
2. **La importancia ("slide de drivers") cuesta**: `permutation_importance` = `n_features
   × n_repeats` predicciones, y cada predicción ya son 32 forwards. Cachear y/o bajar
   `n_estimators` para esa ruta.
3. **Privacidad intacta**: los pesos bajan una vez de Google/HF; la **inferencia es
   local** y los datos del usuario nunca salen del server. La tesis self-hosted se
   sostiene con el modelo real.
4. **`n_estimators` configurable** es un buen parámetro de producto: "rápido" vs "preciso".

## Cómo cerrar M0 (un solo comando con red a HuggingFace)

```bash
cd docs/exploration/tabfm
pip install "tabfm[pytorch] @ git+https://github.com/google-research/tabfm.git"

python bench.py          # → escribe RESULTS.md (latencia, acc/R²/MAE, importancia, límite de features)
python verify_engine.py  # ejercita el TabFMEngine real de Augur end-to-end (predict/importance/validate)
```

- **`bench.py`** reporta: carga + tamaño de pesos en disco, latencia `fit`/`predict`
  por (filas × features), accuracy/R²/MAE, costo de `permutation_importance`, y una
  **sonda del límite de features** (default `max_num_features=500`). Deja un `RESULTS.md`
  que se puede pegar de vuelta para cerrar M0.
- **`verify_engine.py`** confirma el motor real de Augur y, de paso, el **manejo de
  shape del OOF en `validate()`** (el único camino que no se pudo verificar sin red).
- **`fetch_weights.sh`** (Opción B): pre-descarga los pesos donde haya red y los deja en
  `HF_HOME` para montarlos en un entorno cerrado o en el volumen `/weights` del Docker de Augur.
