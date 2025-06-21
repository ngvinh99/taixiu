const Fastify = require("fastify");
const WebSocket = require("ws");
const fs = require("fs");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;
let lastResults = [];
let ws = null;
let reconnectInterval = 5000;
let intervalCmd = null;
let duDoanData = [];

// Load file du_doan.txt
function loadDuDoanData() {
  try {
    const raw = fs.readFileSync('./du_doan.txt', 'utf-8');
    duDoanData = raw.split('\n').map(line => {
      const match = line.match(/^(.*?) => Dự đoán: (T|X)/);
      if (match) {
        return { pattern: match[1].trim(), predict: match[2] === 'T' ? 'Tài' : 'Xỉu' };
      }
      return null;
    }).filter(x => x);
    console.log(`✅ Đã load ${duDoanData.length} mẫu từ du_doan.txt`);
  } catch (e) {
    console.error("❌ Không đọc được file du_doan.txt:", e.message);
  }
}
loadDuDoanData();

function sendCmd1005() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify([6, "MiniGame", "taixiuPlugin", { cmd: 1005 }]));
  }
}

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket");
  ws.on("open", () => {
    console.log("✅ Đã kết nối WebSocket");
    ws.send(JSON.stringify([
      1, "MiniGame", "SC_xigtupou", "conga999", {
        info: "{\"ipAddress\":\"171.246.10.199\",\"userId\":\"7c54ec3f-ee1a-428c-a56e-1bc14fd27e57\",\"username\":\"SC_xigtupou\",\"timestamp\":1748266471861,\"refreshToken\":\"ce8de19af18f4417bb68c3632408d4d7.479079475124482181468c8923b636af\"}",
        signature: "..."
      }
    ]));
    clearInterval(intervalCmd);
    intervalCmd = setInterval(sendCmd1005, 5000);
  });

  ws.on("message", data => {
    try {
      const json = JSON.parse(data);
      if (Array.isArray(json) && json[1]?.htr) {
        lastResults = json[1].htr.map(item => ({
          sid: item.sid,
          d1: item.d1,
          d2: item.d2,
          d3: item.d3
        }));
      }
    } catch (e) {
      console.error("Parse error:", e.message);
    }
  });

  ws.on("close", () => {
    console.warn("⚠️ WebSocket đóng, thử kết nối lại...");
    clearInterval(intervalCmd);
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on("error", err => {
    console.error("❌ Lỗi WebSocket:", err.message);
    ws.close();
  });
}
connectWebSocket();

fastify.get("/api/taixiu", async (req, reply) => {
  const validResults = [...lastResults].reverse().filter(r => r.d1 && r.d2 && r.d3);
  if (validResults.length < 1) {
    return { current_result: null, current_session: null, phien_hien_tai: null, du_doan: null, used_pattern: "" };
  }

  const patternLength = parseInt(req.query.len) || 13;
  const pattern = validResults.slice(0, patternLength)
    .map(r => (r.d1 + r.d2 + r.d3) >= 11 ? 'T' : 'X')
    .reverse()
    .join("");

  const found = duDoanData.find(item => pattern.endsWith(item.pattern));
  const duDoan = found ? found.predict : null;

  const current = validResults[0];
  const current_result = (current.d1 + current.d2 + current.d3) >= 11 ? 'Tài' : 'Xỉu';

  return {
    current_result,
    current_session: current.sid,
    phien_hien_tai: current.sid + 1,
    du_doan: duDoan,
    used_pattern: pattern
  };
});

fastify.get("/", async () => {
  return `
  <html lang="vi">
  <head>
    <meta charset="utf-8">
    <title>Tài Xỉu</title>
    <style>
      body { font-family: sans-serif; background: #f0f0f0; padding: 20px; }
      .box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px; margin: auto; }
      .big { font-size: 22px; }
      .small { font-size: 14px; color: #555; }
    </style>
  </head>
  <body>
    <div class="box">
      <div id="data" class="big">Đang tải...</div>
      <div id="detail" class="small"></div>
    </div>
    <script>
      async function fetchData() {
        const res = await fetch('/api/taixiu');
        const data = await res.json();
        document.getElementById('data').textContent = \`Phiên \${data.phien_hien_tai}: Dự đoán \${data.du_doan || 'Không có'}\`;
        document.getElementById('detail').textContent = \`KQ: \${data.current_result}, Pattern: \${data.used_pattern}\`;
      }
      fetchData();
      setInterval(fetchData, 5000);
    </script>
  </body>
  </html>`;
});

const start = async () => {
  try {
    const address = await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server chạy tại ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
