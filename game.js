const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const startScreen = document.getElementById("start-screen");
const crashScreen = document.getElementById("crash-screen");
const startBtn = document.getElementById("start-btn");
const retryBtn = document.getElementById("retry-btn");
const crashScoreEl = document.getElementById("crash-score");
const crashBestEl = document.getElementById("crash-best");

const LANES = 3;
const ROAD_MARGIN = 48;
const CAR_W = 46;
const CAR_H = 78;
const PLAYFIELD_W = 420;
const VIEW_PAD = 110;

const trafficTypes = [
  { model: "sports", colors: ["#ff2d2d", "#ff7a00", "#ff4fd8"] },
  { model: "taxi", colors: ["#ffd400"] },
  { model: "police", colors: ["#f4f7fb"] },
  { model: "van", colors: ["#6c5ce7", "#0984e3", "#00b894"] },
  { model: "truck", colors: ["#d35400", "#2d3436", "#636e72"] },
  { model: "suv", colors: ["#27ae60", "#1abc9c", "#8e44ad"] },
];

const scenery = Array.from({ length: 32 }, (_, i) => ({
  side: i % 2 === 0 ? "left" : "right",
  kind: i % 7 === 0 ? "sign" : i % 3 === 0 ? "bush" : "tree",
  y: i * 52,
  xOff: (i % 4) * 26,
  variant: i % 5,
  signType: i % 3,
}));

const state = {
  mode: "ready",
  score: 0,
  best: Number(localStorage.getItem("mashinki-best") || 0),
  speed: 6,
  roadOffset: 0,
  player: { lane: 1, x: 0, y: 0, color: "#ff2a2a" },
  cars: [],
  spawnTimer: 0,
  keys: new Set(),
};

bestEl.textContent = String(state.best);

function roadLeft() {
  return VIEW_PAD + ROAD_MARGIN;
}

function roadWidth() {
  return PLAYFIELD_W - ROAD_MARGIN * 2;
}

function laneX(lane) {
  const laneW = roadWidth() / LANES;
  return roadLeft() + laneW * lane + laneW / 2;
}

function resetGame() {
  state.mode = "play";
  state.score = 0;
  state.speed = 6;
  state.roadOffset = 0;
  state.cars = [];
  state.spawnTimer = 40;
  state.player.lane = 1;
  state.player.y = canvas.height - 130;
  state.player.x = laneX(1);
  startScreen.classList.add("is-hidden");
  crashScreen.classList.add("is-hidden");
}

function showCrashScreen() {
  crashScoreEl.textContent = String(Math.floor(state.score));
  crashBestEl.textContent = String(state.best);
  crashScreen.classList.remove("is-hidden");
}

function spawnCar() {
  const occupied = new Set(state.cars.filter((c) => c.y < 160).map((c) => c.lane));
  const free = [...Array(LANES).keys()].filter((lane) => !occupied.has(lane));
  if (!free.length) return;
  const lane = free[Math.floor(Math.random() * free.length)];
  const type = trafficTypes[Math.floor(Math.random() * trafficTypes.length)];
  state.cars.push({
    lane,
    x: laneX(lane),
    y: -CAR_H - 20,
    color: type.colors[Math.floor(Math.random() * type.colors.length)],
    model: type.model,
  });
}

function hit(a, b) {
  return (
    Math.abs(a.x - b.x) < CAR_W - 8 &&
    Math.abs(a.y - b.y) < CAR_H - 12
  );
}

function roundRect(x, y, w, h, r, color) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function fillRound(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawDropShadow(w, h) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(6, 10, w * 0.55, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWheel(x, y) {
  roundRect(x, y, 8, 16, 3, "#111218");
  roundRect(x + 2, y + 4, 4, 8, 2, "#c5c9d3");
}

function drawWheels(w, h) {
  drawWheel(-w / 2 - 4, -h * 0.32);
  drawWheel(w / 2 - 4, -h * 0.32);
  drawWheel(-w / 2 - 4, h * 0.16);
  drawWheel(w / 2 - 4, h * 0.16);
}

function glass(x1, y1, x2, y2, x3, y3, x4, y4) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fillStyle = "rgba(160, 220, 255, 0.85)";
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fill();
}

function drawSportsCar(color) {
  const w = CAR_W;
  const h = CAR_H;
  drawDropShadow(w, h);
  drawWheels(w, h);

  ctx.beginPath();
  ctx.moveTo(-w * 0.22, -h / 2);
  ctx.quadraticCurveTo(0, -h / 2 - 6, w * 0.22, -h / 2);
  ctx.lineTo(w * 0.46, -h * 0.18);
  ctx.lineTo(w * 0.5, h * 0.1);
  ctx.lineTo(w * 0.38, h / 2);
  ctx.quadraticCurveTo(0, h / 2 + 6, -w * 0.38, h / 2);
  ctx.lineTo(-w * 0.5, h * 0.1);
  ctx.lineTo(-w * 0.46, -h * 0.18);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.stroke();

  roundRect(-5, -h / 2 + 8, 10, h - 22, 3, "#f4f6fb");
  glass(-w * 0.2, -h * 0.28, w * 0.2, -h * 0.28, w * 0.26, -h * 0.06, -w * 0.26, -h * 0.06);
  roundRect(-w * 0.22, h * 0.02, w * 0.44, 14, 4, "rgba(20,40,70,0.45)");
  roundRect(-w * 0.28, h / 2 - 8, w * 0.56, 6, 2, "#1b1d22");

  ctx.fillStyle = "#e8eef8";
  fillRound(-w / 2 - 1, -h * 0.1, 8, 5, 2);
  fillRound(w / 2 - 7, -h * 0.1, 8, 5, 2);

  ctx.fillStyle = "#fff6c8";
  ctx.shadowColor = "#fff1a8";
  ctx.shadowBlur = 10;
  fillRound(-w / 2 + 6, -h / 2 + 2, 11, 7, 3);
  fillRound(w / 2 - 17, -h / 2 + 2, 11, 7, 3);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff2a2a";
  fillRound(-w / 2 + 8, h / 2 - 7, 10, 5, 2);
  fillRound(w / 2 - 18, h / 2 - 7, 10, 5, 2);
}

function drawTaxi(color) {
  const w = CAR_W;
  const h = CAR_H - 2;
  drawDropShadow(w, h);
  drawWheels(w, h);
  roundRect(-w / 2, -h / 2 + 6, w, h - 10, 8, color);
  roundRect(-w / 2 + 6, -h * 0.26, w - 12, 22, 5, "rgba(30,40,50,0.7)");
  roundRect(-w / 2 + 8, h * 0.08, w - 16, 12, 4, "rgba(30,40,50,0.28)");
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = i % 2 ? "#111" : "#fff";
    ctx.fillRect(-w / 2 + 4 + i * 6.5, 2, 6.5, 6);
  }
  roundRect(-8, -h / 2 + 1, 16, 8, 2, "#ffd400");
  ctx.fillStyle = "#111";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TAXI", 0, -h / 2 + 8);
  ctx.fillStyle = "#fff6c8";
  fillRound(-w / 2 + 6, -h / 2 + 8, 10, 6, 2);
  fillRound(w / 2 - 16, -h / 2 + 8, 10, 6, 2);
  ctx.fillStyle = "#d63031";
  fillRound(-w / 2 + 6, h / 2 - 10, 10, 6, 2);
  fillRound(w / 2 - 16, h / 2 - 10, 10, 6, 2);
}

function drawPolice() {
  const w = CAR_W;
  const h = CAR_H;
  drawDropShadow(w, h);
  drawWheels(w, h);
  roundRect(-w / 2, -h / 2 + 6, w, h - 10, 8, "#f4f7fb");
  roundRect(-w / 2, -6, w, 14, 0, "#1e5eff");
  roundRect(-w / 2 + 6, -h * 0.28, w - 12, 20, 5, "rgba(30,50,80,0.55)");
  roundRect(-12, -h / 2 + 2, 24, 8, 2, "#222");
  ctx.fillStyle = "#ff3b3b";
  fillRound(-10, -h / 2 + 3, 10, 6, 1);
  ctx.fillStyle = "#3b7bff";
  fillRound(0, -h / 2 + 3, 10, 6, 1);
  ctx.fillStyle = "#fff6c8";
  fillRound(-w / 2 + 6, -h / 2 + 10, 10, 6, 2);
  fillRound(w / 2 - 16, -h / 2 + 10, 10, 6, 2);
  ctx.fillStyle = "#d63031";
  fillRound(-w / 2 + 6, h / 2 - 10, 10, 6, 2);
  fillRound(w / 2 - 16, h / 2 - 10, 10, 6, 2);
}

function drawVan(color) {
  const w = CAR_W + 4;
  const h = CAR_H;
  drawDropShadow(w, h);
  drawWheels(w, h);
  roundRect(-w / 2, -h / 2 + 4, w, h - 6, 7, color);
  roundRect(-w / 2 + 4, -h / 2 + 8, w - 8, 28, 5, "rgba(255,255,255,0.78)");
  roundRect(-w / 2 + 6, 8, w - 12, 22, 4, "rgba(0,0,0,0.12)");
  ctx.fillStyle = "#fff6c8";
  fillRound(-w / 2 + 7, -h / 2 + 6, 11, 7, 2);
  fillRound(w / 2 - 18, -h / 2 + 6, 11, 7, 2);
  ctx.fillStyle = "#c0392b";
  fillRound(-w / 2 + 7, h / 2 - 9, 11, 6, 2);
  fillRound(w / 2 - 18, h / 2 - 9, 11, 6, 2);
}

function drawTruck(color) {
  const w = CAR_W;
  const h = CAR_H;
  drawDropShadow(w, h);
  drawWheels(w, h);
  roundRect(-w / 2 + 2, -h / 2 + 4, w - 4, 34, 7, color);
  roundRect(-w / 2 + 5, -h / 2 + 8, w - 10, 18, 4, "rgba(180, 230, 255, 0.75)");
  roundRect(-w / 2 + 1, 2, w - 2, h / 2 - 4, 4, "#bdc3c7");
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.strokeRect(-w / 2 + 6, 8, w - 12, h / 2 - 16);
  ctx.fillStyle = "#fff6c8";
  fillRound(-w / 2 + 7, -h / 2 + 5, 10, 6, 2);
  fillRound(w / 2 - 17, -h / 2 + 5, 10, 6, 2);
}

function drawSuv(color) {
  const w = CAR_W + 3;
  const h = CAR_H - 2;
  drawDropShadow(w, h);
  drawWheels(w, h);
  roundRect(-w / 2, -h / 2 + 6, w, h - 8, 8, color);
  roundRect(-w / 2 + 5, -h * 0.3, w - 10, 32, 6, "rgba(20,40,50,0.5)");
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 8, -h * 0.34);
  ctx.lineTo(w / 2 - 8, -h * 0.34);
  ctx.stroke();
  ctx.fillStyle = "#fff6c8";
  fillRound(-w / 2 + 7, -h / 2 + 8, 10, 6, 2);
  fillRound(w / 2 - 17, -h / 2 + 8, 10, 6, 2);
  ctx.fillStyle = "#c0392b";
  fillRound(-w / 2 + 7, h / 2 - 10, 10, 6, 2);
  fillRound(w / 2 - 17, h / 2 - 10, 10, 6, 2);
}

function drawEnemySports(color) {
  drawSportsCar(color);
}

function drawCar(car, isPlayer = false) {
  ctx.save();
  ctx.translate(car.x, car.y);
  if (isPlayer) {
    drawSportsCar(car.color);
  } else {
    ctx.rotate(Math.PI);
    const model = car.model || "suv";
    if (model === "taxi") drawTaxi(car.color);
    else if (model === "police") drawPolice();
    else if (model === "van") drawVan(car.color);
    else if (model === "truck") drawTruck(car.color);
    else if (model === "suv") drawSuv(car.color);
    else drawEnemySports(car.color);
  }
  ctx.restore();
}

function scrollY(base, period = 1664) {
  let y = (base + state.roadOffset) % period;
  if (y < 0) y += period;
  return y - 80;
}

function drawTree(x, y, variant) {
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 22, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a4a22";
  fillRound(x - 5, y, 10, 24, 3);
  const canopy = ["#1f8a34", "#2db14a", "#167a2c"];
  ctx.fillStyle = canopy[variant % canopy.length];
  ctx.beginPath();
  ctx.arc(x, y - 10, 22 + (variant % 3) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(x - 7, y - 16, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(x, y, variant) {
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = variant % 2 ? "#2ea043" : "#45c45b";
  ctx.beginPath();
  ctx.arc(x - 10, y, 12, 0, Math.PI * 2);
  ctx.arc(x + 8, y + 2, 11, 0, Math.PI * 2);
  ctx.arc(x, y - 8, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff5d8f";
  ctx.beginPath();
  ctx.arc(x - 6, y - 4, 2.2, 0, Math.PI * 2);
  ctx.arc(x + 7, y, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSign(x, y, type) {
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x - 2, y + 16, 12, 5);
  ctx.fillStyle = "#d7dbe3";
  fillRound(x - 2, y - 28, 5, 50, 1);
  ctx.save();
  ctx.translate(x + 1, y - 28);
  if (type === 0) {
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(20, 14);
    ctx.lineTo(-20, 14);
    ctx.closePath();
    ctx.fillStyle = "#ffd000";
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", 0, 8);
  } else if (type === 1) {
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e03131";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("60", 0, 5);
  } else {
    roundRect(-16, -14, 32, 26, 4, "#2b6cff");
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("P", 0, 6);
  }
  ctx.restore();
}

function drawRoad() {
  const left = roadLeft();
  const width = roadWidth();

  ctx.fillStyle = "#47c45c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const stripe = 36;
  const grassShift = state.roadOffset % stripe;
  for (let y = -stripe + grassShift; y < canvas.height + stripe; y += stripe) {
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, y, left - 12, 10);
    ctx.fillRect(left + width + 12, y, left - 12, 10);
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, y + 18, left - 12, 8);
    ctx.fillRect(left + width + 12, y + 18, left - 12, 8);
  }

  ctx.fillStyle = "#c8b48a";
  ctx.fillRect(left - 14, 0, 14, canvas.height);
  ctx.fillRect(left + width, 0, 14, canvas.height);

  ctx.fillStyle = "#3e4450";
  ctx.fillRect(left, 0, width, canvas.height);
  const asphalt = ctx.createLinearGradient(left, 0, left + width, 0);
  asphalt.addColorStop(0, "#4a5160");
  asphalt.addColorStop(0.5, "#5a6270");
  asphalt.addColorStop(1, "#4a5160");
  ctx.fillStyle = asphalt;
  ctx.fillRect(left, 0, width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  const seam = 70;
  const seamShift = state.roadOffset % seam;
  for (let y = -seam + seamShift; y < canvas.height; y += seam) {
    ctx.fillRect(left + 16, y, width - 32, 4);
  }

  ctx.fillStyle = "#ffd000";
  ctx.fillRect(left, 0, 8, canvas.height);
  ctx.fillRect(left + width - 8, 0, 8, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(left + 8, 0, 4, canvas.height);
  ctx.fillRect(left + width - 12, 0, 4, canvas.height);

  const laneW = width / LANES;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.lineCap = "butt";
  ctx.setLineDash([34, 26]);
  ctx.lineDashOffset = -state.roadOffset;
  for (let i = 1; i < LANES; i += 1) {
    const x = left + laneW * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const item of scenery) {
    const y = scrollY(item.y);
    const x = item.side === "left"
      ? 28 + item.xOff
      : canvas.width - 28 - item.xOff;
    if (item.kind === "tree") drawTree(x, y, item.variant);
    else if (item.kind === "bush") drawBush(x, y, item.variant);
    else drawSign(x, y, item.signType);
  }
}

function drawSpeedEffect() {
  if (state.mode !== "play") return;
  const t = Math.min(1, (state.speed - 6) / 7);
  ctx.save();
  ctx.globalAlpha = 0.18 + t * 0.45;
  for (let i = 0; i < 22; i += 1) {
    const y = ((i * 73 + state.roadOffset * (2.2 + t)) % (canvas.height + 90)) - 40;
    const side = i % 2 === 0 ? -1 : 1;
    const x = state.player.x + side * (26 + (i % 5) * 6);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,230,120,0.7)";
    ctx.fillRect(x, y, 3, 16 + t * 28);
  }
  const haze = ctx.createLinearGradient(0, 0, 0, 90);
  haze.addColorStop(0, `rgba(255,255,255,${0.08 + t * 0.12})`);
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = haze;
  ctx.fillRect(roadLeft(), 0, roadWidth(), 90);
  ctx.restore();
}

function update() {
  if (state.mode !== "play") return;

  if (state.keys.has("arrowleft") || state.keys.has("a")) {
    state.player.lane = Math.max(0, state.player.lane - 1);
    state.keys.delete("arrowleft");
    state.keys.delete("a");
  }
  if (state.keys.has("arrowright") || state.keys.has("d")) {
    state.player.lane = Math.min(LANES - 1, state.player.lane + 1);
    state.keys.delete("arrowright");
    state.keys.delete("d");
  }

  const targetX = laneX(state.player.lane);
  state.player.x += (targetX - state.player.x) * 0.22;

  state.speed += 0.0018;
  state.roadOffset += state.speed;
  state.score += state.speed * 0.12;
  state.spawnTimer -= 1;
  if (state.spawnTimer <= 0) {
    spawnCar();
    state.spawnTimer = Math.max(28, 78 - state.speed * 4);
  }

  for (const car of state.cars) {
    car.y += state.speed * 0.95;
    car.x += (laneX(car.lane) - car.x) * 0.15;
    if (hit(state.player, car)) {
      state.mode = "over";
      state.best = Math.max(state.best, Math.floor(state.score));
      localStorage.setItem("mashinki-best", String(state.best));
      showCrashScreen();
    }
  }
  state.cars = state.cars.filter((car) => car.y < canvas.height + CAR_H);

  scoreEl.textContent = String(Math.floor(state.score));
  bestEl.textContent = String(state.best);
  speedEl.textContent = String(Math.round(state.speed * 12));
}

function draw() {
  drawRoad();
  for (const car of state.cars) drawCar(car);
  drawCar(state.player, true);
  drawSpeedEffect();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "a", "d", " "].includes(key) || event.code === "Space") {
    event.preventDefault();
  }
  state.keys.add(key);
  if (event.code === "Space" && state.mode !== "play") resetGame();
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "play") {
    resetGame();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  state.player.lane = x < rect.width / 2
    ? Math.max(0, state.player.lane - 1)
    : Math.min(LANES - 1, state.player.lane + 1);
});

startBtn.addEventListener("click", () => {
  resetGame();
});

retryBtn.addEventListener("click", () => {
  resetGame();
});

state.player.x = laneX(1);
state.player.y = canvas.height - 130;
loop();
