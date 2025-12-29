'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { useUser } from '../../contexts/UserContext';
import { useSafeAddress } from '../../hooks/useSafeAddress';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { WalletConnectModal } from '../../components/WalletConnectModal';
import { 
  Wallet, 
  TrendingUp, 
  History, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Terminal,
  Activity,
  AlertCircle,
  RefreshCw,
  Gavel
} from 'lucide-react';

export default function PortfolioPage() {
  const pathname = usePathname();
  const { walletState } = useWallet();
  const { user, clearUser, stats, fetchStats } = useUser();
  
  // Use Safe address for Polymarket positions, EOA for our database
  const { 
    safeAddress, 
    balance,
    positions: polymarketPositions, // Renamed - this is from Polymarket API (slow)
    positionsLoading: polymarketLoading,
    refreshPositions: refreshPolymarketPositions,
    refreshBalance 
  } = useSafeAddress();
  
  // Our database positions (fast!) - fetch via API
  const [dbPositions, setDbPositions] = useState<any[]>([]);
  const [dbPositionsLoading, setDbPositionsLoading] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'history'>('positions');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch positions from our database (instant!)
  const fetchDbPositions = useCallback(async () => {
    if (!user?.wallet_address) return;
    
    setDbPositionsLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://precedence-production.up.railway.app';
      const response = await fetch(`${API_BASE_URL}/api/users/${user.wallet_address}/positions?active_only=true`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Positions from our DB:', data);
        setDbPositions(data);
      }
    } catch (err) {
      console.error('Failed to fetch DB positions:', err);
    } finally {
      setDbPositionsLoading(false);
    }
  }, [user?.wallet_address]);

  // Fetch data when user is available
  useEffect(() => {
    if (user) {
      fetchStats();
      fetchDbPositions(); // Fetch from our DB immediately
    }
  }, [user, fetchStats, fetchDbPositions]);

  // Combine positions: prefer our DB (instant), supplement with Polymarket (delayed)
  const combinedPositions = useMemo(() => {
    // Start with our DB positions
    const positionsMap = new Map();
    
    // Add DB positions first (these are instant)
    dbPositions.forEach(pos => {
      const key = `${pos.market_id}-${pos.outcome}`;
      positionsMap.set(key, {
        ...pos,
        source: 'database',
        marketQuestion: pos.market_question || pos.market_id,
        size: pos.total_shares?.toString() || '0',
        avgPrice: pos.avg_entry_price?.toString() || '0',
      });
    });
    
    // Then add Polymarket positions that aren't in our DB yet
    // (This handles positions that existed before we started tracking)
    if (polymarketPositions) {
      polymarketPositions.forEach(pos => {
        const key = `${pos.conditionId || pos.asset}-${pos.outcome || 'YES'}`;
        if (!positionsMap.has(key)) {
          positionsMap.set(key, {
            ...pos,
            source: 'polymarket',
          });
        }
      });
    }
    
    return Array.from(positionsMap.values());
  }, [dbPositions, polymarketPositions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDbPositions(),      // Our DB (fast)
      refreshPolymarketPositions(), // Polymarket API (slow)
      refreshBalance(),
      fetchStats()
    ]);
    setRefreshing(false);
  };

  // Calculate portfolio metrics
  const totalPortfolioValue = parseFloat(balance || '0');
  const positionCount = combinedPositions.length;
  const positionsLoading = dbPositionsLoading || polymarketLoading;
  const totalTrades = user?.total_trades || 0;
  const winRate = user?.win_rate ? user.win_rate * 100 : 0;

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      
      {/* Background */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)} 
          onConnectWallet={() => setWalletModalOpen(true)}
        />
        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 lg:ml-64">
          
          {/* Navigation Header */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="hidden md:flex items-center gap-2 text-sm font-mono text-slate-500">
                  <Terminal size={14} />
                  <span>PRECEDENCE_TERMINAL</span>
                  <span className="text-slate-700">/</span>
                  <span className="text-blue-400 uppercase">PORTFOLIO_MGMT</span>
                </div>

                <div className="flex items-center space-x-4 ml-auto">
                  {user && (
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-400 transition-colors"
                    >
                      <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  )}
                  {!user ? (
                    <button
                      onClick={() => setWalletModalOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></div>
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        P&L TRACKING: ACTIVE
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
              <p className="text-slate-400">Position tracking and performance analytics.</p>
              {safeAddress && (
                <p className="text-xs text-slate-600 font-mono mt-1">
                  Trading wallet: {safeAddress}
                </p>
              )}
            </div>

            {/* Not Connected State */}
            {!user ? (
              <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center border border-white/10">
                  <Wallet size={32} className="text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Connect to View Portfolio</h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Connect your wallet to view your positions, trading history, and performance analytics.
                </p>
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-lg font-semibold transition-all"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Tab Navigation */}
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl w-full max-w-md mb-8">
                  {[
                    { id: 'overview', label: 'Overview', icon: PieChart },
                    { id: 'positions', label: 'Positions', icon: TrendingUp },
                    { id: 'history', label: 'History', icon: History }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">USDC Balance</div>
                        <div className="text-2xl font-mono font-bold text-blue-400">
                          ${totalPortfolioValue.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Positions</div>
                        <div className="text-2xl font-mono font-bold text-green-400">
                          {positionCount}
                        </div>
                      </div>
                      <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Trades</div>
                        <div className="text-2xl font-mono font-bold text-purple-400">
                          {totalTrades}
                        </div>
                      </div>
                      <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Win Rate</div>
                        <div className="text-2xl font-mono font-bold text-amber-400">
                          {winRate.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <a href="/app/markets" className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group">
                        <TrendingUp size={18} className="group-hover:scale-110 transition-transform" /> View Markets
                      </a>
                      <a href="/app/cases" className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group">
                        <Gavel size={18} className="group-hover:scale-110 transition-transform" /> View Cases
                      </a>
                      <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group">
                        <Download size={18} className="group-hover:scale-110 transition-transform" /> Export CSV
                      </button>
                    </div>
                  </div>
                )}

                {/* Positions Tab */}
                {activeTab === 'positions' && (
                  <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">Active Positions</h2>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">{positionCount} position{positionCount !== 1 ? 's' : ''}</span>
                        <button
                          onClick={handleRefresh}
                          disabled={positionsLoading}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <RefreshCw size={14} className={`text-slate-400 ${positionsLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {positionsLoading ? (
                      <div className="text-center py-16">
                        <RefreshCw className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
                        <p className="text-slate-400">Loading positions...</p>
                      </div>
                    ) : combinedPositions && combinedPositions.length > 0 ? (
                      <div className="divide-y divide-white/5">
                        {combinedPositions.map((position, idx) => (
                          <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex-1 mb-4 md:mb-0">
                              <h4 className="font-medium text-slate-200 mb-1">
                                {position.marketQuestion || position.marketSlug || position.market_id?.slice(0, 20) + '...' || 'Unknown Market'}
                              </h4>
                              <div className="flex items-center gap-4 text-sm font-mono">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase border ${
                                  position.outcome === 'Yes' || position.outcome === 'YES'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {position.outcome || 'POSITION'}
                                </span>
                                <span className="text-slate-500">
                                  SIZE: <span className="text-slate-300">{parseFloat(position.size || position.total_shares || '0').toFixed(2)}</span>
                                </span>
                                <span className="text-slate-500">
                                  AVG: <span className="text-slate-300">${parseFloat(position.avgPrice || position.avg_entry_price || '0').toFixed(3)}</span>
                                </span>
                                {position.source && (
                                  <span className={`text-[10px] px-1 py-0.5 rounded ${
                                    position.source === 'database' 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {position.source === 'database' ? 'INSTANT' : 'PM'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold font-mono text-white mb-1">
                                {parseFloat(position.size || position.total_shares || '0').toFixed(2)} shares
                              </div>
                              {(position.pnl !== undefined || position.realized_pnl !== undefined) && (
                                <div className={`text-sm font-mono font-medium ${
                                  (position.pnl || position.realized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {(position.pnl || position.realized_pnl || 0) >= 0 ? '+' : ''}{(position.pnl || position.realized_pnl || 0).toFixed(2)} P&L
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No Active Positions</h3>
                        <p className="text-slate-500 text-sm mb-4">Start trading on markets to build your portfolio.</p>
                        <a 
                          href="/app/markets"
                          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        >
                          <TrendingUp size={16} /> Browse Markets
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                      <div className="p-6 border-b border-white/10">
                        <h2 className="text-lg font-semibold text-white">Order History</h2>
                      </div>
                      <div className="text-center py-16">
                        <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">Trade History Coming Soon</h3>
                        <p className="text-slate-500 text-sm">Your past transactions will appear here.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
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
