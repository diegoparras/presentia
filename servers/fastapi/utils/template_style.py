"""
Instrucciones de estilo por template (Suite Escriba, Fase 6).

Un template puede declarar `style_instructions` en su settings.json (campo
aditivo: los templates sin él se comportan igual que siempre). Cuando el
template seleccionado lo trae, la directiva se concatena a las instructions
del pedido y llega al LLM de outline y de contenido de slides. Es el vehículo
de los prompts afinados (p. ej. español rioplatense formal del template
Institucional), y es genérico: cualquier template puede traer el suyo.

La lectura del settings.json es autocontenida (sin importar el módulo de
layouts, que tiene side effects pesados al importarse).
"""

import json
import logging
import os
from typing import Optional

LOGGER = logging.getLogger(__name__)

_TEMPLATES_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__), "..", "..", "nextjs", "app", "presentation-templates"
    )
)


def _read_template_settings(template_name: str) -> Optional[dict]:
    if (
        not template_name
        or "/" in template_name
        or "\\" in template_name
        or template_name in {".", ".."}
    ):
        return None
    # El id normalizado va en minúscula pero las carpetas pueden ir con
    # mayúscula inicial (Report, Institucional); en Linux el filesystem es
    # case-sensitive, así que probamos ambas variantes.
    for variant in dict.fromkeys([template_name, template_name.capitalize()]):
        settings_path = os.path.join(_TEMPLATES_DIR, variant, "settings.json")
        if not os.path.isfile(settings_path):
            continue
        try:
            with open(settings_path, "r", encoding="utf-8") as settings_file:
                settings = json.load(settings_file)
            return settings if isinstance(settings, dict) else None
        except Exception as exc:
            LOGGER.warning(
                "[TemplateStyle] Failed reading settings template=%r: %s",
                template_name,
                exc,
            )
            return None
    return None


def get_template_style_instructions(template_name: Optional[str]) -> Optional[str]:
    if not template_name:
        return None
    settings = _read_template_settings(template_name)
    if not settings:
        return None
    style = settings.get("style_instructions")
    if isinstance(style, str) and style.strip():
        return style.strip()
    return None


def apply_template_style(
    template_name: Optional[str], instructions: Optional[str]
) -> Optional[str]:
    """Concatena las style_instructions del template a las del usuario."""
    style = get_template_style_instructions(template_name)
    parts = [part for part in [instructions, style] if part]
    return "\n\n".join(parts) if parts else None
