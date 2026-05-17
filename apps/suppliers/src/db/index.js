// JSON-based DB עם API דומה ל-better-sqlite3 (prepare/run/get/all/exec/transaction)
// פותר את בעיית הקומפילציה של better-sqlite3 בסביבות ללא build tools.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.json');

// schema metadata: רשימת טבלאות שמערכת מצפה להן
const TABLES = [
  'suppliers','products','supplier_products',
  'purchase_orders','po_items','grns','grn_items','supplier_ratings',
];

const data = loadData();
const seqs = data.__seqs || {};

function loadData() {
  if (!fs.existsSync(DB_PATH)) {
    const empty = { __seqs: {} };
    for (const t of TABLES) empty[t] = [];
    fs.writeFileSync(DB_PATH, JSON.stringify(empty));
    return empty;
  }
  const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  for (const t of TABLES) if (!raw[t]) raw[t] = [];
  if (!raw.__seqs) raw.__seqs = {};
  return raw;
}

let saveTimer = null;
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    data.__seqs = seqs;
    fs.writeFileSync(DB_PATH + '.tmp', JSON.stringify(data));
    fs.renameSync(DB_PATH + '.tmp', DB_PATH);
  }, 5);
}
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  data.__seqs = seqs;
  fs.writeFileSync(DB_PATH + '.tmp', JSON.stringify(data));
  fs.renameSync(DB_PATH + '.tmp', DB_PATH);
}

function nextId(table) {
  seqs[table] = (seqs[table] || 0) + 1;
  return seqs[table];
}

function nowIso() { return new Date().toISOString().replace('T',' ').substring(0,19); }

// === מנוע שאילתות SQL מיני ===
// תומך בתחביר שהקוד שלנו צריך:
//   INSERT INTO t (cols) VALUES (?,...) | (@a,@b)
//   UPDATE t SET col=?[,col=?]* WHERE col=?
//   DELETE FROM t WHERE col=?
//   SELECT ... FROM t [JOIN ...] WHERE ...
function parseSql(sql) {
  return sql.replace(/--.*$/gm,'').replace(/\s+/g,' ').trim();
}

class Statement {
  constructor(sql) {
    this.sql = parseSql(sql);
    this.upper = this.sql.toUpperCase();
  }
  // המרת array params + object params ל-vals
  _bindParams(args) {
    if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      return { positional: [], named: args[0] };
    }
    return { positional: args, named: {} };
  }
  run(...args) { return executeWrite(this.sql, this._bindParams(args)); }
  get(...args) { const r = executeRead(this.sql, this._bindParams(args)); return r[0]; }
  all(...args) { return executeRead(this.sql, this._bindParams(args)); }
}

function executeWrite(sql, params) {
  const upper = sql.toUpperCase();
  if (upper.startsWith('INSERT INTO')) return execInsert(sql, params);
  if (upper.startsWith('UPDATE'))      return execUpdate(sql, params);
  if (upper.startsWith('DELETE FROM')) return execDelete(sql, params);
  throw new Error('Unsupported write SQL: ' + sql);
}
function executeRead(sql, params) {
  const upper = sql.toUpperCase();
  if (upper.startsWith('SELECT')) return execSelect(sql, params);
  throw new Error('Unsupported read SQL: ' + sql);
}

function substituteParams(template, params) {
  // ממיר template (placeholders) לערכים
  let i = 0;
  const positional = params.positional || [];
  const named = params.named || {};
  return { positional, named, idx: () => positional[i++] };
}

// ===== INSERT =====
function execInsert(sql, params) {
  // INSERT INTO t (c1,c2,...) VALUES (v1,v2,...)
  const m = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s+VALUES\s*\(([^)]+)\)/i);
  if (!m) throw new Error('Bad INSERT: ' + sql);
  const table = m[1];
  const cols = m[2].split(',').map(s => s.trim());
  const vals = m[3].split(',').map(s => s.trim());
  const row = {};
  let posIdx = 0;
  for (let i = 0; i < cols.length; i++) {
    const v = vals[i];
    let val;
    if (v === '?') {
      val = params.positional[posIdx++];
    } else if (v.startsWith('@')) {
      val = params.named[v.substring(1)];
    } else if (v.toUpperCase() === 'CURRENT_TIMESTAMP') {
      val = nowIso();
    } else if (v === 'NULL') {
      val = null;
    } else if (/^-?\d+(\.\d+)?$/.test(v)) {
      val = +v;
    } else {
      val = v.replace(/^['"]|['"]$/g, '');
    }
    row[cols[i]] = val;
  }
  // id אוטומטי
  if (!row.id) row.id = nextId(table);
  // ברירת מחדל ל-created_at
  applyDefaults(table, row);
  // UNIQUE constraints
  enforceUnique(table, row);
  data[table].push(row);
  saveSoon();
  return { lastInsertRowid: row.id, changes: 1 };
}

function applyDefaults(table, row) {
  const defaults = {
    suppliers:        { active: 1, created_at: nowIso() },
    products:         { unit: 'יח׳', stock: 0, created_at: nowIso() },
    supplier_products:{ lead_time_days: 7, min_order_qty: 1, currency: 'ILS', updated_at: nowIso() },
    purchase_orders:  { status: 'draft', total: 0, created_at: nowIso() },
    po_items:         { qty_received: 0 },
    grns:             { received_at: nowIso() },
    supplier_ratings: { created_at: nowIso() },
  };
  const d = defaults[table] || {};
  for (const k of Object.keys(d)) if (row[k] === undefined || row[k] === null && k !== 'notes') {
    if (row[k] === undefined) row[k] = d[k];
  }
}

const UNIQUE_KEYS = {
  suppliers: ['portal_token'],
  products: ['sku'],
  purchase_orders: ['po_number'],
  grns: ['grn_number'],
};
function enforceUnique(table, row) {
  const keys = UNIQUE_KEYS[table] || [];
  for (const k of keys) {
    if (row[k] == null) continue;
    const dup = data[table].find(r => r[k] === row[k] && r.id !== row.id);
    if (dup) throw new Error(`UNIQUE constraint failed: ${table}.${k}`);
  }
  // supplier_products UNIQUE(supplier_id, product_id)
  if (table === 'supplier_products') {
    const dup = data.supplier_products.find(r =>
      r.supplier_id === row.supplier_id && r.product_id === row.product_id && r.id !== row.id
    );
    if (dup) throw new Error('UNIQUE constraint failed: supplier_products');
  }
}

// ===== UPDATE =====
function execUpdate(sql, params) {
  // UPDATE t SET col=expr[, col=expr]* WHERE ...
  const m = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i);
  if (!m) throw new Error('Bad UPDATE: ' + sql);
  const table = m[1];
  const setPart = m[2];
  const wherePart = m[3];

  const setItems = splitTopLevel(setPart, ',').map(s => s.trim());
  const updates = setItems.map(item => {
    const eqIdx = item.indexOf('=');
    return { col: item.substring(0, eqIdx).trim(), valExpr: item.substring(eqIdx + 1).trim() };
  });
  // ספירת ה-? ב-set כדי שה-where יתחיל מהאינדקס הנכון
  const setQCount = updates.reduce((c, u) => c + countQuestionMarks(u.valExpr), 0);

  const rows = data[table];
  let changes = 0;
  for (const r of rows) {
    let posIdx = setQCount; // where מתחיל אחרי ה-set
    if (!evalExpr(wherePart, { [table]: r, ...singleAlias(table, r) }, params, () => posIdx++)) continue;
    let pIdx = 0;
    for (const u of updates) {
      r[u.col] = evalUpdateExpr(u.valExpr, r, params, () => pIdx++);
    }
    changes++;
  }
  saveSoon();
  return { changes };
}

function countQuestionMarks(s) {
  return (s.match(/\?/g) || []).length;
}

function evalUpdateExpr(expr, row, params, posCounter) {
  expr = expr.trim();
  if (expr === '?') return params.positional[posCounter()];
  if (expr.startsWith('@')) return params.named[expr.substring(1)];
  if (expr.toUpperCase() === 'CURRENT_TIMESTAMP') return nowIso();
  if (expr.toUpperCase() === 'NULL') return null;
  if (/^-?\d+(\.\d+)?$/.test(expr)) return +expr;
  if (/^['"].*['"]$/.test(expr)) return expr.replace(/^['"]|['"]$/g, '');
  // arithmetic: col + ?  /  col - ?  etc.
  const arith = expr.match(/^(\w+)\s*([+\-*/])\s*(.+)$/);
  if (arith) {
    const cur = +row[arith[1]] || 0;
    const operand = +evalUpdateExpr(arith[3], row, params, posCounter);
    if (arith[2] === '+') return cur + operand;
    if (arith[2] === '-') return cur - operand;
    if (arith[2] === '*') return cur * operand;
    return cur / operand;
  }
  return expr;
}

// ===== DELETE =====
function execDelete(sql, params) {
  const m = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
  if (!m) throw new Error('Bad DELETE: ' + sql);
  const table = m[1];
  const where = m[2];
  if (!where) {
    const n = data[table].length;
    data[table].length = 0;
    saveSoon();
    return { changes: n };
  }
  const before = data[table].length;
  data[table] = data[table].filter(r => {
    let posIdx = 0;
    return !evalExpr(where, { [table]: r, ...singleAlias(table, r) }, params, () => posIdx++);
  });
  saveSoon();
  return { changes: before - data[table].length };
}

// ===== SELECT =====
function execSelect(sql, params) {
  // SELECT cols FROM t [alias] [JOIN x ON ...]* [WHERE ...] [ORDER BY ...]
  // אנחנו לא בונים מנוע SQL מלא — נטפל בדפוסים שהקוד באמת משתמש בהם.
  let s = sql.trim();

  // 1. נחלץ ORDER BY (ברמה העליונה)
  let order = null;
  const orderIdx = topLevelKeywordIdx(s, 'ORDER BY');
  if (orderIdx >= 0) { order = s.substring(orderIdx + 8).trim(); s = s.substring(0, orderIdx).trim(); }

  // 2. WHERE (ברמה העליונה)
  let whereStr = null;
  const whereIdx = topLevelKeywordIdx(s, 'WHERE');
  if (whereIdx >= 0) { whereStr = s.substring(whereIdx + 5).trim(); s = s.substring(0, whereIdx).trim(); }

  // 3. SELECT ... FROM ... — מוצא את FROM ברמה העליונה (לא בתוך סוגריים)
  const sUp = s.toUpperCase();
  if (!sUp.startsWith('SELECT ')) throw new Error('Bad SELECT: ' + sql);
  let fromIdx = -1, depth = 0;
  for (let i = 7; i < s.length - 4; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    if (depth === 0 && /\s/.test(s[i-1] || '') && sUp.substr(i, 5) === 'FROM ') {
      fromIdx = i; break;
    }
  }
  if (fromIdx < 0) throw new Error('No FROM in SELECT: ' + sql);
  const selectExpr = s.substring(7, fromIdx).trim();
  const fromExpr = s.substring(fromIdx + 5).trim();

  // 4. בניית תוצאות שורה אחר שורה (כולל joins)
  const sources = parseFromAndJoins(fromExpr);
  // sources: [{ table, alias, joinType?, on? }, ...]
  let rows = data[sources[0].table].map(r => ({ [sources[0].alias]: r }));
  for (let i = 1; i < sources.length; i++) {
    const src = sources[i];
    const joined = [];
    const targetRows = data[src.table];
    for (const left of rows) {
      for (const right of targetRows) {
        const candidate = { ...left, [src.alias]: right };
        if (evalExpr(src.on, candidate, { positional: [], named: {} })) {
          joined.push(candidate);
        }
      }
    }
    rows = joined;
  }

  // 5. WHERE — מאפס את counter ה-? לכל שורה (אותם params לכל שורה)
  if (whereStr) {
    rows = rows.filter(r => {
      let posIdx = 0;
      return evalExpr(whereStr, r, params, () => posIdx++);
    });
  }

  // 6. SELECT projection — בודקים אם יש aggregate ברמה העליונה (לא בתוך subquery)
  const items = splitTopLevel(selectExpr, ',').map(s => s.trim());
  const topLevelAgg = items.some(it => {
    const noAlias = it.replace(/\s+AS\s+\w+$/i, '').trim();
    return /^(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(noAlias) ||
           /^ROUND\s*\(\s*(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(noAlias);
  });
  let result;
  if (topLevelAgg) {
    result = [aggregateRow(selectExpr, rows, sources, params)];
  } else {
    result = rows.map(r => projectRow(selectExpr, r, sources, params));
  }

  // 7. ORDER BY
  if (order) {
    const orderItems = order.split(',').map(o => {
      const parts = o.trim().split(/\s+/);
      const col = parts[0];
      const dir = (parts[1] || 'ASC').toUpperCase();
      return { col, dir };
    });
    result.sort((a, b) => {
      for (const { col, dir } of orderItems) {
        const av = a[col], bv = b[col];
        if (av == null && bv == null) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return dir === 'ASC' ? -1 : 1;
        if (av > bv) return dir === 'ASC' ? 1 : -1;
      }
      return 0;
    });
  }
  return result;
}

function topLevelKeywordIdx(s, kw) {
  const upper = s.toUpperCase();
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    if (depth === 0 && upper.substr(i, kw.length) === kw &&
        (i === 0 || /\s/.test(s[i-1])) &&
        (s[i+kw.length] === undefined || /\s/.test(s[i+kw.length]))) {
      return i;
    }
  }
  return -1;
}

function parseFromAndJoins(fromExpr) {
  // dpaattern: "table [AS alias] [JOIN table [AS alias] ON ...]*"
  const sources = [];
  // Split on JOIN keywords
  const tokens = fromExpr.split(/\s+(?=JOIN|LEFT JOIN|INNER JOIN)/i);
  // first token is the FROM table
  const first = tokens[0].trim();
  sources.push(parseTableRef(first));
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i].trim();
    const m = t.match(/^(?:INNER\s+|LEFT\s+)?JOIN\s+(.+?)\s+ON\s+(.+)$/i);
    if (!m) throw new Error('Bad JOIN: ' + t);
    const ref = parseTableRef(m[1]);
    ref.on = m[2].trim();
    sources.push(ref);
  }
  return sources;
}
function parseTableRef(s) {
  // "table" or "table alias" or "table AS alias"
  const parts = s.replace(/\s+AS\s+/i, ' ').trim().split(/\s+/);
  return { table: parts[0], alias: parts[1] || parts[0] };
}

function projectRow(selectExpr, row, sources, params) {
  // תומך ב:
  //  - *
  //  - alias.* (לא בשימוש עדיין)
  //  - col, alias.col, alias.col AS name
  //  - COUNT(*), SUM(x) — only when there's a GROUP BY-less SELECT for aggregation
  //  - subquery scalar: (SELECT COUNT(*) FROM x WHERE x.id=alias.id) AS name
  //
  // אנחנו לא מחזיקים מנוע מלא — נטפל לפי המצבים בקוד שלנו.
  if (selectExpr.trim() === '*') {
    if (sources.length === 1) return { ...row[sources[0].alias] };
    // צירוף שטוח כשיש joins
    return Object.assign({}, ...sources.map(s => row[s.alias]));
  }

  const items = splitTopLevel(selectExpr, ',').map(s => s.trim());
  const out = {};
  for (const item of items) {
    // alias.*
    const starM = item.match(/^(\w+)\.\*$/);
    if (starM) {
      Object.assign(out, row[starM[1]]);
      continue;
    }
    // expression AS name
    const asM = item.match(/^(.+?)\s+AS\s+(\w+)$/i);
    let expr = asM ? asM[1].trim() : item.trim();
    const name = asM ? asM[2] : (expr.includes('.') ? expr.split('.')[1] : expr);
    out[name] = evalSelectExpr(expr, row, params);
  }
  return out;
}

function evalSelectExpr(expr, row, params) {
  expr = expr.trim();
  // Subquery: (SELECT ... )
  if (expr.startsWith('(') && expr.endsWith(')')) {
    const inner = expr.substring(1, expr.length - 1).trim();
    if (inner.toUpperCase().startsWith('SELECT')) {
      // נחליף הפניות מבחוץ (alias.col) בערכים מתוך row
      let resolved = inner;
      resolved = resolved.replace(/(\w+)\.(\w+)/g, (m, alias, col) => {
        if (row[alias] && row[alias][col] !== undefined) {
          const v = row[alias][col];
          return typeof v === 'string' ? `'${v.replace(/'/g,"''")}'` : (v == null ? 'NULL' : String(v));
        }
        return m;
      });
      const sub = execSelect(resolved, { positional: [], named: {} });
      if (!sub.length) return null;
      const first = sub[0];
      const keys = Object.keys(first);
      return first[keys[0]];
    }
  }
  // COUNT(*), SUM(col), AVG(col), ROUND(AVG(col),2)
  const aggMatch = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.+?)\s*\)$/i);
  if (aggMatch) {
    return evalAggregate(aggMatch[1].toUpperCase(), aggMatch[2], row.__group || [row], params);
  }
  const roundMatch = expr.match(/^ROUND\s*\(\s*(.+?)\s*,\s*(\d+)\s*\)$/i);
  if (roundMatch) {
    const v = evalSelectExpr(roundMatch[1], row, params);
    if (v == null) return null;
    return +(+v).toFixed(+roundMatch[2]);
  }
  // alias.col or col
  if (expr.includes('.')) {
    const [a, c] = expr.split('.');
    return row[a] ? row[a][c] : undefined;
  }
  // Plain col
  for (const a of Object.keys(row)) {
    if (row[a] && row[a][expr] !== undefined) return row[a][expr];
  }
  return undefined;
}

function aggregateRow(selectExpr, rows, sources, params) {
  const items = splitTopLevel(selectExpr, ',').map(s => s.trim());
  const out = {};
  for (const item of items) {
    const asM = item.match(/^(.+?)\s+AS\s+(\w+)$/i);
    const expr = asM ? asM[1].trim() : item.trim();
    const name = asM ? asM[2] : expr.replace(/[^\w]/g,'_');
    // טיפול ב-COUNT/SUM/AVG/MIN/MAX/ROUND(AVG..)
    const aggMatch = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.+?)\s*\)$/i);
    if (aggMatch) {
      out[name] = evalAggregate(aggMatch[1].toUpperCase(), aggMatch[2], rows, params);
      continue;
    }
    const roundMatch = expr.match(/^ROUND\s*\(\s*(.+?)\s*,\s*(\d+)\s*\)$/i);
    if (roundMatch) {
      const inner = roundMatch[1].trim();
      const innerAgg = inner.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.+?)\s*\)$/i);
      let v;
      if (innerAgg) v = evalAggregate(innerAgg[1].toUpperCase(), innerAgg[2], rows, params);
      else v = rows[0] ? evalSelectExpr(inner, rows[0], params) : null;
      out[name] = v == null ? null : +(+v).toFixed(+roundMatch[2]);
      continue;
    }
    // עמודה רגילה — לוקחים מהשורה הראשונה (ללא GROUP BY מלא)
    out[name] = rows[0] ? evalSelectExpr(expr, rows[0], params) : null;
  }
  return out;
}

function evalAggregate(fn, arg, rows, params) {
  if (fn === 'COUNT') {
    if (arg === '*') return rows.length;
    return rows.filter(r => evalSelectExpr(arg, r, params) != null).length;
  }
  const vals = rows.map(r => +evalSelectExpr(arg, r, params)).filter(v => !isNaN(v));
  if (!vals.length) return null;
  if (fn === 'SUM') return vals.reduce((a,b)=>a+b, 0);
  if (fn === 'AVG') return vals.reduce((a,b)=>a+b, 0) / vals.length;
  if (fn === 'MIN') return Math.min(...vals);
  if (fn === 'MAX') return Math.max(...vals);
}

// פיצול ברמה העליונה (תומך בסוגריים)
function splitTopLevel(s, delim) {
  const out = [];
  let depth = 0, buf = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === delim && depth === 0) { out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

function compileWhere(whereStr, params, posCounter) {
  return (row) => evalExpr(whereStr, row, params, posCounter);
}

// כשיש רק טבלה אחת — אפשר להפנות לעמודה גם בלי alias
function singleAlias(_table, row) {
  // החזרת אותה שורה תחת alias של "" — לא בשימוש; ה-evalExpr כבר סורק את כל ה-alias-ים.
  return {};
}

function evalExpr(expr, row, params, posCounter) {
  expr = expr.trim();
  // OR
  const orParts = splitTopLevel(expr, '|').filter(s=>s); // לא נשתמש; נשתמש ב-keyword
  // נחפש OR/AND תוך הימנעות מסוגריים
  const orSplit = splitKeyword(expr, 'OR');
  if (orSplit.length > 1) return orSplit.some(p => evalExpr(p, row, params, posCounter));
  const andSplit = splitKeyword(expr, 'AND');
  if (andSplit.length > 1) return andSplit.every(p => evalExpr(p, row, params, posCounter));
  // basic: <left> <op> <right>
  // ops: =, !=, <>, <, <=, >, >=, LIKE, IS NULL, IS NOT NULL, BETWEEN
  let m;
  if ((m = expr.match(/^(.+?)\s+IS\s+NOT\s+NULL$/i))) {
    return resolveValue(m[1], row, params, posCounter) != null;
  }
  if ((m = expr.match(/^(.+?)\s+IS\s+NULL$/i))) {
    return resolveValue(m[1], row, params, posCounter) == null;
  }
  if ((m = expr.match(/^(.+?)\s+(?:NOT\s+)?BETWEEN\s+(.+?)\s+AND\s+(.+)$/i))) {
    const v = resolveValue(m[1], row, params, posCounter);
    const lo = resolveValue(m[2], row, params, posCounter);
    const hi = resolveValue(m[3], row, params, posCounter);
    return v >= lo && v <= hi;
  }
  if ((m = expr.match(/^(.+?)\s+LIKE\s+(.+)$/i))) {
    const v = resolveValue(m[1], row, params, posCounter);
    const pat = resolveValue(m[2], row, params, posCounter);
    if (v == null || pat == null) return false;
    const re = new RegExp('^' + String(pat).replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/%/g,'.*').replace(/_/g,'.') + '$', 'i');
    return re.test(String(v));
  }
  if ((m = expr.match(/^(.+?)\s*(<>|!=|<=|>=|=|<|>)\s*(.+)$/))) {
    const left = resolveValue(m[1], row, params, posCounter);
    const op = m[2];
    const right = resolveValue(m[3], row, params, posCounter);
    if (op === '=')  return left == right;
    if (op === '!=' || op === '<>') return left != right;
    if (op === '<')  return left <  right;
    if (op === '<=') return left <= right;
    if (op === '>')  return left >  right;
    if (op === '>=') return left >= right;
  }
  // literal "1=1"
  if (expr === '1=1') return true;
  throw new Error('Cannot evaluate WHERE expr: ' + expr);
}

function splitKeyword(s, kw) {
  // פיצול לפי מילת מפתח ברמה העליונה
  const out = [];
  let depth = 0, buf = '';
  const upper = s.toUpperCase();
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && upper.substr(i, kw.length) === kw &&
        (i === 0 || /\s/.test(s[i-1])) && /\s/.test(s[i+kw.length] || ' ')) {
      out.push(buf);
      buf = '';
      i += kw.length;
      continue;
    }
    buf += ch;
    i++;
  }
  out.push(buf);
  return out.map(x => x.trim()).filter(x => x.length);
}

function resolveValue(token, row, params, posCounter) {
  token = token.trim();
  if (token === '?') return params.positional[posCounter()];
  if (token.startsWith('@')) return params.named[token.substring(1)];
  if (token.toUpperCase() === 'NULL') return null;
  if (token.toUpperCase() === 'CURRENT_TIMESTAMP') return nowIso();
  if (/^-?\d+(\.\d+)?$/.test(token)) return +token;
  if (/^['"].*['"]$/.test(token)) return token.replace(/^['"]|['"]$/g, '');
  // alias.col
  if (token.includes('.')) {
    const [a, c] = token.split('.');
    return row[a] ? row[a][c] : undefined;
  }
  // bare column — חפש בכל מקור
  for (const a of Object.keys(row)) {
    if (row[a] && row[a][token] !== undefined) return row[a][token];
  }
  return undefined;
}

// === API ===
const dbApi = {
  prepare(sql) { return new Statement(sql); },
  exec(sqlBatch) {
    // מטפל ב-CREATE TABLE/INDEX/PRAGMA (no-op) וגם ב-DELETE FROM ...
    const stmts = sqlBatch.split(';').map(s => s.trim()).filter(Boolean);
    for (const st of stmts) {
      const u = st.toUpperCase();
      if (u.startsWith('CREATE') || u.startsWith('PRAGMA')) continue;
      if (u.startsWith('DELETE')) execDelete(st, { positional: [], named: {} });
      else if (u.startsWith('INSERT')) execInsert(st, { positional: [], named: {} });
    }
    saveNow();
  },
  pragma() { /* no-op */ },
  transaction(fn) {
    return (...args) => {
      const snapshot = JSON.parse(JSON.stringify({ data, seqs }));
      try {
        const r = fn(...args);
        saveNow();
        return r;
      } catch (e) {
        // rollback
        for (const k of Object.keys(data)) delete data[k];
        Object.assign(data, snapshot.data);
        for (const k of Object.keys(seqs)) delete seqs[k];
        Object.assign(seqs, snapshot.seqs);
        saveNow();
        throw e;
      }
    };
  },
};

module.exports = dbApi;
