"""LLM call: edit a piece of selected slide text (rewrite / shorten / expand /
fix / tone / translate). Powers the AI actions in the editor's bubble menu."""
from pydantic import BaseModel

from llmai.shared import JSONSchemaResponse, SystemMessage, UserMessage
from utils.llm_client import get_client
from utils.llm_config import get_llm_config
from utils.llm_utils import generate_structured_with_schema_retries
from utils.llm_provider import get_model
from utils.schema_utils import prepare_schema_for_validation


class EditedText(BaseModel):
    text: str


_ACTIONS = {
    "improve": "Rewrite the text to be clearer, more compelling and well written.",
    "shorten": "Make the text shorter and more concise while keeping the key meaning.",
    "expand": "Expand the text with a bit more useful detail, keeping the same style.",
    "fix": "Fix grammar, spelling and punctuation only. Do not change the meaning.",
    "professional": "Rewrite the text in a polished, professional tone.",
    "casual": "Rewrite the text in a friendly, approachable tone.",
    "translate": "Translate the text to {target}.",
}


async def edit_text_with_ai(text: str, action: str, target: str = "") -> str:
    instruction = _ACTIONS.get(action, _ACTIONS["improve"])
    if action == "translate":
        instruction = instruction.format(target=(target or "English"))

    client = get_client(config=get_llm_config())
    model = get_model()

    schema = prepare_schema_for_validation(EditedText.model_json_schema(), strict=True)
    response_format = JSONSchemaResponse(name="response", json_schema=schema, strict=True)

    messages = [
        SystemMessage(
            content=(
                "You are an expert presentation copy editor.\n"
                f"{instruction}\n"
                "Rules:\n"
                "- Return ONLY the edited text in the `text` field, no preamble or quotes.\n"
                "- Keep it suitable for a slide (concise, punchy).\n"
                "- Preserve the original language unless explicitly translating.\n"
                "- Preserve any simple inline markdown/HTML formatting already present."
            ),
        ),
        UserMessage(content=text),
    ]

    content = await generate_structured_with_schema_retries(
        client,
        model,
        messages=messages,
        response_format=response_format,
        json_schema=schema,
        strict=True,
        validate_schema=True,
    )
    return EditedText(**content).text
