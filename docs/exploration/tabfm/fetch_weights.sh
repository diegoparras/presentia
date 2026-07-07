#!/usr/bin/env bash
# Pre-descarga los pesos de TabFM (Opción B): correr donde HAYA red a
# huggingface.co, luego copiar el directorio a un entorno cerrado y apuntar
# HF_HOME ahí. También sirve como cache local para el Docker de Augur
# (volumen /weights).
set -euo pipefail

export HF_HOME="${HF_HOME:-$PWD/weights}"
echo "Descargando google/tabfm-1.0.0-pytorch en $HF_HOME ..."

pip install -q "huggingface-hub[cli]"
huggingface-cli download google/tabfm-1.0.0-pytorch --repo-type model

echo "Listo. Tamaño:"; du -sh "$HF_HOME"
echo "Para usar: exportá HF_HOME=$HF_HOME (o montá ese dir en /weights del contenedor Augur)."
