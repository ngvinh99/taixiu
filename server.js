const Fastify = require("fastify");
const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3000;

let lastResults = [];

// GIỮ NGUYÊN THUẬT TOÁN
function multiWindowV3(patternArr, windows = [5, 10, 20, 30, 50]) {
  const voteCounts = { Tài: 0, Xỉu: 0 };
  let totalWeight = 0;

  for (const win of windows) {
    if (patternArr.length < win) continue;

    const subPattern = patternArr.slice(-win);
    const markovRes = markovWeightedV3(subPattern);
    const repeatRes = repeatingPatternV3(subPattern);
    const biasRes = detectBiasV3(subPattern);
    const weight = win;

    if (markovRes) voteCounts[markovRes] += weight * 0.7;
    if (repeatRes) voteCounts[repeatRes] += weight * 0.15;
    if (biasRes) voteCounts[biasRes] += weight * 0.15;

    totalWeight += weight;
  }

  let finalPredict = null;
  let confidence = 50;

  if (voteCounts.Tài > voteCounts.Xỉu) {
    finalPredict = "Tài";
    confidence = Math.min(99, Math.round((voteCounts.Tài / (voteCounts.Tài + voteCounts.Xỉu)) * 100));
  } else if (voteCounts.Xỉu > voteCounts.Tài) {
    finalPredict = "Xỉu";
    confidence = Math.min(99, Math.round((voteCounts.Xỉu / (voteCounts.Tài + voteCounts.Xỉu)) * 100));
  } else {
    const last = patternArr[patternArr.length - 1];
    finalPredict = last === "T" ? "Xỉu" : "Tài";
    confidence = 50;
  }

  return { prediction: finalPredict, confidence };
}

// Dummy functions (bạn cần thay bằng thuật toán thật)
function markovWeightedV3(pattern) {
  return Math.random() > 0.5 ? "Tài" : "Xỉu";
}
function repeatingPatternV3(pattern) {
  return Math.random() > 0.5 ? "Tài" : "Xỉu";
}
function detectBiasV3(pattern) {
  return Math.random() > 0.5 ? "Tài" : "Xỉu";
}

// Thêm kết quả thủ công để test
fastify.post("/add", async (request, reply) => {
  const { result } = request.body;
  if (!["T", "X"].includes(result)) {
    return reply.code(400).send({ error: "Giá trị phải là 'T' hoặc 'X'" });
  }
  lastResults.push(result);
  if (lastResults.length > 100) lastResults.shift();
  return reply.send({ added: result, total: lastResults.length });
});

// Lấy dự đoán
fastify.get("/predict", async (request, reply) => {
  if (lastResults.length < 10) {
    return reply.send({ error: "Không đủ dữ liệu để dự đoán (tối thiểu 10 kết quả)" });
  }
  const res = multiWindowV3(lastResults);
  return reply.send(res);
});

// Kiểm tra server
fastify.get("/", async (request, reply) => {
  reply.send({ status: "Server is running." });
});

// Khởi chạy server
fastify.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log("Server listening at", address);
});
