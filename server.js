const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;

let lastResults = []; // Giữ tối đa 20 phiên gần nhất
let ws = null;
let intervalCmd = null;

function getTaiXiu(total) {
  return total >= 11 ? "Tài" : "Xỉu";
}

function taiXiuStats(totalsList) {
  const count = { Tài: 0, Xỉu: 0 };
  const freqMap = {};
  let sum = 0;

  for (let t of totalsList) {
    const kq = getTaiXiu(t);
    count[kq]++;
    freqMap[t] = (freqMap[t] || 0) + 1;
    sum += t;
  }

  const mostCommonTotal = +Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0];
  const mostCommonType = count["Tài"] >= count["Xỉu"] ? "Tài" : "Xỉu";

  return {
    tai_count: count["Tài"],
    xiu_count: count["Xỉu"],
    most_common_total: mostCommonTotal,
    most_common_type,
    average_total: +(sum / totalsList.length).toFixed(2),
    most_common_tai_xiu: mostCommonType
  };
}

function duDoanSunwin200kVip(totalsList) {
  if (totalsList.length < 6) return { prediction: "Chờ", confidence: 0, reason: "Chưa đủ dữ liệu.", history_summary: taiXiuStats(totalsList) };

  const last6 = totalsList.slice(-6);
  const last4 = totalsList.slice(-4);
  const last3 = totalsList.slice(-3);
  const last = totalsList[totalsList.length - 1];
  const types = totalsList.map(getTaiXiu);
  const lastType = getTaiXiu(last);

  if (last4[0] === last4[2] && last4[0] === last4[3] && last4[0] !== last4[1])
    return { prediction: "Tài", confidence: 85, reason: `Cầu đặc biệt ${last4}`, history_summary: taiXiuStats(totalsList) };

  if (last3[0] === last3[2] && last3[0] !== last3[1])
    return { prediction: lastType === "Tài" ? "Xỉu" : "Tài", confidence: 83, reason: `Cầu sandwich ${last3}`, history_summary: taiXiuStats(totalsList) };

  const specialNums = [7, 9, 10];
  if (last3.filter(t => specialNums.includes(t)).length >= 2)
    return { prediction: lastType === "Tài" ? "Xỉu" : "Tài", confidence: 81, reason: `Có 2 số đặc biệt gần nhất`, history_summary: taiXiuStats(totalsList) };

  if (last6.filter(t => t === last).length >= 3)
    return { prediction: lastType, confidence: 80, reason: `Số ${last} lặp lại nhiều`, history_summary: taiXiuStats(totalsList) };

  if (last3[0] === last3[2] || last3[1] === last3[2])
    return { prediction: lastType === "Tài" ? "Xỉu" : "Tài", confidence: 77, reason: `Cầu A-B-B hoặc A-B-A`, history_summary: taiXiuStats(totalsList) };

  if ((last3[0] < last3[1] && last3[1] < last3[2]) || (last3[0] > last3[1] && last3[1] > last3[2]))
    return { prediction: lastType === "Tài" ? "Xỉu" : "Tài", confidence: 79, reason: `3 phiên tăng/giảm`, history_summary: taiXiuStats(totalsList) };

  let chain = 1;
  for (let i = types.length - 1; i > 0 && types[i] === types[i - 1]; i--) chain++;
  if (chain >= 4)
    return { prediction: lastType === "Tài" ? "Xỉu" : "Tài", confidence: 78, reason: `Chuỗi ${chain} phiên`, history_summary: taiXiuStats(totalsList) };

  if (last <= 5 || last >= 16)
    return { prediction: lastType === "Tài" ? "Xỉu" : "Tài", confidence: 76, reason: `Tổng cực trị ${last}`, history_summary: taiXiuStats(totalsList) };

  return { prediction: lastType === "Tài" ? "Xỉu" : "Tài", confidence: 71, reason: `Không có cầu đặc biệt`, history_summary: taiXiuStats(totalsList) };
}

function sendCmd1005() {
  if (ws?.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify([6, "MiniGame", "taixiuPlugin", { cmd: 1005 }]));
}

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket");

  ws.on("open", () => {
    console.log("✅ Đã kết nối");
    const payload = [1, "MiniGame", "SC_xigtupou", "conga999", {
      info: "{\"ipAddress\":\"171.246.10.199\",\"userId\":\"7c54ec3f-ee1a-428c-a56e-1bc14fd27e57\",\"username\":\"SC_xigtupou\",\"timestamp\":1748266471861,\"refreshToken\":\"ce8de19af18f4417bb68c3632408d4d7.479079475124482181468c8923b636af\"}",
      signature: "..."
    }];
    ws.send(JSON.stringify(payload));
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
        })).slice(0, 20); // giữ tối đa 20 phiên
      }
    } catch (e) {}
  });

  ws.on("close", () => {
    console.warn("⚠️ Mất kết nối WebSocket...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, 3000);
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket lỗi:", err.message);
    ws.close();
  });
}

connectWebSocket();

fastify.get("/api/hahasunvip", async () => {
  const valid = lastResults.filter(r => r.d1 && r.d2 && r.d3);
  if (!valid.length) return { du_doan: "Chờ", do_tin_cay: "0%", used_pattern: "", xuc_xac: [] };

  const totals = valid.map(r => r.d1 + r.d2 + r.d3);
  const current = valid[0];
  const prediction = duDoanSunwin200kVip(totals);

  const pattern = valid.slice(0, 13).map(r => getTaiXiu(r.d1 + r.d2 + r.d3)[0]).reverse().join("");
  const count = pattern.split("").filter(p => p === prediction.prediction[0]).length;
  const doTinCay = Math.round((count / (pattern.length - 1)) * 100);

  return {
    current_result: getTaiXiu(totals[0]),
    current_session: current.sid,
    phien_hien_tai: current.sid + 1,
    du_doan: prediction.prediction,
    do_tin_cay: doTinCay + "%",
    used_pattern: pattern,
    xuc_xac: [current.d1, current.d2, current.d3],
    reason: prediction.reason,
    thong_ke: prediction.history_summary
  };
});

fastify.listen({ port: PORT, host: "0.0.0.0" }).then(addr => {
  console.log(`🚀 Server đang chạy tại ${addr}`);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
