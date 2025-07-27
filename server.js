const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// === Trạng thái lưu trữ ===
let currentData = {
  phien_cu: null,
  ket_qua: null,
  xuc_xac: [],
  phien_moi: null,
  pattern: "",
  khop_pattern: "",
  du_doan: "",
  id: "@axobantool"
};
let id_phien_chua_co_kq = null;
let totalsList = [];

// === Thuật toán AI dự đoán HTDD ===
function getTaiXiu(total) {
  return total >= 11 ? "Tài" : "Xỉu";
}
function taiXiuStats(totals) {
  const types = totals.map(getTaiXiu);
  const count = types.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const totalCount = totals.reduce((a, b) => a + b, 0);
  const avg = +(totalCount / totals.length).toFixed(2);
  const mcTotal = totals.sort((a, b) =>
    totals.filter(v => v === b).length - totals.filter(v => v === a).length
  )[0];
  const mcType = count["Tài"] >= count["Xỉu"] ? "Tài" : "Xỉu";

  return {
    tai_count: count["Tài"] || 0,
    xiu_count: count["Xỉu"] || 0,
    most_common_total: mcTotal,
    most_common_type: mcType,
    average_total: avg,
    most_common_tai_xiu: mcType
  };
}
function ruleSpecialPattern(last4) {
  if (last4[0] === last4[2] && last4[2] === last4[3] && last4[0] !== last4[1]) {
    return ["Tài", 85, `Cầu đặc biệt ${last4}. Bắt Tài theo công thức đặc biệt.`];
  }
}
function ruleSandwich(last3, lastResult) {
  if (last3[0] === last3[2] && last3[0] !== last3[1]) {
    return [lastResult === "Tài" ? "Xỉu" : "Tài", 83, `Cầu sandwich ${last3}. Bẻ cầu!`];
  }
}
function ruleSpecialNumbers(last3, lastResult) {
  const special = [7, 9, 10];
  const count = last3.filter(x => special.includes(x)).length;
  if (count >= 2) {
    return [lastResult === "Tài" ? "Xỉu" : "Tài", 81, `≥2 số đặc biệt. Bẻ cầu!`];
  }
}
function ruleFrequentRepeat(last6, lastTotal) {
  const freq = last6.filter(x => x === lastTotal).length;
  if (freq >= 3) {
    return [getTaiXiu(lastTotal), 80, `Số ${lastTotal} lặp lại ${freq} lần.`];
  }
}
function ruleRepeatPattern(last3, lastResult) {
  if (last3[0] === last3[2] || last3[1] === last3[2]) {
    return [lastResult === "Tài" ? "Xỉu" : "Tài", 77, `Cầu lặp ${last3}.`];
  }
}
function ruleStraightSequence(last3, lastResult) {
  if ((last3[0] < last3[1] && last3[1] < last3[2]) || (last3[0] > last3[1] && last3[1] > last3[2])) {
    return [lastResult === "Tài" ? "Xỉu" : "Tài", 79, `Tăng/Giảm liên tục: ${last3}.`];
  }
}
function ruleChainSameResult(types) {
  let chain = 1;
  for (let i = types.length - 1; i > 0; i--) {
    if (types[i] === types[i - 1]) chain++;
    else break;
  }
  if (chain >= 4) {
    return [types[types.length - 1] === "Tài" ? "Xỉu" : "Tài", 78, `Chuỗi ${chain} lần ${types[types.length - 1]}.`];
  }
}
function ruleExtremeTotal(lastTotal, lastResult) {
  if (lastTotal <= 5 || lastTotal >= 16) {
    return [lastResult === "Tài" ? "Xỉu" : "Tài", 76, `Cực trị ${lastTotal}.`];
  }
}
function ruleDefault(lastResult) {
  return [lastResult === "Tài" ? "Xỉu" : "Tài", 71, `Bẻ cầu mặc định.`];
}
function aiHtddLogic(totals) {
  if (totals.length < 4) return ruleDefault(getTaiXiu(totals[totals.length - 1]));
  const last6 = totals.slice(-6);
  const last4 = totals.slice(-4);
  const last3 = totals.slice(-3);
  const lastTotal = totals[totals.length - 1];
  const lastResult = getTaiXiu(lastTotal);
  const types = totals.map(getTaiXiu);

  const rules = [
    () => ruleSpecialPattern(last4),
    () => ruleSandwich(last3, lastResult),
    () => ruleSpecialNumbers(last3, lastResult),
    () => ruleFrequentRepeat(last6, lastTotal),
    () => ruleRepeatPattern(last3, lastResult),
    () => ruleStraightSequence(last3, lastResult),
    () => ruleChainSameResult(types),
    () => ruleExtremeTotal(lastTotal, lastResult)
  ];

  for (const rule of rules) {
    const res = rule();
    if (res) return [...res, taiXiuStats(totals)];
  }

  return [...ruleDefault(lastResult), taiXiuStats(totals)];
}

// === Danh sách tin nhắn gửi khi kết nối WebSocket ===
const messagesToSend = [
  [1, "MiniGame", "SC_apisunwin123", "binhlamtool90", {
    info: JSON.stringify({
      ipAddress: "2001:ee0:5708:7700:f151:dedc:c5ad:6bc3",
      wsToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJhcGlzdW53aW52YyIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOmZhbHNlLCJwbGF5RXZlbnRMb2JieSI6ZmFsc2UsImN1c3RvbWVySWQiOjI3NjQ3ODE3MywiYWZmSWQiOiJkOTNkM2Q4NC1mMDY5LTRiM2YtOGRhYy1iNDcxNmE4MTIxNDMiLCJiYW5uZWQiOmZhbHNlLCJicmFuZCI6InN1bi53aW4iLCJ0aW1lc3RhbXAiOjE3NTM0MjQ1MTk4MTEsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjAwMTplZTA6NTcwODo3NzAwOmYxNTE6ZGVkYzpjNWFkOjZiYzMiLCJtdXRlIjpmYWxzZSwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzIwLnBuZyIsInBsYXRmb3JtSWQiOjUsInVzZXJJZCI6ImQ5M2QzZDg0LWYwNjktNGIzZi04ZGFjLWI0NzE2YTgxMjE0MyIsInJlZ1RpbWUiOjE3NTIwNDU4OTMyOTIsInBob25lIjoiIiwiZGVwb3NpdCI6ZmFsc2UsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.DkO6wd7li1GW3w2CtB7XMK790uduElJZwpw38DdWKW4",
      userId: "d93d3d84-f069-4b3f-8dac-b4716a812143",
      username: "SC_apisunwin123",
      timestamp: 1753424519812
    }),
    signature: "7B15315084F3B2A31627D96565E185792B8F0855BC3D2949CCC02EB06F53B35E7FF0A54BD072E07E0AA72C60BAF4FC4569B286E1EE2B095EDEF38F738A23C1A8BA9E3F6C9D5C02FEC1BFE3D58B50BBBBDEB5E54E33CA7442EDB3B186BBD9AD986EBF1DE5DF064F68443EFE7CE3890A9FF3B5DB3F61FD0AB894F0BD8F484669D2"
  }],
  [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
  [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
  ws = new WebSocket("wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsImdlbmRlciI6MCwiZGlzcGxheU5hbWUiOiJ0YW9sYWJpbmgxMjk5IiwicGhvbmVWZXJpZmllZCI6ZmFsc2UsImJvdCI6MCwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzAyLnBuZyIsInVzZXJJZCI6IjZhNWNmN2NmLTQ0ODYtNGJlNS1hMDIzLTUyOTkyOGUyZDg1YyIsInJlZ1RpbWUiOjE3NTI3NjcyOTk2OTgsInBob25lIjoiIiwiY3VzdG9tZXJJZCI6MjgzNTEyODQ1LCJicmFuZCI6InN1bi53aW4iLCJ1c2VybmFtZSI6IlNDX2FuaGxhdHJ1bWFwaTEiLCJ0aW1lc3RhbXAiOjE3NTI3ODczMDg2NTl9.5PQjsPsm2G7SyEnAbNqXtxkxYlMQIwcJpxjh1l_hH6c", {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Origin": "https://play.sun.win"
    }
  });

  ws.on('open', () => {
    console.log('[✅] Đã kết nối WebSocket');
    messagesToSend.forEach((msg, i) => {
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      }, i * 600);
    });
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 15000);
  });

  ws.on('message', (message) => {
  try {
    const data = JSON.parse(message);
    if (Array.isArray(data) && typeof data[1] === 'object') {
      const cmd = data[1].cmd;

      // Nhận phiên mới (sid)
      if (cmd === 1008 && data[1].sid) {
        id_phien_chua_co_kq = data[1].sid;
      }

      // Nhận kết quả (d1, d2, d3)
      if (cmd === 1003 && data[1].gBB) {
        if (!id_phien_chua_co_kq) {
          // Nếu chưa có sid (1008) thì không xử lý
          console.warn('[⏳] Bỏ qua 1003 vì chưa có id_phien_chua_co_kq');
          return;
        }

        const { d1, d2, d3 } = data[1];
        const total = d1 + d2 + d3;
        const result = getTaiXiu(total);

        totalsList.push(total);
        if (totalsList.length > 100) totalsList.shift();

        const [prediction, confidence, reason, stats] = aiHtddLogic(totalsList);

        currentData = {
          phien_cu: id_phien_chua_co_kq,
          ket_qua: result,
          xuc_xac: [d1, d2, d3],
          phien_moi: id_phien_chua_co_kq + 1,
          pattern: JSON.stringify(stats),
          khop_pattern: reason,
          du_doan: prediction,
          id: "@axobantool"
        };

        console.log(`🎲 Phiên ${id_phien_chua_co_kq}: ${d1}-${d2}-${d3} = ${total} (${result}) → AI: ${prediction} (${confidence}%) - ${reason}`);

        // ✅ Reset lại sid sau xử lý
        id_phien_chua_co_kq = null;
      }
    }
  } catch (e) {
    console.error('[❌] Lỗi xử lý:', e.message);
  }
});

  ws.on('close', () => {
    console.log('[🔌] Mất kết nối WebSocket. Reconnecting...');
    clearInterval(pingInterval);
    reconnectTimeout = setTimeout(connectWebSocket, 2500);
  });

  ws.on('error', (err) => {
    console.error('[⚠️] WebSocket lỗi:', err.message);
  });
}

// === API Routes ===
app.get('/axobantol', (req, res) => {
  res.json(currentData);
});
app.get('/', (req, res) => {
  res.send(`<h2>🎯 SunWin Tài Xỉu</h2><p><a href="/axobantol">Xem dữ liệu JSON</a></p>`);
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`[🌐] Server chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
