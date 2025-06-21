const Fastify = require("fastify");
const WebSocket = require("ws");
const fs = require("fs");

const fastify = Fastify({ logger: false });
const PORT = 3000;

function duDoanTuPattern(pattern) {
  try {
    const data = fs.readFileSync("du_doan.txt", "utf8").split("\n");
    // Tìm dòng khớp dài nhất
    for (let len = pattern.length; len >= 1; len--) {
      const sub = pattern.slice(-len);
      const matched = data.find(line => line.startsWith(sub));
      if (matched) {
        if (matched.includes("Dự đoán: T")) return { predict: "Tài", pattern: sub };
        if (matched.includes("Dự đoán: X")) return { predict: "Xỉu", pattern: sub };
      }
    }
    return { predict: null, pattern: pattern };
  } catch {
    return { predict: null, pattern: pattern };
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
        signature: "0EC9..."
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
    console.warn("❌ WebSocket closed. Reconnecting...");
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
  const validResults = [...lastResults].filter(item => item.d1 && item.d2 && item.d3);

  if (validResults.length < 1) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: "",
      reason: "❗ Chưa có dữ liệu phiên gần nhất"
    };
  }

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const result = total >= 11 ? "Tài" : "Xỉu";
  const currentSession = current.sid;
  const nextSession = currentSession + 1;

  const pattern = validResults
    .slice(0, Math.min(validResults.length, 13))
    .map(r => (r.d1 + r.d2 + r.d3) >= 11 ? "T" : "X")
    .reverse()
    .join("");

  const { predict, pattern: matchedPattern } = duDoanTuPattern(pattern);

  return {
    current_result: result,
    current_session: currentSession,
    next_session: nextSession,
    prediction: predict,
    used_pattern: matchedPattern,
    reason: predict ? "✅ Khớp file công thức" : "❌ Không khớp pattern nào"
  };
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
