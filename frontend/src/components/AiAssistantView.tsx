import React, { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import type { Payment, ApprovalResult } from '../types';

interface AiAssistantViewProps {
  payments: Payment[];
  pendingApprovals: ApprovalResult[];
  recoveredAmount: number;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  payments,
  pendingApprovals,
  recoveredAmount,
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Hello! I am the PayFlow AI Recovery Assistant. Ask me questions about active payment risks, guardrails, human approvals, or recovery statistics.',
    },
  ]);
  const [input, setInput] = useState('');

  const sampleQuestions = [
    'What is our biggest recovery risk?',
    'Why is ₹25,000 waiting for approval?',
    'Which failure reason occurs most often?',
    'How much revenue has been recovered?',
  ];

  const handleAsk = (query: string) => {
    if (!query.trim()) return;

    const userMsg = { sender: 'user' as const, text: query };
    let replyText = 'I analyzed the synthetic dataset: ';

    const qLower = query.toLowerCase();
    if (qLower.includes('biggest recovery risk') || qLower.includes('biggest risk')) {
      replyText += `The largest un-recovered payment risk is Payment #8802 (₹45,000.00 INR) due to a daily limit failure. It is currently held in the Human Approval Queue.`;
    } else if (qLower.includes('waiting for approval') || qLower.includes('25,000')) {
      replyText += `Payment #8801 (₹25,000.00 INR) exceeds the configured high-value threshold (₹10,000.00). In accordance with fail-closed guardrails, execution is suspended until a human operator authorizes recovery.`;
    } else if (qLower.includes('most often') || qLower.includes('reason')) {
      replyText += `Insufficient Funds is the primary cause of payment failures (45%), followed by Authentication Timeout (30%).`;
    } else if (qLower.includes('recovered')) {
      replyText += `Total recovered revenue stands at ₹${recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR across ${payments.filter((p) => p.status === 'captured').length} captured transactions.`;
    } else {
      replyText += `PayFlow monitors ${payments.length} observed payment failures. ${pendingApprovals.length} high-value transactions currently await Human Approval authorization.`;
    }

    setMessages((prev) => [...prev, userMsg, { sender: 'assistant', text: replyText }]);
    setInput('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-slate-900 text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">AI Recovery Explanatory Assistant</h2>
            <p className="text-xs text-slate-500">
              Interactive explanatory assistant answering queries using current synthetic dashboard telemetry.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" /> EXPLANATORY ONLY
        </span>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap gap-2">
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(q)}
            className="px-3 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium transition-colors shadow-2xs text-left"
          >
            💬 {q}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 min-h-[340px] flex flex-col justify-between shadow-2xs">
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-lg text-xs max-w-2xl leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white ml-auto font-medium'
                  : 'bg-slate-50 text-slate-800 border border-slate-200'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(input)}
            placeholder="Ask about active risks, guardrails, or approvals..."
            className="flex-1 px-3.5 py-2 rounded bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-900"
          />
          <button
            onClick={() => handleAsk(input)}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
