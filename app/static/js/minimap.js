// Credit: @paparichens

const SCALE = 1.55;
const OFFSET_X = 130;
const OFFSET_Y = 108;

const ZONES = [
  { label: "Park", x: -45, z: 52, color: "#6ea0b8" },
  { label: "VIP park", x: 45, z: 52, color: "#c4a574" },
  { label: "Gates", x: -2, z: 6, color: "#7ec8e6" },
  { label: "VIP lane", x: 32, z: 6, color: "#c4a574" },
  { label: "Concourse", x: 0, z: -20, color: "#8aa4b5" },
  { label: "Bowl", x: 0, z: -50, color: "#3aa0d2" },
  { label: "VIP", x: 50, z: -16, color: "#c4a574" },
  { label: "Crew", x: -52, z: -28, color: "#7a8b97" },
  { label: "Canteen", x: -52, z: -57, color: "#7a8b97" },
  { label: "Green", x: -12, z: -67, color: "#4fd49a" },
  { label: "SOC", x: 58, z: -50, color: "#e05b6a" },
];

function worldToMap(x, z) {
  return {
    x: OFFSET_X + x * SCALE,
    y: OFFSET_Y + z * SCALE * 0.62,
  };
}

export function drawMinimap(canvas, player, facing) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#07131c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(110, 176, 204, 0.35)";
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  ctx.fillStyle = "#101820";
  ctx.fillRect(18, 18, 224, 164);
  ctx.strokeStyle = "#24323d";
  ctx.strokeRect(46, 40, 168, 108);

  ctx.font = "600 10px Inter, sans-serif";
  for (const zone of ZONES) {
    const p = worldToMap(zone.x, zone.z);
    ctx.fillStyle = zone.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9dbe6";
    ctx.fillText(zone.label, p.x + 6, p.y + 3);
  }
  ctx.globalAlpha = 1;

  const centre = worldToMap(player.x, player.z);
  ctx.fillStyle = "#4fd49a";
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4fd49a";
  ctx.beginPath();
  ctx.moveTo(centre.x, centre.y);
  ctx.lineTo(centre.x + Math.sin(facing) * 12, centre.y + Math.cos(facing) * 8);
  ctx.stroke();
}
