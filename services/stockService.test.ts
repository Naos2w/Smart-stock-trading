import { describe, it, expect } from 'vitest';
import {
  calculateSwingScore,
  calculateShortTermInvestment,
  calculateLongTermScore,
  calculateLongTermInvestment,
  calculateEtfScore,
  calculateEtfInvestment
} from './stockService';
import { StockData } from '../types';

type StockOverride = Partial<StockData>;

const createStock = (overrides: StockOverride): StockData => ({
  symbol: 'MOCK',
  name: 'Mock Corp',
  nameEn: 'Mock Corp',
  market: 'US',
  price: 100,
  openPrice: 100,
  change: 0,
  changePercent: 0,
  volume: 1_000_000,
  avgVolume: 900_000,
  vol5: 1_000_000,
  vol20: 900_000,
  marketCap: '100B',
  peRatio: 15,
  ma5: 100,
  ma10: 100,
  ma20: 100,
  ma20Prev: 99,
  ma60: 98,
  ma120: 95,
  ma240: 92,
  ma240Prev: 90,
  rsi: 50,
  rsiPrev: 48,
  macdLine: 1,
  signalLine: 0.8,
  macdHist: 0.2,
  macdHistPrev: 0.1,
  kValue: 60,
  dValue: 55,
  atr: 2,
  eps: 5,
  roe: 18,
  dividendYield: 2.1,
  revenueYoy: 5,
  institutionalOwnership: 45,
  institutionalAction: 'HOLD',
  tags: [],
  updatedAt: Date.now(),
  lastTradeTime: Date.now(),
  isDelayed: false,
  isMarketOpen: false,
  currency: 'USD',
  exchange: 'NASDAQ',
  assetType: 'STOCK',
  recentHistorySample: [],
  ...overrides
});

describe('stockService investment mode flows', () => {
  it('scores strong swing stock and produces ENTER plan', () => {
    const stock = createStock({
      price: 120,
      ma20: 110,
      ma20Prev: 107,
      ma60: 100,
      rsi: 52,
      vol5: 1_500_000,
      vol20: 900_000,
      atr: 2.5
    });

    const swingScore = calculateSwingScore(stock, 'en');
    expect(swingScore.totalScore).toBeGreaterThanOrEqual(85);
    expect(swingScore.action).toBe('ENTER');

    const plan = calculateShortTermInvestment(stock, swingScore);
    expect(plan.action).toBe('ENTER');
    expect(plan.entryZone[0]).toBeLessThan(plan.entryZone[1]);
    expect(plan.stopLoss).toBeLessThan(plan.entryZone[0]);
    expect(plan.target).toBeGreaterThan(plan.entryZone[1]);
    expect(plan.holdingDaysRecommendation).toContain('Hold');
  });

  it('identifies long-term invest candidate with periodic allocation', () => {
    const stock = createStock({
      price: 150,
      ma60: 140,
      ma240: 130,
      ma240Prev: 125,
      atr: 2.4
    });

    const score = calculateLongTermScore(stock, 'en');
    expect(score.totalScore).toBeGreaterThanOrEqual(80);
    expect(score.action).toBe('INVEST');

    const plan = calculateLongTermInvestment(stock, score);
    expect(plan.action).toBe('INVEST');
    expect(plan.allocationHint).toBe('periodic');
    expect(plan.riskNote).toMatch(/ATR/);
    expect(plan.suggestedEntryZone).toBeDefined();
  });

  it('suggests BUY for low-volatility ETF near MA240', () => {
    const stock = createStock({
      symbol: 'ETF1',
      assetType: 'ETF',
      price: 102,
      ma240: 100,
      ma240Prev: 99,
      atr: 1.5
    });

    const score = calculateEtfScore(stock, 'en');
    expect(score.totalScore).toBeGreaterThanOrEqual(85);
    expect(score.action).toBe('BUY');

    const plan = calculateEtfInvestment(stock, score);
    expect(plan.action).toBe('BUY');
    expect(plan.allocationHint).toBe('one_time');
    expect(plan.volatilityLevel).toBe('LOW');
    expect(plan.suggestedEntryZone).toBeDefined();
  });
});
