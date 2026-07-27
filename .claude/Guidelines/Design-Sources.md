## Design Sources

Pommora's design system already owns most of what a new surface needs. The recurring failure isn't writing bad code — it's writing *correct* code that duplicates something already in the tree, because nobody looked first. This document is the standing rule against that, and the repeatable procedure that enforces it.

**The two prohibitions:**

- **Hand-rolling what already exists is forbidden.** A second implementation of a house primitive is a defect the moment it's written, whether or not it looks right.
- **Accepting a behavior as pane-specific when it should be reusable is equally forbidden.** "This pane needs it" is not evidence that only this pane needs it — it's usually evidence the primitive was never hoisted.

### When The Sweep Runs

Two fixed points, both non-optional:

- **Pre-planning:** before any spec or implementation plan is written for a surface. What you learn changes the plan — a plan built on "I'll add a ring" is a different plan from "I'll extend the existing ring."
- **Post-cleanup:** after a feature is functionally green, before it's called done. This is where the duplicates that crept in during implementation get caught, while the diff is still fresh.

A sweep is cheap and its output is durable. Skipping it to save a few minutes is how a codebase acquires three twisty chevrons on two different animation beats.

### The Procedure

The sweep is a **scoped, read-only reconnaissance dispatched as an agent** — never a from-memory recollection. Memory produces plausible file paths; the sweep produces cited ones.

**Step 1 — State the capabilities, not the feature.** Decompose what you're about to build into the smallest behaviors that could plausibly already exist. Not "build a Location picker" but "a selected-row highlight · a height cap with scroll · a horizontal growth origin · a vertical disclosure." Each becomes a search target. A capability stated too coarsely finds nothing.

**Step 2 — Name the suspected precedents and demand they be opened.** List every token, component, or class you *think* is relevant and require the agent to read it rather than infer from its name. Instruct explicitly: *"Do not speculate about what code probably does; open it and read it."*

**Step 3 — Require `file:line` on every claim.** A claim without a citation is a hypothesis. This is the single highest-value constraint in the brief — it converts a summary into something you can act on without re-deriving.

**Step 4 — Demand the negative result.** Instruct: *"Where something does NOT exist, say so plainly — 'no precedent found' is a valuable answer."* Without this, an agent under pressure to be useful will stretch a loose match into a false precedent, which is worse than finding nothing: you'll build on a primitive that doesn't fit.

**Step 5 — Ask for the blast radius.** For any shared thing you intend to touch, require the complete consumer list. Extending a prop with seven call sites is a different decision from extending one with two, and you cannot make it without the count.

**Step 6 — Ask for violations you didn't ask about.** Name the specific files the work touches and request a hunt for: raw values where a token exists · duplicated recipes across files · magic numbers matching a named knob · `globalStyle` selectors keyed on tag position rather than a role class · any second implementation of something the design system owns. Require each to be labeled **cosmetic** or **real drift risk**, so the list is triageable rather than a wall.

**Step 7 — Verify the load-bearing claims yourself.** Open the files behind anything you're about to build on. An agent's report is evidence, not proof, and the cost of verifying three cited lines is trivial against the cost of building on a wrong one.

### What The Sweep Returns

Findings sort into four actions, and naming which one applies is part of the finding:

- **Reuse as-is** — the primitive exists and fits. Import it.
- **Hoist** — the right recipe exists but lives in a leaf file. Move it to the design system and update its consumers. This is *un*-duplication, not new invention, and it is the most common correct outcome.
- **Extend** — the seam exists but doesn't cover the case. Widen the existing model; never add a parallel one beside it.
- **Build** — genuinely no precedent. Build it in the design system from the outset, not in the consuming pane "for now."

**Two signals worth naming explicitly:**

- **An override is a tell.** When one file fights another with escalating specificity — a tripled class, an `&&`, a `!important` — the loser is usually right and the winner is usually mis-scoped. The fix belongs in the component as a variant, not in a counter-selector.
- **A stale comment is a trap, not a typo.** A comment pointing at the wrong source file sends the next reader somewhere that never ships. Treat a wrong pointer as a real finding and correct it at the source.

### Skill Extraction

The section above is deliberately written as an executable procedure so it can be lifted into a skill without rewriting. A skill built from it takes the surface under construction as input, runs Steps 1–6 as a dispatched read-only agent, and returns the four-way action table plus the violations list. Steps 3, 4, and 6 are the ones that carry the value — a version that drops the citation requirement, the permission to report nothing, or the unprompted violation hunt degrades into a summary and should not ship.

**Related:** [[Build-Gotchas]] · the review → revise loop in the Studio's Review-Discipline rules.
