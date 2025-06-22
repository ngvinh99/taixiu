// ==== DỰ ĐOÁN TÀI XỈU SUNWIN - FULL HOÀN CHỈNH ====

const Fastify = require("fastify"); const WebSocket = require("ws");

const fastify = Fastify({ logger: false }); const PORT = process.env.PORT || 3000;

let historyResults = []; let currentSession = null; let currentResult = null; let ws = null; let intervalCmd = null;

function getTaiXiu(total) { return total >= 11 ? "Tài" : "Xỉu"; }

function calculatePrediction(totals) { const last = totals[totals.length - 1]; const secondLast = totals[totals.length - 2]; const thirdLast = totals[totals.length - 3]; const lastResult = getTaiXiu(last); const secondResult = getTaiXiu(secondLast); const thirdResult = getTaiXiu(thirdLast); const prediction = lastResult === secondResult ? thirdResult : lastResult === thirdResult ? secondResult : lastResult === "Tài" ? "Xỉu" : "Tài"; const confidence = 80; const reason = So sánh 3 phiên gần nhất: [${thirdResult}, ${secondResult}, ${lastResult}]. Dự đoán tiếp theo là ${prediction}.; return { prediction, confidence, reason }; }

function calculateStats(totals) { const stats = { Tài: 0, Xỉu: 0 }; for (const total of totals) { stats[getTaiXiu(total)]++; } return stats; }

function connectWebSocket() { ws = new WebSocket("wss://websocket.azhkthg1.net/websocket"); ws.on("open", () => { const authPayload = [1, "MiniGame", "", "", { reconnect: true }]; ws.send(JSON.stringify(authPayload)); clearInterval(intervalCmd); intervalCmd = setInterval(() => { const payload = [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }]; ws.send(JSON.stringify(payload)); }, 5000); }); ws.on("message", (data) => { try { const json = JSON.parse(data); if (Array.isArray(json) && json[1]?.htr) { historyResults = json[1].htr.map(i => ({ sid: i.sid, d1: i.d1, d2: i.d2, d3: i.d3 })).reverse(); const latest = historyResults[0]; currentResult = getTaiXiu(latest.d1 + latest.d2 + latest.d3); currentSession = latest.sid; } } catch (e) { console.error("Lỗi khi phân tích message:", e.message); } }); ws.on("close", () => { clearInterval(intervalCmd); setTimeout(connectWebSocket, 3000); }); ws.on("error", () => ws.close()); }

connectWebSocket();

fastify.get("/api/taixiu", async (req, res) => { const valid = historyResults.filter(i => i.d1 && i.d2 && i.d3); if (valid.length < 3) { return { current_result: null, current_session: null, phien_hien_tai: null, du_doan: null, used_pattern: "", do_tin_cay: null, xuc_xac: [] }; } const totals = valid.map(i => i.d1 + i.d2 + i.d3); const predictionData = calculatePrediction(totals); const stats = calculateStats(totals); const pattern = totals.slice(0, 13).map(getTaiXiu).map(r => r[0]).join(""); const countMatch = pattern.split("").filter(p => p === predictionData.prediction[0]).length; const doTinCay = Math.round((countMatch / (pattern.length || 1)) * 100); const now = valid[0]; return { current_result: getTaiXiu(now.d1 + now.d2 + now.d3), current_session: now.sid, phien_hien_tai: now.sid + 1, du_doan: predictionData.prediction, do_tin_cay: doTinCay + "%", used_pattern: pattern, xuc_xac: [now.d1, now.d2, now.d3], reason: predictionData.reason, thong_ke: stats }; });

const start = async () => { try { await fastify.listen({ port: PORT, host: "0.0.0.0" }); console.log(✅ Server đang chạy tại http://localhost:${PORT}); } catch (err) { console.error(err); process.exit(1); } };

start();

