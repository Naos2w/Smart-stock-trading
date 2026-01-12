import { GoogleGenAI } from "@google/genai";
import { StockData, InvestmentMode, AppLanguage } from "../types";
import { calculateInvestment } from "./stockService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getGeminiInsight = async (stock: StockData, mode: InvestmentMode, lang: AppLanguage): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    return lang === 'zh' 
      ? "AI 分析暫時無法使用 (缺少 API Key)。" 
      : "AI Analysis unavailable (Missing API Key).";
  }

  // 1. Pre-calculate precise levels
  const calcResult = calculateInvestment(10000, stock, mode);

  // 2. Prepare detailed technical context
  const technicalContext = `
    Technical Data:
    - Current Price: ${stock.price}
    - ATR (Volatility): ${stock.atr.toFixed(2)}
    - MA20: ${stock.ma20.toFixed(2)}
    - MA60: ${stock.ma60.toFixed(2)}
    - MA240: ${stock.ma240.toFixed(2)}
    - RSI: ${stock.rsi.toFixed(2)}
    - Volume: ${stock.volume} (Vol5: ${stock.vol5})
    
    SYSTEM CALCULATED LEVELS (STRICTLY USE THESE VALUES):
    - Entry Price: ${calcResult.entrySuggestion}
    - Target Price: ${calcResult.targetPrice}
    - Stop Loss Price: ${calcResult.stopLossPrice}
  `;

  // 3. Define Persona and Strategy Logic
  const role = lang === 'zh' 
    ? "你是一位資深的避險基金操盤手。請用繁體中文回答。" 
    : "You are a senior hedge fund manager. Answer in English.";

  const strategyInstruction = mode === 'SHORT_TERM'
    ? `Strategy: Short Term Swing Trading. IMPORTANT: Use the SYSTEM CALCULATED LEVELS provided.`
    : `Strategy: Long Term Value Investing. IMPORTANT: Use the SYSTEM CALCULATED LEVELS provided.`;

  // Explicitly fix potential identity confusion
  const identityEnforcement = `
    CRITICAL INSTRUCTION: 
    The stock being analyzed is strictly **${stock.name}** (Symbol: ${stock.symbol}).
    Do NOT confuse it with other companies in the same sector. 
    (For example, if the symbol is 2344.TW, it is Winbond (華邦電), NOT Macronix (旺宏). If it is 2337, it is Macronix).
    Verify the symbol and name match before generating the response.
  `;

  const prompt = `
    ${role}
    ${identityEnforcement}
    ${strategyInstruction}

    Analyze stock: ${stock.name} (${stock.symbol})
    ${technicalContext}

    Please provide a structured analysis in the following format (Plain text, under 150 words):

    1. **分析觀點 (Analysis)**: Briefly explain the trend and volume status.
    2. **建議操作 (Action)**: Buy / Wait / Sell.
    3. **關鍵點位 (Key Levels)**:
       - 建議進場 (Entry): ${calcResult.entrySuggestion}
       - 目標獲利 (Target): ${calcResult.targetPrice}
       - 停損價格 (Stop): ${calcResult.stopLossPrice}
    
    (Strictly adhere to the provided numbers).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.4, // Lower temperature to reduce hallucinations
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