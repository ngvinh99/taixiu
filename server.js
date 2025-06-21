const Fastify = require("fastify");
const WebSocket = require("ws");
const fs = require("fs");

const fastify = Fastify({ logger: false });
const PORT = 3000;

function duDoanTuPattern(pattern13) {
  try {
    const duDoanData = fs.readFileSync("du_doan.txt", "utf8");
    const line = duDoanData.split("\n").find(line => line.startsWith(pattern13));
    if (!line) return null;
    if (line.includes("Dự đoán: T")) return "Tài";
    if (line.includes("Dự đoán: X")) return "Xỉu";
    return null;
  } catch {
    return null;
  }
}

let lastResults = [];
let ws = null;
let intervalCmd = null;

function sendCmd1005() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify([6, "MiniGame", "taixiuPlugin", { cmd: 1005 }]));
  }
}

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket");

  ws.on("open", () => {
    console.log("✅ WebSocket connected");
    const authPayload = [
      1, "MiniGame", "SC_xigtupou", "conga999", {
        info: "{\"ipAddress\":\"171.246.10.199\",\"userId\":\"7c54ec3f-ee1a-428c-a56e-1bc14fd27e57\",\"username\":\"SC_xigtupou\",\"timestamp\":1748266471861,\"refreshToken\":\"ce8de19af18f4417bb68c3632408d4d7.479079475124482181468c8923b636af\"}",
        signature: "0EC9..." // cắt bớt cho ngắn
      }
    ];
    ws.send(JSON.stringify(authPayload));
    clearInterval(intervalCmd);
    intervalCmd = setInterval(sendCmd1005, 5000);
  });

  ws.on("message", (data) => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr) {
        lastResults = json[1].htr.map(item => ({
          sid: item.sid,
          d1: item.d1,
          d2: item.d2,
          d3: item.d3
        }));
      }
    } catch {}
  });

  ws.on("close", () => {
    console.warn("❌ WebSocket closed, reconnecting...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
    ws.close();
  });
}

connectWebSocket();

fastify.get("/", async () => {
  return { status: "✅ Bot Tài Xỉu đang chạy trên Replit" };
});

fastify.get("/api/taixiu", async () => {
  const validResults = [...lastResults]
    .reverse()
    .filter(item => item.d1 && item.d2 && item.d3);

  if (validResults.length < 13) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: "",
      reason: "❗ Chưa đủ 13 phiên để dự đoán"
    };
  }

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const result = total >= 11 ? "Tài" : "Xỉu";
  const currentSession = current.sid;
  const nextSession = currentSession + 1;

  const pattern13 = validResults.slice(0, 13)
    .map(r => (r.d1 + r.d2 + r.d3) >= 11 ? "T" : "X")
    .reverse()
    .join("");

  const prediction = duDoanTuPattern(pattern13);

  return {
    current_result: result,
    current_session: currentSession,
    next_session: nextSession,
    prediction,
    used_pattern: pattern13,
    reason: prediction ? "✅ Khớp công thức từ file" : "❌ Không khớp công thức nào"
  };
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
