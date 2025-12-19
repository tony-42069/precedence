'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { TradingModal } from '../TradingModal';

interface TradingPanelProps {
  market: {
    id: string;
    question: string;
    slug?: string;
    current_yes_price: number;
    current_no_price: number;
    clobTokenIds?: string[];
    [key: string]: any;
  };
  currentPrice: number;
  orderBook: {
    bids: Array<{ price: string; size: string }>;
    asks: Array<{ price: string; size: string }>;
  };
}

export default function TradingPanel({ market, currentPrice, orderBook }: TradingPanelProps) {
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
  const [shares, setShares] = useState<string>('');

  // Get best prices from order book
  const bestBid = orderBook.bids[0] ? parseFloat(orderBook.bids[0].price) : null;
  const bestAsk = orderBook.asks[0] ? parseFloat(orderBook.asks[0].price) : null;

  // Convert price to cents for display
  const yesCents = (currentPrice * 100).toFixed(1);
  const noCents = ((1 - currentPrice) * 100).toFixed(1);

  // Prepare market data for TradingModal with current prices
  const getMarketForTrading = () => {
    return {
      ...market,
      current_yes_price: currentPrice,
      current_no_price: 1 - currentPrice,
    };
  };

  const handleTradeClick = () => {
    setShowTradingModal(true);
  };

  // Handle sell percentage buttons
  const handleSellPercent = (percent: number) => {
    // For now, just set a placeholder value
    // Portfolio integration will come later
    if (percent === 100) {
      setShares('MAX');
    } else {
      setShares(`${percent}%`);
    }
  };

  // Get action button text
  const getActionButtonText = () => {
    const action = tradeMode === 'buy' ? 'Buy' : 'Sell';
    const outcome = selectedOutcome === 'yes' ? 'Yes' : 'No';
    return `${action} ${outcome}`;
  };

  return (
    <>
      <div className="bg-[#12131A] rounded-xl border border-gray-800 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Trade</h3>
          <span className="text-xs text-gray-500 font-mono">Polymarket</span>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex rounded-lg bg-gray-800/50 p-1">
          <button
            onClick={() => setTradeMode('buy')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              tradeMode === 'buy'
                ? 'bg-green-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setTradeMode('sell')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              tradeMode === 'sell'
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Yes/No Outcome Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedOutcome('yes')}
            className={`p-4 rounded-xl border transition-all ${
              selectedOutcome === 'yes'
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">Yes</span>
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${
              selectedOutcome === 'yes' ? 'text-green-400' : 'text-gray-300'
            }`}>
              {yesCents}¢
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              ${currentPrice.toFixed(3)}
            </div>
          </button>

          <button
            onClick={() => setSelectedOutcome('no')}
            className={`p-4 rounded-xl border transition-all ${
              selectedOutcome === 'no'
                ? 'bg-red-500/20 border-red-500/50'
                : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">No</span>
              <TrendingDown size={14} className="text-red-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${
              selectedOutcome === 'no' ? 'text-red-400' : 'text-gray-300'
            }`}>
              {noCents}¢
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              ${(1 - currentPrice).toFixed(3)}
            </div>
          </button>
        </div>

        {/* Shares Input - For Sell Mode */}
        {tradeMode === 'sell' && (
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase">Shares</label>
            <input
              type="text"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white font-mono text-lg focus:outline-none focus:border-gray-500 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSellPercent(25)}
                className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                25%
              </button>
              <button
                onClick={() => handleSellPercent(50)}
                className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => handleSellPercent(100)}
                className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                Max
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleTradeClick}
          className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
            tradeMode === 'buy'
              ? selectedOutcome === 'yes'
                ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'
                : 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20'
              : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20'
          }`}
        >
          {getActionButtonText()}
        </button>

        {/* Best Prices from Order Book */}
        {(bestBid || bestAsk) && (
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase mb-2">Order Book</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Best Bid: <span className="text-green-400 font-mono">${bestBid?.toFixed(3) || '-'}</span>
              </span>
              <span className="text-gray-400">
                Best Ask: <span className="text-red-400 font-mono">${bestAsk?.toFixed(3) || '-'}</span>
              </span>
            </div>
            {bestBid && bestAsk && (
              <div className="text-xs text-gray-500 mt-1 text-center">
                Spread: ${(bestAsk - bestBid).toFixed(4)} ({((bestAsk - bestBid) / bestAsk * 100).toFixed(2)}%)
              </div>
            )}
          </div>
        )}

        {/* Fee Notice */}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 pt-2 border-t border-gray-800">
          <Info size={12} />
          <span>1% fee on sell orders only</span>
        </div>
      </div>

      {/* Trading Modal - Uses the existing TradingModal component */}
      <TradingModal
        market={getMarketForTrading()}
        isOpen={showTradingModal}
        onClose={() => setShowTradingModal(false)}
      />
    </>
  );
}
