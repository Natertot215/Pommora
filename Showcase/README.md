# Showcase — Design-System Site

The data-driven component-library showcase. It builds the **showcase only** — a plain browser site — never the Electron app, and deploys to Vercel from this repo.

## What Goes Live

`design-system.html` → the showcase rooted at this folder (`src/renderer/Showcase/`): color tokens, the type ramp, chips, icons, glass materials, and a live accent picker. `vite build` emits it into `dist/`, served at `/`. The build is decoupled from Electron — `build:showcase` is plain `vite build` (via `vite.config.ts`), not `electron-vite`.

## How the Pointing Works

The repo root carries the one `vercel.json`: `npm install`, `npm run build:showcase`, output `Showcase/dist`, plus the `/` → `/design-system.html` rewrite. Vercel reads it while the dashboard's Root Directory is `.`.

| Setting | Value |
|---|---|
| Git repository | `Natertot215/Project-Pommora` |
| Production branch | `main` |
| Root Directory | `.` |
| Build + output + rewrite | pinned in the root `vercel.json` |

## If the Site Won't Update

1. Push `main` — every push to the production branch builds; that's the whole deploy trigger.
2. Still stale? Vercel → **Settings → Git → Production Branch** must be `main` (a dashboard-only setting the repo can't fix).
3. Re-importing fresh: pick `Natertot215/Project-Pommora` and leave Root Directory at `.`.
4. Open the live URL and confirm the showcase renders.

## Domain

**https://pommora-design-system.vercel.app**. The custom domain `pommora-design-system.com` isn't owned yet — when it is, add it under **Settings → Domains** and point DNS at Vercel.

## Assets

Glass-stage photos live in `Showcase/Surfaces/` and are imported by `Leaves/GlassLeaf.tsx`, so `vite build` hashes them into `dist/assets/` — no action needed.
