
import { GoogleGenAI } from "@google/genai";
import {
  AppLanguage,
  GeminiInsightPayload,
  ShortTermInvestmentPlan,
  LongTermInvestmentPlan,
  EtfInvestmentPlan
} from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getGeminiInsight = async (
    payload: GeminiInsightPayload,
    lang: AppLanguage
): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    return lang === 'zh' 
      ? "AI 分析暫時無法使用 (缺少 API Key)。" 
      : "AI Analysis unavailable (Missing API Key).";
  }

  const isTW = payload.market.includes('TW') || payload.market.includes('Tai');
  const colorRule = isTW 
    ? "TW: Positive = Red 🔴, Negative = Green 🟢" 
    : "US: Positive = Green 🟢, Negative = Red 🔴";
  const baseInstructions = `You are a professional investment decision engine.

General Rules:
- Respect market color mapping: ${colorRule}
- Output every sentence in Traditional Chinese followed by English (bilingual).
- No intraday assumptions, no financial disclaimers.
- Use only the metrics provided in the JSON payload; do not fabricate data.
`;

  let modeGuidance = '';
  let jsonHint = '';

  if (payload.mode === 'SHORT_TERM') {
      const plan = payload.investmentPlan as ShortTermInvestmentPlan;
      modeGuidance = `Mode: SHORT_TERM swing trading (2–10 days). Highlight momentum, trend, and risk observations from scoreResult and tags. Use strategies/focusStrategyId if provided.
Reference holdingDaysRecommendation from investmentPlan.`;
      jsonHint = `Required JSON (Plan) format:
{
  "action": "${plan.action}",
  "entryZone": [${plan.entryZone[0]}, ${plan.entryZone[1]}],
  "stopLoss": ${plan.stopLoss},
  "target": ${plan.target},
  "holdingDaysRecommendation": "${plan.holdingDaysRecommendation}"
}`;
  } else if (payload.mode === 'LONG_TERM') {
      const plan = payload.investmentPlan as LongTermInvestmentPlan;
      modeGuidance = `Mode: LONG_TERM accumulation. Explain structural trend, drawdown control, and volatility context. Emphasize allocationHint and riskNote from the investment plan.`;
      const zone = plan.suggestedEntryZone ? `[${plan.suggestedEntryZone[0]}, ${plan.suggestedEntryZone[1]}]` : 'null';
      jsonHint = `Required JSON (Plan) format:
{
  "action": "${plan.action}",
  "allocationHint": "${plan.allocationHint}",
  "riskNote": "<bilingual note>",
  "suggestedEntryZone": ${zone}
}`;
  } else {
      const plan = payload.investmentPlan as EtfInvestmentPlan;
      modeGuidance = `Mode: ETF long-term positioning. Discuss distance to MA240, slope, and volatility level. Connect allocationHint and volatilityLevel.`;
      const zone = plan.suggestedEntryZone ? `[${plan.suggestedEntryZone[0]}, ${plan.suggestedEntryZone[1]}]` : 'null';
      jsonHint = `Required JSON (Plan) format:
{
  "action": "${plan.action}",
  "allocationHint": "${plan.allocationHint}",
  "volatilityLevel": "${plan.volatilityLevel}",
  "riskNote": "<bilingual note>",
  "suggestedEntryZone": ${zone}
}`;
  }

  const contextJson = JSON.stringify(payload, null, 2);

  const prompt = `${baseInstructions}
${modeGuidance}

Deliver the response with:
1. **Mode:** and **Action Summary:** line matching the provided action string.
2. A bilingual bullet list of key positives and risks using the supplied metrics.
3. A short paragraph advising execution notes.
4. A fenced JSON block labeled Plan following this schema:
${jsonHint}

Context JSON:
${contextJson}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1, 
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
