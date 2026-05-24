const express = require('express');
const db = require('./db');
const { broadcast } = require('./sse');

const router = express.Router();

// ===== Helpers =====
function calcProgressForEvent(eventId) {
  const rows = db.prepare(`SELECT done FROM event_tasks WHERE event_id = ?`).all(eventId);
  if (rows.length === 0) return 0;
  const done = rows.filter(r => r.done === 1).length;
  return Math.round((done / rows.length) * 100);
}

function rollupTaskProgress(taskId) {
  const children = db.prepare(`SELECT id, done, progress FROM event_tasks WHERE parent_id = ?`).all(taskId);
  if (children.length === 0) return null;
  const sum = children.reduce((acc, c) => acc + (c.done === 1 ? 100 : (c.progress || 0)), 0);
  const avg = Math.round(sum / children.length);
  db.prepare(`UPDATE event_tasks SET progress = ?, done = ? WHERE id = ?`).run(avg, avg >= 100 ? 1 : 0, taskId);
  const parent = db.prepare(`SELECT parent_id FROM event_tasks WHERE id = ?`).get(taskId);
  if (parent && parent.parent_id) rollupTaskProgress(parent.parent_id);
  return avg;
}

// ===== Venues =====
router.get('/venues', (req, res) => {
  res.json(db.prepare('SELECT * FROM venues ORDER BY name').all());
});
router.post('/venues', (req, res) => {
  const { name, address, contact_name, contact_phone, contact_email, capacity, restrictions, notes } = req.body;
  const r = db.prepare(`INSERT INTO venues (name,address,contact_name,contact_phone,contact_email,capacity,restrictions,notes) VALUES (?,?,?,?,?,?,?,?)`)
    .run(name, address, contact_name, contact_phone, contact_email, capacity, restrictions, notes);
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(r.lastInsertRowid);
  broadcast('venue:created', venue);
  res.json(venue);
});
router.put('/venues/:id', (req, res) => {
  const { name, address, contact_name, contact_phone, contact_email, capacity, restrictions, notes } = req.body;
  db.prepare(`UPDATE venues SET name=?,address=?,contact_name=?,contact_phone=?,contact_email=?,capacity=?,restrictions=?,notes=? WHERE id=?`)
    .run(name, address, contact_name, contact_phone, contact_email, capacity, restrictions, notes, req.params.id);
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
  broadcast('venue:updated', venue);
  res.json(venue);
});
router.delete('/venues/:id', (req, res) => {
  db.prepare('DELETE FROM venues WHERE id = ?').run(req.params.id);
  broadcast('venue:deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

// ===== Events =====
router.get('/events', (req, res) => {
  const events = db.prepare(`
    SELECT e.*, v.name as venue_name FROM events e LEFT JOIN venues v ON v.id = e.venue_id
    ORDER BY e.start_date DESC
  `).all();
  for (const e of events) e.progress = calcProgressForEvent(e.id);
  res.json(events);
});

router.get('/events/:id', (req, res) => {
  const event = db.prepare(`SELECT e.*, v.name as venue_name FROM events e LEFT JOIN venues v ON v.id=e.venue_id WHERE e.id=?`).get(req.params.id);
  if (!event) return res.status(404).json({ error: 'not found' });
  event.progress = calcProgressForEvent(event.id);
  event.venue = event.venue_id ? db.prepare('SELECT * FROM venues WHERE id=?').get(event.venue_id) : null;
  event.tasks = db.prepare('SELECT * FROM event_tasks WHERE event_id=? ORDER BY sort_order, id').all(event.id);
  event.staff = db.prepare('SELECT * FROM staff_assignments WHERE event_id=?').all(event.id);
  event.equipment_movements = db.prepare(`
    SELECT em.*, eq.name as equipment_name, eq.unit_price FROM equipment_movements em
    LEFT JOIN equipment eq ON eq.id = em.equipment_id WHERE em.event_id=?`).all(event.id);
  event.rentals = db.prepare(`
    SELECT r.*, eq.name as equipment_name FROM equipment_rentals r
    LEFT JOIN equipment eq ON eq.id = r.equipment_id WHERE r.event_id=?`).all(event.id);
  event.debrief = db.prepare('SELECT * FROM debriefs WHERE event_id=?').get(event.id) || null;
  res.json(event);
});

router.post('/events', (req, res) => {
  const { name, description, start_date, end_date, status, venue_id, client_name, client_phone, budget } = req.body;
  const r = db.prepare(`INSERT INTO events (name,description,start_date,end_date,status,venue_id,client_name,client_phone,budget) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(name, description, start_date, end_date, status || 'planned', venue_id || null, client_name, client_phone, budget || 0);
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(r.lastInsertRowid);
  broadcast('event:created', event);
  res.json(event);
});

router.put('/events/:id', (req, res) => {
  const { name, description, start_date, end_date, status, venue_id, client_name, client_phone, budget } = req.body;
  db.prepare(`UPDATE events SET name=?,description=?,start_date=?,end_date=?,status=?,venue_id=?,client_name=?,client_phone=?,budget=? WHERE id=?`)
    .run(name, description, start_date, end_date, status, venue_id || null, client_name, client_phone, budget || 0, req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  broadcast('event:updated', event);
  res.json(event);
});

router.patch('/events/:id/status', (req, res) => {
  db.prepare('UPDATE events SET status=? WHERE id=?').run(req.body.status, req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  broadcast('event:status', event);
  res.json(event);
});

router.delete('/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  broadcast('event:deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

// ===== Tasks =====
router.get('/events/:id/tasks', (req, res) => {
  res.json(db.prepare('SELECT * FROM event_tasks WHERE event_id=? ORDER BY sort_order, id').all(req.params.id));
});

router.post('/events/:id/tasks', (req, res) => {
  const { title, description, start_date, end_date, parent_id, assignee, sort_order } = req.body;
  const r = db.prepare(`INSERT INTO event_tasks (event_id,parent_id,title,description,start_date,end_date,assignee,sort_order) VALUES (?,?,?,?,?,?,?,?)`)
    .run(req.params.id, parent_id || null, title, description, start_date, end_date, assignee, sort_order || 0);
  const task = db.prepare('SELECT * FROM event_tasks WHERE id=?').get(r.lastInsertRowid);
  if (parent_id) rollupTaskProgress(parent_id);
  broadcast('task:created', task);
  res.json(task);
});

router.put('/tasks/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM event_tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  const { title, description, start_date, end_date, progress, done, assignee } = req.body;
  db.prepare(`UPDATE event_tasks SET title=?,description=?,start_date=?,end_date=?,progress=?,done=?,assignee=? WHERE id=?`)
    .run(
      title ?? t.title,
      description ?? t.description,
      start_date ?? t.start_date,
      end_date ?? t.end_date,
      progress ?? t.progress,
      done ?? t.done,
      assignee ?? t.assignee,
      req.params.id
    );
  const updated = db.prepare('SELECT * FROM event_tasks WHERE id=?').get(req.params.id);
  if (updated.parent_id) rollupTaskProgress(updated.parent_id);
  broadcast('task:updated', updated);
  // event progress changed
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(updated.event_id);
  if (ev) {
    ev.progress = calcProgressForEvent(ev.id);
    broadcast('event:progress', { id: ev.id, progress: ev.progress });
  }
  res.json(updated);
});

router.delete('/tasks/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM event_tasks WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM event_tasks WHERE id=?').run(req.params.id);
  if (t && t.parent_id) rollupTaskProgress(t.parent_id);
  broadcast('task:deleted', { id: Number(req.params.id), event_id: t ? t.event_id : null });
  res.json({ ok: true });
});

// ===== Staff =====
router.post('/events/:id/staff', (req, res) => {
  const { person_name, role, phone, email, notes } = req.body;
  const r = db.prepare(`INSERT INTO staff_assignments (event_id,person_name,role,phone,email,notes) VALUES (?,?,?,?,?,?)`)
    .run(req.params.id, person_name, role, phone, email, notes);
  const s = db.prepare('SELECT * FROM staff_assignments WHERE id=?').get(r.lastInsertRowid);
  broadcast('staff:created', s);
  res.json(s);
});
router.delete('/staff/:id', (req, res) => {
  db.prepare('DELETE FROM staff_assignments WHERE id=?').run(req.params.id);
  broadcast('staff:deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

// ===== Equipment Catalog =====
router.get('/equipment', (req, res) => {
  res.json(db.prepare('SELECT * FROM equipment ORDER BY name').all());
});
router.post('/equipment', (req, res) => {
  const { name, category, total_qty, unit_price, rental_price_per_day, notes } = req.body;
  const r = db.prepare(`INSERT INTO equipment (name,category,total_qty,unit_price,rental_price_per_day,notes) VALUES (?,?,?,?,?,?)`)
    .run(name, category, total_qty || 1, unit_price || 0, rental_price_per_day || 0, notes);
  res.json(db.prepare('SELECT * FROM equipment WHERE id=?').get(r.lastInsertRowid));
});
router.delete('/equipment/:id', (req, res) => {
  db.prepare('DELETE FROM equipment WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ===== Equipment Movements (sent / returned / missing) =====
router.post('/events/:id/equipment-movement', (req, res) => {
  const { equipment_id, qty_sent, sent_at } = req.body;
  const r = db.prepare(`INSERT INTO equipment_movements (event_id,equipment_id,qty_sent,sent_at) VALUES (?,?,?,?)`)
    .run(req.params.id, equipment_id, qty_sent || 0, sent_at || new Date().toISOString());
  const m = db.prepare('SELECT * FROM equipment_movements WHERE id=?').get(r.lastInsertRowid);
  broadcast('equipment:sent', m);
  res.json(m);
});

router.put('/equipment-movement/:id/return', (req, res) => {
  const { qty_returned, returned_at, damage_notes } = req.body;
  const m = db.prepare('SELECT * FROM equipment_movements WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not found' });
  const missing = Math.max(0, (m.qty_sent || 0) - (qty_returned || 0));
  db.prepare(`UPDATE equipment_movements SET qty_returned=?,returned_at=?,missing_qty=?,damage_notes=? WHERE id=?`)
    .run(qty_returned, returned_at || new Date().toISOString(), missing, damage_notes, req.params.id);
  const updated = db.prepare('SELECT * FROM equipment_movements WHERE id=?').get(req.params.id);
  broadcast('equipment:returned', updated);
  res.json(updated);
});

// ===== Rentals (with auto-charge) =====
router.post('/events/:id/rental', (req, res) => {
  const { equipment_id, qty, rental_start, rental_end, daily_price, notes } = req.body;
  const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(equipment_id);
  const dp = daily_price != null ? daily_price : (eq ? eq.rental_price_per_day : 0);
  const days = Math.max(1, Math.ceil((new Date(rental_end) - new Date(rental_start)) / (1000 * 60 * 60 * 24)));
  const total = days * dp * (qty || 1);
  const r = db.prepare(`INSERT INTO equipment_rentals (event_id,equipment_id,qty,rental_start,rental_end,daily_price,total_charge,charged,notes) VALUES (?,?,?,?,?,?,?,1,?)`)
    .run(req.params.id, equipment_id, qty || 1, rental_start, rental_end, dp, total, notes);
  const rental = db.prepare('SELECT * FROM equipment_rentals WHERE id=?').get(r.lastInsertRowid);
  // auto-bump event budget impact (informational broadcast)
  broadcast('rental:charged', { rental, total });
  res.json(rental);
});

router.put('/rental/:id/invoice', (req, res) => {
  const { invoice_number } = req.body;
  db.prepare('UPDATE equipment_rentals SET invoice_number=? WHERE id=?').run(invoice_number, req.params.id);
  const r = db.prepare('SELECT * FROM equipment_rentals WHERE id=?').get(req.params.id);
  broadcast('rental:invoiced', r);
  res.json(r);
});

router.delete('/rental/:id', (req, res) => {
  db.prepare('DELETE FROM equipment_rentals WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ===== Debrief =====
router.post('/events/:id/debrief', (req, res) => {
  const { what_worked, what_failed, improvements, client_feedback, rating } = req.body;
  const existing = db.prepare('SELECT * FROM debriefs WHERE event_id=?').get(req.params.id);
  if (existing) {
    db.prepare(`UPDATE debriefs SET what_worked=?,what_failed=?,improvements=?,client_feedback=?,rating=? WHERE event_id=?`)
      .run(what_worked, what_failed, improvements, client_feedback, rating, req.params.id);
  } else {
    db.prepare(`INSERT INTO debriefs (event_id,what_worked,what_failed,improvements,client_feedback,rating) VALUES (?,?,?,?,?,?)`)
      .run(req.params.id, what_worked, what_failed, improvements, client_feedback, rating);
  }
  const d = db.prepare('SELECT * FROM debriefs WHERE event_id=?').get(req.params.id);
  broadcast('debrief:saved', d);
  res.json(d);
});

module.exports = router;
