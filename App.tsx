import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StockRaw, StockData, InvestmentMode, StockTag, AppLanguage, TRANSLATIONS, UserProfile, getMarketColors } from './types';
import { fetchStockData, searchStocks, checkBackendHealth } from './services/stockService';
import { SearchIcon, MoonIcon, SunIcon, HeartIcon, RefreshIcon, CalculatorIcon, TrendUpIcon, TrendDownIcon, SortIcon, PlayIcon, PauseIcon } from './components/Icons';
import CalculatorModal from './components/CalculatorModal';
import StrategyGuide from './components/StrategyGuide';
import LoginModal from './components/LoginModal';

const DEFAULT_SYMBOLS = ['2330.TW', '2317.TW', 'NVDA', 'AAPL', 'TSLA'];

type SortOption = 'SUITABILITY' | 'CHANGE_DESC' | 'PRICE_DESC';
type MarketFilter = 'ALL' | 'TW' | 'US';

const DASHBOARD_TOOLTIPS = {
  zh: {
    ma: "確認 MA5 > MA10 > MA20 是否呈現多頭排列 (趨勢強度)",
    vol: "今日成交量是否大於 5 日均量 (是否有攻擊量能)",
    atr: "ATR (真實波幅) 代表股價波動程度，用於計算合理的停損距離",
    rsi: "RSI 相對強弱指標。>50偏多，>75過熱，<30超跌反彈",
    ma240: "股價是否站在年線 (240MA) 之上，確認長期多頭趨勢",
    roe: "股東權益報酬率，越高代表公司運用資金效率越好 (基本面)",
    yield: "現金殖利率 (股利/股價)，存股族重要指標",
    inst: "外資/投信等法人持股比例，越高籌碼越穩定"
  },
  en: {
    ma: "Check if MA5 > MA10 > MA20 (Bullish Alignment)",
    vol: "Current Volume vs 5-Day Average (Momentum Confirmation)",
    atr: "Average True Range (Volatility) for calculating Stop Loss",
    rsi: "Relative Strength Index. >50 Bullish, >75 Overbought, <30 Oversold",
    ma240: "Price vs 240-Day MA (Long Term Trend Filter)",
    roe: "Return on Equity. Higher implies better efficiency.",
    yield: "Dividend Yield (Annual Dividend / Current Price)",
    inst: "Institutional Ownership % (Chip Stability)"
  }
};

const StockTagBadge: React.FC<{ tag: StockTag, market: string }> = ({ tag, market }) => {
  const colors = getMarketColors(market);
  let className = colors.neutralBadge;
  
  if (tag.type === 'POSITIVE') className = colors.sentimentBull;
  if (tag.type === 'NEGATIVE') className = colors.sentimentBear;

  return (
    <span 
      className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold tracking-wide ${className}`}
      title={tag.desc || tag.label}
    >
      {tag.label}
    </span>
  );
};

// iOS Segmented Control Component
const SegmentedControl = ({ options, value, onChange }: { options: {value: string, label: string}[], value: string, onChange: (v: any) => void }) => {
    return (
        <div className="bg-gray-200/80 dark:bg-gray-800/80 p-1 rounded-lg flex relative backdrop-blur-md">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 py-2 px-4 text-xs font-semibold rounded-[7px] transition-all duration-200 relative z-10 whitespace-nowrap ${
                        value === opt.value 
                        ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm scale-100' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

// Helper: Check if Market is Open (Precise Logic)
const getMarketStatus = () => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = day === 0 || day === 6;
    
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // 1. Check TW Stock (09:00 - 13:30)
    // 09:00 = 540 min, 13:30 = 810 min
    const isTwOpen = !isWeekend && totalMinutes >= 540 && totalMinutes <= 810;

    // 2. Check US Stock
    const month = now.getMonth() + 1;
    const isSummer = month > 3 && month < 11; 
    
    let isUsOpen = false;
    if (!isWeekend) {
        if (isSummer) {
            // Summer: 21:30 ~ 24:00 OR 00:00 ~ 04:00
            if (totalMinutes >= 1290 || totalMinutes <= 240) isUsOpen = true;
        } else {
            // Winter: 22:30 ~ 24:00 OR 00:00 ~ 05:00
            if (totalMinutes >= 1350 || totalMinutes <= 300) isUsOpen = true;
        }
    }

    return { isTwOpen, isUsOpen, isWeekend };
};

// Helper to determine if a symbol is likely Taiwan stock
const isTwSymbol = (symbol: string) => {
    return symbol.includes('.TW') || symbol.includes('.TWO') || /^\d{4}$/.test(symbol);
};

// Format time
const formatTime = (timestamp: number) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState<AppLanguage>('zh'); 
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'WATCHLIST'>('WATCHLIST');
  const [investmentMode, setInvestmentMode] = useState<InvestmentMode>('SHORT_TERM');
  const [sortOption, setSortOption] = useState<SortOption>('SUITABILITY');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('ALL');
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showStrategyGuide, setShowStrategyGuide] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockRaw[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  
  const [watchlist, setWatchlist] = useState<StockData[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false); 
  const [backendStatus, setBackendStatus] = useState<boolean>(false);
  
  const isFetchingRef = useRef(false);

  const t = TRANSLATIONS[language];
  const tips = DASHBOARD_TOOLTIPS[language];

  // Logic Hooks
  useEffect(() => {
    const savedUser = localStorage.getItem('smart_stock_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    const key = user ? `watchlist_${user.email}` : 'watchlist_guest';
    const saved = localStorage.getItem(key);
    if (saved) setWatchlistSymbols(JSON.parse(saved));
    else setWatchlistSymbols(DEFAULT_SYMBOLS);
  }, [user]);

  useEffect(() => {
    const key = user ? `watchlist_${user.email}` : 'watchlist_guest';
    localStorage.setItem(key, JSON.stringify(watchlistSymbols));
  }, [watchlistSymbols, user]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    checkBackendHealth().then(setBackendStatus);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial Data Load
  useEffect(() => {
    loadWatchlistData(false, false);
  }, [language, backendStatus, watchlistSymbols]); 

  // --- SMART AUTO REFRESH LOGIC ---
  useEffect(() => {
    const intervalId = setInterval(() => {
        if (isFetchingRef.current) return;
        if (isPaused) return;

        if (activeTab === 'WATCHLIST') {
            const { isTwOpen, isUsOpen } = getMarketStatus();
            if (!isTwOpen && !isUsOpen) return;
            loadWatchlistData(true, true); 
        } 
        else if (activeTab === 'SEARCH' && selectedStock) {
            const isTw = isTwSymbol(selectedStock.symbol);
            const { isTwOpen, isUsOpen } = getMarketStatus();
            if (isTw && isTwOpen) refreshSingleStock(selectedStock.symbol);
            if (!isTw && isUsOpen) refreshSingleStock(selectedStock.symbol);
        }
    }, 2000); 

    return () => clearInterval(intervalId);
  }, [activeTab, selectedStock, language, watchlistSymbols, isPaused]);

  const loadWatchlistData = async (isBackground = false, onlyOpenMarkets = false) => {
    if (!backendStatus) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    if (!isBackground) setIsRefreshing(true);
    
    try {
        const uniqueSymbols = Array.from(new Set(watchlistSymbols)) as string[];
        const { isTwOpen, isUsOpen } = getMarketStatus();

        const symbolsToFetch = uniqueSymbols.filter(sym => {
            if (!onlyOpenMarkets) return true;
            const isTw = isTwSymbol(sym);
            if (isTw && isTwOpen) return true;
            if (!isTw && isUsOpen) return true; 
            return false;
        });

        if (symbolsToFetch.length === 0) {
            isFetchingRef.current = false;
            if (!isBackground) setIsRefreshing(false);
            return;
        }

        const promises = symbolsToFetch.map(sym => fetchStockData(sym, language));
        const results = await Promise.all(promises);
        const validResults = results.filter((s): s is StockData => s !== null);
        
        setWatchlist(prev => {
            const symbolMap = new Map(prev.map(item => [item.symbol, item]));
            validResults.forEach(newItem => {
                symbolMap.set(newItem.symbol, newItem);
            });
            return Array.from(symbolMap.values());
        });

    } catch (e) {
        console.error("Refresh Error", e);
    } finally {
        isFetchingRef.current = false;
        if (!isBackground) setIsRefreshing(false);
    }
  };

  const refreshSingleStock = async (symbol: string) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
          const data = await fetchStockData(symbol, language);
          if (data) setSelectedStock(data);
      } catch (e) {
          console.error("Single Stock Refresh Error", e);
      } finally {
          isFetchingRef.current = false;
      }
  }

  const handleSelectStock = async (raw: StockRaw | string) => {
    setStockLoading(true);
    setSelectedStock(null);
    setActiveTab('SEARCH');
    setSearchQuery('');
    setSearchResults([]);
    
    const symbol = typeof raw === 'string' ? raw : raw.symbol;
    const data = await fetchStockData(symbol, language);
    if (data) setSelectedStock(data);
    setStockLoading(false);
  };

  const toggleWatchlist = (symbol: string) => {
    if (watchlistSymbols.includes(symbol)) {
      setWatchlistSymbols(prev => prev.filter(s => s !== symbol));
      setWatchlist(prev => prev.filter(s => s.symbol !== symbol));
    } else {
      setWatchlistSymbols(prev => [...prev, symbol]);
      fetchStockData(symbol, language).then(data => {
        if (data) setWatchlist(prev => [...prev, data]);
      });
    }
  };

  const handleLogin = (u: UserProfile) => {
      setUser(u);
      localStorage.setItem('smart_stock_user', JSON.stringify(u));
  };
  
  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('smart_stock_user');
      setWatchlistSymbols(DEFAULT_SYMBOLS); 
  };

  const isFav = (symbol: string) => watchlistSymbols.includes(symbol);

  const getSuitabilityScore = (stock: StockData): number => {
      let score = 0;
      if (investmentMode === 'SHORT_TERM') {
          if (stock.price > stock.ma20) score += 2; else score -= 2;
          if (stock.ma5 > stock.ma10 && stock.ma10 > stock.ma20) score += 2;
          if (stock.volume > stock.vol5) score += 1;
          if (stock.rsi > 50 && stock.rsi < 75) score += 1;
      }
      if (investmentMode === 'LONG_TERM') {
          if (stock.price > stock.ma240) score += 3; else score -= 3;
          if (stock.roe > 15) score += 1;
          if (stock.institutionalOwnership > 40) score += 1;
      }
      return score;
  };

  const getCardStyle = (score: number, market: string) => {
      return 'bg-white dark:bg-dark-surface border border-transparent shadow-sm hover:shadow-md transition-shadow duration-300';
  };

  const getStatusLabel = (score: number, market: string) => {
      const colors = getMarketColors(market);
      if (score >= 3) return { 
          text: investmentMode === 'SHORT_TERM' ? 'Buy Setup' : 'Value Buy', 
          className: colors.sentimentBull 
      };
      if (score <= -2) return { 
          text: 'Risk / Sell', 
          className: colors.sentimentBear 
      };
      return { 
          text: 'Neutral', 
          className: colors.neutralBadge
      };
  };

  const sortedAndFilteredWatchlist = useMemo(() => {
      let list = [...watchlist];
      if (marketFilter === 'TW') list = list.filter(s => isTwSymbol(s.symbol));
      else if (marketFilter === 'US') list = list.filter(s => !isTwSymbol(s.symbol));

      return list.sort((a, b) => {
          if (sortOption === 'SUITABILITY') return getSuitabilityScore(b) - getSuitabilityScore(a);
          if (sortOption === 'CHANGE_DESC') return b.changePercent - a.changePercent;
          if (sortOption === 'PRICE_DESC') return b.price - a.price;
          return 0;
      });
  }, [watchlist, sortOption, investmentMode, marketFilter]);

  const renderStrategyGrid = (stock: StockData) => {
    const marketColors = getMarketColors(stock.market);
    const cardClass = "bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex flex-col justify-center items-center text-center";

    if (investmentMode === 'SHORT_TERM') {
      const maBull = stock.ma5 > stock.ma10 && stock.ma10 > stock.ma20;
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className={cardClass} title={tips.ma}>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Structure</p>
            <p className={`font-bold text-base ${maBull ? marketColors.upText : 'text-gray-400'}`}>
                {maBull ? 'Bullish' : 'Neutral'}
            </p>
          </div>
          <div className={cardClass} title={tips.vol}>
             <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Momentum</p>
             <p className={`font-bold text-base ${stock.volume > stock.vol5 ? marketColors.upText : 'text-gray-400'}`}>
                 {stock.volume > stock.vol5 ? 'High Vol' : 'Low Vol'}
             </p>
          </div>
          <div className={cardClass} title={tips.atr}>
             <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">ATR</p>
             <p className="font-bold dark:text-white text-base">{stock.atr.toFixed(1)}</p>
          </div>
          <div className={cardClass} title={tips.rsi}>
             <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">RSI (14)</p>
             <p className={`font-bold text-base ${stock.rsi > 75 ? marketColors.downText : stock.rsi < 25 ? marketColors.upText : 'dark:text-white'}`}>{stock.rsi.toFixed(1)}</p>
          </div>
        </div>
      );
    } 
    
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className={cardClass} title={tips.ma240}>
             <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">MA240</p>
             <p className={`font-bold text-base ${stock.price > stock.ma240 ? marketColors.upText : marketColors.downText}`}>{stock.price > stock.ma240 ? 'Bull' : 'Bear'}</p>
          </div>
          <div className={cardClass} title={tips.roe}>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{t.roe}</p>
            <p className={`font-bold text-base ${marketColors.upText}`}>{stock.roe.toFixed(1)}%</p>
          </div>
          <div className={cardClass} title={tips.yield}>
             <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{t.divYield}</p>
             <p className={`font-bold text-base ${marketColors.upText}`}>{stock.dividendYield.toFixed(2)}%</p>
          </div>
          <div className={cardClass} title={tips.inst}>
             <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Inst. Hold</p>
             <p className={`font-bold text-base ${stock.institutionalOwnership > 40 ? marketColors.upText : 'dark:text-white'}`}>{stock.institutionalOwnership.toFixed(1)}%</p>
          </div>
        </div>
    );
  };

  const renderStockDetail = () => {
    if (stockLoading) return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400"><RefreshIcon className="w-8 h-8 animate-spin mb-4 opacity-50" /><p className="text-sm font-medium">Loading Data...</p></div>
    );

    if (!selectedStock) return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-base font-medium opacity-60">{t.searchPrompt}</p>
        </div>
      );

    const colors = getMarketColors(selectedStock.market);
    const { isTwOpen, isUsOpen } = getMarketStatus();
    const isTwStock = isTwSymbol(selectedStock.symbol);
    const isOpen = isTwStock ? isTwOpen : isUsOpen;

    let mainColor = colors.neutralText;
    let Icon = null;
    
    if (selectedStock.change > 0) {
        mainColor = colors.upText;
        Icon = TrendUpIcon;
    } else if (selectedStock.change < 0) {
        mainColor = colors.downText;
        Icon = TrendDownIcon;
    }

    return (
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Main Price Card */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-md">
                   {selectedStock.symbol}
                </span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedStock.name}</h2>
              </div>
              
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className={`text-5xl font-bold tracking-tighter ${mainColor}`}>
                  {selectedStock.price}
                </span>
                <div className={`flex items-center gap-2 text-xl font-medium ${mainColor}`}>
                   {Icon && <Icon className="w-6 h-6" />}
                   <span>{selectedStock.change > 0 ? '+' : ''}{selectedStock.change}</span>
                   <span>({selectedStock.changePercent}%)</span>
                </div>
              </div>
              
               <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>{t.lastUpdate}: {formatTime(selectedStock.lastTradeTime)}</span>
                    {selectedStock.isDelayed && (
                        <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded ml-2">
                            {t.delayed} (15m+)
                        </span>
                    )}
               </div>

            </div>
            <button onClick={() => toggleWatchlist(selectedStock.symbol)} className="p-3 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
               <HeartIcon filled={isFav(selectedStock.symbol)} className={isFav(selectedStock.symbol) ? "text-red-500" : "text-gray-400"} />
            </button>
          </div>
        </div>

        {/* Strategy Banner */}
        <div className={`px-4 py-3 rounded-2xl flex items-center justify-between ${investmentMode === 'SHORT_TERM' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${investmentMode === 'SHORT_TERM' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    🎯
                </div>
                <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wide ${investmentMode === 'SHORT_TERM' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {investmentMode === 'SHORT_TERM' ? t.shortTerm : t.longTerm} Mode
                    </h3>
                    <p className="text-[11px] opacity-70 dark:text-gray-300">
                        {investmentMode === 'SHORT_TERM' ? t.focusShort : t.focusLong}
                    </p>
                </div>
            </div>
        </div>

        {/* Detail Grid */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {t.keyIndicators}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-md ${isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isOpen ? 'Market Open' : 'Market Closed'}
                </span>
             </div>
             {renderStrategyGrid(selectedStock)}

             <div className="flex flex-wrap gap-2 mt-2">
              {selectedStock.tags.map((tag, i) => (
                <StockTagBadge key={i} tag={tag} market={selectedStock.market} />
              ))}
              {selectedStock.tags.length === 0 && <span className="text-gray-400 text-xs italic">{t.noSignals}</span>}
            </div>
        </div>
        
        {/* Calculator Button */}
        <div className="fixed bottom-6 left-4 right-4 max-w-5xl mx-auto z-20 flex justify-center pointer-events-none">
            <button 
                onClick={() => setIsCalculatorOpen(true)}
                className="pointer-events-auto bg-primary text-white px-8 py-3 rounded-full shadow-lg hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all font-semibold flex items-center gap-2 backdrop-blur-md bg-opacity-90"
            >
                <CalculatorIcon />
                <span>{t.calculate}</span>
            </button>
        </div>
      </div>
    );
  };

  const renderStockList = (stocks: StockData[], title: string) => {
      // (Implementation same as before, no changes to list rendering)
      if (stocks.length === 0) return (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
             <p className="text-sm font-medium opacity-60">No stocks found in this market filter.</p>
          </div>
      );

      return (
          <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1 ml-1">
                  {title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stocks.map(stock => {
                    const score = getSuitabilityScore(stock);
                    const styleClass = getCardStyle(score, stock.market);
                    const status = getStatusLabel(score, stock.market);
                    const colors = getMarketColors(stock.market);
                    
                    let priceColor = colors.neutralText;
                    let badgeColor = colors.neutralBg;
                    if (stock.change > 0) {
                        priceColor = colors.upText;
                        badgeColor = colors.upBg;
                    } else if (stock.change < 0) {
                        priceColor = colors.downText;
                        badgeColor = colors.downBg;
                    }

                    return (
                        <div 
                            key={stock.symbol} 
                            onClick={() => handleSelectStock(stock.symbol)} 
                            className={`cursor-pointer p-4 rounded-2xl relative ${styleClass}`}
                        >
                            <div className="flex justify-between items-start"> 
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                        {stock.symbol}
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate max-w-[150px] font-medium">{stock.name}</p>
                                </div>
                                
                                <div className="text-right">
                                     <div className="flex items-center justify-end gap-2">
                                        <span className={`text-xl font-bold tracking-tight ${priceColor}`}>
                                            {stock.price}
                                        </span>
                                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${badgeColor} text-white min-w-[60px] text-center`}>
                                            {stock.change > 0 ? '+' : ''}{stock.changePercent}%
                                        </div>
                                     </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-2">
                                <span className="text-[10px] text-gray-400">
                                    {formatTime(stock.lastTradeTime)}
                                </span>
                                {stock.isDelayed && (
                                    <span className="text-[10px] text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-1 rounded">
                                        15m Delay
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 flex justify-between items-end">
                                <div className="flex gap-1 flex-wrap">
                                    {stock.tags.slice(0, 2).map((t, i) => (
                                        <StockTagBadge key={i} tag={t} market={stock.market} />
                                    ))}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${status.className}`}>
                                    {status.text}
                                </span>
                            </div>
                        </div>
                    )
                })}
              </div>
          </div>
      );
  };

  const renderWatchlist = () => {
    if (watchlist.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
           <HeartIcon className="w-12 h-12 mb-4 opacity-20" />
           <p className="text-base font-medium opacity-60">{t.noWatchlist}</p>
           <button onClick={() => setActiveTab('SEARCH')} className="mt-4 text-primary font-bold hover:underline">
               {t.stockSearch} →
           </button>
        </div>
      );
    }

    return (
      <div className="animate-fade-in pb-20">
         <div className="flex justify-between items-center mb-4 px-2">
            <div className="w-[180px]">
                <SegmentedControl 
                    value={marketFilter}
                    onChange={(val) => setMarketFilter(val as MarketFilter)}
                    options={[
                        { value: 'ALL', label: 'All' },
                        { value: 'TW', label: 'TW' },
                        { value: 'US', label: 'US' },
                    ]}
                />
            </div>

            <button 
               onClick={() => setSortOption(prev => prev === 'SUITABILITY' ? 'CHANGE_DESC' : prev === 'CHANGE_DESC' ? 'PRICE_DESC' : 'SUITABILITY')}
               className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
               <SortIcon className="w-3 h-3" />
               <span>
                   {sortOption === 'SUITABILITY' ? 'Sort: Strategy' : sortOption === 'CHANGE_DESC' ? 'Sort: Change %' : 'Sort: Price'}
               </span>
            </button>
         </div>
         {renderStockList(sortedAndFilteredWatchlist, '')}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} font-sans`}>
      <header className="sticky top-0 z-30 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <h1 className="text-lg font-bold text-black dark:text-white tracking-tight hidden md:block">
                SmartTrade
             </h1>
          </div>

          <div className="flex-1 max-w-sm relative group">
             <div className="relative">
                <SearchIcon className="absolute left-3 top-2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-gray-200/50 dark:bg-gray-800/50 text-black dark:text-white focus:bg-white dark:focus:bg-gray-700 outline-none transition-all text-sm placeholder-gray-500"
                />
             </div>
             {searchResults.length > 0 && (
               <div className="absolute top-full mt-2 left-0 right-0 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                 {searchResults.map((stock, idx) => (
                   <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition border-b border-gray-100 dark:border-gray-700 last:border-0" onClick={() => handleSelectStock(stock)}>
                      <div>
                        <span className="font-bold text-black dark:text-white">{stock.symbol}</span>
                        <span className="ml-2 text-gray-500 text-xs">{stock.name}</span>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="flex items-center gap-3">
            <button 
                onClick={() => setLanguage(prev => prev === 'zh' ? 'en' : 'zh')}
                className="px-2 py-1 text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
                {language === 'zh' ? 'EN' : '中'}
            </button>

            {user ? (
               <button onClick={handleLogout} className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
               </button>
            ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="text-primary text-sm font-semibold hover:opacity-80 transition"
                >
                  {t.login}
                </button>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300">
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center my-8 gap-6">
            <div className="w-full md:w-auto min-w-[200px]">
                 <SegmentedControl 
                    value={activeTab}
                    onChange={setActiveTab}
                    options={[
                        { value: 'SEARCH', label: t.stockSearch },
                        { value: 'WATCHLIST', label: t.watchlist },
                    ]}
                 />
            </div>
            <div className="w-full md:w-auto min-w-[200px]">
                <SegmentedControl 
                    value={investmentMode}
                    onChange={setInvestmentMode}
                    options={[
                        { value: 'SHORT_TERM', label: t.shortTerm },
                        { value: 'LONG_TERM', label: t.longTerm },
                    ]}
                 />
            </div>
        </div>

        {activeTab === 'SEARCH' ? renderStockDetail() : renderWatchlist()}
      </main>

      {/* Floating Refresh Controls */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-center">
         <div 
            onClick={() => loadWatchlistData(false, false)} 
            title="Refresh All (Manual)"
            className={`w-10 h-10 flex items-center justify-center bg-gray-200/90 dark:bg-gray-700/90 backdrop-blur-md text-gray-600 dark:text-gray-300 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
         >
            <RefreshIcon className="w-5 h-5" />
         </div>

         <div 
            onClick={() => setIsPaused(!isPaused)} 
            title={isPaused ? "Resume Auto-Refresh" : "Pause Auto-Refresh"}
            className={`w-10 h-10 flex items-center justify-center ${isPaused ? 'bg-green-500' : 'bg-red-500'} text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform`}
         >
            {isPaused ? <PlayIcon className="w-4 h-4 ml-0.5" /> : <PauseIcon className="w-4 h-4" />}
         </div>
      </div>

      {selectedStock && (
        <CalculatorModal 
          isOpen={isCalculatorOpen} 
          onClose={() => setIsCalculatorOpen(false)} 
          stock={selectedStock}
          mode={investmentMode}
          lang={language}
        />
      )}
      
      <StrategyGuide 
        isOpen={showStrategyGuide}
        onClose={() => setShowStrategyGuide(false)}
        lang={language}
      />
      
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        lang={language}
      />

    </div>
  );
}