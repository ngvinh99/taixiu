// ==== DỰ ĐOÁN TÀI XỈU SUNWIN - ĐÃ CẬP NHẬT API MỚI ====

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
  ws = new WebSocket("wss://mynygwais.hytsocesk.com/websocket");

  ws.on("open", () => {
    console.log("Đã kết nối WebSocket");

    const authPayload = [
      1,
      "MiniGame",
      "",
      "",
      {
        agentId: "1",
        accessToken: "1-09550db2f0fdefee91926e37242e20aa",
        reconnect: true,
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
    } catch (e) {
      console.error("Lỗi xử lý message:", e.message);
    }
  });

  ws.on("close", () => {
    console.warn("WebSocket bị đóng, thử kết nối lại...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("Lỗi WebSocket:", err.message);
    ws.close();
  });
}

connectWebSocket();

function getTaiXiu(total) {
  return total >= 11 ? "Tài" : "Xỉu";
}

function taiXiuStats(totalsList) {
  const types = totalsList.map(getTaiXiu);
  const count = types.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
  const totalCount = totalsList.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
  const mostCommonTotal = Object.entries(totalCount).sort((a, b) => b[1] - a[1])[0][0];
  const mostCommonType = (count["Tài"] || 0) >= (count["Xỉu"] || 0) ? "Tài" : "Xỉu";
  return {
    tai_count: count["Tài"] || 0,
    xiu_count: count["Xỉu"] || 0,
    most_common_total: parseInt(mostCommonTotal),
    most_common_type: mostCommonType
  };
}

function duDoanSunwin200kVip(totalsList) {
  if (totalsList.length < 4) {
    return {
      prediction: "Chờ",
      confidence: 0,
      reason: "Chưa đủ dữ liệu, cần ít nhất 4 phiên.",
      history_summary: taiXiuStats(totalsList)
    };
  }

  const last4 = totalsList.slice(-4);
  const last3 = totalsList.slice(-3);
  const last6 = totalsList.slice(-6);
  const lastTotal = totalsList[totalsList.length - 1];
  const lastResult = getTaiXiu(lastTotal);

  if (last4[0] === last4[2] && last4[0] === last4[3] && last4[0] !== last4[1]) {
    return {
      prediction: "Tài",
      confidence: 85,
      reason: `Cầu đặc biệt ${last4}. Bắt Tài theo công thức đặc biệt.`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  if (last3[0] === last3[2] && last3[0] !== last3[1]) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 83,
      reason: `Cầu sandwich ${last3}. Bẻ cầu!`,
      history_summary: taiXiuStats(totalsList)
    };
  }

  const specialNums = [7, 9, 10];
  const count = last3.filter(t => specialNums.includes(t)).length;
  if (count >= 2) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 81,
      reason: `Xuất hiện ≥2 số đặc biệt ${specialNums.join(",")} gần nhất. Bẻ cầu!`,
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
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 77,
      reason: `Cầu lặp dạng ${last3}. Bẻ cầu theo dạng A-B-B hoặc A-B-A.`,
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

fastify.get("/api/taixiu", async (request, reply) => {
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
    console.log(`Fastify server đang chạy tại ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
