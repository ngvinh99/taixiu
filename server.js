const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// === Biến lưu kết quả và lịch sử AI ===
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
let history = [];
let modelPredictions = {};
let id_phien_chua_co_kq = null;

// === WebSocket kết nối đến SunWin ===
const ws = new WebSocket("wss://socket.sunwin.gg:881");

const messagesToSend = [
  { id: 2, type: 1, command: 1002, data: { GameId: 111 } },
  { id: 3, type: 1, command: 1000, data: {} },
  { id: 4, type: 1, command: 1001, data: { GameId: 111 } },
];

ws.on('open', () => {
  messagesToSend.forEach(msg => {
    ws.send(JSON.stringify(msg));
  });
  console.log("✅ Đã kết nối tới SunWin WebSocket");
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data);
    const { cmd, data: d } = msg;

    if (cmd === 1004 && d?.[0]?.id !== undefined) {
      id_phien_chua_co_kq = d[0].id;
    }

    if (cmd === 1003 && d?.gBB) {
      const { d1, d2, d3 } = d;
      const total = d1 + d2 + d3;
      const result = total > 10 ? "Tài" : "Xỉu";

      history.push({
        session: id_phien_chua_co_kq,
        result,
        totalScore: total,
        dice: [d1, d2, d3]
      });
      if (history.length > 50) history.shift();

      const prediction = generatePrediction(history, modelPredictions);

      currentData = {
        phien_cu: id_phien_chua_co_kq,
        ket_qua: result,
        xuc_xac: [d1, d2, d3],
        phien_moi: id_phien_chua_co_kq + 1,
        pattern: history.map(h => h.result[0]).join(""),
        khop_pattern: "",
        du_doan: prediction,
        id: "@axobantool"
      };

      console.log(`🎲 Phiên ${id_phien_chua_co_kq}: ${d1}-${d2}-${d3} = ${total} (${result}) → Dự đoán AI: ${prediction}`);
      id_phien_chua_co_kq = null;
    }
  } catch (err) {
    console.error("❌ Lỗi xử lý message:", err);
  }
});

// === API JSON REST ===
app.get('/taixiu', (req, res) => {
  res.json(currentData);
});

app.listen(PORT, () => {

// Helper function: Detect streak and break probability
function detectStreakAndBreak(history) {
  if (!history || history.length === 0) return { streak: 0, currentResult: null, breakProb: 0.0 };
  let streak = 1;
  const currentResult = history[history.length - 1].result;
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

  if (streak >= 8) {
    breakProb = Math.min(0.7 + (switches / 15) + imbalance * 0.2, 0.95);
  } else if (streak >= 5) {
    breakProb = Math.min(0.4 + (switches / 10) + imbalance * 0.3, 1.0);
  } else if (streak >= 3 && switches >= 6) {
    breakProb = 0.35;
  }

  return { streak, currentResult, breakProb };
}

// Helper function: Evaluate model performance
function evaluateModelPerformance(history, modelName, lookback = 10) {
  if (!modelPredictions[modelName] || history.length < 2) return 1.0;
  lookback = Math.min(lookback, history.length - 1);
  let correctCount = 0;
  for (let i = 0; i < lookback; i++) {
    const pred = modelPredictions[modelName][history[history.length - (i + 2)].session];
    const actual = history[history.length - (i + 1)].result;
    if (pred === actual) {
      correctCount++;
    }
  }
  const performanceScore = lookback > 0 ? 1.0 + (correctCount - lookback / 2) / (lookback / 2) : 1.0;
  return Math.max(0.0, Math.min(2.0, performanceScore));
}

// Helper function: Smart bridge break model
function smartBridgeBreak(history) {
  if (!history || history.length < 5) return { prediction: 'Tài', breakProb: 0.0, reason: 'Không đủ dữ liệu để bẻ cầu' };

  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  const last20 = history.slice(-20).map(h => h.result);
  const lastScores = history.slice(-20).map(h => h.totalScore || 0);
  let breakProbability = breakProb;
  let reason = '';

  const avgScore = lastScores.reduce((sum, score) => sum + score, 0) / (lastScores.length || 1);
  const scoreDeviation = lastScores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) / (lastScores.length || 1);

  const last5 = last20.slice(-5);
  const patternCounts = {};
  for (let i = 0; i <= last20.length - 3; i++) {
    const pattern = last20.slice(i, i + 3).join(',');
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }
  const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  const isStablePattern = mostCommonPattern && mostCommonPattern[1] >= 3;

  if (streak >= 6) {
    breakProbability = Math.min(breakProbability + 0.2, 0.95);
    reason = `[Bẻ Cầu] Chuỗi ${streak} ${currentResult} quá dài, khả năng bẻ cầu cao`;
  } else if (streak >= 4 && scoreDeviation > 3) {
    breakProbability = Math.min(breakProbability + 0.15, 0.9);
    reason = `[Bẻ Cầu] Biến động điểm số lớn (${scoreDeviation.toFixed(1)}), khả năng bẻ cầu tăng`;
  } else if (isStablePattern && last5.every(r => r === currentResult)) {
    breakProbability = Math.min(breakProbability + 0.1, 0.85);
    reason = `[Bẻ Cầu] Phát hiện mẫu lặp ${mostCommonPattern[0]}, có khả năng bẻ cầu`;
  } else {
    breakProbability = Math.max(breakProbability - 0.1, 0.2);
    reason = `[Bẻ Cầu] Không phát hiện mẫu bẻ cầu mạnh, tiếp tục theo cầu`;
  }

  let prediction = breakProbability > 0.6 ? (currentResult === 'Tài' ? 'Xỉu' : 'Tài') : currentResult;
  return { prediction, breakProb: breakProbability, reason };
}

// Helper function: Trend and probability model
function trendAndProb(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 5) {
    if (breakProb > 0.7) {
      return currentResult === 'Tài' ? 'Xỉu' : 'Tài';
    }
    return currentResult;
  }
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return 'Tài';
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
    return pattern[pattern.length - 1] !== last10[last10.length - 1] ? 'Tài' : 'Xỉu';
  } else if (totalWeight > 0 && Math.abs(taiWeighted - xiuWeighted) / totalWeight >= 0.2) {
    return taiWeighted > xiuWeighted ? 'Tài' : 'Xỉu';
  }
  return last15[last15.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu';
}

// Helper function: Short pattern model
function shortPattern(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 4) {
    if (breakProb > 0.7) {
      return currentResult === 'Tài' ? 'Xỉu' : 'Tài';
    }
    return currentResult;
  }
  const last8 = history.slice(-8).map(h => h.result);
  if (!last8.length) return 'Tài';
  const patterns = [];
  if (last8.length >= 3) {
    for (let i = 0; i <= last8.length - 3; i++) {
      patterns.push(last8.slice(i, i + 3).join(','));
    }
  }
  const patternCounts = patterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const mostCommon = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostCommon && mostCommon[1] >= 2) {
    const pattern = mostCommon[0].split(',');
    return pattern[pattern.length - 1] !== last8[last8.length - 1] ? 'Tài' : 'Xỉu';
  }
  return last8[last8.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu';
}

// Helper function: Mean deviation model
function meanDeviation(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 4) {
    if (breakProb > 0.7) {
      return currentResult === 'Tài' ? 'Xỉu' : 'Tài';
    }
    return currentResult;
  }
  const last12 = history.slice(-12).map(h => h.result);
  if (!last12.length) return 'Tài';
  const taiCount = last12.filter(r => r === 'Tài').length;
  const xiuCount = last12.length - taiCount;
  const deviation = Math.abs(taiCount - xiuCount) / last12.length;
  if (deviation < 0.3) {
    return last12[last12.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu';
  }
  return xiuCount > taiCount ? 'Tài' : 'Xỉu';
}

// Helper function: Recent switch model
function recentSwitch(history) {
  const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
  if (streak >= 4) {
    if (breakProb > 0.7) {
      return currentResult === 'Tài' ? 'Xỉu' : 'Tài';
    }
    return currentResult;
  }
  const last10 = history.slice(-10).map(h => h.result);
  if (!last10.length) return 'Tài';
  const switches = last10.slice(1).reduce((count, curr, idx) => count + (curr !== last10[idx] ? 1 : 0), 0);
  return switches >= 5 ? (last10[last10.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu') : (last10[last10.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu');
}

// Helper function: Check bad pattern
function isBadPattern(history) {
  const last15 = history.slice(-15).map(h => h.result);
  if (!last15.length) return false;
  const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
  const { streak } = detectStreakAndBreak(history);
  return switches >= 8 || streak >= 9;
}

// AI HTDD Logic
function aiHtddLogic(history) {
  const recentHistory = history.slice(-6).map(h => h.result);
  const recentScores = history.slice(-6).map(h => h.totalScore || 0);
  const taiCount = recentHistory.filter(r => r === 'Tài').length;
  const xiuCount = recentHistory.filter(r => r === 'Xỉu').length;

  if (history.length >= 6) {
    const last6 = history.slice(-6).map(h => h.result).join(',');
    if (last6 === 'Tài,Xỉu,Xỉu,Tài,Tài,Tài') {
      return { prediction: 'Xỉu', reason: '[AI] Phát hiện mẫu 1T2X3T (Tài, Xỉu, Xỉu, Tài, Tài, Tài) → dự đoán Xỉu', source: 'AI HTDD 123' };
    } else if (last6 === 'Xỉu,Tài,Tài,Xỉu,Xỉu,Xỉu') {
      return { prediction: 'Tài', reason: '[AI] Phát hiện mẫu 1X2T3X (Xỉu, Tài, Tài, Xỉu, Xỉu, Xỉu) → dự đoán Tài', source: 'AI HTDD 123' };
    }
  }
  if (history.length >= 3) {
    const last3 = history.slice(-3).map(h => h.result);
    if (last3.join(',') === 'Tài,Xỉu,Tài') {
      return { prediction: 'Xỉu', reason: '[AI] Phát hiện mẫu 1T1X → tiếp theo nên đánh Xỉu', source: 'AI HTDD' };
    } else if (last3.join(',') === 'Xỉu,Tài,Xỉu') {
      return { prediction: 'Tài', reason: '[AI] Phát hiện mẫu 1X1T → tiếp theo nên đánh Tài', source: 'AI HTDD' };
    }
  }

  if (history.length >= 4) {
    const last4 = history.slice(-4).map(h => h.result);
    if (last4.join(',') === 'Tài,Tài,Xỉu,Xỉu') {
      return { prediction: 'Tài', reason: '[AI] Phát hiện mẫu 2T2X → tiếp theo nên đánh Tài', source: 'AI HTDD' };
    } else if (last4.join(',') === 'Xỉu,Xỉu,Tài,Tài') {
      return { prediction: 'Xỉu', reason: '[AI] Phát hiện mẫu 2X2T → tiếp theo nên đánh Xỉu', source: 'AI HTDD' };
    }
  }

  if (history.length >= 9 && history.slice(-9).every(h => h.result === 'Xỉu')) {
    return { prediction: 'Tài', reason: '[AI] Chuỗi Xỉu quá dài (9 lần) → dự đoán Tài', source: 'AI HTDD' };
  }

  const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / (recentScores.length || 1);
  if (avgScore > 10) {
    return { prediction: 'Tài', reason: `[AI] Điểm trung bình cao (${avgScore.toFixed(1)}) → dự đoán Tài`, source: 'AI HTDD' };
  } else if (avgScore < 8) {
    return { prediction: 'Xỉu', reason: `[AI] Điểm trung bình thấp (${avgScore.toFixed(1)}) → dự đoán Xỉu`, source: 'AI HTDD' };
  }

  if (taiCount > xiuCount + 1) {
    return { prediction: 'Tài', reason: `[AI] Tài chiếm đa số (${taiCount}/${recentHistory.length}) → dự đoán Tài`, source: 'AI HTDD' };
  } else if (xiuCount > taiCount + 1) {
    return { prediction: 'Xỉu', reason: `[AI] Xỉu chiếm đa số (${xiuCount}/${recentHistory.length}) → dự đoán Xỉu`, source: 'AI HTDD' };
  } else {
    const overallTai = history.filter(h => h.result === 'Tài').length;
    const overallXiu = history.filter(h => h.result === 'Xỉu').length;
    if (overallTai > overallXiu) {
      return { prediction: 'Xỉu', reason: '[AI] Tổng thể Tài nhiều hơn → dự đoán Xỉu', source: 'AI HTDD' };
    } else {
      return { prediction: 'Tài', reason: '[AI] Tổng thể Xỉu nhiều hơn hoặc bằng → dự đoán Tài', source: 'AI HTDD' };
    }
  }
}

// Main prediction function
function generatePrediction(history, modelPredictions) {
  if (!history || history.length < 5) {
    console.log('Insufficient history, defaulting to Tài');
    return 'Tài'; // Default if insufficient data
  }

  const currentIndex = history[history.length - 1].session;

  // Initialize modelPredictions objects if not exists
  modelPredictions['trend'] = modelPredictions['trend'] || {};
  modelPredictions['short'] = modelPredictions['short'] || {};
  modelPredictions['mean'] = modelPredictions['mean'] || {};
  modelPredictions['switch'] = modelPredictions['switch'] || {};
  modelPredictions['bridge'] = modelPredictions['bridge'] || {};

  // Run models
  const trendPred = trendAndProb(history);
  const shortPred = shortPattern(history);
  const meanPred = meanDeviation(history);
  const switchPred = recentSwitch(history);
  const bridgePred = smartBridgeBreak(history);
  const aiPred = aiHtddLogic(history);

  // Store predictions
  modelPredictions['trend'][currentIndex] = trendPred;
  modelPredictions['short'][currentIndex] = shortPred;
  modelPredictions['mean'][currentIndex] = meanPred;
  modelPredictions['switch'][currentIndex] = switchPred;
  modelPredictions['bridge'][currentIndex] = bridgePred.prediction;

  // Evaluate model performance
  const modelScores = {
    trend: evaluateModelPerformance(history, 'trend'),
    short: evaluateModelPerformance(history, 'short'),
    mean: evaluateModelPerformance(history, 'mean'),
    switch: evaluateModelPerformance(history, 'switch'),
    bridge: evaluateModelPerformance(history, 'bridge')
  };

  // Weighted voting
  const weights = {
    trend: 0.25 * modelScores.trend,
    short: 0.2 * modelScores.short,
    mean: 0.2 * modelScores.mean,
    switch: 0.15 * modelScores.switch,
    bridge: 0.2 * modelScores.bridge,
    aihtdd: 0.3
  };

  let taiScore = 0;
  let xiuScore = 0;

  taiScore += (trendPred === 'Tài' ? weights.trend : 0);
  xiuScore += (trendPred === 'Xỉu' ? weights.trend : 0);
  taiScore += (shortPred === 'Tài' ? weights.short : 0);
  xiuScore += (shortPred === 'Xỉu' ? weights.short : 0);
  taiScore += (meanPred === 'Tài' ? weights.mean : 0);
  xiuScore += (meanPred === 'Xỉu' ? weights.mean : 0);
  taiScore += (switchPred === 'Tài' ? weights.switch : 0);
  xiuScore += (switchPred === 'Xỉu' ? weights.switch : 0);
  taiScore += (bridgePred.prediction === 'Tài' ? weights.bridge : 0);
  xiuScore += (bridgePred.prediction === 'Xỉu' ? weights.bridge : 0);
  taiScore += (aiPred.prediction === 'Tài' ? weights.aihtdd : 0);
  xiuScore += (aiPred.prediction === 'Xỉu' ? weights.aihtdd : 0);

  // Adjust for bad pattern
  if (isBadPattern(history)) {
    console.log('Bad pattern detected, reducing confidence');
    taiScore *= 0.7;
    xiuScore *= 0.7;
  }

  // Adjust for bridge break probability
  if (bridgePred.breakProb > 0.6) {
    console.log('High bridge break probability:', bridgePred.breakProb, bridgePred.reason);
    if (bridgePred.prediction === 'Tài') taiScore += 0.3; else xiuScore += 0.3;
  }

  const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
  console.log('Prediction:', { prediction: finalPrediction, reason: `${aiPred.reason} | ${bridgePred.reason}`, scores: { taiScore, xiuScore } });
  return finalPrediction;
}

// Export functions (if using module system)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectStreakAndBreak,
    evaluateModelPerformance,
    smartBridgeBreak,
    trendAndProb,
    shortPattern,
    meanDeviation,
    recentSwitch,
    isBadPattern,
    aiHtddLogic,
    generatePrediction
  };
}
  console.log(`🚀 Server Tai Xiu AI đang chạy tại http://localhost:${PORT}/taixiu`);
});
