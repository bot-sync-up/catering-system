// אפליקציה ראשית - ניהול טאבים ולוגיקה
'use strict';

const STATUS_HE = {
  pending: 'ממתין',
  assigned: 'משובץ',
  en_route: 'בדרך',
  arrived: 'הגיע',
  delivered: 'נמסר',
  failed: 'נכשל',
  cancelled: 'בוטל',
  active: 'פעיל',
  inactive: 'לא פעיל',
  available: 'זמין',
  in_use: 'בשימוש',
  maintenance: 'בתחזוקה',
  off_road: 'לא בשטח',
  internal: 'פנימי',
  contractor: 'קבלן',
  draft: 'טיוטה',
  sent: 'נשלח',
  paid: 'שולם',
};

function tHe(s) { return STATUS_HE[s] || s; }
function badge(s) { return `<span class="status status-${s}">${tHe(s)}</span>`; }

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function modal(html) {
  const m = document.getElementById('modal');
  document.getElementById('modal-body').innerHTML = html;
  m.style.display = 'flex';
}
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}
document.querySelector('.modal-close').addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

// Tabs
document.querySelectorAll('.main-nav a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const tab = a.dataset.tab;
    document.querySelectorAll('.main-nav a').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    loadTab(tab);
  });
});

async function loadTab(name) {
  try {
    if (name === 'dashboard') await loadDashboard();
    else if (name === 'deliveries') await loadDeliveries();
    else if (name === 'drivers') await loadDrivers();
    else if (name === 'vehicles') await loadVehicles();
    else if (name === 'contractors') await loadContractors();
    else if (name === 'geofences') await loadGeofences();
    else if (name === 'proof') await loadProofTab();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== Dashboard =====
async function loadDashboard() {
  const [d, dr, v] = await Promise.all([
    API.deliveries.list({ limit: 200 }),
    API.drivers.list(),
    API.vehicles.list(),
  ]);
  const stats = {
    total: d.data.length,
    pending: d.data.filter(x => x.status === 'pending').length,
    en_route: d.data.filter(x => x.status === 'en_route').length,
    delivered: d.data.filter(x => x.status === 'delivered').length,
    drivers: dr.data.filter(x => x.status === 'active').length,
    vehicles: v.data.filter(x => x.status === 'available').length,
  };
  document.getElementById('stats').innerHTML = `
    <div class="stat-card"><span class="value">${stats.total}</span><div class="label">סה"כ משלוחים</div></div>
    <div class="stat-card"><span class="value">${stats.pending}</span><div class="label">ממתינים לשיבוץ</div></div>
    <div class="stat-card"><span class="value">${stats.en_route}</span><div class="label">בדרך כעת</div></div>
    <div class="stat-card"><span class="value">${stats.delivered}</span><div class="label">נמסרו</div></div>
    <div class="stat-card"><span class="value">${stats.drivers}</span><div class="label">נהגים פעילים</div></div>
    <div class="stat-card"><span class="value">${stats.vehicles}</span><div class="label">רכבים זמינים</div></div>
  `;
  const tbody = document.querySelector('#recent-deliveries tbody');
  tbody.innerHTML = d.data.slice(0, 10).map(x => `
    <tr>
      <td>${x.order_number}</td>
      <td>${x.customer_name}</td>
      <td>${x.delivery_address}</td>
      <td>${x.driver_name || '-'}</td>
      <td>${badge(x.status)}</td>
      <td><button class="btn btn-sm" onclick="showDelivery('${x.id}')">צפייה</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="muted">אין משלוחים עדיין</td></tr>';
}

// ===== Deliveries =====
async function loadDeliveries() {
  const status = document.getElementById('filter-status').value;
  const params = status ? { status } : {};
  const r = await API.deliveries.list(params);
  const tbody = document.querySelector('#deliveries-table tbody');
  tbody.innerHTML = r.data.map(x => `
    <tr>
      <td>${x.order_number}</td>
      <td>${x.customer_name}</td>
      <td>${x.customer_phone}</td>
      <td>${x.pickup_address}</td>
      <td>${x.delivery_address}</td>
      <td>${x.driver_name || '<button class="btn btn-sm" onclick="recommendDriver(\'' + x.id + '\')">שבץ</button>'}</td>
      <td>${badge(x.status)}</td>
      <td>
        <button class="btn btn-sm" onclick="showDelivery('${x.id}')">פרטים</button>
        ${x.status === 'assigned' ? `<button class="btn btn-sm btn-warning" onclick="updateStatus('${x.id}','en_route')">יציאה</button>` : ''}
        ${x.status === 'en_route' ? `<button class="btn btn-sm btn-warning" onclick="updateStatus('${x.id}','arrived')">הגעתי</button>` : ''}
        ${x.status === 'arrived' ? `<button class="btn btn-sm btn-success" onclick="goProof('${x.id}')">תיעוד</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="muted">אין משלוחים</td></tr>';
}
document.getElementById('filter-status').addEventListener('change', loadDeliveries);

document.getElementById('btn-new-delivery').addEventListener('click', () => {
  modal(`
    <h3>משלוח חדש</h3>
    <form id="new-delivery-form">
      <div class="field-row">
        <div><label>שם לקוח *</label><input name="customer_name" required></div>
        <div><label>טלפון *</label><input name="customer_phone" required></div>
      </div>
      <div class="field-row">
        <div><label>אימייל</label><input type="email" name="customer_email"></div>
        <div><label>מספר הזמנה</label><input name="order_number" placeholder="אוטומטי"></div>
      </div>
      <label>כתובת איסוף *</label>
      <input name="pickup_address" required>
      <div class="field-row">
        <div><label>נ.צ. איסוף - lat</label><input type="number" step="0.000001" name="pickup_lat"></div>
        <div><label>נ.צ. איסוף - lng</label><input type="number" step="0.000001" name="pickup_lng"></div>
      </div>
      <label>כתובת מסירה *</label>
      <input name="delivery_address" required>
      <div class="field-row">
        <div><label>נ.צ. יעד - lat</label><input type="number" step="0.000001" name="delivery_lat"></div>
        <div><label>נ.צ. יעד - lng</label><input type="number" step="0.000001" name="delivery_lng"></div>
      </div>
      <div class="field-row">
        <div><label>משקל (ק"ג)</label><input type="number" step="0.1" name="weight_kg" value="0"></div>
        <div><label>חבילות</label><input type="number" name="packages_count" value="1"></div>
      </div>
      <div class="field-row">
        <div><label>איסוף משוער</label><input type="datetime-local" name="scheduled_pickup_at"></div>
        <div><label>מסירה משוערת</label><input type="datetime-local" name="scheduled_delivery_at"></div>
      </div>
      <label>הערות מסירה</label>
      <textarea name="delivery_notes" rows="2"></textarea>
      <button type="submit" class="btn btn-primary btn-large">צור משלוח</button>
    </form>
  `);
  document.getElementById('new-delivery-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (v !== '') data[k] = isNaN(v) || ['customer_name','customer_phone','customer_email','order_number','pickup_address','delivery_address','delivery_notes','scheduled_pickup_at','scheduled_delivery_at'].includes(k) ? v : Number(v);
    }
    try {
      await API.deliveries.create(data);
      toast('משלוח נוצר בהצלחה', 'success');
      closeModal();
      loadDeliveries();
    } catch (err) { toast(err.message, 'error'); }
  });
});

async function showDelivery(id) {
  try {
    const r = await API.deliveries.get(id);
    const d = r.data;
    let html = `
      <h3>משלוח ${d.order_number}</h3>
      <p><b>לקוח:</b> ${d.customer_name} | ${d.customer_phone}</p>
      <p><b>סטטוס:</b> ${badge(d.status)}</p>
      <p><b>איסוף:</b> ${d.pickup_address}</p>
      <p><b>יעד:</b> ${d.delivery_address}</p>
      ${d.driver_name ? `<p><b>נהג:</b> ${d.driver_name} (${d.driver_phone})</p>` : ''}
      ${d.vehicle_plate ? `<p><b>רכב:</b> ${d.vehicle_plate} ${d.vehicle_make || ''} ${d.vehicle_model || ''}</p>` : ''}
      ${d.eta ? `<p><b>ETA:</b> ${new Date(d.eta).toLocaleString('he-IL')}</p>` : ''}
    `;
    if (d.navigation) {
      html += `<div class="nav-links">
        <a class="waze" href="${d.navigation.waze}" target="_blank">פתח ב-Waze</a>
        <a class="gmaps" href="${d.navigation.google_maps}" target="_blank">פתח ב-Google Maps</a>
      </div>`;
    }
    if (d.proof) {
      html += `<h4>תיעוד מסירה</h4>
        <p>נמסר ל: ${d.proof.recipient_name || '-'} (${d.proof.recipient_id_number || '-'})</p>
        <p>זמן: ${new Date(d.proof.timestamp).toLocaleString('he-IL')}</p>
        ${d.proof.signature_data ? `<img src="${d.proof.signature_data}" style="max-width:200px;border:1px solid #ddd">` : ''}
        ${d.proof.photo_path ? `<img src="${d.proof.photo_path}" style="max-width:200px;margin-right:10px">` : ''}`;
    }
    if (d.tracking_events && d.tracking_events.length) {
      html += '<h4>היסטוריית מעקב</h4><ul>';
      for (const ev of d.tracking_events.slice().reverse()) {
        html += `<li>${new Date(ev.timestamp).toLocaleString('he-IL')} — ${ev.event_type}${ev.status ? ' / ' + tHe(ev.status) : ''}</li>`;
      }
      html += '</ul>';
    }
    modal(html);
  } catch (e) { toast(e.message, 'error'); }
}
window.showDelivery = showDelivery;

async function recommendDriver(deliveryId) {
  try {
    const r = await API.drivers.recommend(deliveryId);
    if (!r.data.length) {
      toast('אין נהג מתאים', 'error');
      return;
    }
    let html = `<h3>שיבוץ נהג למשלוח</h3>
      <table class="data-table">
      <thead><tr><th>נהג</th><th>סוג</th><th>מרחק</th><th>פעילים</th><th>דירוג</th><th>ציון</th><th></th></tr></thead><tbody>`;
    for (const c of r.data) {
      html += `<tr>
        <td>${c.driver_name}</td>
        <td>${tHe(c.driver_type)}</td>
        <td>${c.distance_km} ק"מ</td>
        <td>${c.active_deliveries}</td>
        <td>${c.rating}</td>
        <td><b>${c.score}</b></td>
        <td><button class="btn btn-sm btn-primary" onclick="doAssign('${c.driver_id}','${deliveryId}','${c.vehicle_id}')">שבץ</button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    modal(html);
  } catch (e) { toast(e.message, 'error'); }
}
window.recommendDriver = recommendDriver;

async function doAssign(driverId, deliveryId, vehicleId) {
  try {
    await API.drivers.assign(driverId, deliveryId, vehicleId);
    toast('הנהג שובץ', 'success');
    closeModal();
    loadDeliveries();
  } catch (e) { toast(e.message, 'error'); }
}
window.doAssign = doAssign;

async function updateStatus(id, status) {
  try {
    let lat, lng;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* GPS לא זמין */ }
    }
    await API.deliveries.updateStatus(id, status, lat, lng);
    toast('סטטוס עודכן', 'success');
    loadDeliveries();
  } catch (e) { toast(e.message, 'error'); }
}
window.updateStatus = updateStatus;

function goProof(id) {
  document.querySelector('[data-tab="proof"]').click();
  setTimeout(() => {
    document.getElementById('proof-delivery-select').value = id;
    document.getElementById('proof-delivery-select').dispatchEvent(new Event('change'));
  }, 300);
}
window.goProof = goProof;

// ===== Drivers =====
async function loadDrivers() {
  const r = await API.drivers.list();
  const tbody = document.querySelector('#drivers-table tbody');
  tbody.innerHTML = r.data.map(x => `
    <tr>
      <td>${x.full_name}</td>
      <td>${x.phone}</td>
      <td>${tHe(x.driver_type)}</td>
      <td>${x.contractor_company || '-'}</td>
      <td>${x.vehicle_plate || '-'}</td>
      <td>${x.rating || '-'}</td>
      <td>${x.total_deliveries}</td>
      <td>${badge(x.status)}</td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="muted">אין נהגים</td></tr>';
}

document.getElementById('btn-new-driver').addEventListener('click', async () => {
  const v = await API.vehicles.list();
  const vehOpts = v.data.map(x => `<option value="${x.id}">${x.license_plate} (${x.make || ''} ${x.model || ''})</option>`).join('');
  modal(`
    <h3>נהג חדש</h3>
    <form id="new-driver-form">
      <div class="field-row">
        <div><label>שם מלא *</label><input name="full_name" required></div>
        <div><label>טלפון *</label><input name="phone" required></div>
      </div>
      <div class="field-row">
        <div><label>אימייל</label><input type="email" name="email"></div>
        <div><label>תעודת זהות</label><input name="id_number"></div>
      </div>
      <div class="field-row">
        <div><label>מספר רישיון</label><input name="license_number"></div>
        <div><label>תוקף רישיון</label><input type="date" name="license_expiry"></div>
      </div>
      <div class="field-row">
        <div><label>סוג נהג *</label>
          <select name="driver_type" required>
            <option value="internal">פנימי</option>
            <option value="contractor">קבלן</option>
          </select>
        </div>
        <div><label>חברת קבלן</label><input name="contractor_company"></div>
      </div>
      <div class="field-row">
        <div><label>תעריף לשעה</label><input type="number" step="0.01" name="hourly_rate"></div>
        <div><label>תעריף למשלוח</label><input type="number" step="0.01" name="per_delivery_rate"></div>
      </div>
      <label>חשבון בנק</label>
      <input name="bank_account">
      <label>רכב משוייך</label>
      <select name="current_vehicle_id"><option value="">- ללא -</option>${vehOpts}</select>
      <button type="submit" class="btn btn-primary btn-large">שמור</button>
    </form>
  `);
  document.getElementById('new-driver-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    for (const [k, v] of fd.entries()) if (v !== '') data[k] = v;
    try {
      await API.drivers.create(data);
      toast('נהג נוסף', 'success');
      closeModal();
      loadDrivers();
    } catch (err) { toast(err.message, 'error'); }
  });
});

// ===== Vehicles =====
async function loadVehicles() {
  const r = await API.vehicles.list();
  const tbody = document.querySelector('#vehicles-table tbody');
  tbody.innerHTML = r.data.map(x => `
    <tr>
      <td>${x.license_plate}</td>
      <td>${x.make || '-'}</td>
      <td>${x.model || '-'}</td>
      <td>${x.year || '-'}</td>
      <td>${x.capacity_kg}</td>
      <td>${x.current_km || 0}</td>
      <td>${badge(x.status)}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="muted">אין רכבים</td></tr>';
}

document.getElementById('btn-new-vehicle').addEventListener('click', () => {
  modal(`
    <h3>רכב חדש</h3>
    <form id="new-vehicle-form">
      <label>מספר רישוי *</label>
      <input name="license_plate" required>
      <div class="field-row">
        <div><label>יצרן</label><input name="make"></div>
        <div><label>דגם</label><input name="model"></div>
      </div>
      <div class="field-row">
        <div><label>שנה</label><input type="number" name="year"></div>
        <div><label>סוג דלק</label>
          <select name="fuel_type">
            <option value="diesel">דיזל</option>
            <option value="gasoline">בנזין</option>
            <option value="electric">חשמלי</option>
            <option value="hybrid">היברידי</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div><label>קיבולת (ק"ג)</label><input type="number" step="0.1" name="capacity_kg"></div>
        <div><label>קיבולת (נפח)</label><input type="number" step="0.1" name="capacity_volume"></div>
      </div>
      <label>ק"מ נוכחי</label>
      <input type="number" name="current_km">
      <button type="submit" class="btn btn-primary btn-large">שמור</button>
    </form>
  `);
  document.getElementById('new-vehicle-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    for (const [k, v] of fd.entries()) if (v !== '') data[k] = isNaN(v) || ['license_plate','make','model','fuel_type'].includes(k) ? v : Number(v);
    try {
      await API.vehicles.create(data);
      toast('רכב נוסף', 'success');
      closeModal();
      loadVehicles();
    } catch (err) { toast(err.message, 'error'); }
  });
});

// ===== Contractors =====
async function loadContractors() {
  const c = await API.contractors.list();
  document.querySelector('#contractors-table tbody').innerHTML = c.data.map(x => `
    <tr>
      <td>${x.full_name}</td>
      <td>${x.contractor_company || '-'}</td>
      <td>${x.phone}</td>
      <td>${x.per_delivery_rate || '-'}</td>
      <td>${x.rating || '-'}</td>
      <td>${x.total_deliveries}</td>
      <td><button class="btn btn-sm" onclick="showPending('${x.id}')">תשלום מגיע</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="muted">אין קבלנים</td></tr>';

  const inv = await API.contractors.invoices();
  document.querySelector('#invoices-table tbody').innerHTML = inv.data.map(x => `
    <tr>
      <td>${x.invoice_number}</td>
      <td>${x.driver_name} ${x.contractor_company ? '(' + x.contractor_company + ')' : ''}</td>
      <td>${x.period_start.slice(0,10)} - ${x.period_end.slice(0,10)}</td>
      <td>${x.deliveries_count}</td>
      <td>${x.total_amount.toFixed(2)}</td>
      <td>${x.vat_amount.toFixed(2)}</td>
      <td>${badge(x.status)}</td>
      <td>
        ${x.status === 'draft' ? `<button class="btn btn-sm" onclick="updateInvoiceStatus('${x.id}','sent')">שלח</button>` : ''}
        ${x.status === 'sent' ? `<button class="btn btn-sm btn-success" onclick="updateInvoiceStatus('${x.id}','paid')">סמן ששולם</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="muted">אין חשבוניות</td></tr>';
}

async function showPending(driverId) {
  const from = new Date(Date.now() - 30 * 86400000).toISOString();
  const to = new Date().toISOString();
  try {
    const r = await API.contractors.pending(driverId, from, to);
    const d = r.data;
    let html = `<h3>תשלום מגיע - ${d.driver_name}</h3>
      <p>תקופה: ${d.period.from.slice(0,10)} - ${d.period.to.slice(0,10)}</p>
      <p>משלוחים: <b>${d.deliveries_count}</b> | תעריף: ${d.rate_per_delivery}</p>
      <p>סה"כ: <b>${d.total_amount.toFixed(2)}</b> | מע"מ: ${d.vat_amount.toFixed(2)} | כולל: <b>${d.total_with_vat.toFixed(2)}</b></p>
      <button class="btn btn-primary" onclick="createInvoice('${driverId}','${d.period.from}','${d.period.to}')">צור חשבונית</button>`;
    modal(html);
  } catch (e) { toast(e.message, 'error'); }
}
window.showPending = showPending;

async function createInvoice(driverId, periodStart, periodEnd) {
  try {
    await API.contractors.createInvoice({ driver_id: driverId, period_start: periodStart, period_end: periodEnd });
    toast('חשבונית נוצרה', 'success');
    closeModal();
    loadContractors();
  } catch (e) { toast(e.message, 'error'); }
}
window.createInvoice = createInvoice;

async function updateInvoiceStatus(id, status) {
  try {
    await API.contractors.updateInvoiceStatus(id, status);
    toast('עודכן', 'success');
    loadContractors();
  } catch (e) { toast(e.message, 'error'); }
}
window.updateInvoiceStatus = updateInvoiceStatus;

// ===== Geofences =====
async function loadGeofences() {
  const r = await API.geofences.list();
  const tbody = document.querySelector('#geofences-table tbody');
  tbody.innerHTML = r.data.map(x => `
    <tr>
      <td>${x.name}</td>
      <td>${x.type === 'circle' ? 'עיגול' : 'פוליגון'}</td>
      <td>${x.center_lat ? x.center_lat.toFixed(4) + ', ' + x.center_lng.toFixed(4) : '-'}</td>
      <td>${x.radius_meters || '-'}</td>
      <td>${x.trigger_event}</td>
      <td>${x.active ? 'כן' : 'לא'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="delGeofence('${x.id}')">מחק</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="muted">אין אזורים</td></tr>';
}

document.getElementById('btn-new-geofence').addEventListener('click', () => {
  modal(`
    <h3>אזור גיאופנסינג חדש (עיגול)</h3>
    <form id="new-geofence-form">
      <label>שם *</label>
      <input name="name" required>
      <div class="field-row">
        <div><label>נ.צ. מרכז - lat *</label><input type="number" step="0.000001" name="center_lat" required></div>
        <div><label>נ.צ. מרכז - lng *</label><input type="number" step="0.000001" name="center_lng" required></div>
      </div>
      <label>רדיוס (מטרים) *</label>
      <input type="number" name="radius_meters" required value="200">
      <label>אירוע טריגר</label>
      <select name="trigger_event">
        <option value="both">כניסה ויציאה</option>
        <option value="enter">כניסה בלבד</option>
        <option value="exit">יציאה בלבד</option>
      </select>
      <label>Webhook URL (אופציונלי)</label>
      <input type="text" name="webhook_url" placeholder="https://...">
      <button type="submit" class="btn btn-primary btn-large">צור</button>
    </form>
  `);
  document.getElementById('new-geofence-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { type: 'circle' };
    for (const [k, v] of fd.entries()) {
      if (v !== '') data[k] = ['name','trigger_event','webhook_url'].includes(k) ? v : Number(v);
    }
    try {
      await API.geofences.create(data);
      toast('אזור נוצר', 'success');
      closeModal();
      loadGeofences();
    } catch (err) { toast(err.message, 'error'); }
  });
});

async function delGeofence(id) {
  if (!confirm('למחוק את האזור?')) return;
  try { await API.geofences.del(id); toast('נמחק', 'success'); loadGeofences(); }
  catch (e) { toast(e.message, 'error'); }
}
window.delGeofence = delGeofence;

// ===== Proof of Delivery =====
let signatureCanvas = null;
let currentGPS = null;

async function loadProofTab() {
  const r = await API.deliveries.list();
  const sel = document.getElementById('proof-delivery-select');
  const eligible = r.data.filter(x => ['assigned','en_route','arrived'].includes(x.status));
  sel.innerHTML = '<option value="">-- בחר משלוח --</option>' +
    eligible.map(x => `<option value="${x.id}">${x.order_number} - ${x.customer_name} (${x.delivery_address})</option>`).join('');

  if (!signatureCanvas) {
    signatureCanvas = new SignatureCanvas(document.getElementById('signature-canvas'));
    document.getElementById('clear-signature').addEventListener('click', () => signatureCanvas.clear());
    document.getElementById('proof-photo').addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) {
        const reader = new FileReader();
        reader.onload = ev => {
          const img = document.getElementById('photo-preview');
          img.src = ev.target.result;
          img.style.display = 'block';
        };
        reader.readAsDataURL(f);
      }
    });
    document.getElementById('refresh-gps').addEventListener('click', refreshGPS);
    document.getElementById('submit-proof').addEventListener('click', submitProof);
  }
}

document.getElementById('proof-delivery-select').addEventListener('change', e => {
  document.getElementById('proof-form').style.display = e.target.value ? 'block' : 'none';
  if (e.target.value) refreshGPS();
});

function refreshGPS() {
  const info = document.getElementById('gps-info');
  if (!navigator.geolocation) {
    info.textContent = 'GPS לא זמין בדפדפן זה';
    return;
  }
  info.textContent = 'מאתר מיקום...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      currentGPS = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      info.innerHTML = `<b>נ.צ.:</b> ${currentGPS.lat.toFixed(6)}, ${currentGPS.lng.toFixed(6)}<br><b>דיוק:</b> ${Math.round(currentGPS.accuracy)} מ'`;
    },
    err => { info.textContent = 'שגיאת GPS: ' + err.message; },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function submitProof() {
  const id = document.getElementById('proof-delivery-select').value;
  if (!id) return toast('בחר משלוח', 'error');

  const fd = new FormData();
  const sig = signatureCanvas.toDataURL();
  if (sig) fd.append('signature_data', sig);

  const photo = document.getElementById('proof-photo').files[0];
  if (photo) fd.append('photo', photo);

  fd.append('recipient_name', document.getElementById('recipient-name').value);
  fd.append('recipient_id_number', document.getElementById('recipient-id').value);
  fd.append('notes', document.getElementById('proof-notes').value);

  if (currentGPS) {
    fd.append('gps_lat', currentGPS.lat);
    fd.append('gps_lng', currentGPS.lng);
    fd.append('gps_accuracy', currentGPS.accuracy);
  }

  try {
    await API.deliveries.proof(id, fd);
    toast('תיעוד מסירה נשמר. סטטוס המשלוח עודכן ל"נמסר"', 'success');
    signatureCanvas.clear();
    document.getElementById('proof-photo').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('recipient-name').value = '';
    document.getElementById('recipient-id').value = '';
    document.getElementById('proof-notes').value = '';
    loadProofTab();
  } catch (e) { toast(e.message, 'error'); }
}

// טען Dashboard בהתחלה
loadDashboard();
