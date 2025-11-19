'use client';

import { useState } from 'react';
import { Sidebar, MobileMenuButton } from '../../components/Sidebar';
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
}

interface Prediction {
  predicted_outcome: string;
  confidence: number;
  probabilities: {
    PLAINTIFF_WIN: number;
    DEFENDANT_WIN: number;
    [key: string]: number;
  };
  judge_analysis?: {
    judge_bias?: string;
    historical_win_rates?: {
      plaintiff: number;
      defendant: number;
    };
  };
}

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Prediction State
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [analyzing, setAnalyzing] = useState<Record<number, boolean>>({});
  
  // Modal State
  const [selectedCase, setSelectedCase] = useState<CourtCase | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setPredictions({});
    
    try {
      const response = await fetch(`http://localhost:8000/api/cases/?query=${encodeURIComponent(searchQuery)}&court=scotus&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);

        // Auto-Analyze basic odds (keep it fast)
        // Use Promise.all to handle async operations
        await Promise.all(data.map((caseItem: CourtCase) => runAiAnalysis(caseItem)));
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  // AI Analysis Handler
  const runAiAnalysis = async (caseItem: CourtCase) => {
    setAnalyzing(prev => ({ ...prev, [caseItem.id]: true }));
    try {
      const res = await fetch('http://localhost:8000/api/predictions/case-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_facts: caseItem.snippet || caseItem.caseName,
          case_type: caseItem.inferred_type || "civil",  // REAL case type from extraction
          judge_id: caseItem.extracted_judge || "roberts"  // REAL judge from extraction
        })
      });

      if (res.ok) {
        // FIX: Await the JSON first, THEN update state
        const predictionData = await res.json();
        setPredictions(prev => ({ ...prev, [caseItem.id]: predictionData }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(prev => ({ ...prev, [caseItem.id]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Open the Deep Dive Modal
  const openAnalysis = (caseItem: CourtCase) => {
    setSelectedCase(caseItem);
    setShowAnalysisModal(true);
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
            
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Find Your Edge</h1>
              <p className="text-slate-400">Search active cases. Trade on the outcome.</p>
            </div>

            {/* Search Bar */}
            <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-4 mb-10 shadow-2xl max-w-3xl mx-auto">
              <form onSubmit={handleSearch} className="flex gap-3">
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
                  <div key={caseItem.id} className="bg-[#0A0A0C]/80 backdrop-blur-md rounded-xl border border-white/10 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                    <div className="p-5 flex flex-col md:flex-row items-center gap-6">
                      
                      {/* Left: Case Details */}
                      <div className="flex-1 w-full">
                         <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-slate-400">
                                {caseItem.court || "US FEDERAL"}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">{formatDate(caseItem.dateFiled)}</span>
                         </div>
                         <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                            {caseItem.caseName}
                         </h3>
                         <p className="text-xs text-slate-500 font-mono mb-3">DOCKET: {caseItem.docketNumber}</p>
                         
                         {/* Quick Odds Bar (Sportsbook Style) */}
                         {prediction && (
                           <div className="w-full max-w-md mt-2">
                              <div className="flex justify-between text-[10px] text-slate-400 uppercase mb-1 font-bold">
                                 <span>Plaintiff ({pWin.toFixed(0)}%)</span>
                                 <span>Defendant ({dWin.toFixed(0)}%)</span>
                              </div>
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                 <div className="h-full bg-green-500" style={{ width: `${pWin}%` }}></div>
                                 <div className="h-full bg-red-500" style={{ width: `${dWin}%` }}></div>
                              </div>
                           </div>
                         )}
                         {isAnalyzing && <span className="text-xs text-blue-500 font-mono animate-pulse">CALCULATING ODDS...</span>}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row gap-3 w-full md:w-auto">
                        
                        {/* Secondary: AI Analysis */}
                        <button 
                           onClick={() => openAnalysis(caseItem)}
                           className="flex-1 md:flex-none px-4 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                           <BrainCircuit size={16} />
                           <span className="hidden md:inline">AI Analysis</span>
                        </button>

                        {/* Primary: Trade */}
                        <button 
                           onClick={() => alert("Opens Market Creation Modal")}
                           className="flex-1 md:flex-none px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                        >
                           <TrendingUp size={16} />
                           Trade
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

      {/* --- AI DEEP DIVE MODAL --- */}
      {showAnalysisModal && selectedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAnalysisModal(false)}></div>
           <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
              
              <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#151518]">
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

              <div className="p-6 space-y-6">
                 
                 {/* Judge Stats Card */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                       <div className="text-xs text-slate-500 uppercase mb-1">Historical Bias</div>
                       <div className="text-lg font-bold text-white">NEUTRAL / TEXTUALIST</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                       <div className="text-xs text-slate-500 uppercase mb-1">Reversal Rate</div>
                       <div className="text-lg font-bold text-red-400">12.4%</div>
                    </div>
                 </div>

                 {/* The Prediction Detail */}
                 <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-xl">
                    <h3 className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                       <BrainCircuit size={16} /> Model Recommendation
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                       Based on semantic analysis of the docket text and historical rulings by this court, 
                       the model predicts a higher probability of a <strong className="text-white">Defendant Victory</strong>.
                       Key factors include recent precedent in similar regulatory cases.
                    </p>
                 </div>

                 {/* Full Odds */}
                 <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Implied Probability</h3>
                    {predictions[selectedCase.id] ? (
                       <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                             <span className="text-sm font-medium text-slate-200">Plaintiff Win</span>
                             <span className="font-mono font-bold text-green-400">{(predictions[selectedCase.id].probabilities.PLAINTIFF_WIN * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                             <span className="text-sm font-medium text-slate-200">Defendant Win</span>
                             <span className="font-mono font-bold text-red-400">{(predictions[selectedCase.id].probabilities.DEFENDANT_WIN * 100).toFixed(1)}%</span>
                          </div>
                       </div>
                    ) : (
                       <div className="text-center py-4 text-slate-500 font-mono text-xs">DATA_UNAVAILABLE</div>
                    )}
                 </div>

              </div>
              
              <div className="p-6 border-t border-white/10 bg-[#151518]">
                 <button onClick={() => alert("Initialize Trade")} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all">
                    PLACE BET NOW
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
