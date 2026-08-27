import React, { useState } from 'react';
import { Moon, Sun, CheckCircle2, Info, MessageSquare } from 'lucide-react';

interface OriginalVasuliLandingProps {
  onRunLiveBatch: () => void;
}

export const OriginalVasuliLanding: React.FC<OriginalVasuliLandingProps> = ({ onRunLiveBatch }) => {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#eef5fc] text-slate-900'
    }`}>
      {/* Top Navbar / Header Bar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Logo / Title */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            V
          </div>
          <span className="font-bold text-slate-800 text-sm">Vasuli</span>
        </div>

        {/* Dark / Light Mode Toggle Pill */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-full border transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-200 text-slate-600 shadow-xs'
          }`}
          title="Toggle Dark / Light Mode"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Sub-tag */}
            <div className="inline-flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase font-mono">
                RAZORPAY AI BUILDATHON — TRACK 03
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Vasuli — the AI agent <br />
              that <span className="text-blue-600">gets your money back.</span>
            </h1>

            {/* Subtitle Paragraph */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
              It watches failed payments, abandoned checkouts, failed mandates, and overdue invoices — diagnoses why each one is losing money, picks a bounded action, executes it under hard guardrails, and reports exactly how much it got back. And what it honestly couldn't.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={onRunLiveBatch}
                className="px-6 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Run live batch</span>
              </button>

              <button
                onClick={onRunLiveBatch}
                className="px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm shadow-2xs transition-all cursor-pointer"
              >
                <span>View source</span>
              </button>
            </div>

            {/* Subtext Notice */}
            <p className="text-xs text-slate-500 max-w-xl font-normal leading-relaxed pt-2">
              The LLM never touches money directly — a deterministic guardrail engine and recovery executors are the only things allowed to act.
            </p>
          </div>

          {/* Right Hero Column: Transfer Completed Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100/80 space-y-6 max-w-md mx-auto">
              
              {/* Green Check Icon */}
              <div className="flex justify-center pt-2">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-10 h-10 stroke-[1.75]" />
                </div>
              </div>

              {/* Title & Transaction ID */}
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight uppercase">
                  TRANSFER COMPLETED
                </h3>
                <p className="text-xs font-mono text-emerald-600 font-semibold">
                  Transaction ID: pay_9cEFF9F41D
                </p>
              </div>

              {/* Transfer Detail Sub-card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 text-xs font-mono">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">↑ From</span>
                    <span className="font-bold text-slate-800 text-sm block">₹49,800 failed</span>
                    <span className="text-slate-500 text-[11px] block">bank_server_down</span>
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">↓ To</span>
                    <span className="font-bold text-slate-900 text-sm block">₹49,800 recovered</span>
                    <span className="text-slate-500 text-[11px] block">Live — Razorpay test mode</span>
                  </div>
                </div>
              </div>

              {/* Bottom Notice inside Card */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Recovered on retry #2 — root cause: bank_server_down</span>
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
              </div>

            </div>
          </div>

        </div>

        {/* Middle Section: 4 Glass/Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Real Razorpay test-mode retry link</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Capped at 3 attempts per payment</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Rate-limited to 1 per 30 min</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Blocked instantly if a dispute opens</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Economic rule vetoes low-value retries</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
                🔗
              </div>
              <span className="text-xs font-semibold text-slate-700 block">Bounded Execution</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                🔔
              </div>
              <span className="text-xs font-semibold text-slate-700 block">Guardrail Alerts</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                ⏱️
              </div>
              <span className="text-xs font-semibold text-slate-700 block">30-Min Rate Limits</span>
            </div>
          </div>
        </div>

        {/* Bottom Banner Section */}
        <div className="bg-slate-900 text-white rounded-3xl p-10 shadow-2xl border border-slate-800 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            See it diagnose, decide, and recover — live.
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto font-normal leading-relaxed">
            One click runs a real batch through the full pipeline: guardrails, the diagnosis agent, and the executors.
          </p>
          <div className="pt-2">
            <button
              onClick={onRunLiveBatch}
              className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg transition-all cursor-pointer"
            >
              Run live batch
            </button>
          </div>
        </div>

      </main>

      {/* Floating Chat Bubble Widget in Bottom-Right (as seen in screenshot) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onRunLiveBatch}
          className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-500 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
          title="Open AI Assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
