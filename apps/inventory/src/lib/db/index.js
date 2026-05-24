'use strict';
/**
 * שכבת DB מבוססת sql.js. ממשק דמוי better-sqlite3.
 * חייבים לקרוא ל-`await initDb()` פעם אחת בעת bootstrap לפני השימוש.
 *
 * ייצוא:
 *   db                — אובייקט DB (לאחר init)
 *   initDb()          — Promise<db>; טוען את WASM ופותח את הקובץ
 *   db.prepare(sql).{run,get,all}
 *   db.exec(sql)
 *   db.transaction(fn)
 */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.INVENTORY_DB || path.join(DATA_DIR, 'inventory.db');

let raw = null;
let SQL = null;
let initPromise = null;
let txDepth = 0;
let spCounter = 0;

function lastInsertRowid() {
  const r = raw.exec('SELECT last_insert_rowid() AS id')[0];
  return r ? r.values[0][0] : 0;
}
function changesCount() {
  const r = raw.exec('SELECT changes() AS c')[0];
  return r ? r.values[0][0] : 0;
}

let saveTimer = null;
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = raw.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) { console.error('[db] save error', e); }
  }, 100);
}
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (raw) fs.writeFileSync(DB_PATH, Buffer.from(raw.export()));
}

class Statement {
  constructor(sql) { this.sql = sql; }
  _prep(args) {
    const stmt = raw.prepare(this.sql);
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      stmt.bind(args[0]);
    } else if (args.length) {
      stmt.bind(args);
    }
    return stmt;
  }
  run(...args) {
    const stmt = this._prep(args);
    stmt.step();
    stmt.free();
    const out = { changes: changesCount(), lastInsertRowid: lastInsertRowid() };
    saveSoon();
    return out;
  }
  get(...args) {
    const stmt = this._prep(args);
    let out;
    if (stmt.step()) out = stmt.getAsObject();
    stmt.free();
    return out;
  }
  all(...args) {
    const stmt = this._prep(args);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
}

const db = {
  DB_PATH,
  prepare(sql) {
    if (!raw) throw new Error('DB not initialized; await initDb() first');
    return new Statement(sql);
  },
  exec(sql) {
    if (!raw) throw new Error('DB not initialized');
    raw.exec(sql); saveSoon();
  },
  pragma(/* expr */) { /* no-op for sql.js */ },
  transaction(fn) {
    // תומך בקינון: ברמה החיצונית BEGIN/COMMIT, ברמות פנימיות SAVEPOINT
    return function (...args) {
      const nested = txDepth > 0;
      const sp = nested ? `sp_${++spCounter}` : null;
      if (nested) raw.exec(`SAVEPOINT ${sp}`);
      else raw.exec('BEGIN');
      txDepth++;
      try {
        const r = fn(...args);
        if (nested) raw.exec(`RELEASE SAVEPOINT ${sp}`);
        else { raw.exec('COMMIT'); saveSoon(); }
        txDepth--;
        return r;
      } catch (e) {
        try {
          if (nested) raw.exec(`ROLLBACK TO SAVEPOINT ${sp}; RELEASE SAVEPOINT ${sp}`);
          else raw.exec('ROLLBACK');
        } catch (_) {}
        txDepth--;
        throw e;
      }
    };
  },
  close() { saveNow(); if (raw) raw.close(); },
};

async function initDb() {
  if (raw) return db;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    SQL = await initSqlJs({
      locateFile: (f) => path.join(path.dirname(require.resolve('sql.js')), f),
    });
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      raw = new SQL.Database(new Uint8Array(buf));
    } else {
      raw = new SQL.Database();
    }
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    raw.exec(schema);
    return db;
  })();
  return initPromise;
}

process.on('exit', () => { try { saveNow(); } catch(_){} });
process.on('SIGINT', () => { try { saveNow(); } catch(_){} process.exit(0); });

module.exports = db;
module.exports.initDb = initDb;
module.exports.DB_PATH = DB_PATH;
