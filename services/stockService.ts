import { StockData, StockRaw, StockTag, AppLanguage, CalculatorResult } from '../types';

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

    return {
      ...realData,
      symbol: realData.symbol,
      tags: generateAdvancedTags(realData, lang),
      updatedAt: Date.now(),
      lastTradeTime: realData.lastTradeTime, // Pass through from backend
      isDelayed: realData.isDelayed,         // Pass through from backend
    };
  } catch (error) {
    console.error(`[StockService] ❌ Failed to fetch ${symbol}.`, error);
    return null; 
  }
};

// --- ADVANCED TAG GENERATION LOGIC (Based on User Checklist) ---
const generateAdvancedTags = (data: StockData, lang: AppLanguage): StockTag[] => {
    const tags: StockTag[] = [];
    const t = lang === 'zh' ? TAGS_ZH : TAGS_EN;
    const { 
        price, volume, vol5, avgVolume, 
        ma5, ma10, ma20, ma60, ma120, ma240, 
        rsi, macdHist, atr,
        roe, revenueYoy, institutionalOwnership
    } = data;

    // --- Short Term & Swing Strategy ---
    
    // 1. Structure (Price vs MA20)
    if (price > ma20) {
       tags.push({ label: t.aboveMa20, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descAboveMa20 });
    } else {
       tags.push({ label: t.belowMa20, type: 'NEGATIVE', category: 'TECHNICAL', desc: t.descBelowMa20 });
    }

    // 2. Trend (MA Slope Alignment)
    // Multiverse: 5 > 10 > 20
    if (ma5 > ma10 && ma10 > ma20) {
        tags.push({ label: t.maBull, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descMaBull });
    }

    // 3. Volume
    // Breakout Volume: Current Volume > VOL5
    if (volume > vol5) {
        tags.push({ label: t.volStrong, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descVolStrong });
    }
    // No volume
    if (volume < avgVolume * 0.6) {
        tags.push({ label: t.volWeak, type: 'NEUTRAL', category: 'TECHNICAL', desc: t.descVolWeak });
    }

    // 4. Momentum (RSI)
    if (rsi > 50) tags.push({ label: t.rsiBull, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descRsiBull });
    if (rsi > 75) tags.push({ label: t.rsiOver, type: 'NEGATIVE', category: 'RISK', desc: t.descRsiOver });
    if (rsi < 30) tags.push({ label: t.rsiUnder, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descRsiUnder });

    // --- Long Term Strategy ---
    
    // 1. Life Line (MA240)
    if (price > ma240) {
        tags.push({ label: t.trendLongBull, type: 'POSITIVE', category: 'TECHNICAL', desc: t.descTrendLongBull });
    } else {
        tags.push({ label: t.trendLongBear, type: 'NEGATIVE', category: 'RISK', desc: t.descTrendLongBear });
    }

    // 2. Fundamentals
    if (roe > 15) tags.push({ label: t.highRoe, type: 'POSITIVE', category: 'FUNDAMENTAL', desc: t.descHighRoe });
    if (revenueYoy > 0) tags.push({ label: t.revGrowth, type: 'POSITIVE', category: 'FUNDAMENTAL', desc: t.descRevGrowth });
    
    // 3. Chips
    if (institutionalOwnership > 40) tags.push({ label: t.instHeavy, type: 'POSITIVE', category: 'CHIPS', desc: t.descInstHeavy });

    return tags;
};

const TAGS_ZH = {
    aboveMa20: '站上月線 (MA20)',
    descAboveMa20: '股價在 20 日均線之上，短線趨勢偏多',
    belowMa20: '跌破月線 (弱)',
    descBelowMa20: '股價在 20 日均線之下，短線趨勢偏空',
    maBull: '均線多頭',
    descMaBull: 'MA5 > MA10 > MA20，均線呈現多頭排列，上漲動能強',
    volStrong: '成交量 > 5日均量',
    descVolStrong: '今日成交量大於過去 5 日平均，有量能支持',
    volWeak: '量縮',
    descVolWeak: '成交量萎縮，市場觀望或整理中',
    rsiBull: 'RSI > 50 (強)',
    descRsiBull: '相對強弱指標大於 50，買方力道較強',
    rsiOver: 'RSI 過熱',
    descRsiOver: 'RSI > 75，短線可能過熱，留意回檔風險',
    rsiUnder: 'RSI 超跌',
    descRsiUnder: 'RSI < 30，短線乖離過大，可能反彈',
    trendLongBull: '年線 (MA240) 之上',
    descTrendLongBull: '股價在年線之上，長期趨勢看好',
    trendLongBear: '年線 (MA240) 之下',
    descTrendLongBear: '股價在年線之下，長期趨勢偏空',
    highRoe: '高 ROE (>15%)',
    descHighRoe: '股東權益報酬率高，公司運用資金效率佳',
    revGrowth: '營收成長',
    descRevGrowth: '營收年增率為正，基本面有成長動力',
    instHeavy: '法人持股高',
    descInstHeavy: '法人持股 > 40%，籌碼相對穩定'
};

const TAGS_EN = {
    aboveMa20: 'Above MA20',
    descAboveMa20: 'Price is above the 20-day moving average, bullish signal.',
    belowMa20: 'Below MA20',
    descBelowMa20: 'Price is below the 20-day moving average, bearish signal.',
    maBull: 'MA Bullish',
    descMaBull: 'MA5 > MA10 > MA20. Moving averages aligned for uptrend.',
    volStrong: 'Vol > Vol5',
    descVolStrong: 'Current volume exceeds 5-day average, confirming momentum.',
    volWeak: 'Low Vol',
    descVolWeak: 'Volume is low, indicating consolidation or lack of interest.',
    rsiBull: 'RSI > 50',
    descRsiBull: 'RSI above 50 indicates bullish momentum.',
    rsiOver: 'RSI Overbought',
    descRsiOver: 'RSI > 75. Price might be overextended.',
    rsiUnder: 'RSI Oversold',
    descRsiUnder: 'RSI < 30. Price might be oversold.',
    trendLongBull: 'Above MA240',
    descTrendLongBull: 'Price above 240-day average. Long-term trend is up.',
    trendLongBear: 'Below MA240',
    descTrendLongBear: 'Price below 240-day average. Long-term trend is down.',
    highRoe: 'High ROE',
    descHighRoe: 'Return on Equity > 15%. Efficient capital use.',
    revGrowth: 'Rev Growth',
    descRevGrowth: 'Revenue is growing year-over-year.',
    instHeavy: 'High Inst. Own',
    descInstHeavy: 'Institutional ownership > 40%.'
};

export const calculateInvestment = (
  amountTWD: number,
  stockData: StockData,
  mode: 'SHORT_TERM' | 'LONG_TERM'
): CalculatorResult => {
  const isTW = stockData.market.includes('Tai') || stockData.currency === 'TWD';
  const exchangeRate = isTW ? 1 : 32.5; 
  
  // Stop Loss Logic
  // Short Term: 1.5 * ATR (Volatility based)
  // Long Term: 10% Trailing or Support based (Simplified to 10% here)
  const atrRisk = stockData.atr > 0 ? (stockData.atr * 1.5) : (stockData.price * 0.05);
  const stopLossPrice = mode === 'SHORT_TERM' 
      ? stockData.price - atrRisk 
      : stockData.price * 0.9;
  
  const entrySuggestion = stockData.price; 
  const shares = Math.floor(amountTWD / (entrySuggestion * exchangeRate));
  
  // Target Logic
  // Short Term: Entry + 2 * ATR (Reward is roughly 1.33x Risk if Risk is 1.5 ATR)
  // Long Term: Entry + 20% (Standard Value Investing Target)
  const targetPrice = mode === 'SHORT_TERM' 
      ? entrySuggestion + (stockData.atr > 0 ? stockData.atr * 2 : stockData.price * 0.1)
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
    riskRewardRatio: mode === 'SHORT_TERM' ? '1 : 1.3' : 'N/A (Value)'
  };
};