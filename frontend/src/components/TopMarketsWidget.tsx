import React from 'react';

interface TopMarket {
  id: string;
  title: string;
  volume: number;
  change: number;
  probability: number;
  category: string;
  trending: boolean;
}

export function TopMarketsWidget() {
  // Mock data - will be replaced with real API data
  const topMarkets: TopMarket[] = [
    {
      id: '1',
      title: 'Will SCOTUS overturn Roe v. Wade?',
      volume: 2450000,
      change: 12.5,
      probability: 68,
      category: 'Supreme Court',
      trending: true
    },
    {
      id: '2',
      title: 'Will EPA regulate crypto mining?',
      volume: 1890000,
      change: -3.2,
      probability: 42,
      category: 'Regulatory',
      trending: false
    },
    {
      id: '3',
      title: 'Will Congress pass climate bill?',
      volume: 1650000,
      change: 8.7,
      probability: 55,
      category: 'Legislative',
      trending: true
    },
    {
      id: '4',
      title: 'Will FTC sue Big Tech merger?',
      volume: 1420000,
      change: 15.3,
      probability: 73,
      category: 'Antitrust',
      trending: false
    },
    {
      id: '5',
      title: 'Will Supreme Court hear election case?',
      volume: 1280000,
      change: -5.1,
      probability: 38,
      category: 'Supreme Court',
      trending: false
    }
  ];

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Top Markets</h3>
        <span className="text-sm text-slate-600">By Volume</span>
      </div>

      <div className="space-y-4">
        {topMarkets.map((market, index) => (
          <div key={market.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-medium text-sm">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium text-slate-900 truncate">
                  {market.title}
                </h4>
                {market.trending && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    🔥
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-500">{market.category}</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${market.probability}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      {market.probability}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatVolume(market.volume)}
                  </div>
                  <div className={`text-xs font-medium ${
                    market.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {market.change >= 0 ? '+' : ''}{market.change}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Markets →
        </button>
      </div>
    </div>
  );
}
