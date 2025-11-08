'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from "next/image";
import { useWallet } from '../../hooks/useWallet';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';

interface CourtCase {
  id: number;
  caseName: string;
  court: string;
  dateFiled: string;
  status?: string;
  docketNumber?: string;
  snippet?: string;
  absolute_url?: string;
}

export default function CasesPage() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentCases, setRecentCases] = useState<CourtCase[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wallet functionality
  const { walletState } = useWallet();

  // Load recent Supreme Court cases on mount
  useEffect(() => {
    loadRecentCases();
  }, []);

  const loadRecentCases = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/cases/supreme-court?days=90&limit=10');
      if (response.ok) {
        const cases = await response.json();
        setRecentCases(cases);
      }
    } catch (error) {
      console.error('Failed to load recent cases:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Try semantic search first (POST request)
      const semanticResponse = await fetch('http://localhost:8000/api/cases/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          court: 'scotus',
          limit: 20
        })
      });

      if (semanticResponse.ok) {
        const results = await semanticResponse.json();
        setSearchResults(results);
      } else {
        // Fallback to regular search (GET request)
        const regularResponse = await fetch(
          `http://localhost:8000/api/cases/?query=${encodeURIComponent(searchQuery)}&court=scotus&limit=20`
        );

        if (regularResponse.ok) {
          const data = await regularResponse.json();
          setSearchResults(data);
        } else {
          throw new Error('Search failed');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search cases. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarket = (case_: CourtCase) => {
    // TODO: Implement market creation flow
    alert(`Create market for: ${case_.caseName}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile Menu Button */}
      <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Navigation Header */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div></div>

              {/* Status & Controls */}
              <div className="flex items-center space-x-4">
                {/* Backend Status */}
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-full">
                  <div className={`w-2 h-2 rounded-full bg-green-500`}></div>
                  <span className="text-sm font-medium text-slate-700">CourtListener</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Court Cases</h1>
            <p className="text-slate-600">Search legal cases and create prediction markets</p>
          </div>

          {/* Search Interface */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">
                🔍 Search Court Cases
              </h2>
              <form onSubmit={handleSearch}>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for legal cases (e.g., 'social media regulation', 'environmental law')..."
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !searchQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>
              </form>
              <p className="text-sm text-slate-500 mt-3 text-center">
                Powered by CourtListener API with semantic search
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-6">
                Search Results ({searchResults.length})
              </h3>
              <div className="space-y-4">
                {searchResults.map((case_) => (
                  <div key={case_.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 mb-1">{case_.caseName}</h4>
                      <div className="flex items-center space-x-4 text-sm text-slate-600">
                        <span>{case_.court?.toUpperCase()}</span>
                        <span>{formatDate(case_.dateFiled)}</span>
                        {case_.docketNumber && <span>Docket: {case_.docketNumber}</span>}
                      </div>
                      {case_.snippet && (
                        <p className="text-sm text-slate-700 mt-2 line-clamp-2">{case_.snippet}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        case_.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {case_.status || 'Filed'}
                      </span>
                      <button
                        onClick={() => handleCreateMarket(case_)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Create Market
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured Case Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">🏛️</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Supreme Court</h3>
              <p className="text-sm text-slate-600">High-profile constitutional cases</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">⚖️</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Regulatory</h3>
              <p className="text-sm text-slate-600">SEC, FCC, and agency decisions</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">📜</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Constitutional</h3>
              <p className="text-sm text-slate-600">First Amendment and rights cases</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Corporate</h3>
              <p className="text-sm text-slate-600">Business law and litigation</p>
            </div>
          </div>

          {/* Recent Cases */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Recent Supreme Court Cases</h3>
            {recentCases.length > 0 ? (
              <div className="space-y-4">
                {recentCases.slice(0, 8).map((case_) => (
                  <div key={case_.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 mb-1">{case_.caseName}</h4>
                      <div className="flex items-center space-x-4 text-sm text-slate-600">
                        <span>{case_.court?.toUpperCase()}</span>
                        <span>{formatDate(case_.dateFiled)}</span>
                        {case_.docketNumber && <span>Docket: {case_.docketNumber}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        case_.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {case_.status || 'Filed'}
                      </span>
                      <button
                        onClick={() => handleCreateMarket(case_)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Create Market
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading recent cases...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
