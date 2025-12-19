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
    [key: string]: any; // Allow other market properties to pass through
  };
  currentPrice: number;
  orderBook: {
    bids: Array<{ price: string; size: string }>;
    asks: Array<{ price: string; size: string }>;
  };
}

export default function TradingPanel({ market, currentPrice, orderBook }: TradingPanelProps) {
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');

  // Get best prices from order book
  const bestBid = orderBook.bids[0] ? parseFloat(orderBook.bids[0].price) : null;
  const bestAsk = orderBook.asks[0] ? parseFloat(orderBook.asks[0].price) : null;

  // Prepare market data for TradingModal with current prices
  const getMarketForTrading = () => {
    return {
      ...market,
      current_yes_price: currentPrice,
      current_no_price: 1 - currentPrice,
    };
  };

  const handleTradeClick = (outcome: 'yes' | 'no') => {
    setSelectedOutcome(outcome);
    setShowTradingModal(true);
  };

  return (
    <>
      <div className="bg-[#12131A] rounded-xl border border-gray-800 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Trade</h3>
          <span className="text-xs text-gray-500 font-mono">Polymarket</span>
        </div>

        {/* Current Prices */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTradeClick('yes')}
            className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase">Yes</span>
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 font-mono">
              {(currentPrice * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 font-mono mt-1">
              ${currentPrice.toFixed(3)}
            </div>
            <div className="mt-3 py-2 px-3 bg-green-600/20 rounded-lg text-green-400 text-xs font-medium text-center group-hover:bg-green-600/30 transition-colors">
              BUY YES
            </div>
          </button>

          <button
            onClick={() => handleTradeClick('no')}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase">No</span>
              <TrendingDown size={14} className="text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400 font-mono">
              {((1 - currentPrice) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 font-mono mt-1">
              ${(1 - currentPrice).toFixed(3)}
            </div>
            <div className="mt-3 py-2 px-3 bg-red-600/20 rounded-lg text-red-400 text-xs font-medium text-center group-hover:bg-red-600/30 transition-colors">
              BUY NO
            </div>
          </button>
        </div>

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
