'use client';

import { Calendar, TrendingUp, ExternalLink } from 'lucide-react';

interface MarketHeaderProps {
  market: {
    id: string;
    question: string;
    description?: string;
    image?: string;
    icon?: string;
    volume?: number;
    volume24hr?: number;
    end_date?: string;
    endDate?: string;
    current_yes_price: number;
    current_no_price: number;
    slug?: string;
  };
  currentPrice: number;
}

export default function MarketHeader({ market, currentPrice }: MarketHeaderProps) {
  const yesPercent = (currentPrice * 100).toFixed(1);
  const noPercent = ((1 - currentPrice) * 100).toFixed(1);
  const endDate = market.end_date || market.endDate;

  // Open market on Polymarket
  const openOnPolymarket = () => {
    const slug = market.slug || market.id;
    window.open(`https://polymarket.com/event/${slug}`, '_blank');
  };

  return (
    <div className="bg-[#12131A] rounded-xl border border-gray-800 p-6">
      <div className="flex gap-6">
        {/* Market Image */}
        {(market.image || market.icon) && (
          <img
            src={market.image || market.icon}
            alt={market.question}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
            {market.question}
          </h1>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            {/* Volume */}
            {market.volume !== undefined && (
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-500" />
                <span className="text-gray-400">Volume: </span>
                <span className="text-white font-semibold font-mono">
                  ${market.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            {/* 24h Volume */}
            {market.volume24hr !== undefined && market.volume24hr > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">24h: </span>
                <span className="text-green-400 font-semibold font-mono">
                  ${market.volume24hr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}

            {/* End Date */}
            {endDate && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-400" />
                <span className="text-gray-400">Ends: </span>
                <span className="text-white font-semibold">
                  {new Date(endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {/* Source Link */}
            <button
              onClick={openOnPolymarket}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={14} />
              <span className="font-medium">View on Polymarket</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
