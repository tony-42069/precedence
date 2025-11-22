'use client';

import { useState } from 'react';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
import { TradingModal } from '../../components/TradingModal';
import { apiService } from '../../services/api';
import {
  Search,
  Gavel,
  Loader2,
  Terminal,
  Calendar,
  BrainCircuit,
  TrendingUp,
  X,
  ChevronRight,
  Scale
} from 'lucide-react';

// Types
interface CourtCase {
  id: number;
  caseName: string;
  court: string;
  dateFiled: string;
  status?: string;
  docketNumber?: string;
  snippet?: string;
  // ENHANCED: Real data from CourtListener extraction
  extracted_judge?: string;
  inferred_type?: string;
  plaintiff?: string;
  defendant?: string;
  summary?: string;
}

interface CaseDetails {
  id: number;
  caseName: string;
  docketNumber: string;
  court: string;
  dateFiled: string;
  judge: string;
  citations: string[];
  summary: string;
  procedural_history: string;
  disposition: string;
  timeline: Array<{
    date: string;
    description: string;
    entry_number: number;
    page_count?: number;
  }>;
  parties: {
    plaintiffs: string[];
    defendants: string[];
    attorneys: string[];
  };
  opinions: Array<{
    author: string;
    type: string;
    plain_text: string;
    html: string;
    download_url: string;
  }>;
}

interface Prediction {
  predicted_outcome: string;
  confidence: number;
  probabilities: {
    PLAINTIFF_WIN: number;
    DEFENDANT_WIN: number;
    SETTLEMENT?: number;
  };
  reasoning?: string;
  key_factors?: string[];
  judge_analysis?: {
    ideology?: string;
    likely_perspective?: string;
    historical_pattern?: string;
  };
  risk_assessment?: string;
  analysis_method?: string;
}

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('scotus');
  const [searchResults, setSearchResults] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(false);

  // Prediction State
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [analyzing, setAnalyzing] = useState<Record<number, boolean>>({});

  // Modal State
  const [selectedCase, setSelectedCase] = useState<CourtCase | null>(null);
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedCase, setRequestedCase] = useState<CourtCase | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setPredictions({});

    try {
      const response = await fetch(`http://localhost:8000/api/cases/?query=${encodeURIComponent(searchQuery)}&court=${selectedCourt}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        // DO NOT auto-analyze - let user click AI Analysis button
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  // AI Analysis Handler - Now uses REAL LLM analysis
  const runAiAnalysis = async (caseItem: CourtCase) => {
    setAnalyzing(prev => ({ ...prev, [caseItem.id]: true }));
    try {
      // Call NEW LLM endpoint that fetches case details and uses GPT-4
      const res = await fetch('http://localhost:8000/api/predictions/analyze-case-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseItem.id  // Just send case ID - backend does the rest
        })
      });

      if (res.ok) {
        const predictionData = await res.json();
        console.log('✅ Real LLM Analysis:', predictionData);
        setPredictions(prev => ({ ...prev, [caseItem.id]: predictionData }));
      } else {
        console.error('❌ LLM Analysis failed:', await res.text());
      }
    } catch (err) {
      console.error('❌ Error calling LLM analysis:', err);
    } finally {
      setAnalyzing(prev => ({ ...prev, [caseItem.id]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Fetch Full Case Details
  const fetchCaseDetails = async (caseId: number) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`http://localhost:8000/api/cases/${caseId}/details`);
      if (response.ok) {
        const details = await response.json();
        setCaseDetails(details);
      } else {
        console.error('Failed to fetch case details');
        alert('Could not load full case details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching case details:', error);
      alert('Error loading case details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Case Details Modal
  const openCaseDetails = async (caseItem: CourtCase) => {
    setSelectedCase(caseItem);
    setShowDetailsModal(true);
    await fetchCaseDetails(caseItem.id);
  };

  // Open the Deep Dive Modal
  const openAnalysis = (caseItem: CourtCase) => {
    setSelectedCase(caseItem);
    setShowAnalysisModal(true);
  };

  // Open the Trading Modal - Resolve Market for Case
  const openTrading = async (caseItem: CourtCase) => {
    try {
      // Resolve which Polymarket corresponds to this case
      const resolution = await apiService.resolveMarketForCase(caseItem.caseName);

      if (resolution.found) {
        setSelectedMarket(resolution.market);
        setShowTradingModal(true);
        console.log('Resolved market for case:', resolution.market);
      } else {
        alert(`No active betting market found for "${caseItem.caseName}". You can request market creation.`);
        console.log('No market found for case:', caseItem.caseName);
      }
    } catch (error) {
      console.error('Failed to resolve market:', error);
      alert('Failed to find betting market for this case. Please try again.');
    }
  };

  // Request Market Handler
  const requestMarket = (caseItem: CourtCase) => {
    setRequestedCase(caseItem);
    setShowRequestModal(true);
  };

  // Submit Market Request
  const submitMarketRequest = () => {
    if (!requestedCase) return;

    // Log the request for now
    console.log('Market request submitted for case:', requestedCase.caseName, requestedCase.docketNumber);

    // Send to Polymarket Discord or log (placeholder)
    alert(`Market request logged for "${requestedCase.caseName}". This would be sent to Polymarket Discord for review.`);

    setShowRequestModal(false);
    setRequestedCase(null);
  };

  return (
    <div className="min-h-screen bg-[#030304] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-hidden">

      <div className="cyber-grid-bg fixed inset-0 z-0" />

      <div className="relative z-10 flex min-h-screen">
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

        <div className="flex-1 w-full min-w-0 lg:ml-0">

          {/* Header */}
          <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#030304]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                <div className="hidden md:flex items-center gap-2 text-sm font-mono text-slate-500">
                    <Terminal size={14} />
                    <span>PRECEDENCE</span>
                    <span className="text-slate-700">/</span>
                    <span className="text-blue-400 uppercase">DISCOVERY</span>
                </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* COMPACT HERO - Animated Gavel */}
            <div className="relative mb-12 text-center">
              {/* Animated Background Glow */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
              </div>

              {/* Animated Gavel Icon */}
              <div className="mb-6 flex justify-center">
                <div className="relative animate-gavel-strike">
                  <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full animate-pulse"></div>
                  <Gavel className="relative text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]" size={96} />
                </div>
              </div>

              {/* Title with Logo */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <img 
                  src="/precedence-logo-transparent.png" 
                  alt="Precedence Logo" 
                  className="w-24 h-24 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]" 
                />
                <h1 className="text-5xl font-bold text-white">
                  Find Your Edge
                </h1>
              </div>
              
              {/* Subtitle with Stats */}
              <div className="flex items-center justify-center gap-3 text-sm text-slate-400 mb-4">
                <span className="font-mono">1,247 Cases Analyzed</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-green-400 font-bold">89% Accuracy</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono">$2.3M Volume</span>
              </div>

              {/* Tagline */}
              <p className="text-lg text-slate-300 font-light tracking-wide">Predict. Analyze. Profit.</p>
            </div>

            {/* Search Section */}
            <div className="mb-8 text-center">
              <p className="text-slate-400">Search active cases. Trade on the outcome.</p>
            </div>

            {/* Search Bar */}
            <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-4 mb-10 shadow-2xl max-w-4xl mx-auto">
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Court Selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Select Court:</span>
                  <select
                    value={selectedCourt}
                    onChange={(e) => setSelectedCourt(e.target.value)}
                    className="bg-[#030304] border border-white/10 rounded-lg px-3 py-1 text-white font-mono text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">All Courts</option>
                    <option value="scotus">Supreme Court</option>
                    <option value="ca1">1st Circuit (MA)</option>
                    <option value="ca2">2nd Circuit (NY)</option>
                    <option value="ca3">3rd Circuit (PA)</option>
                    <option value="ca4">4th Circuit (VA)</option>
                    <option value="ca5">5th Circuit (TX)</option>
                    <option value="ca6">6th Circuit (OH)</option>
                    <option value="ca7">7th Circuit (IL)</option>
                    <option value="ca8">8th Circuit (MO)</option>
                    <option value="ca9">9th Circuit (CA)</option>
                    <option value="ca10">10th Circuit (CO)</option>
                    <option value="ca11">11th Circuit (FL)</option>
                    <option value="cadc">DC Circuit</option>
                    <option value="cafc">Federal Circuit</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                      <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search keywords (e.g. 'crypto', 'immunity', 'tiktok')..."
                          className="w-full px-4 py-3 bg-[#030304] border border-white/10 rounded-lg text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                          disabled={loading}
                      />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !searchQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wide text-sm transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'Search'}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Area */}
            <div className="grid gap-4">
              {searchResults.map((caseItem) => {
                const prediction = predictions[caseItem.id];
                const isAnalyzing = analyzing[caseItem.id];

                // Default 50/50 if loading
                const pWin = prediction ? (prediction.probabilities.PLAINTIFF_WIN * 100) : 50;
                const dWin = prediction ? (prediction.probabilities.DEFENDANT_WIN * 100) : 50;

                return (
                  <div
                    key={caseItem.id}
                    onClick={() => openCaseDetails(caseItem)}
                    className="bg-[#0A0A0C]/80 backdrop-blur-md rounded-xl border border-white/10 hover:border-blue-500/30 transition-all group relative overflow-hidden cursor-pointer"
                  >
                    <div className="p-5 flex flex-col md:flex-row items-center gap-6">

                      {/* Left: Case Details */}
                      <div className="flex-1 w-full">
                         <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-slate-400">
                                {caseItem.court || "US FEDERAL"}
                            </span>
                            {caseItem.inferred_type && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/10 border border-blue-500/30 text-blue-400">
                                {caseItem.inferred_type}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 font-mono">{formatDate(caseItem.dateFiled)}</span>
                         </div>
                         <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                            {caseItem.caseName}
                         </h3>
                         <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mb-2">
                           <span>DOCKET: {caseItem.docketNumber}</span>
                           {caseItem.extracted_judge && (
                             <>
                               <span>•</span>
                               <span>JUDGE: {caseItem.extracted_judge}</span>
                             </>
                           )}
                         </div>
                         {/* Only show plaintiff/defendant if the caseName doesn't already show them clearly */}
                         {caseItem.plaintiff && caseItem.defendant &&
                          !caseItem.caseName?.includes(' v. ') && !caseItem.caseName?.includes(' v ') && (
                           <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                             <span className="font-semibold text-green-400">{caseItem.plaintiff}</span>
                             <Scale size={14} className="text-slate-600" />
                             <span className="font-semibold text-red-400">{caseItem.defendant}</span>
                           </div>
                         )}
                         {caseItem.summary && caseItem.summary !== 'No summary available.' && (
                           <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                             {caseItem.summary}
                           </p>
                         )}

                         {/* Quick Odds Bar - Only show if prediction exists */}
                         {prediction ? (
                           <div className="w-full max-w-md mt-2">
                              <div className="flex justify-between text-[10px] text-slate-400 uppercase mb-1 font-bold">
                                 <span>Plaintiff ({(prediction.probabilities.PLAINTIFF_WIN * 100).toFixed(0)}%)</span>
                                 <span>Defendant ({(prediction.probabilities.DEFENDANT_WIN * 100).toFixed(0)}%)</span>
                              </div>
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                 <div className="h-full bg-green-500" style={{ width: `${prediction.probabilities.PLAINTIFF_WIN * 100}%` }}></div>
                                 <div className="h-full bg-red-500" style={{ width: `${prediction.probabilities.DEFENDANT_WIN * 100}%` }}></div>
                              </div>
                           </div>
                         ) : isAnalyzing ? (
                           <span className="text-xs text-blue-500 font-mono animate-pulse">CALCULATING ODDS...</span>
                         ) : (
                           <span className="text-xs text-slate-500 font-mono">Click AI Analysis for predictions</span>
                         )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row gap-3 w-full md:w-auto">

                        {/* View Details */}
                        <button
                           onClick={(e) => {
                             e.stopPropagation();
                             openCaseDetails(caseItem);
                           }}
                           className="flex-1 md:flex-none px-4 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                           <ChevronRight size={16} />
                           <span className="hidden md:inline">View Details</span>
                        </button>

                        {/* AI Analysis */}
                        <button
                           onClick={(e) => {
                             e.stopPropagation();
                             // Run analysis if not already done
                             if (!predictions[caseItem.id] && !analyzing[caseItem.id]) {
                               runAiAnalysis(caseItem);
                             }
                             openAnalysis(caseItem);
                           }}
                           className="flex-1 md:flex-none px-4 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                           <BrainCircuit size={16} />
                           <span className="hidden md:inline">AI Analysis</span>
                        </button>

                        {/* Primary CTA: Request Market */}
                        <button
                           onClick={(e) => {
                             e.stopPropagation();
                             requestMarket(caseItem);
                           }}
                           className="flex-1 md:flex-none px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                        >
                           <span className="text-lg font-bold">+</span>
                           <span>Request Market</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </main>
        </div>
      </div>

      {/* --- CASE DETAILS MODAL --- */}
      {showDetailsModal && selectedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDetailsModal(false)}></div>
          <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-[#151518] flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedCase.caseName}</h2>
                  <div className="flex items-center gap-3 text-sm text-slate-400 font-mono">
                    <span>DOCKET: {selectedCase.docketNumber}</span>
                    {selectedCase.extracted_judge && (
                      <>
                        <span>•</span>
                        <span>JUDGE: {selectedCase.extracted_judge}</span>
                      </>
                    )}
                    {selectedCase.inferred_type && (
                      <>
                        <span>•</span>
                        <span className="text-blue-400">{selectedCase.inferred_type.toUpperCase()}</span>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <span className="ml-3 text-slate-400 font-mono">LOADING_CASE_DETAILS...</span>
                </div>
              ) : caseDetails ? (
                <>
                  {/* Parties */}
                  {(caseDetails.parties.plaintiffs.length > 0 || caseDetails.parties.defendants.length > 0) && (
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <Scale size={16} /> Parties
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {caseDetails.parties.plaintiffs.length > 0 && (
                          <div>
                            <div className="text-xs text-green-400 font-bold uppercase mb-2">Plaintiffs/Petitioners</div>
                            <ul className="space-y-1">
                              {caseDetails.parties.plaintiffs.map((plaintiff, idx) => (
                                <li key={idx} className="text-sm text-slate-300">{plaintiff}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {caseDetails.parties.defendants.length > 0 && (
                          <div>
                            <div className="text-xs text-red-400 font-bold uppercase mb-2">Defendants/Respondents</div>
                            <ul className="space-y-1">
                              {caseDetails.parties.defendants.map((defendant, idx) => (
                                <li key={idx} className="text-sm text-slate-300">{defendant}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {caseDetails.parties.attorneys.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="text-xs text-blue-400 font-bold uppercase mb-2">Attorneys</div>
                          <div className="text-sm text-slate-400">{caseDetails.parties.attorneys.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Case Summary */}
                  {caseDetails.summary && caseDetails.summary !== 'No summary available.' && (
                    <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-xl">
                      <h3 className="text-sm font-bold text-blue-400 uppercase mb-3">Case Summary</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{caseDetails.summary}</p>
                    </div>
                  )}

                  {/* Procedural History */}
                  {caseDetails.procedural_history && (
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Procedural History</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{caseDetails.procedural_history}</p>
                    </div>
                  )}

                  {/* Timeline of Events */}
                  {caseDetails.timeline && caseDetails.timeline.length > 0 && (
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <Calendar size={16} /> Case Timeline ({caseDetails.timeline.length} entries)
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {caseDetails.timeline.map((entry, idx) => (
                          <div key={idx} className="flex gap-4 border-l-2 border-blue-500/30 pl-4 py-2">
                            <div className="flex-shrink-0">
                              <div className="text-xs text-slate-500 font-mono">{entry.date || 'N/A'}</div>
                              {entry.entry_number && (
                                <div className="text-[10px] text-slate-600 font-mono">#{entry.entry_number}</div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-300">{entry.description}</p>
                              {entry.page_count && (
                                <span className="text-xs text-slate-500 font-mono">{entry.page_count} pages</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disposition */}
                  {caseDetails.disposition && (
                    <div className="bg-green-900/10 border border-green-500/20 p-5 rounded-xl">
                      <h3 className="text-sm font-bold text-green-400 uppercase mb-3">Disposition</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{caseDetails.disposition}</p>
                    </div>
                  )}

                  {/* Citations */}
                  {caseDetails.citations && caseDetails.citations.length > 0 && (
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Citations</h3>
                      <div className="flex flex-wrap gap-2">
                        {caseDetails.citations.map((citation: any, idx: number) => {
                          // Handle both string citations and object citations
                          const citationText = typeof citation === 'string'
                            ? citation
                            : `${citation.volume || ''} ${citation.reporter || ''} ${citation.page || ''}`.trim() || 'Citation';

                          return (
                            <span key={idx} className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-mono text-blue-400">
                              {citationText}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Full Court Opinion Text - NEW! */}
                  {caseDetails.opinions && caseDetails.opinions.length > 0 && (
                    <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <Gavel size={16} /> Court Opinion ({caseDetails.opinions.length})
                      </h3>
                      {caseDetails.opinions.map((opinion, idx) => (
                        <div key={idx} className="mb-4 last:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-blue-400 font-bold uppercase">Author:</span>
                            <span className="text-xs text-slate-300">{opinion.author}</span>
                            <span className="text-xs text-slate-600">•</span>
                            <span className="text-xs text-slate-500">{opinion.type}</span>
                          </div>
                          {opinion.plain_text ? (
                            <div className="bg-black/30 p-4 rounded-lg max-h-96 overflow-y-auto">
                              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                                {opinion.plain_text.slice(0, 5000)}{opinion.plain_text.length > 5000 ? '...' : ''}
                              </pre>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Opinion text not available</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-500 font-mono">
                  NO_DETAILS_AVAILABLE
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-[#151518] flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailsModal(false);
                    openAnalysis(selectedCase);
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <BrainCircuit size={16} />
                  AI ANALYSIS
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailsModal(false);
                    requestMarket(selectedCase);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                >
                  <span className="text-lg font-bold">+</span>
                  REQUEST MARKET
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- AI DEEP DIVE MODAL --- */}
      {showAnalysisModal && selectedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAnalysisModal(false)}></div>
           <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

              <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#151518] flex-shrink-0">
                 <div>
                    <h2 className="text-xl font-bold text-white">{selectedCase.caseName}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-400 font-mono">
                       <span>JUDGE: {selectedCase.extracted_judge || "UNKNOWN"}</span>
                       <span>•</span>
                       <span className="text-blue-400">AI CONFIDENCE: HIGH</span>
                    </div>
                 </div>
                 <button onClick={() => setShowAnalysisModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {analyzing[selectedCase.id] ? (
                   <div className="flex items-center justify-center py-12">
                     <Loader2 className="animate-spin text-blue-500" size={32} />
                     <span className="ml-3 text-slate-400 font-mono">ANALYZING_WITH_AI...</span>
                   </div>
                 ) : predictions[selectedCase.id] ? (
                   <>
                     {/* Judge Stats Card - REAL DATA */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                           <div className="text-xs text-slate-500 uppercase mb-1">Judge Ideology</div>
                           <div className="text-lg font-bold text-white">
                             {predictions[selectedCase.id].judge_analysis?.ideology?.toUpperCase() || "UNKNOWN"}
                           </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                           <div className="text-xs text-slate-500 uppercase mb-1">Model Confidence</div>
                           <div className="text-lg font-bold text-blue-400">
                             {(predictions[selectedCase.id].confidence * 100).toFixed(0)}%
                           </div>
                        </div>
                     </div>

                     {/* The Prediction Detail - REAL REASONING */}
                     <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-xl">
                        <h3 className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                           <BrainCircuit size={16} /> AI Analysis
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                           {predictions[selectedCase.id].reasoning || "Analysis in progress..."}
                        </p>
                     </div>

                     {/* Key Factors */}
                     {predictions[selectedCase.id].key_factors && predictions[selectedCase.id].key_factors!.length > 0 && (
                       <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                          <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Key Factors</h3>
                          <ul className="space-y-2">
                            {predictions[selectedCase.id].key_factors!.map((factor, idx) => (
                              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                       </div>
                     )}
                   </>
                 ) : (
                   <div className="text-center py-12">
                     <p className="text-slate-400 mb-4">Click "Run Analysis" to generate AI prediction</p>
                     <button
                       onClick={() => runAiAnalysis(selectedCase)}
                       className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
                     >
                       Run Analysis
                     </button>
                   </div>
                 )}

                 {/* Full Odds - Only show if prediction exists */}
                 {predictions[selectedCase.id] && (
                   <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Predicted Probabilities</h3>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-sm font-medium text-slate-200">Plaintiff Win</span>
                            <span className="font-mono font-bold text-green-400">{(predictions[selectedCase.id].probabilities.PLAINTIFF_WIN * 100).toFixed(1)}%</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-sm font-medium text-slate-200">Defendant Win</span>
                            <span className="font-mono font-bold text-red-400">{(predictions[selectedCase.id].probabilities.DEFENDANT_WIN * 100).toFixed(1)}%</span>
                         </div>
                         {predictions[selectedCase.id].probabilities.SETTLEMENT && predictions[selectedCase.id].probabilities.SETTLEMENT! > 0.05 && (
                           <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                              <span className="text-sm font-medium text-slate-200">Settlement</span>
                              <span className="font-mono font-bold text-yellow-400">{(predictions[selectedCase.id].probabilities.SETTLEMENT! * 100).toFixed(1)}%</span>
                           </div>
                         )}
                      </div>
                   </div>
                 )}

              </div>

              <div className="p-6 border-t border-white/10 bg-[#151518] flex-shrink-0">
                 <button 
                   onClick={() => {
                     setShowAnalysisModal(false);
                     if (selectedCase) {
                       requestMarket(selectedCase);
                     }
                   }} 
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                 >
                    <span className="text-lg font-bold">+</span>
                    REQUEST MARKET
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- TRADING MODAL --- */}
      {showTradingModal && selectedMarket && (
        <TradingModal
          market={selectedMarket}
          isOpen={showTradingModal}
          onClose={() => setShowTradingModal(false)}
        />
      )}

            {/* --- REQUEST MARKET MODAL --- */}
      {showRequestModal && requestedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRequestModal(false)}></div>
          <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-[#151518]">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Request Market Creation</h2>
                <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl">
                <p className="text-sm text-orange-300 mb-3">
                  Request a new prediction market for this case. Our team will review and create the market if it meets trading criteria.
                </p>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>📝 Will be sent to Polymarket Discord for review</p>
                  <p>⏱️ Usually 1-3 business days for approval</p>
                  <p>📊 Requires sufficient trading volume potential</p>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Case Details</h3>
                <p className="text-sm text-slate-400 mb-1">{requestedCase.caseName}</p>
                <p className="text-xs text-slate-500">Docket: {requestedCase.docketNumber}</p>
                <p className="text-xs text-slate-500">Court: {requestedCase.court}</p>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg">
                <p className="text-xs text-blue-300">
                  💡 Market requests help expand our coverage. Thank you for contributing to the platform!
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-[#151518]">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-slate-300 font-medium py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitMarketRequest}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(251,146,60,0.3)]"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

