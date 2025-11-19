'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { 
  Search, 
  Gavel, 
  Scale, 
  ScrollText, 
  Building2, 
  Plus, 
  Loader2, 
  AlertCircle,
  Terminal,
  FileText,
  Calendar
} from 'lucide-react';

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
    alert(`Initializing market creation protocol for: ${case_.caseName}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      
      {/* --- BACKGROUND FX --- */}
      <div className="cyber-grid-bg fixed inset-0 z-0" />
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        {/* Mobile Menu Button */}
        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 lg:ml-0">
          
          {/* Navigation Header */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Breadcrumb */}
                <div className="hidden md:flex items-center gap-2 text-sm font-mono text-slate-500">
                    <Terminal size={14} />
                    <span>PRECEDENCE_TERMINAL</span>
                    <span className="text-slate-700">/</span>
                    <span className="text-blue-400 uppercase">CASE_DISCOVERY</span>
                </div>

                {/* Status & Controls */}
                <div className="flex items-center space-x-4 ml-auto">
                  <div className="flex items-center space-x-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                    <div className={`w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]`}></div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      COURTLISTENER API: ONLINE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Court Cases</h1>
              <p className="text-slate-400">Search global dockets and initialize prediction markets.</p>
            </div>

            {/* Search Interface */}
            <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-8 mb-8">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold text-white mb-4 text-center flex items-center justify-center gap-2">
                  <Search size={20} className="text-blue-400" /> Semantic Docket Search
                </h2>
                <form onSubmit={handleSearch}>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search keywords (e.g., 'social media regulation', 'crypto fraud')..."
                            className="relative w-full px-4 py-3 bg-[#030304] border border-white/10 rounded-lg text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                            disabled={loading}
                        />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !searchQuery.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center min-w-[100px] justify-center"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin h-5 w-5" />
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </form>
                <p className="text-xs text-slate-500 mt-3 text-center font-mono">
                   INDEXING 2.4TB OF LEGAL DATA // REAL-TIME INGESTION
                </p>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                    <AlertCircle size={16} className="text-red-400" />
                    <p className="text-red-400 text-sm font-mono">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-[#0A0A0C]/80 backdrop-blur-md rounded-xl border border-white/10 p-8 mb-8">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                   Search Results <span className="text-slate-500 font-mono text-sm">({searchResults.length} FOUND)</span>
                </h3>
                <div className="space-y-3">
                  {searchResults.map((case_) => (
                    <div key={case_.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-white/5 bg-white/5 rounded-lg hover:border-blue-500/30 transition-all group">
                      <div className="flex-1 mb-4 md:mb-0">
                        <h4 className="font-medium text-white text-lg mb-1 group-hover:text-blue-400 transition-colors">{case_.caseName}</h4>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400 font-mono">
                          <span className="flex items-center gap-1"><Gavel size={12} /> {case_.court?.toUpperCase()}</span>
                          <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(case_.dateFiled)}</span>
                          {case_.docketNumber && <span className="flex items-center gap-1"><FileText size={12} /> DOCKET: {case_.docketNumber}</span>}
                        </div>
                        {case_.snippet && (
                          <div className="mt-2 p-2 bg-black/30 rounded border border-white/5 text-sm text-slate-400 line-clamp-2 font-mono text-xs">
                             {case_.snippet}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 md:ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono uppercase border ${
                          case_.status === 'Active' 
                             ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                             : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {case_.status || 'FILED'}
                        </span>
                        <button
                          onClick={() => handleCreateMarket(case_)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Plus size={14} /> Initialize
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                 {icon: Building2, label: 'Supreme Court', desc: 'Highest Federal Court'},
                 {icon: Scale, label: 'Regulatory', desc: 'SEC, FTC, EPA Actions'},
                 {icon: ScrollText, label: 'Constitutional', desc: 'Bill of Rights'},
                 {icon: Gavel, label: 'Criminal', desc: 'High-Profile Felony'}
              ].map((cat, i) => (
                 <div key={i} className="bg-white/5 rounded-xl border border-white/5 p-6 hover:border-blue-500/30 hover:bg-white/10 transition-all cursor-pointer group">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform">
                       <cat.icon size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{cat.label}</h3>
                    <p className="text-sm text-slate-400">{cat.desc}</p>
                 </div>
              ))}
            </div>

            {/* Recent Cases */}
            <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-8">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                 <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                 Recent Ingested Cases
              </h3>
              
              {recentCases.length > 0 ? (
                <div className="space-y-3">
                  {recentCases.slice(0, 8).map((case_) => (
                    <div key={case_.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-white/5 bg-white/5 rounded-lg hover:border-purple-500/30 transition-colors group">
                      <div className="flex-1 mb-3 md:mb-0">
                        <h4 className="font-medium text-white mb-1 group-hover:text-purple-400 transition-colors">{case_.caseName}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-mono text-xs">
                          <span>{case_.court?.toUpperCase()}</span>
                          <span>{formatDate(case_.dateFiled)}</span>
                          {case_.docketNumber && <span>{case_.docketNumber}</span>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                          case_.status === 'Active' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                        }`}>
                          {case_.status || 'FILED'}
                        </span>
                        <button
                          onClick={() => handleCreateMarket(case_)}
                          className="bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/10"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
                  <p className="text-slate-500 font-mono text-sm">SYNCING DOCKETS...</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
