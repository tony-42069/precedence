'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import { useWallet } from '../hooks/useWallet';
import { TradingModal } from '../components/TradingModal';

// Brand colors from our design system
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
  question?: string;  // Gamma API uses 'question' for the market title
  description?: string;
  volume?: number;
  closed?: boolean;
  active?: boolean;
  tags?: string[];
  // Additional fields for display
  title?: string;
  probability?: number;
  endDate?: string;
}

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [tradingMarket, setTradingMarket] = useState<Market | null>(null);

  // Wallet functionality
  const { walletState, connectPhantom, connectMetaMask, disconnect, checkWalletAvailability } = useWallet();

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
            // Backend returns markets directly as an array
            setMarkets(Array.isArray(data) ? data : (data.markets || []));
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
  }, []);

  // Filter markets based on selected category
  const filteredMarkets = markets.filter(market => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'supreme-court') {
      return market.question?.toLowerCase().includes('supreme court') ||
             market.question?.toLowerCase().includes('scotus');
    }
    if (selectedCategory === 'regulatory') {
      return market.question?.toLowerCase().includes('sec') ||
             market.question?.toLowerCase().includes('fcc') ||
             market.question?.toLowerCase().includes('doj') ||
             market.question?.toLowerCase().includes('regulation');
    }
    if (selectedCategory === 'constitutional') {
      return market.question?.toLowerCase().includes('constitutional') ||
             market.question?.toLowerCase().includes('amendment');
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg mr-3">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">P</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Precedence
                </h1>
                <p className="text-xs text-slate-500">Legal Prediction Markets</p>
              </div>
            </div>

            {/* Status & Controls */}
            <div className="flex items-center space-x-4">
              {/* Wallet Connection */}
              {!walletState.connected ? (
                <div className="flex items-center space-x-2">
                  {checkWalletAvailability().hasPhantom && (
                    <button
                      onClick={connectPhantom}
                      disabled={walletState.connecting}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                      <span>🖼️</span>
                      <span>{walletState.connecting ? 'Connecting...' : 'Phantom'}</span>
                    </button>
                  )}
                  {checkWalletAvailability().hasMetaMask && (
                    <button
                      onClick={connectMetaMask}
                      disabled={walletState.connecting}
                      className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                      <span>🦊</span>
                      <span>{walletState.connecting ? 'Connecting...' : 'MetaMask'}</span>
                    </button>
                  )}
                  {!checkWalletAvailability().hasPhantom && !checkWalletAvailability().hasMetaMask && (
                    <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg max-w-xs">
                      <div className="text-sm text-yellow-800 font-medium mb-1">Wallets Required</div>
                      <div className="text-xs text-yellow-700">
                        Install <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-900">Phantom</a> or{' '}
                        <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-900">MetaMask</a> to trade
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  {/* Wallet Status */}
                  <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        walletState.network === 'solana' ? 'bg-purple-500' : 'bg-orange-500'
                      }`}></div>
                      <div className="text-sm">
                        <div className="font-medium text-green-800">
                          {walletState.network === 'solana' ? 'Phantom' : 'MetaMask'}
                        </div>
                        <div className="text-green-600 text-xs">
                          {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  {walletState.balance && (
                    <div className="bg-slate-50 px-3 py-2 rounded-lg">
                      <div className="text-sm font-medium text-slate-700">
                        {walletState.balance} {walletState.network === 'solana' ? 'SOL' : 'ETH'}
                      </div>
                    </div>
                  )}

                  {/* Disconnect */}
                  <button
                    onClick={disconnect}
                    className="text-slate-500 hover:text-slate-700 text-sm underline"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Backend Status */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-full">
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online' ? 'bg-green-500' :
                  backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm font-medium text-slate-700">
                  {backendStatus === 'checking' ? 'Connecting...' :
                   backendStatus === 'online' ? 'Live' : 'Offline'}
                </span>
              </div>

              {/* Market Count */}
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-blue-700">
                  {filteredMarkets.length} Markets
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Dashboard */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Predict Legal
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Outcomes
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              Trade on Supreme Court decisions, regulatory rulings, and high-profile legal cases
              with AI-powered market intelligence.
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-yellow-400 mb-2">$2.4M</div>
                <div className="text-slate-300">24h Volume</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-green-400 mb-2">{markets.length}</div>
                <div className="text-slate-300">Active Markets</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-blue-400 mb-2">AI</div>
                <div className="text-slate-300">Powered</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-purple-400 mb-2">24/7</div>
                <div className="text-slate-300">Trading</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
              }`}
            >
              All Markets
            </button>
            <button
              onClick={() => setSelectedCategory('supreme-court')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'supreme-court'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
              }`}
            >
              🏛️ Supreme Court
            </button>
            <button
              onClick={() => setSelectedCategory('regulatory')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'regulatory'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
              }`}
            >
              ⚖️ Regulatory
            </button>
            <button
              onClick={() => setSelectedCategory('constitutional')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'constitutional'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
              }`}
            >
              📜 Constitutional
            </button>
          </div>
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-slate-600">Loading legal markets...</p>
              <p className="text-sm text-slate-500 mt-2">Fetching data from Polymarket</p>
            </div>
          </div>
        ) : filteredMarkets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMarkets.map((market, index) => (
              <div key={market.id || index} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="p-6">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      market.closed
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {market.closed ? 'Closed' : 'Active'}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        ${Number(market.volume || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </div>
                      <div className="text-xs text-slate-500">Volume</div>
                    </div>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 leading-tight">
                    {market.question || 'Market Question'}
                  </h3>

                  {/* Description */}
                  {market.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {market.description}
                    </p>
                  )}

                  {/* Tags */}
                  {market.tags && market.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {market.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span key={tagIndex} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
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
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    >
                      Buy YES
                    </button>
                    <button
                      onClick={() => {
                        setTradingMarket(market);
                        setShowTradingModal(true);
                      }}
                      disabled={!walletState.connected}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    >
                      Buy NO
                    </button>
                  </div>

                  {/* View Market Button */}
                  <button
                    onClick={() => {
                      setSelectedMarket(market);
                      setShowMarketModal(true);
                    }}
                    className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>

                {/* Bottom accent */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚖️</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No markets found</h3>
            <p className="text-slate-600 mb-4">
              {backendStatus === 'offline'
                ? 'Backend server is offline. Please start the server to load markets.'
                : `No markets found in the "${selectedCategory}" category.`
              }
            </p>
            {backendStatus === 'offline' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-yellow-800 text-sm">
                  Run: <code className="bg-yellow-100 px-2 py-1 rounded">python -m uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000</code>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-16 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Platform Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{markets.length}</div>
              <div className="text-sm text-slate-600">Legal Markets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                ${(markets.reduce((sum, m) => sum + (m.volume || 0), 0) / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-slate-600">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">24/7</div>
              <div className="text-sm text-slate-600">Trading Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">AI</div>
              <div className="text-sm text-slate-600">Enhanced</div>
            </div>
          </div>
        </div>
      </main>

      {/* Market Details Modal */}
      {showMarketModal && selectedMarket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedMarket.closed
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedMarket.closed ? 'Closed' : 'Active'}
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">
                      ${Number(selectedMarket.volume || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </div>
                    <div className="text-sm text-slate-500">Trading Volume</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowMarketModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Market Question */}
              <h2 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">
                {selectedMarket.question || 'Market Question'}
              </h2>

              {/* Full Description */}
              {selectedMarket.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
                  <p className="text-slate-700 leading-relaxed">
                    {selectedMarket.description}
                  </p>
                </div>
              )}

              {/* Market Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Market Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span className={`font-medium ${selectedMarket.closed ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedMarket.closed ? 'Closed' : 'Active'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Volume:</span>
                      <span className="font-medium">
                        ${Number(selectedMarket.volume || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Platform:</span>
                      <span className="font-medium text-blue-600">Polymarket</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Market ID</h3>
                  <code className="bg-slate-100 px-3 py-2 rounded text-sm font-mono text-slate-800 break-all">
                    {selectedMarket.id || 'N/A'}
                  </code>
                </div>
              </div>

              {/* Tags */}
              {selectedMarket.tags && selectedMarket.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMarket.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md">
                  Trade on Polymarket
                </button>
                <button
                  onClick={() => setShowMarketModal(false)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
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
