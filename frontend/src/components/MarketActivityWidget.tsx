import React from 'react';

interface ActivityItem {
  id: string;
  type: 'trade' | 'market_created' | 'prediction';
  description: string;
  amount?: string;
  time: string;
  icon: string;
}

export function MarketActivityWidget() {
  // Mock data - will be replaced with real API data
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'trade',
      description: 'Large YES position taken on Supreme Court case',
      amount: '$12,450',
      time: '2 min ago',
      icon: '💰'
    },
    {
      id: '2',
      type: 'prediction',
      description: 'AI updated confidence on Regulatory Ruling',
      amount: '87% → 92%',
      time: '5 min ago',
      icon: '🤖'
    },
    {
      id: '3',
      type: 'market_created',
      description: 'New market created: "EPA Climate Policy"',
      time: '12 min ago',
      icon: '📈'
    },
    {
      id: '4',
      type: 'trade',
      description: 'NO position filled on Constitutional case',
      amount: '$8,320',
      time: '18 min ago',
      icon: '⚖️'
    },
    {
      id: '5',
      type: 'prediction',
      description: 'Judge analysis completed for SCOTUS case',
      time: '25 min ago',
      icon: '👨‍⚖️'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Market Activity</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-600">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="text-lg">{activity.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 leading-tight">
                {activity.description}
              </p>
              <div className="flex items-center justify-between mt-1">
                {activity.amount && (
                  <span className="text-xs font-medium text-blue-600">
                    {activity.amount}
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {activity.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Activity →
        </button>
      </div>
    </div>
  );
}
