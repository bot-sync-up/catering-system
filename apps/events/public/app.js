// === API helpers ===
const api = {
  get: (p) => fetch('/api' + p).then(r => r.json()),
  post: (p, body) => fetch('/api' + p, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)}).then(r => r.json()),
  put: (p, body) => fetch('/api' + p, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)}).then(r => r.json()),
  patch: (p, body) => fetch('/api' + p, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)}).then(r => r.json()),
  del: (p) => fetch('/api' + p, { method: 'DELETE' }).then(r => r.json()),
};

const state = {
  events: [], venues: [], equipment: [], currentEventId: null, gantt: null,
};

const STATUS_LABELS = { planned: 'מתוכנן', active: 'פעיל', done: 'הושלם', cancelled: 'בוטל' };

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// === Tabs ===
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById('tab-' + t.dataset.tab).classList.add('active');
  if (t.dataset.tab === 'gantt') refreshGantt();
}));

// === Initial Load ===
async function loadAll() {
  const [events, venues, equipment] = await Promise.all([api.get('/events'), api.get('/venues'), api.get('/equipment')]);
  state.events = events; state.venues = venues; state.equipment = equipment;
  renderDashboard(); renderEvents(); renderVenues(); renderEquipment(); renderGanttSelect();
}

function renderDashboard() {
  document.getElementById('kpi-total').textContent = state.events.length;
  document.getElementById('kpi-active').textContent = state.events.filter(e => e.status === 'active').length;
  document.getElementById('kpi-venues').textContent = state.venues.length;
  document.getElementById('kpi-equipment').textContent = state.equipment.length;
  const recent = state.events.slice(0, 5);
  document.getElementById('recent-events').innerHTML = recent.length === 0
    ? '<div class="empty">אין אירועים. צור אירוע חדש בלשונית "אירועים".</div>'
    : recent.map(e => `
      <div class="list-item" onclick="openEvent(${e.id})">
        <div>
          <strong>${escapeHtml(e.name)}</strong>
          <div style="font-size:12px;color:var(--muted)">${e.start_date} - ${e.end_date} ${e.venue_name ? '· ' + escapeHtml(e.venue_name) : ''}</div>
        </div>
        <div>
          <span class="badge ${e.status}">${STATUS_LABELS[e.status]||e.status}</span>
          <span class="progress-bar"><div style="width:${e.progress||0}%"></div></span>
        </div>
      </div>`).join('');
}

function renderEvents() {
  const tbody = document.getElementById('events-tbody');
  if (state.events.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty">אין אירועים</td></tr>'; return; }
  tbody.innerHTML = state.events.map(e => `
    <tr class="clickable" onclick="openEvent(${e.id})">
      <td><strong>${escapeHtml(e.name)}</strong></td>
      <td>${e.start_date} <small style="color:var(--muted)">→ ${e.end_date}</small></td>
      <td>${escapeHtml(e.venue_name || '-')}</td>
      <td><span class="badge ${e.status}">${STATUS_LABELS[e.status]||e.status}</span></td>
      <td><span class="progress-bar"><div style="width:${e.progress||0}%"></div></span> ${e.progress||0}%</td>
      <td onclick="event.stopPropagation()">
        <button class="btn danger" onclick="deleteEvent(${e.id})">מחק</button>
      </td>
    </tr>`).join('');
}

function renderVenues() {
  document.getElementById('venues-grid').innerHTML = state.venues.length === 0
    ? '<div class="empty">אין אולמות</div>'
    : state.venues.map(v => `
      <div class="tile">
        <h3>${escapeHtml(v.name)}</h3>
        <div class="meta">
          ${v.address ? '📍 ' + escapeHtml(v.address) + '<br>' : ''}
          ${v.contact_name ? '👤 ' + escapeHtml(v.contact_name) + '<br>' : ''}
          ${v.contact_phone ? '📞 ' + escapeHtml(v.contact_phone) + '<br>' : ''}
          ${v.capacity ? 'קיבולת: ' + v.capacity + '<br>' : ''}
          ${v.restrictions ? '⚠️ הגבלות: ' + escapeHtml(v.restrictions) : ''}
        </div>
        <div style="margin-top:12px"><button class="btn danger" onclick="deleteVenue(${v.id})">מחק</button></div>
      </div>`).join('');
}

function renderEquipment() {
  const tbody = document.getElementById('equipment-tbody');
  tbody.innerHTML = state.equipment.length === 0
    ? '<tr><td colspan="6" class="empty">אין פריטי ציוד</td></tr>'
    : state.equipment.map(eq => `
      <tr>
        <td><strong>${escapeHtml(eq.name)}</strong></td>
        <td>${escapeHtml(eq.category||'-')}</td>
        <td>${eq.total_qty}</td>
        <td>₪${eq.unit_price.toFixed(2)}</td>
        <td>₪${eq.rental_price_per_day.toFixed(2)}</td>
        <td><button class="btn danger" onclick="deleteEquipment(${eq.id})">מחק</button></td>
      </tr>`).join('');
}

function renderGanttSelect() {
  const sel = document.getElementById('gantt-event-select');
  sel.innerHTML = state.events.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  if (state.events.length > 0 && !state.currentEventId) state.currentEventId = state.events[0].id;
  if (state.currentEventId) sel.value = state.currentEventId;
}

document.getElementById('gantt-event-select').addEventListener('change', e => {
  state.currentEventId = Number(e.target.value);
  refreshGantt();
});
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  if (state.gantt) state.gantt.change_view_mode(b.dataset.mode);
}));

async function refreshGantt() {
  const target = document.getElementById('gantt-target');
  if (!state.currentEventId) { target.innerHTML = '<div class="empty">בחר אירוע</div>'; return; }
  const ev = await api.get('/events/' + state.currentEventId);
  const tasks = (ev.tasks || []).filter(t => t.start_date && t.end_date).map(t => ({
    id: String(t.id),
    name: t.title,
    start: t.start_date,
    end: t.end_date,
    progress: t.done ? 100 : (t.progress || 0),
    dependencies: '',
    custom_class: t.done ? 'bar-done' : '',
  }));
  target.innerHTML = '';
  if (tasks.length === 0) { target.innerHTML = '<div class="empty">אין משימות עם תאריכים. הוסף משימה.</div>'; return; }
  state.gantt = new Gantt(target, tasks, {
    view_mode: 'Week',
    language: 'he',
    on_date_change: async (task, start, end) => {
      await api.put('/tasks/' + task.id, {
        start_date: start.toISOString().slice(0,10),
        end_date: end.toISOString().slice(0,10),
      });
      toast('המשימה עודכנה');
    },
    on_progress_change: async (task, progress) => {
      await api.put('/tasks/' + task.id, { progress: Math.round(progress) });
    },
    on_click: (task) => openEvent(state.currentEventId, 'checklist'),
  });
}

// === Buttons ===
document.getElementById('btn-new-event').addEventListener('click', () => openEventModal());
document.getElementById('btn-new-venue').addEventListener('click', () => openVenueModal());
document.getElementById('btn-new-equipment').addEventListener('click', () => openEquipmentModal());
document.getElementById('btn-add-task').addEventListener('click', () => state.currentEventId && openTaskModal(state.currentEventId));

// === Modals ===
function modal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
window.closeModal = closeModal;

function openEventModal(ev) {
  const e = ev || { name: '', description: '', start_date: '', end_date: '', status: 'planned', venue_id: '', client_name: '', client_phone: '', budget: 0 };
  modal(`
    <h2>${ev ? 'ערוך' : 'אירוע חדש'}</h2>
    <form class="form" onsubmit="saveEvent(event, ${ev?ev.id:'null'})">
      <div><label>שם האירוע</label><input name="name" value="${escapeAttr(e.name)}" required></div>
      <div><label>תיאור</label><textarea name="description" rows="2">${escapeHtml(e.description||'')}</textarea></div>
      <div class="row">
        <div><label>תאריך התחלה</label><input name="start_date" type="date" value="${e.start_date||''}" required></div>
        <div><label>תאריך סיום</label><input name="end_date" type="date" value="${e.end_date||''}" required></div>
      </div>
      <div class="row">
        <div><label>אולם</label>
          <select name="venue_id">
            <option value="">- ללא -</option>
            ${state.venues.map(v => `<option value="${v.id}" ${e.venue_id==v.id?'selected':''}>${escapeHtml(v.name)}</option>`).join('')}
          </select>
        </div>
        <div><label>סטטוס</label>
          <select name="status">
            ${Object.entries(STATUS_LABELS).map(([k,l]) => `<option value="${k}" ${e.status===k?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row">
        <div><label>לקוח</label><input name="client_name" value="${escapeAttr(e.client_name||'')}"></div>
        <div><label>טלפון לקוח</label><input name="client_phone" value="${escapeAttr(e.client_phone||'')}"></div>
      </div>
      <div><label>תקציב (₪)</label><input name="budget" type="number" step="0.01" value="${e.budget||0}"></div>
      <div class="actions">
        <button type="submit" class="btn primary">שמור</button>
        <button type="button" class="btn" onclick="closeModal()">ביטול</button>
      </div>
    </form>
  `);
}
window.openEventModal = openEventModal;

async function saveEvent(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  body.budget = Number(body.budget) || 0;
  body.venue_id = body.venue_id ? Number(body.venue_id) : null;
  if (id) await api.put('/events/' + id, body); else await api.post('/events', body);
  closeModal();
  toast(id ? 'אירוע עודכן' : 'אירוע נוצר');
  await loadAll();
}
window.saveEvent = saveEvent;

async function deleteEvent(id) {
  if (!confirm('למחוק אירוע?')) return;
  await api.del('/events/' + id);
  await loadAll();
  toast('אירוע נמחק');
}
window.deleteEvent = deleteEvent;

function openVenueModal() {
  modal(`
    <h2>אולם חדש</h2>
    <form class="form" onsubmit="saveVenue(event)">
      <div><label>שם</label><input name="name" required></div>
      <div><label>כתובת</label><input name="address"></div>
      <div class="row">
        <div><label>איש קשר</label><input name="contact_name"></div>
        <div><label>טלפון</label><input name="contact_phone"></div>
      </div>
      <div><label>אימייל</label><input name="contact_email" type="email"></div>
      <div class="row">
        <div><label>קיבולת</label><input name="capacity" type="number"></div>
      </div>
      <div><label>הגבלות</label><textarea name="restrictions" rows="2"></textarea></div>
      <div><label>הערות</label><textarea name="notes" rows="2"></textarea></div>
      <div class="actions">
        <button type="submit" class="btn primary">שמור</button>
        <button type="button" class="btn" onclick="closeModal()">ביטול</button>
      </div>
    </form>
  `);
}
window.openVenueModal = openVenueModal;

async function saveVenue(e) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  body.capacity = body.capacity ? Number(body.capacity) : null;
  await api.post('/venues', body);
  closeModal(); await loadAll(); toast('אולם נשמר');
}
window.saveVenue = saveVenue;

async function deleteVenue(id) {
  if (!confirm('למחוק אולם?')) return;
  await api.del('/venues/' + id); await loadAll(); toast('אולם נמחק');
}
window.deleteVenue = deleteVenue;

function openEquipmentModal() {
  modal(`
    <h2>פריט ציוד חדש</h2>
    <form class="form" onsubmit="saveEquipment(event)">
      <div><label>שם</label><input name="name" required></div>
      <div class="row">
        <div><label>קטגוריה</label><input name="category"></div>
        <div><label>כמות במלאי</label><input name="total_qty" type="number" value="1"></div>
      </div>
      <div class="row">
        <div><label>מחיר יחידה (₪)</label><input name="unit_price" type="number" step="0.01" value="0"></div>
        <div><label>מחיר יומי השכרה (₪)</label><input name="rental_price_per_day" type="number" step="0.01" value="0"></div>
      </div>
      <div><label>הערות</label><textarea name="notes" rows="2"></textarea></div>
      <div class="actions">
        <button type="submit" class="btn primary">שמור</button>
        <button type="button" class="btn" onclick="closeModal()">ביטול</button>
      </div>
    </form>
  `);
}
window.openEquipmentModal = openEquipmentModal;

async function saveEquipment(e) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  body.total_qty = Number(body.total_qty) || 1;
  body.unit_price = Number(body.unit_price) || 0;
  body.rental_price_per_day = Number(body.rental_price_per_day) || 0;
  await api.post('/equipment', body);
  closeModal(); await loadAll(); toast('פריט נשמר');
}
window.saveEquipment = saveEquipment;

async function deleteEquipment(id) {
  if (!confirm('למחוק פריט?')) return;
  await api.del('/equipment/' + id); await loadAll();
}
window.deleteEquipment = deleteEquipment;

function openTaskModal(eventId, parentId) {
  modal(`
    <h2>${parentId ? 'תת-משימה' : 'משימה חדשה'}</h2>
    <form class="form" onsubmit="saveTask(event, ${eventId}, ${parentId||'null'})">
      <div><label>כותרת</label><input name="title" required></div>
      <div><label>תיאור</label><textarea name="description" rows="2"></textarea></div>
      <div class="row">
        <div><label>תאריך התחלה</label><input name="start_date" type="date"></div>
        <div><label>תאריך סיום</label><input name="end_date" type="date"></div>
      </div>
      <div><label>אחראי</label><input name="assignee"></div>
      <div class="actions">
        <button type="submit" class="btn primary">שמור</button>
        <button type="button" class="btn" onclick="closeModal()">ביטול</button>
      </div>
    </form>
  `);
}
window.openTaskModal = openTaskModal;

async function saveTask(e, eventId, parentId) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  if (parentId) body.parent_id = parentId;
  await api.post('/events/' + eventId + '/tasks', body);
  closeModal(); toast('משימה נוצרה');
  if (state.currentEventId === eventId) refreshGantt();
  if (document.getElementById('event-drawer').classList.contains('open')) openEvent(eventId, 'checklist');
}
window.saveTask = saveTask;

// === Drawer ===
async function openEvent(id, dtab) {
  state.currentEventId = id;
  const ev = await api.get('/events/' + id);
  document.getElementById('drawer-title').textContent = ev.name;
  document.getElementById('event-drawer').classList.add('open');
  renderDrawer(ev);
  if (dtab) document.querySelector(`.dtab[data-dtab="${dtab}"]`).click();
}
window.openEvent = openEvent;

document.getElementById('drawer-close').addEventListener('click', () => {
  document.getElementById('event-drawer').classList.remove('open');
});
document.querySelectorAll('.dtab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.dtab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.dview').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById('d-' + t.dataset.dtab).classList.add('active');
}));

function renderDrawer(ev) {
  // Overview
  document.getElementById('d-overview').innerHTML = `
    <div class="form">
      <div><strong>תקופה:</strong> ${ev.start_date} → ${ev.end_date}</div>
      <div><strong>סטטוס:</strong>
        <select onchange="updateStatus(${ev.id}, this.value)">
          ${Object.entries(STATUS_LABELS).map(([k,l]) => `<option value="${k}" ${ev.status===k?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div><strong>אולם:</strong> ${ev.venue_name || '-'}</div>
      <div><strong>לקוח:</strong> ${escapeHtml(ev.client_name||'-')} ${ev.client_phone ? '('+escapeHtml(ev.client_phone)+')' : ''}</div>
      <div><strong>תקציב:</strong> ₪${(ev.budget||0).toLocaleString()}</div>
      <div><strong>התקדמות:</strong> ${ev.progress||0}% <span class="progress-bar"><div style="width:${ev.progress||0}%"></div></span></div>
      <div><strong>תיאור:</strong><br>${escapeHtml(ev.description||'-')}</div>
      <div class="actions"><button class="btn" onclick="openEventModal(${JSON.stringify(ev).replace(/"/g,'&quot;')})">ערוך פרטים</button></div>
    </div>`;

  // Checklist
  const tasks = ev.tasks || [];
  const tree = buildTree(tasks);
  document.getElementById('d-checklist').innerHTML = `
    <div class="checklist">${renderTree(tree, ev.id)}</div>
    <div class="add-row">
      <input id="quick-task" placeholder="הוסף משימה...">
      <button class="btn primary" onclick="quickAddTask(${ev.id})">+ הוסף</button>
    </div>`;

  // Staff
  document.getElementById('d-staff').innerHTML = `
    <div class="list">
      ${(ev.staff||[]).length === 0 ? '<div class="empty">אין אנשי צוות</div>' :
        ev.staff.map(s => `
          <div class="list-item">
            <div><strong>${escapeHtml(s.person_name)}</strong> <span style="color:var(--muted)">— ${escapeHtml(s.role)}</span>
              ${s.phone ? '<br><small>📞 '+escapeHtml(s.phone)+'</small>' : ''}
            </div>
            <button class="btn danger" onclick="removeStaff(${s.id}, ${ev.id})">הסר</button>
          </div>`).join('')}
    </div>
    <h3>הוסף איש צוות</h3>
    <form class="form" onsubmit="addStaff(event, ${ev.id})">
      <div class="row">
        <div><label>שם</label><input name="person_name" required></div>
        <div><label>תפקיד</label><input name="role" required></div>
      </div>
      <div class="row">
        <div><label>טלפון</label><input name="phone"></div>
        <div><label>אימייל</label><input name="email"></div>
      </div>
      <div><label>הערות</label><input name="notes"></div>
      <div class="actions"><button type="submit" class="btn primary">הוסף</button></div>
    </form>`;

  // Venue
  document.getElementById('d-venue').innerHTML = ev.venue ? `
    <h3>${escapeHtml(ev.venue.name)}</h3>
    <div class="form">
      <div>📍 ${escapeHtml(ev.venue.address||'-')}</div>
      <div>👤 ${escapeHtml(ev.venue.contact_name||'-')} 📞 ${escapeHtml(ev.venue.contact_phone||'-')}</div>
      <div>📧 ${escapeHtml(ev.venue.contact_email||'-')}</div>
      <div>קיבולת: ${ev.venue.capacity || '-'}</div>
      <div>⚠️ הגבלות: ${escapeHtml(ev.venue.restrictions||'-')}</div>
      <div>הערות: ${escapeHtml(ev.venue.notes||'-')}</div>
    </div>` : '<div class="empty">לא הוקצה אולם. ערוך את האירוע כדי לבחור.</div>';

  // Equipment
  document.getElementById('d-equipment').innerHTML = `
    <h3>תנועות ציוד</h3>
    ${(ev.equipment_movements||[]).length === 0 ? '<div class="empty">אין תנועות</div>' :
      '<div>' + ev.equipment_movements.map(m => `
        <div class="movement-row">
          <div><strong>${escapeHtml(m.equipment_name||'?')}</strong></div>
          <div>נשלח: ${m.qty_sent}</div>
          <div>הוחזר: ${m.qty_returned||0}</div>
          <div>${m.missing_qty > 0 ? '<span class="warning">חסר: '+m.missing_qty+'</span>' : '✓'}</div>
          <div>
            ${m.qty_returned == null || m.qty_returned === 0 ? `<button class="btn" onclick="returnEquipment(${m.id}, ${m.qty_sent}, ${ev.id})">החזר</button>` : ''}
          </div>
        </div>`).join('') + '</div>'}
    <h3>שלח ציוד חדש</h3>
    <form class="form" onsubmit="sendEquipment(event, ${ev.id})">
      <div class="row">
        <div><label>פריט</label>
          <select name="equipment_id" required>
            <option value="">- בחר -</option>
            ${state.equipment.map(eq => `<option value="${eq.id}">${escapeHtml(eq.name)}</option>`).join('')}
          </select>
        </div>
        <div><label>כמות</label><input name="qty_sent" type="number" min="1" value="1" required></div>
      </div>
      <div class="actions"><button type="submit" class="btn primary">שלח</button></div>
    </form>`;

  // Rentals
  const totalCharges = (ev.rentals||[]).reduce((s,r) => s + (r.total_charge||0), 0);
  document.getElementById('d-rental').innerHTML = `
    <h3>השכרות (סה"כ חיוב: ₪${totalCharges.toLocaleString()})</h3>
    ${(ev.rentals||[]).length === 0 ? '<div class="empty">אין השכרות</div>' :
      ev.rentals.map(r => `
        <div class="movement-row">
          <div><strong>${escapeHtml(r.equipment_name||'?')}</strong> ×${r.qty}</div>
          <div>${r.rental_start} → ${r.rental_end}</div>
          <div>₪${r.daily_price}/יום</div>
          <div><strong>₪${r.total_charge.toLocaleString()}</strong> ${r.charged ? '✓ חויב' : ''}</div>
          <div>
            <input placeholder="חשבונית" style="width:100px" value="${r.invoice_number||''}" onchange="setInvoice(${r.id}, this.value, ${ev.id})">
            <button class="btn danger" onclick="deleteRental(${r.id}, ${ev.id})">מחק</button>
          </div>
        </div>`).join('')}
    <h3>השכרה חדשה (חיוב אוטומטי)</h3>
    <form class="form" onsubmit="addRental(event, ${ev.id})">
      <div class="row">
        <div><label>פריט</label>
          <select name="equipment_id" required>
            <option value="">- בחר -</option>
            ${state.equipment.map(eq => `<option value="${eq.id}" data-price="${eq.rental_price_per_day}">${escapeHtml(eq.name)} (₪${eq.rental_price_per_day}/יום)</option>`).join('')}
          </select>
        </div>
        <div><label>כמות</label><input name="qty" type="number" min="1" value="1" required></div>
      </div>
      <div class="row">
        <div><label>מתאריך</label><input name="rental_start" type="date" required></div>
        <div><label>עד תאריך</label><input name="rental_end" type="date" required></div>
      </div>
      <div><label>מחיר יומי לדריסה (אופציונלי)</label><input name="daily_price" type="number" step="0.01" placeholder="ברירת מחדל: לפי הפריט"></div>
      <div class="actions"><button type="submit" class="btn primary">השכר וחייב</button></div>
    </form>`;

  // Debrief
  const d = ev.debrief || {};
  document.getElementById('d-debrief').innerHTML = `
    <form class="form" onsubmit="saveDebrief(event, ${ev.id})">
      <div><label>מה עבד טוב?</label><textarea name="what_worked" rows="3">${escapeHtml(d.what_worked||'')}</textarea></div>
      <div><label>מה נכשל / בעיות?</label><textarea name="what_failed" rows="3">${escapeHtml(d.what_failed||'')}</textarea></div>
      <div><label>שיפורים לפעם הבאה</label><textarea name="improvements" rows="3">${escapeHtml(d.improvements||'')}</textarea></div>
      <div><label>משוב מהלקוח</label><textarea name="client_feedback" rows="2">${escapeHtml(d.client_feedback||'')}</textarea></div>
      <div><label>דירוג (1-5)</label><input name="rating" type="number" min="1" max="5" value="${d.rating||''}"></div>
      <div class="actions"><button type="submit" class="btn primary">שמור Debrief</button></div>
    </form>`;
}

function buildTree(tasks) {
  const map = {}; const roots = [];
  tasks.forEach(t => { map[t.id] = { ...t, children: [] }; });
  tasks.forEach(t => {
    if (t.parent_id && map[t.parent_id]) map[t.parent_id].children.push(map[t.id]);
    else roots.push(map[t.id]);
  });
  return roots;
}

function renderTree(nodes, eventId, depth = 0) {
  return nodes.map(n => `
    <div class="checklist-item ${depth > 0 ? 'child' : ''} ${n.done ? 'done' : ''}">
      <input type="checkbox" ${n.done ? 'checked' : ''} onchange="toggleTask(${n.id}, ${eventId}, this.checked)">
      <div class="title">
        <strong>${escapeHtml(n.title)}</strong>
        ${n.children.length > 0 ? `<span class="meta"> (${n.children.filter(c=>c.done).length}/${n.children.length})</span>` : ''}
        ${n.assignee ? `<span class="meta"> · ${escapeHtml(n.assignee)}</span>` : ''}
        ${n.start_date ? `<span class="meta"> · ${n.start_date}→${n.end_date||''}</span>` : ''}
      </div>
      <button class="btn" onclick="openTaskModal(${eventId}, ${n.id})" title="תת-משימה">+</button>
      <button class="btn danger" onclick="deleteTask(${n.id}, ${eventId})">×</button>
    </div>
    ${n.children.length > 0 ? renderTree(n.children, eventId, depth+1) : ''}
  `).join('');
}

async function toggleTask(id, eventId, checked) {
  await api.put('/tasks/' + id, { done: checked ? 1 : 0, progress: checked ? 100 : 0 });
  openEvent(eventId, 'checklist');
  await loadAll();
}
window.toggleTask = toggleTask;

async function deleteTask(id, eventId) {
  if (!confirm('למחוק משימה?')) return;
  await api.del('/tasks/' + id);
  openEvent(eventId, 'checklist');
  await loadAll();
}
window.deleteTask = deleteTask;

async function quickAddTask(eventId) {
  const inp = document.getElementById('quick-task');
  if (!inp.value.trim()) return;
  await api.post('/events/' + eventId + '/tasks', { title: inp.value.trim() });
  inp.value = '';
  openEvent(eventId, 'checklist');
}
window.quickAddTask = quickAddTask;

async function updateStatus(id, status) {
  await api.patch('/events/' + id + '/status', { status });
  toast('סטטוס עודכן');
  await loadAll();
}
window.updateStatus = updateStatus;

async function addStaff(e, eventId) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  await api.post('/events/' + eventId + '/staff', body);
  openEvent(eventId, 'staff');
}
window.addStaff = addStaff;

async function removeStaff(id, eventId) {
  await api.del('/staff/' + id);
  openEvent(eventId, 'staff');
}
window.removeStaff = removeStaff;

async function sendEquipment(e, eventId) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  body.qty_sent = Number(body.qty_sent);
  body.equipment_id = Number(body.equipment_id);
  await api.post('/events/' + eventId + '/equipment-movement', body);
  openEvent(eventId, 'equipment');
  toast('ציוד נשלח');
}
window.sendEquipment = sendEquipment;

async function returnEquipment(movementId, sent, eventId) {
  const qty = prompt(`כמה הוחזר מתוך ${sent}?`, sent);
  if (qty == null) return;
  const damage = prompt('הערות נזק (אופציונלי)', '');
  await api.put('/equipment-movement/' + movementId + '/return', {
    qty_returned: Number(qty), damage_notes: damage || null,
  });
  openEvent(eventId, 'equipment');
  const missing = sent - Number(qty);
  toast(missing > 0 ? `הוחזר. חסרים: ${missing}` : 'הוחזר במלואו');
}
window.returnEquipment = returnEquipment;

async function addRental(e, eventId) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  body.qty = Number(body.qty);
  body.equipment_id = Number(body.equipment_id);
  if (body.daily_price === '') delete body.daily_price; else body.daily_price = Number(body.daily_price);
  const result = await api.post('/events/' + eventId + '/rental', body);
  toast('השכרה נוצרה. חויב ₪' + result.total_charge.toLocaleString());
  openEvent(eventId, 'rental');
}
window.addRental = addRental;

async function setInvoice(rentalId, invoice, eventId) {
  await api.put('/rental/' + rentalId + '/invoice', { invoice_number: invoice });
  toast('מספר חשבונית נשמר');
}
window.setInvoice = setInvoice;

async function deleteRental(id, eventId) {
  if (!confirm('למחוק השכרה?')) return;
  await api.del('/rental/' + id);
  openEvent(eventId, 'rental');
}
window.deleteRental = deleteRental;

async function saveDebrief(e, eventId) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  if (body.rating) body.rating = Number(body.rating);
  await api.post('/events/' + eventId + '/debrief', body);
  toast('Debrief נשמר');
}
window.saveDebrief = saveDebrief;

// === SSE - real-time ===
function connectSSE() {
  const es = new EventSource('/api/stream');
  const dot = document.getElementById('ws-dot');
  const text = document.getElementById('ws-text');
  es.onopen = () => { dot.classList.add('connected'); dot.classList.remove('disconnected'); text.textContent = 'מחובר בזמן אמת'; };
  es.onerror = () => { dot.classList.remove('connected'); dot.classList.add('disconnected'); text.textContent = 'מנותק'; };
  ['event:created','event:updated','event:deleted','event:status','event:progress',
   'task:created','task:updated','task:deleted',
   'venue:created','venue:updated','venue:deleted',
   'staff:created','staff:deleted',
   'equipment:sent','equipment:returned',
   'rental:charged','rental:invoiced','debrief:saved'].forEach(name => {
    es.addEventListener(name, (e) => {
      const data = JSON.parse(e.data);
      // refresh underlying lists; if drawer open and matches event, refresh
      loadAll();
      if (state.currentEventId && document.getElementById('event-drawer').classList.contains('open')) {
        // re-render but only if this update is relevant
      }
    });
  });
}

// === Utils ===
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// Boot
loadAll().then(() => connectSSE());
