'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

export default function BugSearchConsole() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  
  const [displayedAnalysis, setDisplayedAnalysis] = useState('');
  
  // NEW: State for the Export Integration
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);

  useEffect(() => {
    if (!aiAnalysis) {
      setDisplayedAnalysis('');
      return;
    }
    
    let i = 0;
    const typingInterval = setInterval(() => {
      setDisplayedAnalysis(aiAnalysis.slice(0, i));
      i++;
      if (i > aiAnalysis.length) {
        clearInterval(typingInterval);
      }
    }, 15);

    return () => clearInterval(typingInterval);
  }, [aiAnalysis]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setHasSearched(true);
    setAiAnalysis('');
    setResults([]);
    setIsExported(false); // Reset export state on new search

    try {
      const response = await fetch('http://localhost:8000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json() as any;
      setResults(data.similar_bugs || data.results || data.matches || []);
      setAiAnalysis(data.analysis || data.ai_analysis || data.rca_result || '');
      
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // NEW: Mock Export Function for Demo Purposes
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsExported(true);
    }, 1500); // Simulate network delay
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 mt-8">
      
      {/* LEFT SIDE: Search Input */}
      <div className="lg:col-span-4 bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-800 h-fit">
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 px-3 py-1 rounded-full text-blue-400 text-xs font-bold uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>RAG Engine Active</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Investigate Defect</h2>
          <p className="text-slate-400 text-sm">Describe your bug. The AI will cross-reference history to generate a fix.</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-6">
          <textarea
            required
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            rows={5}
            className="w-full px-4 py-4 bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-200 font-mono text-sm focus:ring-2 focus:ring-blue-500/50"
            placeholder="e.g., The application crashes after login..."
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition disabled:opacity-50"
          >
            {isSearching ? 'Analyzing History...' : 'Generate AI RCA'}
          </button>
        </form>
      </div>

      {/* RIGHT SIDE: AI Results */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        
        {/* AI Root Cause Synthesis */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100 min-h-[200px] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center justify-between">
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path></svg>
                AI Root Cause Synthesis
              </span>
            </h3>
            
            {!hasSearched ? (
               <p className="text-slate-400 text-sm italic">Waiting for input...</p>
            ) : isSearching ? (
               <div className="animate-pulse space-y-3">
                 <div className="h-4 bg-emerald-50 rounded w-3/4"></div>
                 <div className="h-4 bg-emerald-50 rounded w-full"></div>
                 <div className="h-4 bg-emerald-50 rounded w-5/6"></div>
               </div>
            ) : displayedAnalysis ? (
               <div className="prose prose-sm prose-emerald max-w-none text-slate-700">
                 <ReactMarkdown>{displayedAnalysis}</ReactMarkdown>
               </div>
            ) : null}
          </div>

          {/* NEW: Jira/GitHub Export Integration Button */}
          {aiAnalysis && (
            <div className="mt-8 pt-4 border-t border-emerald-50">
              <button
                onClick={handleExport}
                disabled={isExporting || isExported || displayedAnalysis.length < aiAnalysis.length}
                className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  isExported 
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                } disabled:opacity-50`}
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Syncing to Jira...
                  </>
                ) : isExported ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                    Ticket Created (DEVOPS-412)
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    Export to Jira / GitHub
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Retrieved Context */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
           <h3 className="text-lg font-bold text-slate-900 mb-6 border-b pb-4 border-slate-100">Retrieved Context (Vector DB)</h3>
           
           <div className="space-y-4">
              {results.length > 0 ? results.map((ticket, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  key={idx} 
                  className="p-5 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 text-sm">{ticket.title}</h4>
                    {ticket.similarity && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                        {(ticket.similarity * 100).toFixed(1)}% Match
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-2">{ticket.description}</p>
                </motion.div>
              )) : (
                <p className="text-slate-400 text-sm italic">No context loaded yet.</p>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}