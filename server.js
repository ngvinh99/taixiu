const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// === PREDICTION MAP - Thuật toán duy nhất ===
const predictionMap = {
  "TXT": "Xỉu", 
  "TTXX": "Tài", 
  "XXTXX": "Tài", 
  "TTX": "Xỉu", 
  "XTT": "Tài",
  "TXX": "Tài", 
  "XTX": "Xỉu", 
  "TXTX": "Tài", 
  "XTXX": "Tài", 
  "XXTX": "Tài",
  "TXTT": "Xỉu", 
  "TTT": "Tài", 
  "XXX": "Tài", 
  "TXXT": "Tài", 
  "XTXT": "Xỉu",
  "TXXT": "Tài", 
  "XXTT": "Tài", 
  "TTXX": "Xỉu", 
  "XTTX": "Tài", 
  "XTXTX": "Tài",
  "TTXXX": "Tài", 
  "XTTXT": "Tài", 
  "XXTXT": "Xỉu", 
  "TXTTX": "Tài", 
  "XTXXT": "Tài",
  "TTTXX": "Xỉu", 
  "XXTTT": "Tài", 
  "XTXTT": "Tài", 
  "TXTXT": "Tài", 
  "TTXTX": "Xỉu",
  "TXTTT": "Xỉu", 
  "XXTXTX": "Tài", 
  "XTXXTX": "Tài", 
  "TXTTTX": "Tài", 
  "TTTTXX": "Xỉu",
  "XTXTTX": "Tài", 
  "XTXXTT": "Tài", 
  "TXXTXX": "Tài", 
  "XXTXXT": "Tài", 
  "TXTTXX": "Xỉu",
  "TTTXTX": "Xỉu", 
  "TTXTTT": "Tài", 
  "TXXTTX": "Tài", 
  "XXTTTX": "Tài", 
  "XTTTTX": "Xỉu",
  "TXTXTT": "Tài", 
  "TXTXTX": "Tài", 
  "TTTTX": "Tài", 
  "XXXTX": "Tài", 
  "TXTTTX": "Xỉu",
  "XTXXXT": "Tài", 
  "XXTTXX": "Tài", 
  "TTTXXT": "Xỉu", 
  "XXTXXX": "Tài", 
  "XTXTXT": "Tài",
  "TTXXTX": "Tài", 
  "TTXXT": "Tài", 
  "TXXTX": "Xỉu", 
  "XTXXX": "Tài", 
  "XTXTX": "Xỉu",
  "TTXT": "Xỉu", 
  "TTTXT": "Xỉu",
  "TTTT": "Tài",
  "TTTTT": "Tài",
  "TTTTTT": "Xỉu",
  "TTTTTTT": "Tài",
  "TTTTTTX": "Xỉu",
  "TTTTTX": "Xỉu",
  "TTTTTXT": "Xỉu",
  "TTTTTXX": "Tài",
  "TTTTXT": "Xỉu",
  "TTTTXTT": "Tài",
  "TTTTXTX": "Xỉu",
  "TTTTXXT": "Xỉu",
  "TTTTXXX": "Tài",
  "TTTX": "Xỉu",
  "TTTXTT": "Tài",
  "TTTXTTT": "Xỉu",
  "TTTXTTX": "Xỉu",
  "TTTXTXT": "Tài",
  "TTTXTXX": "Tài",
  "TTTXXTT": "Tài",
  "TTTXXTX": "Tài",
  "TTTXXX": "Xỉu",
  "TTTXXXT": "Tài",
  "TTTXXXX": "Xỉu",
  "TTXTT": "Xỉu",
  "TTXTTTT": "Xỉu",
  "TTXTTTX": "Xỉu",
  "TTXTTX": "Tài",
  "TTXTTXT": "Tài",
  "TTXTTXX": "Xỉu",
  "TTXTXT": "Xỉu",
  "TTXTXTT": "Tài",
  "TTXTXTX": "Tài",
  "TTXTXX": "Xỉu",
  "TTXTXXT": "Tài",
  "TTXTXXX": "Xỉu",
  "TTXXTT": "Tài",
  "TTXXTTT": "Xỉu",
  "TTXXTTX": "Tài",
  "TTXXTXT": "Tài",
  "TTXXTXX": "Xỉu",
  "TTXXXT": "Xỉu",
  "TTXXXTT": "Tài",
  "TTXXXTX": "Tài",
  "TTXXXX": "Xỉu",
  "TTXXXXT": "Tài",
  "TTXXXXX": "Xỉu",
  "TXTTTT": "Xỉu",
  "TXTTTTT": "Xỉu",
  "TXTTTTX": "Xỉu",
  "TXTTTXT": "Xỉu",
  "TXTTTXX": "Tài",
  "TXTTXT": "Tài",
  "TXTTXTT": "Tài",
  "TXTTXTX": "Tài",
  "TXTTXXT": "Tài",
  "TXTTXXX": "Tài",
  "TXTXTTT": "Tài",
  "TXTXTTX": "Tài",
  "TXTXTXT": "Xỉu",
  "TXTXTXX": "Tài",
  "TXTXX": "Tài",
  "TXTXXT": "Tài",
  "TXTXXTT": "Tài",
  "TXTXXTX": "Xỉu",
  "TXTXXX": "Xỉu",
  "TXTXXXT": "Xỉu",
  "TXTXXXX": "Xỉu",
  "TXXTT": "Tài",
  "TXXTTT": "Tài",
  "TXXTTTT": "Tài",
  "TXXTTTX": "Tài",
  "TXXTTXT": "Xỉu",
  "TXXTTXX": "Xỉu",
  "TXXTXT": "Tài",
  "TXXTXTT": "Tài",
  "TXXTXTX": "Tài",
  "TXXTXXT": "Tài",
  "TXXTXXX": "Xỉu",
  "TXXX": "Tài",
  "TXXXT": "Tài",
  "TXXXTT": "Xỉu",
  "TXXXTTT": "Tài",
  "TXXXTTX": "Xỉu",
  "TXXXTX": "Xỉu",
  "TXXXTXT": "Tài",
  "TXXXTXX": "Xỉu",
  "TXXXX": "Xỉu",
  "TXXXXT": "Tài",
  "TXXXXTT": "Xỉu",
  "TXXXXTX": "Xỉu",
  "TXXXXX": "Tài",
  "TXXXXXT": "Xỉu",
  "TXXXXXX": "Xỉu",
  "XTTT": "Xỉu",
  "XTTTT": "Xỉu",
  "XTTTTT": "Tài",
  "XTTTTTT": "Tài",
  "XTTTTTX": "Tài",
  "XTTTTXT": "Tài",
  "XTTTTXX": "Xỉu",
  "XTTTX": "Tài",
  "XTTTXT": "Xỉu",
  "XTTTXTT": "Tài",
  "XTTTXTX": "Xỉu",
  "XTTTXX": "Tài",
  "XTTTXXT": "Tài",
  "XTTTXXX": "Tài",
  "XTTXTT": "Tài",
  "XTTXTTT": "Tài",
  "XTTXTTX": "Tài",
  "XTTXTX": "Xỉu",
  "XTTXTXT": "Tài",
  "XTTXTXX": "Xỉu",
  "XTTXX": "Xỉu",
  "XTTXXT": "Xỉu",
  "XTTXXTT": "Tài",
  "XTTXXTX": "Xỉu",
  "XTTXXX": "Tài",
  "XTTXXXT": "Xỉu",
  "XTTXXXX": "Tài",
  "XTXTTT": "Tài",
  "XTXTTTT": "Tài",
  "XTXTTTX": "Xỉu",
  "XTXTTXT": "Xỉu",
  "XTXTTXX": "Tài",
  "XTXTXTT": "Tài",
  "XTXTXTX": "Xỉu",
  "XTXTXX": "Tài",
  "XTXTXXT": "Tài",
  "XTXTXXX": "Tài",
  "XTXXTTT": "Tài",
  "XTXXTTX": "Xỉu",
  "XTXXTXT": "Tài",
  "XTXXTXX": "Tài",
  "XTXXXTT": "Xỉu",
  "XTXXXTX": "Tài",
  "XTXXXX": "Xỉu",
  "XTXXXXT": "Tài",
  "XTXXXXX": "Tài",
  "XXT": "Xỉu",
  "XXTTTT": "Tài",
  "XXTTTTT": "Xỉu",
  "XXTTTTX": "Tài",
  "XXTTTXT": "Xỉu",
  "XXTTTXX": "Xỉu",
  "XXTTX": "Tài",
  "XXTTXT": "Xỉu",
  "XXTTXTT": "Xỉu",
  "XXTTXTX": "Tài",
  "XXTTXXT": "Xỉu",
  "XXTTXXX": "Tài",
  "XXTXTT": "Tài",
  "XXTXTTT": "Tài",
  "XXTXTTX": "Xỉu",
  "XXTXTXT": "Tài",
  "XXTXTXX": "Tài",
  "XXTXXTT": "Xỉu",
  "XXTXXTX": "Xỉu",
  "XXTXXXT": "Tài",
  "XXTXXXX": "Tài",
  "XXXT": "Tài",
  "XXXTT": "Xỉu",
  "XXXTTT": "Xỉu",
  "XXXTTTT": "Xỉu",
  "XXXTTTX": "Xỉu",
  "XXXTTX": "Tài",
  "XXXTTXT": "Xỉu",
  "XXXTTXX": "Xỉu",
  "XXXTXT": "Tài",
  "XXXTXTT": "Tài",
  "XXXTXTX": "Xỉu",
  "XXXTXX": "Tài",
  "XXXTXXT": "Xỉu",
  "XXXTXXX": "Tài",
  "XXXX": "Tài",
  "XXXXT": "Xỉu",
  "XXXXTT": "Xỉu",
  "XXXXTTT": "Tài",
  "XXXXTTX": "Tài",
  "XXXXTX": "Tài",
  "XXXXTXT": "Tài",
  "XXXXTXX": "Tài",
  "XXXXX": "Tài",
  "XXXXXT": "Xỉu",
  "XXXXXTT": "Tài",
  "XXXXXTX": "Tài",
  "XXXXXX": "Tài",
  "XXXXXXT": "Tài",
  "XXXXXXX": "Tài"
};

// === Biến lưu trạng thái ===
let currentData = {
  phien_cu: null,
  ket_qua: null,
  xuc_xac: [],
  phien_moi: null,
  pattern: "",
  du_doan: "",
  khop_pattern: "",
  id: "@axobantool"
};
let gameHistory = [];
let lastSessionId = null;
let fetchInterval = null;

// === Hàm dự đoán chính - chỉ sử dụng PredictionMap ===
function generatePrediction(history) {
    if (!history || history.length < 3) {
        return {
            prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
            reason: "Dữ liệu không đủ - chọn ngẫu nhiên",
            khop_pattern: "Không có"
        };
    }

    // Tạo pattern từ lịch sử
    const patternHistory = history.map(h => h.result === 'Tài' ? 'T' : 'X');
    const patternStr = patternHistory.join("");

    // Kiểm tra PredictionMap từ pattern dài nhất đến ngắn nhất
    for (let length = Math.min(patternStr.length, 7); length >= 3; length--) {
        const currentPattern = patternStr.slice(-length);

        if (predictionMap[currentPattern]) {
            const prediction = predictionMap[currentPattern];

            return {
                prediction: prediction,
                reason: `[PredictionMap] Khớp pattern "${currentPattern}" → Dự đoán: ${prediction}`,
                khop_pattern: currentPattern
            };
        }
    }

    // Nếu không tìm thấy pattern nào trong PredictionMap
    return {
        prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
        reason: "Không tìm thấy pattern trong PredictionMap - chọn ngẫu nhiên",
        khop_pattern: "Không có"
    };
}

// === HTTP API Data Fetching ===
async function fetchTaixiuData() {
  try {
    const response = await axios.get('https://sunlo-2dfb.onrender.com/api/taixiu/sunwin', {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
      },
      retry: 3,
      retryDelay: 1000
    });

    const data = response.data;

    if (!data || typeof data !== 'object') {
      console.log('[⚠️] API trả về dữ liệu không hợp lệ:', data);
      return;
    }

    const sessionId = data.Phien || data.phien_cu || data.session || null;

    if (!sessionId) {
      console.log('[⚠️] Không tìm thấy session ID trong response:', data);
      return;
    }

    if (sessionId !== lastSessionId) {
      lastSessionId = sessionId;

      const result = data.Ket_qua || data.ket_qua || data.result || null;

      let dice = [];
      if (data.Xuc_xac_1 && data.Xuc_xac_2 && data.Xuc_xac_3) {
        dice = [data.Xuc_xac_1, data.Xuc_xac_2, data.Xuc_xac_3];
      } else if (Array.isArray(data.xuc_xac)) {
        dice = data.xuc_xac;
      } else if (Array.isArray(data.dice)) {
        dice = data.dice;
      }

      if (dice.length !== 3 || !dice.every(d => typeof d === 'number' && d >= 1 && d <= 6)) {
        console.log('[⚠️] Dữ liệu xúc xắc không hợp lệ:', dice);
        return;
      }

      const totalScore = data.Tong || dice[0] + dice[1] + dice[2];

      if (!result || (result !== 'Tài' && result !== 'Xỉu')) {
        console.log('[⚠️] Kết quả không hợp lệ:', result);
        return;
      }

      const existingSession = gameHistory.find(h => h && h.session === sessionId);
      if (!existingSession) {
        gameHistory.push({
          session: sessionId,
          result: result,
          totalScore: totalScore,
          dice: dice,
          timestamp: Date.now()
        });

        if (gameHistory.length > 100) {
          gameHistory = gameHistory.slice(-100);
        }

        const predictionResult = generatePrediction(gameHistory);

        const patternHistory = gameHistory.map(h => h.result === 'Tài' ? 'T' : 'X');
        const patternStr = patternHistory.join("");

        currentData = {
          phien_cu: sessionId,
          ket_qua: result,
          xuc_xac: dice,
          phien_moi: sessionId + 1,
          pattern: patternStr,
          du_doan: predictionResult.prediction,
          khop_pattern: predictionResult.khop_pattern,
          reason: predictionResult.reason,
          id: "@axobantool",
          Phien: sessionId,
          Ket_qua: result,
          Xuc_xac_1: dice[0],
          Xuc_xac_2: dice[1],
          Xuc_xac_3: dice[2],
          Tong: totalScore
        };

        console.log(`🎲 [PredictionMap AI] Phiên ${sessionId}: ${dice.join('-')} = ${totalScore} (${result}) → Pattern: ${patternStr} → Dự đoán: ${predictionResult.prediction} → ${predictionResult.reason}`);
      }
    }

  } catch (error) {
    if (error.response) {
      // Server response với lỗi status code
      console.error(`[❌] API lỗi ${error.response.status}: ${error.response.statusText}`);
      if (error.response.status === 502) {
        console.log('[⏳] Server đang khởi động lại, thử lại sau 10 giây...');
        // Tăng interval khi gặp lỗi 502
        if (fetchInterval) {
          clearInterval(fetchInterval);
          setTimeout(() => {
            fetchInterval = setInterval(fetchTaixiuData, 5000);
          }, 10000);
        }
      }
    } else if (error.request) {
      // Request được gửi nhưng không có response
      console.error('[❌] Không nhận được response từ server');
    } else {
      // Lỗi khác
      console.error('[❌] Lỗi fetch API:', error.message);
    }
    
    // Không dừng hoàn toàn, tiếp tục với dữ liệu hiện tại
    return;
  }
}

function startDataFetching() {
  console.log('[🚀] Bắt đầu fetch dữ liệu từ API...');
  fetchTaixiuData();
  fetchInterval = setInterval(fetchTaixiuData, 3000);
}

// === API Routes ===
app.get('/axobantol', (req, res) => {
  try {
    const safeCurrentData = {
      phien_cu: currentData.phien_cu || null,
      ket_qua: currentData.ket_qua || null,
      xuc_xac: Array.isArray(currentData.xuc_xac) ? currentData.xuc_xac : [],
      phien_moi: currentData.phien_moi || null,
      pattern: currentData.pattern || "",
      du_doan: currentData.du_doan || "",
      khop_pattern: currentData.khop_pattern || "",
      reason: currentData.reason || "",
      id: currentData.id || "@axobantool"
    };
    res.json(safeCurrentData);
  } catch (error) {
    console.error('[❌] Lỗi API /axobantol:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/history', (req, res) => {
  try {
    const safeHistory = gameHistory.filter(h => h && h.session && h.result);
    res.json({
      total_games: safeHistory.length,
      last_10_games: safeHistory.slice(-10),
      current_pattern: currentData.pattern || "",
      api_status: 'PredictionMap Only',
      last_session: lastSessionId || null
    });
  } catch (error) {
    console.error('[❌] Lỗi API /history:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🎯 SunWin Tài Xỉu AI - PredictionMap Only</h2>
    <p><a href="/axobantol">Xem JSON kết quả</a></p>
    <p><a href="/history">Xem lịch sử game</a></p>
    <p>Tổng phiên đã ghi: ${gameHistory.length}</p>
    <p>Thuật toán: PredictionMap Only</p>
    <p>Nguồn dữ liệu: https://sunlo-mwft.onrender.com/api/taixiu/sunwin</p>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[🌐] Server đang chạy tại http://0.0.0.0:${PORT}`);
  console.log(`[🎯] Chỉ sử dụng thuật toán PredictionMap`);
  startDataFetching();
});
