// טאב מוצרים + מחירי ספק
const ProductsTab = {
  async render(root) {
    const list = await API.products.list();
    root.innerHTML = `
      <div class="toolbar">
        <button id="prod-add">+ מוצר חדש</button>
      </div>
      <table>
        <thead><tr>
          <th>SKU</th><th>שם</th><th>יחידה</th><th>מלאי</th><th></th>
        </tr></thead>
        <tbody id="prod-tbody"></tbody>
      </table>
    `;
    document.getElementById('prod-add').onclick = () => ProductsTab.openForm();
    ProductsTab.fillTable(list);
  },
  fillTable(list) {
    const tbody = document.getElementById('prod-tbody');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">אין מוצרים</td></tr>'; return; }
    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${escapeHtml(p.sku)}</td>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.unit)}</td>
        <td>${p.stock}</td>
        <td class="actions">
          <button class="small secondary" data-act="prices" data-id="${p.id}">מחירי ספקים</button>
          <button class="small" data-act="edit" data-id="${p.id}">עריכה</button>
          <button class="small danger" data-act="del" data-id="${p.id}">מחיקה</button>
        </td>
      </tr>
    `).join('');
    tbody.onclick = ProductsTab.onAction;
  },
  async onAction(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = +btn.dataset.id;
    if (btn.dataset.act === 'edit')   return ProductsTab.openForm(id);
    if (btn.dataset.act === 'prices') return ProductsTab.openPrices(id);
    if (btn.dataset.act === 'del') {
      if (!await UI.confirm('למחוק את המוצר?')) return;
      try { await API.products.remove(id); UI.ok('נמחק'); ProductsTab.render(document.getElementById('tab-products')); }
      catch (e) { UI.err(e); }
    }
  },
  async openForm(id) {
    const p = id ? await API.products.get(id) : {};
    await UI.modal(`
      <h2>${id ? 'עריכת מוצר' : 'מוצר חדש'}</h2>
      <form id="prod-form">
        <div class="grid-2">
          <div class="field"><label>SKU *</label><input name="sku" required value="${escapeHtml(p.sku||'')}"></div>
          <div class="field"><label>שם *</label><input name="name" required value="${escapeHtml(p.name||'')}"></div>
          <div class="field"><label>יחידה</label><input name="unit" value="${escapeHtml(p.unit||'יח׳')}"></div>
          <div class="field"><label>מלאי</label><input name="stock" type="number" step="0.01" value="${p.stock||0}"></div>
        </div>
        <div class="modal-actions">
          <button type="submit">שמור</button>
          <button type="button" class="secondary" onclick="UI.closeModal()">ביטול</button>
        </div>
      </form>
    `);
    document.getElementById('prod-form').onsubmit = async (e) => {
      e.preventDefault();
      const obj = Object.fromEntries(new FormData(e.target).entries());
      obj.stock = +obj.stock;
      try {
        if (id) await API.products.update(id, obj);
        else    await API.products.create(obj);
        UI.ok('נשמר'); UI.closeModal();
        ProductsTab.render(document.getElementById('tab-products'));
      } catch (e) { UI.err(e); }
    };
  },
  async openPrices(productId) {
    const [product, prices, suppliers] = await Promise.all([
      API.products.get(productId),
      API.products.prices(productId),
      API.suppliers.list(),
    ]);
    const supOptions = suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    const rows = prices.map(p => `
      <tr>
        <td>${escapeHtml(p.supplier_name)}</td>
        <td>${UI.fmtMoney(p.price, p.currency)}</td>
        <td>${p.lead_time_days} יום</td>
        <td>${p.min_order_qty}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="empty">אין מחירי ספקים</td></tr>';
    await UI.modal(`
      <h2>מחירי ספקים — ${escapeHtml(product.name)}</h2>
      <table>
        <thead><tr><th>ספק</th><th>מחיר</th><th>זמן אספקה</th><th>מינ׳ הזמנה</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h3 style="margin-top:16px">הוספה / עדכון מחיר ספק</h3>
      <form id="sp-form">
        <div class="grid-3">
          <div class="field"><label>ספק</label><select name="supplier_id" required>${supOptions}</select></div>
          <div class="field"><label>מחיר</label><input name="price" type="number" step="0.01" required></div>
          <div class="field"><label>זמן אספקה (ימים)</label><input name="lead_time_days" type="number" value="7"></div>
          <div class="field"><label>מינ׳ הזמנה</label><input name="min_order_qty" type="number" step="0.01" value="1"></div>
          <div class="field"><label>מטבע</label>
            <select name="currency"><option>ILS</option><option>USD</option><option>EUR</option></select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit">שמור</button>
          <button type="button" class="secondary" onclick="UI.closeModal()">סגור</button>
        </div>
      </form>
    `);
    document.getElementById('sp-form').onsubmit = async (e) => {
      e.preventDefault();
      const obj = Object.fromEntries(new FormData(e.target).entries());
      obj.product_id = productId;
      obj.supplier_id = +obj.supplier_id;
      obj.price = +obj.price;
      obj.lead_time_days = +obj.lead_time_days;
      obj.min_order_qty = +obj.min_order_qty;
      try { await API.products.setPrice(obj); UI.ok('נשמר'); ProductsTab.openPrices(productId); }
      catch (e) { UI.err(e); }
    };
  },
};
