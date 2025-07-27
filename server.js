
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
let gameHistory = [];
let isInitialized = false;
let modelPredictions = {
  trend: {},
  short: {},
  mean: {},
  switch: {},
  bridge: {}
};

// === Advanced AI Algorithm ===
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
function generatePrediction(history) {
  // Nếu không có lịch sử hoặc lịch sử dưới 5 bản ghi, trả về dự đoán ngẫu nhiên
  if (!history || history.length < 5) {
    console.log('Không đủ lịch sử, chọn ngẫu nhiên giữa Tài và Xỉu');
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
  console.log('Dự đoán:', { prediction: finalPrediction, reason: `${aiPred.reason} | ${bridgePred.reason}`, scores: { taiScore, xiuScore } });
  return finalPrediction;
}

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
let reconnectCount = 0;
let isConnecting = false;
let lastSessionReceived = null;
let sessionCheckInterval = null;
let consecutiveFailures = 0;

// Kiểm tra phiên bị đứng
function checkSessionHealth() {
  const now = Date.now();
  const lastGameTime = gameHistory.length > 0 ? gameHistory[gameHistory.length - 1].timestamp : now;
  const timeSinceLastGame = now - lastGameTime;
  
  // Nếu không có game nào trong 3 phút, coi như bị đứng phiên
  if (timeSinceLastGame > 180000) {
    console.log('[⚠️] Phát hiện bị đứng phiên, force reconnect...');
    if (ws) {
      ws.terminate();
    }
    connectWebSocket();
  }
}

function connectWebSocket() {
  if (isConnecting) {
    console.log('[⏳] Đang trong quá trình kết nối, bỏ qua...');
    return;
  }
  
  isConnecting = true;
  
  // Chỉ tăng consecutiveFailures khi thực sự fail, không phải mỗi lần gọi
  // consecutiveFailures++; // Di chuyển xuống ws.on('error')
  
  // Dynamic backoff dựa trên số lần thất bại liên tiếp
  let backoffDelay = 2000;
  if (consecutiveFailures <= 3) {
    backoffDelay = 2000;
  } else if (consecutiveFailures <= 6) {
    backoffDelay = 5000;
  } else if (consecutiveFailures <= 10) {
    backoffDelay = 10000;
  } else {
    backoffDelay = 30000;
  }
  
  console.log(`[🔄] Kết nối lần ${consecutiveFailures}, delay: ${backoffDelay}ms`);
  
  // Multiple backup tokens để tránh bị chặn
  const tokens = [
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsImdlbmRlciI6MCwiZGlzcGxheU5hbWUiOiJ0YW9sYWJpbmgxMjk5IiwicGhvbmVWZXJpZmllZCI6ZmFsc2UsImJvdCI6MCwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzAyLnBuZyIsInVzZXJJZCI6IjZhNWNmN2NmLTQ0ODYtNGJlNS1hMDIzLTUyOTkyOGUyZDg1YyIsInJlZ1RpbWUiOjE3NTI3NjcyOTk2OTgsInBob25lIjoiIiwiY3VzdG9tZXJJZCI6MjgzNTEyODQ1LCJicmFuZCI6InN1bi53aW4iLCJ1c2VybmFtZSI6IlNDX2FuaGxhdHJ1bWFwaTEiLCJ0aW1lc3RhbXAiOjE3NTI3ODczMDg2NTl9.5PQjsPsm2G7SyEnAbNqXtxkxYlMQIwcJpxjh1l_hH6c",
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJhcGlzdW53aW52YyIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOmZhbHNlLCJwbGF5RXZlbnRMb2JieSI6ZmFsc2UsImN1c3RvbWVySWQiOjI3NjQ3ODE3MywiYWZmSWQiOiJkOTNkM2Q4NC1mMDY5LTRiM2YtOGRhYy1iNDcxNmE4MTIxNDMiLCJiYW5uZWQiOmZhbHNlLCJicmFuZCI6InN1bi53aW4iLCJ0aW1lc3RhbXAiOjE3NTM0MjQ1MTk4MTEsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjpmYWxzZSwiaXBBZGRyZXNzIjoiMjAwMTplZTA6NTcwODo3NzAwOmYxNTE6ZGVkYzpjNWFkOjZiYzMiLCJtdXRlIjpmYWxzZSwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzIwLnBuZyIsInBsYXRmb3JtSWQiOjUsInVzZXJJZCI6ImQ5M2QzZDg0LWYwNjktNGIzZi04ZGFjLWI0NzE2YTgxMjE0MyIsInJlZ1RpbWUiOjE3NTIwNDU4OTMyOTIsInBob25lIjoiIiwiZGVwb3NpdCI6ZmFsc2UsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.DkO6wd7li1GW3w2CtB7XMK790uduElJZwpw38DdWKW4"
  ];
  
  const currentToken = tokens[consecutiveFailures % tokens.length];
  
  ws = new WebSocket(
    `wss://websocket.azhkthg1.net/websocket?token=${currentToken}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://play.sun.win",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    }
  );

  ws.on('open', () => {
    console.log('[✅] Đã kết nối WebSocket thành công');
    isConnecting = false;
    
    // Chỉ reset consecutiveFailures khi thực sự stable (nhận được data)
    // consecutiveFailures = 0; // KHÔNG reset ngay lập tức
    
    if (!isInitialized) {
      console.log(`[📊] Khởi tạo lần đầu. Lịch sử hiện tại: ${gameHistory.length} phiên`);
      isInitialized = true;
    } else {
      console.log(`[🔄] Reconnect thành công. Lịch sử được bảo toàn: ${gameHistory.length} phiên`);
      
      // Tái tạo pattern từ lịch sử hiện tại
      if (gameHistory.length > 0) {
        const patternHistory = gameHistory.map(h => h.result === 'Tài' ? 'T' : 'X');
        const patternStr = patternHistory.join("");
        console.log(`[🔄] Pattern được khôi phục: ${patternStr}`);
        
        // Cập nhật currentData với pattern mới
        if (currentData.pattern !== patternStr) {
          currentData.pattern = patternStr;
          console.log(`[🔄] Đã cập nhật pattern: ${patternStr}`);
        }
      }
    }
    
    // Gửi message với delay để tránh spam
    messagesToSend.forEach((msg, i) => {
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
          console.log(`[📤] Đã gửi message ${i + 1}/${messagesToSend.length}`);
        }
      }, (i * 800) + 1000); // Delay hợp lý
    });

    // Ping định kỳ
    clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 20000);
    
    // Kiểm tra session health
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = setInterval(checkSessionHealth, 60000); // Kiểm tra mỗi phút
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (Array.isArray(data) && typeof data[1] === 'object') {
        const cmd = data[1].cmd;

        if (cmd === 1008 && data[1].sid) {
          const newSessionId = data[1].sid;
          if (newSessionId !== id_phien_chua_co_kq) {
            id_phien_chua_co_kq = newSessionId;
            lastSessionReceived = Date.now();
            console.log(`📋 Phiên mới bắt đầu: ${newSessionId}`);
            
            // Reset consecutive failures khi nhận được data thực tế
            if (consecutiveFailures > 0) {
              console.log(`[✅] Kết nối ổn định, reset consecutive failures từ ${consecutiveFailures} về 0`);
              consecutiveFailures = 0;
            }
          }
        }

        if (cmd === 1003 && data[1].gBB && id_phien_chua_co_kq) {
          const { d1, d2, d3 } = data[1];
          const total = d1 + d2 + d3;
          const result = total > 10 ? "Tài" : "Xỉu";

          // Check if this session already exists in history to prevent duplicates
          const existingSession = gameHistory.find(h => h.session === id_phien_chua_co_kq);
          if (!existingSession) {
            // Add to game history
            gameHistory.push({
              session: id_phien_chua_co_kq,
              result: result,
              totalScore: total,
              dice: [d1, d2, d3],
              timestamp: Date.now()
            });

            // Keep only last 100 games for performance
            if (gameHistory.length > 100) {
              gameHistory = gameHistory.slice(-100);
            }

            // Generate AI prediction for next game
            const prediction = generatePrediction(gameHistory);

            // Generate correct pattern string
            const patternHistory = gameHistory.map(h => h.result === 'Tài' ? 'T' : 'X');
            const patternStr = patternHistory.join("");

            // Advanced pattern detection
            let byPattern = "AI Algorithm";
            const { streak, currentResult } = detectStreakAndBreak(gameHistory);
            
            if (gameHistory.length >= 3) {
              const last3Results = gameHistory.slice(-3).map(h => h.result);
              const last3Pattern = last3Results.join("-");
              
              if (last3Pattern === 'Tài-Xỉu-Tài') byPattern = "Mẫu 1T1X";
              else if (last3Pattern === 'Xỉu-Tài-Xỉu') byPattern = "Mẫu 1X1T";
              else if (last3Pattern === 'Tài-Tài-Xỉu') byPattern = "Mẫu 2T";
              else if (last3Pattern === 'Xỉu-Xỉu-Tài') byPattern = "Mẫu 2X";
              else if (streak >= 3) byPattern = `Cầu ${streak} ${currentResult}`;
              else if (patternStr.slice(-6).includes('TTT')) byPattern = "Cầu Tài dài";
              else if (patternStr.slice(-6).includes('XXX')) byPattern = "Cầu Xỉu dài";
              else byPattern = "Theo thuật toán";
            }

            currentData = {
              phien_cu: id_phien_chua_co_kq,
              ket_qua: result,
              xuc_xac: [d1, d2, d3],
              phien_moi: id_phien_chua_co_kq + 1,
              pattern: patternStr,
              By: byPattern,
              du_doan: prediction,
              id: "@axobantool"
            };

            console.log(`🎲 Phiên ${id_phien_chua_co_kq}: ${d1}-${d2}-${d3} = ${total} (${result}) → Pattern: ${patternStr} → By: ${byPattern} → AI Dự đoán: ${prediction}`);
          }
          
          id_phien_chua_co_kq = null;
        }
      }
    } catch (e) {
      console.error('[❌] Lỗi xử lý:', e.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[🔌] WebSocket đóng kết nối. Code: ${code}, Reason: ${reason || 'Unknown'}`);
    isConnecting = false;
    clearInterval(pingInterval);
    clearInterval(sessionCheckInterval);
    
    // Clear existing timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    // KHÔNG reset consecutiveFailures ở đây để giữ pattern
    
    // Reconnect logic với điều kiện tốt hơn
    if (consecutiveFailures < 20) { // Tăng số lần thử
      let delay = 2000; // Fixed delay thay vì dùng backoffDelay undefined
      
      // Nếu là lỗi 403, chờ lâu hơn
      if (code === 1006 && reason && reason.includes('403')) {
        delay = 60000; // 1 phút
        console.log('[🚫] Lỗi 403, chờ 60s trước khi reconnect...');
      }
      
      console.log(`[⏳] Sẽ reconnect sau ${delay}ms... (Lịch sử được bảo toàn: ${gameHistory.length} phiên)`);
      
      reconnectTimeout = setTimeout(() => {
        if (!isConnecting) {
          connectWebSocket();
        }
      }, delay);
    } else {
      console.log('[❌] Dừng reconnect do quá nhiều lỗi liên tiếp');
      // Reset sau 5 phút để thử lại
      setTimeout(() => {
        consecutiveFailures = 0;
        connectWebSocket();
      }, 300000);
    }
  });

  ws.on('error', (err) => {
    console.error('[⚠️] WebSocket lỗi:', err.message);
    isConnecting = false;
    consecutiveFailures++; // Chỉ tăng khi có lỗi thực sự
  });

  // Timeout kết nối
  setTimeout(() => {
    if (ws && ws.readyState === WebSocket.CONNECTING) {
      console.log('[⏰] Timeout kết nối WebSocket, hủy và thử lại...');
      ws.terminate();
      isConnecting = false;
    }
  }, 10000);
}

// === API ===
app.get('/axobantol', (req, res) => {
  res.json(currentData);
});

app.get('/history', (req, res) => {
  const wsStatus = ws ? 
    (ws.readyState === 0 ? 'Connecting' : 
     ws.readyState === 1 ? 'Connected' : 
     ws.readyState === 2 ? 'Closing' : 'Closed') : 'Not initialized';
     
  res.json({
    total_games: gameHistory.length,
    last_10_games: gameHistory.slice(-10),
    current_pattern: currentData.pattern,
    current_by: currentData.By,
    websocket_status: wsStatus,
    reconnect_count: reconnectCount,
    is_connecting: isConnecting,
    current_session: id_phien_chua_co_kq
  });
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🎯 SunWin Tài Xỉu AI</h2>
    <p><a href="/axobantol">Xem JSON kết quả</a></p>
    <p><a href="/history">Xem lịch sử game</a></p>
    <p>Tổng phiên đã ghi: ${gameHistory.length}</p>
  `);
});

// === Khởi động server ===
app.listen(PORT, () => {
  console.log(`[🌐] Server đang chạy tại http://localhost:${PORT}`);
  connectWebSocket();
});
