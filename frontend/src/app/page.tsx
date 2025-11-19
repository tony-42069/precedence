'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from "next/image";
import { useWallet } from '../hooks/useWallet';
import { usePredictions, MarketWithAI } from '../hooks/usePredictions';
import { TradingModal } from '../components/TradingModal';
import { AIConfidenceBadge, AIConfidenceDetailed } from '../components/AIConfidenceIndicator';
import { Sidebar, MobileMenuButton } from '../components/Sidebar';
import { MarketActivityWidget } from '../components/MarketActivityWidget';
import { TopMarketsWidget } from '../components/TopMarketsWidget';
import { AIInsightsWidget } from '../components/AIInsightsWidget';
import { 
  LayoutDashboard, 
  Gavel, 
  TrendingUp, 
  BrainCircuit, 
  Wallet, 
  User, 
  Search, 
  X,
  Terminal,
  Activity,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

// Brand colors (Reference for Tailwind config)
const colors = {
  royalBlue: '#0052FF',
  deepPurple: '#6366F1',
  gold: '#FBBF24',
  charcoal: '#18181B',
  slateGray: '#64748B',
  lightGray: '#F1F5F9',
  offWhite: '#FAFAFA',
  successGreen: '#10B981',
};

interface Market {
  id?: string;
  question?: string;
  description?: string;
  volume?: number;
  closed?: boolean;
  active?: boolean;
  tags?: string[];
  current_yes_price?: number;
  current_no_price?: number;
  title?: string;
  probability?: number;
  endDate?: string;
}

export default function Home() {
  const pathname = usePathname();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [tradingMarket, setTradingMarket] = useState<Market | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wallet functionality
  const { walletState, connectPhantom, connectMetaMask, disconnect, checkWalletAvailability } = useWallet();

  // AI Predictions functionality
  const {
    enhanceMarketsWithAI,
    getCachedPrediction,
    isLoadingPrediction,
    getPredictionError
  } = usePredictions();

  // Test backend connection and fetch markets
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        if (response.ok) {
          setBackendStatus('online');
          // Fetch legal markets only
          const marketsResponse = await fetch('http://localhost:8000/api/markets/legal');
          if (marketsResponse.ok) {
            const data = await marketsResponse.json();
            const rawMarkets = Array.isArray(data) ? data : (data.markets || []);
            setMarkets(rawMarkets);

            // Enhance markets with AI predictions
            if (rawMarkets.length > 0) {
              console.log('Enhancing markets with AI predictions...');
              const enhancedMarkets = await enhanceMarketsWithAI(rawMarkets);
              const finalMarkets = rawMarkets.map((market: Market) => {
                const enhanced = enhancedMarkets.find(em => em.id === market.id);
                return enhanced || market;
              });
              setMarkets(finalMarkets);
            }
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

  // Get current view from pathname
  const currentView = pathname === '/' ? 'dashboard' :
                     pathname === '/cases' ? 'cases' :
                     pathname === '/markets' ? 'markets' :
                     pathname === '/predictions' ? 'predictions' :
                     pathname === '/portfolio' ? 'portfolio' :
                     pathname === '/profile' ? 'profile' : 'dashboard';

  // Filter markets based on selected category
  const filteredMarkets = markets.filter(market => {
    if (selectedCategory === 'all') return true;
    const q = market.question?.toLowerCase() || '';
    if (selectedCategory === 'supreme-court') {
      return q.includes('supreme court') || q.includes('scotus');
    }
    if (selectedCategory === 'regulatory') {
      return q.includes('sec') || q.includes('fcc') || q.includes('doj') || q.includes('regulation');
    }
    if (selectedCategory === 'constitutional') {
      return q.includes('constitutional') || q.includes('amendment');
    }
    return true;
  });

  return (
    // CHANGED: Main background to dark theme
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* --- BACKGROUND FX --- */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Mobile Menu Button */}
        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 lg:ml-64">
          
          {/* Navigation Header */}
          {/* CHANGED: From white to dark glass */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Breadcrumb */}
                <div className="hidden md:flex items-center gap-2 text-sm font-mono text-slate-500">
                    <Terminal size={14} />
                    <span>PRECEDENCE_TERMINAL</span>
                    <span className="text-slate-700">/</span>
                    <span className="text-blue-400 uppercase">{currentView}</span>
                </div>

                {/* Status & Controls */}
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
                          <div className="text-xs text-yellow-500 font-mono">
                            ⚠️ WALLET_NOT_DETECTED
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      {/* Wallet Status */}
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

                      {/* Balance */}
                      {walletState.balance && (
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hidden sm:block">
                          <div className="text-xs font-mono font-medium text-slate-300">
                            {walletState.balance} {walletState.network === 'solana' ? 'SOL' : 'ETH'}
                          </div>
                        </div>
                      )}

                      {/* Disconnect */}
                      <button
                        onClick={disconnect}
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
                      {backendStatus === 'checking' ? 'PING...' :
                       backendStatus === 'online' ? 'SYSTEM ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Dynamic Content Based on Current View */}
          {currentView === 'dashboard' && (
            <>
              {/* Hero Dashboard */}
              <div className="mx-4 mt-8 mb-8">
                {/* CHANGED: Glass panel with gradient overlay */}
                <div className="relative border border-white/10 rounded-2xl p-8 lg:p-16 overflow-hidden bg-[#0A0A0C]/60 backdrop-blur-sm group">
                  
                  {/* Animated Gradient Bar */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-50"></div>

                  <div className="relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-6">
                        <span className="animate-pulse">●</span> LIVE MARKET FEED
                    </div>
                    
                    <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
                      Predict Legal <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Outcomes</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed">
                      Trade on Supreme Court decisions, regulatory rulings, and high-profile legal cases
                      with AI-powered market intelligence.
                    </p>

                    {/* Key Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="text-2xl font-mono font-bold text-blue-400 mb-1">$2.4M</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">24h Volume</div>
                      </div>
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="text-2xl font-mono font-bold text-green-400 mb-1">{markets.length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Active Markets</div>
                      </div>
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="text-2xl font-mono font-bold text-purple-400 mb-1">AI</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Powered</div>
                      </div>
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="text-2xl font-mono font-bold text-yellow-400 mb-1">24/7</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Trading</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Widgets */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                   {/* Note: You'll need to update these components internally to match dark theme */}
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
              </div>

              {/* Main Dashboard */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Category Filters */}
                <div className="mb-8">
                  <div className="flex flex-wrap gap-3">
                    {[
                        {id: 'all', label: 'All Markets'},
                        {id: 'supreme-court', label: '🏛️ Supreme Court'},
                        {id: 'regulatory', label: '⚖️ Regulatory'},
                        {id: 'constitutional', label: '📜 Constitutional'}
                    ].map(cat => (
                        <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                          selectedCategory === cat.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Markets Grid */}
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-sm font-mono text-blue-400 animate-pulse">ESTABLISHING UPLINK...</p>
                    </div>
                  </div>
                ) : filteredMarkets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredMarkets.map((market, index) => (
                      // CHANGED: Market Card to Dark Glass
                      <div key={market.id || index} className="bg-[#0A0A0C]/80 backdrop-blur-md rounded-xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
                        <div className="p-6">
                          {/* Status Badges */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                                market.closed
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-green-500/10 text-green-400 border-green-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${market.closed ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                {market.closed ? 'Closed' : 'Active'}
                              </span>
                              {getCachedPrediction(market.id || '') && (
                                <AIConfidenceBadge
                                  prediction={getCachedPrediction(market.id || '')!}
                                  size="sm"
                                />
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold font-mono text-slate-200">
                                ${Number(market.volume || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                })}
                              </div>
                              <div className="text-[10px] text-slate-500 uppercase">Volume</div>
                            </div>
                          </div>

                          {/* Question */}
                          <h3 className="text-lg font-medium text-white mb-4 leading-snug min-h-[3.5rem]">
                            {market.question || 'Market Question'}
                          </h3>

                          {/* Price info bars */}
                          {market.current_yes_price !== undefined && market.current_no_price !== undefined && (
                             <div className="flex items-center gap-2 mb-4 font-mono text-sm">
                                <div className="flex-1 bg-white/5 rounded p-2 border border-white/5 group-hover:border-green-500/30 transition-colors">
                                   <div className="flex justify-between">
                                       <span className="text-slate-500 text-xs">YES</span>
                                       <span className="text-green-400 font-bold">${(market.current_yes_price * 100).toFixed(1)}</span>
                                   </div>
                                   <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
                                       <div className="bg-green-500 h-full" style={{width: `${market.current_yes_price * 100}%`}}></div>
                                   </div>
                                </div>
                                <div className="flex-1 bg-white/5 rounded p-2 border border-white/5 group-hover:border-red-500/30 transition-colors">
                                   <div className="flex justify-between">
                                       <span className="text-slate-500 text-xs">NO</span>
                                       <span className="text-red-400 font-bold">${(market.current_no_price * 100).toFixed(1)}</span>
                                   </div>
                                   <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
                                       <div className="bg-red-500 h-full" style={{width: `${market.current_no_price * 100}%`}}></div>
                                   </div>
                                </div>
                             </div>
                          )}

                          {/* Tags */}
                          {market.tags && market.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {market.tags.slice(0, 3).map((tag, tagIndex) => (
                                <span key={tagIndex} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono uppercase bg-white/5 text-slate-400 border border-white/5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Trading Buttons */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setTradingMarket(market);
                                setShowTradingModal(true);
                              }}
                              disabled={!walletState.connected}
                              className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-mono py-2 px-3 rounded-lg transition-colors text-xs"
                            >
                              BUY YES
                            </button>
                            <button
                              onClick={() => {
                                setTradingMarket(market);
                                setShowTradingModal(true);
                              }}
                              disabled={!walletState.connected}
                              className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono py-2 px-3 rounded-lg transition-colors text-xs"
                            >
                              BUY NO
                            </button>
                          </div>

                          {/* View Market Button */}
                          <button
                            onClick={() => {
                              setSelectedMarket(market);
                              setShowMarketModal(true);
                            }}
                            className="w-full mt-2 text-slate-500 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-xs uppercase tracking-wider"
                          >
                            View Analytics &gt;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-4xl mb-4 opacity-50">⚖️</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No markets found</h3>
                    <p className="text-slate-400 mb-4 text-sm">
                      {backendStatus === 'offline'
                        ? 'Uplink Offline. Initialize backend server.'
                        : `No markets found in sector "${selectedCategory}".`
                      }
                    </p>
                    {backendStatus === 'offline' && (
                      <div className="bg-black/50 border border-yellow-900/50 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-yellow-500 font-mono text-xs">
                          $ python -m uvicorn backend.api.main:app --reload
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </>
          )}

          {/* --- CASES VIEW --- */}
          {currentView === 'cases' && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Court Cases</h1>
                <p className="text-slate-400">Search legal cases and initialize prediction markets</p>
              </div>

              {/* Search Interface */}
              <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-8 mb-8">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-lg font-semibold text-white mb-4 text-center flex items-center justify-center gap-2">
                    <Search size={20} /> Search Docket
                  </h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Search legal cases (e.g., 'social media', 'environmental')..."
                      className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                      Search
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center font-mono">
                    VIA CourtListener API // SEMANTIC SEARCH V2
                  </p>
                </div>
              </div>

              {/* Featured Case Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  {icon: '🏛️', title: 'Supreme Court', desc: 'Constitutional cases'},
                  {icon: '⚖️', title: 'Regulatory', desc: 'SEC, FCC, DOJ'},
                  {icon: '📜', title: 'Constitutional', desc: 'Rights & Amendments'},
                  {icon: '🏢', title: 'Corporate', desc: 'Business Litigation'}
                ].map((cat, i) => (
                   <div key={i} className="bg-white/5 rounded-xl border border-white/5 p-6 hover:border-blue-500/30 hover:bg-white/10 transition-all cursor-pointer group">
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</div>
                    <h3 className="text-lg font-semibold text-white mb-1">{cat.title}</h3>
                    <p className="text-sm text-slate-400">{cat.desc}</p>
                  </div>
                ))}
              </div>

              {/* Recent Cases */}
              <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Recent SCOTUS Activity</h3>
                <div className="space-y-4">
                  {[
                    { title: "Social Media Content Moderation Case", court: "Supreme Court", date: "2024", status: "Active" },
                    { title: "Environmental Regulation Challenge", court: "Supreme Court", date: "2024", status: "Active" },
                    { title: "Digital Privacy Rights Case", court: "Supreme Court", date: "2024", status: "Pending" },
                    { title: "Corporate Governance Dispute", court: "Supreme Court", date: "2024", status: "Active" }
                  ].map((case_, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-white/5 bg-white/5 rounded-lg hover:border-blue-500/30 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{case_.title}</h4>
                        <p className="text-sm text-slate-500">{case_.court} • {case_.date}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          case_.status === 'Active' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {case_.status}
                        </span>
                        <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          Create Market
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          )}

          {/* --- MARKETS VIEW --- */}
          {currentView === 'markets' && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
               {/* Logic reused from dashboard, but full width here */}
               {/* For brevity, reusing the markets rendering from Dashboard logic if identical, or paste grid here */}
               <div className="mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">Active Markets</h1>
                  <p className="text-slate-400">Browse and trade on verified legal outcomes</p>
               </div>
               
               {/* Reuse Grid logic from dashboard... */}
               {loading ? (
                  <div className="py-20 text-center">Loading...</div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {filteredMarkets.map((market, index) => (
                        <div key={market.id || index} className="bg-[#0A0A0C]/80 backdrop-blur-md rounded-xl border border-white/10 p-6">
                           <h3 className="text-white font-medium mb-4">{market.question}</h3>
                           <button onClick={() => {setSelectedMarket(market); setShowMarketModal(true);}} className="w-full bg-blue-600/20 text-blue-400 py-2 rounded hover:bg-blue-600/30 transition">View Details</button>
                        </div>
                     ))}
                  </div>
               )}
            </main>
          )}

          {/* --- PREDICTIONS VIEW --- */}
          {currentView === 'predictions' && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">AI Predictions</h1>
                <p className="text-slate-400">Judge profiling and probability modeling</p>
              </div>

              {/* AI Insights Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0A0A0C]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-blue-400 mb-2">
                      {markets.filter(m => getCachedPrediction(m.id || '')).length}
                    </div>
                    <div className="text-sm text-slate-500 uppercase tracking-wider">Markets Analyzed</div>
                  </div>
                </div>
                <div className="bg-[#0A0A0C]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-green-400 mb-2">85%</div>
                    <div className="text-sm text-slate-500 uppercase tracking-wider">Avg Confidence</div>
                  </div>
                </div>
                <div className="bg-[#0A0A0C]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-purple-400 mb-2">9</div>
                    <div className="text-sm text-slate-500 uppercase tracking-wider">Judges Profiled</div>
                  </div>
                </div>
              </div>

              {/* Markets with AI Predictions */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                   <p className="text-slate-500 animate-pulse">ANALYZING...</p>
                </div>
              ) : markets.filter(m => getCachedPrediction(m.id || '')).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {markets.filter(m => getCachedPrediction(m.id || '')).map((market, index) => (
                    <div key={market.id || index} className="bg-[#0A0A0C]/80 rounded-xl border border-purple-500/20 p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                      <div className="flex justify-between items-start mb-4 pl-2">
                        <h3 className="text-lg font-semibold text-white flex-1 mr-4">
                          {market.question || 'Market Question'}
                        </h3>
                        {getCachedPrediction(market.id || '') && (
                          <AIConfidenceBadge
                            prediction={getCachedPrediction(market.id || '')!}
                            size="lg"
                          />
                        )}
                      </div>

                      {getCachedPrediction(market.id || '') && (
                        <div className="bg-purple-500/5 rounded-lg p-4 border border-purple-500/10">
                           <AIConfidenceDetailed
                             prediction={getCachedPrediction(market.id || '')!}
                           />
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedMarket(market);
                          setShowMarketModal(true);
                        }}
                        className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                      >
                        View Full Analysis
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-6xl mb-4 opacity-50">🤖</div>
                  <h3 className="text-xl font-semibold text-white mb-2">AI Predictions Loading</h3>
                  <p className="text-slate-400">Models initializing...</p>
                </div>
              )}
            </main>
          )}

          {/* --- PORTFOLIO VIEW --- */}
          {currentView === 'portfolio' && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
                <p className="text-slate-400">Position tracking and P&L analysis</p>
              </div>

              <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5">
                <div className="text-6xl mb-4 opacity-50">💼</div>
                <h3 className="text-xl font-semibold text-white mb-2">Portfolio Module Offline</h3>
                <p className="text-slate-400 mb-4">Module will activate upon first trade execution.</p>
              </div>
            </main>
          )}

          {/* --- PROFILE VIEW --- */}
          {currentView === 'profile' && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Identity</h1>
                <p className="text-slate-400">Account settings and preferences</p>
              </div>

              <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5">
                <div className="text-6xl mb-4 opacity-50">👤</div>
                <h3 className="text-xl font-semibold text-white mb-2">User Settings</h3>
                <p className="text-slate-400 mb-4">Basic identity management available.</p>
              </div>
            </main>
          )}
        </div>
      </div>

      {/* --- MARKET DETAILS MODAL (Dark Theme) --- */}
      {showMarketModal && selectedMarket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowMarketModal(false)}></div>
           <div className="relative bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-start sticky top-0 bg-[#0A0A0C] z-20">
                 <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase border ${
                          selectedMarket.closed ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                       }`}>
                          {selectedMarket.closed ? 'CLOSED' : 'ACTIVE'}
                       </span>
                       <span className="text-slate-500 text-xs font-mono">ID: {selectedMarket.id?.substring(0,8)}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-snug">{selectedMarket.question}</h2>
                 </div>
                 <button onClick={() => setShowMarketModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
              </div>

              <div className="p-6 space-y-6">
                 {/* Stats Row */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                       <div className="text-xs text-slate-500 uppercase">Volume</div>
                       <div className="text-xl font-mono font-bold text-white">
                          ${Number(selectedMarket.volume || 0).toLocaleString()}
                       </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                       <div className="text-xs text-slate-500 uppercase">Source</div>
                       <div className="text-xl font-mono font-bold text-blue-400">Polymarket</div>
                    </div>
                 </div>

                 {/* Description */}
                 <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Context</h3>
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-slate-300 leading-relaxed text-sm">
                       {selectedMarket.description || "No detailed context available."}
                    </div>
                 </div>

                 {/* AI Analysis */}
                 {getCachedPrediction(selectedMarket.id || '') && (
                    <div className="border border-purple-500/30 bg-purple-500/5 p-5 rounded-xl">
                       <h3 className="text-sm font-bold text-purple-400 uppercase mb-3 flex items-center gap-2">
                          <BrainCircuit size={16} /> AI Analysis
                       </h3>
                       <AIConfidenceDetailed prediction={getCachedPrediction(selectedMarket.id || '')!} />
                    </div>
                 )}

                 {/* Tags */}
                 {selectedMarket.tags && (
                    <div className="flex flex-wrap gap-2">
                       {selectedMarket.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-400 font-mono uppercase">{tag}</span>
                       ))}
                    </div>
                 )}

                 {/* Actions */}
                 <div className="flex gap-4 pt-4">
                    <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                       TRADE ON TERMINAL
                    </button>
                    <button onClick={() => setShowMarketModal(false)} className="px-6 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-slate-300 font-medium">
                       CLOSE
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Trading Modal */}
      <TradingModal
        market={tradingMarket}
        isOpen={showTradingModal}
        onClose={() => setShowTradingModal(false)}
      />
    </div>
  );
}
