"""Core simulation engine for AffixIO Access Arena.

Credit: @paparichens
"""

from __future__ import annotations

import asyncio
import random
import time
from dataclasses import asdict

from .crypto import event_hash, short_fingerprint, simulate_signature
from .merkle import build_merkle_root, generate_proof, sha256_hex, verify_proof
from .models import (
    AttackType,
    CheckpointPolicy,
    Decision,
    Persona,
    PulseState,
    VerificationResult,
    WalletCredential,
)


ROLE_LEVEL = {
    Persona.CUSTOMER: 1,
    Persona.VIP: 2,
    Persona.CREW: 3,
    Persona.ARTIST: 4,
    Persona.SECURITY_ADMIN: 5,
}


class AccessArenaEngine:
    def __init__(self, seed: int = 20260818) -> None:
        self.rng = random.Random(seed)
        self.seed = seed
        self.current_attack: AttackType = AttackType.NONE
        self.pulse_state: PulseState = PulseState.ONLINE
        self._spent_nullifiers: set[str] = set()
        self._admitted_tickets: set[str] = set()
        self._credentials = self._build_credentials()
        self._ticket_batch = [c.ticket_hash for c in self._credentials.values()]
        self.merkle_root = build_merkle_root(self._ticket_batch)
        self._policies = self._build_policies()
        self.node_fingerprint = short_fingerprint(f"affixio-node-{seed}")

    def _build_credentials(self) -> dict[Persona, WalletCredential]:
        event_hash_id = sha256_hex("affixio-live-event-night")
        credentials: dict[Persona, WalletCredential] = {}
        for persona in Persona:
            pid = persona.value
            credentials[persona] = WalletCredential(
                credential_id=sha256_hex(f"id:{pid}"),
                ticket_hash=sha256_hex(f"ticket:{pid}"),
                role_hash=sha256_hex(f"role:{pid}:{ROLE_LEVEL[persona]}"),
                parking_hash=sha256_hex(f"parking:{pid}"),
                age_commitment=sha256_hex(f"age18:{pid}"),
                event_hash=event_hash_id,
                seat_section={
                    Persona.CUSTOMER: "A",
                    Persona.VIP: "VIP-BALCONY",
                    Persona.CREW: "CREW-C",
                    Persona.ARTIST: "EXEC-D",
                    Persona.SECURITY_ADMIN: "SOC",
                }[persona],
                canteen_nullifier=sha256_hex(f"meal:{pid}"),
                token_fingerprint=short_fingerprint(f"wallet-key:{pid}"),
                token_label="PQC-ML-DSA",
                can_redeem_meal=persona in {Persona.CREW, Persona.SECURITY_ADMIN},
                role_level=ROLE_LEVEL[persona],
            )
        return credentials

    def _build_policies(self) -> dict[str, CheckpointPolicy]:
        return {
            "parking_public": CheckpointPolicy(
                checkpoint_id="parking_public",
                zone="Exterior Arrival Zone",
                action="scan_public_parking",
                requires_parking=True,
                requires_pqc=False,
                allowed_personas={Persona.CUSTOMER, Persona.VIP, Persona.CREW, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "parking_vip_staff": CheckpointPolicy(
                checkpoint_id="parking_vip_staff",
                zone="Exterior Arrival Zone",
                action="scan_vip_staff_parking",
                min_role_level=2,
                requires_parking=True,
                allowed_personas={Persona.VIP, Persona.CREW, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "turnstile_public": CheckpointPolicy(
                checkpoint_id="turnstile_public",
                zone="Security Perimeter",
                action="validate_ticket",
                requires_ticket=True,
                requires_merkle=True,
                allowed_personas={Persona.CUSTOMER, Persona.VIP, Persona.CREW, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "turnstile_vip": CheckpointPolicy(
                checkpoint_id="turnstile_vip",
                zone="Security Perimeter",
                action="validate_vip_ticket",
                min_role_level=2,
                requires_ticket=True,
                requires_merkle=True,
                allowed_personas={Persona.VIP, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "kiosk_age18": CheckpointPolicy(
                checkpoint_id="kiosk_age18",
                zone="Main Concourse",
                action="verify_18plus",
                requires_age=True,
                allowed_personas=set(Persona),
            ),
            "ticket_helpdesk": CheckpointPolicy(
                checkpoint_id="ticket_helpdesk",
                zone="Main Concourse",
                action="ticket_helpdesk_check",
                requires_ticket=True,
                allowed_personas=set(Persona),
            ),
            "tariff_kiosk": CheckpointPolicy(
                checkpoint_id="tariff_kiosk",
                zone="Main Concourse",
                action="credential_tariff_refresh",
                allowed_personas=set(Persona),
            ),
            "seating_a": CheckpointPolicy(
                checkpoint_id="seating_a",
                zone="Seating Bowl",
                action="enter_section_a",
                requires_ticket=True,
                requires_merkle=True,
                allowed_personas={Persona.CUSTOMER, Persona.SECURITY_ADMIN},
            ),
            "seating_vip": CheckpointPolicy(
                checkpoint_id="seating_vip",
                zone="VIP Level",
                action="enter_premium_section",
                min_role_level=2,
                requires_ticket=True,
                requires_merkle=True,
                allowed_personas={Persona.VIP, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "vip_reception": CheckpointPolicy(
                checkpoint_id="vip_reception",
                zone="VIP Level",
                action="enter_vip_lounge",
                min_role_level=2,
                allowed_personas={Persona.VIP, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "crew_entrance": CheckpointPolicy(
                checkpoint_id="crew_entrance",
                zone="Backstage",
                action="enter_crew_corridor",
                min_role_level=3,
                allowed_personas={Persona.CREW, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "loading_bay": CheckpointPolicy(
                checkpoint_id="loading_bay",
                zone="Backstage",
                action="enter_loading_bay",
                min_role_level=3,
                allowed_personas={Persona.CREW, Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "tech_room": CheckpointPolicy(
                checkpoint_id="tech_room",
                zone="Backstage",
                action="enter_technical_control",
                min_role_level=3,
                allowed_personas={Persona.CREW, Persona.SECURITY_ADMIN},
            ),
            "canteen_kiosk": CheckpointPolicy(
                checkpoint_id="canteen_kiosk",
                zone="Staff Canteen",
                action="redeem_meal",
                min_role_level=3,
                requires_meal_nullifier=True,
                allowed_personas={Persona.CREW, Persona.SECURITY_ADMIN},
            ),
            "green_room": CheckpointPolicy(
                checkpoint_id="green_room",
                zone="Green Room",
                action="high_security_entry",
                min_role_level=4,
                requires_pqc=True,
                requires_ticket=True,
                allowed_personas={Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "stage_side": CheckpointPolicy(
                checkpoint_id="stage_side",
                zone="Stage Access",
                action="enter_stage_side",
                min_role_level=4,
                requires_pqc=True,
                requires_ticket=True,
                allowed_personas={Persona.ARTIST, Persona.SECURITY_ADMIN},
            ),
            "soc_entry": CheckpointPolicy(
                checkpoint_id="soc_entry",
                zone="Security Operations Centre",
                action="enter_soc",
                min_role_level=5,
                requires_pqc=True,
                allowed_personas={Persona.SECURITY_ADMIN},
            ),
        }

    async def pulse_task(self) -> None:
        cycle = [PulseState.ONLINE, PulseState.ONLINE, PulseState.DEGRADED, PulseState.ONLINE]
        i = 0
        while True:
            if self.pulse_state not in {PulseState.REVOKED, PulseState.OFFLINE}:
                self.pulse_state = cycle[i % len(cycle)]
                i += 1
            await asyncio.sleep(12)

    def set_attack(self, attack: AttackType) -> None:
        self.current_attack = attack

    def set_pulse(self, pulse: PulseState) -> None:
        self.pulse_state = pulse

    def get_wallet(self, persona: Persona) -> WalletCredential:
        return self._credentials[persona]

    def checkpoints(self) -> dict[str, dict]:
        return {key: asdict(value) for key, value in self._policies.items()}

    async def verify(self, persona: Persona, checkpoint_id: str, action: str) -> VerificationResult:
        if checkpoint_id not in self._policies:
            return self._deny_unknown_checkpoint(persona, checkpoint_id, action)
        policy = self._policies[checkpoint_id]
        wallet = self.get_wallet(persona)
        start = time.perf_counter()
        proof_steps: list[dict[str, str | bool]] = []
        attack = self.current_attack
        self.current_attack = AttackType.NONE

        await asyncio.sleep(0.08)
        proof_steps.append({"step": "Credential prepared", "ok": True})

        if self.pulse_state in {PulseState.OFFLINE, PulseState.REVOKED}:
            return self._finalise(
                decision=Decision.DENY,
                reason=f"node state {self.pulse_state.value}",
                policy=policy,
                action=action,
                start=start,
                proof_steps=proof_steps,
                attack_flag=False,
                signature_status="unverified",
                method="pulse-gate",
            )

        if attack == AttackType.EXPIRED_CREDENTIAL:
            return self._finalise(
                decision=Decision.DENY,
                reason="credential expired (simulated attack)",
                policy=policy,
                action=action,
                start=start,
                proof_steps=proof_steps + [{"step": "Credential freshness check", "ok": False}],
                attack_flag=True,
                signature_status="unverified",
                method="expiry-check",
            )

        if persona not in policy.allowed_personas:
            return self._finalise(
                decision=Decision.DENY,
                reason=f"{persona.value} credential cannot open this door",
                policy=policy,
                action=action,
                start=start,
                proof_steps=proof_steps + [{"step": "Policy role mapping", "ok": False}],
                attack_flag=False,
                signature_status="valid",
                method="role-policy",
            )

        role_level = wallet.role_level
        if attack == AttackType.FORGED_ROLE_CLAIM:
            role_level = 0

        await asyncio.sleep(0.08)
        if role_level < policy.min_role_level:
            return self._finalise(
                decision=Decision.DENY,
                reason="insufficient role clearance",
                policy=policy,
                action=action,
                start=start,
                proof_steps=proof_steps + [{"step": "Role clearance proof", "ok": False}],
                attack_flag=attack == AttackType.FORGED_ROLE_CLAIM,
                signature_status="valid",
                method="role-clearance",
            )
        proof_steps.append({"step": "Role clearance proof", "ok": True})

        if policy.requires_age:
            await asyncio.sleep(0.08)
            proof_steps.append({"step": "18+ age proof verified", "ok": True})

        if policy.requires_parking:
            await asyncio.sleep(0.08)
            proof_steps.append({"step": "Parking entitlement proof", "ok": True})

        if policy.requires_ticket:
            await asyncio.sleep(0.08)
            if attack == AttackType.REPLAYED_TICKET:
                self._admitted_tickets.add(wallet.ticket_hash)
            if wallet.ticket_hash in self._admitted_tickets and checkpoint_id.startswith("turnstile"):
                return self._finalise(
                    decision=Decision.DENY,
                    reason="ticket already admitted (replay detected)",
                    policy=policy,
                    action=action,
                    start=start,
                    proof_steps=proof_steps + [{"step": "Ticket replay check", "ok": False}],
                    attack_flag=True,
                    signature_status="valid",
                    method="ticket-replay",
                )
            self._admitted_tickets.add(wallet.ticket_hash)
            proof_steps.append({"step": "Ticket possession proof", "ok": True})

        if policy.requires_merkle:
            await asyncio.sleep(0.08)
            proof = generate_proof(self._ticket_batch, wallet.ticket_hash)
            path = proof.path
            leaf = wallet.ticket_hash
            if attack == AttackType.TAMPERED_MERKLE_LEAF:
                leaf = sha256_hex(wallet.ticket_hash + "-tampered")
            merkle_ok = verify_proof(leaf, path, self.merkle_root)
            proof_steps.append(
                {
                    "step": "Merkle inclusion proof",
                    "ok": merkle_ok,
                    "path_preview": [f"{d}:{v[:8]}" for d, v in path[:4]],
                }
            )
            if not merkle_ok:
                return self._finalise(
                    decision=Decision.DENY,
                    reason="merkle inclusion mismatch",
                    policy=policy,
                    action=action,
                    start=start,
                    proof_steps=proof_steps,
                    attack_flag=True,
                    signature_status="valid",
                    method="merkle-verify",
                )

        if policy.requires_meal_nullifier:
            await asyncio.sleep(0.08)
            if attack == AttackType.REPLAYED_MEAL_NULLIFIER:
                self._spent_nullifiers.add(wallet.canteen_nullifier)
            if not wallet.can_redeem_meal:
                return self._finalise(
                    decision=Decision.DENY,
                    reason="meal entitlement missing",
                    policy=policy,
                    action=action,
                    start=start,
                    proof_steps=proof_steps + [{"step": "Nullifier status", "ok": False}],
                    attack_flag=False,
                    signature_status="valid",
                    method="nullifier",
                )
            if wallet.canteen_nullifier in self._spent_nullifiers:
                return self._finalise(
                    decision=Decision.DENY,
                    reason="nullifier already spent",
                    policy=policy,
                    action=action,
                    start=start,
                    proof_steps=proof_steps + [{"step": "Nullifier status", "ok": False}],
                    attack_flag=True,
                    signature_status="valid",
                    method="nullifier",
                )
            self._spent_nullifiers.add(wallet.canteen_nullifier)
            proof_steps.append({"step": "Nullifier status", "ok": True})

        signature_state = "valid"
        if policy.requires_pqc or attack == AttackType.LEGACY_CRYPTO_WARNING:
            await asyncio.sleep(0.08)
            token_label = wallet.token_label
            if attack == AttackType.LEGACY_CRYPTO_WARNING:
                token_label = "Legacy-RSA"
                signature_state = "quantum-risk"
            sig = simulate_signature(f"{policy.checkpoint_id}:{wallet.credential_id}", token_label, self.rng)
            proof_steps.append(
                {
                    "step": f"Simulated PQC signature ({sig['algo']})",
                    "ok": signature_state == "valid",
                    "token_label": token_label,
                }
            )
            if signature_state != "valid":
                return self._finalise(
                    decision=Decision.DENY,
                    reason="legacy token blocked by policy",
                    policy=policy,
                    action=action,
                    start=start,
                    proof_steps=proof_steps,
                    attack_flag=True,
                    signature_status=signature_state,
                    method="pqc-policy",
                )

        return self._finalise(
            decision=Decision.ALLOW,
            reason="policy matched",
            policy=policy,
            action=action,
            start=start,
            proof_steps=proof_steps + [{"step": "ACCESS GRANTED", "ok": True}],
            attack_flag=attack != AttackType.NONE,
            signature_status=signature_state,
            method="multi-proof",
        )

    def _deny_unknown_checkpoint(self, persona: Persona, checkpoint_id: str, action: str) -> VerificationResult:
        start = time.perf_counter()
        pseudo_policy = CheckpointPolicy(
            checkpoint_id=checkpoint_id,
            zone="Unknown",
            action=action,
            allowed_personas={persona},
        )
        return self._finalise(
            decision=Decision.DENY,
            reason="checkpoint not recognised",
            policy=pseudo_policy,
            action=action,
            start=start,
            proof_steps=[{"step": "Checkpoint lookup", "ok": False}],
            attack_flag=False,
            signature_status="unverified",
            method="lookup",
        )

    def _finalise(
        self,
        *,
        decision: Decision,
        reason: str,
        policy: CheckpointPolicy,
        action: str,
        start: float,
        proof_steps: list[dict],
        attack_flag: bool,
        signature_status: str,
        method: str,
    ) -> VerificationResult:
        elapsed = max(35, int((time.perf_counter() - start) * 1000))
        hash_value = event_hash(
            policy.zone,
            policy.checkpoint_id,
            action,
            decision.value,
            str(time.time_ns()),
        )
        return VerificationResult(
            decision=decision,
            reason=reason,
            zone=policy.zone,
            checkpoint_id=policy.checkpoint_id,
            event_hash=hash_value,
            method=method,
            latency_ms=elapsed,
            signature_status=signature_status,
            attack_flag=attack_flag,
            proof_steps=proof_steps,
        )
