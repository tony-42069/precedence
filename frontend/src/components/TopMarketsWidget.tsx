'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import React, { useState, useEffect } from 'react';

interface TrendingMarket {
  id: string;
  question: string;
  volume: string | number;
  current_yes_price: number;
  current_no_price: number;
  tags?: Array<string | {label: string}>;
}

export function TopMarketsWidget() {
  const [trendingMarkets, setTrendingMarkets] = useState<TrendingMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingMarkets = async () => {
      try {
        // Fetch trending markets from backend (all categories, top 5)
        const response = await fetch('http://${API_URL}/api/markets/trending?limit=5');
        
        if (!response.ok) {
          throw new Error('Failed to fetch trending markets');
        }
        
        const data = await response.json();
        console.log('Trending markets data:', data); // Debug log
        setTrendingMarkets(data.trending || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching trending markets:', err);
        setError('Failed to load trending markets');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingMarkets();

    // Refresh every 5 minutes
    const interval = setInterval(fetchTrendingMarkets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatVolume = (volume: string | number | undefined | null) => {
    // Handle undefined/null/invalid values
    if (volume === undefined || volume === null || volume === '') {
      return '$0';
    }
    
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    
    // Check if conversion failed or is NaN
    if (isNaN(numVolume) || !isFinite(numVolume)) {
      return '$0';
    }
    
    if (numVolume >= 1000000) {
      return `$${(numVolume / 1000000).toFixed(1)}M`;
    }
    if (numVolume >= 1000) {
      return `$${(numVolume / 1000).toFixed(0)}K`;
    }
    return `$${Math.round(numVolume)}`;
  };

  const getCategory = (market: TrendingMarket): string => {
    // Extract category from tags
    const tags = market.tags || [];
    if (tags.length > 0) {
      const tag = tags[0];
      return typeof tag === 'string' ? tag : tag.label;
    }
    
    // Fallback: infer from question
    const question = market.question?.toLowerCase() || '';
    if (question.includes('court') || question.includes('scotus') || question.includes('supreme')) {
      return 'Supreme Court';
    }
    if (question.includes('election') || question.includes('president')) {
      return 'Politics';
    }
    if (question.includes('crypto') || question.includes('bitcoin')) {
      return 'Crypto';
    }
    
    return 'Markets';
  };

  const getYesProbability = (market: TrendingMarket): number => {
    const prob = market.current_yes_price || 0;
    return Math.round(prob * 100);
  };

  const isTrending = (volume: string | number | undefined | null): boolean => {
    if (volume === undefined || volume === null || volume === '') {
      return false;
    }
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    return !isNaN(numVolume) && numVolume > 100000; // Markets with >$100K volume are "trending"
  };

  if (loading) {
    return (
      <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-sm font-mono text-slate-400">LOADING_TRENDING_MARKETS...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || trendingMarkets.length === 0) {
    return (
      <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white font-mono mb-4">
          <span className="text-purple-400">[TOP]</span> MARKET_RANKINGS
        </h3>
        <div className="flex items-center justify-center h-48">
          <p className="text-sm font-mono text-slate-400">{error || 'NO_TRENDING_MARKETS_FOUND'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:border-purple-500/30 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        {/* Animated glow line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <h3 className="text-lg font-semibold text-white font-mono">
          <span className="text-purple-400">[TOP]</span> MARKET_RANKINGS
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></div>
          <span className="text-xs font-mono text-slate-400 uppercase bg-slate-500/10 border border-slate-500/20 px-3 py-1 rounded-full">
            LIVE
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {trendingMarkets.map((market, index) => (
          <a
            key={market.id}
            href={`/markets?highlight=${market.id}`}
            className="flex items-center space-x-3 p-3 rounded-lg border border-white/5 bg-white/5 hover:border-purple-500/30 hover:bg-white/10 transition-all duration-200 group/market relative overflow-hidden cursor-pointer"
          >
            {/* Gradient accent bar */}
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-500/50 to-purple-600/50 opacity-0 group-hover/market:opacity-100 transition-opacity duration-300"></div>

            {/* Rank badge */}
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono font-bold text-sm group-hover/market:scale-110 transition-transform duration-200">
              #{index + 1}
            </div>

            {/* Market info - takes full width */}
            <div className="flex-1 min-w-0 group-hover/market:translate-x-1 transition-transform duration-200">
              {/* Question + HOT badge */}
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="text-sm font-medium text-slate-200 group-hover/market:text-white transition-colors duration-200 line-clamp-2">
                  {market.question}
                </h4>
                {isTrending(market.volume) && (
                  <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                    🔥 HOT
                  </span>
                )}
              </div>

              {/* Category + probability bar + volume */}
              <div className="flex items-center justify-between gap-3">
                {/* Left: Category + Probability */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 uppercase whitespace-nowrap">{getCategory(market)}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-white/10 border border-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-[0_0_4px_rgba(37,99,235,0.5)]"
                        style={{ width: `${getYesProbability(market)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-400 whitespace-nowrap">
                      {getYesProbability(market)}%
                    </span>
                  </div>
                </div>

                {/* Right: Volume + Status */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-mono font-bold text-white">
                    {formatVolume(market.volume)}
                  </div>
                  <div className="text-xs font-mono text-green-400 font-bold uppercase">
                    ACTIVE
                  </div>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <a
          href="/markets"
          className="w-full text-sm font-mono text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center group hover:scale-105 transform duration-200"
        >
          <span className="group-hover:mr-1 transition-all duration-200">VIEW_ALL_MARKETS</span>
          <span className="font-bold">{'>'}</span>
        </a>
      </div>
    </div>
  );
}
