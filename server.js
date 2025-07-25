const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// === Biến lưu trạng thái ===
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
let patternHistory = [];

// === Thuật toán dự đoán theo pattern ===
const PATTERN_MAP = {
  "TTTX": "Xỉu",
  "TTTXTT": "Tài",
  "TTTXTTT": "Xỉu",
  "TTTXTTX": "Xỉu",
  "TTTXTXT": "Tài",
  "TTTXTXX": "Tài",
  "TTTXXTT": "Tài",
  "TTTXXTX": "Tài"
};

// === Danh sách tin nhắn gửi lên server WebSocket ===
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

// === WebSocket ===
let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
  ws = new WebSocket(
    "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsImdlbmRlciI6MCwiZGlzcGxheU5hbWUiOiJ0YW9sYWJpbmgxMjk5IiwicGhvbmVWZXJpZmllZCI6ZmFsc2UsImJvdCI6MCwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzAyLnBuZyIsInVzZXJJZCI6IjZhNWNmN2NmLTQ0ODYtNGJlNS1hMDIzLTUyOTkyOGUyZDg1YyIsInJlZ1RpbWUiOjE3NTI3NjcyOTk2OTgsInBob25lIjoiIiwiY3VzdG9tZXJJZCI6MjgzNTEyODQ1LCJicmFuZCI6InN1bi53aW4iLCJ1c2VybmFtZSI6IlNDX2FuaGxhdHJ1bWFwaTEiLCJ0aW1lc3RhbXAiOjE3NTI3ODczMDg2NTl9.5PQjsPsm2G7SyEnAbNqXtxkxYlMQIwcJpxjh1l_hH6c",
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://play.sun.win"
      }
    }
  );

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
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 15000);
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (Array.isArray(data) && typeof data[1] === 'object') {
        const cmd = data[1].cmd;

        if (cmd === 1008 && data[1].sid) {
          id_phien_chua_co_kq = data[1].sid;
        }

        if (cmd === 1003 && data[1].gBB) {
          const { d1, d2, d3 } = data[1];
          const total = d1 + d2 + d3;
          const result = total > 10 ? "Tài" : "Xỉu";

          patternHistory.push(result[0]); // 'T' hoặc 'X'
          if (patternHistory.length > 20) patternHistory.shift();

          const patternStr = patternHistory.join("");
          let matchedPattern = "";
          let prediction = "";

          // Tìm pattern khớp dài nhất
          for (let len = 8; len >= 4; len--) {
            const check = patternStr.slice(-len);
            if (PATTERN_MAP[check]) {
              matchedPattern = check;
              prediction = PATTERN_MAP[check];
              break;
            }
          }

          currentData = {
            phien_cu: id_phien_chua_co_kq,
            ket_qua: result,
            xuc_xac: [d1, d2, d3],
            phien_moi: id_phien_chua_co_kq + 1,
            pattern: patternStr,
            khop_pattern: matchedPattern,
            du_doan: prediction || "?",
            id: "@axobantool"
          };

          console.log(`🎲 Phiên ${id_phien_chua_co_kq}: ${d1}-${d2}-${d3} = ${total} (${result}) → Dự đoán: ${prediction || "?"}`);
          id_phien_chua_co_kq = null;
        }
      }
    } catch (e) {
      console.error('[❌] Lỗi xử lý:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[🔌] Mất kết nối WebSocket. Đang reconnect...');
    clearInterval(pingInterval);
    reconnectTimeout = setTimeout(connectWebSocket, 2500);
  });

  ws.on('error', (err) => {
    console.error('[⚠️] WebSocket lỗi:', err.message);
  });
}

// === API ===
app.get('/axobantol', (req, res) => {
  res.json(currentData);
});

app.get('/', (req, res) => {
  res.send(`<h2>🎯 SunWin Tài Xỉu</h2><p><a href="/taixiu">Xem JSON kết quả</a></p>`);
});

// === Khởi động server ===
app.listen(PORT, () => {
  console.log(`[🌐] Server đang chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
