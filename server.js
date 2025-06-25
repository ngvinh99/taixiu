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

function getTaiXiu(total) {
  return total >= 11 && total <= 18 ? "Tài" : "Xỉu";
}

function taiXiuStats(totalsList) {
  const types = totalsList.map(getTaiXiu);
  const count = { Tài: 0, Xỉu: 0 };
  types.forEach(t => count[t]++);

  const freqMap = {};
  totalsList.forEach(t => freqMap[t] = (freqMap[t] || 0) + 1);
  const mostCommonTotal = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0];

  const mostCommonType = count["Tài"] >= count["Xỉu"] ? "Tài" : "Xỉu";
  const averageTotal = +(totalsList.reduce((a, b) => a + b, 0) / totalsList.length).toFixed(2);

  return {
    tai_count: count["Tài"],
    xiu_count: count["Xỉu"],
    most_common_total: Number(mostCommonTotal),
    most_common_type: mostCommonType,
    average_total: averageTotal,
    most_common_tai_xiu: mostCommonType
  };
}

function duDoanSunwin200kVip(totalsList) {
  if (totalsList.length < 6) {
    return {
      prediction: "Chờ",
      confidence: 0,
      reason: "Chưa đủ dữ liệu.",
      history_summary: taiXiuStats(totalsList)
    };
  }

  const last6 = totalsList.slice(-6);
  const last4 = totalsList.slice(-4);
  const last3 = totalsList.slice(-3);
  const lastTotal = totalsList[totalsList.length - 1];
  const lastResult = getTaiXiu(lastTotal);
  const typesList = totalsList.map(getTaiXiu);

  if (last4[0] === last4[2] && last4[0] === last4[3] && last4[0] !== last4[1]) {
    return {
      prediction: "Tài",
      confidence: 85,
      reason: `Cầu đặc biệt ${last4}. Bắt Tài theo công thức đặc biệt.`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  if (last3[0] === last3[2] && last3[0] !== last3[1]) {
    const pred = lastResult === "Tài" ? "Xỉu" : "Tài";
    return {
      prediction: pred,
      confidence: 83,
      reason: `Cầu sandwich ${last3}. Bẻ cầu!`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  const specialNums = [7, 9, 10];
  const countSpecial = last3.filter(t => specialNums.includes(t)).length;
  if (countSpecial >= 2) {
    const pred = lastResult === "Tài" ? "Xỉu" : "Tài";
    return {
      prediction: pred,
      confidence: 81,
      reason: `Xuất hiện ≥2 số đặc biệt ${specialNums.join(",")} gần nhất.`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  const freq = last6.filter(t => t === lastTotal).length;
  if (freq >= 3) {
    return {
      prediction: getTaiXiu(lastTotal),
      confidence: 80,
      reason: `Số ${lastTotal} lặp lại ${freq} lần. Bắt theo nghiêng cầu!`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  if (last3[0] === last3[2] || last3[1] === last3[2]) {
    const pred = lastResult === "Tài" ? "Xỉu" : "Tài";
    return {
      prediction: pred,
      confidence: 77,
      reason: `Cầu lặp dạng ${last3}. Bẻ cầu theo dạng A-B-B hoặc A-B-A.`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  if ((last3[0] < last3[1] && last3[1] < last3[2]) || (last3[0] > last3[1] && last3[1] > last3[2])) {
    const pred = lastResult === "Tài" ? "Xỉu" : "Tài";
    return {
      prediction: pred,
      confidence: 79,
      reason: `3 phiên tăng/giảm liên tiếp ${last3}. Đảo chiều xu hướng.`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  let chain = 1;
  for (let i = typesList.length - 1; i > 0; i--) {
    if (typesList[i] === typesList[i - 1]) {
      chain++;
    } else break;
  }
  if (chain >= 4) {
    const pred = typesList[typesList.length - 1] === "Tài" ? "Xỉu" : "Tài";
    return {
      prediction: pred,
      confidence: 78,
      reason: `Có chuỗi ${chain} phiên ${typesList[typesList.length - 1]}. Đảo chuỗi cầu!`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  if (lastTotal <= 5 || lastTotal >= 16) {
    const pred = lastResult === "Tài" ? "Xỉu" : "Tài";
    return {
      prediction: pred,
      confidence: 76,
      reason: `Tổng điểm cực trị ${lastTotal}. Đảo chiều tránh lệch.`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  return {
    prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
    confidence: 71,
    reason: "Không có cầu đặc biệt nào, bẻ cầu mặc định theo 1-1.",
    history_summary: taiXiuStats(totalsList)
  };
}

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

fastify.get("/api/hahasunvip", async (request, reply) => {
  const validResults = [...lastResults]
    .reverse()
    .filter(item => item.d1 && item.d2 && item.d3);

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
  const predictionData = duDoanSunwin200kVip(totals);

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const currentResult = getTaiXiu(total);
  const currentSession = current.sid;

  const pattern = validResults
    .slice(0, 13)
    .map(item => getTaiXiu(item.d1 + item.d2 + item.d3)[0])
    .reverse()
    .join("");

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
