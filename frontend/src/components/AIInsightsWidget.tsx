import React from 'react';

interface AIInsight {
  id: string;
  type: 'prediction' | 'trend' | 'alert';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  time: string;
  icon: string;
}

export function AIInsightsWidget() {
  // Mock data - will be replaced with real AI predictions
  const insights: AIInsight[] = [
    {
      id: '1',
      type: 'prediction',
      title: 'SCOTUS Environmental Case',
      description: 'AI predicts 78% chance of favorable ruling for environmental plaintiffs',
      confidence: 78,
      impact: 'high',
      time: '1 hour ago',
      icon: '🌱'
    },
    {
      id: '2',
      type: 'trend',
      title: 'Regulatory Momentum',
      description: 'Increasing SEC scrutiny on crypto markets detected in recent filings',
      confidence: 85,
      impact: 'medium',
      time: '3 hours ago',
      icon: '📈'
    },
    {
      id: '3',
      type: 'alert',
      title: 'Judge Pattern Detected',
      description: 'Judge Roberts shows 92% consistency with conservative rulings in tech cases',
      confidence: 92,
      impact: 'high',
      time: '6 hours ago',
      icon: '⚖️'
    },
    {
      id: '4',
      type: 'prediction',
      title: 'Antitrust Development',
      description: 'FTC merger challenge likely to succeed based on precedent analysis',
      confidence: 67,
      impact: 'medium',
      time: '12 hours ago',
      icon: '🏢'
    }
  ];

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
          <div key={insight.id} className="p-4 rounded-lg border border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-200 group/insight relative overflow-hidden">
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
                  <h4 className="text-sm font-semibold text-slate-200 font-mono group-hover/insight:text-white transition-colors duration-200">
                    {insight.title}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase border ${getImpactColor(insight.impact)}`}>
                    🠈 {insight.impact}
                  </span>
                </div>

                <p className="text-sm text-slate-400 mb-3 leading-relaxed font-light">
                  {insight.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
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

                  <span className="text-xs font-mono text-slate-500 uppercase">
                    {insight.time}
                  </span>
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
