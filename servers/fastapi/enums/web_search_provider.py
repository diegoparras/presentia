from enum import Enum


class WebSearchProvider(Enum):
    AUTO = "auto"
    NATIVE = "native"
    DUCKDUCKGO = "duckduckgo"
    SEARXNG = "searxng"
    TAVILY = "tavily"
    BRAVE = "brave"
    SERPER = "serper"
