export type Market = 'TW' | 'US' | 'HK' | 'OTHER';
export type InvestmentMode = 'SHORT_TERM' | 'LONG_TERM';
export type AppLanguage = 'en' | 'zh';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface StockRaw {
  symbol: string;
  name: string;
  nameEn: string;
  market: string;
}

export interface StockData extends StockRaw {
  price: number;
  openPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  vol5: number;
  vol20: number;
  marketCap: string;
  peRatio: number; 
  
  // Advanced Indicators (Real Calculated)
  ma5: number;
  ma10: number;
  ma20: number;
  ma20Prev: number; // Added for Slope Calculation
  ma60: number;
  ma120: number;
  ma240: number;
  
  rsi: number;
  rsiPrev: number; // For divergence check
  
  // MACD
  macdLine: number;
  signalLine: number;
  macdHist: number;
  macdHistPrev: number; // For trend check

  // KD (Stochastic)
  kValue: number;
  dValue: number;

  // ATR (Volatility)
  atr: number;

  // Fundamentals
  eps: number;
  roe: number;
  dividendYield: number;
  revenueYoy: number;
  
  institutionalOwnership: number; 
  institutionalAction: string; 
  
  tags: StockTag[];
  updatedAt: number;     // Local fetch time
  lastTradeTime: number; // Data source time
  isDelayed: boolean;    // Is data delayed by exchange?
  isMarketOpen: boolean;
  currency: string;
  exchange: string;
}

export interface StockTag {
  label: string;
  desc?: string; // Description for tooltip
  type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  category: 'TECHNICAL' | 'FUNDAMENTAL' | 'CHIPS' | 'RISK';
  scoreImpact?: number; // Internal score for sorting/weighting
}

export interface StrategyResult {
    id: string;
    name: string;
    desc: string;
    entryPrice: number; // Can be start of range
    entryPriceHigh?: number; // End of range
    stopLoss: number;
    targetPrice: number;
    riskRewardRatio: number;
    conditionMet: boolean; 
    note: string;
}

export interface CalculatorResult {
  investAmountTWD: number;
  sharePrice: number;
  exchangeRate: number; 
  shares: number;
  entrySuggestion: number;
  targetPrice: number;
  potentialGain: number;
  potentialGainPercent: number;
  riskRewardRatio: string;
  stopLossPrice: number;
}

export interface SwingScoreResult {
    totalScore: number;
    action: 'ENTER' | 'WATCH' | 'AVOID';
    details: {
        trend: number;
        momentum: number;
        volume: number;
        risk: number;
    }
}

// Shared Color Logic for TW vs US Markets
export const getMarketColors = (market: string) => {
    const isTW = market.includes('TW') || market.includes('TAI');
    
    // Base Colors
    const neutralText = 'text-gray-900 dark:text-white';
    const neutralBg = 'bg-gray-500';
    const neutralBadge = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

    // Style Definitions
    const redStyle = {
        text: 'text-red-500',
        bg: 'bg-red-500',
        border: 'border-red-500',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
    };

    const greenStyle = {
        text: 'text-green-500',
        bg: 'bg-green-500',
        border: 'border-green-500',
        badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    };

    if (isTW) {
        // TW Market: Up = Red, Down = Green
        return {
            // Price / Trend Colors
            upText: redStyle.text,
            downText: greenStyle.text,
            upBg: redStyle.bg,
            downBg: greenStyle.bg,
            
            // Sentiment Badges (Tags & Status)
            // Positive/Bullish -> Red in TW
            sentimentBull: redStyle.badge,
            // Negative/Bearish -> Green in TW
            sentimentBear: greenStyle.badge,
            
            neutralText,
            neutralBg,
            neutralBadge
        };
    } else {
        // US Market: Up = Green, Down = Red
        return {
            // Price / Trend Colors
            upText: greenStyle.text,
            downText: redStyle.text,
            upBg: greenStyle.bg,
            downBg: redStyle.bg,
            
            // Sentiment Badges (Tags & Status)
            // Positive/Bullish -> Green in US
            sentimentBull: greenStyle.badge,
            // Negative/Bearish -> Red in US
            sentimentBear: redStyle.badge,

            neutralText,
            neutralBg,
            neutralBadge
        };
    }
};

export const TRANSLATIONS = {
  en: {
    searchPlaceholder: 'Search Symbol or Name (e.g., TSMC, NVDA)...',
    stockSearch: 'Search',
    watchlist: 'Watchlist',
    login: 'Login',
    logout: 'Logout',
    loginGoogle: 'Sign in with Google',
    guest: 'Guest',
    strategyGuide: 'Strategy Guide',
    learnMore: 'Learn Logic',
    shortTerm: 'Swing Trading',
    longTerm: 'Long Term',
    volume: 'Vol',
    mktCap: 'Mkt Cap',
    aiInsight: 'Gemini AI Check',
    analyzing: 'Analyzing...',
    keyIndicators: 'Strategy Dashboard',
    noSignals: 'No significant signals detected.',
    opportunity: 'Signal Detected',
    opportunityDesc: 'Setup matches your strategy.',
    calculate: 'Calculator & AI',
    calculatorTitle: 'Strategy Pipeline',
    investAmount: 'Invest Amount',
    currentPrice: 'Current Price',
    exchangeRate: 'Exchange Rate',
    estShares: 'Est. Shares',
    suggestedEntry: 'Suggested Entry',
    targetExit: 'Target Exit',
    potentialProfit: 'Potential Profit',
    close: 'Close',
    noWatchlist: 'Watchlist is empty.',
    searchPrompt: 'Search to view real-time data',
    marketClosed: 'Closed',
    marketOpen: 'Open',
    strategyFocus: 'Strategy Focus',
    roe: 'ROE',
    divYield: 'Div Yield',
    twMarket: 'TW Market',
    usMarket: 'US Market',
    stopLoss: 'Stop Loss',
    formulaEntry: 'Current Price',
    formulaTargetShort: 'Entry + 2x ATR',
    formulaTargetLong: 'Entry + 20%',
    lastUpdate: 'Time',
    delayed: 'Delayed',
    extendedHours: 'Ext. Hours',
    selectStrategy: 'Select Strategy',
    askAi: 'Ask Gemini AI',
    trendCheck: 'Step 1: Analysis',
    maSlope: 'MA20 Slope',
    riskReward: 'R:R Ratio',
    step1: '1. Analysis',
    step2: '2. Strategy',
    step3: '3. Risk',
    step4: '4. Validation',
    step1Desc: 'Trend, Momentum & Risk Score',
    step2Desc: 'Choose Entry Method',
    step3Desc: 'Stop Loss & Profit Target',
    step4Desc: 'Risk:Reward Check (>= 2)',
    passed: 'PASSED',
    failed: 'WARNING',
    score: 'Score',
    actionEnter: 'ENTER',
    actionWatch: 'WATCH',
    actionAvoid: 'AVOID',
    loading: 'Loading...',
    entryZone: 'Entry Zone',
    estProfit: 'Est. Profit',
    aiAdvice: 'AI Advice',
    sortStrategy: 'Sort: Score',
    sortChange: 'Sort: Change %',
    sortPrice: 'Sort: Price',
    statusBuy: 'Buy Setup',
    statusValue: 'Value Buy',
    statusRisk: 'Risk / Sell',
    statusNeutral: 'Neutral',
    modeShort: 'Short Term',
    modeLong: 'Long Term',
    structure: 'Structure',
    momentum: 'Momentum',
    bullish: 'Bullish',
    neutral: 'Neutral',
    highVol: 'High Vol',
    lowVol: 'Low Vol',
    instHold: 'Inst. Hold',
    scoreTrend: 'Trend',
    scoreMomentum: 'Momentum',
    scoreVol: 'Volume',
    scoreRisk: 'Risk'
  },
  zh: {
    searchPlaceholder: '輸入代號或名稱 (如 2330, Nvidia)...',
    stockSearch: '搜尋',
    watchlist: '自選清單',
    login: '登入',
    logout: '登出',
    loginGoogle: '使用 Google 帳號登入',
    guest: '訪客',
    strategyGuide: '投資策略指南',
    learnMore: '學習邏輯',
    shortTerm: '波段交易',
    longTerm: '長期投資',
    volume: '成交量',
    mktCap: '市值',
    aiInsight: 'Gemini AI 健檢',
    analyzing: 'AI 正在分析...',
    keyIndicators: '策略儀表板',
    noSignals: '目前無明顯訊號',
    opportunity: '發現訊號',
    opportunityDesc: '符合策略模型',
    calculate: '試算 & AI',
    calculatorTitle: '策略檢核',
    investAmount: '預計投入',
    currentPrice: '目前股價',
    exchangeRate: '匯率',
    estShares: '預估股數',
    suggestedEntry: '建議進場',
    targetExit: '目標獲利',
    potentialProfit: '預估獲利',
    close: '關閉',
    noWatchlist: '自選清單為空',
    searchPrompt: '請輸入代號查詢',
    marketClosed: '已休市',
    marketOpen: '交易中',
    strategyFocus: '策略重點',
    roe: 'ROE',
    divYield: '殖利率',
    twMarket: '台股',
    usMarket: '美股',
    stopLoss: '停損價格',
    formulaEntry: '目前市價',
    formulaTargetShort: '進場價 + 2倍 ATR波動',
    formulaTargetLong: '進場價 + 20% 預估成長',
    lastUpdate: '資料時間',
    delayed: '延遲',
    extendedHours: '盤後',
    selectStrategy: '選擇策略',
    askAi: '詢問 AI',
    trendCheck: 'Step 1: 評分',
    maSlope: 'MA20 斜率',
    riskReward: '風報比 (R:R)',
    step1: 'Step 1. 分析',
    step2: 'Step 2. 策略',
    step3: 'Step 3. 風險',
    step4: 'Step 4. 驗證',
    step1Desc: '趨勢、動能、風險評分 (0-100)',
    step2Desc: '選擇進場邏輯',
    step3Desc: '停損與停利點位',
    step4Desc: '檢查風報比是否 >= 2',
    passed: '通過',
    failed: '未通過',
    score: '波段總分',
    actionEnter: '可進場',
    actionWatch: '觀察中',
    actionAvoid: '建議觀望',
    loading: '載入中...',
    entryZone: '進場區間',
    estProfit: '預估獲利',
    aiAdvice: 'AI 建議',
    sortStrategy: '排序: 評分',
    sortChange: '排序: 漲跌幅',
    sortPrice: '排序: 股價',
    statusBuy: '多頭訊號',
    statusValue: '價值買點',
    statusRisk: '風險/減碼',
    statusNeutral: '中立觀望',
    modeShort: '波段模式',
    modeLong: '存股模式',
    structure: '結構',
    momentum: '動能',
    bullish: '多頭排列',
    neutral: '中立',
    highVol: '攻擊量',
    lowVol: '量縮',
    instHold: '法人持股',
    scoreTrend: '趨勢',
    scoreMomentum: '動能',
    scoreVol: '量能',
    scoreRisk: '風險'
  }
};