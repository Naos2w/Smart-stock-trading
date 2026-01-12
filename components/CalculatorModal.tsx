import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    InvestmentMode,
    StockData,
    AppLanguage,
    TRANSLATIONS,
    getMarketColors,
    StrategyResult,
    SwingScoreResult,
    LongTermScoreResult,
    EtfScoreResult,
    ShortTermInvestmentPlan,
    LongTermInvestmentPlan,
    EtfInvestmentPlan,
    StockTag,
    RiskState
} from '../types';
import {
    calculateSwingStrategies,
    calculateSwingScore,
    calculateLongTermScore,
    calculateEtfScore,
    calculateShortTermInvestment,
    calculateLongTermInvestment,
    calculateEtfInvestment,
    generateTags
} from '../services/stockService';
import { getGeminiInsight } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stock: StockData;
  mode: InvestmentMode;
  lang: AppLanguage;
}

const CalculatorModal: React.FC<Props> = ({ isOpen, onClose, stock, mode, lang }) => {
  const [amount, setAmount] = useState<string>('50000'); 
    const [strategies, setStrategies] = useState<StrategyResult[]>([]);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);
  
    const lastSymbolRef = useRef<string>(stock.symbol);

  const t = TRANSLATIONS[lang];
  const marketColors = getMarketColors(stock.market);

      const scoreResult = useMemo(() => {
          if (mode === 'SHORT_TERM') return calculateSwingScore(stock, lang);
          if (mode === 'LONG_TERM') return calculateLongTermScore(stock, lang);
          return calculateEtfScore(stock, lang);
      }, [stock, lang, mode]);

      const investmentPlan = useMemo<ShortTermInvestmentPlan | LongTermInvestmentPlan | EtfInvestmentPlan>(() => {
          if (mode === 'SHORT_TERM') {
              return calculateShortTermInvestment(stock, scoreResult as SwingScoreResult);
          }
          if (mode === 'LONG_TERM') {
              return calculateLongTermInvestment(stock, scoreResult as LongTermScoreResult);
          }
          return calculateEtfInvestment(stock, scoreResult as EtfScoreResult);
      }, [stock, mode, scoreResult]);

      const modeTags = useMemo<StockTag[]>(() => {
          if (scoreResult.tagsUsed && scoreResult.tagsUsed.length > 0) return scoreResult.tagsUsed;
          return generateTags(stock, stock.assetType, lang, mode);
      }, [scoreResult, stock, lang, mode]);

    const swingScore = mode === 'SHORT_TERM' ? (scoreResult as SwingScoreResult) : null;
    const longTermScore = mode === 'LONG_TERM' ? (scoreResult as LongTermScoreResult) : null;
    const etfScore = mode === 'ETF' ? (scoreResult as EtfScoreResult) : null;
    const nonSwingPlan = mode === 'SHORT_TERM' ? null : (investmentPlan as LongTermInvestmentPlan | EtfInvestmentPlan);

      const detailEntries = useMemo(() => {
          if (mode === 'LONG_TERM' && longTermScore) {
              return [
                  { label: t.scoreTrend, value: longTermScore.details.trend },
                  { label: t.scoreStructure, value: longTermScore.details.structure },
                  { label: t.scoreDrawdown, value: longTermScore.details.drawdown },
                  { label: t.scoreVolatility, value: longTermScore.details.volatility }
              ];
          }
          if (mode === 'ETF' && etfScore) {
              return [
                  { label: t.scoreTrend, value: etfScore.details.trend },
                  { label: t.scoreProximity, value: etfScore.details.proximity },
                  { label: t.scoreVolatility, value: etfScore.details.volatility }
              ];
          }
          return [];
      }, [mode, longTermScore, etfScore, t]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'SHORT_TERM') {
        const calculated = calculateSwingStrategies(stock);
        setStrategies(calculated);
        if (stock.symbol !== lastSymbolRef.current) {
            setSelectedStrategyId(null);
        }
    } else {
        setStrategies([]);
        setSelectedStrategyId(null);
    }
  }, [stock, mode, isOpen]);

  useEffect(() => {
      if (stock.symbol !== lastSymbolRef.current) {
          setAiAnalysis('');
          lastSymbolRef.current = stock.symbol;
      }
  }, [stock.symbol]);

  useEffect(() => {
      setAiAnalysis('');
  }, [mode]);

  const handleStrategySelect = (id: string) => {
      if (id !== selectedStrategyId) {
          setSelectedStrategyId(id);
          setAiAnalysis('');
      }
  };

    const handleAskAi = async () => {
            if (!stock) return;
            if (mode === 'SHORT_TERM' && !selectedStrategyId) return;

            const payload = {
                    mode,
                    assetType: stock.assetType,
                    market: stock.market,
                    symbol: stock.symbol,
                    price: stock.price,
                    scoreResult,
                    tags: modeTags,
                    strategies: mode === 'SHORT_TERM' ? strategies : [],
                    focusStrategyId: mode === 'SHORT_TERM' ? selectedStrategyId : undefined,
                    investmentPlan,
                    recentHistorySample: stock.recentHistorySample ?? []
            };

            setIsAiLoading(true);
            setAiAnalysis('');
            try {
                const insight = await getGeminiInsight(payload, lang);
                setAiAnalysis(insight);
            } catch (e) {
                setAiAnalysis('AI Error.');
            } finally {
                setIsAiLoading(false);
            }
    };

  if (!isOpen) return null;

  const currentStrategy = strategies.find(s => s.id === selectedStrategyId);
  const shares = currentStrategy ? Math.floor(parseInt(amount) / (currentStrategy.entryPrice * (stock.market === 'TW' ? 1 : 32.5))) : 0;
  const potentialProfit = currentStrategy ? Math.floor((currentStrategy.targetPrice - currentStrategy.entryPrice) * shares * (stock.market === 'TW' ? 1 : 32.5)) : 0;
  
  const renderAiText = (text: string) => {
      return text.split('\n').map((line, i) => {
          if (line.trim().startsWith('**')) return <strong key={i} className="block mt-2 text-gray-900 dark:text-white">{line.replace(/\*\*/g, '')}</strong>;
          if (line.trim().startsWith('-')) return <li key={i} className="ml-4 list-disc text-gray-700 dark:text-gray-300">{line.replace('-', '')}</li>
          return <p key={i} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{line}</p>
      });
  }

  const getActionClass = (action: string) => {
      if (['ENTER', 'INVEST', 'BUY', 'SCALE_IN', 'DCA'].includes(action)) return marketColors.sentimentBull;
      if (['WATCH', 'WAIT'].includes(action)) return marketColors.neutralBadge;
      return marketColors.sentimentBear;
  };

  const getTagClass = (tag: StockTag) => {
      if (tag.type === 'POSITIVE') return marketColors.sentimentBull;
      if (tag.type === 'NEGATIVE') return marketColors.sentimentBear;
      return marketColors.neutralBadge;
  };

  const getActionText = (action: string) => {
      switch (action) {
          case 'ENTER':
              return t.actionEnter;
          case 'WATCH':
              return t.actionWatch;
          case 'AVOID':
              return t.actionAvoid;
          case 'INVEST':
              return t.actionInvest;
          case 'SCALE_IN':
              return t.actionScaleIn;
          case 'WAIT':
              return t.actionWait;
          case 'BUY':
              return t.actionBuy;
          case 'DCA':
              return t.actionDca;
          default:
              return action;
      }
  };

  const getAllocationLabel = (hint: string) => {
      switch (hint) {
          case 'periodic':
              return t.periodic;
          case 'split':
              return t.split;
          case 'one_time':
              return t.oneTime;
          case 'dca':
              return t.dca;
          default:
              return hint;
      }
  };

  const getVolatilityLabel = (level?: string) => {
      switch (level) {
          case 'LOW':
              return t.low;
          case 'HIGH':
              return t.high;
          case 'MED':
          default:
              return t.med;
      }
  };

  const getRiskNoteFromState = (riskState?: RiskState) => {
      if (!riskState) return '';
      if (riskState.key === 'NO_DATA') {
          return lang === 'zh' ? '缺少 ATR 資料' : 'ATR data unavailable';
      }
      switch (riskState.level) {
          case 'LOW':
              return lang === 'zh' ? '波動低，風險相對溫和' : 'Low volatility, relatively mild risk.';
          case 'MEDIUM':
              return lang === 'zh' ? '波動中性，留意部位控制' : 'Medium volatility, watch position sizing.';
          case 'HIGH':
              return lang === 'zh' ? '波動偏高，需嚴格控管風險' : 'High volatility, strict risk control recommended.';
          default:
              return '';
      }
  };

  const getRiskTagLabel = (riskState?: RiskState) => {
      if (!riskState) return lang === 'zh' ? '—' : '—';
      if (riskState.key === 'NO_DATA') {
          return lang === 'zh' ? '無 ATR 資料' : 'No ATR data';
      }
      switch (riskState.level) {
          case 'LOW':
              return lang === 'zh' ? '低波動風險' : 'Low vol risk';
          case 'MEDIUM':
              return lang === 'zh' ? '中波動風險' : 'Medium vol risk';
          case 'HIGH':
              return lang === 'zh' ? '高波動風險' : 'High vol risk';
          default:
              return lang === 'zh' ? '—' : '—';
      }
  };

  const getRiskBadgeClass = (riskState?: RiskState) => {
      if (!riskState) return marketColors.neutralBadge;
      switch (riskState.level) {
          case 'LOW':
              return marketColors.sentimentBull;
          case 'HIGH':
              return marketColors.sentimentBear;
          case 'MEDIUM':
          case 'UNKNOWN':
          default:
              return marketColors.neutralBadge;
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl z-10">
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {mode === 'SHORT_TERM'
                        ? t.calculatorTitle
                        : mode === 'LONG_TERM'
                            ? t.calculatorLongTitle
                            : t.calculatorEtfTitle}
                </h2>
                <p className="text-xs text-gray-500 font-medium">{stock.name} ({stock.symbol}) - Price: {stock.price}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        <div className="p-5 space-y-6">
            
            {/* Input - Always visible */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                   {t.investAmount}
                </label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary outline-none text-lg font-bold text-gray-900 dark:text-white transition-all"
                />
            </div>

            {mode === 'SHORT_TERM' ? (
                swingScore ? (
                <>
                    {/* STEP 1: Swing Score Analysis */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t.trendCheck}</h3>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-gray-100 dark:border-gray-700">
                                    <span className="text-xl font-bold dark:text-white">{swingScore.totalScore}</span>
                                    <span className="absolute text-[8px] text-gray-400 bottom-2">/100</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 uppercase font-bold">{t.score}</span>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full mt-1 w-fit ${getActionClass(swingScore.action)}`}>
                                        {getActionText(swingScore.action)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Score Breakdown Mini-Grid */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                                <div className="text-xs">
                                    <span className="text-gray-400 mr-2">{t.scoreTrend}</span>
                                    <span className="font-bold dark:text-white">{swingScore.details.trend}/30</span>
                                </div>
                                <div className="text-xs">
                                    <span className="text-gray-400 mr-2">{t.scoreMomentum}</span>
                                    <span className="font-bold dark:text-white">{swingScore.details.momentum}/25</span>
                                </div>
                                <div className="text-xs">
                                    <span className="text-gray-400 mr-2">{t.scoreVol}</span>
                                    <span className="font-bold dark:text-white">{swingScore.details.volume}/20</span>
                                </div>
                                <div className="text-xs">
                                    <span className="text-gray-400 mr-2">{t.scoreRisk}</span>
                                    <span className="font-bold dark:text-white">{swingScore.details.risk}/25</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: Strategy Selection */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t.step2}</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {strategies.map((strategy) => (
                                <div 
                                    key={strategy.id}
                                    onClick={() => handleStrategySelect(strategy.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                                        selectedStrategyId === strategy.id 
                                        ? 'border-primary bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-primary shadow-sm' 
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    } ${!strategy.conditionMet ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm dark:text-white">{strategy.name}</span>
                                        {strategy.conditionMet && (
                                            <span className="w-2 h-2 bg-green-500 rounded-full shadow-sm" title="Condition Met"></span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 line-clamp-2">{strategy.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* STEP 3 & 4: Result Panel (Only if selected) */}
                    {currentStrategy && (
                         <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden animate-fade-in">
                            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t.step3} & {t.step4}</h3>
                            </div>
                            
                            <div className="p-4 space-y-4">
                                {/* The Numbers */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">{t.entryZone}</div>
                                        <div className="text-sm font-bold dark:text-white">
                                            {currentStrategy.entryPrice}
                                            {currentStrategy.entryPriceHigh ? ` - ${currentStrategy.entryPriceHigh}` : ''}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                                        <div className="text-[10px] text-red-500 uppercase font-bold">{t.stopLoss}</div>
                                        <div className="text-sm font-bold text-red-600 dark:text-red-400">{currentStrategy.stopLoss}</div>
                                    </div>
                                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50">
                                        <div className="text-[10px] text-green-500 uppercase font-bold">{t.targetExit}</div>
                                        <div className="text-sm font-bold text-green-600 dark:text-green-400">{currentStrategy.targetPrice}</div>
                                    </div>
                                </div>

                                {/* Validation Check */}
                                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-xl">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500">{t.step4Desc}</span>
                                        <span className="text-lg font-bold dark:text-white">R:R = {currentStrategy.riskRewardRatio.toFixed(1)}</span>
                                    </div>
                                    {currentStrategy.riskRewardRatio >= 2 ? (
                                        <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full tracking-wide">
                                            {t.passed}
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full tracking-wide">
                                            {t.failed}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="text-xs text-gray-400 text-center">
                                    {t.estProfit}: +{potentialProfit.toLocaleString()} TWD
                                </div>

                                {/* AI Button */}
                                <button
                                    onClick={handleAskAi}
                                    disabled={isAiLoading}
                                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                >
                                    {isAiLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>✨ {t.askAi}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* AI Result */}
                            {aiAnalysis && (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">🤖</span>
                                        <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{t.aiAdvice}</span>
                                    </div>
                                    <div className="pl-2 border-l-2 border-indigo-300 text-sm">
                                        {renderAiText(aiAnalysis)}
                                    </div>
                                </div>
                            )}
                         </div>
                    )}
                </>
                    ) : null
                ) : (
                 <div className="space-y-4">
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t.trendCheck}</h3>
                            <span className="text-[10px] font-semibold uppercase text-gray-400">
                                {mode === 'LONG_TERM' ? t.modeLong : t.modeEtf}
                            </span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-gray-100 dark:border-gray-700">
                                        <span className="text-xl font-bold dark:text-white">{scoreResult.totalScore}</span>
                                        <span className="absolute text-[8px] text-gray-400 bottom-2">/100</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase font-bold">{t.score}</span>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full mt-1 w-fit ${getActionClass(scoreResult.action)}`}>
                                            {getActionText(scoreResult.action)}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-right">
                                    {detailEntries.map((entry, idx) => (
                                        <div key={idx} className="text-xs">
                                            <span className="text-gray-400 mr-2">{entry.label}</span>
                                            <span className="font-bold dark:text-white">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.tagsHeadline}</span>
                                {modeTags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {modeTags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium tracking-tight ${getTagClass(tag)}`}
                                                title={tag.desc || tag.label}
                                            >
                                                {tag.label}
                                                {typeof tag.scoreImpact === 'number' && (
                                                    <span className="ml-1 font-semibold">
                                                        {tag.scoreImpact > 0 ? `+${tag.scoreImpact}` : tag.scoreImpact}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400 mt-2 block">{t.noSignals}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t.investmentPlan}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getActionClass(nonSwingPlan!.action)}`}>
                                {getActionText(nonSwingPlan!.action)}
                            </span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">{t.allocation}</span>
                                    <span className="text-sm font-bold dark:text-white">{getAllocationLabel(nonSwingPlan!.allocationHint)}</span>
                                </div>
                                {mode === 'ETF' && (
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">{t.volatility}</span>
                                        <span className="text-sm font-bold dark:text-white">{getVolatilityLabel((nonSwingPlan as EtfInvestmentPlan).volatilityLevel)}</span>
                                    </div>
                                )}
                                {nonSwingPlan?.suggestedEntryZone && (
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">{t.suggestedZone}</span>
                                        <span className="text-sm font-bold dark:text-white">{nonSwingPlan.suggestedEntryZone[0]} - {nonSwingPlan.suggestedEntryZone[1]}</span>
                                    </div>
                                )}
                            </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {t.riskNoteLabel}
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-default ${getRiskBadgeClass(nonSwingPlan!.riskState)}`}
                                        title={getRiskNoteFromState(nonSwingPlan!.riskState)}
                                    >
                                        {getRiskTagLabel(nonSwingPlan!.riskState)}
                                    </span>
                                </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAskAi}
                        disabled={isAiLoading}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition active:scale-95 shadow-lg"
                    >
                        {isAiLoading ? t.analyzing : `✨ ${t.askAi}`}
                    </button>

                    {aiAnalysis && (
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mt-2">
                             {renderAiText(aiAnalysis)}
                         </div>
                    )}
                 </div>
            )}
            
        </div>
      </div>
    </div>
  );
};

export default CalculatorModal;