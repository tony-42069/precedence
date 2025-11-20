'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useWallet } from '../hooks/useWallet';
import { usePredictions } from '../hooks/usePredictions';
import { Sidebar, MobileMenuButton } from '../components/Sidebar';
import { HeroSection } from '../components/HeroSection';
import { MarketActivityWidget } from '../components/MarketActivityWidget';
import { TopMarketsWidget } from '../components/TopMarketsWidget';
import { AIInsightsWidget } from '../components/AIInsightsWidget';
import { Terminal } from 'lucide-react';

interface Market {
  id?: string;
  question?: string;
  volume?: number;
  current_yes_price?: number;
  current_no_price?: number;
}

export default function Home() {
  const pathname = usePathname();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { walletState, connectPhantom, connectMetaMask, disconnect, checkWalletAvailability } = useWallet();
  const { enhanceMarketsWithAI } = usePredictions();

  // Fetch markets for stats and hero
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        if (response.ok) {
          setBackendStatus('online');
          const marketsResponse = await fetch('http://localhost:8000/api/markets/legal');
          if (marketsResponse.ok) {
            const data = await marketsResponse.json();
            const rawMarkets = Array.isArray(data) ? data : (data.markets || []);
            setMarkets(rawMarkets);
          }
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('offline');
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
  }, [enhanceMarketsWithAI]);

  // Calculate total volume from markets
  const totalVolume = markets.reduce((sum, market) => {
    const vol = Number(market.volume) || 0;
    return sum + vol;
  }, 0);

  const currentView = pathname === '/' ? 'dashboard' : 'dashboard';

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30">
      
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
          
          {/* Navigation Header */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="hidden md:flex items-center gap-2 text-sm font-mono text-slate-500">
                  <Terminal size={14} />
                  <span>PRECEDENCE_TERMINAL</span>
                  <span className="text-slate-700">/</span>
                  <span className="text-blue-400 uppercase">{currentView}</span>
                </div>

                <div className="flex items-center space-x-4 ml-auto">
                  {/* Wallet Connection */}
                  {!walletState.connected ? (
                    <div className="flex items-center space-x-2">
                      {checkWalletAvailability().hasPhantom && (
                        <button
                          onClick={connectPhantom}
                          disabled={walletState.connecting}
                          className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 px-4 py-1.5 rounded-lg text-sm font-mono transition-all flex items-center space-x-2"
                        >
                          <span>◈</span>
                          <span>{walletState.connecting ? 'INIT...' : 'PHANTOM'}</span>
                        </button>
                      )}
                      {checkWalletAvailability().hasMetaMask && (
                        <button
                          onClick={connectMetaMask}
                          disabled={walletState.connecting}
                          className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-300 px-4 py-1.5 rounded-lg text-sm font-mono transition-all flex items-center space-x-2"
                        >
                          <span>🦊</span>
                          <span>{walletState.connecting ? 'INIT...' : 'METAMASK'}</span>
                        </button>
                      )}
                      {!checkWalletAvailability().hasPhantom && !checkWalletAvailability().hasMetaMask && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 rounded-lg max-w-xs">
                          <div className="text-xs text-yellow-500 font-mono">⚠️ WALLET_NOT_DETECTED</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            walletState.network === 'solana' ? 'bg-purple-500 shadow-[0_0_8px_#a855f7]' : 'bg-orange-500 shadow-[0_0_8px_#f97316]'
                          }`}></div>
                          <div className="text-sm">
                            <div className="font-mono text-slate-200 text-xs">
                              {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
                            </div>
                          </div>
                        </div>
                      </div>
                      {walletState.balance && (
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hidden sm:block">
                          <div className="text-xs font-mono font-medium text-slate-300">
                            {walletState.balance} {walletState.network === 'solana' ? 'SOL' : 'ETH'}
                          </div>
                        </div>
                      )}
                      <button onClick={disconnect} className="text-xs text-slate-500 hover:text-red-400 font-mono underline decoration-slate-700">
                        EXIT
                      </button>
                    </div>
                  )}

                  {/* Backend Status */}
                  <div className="hidden md:flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      backendStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' :
                      backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {backendStatus === 'checking' ? 'PING...' : backendStatus === 'online' ? 'SYSTEM ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Dashboard Content */}
          <>
            {/* New Command Center Hero */}
            <HeroSection 
              markets={markets}
              marketsCount={markets.length}
              totalVolume={totalVolume}
              loading={loading}
            />

            {/* Dashboard Widgets */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-[#0A0A0C]/60 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                  <MarketActivityWidget />
                </div>
                <div className="lg:col-span-1 bg-[#0A0A0C]/60 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                  <TopMarketsWidget />
                </div>
                <div className="lg:col-span-1 bg-[#0A0A0C]/60 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                  <AIInsightsWidget />
                </div>
              </div>

              {/* Quick Link to Markets */}
              <div className="mt-12 text-center">
                <a 
                  href="/markets"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] hover:scale-105 transform duration-200"
                >
                  <span>VIEW ALL MARKETS</span>
                  <span className="text-xl">→</span>
                </a>
                <p className="text-slate-500 text-sm mt-4 font-mono">
                  Browse {markets.length} active markets and start trading
                </p>
              </div>
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
