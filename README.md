# 60fps Status

**https://status.60fps.design**

Hosted on GitHub, separate from the services it checks.

`scripts/check.mjs` probes the URLs in `config.json` and records the status code and response time
to `data/`. `index.html` renders it.

Scheduled every 5 minutes, but GitHub throttles cron on shared runners, so real spacing is closer
to hourly. The page says "at least hourly" because that is what actually happens.
