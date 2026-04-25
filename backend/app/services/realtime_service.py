# app/services/realtime_service.py
"""
MODULE 3 — REAL-TIME ANALYTICS ENGINE
WebSocket streaming for live data, incremental dataset updates,
live chart ticks, and user-definable data streams.
"""

import asyncio
import json
import random
import time
from typing import Optional, Callable
from datetime import datetime, timedelta
from fastapi import WebSocket


# ── Active connections registry ───────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket]  = {}   # stream_id → websocket
        self.streams: dict[str, dict]      = {}   # stream_id → stream_config
        self.tasks: dict[str, asyncio.Task] = {}  # stream_id → background task

    async def connect(self, stream_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active[stream_id] = websocket

    def disconnect(self, stream_id: str):
        self.active.pop(stream_id, None)
        t = self.tasks.pop(stream_id, None)
        if t and not t.done():
            t.cancel()
        self.streams.pop(stream_id, None)

    async def send(self, stream_id: str, data: dict):
        ws = self.active.get(stream_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(stream_id)

    async def broadcast(self, data: dict):
        for sid in list(self.active.keys()):
            await self.send(sid, data)


manager = ConnectionManager()


# ── Stream definitions ────────────────────────────────────────────────────────
STREAM_TYPES = {
    "stock":   {"label": "Stock Prices",       "unit": "USD",    "icon": "📈"},
    "sales":   {"label": "Live Sales",         "unit": "units",  "icon": "🛒"},
    "iot":     {"label": "IoT Sensor",         "unit": "°C",     "icon": "🌡️"},
    "traffic": {"label": "Website Traffic",    "unit": "req/s",  "icon": "🌐"},
    "revenue": {"label": "Revenue Stream",     "unit": "USD",    "icon": "💰"},
    "custom":  {"label": "Custom Data Stream", "unit": "",       "icon": "⚡"},
}


def create_stream_config(stream_type: str, label: str = None,
                         interval_ms: int = 1000,
                         y_axis_label: str = None,
                         x_axis_label: str = "Time",
                         min_val: float = 0, max_val: float = 100,
                         user_values: list[float] = None) -> dict:
    """
    Create a stream configuration.
    user_values: if provided, cycles through these values instead of generating random ones.
    """
    meta  = STREAM_TYPES.get(stream_type, STREAM_TYPES["custom"])
    return {
        "stream_id":    None,   # assigned on registration
        "stream_type":  stream_type,
        "label":        label or meta["label"],
        "unit":         meta["unit"],
        "icon":         meta["icon"],
        "interval_ms":  max(200, interval_ms),
        "x_axis_label": x_axis_label,
        "y_axis_label": y_axis_label or meta["unit"],
        "min_val":      min_val,
        "max_val":      max_val,
        "user_values":  user_values or [],
        "history":      [],
        "tick":         0,
    }


def _next_value(config: dict) -> float:
    """Generate next data point for a stream."""
    if config["user_values"]:
        idx = config["tick"] % len(config["user_values"])
        return float(config["user_values"][idx])

    t = config["stream_type"]
    prev = config["history"][-1]["y"] if config["history"] else (config["min_val"] + config["max_val"]) / 2

    if t == "stock":
        return round(prev * (1 + random.gauss(0, 0.005)), 2)
    if t == "iot":
        return round(20 + 5 * (0.5 + 0.5 * (config["tick"] % 24) / 24) + random.gauss(0, 0.3), 2)
    if t == "traffic":
        base = 100 + 50 * abs((config["tick"] % 60) - 30) / 30
        return round(base + random.gauss(0, 5), 0)
    if t == "sales":
        return round(random.expovariate(1 / 20), 1)
    if t == "revenue":
        return round(prev + random.gauss(500, 100), 2)

    # generic random walk within min/max
    mn, mx = config["min_val"], config["max_val"]
    step   = (mx - mn) * 0.03
    new_v  = prev + random.gauss(0, step)
    return round(max(mn, min(mx, new_v)), 2)


def _tick_payload(config: dict) -> dict:
    """Build a single tick payload to send over WebSocket."""
    now   = datetime.utcnow()
    value = _next_value(config)
    config["tick"] += 1

    point = {
        "x": now.strftime("%H:%M:%S"),
        "y": value,
        "ts": now.isoformat(),
    }
    config["history"].append(point)
    if len(config["history"]) > 200:
        config["history"] = config["history"][-200:]

    prev_val = config["history"][-2]["y"] if len(config["history"]) >= 2 else value
    change   = round(value - prev_val, 4)
    change_pct = round(change / prev_val * 100, 2) if prev_val != 0 else 0

    return {
        "type":         "tick",
        "stream_id":    config.get("stream_id"),
        "stream_type":  config["stream_type"],
        "label":        config["label"],
        "unit":         config["unit"],
        "x_axis_label": config["x_axis_label"],
        "y_axis_label": config["y_axis_label"],
        "point":        point,
        "history":      config["history"][-60:],   # last 60 points for chart
        "current":      value,
        "change":       change,
        "change_pct":   change_pct,
        "trend":        "up" if change > 0 else ("down" if change < 0 else "flat"),
        "tick":         config["tick"],
    }


async def stream_loop(stream_id: str):
    """Background task: send ticks at configured interval."""
    config = manager.streams.get(stream_id)
    if not config:
        return
    interval = config["interval_ms"] / 1000
    try:
        while stream_id in manager.active:
            payload = _tick_payload(config)
            await manager.send(stream_id, payload)
            await asyncio.sleep(interval)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        await manager.send(stream_id, {"type": "error", "message": str(e)})


async def handle_websocket(websocket: WebSocket, stream_id: str, config: dict):
    """
    Full WebSocket handler.
    Sends initial config, then starts streaming loop.
    Also handles incoming messages (pause, resume, add_value, change_interval).
    """
    config["stream_id"] = stream_id
    await manager.connect(stream_id, websocket)
    manager.streams[stream_id] = config

    # Send initial handshake
    await manager.send(stream_id, {
        "type":    "connected",
        "stream_id": stream_id,
        "config":  {k: v for k, v in config.items() if k not in ("history",)},
        "streams": list(STREAM_TYPES.keys()),
    })

    # Start background tick loop
    task = asyncio.create_task(stream_loop(stream_id))
    manager.tasks[stream_id] = task

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                await _handle_client_message(stream_id, msg)
            except json.JSONDecodeError:
                pass
    except Exception:
        pass
    finally:
        manager.disconnect(stream_id)
        if not task.done():
            task.cancel()


async def _handle_client_message(stream_id: str, msg: dict):
    """Handle control messages from client."""
    config = manager.streams.get(stream_id)
    if not config:
        return
    action = msg.get("action")

    if action == "pause":
        t = manager.tasks.pop(stream_id, None)
        if t: t.cancel()
        await manager.send(stream_id, {"type": "paused"})

    elif action == "resume":
        task = asyncio.create_task(stream_loop(stream_id))
        manager.tasks[stream_id] = task
        await manager.send(stream_id, {"type": "resumed"})

    elif action == "set_interval":
        config["interval_ms"] = max(200, int(msg.get("interval_ms", 1000)))
        await manager.send(stream_id, {"type": "config_updated", "interval_ms": config["interval_ms"]})

    elif action == "add_value":
        val = float(msg.get("value", 0))
        config["user_values"].append(val)
        await manager.send(stream_id, {"type": "value_added", "total": len(config["user_values"])})

    elif action == "set_labels":
        config["x_axis_label"] = msg.get("x_label", config["x_axis_label"])
        config["y_axis_label"] = msg.get("y_label", config["y_axis_label"])
        await manager.send(stream_id, {"type": "labels_updated"})

    elif action == "set_range":
        config["min_val"] = float(msg.get("min", config["min_val"]))
        config["max_val"] = float(msg.get("max", config["max_val"]))
        await manager.send(stream_id, {"type": "range_updated"})

    elif action == "clear_history":
        config["history"] = []
        config["tick"]    = 0
        await manager.send(stream_id, {"type": "history_cleared"})

    elif action == "get_history":
        await manager.send(stream_id, {"type": "history", "data": config["history"]})


def get_stream_types() -> dict:
    return STREAM_TYPES