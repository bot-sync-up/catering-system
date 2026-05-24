// טאב הזמנות רכש — workflow draft → approved → sent → partial → received
const OrdersTab = {
  async render(root) {
    root.innerHTML = `
      <div class="toolbar">
        <select id="po-status">
          <option value="">כל הסטטוסים</option>
          <option value="draft">טיוטה</option>
          <option value="approved">אושר</option>
          <option value="sent">נשלח</option>
          <option value="partial">נקלט חלקית</option>
          <option value="received">נקלט</option>
          <option value="cancelled">בוטל</option>
        </select>
        <button id="po-add">+ הזמנה חדשה</button>
      </div>
      <table>
        <thead><tr>
          <th>מס׳ PO</th><th>ספק</th><th>סטטוס</th><th>שורות</th>
          <th>סה״כ</th><th>נוצר</th><th></th>
        </tr></thead>
        <tbody id="po-tbody"></tbody>
      </table>
    `;
    document.getElementById('po-add').onclick = () => OrdersTab.openCreateForm();
    document.getElementById('po-status').onchange = (e) => OrdersTab.refresh({ status: e.target.value });
    OrdersTab.refresh();
  },
  async refresh(filters = {}) {
    const data = await API.pos.list(filters);
    const tbody = document.getElementById('po-tbody');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">אין הזמנות</td></tr>'; return; }
    tbody.innerHTML = data.map(po => `
      <tr>
        <td><strong>${po.po_number}</strong></td>
        <td>${escapeHtml(po.supplier_name)}</td>
        <td>${UI.statusBadge(po.status)}</td>
        <td>${po.items_count}</td>
        <td>${UI.fmtMoney(po.total)}</td>
        <td>${UI.fmtDate(po.created_at)}</td>
        <td class="actions">
          <button class="small secondary" data-act="view" data-id="${po.id}">פתח</button>
        </td>
      </tr>
    `).join('');
    tbody.onclick = (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      OrdersTab.openView(+btn.dataset.id);
    };
  },

  async openCreateForm() {
    const [suppliers, products] = await Promise.all([API.suppliers.list(), API.products.list()]);
    if (!suppliers.length || !products.length) {
      return UI.toast('יש להגדיר ספקים ומוצרים תחילה', 'error');
    }
    await UI.modal(`
      <h2>הזמנת רכש חדשה</h2>
      <form id="po-form">
        <div class="grid-2">
          <div class="field"><label>ספק</label>
            <select name="supplier_id" required>
              ${suppliers.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>תאריך אספקה צפוי</label><input name="expected_delivery" type="date"></div>
        </div>
        <div class="field"><label>הערות</label><textarea name="notes" rows="2"></textarea></div>
        <h3>שורות הזמנה</h3>
        <table class="po-items-editor">
          <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר ליחידה</th><th>סה״כ</th><th></th></tr></thead>
          <tbody id="po-items-body"></tbody>
        </table>
        <button type="button" class="secondary small" id="po-add-row" style="margin-top:8px">+ הוסף שורה</button>
        <p style="margin-top:8px"><strong>סה״כ הזמנה: <span id="po-total">0</span></strong></p>
        <div class="modal-actions">
          <button type="submit">שמור (טיוטה)</button>
          <button type="button" class="secondary" onclick="UI.closeModal()">ביטול</button>
        </div>
      </form>
    `);

    const productOpts = products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.sku)})</option>`).join('');
    const tbody = document.getElementById('po-items-body');

    function recalc() {
      let total = 0;
      [...tbody.querySelectorAll('tr')].forEach(tr => {
        const qty = +tr.querySelector('[name=qty]').value || 0;
        const price = +tr.querySelector('[name=unit_price]').value || 0;
        const sub = qty * price;
        tr.querySelector('.subtotal').textContent = UI.fmtMoney(sub);
        total += sub;
      });
      document.getElementById('po-total').textContent = UI.fmtMoney(total);
    }

    async function addRow(presetSupplierId) {
      const tr = UI.el(`
        <tr>
          <td><select name="product_id" required>${productOpts}</select></td>
          <td><input name="qty" type="number" step="0.01" min="0.01" value="1" required></td>
          <td><input name="unit_price" type="number" step="0.01" min="0" value="0" required></td>
          <td class="subtotal">—</td>
          <td><button type="button" class="remove-row small">×</button></td>
        </tr>
      `);
      tbody.appendChild(tr);
      tr.querySelector('.remove-row').onclick = () => { tr.remove(); recalc(); };
      tr.addEventListener('input', recalc);
      // אוטו-מילוי מחיר אם יש מחיר ספק קיים
      tr.querySelector('[name=product_id]').onchange = async (e) => {
        const supplierId = +document.querySelector('[name=supplier_id]').value;
        const productId = +e.target.value;
        try {
          const prices = await API.products.prices(productId);
          const match = prices.find(p => p.supplier_id === supplierId);
          if (match) {
            tr.querySelector('[name=unit_price]').value = match.price;
            recalc();
          }
        } catch {}
      };
      recalc();
    }
    document.getElementById('po-add-row').onclick = () => addRow();
    addRow();

    document.getElementById('po-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const items = [...tbody.querySelectorAll('tr')].map(tr => ({
        product_id: +tr.querySelector('[name=product_id]').value,
        qty:        +tr.querySelector('[name=qty]').value,
        unit_price: +tr.querySelector('[name=unit_price]').value,
      }));
      try {
        await API.pos.create({
          supplier_id: +fd.get('supplier_id'),
          notes: fd.get('notes'),
          expected_delivery: fd.get('expected_delivery') || null,
          items,
        });
        UI.ok('נוצר'); UI.closeModal();
        OrdersTab.refresh();
      } catch (e) { UI.err(e); }
    };
  },

  async openView(id) {
    const po = await API.pos.get(id);
    const itemsRows = po.items.map(it => `
      <tr>
        <td>${escapeHtml(it.product_name)}</td>
        <td>${escapeHtml(it.sku)}</td>
        <td>${it.qty} ${escapeHtml(it.unit)}</td>
        <td>${it.qty_received}</td>
        <td>${UI.fmtMoney(it.unit_price)}</td>
        <td>${UI.fmtMoney(it.qty * it.unit_price)}</td>
      </tr>
    `).join('');
    const grnRows = po.grns.length
      ? po.grns.map(g => `<li>${g.grn_number} — ${UI.fmtDate(g.received_at)} ${g.notes ? '— '+escapeHtml(g.notes) : ''}</li>`).join('')
      : '<li class="muted">אין קליטות</li>';

    const actions = [];
    if (po.status === 'draft')    actions.push(`<button class="success" data-act="approve">אישור</button>`);
    if (po.status === 'approved') actions.push(`<button class="warning" data-act="send">שליחה לספק</button>`);
    if (['sent','partial','approved'].includes(po.status)) actions.push(`<button data-act="grn">קליטת סחורה</button>`);
    if (!['received','cancelled'].includes(po.status)) actions.push(`<button class="danger" data-act="cancel">ביטול</button>`);
    actions.push(`<button class="secondary" data-act="rate">דירוג ספק</button>`);
    actions.push(`<button class="secondary" onclick="UI.closeModal()">סגור</button>`);

    await UI.modal(`
      <h2>${po.po_number} ${UI.statusBadge(po.status)}</h2>
      <dl class="kv">
        <dt>ספק</dt><dd>${escapeHtml(po.supplier_name)}</dd>
        <dt>נוצר</dt><dd>${UI.fmtDate(po.created_at)}</dd>
        <dt>אושר</dt><dd>${UI.fmtDate(po.approved_at)}</dd>
        <dt>נשלח</dt><dd>${UI.fmtDate(po.sent_at)}</dd>
        <dt>אספקה צפויה</dt><dd>${po.expected_delivery || '—'}</dd>
        <dt>סה״כ</dt><dd><strong>${UI.fmtMoney(po.total)}</strong></dd>
        <dt>הערות</dt><dd>${escapeHtml(po.notes||'—')}</dd>
      </dl>
      <h3>שורות</h3>
      <table>
        <thead><tr><th>מוצר</th><th>SKU</th><th>כמות</th><th>נקלט</th><th>מחיר</th><th>סה״כ</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <h3>קליטות (GRN)</h3>
      <ul>${grnRows}</ul>
      <div class="modal-actions">${actions.join('')}</div>
    `);

    document.querySelector('.modal-actions').onclick = async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      try {
        if (btn.dataset.act === 'approve') { await API.pos.approve(id); UI.ok('אושר'); UI.closeModal(); OrdersTab.refresh(); OrdersTab.openView(id); }
        if (btn.dataset.act === 'send')    { await API.pos.send(id);    UI.ok('נשלח'); UI.closeModal(); OrdersTab.refresh(); OrdersTab.openView(id); }
        if (btn.dataset.act === 'cancel')  {
          if (!await UI.confirm('לבטל את ההזמנה?')) return;
          await API.pos.cancel(id); UI.ok('בוטל'); UI.closeModal(); OrdersTab.refresh();
        }
        if (btn.dataset.act === 'grn')  { UI.closeModal(); OrdersTab.openGrnForm(id); }
        if (btn.dataset.act === 'rate') { UI.closeModal(); RatingsTab.openForm({ supplier_id: po.supplier_id, po_id: id }); }
      } catch (e) { UI.err(e); }
    };
  },

  async openGrnForm(poId) {
    const po = await API.pos.get(poId);
    const rows = po.items.filter(it => it.qty - it.qty_received > 1e-9).map(it => `
      <tr data-poi="${it.id}">
        <td>${escapeHtml(it.product_name)}</td>
        <td>${it.qty}</td>
        <td>${it.qty_received}</td>
        <td>${(it.qty - it.qty_received).toFixed(2)}</td>
        <td><input type="number" name="rcv" step="0.01" min="0" max="${it.qty - it.qty_received}" value="${(it.qty - it.qty_received).toFixed(2)}"></td>
      </tr>
    `).join('');
    if (!rows) return UI.toast('כל הפריטים נקלטו', 'error');
    await UI.modal(`
      <h2>קליטת סחורה — ${po.po_number}</h2>
      <table>
        <thead><tr><th>מוצר</th><th>הוזמן</th><th>נקלט עד עתה</th><th>נותר</th><th>קולט עכשיו</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="field" style="margin-top:8px"><label>הערות</label><textarea id="grn-notes" rows="2"></textarea></div>
      <div class="modal-actions">
        <button id="grn-submit">בצע קליטה</button>
        <button class="secondary" onclick="UI.closeModal()">ביטול</button>
      </div>
    `);
    document.getElementById('grn-submit').onclick = async () => {
      const items = [...document.querySelectorAll('tr[data-poi]')]
        .map(tr => ({
          po_item_id: +tr.dataset.poi,
          qty_received: +tr.querySelector('[name=rcv]').value,
        }))
        .filter(x => x.qty_received > 0);
      if (!items.length) return UI.toast('בחר לפחות פריט', 'error');
      try {
        await API.pos.grn(poId, { items, notes: document.getElementById('grn-notes').value });
        UI.ok('נקלט'); UI.closeModal(); OrdersTab.refresh(); OrdersTab.openView(poId);
      } catch (e) { UI.err(e); }
    };
  },
};
