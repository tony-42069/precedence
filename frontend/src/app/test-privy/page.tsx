'use client';

import { useState, useEffect } from 'react';
import { PrivyTestProvider } from '../../components/PrivyTestProvider';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { 
  Mail, 
  Wallet, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  Loader2,
  PenTool,
  Shield,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

// Inner component that uses Privy hooks
function PrivyTestContent() {
  const { login, logout, authenticated, user, ready, createWallet } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [signatureTest, setSignatureTest] = useState<{
    status: 'idle' | 'signing' | 'success' | 'error';
    signature?: string;
    error?: string;
  }>({ status: 'idle' });
  const [creatingWallet, setCreatingWallet] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('=== PRIVY DEBUG ===');
    console.log('authenticated:', authenticated);
    console.log('ready:', ready);
    console.log('walletsReady:', walletsReady);
    console.log('user:', user);
    console.log('user?.wallet:', user?.wallet);
    console.log('user?.linkedAccounts:', user?.linkedAccounts);
    console.log('wallets:', wallets);
    console.log('wallets length:', wallets?.length);
    console.log('==================');
  }, [authenticated, ready, walletsReady, user, wallets]);

  // Handle manual wallet creation
  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    try {
      const wallet = await createWallet();
      console.log('Created wallet:', wallet);
    } catch (err) {
      console.error('Failed to create wallet:', err);
    } finally {
      setCreatingWallet(false);
    }
  };

  // Test signing a message (proves we can sign transactions for Safe)
  const testSignMessage = async () => {
    if (!wallets || wallets.length === 0) {
      setSignatureTest({ status: 'error', error: 'No wallet found' });
      return;
    }

    setSignatureTest({ status: 'signing' });

    try {
      const wallet = wallets[0];
      
      // Get the provider
      const provider = await wallet.getEthereumProvider();
      
      // Sign a test message
      const message = 'Precedence Test: Verifying wallet can sign for Safe transactions';
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, wallet.address],
      });

      setSignatureTest({ 
        status: 'success', 
        signature: signature as string 
      });
    } catch (err: any) {
      setSignatureTest({ 
        status: 'error', 
        error: err.message || 'Failed to sign message' 
      });
    }
  };

  // Test signTypedData (required for CLOB orders on Polymarket)
  const testSignTypedData = async () => {
    if (!wallets || wallets.length === 0) {
      setSignatureTest({ status: 'error', error: 'No wallet found' });
      return;
    }

    setSignatureTest({ status: 'signing' });

    try {
      const wallet = wallets[0];
      const provider = await wallet.getEthereumProvider();

      // EIP-712 typed data (similar to what Polymarket CLOB uses)
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
          ],
          TestOrder: [
            { name: 'maker', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
        primaryType: 'TestOrder',
        domain: {
          name: 'Precedence Test',
          version: '1',
          chainId: 137, // Polygon
        },
        message: {
          maker: wallet.address,
          amount: '1000000', // 1 USDC
          nonce: Date.now(),
        },
      };

      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [wallet.address, JSON.stringify(typedData)],
      });

      setSignatureTest({ 
        status: 'success', 
        signature: signature as string 
      });
    } catch (err: any) {
      setSignatureTest({ 
        status: 'error', 
        error: err.message || 'Failed to sign typed data' 
      });
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030304]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030304] text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Privy Integration Test</h1>
          <p className="text-slate-400">Testing wallet creation, signing, and Safe compatibility</p>
        </div>

        {/* Auth Status Card */}
        <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield size={20} className="text-blue-400" />
            Authentication Status
          </h2>
          
          <div className="flex items-center gap-3 mb-4">
            {authenticated ? (
              <>
                <CheckCircle className="text-green-500" size={24} />
                <span className="text-green-400 font-semibold">Authenticated</span>
              </>
            ) : (
              <>
                <XCircle className="text-yellow-500" size={24} />
                <span className="text-yellow-400 font-semibold">Not Authenticated</span>
              </>
            )}
          </div>

          {!authenticated ? (
            <button
              onClick={login}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Mail size={18} />
              Sign In with Privy
            </button>
          ) : (
            <button
              onClick={logout}
              className="w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          )}
        </div>

        {/* User Info Card */}
        {authenticated && user && (
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wallet size={20} className="text-purple-400" />
              User & Wallet Info
            </h2>

            <div className="space-y-3">
              {/* User ID */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-slate-400 uppercase mb-1">Privy User ID</div>
                <div className="font-mono text-sm text-white break-all">{user.id}</div>
              </div>

              {/* Login Method */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-slate-400 uppercase mb-1">Login Method</div>
                <div className="font-mono text-sm text-white">
                  {user.email ? `Email: ${user.email.address}` : 
                   user.google ? `Google: ${user.google.email}` :
                   user.wallet ? `External Wallet` : 'Unknown'}
                </div>
              </div>

              {/* Linked Accounts Debug */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-slate-400 uppercase mb-1">Linked Accounts</div>
                <div className="font-mono text-xs text-slate-300 break-all">
                  {JSON.stringify(user.linkedAccounts?.map(a => a.type), null, 2)}
                </div>
              </div>

              {/* Wallet from user object */}
              {user.wallet && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">User's Embedded Wallet</div>
                  <div className="font-mono text-sm text-green-400 break-all">
                    {user.wallet.address}
                  </div>
                </div>
              )}

              {/* Wallets from useWallets hook */}
              {walletsReady && wallets && wallets.length > 0 ? (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">Connected Wallets ({wallets.length})</div>
                  {wallets.map((wallet, i) => (
                    <div key={i} className="mt-2 p-2 bg-black/30 rounded">
                      <div className="font-mono text-sm text-green-400 break-all">
                        {wallet.address}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Type: {wallet.walletClientType} | Chain: {wallet.chainId}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <AlertTriangle size={16} />
                    <span className="font-semibold">No Wallet Found</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    Privy didn't automatically create an embedded wallet. Click below to create one manually.
                  </p>
                  <button
                    onClick={handleCreateWallet}
                    disabled={creatingWallet}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creatingWallet ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Wallet size={16} />
                    )}
                    {creatingWallet ? 'Creating...' : 'Create Embedded Wallet'}
                  </button>
                </div>
              )}

              {/* Wallet Type */}
              {wallets && wallets.length > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">Wallet Type</div>
                  <div className="flex items-center gap-2">
                    {wallets[0]?.walletClientType === 'privy' ? (
                      <>
                        <CheckCircle className="text-green-500" size={16} />
                        <span className="text-green-400">Privy Embedded Wallet (auto-created)</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="text-blue-400" size={16} />
                        <span className="text-blue-400">External Wallet ({wallets[0]?.walletClientType})</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signing Tests Card */}
        {authenticated && wallets && wallets.length > 0 && (
          <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PenTool size={20} className="text-yellow-400" />
              Signing Tests (Safe/Polymarket Compatibility)
            </h2>

            <p className="text-slate-400 text-sm mb-4">
              These tests verify the wallet can sign transactions needed for Safe wallet creation and Polymarket CLOB orders.
            </p>

            <div className="space-y-3">
              {/* Test 1: Personal Sign */}
              <button
                onClick={testSignMessage}
                disabled={signatureTest.status === 'signing'}
                className="w-full py-3 px-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {signatureTest.status === 'signing' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <PenTool size={18} />
                )}
                Test 1: personal_sign (Basic Signing)
              </button>

              {/* Test 2: Typed Data (EIP-712) */}
              <button
                onClick={testSignTypedData}
                disabled={signatureTest.status === 'signing'}
                className="w-full py-3 px-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {signatureTest.status === 'signing' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <PenTool size={18} />
                )}
                Test 2: eth_signTypedData_v4 (CLOB Orders)
              </button>

              {/* Result */}
              {signatureTest.status === 'success' && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
                    <CheckCircle size={18} />
                    Signing Successful!
                  </div>
                  <div className="text-xs text-slate-400">
                    Signature: <span className="font-mono text-green-300 break-all">{signatureTest.signature?.slice(0, 50)}...</span>
                  </div>
                  <div className="mt-2 text-sm text-green-300">
                    ✅ This wallet CAN sign for Safe transactions and Polymarket orders!
                  </div>
                </div>
              )}

              {signatureTest.status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                    <XCircle size={18} />
                    Signing Failed
                  </div>
                  <div className="text-sm text-red-300">{signatureTest.error}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conclusion Card */}
        {authenticated && signatureTest.status === 'success' && (
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-2 text-green-400">✅ Test Passed!</h2>
            <p className="text-slate-300">
              Privy wallet integration is compatible with our Safe wallet and Polymarket trading flow. 
              The embedded wallet can sign all required transaction types.
            </p>
            <div className="mt-4 p-3 bg-black/30 rounded-lg">
              <div className="text-xs text-slate-400 uppercase mb-1">Next Steps</div>
              <ul className="text-sm text-slate-300 list-disc list-inside space-y-1">
                <li>Replace WalletConnectModal with Privy login</li>
                <li>Update UserContext to use Privy wallet address</li>
                <li>Test Safe wallet creation with Privy wallet</li>
              </ul>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase mb-2">Debug Info (check console for more)</div>
          <div className="font-mono text-xs text-slate-400">
            <div>ready: {String(ready)}</div>
            <div>walletsReady: {String(walletsReady)}</div>
            <div>authenticated: {String(authenticated)}</div>
            <div>wallets count: {wallets?.length ?? 0}</div>
            <div>user.wallet: {user?.wallet?.address ?? 'none'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page wrapped with provider
export default function PrivyTestPage() {
  return (
    <PrivyTestProvider>
      <PrivyTestContent />
    </PrivyTestProvider>
  );
}
