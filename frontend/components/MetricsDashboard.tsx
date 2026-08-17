'use client';
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/metrics');
        const data = await res.json();
        if (data.success) {
          setMetrics(data);
        }
      } catch (error) {
        console.error("Failed to fetch live metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    
    // Optional: Auto-refresh data every 30 seconds for a truly "live" dashboard
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="w-full text-center text-slate-400 py-10 animate-pulse">Loading Live Database Metrics...</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">System Intelligence Metrics</h2>
        <p className="text-sm text-slate-400 mt-1">
          Live analytics monitoring {metrics?.total_ingested || 0} defects across the vector database.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Module 1: Live Severity Distribution (Donut Chart) */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Open Defects By Severity</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.severity_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics?.severity_distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Custom Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {metrics?.severity_distribution.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>

        {/* Module 2: Resolution Time (Bar Chart) */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-6 right-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
            ↓ 78% Faster with AI
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Avg Resolution Time (Hours)</h3>
          
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.resolution_trend || []}>
                <XAxis dataKey="day" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                />
                <Bar dataKey="time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}