import {
  StockData,
  StockRaw,
  StockTag,
  AppLanguage,
  InvestmentMode,
  CalculatorResult,
  StrategyResult,
  SwingScoreResult,
  LongTermScoreResult,
  EtfScoreResult,
  ShortTermInvestmentPlan,
  LongTermInvestmentPlan,
  EtfInvestmentPlan
} from '../types';

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

const KNOWN_ETF_SYMBOLS = new Set([
  'QQQ', 'SPY', 'VTI', 'VOO', 'IVV', 'DIA', 'ARKK', 'SOXX', 'IWM', 'EFA',
  'VNQ', 'XLK', 'XLE', 'XLF', 'XLY', 'XLP', 'XLI', 'XLB', 'XLV', 'XLC', 'XLU'
]);

const inferAssetType = (data: Partial<StockData>): 'STOCK' | 'ETF' => {
  if (data.assetType === 'ETF') return 'ETF';
  const symbol = (data.symbol || '').toUpperCase();
  const name = (data.name || data.nameEn || '').toUpperCase();

  if (KNOWN_ETF_SYMBOLS.has(symbol)) return 'ETF';
  if (name.includes('ETF') || name.includes('FUND') || name.includes('指數')) return 'ETF';
  if (/^00\d{2}(\.TW)?$/.test(symbol) || /^01\d{2}(\.TW)?$/.test(symbol)) return 'ETF';
  if (symbol.endsWith('.TW') && (symbol.startsWith('00') || symbol.startsWith('01'))) return 'ETF';
  return 'STOCK';
};

const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits));

export const fetchStockData = async (symbol: string, lang: AppLanguage): Promise<StockData | null> => {
  try {
    const url = `http://localhost:3001/api/stock/${symbol}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const realData = await response.json();
    const assetType = inferAssetType(realData);
    const stockData: StockData = {
      ...realData,
      symbol: realData.symbol,
      assetType,
      tags: [],
      updatedAt: Date.now(),
      lastTradeTime: realData.lastTradeTime,
      isDelayed: realData.isDelayed,
      recentHistorySample: Array.isArray(realData.recentHistorySample) ? realData.recentHistorySample : []
    };

    const defaultMode: InvestmentMode = assetType === 'ETF' ? 'ETF' : 'SHORT_TERM';
    stockData.tags = generateTags(stockData, assetType, lang, defaultMode);

    return stockData;
  } catch (error) {
    console.error(`[StockService] ❌ Failed to fetch ${symbol}.`, error);
    return null; 
  }
};

// --- TAGS (Used for UI Badges) ---
type TagKey = keyof typeof TAG_TEXT['en'];

interface TagRule {
  key: TagKey;
  category: StockTag['category'];
  type: StockTag['type'];
  impact: number;
  condition: (stock: StockData) => boolean;
}

const TAG_TEXT = {
  en: {
    trendBull: { label: 'Trend Bull (MA20>MA60)', desc: 'Short-term averages aligned bullishly.' },
    aboveMa20: { label: 'Above MA20', desc: 'Price trades above the 20-day moving average.' },
    belowMa20: { label: 'Below MA20', desc: 'Price slipped under the 20-day moving average.' },
    rsiSweet: { label: 'RSI Sweet Spot', desc: 'RSI between 45 and 65 keeps momentum balanced.' },
    rsiWeak: { label: 'RSI Weakening', desc: 'RSI below 40 signals fading momentum.' },
    rsiHot: { label: 'RSI Overheated', desc: 'RSI above 75 indicates overextended price action.' },
    ma240Bull: { label: 'Above MA240', desc: 'Price maintains above the annual moving average.' },
    ltAboveMa240: { label: 'Price Above Year-line', desc: 'Price remains above MA240 support.' },
    ltMa240Up: { label: 'MA240 Rising', desc: 'Year-line slope is turning higher.' },
    ltDrawdownSafe: { label: 'Controlled Drawdown', desc: 'Distance to MA240 stays within -20%.' },
    ltDrawdownDeep: { label: 'Deep Drawdown', desc: 'Price falls more than 20% below MA240.' },
    ltLowVol: { label: 'Low Volatility', desc: 'ATR-to-price ratio stays below 3%.' },
    ltHighVol: { label: 'Elevated Volatility', desc: 'ATR-to-price ratio exceeds 5%.' },
    ltMa60Support: { label: 'MA60 Supportive', desc: 'MA60 holds above MA240, structure intact.' },
    etfAboveMa240: { label: 'ETF Above Year-line', desc: 'ETF price remains above MA240.' },
    etfMa240Up: { label: 'Year-line Rising', desc: 'MA240 trend continues upward.' },
    etfLowVolatility: { label: 'Low Volatility ETF', desc: 'ATR-to-price ratio below 2.5%.' },
    etfNearMa240: { label: 'Near Year-line', desc: 'Price stays within ±3% of MA240.' },
    etfBelowMa240: { label: 'Below Year-line', desc: 'Price drops below MA240 support.' },
    etfHighVolatility: { label: 'High Volatility ETF', desc: 'ATR-to-price ratio above 4%.' }
  },
  zh: {
    trendBull: { label: '多頭排列 (MA20>60)', desc: '短中期均線呈現多頭排列，結構健康。' },
    aboveMa20: { label: '站上月線', desc: '股價在 20 日均線之上，短線維持強勢。' },
    belowMa20: { label: '跌破月線', desc: '股價跌破 20 日均線，短線轉弱。' },
    rsiSweet: { label: 'RSI 甜蜜區', desc: 'RSI 落在 45-65，動能充沛且不過熱。' },
    rsiWeak: { label: 'RSI 轉弱', desc: 'RSI 跌破 40，波段動能衰退。' },
    rsiHot: { label: 'RSI 過熱', desc: 'RSI 高於 75，留意震盪修正。' },
    ma240Bull: { label: '年線之上', desc: '股價守在年線之上，趨勢完好。' },
    ltAboveMa240: { label: '站穩年線', desc: '股價高於 MA240，長期支撐穩固。' },
    ltMa240Up: { label: '年線上揚', desc: 'MA240 斜率向上，長期趨勢走強。' },
    ltDrawdownSafe: { label: '回檔可控', desc: '與年線距離維持在 -20% 以內。' },
    ltDrawdownDeep: { label: '深度回檔', desc: '低於年線超過 20%，需保守因應。' },
    ltLowVol: { label: '低波動', desc: 'ATR 佔比低於 3%，波動風險有限。' },
    ltHighVol: { label: '波動偏高', desc: 'ATR 佔比超過 5%，需控管部位。' },
    ltMa60Support: { label: '半年線托底', desc: 'MA60 高於 MA240，結構完整。' },
    etfAboveMa240: { label: 'ETF 站上年線', desc: 'ETF 價格維持在 MA240 上方。' },
    etfMa240Up: { label: 'ETF 年線上揚', desc: 'MA240 持續向上，長期多頭。' },
    etfLowVolatility: { label: 'ETF 低波動', desc: 'ATR 佔比低於 2.5%，波動溫和。' },
    etfNearMa240: { label: '貼近年線', desc: '價格與 MA240 距離不超過 ±3%。' },
    etfBelowMa240: { label: '跌破年線', desc: '價格跌破 MA240，趨勢轉弱。' },
    etfHighVolatility: { label: 'ETF 高波動', desc: 'ATR 佔比高於 4%，波動加劇。' }
  }
} as const;

const SHORT_TERM_TAG_RULES: TagRule[] = [
  {
    key: 'trendBull',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 5,
    condition: (stock) => stock.ma20 > stock.ma60
  },
  {
    key: 'aboveMa20',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 3,
    condition: (stock) => stock.price > stock.ma20
  },
  {
    key: 'belowMa20',
    category: 'TECHNICAL',
    type: 'NEGATIVE',
    impact: -3,
    condition: (stock) => stock.price <= stock.ma20
  },
  {
    key: 'rsiSweet',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 3,
    condition: (stock) => stock.rsi >= 45 && stock.rsi <= 65
  },
  {
    key: 'rsiHot',
    category: 'RISK',
    type: 'NEUTRAL',
    impact: -3,
    condition: (stock) => stock.rsi > 75
  },
  {
    key: 'rsiWeak',
    category: 'TECHNICAL',
    type: 'NEGATIVE',
    impact: -4,
    condition: (stock) => stock.rsi < 40
  },
  {
    key: 'ma240Bull',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 3,
    condition: (stock) => stock.price > stock.ma240
  }
];

const LONG_TERM_TAG_RULES: TagRule[] = [
  {
    key: 'ltAboveMa240',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 5,
    condition: (stock) => stock.price > stock.ma240
  },
  {
    key: 'ltMa240Up',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 4,
    condition: (stock) => (stock.ma240Prev ? stock.ma240 > stock.ma240Prev : stock.price > stock.ma240)
  },
  {
    key: 'ltMa60Support',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 3,
    condition: (stock) => stock.ma60 > stock.ma240
  },
  {
    key: 'ltDrawdownSafe',
    category: 'RISK',
    type: 'POSITIVE',
    impact: 5,
    condition: (stock) => stock.ma240 > 0 && (stock.price - stock.ma240) / stock.ma240 > -0.2
  },
  {
    key: 'ltDrawdownDeep',
    category: 'RISK',
    type: 'NEGATIVE',
    impact: -5,
    condition: (stock) => stock.ma240 > 0 && (stock.price - stock.ma240) / stock.ma240 <= -0.2
  },
  {
    key: 'ltLowVol',
    category: 'RISK',
    type: 'POSITIVE',
    impact: 4,
    condition: (stock) => stock.price > 0 && stock.atr > 0 && (stock.atr / stock.price) < 0.03
  },
  {
    key: 'ltHighVol',
    category: 'RISK',
    type: 'NEGATIVE',
    impact: -4,
    condition: (stock) => stock.price > 0 && stock.atr > 0 && (stock.atr / stock.price) > 0.05
  }
];

const ETF_TAG_RULES: TagRule[] = [
  {
    key: 'etfAboveMa240',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 8,
    condition: (stock) => stock.price > stock.ma240
  },
  {
    key: 'etfMa240Up',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 5,
    condition: (stock) => stock.ma240Prev ? stock.ma240 > stock.ma240Prev : stock.price > stock.ma240
  },
  {
    key: 'etfLowVolatility',
    category: 'RISK',
    type: 'POSITIVE',
    impact: 5,
    condition: (stock) => stock.price > 0 && stock.atr > 0 && (stock.atr / stock.price) < 0.025
  },
  {
    key: 'etfNearMa240',
    category: 'TECHNICAL',
    type: 'POSITIVE',
    impact: 5,
    condition: (stock) => stock.ma240 > 0 && Math.abs(stock.price - stock.ma240) / stock.ma240 <= 0.03
  },
  {
    key: 'etfBelowMa240',
    category: 'TECHNICAL',
    type: 'NEGATIVE',
    impact: -8,
    condition: (stock) => stock.price < stock.ma240
  },
  {
    key: 'etfHighVolatility',
    category: 'RISK',
    type: 'NEGATIVE',
    impact: -5,
    condition: (stock) => stock.price > 0 && stock.atr > 0 && (stock.atr / stock.price) > 0.04
  }
];

export const generateTags = (
  data: StockData,
  assetType: 'STOCK' | 'ETF',
  lang: AppLanguage,
  mode: InvestmentMode = assetType === 'ETF' ? 'ETF' : 'SHORT_TERM'
): StockTag[] => {
  const locale = lang === 'zh' ? 'zh' : 'en';
  let rules: TagRule[];

  if (assetType === 'ETF' || mode === 'ETF') {
    rules = ETF_TAG_RULES;
  } else if (mode === 'LONG_TERM') {
    rules = LONG_TERM_TAG_RULES;
  } else {
    rules = SHORT_TERM_TAG_RULES;
  }

  return rules.reduce<StockTag[]>((acc, rule) => {
    if (!rule.condition(data)) return acc;
    const text = TAG_TEXT[locale][rule.key];
    if (!text) return acc;
    acc.push({
      label: text.label,
      desc: text.desc,
      type: rule.type,
      category: rule.category,
      scoreImpact: rule.impact
    });
    return acc;
  }, []);
};

// --- MODE 1: SHORT_TERM (SWING) SCORING ENGINE ---
export const calculateSwingScore = (stock: StockData, lang: AppLanguage = 'zh'): SwingScoreResult => {
    let trendScore = 0;
    let momentumScore = 0;
    let volumeScore = 0;
    let riskScore = 25; // Base score

    const { price, ma20, ma20Prev, ma60, rsi, vol5, vol20, atr } = stock;

    // 1. Trend Score (0–30)
    if (price > ma20) trendScore += 10;
    if (ma20 > ma60) trendScore += 10;
    // Proxy for previous ma20 if not available (fallback to slope check via ma5/ma20 or just ma20 > ma60)
    // However, backend now provides ma20Prev.
    if (ma20Prev && ma20 > ma20Prev) trendScore += 10;
    else if (!ma20Prev && stock.ma5 > ma20) trendScore += 10; // Fallback

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
  const tags = generateTags(stock, stock.assetType, lang, 'SHORT_TERM');
  tags.forEach(t => tagScore += (t.scoreImpact || 0));
    tagScore = Math.max(-15, Math.min(15, tagScore));

    const totalScore = Math.max(0, Math.min(100, trendScore + momentumScore + volumeScore + riskScore + tagScore));

    let action: 'ENTER' | 'WATCH' | 'AVOID' = 'AVOID';
    if (totalScore >= 85) action = 'ENTER';
    else if (totalScore >= 70) action = 'WATCH';

    return {
        totalScore,
        action,
    details: { trend: trendScore, momentum: momentumScore, volume: volumeScore, risk: riskScore },
    tagsUsed: tags
    };
};

// --- MODE 2: LONG_TERM (STOCK) SCORING ENGINE ---
export const calculateLongTermScore = (stock: StockData, lang: AppLanguage = 'zh'): LongTermScoreResult => {
  const { price, ma60, ma240, ma240Prev, atr } = stock;

  const trendScore = price > ma240 ? 20 : 0;

  let structureScore = 0;
  if (ma240Prev && ma240 > ma240Prev) structureScore += 20;
  else if (!ma240Prev && price > ma240) structureScore += 10;
  if (ma60 > ma240) structureScore += 10;

  let drawdownScore = 0;
  if (ma240 > 0) {
    const dist = (price - ma240) / ma240;
    if (dist > -0.20) drawdownScore += 30;
  }

  let volatilityScore = 0;
  if (price > 0 && atr > 0) {
    const volatility = atr / price;
    if (volatility < 0.03) volatilityScore += 20;
    else if (volatility <= 0.05) volatilityScore += 10;
  }

  const totalScore = Math.max(0, Math.min(100, trendScore + structureScore + drawdownScore + volatilityScore));

  let action: 'INVEST' | 'SCALE_IN' | 'WAIT' = 'WAIT';
  if (totalScore >= 80) action = 'INVEST';
  else if (totalScore >= 60) action = 'SCALE_IN';

  const tags = generateTags(stock, 'STOCK', lang, 'LONG_TERM');

  return {
    totalScore,
    action,
    details: {
      trend: trendScore,
      structure: structureScore,
      drawdown: drawdownScore,
      volatility: volatilityScore
    },
    tagsUsed: tags
  };
};

// --- MODE 3: ETF (LONG TERM ONLY) SCORING ENGINE ---
export const calculateEtfScore = (stock: StockData, lang: AppLanguage = 'zh'): EtfScoreResult => {
  const { price, ma240, ma240Prev, atr } = stock;

  let trendScore = 0;
  if (price > ma240) trendScore += 30;
  if (ma240Prev && ma240 > ma240Prev) trendScore += 20;
  else if (!ma240Prev && price > ma240) trendScore += 10;

  let proximityScore = 0;
  if (ma240 > 0) {
    const dist = Math.abs(price - ma240) / ma240;
    if (dist <= 0.10) proximityScore += 30;
  }

  let volatilityScore = 0;
  if (price > 0 && atr > 0) {
    const volatility = atr / price;
    if (volatility < 0.025) volatilityScore += 20;
    else if (volatility < 0.04) volatilityScore += 10;
  }

  const totalScore = Math.max(0, Math.min(100, trendScore + proximityScore + volatilityScore));

  let action: 'BUY' | 'DCA' | 'WAIT' = 'WAIT';
  if (totalScore >= 85) action = 'BUY';
  else if (totalScore >= 70) action = 'DCA';

  const tags = generateTags(stock, 'ETF', lang, 'ETF');

  return {
    totalScore,
    action,
    details: {
      trend: trendScore,
      proximity: proximityScore,
      volatility: volatilityScore
    },
    tagsUsed: tags
  };
};

export const calculateShortTermInvestment = (
  stock: StockData,
  scoreResult?: SwingScoreResult
): ShortTermInvestmentPlan => {
  const reference = stock.ma20 > 0 ? stock.ma20 : stock.price;
  const atrValue = stock.atr > 0 ? stock.atr : reference * 0.05;

  const entryLow = roundTo(reference * 0.99);
  const entryHigh = roundTo(reference * 1.01);
  const stopLoss = roundTo(entryLow - atrValue * 0.8);
  const target = roundTo(entryHigh + atrValue * 2.5);

  const action = scoreResult?.action ?? calculateSwingScore(stock).action;

  return {
    mode: 'SHORT_TERM',
    action,
    entryZone: [entryLow, entryHigh],
    stopLoss,
    target,
    holdingDaysRecommendation: '2-10 天 / Hold 2-10 days'
  };
};

export const calculateLongTermInvestment = (
  stock: StockData,
  scoreResult?: LongTermScoreResult
): LongTermInvestmentPlan => {
  const action = scoreResult?.action ?? calculateLongTermScore(stock).action;
  const atrRatio = stock.price > 0 && stock.atr > 0 ? stock.atr / stock.price : 0;

  let riskNote: string;
  if (atrRatio === 0) {
    riskNote = '缺少 ATR 資料 | ATR data unavailable';
  } else if (atrRatio < 0.03) {
    riskNote = '波動低：ATR 佔比 <3% | Low volatility: ATR-to-price <3%';
  } else if (atrRatio <= 0.05) {
    riskNote = '波動溫和：ATR 佔比 3-5% | Moderate volatility: ATR-to-price 3-5%';
  } else {
    riskNote = '波動偏高：ATR 佔比 >5% | Elevated volatility: ATR-to-price >5%';
  }

  const suggestedEntryZone = stock.ma240 > 0
    ? [roundTo(stock.ma240 * 0.98), roundTo(stock.ma240 * 1.02)]
    : undefined;

  const allocationHint: 'periodic' | 'split' = action === 'INVEST' ? 'periodic' : 'split';

  return {
    mode: 'LONG_TERM',
    action,
    allocationHint,
    riskNote,
    suggestedEntryZone
  };
};

export const calculateEtfInvestment = (
  stock: StockData,
  scoreResult?: EtfScoreResult
): EtfInvestmentPlan => {
  const action = scoreResult?.action ?? calculateEtfScore(stock).action;
  const atrRatio = stock.price > 0 && stock.atr > 0 ? stock.atr / stock.price : 0;

  let volatilityLevel: 'LOW' | 'MED' | 'HIGH' = 'MED';
  if (atrRatio === 0) volatilityLevel = 'MED';
  else if (atrRatio < 0.02) volatilityLevel = 'LOW';
  else if (atrRatio >= 0.035) volatilityLevel = 'HIGH';

  let riskNote: string;
  if (atrRatio === 0) {
    riskNote = '缺少 ATR 資料 | ATR data unavailable';
  } else if (atrRatio < 0.02) {
    riskNote = '波動低：ATR 佔比 <2% | Low volatility: ATR-to-price <2%';
  } else if (atrRatio < 0.035) {
    riskNote = '波動適中：ATR 佔比 2-3.5% | Moderate volatility: ATR-to-price 2-3.5%';
  } else {
    riskNote = '波動偏高：ATR 佔比 >3.5% | Elevated volatility: ATR-to-price >3.5%';
  }

  const suggestedEntryZone = stock.ma240 > 0
    ? [roundTo(stock.ma240 * 0.97), roundTo(stock.ma240 * 1.03)]
    : undefined;

  const allocationHint: 'one_time' | 'dca' = action === 'BUY' ? 'one_time' : 'dca';

  return {
    mode: 'ETF',
    action,
    allocationHint,
    volatilityLevel,
    riskNote,
    suggestedEntryZone
  };
};


// --- STRATEGY CALCULATION ---
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

    return strategies;
}



export const calculateInvestment = (
  _amountTWD: number,
  stockData: StockData,
  mode: InvestmentMode,
  lang: AppLanguage = 'zh'
): CalculatorResult => {
  switch (mode) {
    case 'SHORT_TERM': {
      const swingScore = calculateSwingScore(stockData, lang);
      return calculateShortTermInvestment(stockData, swingScore);
    }
    case 'LONG_TERM': {
      const longScore = calculateLongTermScore(stockData, lang);
      return calculateLongTermInvestment(stockData, longScore);
    }
    case 'ETF': {
      const etfScore = calculateEtfScore(stockData, lang);
      return calculateEtfInvestment(stockData, etfScore);
    }
    default:
      return calculateShortTermInvestment(stockData);
  }
};