// טאב דירוגים
const RatingsTab = {
  async render(root) {
    const suppliers = await API.suppliers.list();
    const ratings = await Promise.all(suppliers.map(async s => ({ s, r: await API.suppliers.rating(s.id) })));
    root.innerHTML = `
      <div class="toolbar">
        <button id="rate-add">+ דירוג חדש</button>
      </div>
      <table>
        <thead><tr>
          <th>ספק</th><th>זמן</th><th>איכות</th><th>מחיר</th><th>כללי</th><th>מס׳ דירוגים</th>
        </tr></thead>
        <tbody>
          ${ratings.map(({s,r}) => `
            <tr>
              <td><strong>${escapeHtml(s.name)}</strong></td>
              <td>${r.delivery ?? '—'}</td>
              <td>${r.quality ?? '—'}</td>
              <td>${r.price ?? '—'}</td>
              <td>${r.overall ? '<strong>'+r.overall+' ⭐</strong>' : '—'}</td>
              <td>${r.count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    document.getElementById('rate-add').onclick = () => RatingsTab.openForm();
  },
  async openForm(preset = {}) {
    const suppliers = await API.suppliers.list();
    const supOptions = suppliers.map(s =>
      `<option value="${s.id}" ${preset.supplier_id===s.id?'selected':''}>${escapeHtml(s.name)}</option>`
    ).join('');
    await UI.modal(`
      <h2>דירוג ספק</h2>
      <form id="rate-form">
        <div class="field"><label>ספק</label><select name="supplier_id" required>${supOptions}</select></div>
        ${preset.po_id ? `<input type="hidden" name="po_id" value="${preset.po_id}">` : ''}
        <div class="grid-3">
          <div class="field"><label>זמן אספקה (1-5)</label><input name="delivery_score" type="number" min="1" max="5" value="4" required></div>
          <div class="field"><label>איכות (1-5)</label><input name="quality_score" type="number" min="1" max="5" value="4" required></div>
          <div class="field"><label>מחיר (1-5)</label><input name="price_score" type="number" min="1" max="5" value="4" required></div>
        </div>
        <div class="field"><label>הערה</label><textarea name="comment" rows="2"></textarea></div>
        <div class="modal-actions">
          <button type="submit">שמור</button>
          <button type="button" class="secondary" onclick="UI.closeModal()">ביטול</button>
        </div>
      </form>
    `);
    document.getElementById('rate-form').onsubmit = async (e) => {
      e.preventDefault();
      const obj = Object.fromEntries(new FormData(e.target).entries());
      ['supplier_id','po_id','delivery_score','quality_score','price_score'].forEach(k => {
        if (obj[k] != null && obj[k] !== '') obj[k] = +obj[k];
      });
      try {
        await API.ratings.create(obj);
        UI.ok('דירוג נוסף'); UI.closeModal();
        RatingsTab.render(document.getElementById('tab-ratings'));
      } catch (e) { UI.err(e); }
    };
  },
};
