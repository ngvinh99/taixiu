const Fastify = require("fastify");
const WebSocket = require("ws");
const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;

let lastResults = [];
let ws = null;
let intervalCmd = null;

function sendCmd1005() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }];
    ws.send(JSON.stringify(payload));
  }
}

function getTaiXiu(total) {
  return total >= 11 ? "Tài" : "Xỉu";
}

function taiXiuStats(totalsList) {
  const taiCount = totalsList.filter(t => getTaiXiu(t) === "Tài").length;
  const xiuCount = totalsList.filter(t => getTaiXiu(t) === "Xỉu").length;

  const countMap = {};
  for (let t of totalsList) {
    countMap[t] = (countMap[t] || 0) + 1;
  }

  const mostCommonTotal = Object.entries(countMap).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  const mostCommonType = taiCount >= xiuCount ? "Tài" : "Xỉu";

  return {
    tai_count: taiCount,
    xiu_count: xiuCount,
    most_common_total: parseInt(mostCommonTotal),
    most_common_type: mostCommonType
  };
}

function duDoanSunwin200kVIP(totals) {
  if (totals.length < 4) {
    return {
      prediction: "Chờ",
      confidence: 0,
      reason: "Chưa đủ dữ liệu, cần ít nhất 4 phiên.",
      history_summary: taiXiuStats(totals)
    };
  }

  const last4 = totals.slice(-4);
  const last3 = totals.slice(-3);
  const last6 = totals.slice(-6);
  const lastTotal = totals[totals.length - 1];
  const lastResult = getTaiXiu(lastTotal);
  const specialNums = new Set([7, 9, 10]);

  if (last4[0] === last4[2] && last4[0] === last4[3] && last4[0] !== last4[1]) {
    return {
      prediction: "Tài",
      confidence: 85,
      reason: `Cầu đặc biệt ${last4.join("-")}. Bắt Tài theo công thức đặc biệt.`,
      history_summary: taiXiuStats(totals)
    };
  }

  if (last3[0] === last3[2] && last3[0] !== last3[1]) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 83,
      reason: `Cầu sandwich ${last3.join("-")}. Bẻ cầu!`,
      history_summary: taiXiuStats(totals)
    };
  }

  const countSpecial = last3.filter(t => specialNums.has(t)).length;
  if (countSpecial >= 2) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 81,
      reason: `Xuất hiện ≥2 số đặc biệt (7,9,10). Bẻ cầu!`,
      history_summary: taiXiuStats(totals)
    };
  }

  const freq = last6.filter(t => t === lastTotal).length;
  if (freq >= 3) {
    return {
      prediction: getTaiXiu(lastTotal),
      confidence: 80,
      reason: `Số ${lastTotal} lặp lại ${freq} lần. Bắt theo nghiêng cầu!`,
      history_summary: taiXiuStats(totals)
    };
  }

  if (last3[0] === last3[2] || last3[1] === last3[2]) {
    return {
      prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
      confidence: 77,
      reason: `Cầu lặp dạng ${last3.join("-")}. Bẻ cầu theo dạng A-B-B hoặc A-B-A.`,
      history_summary: taiXiuStats(totals)
    };
  }

  return {
    prediction: lastResult === "Tài" ? "Xỉu" : "Tài",
    confidence: 71,
    reason: "Không có cầu đặc biệt. Bẻ cầu mặc định.",
    history_summary: taiXiuStats(totals)
  };
}

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/wsbinary?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsImdlbmRlciI6MCwiZGlzcGxheU5hbWUiOiJ4b3NpZXVkZXAiLCJwaG9uZVZlcmlmaWVkIjp0cnVlLCJib3QiOjAsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wMi5wbmciLCJ1c2VySWQiOiI2YzJjMjMyYy02OTJiLTQ1NTktOGZiMS1kOTQ0NWUwMmU5ODQiLCJyZWdUaW1lIjoxNzUxMzU2NjYwOTkzLCJwaG9uZSI6Ijg0OTE0NzkxOTc4IiwiY3VzdG9tZXJJZCI6MjczNTM1Nzk3LCJicmFuZCI6InN1bi53aW4iLCJ1c2VybmFtZSI6IlNDX2F4b2RheSIsInRpbWVzdGFtcCI6MTc1MjgxNjMwNjUxNn0.gZkznc-YyY_p12H_jlTgfh-yIA4YvliABLRRDu2v5Go");

  ws.on("open", () => {
    console.log("✅ Kết nối WebSocket thành công");

    ws.send(JSON.stringify([
      1,
      "MiniGame",
      "SC_xigtupou",
      "conga999",
      {
        info: "{\"ipAddress\":\"2a09:bac5:d46e:25b9::3c2:39\",\"userId\":\"eff718a2-31db-4dd5-acb5-41f8cfd3e486\",\"username\":\"SC_miss88\",\"timestamp\":1751782535424,\"refreshToken\":\"22aadcb93490422b8d713f8776329a48.9adf6a5293d8443a888edd3ee802b9f4\"}",
        signature: "06FBBB7B38F79CBFCD34485EEEDF4104E542C26114984D0E9155073FD73E4C23CDCF1029B8F75B26427D641D5FE7BC4B231ABB0D2F6EBC76ED6EDE56B640ED161DEA92A6340AD911AD3D029D8A39E081EB9463BCA194C6B7230C89858723A9E3599868CAEC4D475C22266E4B299BA832D9E20BC3374679CA4F880593CF5D5845"
      }
    ]));

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
    clearInterval(intervalCmd);
    console.warn("⚠️ Mất kết nối. Đang thử lại...");
    setTimeout(connectWebSocket, 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}

connectWebSocket();

fastify.get("/api/toolaxosun", async (req, reply) => {
  const valid = [...lastResults].reverse().filter(i => i.d1 && i.d2 && i.d3);
  if (valid.length < 4) {
    return {
      prediction: "Chờ",
      reason: "Chưa đủ dữ liệu.",
      history: [],
      id: "@axobantool"
    };
  }

  const totals = valid.map(i => i.d1 + i.d2 + i.d3);
  const current = valid[0];
  const phienCu = current.sid;
  const ketQua = getTaiXiu(totals[0]);
  const nextSession = phienCu + 1;

  const result = duDoanSunwin200kVIP(totals);

  return {
    phien_cu: phienCu,
    ket_qua: ketQua,
    xuc_xac: [current.d1, current.d2, current.d3],
    phien_hien_tai: nextSession,
    du_doan: result.prediction,
    do_tin_cay: result.confidence,
    ly_do: result.reason,
    thong_ke: result.history_summary,
    id: "@axobantool"
  };
});

fastify.listen({ port: PORT, host: "0.0.0.0" }).then(addr => {
  console.log(`🚀 Server chạy tại ${addr}`);
});
