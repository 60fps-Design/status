# 60fps status

Public status page for [60fps.design](https://60fps.design): **https://status.60fps.design**

Live at a glance for the MCP API, PRO accounts and the website, with 90 days of uptime history.

## Why this repo is separate

A status page must not run on the servers it reports on, or it goes down exactly when it is needed.

On 2026-07-24 every route on the MCP function returned HTTP 500 for about four hours, while the
static site kept returning 200. A `mcp.60fps.design/status` path would have been dead for the whole
incident. So the checks run on GitHub Actions and the page is served by GitHub Pages, which have
nothing to do with the hosting that runs 60fps.

This is the same reasoning behind `githubstatus.com` and `status.stripe.com`.

## How it works

1. `.github/workflows/uptime.yml` runs every 5 minutes.
2. `scripts/check.mjs` requests each URL in `config.json` and records **only** the HTTP status code
   and the response time.
3. Results are committed to `data/`, and `index.html` renders `data/summary.json`.

A check is UP only if it answers in time **and** returns the exact status code the config expects.
"Answered, but with a 500" counts as down, which is the case that actually mattered.

## Security

This repo is public, so it is built to hold nothing worth stealing.

- **No secrets.** Only public, unauthenticated health endpoints are probed. There is no licence key,
  no API token and no credential anywhere in this repo, and none is needed.
- **No account-wide token.** The workflow uses the built-in `GITHUB_TOKEN` with `contents: write`,
  scoped to this repository alone. Off-the-shelf status tools typically ask for a classic personal
  access token, which would grant access to every repo on the account if it ever leaked.
- **No response bodies are ever recorded.** Only a status code and a duration. If a service starts
  returning an internal error message or a stack trace, that text cannot reach this public page.
- **Nothing to attack at runtime.** The published page is static: no server, no database, no login,
  no user input. The only write path is this repo, protected by GitHub's own permissions.

## Adding or changing a check

Edit `config.json`:

```json
{ "id": "mcp", "name": "MCP API", "blurb": "what users see", "url": "https://…/health", "expect": 200 }
```

Only add endpoints that are safe to be public and need no authentication.

Run it locally with:

```bash
node scripts/check.mjs
```

## Data retention

Individual samples are kept for 48 hours, then collapsed into one row per day, kept for 90 days.
The repo stays small no matter how long this runs.
