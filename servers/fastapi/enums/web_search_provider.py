from enum import Enum


class WebSearchProvider(Enum):
    AUTO = "auto"
    NATIVE = "native"
    SEARXNG = "searxng"
    TAVILY = "tavily"
    BRAVE = "brave"
    SERPER = "serper"
