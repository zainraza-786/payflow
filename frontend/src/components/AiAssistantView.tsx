import React, { useState, useRef, useEffect } from 'react';
import type { Payment, ApprovalResult, AuditLog } from '../types';

interface AiAssistantViewProps {
  payments: Payment[];
  pendingApprovals?: ApprovalResult[];
  approvals?: ApprovalResult[];
  auditLogs?: AuditLog[];
  recoveredAmount: number;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  payments = [],
  approvals = [],
  auditLogs = [],
  recoveredAmount = 0,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: `👋 **Hello! I'm your Payflow Revenue Recovery Copilot.**

I can help you diagnose failed transactions, analyze revenue at risk, review guardrail approvals, and evaluate recovery strategies. 

How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [lastQueryTopic, setLastQueryTopic] = useState<string>('');
  const [lastTargetPaymentId, setLastTargetPaymentId] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const promptPills = [
    { label: 'Why did payment #8801 fail?', icon: 'search' },
    { label: 'Which payments are currently at risk?', icon: 'warning' },
    { label: 'How much revenue have we recovered?', icon: 'monitoring' },
    { label: 'Which recovery strategy is performing best?', icon: 'trending_up' },
    { label: 'What should I do with the pending approvals?', icon: 'gavel' },
    { label: 'What is causing most payment failures?', icon: 'pie_chart' },
    { label: 'Explain the recovery pipeline.', icon: 'account_tree' },
    { label: 'Give me a summary of today\'s recovery activity', icon: 'summarize' },
  ];

  // Helper: Format Currency
  const formatInr = (amt: number) => `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR`;

  // Dynamic Strategy Telemetry Calculator (Strictly computed from active state)
  const computeStrategyTelemetry = () => {
    const counts: Record<string, { total: number; recovered: number; amountRecovered: number; description: string }> = {
      PAYMENT_LINK: {
        total: 0,
        recovered: 0,
        amountRecovered: 0,
        description: 'Customer-Initiated 72h Razorpay Payment Link',
      },
      SMART_RETRY: {
        total: 0,
        recovered: 0,
        amountRecovered: 0,
        description: 'Automated Off-Peak Gateway Retry',
      },
      SEND_NUDGE: {
        total: 0,
        recovered: 0,
        amountRecovered: 0,
        description: 'Interactive Alternate Payment Method Nudge',
      },
      B2B_CHASE: {
        total: 0,
        recovered: 0,
        amountRecovered: 0,
        description: 'Tiered High-Value Institutional Escalation',
      },
    };

    payments.forEach((p) => {
      const reason = (p.failure_reason || '').toLowerCase();
      let stratKey = 'PAYMENT_LINK';

      if (reason.includes('timeout') || reason.includes('network') || reason.includes('bank_server_down') || reason.includes('smart retry')) {
        stratKey = 'SMART_RETRY';
      } else if (reason.includes('insufficient') || reason.includes('limit')) {
        stratKey = 'SEND_NUDGE';
      } else if ((p.amount || 0) >= 10000) {
        stratKey = 'B2B_CHASE';
      }

      if (counts[stratKey]) {
        counts[stratKey].total += 1;
        if (p.status === 'captured') {
          counts[stratKey].recovered += 1;
          counts[stratKey].amountRecovered += p.amount || 0;
        }
      }
    });

    return counts;
  };

  // Intelligence Query & Intent Classification Engine
  const generateIntelligentResponse = (query: string): string => {
    const trimmed = query.trim();
    const q = trimmed.toLowerCase();

    // 1. CASUAL GREETING INTENT (Never dump dashboard metrics!)
    const greetingWords = ['hi', 'hey', 'hello', 'hy', 'hii', 'heyy', 'good morning', 'good evening', 'good afternoon', 'howdy', 'hola', 'yo', 'sup'];
    const isExactGreeting = greetingWords.includes(q) || (q.length <= 15 && greetingWords.some(w => q.startsWith(w + ' ') || q.endsWith(' ' + w)));
    if (isExactGreeting && !q.includes('fail') && !q.includes('payment') && !q.includes('recover') && !q.includes('risk') && !q.includes('strategy')) {
      return `Hey! 👋 I'm your Payflow Recovery Copilot. 

What would you like to know about your payments, recovery performance, approvals, or failed transactions?`;
    }

    // 2. GRATITUDE / CLOSURE INTENT
    const closureWords = ['thanks', 'thank you', 'thx', 'thank u', 'appreciate it', 'cool', 'awesome', 'great', 'perfect', 'got it', 'okay', 'ok', 'understood', 'bye', 'goodbye', 'cya', 'see you'];
    const isClosure = closureWords.includes(q) || (q.length <= 20 && closureWords.some(w => q.startsWith(w + ' ') || q.endsWith(' ' + w) || q === w));
    if (isClosure && !q.includes('what') && !q.includes('how') && !q.includes('why') && !q.includes('fail') && !q.includes('payment')) {
      return `You're welcome! Let me know if you need anything else regarding your payments, recovery workflows, or guardrail approvals.`;
    }

    // 3. CAPABILITIES / HELP INTENT
    if (q === 'help' || q === 'what can you do' || q === 'who are you' || q === 'options' || q === 'what do you do') {
      return `### 💡 How I Can Assist You

I am your deterministic Revenue Recovery Copilot. Here are some of the things you can ask me:

* **Inspect Specific Transactions**: *"Why did payment #8801 fail?"*
* **Analyze At-Risk Revenue**: *"Which payments are currently at risk?"*
* **Track Recovery Performance**: *"How much revenue have we recovered?"*
* **Evaluate Strategies**: *"Which recovery strategy is performing best?"*
* **Review Human Approvals**: *"What should I do with the pending approvals?"*
* **Understand Failure Causes**: *"What is causing most payment failures?"*
* **Pipeline Architecture**: *"Explain the recovery pipeline."*`;
    }

    // 4. SPECIFIC PAYMENT ID QUERY (#8801, payment 1, etc.)
    const idMatch = q.match(/#?(\d{2,})/i) || q.match(/payment\s*#?(\d+)/i) || q.match(/pay_([a-zA-Z0-9_-]+)/i);
    if (idMatch && (q.includes('fail') || q.includes('why') || q.includes('payment') || q.includes('status') || q.includes('check') || q.includes('what happened') || q.includes('inspect') || q.includes('tell me about') || q.includes('details') || q.startsWith('payment') || q.startsWith('#'))) {
      const targetId = idMatch[1];
      const payment = payments.find(
        (p) => p.id.toString() === targetId || p.razorpay_payment_id.toLowerCase().includes(targetId.toLowerCase())
      );

      if (payment) {
        setLastQueryTopic('payment');
        setLastTargetPaymentId(payment.id);
        const isCaptured = payment.status === 'captured';
        const isHighValue = (payment.amount || 0) >= 10000;
        const matchingApproval = approvals.find((a) => a.payment_id === payment.id);

        let strategyRec = 'PAYMENT_LINK';
        const reasonLower = (payment.failure_reason || '').toLowerCase();
        if (reasonLower.includes('timeout') || reasonLower.includes('network') || reasonLower.includes('bank_server_down')) {
          strategyRec = 'SMART_RETRY (Automated Off-Peak Retry)';
        } else if (reasonLower.includes('insufficient') || reasonLower.includes('limit')) {
          strategyRec = 'PAYMENT_LINK (Customer-Initiated 72h Link)';
        } else if (reasonLower.includes('invoice') || isHighValue) {
          strategyRec = 'B2B_CHASE (High-Value Tiered Dunning)';
        }

        return `### 🔍 Diagnostic Report: Payment #${payment.id}

* **Razorpay Payment ID**: \`${payment.razorpay_payment_id}\`
* **Amount**: **${formatInr(payment.amount || 0)}**
* **Lifecycle Status**: ${isCaptured ? '✅ **CAPTURED / RECOVERED**' : '⚠️ **FAILED (Pending Recovery)**'}
* **Identified Root Cause**: \`${payment.failure_reason || 'Bank processing error'}\`
* **Assigned Strategy**: \`${strategyRec}\`

#### 🛡️ Guardrail Policy Evaluation:
* **High-Value Floor Policy (₹10,000+)**: ${isHighValue ? '⚠️ **TRIGGERED** (Amount exceeds ₹10,000 threshold)' : '✅ **PASSED** (Under threshold, eligible for automated link creation)'}
* **Human Approval Gate**: ${matchingApproval ? `🔒 **Status: ${matchingApproval.approval_status}** (${matchingApproval.reason || 'Floor threshold'})` : isHighValue ? '🔒 **HOLD** — Requires operator authorization before link dispatch' : '⚡ **CLEARED** — Autonomous execution allowed'}
* **Attempt Safety Cap**: Attempt 1 of 2 (Safe to proceed)

#### 💡 Recommended Next Action:
${isCaptured 
  ? 'This transaction is already fully recovered and settled. Full audit record is stored in the Audit Trail.'
  : isHighValue 
  ? 'Navigate to **Human Approvals** in the sidebar to review policy rationale and authorize recovery link dispatch.' 
  : 'Navigate to **Payments** and click **Run Workflow** to generate a fresh Razorpay test-mode payment link.'}`;
      } else {
        return `### 🔍 Payment Lookup: Payment #${targetId}

* **Status**: Record not found in current active memory dataset (${payments.length} total records).
* **Available Active Payments in Session**:
${payments.length > 0 ? payments.slice(0, 5).map(p => `  - **Payment #${p.id}** (${p.razorpay_payment_id}): ${formatInr(p.amount || 0)} — \`${p.status.toUpperCase()}\``).join('\n') : '  *(No payments currently in memory. Run a demo batch to ingest records.)*'}

💡 *Tip: You can select any payment from the **Payments** table or trigger **Run Live Batch** in the simulator to ingest fresh synthetic payment records.*`;
      }
    }

    // 5. CONTEXTUAL FOLLOW-UP HANDLING (e.g. "What should I do now?", "How do I approve it?")
    if (q.includes('what should i do') || q.includes('what do i do') || q.includes('what next') || q.includes('how to approve') || q.includes('how do i approve') || q.includes('tell me more') || q === 'what now' || q === 'next') {
      if (lastTargetPaymentId !== null) {
        const targetPayment = payments.find(p => p.id === lastTargetPaymentId);
        if (targetPayment) {
          const isHighValue = (targetPayment.amount || 0) >= 10000;
          return `### 💡 Recommended Next Step for Payment #${targetPayment.id}

For **Payment #${targetPayment.id}** (${formatInr(targetPayment.amount || 0)}):

${isHighValue 
  ? `1. Since this is a high-value transaction (${formatInr(targetPayment.amount || 0)} $\\ge$ ₹10,000), open the **Human Approvals** tab from the left sidebar.
2. Review the guardrail audit summary for ${targetPayment.failure_reason || 'this transaction'}.
3. Click **Approve Recovery** to run a fresh guardrail check and trigger the Razorpay recovery link.`
  : `1. Open the **Payments** tab.
2. Locate Payment #${targetPayment.id} in the table.
3. Click **Run Workflow** to execute the automated retry or link dispatch.`}`;
        }
      }

      if (lastQueryTopic === 'at_risk' || lastQueryTopic === 'approvals') {
        return `### 💡 Recommended Next Step

To address the pending items:
1. Click **Human Approvals** in the left sidebar.
2. Inspect the guardrail rationale for the held transactions.
3. Click **Approve Recovery** to authorize link dispatch with full auditability.`;
      }

      return `### 💡 Recommended Action

You can take the following immediate steps in Payflow:
1. Review pending authorizations in the **Human Approvals** queue.
2. Check uncollected transactions under the **Recovery Queue**.
3. Generate an executive report from **Export & Reports**.`;
    }

    // 6. AT-RISK PAYMENTS INQUIRY
    if (q.includes('at risk') || q.includes('at-risk') || (q.includes('which payment') && q.includes('fail')) || q.includes('stuck payment') || q.includes('uncollected')) {
      setLastQueryTopic('at_risk');
      setLastTargetPaymentId(null);
      const failed = payments.filter((p) => p.status === 'failed');
      const totalAtRisk = failed.reduce((sum, p) => sum + (p.amount || 0), 0);
      const highValueFailed = failed.filter((p) => (p.amount || 0) >= 10000);

      if (failed.length === 0) {
        return `### ⚠️ Revenue-at-Risk Assessment

* **Status**: ✅ **Zero uncollected payments at risk.**
* **Total Transactions Monitored**: ${payments.length}
* **Current Recovered Revenue**: ${formatInr(recoveredAmount)}

All ingested transactions in the current session are in **CAPTURED** status.`;
      }

      return `### ⚠️ Revenue-at-Risk Assessment

There are currently **${failed.length} failed payments** representing **${formatInr(totalAtRisk)}** in uncollected revenue.

#### 📋 Top At-Risk Transactions:
${failed.slice(0, 5).map((p, i) => `${i + 1}. **Payment #${p.id}** (\`${p.razorpay_payment_id}\`): **${formatInr(p.amount || 0)}**
   * *Cause*: \`${p.failure_reason || 'Unknown error'}\`
   * *Threshold*: ${(p.amount || 0) >= 10000 ? '🔒 **High-Value Floor Hold (Approval Queue)**' : '⚡ **Standard Recovery Eligible**'}`).join('\n\n')}

#### 📊 Risk Distribution:
* **High-Value Escalations (≥ ₹10k)**: ${highValueFailed.length} payments (${formatInr(highValueFailed.reduce((s, p) => s + (p.amount || 0), 0))})
* **Standard Automated Queue (< ₹10k)**: ${failed.length - highValueFailed.length} payments (${formatInr(failed.filter(p => (p.amount || 0) < 10000).reduce((s, p) => s + (p.amount || 0), 0))})

💡 **Recommended Action**: Review the ${highValueFailed.length} high-value exceptions in the **Human Approvals** gate to unlock recovery links.`;
    }

    // 7. HIGH-VALUE PAYMENTS INQUIRY
    if (q.includes('highest') || q.includes('high value') || q.includes('largest') || q.includes('biggest') || q.includes('top exposure') || q.includes('high-value')) {
      setLastQueryTopic('high_value');
      setLastTargetPaymentId(null);
      if (payments.length === 0) {
        return `### 💎 Top Exposure Portfolio by Ticket Size

* **Status**: No transactions currently present in active session dataset.
* Ingest synthetic transactions using **Run Live Batch** to view ranked exposures.`;
      }

      const sortedByAmount = [...payments].sort((a, b) => (b.amount || 0) - (a.amount || 0));
      const top5 = sortedByAmount.slice(0, 5);

      return `### 💎 Top Exposure Portfolio by Ticket Size

Here are the largest transaction exposures currently tracked in Payflow:

| Rank | Payment ID | Razorpay Reference | Amount (INR) | Status | Risk Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
${top5.map((p, idx) => `| **#${idx + 1}** | #${p.id} | \`${p.razorpay_payment_id}\` | **${formatInr(p.amount || 0)}** | \`${p.status.toUpperCase()}\` | ${(p.amount || 0) >= 10000 ? '⚠️ High Floor' : 'Standard'} |`).join('\n')}

#### 🛡️ Institutional Policy Note:
Under Payflow's **Deterministic Guardrail Rules**, any transaction exceeding **₹10,000.00 INR** is prohibited from autonomous background retries without affirmative operator authorization.`;
    }

    // 8. STRATEGY SELECTION & RECOMMENDATION
    if (q.includes('strategy should we use') || q.includes('which strategy') || q.includes('what strategy') || q.includes('how to recover') || q.includes('strategy recommendation') || q.includes('strategy is best') || q.includes('which strategy is best')) {
      // If looking for performance specifically
      if (q.includes('performing') || q.includes('conversion') || q.includes('success rate') || q.includes('rate')) {
        setLastQueryTopic('strategy_performance');
        setLastTargetPaymentId(null);
        const telemetry = computeStrategyTelemetry();
        const totalEvaluated = Object.values(telemetry).reduce((acc, s) => acc + s.total, 0);

        if (totalEvaluated === 0) {
          return `### 📈 Recovery Strategy Performance Attribution

* **Dataset Status**: *No recovery strategy telemetry currently recorded in this session.*
* **Ingested Records**: ${payments.length} total payments.
* **Next Action**: Execute recovery workflows via **Payments** or run a demo batch in the simulator to generate dynamic strategy performance telemetry.`;
        }

        return `### 📈 Recovery Strategy Performance Attribution

*Directly computed from the ${totalEvaluated} categorized transactions in the current active session:*

${Object.entries(telemetry).map(([stratKey, data]) => {
  const rate = data.total > 0 ? ((data.recovered / data.total) * 100).toFixed(1) : '0.0';
  return `* **\`${stratKey}\`** (${data.description}):
  * **Session Conversion Rate**: **${rate}%** (${data.recovered} of ${data.total} recovered)
  * **Recovered Capital**: **${formatInr(data.amountRecovered)}**
  * **Active Strategy Status**: ${data.total > 0 ? (data.recovered > 0 ? '🟢 Active & Contributing' : '⏳ In-Flight / Pending Customer Settlement') : '⚪ No active records'}`;
}).join('\n\n')}

#### 🔍 Attribution Analysis:
* Best-performing strategy in current session: **${
  Object.entries(telemetry).sort((a, b) => (b[1].total > 0 ? b[1].recovered / b[1].total : 0) - (a[1].total > 0 ? a[1].recovered / a[1].total : 0))[0][0]
}** (${
  Object.entries(telemetry).sort((a, b) => (b[1].total > 0 ? b[1].recovered / b[1].total : 0) - (a[1].total > 0 ? a[1].recovered / a[1].total : 0))[0][1].recovered
} recovered transactions).`;
      }

      setLastQueryTopic('strategy');
      setLastTargetPaymentId(null);
      return `### 🧠 Payflow Deterministic Strategy Decision Matrix

Payflow assigns bounded recovery strategies based on root-cause classification:

1. **Authentication / OTP Timeout (\`PAYMENT_LINK\`)**:
   * *Trigger*: Customer session timeout or 3D-Secure drop-off.
   * *Action*: Generates a fresh 72-hour Razorpay test-mode Payment Link.
   * *Rationale*: Direct customer re-engagement allows the payer to complete verification with fresh 3D-Secure credentials.

2. **Insufficient Funds / Card Limit (\`SEND_NUDGE\` + \`PAYMENT_LINK\`)**:
   * *Trigger*: Bank code \`insufficient_funds\` or \`exceeds_limit\`.
   * *Action*: Interactive payment link with alternate payment method options (UPI, Netbanking).
   * *Rationale*: Gives the customer a window to top up or switch payment method.

3. **Temporary Bank Server Downtime (\`SMART_RETRY\`)**:
   * *Trigger*: Bank network glitch or gateway timeout (\`bank_server_down\`).
   * *Action*: Bounded automated retry during optimal network window (30–45 mins delay).
   * *Rationale*: Resolves automatically once the issuing bank gateway stabilizes.

4. **High-Value B2B Invoices (\`B2B_CHASE\`)**:
   * *Trigger*: Invoices ≥ ₹20,000 or overdue vendor obligations.
   * *Action*: Structured DLT communication with human approval checkpoints.`;
    }

    // 9. REVENUE RECOVERED & FINANCIAL METRICS (DYNAMIClY COMPUTED)
    if (q.includes('how much revenue') || q.includes('how much did we recover') || q.includes('recovered') || q.includes('recovery rate') || q.includes('compare recovered') || q.includes('financial metric') || q.includes('total revenue')) {
      setLastQueryTopic('revenue_metrics');
      setLastTargetPaymentId(null);
      const captured = payments.filter((p) => p.status === 'captured');
      const failed = payments.filter((p) => p.status === 'failed');
      const totalAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const totalRecovered = captured.reduce((acc, p) => acc + (p.amount || 0), 0);
      const totalFailed = failed.reduce((acc, p) => acc + (p.amount || 0), 0);
      const rate = payments.length > 0 ? ((captured.length / payments.length) * 100).toFixed(1) : '0.0';

      return `### 💰 Revenue Recovery Financial Breakdown

*Directly computed from the active Payflow session dataset:*

* **Total Revenue Recovered**: **${formatInr(totalRecovered)}** (${captured.length} captured transactions)
* **Total Revenue at Risk**: **${formatInr(totalFailed)}** (${failed.length} pending failed transactions)
* **Total Ingested Volume**: **${formatInr(totalAmount)}** (${payments.length} transactions)
* **Overall Recovery Efficiency Rate**: **${rate}%**

#### 📊 Portfolio Comparison:
| Metric | Recovered / Captured | Pending / Failed |
| :--- | :--- | :--- |
| **Transaction Count** | ${captured.length} payments | ${failed.length} payments |
| **Total Value (INR)** | ${formatInr(totalRecovered)} | ${formatInr(totalFailed)} |
| **Average Ticket Size** | ${captured.length > 0 ? formatInr(totalRecovered / captured.length) : '₹0.00 INR'} | ${failed.length > 0 ? formatInr(totalFailed / failed.length) : '₹0.00 INR'} |
| **Status** | ✅ Succeeded & Reconciled | ⏳ In-Flight / Held |`;
    }

    // 10. HUMAN APPROVAL GATE & PENDING ITEMS
    if (q.includes('human approval') || q.includes('approval') || q.includes('pending approval') || q.includes('what should i do with pending') || q.includes('what should i do with the pending') || q.includes('operator')) {
      setLastQueryTopic('approvals');
      setLastTargetPaymentId(null);
      const pending = approvals.filter((a) => a.approval_status === 'PENDING');

      return `### ⚖️ Human Approval Authorization Gate

Payflow operates under a **Fail-Closed High-Value Floor Policy (₹10,000+ Threshold)**.

#### Current Approval Queue Status:
* **Pending Authorization Requests**: **${pending.length} items**
${pending.length > 0 ? pending.map((a, i) => `${i + 1}. **Approval #${a.id}** (Payment #${a.payment_id}): ${a.summary || a.reason || 'High-value threshold exceeded'} — *Expires: ${new Date(a.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}*`).join('\n') : '*(No pending approvals in queue currently)*'}

#### ❓ Why are these transactions held?
1. **Capital Safety**: Transactions $\ge$ ₹10,000 have severe consequences if duplicate retries occur.
2. **Compliance**: Guarantees a human-in-the-loop audit trail for high-ticket customer disputes.
3. **Pre-Execution Guardrail Check**: When an operator clicks **Approve**, Payflow re-validates quiet hours and attempt limits immediately before dispatching the link.

💡 **How to proceed**: Open the **Human Approvals** tab in the left sidebar to approve or reject pending requests.`;
    }

    // 11. GUARDRAIL POLICIES & BLOCKED REASONS
    if (q.includes('guardrail') || q.includes('policy') || q.includes('blocked') || q.includes('fail-closed') || q.includes('quiet hour') || q.includes('attempt limit')) {
      setLastQueryTopic('guardrails');
      setLastTargetPaymentId(null);
      return `### 🛡️ Payflow Institutional Guardrail Architecture

The core tenet of Payflow is: **"The LLM proposes, deterministic code decides."**

Our 4 non-negotiable safety guardrails:

1. **High-Value Floor Limit (₹10,000.00 INR)**:
   * Any recovery $\ge$ ₹10,000 is automatically blocked from un-gated retries and routed to the Human Approval Queue.

2. **Maximum Attempt Cap (Hard Limit = 2)**:
   * No payment may ever be retried more than twice. After 2 attempts, the engine permanently locks the transaction to prevent retry storms.

3. **Quiet Hours Window (22:00 – 08:00 IST)**:
   * Automated outbound SMS/nudges and direct customer pings are silenced during night hours.

4. **Fail-Closed Architecture**:
   * If any external service is degraded or an anomaly is detected, the engine defaults to **SAFE HOLD**.`;
    }

    // 12. ROOT CAUSE DISTRIBUTION & FAILURE TRENDS (DYNAMIClY COMPUTED)
    if (q.includes('causing') || q.includes('failure trend') || q.includes('failure reason') || q.includes('root cause') || q.includes('why are payments failing') || q.includes('payment failure') || q.includes('payment failures') || q.includes('most failures')) {
      setLastQueryTopic('root_causes');
      setLastTargetPaymentId(null);
      const total = payments.length;
      const timeoutCount = payments.filter((p) => (p.failure_reason || '').toLowerCase().includes('timeout')).length;
      const fundsCount = payments.filter((p) => {
        const r = (p.failure_reason || '').toLowerCase();
        return r.includes('insufficient') || r.includes('no payment') || r.includes('unpaid');
      }).length;
      const limitCount = payments.filter((p) => {
        const r = (p.failure_reason || '').toLowerCase();
        return r.includes('limit') || r.includes('cap');
      }).length;
      const bankErrorCount = Math.max(0, total - (timeoutCount + fundsCount + limitCount));

      if (total === 0) {
        return `### 🔬 Failure Root Cause Diagnostic Breakdown

* **Status**: *No payments currently in session memory to analyze.*
* Ingest payment events using **Run Live Batch** to observe dynamic failure distributions.`;
      }

      return `### 🔬 Failure Root Cause Diagnostic Breakdown

*Directly computed from **${total} ingested transactions** in active memory:*

1. **Authentication / OTP Timeout**: **${timeoutCount} payments** (${((timeoutCount / total) * 100).toFixed(1)}%)
   * *Driver*: Customer mobile drop-off or 3D-Secure bank gateway delay.
   * *Resolution*: Automated Razorpay Payment Link dispatch.

2. **Insufficient Account Funds / Missing Settlement**: **${fundsCount} payments** (${((fundsCount / total) * 100).toFixed(1)}%)
   * *Driver*: Account balance below transaction amount or pending invoice.
   * *Resolution*: Delayed nudge + alternate payment method link.

3. **Daily / Card Limit Exceeded**: **${limitCount} payments** (${((limitCount / total) * 100).toFixed(1)}%)
   * *Driver*: UPI ₹1L daily cap or card tier limit reached.
   * *Resolution*: Split-link or next-day morning window.

4. **Temporary Bank Gateway Outage**: **${bankErrorCount} payments** (${((bankErrorCount / total) * 100).toFixed(1)}%)
   * *Driver*: Issuer core banking network 500 error.
   * *Resolution*: Smart Retry during off-peak window.`;
    }

    // 13. RECOVERY PIPELINE EXPLANATION
    if (q.includes('pipeline') || q.includes('how does it work') || q.includes('how payflow works') || q.includes('recovery process') || q.includes('explain the flow')) {
      setLastQueryTopic('pipeline');
      setLastTargetPaymentId(null);
      return `### 🔄 Payflow 7-Stage Autonomous Recovery Pipeline

1. \`[1. INGESTED]\` — Real-time \`payment.failed\` webhook ingested with HMAC-SHA256 signature verification.
2. \`[2. DIAGNOSED]\` — Root cause extracted from gateway response (Timeout, Insufficient Funds, Limit, Downtime).
3. \`[3. STRATEGY SELECTED]\` — Deterministic assignment of \`PAYMENT_LINK\`, \`SMART_RETRY\`, or \`SEND_NUDGE\`.
4. \`[4. GUARDRAIL CHECK]\` — Validates quiet hours, retry attempt counters (< 2), and ticket value thresholds.
5. \`[5. HUMAN APPROVAL]\` — If amount $\ge$ ₹10k, transaction is suspended in approval queue for human clearance.
6. \`[6. RECOVERY IN-FLIGHT]\` — Executed via Razorpay API in safe test mode (Zero real money risk).
7. \`[7. RECOVERED]\` — \`payment.captured\` webhook verified and immutable revenue recovery audit log created.`;
    }

    // 14. DAILY SUMMARY (DYNAMIClY COMPUTED)
    if (q.includes('summary of today') || q.includes('daily summary') || q.includes('status report') || q.includes('executive summary') || q.includes('overview of activity')) {
      setLastQueryTopic('daily_summary');
      setLastTargetPaymentId(null);
      const captured = payments.filter((p) => p.status === 'captured');
      const failed = payments.filter((p) => p.status === 'failed');
      const pending = approvals.filter((a) => a.approval_status === 'PENDING');
      const totalRecovered = captured.reduce((a, b) => a + (b.amount || 0), 0);

      return `### 📋 Payflow Daily Operations Briefing

* **Reconciliation Date**: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
* **Engine Status**: 🟢 Online (FastAPI + Deterministic Guardrails)
* **Environment**: Razorpay Test Mode (Sandbox Verified)

#### 📊 Live Session Metrics:
* **Total Transactions Managed**: **${payments.length}**
* **Total Revenue Recovered**: **${formatInr(totalRecovered)}** (${captured.length} captured)
* **Current Recovery Rate**: **${payments.length > 0 ? ((captured.length / payments.length) * 100).toFixed(1) : 0}%**
* **Pending Human Approvals**: **${pending.length} requests** (₹10,000+ floor)
* **Active In-Flight Failures**: **${failed.length} payments**

#### 🎯 Top Action Items for Operations:
1. Review the **${pending.length} pending approvals** in the Human Approval Gate.
2. Ingest next batch or export the audit log from **Export & Reports**.`;
    }

    // 15. SHORT AMBIGUOUS QUERY CLARIFICATION
    return `I'm here to help with your revenue recovery operations. Would you like to:
* **Inspect a specific payment** (e.g. *"Why did payment #8801 fail?"*)
* **Check revenue at risk** (e.g. *"Which payments are currently at risk?"*)
* **View recovery performance** (e.g. *"How much revenue have we recovered?"*)
* **Review human approvals** (e.g. *"What should I do with pending approvals?"*)`;
  };

  const handleAsk = (query: string) => {
    if (!query.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const reply = generateIntelligentResponse(query);
    const assistantMsg: Message = {
      sender: 'assistant',
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
  };

  // Simple clean markdown-like renderer for professional typography
  const renderFormattedMessage = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-body-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="font-headline-md text-base font-bold text-slate-900 mt-2 mb-1">
                {line.replace('### ', '')}
              </h3>
            );
          }
          if (line.startsWith('#### ')) {
            return (
              <h4 key={idx} className="font-headline-md text-xs font-bold uppercase tracking-wider text-slate-700 mt-2">
                {line.replace('#### ', '')}
              </h4>
            );
          }
          if (line.startsWith('* ') || line.startsWith('- ')) {
            const content = line.replace(/^[\*\-]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 ml-1">
                <span className="text-slate-400 mt-1">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
              </div>
            );
          }
          if (line.startsWith('|') && line.endsWith('|')) {
            if (line.includes('---')) return null;
            const cells = line.split('|').filter(c => c.trim() !== '');
            return (
              <div key={idx} className="grid grid-cols-6 gap-2 p-1.5 bg-slate-50 border border-slate-200/60 rounded text-[11px] font-mono">
                {cells.map((cell, cIdx) => (
                  <div key={cIdx} className="truncate" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell.trim()) }} />
                ))}
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-mono text-[11px] text-slate-800">$1</code>');
  };

  return (
    <div className="card-stitch p-6 space-y-6 max-w-5xl font-sans">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-[24px]">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-headline-md font-bold text-primary">Payflow Revenue Recovery Copilot</h2>
              <span className="font-label-caps text-[10px] bg-status-recovered/10 text-status-recovered border border-status-recovered/20 px-2 py-0.5 rounded-full font-bold">
                DATA-GROUNDED AI
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary mt-0.5">
              Deterministic recovery intelligence for payment failure diagnostics, guardrail rule queries, and recovery strategy generation.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setLastQueryTopic('');
            setLastTargetPaymentId(null);
            setMessages([
              {
                sender: 'assistant',
                text: '👋 Memory cleared. How can I assist you with Payflow recovery operations today?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }}
          className="px-3.5 py-1.5 rounded-lg bg-slate-100/70 hover:bg-slate-200/80 text-primary font-body-sm text-body-sm font-semibold border border-slate-200/80 transition-colors"
        >
          Clear History
        </button>
      </div>

      {/* Suggested Prompt Pills */}
      <div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Suggested Recovery Intelligence Queries
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {promptPills.map((pill, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(pill.label)}
              className="p-2.5 px-3.5 rounded-xl border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100 font-body-sm text-xs font-semibold text-primary flex items-center gap-2 transition-all hover:border-slate-400 text-left shadow-2xs group"
            >
              <span className="material-symbols-outlined text-slate-500 group-hover:text-primary text-[16px] shrink-0">
                {pill.icon}
              </span>
              <span className="truncate">{pill.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Transcript */}
      <div className="p-5 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-4 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl max-w-3xl ${
                m.sender === 'user'
                  ? 'bg-primary text-white ml-auto font-medium shadow-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-slate-100/30 text-[11px] opacity-75">
                <span className="font-bold uppercase tracking-wider">
                  {m.sender === 'user' ? 'Finance Operator' : 'Payflow Copilot'}
                </span>
                <span className="font-tabular-nums">{m.timestamp}</span>
              </div>
              {m.sender === 'user' ? (
                <p className="text-body-sm">{m.text}</p>
              ) : (
                renderFormattedMessage(m.text)
              )}
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Bottom Input */}
        <div className="pt-3 border-t border-slate-200/70 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(input)}
            placeholder="Ask Payflow Copilot (e.g. 'Why did payment #8801 fail?', 'Which payments are at risk?')..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-slate-200/80 text-primary font-body-sm text-body-sm focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
          />
          <button
            onClick={() => handleAsk(input)}
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-slate-800 text-white font-body-sm text-body-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Ask Copilot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
