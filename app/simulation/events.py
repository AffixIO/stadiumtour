"""Live event stream and audit-log sanitiser.

Credit: @paparichens
"""

from __future__ import annotations

import asyncio
from collections import deque
from datetime import UTC, datetime
from typing import Any

from fastapi import WebSocket

FORBIDDEN_PII_KEYS = {
    "name",
    "first_name",
    "last_name",
    "dob",
    "birth_date",
    "vehicle_registration",
    "ticket_number",
    "email",
    "phone",
}

ALLOWED_EVENT_FIELDS = {
    "timestamp",
    "zone",
    "checkpoint_id",
    "event_hash",
    "requested_action",
    "decision",
    "verification_method",
    "latency_ms",
    "signature_status",
    "attack_flag",
    "reason",
}


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def assert_no_pii(payload: dict[str, Any]) -> None:
    lower_keys = {k.lower() for k in payload}
    collision = lower_keys.intersection(FORBIDDEN_PII_KEYS)
    if collision:
        raise ValueError(f"PII key(s) blocked in audit event: {sorted(collision)}")


def sanitise_event(payload: dict[str, Any]) -> dict[str, Any]:
    assert_no_pii(payload)
    clean = {k: payload[k] for k in ALLOWED_EVENT_FIELDS if k in payload}
    clean.setdefault("timestamp", utc_now_iso())
    return clean


class EventBus:
    def __init__(self, max_events: int = 300) -> None:
        self._events: deque[dict[str, Any]] = deque(maxlen=max_events)
        self._sockets: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, socket: WebSocket) -> None:
        await socket.accept()
        async with self._lock:
            self._sockets.add(socket)
        await socket.send_json({"type": "snapshot", "events": list(self._events)[-50:]})

    async def disconnect(self, socket: WebSocket) -> None:
        async with self._lock:
            self._sockets.discard(socket)

    async def publish(self, payload: dict[str, Any]) -> dict[str, Any]:
        event = sanitise_event(payload)
        self._events.append(event)
        dead: list[WebSocket] = []
        async with self._lock:
            for socket in self._sockets:
                try:
                    await socket.send_json({"type": "event", "event": event})
                except Exception:
                    dead.append(socket)
            for socket in dead:
                self._sockets.discard(socket)
        return event

    def tail(self, size: int = 50) -> list[dict[str, Any]]:
        return list(self._events)[-size:]
