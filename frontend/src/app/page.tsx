'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

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
  market?: string;  // Polymarket uses 'market' for title
  description?: string;
  volume?: number;
  closed?: boolean;
  active?: boolean;
  // Additional fields for display
  title?: string;
  probability?: number;
  endDate?: string;
}

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Test backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        if (response.ok) {
          setBackendStatus('online');
          // Fetch markets
          const marketsResponse = await fetch('http://localhost:8000/api/markets');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image
                src="/precedence-logo.png"
                alt="Precedence"
                width={32}
                height={32}
                className="mr-3"
              />
              <h1 className="text-xl font-bold text-gray-900">Precedence</h1>
            </div>

            {/* Backend Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                backendStatus === 'online' ? 'bg-green-500' :
                backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                Backend: {backendStatus === 'checking' ? 'Checking...' :
                         backendStatus === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Predict Legal Outcomes.<br />
            <span style={{ background: `linear-gradient(135deg, ${colors.royalBlue}, ${colors.deepPurple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Trade With Confidence.
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            The world's first AI-powered prediction market for high-profile legal cases.
            Get machine learning insights on Supreme Court decisions, major trials, and regulatory battles.
          </p>

          {/* Backend Connection Status */}
          {backendStatus === 'offline' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-yellow-800 text-sm">
                ⚠️ Backend server not detected. Make sure to run: <code className="bg-yellow-100 px-2 py-1 rounded">cd backend && python -m uvicorn api.main:app --reload</code>
              </p>
            </div>
          )}
        </div>

        {/* Markets Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Markets</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading markets...</p>
            </div>
          ) : markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market, index) => (
                <div key={market.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-2">{market.market || 'Market Title'}</h3>
                  <p className="text-sm text-gray-600 mb-3">{market.description || 'Market description'}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      market.closed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {market.closed ? 'Closed' : 'Active'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Volume: ${market.volume?.toLocaleString() || '0'}</span>
                    <span>Polymarket</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No markets available</p>
              {backendStatus === 'offline' && (
                <p className="text-sm text-gray-500">
                  Start the backend server to load real market data
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">$39M+</div>
            <div className="text-gray-600">Daily Volume</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">2TB+</div>
            <div className="text-gray-600">Legal Data</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">10K+</div>
            <div className="text-gray-600">Active Markets</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-2">AI</div>
            <div className="text-gray-600">Powered</div>
          </div>
        </div>
      </main>
    </div>
  );
}
