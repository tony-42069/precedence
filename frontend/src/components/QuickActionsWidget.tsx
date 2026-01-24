'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Briefcase, BrainCircuit } from 'lucide-react';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
}

export function QuickActionsWidget() {
  const router = useRouter();

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
      id: 'analyze',
      icon: <BrainCircuit size={16} />,
      label: 'Analyze',
      href: '/markets',
      color: 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
    }
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <span className="text-xs font-mono text-slate-600 mr-2 hidden sm:inline">QUICK:</span>
      <div className="flex items-center gap-1 bg-white/5 rounded-full px-1 py-1 border border-white/10">
        {actions.map((action, index) => (
          <React.Fragment key={action.id}>
            <button
              onClick={() => router.push(action.href)}
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
  );
}
