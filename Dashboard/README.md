# Dashboard — The Hosted Pages

Three plain browser pages built from the design system, each folded into a single HTML file and published as a claude.ai artifact. None is the Electron app: `vite build` runs here on its own (`build:dashboard` from the root), not through `electron-vite`.

## Pommora Dashboard

`dashboard.html` → the line ledger: real code lines per system, day by day, over the branch's history. It reads `Ledger/loc-history.json` from the artifact's database (`ledger/history`) and follows it live, so a data refresh is a document write rather than a rebuild; the dev server imports the file directly. `.claude/scripts/loc.py` writes that file and the versioned post-commit hook runs it after every commit. The include menu folds import and export lines, comment lines, and test lines in or out of the chart and the table.

Published at https://claude.ai/code/artifact/7840fc59-41d5-4692-b5b6-c45de4d11401.

## Pommora Showcase

`showcase.html` → the design system, live: color tokens, the type ramp, icons, glass materials, buttons, and components, with a sidebar on desktop and a top-right menu on mobile.

Published at https://claude.ai/code/artifact/684b7af1-55b2-49cf-b2fa-1b3a6b15dd9c.

## Pommora Audit

`audit.html` → the codebase audit ledger. It fetches `audit.md`, published beside it, and renders `.claude/Planning/Pommora Codebase Audit.md` as one scrolling page: a summary strip, the document in reading order with each workstream and ride-along area collapsible, an area-by-lens heatmap, and a filterable search over every finding, with every total computed from the ledger. Republishing the ledger file is the whole update.

Published at https://claude.ai/artifact/1uvUvsHz3f3dABn7dUn9dd.

## Building

`npm run dashboard` serves the pages at `/dashboard.html`, `/showcase.html`, and `/audit.html`. `npm run build:dashboard` builds them one after the other into `dist/` — `vite-plugin-singlefile` inlines each page's script, stylesheet, fonts, and images, so each output is one file. The pages build one at a time because the plugin inlines every chunk into a single entry; the Vite mode names which page.

## Publishing

The pages are published as Claude artifacts by hand from a session, whenever a session chooses to.

## Assets

Glass-stage photos live in `Surfaces/` and are imported by `Leaves/GlassLeaf.tsx`; the single-file build inlines them.
