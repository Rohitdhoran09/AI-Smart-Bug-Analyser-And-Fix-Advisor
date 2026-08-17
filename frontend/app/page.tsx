import BugSubmissionForm from '@/components/BugSubmissionForm';
import BugSearchConsole from '@/components/BugSearchConsole';
import MetricsDashboard from '@/components/MetricsDashboard';
import DefectAnalytics from '@/components/DefectAnalytics';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden py-10 px-4 sm:px-6">
      
      {/* --- LAYER 1: The Attractive High-Tech Background Image (Fixed for Parallax Effect) --- */}
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2074')] bg-cover bg-center bg-fixed"></div>
      
      {/* --- LAYER 2: Frosted Glass Overlay (Ensures your components remain easy to read) --- */}
      <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-sm"></div>
      
      {/* --- LAYER 3: Ambient Glow for Extra Polish --- */}
      <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-indigo-500/30 blur-[120px]"></div>
      </div>

      {/* --- CONTENT WRAPPER: Safely floating above the background --- */}
      <div className="relative z-10">
        
        {/* Upgraded Header designed for a dark background */}
        <div className="max-w-7xl mx-auto mb-12 pl-4 text-center">
          
          {/* Glassmorphism Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-indigo-200 text-xs font-bold tracking-wide shadow-xl mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
            <span>Vector Database Connected</span>
          </div>
          
          {/* Main Title with glowing drop shadow */}
          <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            AI Defect Intelligence
          </h1>
          <p className="mt-4 text-indigo-100/80 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            Autonomous multi-agent orchestration for root cause analysis and defect resolution.
          </p>
        </div>
        
        {/* Top Module: Save to Database */}
        <BugSubmissionForm />

        {/* Styled Frosted Divider */}
        <div className="max-w-6xl mx-auto mt-16 border-t border-white/10 pt-8"></div>

        {/* Bottom Module: Retrieve from Database */}
        <BugSearchConsole />

        <DefectAnalytics/>

        {/* Styled Frosted Divider for Analytics */}
        <div className="max-w-6xl mx-auto mt-16 border-t border-white/10 pt-8"></div>

        {/* Analytics Dashboard */}
        <MetricsDashboard />
      </div>
    </main>
  );
}