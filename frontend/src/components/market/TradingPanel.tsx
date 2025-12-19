'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, AlertCircle, TrendingUp, TrendingDown, Receipt, Info } from 'lucide-react';

interface TradingPanelProps {
  market: {
    id: string;
    question: string;
    slug?: string;
    current_yes_price: number;
    current_no_price: number;
  };
  currentPrice: number;
  orderBook: {
    bids: Array<{ price: string; size: string }>;
    asks: Array<{ price: string; size: string }>;
  };
}

// Fee configuration (matches backend)
const FEE_PERCENT = 1; // 1% on SELL only

export default function TradingPanel({ market, currentPrice, orderBook }: TradingPanelProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [outcome, setOutcome] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState<string>('');

  // Calculate trade values
  const { price, amountNum, shares, potentialWin, feeInfo } = useMemo(() => {
    const price = outcome === 'yes' ? currentPrice : (1 - currentPrice);
    const amountNum = parseFloat(amount) || 0;
    const shares = price > 0 ? amountNum / price : 0;
    const potentialWin = shares * 1 - amountNum; // Payout is $1 per share

    // Fee calculation (only on SELL)
    const feeAmount = tradeType === 'sell' ? amountNum * (FEE_PERCENT / 100) : 0;
    const netAmount = amountNum - feeAmount;

    return {
      price,
      amountNum,
      shares,
      potentialWin,
      feeInfo: {
        hasFee: tradeType === 'sell',
        feeAmount,
        netAmount
      }
    };
  }, [outcome, currentPrice, amount, tradeType]);

  // Get best prices from order book
  const bestBid = orderBook.bids[0] ? parseFloat(orderBook.bids[0].price) : null;
  const bestAsk = orderBook.asks[0] ? parseFloat(orderBook.asks[0].price) : null;

  const handleTrade = () => {
    // Open Polymarket directly (until Builder program is approved)
    const slug = market.slug || market.id;
    window.open(`https://polymarket.com/event/${slug}`, '_blank');
  };

  return (
    <div className="bg-[#12131A] rounded-xl border border-gray-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Trade</h3>
        <span className="text-xs text-gray-500 font-mono">via Polymarket</span>
      </div>

      {/* US Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-500 text-sm font-medium">US Trading Notice</div>
            <div className="text-gray-400 text-xs mt-0.5">
              Trade execution redirects to Polymarket. Builder program pending approval.
            </div>
          </div>
        </div>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
            tradeType === 'buy'
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <TrendingUp size={16} />
          BUY
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
            tradeType === 'sell'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <TrendingDown size={16} />
          SELL
        </button>
      </div>

      {/* Outcome Selection */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Select Outcome</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOutcome('yes')}
            className={`py-3 rounded-lg font-medium transition-all border ${
              outcome === 'yes'
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="text-lg font-bold">Yes</div>
            <div className="text-sm opacity-75 font-mono">{(currentPrice * 100).toFixed(1)}¢</div>
          </button>
          <button
            onClick={() => setOutcome('no')}
            className={`py-3 rounded-lg font-medium transition-all border ${
              outcome === 'no'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="text-lg font-bold">No</div>
            <div className="text-sm opacity-75 font-mono">{((1 - currentPrice) * 100).toFixed(1)}¢</div>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Amount (USDC)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-white font-mono text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="flex-1 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-400 font-mono transition-colors"
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {amountNum > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Shares</span>
            <span className="text-white font-mono font-medium">{shares.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Avg Price</span>
            <span className="text-white font-mono">${price.toFixed(3)}</span>
          </div>

          {/* Fee breakdown for SELL orders */}
          {feeInfo.hasFee && (
            <>
              <div className="border-t border-gray-700 my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Trade Value</span>
                <span className="text-white font-mono">${amountNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-400 flex items-center gap-1">
                  <Receipt size={12} />
                  Platform Fee ({FEE_PERCENT}%)
                </span>
                <span className="text-amber-400 font-mono">-${feeInfo.feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2">
                <span className="text-green-400">You Receive</span>
                <span className="text-green-400 font-mono">${feeInfo.netAmount.toFixed(2)}</span>
              </div>
            </>
          )}

          {/* Potential profit for BUY orders */}
          {!feeInfo.hasFee && potentialWin > 0 && (
            <div className="flex justify-between text-sm border-t border-gray-700 pt-2">
              <span className="text-gray-400">Potential Profit</span>
              <span className="text-green-400 font-mono font-medium">+${potentialWin.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Best Prices from Order Book */}
      {(bestBid || bestAsk) && (
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Best Bid: <span className="text-green-400 font-mono">${bestBid?.toFixed(3) || '-'}</span></span>
          <span>Best Ask: <span className="text-red-400 font-mono">${bestAsk?.toFixed(3) || '-'}</span></span>
        </div>
      )}

      {/* Trade Button */}
      <button
        onClick={handleTrade}
        disabled={amountNum <= 0}
        className={`w-full py-3.5 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          amountNum > 0
            ? tradeType === 'buy'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-600/30'
              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {amountNum > 0 ? (
          <>
            {tradeType === 'buy' ? 'BUY' : 'SELL'} {outcome.toUpperCase()}
            <ExternalLink size={16} />
          </>
        ) : (
          'Enter Amount'
        )}
      </button>

      {/* Fee Notice */}
      <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
        <Info size={12} />
        <span>1% fee on sell orders only</span>
      </div>
    </div>
  );
}
