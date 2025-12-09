/**
 * Markets Grid Component
 * 
 * Displays prediction markets with trading functionality.
 * Handles both binary (Yes/No) and multi-outcome markets.
 */

'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { TradingModal } from './TradingModal';
import { usePredictions } from '../hooks/usePredictions';
import { Users } from 'lucide-react';

interface MarketOutcome {
  name: string;
  price: number;
  id?: string;
}

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
  image?: string;
  icon?: string;
  // Multi-outcome market fields
  is_binary?: boolean;
  num_outcomes?: number;
  outcomes?: MarketOutcome[];
  top_outcome?: string;
}

interface MarketsGridProps {
  highlightId?: string | null;
}

export function MarketsGrid({ highlightId }: MarketsGridProps) {
  // Use Privy for authentication
  const { authenticated, login } = usePrivy();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [highlightedMarketId, setHighlightedMarketId] = useState<string | null>(highlightId || null);
  
  const { enhanceMarketsWithAI } = usePredictions();
  
  // Ref for scrolling to highlighted market
  const marketRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        // First fetch legal markets
        const response = await fetch(`${API_URL}/api/markets/legal`);
        if (response.ok) {
          const data = await response.json();
          let rawMarkets = Array.isArray(data) ? data : (data.markets || []);
          
          // If highlightId is provided and not in legal markets, fetch it from trending
          if (highlightId && !rawMarkets.find((m: Market) => m.id === highlightId)) {
            console.log('Highlighted market not in legal markets, fetching from trending...');
            try {
              const trendingResponse = await fetch(`${API_URL}/api/markets/trending?limit=50`);
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

  // Handler for trade button clicks
  const handleTradeClick = (market: Market, outcomeIndex?: number) => {
    setSelectedMarket(market);
    
    if (!authenticated) {
      // Not authenticated → Trigger Privy login, then open trading modal
      login();
    }
    
    // Always open trading modal - it will handle auth state internally
    setShowTradingModal(true);
  };

  // Check if market is binary (Yes/No) or multi-outcome
  const isBinaryMarket = (market: Market): boolean => {
    // If is_binary is explicitly set, use it
    if (market.is_binary !== undefined) return market.is_binary;
    // If there are outcomes array with more than 2 items, it's multi-outcome
    if (market.outcomes && market.outcomes.length > 2) return false;
    // Default to binary
    return true;
  };

  const filteredMarkets = markets.filter(market => {
    if (filter === 'all') return true;
    const q = market.question?.toLowerCase() || '';
    if (filter === 'politics') {
      return q.includes('trump') || q.includes('biden') || q.includes('election') || q.includes('president') || q.includes('congress') || q.includes('republican') || q.includes('democrat') || q.includes('governor') || q.includes('senate') || q.includes('vote');
    }
    if (filter === 'economy') {
      return q.includes('fed') || q.includes('rate') || q.includes('recession') || q.includes('inflation') || q.includes('gdp') || q.includes('tariff') || q.includes('stock') || q.includes('market') || q.includes('economy');
    }
    if (filter === 'crypto') {
      return q.includes('bitcoin') || q.includes('btc') || q.includes('ethereum') || q.includes('eth') || q.includes('crypto') || q.includes('usdt') || q.includes('tether') || q.includes('solana') || q.includes('coinbase');
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

  // Render price display for binary markets (Yes/No)
  const renderBinaryPrices = (market: Market) => (
    <div className="flex items-center gap-2 mb-4 font-mono text-sm">
      <div className="flex-1 bg-white/5 rounded p-2 border border-white/5 group-hover:border-green-500/30 transition-colors">
        <div className="flex justify-between">
          <span className="text-slate-500 text-xs">YES</span>
          <span className="text-green-400 font-bold">${(market.current_yes_price || 0).toFixed(2)}</span>
        </div>
        <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: `${(market.current_yes_price || 0) * 100}%` }}></div>
        </div>
      </div>
      <div className="flex-1 bg-white/5 rounded p-2 border border-white/5 group-hover:border-red-500/30 transition-colors">
        <div className="flex justify-between">
          <span className="text-slate-500 text-xs">NO</span>
          <span className="text-red-400 font-bold">${(market.current_no_price || 0).toFixed(2)}</span>
        </div>
        <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
          <div className="bg-red-500 h-full" style={{ width: `${(market.current_no_price || 0) * 100}%` }}></div>
        </div>
      </div>
    </div>
  );

  // Render outcomes for multi-outcome markets
  const renderMultiOutcomes = (market: Market) => {
    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    if (outcomes.length === 0) return renderBinaryPrices(market);

    // Color palette for outcomes
    const colors = [
      { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'bg-blue-500' },
      { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', bar: 'bg-purple-500' },
      { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', bar: 'bg-cyan-500' },
      { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', bar: 'bg-amber-500' },
      { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', bar: 'bg-pink-500' },
    ];

    return (
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <Users size={12} />
          <span>{market.num_outcomes || outcomes.length} outcomes</span>
        </div>
        {outcomes.slice(0, 3).map((outcome, index) => {
          const color = colors[index % colors.length];
          return (
            <div 
              key={outcome.id || index} 
              className={`${color.bg} rounded p-2 border ${color.border} font-mono text-sm`}
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-xs truncate max-w-[60%]">
                  {outcome.name}
                </span>
                <span className={`${color.text} font-bold`}>
                  {Math.round(outcome.price * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/10 h-1 mt-1 rounded-full overflow-hidden">
                <div className={`${color.bar} h-full`} style={{ width: `${outcome.price * 100}%` }}></div>
              </div>
            </div>
          );
        })}
        {outcomes.length > 3 && (
          <div className="text-xs text-slate-500 text-center">
            +{outcomes.length - 3} more outcomes
          </div>
        )}
      </div>
    );
  };

  // Render trade buttons based on market type
  const renderTradeButtons = (market: Market) => {
    if (isBinaryMarket(market)) {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => handleTradeClick(market)}
            className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-mono py-2 px-3 rounded-lg transition-colors text-xs cursor-pointer"
          >
            BUY YES
          </button>
          <button
            onClick={() => handleTradeClick(market)}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono py-2 px-3 rounded-lg transition-colors text-xs cursor-pointer"
          >
            BUY NO
          </button>
        </div>
      );
    } else {
      // Multi-outcome market - single trade button
      return (
        <button
          onClick={() => handleTradeClick(market)}
          className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-blue-400 font-mono py-2 px-3 rounded-lg transition-colors text-xs cursor-pointer"
        >
          VIEW OUTCOMES & TRADE
        </button>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: 'all', label: 'All Markets' },
          { id: 'politics', label: '🏛️ Politics' },
          { id: 'economy', label: '💰 Economy' },
          { id: 'crypto', label: '🪙 Crypto' }
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

      {/* Markets Grid */}
      {filteredMarkets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMarkets.map((market, index) => {
            const isHighlighted = highlightedMarketId === market.id;
            const isBinary = isBinaryMarket(market);
            
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
                {/* Market Image Header */}
                {(market.image || market.icon) && (
                  <div className="w-full h-32 overflow-hidden border-b border-white/5">
                    <img 
                      src={market.image || market.icon} 
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                  </div>
                )}

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
                      {/* Multi-outcome badge */}
                      {!isBinary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Users size={10} />
                          Multi
                        </span>
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

                  {/* Question - Clickable */}
                  <h3 
                    onClick={() => {
                      setSelectedMarket(market);
                      setShowMarketModal(true);
                    }}
                    className="text-lg font-medium text-white mb-4 leading-snug min-h-[3.5rem] cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    {market.question || 'Market Question'}
                  </h3>

                  {/* Price Display - Binary or Multi-outcome */}
                  {isBinary ? renderBinaryPrices(market) : renderMultiOutcomes(market)}

                  {/* Tags */}
                  {market.tags && Array.isArray(market.tags) && market.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {market.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span key={tagIndex} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-mono uppercase bg-white/5 text-slate-400 border border-white/5">
                          {typeof tag === 'string' ? tag : String(tag)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Trading Buttons */}
                  {renderTradeButtons(market)}

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
                  {!isBinaryMarket(selectedMarket) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Users size={10} />
                      {selectedMarket.num_outcomes || selectedMarket.outcomes?.length || 0} Outcomes
                    </span>
                  )}
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

              {/* Outcomes Display in Modal */}
              {!isBinaryMarket(selectedMarket) && Array.isArray(selectedMarket.outcomes) && selectedMarket.outcomes.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">All Outcomes</h3>
                  <div className="space-y-2">
                    {selectedMarket.outcomes.map((outcome, index) => {
                      const colors = ['blue', 'purple', 'cyan', 'amber', 'pink', 'green', 'orange'];
                      const color = colors[index % colors.length];
                      return (
                        <div 
                          key={outcome.id || index}
                          className={`bg-${color}-500/10 border border-${color}-500/20 rounded-lg p-3 flex justify-between items-center`}
                          style={{
                            backgroundColor: `rgba(var(--${color}-rgb, 59, 130, 246), 0.1)`,
                            borderColor: `rgba(var(--${color}-rgb, 59, 130, 246), 0.2)`
                          }}
                        >
                          <span className="text-white font-medium">{outcome.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-mono font-bold text-blue-400">
                              {Math.round(outcome.price * 100)}%
                            </span>
                            <button 
                              onClick={() => handleTradeClick(selectedMarket, index)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-xs text-blue-400 font-mono"
                            >
                              BUY
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Binary market prices in modal */}
              {isBinaryMarket(selectedMarket) && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Current Prices</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                      <div className="text-xs text-slate-400 uppercase mb-1">YES</div>
                      <div className="text-2xl font-mono font-bold text-green-400">
                        ${(selectedMarket.current_yes_price || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {Math.round((selectedMarket.current_yes_price || 0) * 100)}% chance
                      </div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                      <div className="text-xs text-slate-400 uppercase mb-1">NO</div>
                      <div className="text-2xl font-mono font-bold text-red-400">
                        ${(selectedMarket.current_no_price || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {Math.round((selectedMarket.current_no_price || 0) * 100)}% chance
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Context</h3>
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-slate-300 leading-relaxed text-sm">
                  {selectedMarket.description || "No detailed context available."}
                </div>
              </div>

              {/* Tags */}
              {selectedMarket.tags && Array.isArray(selectedMarket.tags) && selectedMarket.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMarket.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-400 font-mono uppercase">{typeof tag === 'string' ? tag : String(tag)}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setShowMarketModal(false);
                    handleTradeClick(selectedMarket);
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
