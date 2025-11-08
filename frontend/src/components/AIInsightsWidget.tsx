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
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-600">Analyzing</span>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
            <div className="flex items-start space-x-3">
              <div className="text-lg">{insight.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {insight.title}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getImpactColor(insight.impact)}`}>
                    {insight.impact.toUpperCase()}
                  </span>
                </div>

                <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                  {insight.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-slate-500">Confidence:</span>
                      <span className={`text-sm font-semibold ${getConfidenceColor(insight.confidence)}`}>
                        {insight.confidence}%
                      </span>
                    </div>
                    <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${insight.confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  <span className="text-xs text-slate-500">
                    {insight.time}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All AI Insights →
        </button>
      </div>
    </div>
  );
}
