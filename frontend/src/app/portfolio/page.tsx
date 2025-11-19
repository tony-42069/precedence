'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { 
  Wallet, 
  TrendingUp, 
  History, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Plus, 
  Terminal,
  Activity,
  AlertCircle
} from 'lucide-react';

interface Trade {
  id: string;
  market: string;
  type: 'YES' | 'NO';
  amount: number;
  price: number;
  timestamp: string;
  status: 'won' | 'lost' | 'pending';
  pnl?: number;
}

interface Position {
  id: string;
  market: string;
  type: 'YES' | 'NO';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
}

export default function PortfolioPage() {
  const pathname = usePathname();
  const { walletState } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'history'>('overview');

  // Mock trading history data
  const tradingHistory: Trade[] = [
    {
      id: '1',
      market: 'Will SCOTUS overturn Roe v. Wade?',
      type: 'YES',
      amount: 100,
      price: 0.65,
      timestamp: '2024-11-07T14:30:00Z',
      status: 'pending',
    },
    {
      id: '2',
      market: 'Will EPA regulate crypto mining?',
      type: 'NO',
      amount: 50,
      price: 0.42,
      timestamp: '2024-11-06T09:15:00Z',
      status: 'won',
      pnl: 58,
    },
    {
      id: '3',
      market: 'Will Congress pass climate bill?',
      type: 'YES',
      amount: 75,
      price: 0.55,
      timestamp: '2024-11-05T16:45:00Z',
      status: 'lost',
      pnl: -75,
    },
  ];

  // Mock open positions
  const openPositions: Position[] = [
    {
      id: '1',
      market: 'Will SCOTUS overturn Roe v. Wade?',
      type: 'YES',
      amount: 100,
      entryPrice: 0.65,
      currentPrice: 0.68,
      unrealizedPnL: 30,
    },
    {
      id: '2',
      market: 'Will EPA regulate crypto mining?',
      type: 'NO',
      amount: 50,
      entryPrice: 0.42,
      currentPrice: 0.39,
      unrealizedPnL: 15,
    },
  ];

  const totalTrades = tradingHistory.length;
  const winningTrades = tradingHistory.filter(t => t.status === 'won').length;
  const totalPnL = tradingHistory.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
  const totalUnrealizedPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalPortfolioValue = (Number(walletState.balance) || 0) + totalUnrealizedPnL;

  const formatDate = (dateString: string) => {
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
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 lg:ml-0">
          
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

                {/* Status & Controls */}
                <div className="flex items-center space-x-4 ml-auto">
                  <div className="flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                    <div className={`w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]`}></div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      P&L TRACKING: ACTIVE
                    </span>
                  </div>
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
                  {[
                    { label: 'Portfolio Value', value: totalPortfolioValue, prefix: '$', color: 'text-blue-400' },
                    { label: 'Unrealized P&L', value: totalUnrealizedPnL, prefix: '$', color: totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Realized P&L', value: totalPnL, prefix: '$', color: totalPnL >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Win Rate', value: winRate, prefix: '', suffix: '%', color: 'text-purple-400' }
                  ].map((stat, i) => (
                     <div key={i} className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</div>
                        <div className={`text-2xl font-mono font-bold ${stat.color}`}>
                           {stat.prefix}{Math.abs(stat.value).toFixed(2)}{stat.suffix}
                           {stat.value < 0 && stat.label.includes('P&L') && <span className="text-xs ml-1 text-red-400">(LOSS)</span>}
                        </div>
                     </div>
                  ))}
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
                      <p className="text-slate-400 font-mono">CHART_MODULE_LOADING...</p>
                      <p className="text-xs text-slate-600 mt-2">Not enough data points to generate curve.</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group">
                    <TrendingUp size={18} className="group-hover:scale-110 transition-transform" /> View Markets
                  </button>
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
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Active Positions</h2>
                </div>

                {openPositions.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {openPositions.map((position) => (
                      <div key={position.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex-1 mb-4 md:mb-0">
                          <h4 className="font-medium text-slate-200 mb-1">{position.market}</h4>
                          <div className="flex items-center gap-4 text-sm font-mono">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase border ${
                              position.type === 'YES' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {position.type}
                            </span>
                            <span className="text-slate-500">ENTRY: <span className="text-slate-300">${position.entryPrice.toFixed(2)}</span></span>
                            <span className="text-slate-500">MARK: <span className="text-slate-300">${position.currentPrice.toFixed(2)}</span></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold font-mono text-white mb-1">
                            ${position.amount.toFixed(2)}
                          </div>
                          <div className={`text-sm font-mono font-medium ${
                            position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {position.unrealizedPnL >= 0 ? '+' : ''}{position.unrealizedPnL} P&L
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-1">No Active Positions</h3>
                    <p className="text-slate-500 text-sm">Execute trades on the terminal to populate this view.</p>
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
                      <div className={`text-xl font-mono font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                         ${Math.abs(totalPnL)}
                      </div>
                   </div>
                </div>

                {/* Table */}
                <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Order History</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-mono uppercase text-slate-500">Market</th>
                          <th className="px-6 py-3 text-left text-xs font-mono uppercase text-slate-500">Side</th>
                          <th className="px-6 py-3 text-left text-xs font-mono uppercase text-slate-500">Size</th>
                          <th className="px-6 py-3 text-left text-xs font-mono uppercase text-slate-500">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-mono uppercase text-slate-500">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-mono uppercase text-slate-500">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-mono uppercase text-slate-500">P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {tradingHistory.map((trade) => (
                          <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                              <div className="max-w-xs truncate text-sm text-slate-300 font-medium">
                                {trade.market}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                                trade.type === 'YES'
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-300">
                              ${trade.amount}
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-300">
                              ${trade.price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-500">
                              {formatDate(trade.timestamp)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                                trade.status === 'won'
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                  : trade.status === 'lost'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              }`}>
                                {trade.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {trade.pnl !== undefined && (
                                <span className={`text-sm font-mono font-bold ${
                                  trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {tradingHistory.length === 0 && (
                    <div className="text-center py-16">
                      <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-1">No History</h3>
                      <p className="text-slate-500 text-sm">Past transactions will be archived here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
