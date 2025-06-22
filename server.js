const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3060;

let lastResults = [];
let currentResult = null;
let currentSession = null;

let ws = null;
let reconnectInterval = 5000;

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.atpman.net/websocket");

  ws.on("open", () => {
    console.log("✅ Đã kết nối WebSocket");

    const authPayload = [
      1,
      "MiniGame",
      "banohu1",
      "ba2007ok",
      {
        info: "{\"ipAddress\":\"171.246.8.201\",\"userId\":\"97096527-e9f4-4520-b66d-9635985b416d\",\"username\":\"S8_banohu1\",\"timestamp\":1748536572775,\"refreshToken\":\"5fd323a7c6654a2fa1f47e63c1352945.1b9eb2f9a24c4a1cb85fbcaa277d5811\"}",
        signature: "276BC6DE81AED8CE3F87296AACBDE235A5AD5D85E86DF8A68A2DBDDBA7BFBA6B83C4210C2998AB19C3531A794174BD0FA3C3A354DF296EB407F7258EB39B61E4948F271A78B37A9070D8839C60FD916FA1BB72A3E35D6156B0BBF2D54EA0231B2C4C1FB25B2575300044F4D918754506416ED93D7B01EBB5147B9533D78D71CA"
      }
    ];

    ws.send(JSON.stringify(authPayload));
    console.log("🔐 Đã gửi payload xác thực");

    // Gửi lệnh lấy kết quả xúc xắc sau 2 giây
    setTimeout(() => {
      const dicePayload = [
        6,
        "MiniGame",
        "taixiuUnbalancedPlugin",
        { cmd: 2000 }
      ];
      ws.send(JSON.stringify(dicePayload));
      console.log("🎲 Đã gửi lệnh lấy kết quả xúc xắc (cmd: 2000)");
    }, 2000);
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

        console.log(`📥 Phiên ${currentSession}: ${latest.d1} + ${latest.d2} + ${latest.d3} = ${total} → ${currentResult}`);
      }
    } catch (e) {
      // Không log lỗi nhỏ để tránh spam
    }
  });

  ws.on("close", () => {
    console.warn("⚠️ WebSocket bị đóng, thử kết nối lại sau 5 giây...");
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}

connectWebSocket();

fastify.get("/api/club789", async (request, reply) => {
  const validResults = [...lastResults]
    .reverse()
    .filter(item => item.d1 && item.d2 && item.d3);

  if (validResults.length < 1) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: ""
    };
  }

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const result = total >= 11 ? "Tài" : "Xỉu";
  const currentSession = current.sid;
  const nextSession = currentSession + 1;
  const prediction = result === "Tài" ? "Xỉu" : "Tài";

  const pattern = validResults
    .slice(0, 6)
    .map(item => {
      const sum = item.d1 + item.d2 + item.d3;
      return sum >= 11 ? "T" : "X";
    })
    .reverse()
    .join("");

  return {
    current_result: result,
    current_session: currentSession,
    next_session: nextSession,
    prediction: prediction,
    used_pattern: pattern
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
