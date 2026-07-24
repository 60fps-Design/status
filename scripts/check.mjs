/**
 * Uptime probe. Runs in GitHub Actions on a schedule, writes results back into this repo.
 *
 * Design constraints, in priority order:
 *   1. NOTHING SENSITIVE IS EVER PUBLISHED. We record the HTTP status code and the response time.
 *      We never record, log or commit a response body, a header or a URL query. If an endpoint
 *      starts returning an internal error message, that message does not end up on a public page.
 *   2. NO SECRETS. Only unauthenticated health endpoints are probed, so this repo needs no token,
 *      no licence key and no credentials of any kind. Nothing here is worth stealing.
 *   3. NO UNBOUNDED GROWTH. Raw samples are kept for 48h; older samples collapse into one row per
 *      day per check, kept for 90 days. The repo stays small however long this runs.
 *
 * A check counts as UP only when it answers within the timeout AND returns the exact status the
 * config expects. "Answered, but with a 500" is DOWN, which is the case that mattered on
 * 2026-07-24: the site returned 200 while the API returned 500.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const TIMEOUT_MS = 15_000;
const RAW_RETENTION_MS = 48 * 60 * 60 * 1000; // keep individual samples for 48h
const DAILY_RETENTION_DAYS = 90; // then one aggregated row per day for 90 days

const config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8"));
const HISTORY_PATH = new URL("../data/history.json", import.meta.url);
const SUMMARY_PATH = new URL("../data/summary.json", import.meta.url);

/** Probe one endpoint. Never throws, and never returns anything derived from the response body. */
async function probe(check) {
  const started = Date.now();
  try {
    const res = await fetch(check.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "60fps-Status/1.0 (+https://status.60fps.design)" },
    });
    return { ok: res.status === check.expect, status: res.status, ms: Date.now() - started };
  } catch {
    // Timeout, DNS failure, connection refused. Deliberately no error text: it can contain the
    // host's internal detail, and this file is public.
    return { ok: false, status: 0, ms: Date.now() - started };
  }
}

const now = Date.now();
const day = (t) => new Date(t).toISOString().slice(0, 10);

const history = existsSync(HISTORY_PATH) ? JSON.parse(readFileSync(HISTORY_PATH, "utf8")) : {};

for (const check of config.checks) {
  const result = await probe(check);
  const entry = (history[check.id] ??= { raw: [], daily: {} });

  entry.raw.push({ t: now, ok: result.ok, status: result.status, ms: result.ms });

  // Roll anything past the raw window into per-day counters, then drop it.
  const cutoff = now - RAW_RETENTION_MS;
  const keep = [];
  for (const sample of entry.raw) {
    if (sample.t >= cutoff) {
      keep.push(sample);
      continue;
    }
    const d = (entry.daily[day(sample.t)] ??= { up: 0, total: 0, msSum: 0 });
    d.total++;
    d.msSum += sample.ms;
    if (sample.ok) d.up++;
  }
  entry.raw = keep;

  // Trim old daily rows.
  const oldestDay = day(now - DAILY_RETENTION_DAYS * 86_400_000);
  for (const d of Object.keys(entry.daily)) if (d < oldestDay) delete entry.daily[d];

  console.log(`${check.id.padEnd(6)} ${result.ok ? "up  " : "DOWN"} status=${result.status} ${result.ms}ms`);
}

/** Uptime percentage over a trailing window, blending aggregated days with recent raw samples. */
function uptimePct(entry, windowMs) {
  const cutoff = now - windowMs;
  let up = 0;
  let total = 0;
  for (const [d, v] of Object.entries(entry.daily)) {
    if (Date.parse(`${d}T23:59:59Z`) < cutoff) continue;
    up += v.up;
    total += v.total;
  }
  for (const s of entry.raw) {
    if (s.t < cutoff) continue;
    total++;
    if (s.ok) up++;
  }
  return total ? (up / total) * 100 : null;
}

// summary.json is what the page renders. Keeping it precomputed means the page stays a dumb static
// file with no logic that could disagree with the data.
const summary = {
  generated: now,
  checks: config.checks.map((check) => {
    const entry = history[check.id];
    const latest = entry.raw[entry.raw.length - 1];
    const recent = entry.raw.slice(-24);
    return {
      id: check.id,
      name: check.name,
      blurb: check.blurb,
      up: latest.ok,
      ms: latest.ms,
      uptime24h: uptimePct(entry, 86_400_000),
      uptime7d: uptimePct(entry, 7 * 86_400_000),
      uptime90d: uptimePct(entry, 90 * 86_400_000),
      spark: recent.map((s) => ({ ok: s.ok, ms: s.ms })),
      // 90 day strip, oldest first. null = no data that day (before monitoring started).
      days: Array.from({ length: 90 }, (_, i) => {
        const d = day(now - (89 - i) * 86_400_000);
        const agg = entry.daily[d];
        const raws = entry.raw.filter((s) => day(s.t) === d);
        const up = (agg?.up ?? 0) + raws.filter((s) => s.ok).length;
        const total = (agg?.total ?? 0) + raws.length;
        return { d, pct: total ? (up / total) * 100 : null };
      }),
    };
  }),
};
summary.allUp = summary.checks.every((c) => c.up);

writeFileSync(HISTORY_PATH, JSON.stringify(history));
writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
console.log(`\nall up: ${summary.allUp}`);
