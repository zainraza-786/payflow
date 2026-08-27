import type {
  SystemHealth,
  RecoveryWorkflowResult,
  ApprovalResult,
  ExecutionResult,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

/**
 * Computes HMAC-SHA256 signature using browser Web Crypto API.
 */
export async function computeHmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function checkHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function runWorkflow(
  paymentId: number,
  executeAllowed: boolean = false
): Promise<RecoveryWorkflowResult> {
  const res = await fetch(`${API_BASE}/recovery/workflow/${paymentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ execute_allowed: executeAllowed }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Workflow failed with status ${res.status}`);
  }
  return res.json();
}

export async function createOrGetApproval(
  paymentId: number,
  strategy: string = 'PAYMENT_LINK',
  reason?: string
): Promise<ApprovalResult> {
  const query = new URLSearchParams({ strategy });
  if (reason) query.append('reason', reason);

  const res = await fetch(`${API_BASE}/recovery/approval/${paymentId}?${query}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Approval creation failed with status ${res.status}`);
  }
  return res.json();
}

export async function approveRequest(
  approvalId: number,
  reason: string = 'Approved by finance operator'
): Promise<ApprovalResult> {
  const res = await fetch(`${API_BASE}/recovery/approval/${approvalId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Approve failed with status ${res.status}`);
  }
  return res.json();
}

export async function rejectRequest(
  approvalId: number,
  reason: string = 'Rejected by compliance'
): Promise<ApprovalResult> {
  const res = await fetch(`${API_BASE}/recovery/approval/${approvalId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Reject failed with status ${res.status}`);
  }
  return res.json();
}

export async function executeApprovedRequest(approvalId: number): Promise<ExecutionResult> {
  const res = await fetch(`${API_BASE}/recovery/approval/${approvalId}/execute`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Execution failed with status ${res.status}`);
  }
  return res.json();
}

export async function sendWebhook(
  payloadObj: Record<string, unknown>,
  secret: string = 'test_webhook_secret'
): Promise<Record<string, unknown>> {
  const rawBody = JSON.stringify(payloadObj);
  const signature = await computeHmacSha256(rawBody, secret);

  const res = await fetch(`${API_BASE}/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': signature,
    },
    body: rawBody,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Webhook ingestion failed with status ${res.status}`);
  }
  return res.json();
}
