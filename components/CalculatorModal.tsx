import React, { useState, useEffect, useRef } from 'react';
import { CalculatorResult, InvestmentMode, StockData, AppLanguage, TRANSLATIONS, getMarketColors, StrategyResult, SwingScoreResult } from '../types';
import { calculateInvestment, calculateSwingStrategies, calculateSwingScore } from '../services/stockService';
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
  const [swingScore, setSwingScore] = useState<SwingScoreResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const lastSymbolRef = useRef<string>(stock.symbol);
  const [longTermResult, setLongTermResult] = useState<CalculatorResult | null>(null);

  const t = TRANSLATIONS[lang];
  const marketColors = getMarketColors(stock.market);

  useEffect(() => {
    if (isOpen && stock) {
        if (mode === 'SHORT_TERM') {
            const calculated = calculateSwingStrategies(stock);
            setStrategies(calculated);
            setSwingScore(calculateSwingScore(stock));

            // Don't auto-select. Force user to choose in Step 2.
            if (stock.symbol !== lastSymbolRef.current) {
                 setSelectedStrategyId(null);
            }
        } else {
            const val = parseFloat(amount) || 0;
            setLongTermResult(calculateInvestment(val, stock, mode));
        }
    }
  }, [stock, mode, isOpen, amount]);

  useEffect(() => {
      if (stock.symbol !== lastSymbolRef.current) {
          setAiAnalysis('');
          lastSymbolRef.current = stock.symbol;
      }
  }, [stock.symbol]);

  useEffect(() => {
      if (mode === 'LONG_TERM' && stock) {
          const val = parseFloat(amount);
          if(!isNaN(val)) setLongTermResult(calculateInvestment(val, stock, mode));
      }
  }, [amount, mode, stock]);

  const handleStrategySelect = (id: string) => {
      if (id !== selectedStrategyId) {
          setSelectedStrategyId(id);
          setAiAnalysis('');
      }
  };

  const handleAskAi = async () => {
      if (!stock || !selectedStrategyId) return;
      const strategy = strategies.find(s => s.id === selectedStrategyId);
      setIsAiLoading(true);
      setAiAnalysis('');
      try {
        const insight = await getGeminiInsight(stock, mode, lang, strategy);
        setAiAnalysis(insight);
      } catch (e) {
        setAiAnalysis("AI Error.");
      } finally {
        setIsAiLoading(false);
      }
  };

  const handleAskAiLongTerm = async () => {
      setIsAiLoading(true);
      try {
        const insight = await getGeminiInsight(stock, mode, lang);
        setAiAnalysis(insight);
      } catch (e) {
          setAiAnalysis("AI Error");
      } finally {
          setIsAiLoading(false);
      }
  }

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

  const getActionColor = (action: string) => {
      if (action === 'ENTER') return 'bg-green-500';
      if (action === 'WATCH') return 'bg-yellow-500';
      return 'bg-red-500';
  }

  const getActionText = (action: string) => {
      if (action === 'ENTER') return t.actionEnter;
      if (action === 'WATCH') return t.actionWatch;
      return t.actionAvoid;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl z-10">
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {mode === 'SHORT_TERM' ? t.calculatorTitle : '長期存股試算'}
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

            {mode === 'SHORT_TERM' && swingScore ? (
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
                                    <span className={`px-3 py-1 text-xs font-bold text-white rounded-full mt-1 w-fit ${getActionColor(swingScore.action)}`}>
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
                                        <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border border-green-200 dark:border-green-500/30 text-xs font-bold rounded-full">
                                          {t.passed}
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-500/30 text-xs font-bold rounded-full">
                                          {t.failed} (&gt; 2)
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
            ) : (
                 // Long Term View (Unchanged basically)
                 <div className="space-y-4">
                    {longTermResult && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-500">建議進場 (年線附近)</span>
                                <span className={`text-xl font-bold ${marketColors.upText}`}>{longTermResult.entrySuggestion}</span>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-500">預估股數</span>
                                <span className="text-xl font-bold dark:text-white">{longTermResult.shares}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">潛在獲利 (+20%)</span>
                                <span className={`text-xl font-bold ${marketColors.upText}`}>+{longTermResult.potentialGain.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                    
                    <button
                        onClick={handleAskAiLongTerm}
                        disabled={isAiLoading}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition active:scale-95 shadow-lg"
                    >
                        {isAiLoading ? t.analyzing : t.askAi}
                    </button>

                    {aiAnalysis && (
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mt-4">
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