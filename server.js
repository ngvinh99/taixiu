const Fastify = require("fastify");
const WebSocket = require("ws");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;

let b52LatestDice = null;
let b52CurrentSession = null;
let b52CurrentMD5 = null;
let b52WS = null;
let b52IntervalCmd = null;
const b52ReconnectInterval = 5000;

function sendB52Cmd2000() {
  if (b52WS && b52WS.readyState === WebSocket.OPEN) {
    const payload = [6, "MiniGame", "taixiuKCBPlugin", { cmd: 2000 }];
    b52WS.send(JSON.stringify(payload));
  }
}

function connectB52WebSocket() {
  b52WS = new WebSocket("wss://minybordergs.weskb5gams.net/websocket");

  b52WS.on("open", () => {
    const authPayload = [
      1,
      "MiniGame",
      "",
      "",
      {
        agentId: "1",
        accessToken: "13-9623162d7b104cce1c6b9150afd52596",
        reconnect: false,
      },
    ];
    b52WS.send(JSON.stringify(authPayload));
    clearInterval(b52IntervalCmd);
    b52IntervalCmd = setInterval(sendB52Cmd2000, 5000);
  });

  b52WS.on("message", (data) => {
    try {
      const json = JSON.parse(data);
      const message = json?.[1];

      // Ưu tiên lấy từ lịch sử htr
      if (message?.htr && Array.isArray(message.htr) && message.htr.length > 0) {
        const latest = message.htr[0];
        if (
          typeof latest.d1 === "number" &&
          typeof latest.d2 === "number" &&
          typeof latest.d3 === "number" &&
          latest.sid
        ) {
          b52LatestDice = {
            d1: latest.d1,
            d2: latest.d2,
            d3: latest.d3,
          };
          b52CurrentSession = latest.sid;
          if (message.md5) {
            b52CurrentMD5 = message.md5;
          }
        }
      }

      // Nếu không có htr, thử lấy từ kết quả trực tiếp
      if (message?.result && message.result.dices && message.result.session) {
        const [d1, d2, d3] = message.result.dices;
        b52LatestDice = { d1, d2, d3 };
        b52CurrentSession = message.result.session;
        if (message.result.md5) {
          b52CurrentMD5 = message.result.md5;
        }
      }

    } catch (e) {
      console.error("Lỗi parse WebSocket:", e.message);
    }
  });

  b52WS.on("close", () => {
    clearInterval(b52IntervalCmd);
    setTimeout(connectB52WebSocket, b52ReconnectInterval);
  });

  b52WS.on("error", (err) => {
    console.error("Lỗi kết nối WS:", err.message);
    b52WS.close();
  });
}

connectB52WebSocket();

fastify.get("/api/b52", async (request, reply) => {
  return {
    d1: b52LatestDice?.d1 ?? null,
    d2: b52LatestDice?.d2 ?? null,
    d3: b52LatestDice?.d3 ?? null,
    current_session: b52CurrentSession ?? null,
    current_md5: b52CurrentMD5 ?? null,
  };
});

const start = async () => {
  try {
    const address = await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`✅ Server đang chạy tại ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
