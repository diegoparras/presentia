"""TabFM viability spike (M0): load time, weight size, latency scaling, quality,
importance cost, feature-limit probe. Emits a Markdown report next to itself.

Run where there is network to huggingface.co (or with weights pre-cached):

    pip install "tabfm[pytorch] @ git+https://github.com/google-research/tabfm.git"
    python bench.py                 # writes RESULTS.md

Paste RESULTS.md back to close M0.
"""
import os
import subprocess
import time
import warnings

warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.datasets import make_classification, make_regression
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

REPORT = []


def emit(line=""):
    print(line, flush=True)
    REPORT.append(line)


def t():
    return time.perf_counter()


def _device():
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else f"cpu ({os.cpu_count()} cores)"
    except Exception:
        return "unknown"


emit("# TabFM — resultados del benchmark (M0)\n")
emit(f"- device: **{_device()}**")

from tabfm import TabFMClassifier, TabFMRegressor
from tabfm import tabfm_v1_0_0_pytorch as B

t0 = t()
clf_model = B.load()
load_clf = t() - t0
t0 = t()
reg_model = B.load(model_type="regression")
load_reg = t() - t0
emit(f"- carga pesos clasificación: **{load_clf:.1f}s**, regresión: **{load_reg:.1f}s**")

hf = os.path.expanduser(os.environ.get("HF_HOME", "~/.cache/huggingface"))
if os.path.isdir(hf):
    size = subprocess.run(["du", "-sh", hf], capture_output=True, text=True).stdout.split()
    if size:
        emit(f"- tamaño de pesos en disco: **{size[0]}**")

# ---- 1. Latencia + calidad (clasificación) ---------------------------------
emit("\n## 1. Latencia y accuracy (clasificación)\n")
emit("| train_rows | feats | fit_s | pred_s | acc |")
emit("|---|---|---|---|---|")
for n_train in [100, 500, 2000, 5000]:
    for n_feat in [10, 50]:
        X, y = make_classification(
            n_samples=n_train + 200,
            n_features=n_feat,
            n_informative=max(2, n_feat // 2),
            n_classes=3,
            random_state=0,
        )
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=200, random_state=0)
        cols = [f"f{i}" for i in range(n_feat)]
        Xtr, Xte = pd.DataFrame(Xtr, columns=cols), pd.DataFrame(Xte, columns=cols)
        clf = TabFMClassifier(model=clf_model)
        a = t()
        clf.fit(Xtr, ytr)
        fit_s = t() - a
        a = t()
        pred = clf.predict(Xte)
        pred_s = t() - a
        emit(f"| {n_train} | {n_feat} | {fit_s:.2f} | {pred_s:.2f} | {accuracy_score(yte, pred):.3f} |")

# ---- 2. Regresión ----------------------------------------------------------
emit("\n## 2. Regresión\n")
X, y = make_regression(n_samples=800, n_features=15, noise=10, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=200, random_state=0)
cols = [f"f{i}" for i in range(15)]
Xtr, Xte = pd.DataFrame(Xtr, columns=cols), pd.DataFrame(Xte, columns=cols)
reg = TabFMRegressor(model=reg_model)
a = t()
reg.fit(Xtr, ytr)
fit_s = t() - a
a = t()
pred = reg.predict(Xte)
pred_s = t() - a
emit(f"600 train / 15 feat → fit {fit_s:.2f}s · pred {pred_s:.2f}s · "
     f"R²={r2_score(yte, pred):.3f} · MAE={mean_absolute_error(yte, pred):.1f}")

# ---- 3. Permutation importance (costo del slide de drivers) ----------------
emit("\n## 3. Permutation importance (costo del 'slide de drivers')\n")
X, y = make_classification(
    n_samples=600, n_features=8, n_informative=4, n_redundant=1, n_classes=2, random_state=1
)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=150, random_state=1)
cols = [f"feat{i}" for i in range(8)]
Xtr, Xte = pd.DataFrame(Xtr, columns=cols), pd.DataFrame(Xte, columns=cols)
clf = TabFMClassifier(model=clf_model)
clf.fit(Xtr, ytr)
a = t()
imp = permutation_importance(clf, Xte, yte, n_repeats=5, random_state=0)
emit(f"8 feat · 150 rows · 5 repeats → **{t() - a:.1f}s**")
order = np.argsort(imp.importances_mean)[::-1]
emit("\n| feature | score | std |")
emit("|---|---|---|")
for i in order[:5]:
    emit(f"| {cols[i]} | {imp.importances_mean[i]:+.3f} | {imp.importances_std[i]:.3f} |")

# ---- 4. Sonda del límite de features ---------------------------------------
emit("\n## 4. Sonda de límite de features (default max_num_features=500)\n")
for n_feat in [100, 300, 500, 800]:
    try:
        X, y = make_classification(
            n_samples=400, n_features=n_feat, n_informative=min(50, n_feat // 2),
            n_classes=2, random_state=0,
        )
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=100, random_state=0)
        cols = [f"f{i}" for i in range(n_feat)]
        Xtr, Xte = pd.DataFrame(Xtr, columns=cols), pd.DataFrame(Xte, columns=cols)
        clf = TabFMClassifier(model=clf_model)
        a = t()
        clf.fit(Xtr, ytr)
        acc = accuracy_score(yte, clf.predict(Xte))
        emit(f"- {n_feat} features → ok ({t() - a:.1f}s, acc {acc:.3f})")
    except Exception as exc:
        emit(f"- {n_feat} features → **falla**: {type(exc).__name__}: {str(exc)[:80]}")

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "RESULTS.md")
with open(out, "w") as fh:
    fh.write("\n".join(REPORT) + "\n")
emit(f"\n_Reporte escrito en {out}_")
