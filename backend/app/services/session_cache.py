# app/services/session_cache.py
"""
In-memory session cache — stores DataFrame, profile context, and chart data.
TTL: 1 hour.  Thread-safe with Lock.
"""

import time
import threading

_cache: dict = {}
_lock = threading.Lock()
TTL   = 3600   # 1 hour


def store_session(session_id: str, df, profile_context: str,
                  file_name: str, chart_data: dict = None):
    with _lock:
        _cache[session_id] = {
            "df":              df,
            "profile_context": profile_context,
            "file_name":       file_name,
            "chart_data":      chart_data or {},
            "created_at":      time.time(),
        }


def get_session(session_id: str) -> dict | None:
    with _lock:
        entry = _cache.get(session_id)
        if entry is None:
            return None
        if time.time() - entry["created_at"] > TTL:
            del _cache[session_id]
            return None
        return entry


def clear_session(session_id: str):
    with _lock:
        _cache.pop(session_id, None)