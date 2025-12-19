'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PricePoint {
  t: number;
  p: number;
}

interface PriceChartProps {
  data: PricePoint[];
  currentPrice: number;
}

export default function PriceChart({ data, currentPrice }: PriceChartProps) {
  // Transform data for Recharts
  const chartData = useMemo(() => {
    return data.map(point => ({
      time: point.t * 1000, // Convert to milliseconds
      price: point.p,
      // Format time for display
      timeLabel: new Date(point.t * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));
  }, [data]);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percent: 0, isPositive: true };

    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentChange = firstPrice > 0 ? (change / firstPrice) * 100 : 0;

    return {
      value: change,
      percent: percentChange,
      isPositive: change >= 0
    };
  }, [chartData]);

  // Determine color based on price trend
  const isPositive = priceChange.isPositive;
  const strokeColor = isPositive ? '#10B981' : '#EF4444';
  const gradientId = `priceGradient-${isPositive ? 'up' : 'down'}`;

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white/5 rounded-lg border border-dashed border-gray-700">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No price history available</p>
          <p className="text-sm text-gray-600 mt-1">Price data will appear once trading begins</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Price Change Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold font-mono text-white">
            {(currentPrice * 100).toFixed(1)}%
          </span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
            isPositive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {chartData.length} data points
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timeLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              domain={[0, 1]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E1E24',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
              }}
              formatter={(value) => [`${((value as number) * 100).toFixed(2)}%`, 'YES Price']}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Price Range */}
      <div className="mt-4 flex justify-between text-sm text-gray-500 font-mono">
        <span>Low: {(Math.min(...data.map(d => d.p)) * 100).toFixed(1)}%</span>
        <span>High: {(Math.max(...data.map(d => d.p)) * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
