import { GoogleGenAI } from "@google/genai";
import { StockData, InvestmentMode, AppLanguage, StrategyResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getGeminiInsight = async (
    stock: StockData, 
    mode: InvestmentMode, 
    lang: AppLanguage,
    selectedStrategy?: StrategyResult
): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    return lang === 'zh' 
      ? "AI 分析暫時無法使用 (缺少 API Key)。" 
      : "AI Analysis unavailable (Missing API Key).";
  }

  // Detect Market for Color Rules
  const isTW = stock.market.includes('TW') || stock.market.includes('Tai') || stock.currency === 'TWD';
  
  let prompt = "";

  if (mode === 'SHORT_TERM') {
      // --- SWING TRADING DECISION ENGINE PROMPT ---
      prompt = `
You are a professional swing-trading decision engine.

Market rules:
- Market type: ${isTW ? 'TW (Taiwan Stock Market)' : 'US (US Stock Market)'}
- Color rules are FIXED:
  - ${isTW ? '🔴 Positive/Bullish = Red, 🟢 Negative/Bearish = Green' : '🟢 Positive/Bullish = Green, 🔴 Negative/Bearish = Red'}
  - Use these emojis to represent the colors in your output.

Input data (daily-based):
- Symbol: ${stock.symbol} (${stock.name})
- Price: ${stock.price}
- MA20: ${stock.ma20.toFixed(2)}
- MA60: ${stock.ma60.toFixed(2)}
- Previous MA20: ${stock.ma20Prev ? stock.ma20Prev.toFixed(2) : 'N/A'}
- RSI (14): ${stock.rsi.toFixed(2)}
- ATR: ${stock.atr.toFixed(2)}
- Vol5: ${stock.vol5}
- Vol20: ${stock.vol20}
- Active Tags: ${stock.tags.map(t => `${t.label} (${t.scoreImpact || 0})`).join(', ')}

Scoring rules (DO NOT CHANGE):
1. Trend Score (0–30)
   - price > ma20: +10
   - ma20 > ma60: +10
   - ma20 > previous ma20: +10

2. Momentum Score (0–25)
   - RSI 45–65: +15
   - RSI 40–44: +8
   - RSI > 70: -5
   - price > ma20 + atr * 0.3: +10

3. Volume Score (0–20)
   - vol5 >= vol20: +10
   - vol5 >= vol20 * 1.2: +5
   - vol5 < vol20 * 0.7: -5

4. Risk Score (start from 25)
   - RSI > 75: -5
   - atr / price > 0.05: -5
   - price < ma20: -10

Tag Score:
- Sum of impacts provided in input tags, capped at ±15.

Final Score = Base Score + Tag Score

Decision Logic:
- Score >= 85 → ENTER
- Score 70–84 → WATCH
- Score < 70 → AVOID

Output requirements:
1. Swing Score (0–100)
2. Action (ENTER / WATCH / AVOID)
3. Provide a brief bilingual explanation (Traditional Chinese + English).
4. Highlight positive and negative factors using correct market color emojis (🔴/🟢).
5. Do NOT give financial advice disclaimers.
6. Do NOT use intraday assumptions.

Format:
**Swing Score: [SCORE]/100**
**Action: [ACTION]**

[Bilingual Explanation Here using bullets and emojis]
`;
  } else {
      // --- LONG TERM PROMPT (Unchanged but cleaned up) ---
      prompt = `
        You are a disciplined senior value investor.
        Analyze stock: **${stock.name} (${stock.symbol})** for **Long Term Value Investing**.

        Technical Context:
        - Price: ${stock.price}
        - MA240: ${stock.ma240.toFixed(2)} (Long term line)
        - ROE: ${stock.roe.toFixed(2)}%
        - Dividend Yield: ${stock.dividendYield.toFixed(2)}%
        - Institutional Ownership: ${stock.institutionalOwnership}%

        Please provide:
        1. **Trend Analysis**: Bullish or Bearish long-term structure?
        2. **Action**: Buy / Wait / Sell.
        3. **Key Levels**: Suggest a safe entry zone based on MA240 or Support.
        
        Answer in ${lang === 'zh' ? 'Traditional Chinese' : 'English'}. Keep it concise.
      `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1, // Very strict adherence to rules
      }
    });
    return response.text || "Analysis pending...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'zh' 
      ? "AI 分析暫時無法使用，請參考技術指標。" 
      : "AI Analysis temporarily unavailable. Please rely on technical tags.";
  }
};