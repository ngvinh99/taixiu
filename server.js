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
  const count = types.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const totalCount = totalsList.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const sortedTotals = Object.entries(totalCount).sort((a, b) => b[1] - a[1]);
  return {
    tai_count: count["Tài"] || 0,
    xiu_count: count["Xỉu"] || 0,
    most_common_total: parseInt(sortedTotals[0][0]),
    most_common_type: (count["Tài"] || 0) >= (count["Xỉu"] || 0) ? "Tài" : "Xỉu"
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

  const last_4 = totalsList.slice(-4);
  const last_3 = totalsList.slice(-3);
  const last_6 = totalsList.slice(-6);
  const last_total = totalsList[totalsList.length - 1];
  const last_result = getTaiXiu(last_total);

  function rule_special_pattern() {
    if (last_4[0] === last_4[2] && last_4[0] === last_4[3] && last_4[0] !== last_4[1]) {
      return {
        prediction: "Tài",
        confidence: 85,
        reason: `Cầu đặc biệt ${last_4}. Bắt Tài theo công thức đặc biệt.`
      };
    }
  }

  function rule_sandwich() {
    if (last_3[0] === last_3[2] && last_3[0] !== last_3[1]) {
      return {
        prediction: last_result === "Tài" ? "Xỉu" : "Tài",
        confidence: 83,
        reason: `Cầu sandwich ${last_3}. Bẻ cầu!`
      };
    }
  }

  function rule_special_numbers() {
    const special_nums = [7, 9, 10];
    const count = last_3.filter(t => special_nums.includes(t)).length;
    if (count >= 2) {
      return {
        prediction: last_result === "Tài" ? "Xỉu" : "Tài",
        confidence: 81,
        reason: `Xuất hiện ≥2 số đặc biệt ${special_nums.join(",")} gần nhất. Bẻ cầu!`
      };
    }
  }

  function rule_frequent_repeat() {
    const freq = last_6.filter(t => t === last_total).length;
    if (freq >= 3) {
      return {
        prediction: getTaiXiu(last_total),
        confidence: 80,
        reason: `Số ${last_total} lặp lại ${freq} lần. Bắt theo nghiêng cầu!`
      };
    }
  }

  function rule_repeat_pattern() {
    if (last_3[0] === last_3[2] || last_3[1] === last_3[2]) {
      return {
        prediction: last_result === "Tài" ? "Xỉu" : "Tài",
        confidence: 77,
        reason: `Cầu lặp dạng ${last_3}. Bẻ cầu theo dạng A-B-B hoặc A-B-A.`
      };
    }
  }

  function rule_default() {
    return {
      prediction: last_result === "Tài" ? "Xỉu" : "Tài",
      confidence: 71,
      reason: "Không có cầu đặc biệt nào, bẻ cầu mặc định theo 1-1."
    };
  }

  const rules = [
    rule_special_pattern,
    rule_sandwich,
    rule_special_numbers,
    rule_frequent_repeat,
    rule_repeat_pattern
  ];

  for (const rule of rules) {
    const result = rule();
    if (result) {
      result.history_summary = taiXiuStats(totalsList);
      return result;
    }
  }

  const result = rule_default();
  result.history_summary = taiXiuStats(totalsList);
  return result;
}

  if (totalsList.length < 4) {
    return {
      prediction: "Chờ",
      reason: "Đợi thêm dữ liệu để phân tích cầu."
    };
  }

  const last4 = totalsList.slice(-4);
  const last3 = totalsList.slice(-3);
  const last2 = totalsList.slice(-2);
  const last6 = totalsList.slice(-6);
  const lastTotal = totalsList[totalsList.length - 1];
  const lastResult = getTaiXiu(lastTotal);

  if (last4[0] === last4[2] && last4[0] === last4[3] && last4[0] !== last4[1]) {
    return {
      prediction: "Tài",
      reason: `Cầu đặc biệt ${last4[0]}-${last4[1]}-${last4[0]}-${last4[0]}. Bắt Tài theo công thức.`
    };
  }

  if (last3[0] === last3[2] && last3[0] !== last3[1]) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      reason: `Cầu sandwich ${last3[0]}-${last3[1]}-${last3[0]}. Bẻ cầu!`
    };
  }

  const specialNums = [7, 9, 10];
  const count = last3.filter(t => specialNums.includes(t)).length;
  if (count >= 2) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      reason: `Xuất hiện cặp ${specialNums.join(",")} trong 3 phiên gần nhất. Bẻ cầu!`
    };
  }

  const freq = last6.filter(t => t === lastTotal).length;
  if (freq >= 3) {
    return {
      prediction: getTaiXiu(lastTotal),
      reason: `Số ${lastTotal} lặp lại ${freq} lần. Bắt theo cầu nghiêng.`
    };
  }

  if (last3[0] === last3[2] || last3[1] === last3[2]) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      reason: `Cầu lặp lại ${last3[1]}-${last3[2]} hoặc ${last3[0]}-${last3[2]}. Bẻ cầu 1-1.`
    };
  }

  return {
    prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
    reason: "Không có cầu đặc biệt, dự đoán theo cầu 1-1."
  };
}

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
    reason: predictionData.reason
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
