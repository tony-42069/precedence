'use client';

import { X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '../contexts/UserContext';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: () => void;
}

export function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const { login } = usePrivy();
  const { isLoading: userLoading } = useUser();

  const handleEmailLogin = () => {
    login({ loginMethods: ['email'] });
    onClose();
    onConnect?.();
  };

  const handleGoogleLogin = () => {
    login({ loginMethods: ['google'] });
    onClose();
    onConnect?.();
  };

  const handleWalletLogin = () => {
    login({ loginMethods: ['wallet'] });
    onClose();
    onConnect?.();
  };

  if (!isOpen) return null;

  const isConnecting = userLoading;

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
              <h2 className="text-2xl font-bold text-white mb-1">Sign In / Create Account</h2>
              <p className="text-sm text-slate-400">Choose how to access Precedence</p>
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
                <p className="text-sm font-mono text-blue-300 mb-1">SECURE_ACCESS</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign in to create your trading profile. New users get wallets created automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Authentication Options */}
          <div className="space-y-3">
            {/* Email Login */}
            <button
              onClick={handleEmailLogin}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  ✉️
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold mb-0.5">Email</div>
                  <div className="text-xs text-slate-400 font-mono">Magic Link</div>
                </div>
              </div>
              <div className="text-blue-400 group-hover:translate-x-1 transition-transform">
                {isConnecting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                ) : (
                  '→'
                )}
              </div>
            </button>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30 hover:border-red-500/50 rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  G
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold mb-0.5">Google</div>
                  <div className="text-xs text-slate-400 font-mono">OAuth Login</div>
                </div>
              </div>
              <div className="text-red-400 group-hover:translate-x-1 transition-transform">
                {isConnecting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-500 border-t-transparent"></div>
                ) : (
                  '→'
                )}
              </div>
            </button>

            {/* Wallet Login */}
            <button
              onClick={handleWalletLogin}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/30 hover:border-purple-500/50 rounded-xl transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🔐
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold mb-0.5">Wallet</div>
                  <div className="text-xs text-slate-400 font-mono">MetaMask, Phantom, etc.</div>
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
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center font-mono">
              New users get trading profiles created automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
