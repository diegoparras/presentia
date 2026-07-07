"""TabFM viability spike: load time, weight size, latency scaling, quality, importance."""
import time, os, subprocess, warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.datasets import make_classification, make_regression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score
from sklearn.inspection import permutation_importance

def t():
    return time.perf_counter()

print("### 1. LOAD + WEIGHT SIZE ###", flush=True)
from tabfm import TabFMClassifier, TabFMRegressor
from tabfm import tabfm_v1_0_0_pytorch as B

t0 = t()
clf_model = B.load()                       # classification weights
print(f"load(classification): {t()-t0:.1f}s", flush=True)
t0 = t()
reg_model = B.load(model_type="regression")
print(f"load(regression):     {t()-t0:.1f}s", flush=True)

# HF cache size
hf = os.path.expanduser("~/.cache/huggingface")
if os.path.isdir(hf):
    sz = subprocess.run(["du","-sh",hf], capture_output=True, text=True).stdout.split()[0]
    print(f"HF weight cache on disk: {sz}", flush=True)

print("\n### 2. LATENCY SCALING (classification, CPU) ###", flush=True)
print(f"{'train_rows':>10} {'feats':>6} {'test_rows':>9} {'fit_s':>7} {'pred_s':>7} {'acc':>6}", flush=True)
for n_train in [100, 500, 2000, 5000]:
    for n_feat in [10, 50]:
        X, y = make_classification(n_samples=n_train+200, n_features=n_feat,
                                   n_informative=max(2,n_feat//2), n_classes=3,
                                   random_state=0)
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=200, random_state=0)
        Xtr = pd.DataFrame(Xtr, columns=[f"f{i}" for i in range(n_feat)])
        Xte = pd.DataFrame(Xte, columns=[f"f{i}" for i in range(n_feat)])
        clf = TabFMClassifier(model=clf_model)
        a = t(); clf.fit(Xtr, ytr); fit_s = t()-a
        a = t(); pred = clf.predict(Xte); pred_s = t()-a
        acc = accuracy_score(yte, pred)
        print(f"{n_train:>10} {n_feat:>6} {200:>9} {fit_s:>7.2f} {pred_s:>7.2f} {acc:>6.3f}", flush=True)

print("\n### 3. REGRESSION SANITY ###", flush=True)
X, y = make_regression(n_samples=800, n_features=15, noise=10, random_state=0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=200, random_state=0)
Xtr = pd.DataFrame(Xtr, columns=[f"f{i}" for i in range(15)])
Xte = pd.DataFrame(Xte, columns=[f"f{i}" for i in range(15)])
reg = TabFMRegressor(model=reg_model)
a = t(); reg.fit(Xtr, ytr); fit_s = t()-a
a = t(); pred = reg.predict(Xte); pred_s = t()-a
print(f"600 train / 15 feat -> fit {fit_s:.2f}s  pred {pred_s:.2f}s  R2={r2_score(yte,pred):.3f}", flush=True)

print("\n### 4. PERMUTATION IMPORTANCE (cost of 'drivers' slide) ###", flush=True)
X, y = make_classification(n_samples=600, n_features=8, n_informative=4,
                           n_redundant=1, n_classes=2, random_state=1)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=150, random_state=1)
cols = [f"feat{i}" for i in range(8)]
Xtr = pd.DataFrame(Xtr, columns=cols); Xte = pd.DataFrame(Xte, columns=cols)
clf = TabFMClassifier(model=clf_model); clf.fit(Xtr, ytr)
a = t()
imp = permutation_importance(clf, Xte, yte, n_repeats=5, random_state=0)
imp_s = t()-a
order = np.argsort(imp.importances_mean)[::-1]
print(f"permutation_importance (8 feat, 150 rows, 5 repeats): {imp_s:.1f}s", flush=True)
for i in order[:5]:
    print(f"  {cols[i]:>7}: {imp.importances_mean[i]:+.3f} ± {imp.importances_std[i]:.3f}", flush=True)

print("\nDONE", flush=True)
