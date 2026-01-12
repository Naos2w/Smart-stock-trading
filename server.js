
import express from 'express';
import cors from 'cors';
import YahooFinance from 'yahoo-finance2'; 
import dotenv from 'dotenv'; 
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const app = express();
const PORT = 3001;

// yahooFinance is a singleton instance by default, no need to new()
// We can optionally configure it here if needed, e.g. suppression
// yahooFinance.suppressNotices(['yahooSurvey']);

app.use(cors());

// API Keys
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FINMIND_KEY = process.env.FINMIND_API_KEY;

app.get('/', (req, res) => {
  res.send('Smart Stock Trading Backend is Running! (v4.2 with Swing Engine Support)');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// --- Math Helpers (Unchanged) ---
const calculateSMA = (quotes, period) => {
  if (!quotes || quotes.length < period) return 0;
  const slice = quotes.slice(quotes.length - period);
  const sum = slice.reduce((acc, q) => acc + q.close, 0);
  return sum / period;
};

const calculateVolSMA = (quotes, period) => {
  if (!quotes || quotes.length < period) return 0;
  const slice = quotes.slice(quotes.length - period);
  const sum = slice.reduce((acc, q) => acc + q.volume, 0);
  return sum / period;
};

const calculateEMA = (quotes, period, prevEMA = null) => {
  if (!quotes || quotes.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = quotes[0].close; 
  for (let i = 1; i < quotes.length; i++) {
    ema = (quotes[i].close * k) + (ema * (1 - k));
  }
  return ema;
};

const calculateRSI = (quotes, period = 14) => {
  if (!quotes || quotes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = quotes[i].close - quotes[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  let rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateATR = (quotes, period = 14) => {
  if (!quotes || quotes.length < period + 1) return 0;
  const ranges = [];
  for(let i=1; i<quotes.length; i++) {
      const high = quotes[i].high;
      const low = quotes[i].low;
      const prevClose = quotes[i-1].close;
      const tr = Math.max(high-low, Math.abs(high-prevClose), Math.abs(low-prevClose));
      ranges.push(tr);
  }
  if (ranges.length < period) return 0;
  const recentRanges = ranges.slice(ranges.length - period);
  return recentRanges.reduce((a,b)=>a+b, 0) / period;
};

const calculateKD = (quotes, period = 9) => {
    if (!quotes || quotes.length < period) return { k: 50, d: 50 };
    const window = quotes.slice(quotes.length - period);
    const lowMin = Math.min(...window.map(q => q.low));
    const highMax = Math.max(...window.map(q => q.high));
    const close = window[window.length - 1].close;
    
    let rsv = 50;
    if (highMax !== lowMin) {
        rsv = ((close - lowMin) / (highMax - lowMin)) * 100;
    }
    
    const k = (2/3) * 50 + (1/3) * rsv; 
    const d = (2/3) * 50 + (1/3) * k;
    return { k, d };
}

// --- PRIMARY DATA SOURCES ---

// 1. Finnhub Fetcher (For US Stocks)
const fetchFinnhubQuote = async (symbol) => {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Finnhub returns 0s if invalid
    if (data.c === 0 && data.pc === 0) return null;
    return {
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        open: data.o,
        high: data.h,
        low: data.l,
        prevClose: data.pc,
        lastTradeTime: data.t * 1000,
        source: 'Finnhub'
    };
  } catch (e) {
    console.error("Finnhub Fetch Error:", e.message);
    return null;
  }
};

// 2. FinMind Fetcher (For TW Stocks)
const fetchFinMindQuote = async (symbol) => {
    try {
        // FinMind symbols are just numbers (e.g., "2330"), remove .TW
        const cleanSymbol = symbol.replace('.TW', '').replace('.TWO', '');
        
        // We look for today's data.
        const today = new Date().toISOString().split('T')[0];
        let url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${cleanSymbol}&start_date=${today}`;
        
        const headers = {};
        if (FINMIND_KEY) {
            // FinMind typically takes token in URL parameter, but we add to header as well per request
            // Adding to URL query string is standard for their public API
            url += `&token=${FINMIND_KEY}`;
            // Adding to header assuming 'token' key or just generic authorization if needed by specific proxy
            headers['token'] = FINMIND_KEY; 
        }

        const res = await fetch(url, { headers });
        if (!res.ok) return null;
        
        const json = await res.json();
        const data = json.data;
        
        if (!data || data.length === 0) return null;

        // Get the latest entry
        const latest = data[data.length - 1];
        
        const price = latest.close;
        const change = latest.spread || 0;
        const prevClose = price - change; // Reverse calc
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
        
        return {
            price: price,
            change: change,
            changePercent: parseFloat(changePercent.toFixed(2)),
            open: latest.open,
            high: latest.max,
            low: latest.min,
            volume: latest.Trading_Volume,
            lastTradeTime: new Date(latest.date).getTime(), // Usually just YYYY-MM-DD
            source: 'FinMind'
        };

    } catch (e) {
        console.error("FinMind Fetch Error:", e.message);
        return null;
    }
}

// --- API Routes ---

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  try {
    const result = await yahooFinance.search(query);
    const quotes = result.quotes
      .filter(q => q.isYahooFinance)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        nameEn: q.symbol,
        market: q.exchange,
      }));
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stock/:symbol', async (req, res) => {
  try {
    let { symbol } = req.params;
    // Normalize TW symbols for Yahoo
    if (/^\d{4}$/.test(symbol)) symbol = `${symbol}.TW`;

    const isTw = symbol.includes('.TW') || symbol.includes('.TWO');
    const isUS = !isTw;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 400); 

    // 1. Initiate Requests based on Market Type
    const historyPromise = yahooFinance.chart(symbol, { period1: pastDate, interval: '1d', includePrePost: true }).catch(e => null);
    
    let primaryQuotePromise;
    if (isTw) {
        primaryQuotePromise = fetchFinMindQuote(symbol);
    } else if (isUS && FINNHUB_KEY) {
        primaryQuotePromise = fetchFinnhubQuote(symbol);
    } else {
        primaryQuotePromise = Promise.resolve(null);
    }

    // 2. Await Parallel Requests (History is always needed for indicators)
    const [historyResult, primaryQuote] = await Promise.all([
        historyPromise,
        primaryQuotePromise
    ]);

    // 3. Fallback: If Primary Quote failed, try Yahoo Quote
    let yahooQuote = null;
    if (!primaryQuote) {
        try {
            yahooQuote = await yahooFinance.quote(symbol);
        } catch (e) {
            console.error("Yahoo Fallback Error:", e.message);
        }
    }

    // 4. Critical Data Check
    if (!historyResult || (!primaryQuote && !yahooQuote)) {
       return res.status(404).json({ error: 'Stock data not available' });
    }

    // 5. Construct Final Data
    let price, change, changePercent, volume, openPrice, lastTradeTime;
    let isDelayed = false;
    let source = 'Yahoo';

    if (primaryQuote) {
        // USE PRIMARY SOURCE (FinMind or Finnhub)
        price = primaryQuote.price;
        change = primaryQuote.change;
        changePercent = primaryQuote.changePercent;
        openPrice = primaryQuote.open;
        volume = primaryQuote.volume || 0; // Finnhub might not send volume in quote
        lastTradeTime = primaryQuote.lastTradeTime;
        source = primaryQuote.source;
        isDelayed = false; // Assume direct APIs are real-time
        
        // If volume is missing in primary (common in some lightweight quotes), try to grab from Yahoo history/quote
        if (!volume && yahooQuote) volume = yahooQuote.regularMarketVolume;

    } else if (yahooQuote) {
        // USE FALLBACK SOURCE (Yahoo)
        source = 'Yahoo';
        const state = yahooQuote.marketState;
        
        if (state === 'PRE' && yahooQuote.preMarketPrice) {
            price = yahooQuote.preMarketPrice;
            change = yahooQuote.preMarketChange;
            changePercent = yahooQuote.preMarketChangePercent;
            lastTradeTime = yahooQuote.preMarketTime;
        } else if ((state === 'POST' || state === 'POSTPOST' || state === 'CLOSED') && yahooQuote.postMarketPrice) {
            price = yahooQuote.postMarketPrice;
            change = yahooQuote.postMarketChange;
            changePercent = yahooQuote.postMarketChangePercent;
            lastTradeTime = yahooQuote.postMarketTime;
        } else {
            price = yahooQuote.regularMarketPrice;
            change = yahooQuote.regularMarketChange;
            changePercent = yahooQuote.regularMarketChangePercent;
            lastTradeTime = yahooQuote.regularMarketTime;
        }
        
        volume = yahooQuote.regularMarketVolume;
        openPrice = yahooQuote.regularMarketOpen;
        
        if (yahooQuote.exchangeDataDelayedBy && yahooQuote.exchangeDataDelayedBy > 0) {
            isDelayed = true;
        }
    }
    
    // Safety check for lastTradeTime
    if (!lastTradeTime) {
        lastTradeTime = Date.now();
    } else if (lastTradeTime instanceof Date) {
        lastTradeTime = lastTradeTime.getTime();
    }
    
    // Correct seconds to milliseconds if needed (simple heuristic: if year < 1980)
    // 315532800000 is approx year 1980 in ms. 3155328000 is year 2070 in seconds.
    // If < 100000000000 (roughly year 1973 in ms), assume it's seconds.
    if (typeof lastTradeTime === 'number' && lastTradeTime < 100000000000) {
        lastTradeTime *= 1000;
    }

    // --- Indicator Calc (Always uses Yahoo Chart History) ---
    const history = historyResult?.quotes || [];
    const validHistory = history.filter(q => q.close !== null);

    const ma5 = calculateSMA(validHistory, 5);
    const ma10 = calculateSMA(validHistory, 10);
    const ma20 = calculateSMA(validHistory, 20);
    // NEW: Calculate Previous MA20 for Slope
    const ma20Prev = calculateSMA(validHistory.slice(0, -1), 20);

    const ma60 = calculateSMA(validHistory, 60);
    const ma120 = calculateSMA(validHistory, 120);
    const ma240 = calculateSMA(validHistory, 240);
    // NEW: Calculate Previous MA240
    const ma240Prev = calculateSMA(validHistory.slice(0, -1), 240);

    const vol5 = calculateVolSMA(validHistory, 5);
    const vol20 = calculateVolSMA(validHistory, 20);
    const atr = calculateATR(validHistory, 14);
    
    let rsi = 50, rsiPrev = 50;
    if (validHistory.length > 15) {
        rsi = calculateRSI(validHistory.slice(-15), 14);
        rsiPrev = calculateRSI(validHistory.slice(0, -1).slice(-15), 14);
    }

    const { k, d } = calculateKD(validHistory, 9);

    const ema12 = calculateEMA(validHistory.slice(-26), 12);
    const ema26 = calculateEMA(validHistory.slice(-50), 26);
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.8; 
    const macdHist = macdLine - signalLine;

    const recentHistorySample = validHistory.slice(-30).map(q => {
      const dateValue = q.date ? new Date(q.date) : (q.timestamp ? new Date(q.timestamp * 1000) : null);
      const dateStr = dateValue ? dateValue.toISOString().split('T')[0] : '';
      return {
        date: dateStr,
        open: q.open ?? 0,
        high: q.high ?? 0,
        low: q.low ?? 0,
        close: q.close ?? 0,
        volume: q.volume ?? 0
      };
    });

    // Use Yahoo's metadata for name/market as it's usually cleaner
    const metaData = yahooQuote || (historyResult.meta) || {};
    
    const stockData = {
      symbol: symbol.toUpperCase(),
      name: metaData.shortName || metaData.longName || symbol,
      nameEn: metaData.symbol || symbol,
      market: metaData.exchangeName || (isUS ? 'US' : 'TW'),
      
      price: price || 0,
      openPrice: openPrice || 0,
      change: change ? parseFloat(change.toFixed(2)) : 0,
      changePercent: changePercent ? parseFloat(changePercent.toFixed(2)) : 0,
      volume: volume || 0,
      avgVolume: metaData.averageDailyVolume3Month || 0,
      vol5, 
      vol20, 
      marketCap: metaData.marketCap ? formatMarketCap(metaData.marketCap, metaData.exchangeName || '') : 'N/A',
      
      // Fundamentals (Yahoo is still best source for these free)
      peRatio: metaData.trailingPE || 0,
      eps: metaData.epsTrailingTwelveMonths || 0,
      roe: (metaData.epsTrailingTwelveMonths && metaData.bookValue) 
           ? (metaData.epsTrailingTwelveMonths / metaData.bookValue) * 100 
           : 0,
      dividendYield: metaData.dividendYield || 0,
      revenueYoy: 0, 
      institutionalOwnership: 0, 
      
      // Technicals
      ma5, ma10, ma20, ma20Prev, ma60, ma120, ma240, ma240Prev,
      rsi, rsiPrev,
      atr,
      kValue: k, dValue: d,
      macdLine, signalLine, macdHist, macdHistPrev: macdHist,
      
      isMarketOpen: metaData.marketState === 'REGULAR' || metaData.marketState === 'OPEN', 
      isDelayed: isDelayed,
      lastTradeTime: lastTradeTime,
      currency: metaData.currency || 'USD',
      exchange: metaData.exchangeName,
      dataSource: source, // Debug info
      assetType: metaData.quoteType === 'ETF' ? 'ETF' : 'STOCK',
      recentHistorySample
    };

    res.json(stockData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const formatMarketCap = (val, market) => {
  if (!val) return 'N/A';
  const isTW = market.includes('TW') || market.includes('Tai');
  const currencySymbol = isTW ? 'NT$' : 'US$';
  if (val >= 1000000000000) return `${currencySymbol} ${(val / 1000000000000).toFixed(2)}T`;
  if (val >= 1000000000) return `${currencySymbol} ${(val / 1000000000).toFixed(1)}B`;
  return `${currencySymbol} ${(val / 1000000).toFixed(0)}M`;
};

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  if (FINNHUB_KEY) console.log("Finnhub API Enabled for US Stocks");
  if (FINMIND_KEY) console.log("FinMind API Enabled for TW Stocks");
});
