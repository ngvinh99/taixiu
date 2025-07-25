const Fastify = require("fastify");
const axios = require("axios");
const cors = require("@fastify/cors");

const fastify = Fastify({ logger: false });
fastify.register(cors);

const PORT = process.env.PORT || 3000;

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
    if (pattern.endsWith(key)) {
      return {
        du_doan: PATTERN_MAP[key],
        khop_pattern: key,
      };
    }
  }
  return { du_doan: "?", khop_pattern: null };
}

function getTX(d1, d2, d3) {
  const sum = d1 + d2 + d3;
  return sum >= 11 ? "T" : "X";
}

async function fetchData() {
  try {
    const res = await axios.get("https://apigame-wy0p.onrender.com/api/sunwin");
    const item = res.data;
    if (item && item.d1 && item.d2 && item.d3 && item.sid) {
      const tx = getTX(item.d1, item.d2, item.d3);
      rikResults.unshift({
        sid: item.sid,
        d1: item.d1,
        d2: item.d2,
        d3: item.d3,
        tx,
      });
      // Giữ tối đa 50 kết quả
      rikResults = rikResults.slice(0, 50);
    }
  } catch (err) {
    console.error("❌ Lỗi fetch:", err.message);
  }
}

setInterval(fetchData, 5000);
fetchData();

fastify.get("/dudoan", async () => {
  const validResults = rikResults.filter(r => r.d1 && r.d2 && r.d3);
  if (validResults.length < 14) {
    return { message: "Không đủ dữ liệu." };
  }

  const current = validResults[0];
  const pattern = validResults.slice(1, 14).reverse().map(r => r.tx).join("");

  const { du_doan, khop_pattern } = getDuDoanFromPattern(pattern);

  return {
    id: "@axobantool",
    phien_cu: current.sid,
    ket_qua: current.tx === "T" ? "Tài" : "Xỉu",
    xuc_xac: `${current.d1},${current.d2},${current.d3}`,
    phien_moi: current.sid + 1,
    pattern,
    khop_pattern,
    du_doan,
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ Lỗi server:", err);
    process.exit(1);
  }
};

start();
