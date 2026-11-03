### Calendar in Slide — Live Check

**DATE:** 11-01-2026
**BASE:** `69db9942e`
**VERDICT:** Clean With Named Fixes

The calendar mounts cleanly in `FrameSlide` once one placement problem is fixed. The one-line change alone leaves the calendar running off the bottom of the window on any card whose list fits below it but whose calendar doesn't. A one-expression fix in `PickerMenu` cured that in a trial run. Everything else on the checklist held.

#### Required Changes

**The Change:** `Core/Views/Cards/CardsView.tsx:486` makes a date drillable, and nothing else is needed for it to slide.

```ts
drillable:
  !e.revealOnly &&
  (pickKindOf(e.column.type) !== null || e.column.type === 'dateTime'),
```

**The Fix a Clean Result Depends On:** `UIX/Pickers/PickerMenu.tsx:221-222`. `PickerMenu` decides its side once per open, from the list's size, and keeps that side as the pane grows. The trial kept the downward pane inside the window:

```ts
const vertical =
  eff === 'up'
    ? { bottom: window.innerHeight - t.top + GAP }
    : { top: Math.min(t.bottom + GAP, window.innerHeight - VIEWPORT_MARGIN - ph) }
```

The pane's own resize observer re-places it on every size change, so the pane rises frame by frame with the growth rather than jumping. It overlaps the lower part of its card while it does. Letting the pane flip above the card instead was considered and not trialed: the flip would land partway through the slide as a jump.

With both changes applied, the 14 test files covering `PickerMenu`, `FrameSlide`, `Core/Views/Cards`, and `Core/Properties/Pickers` passed (187 tests), and `tsconfig.web.json` typechecked. The full gates weren't run.

#### Today's Behavior for Reference

**Hand-Off:** Picking `Due` from the list has no closing animation. The list stays whole for about 11 ms after the click, gone by the next sample at 51 ms, and a separate calendar pane blooms in from opacity 0 at a different place, above the card on this layout. The pane's position changes completely.

**DEV Warning:** Each hand-off logs `[PickerMenu] unmounted while open/exiting — Bloom-out skipped` twice, which fits the picker remounting on its key change (`Core/Properties/Cells/ValueSeat.tsx:278`), though the second line's source wasn't traced. The slide doesn't log it, so the change removes this warning from a date's path.

#### Exercised Items

| Item | Result | What Was Seen |
|------|--------|---------------|
| Slide timing | Pass | Same track as Stage, the option reference: first motion around 85 ms after the click, settled by about 350 ms, ending at the same -120px. |
| Pane resize | Pass | 129×181 to 224×327 in step with the track, with no snap. The pane's left edge eased from 282 to 235 as it stayed centered. The pane measures 224px wide around the calendar, the same as today's popped calendar. |
| Low card | **Fail** | At 1422×924, Page A's pane stayed at y 657 and ended at 984, 60px below the window. The date field was cut, and Use Time and End Date were unreachable. The trial fix ended the pane at 916. |
| Tall list | Pass | A 20-row list had already flipped upward, so the calendar shrank in place against the bottom anchor. |
| Month, Year | Pass | Each opens directly under its button, drawn over the pane, with no offset from the slide's transformed track, because these lists portal out of it. |
| Hour, Minute | Pass | Each opens above its time field and over the pane. Picking 15 wrote `09:15:00`. |
| Dismissing a dropdown | Pass | Escape and a press elsewhere in the pane each closed only the dropdown, and the pane stayed open. |
| End Date | Pass | The pane grew 327 to 359 in place over about 250 ms, with no clipping. With the trial fix it grew upward at the window's edge. |
| Use Time | Pass | No height change, since the clock shares the date's row. No clipping with both switches on. |
| Commit | Pass | A picked day landed in the file and on the card, with the pane left open. |
| Exactly-Once Emit | Pass | One write each for day then Back (49 ms gap), day then Escape, and day then an outside press (43 ms gap). Two days then Back (79 ms gap) wrote only the second day, once. |
| Clearing a day | Pass | Pressing the picked day again removed the value from the file, and the pane stayed open. |
| Pane after commit | Minor | The pane stayed open but moved down 2px when the card redrew. It also grows 2px when the date field fills. Neither reads as a jump. |
| Back bar | Pass | Returned to the list smoothly, 224×329 to 129×158, with the picked property gone from the list and no position jump. |
| Back and Escape mid-slide | Pass | Back reversed the slide cleanly. Escape closed the pane. |
| Wheel | Pass | A horizontal wheel on the grid moved a month each way inside the slide. |
| Keyboard | Pass, Shared Gap | Tab enters the pane at the back bar and walks the header. Focus falls to the body after the row is pressed, which Stage's slide does too, because the pressed row goes inert. Escape closes the whole pane rather than stepping back. |
| Console | Pass | No exception or error in any slide run, and no `PickerMenu` warning from the drive's flows. |

One further `PickerMenu` warning logged once, near the moment the trial edit to `PickerMenu.tsx` hot-reloaded. It didn't recur when the slide, month list, commit, clear, Back, and Escape flows were rerun, though that rerun skipped the minute pick. Its cause wasn't established.

#### Not Tested

- **Properties Panel Add:** The panel's list has its own entries at `Core/Properties/PropertyPanel.tsx:186`, so its dates need the same treatment under Decision 11.
- **Compact Cards:** Only the default card format was driven. A compact card drops a cleared value from the card, so clearing inside the slide is worth checking there.
- **Long Option Lists on a Low Card:** The same latched side should apply, which would make this fix useful beyond dates, but it wasn't exercised.
- **Other Placements and Modes:** Cards near the window's right edge, a 24-hour clock, keyboard activation of Back, and the built app under its Content-Security-Policy.

#### Setup Notes

- **Test Nexus:** `~/Test` has an empty property registry, so `Due` doesn't exist there. `Due` and the other date properties were added to the scratch copy through the app, along with a `Stage` select for the option reference.
- **Run Mode:** Dev mode from a detached worktree, with the worktree's renderer port moved to 5291, so the DEV warning was live. Before and after ran in one process.
- **Drive Artifacts:** Repeated runs in one view left duplicated `D2 (2)`-style property labels in the scratch copy. Those came from the drive's seeding.

#### Screenshots

**Today's Behavior:**

- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/b1-list.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/b2-stage-slid.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/b3-due-handoff-mid.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/b4-due-calendar.png`

**The Change Alone:**

- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a1-low-card-midslide.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a2-low-card-after.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a3-room-calendar.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a4-month-open.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a5-year-open.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a6-enddate.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a7-usetime.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a8-wheel.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a9-committed.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a12-back-list.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a13-hour.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/a14-minute.png`

**With the Trial Fix:**

- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/f1-fix-midslide.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/f2-fix-after.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/f3-fix-enddate.png`
- `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b4ee350f-6875-45e6-b6c9-f6d66ac8b8de/scratchpad/calendar-slide/f4-fix-month.png`
