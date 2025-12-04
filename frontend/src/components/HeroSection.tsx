'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Activity, Zap, Globe } from 'lucide-react';

interface Market {
  id?: string;
  question?: string;
  current_yes_price?: number;
  volume?: number;
}

interface HeroSectionProps {
  markets: Market[];
  marketsCount: number;
  totalVolume?: number;
  loading?: boolean;
}

export function HeroSection({ markets, marketsCount, totalVolume, loading = false }: HeroSectionProps) {
  const [displayVolume, setDisplayVolume] = useState(0);
  const [displayMarkets, setDisplayMarkets] = useState(0);

  // Animated counter effect
  useEffect(() => {
    if (loading) return;

    // Animate markets count
    const marketInterval = setInterval(() => {
      setDisplayMarkets(prev => {
        if (prev < marketsCount) {
          return Math.min(prev + 1, marketsCount);
        }
        clearInterval(marketInterval);
        return prev;
      });
    }, 50);

    // Animate volume
    const calculatedVolume = totalVolume || markets.reduce((sum, m) => sum + (m.volume || 0), 0);
    const volumeInterval = setInterval(() => {
      setDisplayVolume(prev => {
        if (prev < calculatedVolume) {
          const increment = Math.ceil(calculatedVolume / 30);
          return Math.min(prev + increment, calculatedVolume);
        }
        clearInterval(volumeInterval);
        return prev;
      });
    }, 50);

    return () => {
      clearInterval(marketInterval);
      clearInterval(volumeInterval);
    };
  }, [marketsCount, totalVolume, markets, loading]);

  // Prepare ticker markets (repeat for infinite scroll effect)
  const tickerMarkets = [...markets, ...markets, ...markets].slice(0, 30);

  return (
    <div className="relative">
      {/* Live Ticker Tape */}
      <div className="bg-[#0A0A0C]/80 border-b border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex items-center gap-2 text-green-400 text-xs font-mono uppercase tracking-wider shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span>LIVE</span>
          </div>
          
          {/* Scrolling Ticker */}
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-8 animate-scroll">
              {tickerMarkets.map((market, index) => (
                <div key={`${market.id}-${index}`} className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-400 text-xs font-medium truncate max-w-[200px]">
                    {market.question?.split('?')[0]}
                  </span>
                  <span className={`text-xs font-mono font-bold ${
                    (market.current_yes_price || 0) > 0.5 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${(market.current_yes_price || 0.5).toFixed(2)}
                  </span>
                  <span className="text-slate-600">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="relative border-b border-white/10 bg-[#0A0A0C]/60 backdrop-blur-sm overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0, 82, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 82, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridPulse 4s ease-in-out infinite'
          }}></div>
        </div>

        {/* Gradient Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Title Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono mb-6 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <Zap size={12} className="animate-pulse" />
              <span className="uppercase tracking-wider">Terminal Online</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Legal Intelligence
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 animate-gradient">
                Terminal
              </span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              AI-powered legal analytics meets prediction market trading. Analyze judges, track cases, trade outcomes.
            </p>
          </div>

          {/* Global Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            
            {/* Active Markets */}
            <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-green-500/30 transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-green-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Active</span>
                </div>
                <div className="text-3xl font-mono font-bold text-green-400 mb-1 tabular-nums">
                  {loading ? '—' : displayMarkets}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Markets</div>
              </div>
            </div>

            {/* 24h Volume */}
            <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-blue-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Volume</span>
                </div>
                <div className="text-3xl font-mono font-bold text-blue-400 mb-1 tabular-nums">
                  {loading ? '—' : `$${(displayVolume / 1000000).toFixed(1)}M`}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">24h Total</div>
              </div>
            </div>

            {/* AI Powered */}
            <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-purple-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Neural</span>
                </div>
                <div className="text-3xl font-mono font-bold text-purple-400 mb-1">
                  AI
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Powered</div>
              </div>
            </div>

            {/* 24/7 Trading */}
            <div className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-yellow-500/30 transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={16} className="text-yellow-400" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Status</span>
                </div>
                <div className="text-3xl font-mono font-bold text-yellow-400 mb-1">
                  24/7
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Trading</div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gridPulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }

        .animate-scroll {
          animation: scroll 40s linear infinite;
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </div>
  );
}
