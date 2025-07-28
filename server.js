
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// === THUẬT TOÁN PATTERN ANALYSIS NÂNG CAO ===
const PATTERN_DATA = {
    // Các pattern cơ bản
    "tttt": {"tai": 73, "xiu": 27}, "xxxx": {"tai": 27, "xiu": 73},
    "tttttt": {"tai": 83, "xiu": 17}, "xxxxxx": {"tai": 17, "xiu": 83},
    "ttttx": {"tai": 40, "xiu": 60}, "xxxxt": {"tai": 60, "xiu": 40},
    "ttttttx": {"tai": 30, "xiu": 70}, "xxxxxxt": {"tai": 70, "xiu": 30},
    "ttxx": {"tai": 62, "xiu": 38}, "xxtt": {"tai": 38, "xiu": 62},
    "ttxxtt": {"tai": 32, "xiu": 68}, "xxttxx": {"tai": 68, "xiu": 32},
    "txx": {"tai": 60, "xiu": 40}, "xtt": {"tai": 40, "xiu": 60},
    "txxtx": {"tai": 63, "xiu": 37}, "xttxt": {"tai": 37, "xiu": 63},
    "tttxt": {"tai": 60, "xiu": 40}, "xxxtx": {"tai": 40, "xiu": 60},
    "tttxx": {"tai": 60, "xiu": 40}, "xxxtt": {"tai": 40, "xiu": 60},
    "txxt": {"tai": 60, "xiu": 40}, "xttx": {"tai": 40, "xiu": 60},
    "ttxxttx": {"tai": 30, "xiu": 70}, "xxttxxt": {"tai": 70, "xiu": 30},
    
    // Bổ sung pattern cầu lớn (chuỗi dài)
    "tttttttt": {"tai": 88, "xiu": 12}, "xxxxxxxx": {"tai": 12, "xiu": 88},
    "tttttttx": {"tai": 25, "xiu": 75}, "xxxxxxxxt": {"tai": 75, "xiu": 25},
    "tttttxxx": {"tai": 35, "xiu": 65}, "xxxxtttt": {"tai": 65, "xiu": 35},
    "ttttxxxx": {"tai": 30, "xiu": 70}, "xxxxtttx": {"tai": 70, "xiu": 30},
    
    // Pattern đặc biệt cho Sunwin
    "txtxtx": {"tai": 68, "xiu": 32}, "xtxtxt": {"tai": 32, "xiu": 68},
    "ttxtxt": {"tai": 55, "xiu": 45}, "xxtxtx": {"tai": 45, "xiu": 55},
    "txtxxt": {"tai": 60, "xiu": 40}, "xtxttx": {"tai": 40, "xiu": 60},
    
    // Thêm các pattern mới nâng cao
    "ttx": {"tai": 65, "xiu": 35}, "xxt": {"tai": 35, "xiu": 65},
    "txt": {"tai": 58, "xiu": 42}, "xtx": {"tai": 42, "xiu": 58},
    "tttx": {"tai": 70, "xiu": 30}, "xxxt": {"tai": 30, "xiu": 70},
    "ttxt": {"tai": 63, "xiu": 37}, "xxtx": {"tai": 37, "xiu": 63},
    "txxx": {"tai": 25, "xiu": 75}, "xttt": {"tai": 75, "xiu": 25},
    "tttxx": {"tai": 60, "xiu": 40}, "xxxtt": {"tai": 40, "xiu": 60},
    "ttxtx": {"tai": 62, "xiu": 38}, "xxtxt": {"tai": 38, "xiu": 62},
    "ttxxt": {"tai": 55, "xiu": 45}, "xxttx": {"tai": 45, "xiu": 55},
    "ttttx": {"tai": 40, "xiu": 60}, "xxxxt": {"tai": 60, "xiu": 40},
    "tttttx": {"tai": 30, "xiu": 70}, "xxxxxt": {"tai": 70, "xiu": 30},
    "ttttttx": {"tai": 25, "xiu": 75}, "xxxxxxt": {"tai": 75, "xiu": 25},
    "tttttttx": {"tai": 20, "xiu": 80}, "xxxxxxxt": {"tai": 80, "xiu": 20},
    "ttttttttx": {"tai": 15, "xiu": 85}, "xxxxxxxxt": {"tai": 85, "xiu": 15},
    
    // Pattern đặc biệt zigzag
    "txtx": {"tai": 52, "xiu": 48}, "xtxt": {"tai": 48, "xiu": 52},
    "txtxt": {"tai": 53, "xiu": 47}, "xtxtx": {"tai": 47, "xiu": 53},
    "txtxtx": {"tai": 55, "xiu": 45}, "xtxtxt": {"tai": 45, "xiu": 55},
    "txtxtxt": {"tai": 57, "xiu": 43}, "xtxtxtx": {"tai": 43, "xiu": 57},
    
    // Pattern đặc biệt kết hợp
    "ttxxttxx": {"tai": 38, "xiu": 62}, "xxttxxtt": {"tai": 62, "xiu": 38},
    "ttxxxttx": {"tai": 45, "xiu": 55}, "xxttxxxt": {"tai": 55, "xiu": 45},
    "ttxtxttx": {"tai": 50, "xiu": 50}, "xxtxtxxt": {"tai": 50, "xiu": 50},
    
    // Thêm các pattern mới cực ngon
    "ttxttx": {"tai": 60, "xiu": 40}, "xxtxxt": {"tai": 40, "xiu": 60},
    "ttxxtx": {"tai": 58, "xiu": 42}, "xxtxxt": {"tai": 42, "xiu": 58},
    "ttxtxtx": {"tai": 62, "xiu": 38}, "xxtxtxt": {"tai": 38, "xiu": 62},
    "ttxxtxt": {"tai": 55, "xiu": 45}, "xxtxttx": {"tai": 45, "xiu": 55},
    "ttxtxxt": {"tai": 65, "xiu": 35}, "xxtxttx": {"tai": 35, "xiu": 65},
    "ttxtxttx": {"tai": 70, "xiu": 30}, "xxtxtxxt": {"tai": 30, "xiu": 70},
    "ttxxtxtx": {"tai": 68, "xiu": 32}, "xxtxtxtx": {"tai": 32, "xiu": 68},
    "ttxtxxtx": {"tai": 72, "xiu": 28}, "xxtxtxxt": {"tai": 28, "xiu": 72},
    "ttxxtxxt": {"tai": 75, "xiu": 25}, "xxtxtxxt": {"tai": 25, "xiu": 75}
};

// Dữ liệu thống kê cầu lớn từ Sunwin
const BIG_STREAK_DATA = {
    "tai": {
        "3": {"next_tai": 65, "next_xiu": 35},
        "4": {"next_tai": 70, "next_xiu": 30},
        "5": {"next_tai": 75, "next_xiu": 25},
        "6": {"next_tai": 80, "next_xiu": 20},
        "7": {"next_tai": 85, "next_xiu": 15},
        "8": {"next_tai": 88, "next_xiu": 12},
        "9": {"next_tai": 90, "next_xiu": 10},
        "10+": {"next_tai": 92, "next_xiu": 8}
    },
    "xiu": {
        "3": {"next_tai": 35, "next_xiu": 65},
        "4": {"next_tai": 30, "next_xiu": 70},
        "5": {"next_tai": 25, "next_xiu": 75},
        "6": {"next_tai": 20, "next_xiu": 80},
        "7": {"next_tai": 15, "next_xiu": 85},
        "8": {"next_tai": 12, "next_xiu": 88},
        "9": {"next_tai": 10, "next_xiu": 90},
        "10+": {"next_tai": 8, "next_xiu": 92}
    }
};

// Dữ liệu thống kê theo tổng điểm
const SUM_STATS = {
    "3-10": {"tai": 0, "xiu": 100},  // Xỉu 100%
    "11": {"tai": 15, "xiu": 85},
    "12": {"tai": 25, "xiu": 75},
    "13": {"tai": 40, "xiu": 60},
    "14": {"tai": 50, "xiu": 50},
    "15": {"tai": 60, "xiu": 40},
    "16": {"tai": 75, "xiu": 25},
    "17": {"tai": 85, "xiu": 15},
    "18": {"tai": 100, "xiu": 0}     // Tài 100%
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

// === Hàm phân tích pattern ===
function analyzePattern(history) {
    if (!history || history.length < 3) {
        return { prediction: null, pattern: null, reason: "Không đủ dữ liệu để phân tích pattern" };
    }

    // Tạo pattern string từ lịch sử
    const patternString = history.map(h => h.result === 'Tài' ? 't' : 'x').join('');
    
    // Kiểm tra các pattern từ dài nhất đến ngắn nhất
    for (let length = Math.min(patternString.length, 10); length >= 3; length--) {
        const currentPattern = patternString.slice(-length);
        
        if (PATTERN_DATA[currentPattern]) {
            const patternStats = PATTERN_DATA[currentPattern];
            const prediction = patternStats.tai > patternStats.xiu ? 'Tài' : 'Xỉu';
            const confidence = Math.max(patternStats.tai, patternStats.xiu);
            
            return {
                prediction: prediction,
                pattern: currentPattern,
                reason: `Khớp pattern "${currentPattern}" - Tài: ${patternStats.tai}%, Xỉu: ${patternStats.xiu}%`,
                confidence: confidence
            };
        }
    }

    return { prediction: null, pattern: null, reason: "Không tìm thấy pattern phù hợp" };
}

// === Hàm phân tích cầu lớn ===
function analyzeBigStreak(history) {
    if (!history || history.length < 3) {
        return { prediction: null, reason: "Không đủ dữ liệu để phân tích cầu" };
    }

    const lastResult = history[history.length - 1].result;
    let streak = 1;
    
    // Đếm chuỗi hiện tại
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === lastResult) {
            streak++;
        } else {
            break;
        }
    }

    if (streak >= 3) {
        const resultType = lastResult === 'Tài' ? 'tai' : 'xiu';
        const streakKey = streak >= 10 ? '10+' : streak.toString();
        
        if (BIG_STREAK_DATA[resultType] && BIG_STREAK_DATA[resultType][streakKey]) {
            const stats = BIG_STREAK_DATA[resultType][streakKey];
            const prediction = stats.next_tai > stats.next_xiu ? 'Tài' : 'Xỉu';
            
            return {
                prediction: prediction,
                reason: `Cầu ${lastResult} ${streak} lần - Tài: ${stats.next_tai}%, Xỉu: ${stats.next_xiu}%`,
                confidence: Math.max(stats.next_tai, stats.next_xiu)
            };
        }
    }

    return { prediction: null, reason: "Chuỗi chưa đủ dài để áp dụng quy luật cầu lớn" };
}

// === Hàm phân tích theo tổng điểm ===
function analyzeSumStats(history) {
    if (!history || history.length < 5) {
        return { prediction: null, reason: "Không đủ dữ liệu để phân tích tổng điểm" };
    }

    const recentScores = history.slice(-5).map(h => h.totalScore);
    const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    let sumKey;
    if (avgScore <= 10) sumKey = "3-10";
    else if (avgScore <= 11.5) sumKey = "11";
    else if (avgScore <= 12.5) sumKey = "12";
    else if (avgScore <= 13.5) sumKey = "13";
    else if (avgScore <= 14.5) sumKey = "14";
    else if (avgScore <= 15.5) sumKey = "15";
    else if (avgScore <= 16.5) sumKey = "16";
    else if (avgScore <= 17.5) sumKey = "17";
    else sumKey = "18";

    if (SUM_STATS[sumKey]) {
        const stats = SUM_STATS[sumKey];
        const prediction = stats.tai > stats.xiu ? 'Tài' : 'Xỉu';
        
        return {
            prediction: prediction,
            reason: `Điểm TB: ${avgScore.toFixed(1)} - Tài: ${stats.tai}%, Xỉu: ${stats.xiu}%`,
            confidence: Math.max(stats.tai, stats.xiu)
        };
    }

    return { prediction: null, reason: "Không thể phân tích theo tổng điểm" };
}

// === Hàm dự đoán chính ===
function generatePrediction(history) {
    if (!history || history.length < 3) {
        return {
            prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
            reason: "Dữ liệu không đủ - chọn ngẫu nhiên",
            khop_pattern: "Không có"
        };
    }

    // Phân tích pattern
    const patternAnalysis = analyzePattern(history);
    
    // Phân tích cầu lớn
    const streakAnalysis = analyzeBigStreak(history);
    
    // Phân tích tổng điểm
    const sumAnalysis = analyzeSumStats(history);

    // Ưu tiên theo độ tin cậy
    let finalPrediction = null;
    let finalReason = "";
    let matchedPattern = "Không có";

    if (patternAnalysis.prediction && patternAnalysis.confidence >= 60) {
        finalPrediction = patternAnalysis.prediction;
        finalReason = patternAnalysis.reason;
        matchedPattern = patternAnalysis.pattern.toUpperCase();
    } else if (streakAnalysis.prediction && streakAnalysis.confidence >= 65) {
        finalPrediction = streakAnalysis.prediction;
        finalReason = streakAnalysis.reason;
        matchedPattern = "Cầu lớn";
    } else if (sumAnalysis.prediction && sumAnalysis.confidence >= 60) {
        finalPrediction = sumAnalysis.prediction;
        finalReason = sumAnalysis.reason;
        matchedPattern = "Thống kê điểm";
    } else if (patternAnalysis.prediction) {
        finalPrediction = patternAnalysis.prediction;
        finalReason = patternAnalysis.reason;
        matchedPattern = patternAnalysis.pattern.toUpperCase();
    } else if (streakAnalysis.prediction) {
        finalPrediction = streakAnalysis.prediction;
        finalReason = streakAnalysis.reason;
        matchedPattern = "Cầu lớn";
    } else if (sumAnalysis.prediction) {
        finalPrediction = sumAnalysis.prediction;
        finalReason = sumAnalysis.reason;
        matchedPattern = "Thống kê điểm";
    } else {
        finalPrediction = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
        finalReason = "Không tìm thấy pattern phù hợp - chọn ngẫu nhiên";
        matchedPattern = "Không có";
    }

    return {
        prediction: finalPrediction,
        reason: finalReason,
        khop_pattern: matchedPattern
    };
}

// === HTTP API Data Fetching ===
async function fetchTaixiuData() {
  try {
    const response = await axios.get('https://sunlo-mwft.onrender.com/api/taixiu/sunwin', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

        console.log(`🎲 [Pattern Analysis] Phiên ${sessionId}: ${dice.join('-')} = ${totalScore} (${result}) → Pattern: ${patternStr} → Dự đoán: ${predictionResult.prediction} → Khớp: ${predictionResult.khop_pattern} → Lý do: ${predictionResult.reason}`);
      }
    }

  } catch (error) {
    console.error('[❌] Lỗi fetch API:', error.message);
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
      api_status: 'Pattern Analysis API',
      last_session: lastSessionId || null
    });
  } catch (error) {
    console.error('[❌] Lỗi API /history:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🎯 SunWin Tài Xỉu AI - Pattern Analysis</h2>
    <p><a href="/axobantol">Xem JSON kết quả</a></p>
    <p><a href="/history">Xem lịch sử game</a></p>
    <p>Tổng phiên đã ghi: ${gameHistory.length}</p>
    <p>Thuật toán: Pattern Analysis nâng cao</p>
    <p>Nguồn dữ liệu: https://sunlo-mwft.onrender.com/api/taixiu/sunwin</p>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[🌐] Server đang chạy tại http://0.0.0.0:${PORT}`);
  console.log(`[🎯] Thuật toán Pattern Analysis đã được tích hợp`);
  startDataFetching();
});
