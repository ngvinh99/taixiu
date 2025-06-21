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

const customPatterns = [
  { pattern: "TTTXXT", predict: "Xỉu" },
  { pattern: "XXTTX", predict: "Tài" }
];

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
      1, "MiniGame", "SC_xigtupou", "conga999", {
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
      console.error("❌ Lỗi parse:", e.message);
    }
  });

  ws.on("close", () => {
    console.warn("⚠️ WebSocket đóng, thử kết nối lại...");
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
  const validResults = [...lastResults].reverse().filter(item => item.d1 && item.d2 && item.d3);
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

  const patternLength = parseInt(request.query.len) || 13;

  const pattern = validResults
    .slice(0, patternLength)
    .map(item => {
      const sum = item.d1 + item.d2 + item.d3;
      return sum >= 11 ? "T" : "X";
    })
    .reverse()
    .join("");

  let prediction = null;
  let confidence = 50;

  const matched = customPatterns.find(rule => pattern.endsWith(rule.pattern));
  if (matched) {
    prediction = matched.predict;
    confidence = 90;
  } else {
    const counts = { Tài: 0, Xỉu: 0 };
    validResults.slice(0, 20).forEach(item => {
      const sum = item.d1 + item.d2 + item.d3;
      if (sum >= 11) counts["Tài"]++;
      else counts["Xỉu"]++;
    });

    if (counts.Tài > counts.Xỉu) {
      prediction = "Xỉu";
      confidence = 70;
    } else if (counts.Xỉu > counts.Tài) {
      prediction = "Tài";
      confidence = 70;
    } else {
      prediction = "Tài";
      confidence = 60;
    }
  }

  const current = validResults[0];
  const sumCurrent = current.d1 + current.d2 + current.d3;
  const result = sumCurrent >= 11 ? "Tài" : "Xỉu";
  const phienHienTai = current.sid + 1;

  return {
    current_result: result,
    current_session: current.sid,
    phien_hien_tai: phienHienTai,
    du_doan: prediction,
    do_tin_cay: confidence,
    used_pattern: pattern
  };
});

fastify.get("/", async (request, reply) => {
  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <title>Tài Xỉu VIP</title>
    <style>
      body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
      .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px; margin: auto; }
      .result { font-size: 22px; margin-bottom: 10px; }
      .small { font-size: 14px; color: #555; }
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
        document.getElementById('details').textContent = \`KQ: \${data.current_result}, Pattern: \${data.used_pattern}\`;
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
