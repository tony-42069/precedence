const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ActivityItem {
  id: string;
  type: 'trade' | 'market_created' | 'prediction' | 'high_volume' | 'price_alert';
  description: string;
  amount?: string;
  time: string;
  icon: string;
  marketQuestion?: string;
  marketId?: string;
}

export function MarketActivityWidget() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'high_volume': return '🐋';
      case 'price_alert': return '🚨';
      case 'trade': return '💰';
      case 'market_created': return '📈';
      case 'prediction': return '🤖';
      default: return '📊';
    }
  };

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.marketId) {
      router.push(`/markets?highlight=${activity.marketId}`);
    }
  };

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch('http://${API_URL}/api/markets/activity?limit=5');
        if (response.ok) {
          const data = await response.json();
          const activityData = data.activity || [];

          const formattedActivities: ActivityItem[] = activityData.map((item: any, index: number) => ({
            id: item.market_id + item.timestamp + index,
            type: item.type || 'trade',
            description: item.description || 'Market activity',
            marketQuestion: item.market_question,
            marketId: item.market_id,
            amount: item.amount,
            time: item.timestamp || 'Live',
            icon: getIconForType(item.type || 'trade')
          }));

          setActivities(formattedActivities);
        } else {
          console.error('Failed to fetch market activity');
          // Fallback to minimal activity
          setActivities([{
            id: 'fallback',
            type: 'trade',
            description: 'Connecting to live market data...',
            time: 'Now',
            icon: '🔄'
          }]);
        }
      } catch (error) {
        console.error('Error fetching market activity:', error);
        setActivities([{
          id: 'error',
          type: 'trade',
          description: 'Unable to load market activity',
          time: 'Now',
          icon: '❌'
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
    // Refresh every 5 minutes
    const interval = setInterval(fetchActivity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
          <div
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className={`flex items-start space-x-3 p-3 rounded-lg border border-white/5 bg-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 group/item cursor-pointer relative ${
              activity.marketId ? 'hover:shadow-[0_0_10px_rgba(37,99,235,0.2)]' : ''
            }`}
          >
            <div className="text-lg group-hover/item:scale-110 transition-transform duration-200">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              {activity.marketQuestion && (
                <p className="text-sm font-semibold text-blue-300 leading-tight mb-1 truncate group-hover/item:text-blue-200">
                  {activity.marketQuestion}
                </p>
              )}
              <p className="text-sm text-slate-200 leading-tight font-medium group-hover/item:text-white">
                {activity.description}
              </p>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-4">
                  {activity.amount && (
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {activity.amount}
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-500 uppercase">
                    {activity.time}
                  </span>
                </div>
                {/* Navigation arrow - only show if clickable */}
                {activity.marketId && (
                  <div className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                    <span className="text-blue-400 text-sm font-bold">→</span>
                  </div>
                )}
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
