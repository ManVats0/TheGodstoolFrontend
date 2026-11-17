# Status page: how it works and how to post an update

The status page lives at `/status` (linked in the footer and from the alert bar). It uses no database and costs nothing extra.

## Two sources

1. **Live check (automatic).** Every visitor's browser asks the sign-in service (`/api/health`) and the data cleaning engine (`/`) once a minute.
   If one fails twice in a row, a bar appears at the bottom of the screen: "Some of our services are not answering right now" with a **Check status** link.
   This runs only on thegodstool.com and app.thegodstool.com. Nothing is stored. If the visitor's own internet is down it can be wrong, which is why two failures are needed.
2. **`status.json` (by hand).** Put what is happening in this file so people see your words, not only a red dot.

## Post an update (during a problem)

Edit `status.json` on GitHub (pencil icon), commit to a new branch, open a PR and merge it. Railway redeploys the frontend in about 2 minutes, then the bar and the page show it.
The frontend is a separate service from the backends, so this works even when the backends are down.

```json
{
  "state": "degraded",
  "message": "Uploads are slow. We are looking into it.",
  "updated": "2026-11-17T09:00:00Z",
  "incidents": [
    {
      "title": "Slow uploads",
      "status": "investigating",
      "started": "2026-11-17T08:30:00Z",
      "updates": [
        { "time": "2026-11-17T08:35:00Z", "text": "We can see slow uploads." },
        { "time": "2026-11-17T09:00:00Z", "text": "We found the cause and are fixing it." }
      ]
    }
  ]
}
```

- `state`: `operational`, `maintenance`, `degraded` or `outage`. Anything other than `operational` shows the bar.
- `status` of an incident: `investigating`, `identified`, `monitoring` or `resolved`.
- Times are UTC in the form `2026-11-17T09:00:00Z`. Add new updates at the end of `updates`; the page shows the newest first.

## When it is fixed

Set `"state": "operational"`, `"message": ""`, and change the incident `status` to `resolved` with a last update. Keep it in the list as history.

## Limits

- The live check shows only "answering" or "not answering". It cannot see a feature that is broken while the service still answers; that needs a manual update.
- Updates need a merge and a redeploy (about 2 minutes). If the frontend itself is down, the page is down too. A free outside monitor such as UptimeRobot (email or phone alerts to you) covers that case.
- Nothing here emails or messages visitors. It only shows on the site.
