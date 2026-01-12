export type Market = 'TW' | 'US' | 'HK' | 'OTHER';
export type InvestmentMode = 'SHORT_TERM' | 'LONG_TERM' | 'ETF';
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

export interface DailyOHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  ma20Prev: number;
  ma60: number;
  ma120: number;
  ma240: number;
  ma240Prev: number;
  
  rsi: number;
  rsiPrev: number;
  
  // MACD
  macdLine: number;
  signalLine: number;
  macdHist: number;
  macdHistPrev: number;

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
  // Optional expanded fundamentals (may be missing depending on data source)
  epsYoy?: number;
  debtRatio?: number;
  
  institutionalOwnership: number; 
  institutionalAction: string; 
  
  tags: StockTag[];
  updatedAt: number;
  lastTradeTime: number;
  isDelayed: boolean;
  isMarketOpen: boolean;
  currency: string;
  exchange: string;
  assetType: 'STOCK' | 'ETF';
  recentHistorySample?: DailyOHLCV[];
}

export interface StockTag {
  label: string;
  desc?: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  category: 'TECHNICAL' | 'FUNDAMENTAL' | 'CHIPS' | 'RISK';
  scoreImpact?: number;
}

export interface StrategyResult {
    id: string;
    name: string;
    desc: string;
    entryPrice: number;
    entryPriceHigh?: number;
    stopLoss: number;
    targetPrice: number;
    riskRewardRatio: number;
    conditionMet: boolean; 
    note: string;
}

  export type ScoreAction =
    | 'ENTER'
    | 'WATCH'
    | 'AVOID'
    | 'INVEST'
    | 'SCALE_IN'
    | 'WAIT'
    | 'BUY'
    | 'DCA';

  export interface ScoreResult {
    totalScore: number;
    action: ScoreAction;
    details: Record<string, number>;
    tagsUsed?: StockTag[];
  }

  export interface SwingScoreResult extends ScoreResult {
    action: 'ENTER' | 'WATCH' | 'AVOID';
    details: {
      trend: number;
      momentum: number;
      volume: number;
      risk: number;
    };
  }

  export interface LongTermScoreResult extends ScoreResult {
    action: 'INVEST' | 'SCALE_IN' | 'WAIT';
    details: {
      trend: number;
      structure: number;
      drawdown: number;
      volatility: number;
    };
  }

  export interface EtfScoreResult extends ScoreResult {
    action: 'BUY' | 'DCA' | 'WAIT';
    details: {
      trend: number;
      proximity: number;
      volatility: number;
    };
  }

  export type RiskState = {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
    key: 'LOW_VOL' | 'MED_VOL' | 'HIGH_VOL' | 'NO_DATA';
  };

  export interface ShortTermInvestmentPlan {
    mode: 'SHORT_TERM';
    action: 'ENTER' | 'WATCH' | 'AVOID';
    entryZone: [number, number];
    stopLoss: number;
    target: number;
    holdingDaysRecommendation: string;
  }

  export interface LongTermInvestmentPlan {
    mode: 'LONG_TERM';
    action: 'INVEST' | 'SCALE_IN' | 'WAIT';
    allocationHint: 'periodic' | 'split';
    riskState: RiskState;
    suggestedEntryZone?: [number, number];
  }

  export interface EtfInvestmentPlan {
    mode: 'ETF';
    action: 'BUY' | 'DCA' | 'WAIT';
    allocationHint: 'one_time' | 'dca';
    volatilityLevel: 'LOW' | 'MED' | 'HIGH';
    riskState: RiskState;
    suggestedEntryZone?: [number, number];
    weeksBelowMa240?: number;
  }

  export type CalculatorResult =
    | ShortTermInvestmentPlan
    | LongTermInvestmentPlan
    | EtfInvestmentPlan;

  export interface GeminiInsightPayload {
    mode: InvestmentMode;
    assetType: 'STOCK' | 'ETF';
    market: string;
    symbol: string;
    price: number;
    scoreResult: ScoreResult;
    tags: StockTag[];
    strategies: StrategyResult[];
    focusStrategyId?: string | null;
    investmentPlan: CalculatorResult;
    recentHistorySample: DailyOHLCV[];
  }

// Shared Color Logic for TW vs US Markets
export const getMarketColors = (market: string) => {
    const isTW = market.includes('TW') || market.includes('Tai');
    
    // Base Colors
    const neutralText = 'text-gray-900 dark:text-white';
    const neutralBg = 'bg-gray-500';
    const neutralBadge = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

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
        return {
            upText: redStyle.text,
            downText: greenStyle.text,
            upBg: redStyle.bg,
            downBg: greenStyle.bg,
            sentimentBull: redStyle.badge,
            sentimentBear: greenStyle.badge,
            neutralText,
            neutralBg,
            neutralBadge
        };
    } else {
        return {
            upText: greenStyle.text,
            downText: redStyle.text,
            upBg: greenStyle.bg,
            downBg: redStyle.bg,
            sentimentBull: greenStyle.badge,
            sentimentBear: redStyle.badge,
            neutralText,
            neutralBg,
            neutralBadge
        };
    }
};

export const TRANSLATIONS = {
  en: {
    searchPlaceholder: 'Search Symbol (e.g., TSMC, QQQ)...',
    stockSearch: 'Search',
    watchlist: 'Watchlist',
    login: 'Login',
    logout: 'Logout',
    loginGoogle: 'Sign in with Google',
    guest: 'Guest',
    strategyGuide: 'Strategy Guide',
    learnMore: 'Learn Logic',
    shortTerm: 'Swing Trading',
    longTerm: 'Individual Stock',
    etf: 'ETF Investing',
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
    calculatorLongTitle: 'Long-Term Planner',
    calculatorEtfTitle: 'ETF Planner',
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
    actionInvest: 'INVEST',
    actionScaleIn: 'SCALE IN',
    actionWait: 'WAIT',
    actionBuy: 'BUY',
    actionDca: 'DCA',
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
    modeEtf: 'ETF',
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
    scoreRisk: 'Risk',
    scoreStructure: 'Structure',
    scoreDrawdown: 'Drawdown',
    scoreVolatility: 'Volatility',
    scoreProximity: 'MA240 Distance',
    allocation: 'Allocation Hint',
    volatility: 'Volatility Level',
    riskNotes: 'Risk Notes',
    tagsHeadline: 'Signal Tags',
    actionSummary: 'Action Summary',
    investmentPlan: 'Investment Plan',
    periodic: 'Periodic',
    split: 'Split',
    oneTime: 'One-time',
    dca: 'DCA',
    low: 'Low',
    med: 'Med',
    high: 'High',
    holdingDays: 'Holding Days',
    suggestedZone: 'Suggested Zone',
    riskNoteLabel: 'Risk Note'
  },
  zh: {
    searchPlaceholder: '輸入代號或名稱 (如 2330, QQQ)...',
    stockSearch: '搜尋',
    watchlist: '自選清單',
    login: '登入',
    logout: '登出',
    loginGoogle: '使用 Google 帳號登入',
    guest: '訪客',
    strategyGuide: '投資策略指南',
    learnMore: '學習邏輯',
    shortTerm: '波段交易',
    longTerm: '個股長期',
    etf: 'ETF 投資',
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
    calculatorLongTitle: '長期配置試算',
    calculatorEtfTitle: 'ETF 配置試算',
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
    failed: '警示',
    score: '總分',
    actionEnter: '建議進場',
    actionWatch: '持續觀察',
    actionAvoid: '建議避開',
    actionInvest: '建議投資',
    actionScaleIn: '分批佈局',
    actionWait: '等待機會',
    actionBuy: '直接買進',
    actionDca: '定期定額',
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
    modeLong: '個股存股',
    modeEtf: 'ETF 模式',
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
    scoreRisk: '風險',
    scoreStructure: '結構',
    scoreDrawdown: '回檔幅度',
    scoreVolatility: '波動',
    scoreProximity: '年線距離',
    allocation: '配置建議',
    volatility: '波動等級',
    riskNotes: '風險筆記',
    tagsHeadline: '訊號標籤',
    actionSummary: '行動摘要',
    investmentPlan: '投資方案',
    periodic: '定期',
    split: '分批',
    oneTime: '單筆',
    dca: '定期定額',
    low: '低',
    med: '中',
    high: '高',
    holdingDays: '持有天數',
    suggestedZone: '建議區間',
    riskNoteLabel: '風險備註'
  }
};