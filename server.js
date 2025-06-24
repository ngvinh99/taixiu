const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3008;

// ====== CẤU HÌNH ======
const LUCKY_TOKEN = "a33b9d60-11db-42eb-a8dd-c7494d8f2679";
const LUCKY_WS_URL = `wss://dicemd5.79club8.club/w-chattx/signalr/connect?connectionToken=${LUCKY_TOKEN}`;

// ====== BIẾN LƯU TRẠNG THÁI ======
let luckyCurrentResult = null;
let luckyCurrentSession = null;
let luckyLastDice = "";
let luckyLastPattern = [];

let luckyWS = null;

// ====== KẾT NỐI WEBSOCKET ======
function connectLuckyWebSocket() {
  luckyWS = new WebSocket(LUCKY_WS_URL);

  luckyWS.on("open", () => {
    console.log("✅ Kết nối LuckyDice thành công");

    // Gửi lệnh Ping bắt buộc
    const pingMsg = JSON.stringify({
      H: "md5luckydiceHub",
      M: "PingPong",
      A: [],
      I: 2
    });

    luckyWS.send(pingMsg);
  });

  luckyWS.on("message", (data) => {
    try {
      const text = data.toString();

      if (!text.includes("Md5sessionInfo")) return;

      const json = JSON.parse(text);
      if (!json.M || !Array.isArray(json.M)) return;

      json.M.forEach((msg) => {
        if (
          msg.H === "md5luckydiceHub" &&
          msg.M === "Md5sessionInfo" &&
          Array.isArray(msg.A) &&
          msg.A[0]
        ) {
          const session = msg.A[0];
          const sid = session.SessionID;
          const result = session.Result || {};
          const { Dice1: d1, Dice2: d2, Dice3: d3 } = result;

          if ([d1, d2, d3].includes(-1)) return;

          const diceStr = `${d1},${d2},${d3}`;
          if (sid !== luckyCurrentSession || diceStr !== luckyLastDice) {
            luckyCurrentSession = sid;
            luckyLastDice = diceStr;

            const total = d1 + d2 + d3;
            luckyCurrentResult = total >= 11 ? "Tài" : "Xỉu";

            luckyLastPattern.unshift(luckyCurrentResult === "Tài" ? "T" : "X");
            if (luckyLastPattern.length > 6) luckyLastPattern.pop();

            console.log(`🎯 Phiên ${sid} - ${d1},${d2},${d3} = ${total} → ${luckyCurrentResult}`);
          }
        }
      });
    } catch (e) {
      console.error("❌ Lỗi parse JSON:", e.message);
    }
  });

  luckyWS.on("close", () => {
    console.warn("🔌 Lost connection. Reconnecting in 5s...");
    setTimeout(connectLuckyWebSocket, 5000);
  });

  luckyWS.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
    luckyWS.close();
  });
}

// ====== KHỞI ĐỘNG WS ======
connectLuckyWebSocket();

// ====== API XUẤT DỮ LIỆU ======
fastify.get("/api/luckydice", async (request, reply) => {
  if (!luckyCurrentResult || !luckyCurrentSession) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: ""
    };
  }

  return {
    current_result: luckyCurrentResult,
    current_session: luckyCurrentSession,
    next_session: luckyCurrentSession + 1,
    prediction: luckyCurrentResult === "Tài" ? "Xỉu" : "Tài",
    used_pattern: luckyLastPattern.slice(0, 6).reverse().join("")
  };
});

// ====== KHỞI CHẠY SERVER ======
const start = async () => {
  try {
    const address = await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 LuckyDice API đang chạy tại ${address}`);
  } catch (err) {
    console.error("❌ Server lỗi:", err);
    process.exit(1);
  }
};

start();
