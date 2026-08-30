## Handoff — Pommora

> **User Prompt:** *"Send many explore agents to map out the entire scope of this, ask me any questions needed, and present me with the design before planning … Remember my preference for YAGNI, simplicity, reusing what already exists."* — the Exclusions feature, planned and shipped in two phases.

#### Current Focus

**Session ID:** cfc740a3-cf8c-4be6-a5ff-fdbf777b39af
**Dates:** 08-29-2026
**Model:** Opus 4.8 (1M context)

**The Exclusions feature shipped — folders are excludable from the app, and a Clear Exclusion Cache action scrubs what Pommora wrote into a folder it no longer manages.** Planned in `.claude/Planning/Exclusions.md` (ratified after two attack folds), executed in two phases behind declared stops. Phase 1 (writing exclusions from Settings) was live-verified and signed off; Phase 2 (Clear) is at its declared stop awaiting Nathan's live pass. The whole feature drives the existing `exclusion.ts` matcher — no fourth skip predicate — so only a writer, a validator, a per-element read, one deliberate reach-into module, and the surface were new. Range `25469f0a..9056f88f`; History entry PM-117.

**What's on disk.** `src/main/exclusionScan.ts` is the one module that reads inside an excluded folder (Clear's enumerate + strip); `src/main/exclusionInput.ts` holds `sanitizeExclusions`; `nexusFolderRefusal`/`readExcludedLeaf` in `readNexus.ts`; `writeExcludedFolders` in `settings.ts`; the `exclusions:set`/`:choose`/`:clear` handlers in `index.ts`; `ExcludedDirectoriesRow.tsx` + `ClearExclusionsRow.tsx` + the Exclusions section in `SettingsWindow.tsx`; `preservePropertiesOnClear` + `ClearReport` on the shared contract.

**The standing focus is unchanged — the Renderer Rework.** Exclusions was the "next feature asap" Nathan leaned toward; its completion doesn't move the Rework, whose full resumable state lives in [[ContextPM]] (Current Focus, Immediate Work, Pending Focus #2) and [[RendererRework]]. Nothing about the Rework was touched this session.

#### Completion Criteria

- [x] **Exclusions Phase 1** — the row, the Manage pane, the set/choose channels, the validator + hardened read; live-verified and signed off.
- [x] **Exclusions Phase 2** — the Preserve toggle, the enumerate + strip, the Clear row + native confirmation; hazard window closed in one commit.
- [x] **Both gates + closeout passes** — attack fold, three review rounds (four criticals fixed), simplify + comment passes, dead-vocab sweep clean, the hand-rolled-hover parallel removed. Delivery-claim verify (all 7 MET) + final attack review folded.
- [x] **Post-signoff polish** — the count takes the trailing-value size; the Manage button is filled; the Clear button flashes "Cleared" (1500ms) on success; the Add-created row reveals in and a removed row collapses out (Reveal), the × never dims, an emptied field is accepted not a delete. The collapse-delete motion is logged in ContextPM as the seed for a shared `useListRemoval` hook.
- [ ] **Phase 2 live pass** — the confirm wording in both toggle positions, a real folder cleared with Preserve on and off, the un-exclusion after, the destructive button's tone. The one thing outstanding.

#### Next Session

1. **Close the Exclusions Phase 2 live pass** — needs a full dev restart (new `src/main` IPC), then Clear a real excluded folder both toggle ways; the confirm copy knob is `clearConfirmCopy` in `exclusionScan.ts`.
2. **Resume the Renderer Rework** — the larger folder moves (`Core/`, `Interface/` absorbing `Sidebar/`, the tile world, casing renames), the open forks, then the framework. See [[ContextPM]] / [[RendererRework]].
3. **The Space dropdown** — carried.

#### Feedback

- "just make it so that it scans <> () only; and re-writes that; it should not care what actual text is inside it. That's the simpler way." — governance by shape, not by registry lookup.
- "remove all the fucking comments dude" / "no comments" — near-zero comment volume on new code; UPPER_CASE consts carry intent without a KNOB comment.
- "clicking out of the picker should also dismiss it" — reversed the original Escape/re-click-only spec; the pane rides PickerMenu's default dismissal (the `dismissOnOutside` prop was removed, not left dead).
- "the Manage button needs Style = Filled." / "Manage button gets the border, not the add exclusion button." — read the exact element and variant before styling.
- "target any hand-rolled implementation of how buttons or menus work that declares a behavior that would still be applied otherwise" — the remove × was a raw button reimplementing Button's hover; now a base Button.

#### Session Pointers

- `.claude/Planning/Exclusions.md` — the plan, its Log (Rulings, Deviations, the three review rounds), and the Delivery Claim.
- `Pommora/src/main/exclusionScan.ts` — the sole deliberate reach past exclusion; the walk, `clearRewrite`, `clearConfirmCopy`, `clearExclusionData`.
- `Pommora/src/main/index.ts` — the three `exclusions:*` handlers; the `:clear` window handler wraps its own throws (window kind has no envelope net).
- A live parallel session ("Pommora - Tiles") reworked `SurfacePM/` this session; all Exclusions commits staged explicit paths to avoid entangling it. `button-base.css.ts` divider tuning is Nathan's, folded into Task 7.
