"""Mock post-quantum and proof simulation helpers.

Credit: @paparichens
"""

from __future__ import annotations

import hashlib
import random
import time


def short_fingerprint(seed: str) -> str:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return f"{digest[:8]}...{digest[-8:]}"


def simulate_signature(payload: str, label: str, rng: random.Random) -> dict[str, str]:
    start = time.perf_counter()
    mix = f"{payload}:{label}:{rng.random():.8f}"
    digest = hashlib.sha256(mix.encode("utf-8")).hexdigest()
    elapsed = int((time.perf_counter() - start) * 1000)
    return {
        "signature": digest,
        "signature_status": "valid",
        "algo": "simulated-ml-dsa",
        "latency_ms": max(1, elapsed),
    }


def event_hash(*parts: str) -> str:
    payload = "|".join(parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
