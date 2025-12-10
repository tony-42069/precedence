/**
 * Markets Grid Component
 * 
 * Displays prediction markets with trading functionality.
 * Handles both binary (Yes/No) and multi-outcome markets properly.
 * 
 * Binary markets: BUY YES / BUY NO → Trading Modal
 * Multi-outcome markets: SELECT OUTCOME → Outcome Modal → Trading Modal
 */

'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { TradingModal } from './TradingModal';
import { usePredictions } from '../hooks/usePredictions';
import { Users, ChevronRight } from 'lucide-react';

interface MarketOutcome {
  name: string;           // Display name from groupItemTitle: "2 (50 bps)"
  question?: string;      // Full question: "Will 2 Fed rate cuts happen in 2025?"
  price: number;          // YES price for display/sorting
  yes_price?: number;     // YES price for trading
  no_price?: number;      // NO price for trading  
  id?: string;            // Market ID for trading
  market_id?: string;     // Same as id
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
  is_binary?: boolean;
  num_outcomes?: number;
  outcomes?: MarketOutcome[];
  top_outcome?: string;
}

interface MarketsGridProps {
  highlightId?: string | null;
}

export function MarketsGrid({ highlightId }: MarketsGridProps) {
  const { authenticated, login } = usePrivy();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<MarketOutcome | null>(null);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [highlightedMarketId, setHighlightedMarketId] = useState<string | null>(highlightId || null);
  
  const { enhanceMarketsWithAI } = usePredictions();
  const marketRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch(`${API_URL}/api/markets/legal`);
        if (response.ok) {
          const data = await response.json();
          let rawMarkets = Array.isArray(data) ? data : (data.markets || []);
          
          if (highlightId && !rawMarkets.find((m: Market) => m.id === highlightId)) {
            console.log('Highlighted market not in legal markets, fetching from trending...');
            try {
              const trendingResponse = await fetch(`${API_URL}/api/markets/trending?limit=50`);
              if (trendingResponse.ok) {
                const trendingData = await trendingResponse.json();
                const trendingMarkets = trendingData.trending || [];
                const highlightedMarket = trendingMarkets.find((m: Market) => m.id === highlightId);
                
                if (highlightedMarket) {
                  rawMarkets = [highlightedMarket, ...rawMarkets];
                  console.log('✅ Added highlighted market to top of list');
                }
              }
            } catch (error) {
              console.error('Failed to fetch trending markets:', error);
            }
          }
          
          setMarkets(rawMarkets);

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

  useEffect(() => {
    if (highlightId && !loading && markets.length > 0) {
      const timeout = setTimeout(() => {
        const element = marketRefs.current[highlightId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      const highlightTimeout = setTimeout(() => {
        setHighlightedMarketId(null);
      }, 5000);

      return () => {
        clearTimeout(timeout);
        clearTimeout(highlightTimeout);
      };
    }
  }, [highlightId, loading, markets]);

  // Handler for binary market trade clicks
  const handleTradeClick = (market: Market) => {
    setSelectedMarket(market);
    setSelectedOutcome(null);
    
    if (!authenticated) {
      login();
    }
    
    setShowTradingModal(true);
  };

  // Handler for multi-outcome market - opens outcome selector
  const handleSelectOutcome = (market: Market) => {
    setSelectedMarket(market);
    setShowOutcomeModal(true);
  };

  // Handler for when user picks a specific outcome
  const handleOutcomeSelected = (outcome: MarketOutcome) => {
    setSelectedOutcome(outcome);
    setShowOutcomeModal(false);
    
    if (!authenticated) {
      login();
    }
    
    // Create a market object for trading with the selected outcome's data
    const marketWithOutcome: Market = {
      ...selectedMarket!,
      id: outcome.market_id || outcome.id,                           // Use outcome's market ID
      question: outcome.question || `${selectedMarket?.question} - ${outcome.name}`,  // Use outcome's full question
      current_yes_price: outcome.yes_price ?? outcome.price,         // Use outcome's YES price
      current_no_price: outcome.no_price ?? (1 - outcome.price),     // Use outcome's NO price
    };
    
    setSelectedMarket(marketWithOutcome);
    setShowTradingModal(true);
  };

  // Check if market has multiple outcomes
  const isMultiOutcome = (market: Market): boolean => {
    if (market.is_binary === false) return true;
    if (Array.isArray(market.outcomes) && market.outcomes.length > 2) return true;
    return false;
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
            const isMulti = isMultiOutcome(market);
            const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
            
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
                      {isMulti && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Users size={10} />
                          {market.num_outcomes || outcomes.length}
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

                  {/* Question */}
                  <h3 
                    onClick={() => {
                      setSelectedMarket(market);
                      setShowMarketModal(true);
                    }}
                    className="text-lg font-medium text-white mb-4 leading-snug min-h-[3.5rem] cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    {market.question || 'Market Question'}
                  </h3>

                  {/* Price Display - Different for binary vs multi-outcome */}
                  {isMulti ? (
                    // Multi-outcome: Show top 3 outcomes with YES/NO
                    <div className="space-y-2 mb-4">
                      {outcomes.slice(0, 3).map((outcome, idx) => {
                        const yesPrice = outcome.yes_price ?? outcome.price;
                        const noPrice = outcome.no_price ?? (1 - outcome.price);
                        return (
                          <div 
                            key={outcome.id || idx}
                            className="bg-white/5 rounded p-2 border border-white/10 font-mono text-sm"
                          >
                            <div className="text-slate-300 text-xs truncate mb-1">
                              {outcome.name}
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1 flex justify-between">
                                <span className="text-slate-500 text-[10px]">YES</span>
                                <span className="text-green-400 text-xs font-bold">${yesPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex-1 flex justify-between">
                                <span className="text-slate-500 text-[10px]">NO</span>
                                <span className="text-red-400 text-xs font-bold">${noPrice.toFixed(2)}</span>
                              </div>
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
                  ) : (
                    // Binary: Show YES/NO prices
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
                  )}

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

                  {/* Trading Buttons - Different for binary vs multi-outcome */}
                  {isMulti ? (
                    // Multi-outcome: Single button to select outcome
                    <button
                      onClick={() => handleSelectOutcome(market)}
                      className="w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-400 font-mono py-2.5 px-3 rounded-lg transition-colors text-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Users size={14} />
                      SELECT OUTCOME TO TRADE
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    // Binary: BUY YES / BUY NO buttons
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
                  )}

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
        onClose={() => {
          setShowTradingModal(false);
          setSelectedOutcome(null);
        }}
      />

      {/* Outcome Selection Modal - For Multi-Outcome Markets */}
      {showOutcomeModal && selectedMarket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowOutcomeModal(false)}></div>
          <div className="relative bg-[#0A0A0C] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 sticky top-0 bg-[#0A0A0C] z-20">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Users size={10} />
                      {selectedMarket.num_outcomes || selectedMarket.outcomes?.length || 0} Outcomes
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-snug">{selectedMarket.question}</h2>
                  <p className="text-sm text-slate-400 mt-1">Select an outcome to trade</p>
                </div>
                <button 
                  onClick={() => setShowOutcomeModal(false)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <span className="text-slate-400 text-xl">×</span>
                </button>
              </div>
            </div>

            {/* Outcomes List */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {Array.isArray(selectedMarket.outcomes) && selectedMarket.outcomes.map((outcome, index) => {
                  const yesPrice = outcome.yes_price ?? outcome.price;
                  const noPrice = outcome.no_price ?? (1 - outcome.price);
                  const yesPercent = Math.round(yesPrice * 100);
                  
                  return (
                    <button
                      key={outcome.id || index}
                      onClick={() => handleOutcomeSelected(outcome)}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-lg p-4 transition-all group"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium group-hover:text-purple-300 transition-colors text-left">
                          {outcome.name}
                        </span>
                        <ChevronRight size={18} className="text-slate-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                      </div>
                      
                      {/* YES/NO prices side by side */}
                      <div className="flex gap-3 mt-2">
                        <div className="flex-1 bg-green-500/10 rounded p-2 border border-green-500/20">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">YES</span>
                            <span className="text-green-400 font-mono font-bold">${yesPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-slate-500 text-right">{yesPercent}%</div>
                        </div>
                        <div className="flex-1 bg-red-500/10 rounded p-2 border border-red-500/20">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">NO</span>
                            <span className="text-red-400 font-mono font-bold">${noPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-slate-500 text-right">{Math.round(noPrice * 100)}%</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0A0A0C]">
              <button 
                onClick={() => setShowOutcomeModal(false)}
                className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Market Details Modal (Analytics) */}
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

              {/* Current Prices */}
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
                {isMultiOutcome(selectedMarket) ? (
                  <button 
                    onClick={() => {
                      setShowMarketModal(false);
                      handleSelectOutcome(selectedMarket);
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2"
                  >
                    <Users size={18} />
                    SELECT OUTCOME TO TRADE
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setShowMarketModal(false);
                      handleTradeClick(selectedMarket);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                  >
                    TRADE NOW
                  </button>
                )}
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
