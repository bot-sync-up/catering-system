// טאב ספקים
const SuppliersTab = {
  async render(root) {
    const list = await API.suppliers.list();
    root.innerHTML = `
      <div class="toolbar">
        <input type="text" id="sup-search" placeholder="חיפוש ספק (שם, ח.פ, איש קשר)..." class="grow">
        <button id="sup-add">+ ספק חדש</button>
      </div>
      <table>
        <thead><tr>
          <th>שם</th><th>ח.פ</th><th>איש קשר</th><th>טלפון</th>
          <th>תנאי תשלום</th><th>דירוג</th><th>פעיל</th><th></th>
        </tr></thead>
        <tbody id="sup-tbody"></tbody>
      </table>
    `;
    document.getElementById('sup-add').onclick = () => SuppliersTab.openForm();
    document.getElementById('sup-search').oninput = async (e) => {
      const data = await API.suppliers.list(e.target.value);
      SuppliersTab.fillTable(data);
    };
    SuppliersTab.fillTable(list);
  },

  async fillTable(list) {
    const tbody = document.getElementById('sup-tbody');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">אין ספקים</td></tr>'; return; }
    const ratings = await Promise.all(list.map(s => API.suppliers.rating(s.id).catch(() => null)));
    tbody.innerHTML = list.map((s, i) => {
      const r = ratings[i];
      const ratingTxt = r && r.count ? `${r.overall} ⭐ (${r.count})` : '—';
      return `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.tax_id||'—')}</td>
        <td>${escapeHtml(s.contact_name||'—')}</td>
        <td>${escapeHtml(s.phone||'—')}</td>
        <td>${escapeHtml(s.payment_terms||'—')}</td>
        <td>${ratingTxt}</td>
        <td>${s.active ? 'כן' : 'לא'}</td>
        <td class="actions">
          <button class="small secondary" data-act="view" data-id="${s.id}">צפייה</button>
          <button class="small" data-act="edit" data-id="${s.id}">עריכה</button>
          <button class="small secondary" data-act="portal" data-id="${s.id}">פורטל</button>
          <button class="small danger" data-act="del" data-id="${s.id}">מחיקה</button>
        </td>
      </tr>`;
    }).join('');
    tbody.onclick = SuppliersTab.onAction;
  },

  async onAction(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = +btn.dataset.id;
    if (btn.dataset.act === 'edit')   return SuppliersTab.openForm(id);
    if (btn.dataset.act === 'view')   return SuppliersTab.openView(id);
    if (btn.dataset.act === 'portal') {
      const s = await API.suppliers.get(id);
      const url = `${location.origin}/portal/${s.portal_token}`;
      await UI.modal(`
        <h2>קישור פורטל ספק</h2>
        <p>שלח לספק <strong>${escapeHtml(s.name)}</strong> את הקישור הבא:</p>
        <input type="text" value="${url}" readonly onclick="this.select()" style="direction:ltr">
        <div class="modal-actions">
          <button onclick="UI.closeModal()">סגור</button>
        </div>
      `);
      return;
    }
    if (btn.dataset.act === 'del') {
      if (!await UI.confirm('למחוק את הספק?')) return;
      try { await API.suppliers.remove(id); UI.ok('נמחק'); SuppliersTab.render(document.getElementById('tab-suppliers')); }
      catch (e) { UI.err(e); }
    }
  },

  async openView(id) {
    const s = await API.suppliers.get(id);
    const r = await API.suppliers.rating(id);
    const ratingHtml = r.count
      ? `<dt>זמן אספקה</dt><dd>${r.delivery} ⭐</dd>
         <dt>איכות</dt><dd>${r.quality} ⭐</dd>
         <dt>מחיר</dt><dd>${r.price} ⭐</dd>
         <dt>כללי</dt><dd><strong>${r.overall} ⭐</strong> (${r.count} דירוגים)</dd>`
      : `<dt>דירוג</dt><dd>אין דירוגים</dd>`;
    await UI.modal(`
      <h2>${escapeHtml(s.name)}</h2>
      <dl class="kv">
        <dt>ח.פ</dt><dd>${escapeHtml(s.tax_id||'—')}</dd>
        <dt>איש קשר</dt><dd>${escapeHtml(s.contact_name||'—')}</dd>
        <dt>טלפון</dt><dd>${escapeHtml(s.phone||'—')}</dd>
        <dt>אימייל</dt><dd>${escapeHtml(s.email||'—')}</dd>
        <dt>כתובת</dt><dd>${escapeHtml(s.address||'—')}</dd>
        <dt>בנק</dt><dd>${escapeHtml(s.bank_name||'—')} / ${escapeHtml(s.bank_branch||'—')} / ${escapeHtml(s.bank_account||'—')}</dd>
        <dt>תנאי תשלום</dt><dd>${escapeHtml(s.payment_terms||'—')}</dd>
        ${ratingHtml}
      </dl>
      <div class="modal-actions"><button onclick="UI.closeModal()">סגור</button></div>
    `);
  },

  async openForm(id) {
    const s = id ? await API.suppliers.get(id) : {};
    await UI.modal(`
      <h2>${id ? 'עריכת ספק' : 'ספק חדש'}</h2>
      <form id="sup-form">
        <div class="grid-2">
          <div class="field"><label>שם הספק *</label><input name="name" required value="${escapeHtml(s.name||'')}"></div>
          <div class="field"><label>ח.פ / ע.מ</label><input name="tax_id" value="${escapeHtml(s.tax_id||'')}"></div>
          <div class="field"><label>איש קשר</label><input name="contact_name" value="${escapeHtml(s.contact_name||'')}"></div>
          <div class="field"><label>טלפון</label><input name="phone" value="${escapeHtml(s.phone||'')}"></div>
          <div class="field"><label>אימייל</label><input name="email" type="email" value="${escapeHtml(s.email||'')}"></div>
          <div class="field"><label>כתובת</label><input name="address" value="${escapeHtml(s.address||'')}"></div>
          <div class="field"><label>בנק</label><input name="bank_name" value="${escapeHtml(s.bank_name||'')}"></div>
          <div class="field"><label>סניף</label><input name="bank_branch" value="${escapeHtml(s.bank_branch||'')}"></div>
          <div class="field"><label>חשבון</label><input name="bank_account" value="${escapeHtml(s.bank_account||'')}"></div>
          <div class="field"><label>תנאי תשלום</label>
            <select name="payment_terms">
              ${['מזומן','שוטף','שוטף+30','שוטף+45','שוטף+60','שוטף+90'].map(t =>
                `<option ${(s.payment_terms||'שוטף+30')===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label><input type="checkbox" name="active" ${s.active===0?'':'checked'}> פעיל</label>
        </div>
        <div class="modal-actions">
          <button type="submit">שמור</button>
          <button type="button" class="secondary" onclick="UI.closeModal()">ביטול</button>
        </div>
      </form>
    `);
    document.getElementById('sup-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const obj = Object.fromEntries(fd.entries());
      obj.active = fd.has('active');
      try {
        if (id) await API.suppliers.update(id, obj);
        else    await API.suppliers.create(obj);
        UI.ok('נשמר');
        UI.closeModal();
        SuppliersTab.render(document.getElementById('tab-suppliers'));
      } catch (e) { UI.err(e); }
    };
  },
};

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
