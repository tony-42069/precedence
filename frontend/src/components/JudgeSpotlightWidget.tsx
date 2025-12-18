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
  wikipediaTitle?: string; // Wikipedia page title for API lookup
}

// Fetch judge photo from Wikipedia API with proper CORS support
async function getWikipediaImage(wikipediaTitle: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikipediaTitle)}&prop=pageimages&format=json&pithumbsize=300&origin=*`;
    const response = await fetch(url);
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    return pages[pageId]?.thumbnail?.source || null;
  } catch (error) {
    console.error('Failed to fetch Wikipedia image:', error);
    return null;
  }
}

// SCOTUS Justices with Wikipedia page titles for dynamic image loading
const SCOTUS_JUSTICES: JudgeProfile[] = [
  { id: 'john-roberts', name: 'John G. Roberts Jr.', court: 'Supreme Court', nomination_year: 2005, appointing_president: 'George W. Bush', cases_handled: 1847, political_affiliation: 'Conservative', wikipediaTitle: 'John_Roberts' },
  { id: 'clarence-thomas', name: 'Clarence Thomas', court: 'Supreme Court', nomination_year: 1991, appointing_president: 'George H.W. Bush', cases_handled: 2156, political_affiliation: 'Conservative', wikipediaTitle: 'Clarence_Thomas' },
  { id: 'sonia-sotomayor', name: 'Sonia Sotomayor', court: 'Supreme Court', nomination_year: 2009, appointing_president: 'Barack Obama', cases_handled: 1432, political_affiliation: 'Liberal', wikipediaTitle: 'Sonia_Sotomayor' },
  { id: 'elena-kagan', name: 'Elena Kagan', court: 'Supreme Court', nomination_year: 2010, appointing_president: 'Barack Obama', cases_handled: 1298, political_affiliation: 'Liberal', wikipediaTitle: 'Elena_Kagan' },
  { id: 'neil-gorsuch', name: 'Neil M. Gorsuch', court: 'Supreme Court', nomination_year: 2017, appointing_president: 'Donald Trump', cases_handled: 687, political_affiliation: 'Conservative', wikipediaTitle: 'Neil_Gorsuch' },
  { id: 'brett-kavanaugh', name: 'Brett M. Kavanaugh', court: 'Supreme Court', nomination_year: 2018, appointing_president: 'Donald Trump', cases_handled: 598, political_affiliation: 'Conservative', wikipediaTitle: 'Brett_Kavanaugh' },
  { id: 'amy-coney-barrett', name: 'Amy Coney Barrett', court: 'Supreme Court', nomination_year: 2020, appointing_president: 'Donald Trump', cases_handled: 387, political_affiliation: 'Conservative', wikipediaTitle: 'Amy_Coney_Barrett' },
  { id: 'ketanji-brown-jackson', name: 'Ketanji Brown Jackson', court: 'Supreme Court', nomination_year: 2022, appointing_president: 'Joe Biden', cases_handled: 156, political_affiliation: 'Liberal', wikipediaTitle: 'Ketanji_Brown_Jackson' }
];

export function JudgeSpotlightWidget() {
  const router = useRouter();
  const [featuredJudge, setFeaturedJudge] = useState<JudgeProfile | null>(null);
  const [judgeImage, setJudgeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJudge = async () => {
      try {
        const response = await fetch(`${API_URL}/api/judges/random`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.name) {
            setFeaturedJudge(data);
            // Try to fetch Wikipedia image for API-provided judge
            if (data.wikipediaTitle) {
              const wikiImage = await getWikipediaImage(data.wikipediaTitle);
              setJudgeImage(wikiImage || data.image || null);
            } else {
              // Try using the judge's name as Wikipedia title
              const wikiTitle = data.name.replace(/ /g, '_');
              const wikiImage = await getWikipediaImage(wikiTitle);
              setJudgeImage(wikiImage || data.image || null);
            }
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.log('Using fallback judge data');
      }

      // Use fallback SCOTUS data
      const randomIndex = Math.floor(Math.random() * SCOTUS_JUSTICES.length);
      const selectedJudge = SCOTUS_JUSTICES[randomIndex];
      setFeaturedJudge(selectedJudge);

      // Fetch Wikipedia image for the selected SCOTUS justice
      if (selectedJudge.wikipediaTitle) {
        const wikiImage = await getWikipediaImage(selectedJudge.wikipediaTitle);
        setJudgeImage(wikiImage);
      }

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
            {judgeImage ? (
              <img
                src={judgeImage}
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
