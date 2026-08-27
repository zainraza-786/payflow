export type PaymentStatus = 'failed' | 'captured' | 'pending' | 'authorized';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type GuardrailDecision = 'ALLOW' | 'BLOCK' | 'HUMAN_APPROVAL' | 'STOP';

export interface Payment {
  id: number;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface RecoveryAttempt {
  id: number;
  payment_id: number;
  attempt_number: number;
  strategy: string;
  status: string;
  payment_link_id?: string;
  payment_link_url?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  payment_id: number;
  timestamp: string;
  event: string;
  decision: string;
  reason?: string;
  guardrail_result?: string;
}

export interface ApprovalResult {
  id: number;
  payment_id: number;
  recovery_attempt_id?: number;
  requested_strategy: string;
  approval_status: ApprovalStatus;
  reason?: string;
  created_at: string;
  resolved_at?: string;
  expires_at: string;
  summary: string;
}

export interface RecoveryWorkflowResult {
  payment_id: number;
  status: 'completed' | 'skipped' | 'blocked' | 'stopped' | 'not_at_risk' | 'failed';
  is_at_risk: boolean;
  root_cause?: string;
  strategy?: string;
  guardrail_decision?: string;
  executed: boolean;
  execution_status?: string;
  recovery_attempt_id?: number;
  payment_link_id?: string;
  short_url?: string;
  recovered?: boolean;
  summary: string;
}

export interface ExecutionResult {
  payment_id: number;
  executed: boolean;
  strategy: string;
  attempt_number: number;
  payment_link_id?: string;
  short_url?: string;
  status: string;
  amount?: number;
  currency?: string;
  reference_id?: string;
  error?: string;
}

export interface SystemHealth {
  status: string;
  service: string;
}
