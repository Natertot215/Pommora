# Dashboard — The Hosted Site

Pommora Dashboard is one plain browser page built from the design system and deployed by Vercel from the `active` branch. It isn't the Electron app: `vite build` runs here on its own (`build:dashboard` from the root), not through `electron-vite`.

A glass menu at the top left switches between its two views, the Dashboard and the Showcase; the address hash names a Showcase leaf, and an empty hash is the Dashboard.

## Dashboard

The line ledger with the codebase audit below it.

- **Line ledger:** real code lines per system, day by day, over the branch's history, read from `Ledger/loc-history.json` at build time. `.claude/scripts/loc.py` writes that file from the versioned pre-commit hook, so every commit carries the numbers measured from its own tree. The include menu folds import and export lines, comment lines, and test lines in or out of the chart and the table.
- **Codebase audit:** renders `Audit/audit.md`, the copy of `.claude/Planning/Pommora Codebase Audit.md` the pre-commit hook carries into each commit: a summary strip, the document in reading order with each workstream and ride-along area collapsible, an area-by-lens heatmap, and a filterable search over every finding, with every total computed from the ledger.

## Showcase

The design system, live: color tokens, the type ramp, icons, glass materials, buttons, and components, with a glass leaf menu at the top right.

## Building

`npm run dashboard` serves the page, and `npm run build:dashboard` builds it into `dist/`.

## Deploying

`vercel.json` configures the Vercel project, whose root directory is `Dashboard` and whose production branch is `active`; the post-commit hook pushes `active` after every commit, and each push deploys. The install takes only the `Dashboard` and `UIX` workspaces, and `main` is excluded from deployment.

## Assets

Glass-stage photos live in `Surfaces/` and are imported by `Leaves/GlassLeaf.tsx`.
