# What's new: how to post an update

Signed-in people see a "What's new since you were last here" card on the Dashboard. It lists every entry in `src/updates.json` that is newer than the last time they saw updates (the Node service keeps that one date per person). The full list is at `/whats-new`.
The support chat reads the same file, so it can tell people what changed.

## Add an update
Edit `src/updates.json` on GitHub (pencil icon), add an entry at the top of the list, open a PR and merge it. Railway redeploys in about 2 minutes.

```json
{
  "id": "short-unique-name",
  "date": "2026-11-20T09:00:00Z",
  "title": "Plain, short title",
  "text": "What changed, in one or two sentences.",
  "youCan": "What the person can do about it now.",
  "link": "/flow",
  "linkLabel": "Open Pipeline Flow"
}
```

- `date` is UTC and must be the time you publish (people who visited before it will see the entry; people who visited after will not).
- `link` is a page in the app (`/flow`, `/sources`, `/docs`, `/billing`...) or a full address. `link` and `linkLabel` are optional.
- Write only what is true and shipped. Say what it does for the person, not how it was built.

## Good to know
- Someone who has never had a date saved (a new account, or everyone on the first day this goes live) sees nothing and starts counting from then.
- The card shows the newest 4 and links to the rest. People who were away 7 days or more also get a "you were away" line.
- "Got it" marks the updates as seen. Closing the tab without it means the card shows again next time.
