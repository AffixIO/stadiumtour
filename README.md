# AffixIO Access Arena

Credit: @paparichens

AffixIO Access Arena is a local educational simulation of venue-wide access control. It runs as a first-person 3D browser experience with a FastAPI backend that verifies synthetic credentials using mock proof flows.

The simulation demonstrates how proof-based policy checks can allow or deny access across parking, entrances, seating, VIP spaces, backstage zones, canteen redemption, green-room security, and a live security operations room.

## Simulation boundaries

- All data is fictional and local.
- Wallets, tickets, proofs, nullifiers, and signatures are synthetic.
- Post-quantum signature logic is simulated and clearly labelled as such.
- No real identities, real tickets, NHS data, external credentials, or secrets are used.
- Audit events intentionally exclude PII and raw credential material.

## Stack

- Python 3.12
- FastAPI + Uvicorn
- Vanilla JavaScript + Three.js
- WebSocket event stream for live telemetry

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`.

## Environment

Copy `.env.example` to `.env` if needed:

```bash
cp .env.example .env
```

- `AFFIXIO_SEED`: deterministic simulation seed for repeatable tests and world behaviour.

## Controls

- WASD: move
- Mouse: look
- Shift: sprint
- Space: jump
- E: interact with nearby scanner, kiosk, gate, or door
- M: minimap toggle
- H: controls help
- Tab: attack simulator (Security Admin only)
- Escape: unlock pointer lock for HUD interaction

## Persona model

The HUD persona selector swaps the active local wallet and clearance tier without teleporting the player:

1. Customer
2. VIP Guest
3. Crew / Staff
4. Artist / Executive
5. Security Admin

Each persona has a synthetic credential profile with opaque hashes only.

## Access proof flow

Each verification interaction can include one or more of:

- Ticket possession check
- 18+ age proof simulation
- Parking entitlement proof
- Role clearance proof
- Merkle inclusion proof against synthetic event root
- One-time nullifier spend protection for canteen meal redemption
- Simulated post-quantum signature policy check
- Node pulse gating (online, degraded, offline, revoked)

Proof steps are shown in the HUD inspector after each scan.

## Attack simulator

Security Admin can queue one controlled simulation attack against the next relevant scan:

- Replayed ticket
- Replayed meal nullifier
- Tampered Merkle leaf
- Forged role claim
- Expired credential
- Legacy cryptography warning

These are educational state mutations only. No exploit tooling is included.

## Live security telemetry

All verification outcomes are pushed over WebSockets and rendered in:

- HUD event feed
- Security Operations Centre panel

Each event contains:

- timestamp
- zone
- checkpoint_id
- event_hash
- requested_action
- decision
- verification_method
- latency_ms
- signature_status
- attack_flag

## Project structure

```text
app/
  main.py
  simulation/
    engine.py
    events.py
    merkle.py
    crypto.py
    models.py
  static/
    index.html
    css/arena.css
    js/
      main.js
      scene.js
      player.js
      interaction.js
      hud.js
      minimap.js
      audio.js
      network.js
      materials.js
      props.js
    vendor/
      three.module.js
      three.core.js
tests/
  test_simulation.py
```

If the start button appears dead, look at the Uvicorn log.

- A `404` on `/static/vendor/three.core.js` means the browser is still using an old cached Three.js file.
- Current Three.js is bundled into `app/static/vendor/three.module.js`. That file must load with a `200`, not a `304` from an older copy.
- Restart Uvicorn, then hard-refresh the browser (Ctrl+Shift+R) on `http://127.0.0.1:8000`.

## Tests

```bash
pytest
```

Coverage includes:

- role clearance checks
- Merkle verification correctness
- nullifier replay protection
- attack injection behaviour
- audit-log PII restriction checks

## Docker

Build and run:

```bash
docker build -t affixio-access-arena .
docker run --rm -p 8000:8000 affixio-access-arena
```
