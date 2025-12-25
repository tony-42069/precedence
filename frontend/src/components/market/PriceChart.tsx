'use client';

import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PricePoint {
  t: number;
  p: number;
}

interface MultiOutcomeData {
  outcomeName: string;
  color: string;
  data: PricePoint[];
  currentPrice: number;
}

interface PriceChartProps {
  data: PricePoint[];
  currentPrice: number;
  multiOutcomeData?: MultiOutcomeData[];
}

export default function PriceChart({ data, currentPrice, multiOutcomeData }: PriceChartProps) {
  // Check if we have multi-outcome data
  const isMultiOutcome = multiOutcomeData && multiOutcomeData.length > 0;

  // Transform data for Recharts (binary market - includes both YES and NO)
  const chartData = useMemo(() => {
    return data.map(point => ({
      time: point.t * 1000, // Convert to milliseconds
      price: point.p,
      yesPrice: point.p,
      noPrice: 1 - point.p, // NO is inverse of YES
      // Format time for display
      timeLabel: new Date(point.t * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));
  }, [data]);

  // Transform multi-outcome data for combined chart
  const multiChartData = useMemo(() => {
    if (!multiOutcomeData || multiOutcomeData.length === 0) return [];

    // Get all unique timestamps across all outcomes
    const allTimestamps = new Set<number>();
    multiOutcomeData.forEach(outcome => {
      outcome.data.forEach(point => allTimestamps.add(point.t));
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Create data points with all outcome prices at each timestamp
    return sortedTimestamps.map(timestamp => {
      const dataPoint: Record<string, any> = {
        time: timestamp * 1000,
        timeLabel: new Date(timestamp * 1000).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      multiOutcomeData.forEach(outcome => {
        // Find closest data point for this outcome
        const point = outcome.data.find(p => p.t === timestamp);
        dataPoint[outcome.outcomeName] = point?.p ?? null;
      });

      return dataPoint;
    });
  }, [multiOutcomeData]);

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

  // Calculate dynamic Y-axis domain based on data range
  const yAxisDomain = useMemo(() => {
    // For binary markets showing YES/NO, always use full 0-1 range
    if (!isMultiOutcome) {
      return [0, 1];
    }

    // For multi-outcome markets, calculate dynamic range
    let prices: number[] = [];
    if (multiOutcomeData) {
      multiOutcomeData.forEach(outcome => {
        outcome.data.forEach(point => prices.push(point.p));
      });
    }

    if (prices.length === 0) return [0, 1];

    const dataMin = Math.min(...prices);
    const dataMax = Math.max(...prices);
    const range = dataMax - dataMin;

    // Add 15% padding on each side
    let padding = range * 0.15;

    // Ensure minimum range of 10% for readability when range is very tight
    if (range < 0.1) {
      padding = Math.max(padding, 0.05);
    }

    const yMin = Math.max(0, dataMin - padding);
    const yMax = Math.min(1, dataMax + padding);

    // Round to nice values for cleaner tick marks
    const roundedMin = Math.floor(yMin * 20) / 20; // Round down to nearest 5%
    const roundedMax = Math.ceil(yMax * 20) / 20;  // Round up to nearest 5%

    return [Math.max(0, roundedMin), Math.min(1, roundedMax)];
  }, [chartData, isMultiOutcome, multiOutcomeData]);

  // Determine color based on price trend
  const isPositive = priceChange.isPositive;
  const strokeColor = isPositive ? '#10B981' : '#EF4444';
  const gradientId = `priceGradient-${isPositive ? 'up' : 'down'}`;

  // Check if we have any data to display
  const hasData = isMultiOutcome
    ? multiChartData.length > 0
    : chartData.length > 0;

  if (!hasData) {
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

  // Multi-outcome chart rendering
  if (isMultiOutcome && multiOutcomeData && multiChartData.length > 0) {
    return (
      <div>
        {/* Multi-Outcome Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {multiOutcomeData.map((outcome) => (
            <div key={outcome.outcomeName} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: outcome.color }}
              />
              <span className="text-sm text-gray-300">
                {outcome.outcomeName}
              </span>
              <span className="text-sm font-mono" style={{ color: outcome.color }}>
                {(outcome.currentPrice * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        {/* Multi-Line Chart */}
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={multiChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="timeLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                domain={yAxisDomain}
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
                formatter={(value, name) => [
                  `${((value as number) * 100).toFixed(2)}%`,
                  name
                ]}
                labelFormatter={(label) => label}
              />
              {multiOutcomeData.map((outcome) => (
                <Line
                  key={outcome.outcomeName}
                  type="monotone"
                  dataKey={outcome.outcomeName}
                  stroke={outcome.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  animationDuration={1000}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Prices Summary */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {multiOutcomeData.map((outcome) => (
            <div
              key={outcome.outcomeName}
              className="flex justify-between items-center text-sm px-2 py-1 rounded bg-white/5"
            >
              <span className="text-gray-400 truncate">{outcome.outcomeName}</span>
              <span className="font-mono" style={{ color: outcome.color }}>
                {(outcome.currentPrice * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Binary market chart rendering - shows both YES and NO lines
  return (
    <div>
      {/* Legend showing YES and NO with current prices */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-300">YES</span>
            <span className="text-sm font-mono text-green-400 font-bold">
              {(currentPrice * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-300">NO</span>
            <span className="text-sm font-mono text-red-400 font-bold">
              {((1 - currentPrice) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            isPositive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Chart with both YES and NO lines */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="timeLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              domain={yAxisDomain}
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
              formatter={(value, name) => {
                const label = name === 'yesPrice' ? 'YES' : 'NO';
                const color = name === 'yesPrice' ? '#10B981' : '#EF4444';
                return [
                  `${((value as number) * 100).toFixed(2)}%`,
                  label
                ];
              }}
              labelFormatter={(label) => label}
            />
            {/* YES Line - Green */}
            <Line
              type="monotone"
              dataKey="yesPrice"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              animationDuration={1000}
            />
            {/* NO Line - Red */}
            <Line
              type="monotone"
              dataKey="noPrice"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Price Range for YES */}
      {data.length > 0 && (
        <div className="mt-4 flex justify-between text-sm text-gray-500 font-mono">
          <span>YES Low: {(Math.min(...data.map(d => d.p)) * 100).toFixed(1)}%</span>
          <span>YES High: {(Math.max(...data.map(d => d.p)) * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
