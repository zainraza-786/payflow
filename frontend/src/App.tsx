import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { ExecutiveHeader } from './components/ExecutiveHeader';
import { LeftIngestionSidebar } from './components/LeftIngestionSidebar';
import { ExecutiveDashboardView } from './components/ExecutiveDashboardView';
import { TransactionAuditView } from './components/TransactionAuditView';
import { AiAssistantView } from './components/AiAssistantView';
import { FinancialAnalyticsView } from './components/FinancialAnalyticsView';
import { ReportsView } from './components/ReportsView';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { SingleTransactionDemoModal } from './components/SingleTransactionDemoModal';

import type { Payment, AuditLog, ApprovalResult } from './types';
import {
  checkHealth,
  runWorkflow,
  createOrGetApproval,
  sendWebhook,
} from './services/api';

// Synthetic Initial Seed Dataset (Labeled DEMO MODE)
const INITIAL_DEMO_PAYMENTS: Payment[] = [
  {
    id: 8801,
    razorpay_payment_id: 'pay_demo_8801',
    amount: 35000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'No payment received for invoice INV-2026-019 (Amitabh Saxena)',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 8802,
    razorpay_payment_id: 'pay_demo_8802',
    amount: 33000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'High-value corporate payment - Daily Limit Exceeded (Alia Bhatt)',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 8803,
    razorpay_payment_id: 'pay_demo_8803',
    amount: 24000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'High-value threshold exceeded - Approval Required (Neha Reddy)',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 9000000).toISOString(),
  },
  {
    id: 8804,
    razorpay_payment_id: 'pay_demo_8804',
    amount: 17500,
    currency: 'INR',
    status: 'captured',
    failure_reason: 'Authentication Timeout - Smart Retry Recovered (Archana Dixit)',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 12000000).toISOString(),
  },
  {
    id: 8805,
    razorpay_payment_id: 'pay_demo_8805',
    amount: 12000,
    currency: 'INR',
    status: 'captured',
    failure_reason: 'Temporary Bank Failure - Recovered via Link (Divya Nambiar)',
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 15000000).toISOString(),
  },
  {
    id: 8806,
    razorpay_payment_id: 'pay_demo_8806',
    amount: 8500,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'Guardrail Blocked - Max Attempt Cap (Sunil Shetty)',
    created_at: new Date(Date.now() - 21600000).toISOString(),
    updated_at: new Date(Date.now() - 21600000).toISOString(),
  },
];

const INITIAL_DEMO_APPROVALS: ApprovalResult[] = [
  {
    id: 101,
    payment_id: 8801,
    requested_strategy: 'PAYMENT_LINK',
    approval_status: 'PENDING',
    reason: 'High-value threshold exceeded (₹35,000 >= ₹10,000)',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: new Date(Date.now() + 82800000).toISOString(),
    summary: 'Pending authorization for Amitabh Saxena (₹35,000.00 INR).',
  },
  {
    id: 102,
    payment_id: 8802,
    requested_strategy: 'PAYMENT_LINK',
    approval_status: 'PENDING',
    reason: 'High-value threshold exceeded (₹33,000 >= ₹10,000)',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    expires_at: new Date(Date.now() + 79200000).toISOString(),
    summary: 'Pending authorization for Alia Bhatt (₹33,000.00 INR).',
  },
  {
    id: 103,
    payment_id: 8803,
    requested_strategy: 'PAYMENT_LINK',
    approval_status: 'PENDING',
    reason: 'High-value threshold exceeded (₹24,000 >= ₹10,000)',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    expires_at: new Date(Date.now() + 75600000).toISOString(),
    summary: 'Pending authorization for Neha Reddy (₹24,000.00 INR).',
  },
];

const INITIAL_DEMO_AUDITS: AuditLog[] = [
  {
    id: 901,
    payment_id: 8801,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    event: 'recovery.approval.requested',
    decision: 'HUMAN_APPROVAL',
    reason: 'High-value threshold exceeded (₹35,000 >= ₹10,000)',
    guardrail_result: 'HUMAN_APPROVAL',
  },
  {
    id: 902,
    payment_id: 8804,
    timestamp: new Date(Date.now() - 12000000).toISOString(),
    event: 'revenue.recovered',
    decision: 'CAPTURED',
    reason: 'Attributed to attempt #1 (Archana Dixit - Smart Retry)',
    guardrail_result: 'ALLOW',
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<string>('landing');

  // Core Data States
  const [payments, setPayments] = useState<Payment[]>(INITIAL_DEMO_PAYMENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_DEMO_AUDITS);
  const [approvals, setApprovals] = useState<ApprovalResult[]>(INITIAL_DEMO_APPROVALS);

  // UI Modals & State
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [singleDemoPayment, setSingleDemoPayment] = useState<Payment | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Poll backend health & sync path
  useEffect(() => {
    checkHealth().catch(() => {});

    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (path === 'dashboard' || path === 'overview') {
      setActiveTab('dashboard');
    } else if (path === 'transactions' || path === 'audit') {
      setActiveTab('transactions');
    } else if (path === 'assistant') {
      setActiveTab('assistant');
    } else if (path === 'analytics') {
      setActiveTab('analytics');
    } else if (path === 'reports') {
      setActiveTab('reports');
    } else if (path === '' || path === 'landing') {
      setActiveTab('landing');
    }
  }, []);

  // Handler for running live demo batch
  const handleRunDemoBatch = async () => {
    setIsBatchRunning(true);
    try {
      const demoId = `pay_demo_${Date.now().toString().slice(-5)}`;
      const webhookPayload = {
        entity: 'event',
        account_id: 'acc_batch_runner',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: demoId,
              amount: 3500000,
              currency: 'INR',
              status: 'failed',
              error_description: 'Missing payment for invoice INV-2026-019',
            },
          },
        },
      };

      try {
        await sendWebhook(webhookPayload);
      } catch {
        // Fallback offline simulator state
      }

      const newPayId = Date.now();
      const newPayment: Payment = {
        id: newPayId,
        razorpay_payment_id: demoId,
        amount: 35000,
        currency: 'INR',
        status: 'failed',
        failure_reason: 'Missing payment for invoice INV-2026-019 (Amitabh Saxena)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newApproval: ApprovalResult = {
        id: Date.now() + 1,
        payment_id: newPayId,
        requested_strategy: 'PAYMENT_LINK',
        approval_status: 'PENDING',
        reason: 'High-value threshold exceeded (₹35,000 >= ₹10,000)',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        summary: 'Pending authorization for Amitabh Saxena (₹35,000.00 INR).',
      };

      setPayments((prev) => [newPayment, ...prev]);
      setApprovals((prev) => [newApproval, ...prev]);
    } finally {
      setIsBatchRunning(false);
    }
  };

  const handleRunWorkflow = async (paymentId: number) => {
    try {
      const wfResult = await runWorkflow(paymentId, true);
      if (wfResult.guardrail_decision === 'HUMAN_APPROVAL') {
        const appRes = await createOrGetApproval(paymentId);
        setApprovals((prev) => {
          const exists = prev.some((a) => a.id === appRes.id);
          if (exists) return prev.map((a) => (a.id === appRes.id ? appRes : a));
          return [appRes, ...prev];
        });
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleResetDemoData = () => {
    setPayments(INITIAL_DEMO_PAYMENTS);
    setApprovals(INITIAL_DEMO_APPROVALS);
    setAuditLogs(INITIAL_DEMO_AUDITS);
  };

  const pendingApprovals = approvals.filter((a) => a.approval_status === 'PENDING');
  const recoveredAmount = payments.filter((p) => p.status === 'captured').reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalRiskAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  if (activeTab === 'landing') {
    return <LandingPage onEnterApp={() => setActiveTab('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Navigation Bar */}
      <ExecutiveHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onGoToLanding={() => setActiveTab('landing')}
      />

      {/* Main Body Layout: Left Sidebar + Right Content View */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl w-full mx-auto">
        <LeftIngestionSidebar
          onRunDemoBatch={handleRunDemoBatch}
          isBatchRunning={isBatchRunning}
          onOpenSingleTxnDemo={() => setSingleDemoPayment(payments[0] || null)}
          onResetDemoData={handleResetDemoData}
        />

        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <ExecutiveDashboardView
              payments={payments}
              pendingApprovals={pendingApprovals}
              onSelectPayment={setSelectedPayment}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionAuditView
              payments={payments}
              onSelectPayment={setSelectedPayment}
            />
          )}

          {activeTab === 'assistant' && (
            <AiAssistantView
              payments={payments}
              pendingApprovals={pendingApprovals}
              recoveredAmount={recoveredAmount}
            />
          )}

          {activeTab === 'analytics' && (
            <FinancialAnalyticsView
              totalRiskAmount={totalRiskAmount}
              recoveredAmount={recoveredAmount}
              recoveryRate={payments.length > 0 ? ((payments.filter((p) => p.status === 'captured').length / payments.length) * 100).toFixed(1) : '0.0'}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              payments={payments}
              auditLogs={auditLogs}
            />
          )}
        </main>
      </div>

      {/* Slide-over Payment Detail Modal */}
      <PaymentDetailModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        auditLogs={auditLogs}
        approvals={approvals}
        onRunWorkflow={handleRunWorkflow}
      />

      {/* Single Transaction Demo Walkthrough Modal */}
      <SingleTransactionDemoModal
        payment={singleDemoPayment}
        onClose={() => setSingleDemoPayment(null)}
      />
    </div>
  );
}

export default App;
