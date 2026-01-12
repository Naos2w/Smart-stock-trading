
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
  const positiveEmoji = isTW ? '🔴' : '🟢';
  const negativeEmoji = isTW ? '🟢' : '🔴';

  const languageDirective = lang === 'zh'
    ? '語言強制規則（優先級最高）：全篇必須使用繁體中文撰寫，嚴禁出現任何英文或其他語言用詞，也不可重複以多種語言輸出。'
    : 'Language override (highest priority): respond entirely in English only. Do not include Chinese characters, other languages, or bilingual duplicates anywhere.';

  const colorRule = isTW
    ? 'Taiwan market color rule: positive points use 🔴, negative points use 🟢.'
    : 'US market color rule: positive points use 🟢, negative points use 🔴.';

  const assetType = payload.assetType;
  const requestedMode = payload.mode;
  let effectiveMode: 'SHORT_TERM' | 'LONG_TERM' | 'ETF';

  if (assetType === 'ETF') {
    effectiveMode = 'ETF';
  } else {
    effectiveMode = requestedMode === 'SHORT_TERM' ? 'SHORT_TERM' : 'LONG_TERM';
  }

  const assetDirective = assetType === 'ETF'
    ? 'AssetType Enforcement (CRITICAL OVERRIDE): 目前標的為 ETF。不得猜測或更改資產類型，必須完全依照 payload.assetType 判斷。只能採用 ETF 長期累積觀點，聚焦 MA240 所在位置、MA240 斜率、波動度與定期定額 (DCA) 或單筆投入策略，建議動作僅能為 BUY、DCA、WAIT。嚴禁談及停損、目標價、短線進場、波段交易，以及任何僅適用於個股的用語或邏輯。此規則優先於任何模式欄位。'
    : 'AssetType Enforcement (CRITICAL OVERRIDE): 目前標的為個股 (STOCK)。不得猜測或更改資產類型，必須完全依照 payload.assetType 判斷。禁止套用任何 ETF 的被動累積、DCA 專屬術語或 ETF 波動平滑概念。你必須只在 SHORT_TERM 或 LONG_TERM(股票) 二選一模式中進行說明：SHORT_TERM 聚焦進場區間、停損、目標與持有天數；LONG_TERM 聚焦 MA240 結構、風險回撤控制與波動度。嚴禁對個股使用任何 ETF 分析框架。';

  let modeGuidance = '';
  let jsonHint = '';

  if (effectiveMode === 'SHORT_TERM') {
    const plan = payload.investmentPlan as ShortTermInvestmentPlan;
    modeGuidance = `Mode: SHORT_TERM swing evaluation for stocks only. Focus strictly on entry zone, stop loss, target, and holding days from the provided plan. Do not mention ETF strategies or long-term ETF accumulation.`;
    jsonHint = JSON.stringify({
      action: plan.action,
      entryZone: plan.entryZone,
      stopLoss: plan.stopLoss,
      target: plan.target,
      holdingDaysRecommendation: plan.holdingDaysRecommendation
    });
  } else if (effectiveMode === 'LONG_TERM') {
    const plan = payload.investmentPlan as LongTermInvestmentPlan;
    modeGuidance = `Mode: LONG_TERM stock accumulation. Discuss MA240 structure, drawdown control, and volatility only. Do not reference ETF accumulation concepts or DCA exclusivity.`;
    jsonHint = JSON.stringify({
      action: plan.action,
      allocationHint: plan.allocationHint,
      riskNote: plan.riskNote,
      suggestedEntryZone: plan.suggestedEntryZone ?? null
    });
  } else {
    const plan = payload.investmentPlan as EtfInvestmentPlan;
    modeGuidance = `Mode: ETF long-term accumulation only. Emphasize MA240 position, MA240 slope, volatility, and accumulation strategy (DCA or one-time). Never mention stop loss, target price, or short-term trading.`;
    jsonHint = JSON.stringify({
      action: plan.action,
      allocationHint: plan.allocationHint,
      volatilityLevel: plan.volatilityLevel,
      riskNote: plan.riskNote,
      suggestedEntryZone: plan.suggestedEntryZone ?? null
    });
  }

  const structureInstruction = lang === 'zh'
    ? `輸出結構必須嚴格遵守下列順序與格式：
1. 第一行必須以「Mode: 」起頭，直接寫出最終採用的分析模式與重點。
2. 第二行必須以「Action Summary: 」起頭提供單句摘要。
3. 接著列出所有正面重點，每行皆以「- ${positiveEmoji} 」開頭，使用純繁體中文敘述，不得出現其他符號或語言。
4. 緊接列出所有風險重點，每行皆以「- ${negativeEmoji} 」開頭，使用純繁體中文敘述。
5. 之後撰寫一段不分行的執行建議短段落（不得再出現項目符號、JSON 符號或英文字）。
6. 最後獨立輸出一行「Plan」，緊接一個以 \`\`\`json 包覆的唯一 JSON 區塊。除該區塊外，敘事段落禁止出現任何 JSON 樣式或代碼圍欄。`
    : `Rigid output order:
1. First line must begin with "Mode: " and state the final analysis mode and emphasis.
2. Second line must begin with "Action Summary: " and contain exactly one English sentence.
3. List all positive points next, each line starting with "- ${positiveEmoji} " and containing only English text.
4. Immediately list all risk points, each line starting with "- ${negativeEmoji} " and containing only English text.
5. Follow with exactly one short execution note paragraph (no bullets, braces, or non-English words).
6. Finish with a standalone line "Plan" and then a single JSON block wrapped in \`\`\`json fences. The narrative above must never include JSON syntax or fenced code.`;

  const contextJson = JSON.stringify({ ...payload, mode: effectiveMode }, null, 2);

  const prompt = `
${languageDirective}
${colorRule}
${assetDirective}
${modeGuidance}

CRITICAL UI OUTPUT RULE (Highest Priority):
- This is NOT an API response
- DO NOT output JSON, objects, arrays, braces, or code fences
- DO NOT use markdown fences (no \`\`\`)
- Output must be human-readable narrative text only
- The content will be rendered line-by-line in a React UI

${structureInstruction.replace(/Plan[\s\S]*/g, '')}

Data context (for reasoning only, do not repeat or reformat):
${contextJson}

Instruction:
Explain the investment plan to a human investor.
Do not invent indicators, numbers, or targets.
Do not restate raw data.
Focus on interpretation, reasoning, and execution mindset only.
`;

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
