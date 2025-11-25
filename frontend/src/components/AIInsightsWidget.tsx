const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AIInsight {
  id: string;
  type: 'prediction' | 'trend' | 'alert';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  time: string;
  icon: string;
  caseName?: string;
  judge?: string;
  caseId?: string;
}

export function AIInsightsWidget() {
  const router = useRouter();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'prediction': return '🤖';
      case 'trend': return '📈';
      case 'alert': return '🚨';
      default: return '⚖️';
    }
  };

  const getImpactFromConfidence = (confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  };

  const handleInsightClick = (insight: AIInsight) => {
    if (insight.caseId) {
      router.push(`/cases?highlight=${insight.caseId}`);
    }
  };

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch(`${API_URL}/api/predictions/insights?limit=4`);
        if (response.ok) {
          const data = await response.json();
          const insightsData = data.insights || [];

          const formattedInsights: AIInsight[] = insightsData.map((item: any, index: number) => ({
            id: item.case_id + item.timestamp + index,
            type: item.type || 'prediction',
            title: `${item.case_name} - ${item.judge}` || item.description?.slice(0, 30) + '...' || 'AI Analysis',
            description: item.detail || item.description || 'AI-powered legal analysis completed',
            confidence: item.confidence ? Math.round(item.confidence * 100) : 75,
            impact: getImpactFromConfidence(item.confidence || 0.75),
            time: item.timestamp || 'Recently',
            icon: getIconForType(item.type || 'prediction'),
            caseName: item.case_name,
            judge: item.judge,
            caseId: item.case_name // Using case_name as caseId for highlighting
          }));

          setInsights(formattedInsights);
        } else {
          console.error('Failed to fetch AI insights');
          // Fallback to minimal insight
          setInsights([{
            id: 'fallback',
            type: 'prediction',
            title: 'AI Analysis Active',
            description: 'Legal prediction models are processing case data',
            confidence: 85,
            impact: 'medium',
            time: 'Now',
            icon: '🤖'
          }]);
        }
      } catch (error) {
        console.error('Error fetching AI insights:', error);
        setInsights([{
          id: 'error',
          type: 'alert',
          title: 'Analysis Engine',
          description: 'Unable to load AI insights at this time',
          confidence: 50,
          impact: 'low',
          time: 'Now',
          icon: '⚠️'
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
    // Refresh every 5 minutes
    const interval = setInterval(fetchInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-[#0A0A0C]/60 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:border-cyan-500/30 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        {/* Animated glow line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <h3 className="text-lg font-semibold text-white font-mono">
          <span className="text-cyan-400">[AI]</span> NEURAL_INSIGHTS
        </h3>
        <div className="text-xs font-mono text-slate-400 uppercase bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full flex items-center space-x-1">
          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4] animate-pulse"></div>
          <span>PROCESSING</span>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            onClick={() => handleInsightClick(insight)}
            className={`p-4 rounded-lg border border-white/5 bg-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-200 group/insight cursor-pointer relative overflow-hidden ${
              insight.caseId ? 'hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]' : ''
            }`}
          >
            {/* Neural network accent */}
            <div className="absolute left-3 top-4 opacity-30 group-hover/insight:opacity-50 transition-opacity duration-300">
              <div className="text-[8px] font-mono text-cyan-500/50">
                o═══◎═══∘═══○═══◎═══∘
              </div>
            </div>

            <div className="flex items-start space-x-3 relative z-10">
              <div className="text-lg group-hover/insight:scale-110 transition-transform duration-200">
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-sm font-semibold text-slate-200 font-mono group-hover/insight:text-white transition-colors duration-200 truncate">
                    {insight.title}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase border ${getImpactColor(insight.impact)}`}>
                    🠈 {insight.impact}
                  </span>
                </div>

                <p className="text-sm text-slate-400 mb-3 leading-relaxed font-light group-hover/insight:text-slate-300">
                  {insight.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-mono text-slate-500 uppercase">CONFIDENCE:</span>
                      <span className={`text-sm font-mono font-bold ${getConfidenceColor(insight.confidence)}`}>
                        {insight.confidence}%
                      </span>
                    </div>
                    <div className="w-16 h-2 bg-white/10 border border-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_4px_rgba(6,182,212,0.5)]"
                        style={{ width: `${insight.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-mono text-slate-500 uppercase">
                      {insight.time}
                    </span>
                    {/* Navigation arrow - only show if clickable */}
                    {insight.caseId && (
                      <div className="opacity-0 group-hover/insight:opacity-100 transition-opacity duration-200">
                        <span className="text-cyan-400 text-sm font-bold">→</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <button className="w-full text-sm font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center group hover:scale-105 transform duration-200">
          <span className="group-hover:mr-1 transition-all duration-200">VIEW_ALL_AI_INSIGHTS</span>
          <span className="font-bold">{'>'}</span>
        </button>
      </div>
    </div>
  );
}
