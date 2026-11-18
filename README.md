# The God's Tool: website and app (frontend)

React 19 + Vite. One build serves two addresses: the public site (thegodstool.com) and the app (app.thegodstool.com). `src/hosts.ts` decides which one a visitor is on and redirects paths to the right place.

## Run it
```
npm install
npm run dev      # local
npm run build    # production build into dist/ (also writes the static pages, see below)
npx serve -s dist
```

## Settings
`VITE_API_URL` (Python service) and `VITE_AUTH_URL` (Node service), read in `src/config.ts`.

## Folders
| Path | What is in it |
| --- | --- |
| `src/main.tsx` | Entry. Host redirect, upgrade prompts, status bar, support chat. |
| `src/App.tsx` | Landing page, login modal and the signed-in app shell. Section map at the top. |
| `src/pages/` | One file per app screen (Flow, Analysis, Data Sources, Pricing, ...). |
| `src/components/` | Shared pieces: Sidebar, ChatWidget, StatusBanner, ... |
| `src/home/` | Homepage sections, price calculator and the words in `content.json`. |
| `src/updates.json` | The "What's new" list shown to signed-in people and read by the support chat. |
| `src/blog/` | Blog posts (`posts.ts`) and how they are drawn. |
| `scripts/` | Build steps that write static pages for search engines. |
| `*.html` at the top | Static pages (about, faq, guides, privacy, terms) that must work without JavaScript. |

## What the build does
`npm run build` compiles the app, copies the static pages, then runs `try-static.mjs` (the /try.html page), `build-knowledge.mjs` (the text the support chat answers from), `home-static.mjs` (static homepage) and `blog-feeds.mjs` (sitemap and RSS).

## Related notes
`UPDATES_HOWTO.md` (how to post a "What's new" update), `STATUS_HOWTO.md` (how to post a status update), `llms.txt` and `sitemap.xml` (for AI and search engines).

## Code style
Prettier, settings in `.prettierrc.json`: `npx prettier --write "src/**/*.{ts,tsx,css}"`.
