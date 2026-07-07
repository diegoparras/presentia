# Augur — microservicio de predicción tabular (backend PyTorch CPU por defecto).
# Para GPU: partir de una base CUDA e instalar el torch correspondiente.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/weights

WORKDIR /app

# Dependencias del servicio.
COPY pyproject.toml README.md ./
COPY augur ./augur
RUN pip install .

# Motor real TabFM (Apache 2.0). Los pesos (~16 GB) NO se hornean en la imagen:
# se descargan a /weights en la primera predicción — montá un volumen ahí para
# cachearlos y para entornos sin egress a huggingface.co, pre-descargalos.
# `safetensors` es requerido por el backend PyTorch y el extra no lo trae.
RUN pip install "tabfm[pytorch] @ git+https://github.com/google-research/tabfm.git" safetensors

EXPOSE 8000
VOLUME ["/weights"]

CMD ["uvicorn", "augur.main:app", "--host", "0.0.0.0", "--port", "8000"]
