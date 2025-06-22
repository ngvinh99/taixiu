const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3005;

let results = [];
let ws = null;
let interval = null;

function connect() {
  ws = new WebSocket("wss://myniskgw.ryksockesg.net/websocket");

  ws.on("open", () => {
    console.log("✅ Đã kết nối WebSocket Tài Xỉu mới");

    // Gửi payload xác thực mới
    const authPayload = [
      1,
      "MiniGame",
      "",
      "",
      {
        agentId: "1",
        accessToken: "29-37406443fea74c4977263f808ac1fc38",
        reconnect: false,
      },
    ];
    ws.send(JSON.stringify(authPayload));

    // Gửi payload lấy lịch sử sau 1 giây, rồi đều đặn 5s/lần
    setTimeout(sendHistoryRequest, 1000);
    interval = setInterval(sendHistoryRequest, 5000);
  });

  ws.on("message", (data) => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr && Array.isArray(json[1].htr)) {
        results = json[1].htr.map((item) => ({
          sid: item.sid,
          d1: item.d1,
          d2: item.d2,
          d3: item.d3,
        }));
        console.log(`🔄 Cập nhật lịch sử Tài Xỉu: ${results.length} bản ghi`);
      }
    } catch (e) {
      // ignore lỗi parse
    }
  });

  ws.on("close", () => {
    console.warn("🔌 WebSocket đóng kết nối, thử lại sau 5s...");
    clearInterval(interval);
    setTimeout(connect, 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}

function sendHistoryRequest() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }];
    ws.send(JSON.stringify(payload));
  }
}

connect();

fastify.get("/api/taixiu", async () => {
  if (!results.length) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: "",
    };
  }

  const validResults = results
    .filter((r) => r.d1 != null && r.d2 != null && r.d3 != null)
    .slice(0, 6);

  if (!validResults.length) {
    return {
      current_result: null,
      current_session: null,
      next_session: null,
      prediction: null,
      used_pattern: "",
    };
  }

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const currentResult = total >= 11 ? "Tài" : "Xỉu";
  const currentSession = current.sid;
  const nextSession = currentSession + 1;
  const prediction = currentResult === "Tài" ? "Xỉu" : "Tài";

  const pattern = validResults
    .map((r) => (r.d1 + r.d2 + r.d3 >= 11 ? "T" : "X"))
    .reverse()
    .join("");

  return {
    current_result: currentResult,
    current_session: currentSession,
    next_session: nextSession,
    prediction: prediction,
    used_pattern: pattern,
  };
});

fastify.listen({ port: PORT, host: "0.0.0.0" }).then(({ url }) => {
  console.log(`🚀 Server chạy tại ${url}`);
});
