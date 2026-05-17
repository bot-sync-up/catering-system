const fs = require('fs');
const path = require('path');
const { parse: csvParse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const ofx = require('ofx-js');
const prisma = require('../../db/prisma');
const { fuzzyScore } = require('../../utils/fuzzy');

/**
 * Parse bank statement file into normalized transaction list.
 * Supports OFX, CSV, XLSX.
 */
async function parseStatement(filePath, fileType) {
  const buf = fs.readFileSync(filePath);
  if (fileType === 'OFX') return parseOFX(buf.toString('utf-8'));
  if (fileType === 'CSV') return parseCSV(buf);
  if (fileType === 'XLSX' || fileType === 'XLS') return parseXLSX(buf);
  return [];
}

async function parseOFX(text) {
  try {
    const data = await ofx.parse(text);
    const stmtTrn =
      data?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN ||
      data?.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN || [];
    const list = Array.isArray(stmtTrn) ? stmtTrn : [stmtTrn];
    return list.filter(Boolean).map((t) => ({
      txDate: parseOFXDate(t.DTPOSTED),
      amount: parseFloat(t.TRNAMT),
      description: (t.NAME || t.MEMO || '').toString().trim(),
      reference: t.FITID || null,
    }));
  } catch (e) {
    console.error('[ofx.parse]', e.message);
    return [];
  }
}

function parseOFXDate(s) {
  // OFX date format: YYYYMMDDHHMMSS or YYYYMMDD
  const m = String(s || '').match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return new Date();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
}

function parseCSV(buf) {
  const records = csvParse(buf, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  return records.map(normalizeRow).filter((r) => r);
}

function parseXLSX(buf) {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map(normalizeRow).filter((r) => r);
}

// Normalize a row from CSV/XLSX — handle Hebrew + English column variants
function normalizeRow(row) {
  const keys = Object.keys(row);
  const find = (...candidates) => {
    for (const c of candidates) {
      const k = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()) || k.includes(c));
      if (k && row[k] !== '' && row[k] !== null && row[k] !== undefined) return row[k];
    }
    return null;
  };
  const dateRaw = find('תאריך', 'date', 'תאריך ערך', 'value date');
  const desc = find('תיאור', 'description', 'פרטים', 'narration', 'memo');
  let debit = find('חובה', 'debit', 'הוצאה');
  let credit = find('זכות', 'credit', 'הכנסה');
  const amountRaw = find('סכום', 'amount');
  const balance = find('יתרה', 'balance');
  const reference = find('אסמכתא', 'reference', 'ref', 'fitid');

  let amount = null;
  if (amountRaw !== null && amountRaw !== '') amount = parseAmount(amountRaw);
  else {
    const d = parseAmount(debit);
    const c = parseAmount(credit);
    if (d && d > 0) amount = -Math.abs(d);
    else if (c && c > 0) amount = Math.abs(c);
  }

  const txDate = parseDate(dateRaw);
  if (!txDate || amount === null || isNaN(amount)) return null;

  return {
    txDate,
    amount,
    description: String(desc || '').trim(),
    reference: reference ? String(reference) : null,
    balance: balance ? parseAmount(balance) : null,
  };
}

function parseAmount(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[,\s₪]/g, '').replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  const s = String(v).trim();
  // DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m1) {
    const [_, d, m, y] = m1;
    const yyyy = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(yyyy, parseInt(m) - 1, parseInt(d));
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

/**
 * Fuzzy-match unmatched expenses against transactions in a statement.
 * Returns counts.
 */
async function matchTransactions(statementId) {
  const txs = await prisma.bankTransaction.findMany({
    where: { statementId, matched: false },
  });

  let autoMatched = 0;
  let suggested = 0;

  for (const tx of txs) {
    // candidate expenses: unreconciled, amount within ±0.01, date within ±5 days
    const txAbs = Math.abs(Number(tx.amount));
    const windowStart = new Date(tx.txDate);
    windowStart.setDate(windowStart.getDate() - 5);
    const windowEnd = new Date(tx.txDate);
    windowEnd.setDate(windowEnd.getDate() + 5);

    const candidates = await prisma.expense.findMany({
      where: {
        reconciled: false,
        expenseDate: { gte: windowStart, lte: windowEnd },
        amount: { gte: txAbs - 0.05, lte: txAbs + 0.05 },
      },
      include: { vendor: true },
    });

    let best = null;
    let bestScore = 0;
    for (const e of candidates) {
      const dateDelta = Math.abs(new Date(e.expenseDate) - new Date(tx.txDate)) / (1000 * 60 * 60 * 24);
      const amountDelta = Math.abs(Number(e.amount) - txAbs);
      const descScore = fuzzyScore(
        tx.description || '',
        `${e.description || ''} ${e.vendor?.name || ''} ${e.invoiceNumber || ''}`
      );
      const score =
        descScore * 0.55 +
        Math.max(0, 1 - dateDelta / 5) * 0.25 +
        Math.max(0, 1 - amountDelta / 0.05) * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }

    if (best && bestScore >= 0.75) {
      await prisma.$transaction([
        prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { matched: true, matchScore: bestScore },
        }),
        prisma.expense.update({
          where: { id: best.id },
          data: { bankTransactionId: tx.id, reconciled: true, status: 'RECONCILED' },
        }),
      ]);
      autoMatched++;
    } else if (best && bestScore >= 0.5) {
      await prisma.bankTransaction.update({
        where: { id: tx.id },
        data: { matchScore: bestScore },
      });
      suggested++;
    }
  }

  return { total: txs.length, autoMatched, suggested };
}

async function matchSingle(txId, expenseId) {
  await prisma.$transaction([
    prisma.bankTransaction.update({
      where: { id: txId },
      data: { matched: true, matchScore: 1.0 },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { bankTransactionId: txId, reconciled: true, status: 'RECONCILED' },
    }),
  ]);
  return { ok: true };
}

module.exports = { parseStatement, matchTransactions, matchSingle };
