# TabFM — resultados de M0 (medición real)

**Fecha:** 2026-07-07 · **Entorno:** contenedor CPU, 4 cores, sin GPU · backend PyTorch ·
`HF_HUB_DISABLE_XET=1`. Medido con el motor real tras habilitar egress a HuggingFace.

## Carga y pesos

| Métrica | Valor |
|---|---|
| Descarga inicial (2 archivos, sin token) | ~2m50s |
| Tamaño de pesos en disco | **~16 GB** (clasificación + regresión) |
| Carga clasificación (cacheado) | ~14–16 s |
| Carga regresión (cacheado) | ~20–88 s (primera vez más lenta) |
| Dependencia faltante detectada | **`safetensors`** (no la trae el extra `[pytorch]`) |

## Latencia en CPU — el hallazgo decisivo

Dataset: 200 filas train / 100 test / 10 features. `fit` es **instantáneo (~0.15 s)**;
el costo está **todo en `predict`** (in-context: reprocesa el train como contexto en cada
forward, × miembros del ensemble).

| n_estimators | predict (100 filas) | accuracy |
|---|---|---|
| 1 | **13.5 s** | 0.930 |
| 4 | 53.5 s | 0.930 |
| 8 | 104.1 s | 0.940 |

- **Escala lineal con el ensemble** (~13 s por miembro por 100 predicciones en CPU).
- **Conclusión: en CPU es prohibitivo.** ~100 s para predecir 100 filas triviales con el
  default de 8. **GPU es obligatoria** para uso interactivo (el propio código está tuneado
  para GPU de 40 GB). En CPU solo sirve para lotes chicos y offline.
- **`n_estimators` es una palanca real**: n=1 ya da buena accuracy (en datos sintéticos
  fáciles casi no mejora con más). El default de Augur (8) es un buen equilibrio; un modo
  "turbo" con n=1 es viable y ~8× más rápido.

## Calidad zero-shot

- Clasificación (3 clases, sintético): accuracy **0.92–0.94** sin entrenar.
- Regresión (15 feat, ruido): R² alto en holdout.
- **OOF (validate, sin fuga)**: accuracy 0.827 (clasificación), R² 0.994 (regresión) —
  números sensatos, más bajos que in-sample como corresponde.

## Confirmación de código (validate / OOF)

El único camino que no se había podido verificar sin pesos:

| Método | Shape real | Manejo en `tabfm_engine.py` |
|---|---|---|
| `clf.predict_oof_proba()` | `(E, N, K)` = `(1, 150, 3)` | `if ndim==3: mean(axis=0)` ✓ correcto |
| `reg.predict_oof()` | `(E, N)` = `(1, 150)` | `if ndim==2: mean(axis=0)` ✓ correcto |

`E` = miembros del ensemble (1 aquí por `n_estimators=1`; con más, el promedio sobre
`axis=0` los combina). **El `validate()` del motor quedó verificado.**

## Envelope (confirmado)

- `max_num_features` default **500** (parámetro del clasificador/regresor).
- `max_num_rows` sin límite duro, pero la memoria crece con `filas × features` y la
  latencia con las filas (más contexto in-context).

## Implicancias para el producto

1. **GPU obligatoria** para la app/microservicio en producción. Documentar y default a GPU;
   CPU solo para datasets muy chicos u offline.
2. **`AUGUR_N_ESTIMATORS`** confirmado como palanca velocidad↔calidad (8 default, 1 turbo).
3. **Pesos ~16 GB**: dimensionar el volumen `/weights` y la RAM/VRAM en consecuencia.
4. **Agregar `safetensors`** al install de TabFM (fix aplicado en el Dockerfile de Augur).
5. La ruta de "drivers" (permutation importance) multiplica los `predict` → en CPU es
   inviable; en GPU medir aparte. Cachear por hash de dataset.
