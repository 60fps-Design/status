# 60fps Status

Status page for [60fps.design](https://60fps.design): **https://status.60fps.design**

## How it works

`.github/workflows/uptime.yml` runs every 5 minutes. `scripts/check.mjs` requests each URL in
`config.json`, records the status code and response time, and commits them to `data/`.
`index.html` renders `data/summary.json`.

A check is UP only if it answers in time and returns the status the config expects, so a 500
counts as down.

Hosted on GitHub, separate from the services it reports on, so it stays up when they do not.

## Notes

- No secrets. Only public health endpoints, so nothing here needs a token or a key.
- The workflow uses the built-in `GITHUB_TOKEN`, scoped to this repo.
- Response bodies are never recorded, only a status code and a duration.
- Samples are kept raw for 48h, then one row per day for 90 days.

## Adding a check

Add to `config.json`, public unauthenticated endpoints only:

```json
{ "id": "mcp", "name": "MCP API", "blurb": "mcp.60fps.design", "url": "https://…/health", "expect": 200 }
```

Run locally:

```bash
node scripts/check.mjs
```
