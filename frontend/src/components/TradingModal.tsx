'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTrading } from '../hooks/useTrading';
import { useWallet } from '../hooks/useWallet';
import { apiService } from '../services/api';
import { X, DollarSign, TrendingUp, TrendingDown, Cpu, Wallet, Settings2 } from 'lucide-react';

interface TradingModalProps {
  market: any;
  isOpen: boolean;
  onClose: () => void;
}

interface MarketData {
  current_yes_price: number;
  current_no_price: number;
  best_bid: number;
  best_ask: number;
}

export const TradingModal = ({ market, isOpen, onClose }: TradingModalProps) => {
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [marketData, setMarketData] = useState<MarketData>({
    current_yes_price: 0.5,
    current_no_price: 0.5,
    best_bid: 0.45,
    best_ask: 0.55,
  });

  const { executeTrade, statusMessage, isLoading, isDeployingWallet, isApprovingToken, isExecutingTrade, isSuccess, isError, reset } = useTrading();
  const { walletState } = useWallet();

// ⭐ STAGE 1.1: MARKET TYPE DETECTION
  const marketType = useMemo(() => {
    if (!market?.id) return 'invalid';

    // Demo markets (returned by our resolution API)
    if (market.id?.toString().startsWith('demo') || market.id?.toString().startsWith('fallback')) {
      return 'demo';
    }

    // Real Polymarket markets - check if we have real price data
    // Market IDs can be numeric (like 517855) or alphanumeric
    if (market.id && (market.current_yes_price || market.outcomePrices)) {
      return 'real';
    }

    return 'unknown';
  }, [market]);

  // ⭐ STAGE 1.2: SMART DATA LOADING STRATEGY
  useEffect(() => {
    if (isOpen && market) {
      const loadMarketData = async () => {
        try {
          // First, try to use prices already in the market object (from /resolve)
          if (market.current_yes_price && market.current_no_price) {
            console.log('✅ Using prices from market object:', market.current_yes_price, market.current_no_price);
            setMarketData({
              current_yes_price: market.current_yes_price,
              current_no_price: market.current_no_price,
              best_bid: market.current_yes_price * 0.95,
              best_ask: market.current_yes_price * 1.05,
            });
            return;
          }

          switch (marketType) {
            case 'demo':
              // ✅ USE DEMO DATA DIRECTLY - NO API CALLS
              console.log('🔧 Using demo market data:', market.id);
              const demoPrices = {
                current_yes_price: market.current_yes_price || 0.045,
                current_no_price: market.current_no_price || 0.955,
                best_bid: (market.current_yes_price || 0.045) * 0.9,
                best_ask: (market.current_yes_price || 0.045) * 1.1,
              };
              setMarketData(demoPrices);
              break;

            case 'real':
              // 🔄 FETCH REAL DATA FROM POLYMARKET (fallback if prices not in object)
              console.log('📈 Fetching live market data for:', market.id);
              const data = await apiService.fetchMarketPrice(market.id);
              if (data.current_yes_price && data.current_no_price) {
                setMarketData({
                  current_yes_price: data.current_yes_price,
                  current_no_price: data.current_no_price,
                  best_bid: data.best_bid || data.current_yes_price * 0.95,
                  best_ask: data.best_ask || data.current_yes_price * 1.05,
                });
              }
              break;

            default:
              console.warn('❓ Unknown market type, using fallback prices');
              setMarketData({
                current_yes_price: 0.5,
                current_no_price: 0.5,
                best_bid: 0.45,
                best_ask: 0.55,
              });
          }
        } catch (error) {
          console.error('❌ Failed to load market data:', error);
          // Fallback to market object prices if API fails
          if (market?.current_yes_price) {
            setMarketData({
              current_yes_price: market.current_yes_price,
              current_no_price: market.current_no_price || (1 - market.current_yes_price),
              best_bid: market.current_yes_price * 0.9,
              best_ask: market.current_yes_price * 1.1,
            });
          }
        }
      };

      loadMarketData();
    }
  }, [isOpen, market, marketType]);

  // Reset trading state when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setAmount('');
      setSide('YES');
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const price = side === 'YES' ? marketData.current_yes_price : marketData.current_no_price;
  const payout = parseFloat(amount || '0') * (1 / price);
  const spread = ((marketData.best_ask - marketData.best_bid) * 100).toFixed(2);

  const handleTrade = async () => {
    if (!walletState.connected || !walletState.address) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount!');
      return;
    }

    try {
      await executeTrade(
        {
          marketId: market.condition_id || market.id,
          tokenId: market.clobTokenIds?.[0] || market.tokens?.[0]?.token_id || '',
          side,
          amount: parseFloat(amount),
          price,
        },
        walletState.address
      );

      // Success handled by hook
    } catch (err) {
      console.error('Trade failed:', err);
      // Error handled by hook
    }
  };

  const getActionButtonText = () => {
    if (isDeployingWallet) return 'WALLET_DEPLOYING...';
    if (isApprovingToken) return 'APPROVING_USDC...';
    if (isExecutingTrade) return 'EXECUTING_TRADE...';
    return 'CONFIRM_TRADE';
  };

  const getActionButtonColor = () => {
    if (isError) return 'bg-red-600 hover:bg-red-700';
    if (isSuccess) return 'bg-green-600 hover:bg-green-700';
    return 'bg-blue-600 hover:bg-blue-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Cyber Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="cyber-grid-bg w-full h-full"></div>
        </div>

        {/* Header */}
        <div className="relative p-6 border-b border-white/10 bg-[#151518]">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-mono text-blue-400 uppercase tracking-wider mb-2">
                <Cpu size={14} />
                EXECUTE_ORDER // {market.id?.slice(-8) || 'UNKNOWN'}
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {market.question || market.market || 'Unknown Market'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative p-6 space-y-6">

          {/* ⭐ STAGE 3.1: DEMO MARKET VISUAL INDICATORS */}
          {marketType === 'demo' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
                <Settings2 size={14} />
                TEST MODE: Demo market for trading pipeline testing
              </div>
            </div>
          )}

          {/* Live Price Display */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                Live Price Data
              </span>
              <span className="text-xs text-green-400 font-mono">
                SPREAD: {spread}%</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg border transition-all ${
                side === 'YES'
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">YES</span>
                  <TrendingUp size={12} className="text-green-400" />
                </div>
                <div className="text-lg font-mono font-bold text-green-400 mt-1">
                  {(marketData.current_yes_price).toFixed(3)}
                </div>
              </div>

              <div className={`p-3 rounded-lg border transition-all ${
                side === 'NO'
                  ? 'border-red-500/50 bg-red-500/10'
                  : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">NO</span>
                  <TrendingDown size={12} className="text-red-400" />
                </div>
                <div className="text-lg font-mono font-bold text-red-400 mt-1">
                  {(marketData.current_no_price).toFixed(3)}
                </div>
              </div>
            </div>
          </div>

          {/* Side Selection */}
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider font-mono mb-3">
              Select Outcome
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setSide('YES')}
                className={`flex-1 p-4 rounded-xl border transition-all font-mono text-sm font-bold uppercase tracking-wide ${
                  side === 'YES'
                    ? 'border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    : 'border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                YES ✓
              </button>

              <button
                onClick={() => setSide('NO')}
                className={`flex-1 p-4 rounded-xl border transition-all font-mono text-sm font-bold uppercase tracking-wide ${
                  side === 'NO'
                    ? 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : 'border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                NO ✗
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-mono">
                Investment Amount
              </label>
              <button
                onClick={() => setAmount('100')}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                MAX
              </button>
            </div>

            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-4 bg-[#030304] border border-white/10 rounded-xl text-white font-mono text-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-600"
                disabled={isLoading}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono">
                USDC
              </span>
            </div>

            {amount && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Estimated Return:</span>
                  <span className="text-green-400 font-mono font-bold">
                    {(payout).toFixed(2)} shares
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {statusMessage && (
            <div className={`p-4 rounded-xl font-mono text-sm ${
              isError
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : isSuccess
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            }`}>
              {statusMessage}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="relative p-6 border-t border-white/10 bg-[#151518]">
          <div className="flex items-center gap-3">

            {/* Wallet Status */}
            {walletState.connected && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                <Wallet size={14} className="text-green-400" />
                <span className="text-xs text-slate-400 font-mono">
                  {walletState.walletType}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-mono text-sm font-medium rounded-xl transition-all duration-200"
              >
                CANCEL
              </button>

              <button
                onClick={handleTrade}
                disabled={isLoading || !amount || !walletState.connected}
                className={`px-8 py-3 border ${getActionButtonColor()} text-white font-mono text-sm font-bold rounded-xl transition-all duration-200 transform ${
                  isLoading ? '' : 'hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                } disabled:opacity-50 disabled:transform-none disabled:shadow-none`}
              >
                {getActionButtonText()}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
