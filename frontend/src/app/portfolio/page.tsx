'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { useUser } from '../../contexts/UserContext';
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
  RefreshCw
} from 'lucide-react';

export default function PortfolioPage() {
  const pathname = usePathname();
  const { walletState } = useWallet();
  const { user, clearUser, positions, stats, fetchPositions, fetchStats } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'history'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data when user is available
  useEffect(() => {
    if (user) {
      fetchPositions();
      fetchStats();
    }
  }, [user, fetchPositions, fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPositions(), fetchStats()]);
    setRefreshing(false);
  };

  // Calculate portfolio metrics from real data
  const totalPortfolioValue = stats?.total_position_value || 0;
  const totalUnrealizedPnL = stats?.total_unrealized_pnl || 0;
  const totalRealizedPnL = user?.total_profit_loss || 0;
  const winRate = user?.win_rate ? user.win_rate * 100 : 0;
  const totalTrades = user?.total_trades || 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      
      {/* --- BACKGROUND FX --- */}
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
                      onClick={() => window.location.href = '/wallet-connect.html'} // Redirect to polished page
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
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Portfolio Value</div>
                        <div className="text-2xl font-mono font-bold text-blue-400">
                          ${totalPortfolioValue.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unrealized P&L</div>
                        <div className={`text-2xl font-mono font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Realized P&L</div>
                        <div className={`text-2xl font-mono font-bold ${totalRealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Win Rate</div>
                        <div className="text-2xl font-mono font-bold text-purple-400">
                          {winRate.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Chart Placeholder */}
                    <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-20">
                         <Activity size={100} className="text-blue-500" />
                      </div>
                      <h2 className="text-lg font-semibold text-white mb-6">Performance Analytics</h2>
                      <div className="h-64 rounded-lg flex flex-col items-center justify-center border border-dashed border-white/10 bg-black/20">
                        <div className="text-center">
                          <div className="text-blue-500 mb-4 animate-pulse">
                             <Activity size={48} className="mx-auto" />
                          </div>
                          <p className="text-slate-400 font-mono">
                            {totalTrades > 0 ? 'CHART_MODULE_LOADING...' : 'NO_TRADES_YET'}
                          </p>
                          <p className="text-xs text-slate-600 mt-2">
                            {totalTrades > 0 
                              ? 'Performance chart coming soon' 
                              : 'Start trading to see your performance analytics'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <a href="/app/markets" className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group">
                        <TrendingUp size={18} className="group-hover:scale-110 transition-transform" /> View Markets
                      </a>
                      <button className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group">
                        <ArrowDownRight size={18} className="group-hover:scale-110 transition-transform" /> Deposit Funds
                      </button>
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
                      <span className="text-sm text-slate-500">{positions.length} position{positions.length !== 1 ? 's' : ''}</span>
                    </div>

                    {positions.length > 0 ? (
                      <div className="divide-y divide-white/5">
                        {positions.map((position) => (
                          <div key={position.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex-1 mb-4 md:mb-0">
                              <h4 className="font-medium text-slate-200 mb-1">{position.market_id}</h4>
                              <div className="flex items-center gap-4 text-sm font-mono">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase border ${
                                  position.outcome === 'YES' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {position.outcome}
                                </span>
                                <span className="text-slate-500">
                                  ENTRY: <span className="text-slate-300">${position.avg_entry_price?.toFixed(2) || '0.00'}</span>
                                </span>
                                <span className="text-slate-500">
                                  MARK: <span className="text-slate-300">${position.current_price?.toFixed(2) || '0.00'}</span>
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold font-mono text-white mb-1">
                                {position.total_shares.toFixed(2)} shares
                              </div>
                              <div className={`text-sm font-mono font-medium ${
                                (position.unrealized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {(position.unrealized_pnl || 0) >= 0 ? '+' : ''}{(position.unrealized_pnl || 0).toFixed(2)} P&L
                              </div>
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
                          href="/markets"
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
                    {/* Summary Mini-Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                          <div className="text-xs text-slate-500 uppercase">Total Trades</div>
                          <div className="text-xl font-mono font-bold text-blue-400">{totalTrades}</div>
                       </div>
                       <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                          <div className="text-xs text-slate-500 uppercase">Total P&L</div>
                          <div className={`text-xl font-mono font-bold ${totalRealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                             {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toFixed(2)}
                          </div>
                       </div>
                       <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                          <div className="text-xs text-slate-500 uppercase">Markets Traded</div>
                          <div className="text-xl font-mono font-bold text-purple-400">{user?.markets_traded || 0}</div>
                       </div>
                       <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                          <div className="text-xs text-slate-500 uppercase">Active Positions</div>
                          <div className="text-xl font-mono font-bold text-slate-300">{stats?.active_positions || 0}</div>
                       </div>
                    </div>

                    {/* Trade History Table */}
                    <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                      <div className="p-6 border-b border-white/10">
                        <h2 className="text-lg font-semibold text-white">Order History</h2>
                      </div>

                      <div className="text-center py-16">
                        <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">Trade History Coming Soon</h3>
                        <p className="text-slate-500 text-sm">Your past transactions will appear here after you start trading.</p>
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
