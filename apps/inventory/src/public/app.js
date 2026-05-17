/* ניהול מלאי — צד לקוח (Vanilla JS, RTL עברית) */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'שגיאה');
  return data;
}

function fmt(n, dec = 2) {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('he-IL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function dateOnly(s) { return s ? String(s).slice(0, 10) : ''; }
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function openModal(html) {
  const bg = $('#modal-bg');
  $('#modal').innerHTML = html;
  bg.hidden = false;
  bg.onclick = (e) => { if (e.target === bg) closeModal(); };
}
function closeModal() { $('#modal-bg').hidden = true; }
window.closeModal = closeModal;

function highlightNav() {
  const page = window.__PAGE__;
  $$('.topbar nav a').forEach((a) => {
    if (a.dataset.page === page) a.classList.add('active');
  });
}

// ---------- Pages ----------

const pages = {};

pages.dashboard = async (root) => {
  const d = await api('/dashboard');
  root.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="v">${d.products}</div><div class="l">סך מוצרים</div></div>
      <div class="kpi"><div class="v">${d.raws}</div><div class="l">חומרי גלם</div></div>
      <div class="kpi"><div class="v">${d.dishes}</div><div class="l">מנות</div></div>
      <div class="kpi warn"><div class="v">${d.lowStock}</div><div class="l">מתחת לסף</div></div>
      <div class="kpi warn"><div class="v">${d.expiring}</div><div class="l">תוקף בקרוב</div></div>
      <div class="kpi danger"><div class="v">${d.expired}</div><div class="l">פג תוקף</div></div>
      <div class="kpi danger"><div class="v">${d.openAlerts}</div><div class="l">התראות פתוחות</div></div>
      <div class="kpi"><div class="v">${fmt(d.valuation)}</div><div class="l">שווי מלאי (₪)</div></div>
    </div>
    <div class="card" style="margin-top:24px">
      <h2>פעולות מהירות</h2>
      <div class="row">
        <button onclick="quickReceive()">קבלת מלאי</button>
        <button onclick="quickProduce()">ייצור מנה</button>
        <button class="secondary" onclick="autoPO()">צור PO אוטומטי לחסר</button>
        <button class="secondary" onclick="rescanAlerts()">סריקת התראות</button>
        <a class="btn secondary" href="/api/valuation.pdf" target="_blank">הורד PDF שערוך</a>
      </div>
    </div>
  `;
};

window.rescanAlerts = async () => { await api('/alerts/rescan', { method: 'POST' }); alert('סריקה הושלמה'); pages.dashboard($('#content')); };
window.autoPO = async () => {
  const r = await api('/po/auto', { method: 'POST', body: {} });
  alert(`נוצרו ${r.length} הזמנות רכש`);
  location.href = '/po';
};

window.quickReceive = async () => {
  const products = await api('/products');
  const locations = await api('/locations');
  openModal(`
    <h2>קבלת מלאי</h2>
    <label>מוצר</label>
    <select id="m-product">${products.filter((p)=>p.kind==='raw').map((p)=>`<option value="${p.id}">${escapeHtml(p.name)} (${p.unit})</option>`).join('')}</select>
    <label>מיקום</label>
    <select id="m-location">${locations.map((l)=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}</select>
    <div class="row">
      <div><label>כמות</label><input type="number" id="m-qty" step="0.001" value="1"></div>
      <div><label>עלות יח׳</label><input type="number" id="m-cost" step="0.01" value="0"></div>
    </div>
    <label>תאריך תפוגה (אופציונלי)</label>
    <input type="date" id="m-exp">
    <div class="modal-actions">
      <button onclick="submitReceive()">שמור</button>
      <button class="secondary" onclick="closeModal()">ביטול</button>
    </div>
  `);
};
window.submitReceive = async () => {
  await api('/movements/in', {
    method: 'POST',
    body: {
      productId: +$('#m-product').value,
      locationId: +$('#m-location').value,
      qty: +$('#m-qty').value,
      unitCost: +$('#m-cost').value,
      expiresAt: $('#m-exp').value || null,
    },
  });
  closeModal(); pages.dashboard($('#content'));
};

window.quickProduce = async () => {
  const products = await api('/products');
  const locations = await api('/locations');
  const dishes = products.filter((p) => p.kind === 'dish');
  if (dishes.length === 0) { alert('אין מנות מוגדרות'); return; }
  openModal(`
    <h2>ייצור מנה</h2>
    <label>מנה</label>
    <select id="d-id">${dishes.map((p)=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select>
    <div class="row">
      <div><label>כמות</label><input type="number" id="d-qty" step="0.01" value="1"></div>
      <div><label>מיקום</label><select id="d-loc">${locations.map((l)=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}</select></div>
    </div>
    <div class="modal-actions">
      <button onclick="submitProduce()">ייצר</button>
      <button class="secondary" onclick="closeModal()">ביטול</button>
    </div>
  `);
};
window.submitProduce = async () => {
  try {
    const r = await api(`/dishes/${+$('#d-id').value}/produce`, {
      method: 'POST',
      body: { qty: +$('#d-qty').value, locationId: +$('#d-loc').value },
    });
    alert('יוצר. עלות כוללת: ' + fmt(r.totalCost));
    closeModal();
  } catch (e) { alert(e.message); }
};

pages.products = async (root) => {
  const products = await api('/products');
  const suppliers = await api('/suppliers');
  root.innerHTML = `
    <div class="toolbar">
      <input id="search" placeholder="חיפוש לפי שם / מק״ט">
      <button onclick="newProduct()">+ מוצר חדש</button>
      <a class="btn secondary right" href="/api/barcodes.pdf" target="_blank">הורד ברקודים PDF</a>
    </div>
    <table id="ptable">
      <thead><tr>
        <th>מק״ט</th><th>שם</th><th>סוג</th><th>יחידה</th><th>מלאי כולל</th>
        <th>סף מינ׳</th><th>ברקוד</th><th></th>
      </tr></thead>
      <tbody>${products.map(renderProductRow).join('')}</tbody>
    </table>
  `;
  $('#search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    $$('#ptable tbody tr').forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  window.__suppliers = suppliers;
};
function renderProductRow(p) {
  const kindLabel = p.kind === 'raw' ? 'חומר גלם' : 'מנה';
  const low = p.min_qty > 0 && p.total_qty < p.min_qty;
  return `<tr>
    <td>${escapeHtml(p.sku)}</td>
    <td>${escapeHtml(p.name)}</td>
    <td><span class="badge kind-${p.kind}">${kindLabel}</span></td>
    <td>${escapeHtml(p.unit)}</td>
    <td>${fmt(p.total_qty, 2)} ${low ? '<span class="badge danger">חסר</span>' : ''}</td>
    <td>${fmt(p.min_qty, 2)}</td>
    <td><code style="direction:ltr">${escapeHtml(p.barcode || '')}</code></td>
    <td><button class="small secondary" onclick="editProduct(${p.id})">ערוך</button></td>
  </tr>`;
}
window.newProduct = () => productForm({});
window.editProduct = async (id) => {
  const p = await api('/products/' + id);
  productForm(p);
};
function productForm(p) {
  const sup = window.__suppliers || [];
  openModal(`
    <h2>${p.id ? 'עריכת מוצר' : 'מוצר חדש'}</h2>
    <div class="row">
      <div><label>מק״ט</label><input id="p-sku" value="${escapeHtml(p.sku || '')}" ${p.id ? 'disabled' : ''}></div>
      <div><label>שם</label><input id="p-name" value="${escapeHtml(p.name || '')}"></div>
    </div>
    <div class="row">
      <div><label>סוג</label>
        <select id="p-kind" ${p.id ? 'disabled' : ''}>
          <option value="raw" ${p.kind === 'raw' ? 'selected' : ''}>חומר גלם</option>
          <option value="dish" ${p.kind === 'dish' ? 'selected' : ''}>מנה</option>
        </select>
      </div>
      <div><label>יחידה</label><input id="p-unit" value="${escapeHtml(p.unit || 'יח׳')}"></div>
      <div><label>קטגוריה</label><input id="p-cat" value="${escapeHtml(p.category || '')}"></div>
    </div>
    <div class="row">
      <div><label>עלות יח׳</label><input id="p-cost" type="number" step="0.01" value="${p.default_cost || 0}"></div>
      <div><label>סף מינ׳</label><input id="p-min" type="number" step="0.01" value="${p.min_qty || 0}"></div>
      <div><label>כמות הזמנה (reorder)</label><input id="p-reorder" type="number" step="0.01" value="${p.reorder_qty || 0}"></div>
    </div>
    <div class="row">
      <div><label>ימי מדף</label><input id="p-shelf" type="number" value="${p.shelf_life_days || ''}"></div>
      <div><label>ספק ברירת מחדל</label>
        <select id="p-sup"><option value="">(אין)</option>${sup.map((s)=>`<option value="${s.id}" ${p.default_supplier_id===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-actions">
      <button onclick="saveProduct(${p.id || 0})">שמור</button>
      <button class="secondary" onclick="closeModal()">ביטול</button>
    </div>
  `);
}
window.saveProduct = async (id) => {
  const body = {
    sku: $('#p-sku').value,
    name: $('#p-name').value,
    kind: $('#p-kind').value,
    unit: $('#p-unit').value,
    category: $('#p-cat').value || null,
    default_cost: +$('#p-cost').value,
    min_qty: +$('#p-min').value,
    reorder_qty: +$('#p-reorder').value,
    shelf_life_days: $('#p-shelf').value ? +$('#p-shelf').value : null,
    default_supplier_id: $('#p-sup').value ? +$('#p-sup').value : null,
  };
  if (id) await api('/products/' + id, { method: 'PUT', body });
  else await api('/products', { method: 'POST', body });
  closeModal();
  pages.products($('#content'));
};

pages.stock = async (root) => {
  const stock = await api('/stock');
  const grouped = {};
  for (const s of stock) {
    if (!grouped[s.product_id]) grouped[s.product_id] = { name: s.name, sku: s.sku, unit: s.unit, kind: s.kind, min: s.min_qty, locs: [] };
    grouped[s.product_id].locs.push({ name: s.location_name, qty: s.qty });
  }
  const rows = Object.entries(grouped).map(([id, g]) => {
    const total = g.locs.reduce((a, b) => a + b.qty, 0);
    const low = g.min > 0 && total < g.min;
    return `<tr>
      <td>${escapeHtml(g.sku)}</td>
      <td>${escapeHtml(g.name)} <span class="badge kind-${g.kind}">${g.kind === 'raw' ? 'חו״ג' : 'מנה'}</span></td>
      <td>${g.locs.map(l=>`${escapeHtml(l.name)}: <b>${fmt(l.qty)}</b>`).join(' • ')}</td>
      <td>${fmt(total)} ${g.unit}</td>
      <td>${low ? '<span class="badge danger">מתחת לסף</span>' : '<span class="badge ok">תקין</span>'}</td>
      <td>
        <button class="small" onclick="moveStock(${id},'OUT')">הוצאה</button>
        <button class="small secondary" onclick="moveStock(${id},'WASTE')">פחת</button>
        <button class="small secondary" onclick="moveStock(${id},'TRANSFER')">העברה</button>
      </td>
    </tr>`;
  }).join('');
  root.innerHTML = `<table><thead><tr>
    <th>מק״ט</th><th>שם</th><th>פירוט מיקומים</th><th>סה״כ</th><th>סטטוס</th><th>פעולות</th>
  </tr></thead><tbody>${rows || '<tr><td colspan=6 class=muted>אין מלאי</td></tr>'}</tbody></table>`;
};

window.moveStock = async (productId, type) => {
  const locations = await api('/locations');
  const reasons = type === 'WASTE' ? await api('/waste-reasons') : [];
  let html = `<h2>${type === 'OUT' ? 'הוצאה' : type === 'WASTE' ? 'פחת' : 'העברה'}</h2>`;
  if (type === 'TRANSFER') {
    html += `
      <label>מיקום מקור</label>
      <select id="t-from">${locations.map((l)=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}</select>
      <label>מיקום יעד</label>
      <select id="t-to">${locations.map((l)=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}</select>`;
  } else {
    html += `<label>מיקום</label>
      <select id="m-loc">${locations.map((l)=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}</select>`;
  }
  html += `<label>כמות</label><input id="m-qty" type="number" step="0.001" value="1">`;
  if (type === 'WASTE') {
    html += `<label>סיבה</label>
      <select id="m-reason">${reasons.map((r)=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}</select>`;
  }
  html += `<label>הערות</label><input id="m-notes">
    <div class="modal-actions">
      <button onclick="submitMove(${productId},'${type}')">שמור</button>
      <button class="secondary" onclick="closeModal()">ביטול</button>
    </div>`;
  openModal(html);
};
window.submitMove = async (productId, type) => {
  try {
    if (type === 'TRANSFER') {
      await api('/transfers', { method: 'POST', body: {
        productId, fromLocationId: +$('#t-from').value, toLocationId: +$('#t-to').value,
        qty: +$('#m-qty').value, notes: $('#m-notes').value,
      }});
    } else if (type === 'WASTE') {
      await api('/movements/waste', { method: 'POST', body: {
        productId, locationId: +$('#m-loc').value, qty: +$('#m-qty').value,
        reasonId: +$('#m-reason').value, notes: $('#m-notes').value,
      }});
    } else {
      await api('/movements/out', { method: 'POST', body: {
        productId, locationId: +$('#m-loc').value, qty: +$('#m-qty').value, notes: $('#m-notes').value,
      }});
    }
    closeModal(); pages.stock($('#content'));
  } catch (e) { alert(e.message); }
};

pages.movements = async (root) => {
  const movs = await api('/movements?limit=300');
  root.innerHTML = `<table><thead><tr>
    <th>זמן</th><th>סוג</th><th>מוצר</th><th>מיקום</th><th>כמות</th><th>עלות יח׳</th><th>סיבה</th><th>הערות</th>
  </tr></thead><tbody>${movs.map((m)=>{
    const sign = ['OUT','WASTE','CONSUME'].includes(m.type) ? '-' : '+';
    return `<tr>
      <td class="muted">${escapeHtml(m.ts)}</td>
      <td><span class="badge ${m.type==='WASTE'?'danger':m.type==='IN'?'ok':'info'}">${m.type}</span></td>
      <td>${escapeHtml(m.product_name)} (${escapeHtml(m.sku)})</td>
      <td>${escapeHtml(m.location_name)}</td>
      <td>${sign}${fmt(m.qty,3)}</td>
      <td>${fmt(m.unit_cost)}</td>
      <td>${escapeHtml(m.reason_name || '')}</td>
      <td class="muted">${escapeHtml(m.notes || '')}</td>
    </tr>`;}).join('')}</tbody></table>`;
};

pages.alerts = async (root) => {
  const alerts = await api('/alerts');
  root.innerHTML = `
    <div class="toolbar">
      <button class="secondary" onclick="rescanAlerts()">סריקה מחדש</button>
    </div>
    <table><thead><tr>
      <th>זמן</th><th>חומרה</th><th>סוג</th><th>מוצר</th><th>הודעה</th><th></th>
    </tr></thead><tbody>${alerts.map((a)=>`
      <tr>
        <td class="muted">${escapeHtml(a.ts)}</td>
        <td><span class="badge ${a.level==='critical'?'danger':a.level==='warn'?'warn':'info'}">${a.level}</span></td>
        <td>${a.type}</td>
        <td>${escapeHtml(a.product_name || '')}</td>
        <td>${escapeHtml(a.message)}</td>
        <td><button class="small secondary" onclick="ackAlert(${a.id})">סמן כטופל</button></td>
      </tr>`).join('') || '<tr><td colspan=6 class=muted>אין התראות פתוחות</td></tr>'}
    </tbody></table>
  `;
};
window.ackAlert = async (id) => { await api('/alerts/' + id + '/ack', { method: 'POST' }); pages.alerts($('#content')); };

pages.po = async (root) => {
  const pos = await api('/po');
  root.innerHTML = `
    <div class="toolbar">
      <button onclick="autoPO()">צור PO אוטומטי לחסר</button>
    </div>
    <table><thead><tr>
      <th>מס׳</th><th>ספק</th><th>סטטוס</th><th>שורות</th><th>סה״כ</th><th>נוצר</th><th>צפוי</th><th></th>
    </tr></thead><tbody>${pos.map((p)=>`
      <tr>
        <td><b>${escapeHtml(p.po_number)}</b></td>
        <td>${escapeHtml(p.supplier_name || '—')}</td>
        <td><span class="badge ${p.status==='draft'?'info':p.status==='received'?'ok':'warn'}">${p.status}</span></td>
        <td>${p.lines_count}</td>
        <td>${fmt(p.total)}</td>
        <td class="muted">${escapeHtml(dateOnly(p.created_at))}</td>
        <td class="muted">${escapeHtml(dateOnly(p.expected_at))}</td>
        <td><button class="small" onclick="openPO(${p.id})">פתח</button></td>
      </tr>`).join('') || '<tr><td colspan=8 class=muted>אין הזמנות</td></tr>'}
    </tbody></table>
  `;
};
window.openPO = async (id) => {
  const po = await api('/po/' + id);
  const locations = await api('/locations');
  openModal(`
    <h2>הזמנת רכש ${escapeHtml(po.po_number)}</h2>
    <p>ספק: ${escapeHtml(po.supplier_name || '—')} • סטטוס: ${po.status} • סה"כ: ${fmt(po.total)}</p>
    <table><thead><tr>
      <th>מק״ט</th><th>שם</th><th>כמות</th><th>עלות</th><th>התקבל</th>
    </tr></thead><tbody>${po.lines.map((l)=>`
      <tr><td>${escapeHtml(l.sku)}</td><td>${escapeHtml(l.product_name)}</td>
        <td>${fmt(l.qty,2)} ${escapeHtml(l.unit)}</td>
        <td>${fmt(l.unit_cost)}</td><td>${fmt(l.qty_received,2)}</td></tr>`).join('')}
    </tbody></table>
    ${po.status === 'received' ? '' : `
      <label>קבלה למיקום</label>
      <select id="po-loc">${locations.map((l)=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}</select>
      <div class="modal-actions">
        <button class="ok" onclick="receivePO(${po.id})">קבל את כל ההזמנה</button>
        <button class="secondary" onclick="closeModal()">סגור</button>
      </div>`}
  `);
};
window.receivePO = async (id) => {
  await api(`/po/${id}/receive`, { method: 'POST', body: { defaultLocationId: +$('#po-loc').value } });
  closeModal(); pages.po($('#content'));
};

pages.cyclecount = async (root) => {
  const counts = await api('/cyclecount');
  root.innerHTML = `
    <div class="toolbar">
      <button onclick="newCount()">+ ספירה חדשה</button>
    </div>
    <table><thead><tr>
      <th>קוד</th><th>מיקום</th><th>סטטוס</th><th>פריטים</th><th>נספרו</th><th>נוצר</th><th></th>
    </tr></thead><tbody>${counts.map((c)=>`
      <tr><td><b>${escapeHtml(c.code)}</b></td>
        <td>${escapeHtml(c.location_name)}</td>
        <td><span class="badge ${c.status==='open'?'warn':'ok'}">${c.status}</span></td>
        <td>${c.lines_count}</td><td>${c.counted_count}</td>
        <td class="muted">${escapeHtml(dateOnly(c.created_at))}</td>
        <td><button class="small" onclick="openCount(${c.id})">פתח</button></td>
      </tr>`).join('') || '<tr><td colspan=7 class=muted>אין ספירות</td></tr>'}
    </tbody></table>
  `;
};
window.newCount = async () => {
  const locations = await api('/locations');
  openModal(`
    <h2>ספירת מלאי חדשה</h2>
    <label>מיקום</label>
    <select id="cc-loc">${locations.map((l)=>`<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}</select>
    <label>הערות</label><input id="cc-notes">
    <div class="modal-actions">
      <button onclick="submitNewCount()">צור</button>
      <button class="secondary" onclick="closeModal()">ביטול</button>
    </div>
  `);
};
window.submitNewCount = async () => {
  const r = await api('/cyclecount', { method: 'POST', body: { locationId: +$('#cc-loc').value, notes: $('#cc-notes').value } });
  closeModal(); openCount(r.id);
};
window.openCount = async (id) => {
  const cc = await api('/cyclecount/' + id);
  openModal(`
    <h2>ספירה ${escapeHtml(cc.code)} — ${escapeHtml(cc.location_name)}</h2>
    <p>סטטוס: ${cc.status}</p>
    <table id="cc-table"><thead><tr>
      <th>מק״ט</th><th>שם</th><th>מערכת</th><th>נספר</th><th>הפרש</th>
    </tr></thead><tbody>${cc.lines.map((l)=>`
      <tr data-id="${l.product_id}">
        <td>${escapeHtml(l.sku)}</td><td>${escapeHtml(l.product_name)}</td>
        <td>${fmt(l.qty_system,3)}</td>
        <td><input type="number" step="0.001" value="${l.qty_counted ?? ''}" style="width:80px" ${cc.status!=='open'?'disabled':''}
          onchange="recordCC(${cc.id}, ${l.product_id}, this.value, this)"></td>
        <td class="variance">${l.variance != null ? fmt(l.variance,3) : ''}</td>
      </tr>`).join('')}
    </tbody></table>
    <div class="modal-actions">
      ${cc.status === 'open' ? `<button class="ok" onclick="finalizeCC(${cc.id})">סגור ספירה (יצור התאמות)</button>` : ''}
      <button class="secondary" onclick="closeModal()">סגור</button>
    </div>
  `);
};
window.recordCC = async (countId, productId, val, input) => {
  if (val === '') return;
  const r = await api(`/cyclecount/${countId}/line`, { method: 'POST', body: { productId, qtyCounted: +val } });
  input.closest('tr').querySelector('.variance').textContent = fmt(r.variance, 3);
};
window.finalizeCC = async (id) => {
  if (!confirm('לסגור ספירה? תיצורנה תנועות התאמה במלאי.')) return;
  const r = await api(`/cyclecount/${id}/finalize`, { method: 'POST', body: {} });
  alert(`נוצרו ${r.adjustments} התאמות`);
  closeModal(); pages.cyclecount($('#content'));
};

pages.valuation = async (root) => {
  const items = await api('/valuation');
  const total = items.reduce((a, b) => a + (b.value || 0), 0);
  root.innerHTML = `
    <div class="toolbar">
      <label>תאריך:</label>
      <input type="date" id="v-date">
      <button class="secondary" onclick="loadValuation()">טען</button>
      <a class="btn right" id="v-pdf" href="/api/valuation.pdf" target="_blank">הורד PDF</a>
    </div>
    <table><thead><tr>
      <th>מק״ט</th><th>שם</th><th>סוג</th><th>מיקום</th><th>כמות</th><th>שווי</th>
    </tr></thead><tbody id="v-body">${items.map((r)=>`
      <tr><td>${escapeHtml(r.sku)}</td><td>${escapeHtml(r.name)}</td>
        <td><span class="badge kind-${r.kind}">${r.kind==='raw'?'חו״ג':'מנה'}</span></td>
        <td>${escapeHtml(r.location_name)}</td>
        <td>${fmt(r.qty,3)} ${escapeHtml(r.unit)}</td>
        <td><b>${fmt(r.value)}</b></td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan=5 style="text-align:left"><b>סה״כ:</b></td><td><b>${fmt(total)}</b> ₪</td></tr></tfoot>
    </table>
  `;
  $('#v-date').addEventListener('change', () => {
    const d = $('#v-date').value;
    $('#v-pdf').href = '/api/valuation.pdf' + (d ? '?date=' + d : '');
  });
};
window.loadValuation = async () => {
  const d = $('#v-date').value;
  const items = await api('/valuation' + (d ? '?date=' + d : ''));
  const total = items.reduce((a, b) => a + (b.value || 0), 0);
  $('#v-body').innerHTML = items.map((r)=>`
    <tr><td>${escapeHtml(r.sku)}</td><td>${escapeHtml(r.name)}</td>
      <td><span class="badge kind-${r.kind}">${r.kind==='raw'?'חו״ג':'מנה'}</span></td>
      <td>${escapeHtml(r.location_name)}</td>
      <td>${fmt(r.qty,3)} ${escapeHtml(r.unit)}</td>
      <td><b>${fmt(r.value)}</b></td>
    </tr>`).join('');
};

pages.dishes = async (root) => {
  const products = await api('/products');
  const dishes = products.filter((p) => p.kind === 'dish');
  const raws = products.filter((p) => p.kind === 'raw');
  if (dishes.length === 0) {
    root.innerHTML = '<div class="card">אין מנות. הוסף מוצר מסוג "מנה" במסך מוצרים.</div>';
    return;
  }
  root.innerHTML = dishes.map((d) => `
    <div class="card">
      <h2>${escapeHtml(d.name)} <span class="muted">(${escapeHtml(d.sku)})</span></h2>
      <div id="bom-${d.id}">טוען…</div>
      <h3>הוסף רכיב</h3>
      <div class="row">
        <select id="raw-${d.id}">${raws.map((r)=>`<option value="${r.id}">${escapeHtml(r.name)} (${escapeHtml(r.unit)})</option>`).join('')}</select>
        <input id="rawqty-${d.id}" type="number" step="0.001" placeholder="כמות לכל מנה">
        <button onclick="addBom(${d.id})">הוסף</button>
      </div>
    </div>
  `).join('');
  for (const d of dishes) loadBom(d.id);
};
async function loadBom(dishId) {
  const d = await api('/products/' + dishId);
  const target = $('#bom-' + dishId);
  if (!d.bom || d.bom.length === 0) { target.innerHTML = '<p class=muted>אין רכיבים</p>'; return; }
  target.innerHTML = `<table><thead><tr><th>רכיב</th><th>כמות</th><th></th></tr></thead><tbody>
    ${d.bom.map((b)=>`<tr><td>${escapeHtml(b.raw_name)}</td><td>${fmt(b.qty,3)} ${escapeHtml(b.raw_unit)}</td>
      <td><button class="small danger" onclick="removeBom(${dishId},${b.raw_id})">הסר</button></td></tr>`).join('')}
  </tbody></table>`;
}
window.addBom = async (dishId) => {
  const raw_id = +$('#raw-' + dishId).value;
  const qty = +$('#rawqty-' + dishId).value;
  if (!qty) return alert('הזן כמות');
  await api(`/dishes/${dishId}/bom`, { method: 'POST', body: { raw_id, qty } });
  loadBom(dishId);
};
window.removeBom = async (dishId, rawId) => {
  await api(`/dishes/${dishId}/bom/${rawId}`, { method: 'DELETE' });
  loadBom(dishId);
};

// ---------- Bootstrap ----------
document.addEventListener('DOMContentLoaded', () => {
  highlightNav();
  const fn = pages[window.__PAGE__];
  if (fn) {
    fn($('#content')).catch((e) => {
      $('#content').innerHTML = `<div class="card" style="color:#dc2626">שגיאה: ${escapeHtml(e.message)}</div>`;
    });
  }
});
