// Credit: @paparichens

const SCALE = 2;
const OFFSET_X = 130;
const OFFSET_Y = 102;

const POINTS = [
  { label: "Public parking", x: -45, z: 49 },
  { label: "VIP parking", x: 45, z: 49 },
  { label: "Turnstiles", x: -2, z: 6 },
  { label: "VIP lane", x: 32, z: 6 },
  { label: "Section A", x: -20, z: -34 },
  { label: "VIP reception", x: 50, z: -7 },
  { label: "Backstage", x: -52, z: -25 },
  { label: "Canteen", x: -52, z: -57 },
  { label: "Green room", x: -12, z: -67 },
  { label: "SOC", x: 58, z: -45 },
];

function worldToMap(x, z) {
  return {
    x: OFFSET_X + x * SCALE,
    y: OFFSET_Y + z * SCALE * 0.6,
  };
}

export function drawMinimap(canvas, player, facing) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#061420";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1fb6ff";
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  ctx.strokeStyle = "#2f4f68";
  ctx.beginPath();
  ctx.rect(20, 26, 220, 150);
  ctx.stroke();

  ctx.fillStyle = "#92cce6";
  ctx.font = "11px Inter, sans-serif";
  for (const point of POINTS) {
    const p = worldToMap(point.x, point.z);
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    ctx.fillText(point.label, p.x + 4, p.y + 3);
  }

  const centre = worldToMap(player.x, player.z);
  ctx.fillStyle = "#34e08a";
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#34e08a";
  ctx.beginPath();
  ctx.moveTo(centre.x, centre.y);
  ctx.lineTo(centre.x + Math.sin(facing) * 12, centre.y + Math.cos(facing) * 7);
  ctx.stroke();
}
