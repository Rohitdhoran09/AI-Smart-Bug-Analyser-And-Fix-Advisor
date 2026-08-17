'use client';

import { useState } from 'react';

type ProcessingStep = 'idle' | 'ingesting' | 'vector_searching' | 'completed' | 'failed';

export default function BugSubmissionForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [environment, setEnvironment] = useState('Production');
  
  const [processStatus, setProcessStatus] = useState<ProcessingStep>('idle');
  const [errorMessage, setErrorMessage] = useState(''); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessStatus('ingesting');
    setErrorMessage(''); 

    try {
      setTimeout(() => setProcessStatus('vector_searching'), 1000);

      const response = await fetch('http://localhost:8000/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, severity, environment }),
      });

      // RESTORED: We only throw the error here if the upload fails!
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process issue');
      }

      setTimeout(() => {
        setProcessStatus('completed');
        setTitle('');
        setDescription('');
        setTimeout(() => setProcessStatus('idle'), 3000);
      }, 2000);

    } catch (error: any) {
      console.error("Caught Error:", error);
      setProcessStatus('failed');
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
      <div className="border-b border-white/10 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Defect Ingestion Console</h2>
          <p className="text-sm text-slate-400 mt-1">Submit issues to be vectorized and saved to the database.</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold tracking-wide border ${
          processStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]' : 
          processStatus === 'failed' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
          'bg-slate-800/80 text-slate-400 border-slate-700'
        }`}>
          {processStatus === 'completed' ? '✓ SAVED TO VECTOR DB' : processStatus === 'failed' ? '⚠ INGESTION ERROR' : 'AWAITING INPUT'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Issue Headline</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={processStatus !== 'idle' && processStatus !== 'completed' && processStatus !== 'failed'}
            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl outline-none text-white focus:bg-slate-900/80 focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            placeholder="e.g., Payment API 500 Error"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-white">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Environment</label>
            <select 
              value={environment} 
              onChange={(e) => setEnvironment(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-white transition-all"
            >
              <option className="bg-slate-900 text-white">Production</option>
              <option className="bg-slate-900 text-white">Staging</option>
              <option className="bg-slate-900 text-white">Local Dev</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Severity</label>
            <select 
              value={severity} 
              onChange={(e) => setSeverity(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-white transition-all"
            >
              <option className="bg-slate-900 text-white">Low</option>
              <option className="bg-slate-900 text-white">Medium</option>
              <option className="bg-slate-900 text-white">High</option>
              <option className="bg-slate-900 text-white">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Telemetry Data & Logs</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Paste raw server logs or error traces here..."
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl outline-none text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600 disabled:opacity-50"
          />
        </div>

        {processStatus === 'failed' && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            <h4 className="text-sm font-bold text-rose-400 mb-1 flex items-center gap-2">
              <span className="text-lg">⚠</span> Database/Backend Error:
            </h4>
            <p className="text-sm text-rose-300/80 font-mono pl-7">{errorMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={processStatus !== 'idle' && processStatus !== 'failed'}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25 flex justify-center items-center gap-2"
        >
          {processStatus === 'idle' || processStatus === 'failed' ? (
            'Vectorize & Save Bug'
          ) : (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
              Processing AI Pipeline...
            </>
          )}
        </button>
      </form>
    </div>
  );
}