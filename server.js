
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

function taiXiuStats(totalsList) {
  const types = totalsList.map(getTaiXiu);
  const count = {};
  types.forEach(t => count[t] = (count[t] || 0) + 1);

  const totalCount = {};
  totalsList.forEach(t => totalCount[t] = (totalCount[t] || 0) + 1);

  const sortedTotals = Object.entries(totalCount).sort((a, b) => b[1] - a[1]);
  const mostCommonTotal = parseInt(sortedTotals[0][0]);
  const mostCommonType = (count["Tài"] || 0) >= (count["Xỉu"] || 0) ? "Tài" : "Xỉu";

  return {
    tai_count: count["Tài"] || 0,
    xiu_count: count["Xỉu"] || 0,
    most_common_total: mostCommonTotal,
    most_common_type: mostCommonType
  };
}



// ========== CẦU VIP MỚI ==========

// Helper: chuyển danh sách tổng thành chuỗi T/X
function getTXPattern(list) {
  return list.map(getTaiXiu).map(tx => tx[0]);
}

function matchCau121(pattern) {
  const len = pattern.length;
  if (len < 4) return null;
  const [a, b, c] = pattern.slice(-4, -1);
  if (a === 'T' && b === 'X' && c === 'X') return { prediction: "Tài", confidence: 89, reason: "Cầu 1-2-1 (T-X-X)" };
  if (a === 'X' && b === 'T' && c === 'T') return { prediction: "Xỉu", confidence: 89, reason: "Cầu 1-2-1 (X-T-T)" };
  return null;
}

function matchCau321(pattern) {
  const len = pattern.length;
  if (len < 6) return null;
  const p = pattern.slice(-6);
  if (p.join("") === "TTTXXT") return { prediction: "Xỉu", confidence: 90, reason: "Cầu 3-2-1 (T-T-T-X-X-T)" };
  if (p.join("") === "XXXTTX") return { prediction: "Tài", confidence: 90, reason: "Cầu 3-2-1 (X-X-X-T-T-X)" };
  return null;
}

function matchCau123(pattern) {
  const len = pattern.length;
  if (len < 6) return null;
  const p = pattern.slice(-6);
  if (p.join("") === "TXXT" && pattern.slice(-6, -5)[0] === "T") return { prediction: "Tài", confidence: 92, reason: "Cầu 1-2-3 (T-X-X-T-T-T)" };
  if (p.join("") === "XTTX" && pattern.slice(-6, -5)[0] === "X") return { prediction: "Xỉu", confidence: 92, reason: "Cầu 1-2-3 (X-T-T-X-X-X)" };
  return null;
}


function duDoanSunwinVipPro(totalsList) {
  if (totalsList.length < 10) {
    return {
      prediction: "Chờ",
      confidence: 0,
      reason: "Chưa đủ dữ liệu.",
      history_summary: taiXiuStats(totalsList)
    };
  }

  const last = totalsList.slice(-1)[0];
  const last3 = totalsList.slice(-3);
  const last4 = totalsList.slice(-4);
  const last6 = totalsList.slice(-6);
  const last10 = totalsList.slice(-10);
  const lastResult = getTaiXiu(last);

  if (last4[0] === last4[2] && last4[0] === last4[3] && last4[0] !== last4[1]) {
    return {
      prediction: "Tài",
      confidence: 91,
      reason: `Cầu đặc biệt dạng A-B-A-A: ${last4.join(", ")}`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  if (last3[0] === last3[2] && last3[0] !== last3[1]) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 88,
      reason: `Cầu sandwich: ${last3.join(", ")}`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  if (last3[0] < last3[1] && last3[1] < last3[2]) {
    return {
      prediction: "Tài",
      confidence: 86,
      reason: "Cầu tăng liên tiếp",
      history_summary: taiXiuStats(totalsList)
    };
  }
  if (last3[0] > last3[1] && last3[1] > last3[2]) {
    return {
      prediction: "Xỉu",
      confidence: 86,
      reason: "Cầu giảm liên tiếp",
      history_summary: taiXiuStats(totalsList)
    };
  }

  const tong10 = Math.round(last10.reduce((a, b) => a + b, 0) / 10);
  if (tong10 >= 11 && tong10 <= 18) {
    return {
      prediction: "Tài",
      confidence: 84,
      reason: `Tổng 10 phiên = ${tong10 * 10}, trung bình = ${tong10}`,
      history_summary: taiXiuStats(totalsList)
    };
  } else {
    return {
      prediction: "Xỉu",
      confidence: 84,
      reason: `Tổng 10 phiên = ${tong10 * 10}, trung bình = ${tong10}`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  const freq = last6.filter(t => t === last).length;
  if (freq >= 3) {
    return {
      prediction: getTaiXiu(last),
      confidence: 82,
      reason: `Số ${last} xuất hiện ${freq} lần gần đây.`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  return {
    prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
    confidence: 77,
    reason: "Không có cầu đặc biệt rõ ràng, chọn nghịch cầu.",
    history_summary: taiXiuStats(totalsList)
  };
}

fastify.get("/api/hahasunvip", async (request, reply) => {
  const validResults = [...lastResults].reverse().filter(item => item.d1 && item.d2 && item.d3);

  if (validResults.length < 1) {
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

  const totals = validResults.map(item => item.d1 + item.d2 + item.d3);
  const predictionData = duDoanSunwinVipPro(totals);

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const currentResult = getTaiXiu(total);
  const currentSession = current.sid;

  const pattern = validResults.slice(0, 13).map(item => getTaiXiu(item.d1 + item.d2 + item.d3)[0]).reverse().join("");
  const count = pattern.split("").filter(p => p === predictionData.prediction[0]).length;
  const doTinCay = Math.round((count / (pattern.length - 1)) * 100);

  return {
    current_result: currentResult,
    current_session: currentSession,
    phien_hien_tai: currentSession + 1,
    du_doan: predictionData.prediction,
    do_tin_cay: doTinCay + "%",
    used_pattern: pattern,
    xuc_xac: [current.d1, current.d2, current.d3],
    reason: predictionData.reason,
    thong_ke: predictionData.history_summary
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
