import React, { useState } from 'react';
import Link from 'next/link';
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
        fixed left-0 top-0 h-screen bg-white border-r border-slate-200 shadow-lg z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        w-64 overflow-y-auto
      `}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">P</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Precedence
              </h1>
              <p className="text-xs text-slate-500">Legal Prediction Markets</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onToggle}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
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
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1">
                  <div className={`font-medium ${isActive ? 'text-blue-700' : ''}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
            <div className="text-xs text-slate-600 mb-1">🚀 Powered by AI</div>
            <div className="text-xs text-slate-500">
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
