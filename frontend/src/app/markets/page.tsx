'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { MarketsGrid } from '../../components/MarketsGrid';
import {
  Terminal,
  TrendingUp,
  Activity,
  Search,
  Loader2,
  X
} from 'lucide-react';

interface SearchResult {
  id: string;
  question?: string;
  title?: string;
  market?: string;
  outcomePrices?: string;
  volume?: number;
  active?: boolean;
}

function MarketsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightId = searchParams.get('highlight');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [marketCount, setMarketCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch market count for stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/markets/trending?limit=50&exclude_sports=true`);
        if (response.ok) {
          const data = await response.json();
          const markets = Array.isArray(data) ? data : (data.trending || data.markets || []);
          setMarketCount(markets.length);
        }
      } catch (error) {
        console.error('Failed to fetch market stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Search with debounce
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/markets/search?query=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.markets || []);
        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleResultClick = (market: SearchResult) => {
    const marketId = market.id;
    setShowResults(false);
    setSearchQuery('');
    router.push(`/markets/${marketId}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Close search results on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans">
      {/* Background FX */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        <div className="flex-1 w-full min-w-0 lg:ml-64">
          {/* Header */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-2 text-sm font-mono text-slate-500">
                  <Terminal size={14} />
                  <span>PRECEDENCE_TERMINAL</span>
                  <span className="text-slate-700">/</span>
                  <span className="text-blue-400 uppercase">MARKETS</span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                    <Activity size={12} className="text-green-500" />
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {loading ? 'LOADING...' : `${marketCount} MARKETS`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Markets Grid */}
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-16 py-8">
            <div className="max-w-[1800px] mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-blue-400" size={32} />
                  <h1 className="text-3xl font-bold text-white">Prediction Markets</h1>
                </div>
                <p className="text-slate-400 text-sm font-mono mb-6">
                  Browse and search all active prediction markets
                </p>

                {/* Search Bar */}
                <div ref={searchContainerRef} className="relative max-w-2xl">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search active markets on Polymarket..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-11 pr-10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 font-mono text-sm transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                        aria-label="Clear search"
                      >
                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F0F13] border border-white/10 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto z-50">
                      <div className="p-2">
                        <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          {searchResults.length} results for &quot;{searchQuery}&quot;
                        </div>
                        {searchResults.map((market) => {
                          const title = market.question || market.title || market.market || 'Unknown Market';
                          let yesPrice = '—';
                          try {
                            if (market.outcomePrices) {
                              const prices = JSON.parse(market.outcomePrices);
                              if (prices && prices[0]) {
                                yesPrice = `${Math.round(parseFloat(prices[0]) * 100)}`;
                              }
                            }
                          } catch { /* ignore parse errors */ }

                          return (
                            <button
                              key={market.id}
                              onClick={() => handleResultClick(market)}
                              className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
                            >
                              <span className="text-sm text-slate-200 line-clamp-2 min-w-0">{title}</span>
                              {yesPrice !== '—' && (
                                <span className="text-xs font-mono text-green-400 whitespace-nowrap flex-shrink-0">
                                  {yesPrice}&#xA2;
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F0F13] border border-white/10 rounded-xl shadow-2xl z-50 p-6 text-center">
                      <p className="text-slate-500 text-sm font-mono">No markets found for &quot;{searchQuery}&quot;</p>
                    </div>
                  )}
                </div>
              </div>

              <MarketsGrid highlightId={highlightId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-slate-400 font-mono">LOADING_MARKETS...</div>
      </div>
    }>
      <MarketsContent />
    </Suspense>
  );
}
