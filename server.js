
const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: true });
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
    console.log("📤 Gửi cmd:1005");
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

        console.log(`🎲 Phiên ${currentSession}: ${latest.d1}+${latest.d2}+${latest.d3} = ${total} → ${currentResult}`);
      }
    } catch (err) {
      console.log("❌ Lỗi xử lý dữ liệu:", err.message);
    }
  });

  ws.on("close", () => {
    console.warn("⚠️ WebSocket đóng, thử lại sau 5s...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}

function getTaiXiu(total) {
  return total >= 11 ? "TÀI" : "XỈU";
}

function smartPredict(history) {
  if (history.length < 10) return ["📉 Chưa đủ dữ liệu để dự đoán.", null];

  const last10 = history.slice(-10);
  const tai_xiu = last10.map(v => v >= 11 ? "TÀI" : "XỈU");

  const weights = Array.from({ length: 10 }, (_, i) => 10 - i);
  const score = { "TÀI": 0, "XỈU": 0 };
  for (let i = 0; i < 10; i++) {
    score[tai_xiu[i]] += weights[i];
  }

  const last_result = tai_xiu[tai_xiu.length - 1];
  let streak = 1;
  for (let i = tai_xiu.length - 2; i >= 0; i--) {
    if (tai_xiu[i] === last_result) {
      streak++;
    } else {
      break;
    }
  }

  if (streak >= 4) {
    const predicted = last_result === "TÀI" ? "XỈU" : "TÀI";
    return [`🔁 Chuỗi ${streak} ${last_result} → Đảo chiều dự đoán: ${predicted}`, predicted];
  }

  if (Math.abs(score["TÀI"] - score["XỈU"]) >= 12) {
    const predicted = score["TÀI"] > score["XỈU"] ? "TÀI" : "XỈU";
    return [`📊 Trọng số nghiêng mạnh về: ${predicted}`, predicted];
  }

  const pattern = tai_xiu.slice(-6).map(v => v === "TÀI" ? "T" : "X").join("");
  const bait_patterns = ["TXT", "XTX", "TXXT", "XTTX"];
  if (bait_patterns.some(p => pattern.includes(p))) {
    const predicted = last_result === "TÀI" ? "XỈU" : "TÀI";
    return [`🪤 Phát hiện cầu bẫy (${pattern}) → Đảo ngược kết quả: ${predicted}`, predicted];
  }

  const predicted = score["TÀI"] > score["XỈU"] ? "TÀI" : "XỈU";
  return [`🧠 Tổng điểm: TÀI=${score["TÀI"]}, XỈU=${score["XỈU"]} → Dự đoán: ${predicted}`, predicted];
}

fastify.get("/api/hahasunvip", async (req, res) => {
  const valid = [...lastResults].reverse().filter(i => i.d1 && i.d2 && i.d3);
  if (valid.length < 1) {
    return {
      current_result: null,
      current_session: null,
      phien_hien_tai: null,
      du_doan: null,
      do_tin_cay: null,
      used_pattern: "",
      xuc_xac: []
    };
  }

  const totals = valid.map(i => i.d1 + i.d2 + i.d3);
  const [reason, prediction] = smartPredict(totals);

  const current = valid[0];
  const total = current.d1 + current.d2 + current.d3;
  const currentResult = getTaiXiu(total);
  const currentSession = current.sid;

  const pattern = valid.slice(0, 13).map(i => getTaiXiu(i.d1 + i.d2 + i.d3)[0]).reverse().join("");
  const count = pattern.split("").filter(p => p === prediction?.[0]).length;
  const doTinCay = Math.round((count / (pattern.length || 1)) * 100);

  return {
    current_result: currentResult,
    current_session: currentSession,
    phien_hien_tai: currentSession + 1,
    du_doan: prediction,
    do_tin_cay: doTinCay + "%",
    used_pattern: pattern,
    xuc_xac: [current.d1, current.d2, current.d3],
    reason
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

connectWebSocket();
start();
