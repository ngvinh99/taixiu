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
      "SC_axoday",
      "vinhk122011",
      {
        info: "{\"ipAddress\":\"2001:ee0:4f91:2000:8586:2615:e750:24bb\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsImdlbmRlciI6MCwiZGlzcGxheU5hbWUiOiJ4b3NpZXVkZXAiLCJwaG9uZVZlcmlmaWVkIjp0cnVlLCJib3QiOjAsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wMi5wbmciLCJ1c2VySWQiOiI2YzJjMjMyYy02OTJiLTQ1NTktOGZiMS1kOTQ0NWUwMmU5ODQiLCJyZWdUaW1lIjoxNzUxMzU2NjYwOTkzLCJwaG9uZSI6Ijg0OTE0NzkxOTc4IiwiY3VzdG9tZXJJZCI6MjczNTM1Nzk3LCJicmFuZCI6InN1bi53aW4iLCJ1c2VybmFtZSI6IlNDX2F4b2RheSIsInRpbWVzdGFtcCI6MTc1MjgxNjMwNjUxNn0.gZkznc-YyY_p12H_jlTgfh-yIA4YvliABLRRDu2v5Go\",\"userId\":\"6c2c232c-692b-4559-8fb1-d9445e02e984\",\"username\":\"SC_axoday\",\"timestamp\":1752816306516}";
        signature: "54C022C02ECB9F9D99DDF3535EAEC88AEDA70CEC4A4466766A932A5A521624ADCA7A799543F3141320A35B6D9575F13AE3402C4C1ADAF60491895A9473357CF322A6BC6A6413573BEECEE9C7E4F4E6855B9A9D47DD11209E600B28ACAED4546CBAD85AE002228BFEF69ABCB20C1A1C63AACD82141BE2966454A072E839C5D496"
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
