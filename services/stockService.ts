import { StockData, StockRaw, StockTag, AppLanguage, CalculatorResult, StrategyResult, SwingScoreResult } from '../types';

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/health', { method: 'GET' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const searchStocks = async (query: string): Promise<StockRaw[]> => {
  if (!query) return [];
  try {
    const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const fetchStockData = async (symbol: string, lang: AppLanguage): Promise<StockData | null> => {
  try {
    const url = `http://localhost:3001/api/stock/${symbol}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const realData = await response.json();

    // Re-generate tags here to ensure language consistency
    return {
      ...realData,
      symbol: realData.symbol,
      tags: generateSwingTags(realData, lang), 
      updatedAt: Date.now(),
      lastTradeTime: realData.lastTradeTime, 
      isDelayed: realData.isDelayed,         
    };
  } catch (error) {
    console.error(`[StockService] ❌ Failed to fetch ${symbol}.`, error);
    return null; 
  }
};

// --- SWING TRADING TAGS (with Score Impacts) ---
const generateSwingTags = (data: StockData, lang: AppLanguage): StockTag[] => {
    const tags: StockTag[] = [];
    const t = lang === 'zh' ? TAGS_ZH : TAGS_EN;
    const { 
        price, vol5, vol20,
        ma20, ma60, ma240, 
        rsi
    } = data;

    // 1. Trend Persistence
    // STRONG_POS: MA20 > MA60
    if (ma20 > ma60) {
       tags.push({ label: t.trendBull, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descTrendBull, scoreImpact: 5 });
    }
    // POS: Price > MA20
    if (price > ma20) {
       tags.push({ label: t.aboveMa20, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descAboveMa20, scoreImpact: 3 });
    } else {
       tags.push({ label: t.belowMa20, type: 'NEGATIVE', category: 'TECHNICAL', desc: t.descBelowMa20, scoreImpact: -3 });
    }

    // 2. RSI Zone
    if (rsi >= 45 && rsi <= 65) {
        tags.push({ label: t.rsiSweet, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descRsiSweet, scoreImpact: 3 });
    } else if (rsi < 40) {
        tags.push({ label: t.rsiWeak, type: 'NEGATIVE', category: 'RISK', desc: t.descRsiWeak, scoreImpact: -3 });
    } else if (rsi > 75) {
        tags.push({ label: t.rsiHot, type: 'NEUTRAL', category: 'RISK', desc: t.descRsiHot, scoreImpact: -3 });
    }

    // 3. Volume
    if (vol5 >= vol20) {
        tags.push({ label: t.volStable, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descVolStable, scoreImpact: 3 });
    } else if (vol5 < vol20 * 0.7) {
        tags.push({ label: t.volDry, type: 'NEGATIVE', category: 'RISK', desc: t.descVolDry, scoreImpact: -3 });
    }

    // 4. Long Term
    if (price > ma240) tags.push({ label: t.ma240Bull, type: 'POSITIVE', category: 'TECHNICAL', scoreImpact: 3 });

    return tags;
};

// --- SWING SCORING ENGINE (Precise Implementation) ---
export const calculateSwingScore = (stock: StockData): SwingScoreResult => {
    let trendScore = 0;
    let momentumScore = 0;
    let volumeScore = 0;
    let riskScore = 25; // Base score, subtract for risks

    const { price, ma20, ma20Prev, ma60, rsi, vol5, vol20, atr } = stock;

    // 1. Trend Score (0–30)
    if (price > ma20) trendScore += 10;
    if (ma20 > ma60) trendScore += 10;
    // Use precise previous slope if available, otherwise proxy
    if (ma20Prev && ma20 > ma20Prev) trendScore += 10;
    else if (!ma20Prev && stock.ma5 > ma20) trendScore += 10; // Proxy fallback

    // 2. Momentum Score (0–25)
    if (rsi >= 45 && rsi <= 65) momentumScore += 15;
    else if (rsi >= 40 && rsi < 45) momentumScore += 8;
    else if (rsi > 70) momentumScore -= 5;
    
    // Price strength relative to ATR band
    if (price > ma20 + (atr * 0.3)) momentumScore += 10;

    // 3. Volume Score (0–20)
    if (vol5 >= vol20) volumeScore += 10;
    if (vol5 >= vol20 * 1.2) volumeScore += 5;
    if (vol5 < vol20 * 0.7) volumeScore -= 5;

    // 4. Risk Score (start from 25)
    if (rsi > 75) riskScore -= 5;
    if (atr > 0 && (atr / price) > 0.05) riskScore -= 5;
    if (price < ma20) riskScore -= 10; 

    // 5. Tag Score (Capped at +/- 15)
    let tagScore = 0;
    stock.tags.forEach(t => tagScore += (t.scoreImpact || 0));
    tagScore = Math.max(-15, Math.min(15, tagScore));

    const totalScore = Math.max(0, Math.min(100, trendScore + momentumScore + volumeScore + riskScore + tagScore));

    let action: 'ENTER' | 'WATCH' | 'AVOID' = 'AVOID';
    if (totalScore >= 85) action = 'ENTER';
    else if (totalScore >= 70) action = 'WATCH';

    return {
        totalScore,
        action,
        details: { trend: trendScore, momentum: momentumScore, volume: volumeScore, risk: riskScore }
    };
};

// --- SWING STRATEGY CALCULATION (Unchanged logic, just keeping file complete) ---
export const calculateSwingStrategies = (stock: StockData): StrategyResult[] => {
    const strategies: StrategyResult[] = [];
    const { ma20, ma60, atr, price } = stock;
    
    // Strategy 1: MA20 Pullback
    const m1_entryLow = ma20 * 0.995;
    const m1_entryHigh = ma20 * 1.01;
    const m1_stop = ma20 - (0.8 * atr); 
    const m1_target = ma20 + (2.5 * atr);
    
    const m1_cond = price >= m1_entryLow * 0.99 && price <= m1_entryHigh * 1.01 && ma20 > ma60;

    strategies.push({
        id: 'MA20',
        name: 'MA20 回測波段',
        desc: '趨勢核心：等待股價回測 MA20 附近 (±1%)，ATR 防守。',
        entryPrice: parseFloat(m1_entryLow.toFixed(2)),
        entryPriceHigh: parseFloat(m1_entryHigh.toFixed(2)),
        stopLoss: parseFloat(m1_stop.toFixed(2)),
        targetPrice: parseFloat(m1_target.toFixed(2)),
        riskRewardRatio: 2.5,
        conditionMet: m1_cond,
        note: m1_cond ? '價格位於回測甜蜜區' : '等待回測 MA20'
    });

    // Strategy 2: ATR Volatility
    const m2_limit = ma20 + (1.5 * atr);
    const m2_entry = Math.min(price, m2_limit);
    const m2_stop = m2_entry - (1.5 * atr);
    const m2_target = m2_entry + (3 * atr);
    
    strategies.push({
        id: 'ATR',
        name: 'ATR 波動量化',
        desc: '量化佈局：以 1.5 倍 ATR 為停損，抓 3 倍 ATR 獲利。',
        entryPrice: parseFloat(m2_entry.toFixed(2)),
        stopLoss: parseFloat(m2_stop.toFixed(2)),
        targetPrice: parseFloat(m2_target.toFixed(2)),
        riskRewardRatio: 2.0,
        conditionMet: atr > 0, 
        note: '依據波動率動態設定'
    });

    // Strategy 3: Structural Support
    const structuralSupport = Math.max(ma60, ma20 * 0.95);
    const m3_entry = structuralSupport * 1.01;
    const m3_stop = structuralSupport - (1.0 * atr);
    const m3_target = m3_entry + (2.5 * atr);
    
    const m3_cond = price >= structuralSupport && price <= structuralSupport * 1.03;

    strategies.push({
        id: 'STRUCT',
        name: '結構支撐 (MA60)',
        desc: '波段低接：以季線 (MA60) 或結構支撐為防守點。',
        entryPrice: parseFloat(m3_entry.toFixed(2)),
        stopLoss: parseFloat(m3_stop.toFixed(2)),
        targetPrice: parseFloat(m3_target.toFixed(2)),
        riskRewardRatio: 2.5,
        conditionMet: m3_cond,
        note: m3_cond ? '接近結構支撐區' : '距離支撐仍有空間'
    });

    return strategies;
}


const TAGS_ZH = {
    trendBull: '多頭排列 (MA20>60)',
    descTrendBull: '中短期均線呈現多頭排列，波段結構健康',
    aboveMa20: '站上月線',
    descAboveMa20: '股價在 20 日均線之上，短線強勢',
    belowMa20: '跌破月線',
    descBelowMa20: '股價在 20 日均線之下，短線轉弱',
    rsiSweet: 'RSI 甜蜜區 (45-65)',
    descRsiSweet: 'RSI 位於波段最佳攻擊區間，動能充沛且未過熱',
    rsiWeak: 'RSI 轉弱 (<40)',
    descRsiWeak: 'RSI 跌破 40，波段動能可能失速',
    rsiHot: 'RSI 過熱 (>75)',
    descRsiHot: 'RSI 過高，隨時可能震盪整理',
    volStable: '量能穩定',
    descVolStable: '成交量大於 20 日均量，推升力道足夠',
    volDry: '量能退潮',
    descVolDry: '成交量明顯萎縮，波段可能進入整理',
    ma240Bull: '年線之上',
};

const TAGS_EN = {
    trendBull: 'Trend Bull (20>60)',
    descTrendBull: 'MA20 > MA60. Healthy swing structure.',
    aboveMa20: 'Above MA20',
    descAboveMa20: 'Price > MA20. Short term strength.',
    belowMa20: 'Below MA20',
    descBelowMa20: 'Price < MA20. Weakness.',
    rsiSweet: 'RSI Sweet Spot',
    descRsiSweet: 'RSI 45-65. Best zone for swing trades.',
    rsiWeak: 'RSI Weak (<40)',
    descRsiWeak: 'Momentum failing.',
    rsiHot: 'RSI Hot (>75)',
    descRsiHot: 'Extended. Expect chop.',
    volStable: 'Vol Stable',
    descVolStable: 'Vol > Vol20. Good participation.',
    volDry: 'Vol Drying',
    descVolDry: 'Low volume. Interest fading.',
    ma240Bull: 'Above MA240',
};

export const calculateInvestment = (
  amountTWD: number,
  stockData: StockData,
  mode: 'SHORT_TERM' | 'LONG_TERM'
): CalculatorResult => {
  const isTW = stockData.market.includes('Tai') || stockData.currency === 'TWD';
  const exchangeRate = isTW ? 1 : 32.5; 
  
  const atrRisk = stockData.atr > 0 ? (stockData.atr * 1.5) : (stockData.price * 0.05);
  const stopLossPrice = mode === 'SHORT_TERM' 
      ? stockData.price - atrRisk 
      : stockData.price * 0.9;
  
  const entrySuggestion = stockData.price; 
  const shares = Math.floor(amountTWD / (entrySuggestion * exchangeRate));
  
  const targetPrice = mode === 'SHORT_TERM' 
      ? entrySuggestion + (stockData.atr > 0 ? stockData.atr * 3 : stockData.price * 0.15)
      : entrySuggestion * 1.2;

  const potentialGain = (targetPrice - entrySuggestion) * shares * exchangeRate;
  const potentialPercent = ((targetPrice - entrySuggestion) / entrySuggestion) * 100;

  return {
    investAmountTWD: amountTWD,
    sharePrice: stockData.price,
    exchangeRate,
    shares,
    entrySuggestion: parseFloat(entrySuggestion.toFixed(2)),
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    potentialGain: parseFloat(potentialGain.toFixed(0)),
    potentialGainPercent: parseFloat(potentialPercent.toFixed(2)),
    stopLossPrice: parseFloat(stopLossPrice.toFixed(2)),
    riskRewardRatio: mode === 'SHORT_TERM' ? '1 : 2.0' : 'N/A (Value)'
  };
};