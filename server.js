const Fastify = require("fastify");
const cors = require("@fastify/cors");
const axios = require("axios");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3001;

let rikResults = [];

const PATTERN_MAP = {
  "TXT": "Xỉu", 
  "TTXX": "Tài", 
  "XXTXX": "Tài", 
  "TTX": "Xỉu", 
  "XTT": "Tài",
  "TXX": "Tài", 
};

function getDuDoanFromPattern(pattern) {
  const keys = Object.keys(PATTERN_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pattern.endsWith(key)) return { du_doan: PATTERN_MAP[key], khop_pattern: key };
  }
  return { du_doan: "?", khop_pattern: null };
}

// Lấy dữ liệu từ API bên ngoài mỗi 5 giây
async function fetchData() {
  try {
    const res = await axios.get("https://apigame-wy0p.onrender.com/api/sunwin");
    const data = res.data;

    // Kiểm tra nếu dữ liệu hợp lệ
    if (
      data &&
      typeof data.phien === "number" &&
      typeof data.xuc_xac1 === "number" &&
      typeof data.xuc_xac2 === "number" &&
      typeof data.xuc_xac3 === "number"
    ) {
      const newResult = {
        sid: data.phien,
        d1: data.xuc_xac1,
        d2: data.xuc_xac2,
        d3: data.xuc_xac3,
      };

      // Nếu chưa có trong danh sách thì thêm vào đầu
      if (!rikResults.some(item => item.sid === newResult.sid)) {
        rikResults.unshift(newResult);
        if (rikResults.length > 50) rikResults.pop(); // Giữ 50 dòng
        console.log(`Đã thêm phiên ${newResult.sid}`);
      }
    }
  } catch (error) {
    console.error("Lỗi fetchData:", error.message);
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
  if (validResults.length < 1) return { message: "Không đủ dữ liệu." };

  const current = validResults[0]; // phiên mới nhất

  const sumCurrent = current.d1 + current.d2 + current.d3;
  const ketQuaCurrent = sumCurrent >= 11 ? "Tài" : "Xỉu";

  const duongCau = validResults
    .slice(0, 13)
    .reverse()
    .map(r => (r.d1 + r.d2 + r.d3 >= 11 ? "t" : "x"))
    .join("");

  const { du_doan, khop_pattern } = getDuDoanFromPattern(duongCau.toUpperCase());

  return {
    id: "@axobantool",
    phien_cu: current.sid,
    ket_qua: ketQuaCurrent,
    xuc_xac: `${current.d1},${current.d2},${current.d3}`,
    phien_moi: current.sid + 1,
    pattern: duongCau,
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
