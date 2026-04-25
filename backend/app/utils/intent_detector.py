# app/utils/intent_detector.py
"""
Detects user intent from message text.

Three intents:
  1. ANALYSIS    — user wants statistical analysis / summary of dataset
  2. ROW_SLICE   — user wants analysis of a specific row subset
  3. CASUAL      — greeting, short chat, unrelated question — use plain AI reply
"""

import re

# ── Analysis intent keywords ──────────────────────────────────────────────────
_ANALYSIS_PATTERNS = [
    r"\b(analyz|analyse|analysis|analyze)\b",
    r"\b(summarize|summarise|summary|overview)\b",
    r"\b(statistics?|stats?)\b",
    r"\b(insights?|profile|breakdown)\b",
    r"\b(what(?:'s| is) in (this|the) (data|dataset|file))\b",
    r"\b(tell me about (this|the) (data|dataset))\b",
    r"\b(data quality|missing values?|duplicates?|outliers?)\b",
    r"\b(numeric|categorical|columns?|distribution)\b",
    r"\b(visuali[sz]|chart|graph|plot)\b",
    r"\b(trend|forecast|predict|model|cluster)\b",
    r"\b(revenue|sales|profit|cost|price|quantity|transaction)\b",
    r"\b(average|mean|median|max|min|total|sum|count)\b",
    r"\b(show me|what are|how many|which|compare|top \d+|best|worst)\b",
    r"\b(correlation|relationship|pattern)\b",
]

_ANALYSIS_COMPILED = [re.compile(p, re.IGNORECASE) for p in _ANALYSIS_PATTERNS]

# ── Row slice patterns ────────────────────────────────────────────────────────
_SLICE_PATTERNS = [
    r"(?:first|top|show|analyze?|analysis\s+(?:for|of)|for)\s+(\d+)\s*rows?",
    r"(\d+)\s*rows?\s+(?:analysis|summary|overview|stats?)",
    r"(?:analysis|summary|overview)\s+(?:for|of)\s+(\d+)\s*rows?",
    r"(?:show|display|give)\s+(?:me\s+)?(?:the\s+)?(?:first\s+)?(\d+)\s*(?:row|record)s?",
    r"(?:analyze?|analyse)\s+(?:the\s+)?(?:first\s+)?(\d+)",
]

_SLICE_COMPILED = [re.compile(p, re.IGNORECASE) for p in _SLICE_PATTERNS]

# ── Casual patterns — greetings, small talk, off-topic ───────────────────────
# These match ONLY when the whole message is short and non-analytical.
_CASUAL_PATTERNS = [
    r"^(hi|hey|hello|howdy|hiya|yo|sup|greetings?)[\s!?.]*$",
    r"^(good\s*(morning|afternoon|evening|night|day))[\s!?.]*$",
    r"^(how are you|how's it going|what's up|wassup|how do you do)[\s!?.]*$",
    r"^(thanks?|thank you|thx|ty|cheers|great|awesome|nice|cool|ok|okay|got it|perfect|sounds good)[\s!?.]*$",
    r"^(bye|goodbye|see you|cya|later|take care)[\s!?.]*$",
    r"^(yes|no|yep|nope|sure|absolutely|definitely|of course|not really)[\s!?.]*$",
    r"^(what can you do|what are you|who are you|tell me about yourself)[\s?!.]*$",
    r"^(help|help me)[\s?!.]*$",
    r"^[\w\s]{1,15}[?!.]?$",   # any message ≤15 chars with no dataset keywords
]

_CASUAL_COMPILED = [re.compile(p, re.IGNORECASE) for p in _CASUAL_PATTERNS]


def detect_analysis_intent(message: str) -> bool:
    """Returns True if the message is asking for dataset analysis/summary."""
    for pattern in _ANALYSIS_COMPILED:
        if pattern.search(message):
            return True
    return False


def detect_row_slice(message: str) -> int | None:
    """
    Returns the requested row count if message asks for a row subset analysis.
    Returns None if no slice request detected.
    """
    for pattern in _SLICE_COMPILED:
        m = pattern.search(message)
        if m:
            n = int(m.group(1))
            if 5 <= n <= 50_000:
                return n
    return None


def detect_casual(message: str) -> bool:
    """
    Returns True if the message is casual small-talk with no dataset intent.
    A message is casual if:
      - It matches a casual pattern AND has no analysis keywords
    """
    stripped = message.strip()
    # First check: if it has any analysis keywords it's NOT casual
    if detect_analysis_intent(stripped):
        return False
    # Check casual patterns
    for pattern in _CASUAL_COMPILED:
        if pattern.match(stripped):
            return True
    return False


def detect_intent(message: str) -> dict:
    """
    Returns a dict with:
      {
        "wants_analysis": bool,
        "row_slice": int | None,   # if set, implies wants_analysis=True
        "is_casual": bool,         # True = skip dataset context, use plain AI
      }
    """
    row_slice     = detect_row_slice(message)
    wants_analysis = row_slice is not None or detect_analysis_intent(message)
    is_casual      = (not wants_analysis) and detect_casual(message)
    return {
        "wants_analysis": wants_analysis,
        "row_slice":       row_slice,
        "is_casual":       is_casual,
    }