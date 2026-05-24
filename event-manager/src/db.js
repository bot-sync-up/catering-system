// Lightweight JSON-backed store with a tiny SQL-like prepared-statement shim.
// This avoids native deps (better-sqlite3 needs prebuild/SSL fetch which fails in this env).
// API surface: db.prepare(sql).run(...) | .get(...) | .all(...)
// Supported SQL forms (only what routes.js uses):
//   INSERT INTO <table> (cols) VALUES (?,?,?...)
//   SELECT * FROM <table> [WHERE col=? AND col=? ...] [ORDER BY ... ]
//   SELECT a,b,c FROM <table> [WHERE ...] [ORDER BY ...]
//   SELECT ... FROM <t1> LEFT JOIN <t2> ON <t2.col>=<t1.col> [WHERE ...] [ORDER BY ...]
//   UPDATE <table> SET col=?,... WHERE col=?
//   DELETE FROM <table> WHERE col=?

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'events.json');

const tables = ['venues','events','event_tasks','staff_assignments','equipment','equipment_movements','equipment_rentals','debriefs'];

const data = {};
const counters = {};
tables.forEach(t => { data[t] = []; counters[t] = 0; });

function load() {
  if (fs.existsSync(dbPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      for (const t of tables) {
        if (Array.isArray(raw[t])) data[t] = raw[t];
        if (raw._counters && raw._counters[t] != null) counters[t] = raw._counters[t];
      }
    } catch (e) { console.warn('DB load failed:', e.message); }
  }
}
function save() {
  try { fs.writeFileSync(dbPath, JSON.stringify({ ...data, _counters: counters }, null, 2)); }
  catch (e) { console.error('DB save failed:', e.message); }
}
load();

const COL_DEFAULTS = {
  venues: { capacity: null },
  events: { status: 'planned', budget: 0, venue_id: null },
  event_tasks: { progress: 0, done: 0, sort_order: 0, parent_id: null },
  staff_assignments: {},
  equipment: { total_qty: 1, unit_price: 0, rental_price_per_day: 0 },
  equipment_movements: { qty_sent: 0, qty_returned: 0, missing_qty: 0 },
  equipment_rentals: { qty: 1, daily_price: 0, total_charge: 0, charged: 0 },
  debriefs: {},
};

// === Tiny SQL parser ===
function tokenize(sql) {
  return sql.replace(/\s+/g, ' ').replace(/\s*=\s*/g, ' = ').replace(/\s+/g, ' ').trim();
}

function parseWhere(whereStr) {
  if (!whereStr) return [];
  const parts = whereStr.split(/\s+AND\s+/i);
  return parts.map(p => {
    const m = p.trim().match(/^([\w.]+)\s*=\s*(\?|'[^']*'|\d+|NULL)\s*$/i);
    if (!m) throw new Error('Unsupported WHERE: ' + p);
    return { col: m[1], val: m[2] };
  });
}

function applyWhere(rows, where, params, paramIdxRef) {
  if (where.length === 0) return rows;
  return rows.filter(row => where.every(w => {
    let v;
    if (w.val === '?') { v = params[paramIdxRef.idx++]; }
    else if (w.val.toUpperCase() === 'NULL') v = null;
    else if (/^'.*'$/.test(w.val)) v = w.val.slice(1, -1);
    else v = Number(w.val);
    const colName = w.col.includes('.') ? w.col.split('.')[1] : w.col;
    if (v == null) return row[colName] == null;
    // loose equality for numeric ids
    return String(row[colName]) === String(v);
  }));
}

function applyOrder(rows, orderStr) {
  if (!orderStr) return rows;
  const cols = orderStr.split(',').map(s => {
    const parts = s.trim().split(/\s+/);
    return { col: parts[0].includes('.') ? parts[0].split('.')[1] : parts[0], dir: (parts[1]||'ASC').toUpperCase() };
  });
  return [...rows].sort((a, b) => {
    for (const c of cols) {
      const av = a[c.col], bv = b[c.col];
      if (av == null && bv == null) continue;
      if (av == null) return 1; if (bv == null) return -1;
      if (av < bv) return c.dir === 'DESC' ? 1 : -1;
      if (av > bv) return c.dir === 'DESC' ? -1 : 1;
    }
    return 0;
  });
}

function aliasMap(fromClause) {
  // returns { mainTable, mainAlias, joins: [{table, alias, onLeftCol, onRightCol}] }
  // fromClause without "FROM "
  const tokens = fromClause.split(/\s+/);
  const mainTable = tokens[0];
  let mainAlias = mainTable;
  let i = 1;
  if (tokens[i] && !/^(LEFT|JOIN|WHERE|ORDER)$/i.test(tokens[i])) { mainAlias = tokens[i]; i++; }
  const joins = [];
  while (i < tokens.length) {
    if (/^LEFT$/i.test(tokens[i]) && /^JOIN$/i.test(tokens[i+1])) {
      const jt = tokens[i+2];
      let ja = jt; let k = i+3;
      if (tokens[k] && !/^ON$/i.test(tokens[k])) { ja = tokens[k]; k++; }
      // ON xx.col = yy.col
      const onLeft = tokens[k+1];
      const onRight = tokens[k+3];
      joins.push({ table: jt, alias: ja, onLeft, onRight });
      i = k + 4;
    } else break;
  }
  return { mainTable, mainAlias, joins };
}

function compile(sql) {
  const s = tokenize(sql);

  let m;
  if (m = s.match(/^INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i)) {
    const table = m[1];
    const cols = m[2].split(',').map(c => c.trim());
    const placeholders = m[3].split(',').map(c => c.trim());
    return {
      run: (...params) => {
        const row = {};
        const defaults = COL_DEFAULTS[table] || {};
        Object.assign(row, defaults);
        let pi = 0;
        cols.forEach((c, idx) => {
          const ph = placeholders[idx];
          if (ph === '?') row[c] = params[pi++];
          else if (ph.toUpperCase() === 'NULL') row[c] = null;
          else if (/^\d+$/.test(ph)) row[c] = Number(ph);
          else if (/^'.*'$/.test(ph)) row[c] = ph.slice(1,-1);
          else row[c] = ph;
        });
        counters[table] = (counters[table] || 0) + 1;
        row.id = counters[table];
        if (!row.created_at && hasCreatedAt(table)) row.created_at = new Date().toISOString();
        data[table].push(row);
        save();
        return { lastInsertRowid: row.id, changes: 1 };
      }
    };
  }

  if (m = s.match(/^SELECT\s+(.+?)\s+FROM\s+(.+?)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?$/i)) {
    const selectCols = m[1].trim();
    const fromPart = m[2].trim();
    const wherePart = m[3] || null;
    const orderPart = m[4] || null;
    const { mainTable, mainAlias, joins } = aliasMap(fromPart);
    const where = parseWhere(wherePart);

    const exec = (params) => {
      let rows = data[mainTable].map(r => ({ [mainAlias]: r, _flat: { ...r } }));
      // Joins
      for (const j of joins) {
        // onLeft like "v.id" / onRight like "e.venue_id" (or vice-versa)
        const leftAlias = j.onLeft.split('.')[0];
        const leftCol = j.onLeft.split('.')[1];
        const rightAlias = j.onRight.split('.')[0];
        const rightCol = j.onRight.split('.')[1];
        rows = rows.map(rec => {
          const lookupAlias = leftAlias === j.alias ? leftAlias : rightAlias;
          const lookupCol = leftAlias === j.alias ? leftCol : rightCol;
          const fromAlias = leftAlias === j.alias ? rightAlias : leftAlias;
          const fromCol = leftAlias === j.alias ? rightCol : leftCol;
          const key = rec[fromAlias] ? rec[fromAlias][fromCol] : rec._flat[fromCol];
          const matched = data[j.table].find(x => x[lookupCol] == key);
          rec[j.alias] = matched || null;
          return rec;
        });
      }
      // WHERE - resolve param values once
      let pIdx = 0;
      const resolvedWhere = where.map(w => {
        let v;
        if (w.val === '?') v = params[pIdx++];
        else if (w.val.toUpperCase() === 'NULL') v = null;
        else if (/^'.*'$/.test(w.val)) v = w.val.slice(1,-1);
        else v = Number(w.val);
        return { col: w.col, val: v };
      });
      let filtered = rows.filter(rec => {
        return resolvedWhere.every(w => {
          let actual;
          if (w.col.includes('.')) {
            const [a, c] = w.col.split('.');
            actual = rec[a] ? rec[a][c] : (a === mainAlias ? rec._flat[c] : undefined);
          } else {
            actual = rec._flat[w.col];
          }
          if (w.val == null) return actual == null;
          return String(actual) === String(w.val);
        });
      });
      // re-evaluate where index per call? we already did; fine for one query.
      // ORDER
      if (orderPart) {
        const orders = orderPart.split(',').map(o => {
          const parts = o.trim().split(/\s+/);
          const col = parts[0].includes('.') ? parts[0].split('.')[1] : parts[0];
          const alias = parts[0].includes('.') ? parts[0].split('.')[0] : null;
          return { col, alias, dir: (parts[1]||'ASC').toUpperCase() };
        });
        filtered.sort((a, b) => {
          for (const o of orders) {
            const av = o.alias && a[o.alias] ? a[o.alias][o.col] : a._flat[o.col];
            const bv = o.alias && b[o.alias] ? b[o.alias][o.col] : b._flat[o.col];
            if (av == null && bv == null) continue;
            if (av == null) return 1; if (bv == null) return -1;
            if (av < bv) return o.dir === 'DESC' ? 1 : -1;
            if (av > bv) return o.dir === 'DESC' ? -1 : 1;
          }
          return 0;
        });
      }
      // PROJECT
      const project = (rec) => {
        if (selectCols === '*') return { ...rec._flat };
        const items = selectCols.split(',').map(p => p.trim());
        const result = {};
        for (const it of items) {
          if (it === '*') Object.assign(result, rec._flat);
          else if (/\.\*$/.test(it)) {
            const a = it.split('.')[0];
            if (rec[a]) Object.assign(result, rec[a]);
            else if (a === mainAlias) Object.assign(result, rec._flat);
          } else if (/\s+as\s+/i.test(it)) {
            const [expr, alias] = it.split(/\s+as\s+/i);
            const e = expr.trim();
            if (e.includes('.')) {
              const [a, c] = e.split('.');
              const src = rec[a] || (a === mainAlias ? rec._flat : null);
              result[alias.trim()] = src ? src[c] : null;
            } else {
              result[alias.trim()] = rec._flat[e];
            }
          } else if (it.includes('.')) {
            const [a, c] = it.split('.');
            const src = rec[a] || (a === mainAlias ? rec._flat : null);
            result[c] = src ? src[c] : null;
          } else {
            result[it] = rec._flat[it];
          }
        }
        return result;
      };
      return filtered.map(project);
    };

    return {
      all: (...params) => exec(params),
      get: (...params) => exec(params)[0] || undefined,
    };
  }

  if (m = s.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i)) {
    const table = m[1];
    const setStr = m[2];
    const wherePart = m[3];
    const setCols = setStr.split(',').map(p => {
      const [c, v] = p.split('=').map(x => x.trim());
      return { col: c, ph: v };
    });
    const where = parseWhere(wherePart);
    return {
      run: (...params) => {
        let pi = 0;
        const setVals = setCols.map(sc => {
          if (sc.ph === '?') return { col: sc.col, val: params[pi++] };
          if (sc.ph.toUpperCase() === 'NULL') return { col: sc.col, val: null };
          if (/^'.*'$/.test(sc.ph)) return { col: sc.col, val: sc.ph.slice(1,-1) };
          return { col: sc.col, val: Number(sc.ph) };
        });
        const whereVals = where.map(w => {
          if (w.val === '?') return { col: w.col, val: params[pi++] };
          if (w.val.toUpperCase() === 'NULL') return { col: w.col, val: null };
          if (/^'.*'$/.test(w.val)) return { col: w.col, val: w.val.slice(1,-1) };
          return { col: w.col, val: Number(w.val) };
        });
        let count = 0;
        for (const row of data[table]) {
          if (whereVals.every(w => String(row[w.col]) === String(w.val))) {
            for (const s of setVals) row[s.col] = s.val;
            count++;
          }
        }
        save();
        return { changes: count };
      }
    };
  }

  if (m = s.match(/^DELETE FROM (\w+)\s+WHERE\s+(.+)$/i)) {
    const table = m[1];
    const where = parseWhere(m[2]);
    return {
      run: (...params) => {
        let pi = 0;
        const whereVals = where.map(w => {
          if (w.val === '?') return { col: w.col, val: params[pi++] };
          if (w.val.toUpperCase() === 'NULL') return { col: w.col, val: null };
          if (/^'.*'$/.test(w.val)) return { col: w.col, val: w.val.slice(1,-1) };
          return { col: w.col, val: Number(w.val) };
        });
        const before = data[table].length;
        data[table] = data[table].filter(row => !whereVals.every(w => String(row[w.col]) === String(w.val)));
        // Cascade
        cascade(table, whereVals);
        save();
        return { changes: before - data[table].length };
      }
    };
  }

  throw new Error('Unsupported SQL: ' + sql);
}

function cascade(table, whereVals) {
  // Delete dependents based on FK relationships used in schema.
  const pkVal = (whereVals.find(w => w.col === 'id') || {}).val;
  if (pkVal == null) return;
  if (table === 'events') {
    data.event_tasks = data.event_tasks.filter(r => r.event_id != pkVal);
    data.staff_assignments = data.staff_assignments.filter(r => r.event_id != pkVal);
    data.equipment_movements = data.equipment_movements.filter(r => r.event_id != pkVal);
    data.equipment_rentals = data.equipment_rentals.filter(r => r.event_id != pkVal);
    data.debriefs = data.debriefs.filter(r => r.event_id != pkVal);
  } else if (table === 'event_tasks') {
    // Cascade child tasks
    let queue = [pkVal];
    while (queue.length) {
      const id = queue.shift();
      const children = data.event_tasks.filter(r => r.parent_id == id);
      data.event_tasks = data.event_tasks.filter(r => r.parent_id != id);
      queue.push(...children.map(c => c.id));
    }
  }
}

function hasCreatedAt(table) {
  return ['venues','events','debriefs'].includes(table);
}

const cache = new Map();
function prepare(sql) {
  if (!cache.has(sql)) cache.set(sql, compile(sql));
  return cache.get(sql);
}

module.exports = { prepare, exec: () => {}, pragma: () => {} };
