### Reach-In Trash — Measurement

**DATE:** 10-28-2026
**REPO:** `~/The Studio/Projects/Project Pommora`, `15fe7422a`, two detached worktrees (baseline and prototype), built and launched as the packaged app with its own userData and debug ports 9391–9396
**HARNESS:** this folder; `RERUN.md` has the steps. `reach-in.patch` is the prototype, `instrumentation.patch` the probes both builds carry, `results/` the raw runs, `profiles/` the CPU profiles

---

#### 1. The Prototype

Ninety-four lines in, thirty-five out, across twelve files (`reach-in.patch`). Each change and what it does:

1. **Trash pages are content for the corpus and index:** `trashContent` (`Paths/exclusion.ts`) admits a path below `.trash` with nothing hidden on the way, so a bundle's `_record.json` stays out; `corpusFiles` (`Files/walk.ts`) walks `.trash` with it, and `relCorpusPath` (`Index/indexSeed.ts`) lets the index follow writes and moves into and out of it. A delete's `relocate` now renames the index rows into `.trash`, and a restore renames them back, where the baseline deindexes and reindexes. The tree, the adopt pass, and the watcher's tree half never enter `.trash`, since `outsideContent` is unchanged.
2. **Readers hide trashed pages as they hide archived ones:** `isStored` (archived or trashed, `Paths/nexusPaths.ts`) replaces `isArchived` in `outsideArchive` (`Nexus/governedSweep.ts`, which feeds counts, confirmations, and cascade reports), `index:headings` (`Nexus/handlers.ts`), and the Matrix graph (`Matrix/matrixGraph.ts`).
3. **Cascades reach trashed pages:** the governed reach (`pagesInReach`, `Index/keyHolders.ts`) adds `.trash`, and a Collection's reach adds its own chain there, so property and option renames and deletes reach trashed holders; Context and Space renames and a page rename's relinks already reach whatever the index lists. Trashed pages join `nexusPages`' `byId` at their Trash paths (`Nexus/heldPages.ts`), so the strip and the refill can address them, and stay out of `archived` and `linkWorld`, so a delete still finds the values naming what it trashed and strips them, trashed holders included. `deleteCascade` (`Nexus/cascade.ts`) also leaves out what sits in the deleted item's own new bundle, by origin path, so a Set's links among its own pages aren't stripped.
4. **The restore is the Archive's plain move plus the refill:** for a page or Set landing live, `restoreTrashed` (`Trash/spend.ts`) skips `scrubReturning` and the `targets` repair and keeps placement, the move, the order write, the returning re-spell (the same call the Archive's restore makes), and the refill of the Link values its delete stripped, now reaching trashed holders through `byId`. `deleteOp` (`Trash/delete.ts`) no longer gathers `targets` for a page or Set, since nothing reads them.

##### What It Leaves Out, and How Each Could Bias the Numbers

| Omission | Bias |
|---|---|
| Trashed Contexts and Spaces: their sidecars aren't swept by any cascade, and their restore keeps the scrub | None measured, since no fill holds one; a real reach-in would add Space-sidecar writes to Context, Space, and property cascades, so it **under-measures** that design's cost there |
| Trashed Collections keep the scrub on restore; their pages are indexed and swept | None measured (no fill holds one) |
| `finishProperty` still concatenates every trashed bundle's pages when a property bundle is emptied, so trashed pages are covered twice | **Over-measures** that path; the matrix never empties a property bundle |
| `parkLinks` and `listBundles` still scan every bundle on an empty and a listing, in both builds | Neutral between builds; a real reach-in could answer both from the index, so the prototype **over-measures** its empty and listing |
| A deleted property's trashed holders are stripped and recorded in its bundle; the restore of that property isn't measured | The delete's cost is measured faithfully; the property restore's isn't measured at all |
| The Collection-scoped reach spells the Trash chain by today's folder name, so a renamed Collection's earlier deletes are missed (only `unassignProperty` uses it) | Not exercised |
| Renderer surfaces past headings and the Matrix (search, backlinks) weren't audited for trashed rows | None on timing |
| The `deleteCascade` exclusion by origin path also skips an older trashed copy left from the same path | Negligible |
| The stripped-then-refilled trashed holders are the brief's change 3, a design choice the baseline doesn't make: the baseline leaves trashed holders alone and drops the value at their own restore | It's the reach-in's real cost, and it shows on the page delete and the page restore |

##### The Fills

Every size is `make-benchmark-nexus.mjs` plus `augment.mjs`: 5% of live pages body-link a hub page (the page rename's target) and 5% hold a Link value `[[Target]]` in `Source` (the page delete's target). Fills clone live Sets' pages, frontmatter, Space tags, bodies, and links included, into Doomed Sets plus 20 loose pages, then delete them through the baseline's own `mutate` channel, so every record is the app's own; the same snapshot serves both builds. The Trash's pages therefore hold every cascading key at the live density, Category on about 70% of them, the hub link and the target's Link on about 5%. A real Trash that holds less of what cascades would narrow the reach-in's penalty in proportion.

---

#### 2. The Matrix

Five runs per build at Small and Medium, alternated run by run on a fresh clone; Large is two runs per build at 0% and 50% (trimmed on request, so it shows the trend only). An operation's time runs from the request to its last machine call (its tail of index, settle, and watcher work included); the reply time is shown beside it. Reads and writes are machine-seam calls (`readText` and `readBytes`, `writeText` and `writeBytes`), with those under `.trash` in parentheses. For **coldOpen** and **warmOpen**, the first time is the walk and index seed (open start to the seeded index), and the "to idle" pair is the whole open through the repair sweep; a cold open has no index database, a warm one reuses it. Every operation succeeded in every run.

##### Whole Sequence, Median

| Cell | Baseline | Reach-In | Δ |
|---|---|---|---|
| Small 0% / 10% / 50% | 19.2s / 19.4s / 19.3s | 19.9s / 21.4s / 27.2s | +4% / +10% / +41% |
| Medium 0% / 10% / 50% | 173.1s / 167.9s / 169.4s | 174.7s / 184.3s / 255.7s | +1% / +10% / +51% |
| Large 0% / 50% | 477.2s / 471.3s | 471.3s / 752.0s | −1% / +60% |

##### Small, 0% Trash (0 Bundles; 5 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 309 (302–310) | 301 (299–302) | -3% | 370 / 309 | 362 / 301 | 2195 / 5 (0 / 0) | 2195 / 5 (0 / 0) |
| Warm Open | 130 (126–157) | 141 (125–165) | +9% | 190 / 130 | 208 / 141 | 1195 / 5 (0 / 0) | 1195 / 5 (0 / 0) |
| List Trash | 3 (2–4) | 3 (3–4) | +0% | 3 / 3 | 3 / 3 | 0 / 0 (0 / 0) | 0 / 0 (0 / 0) |
| Page Delete | 889 (868–909) | 888 (876–910) | 0% | 416 / 889 | 416 / 888 | 164 / 55 (1 / 2) | 165 / 55 (2 / 2) |
| Set Delete | 412 (411–414) | 414 (406–416) | +0% | 50 / 412 | 51 / 414 | 105 / 3 (0 / 1) | 105 / 3 (0 / 1) |
| Property Rename | 4739 (4582–4791) | 5052 (4935–5181) | +7% | 4379 / 4739 | 4653 / 5052 | 2694 / 674 (0 / 0) | 2756 / 705 (62 / 31) |
| Option Rename | 1428 (1350–1474) | 1501 (1451–1523) | +5% | 958 / 1428 | 1006 / 1501 | 947 / 136 (0 / 0) | 974 / 141 (27 / 5) |
| Property Delete | 4856 (4791–4903) | 5005 (4862–5057) | +3% | 4521 / 4856 | 4644 / 5005 | 2805 / 682 (0 / 1) | 2859 / 709 (54 / 28) |
| Page Rename | 873 (859–913) | 873 (861–899) | +0% | 407 / 873 | 409 / 873 | 230 / 55 (0 / 0) | 231 / 56 (1 / 1) |
| Space Rename | 746 (732–824) | 783 (767–797) | +5% | 281 / 746 | 317 / 783 | 123 / 38 (0 / 0) | 126 / 41 (3 / 3) |
| Context Rename | 3809 (3613–3897) | 3961 (3926–4011) | +4% | 3396 / 3809 | 3563 / 3961 | 1646 / 532 (0 / 0) | 1666 / 552 (20 / 20) |
| Page Restore | 849 (811–874) | 862 (858–907) | +2% | 385 / 849 | 395 / 862 | 203 / 53 (48 / 2) | 156 / 52 (4 / 2) |
| Set Restore | 567 (545–573) | 513 (466–516) | -10% | 102 / 567 | 49 / 513 | 213 / 4 (81 / 0) | 85 / 1 (41 / 0) |
| List Trash (After) | 6 (5–6) | 9 (7–11) | +50% | 5 / 6 | 9 / 9 | 1 / 0 (1 / 0) | 1 / 0 (1 / 0) |

##### Small, 10% Trash (22 Bundles; 5 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 307 (301–314) | 336 (331–347) | +10% | 375 / 307 | 405 / 336 | 2195 / 5 (0 / 0) | 2295 / 5 (100 / 0) |
| Warm Open | 127 (124–133) | 130 (129–143) | +3% | 185 / 127 | 190 / 130 | 1195 / 5 (0 / 0) | 1195 / 5 (0 / 0) |
| List Trash | 19 (17–21) | 21 (18–22) | +11% | 19 / 19 | 21 / 21 | 22 / 0 (22 / 0) | 22 / 0 (22 / 0) |
| Page Delete | 887 (849–919) | 920 (887–966) | +4% | 402 / 887 | 450 / 920 | 164 / 55 (1 / 2) | 170 / 60 (7 / 7) |
| Set Delete | 411 (407–416) | 415 (407–417) | +1% | 49 / 411 | 53 / 415 | 105 / 3 (0 / 1) | 105 / 3 (0 / 1) |
| Property Rename | 4902 (4746–4949) | 5612 (5424–5749) | +14% | 4489 / 4902 | 5201 / 5612 | 2694 / 674 (0 / 0) | 2904 / 779 (210 / 105) |
| Option Rename | 1443 (1380–1460) | 1562 (1546–1636) | +8% | 979 / 1443 | 1096 / 1562 | 947 / 136 (0 / 0) | 1042 / 151 (95 / 15) |
| Property Delete | 4804 (4771–4891) | 5426 (5252–5527) | +13% | 4495 / 4804 | 5067 / 5426 | 2805 / 682 (0 / 1) | 2995 / 777 (190 / 96) |
| Page Rename | 883 (847–919) | 893 (874–968) | +1% | 410 / 883 | 430 / 893 | 230 / 55 (0 / 0) | 236 / 61 (6 / 6) |
| Space Rename | 761 (742–819) | 797 (789–821) | +5% | 297 / 761 | 325 / 797 | 123 / 38 (0 / 0) | 128 / 43 (5 / 5) |
| Context Rename | 3845 (3713–3948) | 4316 (4249–4577) | +12% | 3484 / 3845 | 3903 / 4316 | 1646 / 532 (0 / 0) | 1753 / 603 (71 / 71) |
| Page Restore | 892 (871–951) | 889 (885–928) | 0% | 427 / 892 | 422 / 889 | 305 / 53 (150 / 2) | 161 / 57 (9 / 7) |
| Set Restore | 571 (566–605) | 503 (458–518) | -12% | 108 / 571 | 47 / 503 | 213 / 4 (81 / 0) | 85 / 1 (41 / 0) |
| Empty One Bundle | 29 (28–32) | 38 (35–41) | +31% | 29 / 29 | 37 / 38 | 48 / 2 (41 / 0) | 48 / 2 (41 / 0) |
| List Trash (After) | 13 (10–14) | 18 (16–21) | +38% | 13 / 13 | 18 / 18 | 22 / 0 (22 / 0) | 22 / 0 (22 / 0) |

##### Small, 50% Trash (32 Bundles; 5 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 302 (300–314) | 435 (429–459) | +44% | 364 / 302 | 493 / 435 | 2195 / 5 (0 / 0) | 2695 / 5 (500 / 0) |
| Warm Open | 125 (124–136) | 137 (134–142) | +10% | 185 / 125 | 193 / 137 | 1195 / 5 (0 / 0) | 1195 / 5 (0 / 0) |
| List Trash | 23 (22–26) | 24 (22–30) | +4% | 23 / 23 | 24 / 24 | 32 / 0 (32 / 0) | 32 / 0 (32 / 0) |
| Page Delete | 879 (852–889) | 1072 (1052–1116) | +22% | 416 / 879 | 587 / 1072 | 164 / 55 (1 / 2) | 188 / 78 (25 / 25) |
| Set Delete | 409 (397–411) | 417 (366–417) | +2% | 47 / 409 | 55 / 417 | 105 / 3 (0 / 1) | 106 / 3 (1 / 1) |
| Property Rename | 4793 (4678–4981) | 7262 (6753–7578) | +52% | 4432 / 4793 | 6903 / 7262 | 2694 / 674 (0 / 0) | 3474 / 1064 (780 / 390) |
| Option Rename | 1410 (1346–1442) | 1903 (1787–1922) | +35% | 946 / 1410 | 1407 / 1903 | 947 / 136 (0 / 0) | 1328 / 203 (381 / 67) |
| Property Delete | 4813 (4630–4976) | 7420 (7054–7559) | +54% | 4452 / 4813 | 7060 / 7420 | 2805 / 682 (0 / 1) | 3561 / 1060 (756 / 379) |
| Page Rename | 868 (821–920) | 1039 (994–1058) | +20% | 397 / 868 | 543 / 1039 | 230 / 55 (0 / 0) | 256 / 81 (26 / 26) |
| Space Rename | 745 (736–819) | 813 (809–824) | +9% | 280 / 745 | 346 / 813 | 123 / 38 (0 / 0) | 132 / 47 (9 / 9) |
| Context Rename | 3853 (3673–4005) | 5741 (5558–5834) | +49% | 3470 / 3853 | 5331 / 5741 | 1646 / 532 (0 / 0) | 1964 / 814 (282 / 282) |
| Page Restore | 947 (932–967) | 1057 (1016–1063) | +12% | 484 / 947 | 548 / 1057 | 715 / 53 (560 / 2) | 179 / 75 (27 / 25) |
| Set Restore | 559 (551–565) | 506 (468–516) | -9% | 96 / 559 | 44 / 506 | 213 / 4 (81 / 0) | 85 / 1 (41 / 0) |
| Empty One Bundle | 27 (23–28) | 36 (33–38) | +33% | 27 / 27 | 36 / 36 | 28 / 2 (21 / 0) | 28 / 2 (21 / 0) |
| List Trash (After) | 17 (15–18) | 22 (12–30) | +29% | 16 / 17 | 21 / 22 | 32 / 0 (32 / 0) | 32 / 0 (32 / 0) |

##### Medium, 0% Trash (0 Bundles; 5 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 3077 (3039–3147) | 3130 (3066–3287) | +2% | 3257 / 3077 | 3308 / 3130 | 20915 / 5 (0 / 0) | 20915 / 5 (0 / 0) |
| Warm Open | 1061 (1044–1184) | 1088 (1028–1109) | +2% | 1220 / 1061 | 1251 / 1088 | 10915 / 5 (0 / 0) | 10915 / 5 (0 / 0) |
| List Trash | 6 (5–7) | 7 (6–7) | +17% | 6 / 6 | 7 / 7 | 0 / 0 (0 / 0) | 0 / 0 (0 / 0) |
| Page Delete | 4014 (3948–4085) | 4069 (3898–4172) | +1% | 3652 / 4014 | 3747 / 4069 | 1469 / 490 (1 / 2) | 1470 / 490 (2 / 2) |
| Set Delete | 381 (374–389) | 383 (375–387) | +1% | 122 / 381 | 123 / 383 | 658 / 3 (0 / 1) | 658 / 3 (0 / 1) |
| Property Rename | 50.8s (50.4s–51.4s) | 51.7s (51.2s–56.0s) | +2% | 50.8s / 50.8s | 51.7s / 51.7s | 27842 / 6961 (0 / 0) | 27974 / 7027 (132 / 66) |
| Option Rename | 11.5s (11.4s–11.8s) | 12.2s (11.0s–13.2s) | +5% | 11.4s / 11.5s | 12.1s / 12.2s | 9776 / 1397 (0 / 0) | 9831 / 1409 (55 / 12) |
| Property Delete | 55.3s (55.1s–57.0s) | 56.4s (52.2s–61.9s) | +2% | 55.3s / 55.3s | 56.4s / 56.4s | 28733 / 7034 (0 / 1) | 28839 / 7087 (106 / 54) |
| Page Rename | 4460 (4404–4819) | 4516 (4422–5065) | +1% | 4097 / 4460 | 4204 / 4516 | 2047 / 514 (0 / 0) | 2055 / 522 (8 / 8) |
| Space Rename | 935 (899–981) | 941 (935–1006) | +1% | 487 / 935 | 525 / 941 | 227 / 49 (0 / 0) | 229 / 51 (2 / 2) |
| Context Rename | 39.0s (37.0s–40.5s) | 39.5s (36.5s–42.8s) | +1% | 39.0s / 39.0s | 39.5s / 39.5s | 14958 / 4895 (0 / 0) | 14917 / 4927 (32 / 32) |
| Page Restore | 4521 (4278–4719) | 4295 (3963–4627) | -5% | 4109 / 4521 | 3983 / 4295 | 1548 / 488 (88 / 2) | 1461 / 487 (4 / 2) |
| Set Restore | 749 (682–806) | 568 (553–586) | -24% | 284 / 749 | 102 / 568 | 427 / 11 (161 / 0) | 165 / 1 (81 / 0) |
| List Trash (After) | 17 (16–18) | 20 (18–25) | +18% | 16 / 17 | 20 / 20 | 1 / 0 (1 / 0) | 1 / 0 (1 / 0) |

##### Medium, 10% Trash (33 Bundles; 5 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 3042 (3010–3073) | 3357 (3320–3433) | +10% | 3201 / 3042 | 3514 / 3357 | 20915 / 5 (0 / 0) | 21915 / 5 (1000 / 0) |
| Warm Open | 1036 (1019–1057) | 1068 (1055–1072) | +3% | 1194 / 1036 | 1225 / 1068 | 10915 / 5 (0 / 0) | 10915 / 5 (0 / 0) |
| List Trash | 36 (34–37) | 41 (38–45) | +14% | 35 / 36 | 41 / 41 | 33 / 0 (33 / 0) | 33 / 0 (33 / 0) |
| Page Delete | 4118 (4098–4216) | 4416 (4375–4517) | +7% | 3803 / 4118 | 4117 / 4416 | 1469 / 490 (1 / 2) | 1524 / 544 (56 / 56) |
| Set Delete | 388 (383–389) | 394 (391–396) | +2% | 126 / 388 | 133 / 394 | 658 / 3 (0 / 1) | 659 / 3 (1 / 1) |
| Property Rename | 52.8s (52.4s–53.2s) | 56.9s (52.7s–59.0s) | +8% | 52.8s / 52.8s | 56.9s / 56.9s | 27842 / 6961 (0 / 0) | 29378 / 7729 (1536 / 768) |
| Option Rename | 11.2s (11.1s–11.3s) | 12.4s (12.1s–12.7s) | +11% | 11.0s / 11.2s | 12.2s / 12.4s | 9776 / 1397 (0 / 0) | 10543 / 1542 (767 / 145) |
| Property Delete | 52.3s (51.9s–52.9s) | 58.4s (55.7s–58.9s) | +12% | 52.3s / 52.3s | 58.4s / 58.4s | 28733 / 7034 (0 / 1) | 30225 / 7780 (1492 / 747) |
| Page Rename | 4208 (3916–4245) | 4753 (4660–4852) | +13% | 3847 / 4208 | 4383 / 4753 | 2047 / 514 (0 / 0) | 2106 / 573 (59 / 59) |
| Space Rename | 930 (856–931) | 990 (881–1002) | +6% | 458 / 930 | 530 / 990 | 227 / 49 (0 / 0) | 234 / 56 (7 / 7) |
| Context Rename | 36.3s (35.5s–36.5s) | 39.9s (39.2s–41.3s) | +10% | 36.3s / 36.3s | 39.9s / 39.9s | 14993 / 4895 (0 / 0) | 15545 / 5396 (501 / 501) |
| Page Restore | 4373 (4324–4495) | 4445 (4347–4597) | +2% | 3952 / 4373 | 4098 / 4445 | 2561 / 488 (1101 / 2) | 1515 / 541 (58 / 56) |
| Set Restore | 679 (677–729) | 581 (524–588) | -14% | 262 / 679 | 109 / 581 | 427 / 11 (161 / 0) | 165 / 1 (81 / 0) |
| Empty One Bundle | 42 (41–45) | 51 (46–54) | +21% | 41 / 42 | 50 / 51 | 28 / 2 (21 / 0) | 28 / 2 (21 / 0) |
| List Trash (After) | 32 (31–36) | 45 (39–47) | +41% | 32 / 32 | 45 / 45 | 33 / 0 (33 / 0) | 33 / 0 (33 / 0) |

##### Medium, 50% Trash (82 Bundles; 5 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 3058 (3024–3087) | 4534 (4520–5008) | +48% | 3220 / 3058 | 4691 / 4534 | 20915 / 5 (0 / 0) | 25915 / 5 (5000 / 0) |
| Warm Open | 1026 (1015–1033) | 1204 (1156–1208) | +17% | 1183 / 1026 | 1366 / 1204 | 10915 / 5 (0 / 0) | 10915 / 5 (0 / 0) |
| List Trash | 60 (58–62) | 72 (67–101) | +20% | 59 / 60 | 72 / 72 | 82 / 0 (82 / 0) | 82 / 0 (82 / 0) |
| Page Delete | 4173 (3882–4249) | 5945 (5312–12.9s) | +42% | 3811 / 4173 | 5682 / 5945 | 1469 / 490 (1 / 2) | 1714 / 734 (246 / 246) |
| Set Delete | 388 (385–388) | 402 (395–413) | +4% | 126 / 388 | 140 / 402 | 658 / 3 (0 / 1) | 671 / 3 (13 / 1) |
| Property Rename | 52.6s (50.3s–53.2s) | 80.2s (72.8s–81.0s) | +53% | 52.6s / 52.6s | 80.2s / 80.2s | 27842 / 6961 (0 / 0) | 35026 / 10553 (7184 / 3592) |
| Option Rename | 11.2s (10.8s–11.3s) | 17.6s (16.9s–18.0s) | +58% | 11.1s / 11.2s | 17.5s / 17.6s | 9776 / 1397 (0 / 0) | 13345 / 2098 (3569 / 701) |
| Property Delete | 52.4s (48.9s–75.9s) | 79.2s (76.1s–82.5s) | +51% | 52.4s / 52.4s | 79.2s / 79.2s | 28733 / 7034 (0 / 1) | 35873 / 10604 (7140 / 3571) |
| Page Rename | 4232 (4070–4503) | 6237 (5791–6643) | +47% | 3922 / 4232 | 5930 / 6237 | 2047 / 514 (0 / 0) | 2315 / 782 (268 / 268) |
| Space Rename | 893 (864–931) | 1154 (1098–1184) | +29% | 464 / 893 | 685 / 1154 | 227 / 49 (0 / 0) | 253 / 75 (26 / 26) |
| Context Rename | 36.9s (34.3s–50.4s) | 54.8s (50.7s–56.3s) | +49% | 36.9s / 36.9s | 54.8s / 54.8s | 14905 / 4895 (0 / 0) | 17390 / 7347 (2452 / 2452) |
| Page Restore | 5515 (5435–5722) | 5912 (5509–6174) | +7% | 5049 / 5515 | 5550 / 5912 | 6610 / 488 (5150 / 2) | 1705 / 731 (248 / 246) |
| Set Restore | 682 (680–737) | 571 (540–597) | -16% | 265 / 682 | 124 / 571 | 427 / 11 (161 / 0) | 165 / 1 (81 / 0) |
| Empty One Bundle | 53 (50–53) | 74 (52–89) | +40% | 53 / 53 | 74 / 74 | 88 / 2 (81 / 0) | 88 / 2 (81 / 0) |
| List Trash (After) | 53 (52–65) | 80 (70–81) | +51% | 53 / 53 | 80 / 80 | 82 / 0 (82 / 0) | 82 / 0 (82 / 0) |

##### Large, 0% Trash (0 Bundles; 2 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 10.3s (10.1s–10.5s) | 9594 (9385–9802) | -7% | 11.0s / 10.3s | 10.1s / 9594 | 51240 / 5 (0 / 0) | 51240 / 5 (0 / 0) |
| Warm Open | 3247 (3013–3480) | 3137 (3005–3268) | -3% | 3776 / 3247 | 3611 / 3137 | 26243 / 5 (0 / 0) | 26243 / 5 (0 / 0) |
| List Trash | 12 (11–12) | 13 (12–13) | +9% | 11 / 12 | 12 / 13 | 0 / 0 (0 / 0) | 0 / 0 (0 / 0) |
| Page Delete | 10.9s (10.8s–10.9s) | 11.0s (10.9s–11.1s) | +1% | 10.9s / 10.9s | 11.0s / 11.0s | 3788 / 1263 (1 / 2) | 3789 / 1263 (2 / 2) |
| Set Delete | 412 (408–415) | 395 (393–396) | -4% | 256 / 412 | 240 / 395 | 1007 / 3 (0 / 1) | 1007 / 3 (0 / 1) |
| Property Rename | 161.1s (148.7s–173.5s) | 150.8s (149.6s–151.9s) | -6% | 161.1s / 161.1s | 150.8s / 150.8s | 69690 / 17423 (0 / 0) | 69928 / 17542 (238 / 119) |
| Option Rename | 18.4s (18.0s–18.9s) | 18.3s (18.2s–18.4s) | -1% | 18.4s / 18.4s | 18.3s / 18.3s | 20157 / 1392 (0 / 0) | 20271 / 1405 (114 / 13) |
| Property Delete | 154.2s (154.0s–154.4s) | 152.9s (149.9s–155.8s) | -1% | 154.2s / 154.2s | 152.9s / 152.9s | 70379 / 17364 (0 / 1) | 70609 / 17479 (230 / 116) |
| Page Rename | 10.7s (10.6s–10.8s) | 11.3s (11.1s–11.5s) | +5% | 10.7s / 10.7s | 11.3s / 11.3s | 4381 / 1192 (0 / 0) | 4391 / 1202 (10 / 10) |
| Space Rename | 1178 (1142–1214) | 1151 (1112–1189) | -2% | 787 / 1178 | 786 / 1151 | 297 / 61 (0 / 0) | 299 / 63 (2 / 2) |
| Context Rename | 107.2s (105.9s–108.6s) | 113.3s (112.0s–114.7s) | +6% | 107.0s / 107.2s | 113.3s / 113.3s | 38483 / 12573 (0 / 0) | 38433 / 12653 (80 / 80) |
| Page Restore | 12.0s (11.8s–12.1s) | 11.5s (11.4s–11.7s) | -4% | 11.6s / 12.0s | 11.5s / 11.5s | 3939 / 1261 (172 / 6) | 3772 / 1260 (8 / 6) |
| Set Restore | 1036 (1004–1068) | 586 (571–600) | -43% | 593 / 1036 | 224 / 586 | 831 / 13 (321 / 0) | 325 / 1 (161 / 0) |
| List Trash (After) | 27 (17–37) | 34 (30–37) | +24% | 27 / 27 | 34 / 34 | 1 / 0 (1 / 0) | 1 / 0 (1 / 0) |

##### Large, 50% Trash (98 Bundles; 2 Runs per Build)

| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |
|---|---|---|---|---|---|---|---|
| Cold Open | 9751 (9308–10.2s) | 14.2s (13.7s–14.7s) | +46% | 10.2s / 9751 | 14.9s / 14.2s | 51240 / 5 (0 / 0) | 63742 / 5 (12500 / 0) |
| Warm Open | 3049 (3020–3079) | 3460 (3307–3612) | +13% | 3508 / 3049 | 3913 / 3460 | 26243 / 5 (0 / 0) | 26243 / 5 (0 / 0) |
| List Trash | 89 (87–91) | 124 (121–126) | +39% | 89 / 89 | 123 / 124 | 98 / 0 (98 / 0) | 98 / 0 (98 / 0) |
| Page Delete | 11.0s (11.0s–11.1s) | 16.3s (16.0s–16.5s) | +48% | 11.0s / 11.0s | 16.3s / 16.3s | 3788 / 1263 (1 / 2) | 4420 / 1894 (633 / 633) |
| Set Delete | 416 (402–429) | 395 (395–395) | -5% | 259 / 416 | 318 / 395 | 1007 / 3 (0 / 1) | 1025 / 3 (18 / 1) |
| Property Rename | 151.0s (149.1s–152.9s) | 238.4s (234.4s–242.4s) | +58% | 151.0s / 151.0s | 238.4s / 238.4s | 69690 / 17423 (0 / 0) | 87618 / 26387 (17928 / 8964) |
| Option Rename | 18.2s (17.7s–18.7s) | 28.4s (28.1s–28.6s) | +56% | 18.2s / 18.2s | 28.4s / 28.4s | 20157 / 1392 (0 / 0) | 29030 / 2105 (8873 / 713) |
| Property Delete | 154.7s (154.5s–155.0s) | 249.5s (248.1s–250.9s) | +61% | 154.7s / 154.7s | 249.5s / 249.5s | 70380 / 17364 (0 / 1) | 88074 / 26212 (17696 / 8849) |
| Page Rename | 10.9s (10.7s–11.1s) | 17.2s (17.2s–17.3s) | +58% | 10.9s / 10.9s | 17.2s / 17.2s | 4381 / 1192 (0 / 0) | 5003 / 1814 (622 / 622) |
| Space Rename | 1156 (1134–1178) | 1511 (1478–1543) | +31% | 762 / 1156 | 1117 / 1511 | 297 / 61 (0 / 0) | 328 / 92 (31 / 31) |
| Context Rename | 105.8s (104.4s–107.2s) | 180.4s (180.3s–180.5s) | +71% | 105.6s / 105.8s | 180.4s / 180.4s | 38483 / 12573 (0 / 0) | 44760 / 18916 (6343 / 6343) |
| Page Restore | 16.8s (16.8s–16.8s) | 18.9s (18.5s–19.2s) | +12% | 16.3s / 16.8s | 18.9s / 18.9s | 16517 / 1261 (12750 / 6) | 4403 / 1891 (639 / 637) |
| Set Restore | 1061 (1055–1067) | 628 (613–642) | -41% | 588 / 1061 | 256 / 628 | 831 / 13 (321 / 0) | 325 / 1 (161 / 0) |
| Empty One Bundle | 77 (77–77) | 117 (113–121) | +52% | 77 / 77 | 116 / 117 | 148 / 2 (141 / 0) | 148 / 2 (141 / 0) |
| List Trash (After) | 83 (82–84) | 134 (133–134) | +61% | 83 / 83 | 134 / 134 | 98 / 0 (98 / 0) | 98 / 0 (98 / 0) |

---

#### 3. What Scales With the Trash

- **Baseline:** cascades don't touch the Trash, so renames, deletes, and opens stay flat as it fills. A page restore reads every trashed page to find trashed holders and parked links (`trashedHolders`, `parkLinks`): 12,750 Trash reads at Large-50, adding 4.8 s (12.0 s → 16.8 s), about 0.38 ms per trashed page per restore. Listing, emptying, and a Set restore read every bundle's record, cheap but linear.
- **Reach-In:** every cascade grows with how many trashed pages hold its key, since each trashed holder is one more rewritten file at the same ~7–10 ms as a live one: at 50% the property rename, option rename, property delete, page rename, and Context rename cost +49–71% at Medium and Large (+20–54% at Small, where fixed costs weigh more), the page delete +42–48% at Medium and Large and +22% at Small (it strips trashed holders), and the page restore refills them (+7–12% over the baseline, whose scan it replaces). A cold open seeds every trashed page (+44–48% at 50%), and a warm open stats them (+10–13%). Listing and emptying cost +20–60% for identical I/O, since `nexusPages` claims every trashed index row into `byId` on each call. The Set restore is the one consistent win, 41–43% faster at Large with no scrub.
- **Crossover:** none inside this matrix. At an empty Trash the builds sit within noise (−1% to +4% over the whole sequence). The reach-in pays about 7–10 ms per trashed holder on every cascade, and saves about 0.2–0.4 ms per trashed page on every page restore plus the scrub; it breaks even only where restores outnumber cascades by roughly 26 × the cascading key's share of trashed pages: about 18 restores per property rename at 70% density, or about one per page delete at 5%. Both sides scale with the per-file write cost, so a faster write path shrinks the reach-in's absolute penalty without changing the ratio.

---

#### 4. Spot Checks

Taken in each cell's first run. Every one passed in the prototype and held identically at every size and fill; the baseline columns show what today's code does.

| Check | Reach-In | Baseline |
|---|---|---|
| A trashed copy carries a property's new key after its rename (Large-50: 8,964 copies) | All renamed, none left on the old key | None renamed |
| A deleted property leaves trashed copies (Large-50: 8,848) | Stripped, recorded in the property's bundle | Kept |
| A page rename re-spells trashed backlinks (Large-50: 622) | All re-spelled | None |
| A Context rename re-keys trashed members (Large-50: 6,343) | All re-keyed | None |
| A page delete strips live Link values naming it | All stripped (1,253 at Large) | All stripped |
| …and trashed holders' values (Large-50: 631) | Stripped, then refilled by the restore | Untouched |
| The restored page reads current: renamed property key, renamed option, renamed Space, renamed Context key | **Yes**, all four | **No**: it returns with `Category:`, the old option word, the old Space title, and `<Topics>:` |
| The restore refills the Link values its delete stripped | Yes, live and trashed | Yes, live |

The trashed pages never entered the resolving world: the live strip ran in full in every cell, so the delete rows are faithful.

---

#### 5. Where the Time Goes

Baseline build, Medium-0, each operation on a fresh clone's warm instance, with the main (host) process profiled over its inspector (`Profiler.start`/`stop`, 250 µs sampling), `fs.fsync` timed inside its callback, and, in a separate pass, every machine and `fs` call tallied by its caller. A third pass skipped the flush (`fs.fsync` answering at once) to measure it by removal. Profiles and tallies are in `profiles/`; `node analyze-profile.mjs <op> [fn,…]` reads them.

##### The Split

| Operation (files written) | Wall | Main Thread Busy | fsync, Measured | Without fsync |
|---|---|---|---|---|
| Property rename (7,027) | 48.4 s | 10.8 s (22%) | 27.9 s (58%) | 17.2 s (−64%) |
| Context rename (4,927) | 34.4 s | 7.9 s (22%) | 20.6 s (60%) | 20.1 s (−42%) |
| Page rename (522) | 4.1 s | 1.1 s (21%) | 2.1 s (51%) | 1.8 s (−55%) |

The main thread sits idle for 78% of every rename, waiting on the threadpool. The flush is the largest share at 51–60% of wall, and removing it saves 42–64%. The remaining ~11 s of idle time in the property rename is the other awaited syscalls: write-file-atomic's open, write, close, chown, chmod, rename, and its JavaScript `realpath` (about 12 `lstat`s per file, one per path segment), plus the app's reads, stats, and `utimes`, all sharing libuv's four threads with chokidar's own `lstat` flood.

##### Main-Thread Time, Property Rename (10.8 s Busy)

| Function (Inclusive) | File | Time | Share of Busy |
|---|---|---|---|
| `indexWrittenPage` (the own-event index step) | `Core/Index/indexSeed.ts:109` | 3.44 s | 32% |
| …`upsertPageIndexes` → `inTransaction` (one SQLite transaction per page; `node:sqlite`'s native `exec` self time 2.1 s, the largest self entry) | `Desktop/Store/stores.ts:59`, `Desktop/Store/driver.ts:19` | 2.63 s | 24% |
| `parseDocument` (every frontmatter parse in the pipeline) | `yaml` | 2.10 s | 20% |
| chokidar's directory rescans: `_read` 1.80 s, `filterPath` 0.73 s | `readdirp/index.js:105`, `chokidar/index.js:204` | 2.53 s | 23% |
| `pageRecordOf` (the tree patch's parse) | `Core/Nexus/readNexus.ts:115` | 0.74 s | 7% |
| write-file-atomic's JavaScript (`writeFileAsync`) | `write-file-atomic/lib/index.js:80` | 0.70 s | 6.5% |
| `findHolders` (the clash pre-check, synchronous part) | `Core/Index/keyHolders.ts:79` | 0.52 s | 4.8% |
| `applyEvents` / `applyPage` / `patchLiveTree` | `Core/Nexus/fileEvents.ts:647`, `:361`, `Core/Nexus/liveTree.ts:38` | 0.47 / 0.43 / 0.03 s | ≤ 4.4% |
| `rewritePreservingTimes` (synchronous part) | `Core/Files/atomicWrite.ts:28` | 0.35 s | 3.2% |
| `recordWrite` | `Core/Files/writeEcho.ts:23` | 0.12 s | 1.1% |
| `dropOwnEchoes` / `serializeOnFile` / `_awaitWriteFinish` | `Core/Files/writeEcho.ts:98`, `Desktop/Platform/fileLock.ts:7`, `chokidar` | 7 / 4 / 13 ms | ~0 |

The Context rename's shape is the same: `indexWrittenPage` 29% of busy, `upsertPageIndexes` 22%, readdirp and `filterPath` 25%, `parseDocument` 16%. In the page rename, chokidar's rescans are the top busy item (42%). A CPU profile shows only the synchronous slices of async functions, so `findHolders`, the walks, and the sweep's own I/O read small here; their I/O lands in the idle share.

##### Where Each Read and Stat Comes From

- **Property rename, per written file:** three `readText`s, from `findHolders` under `rekeyPlan` (the clash pre-check), the sweep's own read, and `cachedParse` under `readPageRecord` (the settle's `registerHeldOptions`); three `stat`s, from `rewritePreservingTimes`, `indexWrittenPage`, and the same `cachedParse`; one `readBytes` from `dropOwnEchoes`. Outside the machine seam, write-file-atomic adds a `stat`, about 12 `lstat`s (its JavaScript `realpath`), and open, write, fsync, close, chown, chmod, rename, and a failed `unlink`; chokidar adds about 7 `stat`s (5 from `awaitWriteFinish`'s 50 ms polling) and, through readdirp, about 28 `lstat`s and a third of a `readdir`.
- **Context rename:** the 14 stats per file are the walks. In the first tallied run, 50,000 of 68,989 `stat`s were `cachedParse` under `readDirectPages` inside `readNexus`, five full walks of Medium's 10,000 pages, plus 2,500 Space sidecars and 1,000 `pathExists` checks from the same walks. That run's tally file was overwritten by a rerun that added timestamps and finer callers; the saved `profiles/renameContext.stacks.json` is that rerun, which walked once (25,429 `stat`s: 10,000 page stats, 500 sidecars, 200 `pathExists`, and three per written file). In both, the three per-file `stat`s match the property rename's, and the rename's two `readText`s per file are the sweep's read and the settle's, with no clash pre-check.

##### The Investigation's Predictions

| Prediction | Verdict |
|---|---|
| The drive flush (write-file-atomic's fsync, F_FULLFSYNC) is about 85% of wall time | **Refuted in size, confirmed in rank:** 51–60% measured inside the callback, 42–64% saved by removing it. It's still the largest single cost |
| Per-page index commits are the largest main-thread self time | **Confirmed:** SQLite `exec` (each page's `BEGIN`/`COMMIT`) is the top self entry at 2.1 s, and `upsertPageIndexes` is 24% of busy |
| Repeated YAML parses come next | **Confirmed, tied:** `parseDocument` is 20% of busy, level with chokidar's directory rescans (23%), which no one predicted |
| A Context rename runs about five full re-walks, because `runWalk` restarts while writes land | **Confirmed as a range, timing-dependent:** three flushed runs walked 1, 2, and 5 times; with the flush removed, the same rename restarted its walk 177 times (1.95 million `stat`s), though it still finished 42% faster |
| chokidar's `awaitWriteFinish` polls `stat` | **Confirmed, but minor:** about 5 polling `stat`s per file and 13 ms of CPU. chokidar's larger cost is readdirp rescanning each directory a write touches, about 28 `lstat`s per file and 2.5 s of CPU per Medium property rename |

**What triggers the mid-sweep walks:** every walk start came from the settle's `walkWhileOwed` (`Nexus/settle.ts:115`) → `refreshTree` → `runWalk`. A Context rename owes a walk before its sweep writes anything, from the Contexts folder move and the registry's title change (`owed.walk`, `Nexus/fileEvents.ts:663`), and the first walk started about 0.7 s into the sweep, so a settle running during the sweep pays it; since the reply's own settle comes after the sweep, that's *inferred* to be the watcher's batch drain settling the folder move's events. `runWalk` (`Nexus/liveTree.ts:103`) discards and restarts a walk whenever the epoch moved while it read, and `applyOwn` bumps the epoch on every own write (`diskMoved`), so the number of restarts depends on how many writes land during each walk's read. That's why removing the flush, which packs writes closer together, multiplies the restarts.

---

#### 6. The Trade-Off

**In plain words:** with an empty Trash the two models cost the same. As the Trash fills, the reach-in model gets slower at almost everything, because every rename or delete has to rewrite the trashed copies too, and every rewritten file costs as much as a live one. At half the Nexus's size in the Trash, the whole operation sequence ran 41–60% longer. What it buys is correctness and less code: a restored page comes back current, which today's restore doesn't manage after a rename, and the scrub, the link-target repair, the trashed-copy refill, and the parking scan all lose their reason to exist (`Trash/restoreScrub.ts` alone is 233 lines). The baseline is faster for a reason that doesn't hold up: it defers the reconciliation to the restore, and the restore can't do it.

What it means for the decision: the reach-in's cost is linear in trashed holders times the per-file write cost, so it rides directly on the write path. If the write-path plan brings a rewritten file from ~7 ms toward ~1–2 ms, the reach-in's +50% at a half-full Trash becomes a much smaller absolute number, and a Trash that's routinely emptied keeps it near zero. A model where the Trash keeps pages current only for the keys a restore needs (or reconciles by id at restore, from the registry's rename history) would be the alternative to weigh, since the baseline's frozen-copy model, as built, returns stale pages.

##### Surprises and Correctness Problems

- **The baseline's restore doesn't read current.** After a property rename, an option rename, a Space rename, and a Context rename while a page sat in the Trash, the restored page came back with the old key, word, title, and Context key in every cell. `scrubReturning` re-spells only format and casing variants of current names (`matchOf` over label spellings, `Trash/restoreScrub.ts:46-58`); a rename made while the page was trashed leaves no spelling to match. The returning values read as foreign keys.
- **The baseline keeps a deleted property's values on trashed copies** until the property's own bundle is emptied, by design; the reach-in strips them at once and records them for the property's restore, which is the semantic change behind one of the prototype's failing tests (below).
- **The prototype's unit tests:** 21 of 1,990 fail across `Core/Trash`, `Bundles`, `Archive`, `Index`, `Nexus`, `Paths`, and `Files`. Most pin the behaviors the prototype deliberately removes: the scrub's re-spellings, recorded `targets`, `corpusFiles` never reading `.trash`, and a Set delete clearing its index rows. Two are worth a look before any real design: `Archive/archive.test.ts` "a trashed page's link to an archived page follows it to where it lands on restore" (the `targets` repair carried this case, and nothing in the prototype replaces it), and `Trash/spend.test.ts` "a live property holding the key keeps it" (a later property reusing a deleted property's key no longer inherits trashed copies' values).
- **The write path dwarfs both models.** About 7 ms per rewritten file, from the flush, the per-page index transaction, five or six YAML parses, and chokidar rescanning each touched directory; the reach-in question is a multiplier on that number.
- **Skipping the flush alone makes walk restarts explode** (1–5 → 177 on a Context rename). A write-path change should batch the own-event path, or settle the walk once the sweep ends, along with any change to the flush.
- **chokidar's directory rescans** (readdirp) cost as much CPU as all of the YAML parsing and put about 200,000 `lstat`s on the threadpool per Medium property rename.
- **Listing and emptying slow down in the reach-in for the same I/O,** because `nexusPages` claims every trashed index row into `byId` on each call; a real design would scope that.

---

#### 7. Cleanup

Done and checked: both worktrees are removed and pruned (`git worktree list` shows only the main checkout), every benchmark Nexus built in `~` was moved out at once and is deleted with its fills, live clones, and scratch userData (index databases included; the generator's sweeps ran against a scratch userData, so `~/Library/Application Support/Pommora/Nexuses` holds only its one prior entry), no `~/Benchmark-*` remains, no process launched from the harness is running, and debug ports 9391–9396 are free. Nothing was committed and no branch was made. What stays here is the harness (`RERUN.md`, both patches, the scripts), `results/`, `profiles/`, and this document.
