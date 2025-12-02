/**
 * Trading Modal Component
 * 
 * Displays market data and handles order placement using Polymarket CLOB.
 * Uses Privy wallet for signing via usePolymarketSession.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { usePolymarketSession } from '../hooks/usePolymarketSession';
import { usePolymarketOrder } from '../hooks/usePolymarketOrder';
import { apiService } from '../services/api';
import { X, DollarSign, TrendingUp, TrendingDown, Cpu, Wallet, Settings2, Shield, Loader2 } from 'lucide-react';

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
  // Privy authentication
  const { authenticated, login } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  // Polymarket session and order hooks
  const {
    session,
    currentStep,
    isReady,
    isInitializing,
    initializeSession,
    getClobClient,
    statusMessage: sessionStatus,
  } = usePolymarketSession();

  const {
    placeOrder,
    isLoading: isOrderLoading,
    isSuccess: isOrderSuccess,
    isError: isOrderError,
    error: orderError,
    statusMessage: orderStatus,
    reset: resetOrder,
  } = usePolymarketOrder(getClobClient);

  // Local state
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [marketData, setMarketData] = useState<MarketData>({
    current_yes_price: 0.5,
    current_no_price: 0.5,
    best_bid: 0.45,
    best_ask: 0.55,
  });

  // Market type detection
  const marketType = useMemo(() => {
    if (!market?.id) return 'invalid';
    if (market.id?.toString().startsWith('demo') || market.id?.toString().startsWith('fallback')) {
      return 'demo';
    }
    if (market.id && (market.current_yes_price || market.outcomePrices)) {
      return 'real';
    }
    return 'unknown';
  }, [market]);

  // Load market data
  useEffect(() => {
    if (isOpen && market) {
      const loadMarketData = async () => {
        try {
          if (market.current_yes_price && market.current_no_price) {
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
              setMarketData({
                current_yes_price: market.current_yes_price || 0.045,
                current_no_price: market.current_no_price || 0.955,
                best_bid: (market.current_yes_price || 0.045) * 0.9,
                best_ask: (market.current_yes_price || 0.045) * 1.1,
              });
              break;

            case 'real':
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
              setMarketData({
                current_yes_price: 0.5,
                current_no_price: 0.5,
                best_bid: 0.45,
                best_ask: 0.55,
              });
          }
        } catch (error) {
          console.error('❌ Failed to load market data:', error);
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetOrder();
      setAmount('');
      setSide('YES');
    }
  }, [isOpen, resetOrder]);

  if (!isOpen) return null;

  const price = side === 'YES' ? marketData.current_yes_price : marketData.current_no_price;
  const payout = parseFloat(amount || '0') * (1 / price);
  const spread = ((marketData.best_ask - marketData.best_bid) * 100).toFixed(2);

  // Get the correct token ID based on side
  const getTokenId = () => {
    const tokens = market.clobTokenIds || market.tokens;
    if (Array.isArray(tokens)) {
      return side === 'YES' ? tokens[0] : tokens[1];
    }
    if (tokens?.[0]?.token_id) {
      return side === 'YES' ? tokens[0].token_id : tokens[1]?.token_id;
    }
    return '';
  };

  // Handle trade execution
  const handleTrade = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!isReady) {
      // Initialize session first
      await initializeSession();
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount!');
      return;
    }

    const tokenId = getTokenId();
    if (!tokenId) {
      alert('Invalid market token ID');
      return;
    }

    // Place the order
    const result = await placeOrder({
      tokenId,
      price,
      size: parseFloat(amount),
      side: 'BUY',
      negRisk: market.negRisk || false,
    });

    if (result.success) {
      console.log('🎉 Trade successful:', result.orderId);
    }
  };

  // Determine button state and text
  const getActionButtonText = () => {
    if (!authenticated) return 'CONNECT WALLET';
    if (isInitializing) return 'INITIALIZING...';
    if (!isReady) return 'INITIALIZE TRADING';
    if (isOrderLoading) return 'PLACING ORDER...';
    if (isOrderSuccess) return '✅ ORDER PLACED!';
    return 'CONFIRM_TRADE';
  };

  const getActionButtonColor = () => {
    if (isOrderError) return 'bg-red-600 hover:bg-red-700';
    if (isOrderSuccess) return 'bg-green-600 hover:bg-green-700';
    if (!authenticated) return 'bg-purple-600 hover:bg-purple-500';
    return 'bg-blue-600 hover:bg-blue-500';
  };

  const isButtonDisabled = () => {
    if (!authenticated) return false; // Can always click to connect
    if (isInitializing || isOrderLoading) return true;
    if (!isReady && !isInitializing) return false; // Can click to initialize
    if (!amount || parseFloat(amount) <= 0) return true;
    return false;
  };

  // Status message to display
  const displayStatus = isInitializing ? sessionStatus : orderStatus;

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

          {/* Demo Market Indicator */}
          {marketType === 'demo' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
                <Settings2 size={14} />
                TEST MODE: Demo market for trading pipeline testing
              </div>
            </div>
          )}

          {/* Session Status Indicator */}
          {authenticated && !isReady && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-mono">
                <Shield size={14} />
                {isInitializing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {sessionStatus}
                  </>
                ) : (
                  'Click "Initialize Trading" to set up your secure wallet'
                )}
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
                SPREAD: {spread}%
              </span>
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
                  {marketData.current_yes_price.toFixed(3)}
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
                  {marketData.current_no_price.toFixed(3)}
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
                disabled={isOrderLoading || isInitializing}
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
                    {payout.toFixed(2)} shares
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {displayStatus && (
            <div className={`p-4 rounded-xl font-mono text-sm ${
              isOrderError
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : isOrderSuccess
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            }`}>
              {displayStatus}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="relative p-6 border-t border-white/10 bg-[#151518]">
          <div className="flex items-center gap-3">

            {/* Wallet/Session Status */}
            {authenticated && walletsReady && wallets.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                <Wallet size={14} className={isReady ? 'text-green-400' : 'text-yellow-400'} />
                <span className="text-xs text-slate-400 font-mono">
                  {isReady ? 'READY' : 'SETUP NEEDED'}
                </span>
              </div>
            )}

            {/* Safe Address Badge */}
            {session?.safeAddress && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                <Shield size={14} className="text-blue-400" />
                <span className="text-xs text-slate-400 font-mono">
                  {session.safeAddress.slice(0, 6)}...{session.safeAddress.slice(-4)}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={onClose}
                disabled={isOrderLoading || isInitializing}
                className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-mono text-sm font-medium rounded-xl transition-all duration-200"
              >
                CANCEL
              </button>

              <button
                onClick={handleTrade}
                disabled={isButtonDisabled()}
                className={`px-8 py-3 border ${getActionButtonColor()} text-white font-mono text-sm font-bold rounded-xl transition-all duration-200 transform ${
                  isOrderLoading || isInitializing ? '' : 'hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                } disabled:opacity-50 disabled:transform-none disabled:shadow-none flex items-center gap-2`}
              >
                {(isOrderLoading || isInitializing) && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {getActionButtonText()}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
