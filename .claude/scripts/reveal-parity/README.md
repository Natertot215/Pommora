### Reveal Parity

A before-and-after recording of every hover-, focus-, and proximity-revealed control in the real app, built for the Hover Reveal plan. It launches a built worktree through `../editor-parity/launch.sh` on its own userData, port `9446`, and a fresh copy of `~/Test` with this harness's fixtures written in, so the live app, port `9333`, `~/Test` itself, and every real Nexus stay untouched. It drives the instance over CDP through the real input chain and records, per control:

- **Settled states:** the pointer parked at (1, 1), on the host away from the control, on the control, parked again, and keyboard focus (after `F13`, which nothing binds, for keyboard modality). Each sample is taken 400 ms after its move and reads effective visibility (the control's or its pseudo-element's opacity times every ancestor's), `pointer-events`, and the opacity transition's duration.
- **Timing:** the dwell, grace, and linger boundaries, each sampled 200 ms before and 450 ms after, timed in the page from the pointer event that started them; a sample that lands late is redone.
- **Reach:** the last distance along a ray, in 10 px steps to 360 px, where a proximity control still shows, from today's anchor and from the plan's.

`hostState`, the nearest `data-reveal-host` value, is written for diagnosis and never compared. A glance holds only pages and no page renders a reveal host, so the nested-host case is a copy of the live group-band head planted inside the glance body.

#### Use

```
../editor-parity/worktree.sh <commit> <dir>   # a detached, built worktree
./record.sh <label> <dir>                     # results/<label>.json; a missing control fails the run
node compare.mjs <a> <b>                      # results/<a>-vs-<b>.md: every differing sample; exits 1 on any
node expect.mjs baseline <label>              # the plan's verdict: only its numbered deltas may differ
node run.mjs <label> 9446 <surface…>          # re-record named surfaces into an existing result
```

Two recordings of one build must match exactly. Results land in `results/`, ignored.
