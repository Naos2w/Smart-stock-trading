import React, { useState, useEffect } from 'react';
import { CalculatorResult, InvestmentMode, StockData, AppLanguage, TRANSLATIONS, getMarketColors } from '../types';
import { calculateInvestment } from '../services/stockService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stock: StockData;
  mode: InvestmentMode;
  lang: AppLanguage;
}

const CalculatorModal: React.FC<Props> = ({ isOpen, onClose, stock, mode, lang }) => {
  const [amount, setAmount] = useState<string>('20000'); 
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const t = TRANSLATIONS[lang];
  const marketColors = getMarketColors(stock.market);

  useEffect(() => {
    if (stock && amount) {
        const val = parseFloat(amount);
        if(!isNaN(val)) {
            setResult(calculateInvestment(val, stock, mode));
        }
    }
  }, [stock, amount, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            {t.calculatorTitle}
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${mode === 'SHORT_TERM' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                {mode === 'SHORT_TERM' ? t.shortTerm : t.longTerm}
            </span>
          </h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.investAmount}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
            />
          </div>

          {result && (
            <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              {/* Row 1: Price & Exchange */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t.currentPrice}</span>
                <span className="font-semibold dark:text-gray-200">
                    {stock.market === 'US' ? 'US$' : 'NT$'}{result.sharePrice}
                </span>
              </div>
               {stock.market === 'US' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t.exchangeRate}</span>
                    <span className="font-semibold dark:text-gray-200">
                        {result.exchangeRate} TWD/USD
                    </span>
                  </div>
               )}
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
              
              {/* Row 2: Shares */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">{t.estShares}</span>
                <span className="font-bold text-lg dark:text-white">{result.shares}</span>
              </div>

              {/* Row 3: Entry */}
              <div className="flex justify-between items-start">
                <span className="text-gray-600 dark:text-gray-300 mt-1">{t.suggestedEntry}</span>
                <div className="text-right">
                    <span className="font-bold text-gray-800 dark:text-white block">
                        {stock.market === 'US' ? '$' : 'NT$'}{result.entrySuggestion}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                        ({t.formulaEntry})
                    </span>
                </div>
              </div>

               {/* Row 4: Stop Loss */}
               <div className="flex justify-between items-start">
                <span className="text-gray-600 dark:text-gray-300 mt-1">{t.stopLoss}</span>
                <div className="text-right">
                    <span className={`font-bold block ${marketColors.downText}`}>
                        {stock.market === 'US' ? '$' : 'NT$'}{result.stopLossPrice}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                        (Entry - {mode === 'SHORT_TERM' ? '1.5 ATR' : '10%'})
                    </span>
                </div>
              </div>

              {/* Row 5: Target Exit */}
              <div className="flex justify-between items-start">
                <span className="text-gray-600 dark:text-gray-300 mt-1">{t.targetExit}</span>
                <div className="text-right">
                    <span className={`font-bold block ${marketColors.upText}`}>
                        {stock.market === 'US' ? '$' : 'NT$'}{result.targetPrice}
                    </span>
                    <span className={`text-[10px] ${marketColors.upText} block`}>
                        {mode === 'SHORT_TERM' ? t.formulaTargetShort : t.formulaTargetLong}
                    </span>
                </div>
              </div>
              
              {/* Footer: Profit */}
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
                 <p className="text-xs text-gray-500 mb-1">{t.potentialProfit}</p>
                 <p className={`text-xl font-bold ${marketColors.upText}`}>+{result.potentialGain.toLocaleString()} TWD</p>
                 <p className={`text-xs ${marketColors.upText}`}>(+{result.potentialGainPercent}%)</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorModal;