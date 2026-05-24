// API: גיאופנסינג - הגדרת אזורים, webhooks
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/schema');

const router = express.Router();

router.get('/', (req, res) => {
  const list = db.prepare('SELECT * FROM geofences ORDER BY name').all();
  res.json({ ok: true, data: list });
});

router.post('/', (req, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ ok: false, error: 'שם חובה' });

  const id = uuidv4();
  const type = b.type || 'circle';

  if (type === 'circle' && (b.center_lat == null || b.center_lng == null || !b.radius_meters)) {
    return res.status(400).json({ ok: false, error: 'עיגול דורש center_lat, center_lng, radius_meters' });
  }
  if (type === 'polygon' && (!b.polygon || b.polygon.length < 3)) {
    return res.status(400).json({ ok: false, error: 'פוליגון דורש לפחות 3 נקודות' });
  }

  db.prepare(`
    INSERT INTO geofences (id, name, type, center_lat, center_lng, radius_meters,
      polygon_json, trigger_event, webhook_url, active)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, b.name, type,
    b.center_lat || null, b.center_lng || null, b.radius_meters || null,
    b.polygon ? JSON.stringify(b.polygon) : null,
    b.trigger_event || 'both',
    b.webhook_url || null,
    b.active != null ? (b.active ? 1 : 0) : 1
  );

  res.status(201).json({ ok: true, data: db.prepare('SELECT * FROM geofences WHERE id = ?').get(id) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM geofences WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.put('/:id', (req, res) => {
  const f = db.prepare('SELECT * FROM geofences WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ ok: false, error: 'אזור לא נמצא' });

  const fields = ['name', 'center_lat', 'center_lng', 'radius_meters', 'trigger_event', 'webhook_url', 'active'];
  const updates = [], params = [];
  for (const k of fields) {
    if (req.body[k] !== undefined) {
      updates.push(`${k} = ?`);
      params.push(k === 'active' ? (req.body[k] ? 1 : 0) : req.body[k]);
    }
  }
  if (req.body.polygon) {
    updates.push('polygon_json = ?');
    params.push(JSON.stringify(req.body.polygon));
  }
  if (updates.length === 0) return res.json({ ok: true, data: f });
  params.push(req.params.id);
  db.prepare(`UPDATE geofences SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true, data: db.prepare('SELECT * FROM geofences WHERE id = ?').get(req.params.id) });
});

module.exports = router;
