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

// Shared Color Logic for TW vs US Markets
export const getMarketColors = (market: string) => {
    const isTW = market.includes('TW') || market.includes('Tai');
    
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
    shortTerm: 'Short Term (Swing)',
    longTerm: 'Long Term (Value)',
    volume: 'Vol',
    mktCap: 'Mkt Cap',
    aiInsight: 'Gemini AI Insight',
    analyzing: 'Analyzing real-time market data...',
    keyIndicators: 'Strategy Dashboard',
    noSignals: 'No significant signals detected.',
    opportunity: 'Signal Detected',
    opportunityDesc: 'Setup matches your strategy.',
    calculate: 'Calculate',
    calculatorTitle: 'Investment Calculator',
    investAmount: 'Investment Amount (TWD)',
    currentPrice: 'Current Price',
    exchangeRate: 'Exchange Rate',
    estShares: 'Est. Shares',
    suggestedEntry: 'Suggested Entry',
    targetExit: 'Target Exit',
    potentialProfit: 'Potential Profit (TWD)',
    close: 'Close',
    noWatchlist: 'Your watchlist is empty.',
    searchPrompt: 'Enter a symbol to search real-time data',
    marketClosed: 'Closed',
    marketOpen: 'Open',
    strategyFocus: 'Strategy Focus',
    focusShort: 'Focus: Vol > K-Line > MA20',
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
    shortTerm: '短期投資 (波段)',
    longTerm: '長期投資 (存股)',
    volume: '成交量',
    mktCap: '市值',
    aiInsight: 'Gemini AI 智能分析',
    analyzing: '正在分析即時數據...',
    keyIndicators: '策略儀表板',
    noSignals: '目前無明顯訊號',
    opportunity: '發現投資訊號',
    opportunityDesc: '符合您的策略模型',
    calculate: '投資試算',
    calculatorTitle: '投資試算清單',
    investAmount: '預計投入金額 (台幣)',
    currentPrice: '目前股價',
    exchangeRate: '匯率',
    estShares: '預估股數',
    suggestedEntry: '建議進場價',
    targetExit: '目標獲利價',
    potentialProfit: '預估獲利 (台幣)',
    close: '關閉',
    noWatchlist: '自選清單為空，請前往搜尋頁面加入！',
    searchPrompt: '請輸入代號以取得即時報價',
    marketClosed: '已休市',
    marketOpen: '交易中',
    strategyFocus: '策略重點',
    focusShort: '重點排序：成交量 > K線 > MA20 > RSI',
    focusLong: '重點排序：基本面 > 產業趨勢 > 均線 > 籌碼',
    roe: '股東權益報酬率',
    divYield: '殖利率',
    twMarket: '台股市場',
    usMarket: '美股市場',
    stopLoss: '建議停損價',
    formulaEntry: '目前市價',
    formulaTargetShort: '進場價 + 2倍 ATR波動',
    formulaTargetLong: '進場價 + 20% 預估成長',
    lastUpdate: '資料時間',
    delayed: '延遲',
    extendedHours: '盤後/盤前',
  }
};