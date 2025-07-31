
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// === MẪU CẦU MAP - Thuật toán mới ===
const mauCauMap = {
TTTTXXXTXT => X
TTTXXXTXTX => X
TTXXXTXTXX => X
TXXXTXTXXX => T
XXXTXTXXXT => T
XXTXTXXXTT => X
XTXTXXXTTX => X
TXTXXXTTXX => T
XTXXXTTXXT => X
TXXXTTXXTX => T
XXXTTXXTXT => X
XXTTXXTXTX => T
XTTXXTXTXT => T
TTXXTXTXTT => X
TXXTXTXTTX => X
XXTXTXTTXX => X
XTXTXTTXXX => X
TXTXTTXXXX => T
XTXTTXXXXT => X
TXTTXXXXTX => X
XTTXXXXTXX => T
TTXXXXTXXT => T
TXXXXTXXTT => T
XXXXTXXTTT => T
XXXTXXTTTT => X
XXTXXTTTTX => T
XTXXTTTTXT => X
TXXTTTTXTX => X
XXTTTTXTXX => T
XTTTTXTXXT => X
TTTTXTXXTX => X
TTTXTXXTXX => T
TTXTXXTXXT => T
TXTXXTXXTT => T
XTXXTXXTTT => T
TXXTXXTTTT => X
TXXTTTTXTT => T
XXTTTTXTTT => X
XTTTTXTTTX => X
TTTTXTTTXX => X
TTTXTTTXXX => X
TTXTTTXXXX => T
TXTTTXXXXT => T
XTTTXXXXTT => T
TTTXXXXTTT => T
TTXXXXTTTT => T
TXXXXTTTTT => X
XXXXTTTTTX => T
XXXTTTTTXT => T
XXTTTTTXTT => X
XTTTTTXTTX => T
TTTTTXTTXT => T
TTTTXTTXTT => T
TTTXTTXTTT => X
TTXTTXTTTX => X
TXTTXTTTXX => T
XTTXTTTXXT => X
TTXTTTXXTX => X
TXTTTXXTXX => T
XTTTXXTXXT => T
TTTXXTXXTT => X
TTXXTXXTTX => T
TXXTXXTTXT => X
XXTXXTTXTX => T
XTXXTTXTXT => X
TXXTTXTXTX => X
XXTTXTXTXX => X
XTTXTXTXXX => T
TTXTXTXXXT => T
TXTXTXXXTT => T
XTXTXXXTTT => X
TXTXXXTTTX => T
XTXXXTTTXT => T
TXXXTTTXTT => T
XXXTTTXTTT => X
XXTTTXTTTX => X
XTTTXTTTXX => T
TTTXTTTXXT => X
TXTTTXXTXT => X
XTTTXXTXTX => T
TTTXXTXTXT => X
TTXXTXTXTX => X
TXXTXTXTXX => T
XXTXTXTXXT => X
XTXTXTXXTX => T
TXTXTXXTXT => X
XTXTXXTXTX => T
TXTXXTXTXT => T
XTXXTXTXTT => T
TXXTXTXTTT => T
XXTXTXTTTT => T
XTXTXTTTTT => T
TXTXTTTTTT => T
XTXTTTTTTT => T
TXTTTTTTTT => T
TTTTTTTTTX => T
XTXXTXTXXT => T
TXXTXTXXTT => T
XXTXTXXTTT => X
XTXTXXTTTX => T
TXTXXTTTXT => X
XTXXTTTXTX => T
TXXTTTXTXT => T
XXTTTXTXTT => T
XTTTXTXTTT => X
TTTXTXTTTX => T
TTXTXTTTXT => X
TXTXTTTXTX => X
XTXTTTXTXX => X
TXTTTXTXXX => T
XTTTXTXXXT => T
TTTXTXXXTT => T
TTXTXXXTTT => X
XXXTTTXTTX => T
XXTTTXTTXT => X
XTTTXTTXTX => T
TTTXTTXTXT => X
TTXTTXTXTX => X
TXTTXTXTXX => T
XTTXTXTXXT => X
TTXTXTXXTX => T
XTXTXXTXTT => X
TXTXXTXTTX => X
XTXXTXTTXX => T
TXXTXTTXXT => T
XXTXTTXXTT => X
XTXTTXXTTX => T
TXTTXXTTXT => T
XTTXXTTXTT => T
TTXXTTXTTT => X
TXXTTXTTTX => X
XXTTXTTTXX => T
TTTXXTXTXX => T
TTXXTXTXXT => T
TTXTTTXXTT => X
TXTTTXXTTX => T
XTTTXXTTXT => T
TTTXXTTXTT => X
TTXXTTXTTX => X
TXXTTXTTXX => T
XXTTXTTXXT => X
XTTXTTXXTX => X
TTXTTXXTXX => T
TXTTXXTXXT => X
XTTXXTXXTX => T
TTXXTXXTXT => T
TXXTXXTXTT => X
XXTXXTXTTX => X
XTXTTXXTTT => X
TXTTXXTTTX => T
XTTXXTTTXT => T
TTXXTTTXTT => T
TXXTTTXTTT => X
TXTTTXXXXX => X
XTTTXXXXXX => X
TTTXXXXXXX => X
TTXXXXXXXX => X
TXXXXXXXXX => T
XXXXXXXXXT => T
XXXXXXXXTT => X
XXXXXXXTTX => X
XXXXXXTTXX => X
XXXXXTTXXX => T
XXXXTTXXXT => T
XXXTTXXXTT => X
XXTTXXXTTX => X
XTTXXXTTXX => X
TTXXXTTXXX => T
TXXXTTXXXT => X
XXXTTXXXTX => X
XXTTXXXTXX => T
XTTXXXTXXT => T
TTXXXTXXTT => X
TXXXTXXTTX => T
XXXTXXTTXT => T
XXTXXTTXTT => X
XTXXTTXTTX => T
TXXTTXTTXT => T
XXTTXTTXTT => X
XTTXTTXTTX => X
TTXTTXTTXX => T
TXTTXTTXXT => X
TTXTTXXTXT => T
TXTTXXTXTT => X
XTTXXTXTTX => T
TTXXTXTTXT => T
TXXTXTTXTT => X
XXTXTTXTTX => T
XTXTTXTTXT => T
TXTTXTTXTT => X
TTXTTXTTXT => T
XTTXTTXTTT => T
TTXTTXTTTT => T
TXTTXTTTTT => X
XTTXTTTTTX => X
TTXTTTTTXX => X
TXTTTTTXXX => T
XTTTTTXXXT => T
TTTTTXXXTT => X
TTTTXXXTTX => X
TTTXXXTTXX => X
XTTXXXTXXX => X
TTXXXTXXXX => X
TXXXTXXXXX => X
XXXTXXXXXX => T
XXTXXXXXXT => T
XTXXXXXXTT => X
TXXXXXXTTX => T
XXXXXXTTXT => T
XXXXXTTXTT => T
XXXXTTXTTT => T
XXXTTXTTTT => T
XXTTXTTTTT => T
XTTXTTTTTT => X
TTXTTTTTTX => T
TXTTTTTTXT => X
XTTTTTTXTX => T
TTTTTTXTXT => X
TTTTTXTXTX => T
TTTTXTXTXT => T
TTTXTXTXTT => T
TTXTXTXTTT => T
TXTXTXTTTT => X
XTXTXTTTTX => T
TXTXTTTTXT => T
XTXTTTTXTT => T
TXTTTTXTTT => X
TTTTXTTTXT => T
TTTXTTTXTT => X
TTXTTTXTTX => T
TXTTTXTTXT => X
TXTTXTXTXT => X
XTTXTXTXTX => X
TTXTXTXTXX => X
TXTXTXTXXX => T
XTXTXTXXXT => T
TXTXXXTTTT => T
XTXXXTTTTT => T
TXXXTTTTTT => X
XXXTTTTTTX => X
XXTTTTTTXX => X
XTTTTTTXXX => T
TTTTTTXXXT => X
TTTTTXXXTX => X
TTTTXXXTXX => X
TTTXXXTXXX => X
TXXXTXXXXT => X
XXXTXXXXTX => T
XXTXXXXTXT => X
XTXXXXTXTX => T
TXXXXTXTXT => T
XXXXTXTXTT => T
XXXTXTXTTT => X
XXTXTXTTTX => T
XTXTXTTTXT => T
TXTXTTTXTT => X
XTXTTTXTTX => X
TXTTTXTTXX => T
XTTTXTTXXT => T
TTTXTTXXTT => T
TTXTTXXTTT => T
TXTTXXTTTT => T
XTTXXTTTTT => X
TTXXTTTTTX => X
TXXTTTTTXX => T
XXTTTTTXXT => X
XTTTTTXXTX => X
TTTTTXXTXX => T
TTTTXXTXXT => T
TTXXTXXTTT => T
XXTXXTTTTT => T
XTXXTTTTTT => X
TXXTTTTTTX => X
XTTTTTTXXT => T
TTTTTTXXTT => X
TTTTTXXTTX => X
TTTTXXTTXX => T
TTTXXTTXXT => T
TTXXTTXXTT => X
TXXTTXXTTX => X
XXTTXXTTXX => T
XTTXXTTXXT => T
TXXTTXXTTT => T
XXTTXXTTTT => T
TXXTTTTTXT => X
XXTTTTTXTX => T
XTTTTTXTXT => T
TTTTTXTXTT => T
TTTTXTXTTT => T
TTTXTXTTTT => X
TTXTXTTTTX => T
TXXTXTXTXT => X
XXTXTXTXTX => X
XTXTXTXTXX => T
TXTXTXTXXT => T
XTXTXTXXTT => T
TXTXTXXTTT => T
XTXTXXTTTT => T
TXTXXTTTTT => T
TTTTTTXXTX => X
TXXTXXTTXX => T
XXTXXTTXXT => X
XTXXTTXXTX => X
TXXTTXXTXX => T
XXTTXXTXXT => T
XTTXXTXXTT => X
XXTTXTTXXX => T
XTTXTTXXXT => T
TTXTTXXXTT => T
TXTTXXXTTT => T
XTTXXXTTTT => X
TTXXXTTTTX => T
TXXXTTTTXT => T
XXXTTTTXTT => X
XXTTTTXTTX => X
XTTTTXTTXX => X
TTTTXTTXXX => X
TTTXTTXXXX => T
TTXTTXXXXT => X
XXXXTXXTTX => X
XXXTXXTTXX => X
XXTXXTTXXX => T
XTXXTTXXXT => X
TXXTTXXXTX => X
XTXXTTXXXX => X
TXXTTXXXXX => X
XXTTXXXXXX => T
XTTXXXXXXT => T
TTXXXXXXTT => X
XXXXXTTXTX => X
XXXXTTXTXX => T
XXXTTXTXXT => X
XXTTXTXXTX => T
XTTXTXXTXT => X
TTXTXXTXTX => T
TXTXTTTTTX => X
XTXTTTTTXX => X
XTTTTTXXXX => T
TTTTTXXXXT => T
TTTTXXXXTT => X
TTTXXXXTTX => T
TTXXXXTTXT => T
TXXXXTTXTT => X
XXXXTTXTTX => X
XXXTTXTTXX => T
TXTTXXTXXX => T
XTTXXTXXXT => T
TTXXTXXXTT => T
TXXTXXXTTT => T
XXTXXXTTTT => X
XTXXXTTTTX => T
TTXTTXXXXX => X
TXTTXXXXXX => X
XTTXXXXXXX => T
TTXXXXXXXT => X
TXXXXXXXTX => T
XXXXXXXTXT => X
XXXXXXTXTX => T
XXXXXTXTXT => T
TXTTTTTTTX => T
XTTTTTTTXT => X
TTTTTTTXTX => X
TTTTTTXTXX => T
TTTTTXTXXT => X
TTTXTXXTXT => T
TTXTXXTXTT => T
TXTXXTXTTT => T
XTXXTXTTTT => X
TXXTXTTTTX => T
XXTXTTTTXT => X
XTXTTTTXTX => T
TXTTTTXTXT => X
XTTTTXTXTX => T
TTTXTXTXTX => T
TTXTXTXTXT => T
TXTXTXTXTT => X
XTXTXTXTTX => T
TXTXTXTTXT => T
XTXTXTTXTT => T
TXTXTTXTTT => T
XTXTTXTTTT => T
TTXTTTTTTT => X
TTTTTTTXTT => X
TTTTTTXTTX => T
TTTXTTXTTX => X
XTTXTTXXTT => X
TTXTTXXTTX => X
TXTTXXTTXX => T
TTXXTTXXTX => X
TXXTXXTXTX => T
XXTXXTXTXT => T
XXTXTXTTXT => X
XTXTXTTXTX => T
TXTXTTXTXT => X
XTXTTXTXTX => X
TTXTXTXXXX => X
TXTXTXXXXX => T
XTXTXXXXXT => T
TXTXXXXXTT => T
XTXXXXXTTT => T
TXXXXXTTTT => T
XXXXXTTTTT => T
XXXXTTTTTT => T
XXXTTTTTTT => X
XXTTTTTTTX => X
XTTTTTTTXX => X
TTTTTTTXXX => T
TXXTTTXXTT => T
};

// Khởi tạo mẫu cầu
function loadMauCauMap() {
  console.log(`[📖] Đã tải ${Object.keys(mauCauMap).length} mẫu cầu từ code`);
}

// === Biến lưu trạng thái ===
let currentData = {
  phien_cu: null,
  ket_qua: null,
  xuc_xac: [],
  next_session: null,
  pattern: "",
  prediction: "",
  khop_pattern: "",
  id: "@axobantool"
};
let gameHistory = [];
let lastSessionId = null;
let fetchInterval = null;

// === Hàm dự đoán chính - sử dụng Mẫu Cầu ===
function generatePrediction(history) {
    if (!history || history.length < 10) {
        return {
            prediction: Math.random() < 0.5 ? 'T' : 'X',
            reason: "Dữ liệu không đủ (cần tối thiểu 10 phiên) - chọn ngẫu nhiên",
            khop_pattern: "Không có"
        };
    }

    const patternHistory = history.map(h => h.result === 'Tài' ? 'T' : 'X');
    const patternStr = patternHistory.join("");

    // Tìm pattern khớp từ dài nhất đến ngắn nhất (10-30 ký tự)
    for (let length = Math.min(patternStr.length, 30); length >= 10; length--) {
        const currentPattern = patternStr.slice(-length);

        if (mauCauMap[currentPattern]) {
            const prediction = mauCauMap[currentPattern];
            const finalPrediction = prediction === 'T' ? 'Tài' : 'Xỉu';
            return {
                prediction: finalPrediction,
                reason: `[Mẫu Cầu] Khớp pattern "${currentPattern}" (${length} ký tự) → Dự đoán: ${finalPrediction}`,
                khop_pattern: currentPattern
            };
        }
    }

    // Nếu không tìm thấy pattern chính xác, tìm pattern con gần nhất
    for (let length = Math.min(patternStr.length, 15); length >= 10; length--) {
        const currentPattern = patternStr.slice(-length);
        
        // Tìm pattern tương tự (có thể khác 1-2 ký tự)
        for (const [mapPattern, prediction] of Object.entries(mauCauMap)) {
            if (mapPattern.length === length && 
                currentPattern.length === mapPattern.length) {
                
                let diffCount = 0;
                for (let i = 0; i < length; i++) {
                    if (currentPattern[i] !== mapPattern[i]) diffCount++;
                }
                
                // Cho phép sai khác tối đa 2 ký tự
                if (diffCount <= 2) {
                    const finalPrediction = prediction === 'T' ? 'Tài' : 'Xỉu';
                    return {
                        prediction: finalPrediction,
                        reason: `[Mẫu Cầu Tương Tự] Pattern "${currentPattern}" tương tự "${mapPattern}" (sai khác ${diffCount}) → Dự đoán: ${finalPrediction}`,
                        khop_pattern: mapPattern
                    };
                }
            }
        }
    }

    return {
        prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
        reason: "Không tìm thấy pattern phù hợp trong Mẫu Cầu - chọn ngẫu nhiên",
        khop_pattern: "Không có"
    };
}

// === HTTP API Data Fetching ===
async function fetchTaixiuData() {
  try {
    const response = await axios.get('https://sunlo-2dfb.onrender.com/api/taixiu/sunwin', {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
      }
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

        if (gameHistory.length > 200) {
          gameHistory = gameHistory.slice(-200);
        }

        const predictionResult = generatePrediction(gameHistory);
        const patternHistory = gameHistory.map(h => h.result === 'Tài' ? 'T' : 'X');
        const patternStr = patternHistory.join("");

        currentData = {
          phien_cu: sessionId,
          ket_qua: result,
          xuc_xac: dice,
          next_session: sessionId + 1,
          pattern: patternStr,
          prediction: predictionResult.prediction,
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

        console.log(`🎲 [Mẫu Cầu AI] Phiên ${sessionId}: ${dice.join('-')} = ${totalScore} (${result}) → Pattern: ${patternStr.slice(-15)}... → Dự đoán: ${predictionResult.prediction} → ${predictionResult.reason}`);
      }
    }

  } catch (error) {
    if (error.response) {
      console.error(`[❌] API lỗi ${error.response.status}: ${error.response.statusText}`);
      if (error.response.status === 502) {
        console.log('[⏳] Server đang khởi động lại, thử lại sau 10 giây...');
        if (fetchInterval) {
          clearInterval(fetchInterval);
          setTimeout(() => {
            fetchInterval = setInterval(fetchTaixiuData, 5000);
          }, 10000);
        }
      }
    } else if (error.request) {
      console.error('[❌] Không nhận được response từ server');
    } else {
      console.error('[❌] Lỗi fetch API:', error.message);
    }
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
      next_session: currentData.next_session || null,
      pattern: currentData.pattern || "",
      prediction: currentData.prediction || "",
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
      api_status: 'Mẫu Cầu Algorithm',
      last_session: lastSessionId || null,
      mau_cau_count: Object.keys(mauCauMap).length
    });
  } catch (error) {
    console.error('[❌] Lỗi API /history:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🎯 SunWin Tài Xỉu AI - Mẫu Cầu Algorithm</h2>
    <p><a href="/axobantol">Xem JSON kết quả</a></p>
    <p><a href="/history">Xem lịch sử game</a></p>
    <p>Tổng phiên đã ghi: ${gameHistory.length}</p>
    <p>Thuật toán: Mẫu Cầu (${Object.keys(mauCauMap).length} patterns)</p>
    <p>Nguồn dữ liệu: https://sunlo-2dfb.onrender.com/api/taixiu/sunwin</p>
    <p>Mẫu cầu: Pattern matching từ 10-30 ký tự</p>
  `);
});

// Khởi tạo mẫu cầu khi server start
loadMauCauMap();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[🌐] Server đang chạy tại http://0.0.0.0:${PORT}`);
  console.log(`[🎯] Sử dụng thuật toán Mẫu Cầu với ${Object.keys(mauCauMap).length} patterns`);
  startDataFetching();
});
