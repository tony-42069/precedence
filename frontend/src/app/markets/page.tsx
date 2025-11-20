'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { MarketsGrid } from '../../components/MarketsGrid';
import { 
  Terminal,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function MarketsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch markets for stats
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/markets/legal');
        if (response.ok) {
          const data = await response.json();
          const rawMarkets = Array.isArray(data) ? data : (data.markets || []);
          setMarkets(rawMarkets);
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans">
      {/* Background FX */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 lg:ml-64">
          
          {/* Page Header */}
          <div className="border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm font-mono text-slate-500 mb-4">
                <Terminal size={14} />
                <span>PRECEDENCE_TERMINAL</span>
                <span className="text-slate-700">/</span>
                <span className="text-blue-400 uppercase">MARKETS</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                Active Markets
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl">
                Browse and trade on verified legal outcomes
              </p>

              {/* Show highlight notification if present */}
              {highlightId && (
                <div className="mt-4 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg inline-flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                  <span className="text-sm font-mono text-purple-300">
                    FINDING_MARKET: {highlightId.slice(0, 10)}...
                  </span>
                </div>
              )}

              {/* Quick Stats */}
              {!loading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={16} className="text-green-400" />
                      <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Live Markets</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-green-400">{markets.length}</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-blue-400" />
                      <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">24h Volume</span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-blue-400">
                      ${(markets.reduce((sum, m) => sum + (m.volume || 0), 0) / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Active</div>
                    <div className="text-2xl font-mono font-bold text-purple-400">
                      {markets.filter(m => m.active).length}
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Categories</div>
                    <div className="text-2xl font-mono font-bold text-yellow-400">
                      3
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Markets Content - Using MarketsGrid Component */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MarketsGrid highlightId={highlightId} />
          </main>
        </div>
      </div>
    </div>
  );
}
