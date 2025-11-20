'use client';

import { useState, useEffect, useRef } from 'react';
import { TradingModal } from './TradingModal';
import { AIConfidenceBadge } from './AIConfidenceIndicator';
import { useWallet } from '../hooks/useWallet';
import { usePredictions } from '../hooks/usePredictions';

interface Market {
  id?: string;
  question?: string;
  description?: string;
  volume?: number;
  closed?: boolean;
  active?: boolean;
  tags?: string[];
  current_yes_price?: number;
  current_no_price?: number;
  end_date?: string;
}

interface MarketsGridProps {
  highlightId?: string | null;
}

export function MarketsGrid({ highlightId }: MarketsGridProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [highlightedMarketId, setHighlightedMarketId] = useState<string | null>(highlightId || null);
  
  const { walletState } = useWallet();
  const { enhanceMarketsWithAI, getCachedPrediction } = usePredictions();
  
  // Ref for scrolling to highlighted market
  const marketRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        // First fetch legal markets
        const response = await fetch('http://localhost:8000/api/markets/legal');
        if (response.ok) {
          const data = await response.json();
          let rawMarkets = Array.isArray(data) ? data : (data.markets || []);
          
          // If highlightId is provided and not in legal markets, fetch it from trending
          if (highlightId && !rawMarkets.find((m: Market) => m.id === highlightId)) {
            console.log('Highlighted market not in legal markets, fetching from trending...');
            try {
              const trendingResponse = await fetch('http://localhost:8000/api/markets/trending?limit=50');
              if (trendingResponse.ok) {
                const trendingData = await trendingResponse.json();
                const trendingMarkets = trendingData.trending || [];
                const highlightedMarket = trendingMarkets.find((m: Market) => m.id === highlightId);
                
                if (highlightedMarket) {
                  // Add the highlighted market to the beginning of the list
                  rawMarkets = [highlightedMarket, ...rawMarkets];
                  console.log('✅ Added highlighted market to top of list');
                }
              }
            } catch (error) {
              console.error('Failed to fetch trending markets:', error);
            }
          }
          
          setMarkets(rawMarkets);

          // Enhance with AI predictions
          if (rawMarkets.length > 0) {
            const enhancedMarkets = await enhanceMarketsWithAI(rawMarkets);
            const finalMarkets = rawMarkets.map((market: Market) => {
              const enhanced = enhancedMarkets.find(em => em.id === market.id);
              return enhanced || market;
            });
            setMarkets(finalMarkets);
          }
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [enhanceMarketsWithAI, highlightId]);

  // Auto-scroll to highlighted market
  useEffect(() => {
    if (highlightId && !loading && markets.length > 0) {
      const timeout = setTimeout(() => {
        const element = marketRefs.current[highlightId];
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log('📍 Scrolled to highlighted market:', highlightId);
        }
      }, 500); // Wait for render

      // Remove highlight after 5 seconds
      const highlightTimeout = setTimeout(() => {
        setHighlightedMarketId(null);
      }, 5000);

      return () => {
        clearTimeout(timeout);
        clearTimeout(highlightTimeout);
      };
    }
  }, [highlightId, loading, markets]);

  const filteredMarkets = markets.filter(market => {
    if (filter === 'all') return true;
    const q = market.question?.toLowerCase() || '';
    if (filter === 'supreme-court') {
      return q.includes('supreme court') || q.includes('scotus');
    }
    if (filter === 'regulatory') {
      return q.includes('sec') || q.includes('fcc') || q.includes('doj') || q.includes('regulation');
    }
    if (filter === 'constitutional') {
      return q.includes('constitutional') || q.includes('amendment');
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-sm font-mono text-blue-400 animate-pulse">LOADING MARKETS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: 'all', label: 'All Markets' },
          { id: 'supreme-court', label: '🏛️ Supreme Court' },
          { id: 'regulatory', label: '⚖️ Regulatory' },
          { id: 'constitutional', label: '📜 Constitutional' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              filter === cat.id
                ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Markets Grid - Matching Dashboard Style */}
      {filteredMarkets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMarkets.map((market, index) => {
            const isHighlighted = highlightedMarketId === market.id;
            
            return (
              <div 
                key={market.id || index} 
                ref={(el) => {
                  if (market.id) marketRefs.current[market.id] = el;
                }}
                className={`bg-[#0A0A0C]/80 backdrop-blur-md rounded-xl border transition-all duration-300 hover:-translate-y-1 group overflow-hidden ${
                  isHighlighted
                    ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] animate-pulse'
                    : 'border-white/10 hover:border-blue-500/30'
                }`}
              >
                <div className="p-6">
                  {/* Highlighted Badge */}
                  {isHighlighted && (
                    <div className="mb-3 px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full inline-flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                      <span className="text-xs font-mono text-purple-300 uppercase">🎯 FROM TRENDING</span>
                    </div>
                  )}
                  
                  {/* Status Badges */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                        market.closed
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${market.closed ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        {market.closed ? 'Closed' : 'Active'}
                      </span>
                      {getCachedPrediction(market.id || '') && (
                        <AIConfidenceBadge
                          prediction={getCachedPrediction(market.id || '')!}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-slate-200">
                        ${Number(market.volume || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">Volume</div>
                    </div>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-medium text-white mb-4 leading-snug min-h-[3.5rem]">
                    {market.question || 'Market Question'}
                  </h3>

                  {/* Price Bars - FIXED: Show as $0.03 not $3.0 */}
                  {market.current_yes_price !== undefined && market.current_no_price !== undefined && (
                    <div className="flex items-center gap-2 mb-4 font-mono text-sm">
                      <div className="flex-1 bg-white/5 rounded p-2 border border-white/5 group-hover:border-green-500/30 transition-colors">
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-xs">YES</span>
                          <span className="text-green-400 font-bold">${market.current_yes_price.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full" style={{ width: `${market.current_yes_price * 100}%` }}></div>
                        </div>
                      </div>
                      <div className="flex-1 bg-white/5 rounded p-2 border border-white/5 group-hover:border-red-500/30 transition-colors">
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-xs">NO</span>
                          <span className="text-red-400 font-bold">${market.current_no_price.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full" style={{ width: `${market.current_no_price * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {market.tags && market.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {market.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span key={tagIndex} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono uppercase bg-white/5 text-slate-400 border border-white/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Trading Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMarket(market);
                        setShowTradingModal(true);
                      }}
                      disabled={!walletState.connected}
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-mono py-2 px-3 rounded-lg transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      BUY YES
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMarket(market);
                        setShowTradingModal(true);
                      }}
                      disabled={!walletState.connected}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono py-2 px-3 rounded-lg transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      BUY NO
                    </button>
                  </div>

                  {/* View Analytics Button */}
                  <button
                    onClick={() => {
                      setSelectedMarket(market);
                      setShowMarketModal(true);
                    }}
                    className="w-full mt-2 text-slate-500 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-xs uppercase tracking-wider"
                  >
                    View Analytics &gt;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5">
          <div className="text-4xl mb-4 opacity-50">⚖️</div>
          <h3 className="text-lg font-semibold text-white mb-2">No markets found</h3>
          <p className="text-slate-400 text-sm">
            No markets match the "{filter}" category.
          </p>
        </div>
      )}

      {/* Trading Modal */}
      <TradingModal
        market={selectedMarket}
        isOpen={showTradingModal}
        onClose={() => setShowTradingModal(false)}
      />

      {/* Market Details Modal */}
      {showMarketModal && selectedMarket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowMarketModal(false)}></div>
          <div className="relative bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-start sticky top-0 bg-[#0A0A0C] z-20">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase border ${
                    selectedMarket.closed ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    {selectedMarket.closed ? 'CLOSED' : 'ACTIVE'}
                  </span>
                  <span className="text-slate-500 text-xs font-mono">ID: {selectedMarket.id?.substring(0, 8)}</span>
                </div>
                <h2 className="text-xl font-bold text-white leading-snug">{selectedMarket.question}</h2>
              </div>
              <button 
                onClick={() => setShowMarketModal(false)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <span className="text-slate-400 text-xl">×</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase">Volume</div>
                  <div className="text-xl font-mono font-bold text-white">
                    ${Number(selectedMarket.volume || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase">Source</div>
                  <div className="text-xl font-mono font-bold text-blue-400">Polymarket</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Context</h3>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-slate-300 leading-relaxed text-sm">
                  {selectedMarket.description || "No detailed context available."}
                </div>
              </div>

              {/* Tags */}
              {selectedMarket.tags && (
                <div className="flex flex-wrap gap-2">
                  {selectedMarket.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-400 font-mono uppercase">{tag}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setShowMarketModal(false);
                    setShowTradingModal(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                >
                  TRADE NOW
                </button>
                <button 
                  onClick={() => setShowMarketModal(false)} 
                  className="px-6 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-slate-300 font-medium"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
