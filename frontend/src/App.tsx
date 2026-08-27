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

import type { Payment, AuditLog, ApprovalResult } from './types';
import {
  checkHealth,
  runWorkflow,
  createOrGetApproval,
  approveRequest,
  rejectRequest,
  executeApprovedRequest,
} from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Core Data States
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [approvals, setApprovals] = useState<ApprovalResult[]>([]);

  // UI Modal & Selection States
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [loadingWorkflowId, setLoadingWorkflowId] = useState<number | null>(null);

  // Poll backend health & refresh local simulation telemetry
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

  // Handler for running workflow on a payment
  const handleRunWorkflow = async (paymentId: number) => {
    setLoadingWorkflowId(paymentId);
    try {
      const wfResult = await runWorkflow(paymentId, true);

      // If workflow required human approval, automatically record/fetch approval
      if (wfResult.guardrail_decision === 'HUMAN_APPROVAL') {
        const appRes = await createOrGetApproval(paymentId);
        setApprovals((prev) => {
          const exists = prev.some((a) => a.id === appRes.id);
          if (exists) return prev.map((a) => (a.id === appRes.id ? appRes : a));
          return [appRes, ...prev];
        });
      }

      // Add synthetic audit log entry for UI feed
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
    const res = await approveRequest(approvalId, reason);
    setApprovals((prev) => prev.map((a) => (a.id === approvalId ? res : a)));

    // Log audit event
    const newAudit: AuditLog = {
      id: Date.now(),
      payment_id: res.payment_id,
      timestamp: new Date().toISOString(),
      event: 'recovery.approval.approved',
      decision: 'APPROVED',
      reason: res.summary,
      guardrail_result: 'ALLOW',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleReject = async (approvalId: number, reason?: string) => {
    const res = await rejectRequest(approvalId, reason);
    setApprovals((prev) => prev.map((a) => (a.id === approvalId ? res : a)));

    // Log audit event
    const newAudit: AuditLog = {
      id: Date.now(),
      payment_id: res.payment_id,
      timestamp: new Date().toISOString(),
      event: 'recovery.approval.rejected',
      decision: 'REJECTED',
      reason: res.summary,
      guardrail_result: 'BLOCK',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleExecute = async (approvalId: number) => {
    const execRes = await executeApprovedRequest(approvalId);

    if (execRes.executed || execRes.status === 'reused') {
      // Update payment status to indicate payment link generated
      setPayments((prev) =>
        prev.map((p) => (p.id === execRes.payment_id ? { ...p, status: 'failed' } : p))
      );
    }

    // Log execution audit event
    const newAudit: AuditLog = {
      id: Date.now(),
      payment_id: execRes.payment_id,
      timestamp: new Date().toISOString(),
      event: execRes.executed ? 'recovery.payment_link.created' : 'recovery.execution.blocked',
      decision: execRes.status.toUpperCase(),
      reason: execRes.error || `Payment link generated: ${execRes.payment_link_id}`,
      guardrail_result: execRes.executed ? 'ALLOW' : 'BLOCK',
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  // Helper when webhooks are ingested from demo modal
  const handleDataRefreshedFromDemo = () => {
    refreshData();
  };

  const pendingApprovalsCount = approvals.filter((a) => a.approval_status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="lg:pl-64 flex flex-col flex-1">
        <TopBar
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          backendOnline={backendOnline}
          onOpenDemoModal={() => setDemoModalOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <Overview
              payments={payments}
              auditLogs={auditLogs}
              pendingApprovals={approvals.filter((a) => a.approval_status === 'PENDING')}
              onSelectPayment={setSelectedPayment}
              onNavigate={setActiveTab}
              onOpenDemoModal={() => setDemoModalOpen(true)}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsTable
              payments={payments}
              onSelectPayment={setSelectedPayment}
              onRunWorkflow={handleRunWorkflow}
              loadingWorkflowId={loadingWorkflowId}
            />
          )}

          {activeTab === 'recovery' && (
            <PaymentsTable
              payments={payments}
              onSelectPayment={setSelectedPayment}
              onRunWorkflow={handleRunWorkflow}
              loadingWorkflowId={loadingWorkflowId}
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

          {activeTab === 'audit' && <AuditTrailView auditLogs={auditLogs} />}

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
        onRefreshData={handleDataRefreshedFromDemo}
      />
    </div>
  );
}

export default App;
