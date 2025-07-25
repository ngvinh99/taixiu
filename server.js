const Fastify = require("fastify");
const cors = require("@fastify/cors");
const axios = require("axios");

const fastify = Fastify();
const PORT = process.env.PORT || 3001;

let rikResults = [];

const PATTERN_MAP = {
  "TXT": "Xỉu",
  "TTXX": "Tài",
  "XXTXX": "Tài",
  "TTX": "Xỉu",
  "XTT": "Tài",
  "TXX": "Tài"
};

function getDuDoanFromPattern(pattern) {
  const keys = Object.keys(PATTERN_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pattern.endsWith(key)) {
      return { du_doan: PATTERN_MAP[key], khop_pattern: key };
    }
  }
  return { du_doan: "?", khop_pattern: null };
}

function getTX(d1, d2, d3) {
  const sum = d1 + d2 + d3;
  return sum >= 11 ? "T" : "X";
}

// Lấy dữ liệu từ API mỗi 5 giây
async function fetchData() {
  try {
    const res = await axios.get("https://apigame-wy0p.onrender.com/api/sunwin");
    const data = res.data;

    if (data && data.xuc_xac1 && data.xuc_xac2 && data.xuc_xac3 && data.phien) {
      const exists = rikResults.find(item => item.sid === data.phien);
      if (!exists) {
        rikResults.unshift({
          sid: data.phien,
          d1: data.xuc_xac1,
          d2: data.xuc_xac2,
          d3: data.xuc_xac3
        });

        if (rikResults.length > 50) rikResults.pop();
        console.log(`✅ Phiên ${data.phien} đã được thêm.`);
      }
    } else {
      console.warn("⚠️ Dữ liệu không hợp lệ:", data);
    }
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu:", err.message);
  }
}

fetchData();
setInterval(fetchData, 5000);

// Đăng ký CORS
fastify.register(cors);

// API pattern dự đoán
fastify.get("/axobantol", async () => {
  const validResults = rikResults.filter(r => r.d1 && r.d2 && r.d3);
  if (validResults.length === 0) return { message: "Không đủ dữ liệu." };

  const current = validResults[0];
  const pattern = validResults
    .slice()
    .reverse()
    .map(r => getTX(r.d1, r.d2, r.d3))
    .join("");

  const { du_doan, khop_pattern } = getDuDoanFromPattern(pattern);

  return {
    id: "@axobantool",
    phien_cu: current.sid,
    ket_qua: getTX(current.d1, current.d2, current.d3) === "T" ? "Tài" : "Xỉu",
    xuc_xac: `${current.d1},${current.d2},${current.d3}`,
    phien_moi: current.sid + 1,
    pattern,  // từ cũ đến mới
    khop_pattern,
    du_doan
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ Lỗi khởi chạy:", err);
    process.exit(1);
  }
};

start();
