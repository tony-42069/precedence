'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

interface TrendingMarket {
  id: string;
  question: string;
  volume: string | number;
  current_yes_price: number;
  image?: string;
  icon?: string;
}

export function TopMarketsWidget() {
  const [trendingMarkets, setTrendingMarkets] = useState<TrendingMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingMarkets = async () => {
      try {
        const response = await fetch(`${API_URL}/api/markets/trending?limit=5`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setTrendingMarkets(data.trending || []);
      } catch (err) {
        console.error('Error fetching trending markets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingMarkets();
    const interval = setInterval(fetchTrendingMarkets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatVolume = (volume: string | number | undefined | null) => {
    if (!volume) return '$0';
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (isNaN(numVolume)) return '$0';
    if (numVolume >= 1000000) return `$${(numVolume / 1000000).toFixed(1)}M`;
    if (numVolume >= 1000) return `$${(numVolume / 1000).toFixed(0)}K`;
    return `$${Math.round(numVolume)}`;
  };

  const getProb = (market: TrendingMarket): number => Math.round((market.current_yes_price || 0) * 100);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-green-400" />
          <span className="text-sm font-mono text-slate-400">TRENDING MARKETS</span>
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (trendingMarkets.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">No trending markets</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-green-400" />
          <span className="text-sm font-mono text-slate-400">TRENDING MARKETS</span>
        </div>
        <a href="/markets" className="text-xs font-mono text-purple-400 hover:text-purple-300">
          View All →
        </a>
      </div>

      {/* Market List with Images */}
      <div className="space-y-2">
        {trendingMarkets.map((market, index) => (
          <a
            key={market.id}
            href={`/markets?highlight=${market.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
          >
            {/* Rank */}
            <span className="w-5 text-center text-sm font-mono text-purple-400 font-bold flex-shrink-0">
              {index + 1}
            </span>
            
            {/* Market Image */}
            {(market.image || market.icon) ? (
              <img 
                src={market.image || market.icon} 
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={16} className="text-purple-400" />
              </div>
            )}
            
            {/* Question */}
            <span className="flex-1 text-sm text-slate-300 group-hover:text-white truncate min-w-0">
              {market.question}
            </span>
            
            {/* Probability */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: `${getProb(market)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-blue-400 w-8 text-right">{getProb(market)}%</span>
            </div>
            
            {/* Volume */}
            <span className="text-sm font-mono text-green-400 font-bold w-14 text-right flex-shrink-0">
              {formatVolume(market.volume)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
