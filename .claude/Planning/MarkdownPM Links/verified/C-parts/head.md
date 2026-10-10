## Verified C · Lanes 9, 10, 11 (Link Property Path, Resting-Cell Authoring, Embeds and Retarget)

**Baseline:** HEAD `42a18f4a5` (production identical to the Link Gestures commit `75c3bcb9c`), clean tree, read-only. Every cited span was opened with `sed -n` and every count re-measured with `wc -l`; production TS only unless marked CSS. **V** = verified by reading, **VR**/**R** = verified by running, **I** = inferred.

**Rulings Applied:** Checkpoints 1, 1b, 1c, 1d, the Format-Hidden reconciliation, the Disclosed Calls following from 1b-1d, 1e, 1f, and 1g (which supersedes 1d's resting-Text-value parity). Lane 9b (`scouts/9b-properties.md`) is folded in where it supersedes Lane 9: Q-07…Q-12 replace P-25, Q-29 replaces P-24's click-intent sub-bullet, Q-25/Q-26 replace P-23's commit half. The Disclosed Calls replace Lane 10's T-A with a rest-side title wait (one fallback for every surface that can't hold a swap).

**Probes Re-Run at HEAD** (outputs in `verified/C-runs/`):
- `probe9/p1.ts` → `p9.out`: reproduces every **R** claim in Lane 9 row for row (P-14's table, P-15's refusals, P-16's edit texts, P-17's index labels, T-07's nested unwrap).
- `probe10/p.ts` → `p10.out`: reproduces R-11 (raw row split, escaped round-trip), R-05's `toggleInline` outputs (unwrap at a point with no `selection`; `****` with `selection: 2`; range wrap `selection: 8`), R-03's footnote `ordinal: null`, R-27's `["embed"]`.
- `probe11/tok.ts` → `p11tok.out`: reproduces E-03, E-05, E-06, and adds two cases the lane didn't cite (`!![[P]]` → `embed` over `![[P]]`; `![[P]]]` → `embed` over `![[P]]`).
- `probe11/paste.ts` → `p11paste.out`: reproduces E-19, E-20, E-21, E-22's `pasteAsTarget` rows.
- New probes by this verification: `verified/C-parts/probe9b/p.ts`, `probe10b/{p,nest}.ts` (`p.out`), `probe11b/{e08,e25}.ts` (`e08.out`, `e25.out`, with patched copies under `probe11b/after/`).

**Tally:** Lane 9 — Verified 25 · Corrected 9 · Dropped 0. Lane 10 — Verified 22 · Corrected 10 · Dropped 0. Lane 11 — Verified 24 · Corrected 14 · Dropped 0. **Total: Verified 71 · Corrected 33 · Dropped 0.** Cross-lane findings follow as X-01…X-12 under *Missed*.

**Brief Correction:** the brief's "the MarkdownPM Engine can't import `Links/`" holds, but its implied "`Core/Connections` can't import MarkdownPM" doesn't: `Connections/scan.ts:7-8` and `Connections/rewrite.ts:18` already import `MarkdownPM/Engine/` (`markdownCode`, `detect`). `engineGraph.test.ts` enforces no React, no `.tsx`, an externals allowlist, and pure UIX leaves; the binding rules are "no React" and "no `Links/`".

---

### Lane 9 · The Link Property's Whole Path

