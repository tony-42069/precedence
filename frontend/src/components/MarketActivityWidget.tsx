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
    <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:border-blue-500/30 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        {/* Animated glow line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <h3 className="text-lg font-semibold text-white font-mono">
          <span className="text-green-400">[LIVE]</span> MARKET_ACTIVITY
        </h3>
        <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] animate-pulse"></div>
          <span className="text-xs font-mono text-green-400 uppercase tracking-widest">
            SYNCED
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-200 group/item">
            <div className="text-lg group-hover/item:scale-110 transition-transform duration-200">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 leading-tight font-medium">
                {activity.description}
              </p>
              <div className="flex items-center justify-between mt-1">
                {activity.amount && (
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {activity.amount}
                  </span>
                )}
                <span className="text-xs font-mono text-slate-500 uppercase">
                  {activity.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <button className="w-full text-sm font-mono text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center group hover:scale-105 transform duration-200">
          <span className="group-hover:mr-1 transition-all duration-200">VIEW_ALL_ACTIVITY</span>
          <span className="font-bold">{'>'}</span>
        </button>
      </div>
    </div>
  );
}
