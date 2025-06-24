const Fastify = require("fastify");
const io = require("socket.io-client");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3009;

// ======= TOKEN & WS URL ========
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2RlIjowLCJtZXNzYWdlIjoiU3VjY2VzcyIsIm5pY2tOYW1lIjoiQmFvZ2lhODI4IiwiYWNjZXNzVG9rZW4iOiJjNTUwNWY2ZWY2MTRlYjU3OWM3NmM1Yjk2ZTIyMDYyNCIsImlzTG9naW4iOnRydWUsIm1vbmV5IjowLCJpZCI6Ijc1NDA5MTMiLCJ1c2VybmFtZSI6Im1pc3M4OCIsImlhdCI6MTc1MDc3MzE4OCwiZXhwIjoxNzUwODAxOTg4fQ.l0SyhKsssk_83aNpYfQxUNuLe87AgGIHWaTtnglF198";
const SOCKET_URL = "wss://wtxmd52.tele68.com/txmd5/?EIO=4&transport=websocket";

// ======= BIẾN DỮ LIỆU ========
let currentResult = null;
let currentSession = null;
let prediction = null;
let patternList = [];

function getTaiXiu(total) {
  return total >= 11 ? "Tài" : "Xỉu";
}

// ======= KẾT NỐI SOCKET ========
const socket = io("https://wtxmd52.tele68.com/txmd5", {
  transports: ["websocket"],
  extraHeaders: {
    Authorization: `Bearer ${TOKEN}`,
  },
});

socket.on("connect", () => {
  console.log("✅ Socket.IO đã kết nối");
});

socket.on("disconnect", () => {
  console.log("🔌 Mất kết nối socket");
});

socket.on("txmd5", (data) => {
  try {
    // Bạn cần in ra để kiểm tra cấu trúc thật của `data`
    console.log("📥 Dữ liệu nhận được:", data);

    const { sid, d1, d2, d3 } = data;

    if ([sid, d1, d2, d3].some((v) => v === undefined)) return;

    currentSession = sid;
    const total = d1 + d2 + d3;
    currentResult = getTaiXiu(total);
    prediction = currentResult === "Tài" ? "Xỉu" : "Tài";

    patternList.unshift(currentResult === "Tài" ? "T" : "X");
    if (patternList.length > 6) patternList.pop();

    console.log(`🎲 Phiên ${sid} - ${d1},${d2},${d3} → ${currentResult}`);
  } catch (err) {
    console.error("❌ Lỗi xử lý dữ liệu socket:", err.message);
  }
});

// ======= API ROUTE ========
fastify.get("/api/tx", async () => {
  if (!currentResult || !currentSession) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: "",
    };
  }

  return {
    current_result: currentResult,
    current_session: currentSession,
    next_session: currentSession + 1,
    prediction,
    used_pattern: patternList.slice(0, 6).reverse().join(""),
  };
});

// ======= START SERVER ========
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ Lỗi khởi chạy:", err);
    process.exit(1);
  }
};

start();
