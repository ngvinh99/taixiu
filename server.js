
const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;

let lastResults = [];
let currentResult = null;
let currentSession = null;

let ws = null;
let reconnectInterval = 5000;
let intervalCmd = null;

// === THUẬT TOÁN DỰ ĐOÁN MỚI ===
function multiWindowV3(patternArr, windows = [5, 10, 20, 30, 50]) {
  const voteCounts = { Tài: 0, Xỉu: 0 };
  let totalWeight = 0;

  for (const win of windows) {
    if (patternArr.length < win) continue;

    const subPattern = patternArr.slice(-win);
    const markovRes = markovWeightedV3(subPattern);
    const repeatRes = repeatingPatternV3(subPattern);
    const biasRes = detectBiasV3(subPattern);
    const weight = win;

    if (markovRes) voteCounts[markovRes] += weight * 0.7;
    if (repeatRes) voteCounts[repeatRes] += weight * 0.15;
    if (biasRes) voteCounts[biasRes] += weight * 0.15;

    totalWeight += weight;
  }

  let finalPredict = null;
  let confidence = 50;

  if (voteCounts.Tài > voteCounts.Xỉu) {
    finalPredict = "Tài";
    confidence = Math.min(99, Math.round((voteCounts.Tài / (voteCounts.Tài + voteCounts.Xỉu)) * 100));
  } else if (voteCounts.Xỉu > voteCounts.Tài) {
    finalPredict = "Xỉu";
    confidence = Math.min(99, Math.round((voteCounts.Xỉu / (voteCounts.Tài + voteCounts.Xỉu)) * 100));
  } else {
    const last = patternArr[patternArr.length - 1];
    finalPredict = last === "T" ? "Xỉu" : "Tài";
    confidence = 50;
  }

  return { prediction: finalPredict, confidence };
}

// Dummy functions thay thế tạm thời (cần viết lại bằng thuật toán thật)
function markovWeightedV3(pattern) {
  return Math.random() > 0.5 ? "Tài" : "Xỉu";
}

function repeatingPatternV3(pattern) {
  return Math.random() > 0.5 ? "Tài" : "Xỉu";
}

function detectBiasV3(pattern) {
  return Math.random() > 0.5 ? "Tài" : "Xỉu";
}

// WebSocket client
function connectWS() {
  ws = new WebSocket("wss://example.com/your-socket"); // Thay URL nếu cần

  ws.on("open", () => {
    console.log("WebSocket connected.");
  });

  ws.on("message", (data) => {
    const result = data.toString();
    if (result === "T" || result === "X") {
      lastResults.push(result);
      if (lastResults.length > 100) lastResults.shift();
      currentResult = result;
    }
  });

  ws.on("close", () => {
    console.log("WebSocket disconnected. Reconnecting in 5s...");
    setTimeout(connectWS, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
}

// Khởi động WebSocket
connectWS();

// API endpoint để lấy kết quả dự đoán
fastify.get("/predict", async (request, reply) => {
  if (lastResults.length < 10) {
    return reply.send({ error: "Not enough data" });
  }
  const res = multiWindowV3(lastResults);
  return reply.send(res);
});

fastify.get("/", async (request, reply) => {
  reply.send({ status: "Server is running." });
});

// Lắng nghe cổng
fastify.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log("Server listening at", address);
});
