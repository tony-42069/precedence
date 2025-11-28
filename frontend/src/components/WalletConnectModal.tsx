'use client';

import { X } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useUser } from '../contexts/UserContext';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: () => void;
}

export function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const { connectPhantom, connectMetaMask, checkWalletAvailability, walletState } = useWallet();
  const { registerOrFetchUser, isLoading: userLoading } = useUser();

  if (!isOpen) return null;

  const { hasPhantom, hasMetaMask } = checkWalletAvailability();

  const handleConnect = async (connectFn: () => Promise<string | undefined>) => {
    try {
      // Connect wallet and get address
      const address = await connectFn();
      
      if (address) {
        // Register or fetch user profile from database
        console.log('🔄 Registering user with address:', address);
        await registerOrFetchUser(address);
        
        // Close modal and trigger callback
        onClose();
        if (onConnect) {
          onConnect();
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const isConnecting = walletState.connecting || userLoading;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#0A0A0C] border border-purple-500/30 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-in fade-in zoom-in duration-200">
        
        {/* Animated glow border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 animate-pulse pointer-events-none"></div>

        {/* Header */}
        <div className="relative p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Connect Wallet</h2>
              <p className="text-sm text-slate-400">Choose your wallet to start trading</p>
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
        <div className="relative p-6 space-y-4">
          {/* Terminal-style notice */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 animate-pulse"></div>
              <div>
                <p className="text-sm font-mono text-blue-300 mb-1">WALLET_REQUIRED</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect your wallet to place trades on prediction markets. Your profile will be created automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Options */}
          <div className="space-y-3">
            {/* Phantom Wallet */}
            {hasPhantom ? (
              <button
                onClick={() => handleConnect(connectPhantom)}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/30 hover:border-purple-500/50 rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    ◈
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold mb-0.5">Phantom</div>
                    <div className="text-xs text-slate-400 font-mono">Solana Wallet</div>
                  </div>
                </div>
                <div className="text-purple-400 group-hover:translate-x-1 transition-transform">
                  {isConnecting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                  ) : (
                    '→'
                  )}
                </div>
              </button>
            ) : (
              <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                    ◈
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold mb-0.5">Phantom</div>
                    <div className="text-xs text-orange-400 font-mono">Install Extension</div>
                  </div>
                </div>
                <div className="text-slate-400 group-hover:translate-x-1 transition-transform">
                  ↗
                </div>
              </a>
            )}

            {/* MetaMask Wallet */}
            {hasMetaMask ? (
              <button
                onClick={() => handleConnect(connectMetaMask)}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/30 hover:border-orange-500/50 rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    🦊
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold mb-0.5">MetaMask</div>
                    <div className="text-xs text-slate-400 font-mono">Ethereum / Polygon</div>
                  </div>
                </div>
                <div className="text-orange-400 group-hover:translate-x-1 transition-transform">
                  {isConnecting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                  ) : (
                    '→'
                  )}
                </div>
              </button>
            ) : (
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                    🦊
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold mb-0.5">MetaMask</div>
                    <div className="text-xs text-orange-400 font-mono">Install Extension</div>
                  </div>
                </div>
                <div className="text-slate-400 group-hover:translate-x-1 transition-transform">
                  ↗
                </div>
              </a>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center font-mono">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
