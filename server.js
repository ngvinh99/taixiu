const Fastify = require("fastify");
const fs = require("fs");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;
let duDoanData = [];

// Load du_doan.txt
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

// TẠM GIẢ LẬP DỮ LIỆU vì WebSocket Render có thể bị block
let lastResults = [
  { sid: 1001, d1: 3, d2: 4, d3: 5 },
  { sid: 1000, d1: 2, d2: 6, d3: 3 },
  { sid: 999, d1: 1, d2: 2, d3: 3 },
  { sid: 998, d1: 5, d2: 5, d3: 2 },
  { sid: 997, d1: 6, d2: 6, d3: 6 },
  { sid: 996, d1: 1, d2: 1, d3: 1 },
  { sid: 995, d1: 4, d2: 4, d3: 4 }
];

fastify.get("/api/taixiu", async (req, reply) => {
  const validResults = [...lastResults].reverse();

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
