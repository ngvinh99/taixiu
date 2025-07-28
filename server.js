
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
};

// === BIG STREAK DATA ===
const BIG_STREAK_DATA = {
    "tai": {
        "3": {"next_tai": 45, "next_xiu": 55},
        "4": {"next_tai": 40, "next_xiu": 60},
        "5": {"next_tai": 35, "next_xiu": 65},
        "6": {"next_tai": 30, "next_xiu": 70},
        "7": {"next_tai": 25, "next_xiu": 75},
        "8": {"next_tai": 20, "next_xiu": 80},
        "9": {"next_tai": 15, "next_xiu": 85},
        "10+": {"next_tai": 10, "next_xiu": 90}
    },
    "xiu": {
        "3": {"next_tai": 55, "next_xiu": 45},
        "4": {"next_tai": 60, "next_xiu": 40},
        "5": {"next_tai": 65, "next_xiu": 35},
        "6": {"next_tai": 70, "next_xiu": 30},
        "7": {"next_tai": 75, "next_xiu": 25},
        "8": {"next_tai": 80, "next_xiu": 20},
        "9": {"next_tai": 85, "next_xiu": 15},
        "10+": {"next_tai": 90, "next_xiu": 10}
    }
};

// === SUM STATISTICS ===
const SUM_STATS = {
    "3-10": {"tai": 25, "xiu": 75},
    "11": {"tai": 35, "xiu": 65},
    "12": {"tai": 45, "xiu": 55},
    "13": {"tai": 50, "xiu": 50},
    "14": {"tai": 55, "xiu": 45},
    "15": {"tai": 65, "xiu": 35},
    "16": {"tai": 75, "xiu": 25},
    "17": {"tai": 80, "xiu": 20},
    "18": {"tai": 85, "xiu": 15}
};

// === PREDICTION MAP (chỉ giữ lại pattern không trùng) ===
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
  "XXTT": "Tài", 
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

// === Hàm dự đoán chính kết hợp PredictionMap và thuật toán cũ ===
function generatePrediction(history) {
    if (!history || history.length < 3) {
        return {
            prediction: Math.random() < 0.5 ? 'Tài' : 'Xỉu',
            reason: "Dữ liệu không đủ - chọn ngẫu nhiên",
            khop_pattern: "Không có"
        };
    }

    // 1. Kiểm tra PredictionMap trước
    const patternHistory = history.map(h => h.result === 'Tài' ? 'T' : 'X');
    const patternStr = patternHistory.join("");
    
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

    // 2. Nếu PredictionMap không có, dùng thuật toán cũ
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
        finalReason = `[Pattern] ${patternAnalysis.reason}`;
        matchedPattern = patternAnalysis.pattern.toUpperCase();
    } else if (streakAnalysis.prediction && streakAnalysis.confidence >= 65) {
        finalPrediction = streakAnalysis.prediction;
        finalReason = `[Streak] ${streakAnalysis.reason}`;
        matchedPattern = "Cầu lớn";
    } else if (sumAnalysis.prediction && sumAnalysis.confidence >= 60) {
        finalPrediction = sumAnalysis.prediction;
        finalReason = `[Sum] ${sumAnalysis.reason}`;
        matchedPattern = "Thống kê điểm";
    } else if (patternAnalysis.prediction) {
        finalPrediction = patternAnalysis.prediction;
        finalReason = `[Pattern] ${patternAnalysis.reason}`;
        matchedPattern = patternAnalysis.pattern.toUpperCase();
    } else if (streakAnalysis.prediction) {
        finalPrediction = streakAnalysis.prediction;
        finalReason = `[Streak] ${streakAnalysis.reason}`;
        matchedPattern = "Cầu lớn";
    } else if (sumAnalysis.prediction) {
        finalPrediction = sumAnalysis.prediction;
        finalReason = `[Sum] ${sumAnalysis.reason}`;
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

        console.log(`🎲 [Hybrid AI] Phiên ${sessionId}: ${dice.join('-')} = ${totalScore} (${result}) → Pattern: ${patternStr} → Dự đoán: ${predictionResult.prediction} → ${predictionResult.reason}`);
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
      api_status: 'PredictionMap API',
      last_session: lastSessionId || null
    });
  } catch (error) {
    console.error('[❌] Lỗi API /history:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🎯 SunWin Tài Xỉu AI - PredictionMap</h2>
    <p><a href="/axobantol">Xem JSON kết quả</a></p>
    <p><a href="/history">Xem lịch sử game</a></p>
    <p>Tổng phiên đã ghi: ${gameHistory.length}</p>
    <p>Thuật toán: Hybrid AI (PredictionMap + Pattern Analysis + Big Streak + Sum Stats)</p>
    <p>Nguồn dữ liệu: https://hit-kyy9.onrender.com/api/hit</p>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[🌐] Server đang chạy tại http://0.0.0.0:${PORT}`);
  console.log(`[🎯] Thuật toán Hybrid AI đã được tích hợp (PredictionMap + Pattern Analysis + Big Streak + Sum Stats)`);
  startDataFetching();
});
