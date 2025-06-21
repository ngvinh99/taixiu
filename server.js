// ==== DỰ ĐOÁN TÀI XỈU SUNWIN - HOÀN CHỈNH ====

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
    console.log("Đã kết nối WebSocket");

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
        currentResult = total >= 11 ? "Tài" : "Xỉu";
        currentSession = latest.sid;
      }
    } catch (e) {}
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

function duDoanSunwin200k(totals) {
  if (totals.length < 4) return ["Chờ", "Đợi thêm dữ liệu để phân tích cầu."];
  const last_4 = totals.slice(-4);
  const last_3 = totals.slice(-3);
  const last_total = totals[totals.length - 1];
  const last_result = getTaiXiu(last_total);

  if (last_4[0] === last_4[2] && last_4[0] === last_4[3] && last_4[0] !== last_4[1]) {
    return ["Tài", `Cầu đặc biệt ${last_4.join("-")}. Bắt Tài theo công thức.`];
  }
  if (last_3[0] === last_3[2] && last_3[0] !== last_3[1]) {
    const predict = last_result === "Tài" ? "Xỉu" : "Tài";
    return [predict, `Cầu sandwich ${last_3.join("-")}. Bẻ cầu!`];
  }
  const special_nums = [7, 9, 10];
  const count = last_3.filter(t => special_nums.includes(t)).length;
  if (count >= 2) {
    const predict = last_result === "Tài" ? "Xỉu" : "Tài";
    return [predict, `Xuất hiện cặp ${special_nums.join(",")} trong 3 phiên gần nhất. Bẻ cầu!`];
  }
  const last_6 = totals.slice(-6);
  const freq = last_6.filter(t => t === last_total).length;
  if (freq >= 3) {
    return [getTaiXiu(last_total), `Số ${last_total} lặp lại ${freq} lần. Bắt theo cầu nghiêng.`];
  }
  if (last_3[0] === last_3[2] || last_3[1] === last_3[2]) {
    const predict = last_result === "Tài" ? "Xỉu" : "Tài";
    return [predict, `Cầu lặp lại ${last_3[1]}-${last_3[2]} hoặc ${last_3[0]}-${last_3[2]}. Bẻ cầu 1-1.`];
  }
  const predict = last_result === "Tài" ? "Xỉu" : "Tài";
  return [predict, "Không có cầu đặc biệt, dự đoán theo cầu 1-1."];
}

function tinhDoTinCay(pattern) {
  const patternArr = pattern.split("");
  const recent = patternArr.slice(0, -1);
  const predicted = patternArr[patternArr.length - 1];
  const count = recent.filter(p => p === predicted).length;
  return Math.round((count / recent.length) * 100);
}

fastify.get("/api/concac", async (request, reply) => {
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
  const [du_doan, reason] = duDoanSunwin200k(totals);

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const currentResult = getTaiXiu(total);
  const currentSession = current.sid;

  const pattern = validResults
    .slice(0, 13)
    .map(item => getTaiXiu(item.d1 + item.d2 + item.d3)[0])
    .reverse()
    .join("");

  const do_tin_cay = tinhDoTinCay(pattern);

  return {
    current_result: currentResult,
    current_session: currentSession,
    phien_hien_tai: currentSession + 1,
    du_doan: du_doan,
    used_pattern: pattern,
    do_tin_cay: do_tin_cay + "%",
    xuc_xac: [current.d1, current.d2, current.d3],
    reason: reason
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
