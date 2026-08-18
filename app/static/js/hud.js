// Credit: @paparichens

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export class Hud {
  constructor(config) {
    this.config = config;
    this.zoneCard = document.getElementById("zone-card");
    this.personaCard = document.getElementById("persona-card");
    this.pulseCard = document.getElementById("pulse-card");
    this.prompt = document.getElementById("interaction-prompt");
    this.proof = document.getElementById("proof-inspector");
    this.feed = document.getElementById("event-feed");
    this.help = document.getElementById("help-panel");
    this.attack = document.getElementById("attack-panel");
    this.soc = document.getElementById("soc-panel");
    this.personaSelect = document.getElementById("persona-select");
    this.events = [];
    this._fillPersonas();
    this._fillHelp();
    this._fillAttackPanel();
  }

  _fillPersonas() {
    Object.entries(this.config.personas).forEach(([key, value]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${value.label} (Tier ${value.role_level})`;
      this.personaSelect.appendChild(opt);
    });
  }

  _fillHelp() {
    this.help.innerHTML = `
      <h3>Controls</h3>
      <div>WASD move, mouse look, Shift sprint, Space jump</div>
      <div>E interact, M minimap, H help, Tab attack console (admin)</div>
      <div>Esc unlock mouse and HUD controls</div>
    `;
  }

  _fillAttackPanel() {
    this.attack.innerHTML = `
      <h3>Attack Simulator</h3>
      <div>Security Admin only. Applies to the next relevant scan.</div>
      <select id="attack-select">
        <option value="replayed_ticket">Replayed ticket</option>
        <option value="replayed_meal_nullifier">Replayed meal nullifier</option>
        <option value="tampered_merkle_leaf">Tampered Merkle leaf</option>
        <option value="forged_role_claim">Forged role claim</option>
        <option value="expired_credential">Expired credential</option>
        <option value="legacy_crypto_warning">Legacy cryptography warning</option>
      </select>
      <button id="inject-attack-button" type="button">Inject attack</button>
      <div>
        Node pulse:
        <select id="pulse-select">
          <option value="online">online</option>
          <option value="degraded">degraded</option>
          <option value="offline">offline</option>
          <option value="revoked">revoked</option>
        </select>
      </div>
      <button id="apply-pulse-button" type="button">Apply pulse state</button>
    `;
  }

  onPersonaChanged(handler) {
    this.personaSelect.addEventListener("change", () => handler(this.personaSelect.value));
  }

  setPersona(persona, tier) {
    this.personaSelect.value = persona;
    this.personaCard.querySelector("label").textContent = `Persona (Tier ${tier})`;
  }

  setZone(zone, objective) {
    this.zoneCard.innerHTML = `<span class="kicker">Current zone</span><strong>${escapeHtml(zone)}</strong><div>${escapeHtml(objective)}</div>`;
  }

  setPrompt(text, state = "warn") {
    this.prompt.textContent = text;
    this.prompt.className = state;
  }

  setPulse(state, fingerprint) {
    const className = state === "online" ? "allow" : state === "degraded" ? "warn" : "deny";
    this.pulseCard.innerHTML = `
      <span class="kicker">Node pulse</span>
      <div>AffixIO pulse: <span class="${className}">${state}</span></div>
      <div>Node key: ${escapeHtml(fingerprint)}</div>
    `;
  }

  pushEvent(evt) {
    this.events.unshift(evt);
    this.events = this.events.slice(0, 8);
    this.feed.innerHTML = `<h3>Anonymous event feed</h3>${this.events
      .map((e) => {
        const cls = e.decision === "allow" ? "allow" : "deny";
        return `<div class="log-item ${cls}"><strong>${e.zone}</strong> ${e.checkpoint_id} ${e.decision.toUpperCase()} ${e.latency_ms}ms</div>`;
      })
      .join("")}`;
  }

  showProof(result) {
    this.proof.innerHTML = `
      <h3>Proof Inspector</h3>
      <div id="proof-steps"></div>
      <div>Decision: <strong class="${result.decision === "allow" ? "allow" : "deny"}">${result.decision.toUpperCase()}</strong></div>
      <div>Reason: ${escapeHtml(result.reason)}</div>
      <div>Event hash: ${result.event_hash.slice(0, 16)}...</div>
    `;
    this.proof.classList.remove("hidden");
    const stepsContainer = this.proof.querySelector("#proof-steps");
    result.proof_steps.forEach((step, index) => {
      setTimeout(() => {
        const row = document.createElement("div");
        row.className = step.ok ? "step-ok" : "step-fail";
        row.textContent = step.step;
        stepsContainer.appendChild(row);
      }, index * 120);
    });
    setTimeout(() => this.proof.classList.add("hidden"), 6500);
  }

  togglePanel(name, visible) {
    const map = {
      help: this.help,
      attack: this.attack,
      soc: this.soc,
      minimap: document.getElementById("minimap-panel"),
    };
    const panel = map[name];
    if (!panel) return;
    panel.classList.toggle("hidden", !visible);
  }

  updateSoc(events) {
    this.soc.innerHTML = `
      <h3>Security Operations Centre</h3>
      <div>Live checkpoint telemetry (anonymous)</div>
      ${events
        .slice(0, 12)
        .map(
          (e) =>
            `<div class="row"><span>${e.zone} / ${e.checkpoint_id}</span><span class="${e.decision === "allow" ? "allow" : "deny"}">${e.decision}</span></div>`
        )
        .join("")}
    `;
  }
}
