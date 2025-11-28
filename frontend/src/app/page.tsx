'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../hooks/useWallet';
import { useUser } from '../contexts/UserContext';
import { usePredictions } from '../hooks/usePredictions';
import { Sidebar, MobileMenuButton } from '../components/Sidebar';
import { HeroSection } from '../components/HeroSection';
import { MarketActivityWidget } from '../components/MarketActivityWidget';
import { TopMarketsWidget } from '../components/TopMarketsWidget';
import { AIInsightsWidget } from '../components/AIInsightsWidget';
import { WalletConnectModal } from '../components/WalletConnectModal';
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
  const searchParams = useSearchParams();
  const { login, logout: privyLogout, ready, authenticated } = usePrivy();
  
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const { walletState, disconnect } = useWallet();
  const { user, clearUser } = useUser();
  const { enhanceMarketsWithAI } = usePredictions();

  // Track if we've already triggered login to prevent multiple calls
  const loginTriggeredRef = useRef(false);

  // Handle URL parameter for auto-login (from wallet-connect.html)
  useEffect(() => {
    // Only run once Privy is ready, user is NOT authenticated, and we haven't triggered yet
    if (!ready || authenticated || loginTriggeredRef.current) {
      return;
    }

    const loginMethod = searchParams.get('login');
    if (loginMethod) {
      console.log('🔐 Auto-triggering Privy login:', loginMethod);
      loginTriggeredRef.current = true; // Mark as triggered to prevent repeat calls
      
      // Small delay to ensure Privy is fully initialized
      setTimeout(() => {
        if (loginMethod === 'email') {
          login({ loginMethods: ['email'] });
        } else if (loginMethod === 'google') {
          login({ loginMethods: ['google'] });
        } else if (loginMethod === 'wallet') {
          login({ loginMethods: ['wallet'] });
        }
      }, 100);
    }
  }, [ready, authenticated, searchParams, login]);

  // Reset login trigger if user logs out
  useEffect(() => {
    if (!authenticated) {
      // Allow re-triggering if user logs out and comes back
      // But only reset if there's no login param (to prevent loop)
      const loginMethod = searchParams.get('login');
      if (!loginMethod) {
        loginTriggeredRef.current = false;
      }
    }
  }, [authenticated, searchParams]);

  // Handle disconnect - logout from Privy and redirect to landing page
  const handleDisconnect = async () => {
    // Logout from Privy FIRST
    await privyLogout();
    
    // Then clear local state
    disconnect();
    clearUser();
    
    // Reset login trigger
    loginTriggeredRef.current = false;
    
    // Redirect to landing page
    window.location.href = 'https://www.precedence.fun';
  };

  // Fetch markets for stats and hero
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          setBackendStatus('online');
          const marketsResponse = await fetch(`${API_URL}/api/markets/legal`);
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

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Background FX */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)} 
          onConnectWallet={() => setWalletModalOpen(true)}
        />
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
                  {!user ? (
                    <button
                      onClick={() => window.location.href = '/wallet-connect.html'} // Redirect to polished page
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 shadow-lg hover:shadow-blue-500/25"
                    >
                      <span>Connect Wallet</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-3">
                      {/* User Display */}
                      <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {user.username ? user.username[0].toUpperCase() : user.wallet_address.slice(2, 4).toUpperCase()}
                          </div>
                          <div className="text-sm">
                            <div className="font-mono text-slate-200 text-xs">
                              {user.display_name || user.username || formatAddress(user.wallet_address)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* P&L Badge */}
                      <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hidden sm:block">
                        <div className={`text-xs font-mono font-medium ${user.total_profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {user.total_profit_loss >= 0 ? '+' : ''}${user.total_profit_loss.toFixed(2)}
                        </div>
                      </div>
                      
                      <button 
                        onClick={handleDisconnect} 
                        className="text-xs text-slate-500 hover:text-red-400 font-mono underline decoration-slate-700"
                      >
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

            {/* Dashboard Widgets - WIDER LAYOUT */}
            <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-16 py-4 pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1800px] mx-auto">
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
              <div className="mt-12 text-center max-w-[1800px] mx-auto">
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

      {/* Wallet Connect Modal */}
      <WalletConnectModal 
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </div>
  );
}
