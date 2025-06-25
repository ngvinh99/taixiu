const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: true });
const PORT = process.env.PORT || 10000;

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
    console.log("✅ WebSocket connected.");

    const authPayload = [
      1,
      "MiniGame",
      "SC_xigtupou",
      "conga999",
      {
        info: JSON.stringify({
          ipAddress: "171.246.10.199",
          userId: "7c54ec3f-ee1a-428c-a56e-1bc14fd27e57",
          username: "SC_xigtupou",
          timestamp: 1748266471861,
          refreshToken:
            "ce8de19af18f4417bb68c3632408d4d7.479079475124482181468c8923b636af",
        }),
        signature:
          "0EC9E9B2311CD352561D9556F88F6AB4167502EAC5F9767D07D43E521FE1BA056C7C67DF0491D20BCE9877B71373A2115CC61E9ED43B8AF1EF6EAC3757EA5B2A46BCB0C519EDCB46DB0EB9ACA445D7076CC1F3F830745609C02BE9F4D86CF419924E33EE3398F1EE4FE65FD045C1A2EE05C85CDBF2EAE6E4297E000664E4CC21",
      },
    ];

    ws.send(JSON.stringify(authPayload));
    clearInterval(intervalCmd);
    intervalCmd = setInterval(sendCmd1005, 5000);
  });

  ws.on("message", (data) => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr) {
        lastResults = json[1].htr.map((item) => ({
          sid: item.sid,
          d1: item.d1,
          d2: item.d2,
          d3: item.d3,
        }));

        const latest = lastResults[0];
        const total = latest.d1 + latest.d2 + latest.d3;
        currentResult = getTaiXiu(total);
        currentSession = latest.sid;
      }
    } catch {}
  });

  ws.on("close", () => {
    console.warn("⚠️ WebSocket closed. Reconnecting...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
    ws.close();
  });
}

connectWebSocket();

function getTaiXiu(total) {
  return total >= 11 ? "Tài" : "Xỉu";
}

function taiXiuStats(totalsList) {
  const types = totalsList.map(getTaiXiu);
  const count = {};
  types.forEach((t) => (count[t] = (count[t] || 0) + 1));

  const totalCount = {};
  totalsList.forEach((t) => (totalCount[t] = (totalCount[t] || 0) + 1));

  const sortedTotals = Object.entries(totalCount).sort((a, b) => b[1] - a[1]);
  const mostCommonTotal = parseInt(sortedTotals[0][0]);
  const mostCommonType =
    (count["Tài"] || 0) >= (count["Xỉu"] || 0) ? "Tài" : "Xỉu";

  return {
    tai_count: count["Tài"] || 0,
    xiu_count: count["Xỉu"] || 0,
    most_common_total: mostCommonTotal,
    most_common_type: mostCommonType,
  };
}

function duDoan(totalsList) {
  if (totalsList.length < 4) {
    return {
      prediction: "Chờ",
      confidence: 0,
      reason: "Chưa đủ dữ liệu.",
      history_summary: taiXiuStats(totalsList),
    };
  }

  const last3 = totalsList.slice(-3);
  const last4 = totalsList.slice(-4);
  const lastTotal = totalsList[totalsList.length - 1];
  const lastResult = getTaiXiu(lastTotal);

  if (last4[0] === last4[2] && last4[0] === last4[3] && last4[0] !== last4[1]) {
    return {
      prediction: "Tài",
      confidence: 85,
      reason: `Cầu đặc biệt ${last4}`,
      history_summary: taiXiuStats(totalsList),
    };
  }

  if (last3[0] === last3[2] && last3[0] !== last3[1]) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 80,
      reason: `Cầu sandwich ${last3}`,
      history_summary: taiXiuStats(totalsList),
    };
  }

  return {
    prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
    confidence: 70,
    reason: `Không có cầu rõ ràng, đảo chiều mặc định`,
    history_summary: taiXiuStats(totalsList),
  };
}

fastify.get("/api/taixiu", async (req, rep) => {
  const valid = [...lastResults].reverse().filter((i) => i.d1 && i.d2 && i.d3);

  if (!valid.length) {
    return {
      current_result: null,
      current_session: null,
      du_doan: null,
      xuc_xac: [],
    };
  }

  const totals = valid.map((i) => i.d1 + i.d2 + i.d3);
  const prediction = duDoan(totals);
  const current = valid[0];
  const total = current.d1 + current.d2 + current.d3;

  const pattern = valid
    .slice(0, 13)
    .map((item) => getTaiXiu(item.d1 + item.d2 + item.d3)[0])
    .reverse()
    .join("");

  const count = pattern.split("").filter((p) => p === prediction.prediction[0])
    .length;
  const doTinCay = Math.round((count / (pattern.length - 1)) * 100);

  return {
    current_result: getTaiXiu(total),
    current_session: current.sid,
    phien_hien_tai: current.sid + 1,
    du_doan: prediction.prediction,
    do_tin_cay: doTinCay + "%",
    used_pattern: pattern,
    xuc_xac: [current.d1, current.d2, current.d3],
    reason: prediction.reason,
    thong_ke: prediction.history_summary,
  };
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, addr) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server is running at ${addr}`);
});
