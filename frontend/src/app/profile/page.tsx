'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';

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

  const totalTrades = tradingHistory.length;
  const winningTrades = tradingHistory.filter(t => t.status === 'won').length;
  const totalPnL = tradingHistory.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile Menu Button */}
      <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Navigation Header */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div></div>

              {/* Status & Controls */}
              <div className="flex items-center space-x-4">
                {/* Backend Status */}
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-700">Profile</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Profile & Settings</h1>
            <p className="text-slate-600">Manage your account, trading history, and preferences</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-8">
            <div className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              {/* Profile Overview */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Profile Overview</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Avatar & Basic Info */}
                  <div>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {walletState.address ? walletState.address.slice(0, 2).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {walletState.connected ? 'Connected Trader' : 'Anonymous User'}
                        </h3>
                        <p className="text-slate-600">
                          {walletState.address
                            ? `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`
                            : 'Not connected'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Wallet Status */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-medium text-slate-900 mb-2">Wallet Status</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          walletState.connected ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm text-slate-700">
                          {walletState.connected
                            ? `${walletState.network?.toUpperCase()} Connected`
                            : 'Not Connected'
                          }
                        </span>
                      </div>
                      {walletState.balance && (
                        <p className="text-sm text-slate-600">
                          Balance: {walletState.balance} {walletState.network === 'solana' ? 'SOL' : 'ETH'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Trading Stats */}
                  <div>
                    <h4 className="font-medium text-slate-900 mb-4">Trading Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">{totalTrades}</div>
                        <div className="text-sm text-blue-700">Total Trades</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">{winRate}%</div>
                        <div className="text-sm text-green-700">Win Rate</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-600">{winningTrades}</div>
                        <div className="text-sm text-purple-700">Wins</div>
                      </div>
                      <div className={`rounded-lg p-4 ${
                        totalPnL >= 0 ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${Math.abs(totalPnL)}
                        </div>
                        <div className={`text-sm ${
                          totalPnL >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {totalPnL >= 0 ? 'Profit' : 'Loss'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Account Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {walletState.connected ? (
                    <button
                      onClick={disconnect}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Disconnect Wallet
                    </button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 px-6 py-3 rounded-lg">
                      <p className="text-yellow-800 text-sm font-medium">Connect Wallet to Trade</p>
                      <p className="text-yellow-700 text-xs mt-1">Phantom or MetaMask required</p>
                    </div>
                  )}
                  <button className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Trading Preferences */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Trading Preferences</h2>

                <div className="space-y-6">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Enable AI-powered trade suggestions</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="text-sm text-slate-700">Show market probability changes</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="text-sm text-slate-700">Display volume in market cards</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Auto-refresh market data</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Notifications</h2>

                <div className="space-y-6">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="text-sm text-slate-700">Market price alerts</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">AI prediction updates</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Trade settlement notifications</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Weekly performance reports</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* API Keys (Advanced) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">API Access</h2>
                <p className="text-slate-600 mb-4">
                  For advanced users and developers. Access Precedence data programmatically.
                </p>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">API Key</h4>
                      <p className="text-sm text-slate-600">Generate a key to access our REST API</p>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Generate Key
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Settings */}
              <div className="flex justify-end">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
