import { useState, useEffect, useCallback } from 'react';
import type { NavTab } from './components/Sidebar';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Overview } from './components/Overview';
import { PaymentsTable } from './components/PaymentsTable';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { ApprovalsView } from './components/ApprovalsView';
import { AuditTrailView } from './components/AuditTrailView';
import { SettingsView } from './components/SettingsView';
import { DemoWebhookModal } from './components/DemoWebhookModal';
import { LiveAgentFeedView } from './components/LiveAgentFeedView';
import { ExceptionsView } from './components/ExceptionsView';
import { BaselineView } from './components/BaselineView';
import { FinancialAnalyticsView } from './components/FinancialAnalyticsView';
import { AiAssistantView } from './components/AiAssistantView';
import { SingleTransactionDemoModal } from './components/SingleTransactionDemoModal';

import type { Payment, AuditLog, ApprovalResult } from './types';
import {
  checkHealth,
  runWorkflow,
  createOrGetApproval,
  approveRequest,
  rejectRequest,
  executeApprovedRequest,
  sendWebhook,
} from './services/api';

// Synthetic Initial Seed Dataset (Labeled DEMO MODE)
const INITIAL_DEMO_PAYMENTS: Payment[] = [
  {
    id: 8801,
    razorpay_payment_id: 'pay_demo_8801',
    amount: 25000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'Insufficient Funds - High-value threshold exceeded',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 8802,
    razorpay_payment_id: 'pay_demo_8802',
    amount: 45000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'Daily Limit Exceeded - Corporate Account',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 8803,
    razorpay_payment_id: 'pay_demo_8803',
    amount: 8500,
    currency: 'INR',
    status: 'captured',
    failure_reason: 'Authentication Timeout - Recovered via Link',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 9000000).toISOString(),
  },
  {
    id: 8804,
    razorpay_payment_id: 'pay_demo_8804',
    amount: 1200,
    currency: 'INR',
    status: 'captured',
    failure_reason: 'Temporary Bank Failure - Smart Retry Recovered',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 12000000).toISOString(),
  },
  {
    id: 8805,
    razorpay_payment_id: 'pay_demo_8805',
    amount: 75300,
    currency: 'INR',
    status: 'captured',
    failure_reason: 'Authentication Timeout - Recovered',
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 15000000).toISOString(),
  },
  {
    id: 8806,
    razorpay_payment_id: 'pay_demo_8806',
    amount: 22000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'Guardrail Blocked - Max 2 Attempt Limit Reached',
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
    reason: 'High-value threshold exceeded (₹25,000 >= ₹10,000)',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: new Date(Date.now() + 82800000).toISOString(),
    summary: 'Pending authorization for Rohan Mehta (₹25,000.00 INR).',
  },
  {
    id: 102,
    payment_id: 8802,
    requested_strategy: 'PAYMENT_LINK',
    approval_status: 'PENDING',
    reason: 'High-value threshold exceeded (₹45,000 >= ₹10,000)',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    expires_at: new Date(Date.now() + 79200000).toISOString(),
    summary: 'Pending authorization for Acme Demo Pvt Ltd (₹45,000.00 INR).',
  },
];

const INITIAL_DEMO_AUDITS: AuditLog[] = [
  {
    id: 901,
    payment_id: 8801,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    event: 'recovery.approval.requested',
    decision: 'HUMAN_APPROVAL',
    reason: 'High-value threshold exceeded (₹25,000 >= ₹10,000)',
    guardrail_result: 'HUMAN_APPROVAL',
  },
  {
    id: 902,
    payment_id: 8803,
    timestamp: new Date(Date.now() - 9000000).toISOString(),
    event: 'revenue.recovered',
    decision: 'CAPTURED',
    reason: 'Attributed to attempt #1 (Sneha Kulkarni - PAYMENT_LINK)',
    guardrail_result: 'ALLOW',
  },
  {
    id: 903,
    payment_id: 8804,
    timestamp: new Date(Date.now() - 12000000).toISOString(),
    event: 'revenue.recovered',
    decision: 'CAPTURED',
    reason: 'Attributed to attempt #1 (Smart Retry)',
    guardrail_result: 'ALLOW',
  },
  {
    id: 904,
    payment_id: 8806,
    timestamp: new Date(Date.now() - 21600000).toISOString(),
    event: 'recovery.execution.blocked',
    decision: 'BLOCK',
    reason: 'Max attempt limit reached (2/2 attempts)',
    guardrail_result: 'BLOCK',
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Core Data States
  const [payments, setPayments] = useState<Payment[]>(INITIAL_DEMO_PAYMENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_DEMO_AUDITS);
  const [approvals, setApprovals] = useState<ApprovalResult[]>(INITIAL_DEMO_APPROVALS);

  // UI Modal & Selection States
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [singleDemoPayment, setSingleDemoPayment] = useState<Payment | null>(null);
  const [loadingWorkflowId, setLoadingWorkflowId] = useState<number | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Poll backend health
  const refreshData = useCallback(async () => {
    try {
      const health = await checkHealth();
      setBackendOnline(health.status === 'ok');
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Handler for running live demo batch
  const handleRunDemoBatch = async () => {
    setIsBatchRunning(true);
    try {
      const demoId = `pay_demo_${Date.now().toString().slice(-5)}`;
      const amountPaise = 28500 * 100; // ₹28,500 High-value test

      // Ingest payment failure webhook
      const webhookPayload = {
        entity: 'event',
        account_id: 'acc_batch_runner',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: demoId,
              amount: amountPaise,
              currency: 'INR',
              status: 'failed',
              error_description: 'Insufficient Funds - Rohan Mehta',
            },
          },
        },
      };

      try {
        await sendWebhook(webhookPayload);
      } catch {
        // Fallback for offline local state update
      }

      const newPayId = Date.now();
      const newPayment: Payment = {
        id: newPayId,
        razorpay_payment_id: demoId,
        amount: 28500,
        currency: 'INR',
        status: 'failed',
        failure_reason: 'Insufficient Funds - Rohan Mehta',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newApproval: ApprovalResult = {
        id: Date.now() + 1,
        payment_id: newPayId,
        requested_strategy: 'PAYMENT_LINK',
        approval_status: 'PENDING',
        reason: 'High-value threshold exceeded (₹28,500 >= ₹10,000)',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        summary: 'Pending authorization for Rohan Mehta (₹28,500.00 INR).',
      };

      const newAudit1: AuditLog = {
        id: Date.now() + 2,
        payment_id: newPayId,
        timestamp: new Date().toISOString(),
        event: 'payment.failed',
        decision: 'OBSERVED',
        reason: 'Ingested via Razorpay webhook simulator',
      };

      const newAudit2: AuditLog = {
        id: Date.now() + 3,
        payment_id: newPayId,
        timestamp: new Date().toISOString(),
        event: 'recovery.approval.requested',
        decision: 'HUMAN_APPROVAL',
        reason: 'High-value threshold exceeded (₹28,500 >= ₹10,000)',
        guardrail_result: 'HUMAN_APPROVAL',
      };

      setPayments((prev) => [newPayment, ...prev]);
      setApprovals((prev) => [newApproval, ...prev]);
      setAuditLogs((prev) => [newAudit2, newAudit1, ...prev]);
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Handler for running workflow on a payment
  const handleRunWorkflow = async (paymentId: number) => {
    setLoadingWorkflowId(paymentId);
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

      const newAudit: AuditLog = {
        id: Date.now(),
        payment_id: paymentId,
        timestamp: new Date().toISOString(),
        event: 'recovery.workflow.completed',
        decision: wfResult.guardrail_decision || 'COMPLETED',
        reason: wfResult.summary,
        guardrail_result: wfResult.guardrail_decision,
      };
      setAuditLogs((prev) => [newAudit, ...prev]);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingWorkflowId(null);
    }
  };

  // Handlers for Human Approval Gate Actions
  const handleApprove = async (approvalId: number, reason?: string) => {
    try {
      const res = await approveRequest(approvalId, reason);
      setApprovals((prev) => prev.map((a) => (a.id === approvalId ? res : a)));
    } catch {
      setApprovals((prev) =>
        prev.map((a) => (a.id === approvalId ? { ...a, approval_status: 'APPROVED' } : a))
      );
    }

    const app = approvals.find((a) => a.id === approvalId);
    const newAudit: AuditLog = {
      id: Date.now(),
      payment_id: app ? app.payment_id : approvalId,
      timestamp: new Date().toISOString(),
      event: 'recovery.approval.approved',
      decision: 'APPROVED',
      reason: 'Approved by human compliance officer',
      guardrail_result: 'ALLOW',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleReject = async (approvalId: number, reason?: string) => {
    try {
      const res = await rejectRequest(approvalId, reason);
      setApprovals((prev) => prev.map((a) => (a.id === approvalId ? res : a)));
    } catch {
      setApprovals((prev) =>
        prev.map((a) => (a.id === approvalId ? { ...a, approval_status: 'REJECTED' } : a))
      );
    }

    const app = approvals.find((a) => a.id === approvalId);
    const newAudit: AuditLog = {
      id: Date.now(),
      payment_id: app ? app.payment_id : approvalId,
      timestamp: new Date().toISOString(),
      event: 'recovery.approval.rejected',
      decision: 'REJECTED',
      reason: 'Rejected by compliance officer',
      guardrail_result: 'BLOCK',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleExecute = async (approvalId: number) => {
    const app = approvals.find((a) => a.id === approvalId);
    if (!app) return;

    try {
      const execRes = await executeApprovedRequest(approvalId);
      if (execRes.executed || execRes.status === 'reused') {
        setPayments((prev) =>
          prev.map((p) => (p.id === app.payment_id ? { ...p, status: 'captured' } : p))
        );
      }
    } catch {
      setPayments((prev) =>
        prev.map((p) => (p.id === app.payment_id ? { ...p, status: 'captured' } : p))
      );
    }

    const newAudit: AuditLog = {
      id: Date.now(),
      payment_id: app.payment_id,
      timestamp: new Date().toISOString(),
      event: 'revenue.recovered',
      decision: 'CAPTURED',
      reason: `Attributed to approval #${approvalId} (PAYMENT_LINK)`,
      guardrail_result: 'ALLOW',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const pendingApprovalsCount = approvals.filter((a) => a.approval_status === 'PENDING').length;
  const exceptionsCount = pendingApprovalsCount + payments.filter((p) => (p.amount || 0) >= 20000 && p.status === 'failed').length;
  const totalRiskAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const recoveredAmount = payments.filter((p) => p.status === 'captured').reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        exceptionsCount={exceptionsCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="lg:pl-64 flex flex-col flex-1">
        <TopBar
          setMobileOpen={setMobileOpen}
          backendOnline={backendOnline}
          onOpenDemoModal={() => setDemoModalOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'overview' && (
            <Overview
              payments={payments}
              auditLogs={auditLogs}
              pendingApprovals={approvals.filter((a) => a.approval_status === 'PENDING')}
              onSelectPayment={setSelectedPayment}
              onNavigate={setActiveTab}
              onRunDemoBatch={handleRunDemoBatch}
              isBatchRunning={isBatchRunning}
            />
          )}

          {(activeTab === 'transactions' || activeTab === 'payments') && (
            <PaymentsTable
              payments={payments}
              onSelectPayment={setSelectedPayment}
              onRunWorkflow={handleRunWorkflow}
              loadingWorkflowId={loadingWorkflowId}
            />
          )}

          {activeTab === 'analytics' && (
            <FinancialAnalyticsView
              totalRiskAmount={totalRiskAmount}
              recoveredAmount={recoveredAmount}
              recoveryRate={payments.length > 0 ? ((payments.filter((p) => p.status === 'captured').length / payments.length) * 100).toFixed(1) : '0.0'}
            />
          )}

          {activeTab === 'approvals' && (
            <ApprovalsView
              approvals={approvals}
              payments={payments}
              onApprove={handleApprove}
              onReject={handleReject}
              onExecute={handleExecute}
            />
          )}

          {activeTab === 'exceptions' && (
            <ExceptionsView
              payments={payments}
              approvals={approvals}
              onSelectPayment={setSelectedPayment}
            />
          )}

          {activeTab === 'livefeed' && <LiveAgentFeedView auditLogs={auditLogs} />}

          {activeTab === 'audit' && <AuditTrailView auditLogs={auditLogs} />}

          {activeTab === 'baseline' && <BaselineView />}

          {activeTab === 'assistant' && (
            <AiAssistantView
              payments={payments}
              pendingApprovals={approvals.filter((a) => a.approval_status === 'PENDING')}
              recoveredAmount={recoveredAmount}
            />
          )}

          {activeTab === 'settings' && <SettingsView backendOnline={backendOnline} />}
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

      {/* Interactive Webhook Demo Runner Modal */}
      <DemoWebhookModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onRefreshData={refreshData}
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
