// =================================================================
// Views - תצוגות שונות של המערכת
// =================================================================
const Views = {};

// ====================== דשבורד ======================
Views.dashboard = async function() {
    const stats = await API.deliveries.stats();
    const map = Object.fromEntries(stats.byStatus.map(r => [r.status, r.count]));
    const total = stats.byStatus.reduce((s, r) => s + r.count, 0);

    return `
        <div class="view-header">
            <h2>דשבורד</h2>
            <button class="btn" onclick="render('deliveries')">צפה בכל המשלוחים</button>
        </div>
        <div class="stats-grid">
            <div class="stat-card info">
                <div class="label">סה"כ משלוחים</div>
                <div class="value">${total}</div>
            </div>
            <div class="stat-card warning">
                <div class="label">ממתין לשיבוץ</div>
                <div class="value">${map.pending || 0}</div>
            </div>
            <div class="stat-card info">
                <div class="label">פעיל בדרך</div>
                <div class="value">${(map.assigned || 0) + (map.en_route || 0) + (map.arrived || 0)}</div>
            </div>
            <div class="stat-card success">
                <div class="label">נמסר</div>
                <div class="value">${map.delivered || 0}</div>
            </div>
            <div class="stat-card">
                <div class="label">משלוחים היום</div>
                <div class="value">${stats.today}</div>
            </div>
            <div class="stat-card danger">
                <div class="label">בוטל</div>
                <div class="value">${map.cancelled || 0}</div>
            </div>
        </div>
        <div class="card">
            <h3 style="margin-bottom:10px;">פעולות מהירות</h3>
            <div class="flex">
                <button class="btn" onclick="newDeliveryModal()">+ משלוח חדש</button>
                <button class="btn ghost" onclick="render('assignment')">שיבוץ נהגים</button>
                <button class="btn ghost" onclick="render('route')">תכנון מסלול</button>
                <button class="btn ghost" onclick="render('drivers')">ניהול נהגים</button>
            </div>
        </div>
    `;
};

// ====================== משלוחים ======================
Views.deliveries = async function() {
    const filter = window._delvFilter || {};
    const list = await API.deliveries.list(filter);

    const rows = list.map(d => `
        <tr>
            <td><a href="#" onclick="showDelivery('${d.id}'); return false;">${d.tracking_no || d.id.slice(0,8)}</a></td>
            <td>${escapeHtml(d.customer_name)}</td>
            <td><span class="muted">${escapeHtml(d.dropoff_address)}</span></td>
            <td>${d.driver_name ? escapeHtml(d.driver_name) : '<span class="muted">לא שובץ</span>'}</td>
            <td><span class="badge ${d.status}">${STATUS_HE[d.status] || d.status}</span></td>
            <td>${fmtDate(d.created_at)}</td>
            <td class="row-actions">
                <button class="btn sm" onclick="showDelivery('${d.id}')">צפה</button>
                ${d.status === 'pending' ? `<button class="btn sm ghost" onclick="assignModal('${d.id}')">שבץ</button>` : ''}
                ${['assigned','en_route','arrived'].includes(d.status) ? `<button class="btn sm warning" onclick="quickStatus('${d.id}','${d.status}')">קדם</button>` : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty">אין משלוחים</td></tr>';

    return `
        <div class="view-header">
            <h2>משלוחים (${list.length})</h2>
            <button class="btn" onclick="newDeliveryModal()">+ משלוח חדש</button>
        </div>
        <div class="card flex">
            <div class="field" style="min-width:160px;">
                <label>חיפוש</label>
                <input id="fltQ" placeholder="לקוח, מס מעקב, כתובת" value="${filter.q || ''}">
            </div>
            <div class="field" style="min-width:140px;">
                <label>מצב</label>
                <select id="fltStatus">
                    <option value="">הכול</option>
                    ${Object.entries(STATUS_HE).map(([k,v]) =>
                        `<option value="${k}" ${filter.status === k ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
            </div>
            <button class="btn" onclick="applyDelvFilter()">סנן</button>
            <button class="btn ghost" onclick="window._delvFilter = {}; render('deliveries');">נקה</button>
        </div>
        <div class="tbl-wrap">
            <table>
                <thead><tr>
                    <th>מס׳ מעקב</th><th>לקוח</th><th>כתובת מסירה</th>
                    <th>נהג</th><th>מצב</th><th>נוצר</th><th>פעולות</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
};
window.applyDelvFilter = function() {
    window._delvFilter = {
        q:      document.getElementById('fltQ').value,
        status: document.getElementById('fltStatus').value
    };
    render('deliveries');
};

// ====================== שיבוץ ======================
Views.assignment = async function() {
    const [pending, drivers, vehicles] = await Promise.all([
        API.deliveries.list({ status: 'pending' }),
        API.drivers.list({ status: 'active' }),
        API.vehicles.list()
    ]);
    const availVehicles = vehicles.filter(v => v.status === 'available');

    const cards = pending.map(d => `
        <div class="card">
            <div class="flex">
                <div style="flex:1;min-width:200px;">
                    <strong>${d.tracking_no || ''}</strong> · ${escapeHtml(d.customer_name)}<br>
                    <span class="muted">${escapeHtml(d.dropoff_address)}</span>
                    ${d.weight_kg ? `<br><span class="muted">משקל: ${d.weight_kg} ק"ג</span>` : ''}
                </div>
                <div class="field" style="min-width:160px;">
                    <label>נהג</label>
                    <select id="dr-${d.id}">
                        <option value="">בחר נהג...</option>
                        ${drivers.map(dr => `<option value="${dr.id}">${escapeHtml(dr.name)} (${DRIVER_TYPE_HE[dr.type]})</option>`).join('')}
                    </select>
                </div>
                <div class="field" style="min-width:140px;">
                    <label>רכב</label>
                    <select id="vh-${d.id}">
                        <option value="">ללא</option>
                        ${availVehicles.map(v => `<option value="${v.id}">${v.plate} - ${v.make || ''} ${v.model || ''}</option>`).join('')}
                    </select>
                </div>
                <button class="btn success" onclick="doAssign('${d.id}')">שבץ</button>
            </div>
        </div>
    `).join('') || '<div class="empty card">אין משלוחים בהמתנה לשיבוץ</div>';

    return `
        <div class="view-header"><h2>שיבוץ נהגים (${pending.length} ממתינים)</h2></div>
        ${cards}
    `;
};
window.doAssign = async function(deliveryId) {
    const driver_id = document.getElementById(`dr-${deliveryId}`).value;
    const vehicle_id = document.getElementById(`vh-${deliveryId}`).value;
    if (!driver_id) return toast('בחר נהג', 'error');
    try {
        await API.deliveries.assign(deliveryId, { driver_id, vehicle_id: vehicle_id || null });
        toast('המשלוח שובץ בהצלחה', 'success');
        render('assignment');
    } catch (e) { toast(e.message, 'error'); }
};

// ====================== נהגים ======================
Views.drivers = async function() {
    const list = await API.drivers.list();
    const rows = list.map(d => `
        <tr>
            <td>${escapeHtml(d.name)}</td>
            <td>${escapeHtml(d.phone)}</td>
            <td><span class="badge ${d.type}">${DRIVER_TYPE_HE[d.type]}</span></td>
            <td>${d.contractor_name ? escapeHtml(d.contractor_name) : '—'}</td>
            <td>${d.rate_per_km > 0 ? fmtCurrency(d.rate_per_km) + '/ק"מ' : '—'}</td>
            <td>${d.rate_per_delivery > 0 ? fmtCurrency(d.rate_per_delivery) + '/משלוח' : '—'}</td>
            <td><span class="badge ${d.status}">${d.status === 'active' ? 'פעיל' : 'לא פעיל'}</span></td>
            <td class="row-actions">
                <button class="btn sm ghost" onclick="driverStats('${d.id}')">סטטיסטיקה</button>
                <button class="btn sm danger" onclick="deleteDriver('${d.id}')">מחק</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty">אין נהגים</td></tr>';

    return `
        <div class="view-header">
            <h2>נהגים (${list.length})</h2>
            <button class="btn" onclick="newDriverModal()">+ נהג חדש</button>
        </div>
        <div class="tbl-wrap">
            <table>
                <thead><tr>
                    <th>שם</th><th>טלפון</th><th>סוג</th><th>קבלן</th>
                    <th>תעריף ק"מ</th><th>תעריף משלוח</th><th>מצב</th><th>פעולות</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
};

// ====================== צי רכב ======================
Views.vehicles = async function() {
    const list = await API.vehicles.list();
    const rows = list.map(v => `
        <tr>
            <td><strong>${escapeHtml(v.plate)}</strong></td>
            <td>${escapeHtml(v.make || '')} ${escapeHtml(v.model || '')} ${v.year || ''}</td>
            <td>${v.capacity_kg ? v.capacity_kg + ' ק"ג' : '—'}</td>
            <td><span class="badge ${v.status}">${VEHICLE_STATUS_HE[v.status] || v.status}</span></td>
            <td>${v.last_lat && v.last_lng
                ? `<a href="https://maps.google.com/?q=${v.last_lat},${v.last_lng}" target="_blank">${v.last_lat.toFixed(4)}, ${v.last_lng.toFixed(4)}</a>`
                : '<span class="muted">אין</span>'}</td>
            <td>${fmtDate(v.last_seen_at)}</td>
            <td class="row-actions">
                <button class="btn sm danger" onclick="deleteVehicle('${v.id}')">מחק</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty">אין רכבים</td></tr>';

    return `
        <div class="view-header">
            <h2>צי רכב (${list.length})</h2>
            <button class="btn" onclick="newVehicleModal()">+ רכב חדש</button>
        </div>
        <div class="tbl-wrap">
            <table>
                <thead><tr>
                    <th>רישוי</th><th>דגם</th><th>קיבולת</th>
                    <th>מצב</th><th>GPS אחרון</th><th>עדכון</th><th>פעולות</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
};

// ====================== חשבוניות ======================
Views.invoices = async function() {
    const [list, drivers] = await Promise.all([
        API.invoices.list(),
        API.drivers.list({ type: 'contractor' })
    ]);
    const rows = list.map(i => `
        <tr>
            <td>${escapeHtml(i.driver_name)}<br><span class="muted">${escapeHtml(i.contractor_name || '')}</span></td>
            <td>${fmtDate(i.period_start)} – ${fmtDate(i.period_end)}</td>
            <td>${i.deliveries_count}</td>
            <td>${i.total_km ? Number(i.total_km).toFixed(1) + ' ק"מ' : '—'}</td>
            <td><strong>${fmtCurrency(i.total_amount)}</strong></td>
            <td><span class="badge ${i.status}">${INVOICE_STATUS_HE[i.status]}</span></td>
            <td class="row-actions">
                <button class="btn sm" onclick="showInvoice('${i.id}')">צפה</button>
                ${i.status === 'draft'  ? `<button class="btn sm warning" onclick="invoiceStatus('${i.id}','issued')">הפק</button>` : ''}
                ${i.status === 'issued' ? `<button class="btn sm success" onclick="invoiceStatus('${i.id}','paid')">סמן שולם</button>` : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty">אין חשבוניות</td></tr>';

    return `
        <div class="view-header">
            <h2>חשבוניות נהגים קבלנים (${list.length})</h2>
            <button class="btn" onclick="newInvoiceModal()" ${drivers.length ? '' : 'disabled'}>+ חשבונית חדשה</button>
        </div>
        ${drivers.length === 0 ? '<div class="card empty">אין נהגים מסוג קבלן. הוסף נהג קבלן ראשית.</div>' : ''}
        <div class="tbl-wrap">
            <table>
                <thead><tr>
                    <th>נהג / קבלן</th><th>תקופה</th><th>משלוחים</th>
                    <th>ק"מ</th><th>סה"כ</th><th>מצב</th><th>פעולות</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
};

// ====================== תכנון מסלול ======================
Views.route = async function() {
    const drivers = await API.drivers.list({ status: 'active' });
    return `
        <div class="view-header"><h2>תכנון מסלול (Nearest-Neighbor)</h2></div>
        <div class="card">
            <div class="form-grid">
                <div class="field">
                    <label>נקודת מוצא - Latitude</label>
                    <input id="startLat" type="number" step="0.0001" value="32.0853" placeholder="32.0853">
                </div>
                <div class="field">
                    <label>נקודת מוצא - Longitude</label>
                    <input id="startLng" type="number" step="0.0001" value="34.7818" placeholder="34.7818">
                </div>
                <div class="field">
                    <label>נהג</label>
                    <select id="planDriver">
                        <option value="">בחר נהג</option>
                        ${drivers.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="margin-top:12px;">
                <button class="btn" onclick="planRoute()">תכנן מסלול</button>
            </div>
        </div>
        <div id="planResult"></div>
    `;
};
window.planRoute = async function() {
    const start_lat = parseFloat(document.getElementById('startLat').value);
    const start_lng = parseFloat(document.getElementById('startLng').value);
    const driver_id = document.getElementById('planDriver').value;
    if (!driver_id) return toast('בחר נהג', 'error');
    try {
        const r = await API.route.plan({ start_lat, start_lng, driver_id });
        const html = r.stops.length === 0
            ? '<div class="card empty">אין משלוחים פעילים עם נ"צ עבור הנהג</div>'
            : `<div class="card">
                <h3>מסלול מתוכנן (${r.stops.length} עצירות, סה"כ ${r.total_km} ק"מ)</h3>
                <ol style="margin-right:18px; margin-top:10px;">
                    ${r.stops.map(s => `
                        <li style="margin-bottom:6px;">
                            <strong>${s.tracking_no}</strong> - ${escapeHtml(s.customer_name)}<br>
                            <span class="muted">${escapeHtml(s.dropoff_address)} (${s.leg_km} ק"מ)</span>
                        </li>`).join('')}
                </ol>
                <div class="nav-links" style="margin-top:12px;">
                    <a href="${r.gmaps_url}" target="_blank" class="gmaps">פתח ב-Google Maps</a>
                </div>
              </div>`;
        document.getElementById('planResult').innerHTML = html;
    } catch (e) { toast(e.message, 'error'); }
};

// ====================== Helpers ======================
function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
