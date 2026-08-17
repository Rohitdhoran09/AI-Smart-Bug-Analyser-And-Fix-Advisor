'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DefectAnalytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatterns() {
      try {
        const res = await fetch('http://localhost:8000/api/analytics/patterns');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPatterns();
  }, []);

  if (loading) return <div className="text-slate-400 animate-pulse text-sm">Analyzing systemic patterns...</div>;

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl w-full max-w-6xl mx-auto mt-8">
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <span className="text-indigo-400">📊</span> Defect Pattern Analytics
      </h3>
      <p className="text-slate-400 text-sm mb-6">Identifying high-frequency affected components across all historical data.</p>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis type="number" stroke="#475569" fontSize={12} />
            <YAxis dataKey="theme" type="category" stroke="#94a3b8" fontSize={12} width={150} />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : index === 1 ? '#f59e0b' : '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}