'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Briefcase, Scale, X } from 'lucide-react';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  color: string;
}

export function QuickActionsWidget() {
  const router = useRouter();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [marketRequest, setMarketRequest] = useState('');

  const handleRequestSubmit = () => {
    if (marketRequest.trim()) {
      console.log('Market request:', marketRequest);
      setRequestSubmitted(true);
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSubmitted(false);
        setMarketRequest('');
      }, 2000);
    }
  };

  const actions: QuickAction[] = [
    {
      id: 'search-cases',
      icon: <Search size={16} />,
      label: 'Cases',
      href: '/cases',
      color: 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
    },
    {
      id: 'all-markets',
      icon: <TrendingUp size={16} />,
      label: 'Markets',
      href: '/markets',
      color: 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
    },
    {
      id: 'portfolio',
      icon: <Briefcase size={16} />,
      label: 'Portfolio',
      href: '/portfolio',
      color: 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
    },
    {
      id: 'request-market',
      icon: <Scale size={16} />,
      label: 'Request',
      onClick: () => setShowRequestModal(true),
      color: 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
    }
  ];

  return (
    <>
      {/* Horizontal Strip Design */}
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="text-xs font-mono text-slate-600 mr-2 hidden sm:inline">QUICK:</span>
        <div className="flex items-center gap-1 bg-white/5 rounded-full px-1 py-1 border border-white/10">
          {actions.map((action, index) => (
            <React.Fragment key={action.id}>
              <button
                onClick={() => {
                  if (action.href) {
                    router.push(action.href);
                  } else if (action.onClick) {
                    action.onClick();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm transition-all duration-200 ${action.color}`}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
              {index < actions.length - 1 && (
                <div className="w-px h-4 bg-white/10 hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Request Market Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowRequestModal(false)}
          ></div>
          
          <div className="relative bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {!requestSubmitted ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Scale size={20} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white font-mono">REQUEST_MARKET</h3>
                    <p className="text-sm text-slate-500">Suggest a new legal prediction market</p>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mb-4">
                  Have a court case or legal ruling you want to trade on? Submit your suggestion and we&apos;ll review it for potential listing.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-mono text-slate-500 uppercase mb-2">
                    Case or Market Description
                  </label>
                  <textarea
                    value={marketRequest}
                    onChange={(e) => setMarketRequest(e.target.value)}
                    placeholder="e.g., Will the Supreme Court rule in favor of the plaintiff in [Case Name] v. [Case Name]?"
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:border-yellow-500/50 focus:outline-none resize-none"
                  />
                </div>

                <div className="mb-5 p-3 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-xs font-mono text-slate-500 uppercase mb-2">Example requests:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• SCOTUS ruling on abortion access case</li>
                    <li>• SEC v. Coinbase verdict outcome</li>
                    <li>• DOJ antitrust case against Google</li>
                  </ul>
                </div>

                <button
                  onClick={handleRequestSubmit}
                  disabled={!marketRequest.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-slate-600 disabled:to-slate-700 text-black disabled:text-slate-400 font-semibold rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  SUBMIT_REQUEST
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Request Submitted!</h3>
                <p className="text-sm text-slate-400">
                  We&apos;ll review your suggestion and notify you if the market is created.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
