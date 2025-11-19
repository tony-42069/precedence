import React from 'react';

interface TopMarket {
  id: string;
  title: string;
  volume: number;
  change: number;
  probability: number;
  category: string;
  trending: boolean;
}

export function TopMarketsWidget() {
  // Mock data - will be replaced with real API data
  const topMarkets: TopMarket[] = [
    {
      id: '1',
      title: 'Will SCOTUS overturn Roe v. Wade?',
      volume: 2450000,
      change: 12.5,
      probability: 68,
      category: 'Supreme Court',
      trending: true
    },
    {
      id: '2',
      title: 'Will EPA regulate crypto mining?',
      volume: 1890000,
      change: -3.2,
      probability: 42,
      category: 'Regulatory',
      trending: false
    },
    {
      id: '3',
      title: 'Will Congress pass climate bill?',
      volume: 1650000,
      change: 8.7,
      probability: 55,
      category: 'Legislative',
      trending: true
    },
    {
      id: '4',
      title: 'Will FTC sue Big Tech merger?',
      volume: 1420000,
      change: 15.3,
      probability: 73,
      category: 'Antitrust',
      trending: false
    },
    {
      id: '5',
      title: 'Will Supreme Court hear election case?',
      volume: 1280000,
      change: -5.1,
      probability: 38,
      category: 'Supreme Court',
      trending: false
    }
  ];

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  return (
    <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:border-purple-500/30 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        {/* Animated glow line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <h3 className="text-lg font-semibold text-white font-mono">
          <span className="text-purple-400">[TOP]</span> MARKET_RANKINGS
        </h3>
        <div className="text-xs font-mono text-slate-400 uppercase bg-slate-500/10 border border-slate-500/20 px-3 py-1 rounded-full">
          BY_VOLUME
        </div>
      </div>

      <div className="space-y-3">
        {topMarkets.map((market, index) => (
          <div key={market.id} className="flex items-center space-x-4 p-3 rounded-lg border border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-200 group/market relative overflow-hidden">
            {/* Gradient accent bar */}
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-500/50 to-purple-600/50 opacity-0 group-hover/market:opacity-100 transition-opacity duration-300"></div>

            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono font-bold text-sm group-hover/market:scale-110 transition-transform duration-200">
              #{index + 1}
            </div>

            <div className="flex-1 min-w-0 group-hover/market:translate-x-1 transition-transform duration-200">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium text-slate-200 truncate group-hover/market:text-white transition-colors duration-200">
                  {market.title}
                </h4>
                {market.trending && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                    🔥 TRENDING
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono text-slate-400 uppercase">{market.category}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-white/10 border border-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-[0_0_4px_rgba(37,99,235,0.5)]"
                        style={{ width: `${market.probability}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {market.probability}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-white">
                    {formatVolume(market.volume)}
                  </div>
                  <div className={`text-xs font-mono font-bold uppercase ${
                    market.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {market.change >= 0 ? '↗' : '↘'} {market.change >= 0 ? '+' : ''}{market.change}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <button className="w-full text-sm font-mono text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center group hover:scale-105 transform duration-200">
          <span className="group-hover:mr-1 transition-all duration-200">VIEW_ALL_MARKETS</span>
          <span className="font-bold">{'>'}</span>
        </button>
      </div>
    </div>
  );
}
