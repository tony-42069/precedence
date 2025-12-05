'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, ArrowRight } from 'lucide-react';

interface JudgeProfile {
  id: string;
  name: string;
  court: string;
  nomination_year?: number;
  appointing_president?: string;
  cases_handled?: number;
  political_affiliation?: string;
  image?: string;
}

// SCOTUS Justice images from official Supreme Court or Wikipedia (public domain)
const SCOTUS_JUSTICES: JudgeProfile[] = [
  { id: 'john-roberts', name: 'John G. Roberts Jr.', court: 'Supreme Court', nomination_year: 2005, appointing_president: 'George W. Bush', cases_handled: 1847, political_affiliation: 'Conservative', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Official_roberts_CJ.jpg/220px-Official_roberts_CJ.jpg' },
  { id: 'clarence-thomas', name: 'Clarence Thomas', court: 'Supreme Court', nomination_year: 1991, appointing_president: 'George H.W. Bush', cases_handled: 2156, political_affiliation: 'Conservative', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Clarence_Thomas_official_SCOTUS_portrait_%28cropped%29.jpg/220px-Clarence_Thomas_official_SCOTUS_portrait_%28cropped%29.jpg' },
  { id: 'sonia-sotomayor', name: 'Sonia Sotomayor', court: 'Supreme Court', nomination_year: 2009, appointing_president: 'Barack Obama', cases_handled: 1432, political_affiliation: 'Liberal', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Sonia_Sotomayor_in_SCOTUS_robe_%28cropped%29.jpg/220px-Sonia_Sotomayor_in_SCOTUS_robe_%28cropped%29.jpg' },
  { id: 'elena-kagan', name: 'Elena Kagan', court: 'Supreme Court', nomination_year: 2010, appointing_president: 'Barack Obama', cases_handled: 1298, political_affiliation: 'Liberal', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Elena_Kagan_Official_SCOTUS_Portrait_%282013%29.jpg/220px-Elena_Kagan_Official_SCOTUS_Portrait_%282013%29.jpg' },
  { id: 'neil-gorsuch', name: 'Neil M. Gorsuch', court: 'Supreme Court', nomination_year: 2017, appointing_president: 'Donald Trump', cases_handled: 687, political_affiliation: 'Conservative', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Associate_Justice_Neil_Gorsuch_Official_Portrait_%28cropped%29.jpg/220px-Associate_Justice_Neil_Gorsuch_Official_Portrait_%28cropped%29.jpg' },
  { id: 'brett-kavanaugh', name: 'Brett M. Kavanaugh', court: 'Supreme Court', nomination_year: 2018, appointing_president: 'Donald Trump', cases_handled: 598, political_affiliation: 'Conservative', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Associate_Justice_Brett_Kavanaugh_Official_Portrait.jpg/220px-Associate_Justice_Brett_Kavanaugh_Official_Portrait.jpg' },
  { id: 'amy-coney-barrett', name: 'Amy Coney Barrett', court: 'Supreme Court', nomination_year: 2020, appointing_president: 'Donald Trump', cases_handled: 387, political_affiliation: 'Conservative', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Amy_Coney_Barrett_official_portrait.jpg/220px-Amy_Coney_Barrett_official_portrait.jpg' },
  { id: 'ketanji-brown-jackson', name: 'Ketanji Brown Jackson', court: 'Supreme Court', nomination_year: 2022, appointing_president: 'Joe Biden', cases_handled: 156, political_affiliation: 'Liberal', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Ketanji_Brown_Jackson_official_SCOTUS_portrait_%28cropped%29.jpg/220px-Ketanji_Brown_Jackson_official_SCOTUS_portrait_%28cropped%29.jpg' }
];

export function JudgeSpotlightWidget() {
  const router = useRouter();
  const [featuredJudge, setFeaturedJudge] = useState<JudgeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJudge = async () => {
      try {
        const response = await fetch(`${API_URL}/api/judges/random`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.name) {
            setFeaturedJudge(data);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.log('Using fallback judge data');
      }
      
      const randomIndex = Math.floor(Math.random() * SCOTUS_JUSTICES.length);
      setFeaturedJudge(SCOTUS_JUSTICES[randomIndex]);
      setLoading(false);
    };

    fetchJudge();
  }, []);

  const getAffiliationColor = (affiliation?: string) => {
    if (!affiliation) return 'text-slate-400';
    const lower = affiliation.toLowerCase();
    if (lower.includes('conservative')) return 'text-red-400';
    if (lower.includes('liberal')) return 'text-blue-400';
    return 'text-purple-400';
  };

  const getYearsOnBench = (nominationYear?: number) => {
    if (!nominationYear) return null;
    return new Date().getFullYear() - nominationYear;
  };

  if (loading || !featuredJudge) {
    return (
      <div className="h-16 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-lg border border-white/5 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    /* HORIZONTAL BANNER - Different from other cards! */
    <div 
      onClick={() => router.push(`/cases?judge=${encodeURIComponent(featuredJudge.name)}`)}
      className="group cursor-pointer"
    >
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 rounded-xl border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
        
        {/* Left: Icon + Judge Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-cyan-500/30 group-hover:scale-110 transition-transform">
            {featuredJudge.image ? (
              <img 
                src={featuredJudge.image} 
                alt={featuredJudge.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg></div>';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <Scale size={20} className="text-cyan-400" />
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Judge Spotlight</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
              {featuredJudge.name}
            </h3>
          </div>
        </div>

        {/* Center: Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-slate-500 text-xs uppercase font-mono">Appointed</div>
            <div className="text-white font-mono">{featuredJudge.nomination_year}</div>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-center">
            <div className="text-slate-500 text-xs uppercase font-mono">Tenure</div>
            <div className="text-white font-mono">{getYearsOnBench(featuredJudge.nomination_year)} yrs</div>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-center">
            <div className="text-slate-500 text-xs uppercase font-mono">Cases</div>
            <div className="text-purple-400 font-mono font-bold">{featuredJudge.cases_handled?.toLocaleString()}</div>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className={`px-3 py-1 rounded-full text-xs font-mono uppercase ${getAffiliationColor(featuredJudge.political_affiliation)} bg-white/5`}>
            {featuredJudge.political_affiliation}
          </div>
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300">
          <span className="hidden sm:inline text-sm font-mono">Explore 247 Judges</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
