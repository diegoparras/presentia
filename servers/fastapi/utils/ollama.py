import json
from typing import AsyncGenerator
import aiohttp
from fastapi import HTTPException

from models.ollama_model_status import OllamaModelStatus
from utils.get_env import get_ollama_url_env


def _ollama_unreachable_error() -> HTTPException:
    ollama_url = (get_ollama_url_env() or "http://localhost:11434").rstrip("/")
    return HTTPException(
        status_code=503,
        detail=(
            f"Could not connect to Ollama at {ollama_url}. "
            "When Presenton runs in Docker, use host.docker.internal instead of localhost."
        ),
    )


async def pull_ollama_model(model: str) -> AsyncGenerator[dict, None]:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{(get_ollama_url_env() or 'http://localhost:11434').rstrip('/')}/api/pull",
                json={"model": model},
            ) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to pull model: {await response.text()}",
                    )

                async for line in response.content:
                    if not line.strip():
                        continue

                    try:
                        event = json.loads(line.decode("utf-8"))
                    except json.JSONDecodeError:
                        continue

                    yield event
    except aiohttp.ClientConnectionError as error:
        raise _ollama_unreachable_error() from error


async def list_pulled_ollama_models() -> list[OllamaModelStatus]:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{(get_ollama_url_env() or 'http://localhost:11434').rstrip('/')}/api/tags",
            ) as response:
                if response.status == 200:
                    pulled_models = await response.json()
                    return [
                        OllamaModelStatus(
                            name=m["model"],
                            size=m["size"],
                            status="pulled",
                            downloaded=m["size"],
                            done=True,
                        )
                        for m in pulled_models["models"]
                    ]
                elif response.status == 403:
                    raise HTTPException(
                        status_code=403,
                        detail="Forbidden: Please check your Ollama Configuration",
                    )
                else:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to list Ollama models: {response.status}",
                    )
    except aiohttp.ClientConnectionError as error:
        raise _ollama_unreachable_error() from error
