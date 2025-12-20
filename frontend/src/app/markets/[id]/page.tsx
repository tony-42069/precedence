'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import chart to avoid SSR issues with recharts
const PriceChart = dynamic(() => import('@/components/market/PriceChart'), { ssr: false });
import OrderBook from '@/components/market/OrderBook';
import TradingPanel from '@/components/market/TradingPanel';
import MarketHeader from '@/components/market/MarketHeader';
import CommentsSection from '@/components/market/CommentsSection';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5003';

interface MarketOutcome {
  name: string;
  price: number;
  yes_price?: number;
  no_price?: number;
  market_id?: string;
  clobTokenIds?: string[];
  question?: string;
}

interface Market {
  id: string;
  question: string;
  description?: string;
  image?: string;
  icon?: string;
  current_yes_price: number;
  current_no_price: number;
  volume?: number;
  volume24hr?: number;
  end_date?: string;
  endDate?: string;
  slug?: string;
  clobTokenIds?: string[];
  is_binary?: boolean;
  num_outcomes?: number;
  outcomes?: MarketOutcome[];
}

interface MultiOutcomeChartData {
  outcomeName: string;
  color: string;
  data: PricePoint[];
  currentPrice: number;
}

interface PricePoint {
  t: number;  // timestamp
  p: number;  // price
}

interface OrderBookData {
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

interface OrderBooks {
  yes: OrderBookData;
  no: OrderBookData;
}

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = params.id as string;

  const [market, setMarket] = useState<Market | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [multiOutcomeData, setMultiOutcomeData] = useState<MultiOutcomeChartData[]>([]);
  const [orderBooks, setOrderBooks] = useState<OrderBooks>({
    yes: { bids: [], asks: [] },
    no: { bids: [], asks: [] }
  });
  const [currentPrice, setCurrentPrice] = useState<number>(0.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('1d');
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<MarketOutcome | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Chart colors for multi-outcome markets (top 4)
  const OUTCOME_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  // Check if this is a multi-outcome market
  const isMultiOutcome = market?.outcomes && market.outcomes.length > 2;

  // Fetch market data
  useEffect(() => {
    async function fetchMarket() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/markets/${marketId}`);

        if (!res.ok) {
          throw new Error('Market not found');
        }

        const data = await res.json();
        setMarket(data);
        setCurrentPrice(data.current_yes_price || 0.5);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch market:', err);
        setError(err instanceof Error ? err.message : 'Failed to load market');
      } finally {
        setLoading(false);
      }
    }

    if (marketId) {
      fetchMarket();
    }
  }, [marketId]);

  // Fetch price history when market loads or interval changes
  useEffect(() => {
    async function fetchPriceHistory() {
      if (!market) return;

      // For multi-outcome markets, fetch price history for top 4 outcomes
      if (isMultiOutcome && market.outcomes && market.outcomes.length > 2) {
        const sortedOutcomes = [...market.outcomes].sort((a, b) =>
          (b.price || b.yes_price || 0) - (a.price || a.yes_price || 0)
        );
        const top4 = sortedOutcomes.slice(0, 4);

        try {
          const multiData = await Promise.all(
            top4.map(async (outcome, index) => {
              // Try to fetch price history for this outcome
              const tokenId = outcome.clobTokenIds?.[0] || outcome.market_id;
              if (!tokenId) {
                // If no token ID, return empty data with current price
                return {
                  outcomeName: outcome.name,
                  color: OUTCOME_COLORS[index],
                  data: [],
                  currentPrice: outcome.price || outcome.yes_price || 0
                };
              }

              try {
                const res = await fetch(
                  `${API_URL}/api/markets/${tokenId}/prices?interval=${selectedInterval}`
                );
                if (res.ok) {
                  const data = await res.json();
                  return {
                    outcomeName: outcome.name,
                    color: OUTCOME_COLORS[index],
                    data: data.history || [],
                    currentPrice: outcome.price || outcome.yes_price || 0
                  };
                }
              } catch (err) {
                console.error(`Failed to fetch history for ${outcome.name}:`, err);
              }

              return {
                outcomeName: outcome.name,
                color: OUTCOME_COLORS[index],
                data: [],
                currentPrice: outcome.price || outcome.yes_price || 0
              };
            })
          );

          setMultiOutcomeData(multiData);
        } catch (err) {
          console.error('Failed to fetch multi-outcome price history:', err);
        }
      } else {
        // Binary market - fetch single price history
        try {
          const res = await fetch(
            `${API_URL}/api/markets/${marketId}/prices?interval=${selectedInterval}`
          );

          if (res.ok) {
            const data = await res.json();
            setPriceHistory(data.history || []);
          }
        } catch (err) {
          console.error('Failed to fetch price history:', err);
        }
      }
    }

    fetchPriceHistory();
  }, [market, marketId, selectedInterval, isMultiOutcome, OUTCOME_COLORS]);

  // Fetch order books for both YES and NO tokens
  useEffect(() => {
    async function fetchOrderBooks() {
      if (!market?.clobTokenIds || market.clobTokenIds.length < 2) {
        // Fallback: fetch single order book if no token IDs
        try {
          const res = await fetch(`${API_URL}/api/markets/${marketId}/orderbook`);
          if (res.ok) {
            const data = await res.json();
            setOrderBooks({
              yes: { bids: data.bids || [], asks: data.asks || [] },
              no: { bids: [], asks: [] }
            });
          }
        } catch (err) {
          console.error('Failed to fetch order book:', err);
        }
        return;
      }

      const yesTokenId = market.clobTokenIds[0];
      const noTokenId = market.clobTokenIds[1];

      try {
        // Fetch both order books in parallel
        const [yesRes, noRes] = await Promise.all([
          fetch(`https://clob.polymarket.com/book?token_id=${yesTokenId}`),
          fetch(`https://clob.polymarket.com/book?token_id=${noTokenId}`)
        ]);

        const yesData = yesRes.ok ? await yesRes.json() : { bids: [], asks: [] };
        const noData = noRes.ok ? await noRes.json() : { bids: [], asks: [] };

        setOrderBooks({
          yes: { bids: yesData.bids || [], asks: yesData.asks || [] },
          no: { bids: noData.bids || [], asks: noData.asks || [] }
        });

        console.log('Order books loaded - YES:', yesData.bids?.length || 0, 'bids, NO:', noData.bids?.length || 0, 'bids');
      } catch (err) {
        console.error('Failed to fetch order books:', err);
      }
    }

    // Fetch immediately
    fetchOrderBooks();

    // Refresh every 30 seconds if WebSocket isn't connected
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchOrderBooks();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [market, marketId, wsConnected]);

  // Connect to WebSocket for live updates
  useEffect(() => {
    if (!market?.clobTokenIds?.[0]) return;

    const tokenId = market.clobTokenIds[0]; // YES token

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);

        // Subscribe to market updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          marketId: tokenId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastUpdate(new Date());

          if (data.type === 'price_change') {
            const newPrice = parseFloat(data.payload?.newPrice || data.payload?.price);
            if (!isNaN(newPrice)) {
              setCurrentPrice(newPrice);

              // Append to price history for live chart update
              setPriceHistory(prev => {
                const newPoint = { t: Date.now() / 1000, p: newPrice };
                // Keep last 100 points to avoid memory issues
                const updated = [...prev, newPoint];
                return updated.slice(-100);
              });
            }
          }

          if (data.type === 'book') {
            // Update YES order book from WebSocket (NO would need separate subscription)
            setOrderBooks(prev => ({
              ...prev,
              yes: {
                bids: data.payload?.bids || [],
                asks: data.payload?.asks || []
              }
            }));
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      };

      // Cleanup on unmount
      return () => {
        if (wsRef.current) {
          try {
            wsRef.current.send(JSON.stringify({
              type: 'unsubscribe',
              marketId: tokenId
            }));
          } catch (e) {
            // Ignore errors during cleanup
          }
          wsRef.current.close();
        }
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setWsConnected(false);
    }
  }, [market]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Market</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <Link
              href="/app/markets"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Markets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || !market) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 animate-pulse">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      {/* Sticky Header */}
      <div className="border-b border-gray-800 bg-[#0A0A0C]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/app/markets"
              className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={18} />
              <span>Back to Markets</span>
            </Link>

            {/* Connection Status */}
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <span className="text-xs text-gray-500">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? 'text-green-400' : 'text-gray-500'}`}>
                {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{wsConnected ? 'Live' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Market Header */}
        <MarketHeader
          market={market}
          currentPrice={currentPrice}
        />

        {/* Main Content - Two Column Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart & Order Book */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <div className="bg-[#12131A] rounded-xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Price History</h2>
                <div className="flex gap-1">
                  {['1h', '6h', '1d', '1w', '1m', 'max'].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setSelectedInterval(interval)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedInterval === interval
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {interval.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <PriceChart
                data={priceHistory}
                currentPrice={currentPrice}
                multiOutcomeData={isMultiOutcome ? multiOutcomeData : undefined}
              />
            </div>

            {/* All Outcomes - For Multi-Outcome Markets */}
            {isMultiOutcome && market.outcomes && market.outcomes.length > 0 && (
              <div className="bg-[#12131A] rounded-xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">All Outcomes</h2>
                  <span className="text-sm text-gray-500">
                    {market.outcomes.length} outcomes
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {market.outcomes
                    .sort((a, b) => (b.price || b.yes_price || 0) - (a.price || a.yes_price || 0))
                    .map((outcome, index) => {
                      const yesPrice = outcome.price || outcome.yes_price || 0;
                      const noPrice = outcome.no_price || (1 - yesPrice);
                      const isTopOutcome = index < 4;

                      return (
                        <div
                          key={outcome.name}
                          className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-blue-500/50 ${
                            selectedOutcome?.name === outcome.name
                              ? 'bg-blue-500/20 border-blue-500/50'
                              : 'bg-gray-800/30 border-gray-700'
                          }`}
                          onClick={() => setSelectedOutcome(outcome)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white truncate flex-1">
                              {outcome.name}
                            </span>
                            {isTopOutcome && (
                              <span
                                className="w-2 h-2 rounded-full ml-2"
                                style={{ backgroundColor: OUTCOME_COLORS[index] }}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded px-2 py-0.5">
                              <span className="text-[10px] text-green-400">YES</span>
                              <span className="text-xs font-mono text-green-400 font-bold">
                                {(yesPrice * 100).toFixed(0)}¢
                              </span>
                            </div>
                            <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5">
                              <span className="text-[10px] text-red-400">NO</span>
                              <span className="text-xs font-mono text-red-400 font-bold">
                                {(noPrice * 100).toFixed(0)}¢
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Order Book */}
            <div className="bg-[#12131A] rounded-xl border border-gray-800 p-5">
              <h2 className="text-lg font-semibold mb-4">Order Book</h2>
              <OrderBook
                yesOrderBook={orderBooks.yes}
                noOrderBook={orderBooks.no}
              />
            </div>

            {/* Market Rules */}
            <div className="bg-[#12131A] rounded-xl border border-gray-800 p-5">
              <h2 className="text-lg font-semibold mb-4">Resolution Rules</h2>
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {market.description || 'No resolution rules available for this market.'}
              </div>
            </div>
          </div>

          {/* Right Column - Trading Panel (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <TradingPanel
                market={market}
                currentPrice={currentPrice}
                orderBook={orderBooks.yes}
              />
            </div>
          </div>
        </div>

        {/* Comments Section - Full Width */}
        <div className="mt-6">
          <CommentsSection marketId={marketId} />
        </div>
      </div>
    </div>
  );
}
