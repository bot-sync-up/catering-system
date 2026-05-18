// =================================================================
// אפליקציה ראשית - ניתוב, מודאלים ופעולות UI
// =================================================================

// ניתוב פנימי
async function render(view) {
    document.querySelectorAll('.tab').forEach(t =>
        t.classList.toggle('active', t.dataset.view === view));
    const content = document.getElementById('content');
    content.innerHTML = '<div class="empty">טוען...</div>';
    try {
        content.innerHTML = await Views[view]();
    } catch (e) {
        content.innerHTML = `<div class="card empty">שגיאה: ${escapeHtml(e.message)}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => render(t.dataset.view));
    });
    render('dashboard');
});

// =================================================================
// משלוח חדש
// =================================================================
window.newDeliveryModal = function() {
    openModal('משלוח חדש', `
        <div class="form-grid">
            <div class="field"><label>שם לקוח *</label><input id="d_customer_name"></div>
            <div class="field"><label>טלפון לקוח</label><input id="d_customer_phone" placeholder="050-1234567"></div>
            <div class="field full"><label>כתובת איסוף *</label><input id="d_pickup_address"></div>
            <div class="field"><label>איסוף - lat</label><input id="d_pickup_lat" type="number" step="0.0001"></div>
            <div class="field"><label>איסוף - lng</label><input id="d_pickup_lng" type="number" step="0.0001"></div>
            <div class="field full"><label>כתובת מסירה *</label><input id="d_dropoff_address"></div>
            <div class="field"><label>מסירה - lat</label><input id="d_dropoff_lat" type="number" step="0.0001"></div>
            <div class="field"><label>מסירה - lng</label><input id="d_dropoff_lng" type="number" step="0.0001"></div>
            <div class="field"><label>תיאור חבילה</label><input id="d_package_desc"></div>
            <div class="field"><label>משקל (ק"ג)</label><input id="d_weight_kg" type="number" step="0.1"></div>
            <div class="field"><label>מרחק משוער (ק"מ)</label><input id="d_distance_km" type="number" step="0.1"></div>
            <div class="field"><label>ETA (תאריך/שעה)</label><input id="d_eta" type="datetime-local"></div>
            <div class="field full"><label>הערות</label><textarea id="d_notes"></textarea></div>
        </div>
        <div style="margin-top:14px;text-align:left;">
            <button class="btn ghost" onclick="closeModal()">ביטול</button>
            <button class="btn" onclick="submitNewDelivery()">צור משלוח</button>
        </div>
    `);
};
window.submitNewDelivery = async function() {
    const v = id => document.getElementById(id).value;
    const num = id => v(id) ? parseFloat(v(id)) : null;
    const eta = v('d_eta');
    const body = {
        customer_name:   v('d_customer_name'),
        customer_phone:  v('d_customer_phone'),
        pickup_address:  v('d_pickup_address'),
        pickup_lat:      num('d_pickup_lat'),
        pickup_lng:      num('d_pickup_lng'),
        dropoff_address: v('d_dropoff_address'),
        dropoff_lat:     num('d_dropoff_lat'),
        dropoff_lng:     num('d_dropoff_lng'),
        package_desc:    v('d_package_desc'),
        weight_kg:       num('d_weight_kg'),
        distance_km:     num('d_distance_km'),
        eta_at:          eta ? new Date(eta).getTime() : null,
        notes:           v('d_notes')
    };
    try {
        await API.deliveries.create(body);
        toast('משלוח נוצר', 'success');
        closeModal();
        render('deliveries');
    } catch (e) { toast(e.message, 'error'); }
};

// =================================================================
// הצגת משלוח מלא + פעולות
// =================================================================
window.showDelivery = async function(id) {
    try {
        const [d, navLinks] = await Promise.all([
            API.deliveries.get(id),
            API.eta.navLinks(id).catch(() => null)
        ]);
        const proofs = (d.proofs || []).map(p => `
            <div class="proof-item">
                <div class="muted">תועד: ${fmtDate(p.proof_at)} ${p.received_by ? `· מקבל: ${escapeHtml(p.received_by)}` : ''}</div>
                ${p.gps_lat ? `<div class="muted">GPS: ${p.gps_lat.toFixed(5)}, ${p.gps_lng.toFixed(5)} (דיוק ${p.gps_accuracy || '?'} מ׳)</div>` : ''}
                ${p.signature_data ? `<div><strong>חתימה:</strong><br><img src="${p.signature_data}" alt="חתימה"></div>` : ''}
                ${p.photo_path ? `<div><strong>תמונה:</strong><br><img src="${p.photo_path}" alt="תמונה"></div>` : ''}
                ${p.notes ? `<div class="muted">הערות: ${escapeHtml(p.notes)}</div>` : ''}
            </div>
        `).join('') || '<div class="muted">אין תיעוד עדיין</div>';

        const log = (d.status_log || []).map(l => `
            <li>
                <strong>${STATUS_HE[l.to_status] || l.to_status}</strong>
                <span class="muted">· ${fmtDate(l.at)}</span>
                ${l.note ? `<br><span class="muted">${escapeHtml(l.note)}</span>` : ''}
            </li>
        `).join('');

        const navHtml = navLinks ? `
            <div class="nav-links" style="margin-top:8px;">
                <a href="${navLinks.waze}" target="_blank">פתח ב-Waze</a>
                <a href="${navLinks.gmaps}" target="_blank" class="gmaps">פתח ב-Maps</a>
            </div>` : '';

        const actions = [];
        if (d.status === 'pending')   actions.push(`<button class="btn" onclick="closeModal(); assignModal('${d.id}')">שבץ נהג</button>`);
        if (d.status === 'assigned')  actions.push(`<button class="btn warning" onclick="updateStatus('${d.id}','en_route')">התחל נסיעה</button>`);
        if (d.status === 'en_route')  actions.push(`<button class="btn warning" onclick="updateStatus('${d.id}','arrived')">סמן הגיע</button>`);
        if (d.status === 'arrived')   actions.push(`<button class="btn success" onclick="closeModal(); proofModal('${d.id}')">תיעוד מסירה</button>`);
        if (['pending','assigned','en_route','arrived'].includes(d.status))
            actions.push(`<button class="btn danger" onclick="updateStatus('${d.id}','cancelled')">בטל</button>`);
        if (d.customer_phone && ['assigned','en_route'].includes(d.status))
            actions.push(`<button class="btn ghost" onclick="sendEta('${d.id}')">שלח ETA SMS</button>`);

        openModal(`משלוח ${d.tracking_no || d.id.slice(0,8)}`, `
            <div class="card" style="background:#f9fafb;">
                <div class="flex">
                    <div style="flex:1;">
                        <div><strong>לקוח:</strong> ${escapeHtml(d.customer_name)}
                            ${d.customer_phone ? `· <a href="tel:${d.customer_phone}">${escapeHtml(d.customer_phone)}</a>` : ''}</div>
                        <div><strong>איסוף:</strong> ${escapeHtml(d.pickup_address)}</div>
                        <div><strong>מסירה:</strong> ${escapeHtml(d.dropoff_address)}</div>
                        ${d.package_desc ? `<div><strong>חבילה:</strong> ${escapeHtml(d.package_desc)} ${d.weight_kg ? `(${d.weight_kg} ק"ג)` : ''}</div>` : ''}
                        ${d.driver_name ? `<div><strong>נהג:</strong> ${escapeHtml(d.driver_name)}</div>` : ''}
                        ${d.vehicle_plate ? `<div><strong>רכב:</strong> ${escapeHtml(d.vehicle_plate)}</div>` : ''}
                        ${d.eta_at ? `<div><strong>ETA:</strong> ${fmtDate(d.eta_at)}</div>` : ''}
                    </div>
                    <span class="badge ${d.status}" style="font-size:14px;">${STATUS_HE[d.status]}</span>
                </div>
                ${navHtml}
            </div>
            <div class="flex" style="margin:12px 0;flex-wrap:wrap;">${actions.join('')}</div>

            <h4 style="margin-top:14px;">תיעוד מסירה</h4>
            ${proofs}

            <h4 style="margin-top:14px;">היסטוריית מצב</h4>
            <ul class="timeline">${log}</ul>
        `);
    } catch (e) { toast(e.message, 'error'); }
};

window.updateStatus = async function(id, status) {
    try {
        // ניסיון לקבל GPS לרישום במצב החדש
        let lat = null, lng = null;
        if (navigator.geolocation && status !== 'cancelled') {
            try {
                const pos = await new Promise((r, j) =>
                    navigator.geolocation.getCurrentPosition(r, j, { timeout: 5000 }));
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } catch {}
        }
        await API.deliveries.status(id, { status, lat, lng });
        toast(`מצב עודכן ל-${STATUS_HE[status]}`, 'success');
        closeModal();
        render('deliveries');
    } catch (e) { toast(e.message, 'error'); }
};

window.quickStatus = async function(id, currentStatus) {
    const next = { assigned: 'en_route', en_route: 'arrived', arrived: 'delivered' }[currentStatus];
    if (next === 'delivered') return proofModal(id);
    return updateStatus(id, next);
};

// =================================================================
// שיבוץ - מודאל
// =================================================================
window.assignModal = async function(deliveryId) {
    const [drivers, vehicles] = await Promise.all([
        API.drivers.list({ status: 'active' }),
        API.vehicles.list()
    ]);
    const avail = vehicles.filter(v => v.status === 'available');
    openModal('שיבוץ נהג', `
        <div class="form-grid">
            <div class="field full">
                <label>נהג *</label>
                <select id="assign_driver">
                    <option value="">בחר נהג...</option>
                    ${drivers.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${DRIVER_TYPE_HE[d.type]})</option>`).join('')}
                </select>
            </div>
            <div class="field full">
                <label>רכב</label>
                <select id="assign_vehicle">
                    <option value="">ללא רכב</option>
                    ${avail.map(v => `<option value="${v.id}">${v.plate} - ${v.make || ''} ${v.model || ''}</option>`).join('')}
                </select>
            </div>
        </div>
        <div style="margin-top:14px;text-align:left;">
            <button class="btn ghost" onclick="closeModal()">ביטול</button>
            <button class="btn" onclick="submitAssign('${deliveryId}')">שבץ</button>
        </div>
    `);
};
window.submitAssign = async function(deliveryId) {
    const driver_id = document.getElementById('assign_driver').value;
    const vehicle_id = document.getElementById('assign_vehicle').value;
    if (!driver_id) return toast('בחר נהג', 'error');
    try {
        await API.deliveries.assign(deliveryId, { driver_id, vehicle_id: vehicle_id || null });
        toast('שיבוץ הצליח', 'success');
        closeModal();
        render('deliveries');
    } catch (e) { toast(e.message, 'error'); }
};

// =================================================================
// תיעוד מסירה - מודאל עם חתימה, תמונה, GPS
// =================================================================
window.proofModal = function(deliveryId) {
    openModal('תיעוד מסירה', `
        <div class="form-grid">
            <div class="field"><label>שם המקבל</label><input id="proof_received_by"></div>
            <div class="field"><label>הערות</label><input id="proof_notes"></div>
        </div>
        <div style="margin-top:14px;">
            <label><strong>חתימה:</strong></label>
            <canvas id="sigPad" class="signature-pad"></canvas>
            <button class="btn sm ghost" type="button" onclick="window._sigPad.clear()">נקה חתימה</button>
        </div>
        <div style="margin-top:14px;">
            <label><strong>תמונה (אופציונלי):</strong></label>
            <input type="file" id="proof_photo" accept="image/*" capture="environment">
        </div>
        <div id="proof_gps_status" class="muted" style="margin-top:8px;">GPS: ממתין...</div>
        <div style="margin-top:14px;text-align:left;">
            <button class="btn ghost" onclick="closeModal()">ביטול</button>
            <button class="btn success" onclick="submitProof('${deliveryId}')">שמור תיעוד</button>
        </div>
    `);
    setTimeout(() => {
        window._sigPad = new SignaturePad(document.getElementById('sigPad'));
        // אקווייר GPS
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    window._proofGps = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    };
                    document.getElementById('proof_gps_status').textContent =
                        `GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (דיוק ${Math.round(pos.coords.accuracy)} מ׳)`;
                },
                err => {
                    document.getElementById('proof_gps_status').textContent = 'GPS לא זמין: ' + err.message;
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }, 100);
};
window.submitProof = async function(deliveryId) {
    const fd = new FormData();
    if (window._sigPad && !window._sigPad.isEmpty()) {
        fd.append('signature_data', window._sigPad.toDataURL());
    }
    const photo = document.getElementById('proof_photo').files[0];
    if (photo) fd.append('photo', photo);
    fd.append('received_by', document.getElementById('proof_received_by').value);
    fd.append('notes', document.getElementById('proof_notes').value);
    if (window._proofGps) {
        fd.append('gps_lat', window._proofGps.lat);
        fd.append('gps_lng', window._proofGps.lng);
        fd.append('gps_accuracy', window._proofGps.accuracy);
    }
    try {
        await API.deliveries.proof(deliveryId, fd);
        toast('תיעוד נשמר, המשלוח סומן כנמסר', 'success');
        closeModal();
        render('deliveries');
    } catch (e) { toast(e.message, 'error'); }
};

// =================================================================
// ETA SMS/WhatsApp
// =================================================================
window.sendEta = async function(deliveryId) {
    const channel = confirm('שלח דרך WhatsApp? (ביטול לשליחת SMS)') ? 'whatsapp' : 'sms';
    try {
        const r = await API.eta.notify({ delivery_id: deliveryId, channel });
        toast(`נשלח (${channel}): ${r.message}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
};

// =================================================================
// נהגים - מודאלים
// =================================================================
window.newDriverModal = function() {
    openModal('נהג חדש', `
        <div class="form-grid">
            <div class="field"><label>שם מלא *</label><input id="dr_name"></div>
            <div class="field"><label>טלפון *</label><input id="dr_phone" placeholder="050-1234567"></div>
            <div class="field"><label>רישיון</label><input id="dr_license"></div>
            <div class="field">
                <label>סוג</label>
                <select id="dr_type">
                    <option value="internal">פנימי</option>
                    <option value="contractor">קבלן</option>
                </select>
            </div>
            <div class="field"><label>שם קבלן</label><input id="dr_contractor"></div>
            <div class="field"><label>תעריף ק"מ (₪)</label><input id="dr_rate_km" type="number" step="0.01"></div>
            <div class="field"><label>תעריף משלוח (₪)</label><input id="dr_rate_delivery" type="number" step="0.01"></div>
        </div>
        <div style="margin-top:14px;text-align:left;">
            <button class="btn ghost" onclick="closeModal()">ביטול</button>
            <button class="btn" onclick="submitNewDriver()">שמור</button>
        </div>
    `);
};
window.submitNewDriver = async function() {
    const v = id => document.getElementById(id).value;
    const n = id => v(id) ? parseFloat(v(id)) : 0;
    try {
        await API.drivers.create({
            name: v('dr_name'),
            phone: v('dr_phone'),
            license_no: v('dr_license'),
            type: v('dr_type'),
            contractor_name: v('dr_contractor'),
            rate_per_km: n('dr_rate_km'),
            rate_per_delivery: n('dr_rate_delivery')
        });
        toast('נהג נוסף', 'success');
        closeModal();
        render('drivers');
    } catch (e) { toast(e.message, 'error'); }
};
window.driverStats = async function(id) {
    try {
        const r = await API.drivers.stats(id);
        openModal(`סטטיסטיקות - ${r.driver.name}`, `
            <div class="stats-grid">
                <div class="stat-card info"><div class="label">סה"כ משלוחים</div><div class="value">${r.stats.total}</div></div>
                <div class="stat-card success"><div class="label">נמסרו</div><div class="value">${r.stats.delivered}</div></div>
                <div class="stat-card warning"><div class="label">פעילים</div><div class="value">${r.stats.active}</div></div>
                <div class="stat-card"><div class="label">סה"כ ק"מ</div><div class="value">${Number(r.stats.total_km).toFixed(1)}</div></div>
            </div>
        `);
    } catch (e) { toast(e.message, 'error'); }
};
window.deleteDriver = async function(id) {
    if (!confirm('למחוק את הנהג?')) return;
    try { await API.drivers.del(id); toast('נמחק', 'success'); render('drivers'); }
    catch (e) { toast(e.message, 'error'); }
};

// =================================================================
// רכבים - מודאלים
// =================================================================
window.newVehicleModal = function() {
    openModal('רכב חדש', `
        <div class="form-grid">
            <div class="field"><label>מספר רישוי *</label><input id="vh_plate" placeholder="12-345-67"></div>
            <div class="field"><label>יצרן</label><input id="vh_make"></div>
            <div class="field"><label>דגם</label><input id="vh_model"></div>
            <div class="field"><label>שנה</label><input id="vh_year" type="number"></div>
            <div class="field"><label>קיבולת (ק"ג)</label><input id="vh_capacity" type="number"></div>
            <div class="field">
                <label>מצב</label>
                <select id="vh_status">
                    <option value="available">זמין</option>
                    <option value="in_use">בשימוש</option>
                    <option value="maintenance">תחזוקה</option>
                </select>
            </div>
        </div>
        <div style="margin-top:14px;text-align:left;">
            <button class="btn ghost" onclick="closeModal()">ביטול</button>
            <button class="btn" onclick="submitNewVehicle()">שמור</button>
        </div>
    `);
};
window.submitNewVehicle = async function() {
    const v = id => document.getElementById(id).value;
    try {
        await API.vehicles.create({
            plate: v('vh_plate'),
            make: v('vh_make'),
            model: v('vh_model'),
            year: v('vh_year') ? parseInt(v('vh_year')) : null,
            capacity_kg: v('vh_capacity') ? parseFloat(v('vh_capacity')) : null,
            status: v('vh_status')
        });
        toast('רכב נוסף', 'success');
        closeModal();
        render('vehicles');
    } catch (e) { toast(e.message, 'error'); }
};
window.deleteVehicle = async function(id) {
    if (!confirm('למחוק את הרכב?')) return;
    try { await API.vehicles.del(id); toast('נמחק', 'success'); render('vehicles'); }
    catch (e) { toast(e.message, 'error'); }
};

// =================================================================
// חשבוניות - מודאלים
// =================================================================
window.newInvoiceModal = async function() {
    const drivers = await API.drivers.list({ type: 'contractor' });
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    openModal('חשבונית חדשה', `
        <div class="form-grid">
            <div class="field full">
                <label>נהג קבלן *</label>
                <select id="inv_driver">
                    <option value="">בחר...</option>
                    ${drivers.map(d => `<option value="${d.id}">${escapeHtml(d.name)} - ${escapeHtml(d.contractor_name || '')}</option>`).join('')}
                </select>
            </div>
            <div class="field"><label>תחילת תקופה</label><input id="inv_start" type="date" value="${monthStart.toISOString().slice(0,10)}"></div>
            <div class="field"><label>סוף תקופה</label><input id="inv_end" type="date" value="${today.toISOString().slice(0,10)}"></div>
            <div class="field"><label>בונוס (₪)</label><input id="inv_bonus" type="number" step="0.01" value="0"></div>
            <div class="field"><label>ניכויים (₪)</label><input id="inv_deductions" type="number" step="0.01" value="0"></div>
            <div class="field full"><label>הערות</label><textarea id="inv_notes"></textarea></div>
        </div>
        <div style="margin-top:14px;text-align:left;">
            <button class="btn ghost" onclick="closeModal()">ביטול</button>
            <button class="btn" onclick="submitNewInvoice()">צור חשבונית (חישוב אוטומטי)</button>
        </div>
    `);
};
window.submitNewInvoice = async function() {
    const v = id => document.getElementById(id).value;
    const driver_id = v('inv_driver');
    if (!driver_id) return toast('בחר נהג', 'error');
    try {
        await API.invoices.generate({
            driver_id,
            period_start: new Date(v('inv_start')).getTime(),
            period_end:   new Date(v('inv_end') + 'T23:59:59').getTime(),
            bonus:        parseFloat(v('inv_bonus')) || 0,
            deductions:   parseFloat(v('inv_deductions')) || 0,
            notes:        v('inv_notes')
        });
        toast('חשבונית נוצרה', 'success');
        closeModal();
        render('invoices');
    } catch (e) { toast(e.message, 'error'); }
};
window.showInvoice = async function(id) {
    try {
        const i = await API.invoices.get(id);
        const lines = (i.deliveries || []).map(d => `
            <tr>
                <td>${escapeHtml(d.tracking_no)}</td>
                <td>${escapeHtml(d.customer_name)}</td>
                <td>${d.distance_km ? d.distance_km + ' ק"מ' : '—'}</td>
                <td>${fmtDate(d.delivered_at)}</td>
            </tr>
        `).join('');
        openModal(`חשבונית - ${i.driver_name}`, `
            <div class="card" style="background:#f9fafb;">
                <div><strong>קבלן:</strong> ${escapeHtml(i.contractor_name || '—')}</div>
                <div><strong>תקופה:</strong> ${fmtDate(i.period_start)} – ${fmtDate(i.period_end)}</div>
                <div><strong>תעריפים:</strong> ${fmtCurrency(i.rate_per_km)}/ק"מ · ${fmtCurrency(i.rate_per_delivery)}/משלוח</div>
                <hr style="margin:8px 0;">
                <div><strong>משלוחים:</strong> ${i.deliveries_count}</div>
                <div><strong>סה"כ ק"מ:</strong> ${Number(i.total_km).toFixed(1)}</div>
                <div><strong>סכום בסיס:</strong> ${fmtCurrency(i.base_amount)}</div>
                <div><strong>סכום ק"מ:</strong> ${fmtCurrency(i.km_amount)}</div>
                <div><strong>בונוס:</strong> ${fmtCurrency(i.bonus)}</div>
                <div><strong>ניכויים:</strong> ${fmtCurrency(i.deductions)}</div>
                <div style="font-size:18px;margin-top:6px;"><strong>סה"כ לתשלום: ${fmtCurrency(i.total_amount)}</strong></div>
            </div>
            ${lines ? `
            <h4 style="margin-top:12px;">פירוט משלוחים</h4>
            <table style="margin-top:6px;"><thead><tr><th>מס׳</th><th>לקוח</th><th>ק"מ</th><th>נמסר</th></tr></thead>
            <tbody>${lines}</tbody></table>` : '<div class="muted" style="margin-top:10px;">אין משלוחים בתקופה</div>'}
        `);
    } catch (e) { toast(e.message, 'error'); }
};
window.invoiceStatus = async function(id, status) {
    try {
        await API.invoices.status(id, status);
        toast('עודכן', 'success');
        render('invoices');
    } catch (e) { toast(e.message, 'error'); }
};
