"""Verificación end-to-end del TabFMEngine real de Augur (cierra M0).

Ejercita predict/importance/validate del motor tal como lo usa el microservicio,
con pesos reales. Confirma de paso el manejo de shape del OOF en validate() —el
único camino que no se pudo verificar sin red a HuggingFace—.

    pip install "tabfm[pytorch] @ git+https://github.com/google-research/tabfm.git"
    python verify_engine.py
"""
import os
import sys
import warnings

warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd

# Importa el paquete augur (../../.. /augur respecto de este archivo).
HERE = os.path.dirname(os.path.abspath(__file__))
AUGUR = os.path.abspath(os.path.join(HERE, "..", "..", "..", "augur"))
sys.path.insert(0, AUGUR)

from augur.engine.tabfm_engine import TabFMEngine  # noqa: E402

engine = TabFMEngine(device="auto")
rng = np.random.default_rng(0)

# Dataset de clasificación de juguete.
n = 200
df = pd.DataFrame(
    {
        "dias_inactivo": rng.integers(0, 90, n),
        "gasto": rng.normal(100, 30, n).round(2),
        "plan": rng.choice(["free", "pro"], n),
    }
)
churn = ((df["dias_inactivo"] > 45) | (df["gasto"] < 80)).map({True: "churn", False: "stay"})

X, y = df.iloc[:150], churn.iloc[:150]
X_new = df.iloc[150:]

print("== predict ==")
res = engine.predict(X, y, X_new, task="classification", n_estimators=8, return_proba=True)
print("clases:", res.classes)
print("primeras 3 preds:", res.predictions[:3])
print("primera proba:", res.probabilities[0])

print("\n== importance ==")
for fi in engine.importance(X, y, task="classification", n_repeats=5, n_estimators=8):
    print(f"  {fi.feature}: {fi.score:+.3f} ± {fi.std:.3f}")

print("\n== validate (OOF) ==")
val = engine.validate(X, y, task="classification")
print(f"  {val.metric} = {val.value:.3f}  detalle={val.detail}")

print("\n== validate regresión (chequeo shape OOF [E,N]) ==")
yr = df["gasto"].iloc[:150]
valr = engine.validate(df.iloc[:150].drop(columns=["gasto"]), yr, task="regression")
print(f"  {valr.metric} = {valr.value:.3f}")

print("\nOK — motor real verificado end-to-end.")
