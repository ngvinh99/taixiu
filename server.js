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
    console.log("✅ Đã kết nối WebSocket");

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
    } catch (e) {
      console.error("❌ Lỗi parse message:", e.message);
    }
  });

  ws.on("close", () => {
    console.warn("⚠️ WebSocket đóng, đang thử lại...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", (err) => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}

connectWebSocket();

fastify.get("/api/taixiu", async (request, reply) => {
  const validResults = [...lastResults]
    .reverse()
    .filter(item => item.d1 && item.d2 && item.d3);

  if (validResults.length < 1) {
    return {
      current_result: null,
      current_session: null,
      phien_hien_tai: null,
      du_doan: null,
      do_tin_cay: 0,
      used_pattern: ""
    };
  }

  const current = validResults[0];
  const total = current.d1 + current.d2 + current.d3;
  const result = total >= 11 ? "Tài" : "Xỉu";
  const currentSession = current.sid;
  const phienHienTai = currentSession + 1;

  const pattern = validResults
    .slice(0, 6)
    .map(item => {
      const sum = item.d1 + item.d2 + item.d3;
      return sum >= 11 ? "T" : "X";
    })
    .reverse()
    .join("");

  const algos = [
    { 
      func: () => result === "Tài" ? "Xỉu" : "Tài", 
      weight: 1 
    },
    { 
      func: () => {
        const last3 = validResults.slice(0, 3).map(item => {
          const sum = item.d1 + item.d2 + item.d3;
          return sum >= 11 ? "T" : "X";
        });
        return (last3.every(r => r === "T")) ? "Xỉu" : "Tài";
      }, 
      weight: 2 
    },
    { 
      func: () => {
        const last5 = validResults.slice(0, 5).map(item => {
          const sum = item.d1 + item.d2 + item.d3;
          return sum >= 11 ? "Tài" : "Xỉu";
        });
        const taiCount = last5.filter(r => r === "Tài").length;
        const xiuCount = last5.filter(r => r === "Xỉu").length;
        return taiCount > xiuCount ? "Xỉu" : "Tài";
      }, 
      weight: 1.5 
    },
    { 
      func: () => {
        return (pattern.endsWith("TX") || pattern.endsWith("XT")) 
          ? (result === "Tài" ? "Xỉu" : "Tài") 
          : result;
      }, 
      weight: 1 
    },
    { 
      func: () => {
        const last4 = validResults.slice(0, 4).map(item => {
          const sum = item.d1 + item.d2 + item.d3;
          return sum >= 11 ? "Tài" : "Xỉu";
        });
        const allSame = last4.every(r => r === last4[0]);
        return allSame ? (last4[0] === "Tài" ? "Xỉu" : "Tài") : result;
      }, 
      weight: 2 
    }
  ];

  let taiScore = 0;
  let xiuScore = 0;
  algos.forEach(algo => {
    const pred = algo.func();
    if (pred === "Tài") taiScore += algo.weight;
    else xiuScore += algo.weight;
  });

  const finalPrediction = taiScore > xiuScore ? "Tài" : "Xỉu";
  const totalScore = taiScore + xiuScore;
  const doTinCay = totalScore > 0 
    ? ((finalPrediction === "Tài" ? taiScore : xiuScore) / totalScore * 100).toFixed(1)
    : 0;

  return {
    current_result: result,
    current_session: currentSession,
    phien_hien_tai: phienHienTai,
    du_doan: finalPrediction,
    do_tin_cay: doTinCay,
    used_pattern: pattern
  };
});

fastify.get("/", async (request, reply) => {
  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <title>Tài Xỉu Dự Đoán</title>
    <style>
      body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
      .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
      .result { font-size: 24px; margin-bottom: 10px; }
      .small { color: gray; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div id="result" class="result">Đang tải...</div>
      <div id="details" class="small"></div>
    </div>
    <script>
      async function loadData() {
        const res = await fetch('/api/taixiu');
        const data = await res.json();
        document.getElementById('result').textContent = \`Phiên \${data.phien_hien_tai}: Dự đoán \${data.du_doan} (\${data.do_tin_cay}% tin cậy)\`;
        document.getElementById('details').textContent = \`KQ phiên hiện tại: \${data.current_result}, Pattern: \${data.used_pattern}\`;
      }
      loadData();
      setInterval(loadData, 5000);
    </script>
  </body>
  </html>
  `;
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
