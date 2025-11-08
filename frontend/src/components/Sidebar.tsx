import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

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
      icon: '📊',
      description: 'Portfolio & Overview'
    },
    {
      name: 'Court Cases',
      href: '/cases',
      icon: '⚖️',
      description: 'Search Legal Cases'
    },
    {
      name: 'Markets',
      href: '/markets',
      icon: '📈',
      description: 'Browse Markets'
    },
    {
      name: 'AI Predictions',
      href: '/predictions',
      icon: '🤖',
      description: 'Judge Analysis'
    },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: '💼',
      description: 'Your Positions'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: '👤',
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
        fixed left-0 top-0 h-screen bg-indigo-500 border-r border-slate-200 shadow-lg z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        w-64 overflow-y-auto
      `}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 p-1">
              <Image
                src="/precedence-logo.png"
                alt="Precedence Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Precedence
              </h1>
              <p className="text-xs text-white/70">Legal Prediction Markets</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onToggle}
            className="lg:hidden text-white/70 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1">
                  <div className={`font-medium ${isActive ? 'text-white' : ''}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-white/60">
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs text-white/80 mb-1">🚀 Powered by AI</div>
            <div className="text-xs text-white/60">
              Judge analysis & market intelligence
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
      className="lg:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow-lg border border-slate-200"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );
}
