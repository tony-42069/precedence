'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import React, { useState, useEffect } from 'react';
import { Scale } from 'lucide-react';

interface LegalMarket {
  id: string;
  question: string;
  volume: number;
  current_yes_price: number;
  image?: string;
  icon?: string;
}

export function LegalMarketsSpotlight() {
  const [legalMarkets, setLegalMarkets] = useState<LegalMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLegalMarkets = async () => {
      try {
        // Use the same endpoint as the Legal tab on the Markets page
        const res = await fetch(`${API_URL}/api/markets/trending?category=Legal&limit=10&exclude_sports=true`);
        if (res.ok) {
          const data = await res.json();
          const markets = Array.isArray(data) ? data : (data.trending || data.markets || []);

          // Deduplicate similar markets (same event, different outcomes)
          const deduplicated: LegalMarket[] = [];
          const getKeyWords = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
          for (const market of markets) {
            const words = getKeyWords(market.question || '');
            const isDuplicate = deduplicated.some(existing => {
              const existingWords = getKeyWords(existing.question || '');
              const overlap = words.filter((w: string) => existingWords.includes(w)).length;
              return overlap >= Math.min(words.length, existingWords.length) * 0.5;
            });
            if (!isDuplicate) deduplicated.push(market);
          }

          setLegalMarkets(deduplicated.slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching legal markets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLegalMarkets();
  }, []);

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '$0';
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
    return `$${Math.round(volume)}`;
  };

  const getProb = (price: number | undefined) => Math.round((price || 0.5) * 100);

  if (loading) {
    return (
      <div className="border-t border-white/10 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} className="text-blue-400" />
          <span className="text-sm font-mono text-slate-400">LEGAL & POLICY MARKETS</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 bg-white/5 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-blue-400" />
          <span className="text-sm font-mono text-slate-400">LEGAL & POLICY MARKETS</span>
        </div>
      </div>

      {legalMarkets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {legalMarkets.map((market) => (
            <a
              key={market.id}
              href={`/app/markets/${market.id}`}
              className="flex gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-blue-500/30 transition-all group"
            >
              {/* Market Image */}
              <div className="flex-shrink-0">
                {(market.image || market.icon) ? (
                  <img
                    src={market.image || market.icon}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Scale size={20} className="text-blue-400" />
                  </div>
                )}
              </div>

              {/* Market Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 group-hover:text-white line-clamp-2 mb-2">
                  {market.question}
                </p>

                {/* Yes/No Prices */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5">
                    <span className="text-[9px] font-mono text-green-400">YES</span>
                    <span className="text-[10px] font-mono text-green-400 font-bold">{getProb(market.current_yes_price)}¢</span>
                  </div>
                  <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5">
                    <span className="text-[9px] font-mono text-red-400">NO</span>
                    <span className="text-[10px] font-mono text-red-400 font-bold">{100 - getProb(market.current_yes_price)}¢</span>
                  </div>
                  <span className="text-[10px] font-mono text-green-400 font-bold ml-auto">{formatVolume(market.volume)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
          <Scale size={20} className="text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No legal markets found</p>
        </div>
      )}
    </div>
  );
}
