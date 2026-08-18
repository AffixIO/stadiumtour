from __future__ import annotations

from pathlib import Path

import pytest

from app.simulation.engine import AccessArenaEngine
from app.simulation.events import sanitise_event
from app.simulation.merkle import build_merkle_root, generate_proof, verify_proof
from app.simulation.models import AttackType, Decision, Persona


@pytest.mark.asyncio
async def test_role_clearance_denied_for_customer_vip_reception():
    engine = AccessArenaEngine(seed=11)
    result = await engine.verify(Persona.CUSTOMER, "vip_reception", "enter_vip_lounge")
    assert result.decision == Decision.DENY
    assert "cannot open this door" in result.reason


def test_merkle_proof_verification():
    leaves = ["a", "b", "c", "d"]
    root = build_merkle_root(leaves)
    proof = generate_proof(leaves, "c")
    assert root == proof.root
    assert verify_proof("c", proof.path, root)
    assert not verify_proof("x", proof.path, root)


@pytest.mark.asyncio
async def test_nullifier_double_spend_blocked():
    engine = AccessArenaEngine(seed=12)
    first = await engine.verify(Persona.CREW, "canteen_kiosk", "redeem_meal")
    second = await engine.verify(Persona.CREW, "canteen_kiosk", "redeem_meal")
    assert first.decision == Decision.ALLOW
    assert second.decision == Decision.DENY
    assert "nullifier already spent" in second.reason


@pytest.mark.asyncio
async def test_attack_injection_replayed_ticket():
    engine = AccessArenaEngine(seed=13)
    engine.set_attack(AttackType.REPLAYED_TICKET)
    result = await engine.verify(Persona.CUSTOMER, "turnstile_public", "validate_ticket")
    assert result.decision == Decision.DENY
    assert "replay" in result.reason
    assert result.attack_flag


def test_audit_log_pii_restriction_blocks_identity_fields():
    payload = {
        "timestamp": "x",
        "zone": "z",
        "checkpoint_id": "c",
        "event_hash": "h",
        "requested_action": "a",
        "decision": "allow",
        "verification_method": "method",
        "latency_ms": 10,
        "signature_status": "valid",
        "attack_flag": False,
        "name": "blocked",
    }
    with pytest.raises(ValueError):
        sanitise_event(payload)


def test_three_vendor_files_exist():
    vendor = Path(__file__).resolve().parents[1] / "app" / "static" / "vendor"
    core = vendor / "three.core.js"
    module = vendor / "three.module.js"
    assert core.is_file(), "three.core.js must be shipped with the app"
    assert module.is_file(), "three.module.js must be shipped with the app"
    assert core.stat().st_size > 100_000
    assert module.stat().st_size > 100_000
