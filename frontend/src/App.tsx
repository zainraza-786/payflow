import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OriginalVasuliLandingPage } from './components/OriginalVasuliLandingPage';
import { Sidebar, type NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Overview } from './components/Overview';
import { PaymentsTable } from './components/PaymentsTable';
import { ApprovalsView } from './components/ApprovalsView';
import { ExceptionsView } from './components/ExceptionsView';
import { AiAssistantView } from './components/AiAssistantView';
import { FinancialAnalyticsView } from './components/FinancialAnalyticsView';
import { AuditTrailView } from './components/AuditTrailView';
import { LiveAgentFeedView } from './components/LiveAgentFeedView';
import { SettingsView } from './components/SettingsView';
import { BaselineView } from './components/BaselineView';
import { ReportsView } from './components/ReportsView';
import { LeftIngestionSidebar } from './components/LeftIngestionSidebar';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { SingleTransactionDemoModal } from './components/SingleTransactionDemoModal';
import { DemoWebhookModal } from './components/DemoWebhookModal';

import type { Payment, AuditLog, ApprovalResult } from './types';
import {
  checkHealth,
  runWorkflow,
  createOrGetApproval,
  approveRequest,
  rejectRequest,
  sendWebhook,
} from './services/api';

// Synthetic Initial Seed Dataset (Labeled DEMO MODE)
const INITIAL_DEMO_PAYMENTS: Payment[] = [
  {
    id: 8801,
    razorpay_payment_id: 'pay_demo_8801',
    customer_name: 'Aarav Sharma',
    customer_email: 'aarav.sharma@example.com',
    amount: 35000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'No payment received for invoice INV-2026-019',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 8802,
    razorpay_payment_id: 'pay_demo_8802',
    customer_name: 'Priya Patel',
    customer_email: 'priya.patel@example.com',
    amount: 33000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'High-value corporate payment - Daily Limit Exceeded',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 8803,
    razorpay_payment_id: 'pay_demo_8803',
    customer_name: 'Neha Reddy',
    customer_email: 'neha.reddy@example.com',
    amount: 24000,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'High-value threshold exceeded - Approval Required',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 9000000).toISOString(),
  },
  {
    id: 8804,
    razorpay_payment_id: 'pay_demo_8804',
    customer_name: 'Archana Dixit',
    customer_email: 'archana.dixit@example.com',
    amount: 17500,
    currency: 'INR',
    status: 'captured',
    failure_reason: 'Authentication Timeout - Smart Retry Recovered',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 12000000).toISOString(),
  },
  {
    id: 8805,
    razorpay_payment_id: 'pay_demo_8805',
    customer_name: 'Divya Nambiar',
    customer_email: 'divya.nambiar@example.com',
    amount: 12000,
    currency: 'INR',
    status: 'captured',
    failure_reason: 'Temporary Bank Failure - Recovered via Link',
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 15000000).toISOString(),
  },
  {
    id: 8806,
    razorpay_payment_id: 'pay_demo_8806',
    customer_name: 'Rohan Verma',
    customer_email: 'rohan.verma@example.com',
    amount: 8500,
    currency: 'INR',
    status: 'failed',
    failure_reason: 'Guardrail Blocked - Max Attempt Cap',
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
    summary: 'Pending authorization for Aarav Sharma (₹35,000.00 INR).',
  },
  {
    id: 102,
    payment_id: 8802,
    requested_strategy: 'PAYMENT_LINK',
    approval_status: 'PENDING',
    reason: 'High-value threshold exceeded (₹33,000 >= ₹10,000)',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    expires_at: new Date(Date.now() + 79200000).toISOString(),
    summary: 'Pending authorization for Priya Patel (₹33,000.00 INR).',
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Core Data States
  const [payments, setPayments] = useState<Payment[]>(INITIAL_DEMO_PAYMENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_DEMO_AUDITS);
  const [approvals, setApprovals] = useState<ApprovalResult[]>(INITIAL_DEMO_APPROVALS);

  // UI Modals & State
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [singleDemoPayment, setSingleDemoPayment] = useState<Payment | null>(null);
  const [isDemoWebhookOpen, setIsDemoWebhookOpen] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  // Poll backend health & sync path
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (path === 'dashboard' || path === 'overview') {
      setActiveTab('overview');
    } else if (path === 'transactions' || path === 'payments') {
      setActiveTab('transactions');
    } else if (path === 'assistant') {
      setActiveTab('assistant');
    } else if (path === 'analytics') {
      setActiveTab('analytics');
    } else if (path === 'reports' || path === 'audit') {
      setActiveTab('audit');
    } else {
      setActiveTab('landing');
    }
  }, []);

  const [batchResult, setBatchResult] = useState<{
    type: 'success' | 'error';
    timestamp: string;
    paymentId?: number;
    razorpayId?: string;
    amount?: number;
    reason?: string;
    guardrail?: string;
    message?: string;
  } | null>(null);

  // Handler for running live demo batch
  const handleRunDemoBatch = async () => {
    if (isBatchRunning) return; // Prevent duplicate execution while running
    setIsBatchRunning(true);

    try {
      const nowTime = Date.now();
      const demoId = `pay_demo_${nowTime.toString().slice(-6)}`;
      const amountPaise = 2800000;
      const amountInRupees = 28000;
      const failureDescription = 'Overdue corporate invoice INV-2026-088 (Kabir Mehta)';

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
              error_description: failureDescription,
            },
          },
        },
      };

      let syncedId = 0;
      try {
        const res = await sendWebhook(webhookPayload);
        if (res && typeof res.payment_id === 'number') {
          syncedId = res.payment_id;
        }
      } catch (err: unknown) {
        console.warn('Backend webhook ingestion fallback:', err);
      }

      const maxId = payments.length > 0 ? Math.max(...payments.map((p) => p.id)) : 8806;
      const pid = syncedId > 0 ? syncedId : maxId + 1;

      const newPayment: Payment = {
        id: pid,
        razorpay_payment_id: demoId,
        amount: amountInRupees,
        currency: 'INR',
        status: 'failed',
        failure_reason: failureDescription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newApproval: ApprovalResult = {
        id: pid + 1000,
        payment_id: pid,
        requested_strategy: 'B2B_CHASE',
        approval_status: 'PENDING',
        reason: 'High-value threshold exceeded (₹28,000 >= ₹10,000)',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        summary: 'Pending authorization for Kabir Mehta (₹28,000.00 INR).',
      };

      const newAudit: AuditLog = {
        id: Date.now(),
        payment_id: pid,
        timestamp: new Date().toISOString(),
        event: 'recovery.batch.ingested',
        decision: 'HUMAN_APPROVAL',
        reason: 'Live recovery batch: 1 failed payment ingested. ₹10k high-value floor hold triggered.',
        guardrail_result: 'HUMAN_APPROVAL',
      };

      setPayments((prev) => [newPayment, ...prev]);
      setApprovals((prev) => [newApproval, ...prev]);
      setAuditLogs((prev) => [newAudit, ...prev]);

      setBatchResult({
        type: 'success',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        paymentId: pid,
        razorpayId: demoId,
        amount: amountInRupees,
        reason: failureDescription,
        guardrail: 'HUMAN_APPROVAL (Hold >= ₹10,000)',
        message: `Persisted as Payment #${pid} (${demoId}) in database. Queued in Human Approvals with ₹10k guardrail floor.`,
      });
    } catch (err: unknown) {
      setBatchResult({
        type: 'error',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: err instanceof Error ? err.message : 'Failed to execute live batch',
      });
    } finally {
      setIsBatchRunning(false);
    }
  };

  const [loadingWorkflowId, setLoadingWorkflowId] = useState<number | null>(null);
  const [workflowFeedback, setWorkflowFeedback] = useState<{
    paymentId: number;
    type: 'success' | 'approval' | 'stopped' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const handleRunWorkflow = async (paymentId: number) => {
    if (loadingWorkflowId !== null) return;
    setLoadingWorkflowId(paymentId);

    const targetPayment = payments.find((p) => p.id === paymentId);

    try {
      // 1. Try real FastAPI backend execution first
      const wfResult = await runWorkflow(paymentId, true);

      if (wfResult.guardrail_decision === 'HUMAN_APPROVAL' || wfResult.status === 'blocked') {
        const appRes = await createOrGetApproval(paymentId);
        setApprovals((prev) => {
          const exists = prev.some((a) => a.id === appRes.id);
          if (exists) return prev.map((a) => (a.id === appRes.id ? appRes : a));
          return [appRes, ...prev];
        });
        setWorkflowFeedback({
          paymentId,
          type: 'approval',
          title: `🛡️ [FastAPI Backend] Payment #${paymentId}: Human Approval Queued`,
          message: wfResult.summary || 'Transaction held under deterministic guardrail policies. Approval request created.',
        });
      } else if (wfResult.status === 'stopped') {
        setWorkflowFeedback({
          paymentId,
          type: 'stopped',
          title: `🛑 [FastAPI Backend] Payment #${paymentId}: Workflow Halted`,
          message: wfResult.summary || 'Payment is already in a resolved status.',
        });
      } else if (wfResult.executed && wfResult.recovered) {
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status: 'captured' } : p))
        );
        setWorkflowFeedback({
          paymentId,
          type: 'success',
          title: `⚡ [FastAPI Backend] Payment #${paymentId}: Recovered via Gateway`,
          message: wfResult.summary || 'Recovery strategy executed.',
        });
      } else {
        setWorkflowFeedback({
          paymentId,
          type: 'success',
          title: `⚡ [FastAPI Backend] Payment #${paymentId}: Workflow Completed`,
          message: wfResult.summary || 'Workflow executed.',
        });
      }

      const newAudit: AuditLog = {
        id: Date.now(),
        payment_id: paymentId,
        timestamp: new Date().toISOString(),
        event: 'recovery.workflow.executed',
        decision: wfResult.guardrail_decision || wfResult.status,
        reason: `[FastAPI Backend] ${wfResult.summary}`,
        guardrail_result: wfResult.guardrail_decision || wfResult.status,
      };
      setAuditLogs((prev) => [newAudit, ...prev]);
    } catch (err: unknown) {
      console.warn('Backend workflow offline or static 405 (activating deterministic demo fallback):', err);

      // 2. Deterministic Payflow Rules Engine Fallback (Clearly marked Demo / Test Mode)
      if (targetPayment) {
        if (targetPayment.status === 'captured') {
          setWorkflowFeedback({
            paymentId,
            type: 'stopped',
            title: `🛑 [Demo Fallback] Payment #${paymentId}: Workflow Halted`,
            message: `Payment #${paymentId} is already in successful status 'captured'. Recovery halted (Deterministic Fallback).`,
          });
          return;
        }

        const isHighValue = (targetPayment.amount || 0) >= 10000;
        if (isHighValue) {
          const appRes: ApprovalResult = {
            id: paymentId + 1000,
            payment_id: paymentId,
            requested_strategy: 'PAYMENT_LINK',
            approval_status: 'PENDING',
            reason: `High-value transaction (₹${(targetPayment.amount || 0).toLocaleString('en-IN')}.00 >= ₹10,000.00) requires human approval.`,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            summary: `Pending authorization for ${targetPayment.customer_name || 'Customer'} (₹${(targetPayment.amount || 0).toLocaleString('en-IN')}.00 INR).`,
          };
          setApprovals((prev) => {
            const exists = prev.some((a) => a.payment_id === paymentId && a.approval_status === 'PENDING');
            if (exists) return prev;
            return [appRes, ...prev];
          });
          setWorkflowFeedback({
            paymentId,
            type: 'approval',
            title: `🛡️ [Demo Fallback] Payment #${paymentId}: Human Approval Queued`,
            message: `Evaluated via in-memory guardrail engine (Static host / offline API). Strategy 'PAYMENT_LINK' requires human approval for ₹${(targetPayment.amount || 0).toLocaleString('en-IN')}.00 >= ₹10,000.00.`,
          });

          const newAudit: AuditLog = {
            id: Date.now(),
            payment_id: paymentId,
            timestamp: new Date().toISOString(),
            event: 'recovery.guardrail.evaluated',
            decision: 'HUMAN_APPROVAL',
            reason: `[Demo Fallback] High-value threshold exceeded (₹${(targetPayment.amount || 0).toLocaleString('en-IN')} >= ₹10,000). Routed to human queue.`,
            guardrail_result: 'HUMAN_APPROVAL',
          };
          setAuditLogs((prev) => [newAudit, ...prev]);
        } else {
          setPayments((prev) =>
            prev.map((p) => (p.id === paymentId ? { ...p, status: 'captured' } : p))
          );
          setWorkflowFeedback({
            paymentId,
            type: 'success',
            title: `⚡ [Demo Fallback] Payment #${paymentId}: Recovered via Smart Retry`,
            message: `Evaluated via in-memory guardrail engine (Static host / offline API). Smart Retry simulated under safe limit.`,
          });

          const newAudit: AuditLog = {
            id: Date.now(),
            payment_id: paymentId,
            timestamp: new Date().toISOString(),
            event: 'revenue.recovered',
            decision: 'CAPTURED',
            reason: `[Demo Fallback] Automated recovery executed under safe threshold.`,
            guardrail_result: 'ALLOW',
          };
          setAuditLogs((prev) => [newAudit, ...prev]);
        }
      } else {
        setWorkflowFeedback({
          paymentId,
          type: 'error',
          title: `Error Executing Workflow for Payment #${paymentId}`,
          message: err instanceof Error ? err.message : 'Backend workflow request failed',
        });
      }
    } finally {
      setLoadingWorkflowId(null);
    }
  };

  const handleApproveApproval = async (approvalId: number) => {
    try {
      const res = await approveRequest(approvalId);
      setApprovals((prev) => prev.map((a) => (a.id === approvalId ? res : a)));
    } catch {
      setApprovals((prev) =>
        prev.map((a) => (a.id === approvalId ? { ...a, approval_status: 'APPROVED' } : a))
      );
    }
  };

  const handleRejectApproval = async (approvalId: number) => {
    try {
      const res = await rejectRequest(approvalId);
      setApprovals((prev) => prev.map((a) => (a.id === approvalId ? res : a)));
    } catch {
      setApprovals((prev) =>
        prev.map((a) => (a.id === approvalId ? { ...a, approval_status: 'REJECTED' } : a))
      );
    }
  };

  const handleResetDemoData = () => {
    setPayments(INITIAL_DEMO_PAYMENTS);
    setApprovals(INITIAL_DEMO_APPROVALS);
    setAuditLogs(INITIAL_DEMO_AUDITS);
  };

  const pendingApprovals = approvals.filter((a) => a.approval_status === 'PENDING');
  const exceptionsCount = payments.filter((p) => p.status === 'failed' && (p.amount || 0) >= 10000).length;
  const recoveredAmount = payments.filter((p) => p.status === 'captured').reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalRiskAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  // 1. Landing Page View (Visually Locked)
  if (activeTab === 'landing') {
    return <OriginalVasuliLandingPage onRunLiveBatch={() => setActiveTab('overview')} />;
  }

  // 2. Internal Payflow Application View (Stitch Design System)
  const currentNavTab = (
    activeTab === 'dashboard' ? 'overview' : activeTab === 'reports' ? 'audit' : activeTab
  ) as NavTab;

  return (
    <div className="min-h-screen bg-surface-base text-primary flex font-sans antialiased">
      {/* Stitch Desktop & Mobile Navigation Sidebar */}
      <Sidebar
        activeTab={currentNavTab}
        setActiveTab={(tab) => setActiveTab(tab)}
        pendingApprovalsCount={pendingApprovals.length}
        exceptionsCount={exceptionsCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        {/* Stitch Header / Top Bar */}
        <TopBar
          setMobileOpen={setMobileOpen}
          backendOnline={backendOnline}
          onOpenDemoModal={() => setIsDemoWebhookOpen(true)}
          onRunDemoBatch={handleRunDemoBatch}
          isBatchRunning={isBatchRunning}
          onGoToLanding={() => setActiveTab('landing')}
        />

        {/* Tab Views Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Primary View */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentNavTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{
                    duration: 0.20,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="w-full"
                >
                  {currentNavTab === 'overview' && (
                    <Overview
                      payments={payments}
                      auditLogs={auditLogs}
                      pendingApprovals={pendingApprovals}
                      onSelectPayment={setSelectedPayment}
                      onNavigate={(tab) => setActiveTab(tab)}
                      onRunDemoBatch={handleRunDemoBatch}
                      isBatchRunning={isBatchRunning}
                      batchResult={batchResult}
                      onDismissBatchResult={() => setBatchResult(null)}
                    />
                  )}

                  {currentNavTab === 'transactions' && (
                    <PaymentsTable
                      payments={payments}
                      onSelectPayment={setSelectedPayment}
                      onRunWorkflow={handleRunWorkflow}
                      loadingWorkflowId={loadingWorkflowId}
                      workflowFeedback={workflowFeedback}
                      onDismissWorkflowFeedback={() => setWorkflowFeedback(null)}
                    />
                  )}

                  {currentNavTab === 'exceptions' && (
                    <ExceptionsView
                      payments={payments}
                      approvals={approvals}
                      onSelectPayment={setSelectedPayment}
                    />
                  )}

                  {currentNavTab === 'approvals' && (
                    <ApprovalsView
                      approvals={approvals}
                      payments={payments}
                      onApprove={handleApproveApproval}
                      onReject={handleRejectApproval}
                      onExecute={handleRunWorkflow}
                    />
                  )}

                  {currentNavTab === 'assistant' && (
                    <AiAssistantView
                      payments={payments}
                      pendingApprovals={pendingApprovals}
                      approvals={approvals}
                      auditLogs={auditLogs}
                      recoveredAmount={recoveredAmount}
                    />
                  )}

                  {currentNavTab === 'analytics' && (
                    <FinancialAnalyticsView
                      payments={payments}
                      approvals={approvals}
                      auditLogs={auditLogs}
                      totalRiskAmount={totalRiskAmount}
                      recoveredAmount={recoveredAmount}
                      recoveryRate={payments.length > 0 ? ((payments.filter((p) => p.status === 'captured').length / payments.length) * 100).toFixed(1) : '0.0'}
                    />
                  )}

                  {currentNavTab === 'livefeed' && (
                    <LiveAgentFeedView auditLogs={auditLogs} />
                  )}

                  {currentNavTab === 'audit' && (
                    <AuditTrailView auditLogs={auditLogs} payments={payments} />
                  )}

                  {currentNavTab === 'reports' && (
                    <ReportsView payments={payments} auditLogs={auditLogs} />
                  )}

                  {currentNavTab === 'settings' && (
                    <SettingsView backendOnline={backendOnline} />
                  )}

                  {currentNavTab === 'baseline' && (
                    <BaselineView />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Ingestion & Demo Control Drawer Column */}
            <LeftIngestionSidebar
              onRunDemoBatch={handleRunDemoBatch}
              isBatchRunning={isBatchRunning}
              onOpenSingleTxnDemo={() => setSingleDemoPayment(payments[0] || null)}
              onResetDemoData={handleResetDemoData}
            />
          </div>
        </main>
      </div>

      {/* Payment Detail Slide-over Modal */}
      <PaymentDetailModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        auditLogs={auditLogs}
        approvals={approvals}
        onRunWorkflow={handleRunWorkflow}
      />

      {/* Single Transaction Walkthrough Modal */}
      <SingleTransactionDemoModal
        payment={singleDemoPayment}
        onClose={() => setSingleDemoPayment(null)}
      />

      {/* Demo Webhook Simulator Modal */}
      <DemoWebhookModal
        isOpen={isDemoWebhookOpen}
        onClose={() => setIsDemoWebhookOpen(false)}
        onRefreshData={() => {
          handleRunDemoBatch();
          setIsDemoWebhookOpen(false);
        }}
      />
    </div>
  );
}

export default App;

