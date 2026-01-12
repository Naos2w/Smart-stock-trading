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
    stockSearch: 'Stock Search',
    watchlist: 'Watchlist',
    login: 'Login',
    logout: 'Logout',
    loginGoogle: 'Sign in with Google',
    guest: 'Guest',
    strategyGuide: 'Strategy Guide',
    learnMore: 'Learn Investment Logic',
    shortTerm: 'Swing Trading (2-10 Days)',
    longTerm: 'Long Term (Value)',
    volume: 'Vol',
    mktCap: 'Mkt Cap',
    aiInsight: 'Gemini AI Check',
    analyzing: 'Analyzing...',
    keyIndicators: 'Strategy Dashboard',
    noSignals: 'No significant signals detected.',
    opportunity: 'Signal Detected',
    opportunityDesc: 'Setup matches your strategy.',
    calculate: 'Calculator & AI',
    calculatorTitle: 'Swing Strategy Pipeline',
    investAmount: 'Invest Amount',
    currentPrice: 'Current Price',
    exchangeRate: 'Exchange Rate',
    estShares: 'Est. Shares',
    suggestedEntry: 'Suggested Entry',
    targetExit: 'Target Exit',
    potentialProfit: 'Potential Profit',
    close: 'Close',
    noWatchlist: 'Your watchlist is empty.',
    searchPrompt: 'Enter a symbol to search real-time data',
    marketClosed: 'Closed',
    marketOpen: 'Open',
    strategyFocus: 'Strategy Focus',
    focusShort: 'Focus: Trend > RSI Zone > ATR',
    focusLong: 'Focus: Fundamentals > Trend > Chips',
    roe: 'ROE',
    divYield: 'Div Yield',
    twMarket: 'TW Market',
    usMarket: 'US Market',
    stopLoss: 'Stop Loss',
    formulaEntry: 'Current Price',
    formulaTargetShort: 'Entry + 2x ATR',
    formulaTargetLong: 'Entry + 20%',
    lastUpdate: 'Data Time',
    delayed: 'Delayed',
    extendedHours: 'Ext. Hours',
    selectStrategy: 'Select Strategy',
    askAi: 'Ask Gemini AI',
    trendCheck: 'Step 1: Swing Score Analysis',
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
    score: 'Swing Score',
    actionEnter: 'ENTER PLAN',
    actionWatch: 'WATCHLIST',
    actionAvoid: 'AVOID',
  },
  zh: {
    searchPlaceholder: '輸入代號或名稱 (如 2330, Nvidia)...',
    stockSearch: '即時搜尋',
    watchlist: '自選清單',
    login: '登入',
    logout: '登出',
    loginGoogle: '使用 Google 帳號登入',
    guest: '訪客',
    strategyGuide: '投資策略指南',
    learnMore: '學習投資邏輯',
    shortTerm: '波段交易 (2-10天)',
    longTerm: '長期投資 (價值存股)',
    volume: '成交量',
    mktCap: '市值',
    aiInsight: 'Gemini AI 健檢',
    analyzing: 'AI 正在分析您的策略...',
    keyIndicators: '策略儀表板',
    noSignals: '目前無明顯訊號',
    opportunity: '發現投資訊號',
    opportunityDesc: '符合您的策略模型',
    calculate: '策略試算 & AI',
    calculatorTitle: '波段策略四步檢核',
    investAmount: '預計投入 (台幣)',
    currentPrice: '目前股價',
    exchangeRate: '匯率',
    estShares: '預估股數',
    suggestedEntry: '建議進場',
    targetExit: '目標獲利',
    potentialProfit: '預估獲利',
    close: '關閉',
    noWatchlist: '自選清單為空，請前往搜尋頁面加入！',
    searchPrompt: '請輸入代號以取得即時報價',
    marketClosed: '已休市',
    marketOpen: '交易中',
    strategyFocus: '策略重點',
    focusShort: '重點排序：趨勢結構 > RSI區間 > ATR',
    focusLong: '重點排序：基本面 > 產業趨勢 > 均線 > 籌碼',
    roe: '股東權益報酬率',
    divYield: '殖利率',
    twMarket: '台股市場',
    usMarket: '美股市場',
    stopLoss: '停損價格',
    formulaEntry: '目前市價',
    formulaTargetShort: '進場價 + 2倍 ATR波動',
    formulaTargetLong: '進場價 + 20% 預估成長',
    lastUpdate: '資料時間',
    delayed: '延遲',
    extendedHours: '盤後/盤前',
    selectStrategy: '選擇策略模組',
    askAi: '詢問 AI 意見',
    trendCheck: 'Step 1: 波段評分分析',
    maSlope: 'MA20 斜率',
    riskReward: '風報比 (R:R)',
    step1: 'Step 1. 結構分析',
    step2: 'Step 2. 選擇策略',
    step3: 'Step 3. 計算風險',
    step4: 'Step 4. 最終驗證',
    step1Desc: '趨勢、動能、風險綜合評分 (0-100)',
    step2Desc: '選擇符合的波段進場邏輯',
    step3Desc: '量化停損與停利點位',
    step4Desc: '檢查風報比是否 >= 2',
    passed: '通過',
    failed: '未通過',
    score: '波段總分',
    actionEnter: '可規劃進場',
    actionWatch: '觀察/分批',
    actionAvoid: '建議觀望',
  }
};