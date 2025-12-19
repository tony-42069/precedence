'use client';

import { useMemo } from 'react';

interface OrderBookProps {
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export default function OrderBook({ bids, asks }: OrderBookProps) {
  // Process and sort orders
  const { sortedBids, sortedAsks, maxSize, spread, spreadPercent } = useMemo(() => {
    // Sort: bids descending (highest first), asks ascending (lowest first)
    const sortedBids = [...bids]
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, 10);
    const sortedAsks = [...asks]
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, 10);

    // Calculate max size for bar width scaling
    const allSizes = [...sortedBids, ...sortedAsks].map(o => parseFloat(o.size));
    const maxSize = Math.max(...allSizes, 1);

    // Calculate spread
    const bestBid = sortedBids[0] ? parseFloat(sortedBids[0].price) : 0;
    const bestAsk = sortedAsks[0] ? parseFloat(sortedAsks[0].price) : 1;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestAsk > 0 ? (spread / bestAsk) * 100 : 0;

    return { sortedBids, sortedAsks, maxSize, spread, spreadPercent };
  }, [bids, asks]);

  // Calculate totals
  const totalBidSize = sortedBids.reduce((acc, bid) => acc + parseFloat(bid.size), 0);
  const totalAskSize = sortedAsks.reduce((acc, ask) => acc + parseFloat(ask.size), 0);

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12 bg-white/5 rounded-lg border border-dashed border-gray-700">
        <div className="text-4xl mb-2">📋</div>
        <p>No order book data available</p>
        <p className="text-sm text-gray-600 mt-1">Orders will appear when the market has liquidity</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-green-500 uppercase tracking-wider">Bids (Buy)</span>
          <span className="text-xs text-gray-500 font-mono">{totalBidSize.toLocaleString(undefined, { maximumFractionDigits: 0 })} shares</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-red-500 uppercase tracking-wider">Asks (Sell)</span>
          <span className="text-xs text-gray-500 font-mono">{totalAskSize.toLocaleString(undefined, { maximumFractionDigits: 0 })} shares</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="flex justify-between text-xs text-gray-500 px-2">
          <span>Price</span>
          <span>Size</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 px-2">
          <span>Size</span>
          <span>Price</span>
        </div>
      </div>

      {/* Order Book Rows */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bids Column */}
        <div className="space-y-1">
          {sortedBids.length > 0 ? (
            sortedBids.map((bid, i) => {
              const size = parseFloat(bid.size);
              const barWidth = (size / maxSize) * 100;
              const price = parseFloat(bid.price);
              return (
                <div
                  key={i}
                  className="relative flex justify-between items-center py-1.5 px-2 rounded hover:bg-green-500/10 transition-colors"
                >
                  <div
                    className="absolute inset-0 bg-green-500/15 rounded"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="relative font-mono text-sm text-green-400 font-medium">
                    ${price.toFixed(3)}
                  </span>
                  <span className="relative font-mono text-sm text-gray-400">
                    {size.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-600 text-sm py-4">No bids</div>
          )}
        </div>

        {/* Asks Column */}
        <div className="space-y-1">
          {sortedAsks.length > 0 ? (
            sortedAsks.map((ask, i) => {
              const size = parseFloat(ask.size);
              const barWidth = (size / maxSize) * 100;
              const price = parseFloat(ask.price);
              return (
                <div
                  key={i}
                  className="relative flex justify-between items-center py-1.5 px-2 rounded hover:bg-red-500/10 transition-colors"
                >
                  <div
                    className="absolute right-0 inset-y-0 bg-red-500/15 rounded"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="relative font-mono text-sm text-gray-400">
                    {size.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="relative font-mono text-sm text-red-400 font-medium">
                    ${price.toFixed(3)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-600 text-sm py-4">No asks</div>
          )}
        </div>
      </div>

      {/* Spread Display */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex justify-center items-center gap-4">
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase">Spread</span>
            <div className="font-mono text-yellow-500 font-semibold">
              ${spread.toFixed(4)} ({spreadPercent.toFixed(2)}%)
            </div>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase">Best Bid</span>
            <div className="font-mono text-green-400 font-semibold">
              ${sortedBids[0] ? parseFloat(sortedBids[0].price).toFixed(3) : '-'}
            </div>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center">
            <span className="text-xs text-gray-500 uppercase">Best Ask</span>
            <div className="font-mono text-red-400 font-semibold">
              ${sortedAsks[0] ? parseFloat(sortedAsks[0].price).toFixed(3) : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
