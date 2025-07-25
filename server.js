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

function getTX(d1, d2, d3) {
  const sum = d1 + d2 + d3;
  return sum >= 11 ? "T" : "X";
}

// ✅ Lấy dữ liệu từ API
async function fetchData() {
  try {
    const res = await axios.get("https://apigame-wy0p.onrender.com/api/sunwin");
    const data = res.data;

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

      if (!rikResults.some(item => item.sid === newResult.sid)) {
        rikResults.unshift(newResult);
        if (rikResults.length > 50) rikResults.pop();
        console.log(`✅ Thêm phiên ${newResult.sid} (${newResult.d1},${newResult.d2},${newResult.d3})`);
      }
    } else {
      console.warn("❌ Dữ liệu API không hợp lệ:", data);
    }
  } catch (err) {
    console.error("❌ Lỗi fetchData:", err.message);
  }
}

// 👉 Gọi lần đầu và lặp mỗi 5 giây
fetchData();
setInterval(fetchData, 5000);

// ✅ CORS
fastify.register(cors);

// ✅ API dự đoán
fastify.get("/axobantol", async () => {
  const validResults = rikResults.filter(item => item.d1 && item.d2 && item.d3);
  if (validResults.length === 0) return { message: "Không đủ dữ liệu." };

  const current = validResults[0];
  const sumCurrent = current.d1 + current.d2 + current.d3;
  const ketQuaCurrent = sumCurrent >= 11 ? "Tài" : "Xỉu";

  const duongCau = validResults
    .slice(0, 13)
    .reverse()
    .map(r => getTX(r.d1, r.d2, r.d3))
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

// ✅ Start server
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
