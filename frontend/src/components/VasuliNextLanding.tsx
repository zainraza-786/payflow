import React, { useState } from 'react';
import { ArrowUpRight, ArrowRight, Brain, ShieldCheck, Wallet, ScrollText, ArrowUp, ArrowDown, Info, MessageCircle, Moon, Sun } from 'lucide-react';

interface VasuliNextLandingProps {
  onRunLiveBatch: () => void;
}

export const VasuliNextLanding: React.FC<VasuliNextLandingProps> = ({ onRunLiveBatch }) => {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Floating Controls */}
      <div className="fixed top-5 right-5 z-50 flex items-center space-x-3">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-lg transition-all ${
            darkMode ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-700'
          }`}
          title="Switch Dark / Light Theme"
        >
          {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
        <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          
          {/* Left Text Column */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 py-1 pl-1.5 pr-3 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <span className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-white text-[10px] font-bold">
                R
              </span>
              <span>Razorpay AI Buildathon — Track 03</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
              Vasuli — the AI agent <br />
              <span className="text-blue-600 dark:text-blue-400">gets your money back.</span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              It watches failed payments, abandoned checkouts, failed mandates, and overdue invoices — diagnoses why each one is losing money, picks a bounded action, executes it under hard guardrails, and reports exactly how much it got back. And what it honestly couldn't.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={onRunLiveBatch}
                className="group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-lg px-8 font-semibold text-sm transition-all duration-300 min-w-48 bg-blue-600 text-white hover:bg-blue-500 shadow-lg cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>Run live batch</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>

              <button
                onClick={onRunLiveBatch}
                className="inline-flex h-11 items-center justify-center rounded-lg px-8 font-semibold text-sm transition-all border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <span>View source</span>
                <ArrowUpRight className="w-4 h-4 ml-1.5 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md pt-2 leading-relaxed">
              The LLM never touches money directly — a deterministic guardrail engine and recovery executors are the only things allowed to act.
            </p>
          </div>

          {/* Right Column: Transfer in Progress Glass Card */}
          <div className="flex justify-center">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md space-y-6">
              
              <div className="flex justify-center pt-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <Wallet className="w-8 h-8" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white uppercase tracking-tight">
                  Transfer in Progress
                </h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block font-mono">
                  Running smart retry...
                </span>
              </div>

              <div className="space-y-3 font-mono">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                    <ArrowUp className="w-3.5 h-3.5 text-rose-500" />
                    <span>From</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">₹</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">₹49,800 failed</span>
                      <span className="text-[11px] text-slate-500 block">bank_server_down</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                    <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                    <span>To</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">✓</span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">₹49,800 recovered</span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">Live — Razorpay test mode</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">
                <span>Diagnosing root cause...</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* How It Works — Four Layers */}
      <section id="how-it-works" className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
            How it works
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Four layers, one rule: the LLM proposes, code decides.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Layer 1 */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-slate-500">LLM · proposes only</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Diagnosis agent</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Groq primary, Gemini automatic fallback. Given one event's full context, it confirms the root cause and picks exactly one action from a fixed menu — never freeform. Below a confidence threshold, it's told to flag for human review instead of guessing.
            </p>
          </div>

          {/* Layer 2 */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-slate-500">Deterministic · decides</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Guardrail engine</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Plain deterministic code — no LLM involved. Retry caps, cool-downs, contact caps, opt-out enforcement, spend caps on invoices, and the retry rate limit that fixed a real retry-storm bug. Every check is logged, pass or fail.
            </p>
          </div>

          {/* Layer 3 */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-slate-500">Executes · zero real money</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recovery executors</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Runs the action once it's cleared. Real Razorpay test-mode payment links for smart_retry and generate_payment_link; everything else is simulated and clearly labeled as such in the UI.
            </p>
          </div>

          {/* Layer 4 */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ScrollText className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-slate-500">Supabase · full history</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Audit trail</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Every decision — executed, blocked, or skipped — is written with its full reasoning, every guardrail check, and the outcome. Nothing is swept under the rug, including what couldn't be recovered.
            </p>
          </div>

        </div>
      </section>

      {/* Allowed Action Set Gallery */}
      <section id="actions" className="py-20 px-6 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
            The allowed action set
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            A fixed menu — never a freeform action.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Smart Retry</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>• Real Razorpay test-mode retry link</li>
              <li>• Capped at 3 attempts per payment</li>
              <li>• Rate-limited to 1 per 30 min</li>
              <li>• Blocked instantly if a dispute opens</li>
              <li>• Economic rule vetoes low-value retries</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Payment Link</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>• Fresh Razorpay test-mode link</li>
              <li>• For abandoned checkouts + invoices</li>
              <li>• Customer pays on their own time</li>
              <li>• No repeat contact within 4 hours</li>
              <li>• Max 2 touches per customer per day</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Send Nudge</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>• Pre-registered DLT template only</li>
              <li>• 08:00–19:00 IST contact window</li>
              <li>• Respects the daily contact cap</li>
              <li>• Skipped entirely if opted out</li>
              <li>• Never sends freeform LLM text</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">B2B Chase</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>• Tiered by reliability score</li>
              <li>• Firmer tone for overdue invoices</li>
              <li>• Never auto-escalates above ₹1L</li>
              <li>• Flagged for human review above cap</li>
              <li>• Full reasoning logged to audit trail</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section id="cta" className="py-24 px-6 bg-slate-900 text-white text-center border-t border-slate-800">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            See it diagnose, decide, and recover — live.
          </h2>
          <p className="text-slate-300 text-sm max-w-md mx-auto font-normal">
            One click runs a real batch through the full pipeline: guardrails, the diagnosis agent, and the executors.
          </p>

          <button
            onClick={onRunLiveBatch}
            className="px-8 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl transition-all cursor-pointer"
          >
            <span>Run live batch &rarr; Let's go</span>
          </button>
        </div>
      </section>

      {/* Floating Chat Assistant Trigger */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={onRunLiveBatch}
          className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-500 transition-transform hover:scale-105 cursor-pointer"
          title="Open Assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
};
