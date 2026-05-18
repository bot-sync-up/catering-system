/**
 * סנכרון בין Prometheus ל-Statping.
 *
 * כל POLL_INTERVAL שניות:
 *   1. שואלים את Prometheus על כל component שמוגדר ב-config.yml.
 *   2. ממפים תוצאה ל-status (operational/degraded/outage).
 *   3. מעדכנים את Statping דרך ה-API.
 */

const fs = require("node:fs");
const yaml = require("js-yaml");

const PROM = process.env.PROMETHEUS_URL || "http://prometheus:9090";
const STATPING = process.env.STATPING_URL || "http://statping:8080";
const API_KEY = process.env.STATPING_API_KEY || "";
const POLL_MS = (Number(process.env.POLL_INTERVAL) || 60) * 1000;

function loadConfig() {
  const raw = fs.readFileSync("/app/config.yml", "utf8");
  return yaml.load(raw);
}

async function queryProm(query) {
  const url = `${PROM}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "success") return null;
  const result = data.data.result?.[0];
  return result ? Number(result.value[1]) : null;
}

async function checkComponent(comp) {
  let value;

  if (comp.prometheus_query) {
    value = await queryProm(comp.prometheus_query);
  } else if (comp.prometheus_job) {
    value = await queryProm(`up{job="${comp.prometheus_job}"}`);
  } else if (comp.endpoint_check) {
    try {
      const res = await fetch(comp.endpoint_check, {
        signal: AbortSignal.timeout(5000),
      });
      value = res.ok ? 1 : 0;
    } catch {
      value = 0;
    }
  }

  if (value === null || value === undefined) return "unknown";

  const t = comp.thresholds || { operational: 1, degraded: 0.9, outage: 0.5 };
  if (value >= t.operational) return "operational";
  if (value >= t.degraded) return "performance_issues";
  if (value >= t.outage) return "partial_outage";
  return "major_outage";
}

async function updateStatping(slug, status) {
  await fetch(`${STATPING}/api/services/${slug}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ status }),
  }).catch((err) => console.error("statping update failed", slug, err.message));
}

async function tick() {
  const cfg = loadConfig();
  for (const group of cfg.component_groups || []) {
    for (const comp of group.components || []) {
      const status = await checkComponent(comp);
      console.log(`[sync] ${comp.slug} → ${status}`);
      await updateStatping(comp.slug, status);
    }
  }
}

setInterval(() => {
  tick().catch((err) => console.error("tick failed", err));
}, POLL_MS);

tick().catch((err) => console.error("initial tick failed", err));
