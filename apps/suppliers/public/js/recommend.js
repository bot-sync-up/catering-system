// טאב השוואה והמלצה
const RecommendTab = {
  async render(root) {
    const products = await API.products.list();
    root.innerHTML = `
      <div class="toolbar">
        <label style="margin-inline-end:6px">בחר מוצר:</label>
        <select id="rec-product">
          <option value="">— בחר —</option>
          ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.sku)})</option>`).join('')}
        </select>
      </div>
      <div id="rec-results"></div>
    `;
    document.getElementById('rec-product').onchange = (e) => RecommendTab.show(+e.target.value);
  },
  async show(productId) {
    const out = document.getElementById('rec-results');
    if (!productId) { out.innerHTML = ''; return; }
    out.innerHTML = '<p class="muted">טוען...</p>';
    try {
      const data = await API.products.recommend(productId);
      if (!data.candidates.length) {
        out.innerHTML = '<div class="card empty">אין ספקים שמספקים את המוצר</div>';
        return;
      }
      const winner = data.recommendation;
      const rows = data.candidates.map((c, idx) => `
        <tr ${idx===0?'style="background:#ecfdf5"':''}>
          <td>${idx===0?'<strong>★ ' + escapeHtml(c.supplier_name) + '</strong>':escapeHtml(c.supplier_name)}</td>
          <td>${UI.fmtMoney(c.price)}</td>
          <td>${c.lead_time_days} יום</td>
          <td>${c.rating} ⭐ ${c.ratings_count?'('+c.ratings_count+')':'<span class="muted">(אין)</span>'}</td>
          <td><strong>${c.score}</strong></td>
        </tr>
      `).join('');
      out.innerHTML = `
        <div class="card">
          <h2>המלצה: ${escapeHtml(winner.supplier_name)}</h2>
          <p>מחיר ${UI.fmtMoney(winner.price)} | אספקה ${winner.lead_time_days} ימים | דירוג ${winner.rating} ⭐</p>
          <p class="muted">משוקלל: 50% מחיר, 35% איכות+שירות, 15% זמן אספקה</p>
        </div>
        <table>
          <thead><tr><th>ספק</th><th>מחיר</th><th>זמן אספקה</th><th>דירוג</th><th>ציון</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } catch (e) { UI.err(e); }
  },
};
