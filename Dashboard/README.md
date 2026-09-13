# Dashboard — The Two Hosted Pages

Two plain browser pages built from the design system, each folded into a single HTML file and published as a claude.ai artifact. Neither is the Electron app: `vite build` runs here on its own (`build:dashboard` from the root), not through `electron-vite`.

## Pommora Dashboard

`dashboard.html` → the line ledger: real code lines per system, day by day, over the branch's history. It imports `Ledger/loc-history.json` at build time, so a data refresh is a rebuild; `.claude/scripts/loc.py` writes that file and the versioned post-commit hook runs both steps after every commit. The include menu folds import and export lines, comment lines, and test lines in or out of the chart and the table.

Published at https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401.

## Pommora Showcase

`showcase.html` → the design system, live: color tokens, the type ramp, icons, buttons, components, glass materials, and the pane replicas, with a sidebar on desktop and a top-right menu on mobile.

Published at https://claude.ai/code/artifact/684b7af1-55b2-49cf-b2fa-1b3a6b15dd9c.

## Building

`npm run dashboard` serves both pages at `/dashboard.html` and `/showcase.html`. `npm run build:dashboard` builds them one after the other into `dist/` — `vite-plugin-singlefile` inlines each page's script, stylesheet, fonts, and images, so each output is one file. The pages build one at a time because the plugin inlines every chunk into a single entry; the Vite mode names which page.

## Publishing

No shell hook can reach the artifact publish API, so republishing is the session's step: `.claude/hooks/republish-dashboard.mjs` compares each build against the hash recorded at its last republish and asks Claude to republish the pages that moved. Commits made outside a session leave the artifacts to the next one.

## Assets

Glass-stage photos live in `Surfaces/` and are imported by `Leaves/GlassLeaf.tsx`; the single-file build inlines them.
