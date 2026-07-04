from enum import Enum


class WebSearchProvider(Enum):
    AUTO = "auto"
    NATIVE = "native"
    SEARCHGIRL = "searchgirl"
    SEARXNG = "searxng"
    TAVILY = "tavily"
    EXA = "exa"
    BRAVE = "brave"
    SERPER = "serper"
