"""FastAPI entrypoint for AffixIO Access Arena.

Credit: @paparichens
"""

from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager
from dataclasses import asdict
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.simulation.engine import AccessArenaEngine
from app.simulation.events import EventBus
from app.simulation.models import AttackType, Persona, PulseState


class ScanPayload(BaseModel):
    persona: Persona
    checkpoint_id: str = Field(min_length=2, max_length=64)
    action: str = Field(min_length=2, max_length=96)


class AttackPayload(BaseModel):
    persona: Persona
    attack: AttackType


class PulsePayload(BaseModel):
    pulse: PulseState


STATIC_DIR = Path(__file__).parent / "static"
SEED = int(os.getenv("AFFIXIO_SEED", "20260818"))

engine = AccessArenaEngine(seed=SEED)
event_bus = EventBus(max_events=600)
PULSE_TASK: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global PULSE_TASK
    PULSE_TASK = asyncio.create_task(engine.pulse_task())
    try:
        yield
    finally:
        if PULSE_TASK:
            PULSE_TASK.cancel()


app = FastAPI(title="AffixIO Access Arena", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_store_static(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") or request.url.path == "/favicon.ico":
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/favicon.ico")
async def favicon() -> FileResponse:
    return FileResponse(STATIC_DIR / "favicon.svg", media_type="image/svg+xml")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config")
async def config() -> dict[str, Any]:
    persona_meta = {
        persona.value: {
            "label": persona.value.replace("_", " ").title(),
            "role_level": engine.get_wallet(persona).role_level,
            "seat_section": engine.get_wallet(persona).seat_section,
            "fingerprint": engine.get_wallet(persona).token_fingerprint,
        }
        for persona in Persona
    }
    return {
        "seed": engine.seed,
        "merkle_root": engine.merkle_root,
        "node_fingerprint": engine.node_fingerprint,
        "pulse_state": engine.pulse_state.value,
        "checkpoints": engine.checkpoints(),
        "personas": persona_meta,
    }


@app.get("/api/events")
async def events(limit: int = 40) -> dict[str, Any]:
    return {"events": event_bus.tail(max(1, min(120, limit)))}


@app.post("/api/scan")
async def scan(payload: ScanPayload) -> dict[str, Any]:
    result = await engine.verify(payload.persona, payload.checkpoint_id, payload.action)
    log_entry = await event_bus.publish(
        {
            "zone": result.zone,
            "checkpoint_id": result.checkpoint_id,
            "event_hash": result.event_hash,
            "requested_action": payload.action,
            "decision": result.decision.value,
            "verification_method": result.method,
            "latency_ms": result.latency_ms,
            "signature_status": result.signature_status,
            "attack_flag": result.attack_flag,
            "reason": result.reason,
        }
    )
    return {"result": asdict(result), "event": log_entry, "pulse_state": engine.pulse_state.value}


@app.post("/api/attack/inject")
async def inject_attack(payload: AttackPayload) -> dict[str, str]:
    if payload.persona != Persona.SECURITY_ADMIN:
        raise HTTPException(status_code=403, detail="Only Security Admin may inject attacks")
    engine.set_attack(payload.attack)
    await event_bus.publish(
        {
            "zone": "Security Operations Centre",
            "checkpoint_id": "attack_console",
            "event_hash": f"attack-{payload.attack.value}",
            "requested_action": "inject_attack",
            "decision": "allow",
            "verification_method": "admin-console",
            "latency_ms": 1,
            "signature_status": "valid",
            "attack_flag": True,
            "reason": f"next scan attack set to {payload.attack.value}",
        }
    )
    return {"status": "queued", "attack": payload.attack.value}


@app.post("/api/pulse")
async def set_pulse(payload: PulsePayload) -> dict[str, str]:
    engine.set_pulse(payload.pulse)
    await event_bus.publish(
        {
            "zone": "AffixIO Node",
            "checkpoint_id": "pulse_control",
            "event_hash": f"pulse-{payload.pulse.value}",
            "requested_action": "set_pulse",
            "decision": "allow",
            "verification_method": "sim-node",
            "latency_ms": 1,
            "signature_status": "valid",
            "attack_flag": False,
            "reason": f"pulse changed to {payload.pulse.value}",
        }
    )
    return {"pulse_state": payload.pulse.value}


@app.websocket("/ws/events")
async def ws_events(socket: WebSocket) -> None:
    await event_bus.connect(socket)
    try:
        while True:
            await socket.receive_text()
    except Exception:
        await event_bus.disconnect(socket)
