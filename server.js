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

function sendCmd1005() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }];
    ws.send(JSON.stringify(payload));
  }
}

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket");

  ws.on("open", () => {
    console.log("✅ Đã kết nối WebSocket");

    const authPayload = [
      1,
      "MiniGame",
      "SC_xigtupou",
      "conga999",
      {
        info: "{\"ipAddress\":\"171.246.10.199\",\"userId\":\"7c54ec3f-ee1a-428c-a56e-1bc14fd27e57\",\"username\":\"SC_xigtupou\",\"timestamp\":1748266471861,\"refreshToken\":\"ce8de19af18f4417bb68c3632408d4d7.479079475124482181468c8923b636af\"}",
        signature: "0EC9E9B2311CD352561D9556F88F6AB4167502EAC5F9767D07D43E521FE1BA056C7C67DF0491D20BCE9877B71373A2115CC61E9ED43B8AF1EF6EAC3757EA5B2A46BCB0C519EDCB46DB0EB9ACA445D7076CC1F3F830745609C02BE9F4D86CF419924E33EE3398F1EE4FE65FD045C1A2EE05C85CDBF2EAE6E4297E000664E4CC21"
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

        const latest = lastResults[0];
        const total = latest.d1 + latest.d2 + latest.d3;
        currentResult = getTaiXiu(total);
        currentSession = latest.sid;
      }
    } catch (e) {}
  });

  ws.on("close", () => {
    console.warn("⚠️ WebSocket bị đóng, thử kết nối lại...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}

connectWebSocket();

function getTaiXiu(total) {
  return total >= 11 ? "Tài" : "Xỉu";
}

function markovWeightedV3(pattern) {
  if (pattern.length < 2) return null;
  const last = pattern[pattern.length - 1];
  const pairs = {};
  for (let i = 0; i < pattern.length - 1; i++) {
    const a = pattern[i], b = pattern[i + 1];
    const key = a;
    if (!pairs[key]) pairs[key] = { T: 0, X: 0 };
    pairs[key][b]++;
  }
  const next = pairs[last];
  if (!next) return null;
  return next.T > next.X ? "Tài" : "Xỉu";
}

function repeatingPatternV3(pattern) {
  if (pattern.length < 4) return null;
  const last = pattern.slice(-2).join("");
  for (let i = pattern.length - 4; i >= 0; i--) {
    if (pattern[i] === last[0] && pattern[i + 1] === last[1]) {
      return last[0] === "T" ? "Tài" : "Xỉu";
    }
  }
  return null;
}

function detectBiasV3(pattern) {
  const t = pattern.filter(p => p === "T").length;
  const x = pattern.filter(p => p === "X").length;
  if (Math.abs(t - x) >= 3) return t > x ? "Tài" : "Xỉu";
  return null;
}

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

fastify.get("/api/hahasunvip", async (request, reply) => {
  const validResults = [...lastResults]
    .reverse()
    .filter(item => item.d1 && item.d2 && item.d3);

  if (validResults.length < 13) {
    return {
      current_result: null,
      current_session: null,
      phien_hien_tai: null,
      du_doan: null,
      used_pattern: "",
      do_tin_cay: null,
      xuc_xac: []
    };
  }

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const currentResult = getTaiXiu(total);
  const currentSession = current.sid;

  const pattern = validResults
    .slice(0, 50)
    .map(item => getTaiXiu(item.d1 + item.d2 + item.d3)[0])
    .reverse();

  const result = multiWindowV3(pattern);

  return {
    current_result: currentResult,
    current_session: currentSession,
    phien_hien_tai: currentSession + 1,
    du_doan: result.prediction,
    do_tin_cay: result.confidence + "%",
    used_pattern: pattern.join(""),
    xuc_xac: [current.d1, current.d2, current.d3],
    reason: "Theo phân tích nhiều cửa sổ dữ liệu."
  };
});

const start = async () => {
  try {
    const address = await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server đang chạy tại ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
