import React from 'react';
import { Zap, ArrowRight, Activity } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">PayFlow AI</span>
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v1.0 Hosted
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Four Layers</a>
            <a href="#guardrails" className="hover:text-white transition-colors">Guardrails</a>
            <a href="#strategies" className="hover:text-white transition-colors">Strategies</a>
          </nav>

          <button
            onClick={onEnterApp}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center space-x-2 group"
          >
            <span>Let's Go</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>AI-POWERED REVENUE RECOVERY PLATFORM</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Autonomous Payment Recovery <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Under Bounded Guardrails
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-400 text-base leading-relaxed">
            PayFlow diagnoses payment failure root causes, selects bounded recovery strategies, enforces fail-closed guardrails, and attributes recovered revenue with full auditability.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-xl hover:shadow-blue-500/30 flex items-center justify-center space-x-2 group"
            >
              <span>Let's Go &rarr; Enter Executive Platform</span>
            </button>
          </div>
        </div>

        {/* Transfer Visual Card */}
        <div className="max-w-4xl mx-auto mt-14 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">LIVE RECOVERY WORKFLOW IN PROGRESS</span>
            </div>
            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
              RAZORPAY TEST MODE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] block">PAYMENT FAILED</span>
              <span className="text-rose-400 font-bold text-sm block">₹25,000.00 INR</span>
              <span className="text-slate-400 text-[11px]">Rohan Mehta — Insufficient Funds</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] block">GUARDRAIL EVALUATION</span>
              <span className="text-amber-400 font-bold text-sm block">HUMAN APPROVAL</span>
              <span className="text-slate-400 text-[11px]">Exceeds ₹10,000 threshold</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] block">RECOVERY OUTCOME</span>
              <span className="text-emerald-400 font-bold text-sm block">RECOVERED</span>
              <span className="text-slate-400 text-[11px]">Payment Link generated & paid</span>
            </div>
          </div>
        </div>
      </section>

      {/* Diagnose -> Decide -> Recover Section */}
      <section id="features" className="py-16 px-6 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Diagnose → Decide → Recover</h2>
            <p className="text-xs text-slate-400">Three-stage deterministic recovery intelligence</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">1</div>
              <h3 className="text-base font-bold text-white">DIAGNOSE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Failure Diagnostician analyzes webhook error codes, customer payment history, and bank status to isolate exact root cause.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">2</div>
              <h3 className="text-base font-bold text-white">DECIDE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Selects optimal bounded strategy from fixed action menu (Payment Link, Smart Retry, Interactive Nudge, B2B Chase).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">3</div>
              <h3 className="text-base font-bold text-white">RECOVER</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Executes recovery under fail-closed guardrails, routing high-value cases to Human Approval Queue and logging full audit telemetry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Four Layers Section */}
      <section id="architecture" className="py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Four Architectural Layers</h2>
            <p className="text-xs text-slate-400">Deterministic pipeline ensuring 100% safe execution</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-blue-400 font-mono">LAYER 1</span>
              <h4 className="font-bold text-white text-sm">Observer & Detector</h4>
              <p className="text-xs text-slate-400">Ingests Razorpay webhooks and flags transaction failures in real time.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-indigo-400 font-mono">LAYER 2</span>
              <h4 className="font-bold text-white text-sm">Failure Diagnostician</h4>
              <p className="text-xs text-slate-400">Evaluates failure root cause and selects permitted recovery strategy.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 font-mono">LAYER 3</span>
              <h4 className="font-bold text-white text-sm">Guardrail Engine</h4>
              <p className="text-xs text-slate-400">Enforces Quiet Hours, Max Attempt Cap, and High-Value Approval Threshold.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 font-mono">LAYER 4</span>
              <h4 className="font-bold text-white text-sm">Executor & Auditor</h4>
              <p className="text-xs text-slate-400">Dispatches Razorpay Test Mode actions and logs immutable audit trail.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-900/40 border-t border-slate-800 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold text-white">Ready to inspect PayFlow?</h2>
          <p className="text-slate-300 text-xs">
            Launch the executive command center to explore synthetic payment recovery telemetry, financial analytics, and human approval queues.
          </p>

          <button
            onClick={onEnterApp}
            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-xl hover:shadow-blue-500/30 flex items-center justify-center space-x-2 mx-auto"
          >
            <span>Let's Go &rarr; Enter Executive Platform</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>© 2026 PayFlow AI — Autonomous Revenue Recovery. Razorpay Test Mode Only.</p>
      </footer>
    </div>
  );
};
