# 60fps Status

**https://status.60fps.design**

Hosted on GitHub, separate from the services it checks.

`scripts/check.mjs` probes the URLs in `config.json` every 5 minutes and records the status code
and response time to `data/`. `index.html` renders it.
