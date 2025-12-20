'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../../hooks/useWallet';
import { useUser } from '../../contexts/UserContext';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { WalletConnectModal } from '../../components/WalletConnectModal';
import {
  User,
  Settings,
  Shield,
  Key,
  LogOut,
  Download,
  Bell,
  Activity,
  Terminal,
  Wallet,
  Edit3,
  Save,
  X,
  Copy,
  Check
} from 'lucide-react';

export default function ProfilePage() {
  const pathname = usePathname();
  const { logout: privyLogout, authenticated, user: privyUser, exportWallet } = usePrivy();
  const { walletState, disconnect } = useWallet();
  const { user, clearUser, updateProfile, stats, fetchStats } = useUser();

  // Check if user has an embedded Privy wallet (not external like MetaMask)
  const hasEmbeddedWallet = privyUser?.linkedAccounts?.find(
    (account: any) =>
      account.type === 'wallet' &&
      account.walletClientType === 'privy' &&
      account.chainType === 'ethereum'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    display_name: '',
    bio: '',
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Handle copy wallet address
  const handleCopyAddress = async () => {
    if (user?.wallet_address) {
      try {
        await navigator.clipboard.writeText(user.wallet_address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Load stats when user is available
  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  // Initialize edit form when user loads
  useEffect(() => {
    if (user) {
      setEditForm({
        username: user.username || '',
        display_name: user.display_name || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

 const handleDisconnect = async () => {
  try {
    // 1. Logout from Privy
    await privyLogout();
    
    // 2. Clear ALL localStorage keys
    localStorage.clear();
    
    // 3. Clear sessionStorage 
    sessionStorage.clear();
    
    // 4. Clear user context
    disconnect();
    clearUser();
    
    // 5. Set logout flag
    sessionStorage.setItem('just_logged_out', 'true');
    
    // 6. Force redirect with delay to ensure cleanup
    setTimeout(() => {
      window.location.href = 'https://www.precedence.fun';
    }, 100);
    
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect anyway
    window.location.href = 'https://www.precedence.fun';
  }
};

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    setSaveError(null);
    
    try {
      await updateProfile(editForm);
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      
      {/* --- BACKGROUND FX --- */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
          <div className="absolute bottom-[0%] right-[0%] w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)} 
          onConnectWallet={() => setWalletModalOpen(true)}
        />
        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 lg:ml-64">
          
          {/* Navigation Header */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="hidden md:flex items-center gap-2 text-sm font-mono text-slate-500">
                    <Terminal size={14} />
                    <span>PRECEDENCE_TERMINAL</span>
                    <span className="text-slate-700">/</span>
                    <span className="text-blue-400 uppercase">IDENTITY_CONFIG</span>
                </div>

                <div className="flex items-center space-x-4 ml-auto">
                  {!user ? (
                    <button
                      onClick={() => window.location.href = '/wallet-connect.html'} // Redirect to polished page
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                      <span className="text-[10px] font-mono uppercase text-slate-400">Profile Active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Identity</h1>
              <p className="text-slate-400">Manage account parameters and system preferences.</p>
            </div>

            {/* Not Connected State */}
            {!user ? (
              <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center border border-white/10">
                  <Wallet size={32} className="text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Connect to View Profile</h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Connect your wallet to create or access your Precedence profile. Your trading history and stats will be saved.
                </p>
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-lg font-semibold transition-all"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Tab Navigation */}
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl w-full max-w-md mb-8">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'profile'
                        ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <User size={16} /> Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'settings'
                        ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Settings size={16} /> Settings
                  </button>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-8">
                    {/* Profile Overview */}
                    <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                      
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">User Overview</h2>
                        {!isEditing ? (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors"
                          >
                            <Edit3 size={14} /> Edit Profile
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsEditing(false)}
                              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors"
                            >
                              <X size={14} /> Cancel
                            </button>
                            <button
                              onClick={handleSaveProfile}
                              disabled={saving}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                            >
                              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>

                      {saveError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                          {saveError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Avatar & Basic Info */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                          <div className="flex items-center space-x-6 mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-white/10">
                              <span className="text-white text-3xl font-bold font-mono">
                                {user.username ? user.username[0].toUpperCase() : user.wallet_address.slice(2, 4).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    value={editForm.display_name}
                                    onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                                    placeholder="Display Name"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                  />
                                  <input
                                    type="text"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                                    placeholder="Username"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-300 text-sm font-mono focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              ) : (
                                <>
                                  <h3 className="text-xl font-bold text-white font-mono mb-1">
                                    {user.display_name || user.username || 'CONNECTED_TRADER'}
                                  </h3>
                                  {user.username && (
                                    <p className="text-slate-400 text-sm mb-1">@{user.username}</p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <p className="text-slate-500 font-mono text-sm bg-black/30 px-2 py-1 rounded inline-block border border-white/5">
                                      {formatAddress(user.wallet_address)}
                                    </p>
                                    <button
                                      onClick={handleCopyAddress}
                                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                      title="Copy full wallet address"
                                    >
                                      {copiedAddress ? (
                                        <Check size={14} className="text-green-400" />
                                      ) : (
                                        <Copy size={14} className="text-slate-400 hover:text-white" />
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Bio */}
                          {isEditing ? (
                            <textarea
                              value={editForm.bio}
                              onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                              placeholder="Tell us about yourself..."
                              rows={3}
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500 resize-none"
                            />
                          ) : user.bio ? (
                            <p className="text-slate-400 text-sm mb-4">{user.bio}</p>
                          ) : null}

                          {/* Connection Status */}
                          <div className="bg-black/20 rounded-lg p-4 border border-white/5 mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-slate-400">Status</span>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                                <span className="text-xs font-bold uppercase text-green-400">ONLINE</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-slate-400">Member Since</span>
                              <span className="text-xs font-mono text-slate-200">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-400">Reputation</span>
                              <span className="text-xs font-mono text-purple-400">{user.reputation_score} pts</span>
                            </div>
                          </div>
                        </div>

                        {/* Trading Stats */}
                        <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                          <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <Activity size={16} /> Performance Metrics
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                              <div className="text-2xl font-bold font-mono text-blue-400">{user.total_trades}</div>
                              <div className="text-xs text-slate-400 uppercase">Total Trades</div>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                              <div className="text-2xl font-bold font-mono text-green-400">
                                {user.win_rate ? `${(user.win_rate * 100).toFixed(0)}%` : '0%'}
                              </div>
                              <div className="text-xs text-slate-400 uppercase">Win Rate</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                              <div className="text-2xl font-bold font-mono text-purple-400">
                                ${user.total_volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                              <div className="text-xs text-slate-400 uppercase">Volume</div>
                            </div>
                            <div className={`rounded-lg p-4 border ${
                              user.total_profit_loss >= 0 
                                ? 'bg-green-500/10 border-green-500/20' 
                                : 'bg-red-500/10 border-red-500/20'
                            }`}>
                              <div className={`text-2xl font-bold font-mono ${
                                user.total_profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {user.total_profit_loss >= 0 ? '+' : ''}${user.total_profit_loss.toFixed(2)}
                              </div>
                              <div className="text-xs text-slate-400 uppercase">Net P&L</div>
                            </div>
                          </div>

                          {/* Badges */}
                          {user.badges && user.badges.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <h5 className="text-xs text-slate-500 uppercase mb-2">Badges</h5>
                              <div className="flex flex-wrap gap-2">
                                {user.badges.map((badge: any, i: number) => (
                                  <span key={i} className="px-2 py-1 bg-gold/10 border border-gold/20 rounded text-xs text-gold">
                                    {badge.name || badge}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Account Actions */}
                    <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                      <h2 className="text-lg font-semibold text-white mb-6">Session Controls</h2>
                      <div className="flex flex-wrap gap-4">
                        <button
                          onClick={handleDisconnect}
                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <LogOut size={18} /> Disconnect Wallet
                        </button>
                        <button
                          onClick={exportWallet}
                          disabled={!authenticated || !hasEmbeddedWallet}
                          className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Key size={18} /> Export Private Key
                        </button>
                        <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                          <Download size={18} /> Export History
                        </button>
                      </div>
                      {hasEmbeddedWallet && (
                        <p className="text-xs text-slate-500 mt-3">
                          Export your private key to use your wallet in MetaMask or other wallet apps.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-8">
                    {/* Trading Preferences */}
                    <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                         <Activity size={18} /> Trading Configuration
                      </h2>

                      <div className="space-y-6">
                        {[
                           "Enable AI-powered trade suggestions", 
                           "Show market probability heatmaps", 
                           "Display real-time order book depth", 
                           "Auto-refresh market data (WebSockets)"
                        ].map((setting, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                              <span className="text-sm text-slate-300">{setting}</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input type="checkbox" defaultChecked={i < 3} className="sr-only peer" />
                                 <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Notification Preferences */}
                    <div className="bg-[#0A0A0C]/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                         <Bell size={18} /> Notification Uplink
                      </h2>

                      <div className="space-y-6">
                         {[
                           "Price volatility alerts (>5%)", 
                           "AI prediction confidence updates", 
                           "Trade settlement confirmations", 
                           "System maintenance notices"
                        ].map((setting, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                              <span className="text-sm text-slate-300">{setting}</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input type="checkbox" defaultChecked={i === 0} className="sr-only peer" />
                                 <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                              </label>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Save Settings */}
                    <div className="flex justify-end">
                      <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                        Save Configuration
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal 
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </div>
  );
}
