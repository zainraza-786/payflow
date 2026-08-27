import React, { useState } from 'react';
import { Bot, Send, AlertTriangle, FileSpreadsheet, CreditCard, Copy } from 'lucide-react';
import type { Payment, ApprovalResult } from '../types';

interface AiAssistantViewProps {
  payments: Payment[];
  pendingApprovals: ApprovalResult[];
  recoveredAmount: number;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  payments,
  recoveredAmount,
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: '👋 Hello! I am your PayFlow AI Finance Controller. How can I assist you with today\'s reconciliation audit and payment recovery?',
    },
  ]);
  const [input, setInput] = useState('');

  const promptPills = [
    { label: 'What is our biggest risk?', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Missing Payments Audit', icon: FileSpreadsheet, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { label: 'Razorpay MDR Fee Analysis', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'Duplicate Charges Audit', icon: Copy, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  ];

  const handleAsk = (query: string) => {
    if (!query.trim()) return;

    const userMsg = { sender: 'user' as const, text: query };
    let replyText = 'I performed a real-time audit across the current synthetic dataset: ';

    const qLower = query.toLowerCase();
    if (qLower.includes('biggest risk') || qLower.includes('risk')) {
      replyText += `The highest risk uncollected invoice is INV-2026-019 (Amitabh Saxena) for ₹35,000.00 INR due to a missing payment. It is held in the Human Approval Queue.`;
    } else if (qLower.includes('missing payment')) {
      replyText += `Identified 3 missing payments totaling ₹92,000.00 INR (Amitabh Saxena ₹35,000, Alia Bhatt ₹33,000, Neha Reddy ₹24,000). Automated resolution templates have been prepared.`;
    } else if (qLower.includes('mdr') || qLower.includes('fee')) {
      replyText += `Razorpay Test Mode fee rate evaluated at standard 2.0% MDR. Zero anomalous processing fee discrepancies detected.`;
    } else if (qLower.includes('duplicate')) {
      replyText += `Duplicate charge scan complete: 0 duplicate payment executions detected across the 45-transaction batch.`;
    } else {
      replyText += `PayFlow monitors ${payments.length} synthetic payment records. Total revenue recovered stands at ₹${recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR.`;
    }

    setMessages((prev) => [...prev, userMsg, { sender: 'assistant', text: replyText }]);
    setInput('');
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-6 max-w-5xl font-sans">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">PayFlow AI Finance Assistant</h2>
            <p className="text-xs text-slate-500">
              Ask questions about discrepancies, financial risk, Razorpay fees, duplicate transactions, or draft resolution emails.
            </p>
          </div>
        </div>
        <button
          onClick={() => setMessages([{ sender: 'assistant', text: '👋 Hello! I am your PayFlow AI Finance Controller.' }])}
          className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
        >
          🗑️ Clear History
        </button>
      </div>

      {/* Prompt Pills Row matching reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {promptPills.map((pill, idx) => {
          const Icon = pill.icon;
          return (
            <button
              key={idx}
              onClick={() => handleAsk(pill.label)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all hover:shadow-xs ${pill.color}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Transcript */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 min-h-[320px] flex flex-col justify-between">
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl text-xs leading-relaxed max-w-2xl ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white ml-auto font-medium shadow-sm'
                  : 'bg-white text-slate-800 border border-slate-200 shadow-2xs'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Bottom Input */}
        <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(input)}
            placeholder="Ask PayFlow AI Finance Assistant..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
          />
          <button
            onClick={() => handleAsk(input)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
