// Credit: @paparichens

export async function fetchConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("Failed to load config");
  return response.json();
}

export async function runScan(persona, checkpointId, action) {
  const response = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      persona,
      checkpoint_id: checkpointId,
      action,
    }),
  });
  if (!response.ok) {
    throw new Error(`Scan failed (${response.status})`);
  }
  return response.json();
}

export async function injectAttack(persona, attack) {
  const response = await fetch("/api/attack/inject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, attack }),
  });
  if (!response.ok) {
    throw new Error("Attack inject denied");
  }
  return response.json();
}

export async function setPulse(pulse) {
  const response = await fetch("/api/pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pulse }),
  });
  if (!response.ok) {
    throw new Error("Pulse update failed");
  }
  return response.json();
}

export function createEventSocket(onEvent) {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${window.location.host}/ws/events`);
  socket.addEventListener("message", (evt) => {
    const payload = JSON.parse(evt.data);
    onEvent(payload);
  });
  return socket;
}
