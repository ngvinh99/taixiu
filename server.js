const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3008;

let currentResult = null;
let currentSession = null;
let lastDiceString = "";
let lastPattern = [];

let ws = null;

function connectWebSocket() {
  const socketUrl = "wss://dicemd5.79club8.club/w-chattx/signalr/connect?connectionToken=a33b9d60-11db-42eb-a8dd-c7494d8f2679";
  ws = new WebSocket(socketUrl);

  ws.on("open", () => {
    console.log("✅ Đã kết nối WebSocket LuckyDice");

    // Gửi lệnh ping
    const pingMsg = JSON.stringify({
      H: "md5luckydiceHub",
      M: "PingPong",
      A: "",
      I: 2
    });
    ws.send(pingMsg);
  });

  ws.on("message", (data) => {
    try {
      const json = JSON.parse(data);
      if (!json.M || !Array.isArray(json.M)) return;

      json.M.forEach((msg) => {
        if (msg.H === "md5luckydiceHub" && msg.M === "Md5sessionInfo" && Array.isArray(msg.A)) {
          const session = msg.A[0];
          const sid = session.SessionID;
          const result = session.Result || {};
          const { Dice1: d1, Dice2: d2, Dice3: d3 } = result;

          if ([d1, d2, d3].includes(-1)) return;

          const diceStr = `${d1},${d2},${d3}`;
          if (sid !== currentSession || diceStr !== lastDiceString) {
            currentSession = sid;
            lastDiceString = diceStr;

            const sum = d1 + d2 + d3;
            currentResult = sum >= 11 ? "Tài" : "Xỉu";

            // Lưu mẫu 6 kết quả gần nhất
            lastPattern.unshift(currentResult === "Tài" ? "T" : "X");
            if (lastPattern.length > 6) lastPattern.pop();

            console.log(`Phiên: ${sid} - Dice: ${d1},${d2},${d3} = ${sum} → ${currentResult}`);
          }
        }
      });
    } catch (e) {}
  });

  ws.on("close", () => {
    console.warn("🔌 WebSocket bị đóng. Đang thử kết nối lại...");
    setTimeout(connectWebSocket, 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}

connectWebSocket();

fastify.get("/api/luckydice", async (request, reply) => {
  if (!currentResult || !currentSession) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: ""
    };
  }

  return {
    current_result: currentResult,
    current_session: currentSession,
    next_session: currentSession + 1,
    prediction: currentResult === "Tài" ? "Xỉu" : "Tài",
    used_pattern: lastPattern.slice(0, 6).reverse().join("")
  };
});

const start = async () => {
  try {
    const addr = await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🎲 LuckyDice API đang chạy tại ${addr}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
