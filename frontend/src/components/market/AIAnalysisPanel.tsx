'use client';

import { useState } from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Scale,
  Zap
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AIAnalysis {
  market_type: string;
  predicted_outcome: string;
  ai_probability: number;
  market_probability: number;
  edge: number;
  edge_direction: string;
  confidence: number;
  reasoning: string;
  key_factors: string[];
  bull_case?: string;
  bear_case?: string;
  risk_assessment: string;
  time_sensitivity?: string;
  analysis_method: string;
  // For multi-outcome
  outcome_probabilities?: Record<string, number>;
  best_value?: string;
}

interface AIAnalysisPanelProps {
  marketId: string;
  marketQuestion: string;
  currentYesPrice: number;
  currentNoPrice: number;
  description?: string;
  volume?: number;
  endDate?: string;
  outcomes?: any[];
}

export default function AIAnalysisPanel({
  marketId,
  marketQuestion,
  currentYesPrice,
  currentNoPrice,
  description,
  volume,
  endDate,
  outcomes
}: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/predictions/analyze-market`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          market_id: marketId,
          question: marketQuestion,
          description: description,
          current_yes_price: currentYesPrice,
          current_no_price: currentNoPrice,
          volume: volume,
          end_date: endDate,
          outcomes: outcomes
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze market');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Get edge color
  const getEdgeColor = (edge: number) => {
    const absEdge = Math.abs(edge);
    if (absEdge < 0.03) return 'text-gray-400';
    if (edge > 0) return 'text-green-400';
    return 'text-red-400';
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.75) return 'text-green-400';
    if (confidence >= 0.5) return 'text-yellow-400';
    return 'text-orange-400';
  };

  // Get risk badge color
  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-[#12131A] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <BrainCircuit size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              AI Analysis
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-mono uppercase">
                GPT-4
              </span>
            </h3>
            <p className="text-xs text-gray-500">Get AI-powered probability estimates and edge detection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <div className={`text-sm font-mono font-bold ${getEdgeColor(analysis.edge)}`}>
              {analysis.edge > 0 ? '+' : ''}{(analysis.edge * 100).toFixed(1)}% edge
            </div>
          )}
          {expanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Not analyzed yet */}
          {!analysis && !loading && !error && (
            <div className="text-center py-6">
              <div className="inline-flex p-4 rounded-full bg-purple-500/10 mb-4">
                <Sparkles size={32} className="text-purple-400" />
              </div>
              <p className="text-gray-400 mb-4">
                Our AI will analyze this market and compare its probability estimate to the current market price to identify potential trading opportunities.
              </p>
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-purple-500/25"
              >
                <BrainCircuit size={18} />
                Analyze Market
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-gray-400 font-mono text-sm">ANALYZING_MARKET...</p>
              <p className="text-gray-600 text-xs mt-2">This may take a few seconds</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-6">
              <AlertTriangle size={32} className="text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={runAnalysis}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && !loading && (
            <div className="space-y-4">
              
              {/* Main Prediction Card */}
              <div className="grid grid-cols-2 gap-4">
                {/* AI Estimate */}
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit size={14} className="text-purple-400" />
                    <span className="text-xs text-purple-400 uppercase font-mono">AI Estimate</span>
                  </div>
                  <div className="text-3xl font-mono font-bold text-white mb-1">
                    {(analysis.ai_probability * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    {analysis.predicted_outcome}
                  </div>
                </div>

                {/* Market Price */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-400 uppercase font-mono">Market Price</span>
                  </div>
                  <div className="text-3xl font-mono font-bold text-white mb-1">
                    {(analysis.market_probability * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Current YES price
                  </div>
                </div>
              </div>

              {/* Edge Detection */}
              <div className={`rounded-xl p-4 border ${
                Math.abs(analysis.edge) >= 0.03 
                  ? analysis.edge > 0 
                    ? 'bg-green-900/20 border-green-500/30' 
                    : 'bg-red-900/20 border-red-500/30'
                  : 'bg-gray-800/50 border-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {Math.abs(analysis.edge) >= 0.03 ? (
                      analysis.edge > 0 ? (
                        <TrendingUp size={24} className="text-green-400" />
                      ) : (
                        <TrendingDown size={24} className="text-red-400" />
                      )
                    ) : (
                      <Scale size={24} className="text-gray-400" />
                    )}
                    <div>
                      <div className={`text-lg font-bold ${getEdgeColor(analysis.edge)}`}>
                        {analysis.edge_direction}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.abs(analysis.edge) >= 0.03 
                          ? `AI sees ${Math.abs(analysis.edge * 100).toFixed(1)}% mispricing`
                          : 'Market appears fairly priced'
                        }
                      </div>
                    </div>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${getEdgeColor(analysis.edge)}`}>
                    {analysis.edge > 0 ? '+' : ''}{(analysis.edge * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Confidence & Risk */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 uppercase mb-1">Confidence</div>
                  <div className={`text-xl font-mono font-bold ${getConfidenceColor(analysis.confidence)}`}>
                    {(analysis.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 uppercase mb-1">Risk Level</div>
                  <span className={`inline-block px-2 py-0.5 rounded border text-sm font-medium ${getRiskBadgeColor(analysis.risk_assessment)}`}>
                    {analysis.risk_assessment?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              {/* Reasoning */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-yellow-400" />
                  <span className="text-xs text-gray-400 uppercase font-mono">AI Reasoning</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {analysis.reasoning}
                </p>
              </div>

              {/* Key Factors */}
              {analysis.key_factors && analysis.key_factors.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 uppercase mb-3 font-mono">Key Factors</div>
                  <ul className="space-y-2">
                    {analysis.key_factors.map((factor, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bull/Bear Cases */}
              {(analysis.bull_case || analysis.bear_case) && (
                <div className="grid grid-cols-2 gap-4">
                  {analysis.bull_case && (
                    <div className="bg-green-900/10 rounded-lg p-3 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-green-400" />
                        <span className="text-xs text-green-400 uppercase font-mono">Bull Case</span>
                      </div>
                      <p className="text-sm text-gray-300">{analysis.bull_case}</p>
                    </div>
                  )}
                  {analysis.bear_case && (
                    <div className="bg-red-900/10 rounded-lg p-3 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown size={14} className="text-red-400" />
                        <span className="text-xs text-red-400 uppercase font-mono">Bear Case</span>
                      </div>
                      <p className="text-sm text-gray-300">{analysis.bear_case}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Time Sensitivity */}
              {analysis.time_sensitivity && (
                <div className="bg-blue-900/10 rounded-lg p-3 border border-blue-500/20">
                  <div className="text-xs text-blue-400 uppercase mb-1 font-mono">Time Sensitivity</div>
                  <p className="text-sm text-gray-300">{analysis.time_sensitivity}</p>
                </div>
              )}

              {/* Re-analyze button */}
              <button
                onClick={runAnalysis}
                className="w-full py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <BrainCircuit size={14} />
                Re-analyze Market
              </button>

              {/* Disclaimer */}
              <p className="text-[10px] text-gray-600 text-center">
                AI analysis is for informational purposes only. Not financial advice. Always DYOR.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
