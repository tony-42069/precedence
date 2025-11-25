'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { MarketsGrid } from '../../components/MarketsGrid';
import { 
  Terminal,
  TrendingUp,
  Activity
} from 'lucide-react';

function MarketsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch markets for stats
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('${API_URL}/api/markets/legal');
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
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        <div className="flex-1 w-full min-w-0 lg:ml-64">
          {/* Header */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-2 text-sm font-mono text-slate-500">
                  <Terminal size={14} />
                  <span>PRECEDENCE_TERMINAL</span>
                  <span className="text-slate-700">/</span>
                  <span className="text-blue-400 uppercase">MARKETS</span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                    <Activity size={12} className="text-green-500" />
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {loading ? 'LOADING...' : `${markets.length} MARKETS`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Markets Grid */}
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
            <div className="max-w-[1800px] mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-blue-400" size={32} />
                  <h1 className="text-3xl font-bold text-white">Legal Prediction Markets</h1>
                </div>
                <p className="text-slate-400 text-sm font-mono">
                  Trade on the outcomes of legal cases, regulatory decisions, and policy changes
                </p>
              </div>

              <MarketsGrid highlightId={highlightId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-slate-400 font-mono">LOADING_MARKETS...</div>
      </div>
    }>
      <MarketsContent />
    </Suspense>
  );
}
