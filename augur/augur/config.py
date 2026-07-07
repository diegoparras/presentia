"""Configuración por entorno (prefijo AUGUR_), al estilo de Anonimal/Escriba."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AUGUR_", env_file=".env", extra="ignore"
    )

    # Motor a usar. "tabfm" (default) o "fake" (para tests/CI sin pesos).
    engine: str = "tabfm"
    # "auto" | "cpu" | "cuda"
    device: str = "auto"
    # Palanca velocidad/robustez por defecto (32 = calidad máxima, 8 = rápido).
    n_estimators: int = 8
    # Token opcional de servicio; si está seteado se exige en X-Augur-Token.
    token: Optional[str] = None
    # Límites de tamaño (el envelope de TabFM: hasta ~500 features).
    max_rows: int = 10_000
    max_features: int = 500
    timeout: int = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()
