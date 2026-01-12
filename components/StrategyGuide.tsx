import React from 'react';
import { AppLanguage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: AppLanguage;
}

const StrategyGuide: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const content = lang === 'zh' ? (
      <div className="space-y-6">
          <section>
              <h3 className="text-xl font-bold text-red-500 mb-2">一、短線交易 (Short Term / 當沖)</h3>
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">✅ 進場必要條件 (至少 4 個)</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>價格在 <strong>MA20</strong> 上方</li>
                      <li><strong>MA20</strong> 向上 (趨勢保護)</li>
                      <li>突破時成交量 &gt; <strong>VOL5</strong> (量能確認)</li>
                      <li><strong>RSI</strong> &gt; 50 且無背離</li>
                      <li>60分K線同方向 (大週期保護)</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 text-sm">
                      <strong>🛑 停損：</strong> 1.5 倍 ATR<br/>
                      <strong>❌ 禁忌：</strong> 追無量紅K、壓力區硬接
                  </div>
              </div>
          </section>

          <section>
              <h3 className="text-xl font-bold text-orange-500 mb-2">二、波段交易 (Swing Trading)</h3>
              <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">✅ 進場條件</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>站上 <strong>MA20 & MA60</strong></li>
                      <li>回測 MA20 不破</li>
                      <li>量能未明顯萎縮</li>
                      <li>周K線非空頭</li>
                  </ul>
              </div>
          </section>

          <section>
              <h3 className="text-xl font-bold text-green-600 mb-2">三、長期存股 (Long Term)</h3>
              <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">✅ 進場條件</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>股價在 <strong>MA240 (年線)</strong> 之上</li>
                      <li>MA240 上揚或走平</li>
                      <li>產業非下行循環</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 text-sm">
                      <strong>🧠 核心：</strong> 存股 = 不買在長期空頭
                  </div>
              </div>
          </section>

          <section>
              <h3 className="text-xl font-bold text-blue-600 mb-2">四、盤勢判斷 (Trend vs Range)</h3>
              <table className="w-full text-sm border-collapse">
                  <thead>
                      <tr className="bg-blue-100 dark:bg-blue-900 text-left">
                          <th className="p-2">條件</th>
                          <th className="p-2">趨勢盤 (做多)</th>
                          <th className="p-2">震盪盤 (觀望)</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr className="border-b dark:border-gray-700">
                          <td className="p-2 font-bold">MA20</td>
                          <td className="p-2 text-red-500">有斜率</td>
                          <td className="p-2 text-gray-500">走平</td>
                      </tr>
                      <tr className="border-b dark:border-gray-700">
                          <td className="p-2 font-bold">價格</td>
                          <td className="p-2 text-red-500">單邊推進</td>
                          <td className="p-2 text-gray-500">上下刷</td>
                      </tr>
                      <tr>
                          <td className="p-2 font-bold">成交量</td>
                          <td className="p-2 text-red-500">推進放量</td>
                          <td className="p-2 text-gray-500">雜亂</td>
                      </tr>
                  </tbody>
              </table>
          </section>
      </div>
  ) : (
      <div className="space-y-6">
         <section>
              <h3 className="text-xl font-bold text-red-500 mb-2">1. Short Term / Day Trading</h3>
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">✅ Checklist (Match at least 4)</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Price Above <strong>MA20</strong></li>
                      <li><strong>MA20</strong> Rising</li>
                      <li>Volume &gt; <strong>VOL5</strong> (Breakout)</li>
                      <li><strong>RSI</strong> &gt; 50 (No divergence)</li>
                      <li>60-min Trend Aligned</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800 text-sm">
                      <strong>🛑 Stop Loss:</strong> 1.5x ATR<br/>
                  </div>
              </div>
          </section>
          <section>
              <h3 className="text-xl font-bold text-green-600 mb-2">2. Long Term Investing</h3>
              <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">✅ Checklist</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Price Above <strong>MA240</strong></li>
                      <li>Fundamentals Intact</li>
                      <li>Not in Industry Downturn</li>
                  </ul>
              </div>
          </section>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-bold dark:text-white">
            {lang === 'zh' ? '投資策略與指標邏輯' : 'Investment Strategy Checklist'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Close
          </button>
        </div>
        <div className="p-6 overflow-y-auto leading-relaxed text-gray-800 dark:text-gray-300">
          {content}
        </div>
      </div>
    </div>
  );
};

export default StrategyGuide;