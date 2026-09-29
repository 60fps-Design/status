# 60fps Status

**https://status.60fps.design**

Hosted on GitHub, separate from the services it checks.

`scripts/check.mjs` probes the URLs in `config.json` and records the status code and response time
to `data/`. `index.html` renders it.

Scheduled every 5 minutes, but GitHub throttles cron on shared runners, so real spacing is closer
to hourly. The page says "at least hourly" because that is what actually happens.

## What "up" means (2026-09-29)

On 2026-09-28 the database behind MCP sign-in and PRO login was paused for 5h18m, and this page stayed
green: it probed a shallow `/health` that never touched the database. Now:

- **MCP API** probes `https://mcp.60fps.design/health?deep=1`, which pings the database and returns 503
  when it fails.
- **PRO accounts** is up only if `pro.60fps.design/health` AND the database check both answer (a check can
  list extra `require` URLs in `config.json`), because PRO accounts and sessions live in that database.
- **Known incidents** in `config.json` count as downtime on top of what the probes saw, and are listed
  under "Past incidents" for 90 days. An outage the probes missed is still an outage.
