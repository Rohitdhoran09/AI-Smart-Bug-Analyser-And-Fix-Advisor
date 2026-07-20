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
    <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 p-6 sm:p-8">
      <div className="border-b border-gray-100 pb-5 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Defect Ingestion Console</h2>
          <p className="text-sm text-gray-500 mt-1">Submit issues to be vectorized and saved to the database.</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
          processStatus === 'completed' ? 'bg-green-100 text-green-700' : 
          processStatus === 'failed' ? 'bg-red-100 text-red-700' : 
          'bg-gray-100 text-gray-500'
        }`}>
          {processStatus === 'completed' ? 'SAVED TO DB' : processStatus === 'failed' ? 'ERROR' : 'AWAITING INPUT'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Issue Headline</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={processStatus !== 'idle' && processStatus !== 'completed' && processStatus !== 'failed'}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Environment</label>
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Production</option><option>Staging</option><option>Local Dev</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Telemetry Data & Logs</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl outline-none text-green-400 font-mono text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {processStatus === 'failed' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <h4 className="text-sm font-bold text-red-800 mb-1">Database/Backend Error:</h4>
            <p className="text-sm text-red-600 font-mono">{errorMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={processStatus !== 'idle' && processStatus !== 'failed'}
          className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {processStatus === 'idle' || processStatus === 'failed' ? 'Vectorize & Save Bug' : 'Processing AI Pipeline...'}
        </button>
      </form>
    </div>
  );
}