'use client';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function MetricsDashboard() {
  // Mock data for the charts (You can wire this to your database later!)
  const severityData = [
    { name: 'Critical', value: 12, color: '#ef4444' }, // Red
    { name: 'High', value: 24, color: '#f97316' },    // Orange
    { name: 'Medium', value: 45, color: '#eab308' },  // Yellow
    { name: 'Low', value: 19, color: '#3b82f6' },     // Blue
  ];

  const resolutionData = [
    { name: 'Mon', time: 4.2 },
    { name: 'Tue', time: 3.8 },
    { name: 'Wed', time: 2.5 },
    { name: 'Thu', time: 1.9 }, // AI introduced here!
    { name: 'Fri', time: 0.8 },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Intelligence Metrics</h2>
        <p className="text-sm text-slate-500 mt-1">Live analytics on defect ingestion and AI resolution performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT CHART: Severity Donut */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Open Defects by Severity</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {severityData.map((item) => (
              <div key={item.name} className="flex items-center text-xs font-bold text-slate-600">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                {item.name}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT CHART: Resolution Time Bar Chart */}
        <div className="bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Avg Resolution Time (Hours)</h3>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full border border-emerald-500/20">
              ↓ 78% Faster with AI
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }}
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