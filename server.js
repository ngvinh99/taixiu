const Fastify = require("fastify");
const cors = require("@fastify/cors");
const axios = require("axios");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3001;

let rikResults = [];

const PATTERN_MAP = {
  "txt": "Tài",
  "ttxx": "Tài",
  "xttx": "Xỉu",
  "ttx": "Xỉu",
  "xxt": "Tài",
  "t": "Xỉu"
};

// Hàm khớp pattern từ cuối pattern cũ đến mới
function getDuDoanFromPattern(pattern) {
  const keys = Object.keys(PATTERN_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pattern.endsWith(key.toLowerCase())) {
      return { du_doan: PATTERN_MAP[key], khop_pattern: key.toLowerCase() };
    }
  }
  return { du_doan: "?", khop_pattern: null };
}

// Hàm phân loại Tài/Xỉu theo tổng 3 viên xúc xắc
function getTX(d1, d2, d3) {
  const sum = d1 + d2 + d3;
  return sum >= 11 ? "t" : "x";
}

// Lấy dữ liệu từ API bên ngoài mỗi 5 giây
async function fetchData() {
  try {
    const res = await axios.get("https://apigame-wy0p.onrender.com/api/sunwin");
    const data = res.data;

    if (data?.sid && data?.d1 && data?.d2 && data?.d3) {
      const existing = rikResults.find(r => r.sid === data.sid);
      if (!existing) {
        rikResults.push({
          sid: data.sid,
          d1: data.d1,
          d2: data.d2,
          d3: data.d3
        });

        if (rikResults.length > 50) rikResults.shift(); // giữ max 50 phiên
      }
    }
  } catch (err) {
    console.error("Lỗi fetch dữ liệu:", err.message);
  }
}

// Gọi ban đầu và lặp lại
fetchData();
setInterval(fetchData, 5000);

// Đăng ký CORS
fastify.register(cors);

// API dự đoán
fastify.get("/axobantol", async () => {
  const validResults = rikResults.filter(item => item.d1 && item.d2 && item.d3);
  if (validResults.length < 5) return { message: "Không đủ dữ liệu." };

  const current = validResults[validResults.length - 1]; // phiên mới nhất
  const sumCurrent = current.d1 + current.d2 + current.d3;
  const ketQuaCurrent = sumCurrent >= 11 ? "Tài" : "Xỉu";

  const pattern = validResults
    .slice(-13) // 13 phiên gần nhất, theo thời gian cũ → mới
    .map(r => getTX(r.d1, r.d2, r.d3))
    .join("");

  const { du_doan, khop_pattern } = getDuDoanFromPattern(pattern);

  return {
    id: "@axobantool",
    phien_cu: current.sid,
    ket_qua: ketQuaCurrent,
    xuc_xac: `${current.d1},${current.d2},${current.d3}`,
    phien_moi: current.sid + 1,
    pattern,
    khop_pattern,
    du_doan
  };
});

// Start server
const start = async () => {
  try {
    const address = await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server chạy tại ${address}`);
  } catch (err) {
    console.error("❌ Server lỗi:", err);
    process.exit(1);
  }
};

start();
