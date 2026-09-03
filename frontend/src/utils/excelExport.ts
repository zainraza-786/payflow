import type { Payment, AuditLog } from '../types';

function makeCrc32Table(): Uint32Array {
  const c = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let u = n;
    for (let k = 0; k < 8; k++) {
      u = u & 1 ? 0xedb88320 ^ (u >>> 1) : u >>> 1;
    }
    c[n] = u;
  }
  return c;
}

const CRC_TABLE = makeCrc32Table();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

function createZipArchive(entries: ZipFileEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let offset = 0;
  const localHeaders: Uint8Array[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const localOffset = offset;

    // Local file header: 30 bytes + name length + data length
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true); // 0 = STORE (uncompressed)
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    localHeaders.push(header, data);
    fileRecords.push({ nameBytes, data, crc, offset: localOffset });

    offset += header.length + data.length;
  }

  const centralDirOffset = offset;
  const centralHeaders: Uint8Array[] = [];

  for (const rec of fileRecords) {
    const header = new Uint8Array(46 + rec.nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(16, rec.crc, true);
    view.setUint32(20, rec.data.length, true);
    view.setUint32(24, rec.data.length, true);
    view.setUint16(28, rec.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, rec.offset, true);
    header.set(rec.nameBytes, 46);

    centralHeaders.push(header);
    offset += header.length;
  }

  const centralDirSize = offset - centralDirOffset;

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, fileRecords.length, true);
  eocdView.setUint16(10, fileRecords.length, true);
  eocdView.setUint32(12, centralDirSize, true);
  eocdView.setUint32(16, centralDirOffset, true);
  eocdView.setUint16(20, 0, true);

  const totalLength = offset + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const h of localHeaders) {
    result.set(h, pos);
    pos += h.length;
  }
  for (const c of centralHeaders) {
    result.set(c, pos);
    pos += c.length;
  }
  result.set(eocd, pos);

  return result;
}

function escapeXml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadXlsxReport(
  payments: Payment[] = [],
  auditLogs: AuditLog[] = [],
  filenamePrefix: string = 'payflow_revenue_recovery_audit_report'
): void {
  const encoder = new TextEncoder();

  const totalTransactions = payments.length;
  const totalInvoicedValue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const recoveredPayments = payments.filter((p) => p.status === 'captured');
  const failedPayments = payments.filter((p) => p.status === 'failed');
  const recoveredValue = recoveredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const atRiskValue = failedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const recoveryRate =
    totalInvoicedValue > 0 ? ((recoveredValue / totalInvoicedValue) * 100).toFixed(1) : '0.0';

  const totalEvents = auditLogs.length;
  const humanReviewCases = auditLogs.filter(
    (a) => (a.decision || '').includes('HUMAN') || (a.guardrail_result || '').includes('HUMAN')
  ).length;
  const allowedActions = auditLogs.filter(
    (a) => (a.guardrail_result || a.decision || '').includes('ALLOW') || (a.decision || '').includes('CAPTURED')
  ).length;
  const blockedActions = auditLogs.filter(
    (a) => (a.guardrail_result || a.decision || '').includes('BLOCK') || (a.guardrail_result || '').includes('STOP')
  ).length;

  const genDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Revenue Recovery Audit" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><name val="Segoe UI"/><sz val="10"/></font>
    <font><b/><name val="Segoe UI"/><sz val="13"/><color rgb="FF0F172A"/></font>
    <font><i/><name val="Segoe UI"/><sz val="9.5"/><color rgb="FF475569"/></font>
    <font><b/><name val="Segoe UI"/><sz val="10.5"/><color rgb="FF0F172A"/></font>
    <font><b/><name val="Segoe UI"/><sz val="10"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
  </borders>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

  const rowsXml: string[] = [];

  // Header Title & Metadata
  rowsXml.push(`<row r="1"><c r="A1" s="1" t="inlineStr"><is><t>Payflow — Revenue Recovery &amp; Audit Report</t></is></c></row>`);
  rowsXml.push(`<row r="2"><c r="A2" s="2" t="inlineStr"><is><t>Environment: Razorpay TEST MODE — Demo Environment</t></is></c></row>`);
  rowsXml.push(`<row r="3"><c r="A3" s="2" t="inlineStr"><is><t>Generated At: ${escapeXml(genDate)} | Status: Audit Completed &amp; Synchronized</t></is></c></row>`);
  rowsXml.push(`<row r="4"/>`);

  // Executive KPI Summary Section
  rowsXml.push(`<row r="5"><c r="A5" s="3" t="inlineStr"><is><t>EXECUTIVE AUDIT &amp; RECOVERY SUMMARY</t></is></c><c r="B5" s="3" t="inlineStr"><is><t>VALUE (LIVE SYNC)</t></is></c></row>`);
  rowsXml.push(`<row r="6"><c r="A6" s="5" t="inlineStr"><is><t>Total Transactions Evaluated</t></is></c><c r="B6" s="5" t="inlineStr"><is><t>${totalTransactions} payment records</t></is></c></row>`);
  rowsXml.push(`<row r="7"><c r="A7" s="5" t="inlineStr"><is><t>Total Gross Invoiced Volume (INR)</t></is></c><c r="B7" s="5" t="inlineStr"><is><t>₹${totalInvoicedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</t></is></c></row>`);
  rowsXml.push(`<row r="8"><c r="A8" s="5" t="inlineStr"><is><t>Successfully Recovered Revenue (INR)</t></is></c><c r="B8" s="5" t="inlineStr"><is><t>₹${recoveredValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</t></is></c></row>`);
  rowsXml.push(`<row r="9"><c r="A9" s="5" t="inlineStr"><is><t>Revenue at Risk (Active Exceptions)</t></is></c><c r="B9" s="5" t="inlineStr"><is><t>₹${atRiskValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</t></is></c></row>`);
  rowsXml.push(`<row r="10"><c r="A10" s="5" t="inlineStr"><is><t>Overall Recovery Yield (%)</t></is></c><c r="B10" s="5" t="inlineStr"><is><t>${recoveryRate}%</t></is></c></row>`);
  rowsXml.push(`<row r="11"><c r="A11" s="5" t="inlineStr"><is><t>Human Approval Queue Holds (&gt;= ₹10,000)</t></is></c><c r="B11" s="5" t="inlineStr"><is><t>${humanReviewCases} cases</t></is></c></row>`);
  rowsXml.push(`<row r="12"><c r="A12" s="5" t="inlineStr"><is><t>Allowed Automated Executions</t></is></c><c r="B12" s="5" t="inlineStr"><is><t>${allowedActions} actions</t></is></c></row>`);
  rowsXml.push(`<row r="13"><c r="A13" s="5" t="inlineStr"><is><t>Blocked / Halted Guardrail Actions</t></is></c><c r="B13" s="5" t="inlineStr"><is><t>${blockedActions} actions</t></is></c></row>`);
  rowsXml.push(`<row r="14"/>`);

  // Detailed Activity Table Headers (Row 15)
  rowsXml.push(`<row r="15">
    <c r="A15" s="4" t="inlineStr"><is><t>Audit Event ID</t></is></c>
    <c r="B15" s="4" t="inlineStr"><is><t>Payment ID</t></is></c>
    <c r="C15" s="4" t="inlineStr"><is><t>Customer Name</t></is></c>
    <c r="D15" s="4" t="inlineStr"><is><t>Customer Email</t></is></c>
    <c r="E15" s="4" t="inlineStr"><is><t>Amount (INR)</t></is></c>
    <c r="F15" s="4" t="inlineStr"><is><t>Currency</t></is></c>
    <c r="G15" s="4" t="inlineStr"><is><t>Payment Status</t></is></c>
    <c r="H15" s="4" t="inlineStr"><is><t>Event Type</t></is></c>
    <c r="I15" s="4" t="inlineStr"><is><t>Recovery Decision</t></is></c>
    <c r="J15" s="4" t="inlineStr"><is><t>Guardrail Result</t></is></c>
    <c r="K15" s="4" t="inlineStr"><is><t>Reason / Diagnosis</t></is></c>
    <c r="L15" s="4" t="inlineStr"><is><t>Timestamp (IST)</t></is></c>
  </row>`);

  const activeAuditLogs = auditLogs.length > 0 ? auditLogs : [];

  if (activeAuditLogs.length > 0) {
    activeAuditLogs.forEach((log, idx) => {
      const rowNum = 16 + idx;
      const p = payments.find((item) => item.id === log.payment_id);
      const customerName = p?.customer_name || (log.reason?.match(/\(([^)]+)\)/)?.[1] || 'Verified Customer');
      const customerEmail = p?.customer_email || `acc_${log.payment_id}@payflow.demo`;
      const amountStr = p?.amount !== undefined ? `₹${p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A';
      const currency = p?.currency || 'INR';
      const status = p?.status ? p.status.toUpperCase() : 'PENDING';
      const formattedTimestamp = new Date(log.timestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      rowsXml.push(`<row r="${rowNum}">
        <c r="A${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(log.id)}</t></is></c>
        <c r="B${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(log.payment_id)}</t></is></c>
        <c r="C${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(customerName)}</t></is></c>
        <c r="D${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(customerEmail)}</t></is></c>
        <c r="E${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(amountStr)}</t></is></c>
        <c r="F${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(currency)}</t></is></c>
        <c r="G${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(status)}</t></is></c>
        <c r="H${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(log.event)}</t></is></c>
        <c r="I${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(log.decision)}</t></is></c>
        <c r="J${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(log.guardrail_result || 'N/A')}</t></is></c>
        <c r="K${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(log.reason || '')}</t></is></c>
        <c r="L${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(formattedTimestamp)}</t></is></c>
      </row>`);
    });
  } else {
    payments.forEach((p, idx) => {
      const rowNum = 16 + idx;
      const amountStr = `₹${(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      const formattedTimestamp = new Date(p.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      rowsXml.push(`<row r="${rowNum}">
        <c r="A${rowNum}" s="5" t="inlineStr"><is><t>${p.id + 900}</t></is></c>
        <c r="B${rowNum}" s="5" t="inlineStr"><is><t>${p.id}</t></is></c>
        <c r="C${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(p.customer_name || 'Customer')}</t></is></c>
        <c r="D${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(p.customer_email || `acc_${p.id}@payflow.demo`)}</t></is></c>
        <c r="E${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(amountStr)}</t></is></c>
        <c r="F${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(p.currency || 'INR')}</t></is></c>
        <c r="G${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(p.status.toUpperCase())}</t></is></c>
        <c r="H${rowNum}" s="5" t="inlineStr"><is><t>payment.${escapeXml(p.status)}</t></is></c>
        <c r="I${rowNum}" s="5" t="inlineStr"><is><t>${p.status === 'captured' ? 'CAPTURED' : 'HUMAN_APPROVAL'}</t></is></c>
        <c r="J${rowNum}" s="5" t="inlineStr"><is><t>${p.amount >= 10000 ? 'HUMAN_APPROVAL' : 'ALLOW'}</t></is></c>
        <c r="K${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(p.failure_reason || '')}</t></is></c>
        <c r="L${rowNum}" s="5" t="inlineStr"><is><t>${escapeXml(formattedTimestamp)}</t></is></c>
      </row>`);
    });
  }

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="15" topLeftCell="A16" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    <col min="1" max="1" width="26" customWidth="1"/>
    <col min="2" max="2" width="16" customWidth="1"/>
    <col min="3" max="3" width="24" customWidth="1"/>
    <col min="4" max="4" width="30" customWidth="1"/>
    <col min="5" max="5" width="20" customWidth="1"/>
    <col min="6" max="6" width="12" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="30" customWidth="1"/>
    <col min="9" max="9" width="24" customWidth="1"/>
    <col min="10" max="10" width="22" customWidth="1"/>
    <col min="11" max="11" width="54" customWidth="1"/>
    <col min="12" max="12" width="24" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('\n    ')}
  </sheetData>
</worksheet>`;

  const zipEntries: ZipFileEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(relsXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(wbRelsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheet1Xml) },
  ];

  const zipBytes = createZipArchive(zipEntries);
  const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsvReport(
  payments: Payment[] = [],
  auditLogs: AuditLog[] = [],
  filenamePrefix: string = 'payflow_revenue_recovery_audit_report'
): void {
  const totalTransactions = payments.length;
  const totalInvoicedValue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const recoveredPayments = payments.filter((p) => p.status === 'captured');
  const failedPayments = payments.filter((p) => p.status === 'failed');
  const recoveredValue = recoveredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const atRiskValue = failedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const recoveryRate =
    totalInvoicedValue > 0 ? ((recoveredValue / totalInvoicedValue) * 100).toFixed(1) : '0.0';

  const totalEvents = auditLogs.length;
  const humanReviewCases = auditLogs.filter(
    (a) => (a.decision || '').includes('HUMAN') || (a.guardrail_result || '').includes('HUMAN')
  ).length;
  const allowedActions = auditLogs.filter(
    (a) => (a.guardrail_result || a.decision || '').includes('ALLOW') || (a.decision || '').includes('CAPTURED')
  ).length;
  const blockedActions = auditLogs.filter(
    (a) => (a.guardrail_result || a.decision || '').includes('BLOCK') || (a.guardrail_result || '').includes('STOP')
  ).length;

  const genDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const summaryLines = [
    `"Payflow — Revenue Recovery & Audit Report"`,
    `"Generated At:","${genDate}"`,
    `"Environment:","Razorpay TEST MODE — Demo Environment"`,
    `""`,
    `"EXECUTIVE AUDIT SUMMARY"`,
    `"Total Payment / Recovery Events:","${totalEvents}"`,
    `"Active Failed Payments:","${failedPayments.length}"`,
    `"Successfully Recovered Payments:","${recoveredPayments.length}"`,
    `"Total Gross Invoiced Volume (INR):","₹${totalInvoicedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"`,
    `"Total Revenue Recovered (INR):","₹${recoveredValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"`,
    `"Recovery Yield (%):","${recoveryRate}%"`,
    `"Revenue at Risk (INR):","₹${atRiskValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"`,
    `"Human Review Queue Cases:","${humanReviewCases}"`,
    `"Allowed Guardrail Executions:","${allowedActions}"`,
    `"Blocked / Halted Actions:","${blockedActions}"`,
    `""`,
    `"DETAILED RECOVERY ACTIVITY & AUDIT TRAIL"`,
  ];

  const tableHeaders = [
    'Audit Event ID',
    'Payment ID',
    'Customer Name',
    'Customer Email',
    'Amount (INR)',
    'Currency',
    'Payment Status',
    'Event Type',
    'Recovery Decision',
    'Guardrail Result',
    'Reason / Diagnosis',
    'Timestamp (IST)',
  ];

  const activeAuditLogs = auditLogs.length > 0 ? auditLogs : [];

  const dataRows = (activeAuditLogs.length > 0 ? activeAuditLogs : []).map((log) => {
    const p = payments.find((item) => item.id === log.payment_id);
    const customerName = p?.customer_name || (log.reason?.match(/\(([^)]+)\)/)?.[1] || 'Verified Customer');
    const customerEmail = p?.customer_email || `acc_${log.payment_id}@payflow.demo`;
    const amountStr = p?.amount !== undefined ? `₹${p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A';
    const currency = p?.currency || 'INR';
    const status = p?.status ? p.status.toUpperCase() : 'PENDING';
    const formattedTimestamp = new Date(log.timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return [
      `"=""${log.id}"""`,
      `"=""${log.payment_id}"""`,
      `"${customerName.replace(/"/g, '""')}"`,
      `"${customerEmail.replace(/"/g, '""')}"`,
      `"${amountStr}"`,
      `"${currency}"`,
      `"${status}"`,
      `"${log.event.replace(/"/g, '""')}"`,
      `"${log.decision.replace(/"/g, '""')}"`,
      `"${(log.guardrail_result || 'N/A').replace(/"/g, '""')}"`,
      `"${(log.reason || '').replace(/"/g, '""')}"`,
      `"${formattedTimestamp}"`,
    ];
  });

  const fallbackRows = payments.map((p) => [
    `"=""${p.id + 900}"""`,
    `"=""${p.id}"""`,
    `"${(p.customer_name || 'Customer').replace(/"/g, '""')}"`,
    `"${(p.customer_email || `acc_${p.id}@payflow.demo`).replace(/"/g, '""')}"`,
    `"₹${(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}"`,
    `"${p.currency || 'INR'}"`,
    `"${p.status.toUpperCase()}"`,
    `"payment.${p.status}"`,
    `"${p.status === 'captured' ? 'CAPTURED' : 'HUMAN_APPROVAL'}"`,
    `"${p.amount >= 10000 ? 'HUMAN_APPROVAL' : 'ALLOW'}"`,
    `"${(p.failure_reason || '').replace(/"/g, '""')}"`,
    `"${new Date(p.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}"`,
  ]);

  const activeRows = dataRows.length > 0 ? dataRows : fallbackRows;

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    encodeURIComponent([...summaryLines, tableHeaders.join(','), ...activeRows.map((r) => r.join(','))].join('\n'));

  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `${filenamePrefix}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
