'use client';
import { useState } from 'react';

export default function BugSearchConsole() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [findings, setFindings] = useState<any>(null);
  
  // States for the Jira Export simulation
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleInvestigate = async () => {
    if (!query) return;
    setIsSearching(true);
    setFindings(null);
    setExportSuccess(false);
    
    try {
      const res = await fetch('http://localhost:8000/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success) {
        setFindings(data.structured_findings);
      }
    } catch (error) {
      console.error("Investigation failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Send the confirmed fix back to the backend to grow the knowledge base!
      await fetch('http://localhost:8000/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          severity: findings.duplicate_matches[0]?.severity || "High",
          root_cause: findings.root_cause_analysis.hypothesis,
          resolution: JSON.stringify(findings.remediation_plan.recommended_fix)
        }),
      });
      
      setIsExporting(false);
      setExportSuccess(true);
    } catch (error) {
      console.error("Failed to save to knowledge base:", error);
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: The Input */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl h-fit">
        <div className="inline-flex items-center space-x-2 bg-blue-500/20 px-3 py-1 rounded-full text-blue-300 text-xs font-bold mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span>RAG ENGINE ACTIVE</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Investigate Defect</h2>
        <p className="text-slate-400 text-sm mb-6">Deploy multi-agent architecture to synthesize a root cause and fix.</p>
        
        <textarea 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., The application crashes after login..."
          className="w-full bg-slate-950/50 text-white border border-slate-700 rounded-lg p-4 h-32 focus:ring-2 focus:ring-indigo-500 mb-4"
        />
        <button 
          onClick={handleInvestigate}
          disabled={isSearching}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
        >
          {isSearching ? 'Agents Investigating...' : 'Generate AI Resolution'}
        </button>
      </div>

      {/* RIGHT COLUMN: Structured Findings Display */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Module 1: Root Cause & Confidence */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <span className="text-emerald-400">●</span> Root Cause Hypothesis
          </h3>
          {findings ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-300 text-sm">AI Confidence Score</span>
                <span className={`font-bold ${findings.root_cause_analysis.confidence_score > 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(findings.root_cause_analysis.confidence_score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-slate-200">{findings.root_cause_analysis.hypothesis}</p>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-indigo-300 mb-2">Supporting Evidence:</h4>
                <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                  {findings.root_cause_analysis.evidence.map((ev: any, idx: number) => (
                    <li key={idx}>{typeof ev === 'object' ? ev.description || Object.values(ev)[0] : ev}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">Waiting for input...</p>
          )}
        </div>

        {/* Module 2: Remediation & Duplicates */}
        {findings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Fix Recommendations */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Recommended Fix</h3>
              <div className="text-sm text-slate-300 space-y-3">
                {Array.isArray(findings.remediation_plan.recommended_fix) 
                  ? findings.remediation_plan.recommended_fix.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        {typeof item === 'object' ? (
                          <>
                            <span className="font-bold text-indigo-400 shrink-0">
                              Step {item.step || idx + 1}:
                            </span>
                            <span>{item.instruction || item.description || Object.values(item)[0]}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-indigo-400 shrink-0">Step {idx + 1}:</span>
                            <span>{item}</span>
                          </>
                        )}
                      </div>
                    ))
                  : <p className="whitespace-pre-wrap">{findings.remediation_plan.recommended_fix}</p>
                }
              </div>
              
              <h4 className="text-sm font-semibold text-indigo-300 mt-6 mb-2">Best Practices:</h4>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                {findings.remediation_plan.best_practices.map((bp: any, idx: number) => (
                  <li key={idx}>{typeof bp === 'object' ? bp.description || Object.values(bp)[0] : bp}</li>
                ))}
              </ul>
            </div>

            {/* Duplicate Matches */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">Duplicate Matches</h3>
              
              <div className="flex-grow">
                {findings.duplicate_matches.length > 0 ? (
                  <div className="space-y-3">
                    {findings.duplicate_matches.map((dup: any, idx: number) => (
                      <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-indigo-400">Match {(dup.similarity * 100).toFixed(0)}%</span>
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                            {dup.metadata?.ai_triage?.severity || dup.severity || 'Unknown'} Severity
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 line-clamp-2">{dup.title}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No historical duplicates found.</p>
                )}
              </div>

              {/* Enterprise Integration Button */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <button 
                  onClick={handleExport}
                  disabled={isExporting || exportSuccess}
                  className={`w-full font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                    exportSuccess 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                  }`}
                >
                  {isExporting ? (
                    <span className="animate-pulse">Syncing to Jira...</span>
                  ) : exportSuccess ? (
                    <>
                      <span>✓</span> Ticket Created (DEVOPS-412)
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                      Export to Jira / GitHub
                    </>
                  )}
                </button>
              </div>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}