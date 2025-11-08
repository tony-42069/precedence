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
                  <span className="text-sm font-medium text-slate-700">Portfolio</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Portfolio</h1>
            <p className="text-slate-600">Track your positions, performance, and trading history</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-8">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('positions')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'positions'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Positions
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                History
              </button>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Portfolio Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      ${totalPortfolioValue.toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-600">Portfolio Value</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-2 ${
                      totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(totalUnrealizedPnL).toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-600">Unrealized P&L</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-2 ${
                      totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(totalPnL).toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-600">Realized P&L</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-2">{winRate}%</div>
                    <div className="text-sm text-slate-600">Win Rate</div>
                  </div>
                </div>
              </div>

              {/* Performance Chart Placeholder */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Performance Chart</h2>
                <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📈</div>
                    <p className="text-slate-600">Performance chart coming soon</p>
                    <p className="text-sm text-slate-500 mt-2">Track your portfolio growth over time</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    View All Markets
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Deposit Funds
                  </button>
                  <button className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Export Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Positions Tab */}
          {activeTab === 'positions' && (
            <div className="space-y-8">
              {/* Open Positions Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Open Positions</h2>

                {openPositions.length > 0 ? (
                  <div className="space-y-4">
                    {openPositions.map((position) => (
                      <div key={position.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 mb-1">{position.market}</h4>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              position.type === 'YES' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {position.type}
                            </span>
                            <span>Entry: ${(position.entryPrice * 100).toFixed(2)}¢</span>
                            <span>Current: ${(position.currentPrice * 100).toFixed(2)}¢</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-slate-900">
                            ${position.amount}
                          </div>
                          <div className={`text-sm font-medium ${
                            position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Open Positions</h3>
                    <p className="text-slate-600">Your active trades will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">{totalTrades}</div>
                    <div className="text-sm text-slate-600">Total Trades</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">{winRate}%</div>
                    <div className="text-sm text-slate-600">Win Rate</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-2 ${
                      totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(totalPnL)}
                    </div>
                    <div className="text-sm text-slate-600">Total P&L</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-2">
                      {tradingHistory.filter(t => t.status === 'pending').length}
                    </div>
                    <div className="text-sm text-slate-600">Pending</div>
                  </div>
                </div>
              </div>

              {/* Trading History Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Trading History</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-8 py-4 text-left text-sm font-medium text-slate-700">Market</th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-slate-700">Type</th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-slate-700">Amount</th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-slate-700">Price</th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-slate-700">Date</th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-slate-700">Status</th>
                        <th className="px-8 py-4 text-left text-sm font-medium text-slate-700">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tradingHistory.map((trade) => (
                        <tr key={trade.id} className="hover:bg-slate-50">
                          <td className="px-8 py-4">
                            <div className="max-w-xs truncate text-sm text-slate-900">
                              {trade.market}
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              trade.type === 'YES'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-sm text-slate-900">
                            ${trade.amount}
                          </td>
                          <td className="px-8 py-4 text-sm text-slate-900">
                            ${(trade.price * 100).toFixed(2)}¢
                          </td>
                          <td className="px-8 py-4 text-sm text-slate-600">
                            {formatDate(trade.timestamp)}
                          </td>
                          <td className="px-8 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              trade.status === 'won'
                                ? 'bg-green-100 text-green-800'
                                : trade.status === 'lost'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-8 py-4">
                            {trade.pnl !== undefined && (
                              <span className={`text-sm font-medium ${
                                trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {trade.pnl >= 0 ? '+' : ''}${trade.pnl}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {tradingHistory.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Trading History</h3>
                    <p className="text-slate-600">Your completed trades will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
