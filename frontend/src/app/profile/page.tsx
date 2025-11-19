'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { 
  User, 
  Settings, 
  Shield, 
  Key, 
  LogOut, 
  Download, 
  Bell, 
  Activity,
  Terminal,
  Wallet
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

export default function ProfilePage() {
  const pathname = usePathname();
  const { walletState, disconnect } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  // Mock trading history data (for stats)
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

  const totalTrades = tradingHistory.length;
  const winningTrades = tradingHistory.filter(t => t.status === 'won').length;
  const totalPnL = tradingHistory.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      
      {/* --- BACKGROUND FX --- */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
          <div className="absolute bottom-[0%] right-[0%] w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full" />
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
                    <span className="text-blue-400 uppercase">IDENTITY_CONFIG</span>
                </div>

                {/* Status & Controls */}
                <div className="flex items-center space-x-4 ml-auto">
                  <div className="flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">User Profile</span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Identity</h1>
              <p className="text-slate-400">Manage account parameters and system preferences.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl w-full max-w-md mb-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'profile'
                    ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User size={16} /> Profile
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Settings size={16} /> Settings
              </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* Profile Overview */}
                <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8 relative overflow-hidden">
                  {/* Top Glow Line */}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                  
                  <h2 className="text-lg font-semibold text-white mb-6">User Overview</h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Avatar & Basic Info */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                      <div className="flex items-center space-x-6 mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-white/10">
                          <span className="text-white text-3xl font-bold font-mono">
                            {walletState.address ? walletState.address.slice(0, 2).toUpperCase() : 'AN'}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white font-mono mb-1">
                            {walletState.connected ? 'CONNECTED_TRADER' : 'ANONYMOUS_USER'}
                          </h3>
                          <p className="text-slate-500 font-mono text-sm bg-black/30 px-2 py-1 rounded inline-block border border-white/5">
                            {walletState.address
                              ? `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`
                              : 'NO_UPLINK'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Wallet Status */}
                      <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-400">Connection Status</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${walletState.connected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
                            <span className={`text-xs font-bold uppercase ${walletState.connected ? 'text-green-400' : 'text-red-400'}`}>
                                {walletState.connected ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-sm text-slate-400">Network</span>
                           <span className="text-xs font-mono text-slate-200 uppercase">{walletState.network || 'N/A'}</span>
                        </div>
                        {walletState.balance && (
                           <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                              <span className="text-sm text-slate-400">Balance</span>
                              <span className="text-sm font-mono text-white">{walletState.balance} ETH</span>
                           </div>
                        )}
                      </div>
                    </div>

                    {/* Trading Stats */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                      <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <Activity size={16} /> Performance Metrics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <div className="text-2xl font-bold font-mono text-blue-400">{totalTrades}</div>
                          <div className="text-xs text-slate-400 uppercase">Total Trades</div>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                          <div className="text-2xl font-bold font-mono text-green-400">{winRate}%</div>
                          <div className="text-xs text-slate-400 uppercase">Win Rate</div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                          <div className="text-2xl font-bold font-mono text-purple-400">{winningTrades}</div>
                          <div className="text-xs text-slate-400 uppercase">Total Wins</div>
                        </div>
                        <div className={`rounded-lg p-4 border ${
                          totalPnL >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                        }`}>
                          <div className={`text-2xl font-bold font-mono ${
                            totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            ${Math.abs(totalPnL)}
                          </div>
                          <div className="text-xs text-slate-400 uppercase">Net P&L</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                  <h2 className="text-lg font-semibold text-white mb-6">Session Controls</h2>
                  <div className="flex gap-4">
                    {walletState.connected ? (
                      <button
                        onClick={disconnect}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <LogOut size={18} /> Terminate Session
                      </button>
                    ) : (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 px-6 py-3 rounded-lg flex items-center gap-3">
                        <Shield size={18} className="text-yellow-500" />
                        <div>
                           <p className="text-yellow-500 text-sm font-bold">RESTRICTED ACCESS</p>
                           <p className="text-yellow-600/80 text-xs">Wallet connection required for full functionality.</p>
                        </div>
                      </div>
                    )}
                    <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                      <Download size={18} /> Export History
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Trading Preferences */}
                <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                     <Activity size={18} /> Trading Configuration
                  </h2>

                  <div className="space-y-6">
                    {[
                       "Enable AI-powered trade suggestions", 
                       "Show market probability heatmaps", 
                       "Display real-time order book depth", 
                       "Auto-refresh market data (WebSockets)"
                    ].map((setting, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                          <span className="text-sm text-slate-300">{setting}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                             <input type="checkbox" defaultChecked={i < 3} className="sr-only peer" />
                             <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                       </div>
                    ))}
                  </div>
                </div>

                {/* Notification Preferences */}
                <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                     <Bell size={18} /> Notification Uplink
                  </h2>

                  <div className="space-y-6">
                     {[
                       "Price volatility alerts (>5%)", 
                       "AI prediction confidence updates", 
                       "Trade settlement confirmations", 
                       "System maintenance notices"
                    ].map((setting, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                          <span className="text-sm text-slate-300">{setting}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                             <input type="checkbox" defaultChecked={i === 0} className="sr-only peer" />
                             <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                       </div>
                    ))}
                  </div>
                </div>

                {/* API Keys */}
                <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                     <Key size={18} /> Developer Access
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Generate programmatic access keys for the Precedence REST API.
                  </p>

                  <div className="bg-black/30 rounded-lg p-6 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white font-mono">API_KEY_V1</h4>
                        <p className="text-xs text-slate-500 mt-1">Status: INACTIVE</p>
                      </div>
                      <button className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Generate Key
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Settings */}
                <div className="flex justify-end">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                    Save Configuration
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}