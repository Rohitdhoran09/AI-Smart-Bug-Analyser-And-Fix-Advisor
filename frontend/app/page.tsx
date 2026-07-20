import BugSubmissionForm from '@/components/BugSubmissionForm';
import BugSearchConsole from '@/components/BugSearchConsole';
import MetricsDashboard from '@/components/MetricsDashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto mb-10 pl-4 text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 text-xs font-semibold mb-4">
          <span>Vector Database Connected</span>
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight sm:text-5xl">
          AI Defect Intelligence
        </h1>
      </div>
      
      {/* Top Module: Save to Database */}
      <BugSubmissionForm />

      <div className="max-w-6xl mx-auto mt-16 border-t border-slate-200 pt-8"></div>

      {/* Bottom Module: Retrieve from Database */}
      <BugSearchConsole />

      <MetricsDashboard/>
    </main>
  );
}