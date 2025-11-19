import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Gavel,
  TrendingUp,
  Wallet,
  User
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      description: 'Portfolio & Overview'
    },
    {
      name: 'Court Cases',
      href: '/cases',
      icon: Gavel,
      description: 'Search Legal Cases'
    },
    {
      name: 'Markets',
      href: '/markets',
      icon: TrendingUp,
      description: 'Browse Markets'
    },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: Wallet,
      description: 'Your Positions'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      description: 'Settings & History'
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-screen bg-[#0A0A0C]/95 backdrop-blur-xl border-r border-white/10 z-50
        transition-transform duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        w-64 overflow-y-auto
      `}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-blue-600/5 to-purple-600/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 border border-white/10">
              <Image
                src="/precedence-logo.png"
                alt="Precedence Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-mono font-bold text-white">
                PRECEDENCE
              </h1>
              <p className="text-[10px] text-blue-400 uppercase tracking-wider font-mono">AI LEGAL TERMINAL</p>
            </div>
          </div>

          {/* Connection Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-mono hidden lg:block">ONLINE</span>

            {/* Mobile Close Button */}
            <button
              onClick={onToggle}
              className="lg:hidden text-slate-400 hover:text-white p-1 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                  }
                `}
              >
                <IconComponent
                  size={18}
                  className={`${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'} transition-colors`}
                />
                <div className="flex-1">
                  <div className={`font-mono text-sm ${isActive ? 'text-white font-semibold' : 'font-medium'}`}>
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-gradient-to-r from-purple-600/5 to-blue-600/5">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <div className="text-xs font-mono text-blue-400 mb-1 uppercase tracking-wider">{`> SYSTEM STATUS`}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              AI ENGINE: ACTIVE<br/>
              JUDGE DB: 247 PROFILES<br/>
              ACCURACY: 74.2%
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-green-400 font-mono animate-pulse">⚡ OPERATIONAL</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Mobile Menu Button Component
export function MobileMenuButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed top-4 left-4 z-50 bg-[#0A0A0C]/90 backdrop-blur-md p-3 rounded-lg shadow-xl border border-white/10 hover:border-blue-500/30 transition-all duration-300"
    >
      <svg className="w-5 h-5 text-slate-300 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );
}
