const express = require('express');
const cors = require('cors');
const axios = require('axios');

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
  du_doan: "",
  id: "@axobantool"
};
let gameHistory = [];
let isInitialized = false;
let modelPredictions = {
  trend: {},
  short: {},
  mean: {},
  switch: {},
  bridge: {}
};
let lastSessionId = null;
let fetchInterval = null;

// === Advanced AI Algorithm ===
// Helper function: Detect streak and break probability
function detectStreakAndBreak(history) {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return { streak: 0, currentResult: null, breakProb: 0.0 };
  }

  const lastGame = history[history.length - 1];
  if (!lastGame || !lastGame.result) {
    return { streak: 0, currentResult: null, breakProb: 0.0 };
  }

  let streak = 1;
  const currentResult = lastGame.result;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].result === currentResult) {
      streak++;
    } else {
      break;
    }
  }
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return { streak, currentResult, breakProb: 0.0 };
  const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
  const taiCount = last15.filter(r => r === 'Tài').length;
  const xiuCount = last15.filter(r => r === 'Xỉu').length;
  const imbalance = Math.abs(taiCount - xiuCount) / last15.length;
  let breakProb = 0.0;

  // Tăng độ nhạy cho bẻ cầu
  if (streak >= 6) {
    breakProb = Math.min(0.8 + (switches / 15) + imbalance * 0.3, 0.95);
  } else if (streak >= 4) {
    breakProb = Math.min(0.5 + (switches / 12) + imbalance * 0.25, 0.9);
  } else if (streak >= 2 && switches >= 5) {
    breakProb = 0.45; // Nhận diện cầu không ổn định
  } else if (streak === 1 && switches >= 6) {
    breakProb = 0.3; // Tăng xác suất bẻ khi có nhiều chuyển đổi
  }

  return { streak, currentResult, breakProb };
}

// Helper function: Evaluate model performance
function evaluateModelPerformance(history, modelName, lookback = 10) {
  if (!modelPredictions[modelName] || history.length < 2) return 1.0;
  lookback = Math.min(lookback, history.length - 1);
  let correctCount = 0;
  for (let i = 0; i < lookback; i++) {
    const pred = modelPredictions[modelName][history[history.length - (i + 2)].session] || 0;
    const actual = history[history.length - (i + 1)].result;
    if ((pred === 1 && actual === 'Tài') || (pred === 2 && actual === 'Xỉu')) {
      correctCount++;
    }
  }
  const performanceScore = lookback > 0 ? 1.0 + (correctCount - lookback / 2) / (lookback / 2) : 1.0;
  return Math.max(0.0, Math.min(2.0, performanceScore));
}

// Helper function: Smart bridge break model  
function smartBridgeBreak(history) {
  if (!history || history.length < 5) return { prediction: 0, breakProb: 0.0, reason: 'Không đủ dữ liệu để theo/bẻ cầu' };

  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  const last20 = history.slice(-20).map(h => h.result);
  const lastScores = history.slice(-20).map(h => h.totalScore || 0);
  let breakProbability = breakProb;
  let reason = '';

  const avgScore = lastScores.reduce((sum, score) => sum + score, 0) / (lastScores.length || 1);
  const scoreDeviation = lastScores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) / (lastScores.length || 1);

  // Phân tích mẫu lặp ngắn (2-3 kết quả) để theo cầu
  const last5 = last20.slice(-5);
  const patternCounts = {};
  for (let i = 0; i <= last20.length - 2; i++) {
    const pattern = last20.slice(i, i + 2).join(',');
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }
  const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  const isStablePattern = mostCommonPattern && mostCommonPattern[1] >= 3;

  // Theo cầu thông minh
  if (streak >= 3 && scoreDeviation < 2.0 && !isStablePattern) {
    breakProbability = Math.max(breakProbability - 0.25, 0.1);
    reason = `[Theo Cầu Thông Minh] Chuỗi ${streak} ${currentResult} ổn định, tiếp tục theo cầu`;
  } else if (streak >= 6) {
    breakProbability = Math.min(breakProbability + 0.3, 0.95);
    reason = `[Bẻ Cầu Thông Minh] Chuỗi ${streak} ${currentResult} quá dài, khả năng bẻ cầu cao`;
  } else if (streak >= 3 && scoreDeviation > 3.5) {
    breakProbability = Math.min(breakProbability + 0.25, 0.9);
    reason = `[Bẻ Cầu Thông Minh] Biến động điểm số lớn (${scoreDeviation.toFixed(1)}), khả năng bẻ cầu tăng`;
  } else if (isStablePattern && last5.every(r => r === currentResult)) {
    breakProbability = Math.min(breakProbability + 0.2, 0.85);
    reason = `[Bẻ Cầu Thông Minh] Phát hiện mẫu lặp ${mostCommonPattern[0]}, có khả năng bẻ cầu`;
  } else {
    breakProbability = Math.max(breakProbability - 0.2, 0.1);
    reason = `[Theo Cầu Thông Minh] Không phát hiện mẫu bẻ mạnh, tiếp tục theo cầu`;
  }

  let prediction = breakProbability > 0.5 ? (currentResult === 'Tài' ? 2 : 1) : (currentResult === 'Tài' ? 1 : 2);
  return { prediction, breakProb: breakProbability, reason };
}

// Helper function: Trend and probability model
function trendAndProb(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 3) {
    if (breakProb > 0.6) {
      return currentResult === 'Tài' ? 2 : 1;
    }
    return currentResult === 'Tài' ? 1 : 2; // Theo cầu nếu chuỗi ổn định
  }
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return 0;
  const weights = last15.map((_, i) => Math.pow(1.3, i));
  const taiWeighted = weights.reduce((sum, w, i) => sum + (last15[i] === 'Tài' ? w : 0), 0);
  const xiuWeighted = weights.reduce((sum, w, i) => sum + (last15[i] === 'Xỉu' ? w : 0), 0);
  const totalWeight = taiWeighted + xiuWeighted;
  const last10 = last15.slice(-10);
  const patterns = [];
  if (last10.length >= 4) {
    for (let i = 0; i <= last10.length - 4; i++) {
      patterns.push(last10.slice(i, i + 4).join(','));
    }
  }
  const patternCounts = patterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const mostCommon = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostCommon && mostCommon[1] >= 3) {
    const pattern = mostCommon[0].split(',');
    return pattern[pattern.length - 1] !== last10[last10.length - 1] ? 1 : 2;
  } else if (totalWeight > 0 && Math.abs(taiWeighted - xiuWeighted) / totalWeight >= 0.25) {
    return taiWeighted > xiuWeighted ? 1 : 2;
  }
  return last15[last15.length - 1] === 'Xỉu' ? 1 : 2;
}

// Helper function: Short pattern model
function shortPattern(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 2) {
    if (breakProb > 0.6) {
      return currentResult === 'Tài' ? 2 : 1;
    }
    return currentResult === 'Tài' ? 1 : 2; // Theo cầu ngắn
  }
  const last8 = history.slice(-8).map(h => h.result);
  if (!last8.length) return 0;
  const patterns = [];
  if (last8.length >= 2) {
    for (let i = 0; i <= last8.length - 2; i++) {
      patterns.push(last8.slice(i, i + 2).join(','));
    }
  }
  const patternCounts = patterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const mostCommon = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostCommon && mostCommon[1] >= 2) {
    const pattern = mostCommon[0].split(',');
    return pattern[pattern.length - 1] !== last8[last8.length - 1] ? 1 : 2;
  }
  return last8[last8.length - 1] === 'Xỉu' ? 1 : 2;
}

// Helper function: Mean deviation model
function meanDeviation(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 2) {
    if (breakProb > 0.6) {
      return currentResult === 'Tài' ? 2 : 1;
    }
    return currentResult === 'Tài' ? 1 : 2; // Theo cầu nếu chuỗi ổn định
  }
  const last12 = history.slice(-12).map(h => h.result);
  if (!last12.length) return 0;
  const taiCount = last12.filter(r => r === 'Tài').length;
  const xiuCount = last12.length - taiCount;
  const deviation = Math.abs(taiCount - xiuCount) / last12.length;
  if (deviation < 0.2) {
    return last12[last12.length - 1] === 'Xỉu' ? 1 : 2;
  }
  return xiuCount > taiCount ? 1 : 2;
}

// Helper function: Recent switch model
function recentSwitch(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 2) {
    if (breakProb > 0.6) {
      return currentResult === 'Tài' ? 2 : 1;
    }
    return currentResult === 'Tài' ? 1 : 2; // Theo cầu nếu chuỗi ổn định
  }
  const last10 = history.slice(-10).map(h => h.result);
  if (!last10.length) return 0;
  const switches = last10.slice(1).reduce((count, curr, idx) => count + (curr !== last10[idx] ? 1 : 0), 0);
  return switches >= 4 ? (last10[last10.length - 1] === 'Xỉu' ? 1 : 2) : (last10[last10.length - 1] === 'Xỉu' ? 1 : 2);
}

// Helper function: Check bad pattern
function isBadPattern(history) {
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return false;
  const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
  const { streak } = detectStreakAndBreak(history);
  return switches >= 6 || streak >= 7; // Tăng độ nhạy để phát hiện mẫu xấu
}

// AI HTDD Logic
function aiHtddLogic(history) {
  const recentHistory = history.slice(-5).map(h => h.result);
  const recentScores = history.slice(-5).map(h => h.totalScore || 0);
  const taiCount = recentHistory.filter(r => r === 'Tài').length;
  const xiuCount = recentHistory.filter(r => r === 'Xỉu').length;
  const { streak, currentResult } = detectStreakAndBreak(history);

  // Theo cầu thông minh: Theo chuỗi ngắn
  if (streak >= 2 && streak <= 4) {
    return { 
      prediction: currentResult, 
      reason: `[Theo Cầu Thông Minh] Chuỗi ngắn ${streak} ${currentResult}, tiếp tục theo cầu`, 
      source: 'AI HTDD' 
    };
  }

  // Bẻ cầu thông minh: Phát hiện mẫu lặp
  if (history.length >= 3) {
    const last3 = history.slice(-3).map(h => h.result);
    if (last3.join(',') === 'Tài,Xỉu,Tài') {
      return { prediction: 'Xỉu', reason: '[Bẻ Cầu Thông Minh] Phát hiện mẫu 1T1X → tiếp theo nên đánh Xỉu', source: 'AI HTDD' };
    } else if (last3.join(',') === 'Xỉu,Tài,Xỉu') {
      return { prediction: 'Tài', reason: '[Bẻ Cầu Thông Minh] Phát hiện mẫu 1X1T → tiếp theo nên đánh Tài', source: 'AI HTDD' };
    }
  }

  if (history.length >= 4) {
    const last4 = history.slice(-4).map(h => h.result);
    if (last4.join(',') === 'Tài,Tài,Xỉu,Xỉu') {
      return { prediction: 'Tài', reason: '[Theo Cầu Thông Minh] Phát hiện mẫu 2T2X → tiếp theo nên đánh Tài', source: 'AI HTDD' };
    } else if (last4.join(',') === 'Xỉu,Xỉu,Tài,Tài') {
      return { prediction: 'Xỉu', reason: '[Theo Cầu Thông Minh] Phát hiện mẫu 2X2T → tiếp theo nên đánh Xỉu', source: 'AI HTDD' };
    }
  }

  if (history.length >= 7 && history.slice(-7).every(h => h.result === 'Xỉu')) {
    return { prediction: 'Tài', reason: '[Bẻ Cầu Thông Minh] Chuỗi Xỉu quá dài (7 lần) → dự đoán Tài', source: 'AI HTDD' };
  } else if (history.length >= 7 && history.slice(-7).every(h => h.result === 'Tài')) {
    return { prediction: 'Xỉu', reason: '[Bẻ Cầu Thông Minh] Chuỗi Tài quá dài (7 lần) → dự đoán Xỉu', source: 'AI HTDD' };
  }

  const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / (recentScores.length || 1);
  if (avgScore > 11) {
    return { prediction: 'Tài', reason: `[Theo Cầu Thông Minh] Điểm trung bình cao (${avgScore.toFixed(1)}) → dự đoán Tài`, source: 'AI HTDD' };
  } else if (avgScore < 7) {
    return { prediction: 'Xỉu', reason: `[Theo Cầu Thông Minh] Điểm trung bình thấp (${avgScore.toFixed(1)}) → dự đoán Xỉu`, source: 'AI HTDD' };
  }

  if (taiCount > xiuCount + 1) {
    return { prediction: 'Xỉu', reason: `[Bẻ Cầu Thông Minh] Tài chiếm đa số (${taiCount}/${recentHistory.length}) → dự đoán Xỉu`, source: 'AI HTDD' };
  } else if (xiuCount > taiCount + 1) {
    return { prediction: 'Tài', reason: `[Bẻ Cầu Thông Minh] Xỉu chiếm đa số (${xiuCount}/${recentHistory.length}) → dự đoán Tài`, source: 'AI HTDD' };
  } else {
    const overallTai = history.filter(h => h.result === 'Tài').length;
    const overallXiu = history.filter(h => h.result === 'Xỉu').length;
    if (overallTai > overallXiu) {
      return { prediction: 'Xỉu', reason: '[Bẻ Cầu Thông Minh] Tổng thể Tài nhiều hơn → dự đoán Xỉu', source: 'AI HTDD' };
    } else {
      return { prediction: 'Tài', reason: '[Theo Cầu Thông Minh] Tổng thể Xỉu nhiều hơn hoặc bằng → dự đoán Tài', source: 'AI HTDD' };
    }
  }
}

// Main prediction function
function generatePrediction(history, modelPredictions) {
  // Validate input
  if (!history || !Array.isArray(history) || history.length < 5) {
    console.log('Không đủ lịch sử hoặc dữ liệu không hợp lệ, chọn ngẫu nhiên giữa Tài và Xỉu');
    const randomResult = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
    return randomResult;
  }

  // Kiểm tra tính hợp lệ của dữ liệu lịch sử
  const validHistory = history.filter(h => 
    h && 
    h.session && 
    h.result && 
    (h.result === 'Tài' || h.result === 'Xỉu') &&
    typeof h.totalScore === 'number'
  );

  if (validHistory.length < 3) {
    console.log('Dữ liệu lịch sử không đủ hợp lệ, chọn ngẫu nhiên');
    const randomResult = Math.random() < 0.5 ? 'Tài' : 'Xỉu';
    return randomResult;
  }

  // Khởi tạo modelPredictions nếu chưa tồn tại
  if (!modelPredictions['trend']) {
    modelPredictions['trend'] = {};
    modelPredictions['short'] = {};
    modelPredictions['mean'] = {};
    modelPredictions['switch'] = {};
    modelPredictions['bridge'] = {};
  }

  const currentIndex = history[history.length - 1].session;
  const { streak } = detectStreakAndBreak(history);

  // Gọi các hàm dự đoán từ các mô hình
  const trendPred = trendAndProb(history);
  const shortPred = shortPattern(history);
  const meanPred = meanDeviation(history);
  const switchPred = recentSwitch(history);
  const bridgePred = smartBridgeBreak(history);
  const aiPred = aiHtddLogic(history);

  // Lưu dự đoán vào modelPredictions
  modelPredictions['trend'][currentIndex] = trendPred;
  modelPredictions['short'][currentIndex] = shortPred;
  modelPredictions['mean'][currentIndex] = meanPred;
  modelPredictions['switch'][currentIndex] = switchPred;
  modelPredictions['bridge'][currentIndex] = bridgePred.prediction;

  // Đánh giá hiệu suất các mô hình
  const modelScores = {
    trend: evaluateModelPerformance(history, 'trend'),
    short: evaluateModelPerformance(history, 'short'),
    mean: evaluateModelPerformance(history, 'mean'),
    switch: evaluateModelPerformance(history, 'switch'),
    bridge: evaluateModelPerformance(history, 'bridge')
  };

  // Trọng số động dựa trên độ dài chuỗi và độ ổn định
  const weights = {
    trend: streak >= 3 ? 0.15 * modelScores.trend : 0.2 * modelScores.trend,
    short: streak >= 2 ? 0.2 * modelScores.short : 0.15 * modelScores.short,
    mean: 0.1 * modelScores.mean,
    switch: 0.1 * modelScores.switch,
    bridge: streak >= 3 ? 0.35 * modelScores.bridge : 0.3 * modelScores.bridge,
    aihtdd: streak >= 2 ? 0.3 : 0.25
  };

  let taiScore = 0;
  let xiuScore = 0;

  // Tính điểm cho Tài và Xỉu
  if (trendPred === 1) taiScore += weights.trend; else if (trendPred === 2) xiuScore += weights.trend;
  if (shortPred === 1) taiScore += weights.short; else if (shortPred === 2) xiuScore += weights.short;
  if (meanPred === 1) taiScore += weights.mean; else if (meanPred === 2) xiuScore += weights.mean;
  if (switchPred === 1) taiScore += weights.switch; else if (switchPred === 2) xiuScore += weights.switch;
  if (bridgePred.prediction === 1) taiScore += weights.bridge; else if (bridgePred.prediction === 2) xiuScore += weights.bridge;
  if (aiPred.prediction === 'Tài') taiScore += weights.aihtdd; else xiuScore += weights.aihtdd;

  // Giảm độ tin cậy nếu phát hiện mẫu xấu
  if (isBadPattern(history)) {
    console.log('Phát hiện mẫu xấu, giảm độ tin cậy');
    taiScore *= 0.5; // Giảm mạnh khi mẫu xấu
    xiuScore *= 0.5;
  }

  // Tăng trọng số cho bẻ cầu hoặc theo cầu dựa trên xác suất
  if (bridgePred.breakProb > 0.5) {
    console.log('Xác suất bẻ cầu cao:', bridgePred.breakProb, bridgePred.reason);
    if (bridgePred.prediction === 1) taiScore += 0.4; else xiuScore += 0.4; // Tăng ảnh hưởng bẻ cầu
  } else if (streak >= 3) {
    console.log('Phát hiện cầu mạnh, ưu tiên theo cầu:', bridgePred.reason);
    if (bridgePred.prediction === 1) taiScore += 0.35; else xiuScore += 0.35; // Tăng ảnh hưởng theo cầu
  }

  // Dự đoán cuối cùng
  const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
  const combinedReason = `${aiPred.reason} | ${bridgePred.reason}`;
  console.log('Dự đoán:', { prediction: finalPrediction, reason: combinedReason, scores: { taiScore, xiuScore } });
  return { prediction: finalPrediction, reason: combinedReason };
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

    // Kiểm tra xem có phiên mới không với validation an toàn
    const sessionId = data.Phien || data.phien_cu || data.session || null;

    if (!sessionId) {
      console.log('[⚠️] Không tìm thấy session ID trong response:', data);
      return;
    }

    if (sessionId !== lastSessionId) {
      lastSessionId = sessionId;

      const result = data.Ket_qua || data.ket_qua || data.result || null;

      // Xử lý xúc xắc từ định dạng mới
      let dice = [];
      if (data.Xuc_xac_1 && data.Xuc_xac_2 && data.Xuc_xac_3) {
        dice = [data.Xuc_xac_1, data.Xuc_xac_2, data.Xuc_xac_3];
      } else if (Array.isArray(data.xuc_xac)) {
        dice = data.xuc_xac;
      } else if (Array.isArray(data.dice)) {
        dice = data.dice;
      }

      // Validate dice array
      if (dice.length !== 3 || !dice.every(d => typeof d === 'number' && d >= 1 && d <= 6)) {
        console.log('[⚠️] Dữ liệu xúc xắc không hợp lệ:', dice);
        return;
      }

      const totalScore = data.Tong || dice[0] + dice[1] + dice[2];

      // Validate result
      if (!result || (result !== 'Tài' && result !== 'Xỉu')) {
        console.log('[⚠️] Kết quả không hợp lệ:', result);
        return;
      }

      // Kiểm tra xem phiên này đã có trong lịch sử chưa
      const existingSession = gameHistory.find(h => h && h.session === sessionId);
      if (!existingSession) {
        // Thêm vào lịch sử game
        gameHistory.push({
          session: sessionId,
          result: result,
          totalScore: totalScore,
          dice: dice,
          timestamp: Date.now()
        });

        // Giữ chỉ 100 phiên gần nhất
        if (gameHistory.length > 100) {
          gameHistory = gameHistory.slice(-100);
        }

        // Tạo AI dự đoán cho phiên tiếp theo
        const predictionResult = generatePrediction(gameHistory, modelPredictions);
        const prediction = typeof predictionResult === 'string' ? predictionResult : predictionResult.prediction;
        const predictionReason = typeof predictionResult === 'object' ? predictionResult.reason : '';

        // Tạo pattern string
        const patternHistory = gameHistory.map(h => h.result === 'Tài' ? 'T' : 'X');
        const patternStr = patternHistory.join("");

        currentData = {
          phien_cu: sessionId,
          ket_qua: result,
          xuc_xac: dice,
          phien_moi: sessionId + 1,
          pattern: patternStr,
          du_doan: prediction,
          reason: predictionReason || 'Smart Bridge Break Algorithm',
          id: "@axobantool",
          // Thêm định dạng gốc từ API
          Phien: sessionId,
          Ket_qua: result,
          Xuc_xac_1: dice[0],
          Xuc_xac_2: dice[1],
          Xuc_xac_3: dice[2],
          Tong: totalScore
        };

        console.log(`🎲 [HTTP] Phiên ${sessionId}: ${dice.join('-')} = ${totalScore} (${result}) → Pattern: ${patternStr} → AI Dự đoán: ${prediction} → Lý do: ${predictionReason || 'Smart Bridge Break'}`);
      }
    }

  } catch (error) {
    console.error('[❌] Lỗi fetch API:', error.message);
  }
}

// Khởi tạo interval để fetch dữ liệu
function startDataFetching() {
  console.log('[🚀] Bắt đầu fetch dữ liệu từ API...');

  // Fetch ngay lập tức
  fetchTaixiuData();

  // Sau đó fetch mỗi 3 giây
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
      api_status: 'HTTP API',
      last_session: lastSessionId || null
    });
  } catch (error) {
    console.error('[❌] Lỗi API /history:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🎯 SunWin Tài Xỉu AI (HTTP API)</h2>
    <p><a href="/axobantol">Xem JSON kết quả</a></p>
    <p><a href="/history">Xem lịch sử game</a></p>
    <p>Tổng phiên đã ghi: ${gameHistory.length}</p>
    <p>Nguồn dữ liệu: https://sunlo-mwft.onrender.com/api/taixiu/sunwin</p>
  `);
});

// === Khởi động server ===
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[🌐] Server đang chạy tại http://0.0.0.0:${PORT}`);
  startDataFetching();
});