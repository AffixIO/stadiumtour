"""AffixIO Access Arena simulation data models.

Credit: @paparichens
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Persona(str, Enum):
    CUSTOMER = "customer"
    VIP = "vip_guest"
    CREW = "crew_staff"
    ARTIST = "artist_executive"
    SECURITY_ADMIN = "security_admin"


class PulseState(str, Enum):
    ONLINE = "online"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    REVOKED = "revoked"


class AttackType(str, Enum):
    NONE = "none"
    REPLAYED_TICKET = "replayed_ticket"
    REPLAYED_MEAL_NULLIFIER = "replayed_meal_nullifier"
    TAMPERED_MERKLE_LEAF = "tampered_merkle_leaf"
    FORGED_ROLE_CLAIM = "forged_role_claim"
    EXPIRED_CREDENTIAL = "expired_credential"
    LEGACY_CRYPTO_WARNING = "legacy_crypto_warning"


class Decision(str, Enum):
    ALLOW = "allow"
    DENY = "deny"


@dataclass(slots=True)
class WalletCredential:
    credential_id: str
    ticket_hash: str
    role_hash: str
    parking_hash: str
    age_commitment: str
    event_hash: str
    seat_section: str
    canteen_nullifier: str
    token_fingerprint: str
    token_label: str
    can_redeem_meal: bool
    role_level: int


@dataclass(slots=True)
class CheckpointPolicy:
    checkpoint_id: str
    zone: str
    action: str
    min_role_level: int = 0
    requires_ticket: bool = False
    requires_parking: bool = False
    requires_age: bool = False
    requires_merkle: bool = False
    requires_meal_nullifier: bool = False
    requires_pqc: bool = False
    allowed_personas: set[Persona] = field(default_factory=set)


@dataclass(slots=True)
class ScanRequest:
    persona: Persona
    checkpoint_id: str
    action: str


@dataclass(slots=True)
class VerificationResult:
    decision: Decision
    reason: str
    zone: str
    checkpoint_id: str
    event_hash: str
    method: str
    latency_ms: int
    signature_status: str
    attack_flag: bool
    proof_steps: list[dict[str, Any]]
