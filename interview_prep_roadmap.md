---
document_id: interview_prep_roadmap
merge_schema_version: "1.0"
revision: 9
previous_revision: 8
parent_files:
  python_coding_interview_roadmap: {revision: 6, file_sha256: "fbf72db5bb751f45fdd828abbd39ca7484132b3127e256cb184427a809d0ffae"}
  product_engineering_interview_roadmap: {revision: 2, file_sha256: "e5203a2027bc59660cc39dfff3c96069b88fff6ecfcfaee208a41d821b98ace1"}
parent_file_sha256: "9a0ce0c35f765f3e3f235316efc9035cb6084ced16702bee848fec0e4f23346c"
updated_on: "2026-09-19"
canonical_filename: interview_prep_roadmap.md
learning_mode: BREADTH_FIRST_ADAPTIVE
diagnostic_policy: TIERED_DIAGNOSE_REPAIR_VERIFY
promotion_policy: STRICT_CURRENT_TIER_COMPLETE_PER_TRACK_WITH_TIER_LEAD_LIMIT
tracks: [PY, PE]
merge_rules_sha256: "9b9356e55f49e72a2112b3178c4626b74577d2667e6e486fcc18211ef6e44be9"
py_curriculum_sha256: "ee4404756df4a42ce6eb9100939ba32cc1193f52ab2f686984e39e6a0c752737"
pe_curriculum_sha256: "c62ed312b1e982b236eda4b897f8a7281264823ae7c09c7fb105f6b1f67d15ee"
---

# Interview Preparation Roadmap — Merged Tracks

**One file, one study session, one scheduler. Each track keeps its own breadth-first tiers; the shared layer interleaves them and keeps either track from racing ahead.**

This file merges two previously separate roadmaps into tracks that are studied together in a single conversation:

| Track | Scope | Origin | Lineage at merge |
|---|---|---|---|
| **PY** | Python coding interviews: 16 topics, 80 objectives | `python_coding_interview_roadmap` | Revision 6; three sessions of study (S0001–S0003); Tier 1 DIAGNOSE_ALL 14/16 sampled |
| **PE** | Product engineering interviews: 20 core topics plus X03, 103 objectives | `product_engineering_interview_roadmap` | Revision 2; no study yet |

The backend `system_design_interview_roadmap` remains a separate file. It can be added later as track **SD** using Section M7 without redesign.

**How to read this file.** Read Part S (shared operating contract, shared progress, merge rules) first. Then read each track part: its own operating contract, progress block, and curriculum. Section numbers inside a track part (for example "Section 3.1" or "0.4") refer to that part only. Track curricula are byte-identical to their source files, so their original digests still verify.

## S. Shared operating contract

**Merge precedence.** The merge rules in Section M govern everything that crosses tracks or concerns the file itself: session and identifier allocation, visit interleaving, the tier-lead limit, cross-track evidence, file identity, saving, delivery, and validation. Inside a track, that track's operating contract and curriculum govern assessment, tiers, gates, evidence standards, and scheduling within the track. Where a track rule names its old canonical filename, its own revision numbering, or its own session counter, read it as referring to this merged file and its shared counters.

**One learner, two ladders.** Each track has its own DIAGNOSE_ALL → REPAIR_VERIFY → TIER_GATE cycle and its own denominators. A pass, gap, or tier state in one track never changes the other track's records by inference. A single real attempt may produce separately scoped evidence rows in both tracks only under Section M4.

**Interleave by default.** The AI decides which track serves the next primary visit using Section M3. The learner does not need to switch conversations, pick a track, or manage two files.

**Use representative idioms.** Teaching, diagnostic, and review examples default to common, idiomatic code for the target stack. Do not introduce uncommon, clever, archaic, or style-guide-disfavored syntax merely to exercise another concept. Such syntax may appear only when understanding that syntax is itself within the objective or is a realistic interview/maintenance requirement; label it as uncommon when material, and never score unfamiliarity with that style as a gap in a different concept.

**Keep breadth across tracks.** A track may be at most one tier ahead of the other track's highest CLEARED tier (Section M3.3). This preserves the learner's breadth-first preference at the level of the whole preparation plan without freezing coding practice until every product objective clears.

**Save the whole file.** On an explicit save, wrap-up, or clear session end, update the shared progress and every affected track block, validate under Section M6, and return this entire file as `interview_prep_roadmap.md`. Never return a single track as a separate file unless the learner explicitly asks to split the merge (Section M7).

**Handoff boundary.** State the generated merged revision and that the learner should keep it locally and upload it next session, replacing both old roadmap files as working copies. Generating a file does not update any Project Source. Never promise an automatic save.

<!-- BEGIN SHARED_PROGRESS -->

## S0. Shared progress

### S0.1 Unified dashboard

This table is derived from the track blocks; the track blocks are authoritative.

| Track | Active tier / phase / wave / lap | Sweep | Required checkpoint passes | Pending or unfinished | Next track action |
|---|---|---|---|---|---|
| PY | Tier 1 / REPAIR_VERIFY / W1 / L02 | 16/16 sampled; W0 sweep complete | 2/240; D1 2/80 | None | Continue L02 at T11; S0006 served T09/T13/T16/T03/T07 |
| PE | Tier 1 / DIAGNOSE_ALL / W0 / L01 | 23/24 roster entries sampled; X08 sampled; X09 unvisited | 8/337; D1 8/112 | None; S0006-A18 superseded only after S0007-A01 issued | Finish X09 after the next due-review/ratio turns |

| Field | Current value |
|---|---|
| Learner | Mid-level engineer pivoting from internal tools to customer-facing product work; details in PE Section 0.1 (contact details deliberately not stored) |
| Locked career target | Full-stack product engineer, strongest on the frontend, building the core customer-facing product at (1) product-led consumer, creative, or prosumer software companies, (2) AI-native companies with user-facing AI products, and (3) stretch: consumer product teams at large tech companies. Launch-driven culture and competitive pay. Excluded: internal IT or tools, public sector and school districts, agencies, C++/embedded/game engines, native-mobile-only, pure infrastructure, maps/routing, data engineering (DEC0017) |
| Timezone | America/Toronto |
| Study sessions to date | S0001–S0007; S0007 is open and currently contains a PE X08 visit plus this mid-session policy/save update |
| Retention | Not yet assessed; S0004 reviews due 2026-09-18 are now due/overdue and remain unserved without changing their passes. PY:T06.1 and PE:T06.4 D1 reviews are due 2026-09-19 |
| Readiness | Not established in either track; each track reports its own readiness results |

### S0.2 Shared scheduler and resume packet

Operational state, not evidence. Recompute after every primary visit.

| Field | Current value |
|---|---|
| Interleave mode | RATIO 1 PY : 2 PE over a rolling window of primary visits (DEC0019, revising DEC0013) |
| Track served by the last primary visit | PE (S0007, X08 completed as a bounded D1 visit) |
| Next track in alternation | PY; S0007-A01 resolved the unfinished PE X08 obligation, so the ratio returns to PY. On PY's turn, service the oldest due review before ordinary L02 work |
| Planned continuation order | 1) PY: service the oldest due review, then ordinary L02 breadth remains T11. 2) PE: service at most one due review on its turn, then finish the remaining W0 topic X09. Continue the 1 PY : 2 PE ratio and each track's review rules |
| Tier-lead status | PY may work through Tier 2 now; PY Tier 3 requires PE Tier 1 CLEARED. PE may work through Tier 2 now; PE Tier 3 requires PY Tier 1 CLEARED |
| Tracks with no runnable work | None |
| Learner ratio or deadline override | None |
| Next action in this conversation | S0007 remains open after this requested mid-session roadmap revision. The next study visit is PY by ratio, starting with its oldest due review before ordinary T11 breadth |
| Next action after a new-session upload | If a later save does not close S0007 and this revision is used in a genuinely new session, treat S0007 as INTERRUPTED_AT_LAST_SAVE, allocate S0008, and continue from the same state: PY due review first, then ordinary PY T11; PE still needs X09. Do not repeat X08 or resurrect S0006-A18 |
| Reserved next identifiers (shared counters) | S0007-A01–A02 and S0007-EV01 are allocated in the open session. Next S0007 attempt A03 and evidence EV02; next global gap G0049; next shared decision DEC0028. A genuinely new session after S0007 is S0008 |
| Save anchor | Merged revision 9, 2026-09-19, is a mid-session save from uploaded merged revision 8 (parent SHA-256 `9a0ce0c35f765f3e3f235316efc9035cb6084ced16702bee848fec0e4f23346c`). Next distinct saved change becomes merged revision 10 |

### S0.3 Shared decisions

Cross-track and file-level decisions use the shared counter. Historical track decisions keep their original numbers and are cited with a track prefix (`PY:DEC0002`, `PE:DEC0007`). The numbers DEC0011–DEC0014 were chosen above the highest decision number in either source, so no bare ID is ambiguous.

| Decision ID | Date / session | Type | Affected scope | Reason and authority | Revisit / expiry | Status |
|---|---|---|---|---|---|---|
| DEC0011 | 2026-09-15 / structural | FILE_STRUCTURE | Both roadmaps and all future saves | Learner asked to stop alternating between two roadmaps in two sessions and gave the AI freedom to choose between a shared file of independent roadmaps and a smarter merge. Chosen design: one file and session, per-track ladders preserved byte-for-byte, a shared scheduling and identity layer. Track rule text is preserved rather than deduplicated to avoid losing the PY track's audited policy details and live evidence semantics | Revisit if file size becomes a practical problem; lossless deduplication would be a separate policy change | ACTIVE |
| DEC0012 | 2026-09-15 / structural | GATING | Tier progression in both tracks | Per-track tier gates, plus a tier-lead limit: a track may not open tier k+2 until the other track has CLEARED tier k. A single combined gate was rejected because PY Tier 2 (independent implementation) would wait behind 103 PE D1 checkpoints, stalling coding practice that interviews test directly | Persistent until the learner changes it; the learner may lift or tighten the limit explicitly | ACTIVE |
| DEC0013 | 2026-09-15 / structural | INTERLEAVING | Primary-visit order across tracks | Alternate tracks one primary visit at a time. Switching tracks per visit is no more disruptive than the topic switching each track's breadth rotation already does, and mixing problem types is consistent with interleaved-practice research. The learner may set a larger block size or a ratio at any time | Revised by DEC0019 to a 1 PY : 2 PE ratio | REVISED |
| DEC0014 | 2026-09-15 / structural | IDENTIFIERS | All IDs | Track-qualified objective, topic, integration, decision, and ENV IDs (`PY:T05.2`, `PE:T05.2`, `PE:ENV03`). Shared global counters for sessions, attempts, evidence, gaps, and new decisions. Historical PY IDs S0001–S0003, G0001–G0027, DEC0001–DEC0010 are unchanged | Persistent | ACTIVE |
| DEC0017 | 2026-09-15 / administrative | CAREER_TARGET | Scenario selection and emphasis in both tracks | Learner locked the target recorded in S0.1 after discussing launch-driven products, pay for pressure, and avoiding a return to internal tools. Scenarios in both tracks favour consumer, creative, and AI product settings | Revisit if applications or interviews show a different market fit | ACTIVE |
| DEC0019 | 2026-09-15 / administrative | TRACK_BALANCE_AND_FORMATS | Cross-track ratio; AI-enabled coding practice | Two interview-loop research reports (S0.6) agree that algorithms remain in many loops but carry roughly a third or less of preparation weight for the main tier, with more at large tech. Set the ratio to 1 PY : 2 PE. Keep PY at full scope. Cover AI-enabled coding rounds through M4 combined tasks once PY Tier 2 and PE Tier 3 are open (PE T14, T20, I02 with PY implementation and complexity objectives); practice both AI-assisted and unaided modes, since round-level AI policy varies; real practice is PE ENV03 and ENV05 | Move toward 1:1 when a stretch-tier loop is scheduled, or follow a recruiter-confirmed loop under M3.2 rule 3 | ACTIVE |
| DEC0020 | 2026-09-15 / administrative | TRACK_DEFERRAL | `system_design_interview_roadmap` as a future track SD | Not added now. Both reports agree mid-level frontend-leaning product loops emphasize frontend system design and product architecture, now covered by PE X07 plus T10, T16, T19 and I01; one report recommends selective backend depth for large tech, the other suspending it. Adding the track would push the file near 600 KB and dilute breadth | Add under M7 when stretch-tier applications begin, or when a recruiter-confirmed loop includes a backend system design round | ACTIVE |
| DEC0023 | 2026-09-15 / S0004 | ASSESSMENT_METHODOLOGY | Both tracks; prompt design and evidence integrity | Learner explicitly called out answer leakage and irrelevant arithmetic drill, and the session also exposed two assistant topic-scope mismatches. Future probes must withhold the hidden criterion, stop once the target reasoning is demonstrated, avoid filler arithmetic/restatement checks, and verify the actual roadmap objective before issuing a topic-labelled prompt. A prompt that supplies its own answer or assesses the wrong objective is assisted or INVALIDATED, never an independent learner failure | Persistent; apply to all later diagnostics, repairs, and reviews | ACTIVE |
| DEC0024 | 2026-09-16 / S0005 | ASSESSMENT_CORRECTION | Both tracks; scenario assumptions and objective labels | Learner correctly challenged an underspecified PE T12 prompt whose answer depended on an unstated recurring-subscription model. The session also exposed a stale-response task labelled T11 even though it assessed T06.4. Material business/contract assumptions must be stated before scoring; wrong labels are remapped only when the actual task cleanly assesses another objective, otherwise invalidated. Neither error creates learner failure | Persistent; apply to future prompt construction and evidence mapping | ACTIVE |
| DEC0025 | 2026-09-18 / S0006 | PRACTICE_LANGUAGE | PE code examples and combined PY/PE coding tasks | Learner clarified that practice code should use TypeScript and Python. Use TypeScript for frontend/UI/runtime examples and Python for backend/algorithm work. Avoid plain JavaScript snippets unless JavaScript-specific syntax or an explicitly JavaScript-only interview constraint is itself the point; JavaScript runtime concepts such as closures and promises should normally be shown in valid TypeScript. This changes practice format only, not objective scope or target depth | Persistent until learner changes language preference or a specific interview requires another language | ACTIVE |
| DEC0026 | 2026-09-18 / S0006 | ASSESSMENT_AND_SCHEDULER_CORRECTION | Both tracks; S0006 prompt integrity, review scheduling, and saved-state audit | S0006 exposed several assistant-side issues: PY T09 feedback initially misread a correct suffix-contract explanation; an accidental PE T06 validation prompt was issued while T11 was scheduled; PY T13 wording shifted from any repeated subproblem to `f(5)` itself; PE T07 used state-category labels before teaching them; and PE X03 used ambiguous `product failure` wording but graded against a narrower UX/reliability meaning. None creates learner failure. The save audit also found a stale cross-track ledger reference that incorrectly put PE S0005-EV05 into PY:T06.4 and a stale PE dashboard/ledger that omitted the already-recorded PE:T06.4 pass. Correct those records, and preserve due/overdue reviews without inventing failures | Persistent interpretation of S0006 and revision-8 state; future prompts must state material terminology/criteria before scoring and scheduler must check due reviews | ACTIVE |
| DEC0027 | 2026-09-19 / S0007 | PRACTICE_STYLE | Both tracks; all generated teaching, diagnostic, review, and example code | Learner requested that the roadmap avoid teaching uncommon coding styles as incidental material. Default examples to common, idiomatic patterns used in the target stack and realistic interviews. Do not use clever, archaic, uncommon, or style-guide-disfavored syntax merely to probe another concept. If uncommon syntax is itself relevant, identify it as such and assess it only under the objective that actually requires it. The S0007 X08 closure follow-up using prefix increment `++x` is treated as an assistant-side confound, not a learner gap; prefer explicit/ordinary increment-and-return forms when closure behavior is the target | Persistent until learner changes the preference or a specific interview/maintenance scenario explicitly requires the uncommon syntax | ACTIVE |

### S0.4 Merged session history

One row per study session after the merge. Pre-merge sessions stay in their track's history.

| Session | Date | Tracks and primary visits served | Evidence rows by track | Handoff |
|---|---|---|---|---|
| S0004 | 2026-09-15 | PY: T15, T05, T01.1, T01.2; PE: T01, T04, T10, T13, T18, T20. Two wrong-scope PE prompts were INVALIDATED and PE T02 was issued but unanswered. | PY: S0004-EV01, EV02, EV06, EV09, EV13. PE: S0004-EV03–EV05, EV07–EV08, EV10–EV12. | S0005 starts with the pending PE T02 metric scope, then PE T05 and PY T02 under the 1:2 ratio |
| S0005 | 2026-09-16 | PE: T02, T05, T06, T14, T19, T12; T15 issued unanswered. PY: T02, T06, T08. One PE T06 task was mislabelled T11; one T12 prompt was invalidated for an unstated subscription model. | PY: S0005-EV04, EV07, EV10. PE: S0005-EV01–EV03, EV05–EV06, EV08–EV09, EV11. | S0006 starts with pending PE T15, then PY T09 and PE T11 under the 1:2 ratio |
| S0006 | 2026-09-17–2026-09-18 | PY: completed bounded L02 visits T09, T13, T16, T03, T07. PE: completed W0 visits T15, T11, T03, T07, T16, T08, T17, T09, X03, X07; X08 issued unanswered. One incidental PE T06 prompt, several assistant wording/terminology corrections, and an ambiguous X03 attempt were preserved without learner penalty. | PY: S0006-EV02, EV06, EV09, EV13, EV16–EV17. PE: S0006-EV01, EV03–EV05, EV07–EV08, EV10–EV12, EV14–EV15, EV18. | S0007 starts by replacing pending PE X08 with TypeScript same-scope work, then honors due reviews and the 1:2 ratio; PY ordinary breadth resumes at T11 and PE W0 still needs X09 |
| S0007 | 2026-09-19; OPEN at mid-session save | PE: X08.1 bounded TypeScript closure/runtime visit. A01 produced independent closure-state reasoning; A02's `++x`-based follow-up was invalidated as an uncommon-style confound. Shared DEC0027 added the representative-idiom policy. | PE: S0007-EV01. No PY visit yet in S0007. | Continue S0007 with PY due review by ratio; PE later services at most one due review and then X09 |

### S0.5 Merged revision history

| Merged revision | Date | Change | Learning credit |
|---|---|---|---|
| 1 | 2026-09-15 | Structural merge of `python_coding_interview_roadmap` revision 6 and `product_engineering_interview_roadmap` revision 2 into tracks PY and PE. Both curriculum blocks copied byte-for-byte (digests verified). Track progress blocks copied with only pointer edits to shared counters, plus one migration row each. Added shared contract, scheduler, decisions, and merge rules | None; all track evidence, gaps, pending attempts, and denominators preserved unchanged |
| 2 | 2026-09-15 | Recorded PY:DEC0015: Python confirmed as the coding-interview language; updated the PY profile row and shared decision counter. No study session; block digests unchanged | None |
| 3 | 2026-09-15 | Recorded PY:DEC0016: no fixed Python version or interview platform; portability policy replaces the pending environment confirmation. No study session; block digests unchanged | None |
| 4 | 2026-09-15 | Target locked and study design updated from two interview-loop research reports: shared DEC0017 (target), DEC0019 (1 PY : 2 PE ratio, AI-enabled coding plan), DEC0020 (system design deferred); PE:DEC0018 (FRONTEND_HEAVY replaces B2B_SAAS, I04 deselected) and PE:DEC0021 (new extensions X07–X09, PE curriculum digest recomputed); PY:DEC0022 (scenario emphasis). Added S0.6. No study session | None |
| 5 | 2026-09-15 | Audit of revision 4. Structure, digests, table columns, checkpoint counts, board-to-ledger totals, and identifier uniqueness passed. Corrected PE curriculum wording that still hard-coded default counts (100/100/93 D-checkpoints, three D4, I01–I06) so gates follow active targets and selected integration areas; corrected PE Tier 4 sweep obligations from 24 to 22; linked X08.3 to ENV01 and ENV04. PE curriculum digest recomputed. No study session | None |
| 6 | 2026-09-15 | Saved S0004, the first merged study session. PY completed its Tier-1 diagnostic sweep and entered W1/L02 REPAIR_VERIFY; PE sampled six Tier-1 topics and stopped with T02 pending. Recorded 13 attempts, 13 scoped evidence rows, four new gap records, and DEC0023 methodology corrections; wrong-scope/answer-leaking prompts were not overcredited. Curriculum and merge-rule blocks unchanged. | PY: one D1 checkpoint pass (T05.2) plus narrower repair evidence; PE: four D1 checkpoint passes (T01.2, T10.1, T13.1, T20.1) plus partial/assisted facets. No higher-tier, transfer, integration, or retention pass. |
| 7 | 2026-09-16 | Saved S0005. PY served T02/T06/T08 in W1/L02 and independently cleared T06.1 D1. PE sampled six additional W0 topics (T02, T05, T06, T14, T19, T12), left T15 pending, and independently cleared T06.4 D1. Added DEC0024 for explicit material assumptions and correct objective labels; invalid/assisted prompts were not overcredited. Curriculum and merge-rule blocks unchanged. | PY: T06.1 D1 pass plus narrower T02/T08 evidence. PE: T06.4 D1 pass plus partial/assisted evidence at T02, T05, T06.1, T12, T14, T19. No higher-tier, transfer, integration, environment, or retention pass. |
| 8 | 2026-09-18 | Saved S0006. Advanced PY W1/L02 through T09/T13/T16/T03/T07 and PE W0 through ten additional sampled topics, leaving X08 pending and X09 unvisited. Added DEC0025 for TypeScript+Python practice and DEC0026 for prompt/scheduler corrections; audited and fixed the stale cross-track PY:T06.4 ledger reference and stale PE:T06.4 dashboard/ledger. Curriculum and merge-rule blocks remain byte-identical. | PY: new narrow independent facets at T09.1, T16.1, T03.3, T07.1/T07.2 plus guided T13.4 repair; no new full D1 checkpoint. PE: new D1 passes at T11.1, T09.1, T17.1 plus narrower/assisted facets at T15.1, T03.1, T07.1, T16.1, T08.1/T08.2, X03.1, X07.2. No higher-tier, transfer, integration, environment, or retention pass. |
| 9 | 2026-09-19 | Mid-session S0007 save. PE X08 was sampled with a TypeScript closure task, superseding the old plain-JavaScript pending attempt. Added DEC0027 and a shared operating-contract rule to prefer common idiomatic code and avoid incidental uncommon-style teaching. The `++x` closure follow-up is invalidated as an assistant-side confound. Curricula and merge-rule blocks remain unchanged. | PE: independent narrow X08.1 closure-instance/lexical-state facet S0007-EV01; no full D1 checkpoint pass. No PY learning evidence in this revision. |

### S0.6 Target interview-format context (reconciled 2026-09-15)

Context for scheduling and scenario choice, not learning evidence. A recruiter-provided loop always overrides it. Labels: A employer-documented, S secondary, R candidate-reported, B inference.

**Source reliability.** Two deep-research reports were supplied. Report 1 is the primary basis: it relies mainly on employer pages, dates its evidence, counts candidate reports, and leaves unknowns as unknown. Report 2 is used only where corroborated. Its access dates (March 2026) precede the update dates of sources it cites, several claims rest on interview-prep blogs presented as policy, it cites outdated model names, it asserts precise report counts without sources, and it recommends quantifying past work with example metrics, which must never be invented (PE X09.1). Its specific algorithm-framing examples are treated as unverified hypotheses.

| Setting | Reconciled evidence | Implication |
|---|---|---|
| Main tier, product-led | A — Canva replaced its CS-fundamentals screen with AI-assisted coding and expects candidates to use AI tools. A — Duolingo still runs a 60-minute algorithmic screen for experienced engineers plus pair programming in a production-like codebase, code review, and architecture/design. A — Linear's final stage for all roles is a paid 2–5 day work trial after conversations on coding, architecture, and design decisions. S/R — Shopify's current loop centres on pair or AI-assisted craft coding and a Life Story round; Notion, Figma, and Airbnb frontend loops combine practical UI work, frontend or product design, deep dives, and in some cases algorithms | Algorithms roughly 20–35% of preparation; practical codebase work, UI coding, frontend system design, and deep dives carry the most weight |
| AI-native | A — OpenAI's assessments vary among pair coding, take-homes, and technical tests, with AI permission set per assessment. A — Anthropic disallows AI by default in take-homes and live interviews, with specific exceptions such as a role-specific take-home in unfamiliar code. A — Replit uses live or take-home work and project walkthroughs. S — Cursor keeps an unaided early technical screen before a two-day onsite work trial | AI-native does not mean AI allowed; unaided fundamentals still matter; real-work fidelity dominates |
| Stretch, large tech | A — Amazon front-end and SDE II loops begin with timed coding and include frontend or software system design and Leadership Principles. A — Microsoft still asks for runnable code and names standard algorithm families. A/S — Meta's coding and design environments now include a built-in AI assistant, while one traditional coding problem without AI remains in the loop. S — Google is piloting AI-assisted code comprehension for selected US junior-to-mid teams in the second half of 2026 and reintroduced at least one in-person round | Algorithms roughly 45–55% of preparation; unaided Python speed matters |

**Agreed across both reports (B):** no new algorithm topics are needed; practise both unaided and AI-assisted modes because AI policy is set per round; add frontend system design, timed JavaScript/TypeScript UI coding, unfamiliar multi-file code work, and deep-dive narratives; do not assume a US pilot applies to Canadian loops; ask the recruiter about AI policy per round, coding environment, design-round scope, take-homes, and in-person attendance.

<!-- END SHARED_PROGRESS -->

<!-- BEGIN MERGE_RULES -->
## M. Merge rules

### M1. Structure and precedence

The file has three parts: Part S (shared contract, shared progress, merge rules), Part PY, and Part PE. Each track part contains its own operating contract, progress block between `BEGIN PY_PROGRESS`/`END PY_PROGRESS` (or PE), and curriculum between `BEGIN PY_CURRICULUM`/`END PY_CURRICULUM` (or PE).

Merge rules take precedence for: file identity, parent selection, revision numbering, saving and delivery; session, attempt, evidence, gap, and decision identifiers; choosing which track serves a primary visit; the tier-lead limit; and cross-track evidence. Track rules take precedence for everything inside their track: what counts as evidence, checkpoint scope, tier gates, laps, rotation, reviews, repair routes, and readiness. A merge rule never lowers a track's evidence standard or removes required scope.

Readiness is reported per track. Nothing in this file produces a combined "interview ready" claim.

### M2. Identifiers

**Qualification.** Topic, objective, integration-area, extension, ENV, and historical decision IDs are track-qualified whenever the track is not obvious from the table they sit in: `PY:T12.2`, `PE:T12.2`, `PY:I06`, `PE:X03.1`, `PE:ENV01`, `PY:DEC0008`. Inside a track's own tables, the bare form remains valid.

**Shared counters.** Sessions (`S0004`, …), gaps (`G0028`, …), and new decisions (`DEC0015`, …) are global across tracks. Attempts and evidence are numbered per session and shared across tracks within that session: if the first visit of S0004 is PY and the second is PE, they are `S0004-A01` in the PY attempt register and `S0004-A02` in the PE attempt register. Never reuse a number in the other track. Gaps are stored in the owning track's gap table with the global number.

**Historical IDs.** PY's S0001–S0003 attempts and evidence, G0001–G0027, and DEC0001–DEC0010 keep their numbers. PE's DEC0001–DEC0009 keep their numbers and are cited as `PE:DEC000n`. No historical record is renumbered.

**Codes.** Checkpoint codes follow each track's own schema; both PY and PE use U/G/P/R with P meaning passed. The separate system-design roadmap uses different codes; if it is added as a track, its codes stay track-local.

### M3. Cross-track scheduling

#### M3.1 Units and alternation

The unit of alternation is one **primary visit** as defined by the serving track (a bounded diagnostic visit, a repair-and-check visit, or a review-led visit). Neutral clarifications and the one permitted follow-up belong to the same visit and do not switch tracks.

Default mode ALTERNATE with block size 1: after a primary visit in one track, the next primary visit goes to the other track. With block size n, serve n visits in one track before switching. With a learner ratio (for example, 2 PY : 1 PE), follow the ratio over a rolling window. Record any mode, block-size, or ratio change as a shared decision.

#### M3.2 Choosing the next visit

Apply in order:

1. **Unfinished attempt.** If a track has an unfinished attempt carried into this session, serve it first under that track's own supersede-or-continue rule. It counts as that track's visit for alternation.
2. **Runnable work.** If the track due by alternation has no runnable work (for example, blocked by the tier-lead limit, or its only remaining items are deferred-by-gate reviews), serve the other track and record the reason in S0.2. Do not create filler work to preserve alternation.
3. **Learner override.** An explicit learner request for a track, ratio, or deadline focus applies for its stated scope. An interview deadline in one track may shift the ratio but never raises that track's tier ceiling or bypasses the tier-lead limit.
4. **Alternation.** Otherwise serve the track due by alternation, and within it follow that track's own selection rules exactly.

Each track's breadth rules (one primary visit per eligible topic per lap, no second visit before siblings) apply to that track's own visits only. Alternation does not count as a lap visit for the other track.

#### M3.3 Tier-lead limit

A track may open tier k+2 (its DIAGNOSE_ALL phase or any newly assigned work at that tier) only when the other track has CLEARED tier k. Equivalently, a track can be at most one tier ahead of the other track's highest currently valid CLEARED tier.

When the limit blocks a track, that track keeps doing any remaining work at or below its current ceiling (for example, due reviews within ceiling), and the other track receives the freed visits until the blocking tier clears. If a contradiction reopens a lower tier in the other track so that its CLEARED state becomes invalid, the limit re-evaluates immediately: the leading track suspends any work above the new limit using its own suspended-position rules. Only the learner can lift or change the limit; record it as a shared decision. The limit compares tiers only; it does not require equal numbers of checkpoints, sessions, or time.

#### M3.4 Reviews and exceptions

Each track keeps its own review schedule and exception rules. A due review is served on that track's alternation turn. When both tracks have due reviews, serve the older due date first. Scheduling exceptions affecting one track are recorded in that track's decision table if purely internal, or as a shared decision if they change cross-track order.

### M4. Cross-track evidence and combined tasks

**Default: separate tasks.** Ordinary visits assess one track. The AI may mention the track domain at the start of a visit ("coding" or "product") because that does not reveal a technique; it must not reveal the technique or objective when the serving track's rules forbid it.

**Combined tasks.** A single task may assess objectives in both tracks only when every assessed checkpoint is within its own track's current ceiling and the task is explicitly scoped for both before it is issued. Example of an allowed shape: a product scenario whose small implementation also exercises a PY technique, once both tracks have opened the needed depths. Combined tasks are optional and never required to clear a gate.

**Evidence rows.** A combined task gets one attempt ID, recorded in both attempt registers with the same ID and a note naming the other track. Each track then records its own evidence rows, with different evidence numbers, scoped to its own objectives and its own standards. Assistance is attributed per facet: help supplied for the product facet does not automatically taint an independent algorithm facet, and vice versa, but help that supplied the other facet's key step does.

**No inference.** Similar names across tracks (for example `PY:T01.5` testing and `PE:T13` testing strategy, or `PY:T16` interview execution and `PE:T03` communication) never let a pass, gap, or placement in one track change the other. Only observed, separately scoped evidence counts.

**Companion roadmaps outside this file.** PE's Section 1.7 rules about the system-design roadmap still apply. Its rules about the Python roadmap now read as rules about track PY, with the same no-inference boundary, relaxed only by the combined-task rule above.

### M5. Session loop

Open with one sentence giving each track's tier/phase and the next track to be served. Follow M3.2 for each primary visit and the serving track's session loop inside the visit. Keep one manageable response at a time.

At a save or session end, summarize per track: what was independently verified, which facets were preserved without a full pass, what remains uncertain, and the exact position to resume. Update S0.1, S0.2, S0.4 and each served track's progress block. A save does not end the session; a new session uses the next shared S number.

**Session disposition.** A session row appears once in S0.4 and, for each served track, once in that track's session-history table with the same S number. If only one track was served, the other track's table is not changed.

### M6. Saving, delivery, and validation

**Parent selection.** Load the complete merged file supplied for this task (`document_id: interview_prep_roadmap`). If the learner supplies an older separate track file alongside a merged file, treat it as historical and do not merge it again unless its revision is newer than that track's recorded lineage and the learner confirms; record any conflict rather than merging optimistically.

**Revision.** One merged revision per distinct saved change. Set `previous_revision` and `parent_file_sha256` (SHA-256 of the complete loaded merged file) as each track's protocol describes for its own file. Track progress tables that mention their own revision numbers keep their historical rows; new rows reference the merged revision.

**Digests.** Verify on load and preserve on routine saves:

| Field | Bytes covered |
|---|---|
| `merge_rules_sha256` | After the LF ending the `BEGIN MERGE_RULES` marker line, up to the `END MERGE_RULES` marker |
| `py_curriculum_sha256` | After the LF ending the `BEGIN PY_CURRICULUM` marker line, up to the `END PY_CURRICULUM` marker |
| `pe_curriculum_sha256` | After the LF ending the `BEGIN PE_CURRICULUM` marker line, up to the `END PE_CURRICULUM` marker |

An authorized policy change may edit a covered block with a decision record and recomputed digest.

**Delivery.** Return the complete file as `interview_prep_roadmap.md`, following each track's complete-replacement protocol for everything except the filename and parent rules above.

**Merged validation checklist.** In addition to each track's own checklist:

| Invariant | Required check |
|---|---|
| Markers | Exactly one BEGIN and one END for SHARED_PROGRESS, MERGE_RULES, PY_PROGRESS, PY_CURRICULUM, PE_PROGRESS, PE_CURRICULUM; no leftover unprefixed track markers |
| Digests | All three block digests match |
| Identifier uniqueness | No attempt or evidence number used in both tracks for different attempts; shared counters in S0.2 are above every used or reserved number; every cross-track reference is qualified |
| Alternation state | S0.2's last-served track, next track, and any override match the actual visits recorded |
| Tier-lead limit | No track has newly assigned work more than one tier above the other track's highest CLEARED tier without a shared override decision |
| Dashboard | S0.1 counts, phases, and pending attempts match the track blocks |
| Session rows | Every merged session appears once in S0.4 and once in each served track's history |
| Combined evidence | Every combined attempt appears in both attempt registers with the same ID and separate, correctly scoped evidence rows |

### M7. Adding, removing, or splitting tracks

**Adding a track (for example SD from the system-design roadmap).** Copy its curriculum byte-for-byte between new prefixed markers with its digest; copy its progress block with pointer edits to shared counters; add its operating contract; add it to the metadata, S0.1, and S0.2; extend alternation to round-robin across tracks and extend the tier-lead limit to "at most one tier ahead of the lowest highest-CLEARED tier among the other tracks." Renumber nothing; choose shared counters above every existing number. Record a shared decision.

**Pausing a track.** A paused track receives no visits and is excluded from alternation, but its CLEARED tiers still count for the tier-lead limit and its uncleared tiers still hold that limit against other tracks unless the learner explicitly exempts it. Record a shared decision with a revisit condition.

**Splitting back into separate files.** On explicit learner request, reconstruct each track's standalone file from its contract, progress block, and curriculum with its original markers and filename, preserving all evidence recorded after the merge under the shared IDs. The IDs remain valid and unique.
<!-- END MERGE_RULES -->

# Part PY — Python coding interview track

Track PY is the former `python_coding_interview_roadmap`. In this part, bare IDs such as T12 or G0026 mean PY records. Its references to its own filename, revision numbering, saving, and upload workflow are superseded by Part S and Section M; everything about assessment and tier progression inside the track is unchanged.

**Source metadata (historical; merged metadata is authoritative):**

| Source field | Value at merge |
|---|---|
| document_id | python_coding_interview_roadmap |
| curriculum_version | "4.1" |
| tracking_schema_version | "3.1" |
| revision | 6 |
| previous_revision | 5 |
| parent_file_sha256 | "061c773334038ee4f65ff8e04194a9e7a9c6fbbe1725c9c4a49cf585d2d0356a" |
| updated_on | "2026-09-13" |
| curriculum_sha256 | "ee4404756df4a42ce6eb9100939ba32cc1193f52ab2f686984e39e6a0c752737" |

**Easiest tier across all topics first. Repair and independently verify that tier. Only then begin harder diagnostics across all topics.**

This is the single durable source for curriculum, evidence, adaptive placement, scheduling, and session handoff. The learner studies in chat; the AI maintains this file and returns a complete replacement on an explicit save or at session end. The learner keeps the latest complete Markdown file locally and uploads it when starting a new session. No manual checkboxes, external tracker, or separate progress file are required. If a Project Source is also used, replacing it is a separate learner action.

The 16 topics and 80 stable objective IDs are retained. Topic numbers are identifiers, not a lesson sequence. Specific questions, practice scenarios, examples, test data, hints, solutions, and mock-interview scripts are generated in chat and are never stored here. Technique names describe curriculum scope, not a fixed practice catalogue.

## AI operating contract

**Read before teaching.** Read the metadata, the entire progress block, Sections 1–5 of the curriculum, and the objectives relevant to the next action. Resume from saved evidence, the active tier and phase, and the remaining-topic queue. Do not assume a new chat means a beginner, and do not assume an unassessed skill is missing. Do not begin a conventional T01-to-T16 course.

**Use the learner's preference as the default.** Breadth-first, easy-to-hard diagnostic tiers are persistent requirements. All 16 topics are active. The AI chooses prompts and bounded visits within the current tier; the learner need not choose the next topic. The governing cycle is **DIAGNOSE_ALL → REPAIR_VERIFY → TIER_GATE → next tier**. A later explicit learner request may override a gate, but record the exact scope and end condition; never infer an override from a strong answer or claimed experience.

**Rule precedence.** Current progress tables specify the resumable state; curriculum rules specify how it may change. Historical revision notes, old chat plans, future-tier routes, and a scheduled review never override the current strict tier gate. IDs and checkpoint codes belong to this document_id: here P means independently passed, whereas P in the separate system-design roadmap means partial. Never transfer a status or an attempt by matching its short ID alone.

**Distinguish scope, difficulty, and scheduling.** The curriculum tree organizes topics. D1–D4 describe checkpoint depth. Tiers organize easy-to-hard diagnostics and repairs across the tree. Waves retain the historical W0–W4 labels; a lap is one bounded visit per eligible topic. Prerequisite relationships concern only the facets a task actually needs; they do not authorize completing an entire topic before its siblings.

**Probe, then tailor.** Use existing qualifying evidence or a fresh, unassisted probe before explaining a skill. A diagnostic can earn the same credit as any independent assessment, but only for the scope actually demonstrated. Skip instruction at that exact scope; repair only the gaps. Unknown is not failed. An answer obtained after hints or an explanation is not an independent pass.

**Protect both breadth and difficulty.** During DIAGNOSE_ALL, give every active topic a bounded visit at the current tier before beginning the repair phase. During REPAIR_VERIFY, rotate across that tier's unresolved topics and facets. Do not issue a harder-tier diagnostic merely because the learner answered an easier probe well. Do not begin the next tier while required lower-tier scope is unknown, gapped, or awaiting an independent check, except under an explicit learner override.

**Separate administration from study.** Auditing, uploading, renaming, or saving this file does not start or end a study session and does not resolve an unanswered diagnostic. Read the saved session disposition; allocate a new session only when actual new study begins.

**Save the actual state.** On an explicit save, wrap-up, or clear end-of-session message, update the progress block and metadata, validate, and return this entire Markdown file. A mid-session save is not a new session or an automatic session end. Do not award credit for planning, exposure, AI-written work, or a downloaded file. Routine saves must not rewrite curriculum scope or assessment standards; a requested policy redesign is documented separately.

**Respect the handoff boundary.** State the generated revision and that the learner should keep that version locally and upload it in the next session, replacing an older working copy as appropriate. Generating a replacement does not update any Project Source automatically. Never promise an automatic save after the conversation has ended.

<!-- BEGIN PY_PROGRESS -->

## 0. AI-managed state

### 0.1 Learner profile and dashboard

| Field | Current value |
|---|---|
| Learning preference | BREADTH_FIRST_ADAPTIVE; strict easy-to-hard tiers; diagnose across all topics, repair gaps, independently verify, then advance |
| File maintenance | AI edits one complete Markdown file; learner keeps the latest local copy and uploads it at each new session; save on request or at session end |
| Timezone | America/Toronto |
| Target role / companies / interview level | Not confirmed; do not delay the easiest-tier diagnostic sweep to collect all preferences |
| Interview language / Python version / platform | Python confirmed as the learner's coding-interview language (DEC0015; coding assessments usually allow language choice). No fixed Python version or interview platform: both vary by company (DEC0016). Default to portable Python. When a solution depends on a recent-version feature, say so and know a portable alternative. Practice should work both with and without running code, and with both function-signature and raw-input formats. For a real interview, check that company's stated environment beforehand |
| Session length / interview deadline | Not confirmed; use bounded conversational steps, not an assumed schedule |
| Active scope | T01–T16: 16 topics, 80 objectives |
| Extensions | Not selected; see Section 10 |
| Source evidence | S0001–S0005 evidence retained; S0006 adds fresh recursive-contract, repeated-work, ordering-contract, complement-state, and linked-reference evidence. Assistant wording corrections remain no-penalty and assisted facets remain non-independent |
| Diagnostic sweep | Tier 1 DIAGNOSE_ALL complete; 16/16 topics sampled. W0 closed in S0004 after T15 and T05; current work is Tier 1 REPAIR_VERIFY |
| Required checkpoint passes | 2/240; D1 2/80, D2 0/80, D3 0/79, D4 0/1; T05.2 and T06.1 D1 are independently verified and partial facets are retained separately |
| Objectives meeting their target | 0/80; a record of evidence, not an estimate of actual knowledge |
| Topics eligible to skip all instruction | 0/16 |
| Topic transfer checks | 0/16 verified |
| Integration coverage | 0/6 required areas verified; I07 not selected |
| Retention | NOT_ASSESSED; T05.2 D1 review due 2026-09-18 is now due/overdue and unserved without changing the pass; T06.1 D1 review due 2026-09-19 |
| Current curriculum phase | Tier 1 / REPAIR_VERIFY / W1 / L02; probe unknown D1 scope, repair only observed gaps, then independently verify |
| Current / most recently active session | S0006 CLOSED by explicit save/update request on 2026-09-18; earlier session dispositions are unchanged |
| Last completed study session | S0006; 2026-09-17–2026-09-18; W1/L02 served T09, T13, T16, T03, and T07 |
| Next new session ID | Shared S0007 is now open on the PE track. If this conversation continues, PY's next visit occurs inside S0007; the next genuinely new session after S0007 is S0008 |
| Last saved study session | S0006; merged revision 8; 2026-09-18; complete session-end progress export |
| Prompt and feedback preference | Use complete scenarios and explicit preservation/operation contracts; learner repeatedly catches underspecification. Ask one manageable question at a time. Per shared DEC0023, do not leak the hidden criterion and then ask for repetition, do not add arithmetic/restatement filler once the target reasoning is demonstrated, and verify the roadmap objective before issuing a labelled probe. Shared DEC0027 also requires common idiomatic Python/TypeScript examples by default and forbids incidental uncommon-style teaching unless the syntax itself is relevant |
| Self-reported familiarity | Heap was described as forgotten/never used in S0002; deque end-operation costs accepted from the assistant pending documentation. These are familiarity/exposure notes, not independent failures or passes |
| Stop condition | Learner explicitly requested the roadmap updated after clarifying TypeScript-and-Python practice on 2026-09-18. Do not append another study prompt to this save |

### 0.2 Breadth scheduler and resume packet

This section is operational state, not evidence of learning. Recompute it after relevant outcomes. A fresh chat must be able to resume from this packet without the old conversation. A wave, phase, or session change does not silently reset the remaining-topic queue.

| Field | Current value |
|---|---|
| Active tier / phase | Tier 1 / REPAIR_VERIFY |
| Highest tier previously opened | Tier 1; historical information only, not the current difficulty ceiling |
| Suspended positions | None; preserve ordered snapshots if a lower-tier contradiction or added scope interrupts a later phase |
| Current lap roster | T01, T02, T06, T08, T09, T13, T16, T03, T07, T11, T10, T14, T04, T12, T15, T05 |
| Evidence-covered / explicitly removed entries this lap | None |
| Required scope not currently runnable | None; a temporary pause stays required and must have a revisit trigger |
| Active wave / lap | W1 / L02 |
| Current difficulty ceiling | D1; simple explanation, prediction, trace, basic cost/state/boundary reasoning; do not demand a full implementation or harder-tier selection |
| Lap meaning | One bounded visit per eligible topic at the current tier/phase; several laps and sessions may be needed |
| Default topic rotation | T01, T02, T06, T08, T09, T13, T16, T03, T07, T11, T10, T14, T04, T12, T15, T05 |
| Remaining topics in current lap | T11, T10, T14, T04, T12, T15, T05 |
| Topics visited in current lap | T01, T02, T06, T08, T09, T13, T16, T03, T07 |
| Last primary topic / consecutive visits | T07 / 1; S0006 served T09, T13, T16, T03, and T07 once each in L02. T01 remains counted once from S0004 despite its earlier duplicate visit |
| Shallowest outstanding required depth | D1; 2/80 D1 checkpoints independently verified |
| Queued facet work | G0001–G0028 remain authoritative and G0047 records the new T03.3 complement-state partial. S0006 narrows G0013, G0014, G0006, G0017, and G0018. G0010 remains CLOSED. D2-only gaps remain G0004, G0007, G0008. Unlisted U objectives still need narrow D1 probes |
| Carryover / blocked objectives | No formal carryover or dependency block; queued gaps are not authorization to bypass the Tier 1 gate |
| Due reviews | T05.2 D1 due 2026-09-18 is due/overdue and unserved; T06.1 D1 due 2026-09-19 |
| Active scheduling exceptions | None; no harder-tier override has been requested |
| Unfinished attempt | None. S0003-A04 was superseded only after S0004-A01 issued a fresh same-scope task |
| Next action in this conversation | S0007 is open. PY is next by the shared 1:2 ratio; service the oldest due PY review before ordinary W1/L02 breadth at T11 |
| Next action after a new-session upload | If revision 9 is used in a genuinely new session without a later S0007 close, treat S0007 as interrupted at the mid-session save and allocate S0008. Serve the oldest due PY review first on PY's turn; ordinary W1/L02 breadth then continues at T11. Do not repeat already-served L02 topics except bounded reviews |
| Next decision rule | In W1/L02, probe unknown D1 scope or reuse evidence, repair only observed gaps, use a fresh independent check when needed, and rotate after one bounded visit. Tier 2 remains locked until all 80 D1 checkpoints are P |
| Tier 2 gate | LOCKED until every active D1 checkpoint is P and relevant contradictions are resolved; completing the 16-topic sampling lap alone does not unlock it |
| Do not repeat | Do not restart W0 or re-drill T01/T02/T06/T08/T09/T13/T16/T03/T07 as ordinary L02 visits before the remaining siblings. Due reviews are separate bounded exceptions. Preserve T05.2 and T06.1 D1 passes plus all S0006 narrow facets; T13.4 memoization mechanism remains assisted |
| Save anchor | Track PY learning state is unchanged inside merged revision 9; shared DEC0027 changes prompt style only. Revision 9 parent is `9a0ce0c35f765f3e3f235316efc9035cb6084ced16702bee848fec0e4f23346c` and PY curriculum bytes remain unchanged. Next distinct merged save becomes revision 10 |
| Reserved next identifiers | Shared S0007 is open; PE has allocated S0007-A01–A02 and S0007-EV01 plus G0048. The next shared attempt is S0007-A03, next evidence S0007-EV02, next global gap G0049, and next shared decision DEC0028 |
| Teaching-process correction | Preserve earlier visit-budget rules and shared DEC0023/DEC0024. S0006 DEC0026 records the T09 feedback misread and T13 wording drift as assistant errors with no learner penalty, plus the revision-7 cross-track T06.4 ledger contamination fixed in this save. Keep one bounded PY visit per eligible topic per lap and check due reviews before ordinary breadth |

### 0.2.1 Tier and gate board

`DIAGNOSE_ALL` = the current tier's all-topic sweep; `REPAIR_VERIFY` = breadth-first probes of remaining unknowns, gap-only instruction, and fresh independent checks. `CLEARED` requires the complete tier gate, not just sampling. Later tiers are `LOCKED` until the earlier tier is cleared, unless an explicit learner override is documented. The wave mapping is explained in Section 1.2. On a lower-tier reopening, its working state becomes ACTIVE / REPAIR_VERIFY and previously opened higher-tier rows become SUSPENDED, retaining their evidence and historical diagnostic coverage. CLEARED is a currently valid gate, not merely a historical completion label; keep past completions in history. Restore suspended states only after the necessary lower gates are valid again.

| Tier | Required scope | Diagnostic coverage | Phase / status | Gate evidence | Next transition |
|---|---|---|---|---|---|
| Tier 1 — Foundations | D1 across all 80 objectives | 16/16 topics sampled; W0 complete | REPAIR_VERIFY; W1 / L02 | 2/80 D1; T05.2 and T06.1 passed, all other required D1 scope remains P/G/U as recorded | Continue breadth-first W1 repairs/probes; Tier 2 remains locked until all 80 D1 checkpoints are independently verified |
| Tier 2 — Routine application | D2 across all 80 objectives | 0/16 tier-specific sweep obligations resolved | LOCKED | 0/80 D2; earlier partial outcomes retained, not new Tier 2 diagnostics | Open W2 DIAGNOSE_ALL only after Tier 1 clears |
| Tier 3 — Independent selection | D3 across 79 required objectives | 0/16 tier-specific sweep obligations resolved | LOCKED | 0/79 D3 | Open W3 DIAGNOSE_ALL only after Tier 2 clears |
| Tier 4 — Transfer and integration | T16.5 D4, 16 topic transfers, I01–I06 | 0/16 tier-specific sweep obligations resolved | LOCKED | 0/1 D4; 0/16 transfers; 0/6 integration areas | Open W4 DIAGNOSE_ALL only after Tier 3 clears |

### 0.3 Topic placement and breadth board

`Tier 1 diagnostic` records attention, not full objective coverage. Diagnostic states are U (not addressed), PENDING (issued but no usable answer), SAMPLED (a bounded valid attempt), NO_ATTEMPT (explicit decline/inability, with a reason and no invented failure score), and COVERED_FROM_EVIDENCE (valid independent coverage of the entire topic's required tier scope). SAMPLED, NO_ATTEMPT, and COVERED_FROM_EVIDENCE resolve an initial sweep obligation; only SAMPLED counts as an assessed visit. Record an attempted but incorrect concept separately from a declined task. A partially answered task may earn narrow evidence; any continued work and the remaining scope belong in the attempt register. LOCKED marks a not-yet-opened tier with no diagnostic visit; it is not a checkpoint result. Do not erase historical diagnostic coverage when later work is suspended or proof needs retest; the gate board and ledger control current eligibility. An embedded facet alone does not complete a primary diagnostic.

| Topic | Scope | Tier 1 diagnostic | Tier 2 diagnostic | Tier 3 diagnostic | Tier 4 diagnostic | Placement | D1 | D2 | D3 | D4 | Full instruction skip | Last visit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T01 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0004; ordering-contract and complexity facets independently strengthened; output-type and auxiliary-space scope remain |
| T02 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0005; processed-prefix meaning independently clarified; remaining T02.1 D1 scope open |
| T03 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0002; counting-map and aggregate invariant independent; concrete trace assisted |
| T04 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | U | 0/5 | 0/5 | 0/5 | — | NO | S0002; ordering and below-target movement facets independent; visit ended |
| T05 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | — | NO | S0004; T05.2 D1 fixed-window enter/leave update independently verified |
| T06 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | — | NO | S0005; T06.1 FIFO/deque end-operation cost choice independently verified |
| T07 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0002; ambiguous original excluded; clarified preservation/reconnection assisted |
| T08 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0005; candidate-range meaning independent, empty-range conclusion assisted then restated |
| T09 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0002; base-case/risk recognized independently; directed boundary repair guided |
| T10 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | U | 0/5 | 0/5 | 0/5 | — | NO | S0002; BFS/level-order purpose independent; FIFO mechanism supplied by AI |
| T11 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0002; valid sorted alternative; cost correction guided; heaps reported unfamiliar |
| T12 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0003; graph topology representation incomplete; visited-set facet independent; target-success stopping restated after prior solution; ambiguous follow-up invalidated |
| T13 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0002; repeated-work/termination confusion; caching recognized after hint |
| T14 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0002; context ambiguity corrected; qualified later explanation assisted |
| T15 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/4 | — | NO | S0004; bit/parity model understood after instruction, so T15.1 remains assisted rather than passed |
| T16 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | U | 0/5 | 0/5 | 0/5 | 0/1 | NO | S0002 primary visit completed; independent mutation/output and embedded clarification facets |

### 0.4 Objective checkpoint ledger

One row per stable objective. Checkpoints: `U` = unassessed; `G` = observed gap or assisted-only result; `P` = independently verified at that checkpoint's complete scope; `R` = a previously verified checkpoint needs retest after a material contradiction; `—` = not required. A missing prerequisite is stored separately; it is not a failed assessment.

Routes: `PROBE`, `LEARN`, `GAP_ONLY`, `VERIFY_SKIP`, `SKIP_INSTRUCTION`, `RETEST`, or `PAUSED`. These are next-instruction decisions, not scores. A row can have strong known facets while its overall checkpoint is still `G`; preserve those facets in Section 0.6 so instruction remains narrow.

`Proof / gap refs` must identify evidence per passed checkpoint and any unresolved gap. Existing or unsolicited higher-depth performance can cover several lower checkpoints only when their actual requirements were demonstrated; it does not authorize a harder-tier diagnostic before the tier gate opens. A blank review date means unscheduled, not forgotten. The 240 required cells are coverage checkpoints, not a quota of 240 exercises or exams; a rich attempt can verify several explicitly demonstrated cells.

| Objective | Target | D1 | D2 | D3 | D4 | Route | Proof / gap refs | Review due |
|---|---|---|---|---|---|---|---|---|
| T01.1 | D3 | G | G | U | — | GAP_ONLY | D1 gap: G0001; independent ordering facet S0004-EV09; D2 gap: G0007; S0001-EV01 | — |
| T01.2 | D3 | G | G | U | — | GAP_ONLY | D1 gap G0002 narrowed by independent time-cost derivation S0004-EV13; D2 gap G0008; earlier evidence S0001-EV02–EV06, S0002-EV06, EV27, EV29 | — |
| T01.3 | D3 | U | U | U | — | PROBE | Independent narrow invariant facets S0001-EV07, S0002-EV19; remaining scope G0003 | — |
| T01.4 | D3 | U | G | U | — | PROBE | D1 remains unknown; future D2 gap: G0004; S0001-EV08; related D2 representation gap: G0007 | — |
| T01.5 | D3 | U | U | U | — | PROBE | Preserved facet: S0001-EV09; unknown scope: G0005 | — |
| T02.1 | D3 | G | U | U | — | GAP_ONLY | Independent purpose facet S0002-EV01; fresh processed-prefix meaning S0005-EV04; G0009 | — |
| T02.2 | D3 | U | U | U | — | PROBE | Unknown D1 scope G0012; related copying/index-boundary exposure in S0002-EV09, not a direct checkpoint proof | — |
| T02.3 | D3 | U | U | U | — | PROBE | — | — |
| T02.4 | D3 | U | U | U | — | PROBE | — | — |
| T02.5 | D3 | U | U | U | — | PROBE | Unassessed direct-scan applicability G0025; superseded original scope does not earn evidence | — |
| T03.1 | D3 | U | U | U | — | PROBE | Independent representation facet S0002-EV17; remaining scope G0015 | — |
| T03.2 | D3 | G | U | U | — | GAP_ONLY | Independent aggregate-state facet S0002-EV18; assisted trace S0002-EV20; G0016 | — |
| T03.3 | D3 | U | U | U | — | PROBE | Independent complement/seen-state facet S0006-EV13; remaining validity/initial-state scope G0047 | — |
| T03.4 | D3 | U | U | U | — | PROBE | — | — |
| T03.5 | D3 | U | U | U | — | PROBE | — | — |
| T04.1 | D3 | U | U | U | — | PROBE | Independent order-relation facet S0002-EV35; missing completeness/assumption link G0023 | — |
| T04.2 | D3 | U | U | U | — | PROBE | Independent below-target movement facet S0002-EV36; remaining comparison/range/boundary scope G0024 | — |
| T04.3 | D3 | U | U | U | — | PROBE | — | — |
| T04.4 | D3 | U | U | U | — | PROBE | — | — |
| T04.5 | D3 | U | U | U | — | PROBE | — | — |
| T05.1 | D3 | U | U | U | — | PROBE | — | — |
| T05.2 | D3 | P | U | U | — | PROBE | D1=S0004-EV06 | 2026-09-18 |
| T05.3 | D3 | U | U | U | — | PROBE | — | — |
| T05.4 | D3 | U | U | U | — | PROBE | — | — |
| T05.5 | D3 | U | U | U | — | PROBE | — | — |
| T06.1 | D3 | P | U | U | — | PROBE | D1=S0005-EV07; earlier guided evidence S0002-EV03–EV07; G0010 CLOSED | 2026-09-19 |
| T06.2 | D3 | U | U | U | — | PROBE | — | — |
| T06.3 | D3 | U | U | U | — | PROBE | No independent queue/level-state assessment; the connection following S0002-A22 was supplied by the AI | — |
| T06.4 | D3 | U | U | U | — | PROBE | — | — |
| T06.5 | D3 | U | U | U | — | PROBE | — | — |
| T07.1 | D3 | G | U | U | — | GAP_ONLY | Fresh independent reference-preservation reasoning S0006-EV16; earlier ambiguity/assistance S0002-EV21, EV23; G0017 remains only for remaining boundary breadth | — |
| T07.2 | D3 | G | U | U | — | GAP_ONLY | Fresh independent pre-rewire preservation/order facet S0006-EV17; earlier assisted reconnection S0002-EV24; G0018 narrowed to remaining boundary breadth | — |
| T07.3 | D3 | U | U | U | — | PROBE | — | — |
| T07.4 | D3 | U | U | U | — | PROBE | — | — |
| T07.5 | D3 | U | U | U | — | PROBE | — | — |
| T08.1 | D3 | U | U | U | — | PROBE | — | — |
| T08.2 | D3 | G | U | U | — | GAP_ONLY | S0002-EV08 independent halving intuition; S0005-EV10 adds independent candidate-range meaning but empty-range absence conclusion was taught; G0011 | — |
| T08.3 | D3 | U | U | U | — | PROBE | — | — |
| T08.4 | D3 | U | U | U | — | PROBE | — | — |
| T08.5 | D3 | U | U | U | — | PROBE | — | — |
| T09.1 | D3 | G | U | U | — | GAP_ONLY | S0006-EV02 independently strengthens the suffix return contract and simple trace; earlier base-case/risk S0002-EV10 and guided repair S0002-EV11–EV12; G0013 remains narrowly open | — |
| T09.2 | D3 | U | U | U | — | PROBE | — | — |
| T09.3 | D3 | U | U | U | — | PROBE | — | — |
| T09.4 | D3 | U | U | U | — | PROBE | — | — |
| T09.5 | D3 | U | U | U | — | PROBE | — | — |
| T10.1 | D3 | U | U | U | — | PROBE | Independent BFS/level-order purpose S0002-EV31; remaining scope G0021 | — |
| T10.2 | D3 | U | U | U | — | PROBE | — | — |
| T10.3 | D3 | U | U | U | — | PROBE | — | — |
| T10.4 | D3 | U | U | U | — | PROBE | — | — |
| T10.5 | D3 | U | U | U | — | PROBE | — | — |
| T11.1 | D3 | G | U | U | — | GAP_ONLY | Valid sorted alternative S0002-EV25; observed cost gap S0002-EV26; guided correction S0002-EV28; G0019 | — |
| T11.2 | D3 | U | U | U | — | PROBE | Unscored unfamiliarity report S0002-EV30; unknown scope G0020, not an observed heap-operation failure | — |
| T11.3 | D3 | U | U | U | — | PROBE | — | — |
| T11.4 | D3 | U | U | U | — | PROBE | — | — |
| T11.5 | D3 | U | U | U | — | PROBE | — | — |
| T12.1 | D3 | G | U | U | — | GAP_ONLY | Independent graph-style representation attempt S0003-EV01; exact topology/node-edge/undirected modelling gap G0026 | — |
| T12.2 | D3 | G | U | U | — | GAP_ONLY | Independent visited-state facet S0003-EV02; successful-target stopping restated after prior solution S0003-EV03; remaining independent traversal/termination scope G0027 | — |
| T12.3 | D3 | U | U | U | — | PROBE | — | — |
| T12.4 | D3 | U | U | U | — | PROBE | — | — |
| T12.5 | D3 | U | U | U | — | PROBE | — | — |
| T13.1 | D3 | U | U | U | — | PROBE | — | — |
| T13.2 | D3 | U | U | U | — | PROBE | — | — |
| T13.3 | D3 | U | U | U | — | PROBE | — | — |
| T13.4 | D3 | G | U | U | — | GAP_ONLY | S0006-EV06 independently distinguishes repeated subproblem work from termination; memoization mechanism was then taught. Earlier S0002-EV13–EV14; G0014 narrowed | — |
| T13.5 | D3 | U | U | U | — | PROBE | — | — |
| T14.1 | D3 | G | U | U | — | GAP_ONLY | S0005-EV06; G0035 | — |
| T14.2 | D3 | U | U | U | — | PROBE | — | — |
| T14.3 | D3 | U | U | U | — | PROBE | — | — |
| T14.4 | D3 | G | U | U | — | PROBE | Original ambiguous rationale S0002-EV32 excluded from failure; qualified response S0002-EV33 follows instruction; unknown independent scope G0022 | — |
| T14.5 | D3 | U | U | U | — | PROBE | — | — |
| T15.1 | D3 | G | U | U | — | GAP_ONLY | Assisted bit/parity model S0004-EV01, S0004-EV02; D1 gap G0028 | — |
| T15.2 | D3 | U | U | U | — | PROBE | — | — |
| T15.3 | D3 | U | U | U | — | PROBE | — | — |
| T15.4 | D2 | U | U | — | — | PROBE | — | — |
| T15.5 | D3 | U | U | U | — | PROBE | — | — |
| T16.1 | D3 | U | U | U | — | PROBE | Independent clarification facets S0001-EV10, S0002-EV15, EV16, EV22, EV34 plus fresh ordering-contract clarification S0006-EV09; remaining scope G0006 | — |
| T16.2 | D3 | U | U | U | — | PROBE | — | — |
| T16.3 | D3 | U | U | U | — | PROBE | — | — |
| T16.4 | D3 | U | U | U | — | PROBE | — | — |
| T16.5 | D4 | U | U | U | U | PROBE | — | — |

### 0.5 Assessment evidence register

Create one row per objective with a distinct checkpoint/facet outcome. Several rows may share an attempt ID; several checkpoints may share a row only when the same score and assistance apply and each demonstrated scope is stated. Do not give all objectives in an attempt one undifferentiated score. Evidence ID format: `S0001-EV01`; attempt ID format: `S0001-A01`. Identifiers are records, not names of saved exercises. A checkpoint proof reference uses `D2=S0001-EV01`. Never store the question or solution in this table.

**Context and assistance note for S0001-A01:** The opening attempt and early feedback were supplied in the learner's conversation context; later clarifying exchanges occurred in this conversation. A full corrective explanation had been supplied before the clarified complexity response. The learner said they had not read the end of that explanation; the extent of exposure is uncertain. Preserve the correct reasoning, but do not certify its independence from that already-supplied solution. Assistance below records what was provided, not a claim about what the learner read. The originally ambiguous complexity response is excluded from gap scoring. All code was discussed or reviewed as text; no execution or timed performance was observed. The assistance column describes the feedback stage that produced each observation, not a reset of earlier help. Supplied solutions continue to limit independence for the same task/facet even when a later message gives only a hint. A genuinely fresh independent check receives a new attempt ID. Unrelated facets answered before help retain their original independence.

| Evidence ID | Attempt | Date | Objective | Checkpoint / demonstrated facets | Mode | Assistance | Score | Observation / execution status |
|---|---|---|---|---|---|---|---|---|
| S0001-EV01 | S0001-A01 | 2026-09-12 | T01.1 | D1/D2 representation-choice facets; incomplete contract preservation | DIAGNOSTIC | NONE | 1 | Recognized duplicate removal and proposed a set, but the proposed replacement changed return type and did not preserve first-occurrence ordering. Preserve the representation instinct; observed gap, not a complete checkpoint. Text reviewed without execution |
| S0001-EV02 | S0001-A01 | 2026-09-12 | T01.2 | Original complexity wording; no valid function-level assessment | DIAGNOSTIC | NONE | NA | Learner reasonably interpreted the task as analysing the length expression rather than the entire function. Do not treat that response as evidence of a function-complexity gap |
| S0001-EV03 | S0001-A01 | 2026-09-12 | T01.2 | D1/D2 operation-cost accounting in the clarified response | GUIDED | SOLUTION | 1 | Once the intended scope was clarified, the learner accounted for traversal but treated membership in a growing list as constant work. This is a separate, assessable cost-accounting gap; prior explanatory material was already available. Described only |
| S0001-EV04 | S0001-A01 | 2026-09-12 | T01.2 | Distinct-count auxiliary-space facet; correct reasoning, independence unverified | GUIDED | SOLUTION | 1 | Correctly expressed storage in terms of the number of distinct values, included both growing containers, and related that count to input size. Preserve this narrower reasoning instead of reteaching space from scratch. Earlier solution exposure is uncertain, so no independent checkpoint pass is claimed |
| S0001-EV05 | S0001-A01 | 2026-09-12 | T01.2 | D1/D2 variable membership cost and total-work aggregation | GUIDED | HINT | 1 | After the list-membership cue, recognized that the search grows with the accumulated state and identified all-distinct input as costly, but multiplied an already-summed iteration cost by the number of iterations again. Described only |
| S0001-EV06 | S0001-A01 | 2026-09-12 | T01.2 | Guided correction of aggregate cost; independent exit check still due | GUIDED | GUIDED | 1 | After the AI explicitly removed the duplicate outer-loop factor and supplied the arithmetic-series relationship, correctly simplified the total to a quadratic bound. This is guided repair, not independent mastery or retention |
| S0001-EV07 | S0001-A01 | 2026-09-12 | T01.3 | D1 facet only: recognizes a property maintained by parallel state | DIAGNOSTIC | NONE | 2 | Identified equality of the two accumulated containers; interpret the informal equality notation semantically, not as a separate Python assignment error. A sufficient connection between processed input and required output was not independently established; full checkpoint remains U |
| S0001-EV08 | S0001-A01 | 2026-09-12 | T01.4 | D2 proposed Python implementation; incomplete semantics and syntax | DIAGNOSTIC | NONE | 1 | Produced a concise set-based proposal, but return-type/ordering preservation was missing and the inline comment used non-Python comment syntax. Corrective feedback was supplied; no independently revised implementation or execution was observed |
| S0001-EV09 | S0001-A01 | 2026-09-12 | T01.5 | D1 facet only: baseline test categories | DIAGNOSTIC | NONE | 2 | Independently chose empty, already-distinct, and duplicate-containing inputs. Preserve those categories. Remaining relevant boundary, ordering-contract, and transition coverage was not fully assessed; no tests were executed and no full checkpoint is passed |
| S0001-EV10 | S0001-A01 | 2026-09-12 | T16.1 | D1 facet only: proportional clarification of an ambiguous request | DIAGNOSTIC | NONE | 2 | Detected ambiguous assessment wording and requested a focused re-ask before proceeding. Preserve this clarification behaviour. Other contract facets remain unassessed; this embedded observation does not complete T16's primary diagnostic visit |
| S0002-EV01 | S0002-A01 | 2026-09-12 | T02.1 | D1 facet: purpose of an accumulated count; prefix scope not independently explicit | DIAGNOSTIC | NONE | 2 | Recognized what property was being counted. The short answer did not explicitly distinguish the processed prefix from the whole input; the AI supplied that precision. Preserve purpose recognition without treating shorthand as a separate failure. Code read without execution |
| S0002-EV02 | S0002-A02 | 2026-09-12 | T02.1 | D1 assisted prefix-state trace | GUIDED | SOLUTION | 1 | Correctly traced the requested processed prefix and justified which entries contributed, after the AI had stated the exact maintained-state meaning. Earlier chat praise calling this independent was too strong; no full checkpoint pass. Code read without execution |
| S0002-EV03 | S0002-A03 | 2026-09-12 | T06.1 | D1 facet: prefer an appropriate existing structure over reimplementing logistics | DIAGNOSTIC | NONE | 2 | Favoured a purpose-built structure from the offered choices. Did not independently name or justify its operation-cost contract in this response; the assistant inferred the intended choice. Preserve the design instinct, not a complete FIFO/LIFO assessment. Described only |
| S0002-EV04 | S0002-A04 | 2026-09-12 | T06.1 | D1 gap: operation-cost distinction for queue use of a list | DIAGNOSTIC | NONE | 1 | Was uncertain about the costly operation and initially treated insertion at either end as constant work regardless of input size. No sound end-specific cost model was established at this stage. Later workflow clarification is preserved separately; do not invent a claim that end append alone was linear. Described only |
| S0002-EV05 | S0002-A05 | 2026-09-12 | T06.1 | D1 guided recognition of shifting in a FIFO workflow | GUIDED | HINT | 1 | After the front-removal cue, recognized the need to move the remaining entries. Subsequently clarified that the linear-cost statement concerned the complete enqueue/dequeue workflow at opposite ends, not end insertion alone. The assistant accepted that clarification. Described only |
| S0002-EV06 | S0002-A05 | 2026-09-12 | T01.2 | D1 guided input-dependent movement-cost reasoning | GUIDED | HINT | 1 | Connected the number of shifted entries with linear work after the AI focused attention on front removal. Preserve the corrected reasoning, but it does not independently resolve G0002 or its earlier varying-work aggregation uncertainty. Described only |
| S0002-EV07 | S0002-A07 | 2026-09-12 | T06.1 | D1 assisted comparison of enqueue/dequeue costs | GUIDED | SOLUTION | 1 | Correctly reproduced the list/deque cost comparison already supplied by the AI. Explicitly said the deque costs were being accepted on the AI's word pending documentation. No independent verification, documentation consultation, or execution was observed; the amortized qualification also came from the AI |
| S0002-EV08 | S0002-A08 | 2026-09-12 | T08.2 | D1 ordering/halving recognition with incomplete small-range termination handling | DIAGNOSTIC | NONE | 1 | Independently identified sorted order and repeated midpoint subdivision. Proposed a small-range fallback without establishing that every remaining candidate would be considered. Preserve the search intuition; boundary completeness, absence handling, and termination were not verified. Described only |
| S0002-EV09 | S0002-A09 | 2026-09-12 | T08.2 | D1 guided half-discard reasoning and index-boundary representation | GUIDED | GUIDED | 1 | Correctly applied the target/midpoint comparison after the AI explained half elimination and index boundaries. Endorsed avoiding sublist creation; copying versus destructive mutation terminology was then corrected by the AI, not independently checked. No search implementation or execution |
| S0002-EV10 | S0002-A10 | 2026-09-12 | T09.1 | D1 independent recognition of a base case and an input-domain concern | DIAGNOSTIC | NONE | 2 | Identified the terminating guard and spontaneously warned that it was not foolproof. Preserve this boundary-awareness facet; the recursive contract and a sufficient progress argument were not fully stated before help. Code read without execution |
| S0002-EV11 | S0002-A11 | 2026-09-12 | T09.1 | D1 guided trace of progress away from a stopping condition | GUIDED | HINT | 1 | Correctly recognized non-arrival at the terminating condition for the AI-selected out-of-domain direction after the AI highlighted base-case/progress reasoning. This is a correct assisted boundary trace, not a fresh independent full-scope check. Code read without execution |
| S0002-EV12 | S0002-A12 | 2026-09-12 | T09.1 | D1 guided correction of the terminating region | GUIDED | GUIDED | 1 | Proposed a broadened stopping guard after the base-case/progress explanation and directed boundary trace. The correction is retained, but earlier chat praise of the full Tier-1 idea does not establish independent contract/progress coverage. No runtime, call-depth, or implementation robustness was tested |
| S0002-EV13 | S0002-A13 | 2026-09-12 | T13.4 | D1 gap: repeated subproblem work versus nontermination | DIAGNOSTIC | NONE | 1 | Recognized resource waste but conflated revisiting a smaller state with infinite recursion and asserted a universal rule against repeated states. This is the observed model gap; do not infer missing knowledge of every DP objective from it. Described only |
| S0002-EV14 | S0002-A14 | 2026-09-12 | T13.4 | D1 guided recognition of caching completed subproblem results | GUIDED | HINT | 1 | Suggested caching after a leading prompt about retaining a previously computed result. The AI supplied the memoization name and explanation afterward. Preserve the useful intuition; reuse conditions, memoization/tabulation choice, state completeness, and memory reasoning remain unverified. Described only |
| S0002-EV15 | S0002-A15 | 2026-09-12 | T16.1 | D1 independent mutation/output-contract clarification | DIAGNOSTIC | NONE | 2 | Asked whether the input must be changed in place or whether a new result may be allocated and returned. This is proportional clarification of mutation/output assumptions, not complete coverage of ordering, errors, and constraints. Described only |
| S0002-EV16 | S0002-A16 | 2026-09-12 | T16.1 | D1 independent input-range clarification | DIAGNOSTIC | NONE | 2 | Asked about the numeric range before selecting counting state. The AI then clarified that no small fixed range could be assumed. Preserve this constraint-checking behaviour without inferring an unspoken alternative implementation. Described only |
| S0002-EV17 | S0002-A16 | 2026-09-12 | T03.1 | D1 independent selection of a keyed counting representation | DIAGNOSTIC | NEUTRAL_CLARIFICATION | 2 | Selected a dictionary-based counting representation after the neutral range clarification. Preserve the appropriate state choice; the broader semantics and relevant key/initialization boundary of this objective were not fully assessed. Described only |
| S0002-EV18 | S0002-A16 | 2026-09-12 | T03.2 | D1 independent aggregate accounting facet | DIAGNOSTIC | NEUTRAL_CLARIFICATION | 2 | Stated that the total of stored counts equals the number of processed elements. This establishes an aggregate consistency property. The AI subsequently made the per-key processed-prefix meaning explicit; update/removal and absent/zero-count boundaries remain unassessed. Described only |
| S0002-EV19 | S0002-A16 | 2026-09-12 | T01.3 | D1 independent aggregate invariant facet | DIAGNOSTIC | NEUTRAL_CLARIFICATION | 2 | Independently related accumulated count totals to processed-input length. This extends S0001's invariant evidence, but aggregate conservation alone does not establish that each individual output entry is correct or cover initialization/preservation/termination reasoning. Described only |
| S0002-EV20 | S0002-A17 | 2026-09-12 | T03.2 | D1 assisted concrete count-state trace | GUIDED | SOLUTION | 1 | Correctly supplied the keyed counts for the requested prefix after the AI had supplied the exact per-entry invariant. Preserve the successful application without labelling the explained-state trace an independent checkpoint. No code or tests executed |
| S0002-EV21 | S0002-A18 | 2026-09-12 | T07.1 | Original ambiguous rewiring/preservation contract; excluded from failure scoring | DIAGNOSTIC | NONE | NA | The initial task did not clearly require retaining access to the old tail. The learner's replacement-node interpretation could intentionally discard it, so the initial response is not a demonstrated reference-loss failure. The AI later acknowledged this ambiguity. Described only |
| S0002-EV22 | S0002-A18 | 2026-09-12 | T16.1 | D1 independent clarification of the intended post-mutation structure | DIAGNOSTIC | NONE | 2 | Challenged the missing preservation requirement and explained the intended replacement interpretation. Preserve this contract clarification. The learner had introduced the replacement-node example; the later assistant apology inaccurately implied the AI introduced it. Described only |
| S0002-EV23 | S0002-A18 | 2026-09-12 | T07.1 | D1 correct reference-preservation reasoning after supplied instruction | GUIDED | SOLUTION | 1 | After the AI explained loss of access and explicitly required retaining the old tail, identified the original next reference as state to preserve. The final contract clarification does not undo the earlier substantive help. No independent traversal/ownership check or execution |
| S0002-EV24 | S0002-A18 | 2026-09-12 | T07.2 | D1 assisted reconnection reasoning under a clarified preservation contract | GUIDED | SOLUTION | 1 | Extended the preserved-reference idea to an optional insertion/reconnection interpretation. Preserve this useful reasoning at its actual assistance level; no independent rewiring implementation, end-of-chain handling, or full checkpoint coverage. Described only |
| S0002-EV25 | S0002-A19 | 2026-09-12 | T11.1 | D1 independent valid sorted-structure alternative | DIAGNOSTIC | NONE | 2 | Proposed a sorted list for repeatedly accessing a current minimum. This is a functional alternative, not a failure for omitting a heap; operation mix and whether retrieval means inspection or removal must be specified before judging the tradeoff. Described only |
| S0002-EV26 | S0002-A20 | 2026-09-12 | T11.1 | D1 gap: complete cost of maintaining an ordered list | DIAGNOSTIC | NONE | 1 | Attributed the position-search cost to the entire sorted insertion, omitting entry movement. Preserve recognition of logarithmic search, but the full update-cost comparison was incomplete. Described only |
| S0002-EV27 | S0002-A20 | 2026-09-12 | T01.2 | D1 independent incomplete operation-cost decomposition | DIAGNOSTIC | NONE | 1 | Recognized the halving-based search cost but omitted the movement component of insertion in a fresh context. This does not erase earlier guided progress; it leaves operation-by-operation accounting in G0002 unresolved. Described only |
| S0002-EV28 | S0002-A21 | 2026-09-12 | T11.1 | D1 guided correction of sorted insertion cost | GUIDED | HINT | 1 | After the AI isolated the physical movement step, accounted for shifting and correctly combined it with position search. Preserve the corrected tradeoff without claiming an independently demonstrated heap comparison. Described only |
| S0002-EV29 | S0002-A21 | 2026-09-12 | T01.2 | D1 guided composition and dominance of separate operation costs | GUIDED | HINT | 1 | Correctly added the search and movement components and simplified to the dominating growth term after a movement-focused hint. This is useful guided reasoning, not independent resolution of the broader complexity checkpoint. Described only |
| S0002-EV30 | S0002-A22 | 2026-09-12 | T11.2 | Self-reported unfamiliarity with heaps; not an assessment result | REPORTED_EXPOSURE | NONE | NA | During the next topic, said heaps were forgotten/never used. The AI deferred heap instruction until the repair phase. No heap model, API operation, or implementation was assessed; T11.2 remains unknown rather than failed |
| S0002-EV31 | S0002-A22 | 2026-09-12 | T10.1 | D1 independent BFS/level-order purpose recognition | DIAGNOSTIC | NONE | 2 | Named breadth-first search and explained finishing a level before moving to the next. The AI supplied the FIFO-queue mechanism afterward. Preserve the level-order concept; no independent queue-state, DFS comparison, memory, or boundary assessment. Described only |
| S0002-EV32 | S0002-A23 | 2026-09-12 | T14.4 | Original underspecified local/global-choice rationale; excluded from gap scoring | DIAGNOSTIC | NONE | NA | Rejected the claim that a currently attractive choice alone guarantees the best final result, but the prompt did not establish the objective or dependence between choices. Do not score the initial rationale as a conceptual failure. Described only |
| S0002-EV33 | S0002-A23 | 2026-09-12 | T14.4 | D1 correct qualified local/global concern after an available explanation | GUIDED | SOLUTION | 1 | Later distinguished independent processing from a sequence of dependent decisions and acknowledged that stepwise best choices can produce a worse overall result. The AI had already explained this relationship; preserve the correct qualification without certifying independence. Feasibility versus optimality remains unassessed |
| S0002-EV34 | S0002-A23 | 2026-09-12 | T16.1 | D1 independent request for sufficient decision-context assumptions | DIAGNOSTIC | NONE | 2 | Explicitly objected that the original greedy-style question lacked context about independent versus sequentially dependent decisions. This is a valid clarification, not learner avoidance or a new primary T14 visit. The correction arrived during the following topic exchange |
| S0002-EV35 | S0002-A24 | 2026-09-12 | T04.1 | D1 independent directional ordering property | DIAGNOSTIC | NONE | 2 | Explained the relative-value guarantees on either side of the two boundaries in sorted data. Preserve this monotonic-order understanding; a complete argument for safely eliminating all pairs involving a discarded endpoint was not elicited. Described only |
| S0002-EV36 | S0002-A25 | 2026-09-12 | T04.2 | D1 independent lower-sum pointer-movement facet | DIAGNOSTIC | NEUTRAL_CLARIFICATION | 2 | Chose the appropriate boundary movement when the current pair sum was below the target, building on the independently stated ordering relation. The follow-up focused the already-issued case without supplying the move. Opposite case, maintained candidate range, and stopping boundary remain unassessed. Described only |
| S0003-EV01 | S0003-A01 | 2026-09-13 | T12.1 | D1 graph-model/topology facet | DIAGNOSTIC | NONE | 1 | Represented the friendship structure as a graph-like shape, but described it as a triangle with an extended edge. The stated relationships actually form a four-node cycle/diamond, and the response did not explicitly map people to nodes or bidirectional friendships to undirected edges. Preserve the graph-structure intuition; exact modelling remains incomplete. Described only |
| S0003-EV02 | S0003-A01 | 2026-09-13 | T12.2 | D1 independent visited-state facet | DIAGNOSTIC | NONE | 2 | Independently said to keep track of visited people and avoid exploring a next node that is already visited. The phrase “visited by another instance” added an unnecessary multi-instance framing; the AI clarified that the same visited rule applies within one traversal. Preserve the core visited-set reasoning; traversal frontier and full termination conditions remain unverified. Described only |
| S0003-EV03 | S0003-A03 | 2026-09-13 | T12.2 | D1 successful-target stopping condition after corrected explicit contract | GUIDED | SOLUTION | 1 | Correctly stated that the search can succeed when Emma is in the visited set after the target was explicitly restated. However, the AI had already supplied the exact “stop when Emma is discovered/visited” rule immediately before the learner challenged the underspecified prompt, so this re-ask cannot establish independence despite later chat praise. Failure/exhaustion stopping and a fresh independent target check remain unverified. Described only |
| S0004-EV01 | S0004-A01 | 2026-09-15 | T15.1 | Reported unfamiliarity with `&` before instruction | REPORTED_EXPOSURE | NONE | NA | Learner correctly guessed that `&` was bitwise-related but said the operator itself was unfamiliar. This is a familiarity note, not a failure or pass. |
| S0004-EV02 | S0004-A01 | 2026-09-15 | T15.1 | D1 assisted binary place-value and parity/mask reasoning | GUIDED | SOLUTION | 1 | After the AI explained bitwise AND, binary place values, and the `x & 1` parity rule, the learner correctly computed examples, converted binary place values, and explained that an odd value has the `2^0` bit set. Preserve the resulting understanding, but the key model was supplied and requires a materially changed independent check later. |
| S0004-EV06 | S0004-A04 | 2026-09-15 | T05.2 | D1 fixed-size window enter/leave state update | DIAGNOSTIC | NONE | 2 | Independently identified the leaving value, entering value, and updated sum for a fixed-size moving window, then expressed the next update in enter/leave form. The later request to simplify arithmetic was unnecessary and adds no evidence. Described only; no code executed. |
| S0004-EV09 | S0004-A07 | 2026-09-15 | T01.1 | D1 independent ordering-contract facet for representation choice | DIAGNOSTIC | NONE | 2 | Correctly explained that a set removes duplicates but cannot be relied on to preserve the required first-occurrence ordering. A later claim that iteration order would change every time was corrected; preserve only the sound contract conclusion. The AI leaked the separate output-type criterion before asking about it, so that facet remains unverified. |
| S0004-EV13 | S0004-A11 | 2026-09-15 | T01.2 | D1 independent time-cost decomposition and aggregation facet | DIAGNOSTIC | NONE | 2 | Independently identified list append as amortized constant time, list membership as linear in the growing state, and the outer traversal as linear, yielding quadratic total time; also connected the varying work to an arithmetic-series sum. Auxiliary-space growth was not independently checked, so the full D1 checkpoint remains gapped. |

**S0002 evidence reconciliation:** All observations above come from the visible learner/assistant exchange, not from executing code or checking external references. Initial independent facets remain credited at their narrow scope. Correct follow-ups after supplied invariants, cost tables, or explanations remain assisted even when the chat praised them as independent or as the full Tier-1 idea. In particular, T02's prefix trace and T09's repaired guard do not establish full independent checkpoints. No P was present in the parent ledger, so this save does not invent a P-to-R demotion.

**Task/assistance identity:** New concrete trace/comparison tasks receive distinct IDs; neutral restatements and direct reasoning continuations retain the same task identity. A clarified contract does not remove substantive help already supplied for that facet. S0002-A06 was replaced without a scored answer; S0002-A26 is now superseded only because S0003-A01 actually issued a fresh same-scope T12 task. S0003-A02 is invalidated for omitting the target from the stopping-condition assessment. S0003-A03 correctly restated the target-success rule but follows an explicit supplied solution, so it is assisted rather than independent. None of these dispositions is a learner failure.

**Assessment scope:** S0004 establishes the first complete PY D1 checkpoint pass at T05.2. T15.1 remains assisted, T01.1 gains an independent ordering-contract facet but not the leaked output-type facet, and T01.2 gains independent time-cost reasoning while auxiliary-space scope remains open. No D2/D3/D4 pass, transfer, integration pass, delayed retention, measured timing, code execution, or documentation verification was established. Historical D2 gaps remain deferred until Tier 2.

| S0005-EV04 | S0005-A03 | 2026-09-16 | T02.1 | D1 independent processed-prefix meaning | DIAGNOSTIC | NONE | 2 | On a fresh trace, independently stated the accumulated count and explicitly limited its meaning to the already-processed prefix. This repairs the earlier ambiguity between prefix and whole-input meaning. Minimality/sufficiency and initial/empty-state scope remain open; no code executed. |
| S0005-EV07 | S0005-A06 | 2026-09-16 | T06.1 | D1 FIFO representation and end-operation cost choice | DIAGNOSTIC | NONE | 2 | Independently chose `collections.deque` for FIFO work, placed enqueue and dequeue at opposite ends, explained that list front removal shifts remaining elements, and contrasted that with constant-time deque end operations. Later CPython block-layout discussion was learner-requested FYI and is not needed for the pass. |
| S0005-EV10 | S0005-A10 | 2026-09-16 | T08.2 | D1 candidate-range meaning and empty-range boundary | GUIDED | MIXED | 1 | Independently interpreted an inclusive candidate range as the only remaining indices/values that could contain the target. When the bounds crossed, initially described it as going past the target; the AI then supplied the empty-range/no-candidate rule, which the learner correctly restated. Preserve the independent range facet; absence/termination remains assisted. |

| S0006-EV02 | S0006-A02 | 2026-09-17 | T09.1 | D1 recursive return-contract and small suffix trace facets | DIAGNOSTIC | NONE | 2 | Independently described the call result as the number of characters from the current index through the end and correctly traced a small suffix. The assistant initially misread the learner's phrasing; that feedback error is excluded. Base-case semantics received light guidance, so the full checkpoint remains gapped. Code read only. |
| S0006-EV06 | S0006-A06 | 2026-09-17 | T13.4 | D1 repeated-subproblem recognition and consequence; memoization mechanism assisted | GUIDED | MIXED | 1 | After a clean reset from ambiguous wording, independently identified a repeated `f(3)` subproblem and explained that recomputation duplicates work. The sequential cache check/store/reuse mechanism and memoization label were then taught; final restatement was correct but not an independent full checkpoint. |
| S0006-EV09 | S0006-A09 | 2026-09-17 | T16.1 | D1 ordering-contract clarification and implementation consequence | DIAGNOSTIC | NONE | 2 | Independently asked whether deduplication must preserve order, then explained that a set-only solution can violate that ordering contract. This strengthens the missing ordering facet; error/invalid-input and any still-material contract facets remain open. |
| S0006-EV13 | S0006-A12 | 2026-09-18 | T03.3 | D1 complement/previously-seen state facet | DIAGNOSTIC | NONE | 2 | In a supplied two-sum-style scan, independently identified that the previously seen value `1` is the needed complement when the current value is `9` and the target is `10`. Validity assumptions and initialization breadth were not separately sampled. |
| S0006-EV16 | S0006-A16 | 2026-09-18 | T07.1 | D1 ownership/access preservation during linked traversal | DIAGNOSTIC | NONE | 2 | Under an explicit current/previous/next contract, independently said to save `B.next` in a temporary reference before mutation so access to `C` is not lost. This is fresh independent ownership/access reasoning; broader end-of-chain traversal scope remains. |
| S0006-EV17 | S0006-A16 | 2026-09-18 | T07.2 | D1 pre-rewire update ordering that preserves unprocessed nodes | DIAGNOSTIC | NONE | 2 | Independently stated that the old `current.next` must be preserved before rewiring `current.next` backward. This establishes the key conceptual update ordering under the stated mutation contract; broader boundary cases remain unassessed. |

### 0.5.1 Attempt status register

Attempt disposition is not a score. Preserve one row for every issued assessment task, including unanswered and superseded tasks, so its ID cannot be lost or reused when the handoff changes. States: PENDING, PARTIAL, COMPLETED, DECLINED, SUPERSEDED, INVALIDATED. COMPLETED may contain gaps or assistance. A replacement task gets a new ID; a neutral clarification of the same task does not. If only part of a task is superseded or invalidated, retain all valid earlier evidence and describe exactly which scope remains unfinished. Never store the actual prompt, input, answer, or solution here.

| Attempt | Issuing session / date | Recorded scope | Disposition | Evidence retained | Continuation / replacement |
|---|---|---|---|---|---|
| S0001-A01 | S0001 / 2026-09-12 | T01.1–T01.5 diagnostic; T16.1 embedded clarification; mixed historical depths before the strict-tier revision | COMPLETED; guided complexity repair, not full mastery | S0001-EV01–S0001-EV10 | No same-task rehearsal; fresh checks later at their opened tier |
| S0001-A02 | S0001 / 2026-09-12 | T02.1/T02.5 D1 direct-scan reading and state/output meaning; T01.2 D1 time/space facet | SUPERSEDED; all unfinished scope, no learner response or failure | None | Actual new study in S0002 issued A01 because the old prompt was unavailable. A01/A02 sampled T02.1 only; other originally planned facets remain unknown |
| S0002-A01 | S0002 / 2026-09-12 | T02.1 D1 direct-scan state reading; fresh replacement for the unavailable S0001-A02 prompt | COMPLETED; narrow purpose facet retained | S0002-EV01 | Followed by A02; original T02.5 applicability and T01.2 cost scope were not silently assessed |
| S0002-A02 | S0002 / 2026-09-12 | T02.1 D1 concrete processed-prefix trace after the supplied state meaning | COMPLETED; assisted follow-up | S0002-EV02 | Visit ended; fresh narrow verification in Tier 1 REPAIR_VERIFY |
| S0002-A03 | S0002 / 2026-09-12 | T06.1 D1 representation preference for FIFO processing | COMPLETED; qualitative preference only | S0002-EV03 | Cost facet subsequently probed in A04 |
| S0002-A04 | S0002 / 2026-09-12 | T06.1 D1 identification/cost of the inefficient list queue operation | COMPLETED; cost uncertainty observed | S0002-EV04 | Guided movement follow-up A05; not a passed cost check |
| S0002-A05 | S0002 / 2026-09-12 | T06.1/T01.2 D1 front-removal movement and whole-workflow interpretation | COMPLETED; guided reasoning and later semantic clarification retained | S0002-EV05, S0002-EV06 | Do not misread the clarified workflow statement as end append alone having linear cost |
| S0002-A06 | S0002 / 2026-09-12 | T06.1 D1 cost classification of two listed queue operations | SUPERSEDED; no classification answer; user instead clarified the preceding workflow statement | None; relevant clarification retained under A05 | Replaced by the broader comparison A07; no failure or duplicate credit |
| S0002-A07 | S0002 / 2026-09-12 | T06.1 D1 enqueue/dequeue comparison across list and deque | COMPLETED; assisted reproduction | S0002-EV07 | Request for the full scenario was a neutral restatement of this same task; all relevant costs had already been supplied |
| S0002-A08 | S0002 / 2026-09-12 | T08.2 D1 sorted-search purpose, halving idea, and volunteered small-range handling | COMPLETED; partial independent model and boundary uncertainty | S0002-EV08 | Boundary coverage queued; no full implementation requested |
| S0002-A09 | S0002 / 2026-09-12 | T08.2 D1 midpoint comparison with index-boundary discussion | COMPLETED; guided follow-up | S0002-EV09 | Visit ended; preserve assisted copying/representation clarification without a new independent pass |
| S0002-A10 | S0002 / 2026-09-12 | T09.1 D1 recognition of recursion stopping condition and safety concern | COMPLETED; independent narrow facets | S0002-EV10 | Progress/boundary follow-up A11 |
| S0002-A11 | S0002 / 2026-09-12 | T09.1 D1 directed trace of an input moving away from the stopping condition | COMPLETED; assisted trace | S0002-EV11 | Followed by A12; no independent full contract verification |
| S0002-A12 | S0002 / 2026-09-12 | T09.1 D1 conceptual stopping-region repair | COMPLETED; guided correction | S0002-EV12 | Visit ended; do not infer D2 execution or general runtime safety |
| S0002-A13 | S0002 / 2026-09-12 | T13.4 D1 repeated recursive-state work and its consequence | COMPLETED; observed conceptual gap | S0002-EV13 | Caching follow-up A14; other DP objectives remain unknown |
| S0002-A14 | S0002 / 2026-09-12 | T13.4 D1 reuse of an already-computed state result | COMPLETED; hinted recognition | S0002-EV14 | Memoization explanation supplied afterward; fresh check during repair phase |
| S0002-A15 | S0002 / 2026-09-12 | T16.1 D1 proportional requirement clarification | COMPLETED; independent mutation/output facet | S0002-EV15 | Primary T16 visit resolved; broaden only missing contract facets in the repair phase |
| S0002-A16 | S0002 / 2026-09-12 | T03.1/T03.2 D1 counting-state representation and processed-prefix meaning; T01.3/T16.1 embedded facets | COMPLETED; independent partial facets after neutral range clarification | S0002-EV16, S0002-EV17, S0002-EV18, S0002-EV19 | Followed by A17 after per-key meaning was supplied; no code-writing evidence |
| S0002-A17 | S0002 / 2026-09-12 | T03.2 D1 concrete prefix-count state trace | COMPLETED; assisted follow-up | S0002-EV20 | Visit ended; do not treat the explained-state example as a fresh independent check |
| S0002-A18 | S0002 / 2026-09-12 | T07.1/T07.2 D1 reference preservation/reconnection; T16.1 embedded contract clarification | COMPLETED; original ambiguous scope excluded from failure; valid clarified response assisted | S0002-EV21, S0002-EV22, S0002-EV23, S0002-EV24 | All restatements remained one task; prior reference-loss teaching still limits independence. Probe a fresh explicitly specified preservation contract later |
| S0002-A19 | S0002 / 2026-09-12 | T11.1 D1 representation for incrementally available priorities | COMPLETED; valid sorted-structure alternative | S0002-EV25 | Do not score omission of a heap as failure; update costs assessed in A20 |
| S0002-A20 | S0002 / 2026-09-12 | T11.1/T01.2 D1 sorted-list operation comparison and total insertion cost | COMPLETED; position-search and total-operation cost conflated | S0002-EV26, S0002-EV27 | Movement follow-up A21; earlier logarithmic-search knowledge retained |
| S0002-A21 | S0002 / 2026-09-12 | T11.1/T01.2 D1 physical movement and composition of insertion work | COMPLETED; guided correction | S0002-EV28, S0002-EV29 | Visit ended; heap comparison not taught or independently assessed |
| S0002-A22 | S0002 / 2026-09-12 | T10.1 D1 level-order traversal purpose; incidental heap-familiarity report | COMPLETED; independent BFS purpose facet, heap report unscored | S0002-EV30, S0002-EV31 | AI supplied FIFO mechanism afterward; do not transfer that supplied explanation into a T06.3 pass |
| S0002-A23 | S0002 / 2026-09-12 | T14.4 D1 local/global-choice concern; T16.1 embedded clarification | COMPLETED; original rationale excluded from gap scoring; qualified later response follows available explanation | S0002-EV32, S0002-EV33, S0002-EV34 | Later learner correction during A24 belongs to this same task; no independent greedy proof or second primary visit |
| S0002-A24 | S0002 / 2026-09-12 | T04.1 D1 directional ordering for two boundary values | COMPLETED; independent monotonic-order facet | S0002-EV35 | Narrow movement follow-up A25 |
| S0002-A25 | S0002 / 2026-09-12 | T04.2 D1 movement for the below-target case | COMPLETED; independent narrow movement facet | S0002-EV36 | T04 visit ended; opposite case/completeness/boundaries queued without inventing failures |
| S0002-A26 | S0002 / 2026-09-12 | T12.1/T12.2 D1 entity/relation model and exploration of reachability | SUPERSEDED; no learner response or failure | None | S0003-A01 actually issued a fresh same-scope T12 task, so only the unfinished S0002 scope is superseded; IDs and no-failure history remain preserved |
| S0003-A01 | S0003 / 2026-09-13 | T12.1/T12.2 D1 graph representation and visited-state reasoning; fresh replacement for unavailable S0002-A26 prompt | COMPLETED; partial independent facets | S0003-EV01, S0003-EV02 | T12 primary visit resolved; topology precision remains G0026 and broader traversal/termination scope remains G0027 |
| S0003-A02 | S0003 / 2026-09-13 | T12.2 D1 successful stopping condition, with the target omitted from the follow-up wording | INVALIDATED; underspecified assessment contract, no learner failure | None | Learner correctly challenged that Emma was not restated. Do not score the “all visited” response; corrected explicit-target re-ask is S0003-A03 |
| S0003-A03 | S0003 / 2026-09-13 | T12.2 D1 successful stopping condition with Emma explicitly stated as the target | COMPLETED; correct but solution-exposed | S0003-EV03 | The exact success rule had already been supplied before this re-ask, so retain correctness at assisted level and verify independently later with a materially changed task |
| S0003-A04 | S0003 / 2026-09-13 | T15.1 D1 interpretation of `x & 1` for a non-negative integer | SUPERSEDED in S0004 only after a fresh same-scope task was issued; no learner failure | None | Replacement S0004-A01 issued under the shared attempt counter |
| S0004-A01 | S0004 / 2026-09-15 | T15.1 D1 bit/parity representation; fresh replacement for S0003-A04 | COMPLETED; substantive teaching required | S0004-EV01, S0004-EV02 | T15 sampled; verify later with a materially changed unhinted task |
| S0004-A04 | S0004 / 2026-09-15 | T05.2 D1 fixed-size window enter/leave update | COMPLETED; independent D1 checkpoint | S0004-EV06 | T05 sampled, W0 completed, and PY entered W1/L02 REPAIR_VERIFY |
| S0004-A07 | S0004 / 2026-09-15 | T01.1 D1 representation versus output contract | COMPLETED; independent ordering facet, output-type facet leaked by AI | S0004-EV09 | Do not count the leaked type restatement as independent; revisit only the remaining gap on a later lap |
| S0004-A11 | S0004 / 2026-09-15 | T01.2 D1 time-complexity decomposition in a fresh list-membership context | COMPLETED; independent time facet | S0004-EV13 | Auxiliary-space facet remains; this was a second T01 repair visit in L02 and therefore assistant scheduling drift, not a new lap entitlement |

| S0005-A03 | S0005 / 2026-09-16 | T02.1 D1 accumulated-state meaning over the processed prefix | COMPLETED; independent narrow facet | S0005-EV04 | T02 served for L02; remaining G0009 scope stays for a later lap |
| S0005-A06 | S0005 / 2026-09-16 | T06.1 D1 FIFO structure and operation-cost reasoning | COMPLETED; independent D1 checkpoint | S0005-EV07 | T06 served for L02; review due 2026-09-19 |
| S0005-A10 | S0005 / 2026-09-16 | T08.2 D1 candidate-range and crossed-boundary meaning | COMPLETED; independent range facet plus guided empty-range repair | S0005-EV10 | T08 served for L02; remaining G0011 scope later |

| S0006-A02 | S0006 / 2026-09-17 | T09.1 D1 recursive contract, suffix trace, and base-case semantics | COMPLETED; independent contract/trace facets with light base-case guidance | S0006-EV02 | T09 served for L02; keep remaining G0013 scope for a later lap |
| S0006-A06 | S0006 / 2026-09-17 | T13.4 D1 repeated recursive work and memoization concept | COMPLETED; repeated-work recognition independent, cache mechanism taught | S0006-EV06 | T13 served for L02; later fresh check must not simply rehearse memoization steps |
| S0006-A09 | S0006 / 2026-09-17 | T16.1 D1 remaining ordering-contract clarification | COMPLETED; independent ordering facet | S0006-EV09 | T16 served for L02; preserve earlier mutation/range facets and probe only remaining contract scope later |
| S0006-A12 | S0006 / 2026-09-18 | T03.3 D1 complement/previously-seen state | COMPLETED; independent narrow facet | S0006-EV13 | T03 served for L02; remaining D1 validity/initialization scope G0047 later |
| S0006-A16 | S0006 / 2026-09-18 | T07.1/T07.2 D1 reference preservation before rewiring | COMPLETED; independent preservation/order facets | S0006-EV16, S0006-EV17 | T07 served for L02; G0017/G0018 narrowed but remain open for remaining boundary breadth |

### 0.6 Facet gaps, unknowns, and dependencies

A facet is a narrower component of an existing objective, not a new curriculum objective. Store what is already known as well as what remains. This prevents restarting an entire topic after a narrow error. Kinds: `UNKNOWN_SCOPE`, `CONCEPT`, `SELECTION`, `IMPLEMENTATION`, `COMPLEXITY`, `EDGE_CASE`, `PYTHON_SEMANTICS`, `COMMUNICATION`, `RETENTION`, or `DEPENDENCY`. Status: `OPEN`, `IN_REPAIR`, `BLOCKED`, `CARRYOVER`, or `CLOSED`. Gap IDs use `G0001`, etc. A queued gap is not a formal carryover and does not bypass a tier gate. Correct-but-assisted facets are preserved without relabelling them independently verified. Give independently closable depths separate records or explicit per-depth substatuses. Closing a D1 gap cannot close its D2 sibling, and an open D2-only gap cannot block Tier 1. A stale OPEN record whose exact scope is independently resolved must be reconciled with its resolving evidence before a gate decision; an unresolved contradiction must instead reopen the affected checkpoint. Policy records and unrelated future scope are not learning gaps at the current tier.

| Gap ID | Objective / checkpoint | Kind | Demonstrated facets to preserve | Missing or uncertain facet | Evidence refs | Status | Minimal repair / independent exit check | Revisit trigger |
|---|---|---|---|---|---|---|---|---|
| G0001 | T01.1 / D1 | SELECTION | Recognizes duplicate-removal intent; independently identifies that a set cannot be relied on for first-occurrence ordering | Independent output-type compatibility remains unverified because the AI stated that criterion before asking for it. Do not re-open the already demonstrated ordering facet | S0001-EV01, S0001-EV08, S0004-EV09 | OPEN | Later use a fresh representation/contract task whose type requirement is not leaked; collect only the remaining compatibility facet | Tier 1 REPAIR_VERIFY; not again in the current L02 lap |
| G0002 | T01.2 / D1 | COMPLEXITY | Independent S0004 reasoning now accounts for append, growing list-membership scans, the outer traversal, and arithmetic-series aggregation to O(n^2); earlier guided space reasoning is retained | Independent auxiliary-space growth remains to complete the D1 time-and-space checkpoint. Do not repeat the now-demonstrated time derivation | S0001-EV02–EV06, S0002-EV06, S0002-EV27, S0002-EV29, S0004-EV13 | OPEN | On a later lap, probe only auxiliary-state growth in a fresh context without supplying the bound | Tier 1 REPAIR_VERIFY; not again in the current L02 lap; G0008 remains D2-only |
| G0003 | T01.3 / D1 | UNKNOWN_SCOPE | Independently noticed parallel-state equality in S0001 and related aggregate count totals to processed-input length in S0002 | Need a maintained-state statement sufficient for the required output, plus a simple initialization/preservation/end connection. An aggregate total alone does not establish each entry; per-entry/prefix explanations were supplied by the AI | S0001-EV07, S0002-EV19 | OPEN | Probe only the missing sufficiency/correctness connection in a fresh small D1 context; do not reteach the already-demonstrated idea of a consistency invariant | Tier 1 REPAIR_VERIFY |
| G0004 | T01.4 / D2 | PYTHON_SEMANTICS | Concise function structure and a relevant built-in conversion | Python comment syntax and a contract-preserving implementation after feedback; proposal reviewed without execution | S0001-EV08; related G0007 | OPEN | Fresh independently written small implementation at Tier 2, inspect syntax and output contract, and record execution status; do not infer a broader language deficit from one slip | Tier 2 DIAGNOSE_ALL may resolve it; otherwise Tier 2 REPAIR_VERIFY; D1 concepts remain separately probeable |
| G0005 | T01.5 / D1 | UNKNOWN_SCOPE | Empty, already-distinct, and duplicate-containing test categories | Broader relevant boundaries and tests that distinguish wrong output semantics; unasked or untested categories are not failures | S0001-EV09 | OPEN | Give a fresh small contract and ask for targeted cases with expected behaviour; reuse known baseline-test evidence | Tier 1 REPAIR_VERIFY |
| G0006 | T16.1 / D1 | UNKNOWN_SCOPE | Independent ambiguity detection; mutation/new-output clarification; numeric-range question; preservation-contract clarification; dependent-decision context; S0006 independently adds ordering preservation and its set-only consequence | Error/invalid-input handling and any remaining material input/output/constraint assumptions have not been completely sampled. Do not repeat ordering, mutation, range, or prior clarification facets | S0001-EV10, S0002-EV15, S0002-EV16, S0002-EV22, S0002-EV34, S0006-EV09 | OPEN | Probe only still-missing D1 contract facets in a fresh task without suggesting a strategy | Tier 1 REPAIR_VERIFY after current L02 siblings |
| G0007 | T01.1 / D2 | SELECTION | Relevant set-based representation instinct | Independently apply a representation choice that preserves the complete output contract; migrated D2 portion of G0001, not a new failed attempt | S0001-EV01, S0001-EV08 | OPEN | Fresh D2 application when Tier 2 opens; valid diagnostic evidence may close the gap without an extra repair visit | Tier 2 diagnostic or repair phase; does not block Tier 1 |
| G0008 | T01.2 / D2 | COMPLEXITY | Correct guided space and aggregation reasoning retained at its observed scope | Independent cost derivation on routine application; migrated D2 portion of G0002, not a new failed attempt | S0001-EV03, S0001-EV04, S0001-EV05, S0001-EV06 | OPEN | Fresh D2 cost derivation after Tier 1 clears; credit only what the new independent work demonstrates | Tier 2 diagnostic or repair phase; does not block Tier 1 |
| G0009 | T02.1 / D1 | UNKNOWN_SCOPE | Independently recognizes the count purpose and now independently states the processed-prefix meaning | Why the maintained state is sufficient/minimal and a simple initial/empty boundary remain unverified | S0002-EV01, S0002-EV02, S0005-EV04 | OPEN | On a later lap probe only sufficiency/minimality or the simple initial boundary; do not repeat prefix meaning | Tier 1 REPAIR_VERIFY after other L02 topics are served |
| G0010 | T06.1 / D1 | COMPLEXITY | Fresh S0005 check independently established FIFO deque choice, opposite-end operations, list front-shift cost, and constant-time deque end operations | No missing D1 facet remains for this checkpoint; other T06 objectives stay separate | S0002-EV03–EV07, S0005-EV07 | CLOSED | D1 exit check satisfied by S0005-EV07; retain only scheduled review | Review due 2026-09-19 |
| G0011 | T08.2 / D1 | EDGE_CASE | Independently sees sorted-order halving and now independently interprets the remaining candidate interval | Crossed-boundary absence/termination was supplied by the AI before the learner restated it; progress and a fresh absent/small-range boundary remain unverified | S0002-EV08, S0002-EV09, S0005-EV10 | OPEN | On a later lap use a fresh small-range boundary task without supplying the empty-range rule; do not repeat the already-demonstrated candidate-range meaning | Tier 1 REPAIR_VERIFY after other L02 topics are served |
| G0012 | T02.2 / D1 | UNKNOWN_SCOPE | During the T08 discussion accepted that index boundaries can avoid creating sublists | Copying versus mutation terminology was corrected by the AI; no independent probe of that distinction or the other direction/prefix/suffix/in-place concept families occurred. Do not turn one imprecise term into a broad Python-semantics failure | Related exposure: S0002-EV09; no direct complete T02.2 assessment | OPEN | Probe a small direction/state/copy-versus-mutation concept at D1; treat missing concept families as unknown and preserve known intent | Tier 1 REPAIR_VERIFY |
| G0013 | T09.1 / D1 | UNKNOWN_SCOPE | Independently recognizes a base condition/safety concern and now independently states the recursive suffix return contract with a correct small trace | Valid-input assumptions, an independently stated progress measure, and a clean stopping-boundary explanation remain incomplete; the S0006 base-case explanation received light guidance | S0002-EV10–EV12, S0006-EV02 | OPEN | Later probe only the remaining progress/assumption/boundary facets in a fresh recursion-reading task | Tier 1 REPAIR_VERIFY after current L02 siblings |
| G0014 | T13.4 / D1 | CONCEPT | S0006 independently identifies repeated `f(3)` work and correctly distinguishes duplicate computation from nontermination; final cache-check/store/reuse model is understood after teaching | Independent memoization conditions, memoization-versus-tabulation distinction, and memory/dependency reasoning remain unverified | S0002-EV13–EV14, S0006-EV06 | OPEN | Use a later fresh D1 conceptual check that does not supply the cache mechanism; no recurrence implementation or harder DP selection before the tier gate | Tier 1 REPAIR_VERIFY after current L02 siblings |
| G0015 | T03.1 / D1 | UNKNOWN_SCOPE | Independently selects dictionary-based counts after clarifying numeric-range assumptions | Needed membership-versus-count semantics and a relevant key/initialization boundary have not been completely sampled. No requirement to implement every listed library alternative is added | S0002-EV17 | OPEN | Probe only missing D1 representation semantics and a simple boundary; reuse the correct counting-map choice rather than teach it again | Tier 1 REPAIR_VERIFY |
| G0016 | T03.2 / D1 | UNKNOWN_SCOPE | Independent aggregate count/processed-length invariant; correct concrete prefix map after the AI supplied per-key meaning | Independent per-key maintained-state meaning and conceptual update/removal with an absent/zero-count boundary remain unverified. Unasked removal scope is unknown, not failed | S0002-EV18, S0002-EV20 | OPEN | Fresh D1 state-update/removal reading; preserve the aggregate invariant and distinguish an independent explanation from replay of the supplied map example | Tier 1 REPAIR_VERIFY |
| G0017 | T07.1 / D1 | UNKNOWN_SCOPE | S0006 fresh task independently establishes ownership/access reasoning: save the old `current.next` so the unprocessed node remains reachable; earlier ambiguity remains excluded | Remaining end-of-chain/null-boundary breadth is still unverified; do not repeat the now-demonstrated preservation rule | S0002-EV21–EV23, S0006-EV16 | OPEN | Later ask only for a simple end-of-chain traversal boundary under an explicit contract | Tier 1 REPAIR_VERIFY after current L02 siblings |
| G0018 | T07.2 / D1 | UNKNOWN_SCOPE | S0006 independently establishes pre-rewire ordering: preserve old `current.next` before changing the link so unprocessed nodes remain reachable; earlier assisted reconnection retained | A simple relevant boundary remains unverified; no implementation was observed and D2/D3 rewiring stays future scope | S0002-EV24, S0006-EV17 | OPEN | Later probe only a boundary/edge case of the preservation invariant; do not repeat the same A→B→C setup | Tier 1 REPAIR_VERIFY after current L02 siblings |
| G0019 | T11.1 / D1 | COMPLEXITY | Sorted-list proposal is a valid alternative; recognizes logarithmic position search; correctly includes movement and dominating cost after a cue | Independent whole-update accounting and conceptual heap-versus-sorting/selection tradeoff remain unknown. Specify access versus extraction and the operation mix before judging a representation | S0002-EV25, S0002-EV26, S0002-EV28; related S0002-EV27, S0002-EV29 | OPEN | Fresh D1 cost-composition check; introduce only the unfamiliar heap purpose/operation model needed for a conceptual comparison, then verify independently in a later bounded visit | Tier 1 REPAIR_VERIFY; finish T12/T15/T05 before this repair |
| G0020 | T11.2 / D1 | UNKNOWN_SCOPE | Explicitly reports unfamiliarity with heaps; no direct heap-operation performance has been observed | Basic heap purpose/order contract and conceptual operation/entry semantics are unassessed, not failed. No heap lesson or API-version verification occurred in S0002 | S0002-EV30 (REPORTED_EXPOSURE; NA) | OPEN | Start at a very small D1 familiarity probe; provide only the required introductory concept if still unknown. Establish the Python environment before relying on version-specific APIs; do not request heap implementation now | Tier 1 REPAIR_VERIFY |
| G0021 | T10.1 / D1 | UNKNOWN_SCOPE | Independently identifies breadth-first search and level-by-level processing | Comparison with DFS for output/state/memory/early-exit needs and a simple tree boundary remain unassessed. The FIFO-queue mechanism was supplied by the AI, not demonstrated by the learner | S0002-EV31 | OPEN | Probe only missing D1 traversal-choice/state facets; do not reteach BFS naming or the already-stated level-order purpose | Tier 1 REPAIR_VERIFY |
| G0022 | T14.4 / D1 | UNKNOWN_SCOPE | Rejects an unsupported global-optimality conclusion; later clearly distinguishes independent processing from dependent choices after an available explanation | Original vague rationale is not a failure. Independent distinction between feasibility and optimality, with enough context to identify counterexample risk, remains incomplete | S0002-EV32, S0002-EV33; clarification S0002-EV34 | OPEN | Use a concrete D1 conceptual decision context with objective, constraints, and dependence specified; no formal exchange proof or unlabelled harder-tier selection required | Tier 1 REPAIR_VERIFY |
| G0023 | T04.1 / D1 | UNKNOWN_SCOPE | Independently explains relative ordering on either side of the two boundaries | A sufficient explanation of why the monotonic relation permits safe elimination rather than merely suggesting a plausible move has not been elicited | S0002-EV35 | OPEN | Probe the missing D1 completeness/assumption link in a small sorted-data context; preserve the known directional ordering fact | Tier 1 REPAIR_VERIFY |
| G0024 | T04.2 / D1 | UNKNOWN_SCOPE | Independently chooses the movement for a below-target pair sum using the stated order relation | Opposite comparison, maintained remaining-candidate range, and a simple meeting/crossing boundary are unassessed; no failure inferred from these unasked facets | S0002-EV36 | OPEN | Ask a bounded D1 explanation at the missing comparison/boundary scope without repeating the completed below-target move; no full implementation required | Tier 1 REPAIR_VERIFY |
| G0025 | T02.5 / D1 | UNKNOWN_SCOPE | Adjacent direct-scan purpose/state facets exist, but no independent applicability argument has been assessed | The old pending attempt mentioned direct-scan sufficiency; its S0002 replacement only sampled T02.1. Applicability under constraints remains unknown, not automatically credited by the correct trace | No scored T02.5 evidence; see S0001-A02, S0002-A01, S0002-A02 dispositions | OPEN | Fresh D1 conceptual probe of whether a direct scan meets a clearly specified requirement/constraint; do not request harder-tier technique selection | Tier 1 REPAIR_VERIFY |
| G0026 | T12.1 / D1 | CONCEPT | Recognizes that the people/relationships form a graph-like shape | Exact topology was represented as a triangle with an extended edge rather than the four-node cycle/diamond implied by the stated friendships; people-as-nodes, friendships-as-edges, and bidirectional/undirected semantics were not independently made explicit | S0003-EV01 | OPEN | In Tier 1 REPAIR_VERIFY, use a fresh small relationship set and ask for an exact node/edge model plus directionality; preserve the existing graph intuition and do not require an implementation | Tier 1 REPAIR_VERIFY |
| G0027 | T12.2 / D1 | UNKNOWN_SCOPE | Independently uses visited state to avoid repeated exploration; correctly restated the target-success condition after it had been supplied | Need a fresh independent success/failure termination check plus basic frontier/traversal reasoning; the invalidated omitted-target prompt creates no learner gap, and the repeated Emma answer is assisted rather than independent | S0003-EV02, S0003-EV03; S0003-A02 invalidated | OPEN | In Tier 1 REPAIR_VERIFY, use a materially changed reachability task with an explicit target and no supplied stopping rule; ask both when success occurs and when the search can conclude failure. Keep BFS/DFS mechanics conceptual at D1 | Tier 1 REPAIR_VERIFY |
| G0028 | T15.1 / D1 | CONCEPT | After instruction, correctly applies binary place values and the `x & 1` parity interpretation | The bitwise-AND model and binary representation were supplied before successful application; independent representation/mask reasoning is still required | S0004-EV01, S0004-EV02 | OPEN | On a later L02 visit, use a materially changed unhinted bit/mask interpretation task; do not reteach binary first unless the learner again lacks the prerequisite | Tier 1 REPAIR_VERIFY after other eligible L02 topics receive visits |
| G0047 | T03.3 / D1 | UNKNOWN_SCOPE | Independently identifies the needed complement as already-seen state in a simple pair-sum scan | Why the seen-state replacement is valid, plus a simple initialization/no-match boundary, remain unverified; no nested-search implementation is required at D1 | S0006-EV13 | OPEN | Later probe only validity/initial-state or no-match boundary in a fresh complement-state context | Tier 1 REPAIR_VERIFY after current L02 siblings |

### 0.7 Topic transfer and retention

An objective-level skip is independent of the topic-level transfer gate. A topic can skip its basic lessons while its transfer check remains pending. Only call the entire topic `SKIP_ALL_INSTRUCTION` when all five objectives meet target and a qualifying changed-context transfer succeeds. Review remains active even then. New transfer diagnostics normally wait for Tier 4; existing qualifying evidence is retained without forcing a repeat. Transfer and integration status codes are U (unknown), G (partial/assisted or observed gap), P (complete independent coverage), and R (previous pass contradicted). A final-gate gap records its associated opened tier separately from objective checkpoint depth; a topic transfer does not create a D4 cell for every objective. Keep cumulative assessed facets and exact remaining transfer scope, not just a generic pass label.

| Topic | Transfer status | Transfer evidence / covered scope | Delayed review status | Review evidence / due |
|---|---|---|---|---|
| T01 | U | — | U | — |
| T02 | U | — | U | — |
| T03 | U | — | U | — |
| T04 | U | — | U | — |
| T05 | U | — | U | — |
| T06 | U | — | U | — |
| T07 | U | — | U | — |
| T08 | U | — | U | — |
| T09 | U | — | U | — |
| T10 | U | — | U | — |
| T11 | U | — | U | — |
| T12 | U | — | U | — |
| T13 | U | — | U | — |
| T14 | U | — | U | — |
| T15 | U | — | U | — |
| T16 | U | — | U | — |

### 0.8 Integration coverage

These are coverage areas, not a question list. Register partial demonstrated combinations instead of inferring every component from one mixed attempt. I06 is accumulated coverage across a set of interview-style attempts; it is not a requirement to squeeze every topic into one question.

| Area | Scope | Status | Evidence refs / covered components | Remaining coverage / next action |
|---|---|---|---|---|
| I01 | ACTIVE | U | — | Contiguous-data technique selection |
| I02 | ACTIVE | U | — | Linear structures and ordering |
| I03 | ACTIVE | U | — | Recursive and hierarchical state |
| I04 | ACTIVE | U | — | Graph and priority reasoning |
| I05 | ACTIVE | U | — | Optimization choice and proof boundaries |
| I06 | ACTIVE | U | — | Interview loop across the selected curriculum |
| I07 | NOT_SELECTED | U | — | Optional specialized transfer |

### 0.9 Scope decisions, carryovers, and scheduling exceptions

Keep distinct: a verified skip saves instruction; a temporary carryover postpones an unresolved checkpoint; an exclusion removes scope only by an explicit learner decision. Never count the latter two as mastery. Policy and file-workflow decisions are not learning evidence. Any harder-tier override must explicitly state the learner's authority, affected scope, and return condition.

| Decision ID | Date / session | Type | Affected scope / depth | Reason and authority | Revisit / expiry | Status |
|---|---|---|---|---|---|---|
| DEC0001 | 2026-09-11 / structural | LEARNING_POLICY | All 16 topics and 80 objectives | Learner requests breadth-first progression, diagnostic placement, AI-only editing, and one replacement file | Persistent; made more specific by DEC0002 and DEC0003 | ACTIVE |
| DEC0002 | 2026-09-12 / S0001 | LEARNING_POLICY | All active topics; tiers D1 through D4/transfer | Learner explicitly requests easiest diagnostics across all topics first, then gap repairs, then the next harder diagnostic tier. Replace unrestricted diagnostic challenge-up and automatic one-depth carryover advancement with strict tier gates | Persistent until explicitly changed by learner; no tier-bypass permission inferred | ACTIVE |
| DEC0003 | 2026-09-12 / S0001 | FILE_WORKFLOW | Entire canonical Markdown source | Learner keeps the download locally and uploads it on new sessions. AI returns a complete replacement on request or wrap-up, with evidence and exact resume state | Persistent until learner changes storage workflow | ACTIVE |
| DEC0004 | 2026-09-12 / S0001 | ASSESSMENT_CORRECTION | T01.2 initial complexity response | Ambiguous wording was reasonably interpreted as the cost of a length expression. Exclude that response from gap scoring; distinguish later genuine operation-cost errors and guided repair | Permanent interpretation of S0001-EV02; no retrospective failure from wording alone | ACTIVE |
| DEC0005 | 2026-09-12 / source audit | POLICY_BUGFIX | Scheduling, gap closure, assessment identity, and saves | Learner asks to audit both downloaded files and fix bugs. Enforce the same tier ceiling for reviews, restore lower-tier work before continuing higher work, split cross-tier gap records, and preserve pending-attempt/session identity | Persistent policy correction; no scope reduction, progression override, or new assessment | ACTIVE |
| DEC0006 | 2026-09-12 / S0002 | ASSESSMENT_CORRECTION | T06.1 FIFO-workflow interpretation; T07.1/T07.2 preservation contract; T14.4 local/global-choice context | Learner explicitly clarified the whole workflow versus a single insertion, challenged an unstated linked-tail preservation requirement, and objected to missing independent/dependent-choice context. Preserve those corrections; ambiguous initial responses are not failures. Prior substantive teaching still limits independence of later clarified answers | Permanent interpretation of the affected S0002 evidence; do not reintroduce the withdrawn misreadings | ACTIVE |
| DEC0007 | 2026-09-12 / S0002 save | ASSESSMENT_CORRECTION | S0002 assistance levels, checkpoint claims, and unobserved execution | Save reconciles chat praise against the existing rubric: the explained prefix trace, supplied queue costs, and guided recursion repair are not full independent checkpoints. This implements the unchanged evidence policy, not a target increase or a learner failure. No execution, documentation check, or timed performance was observed | Persistent evidence interpretation; no learning credit from the save itself | ACTIVE |
| DEC0008 | 2026-09-12 / S0002 save | PROCESS_CORRECTION | Tier 1 diagnostic visit length and breadth scheduling | Some assistant-led visits exceeded the bounded follow-up limit. The learner did not authorize extra drilling, an early repair phase, or a harder-tier override. Preserve actual evidence but do not treat assistant drift as a new scheduling policy | Resume the existing bounded-visit rule at T12; extended repairs wait until T12, T15, and T05 resolve the sweep | ACTIVE |
| DEC0009 | 2026-09-12 / S0002 | FILE_WORKFLOW | Explicit session end and complete AI-facing handoff | Learner stopped for bed before answering T12 and asked to update the reattached roadmap with this session's progress and notes for the next AI. Close S0002, preserve T12 as pending, and return one complete Markdown replacement. No request to change curriculum scope or tier policy | This revision-5 session-end save; next actual study uses S0003 without resetting W0/L01 | RECORDED |
| DEC0010 | 2026-09-13 / S0003 | ASSESSMENT_CORRECTION | T12.2 stopping-condition prompt and independence claim | Learner correctly challenged that the follow-up asking when the search could stop successfully did not restate that Emma was the target. Invalidate S0003-A02 rather than score its response. The AI had already supplied the exact Emma stopping rule before S0003-A03, so the later correct answer is assisted despite chat praise calling it independent | Permanent interpretation of S0003-A02/A03; future verification must use a fresh explicit-target task without the supplied stopping rule | ACTIVE |
| DEC0015 | 2026-09-15 / administrative (merged file) | LANGUAGE | All PY implementation and code-reading work | Learner confirmed Python as their chosen language for coding interviews, noting that coding tests usually allow a language choice. This confirms the track's existing scope; no objective, target, or evidence changes. PE's stack (PE:DEC0009, TypeScript/React UI with Python server code) is unaffected | Revisit only if the learner targets a language-restricted assessment | ACTIVE |
| DEC0016 | 2026-09-15 / administrative (merged file) | ENVIRONMENT | All PY implementation work; later PY interview-execution practice | Learner noted that Python version and interview platform differ by company, so neither should be fixed. Replace "establish the environment" with a portability policy: do not assume a specific version or platform; flag version-dependent features and credit only the portable reasoning unless the scenario states a version; record execution status as usual; vary execution availability and input format across interview-style practice. Interpreting the curriculum's existing "selected Python environment" wording as "the environment stated in the scenario, otherwise portable Python" requires no curriculum change | Revisit if the learner prepares for a specific company with a known environment; record that as a scenario, not a global setting | ACTIVE |
| DEC0022 | 2026-09-15 / administrative (merged file) | SCENARIO_EMPHASIS | Scenario choice for PY work from Tier 2 onward; later interview-execution practice | Both interview-loop research reports agree the existing topic breadth already covers what target employers test, so no topics are added. What matters more is fast technique selection, bug-free Python, complexity, edge-case tests, and communication under time pressure, often two problems in about 45 minutes at large companies. Main-tier product companies increasingly frame problems as product-flavored stateful logic (for example, hierarchies built from flat parent-ID records, undo/redo history, range or interval edits, token or indentation validation). Include such framings among eligible scenarios once their techniques are opened, without revealing the technique, and include timed two-problem practice when this track reaches interview-execution work | Revisit if a recruiter-confirmed loop specifies a different format | ACTIVE |

### 0.10 Session, wave, and phase history

One session row per actual study session. A save is not a new study session. A lap may cross several sessions; a session may finish one lap and start another. An unanswered prompt is not a failed attempt. On a new session, preserve the saved queue instead of starting the curriculum over.

| Session | Date | Wave / lap / tier phase | Primary topics / objectives | Evidence IDs and concise outcome | Next handoff |
|---|---|---|---|---|---|
| S0001 | 2026-09-12; INTERRUPTED_AT_LAST_SAVE | W0 / L01; migrated to Tier 1 DIAGNOSE_ALL | T01.1–T01.5 primary; T16.1 embedded; T02 prompt not answered in S0001 | S0001-EV01, S0001-EV02, S0001-EV03, S0001-EV04, S0001-EV05, S0001-EV06, S0001-EV07, S0001-EV08, S0001-EV09, S0001-EV10 unchanged. Narrow facets preserved, gaps isolated, complexity repair guided; no full checkpoint passes. No unobserved closing time or outcome invented | Actual new study resumed as S0002 without resetting L01. Unavailable unanswered S0001-A02 was superseded by S0002-A01; S0001 evidence kept under its original IDs |
| S0002 | 2026-09-12; CLOSED by explicit bedtime stop | W0 / L01 / Tier 1 DIAGNOSE_ALL; no phase or tier advancement | 12 completed primary visits: T02, T06, T08, T09, T13, T16, T03, T07, T11, T10, T14, T04. T12 issued but unanswered; T01 observed only incidentally | S0002-EV01–S0002-EV36; S0002-A01–S0002-A26. Independent narrow strengths retained; supplied explanations and guided follow-ups separated; valid ambiguity corrections recorded; heap unfamiliarity unscored. 13/16 topics sampled including S0001 T01; no full checkpoint passes or delayed retention | Next actual study S0003: T12 pending/replacement first, then T15 and T05. After the sweep, W1 / Tier 1 REPAIR_VERIFY / L02. Do not restart completed visits, score the unanswered task as a failure, or unlock Tier 2 |
| S0003 | 2026-09-13; CLOSED by explicit stop/save | W0 / L01 / Tier 1 DIAGNOSE_ALL; no phase or tier advancement | T12 primary visit completed; T15.1 prompt issued but unanswered | S0003-EV01–S0003-EV03; S0003-A01–S0003-A04. Graph-style modelling intuition retained with topology gap; visited-set reasoning independently sound; omitted-target follow-up invalidated; later Emma stopping answer correct but solution-exposed. 14/16 topics sampled; no full checkpoint passes | Next actual study S0004: T15 pending/replacement first, then T05. After both sweep obligations resolve, open W1 / Tier 1 REPAIR_VERIFY / L02. Do not restart T12 or treat the invalidated prompt as a learner error |
| S0004 | 2026-09-15; CLOSED by explicit stop/save | Finished W0/L01 Tier 1 DIAGNOSE_ALL, then opened W1/L02 REPAIR_VERIFY | T15 and T05 completed the sweep; repair visits at T01.1 and T01.2 | S0004-EV01, EV02, EV06, EV09, EV13. T05.2 D1 independently passed; T15.1 remained assisted; T01 ordering and time-complexity facets strengthened without overcrediting leaked/unchecked scope | Next PY turn in S0005 is T02 in W1/L02. T01 is already served for this lap; do not repeat it before siblings. T05.2 review due 2026-09-18 |
| S0005 | 2026-09-16; CLOSED by explicit stop/save | W1 / L02 / Tier 1 REPAIR_VERIFY | T02, T06, T08 | S0005-EV04, EV07, EV10. T06.1 D1 independently passed; T02 processed-prefix meaning strengthened; T08 candidate-range meaning independent while empty-range conclusion remains assisted | Next PY turn in S0006 is T09. T01/T02/T06/T08 are already served for L02; T05.2 review due 2026-09-18 and T06.1 due 2026-09-19 |
| S0006 | 2026-09-17–2026-09-18; CLOSED by explicit save/update | W1 / L02 / Tier 1 REPAIR_VERIFY | T09, T13, T16, T03, T07 | S0006-EV02, EV06, EV09, EV13, EV16–EV17. Recursive suffix contract, ordering clarification, complement state, and reference preservation gained independent narrow evidence; memoization mechanism remained taught/assisted. No new full D1 checkpoint. | Next ordinary PY breadth is T11 after the due-review rule is serviced; T01/T02/T06/T08/T09/T13/T16/T03/T07 are already served in L02 |

| Wave | Tier / phase meaning | Status | Verified coverage / exit evidence | Unresolved work | Next revisit |
|---|---|---|---|---|---|
| W0 | Tier 1 DIAGNOSE_ALL | CLEARED | 16/16 topics sampled; T15 and T05 completed in S0004. W0 exit is sampling, not D1 mastery | None; unresolved D1 scope moved to W1 | Historical phase complete; do not restart |
| W1 | Tier 1 REPAIR_VERIFY | ACTIVE | 2/80 D1; T05.2 and T06.1 independently verified | Remaining D1 gaps and unknown scope across the breadth queue | Continue L02 at T11 after servicing the due-review rule |
| W2 | Tier 2 DIAGNOSE_ALL, then REPAIR_VERIFY | LOCKED | 0/80 D2 | Full tier sweep and remaining D2 scope | After Tier 1 is CLEARED |
| W3 | Tier 3 DIAGNOSE_ALL, then REPAIR_VERIFY | LOCKED | 0/79 D3 | Full tier sweep and remaining D3 scope | After Tier 2 is CLEARED |
| W4 | Tier 4 DIAGNOSE_ALL, then REPAIR_VERIFY | LOCKED | 0/1 required D4; 0/16 topic transfers; 0/6 integration areas | Transfer, adaptation, and mixed execution scope | After Tier 3 is CLEARED |

### 0.11 Revision and migration history

| Revision | Date | Change | Learning credit |
|---|---|---|---|
| 1 | 2026-09-11 | Original single-file curriculum with empty AI-managed progress record | None |
| 2 | 2026-09-11 | Redesigned as diagnostic-first breadth waves with checkpoint/facet placement, minimal dependencies, skip decisions, and complete session handoff; retained all 16 topics and 80 objective definitions | None |
| 3 | 2026-09-12 | Curriculum 4.0 / tracking schema 3.0: added strict all-topic diagnostic tiers, repair/verification phases and gates; replaced automatic harder diagnostics and one-depth carryover advancement; saved observed S0001 evidence and the unanswered T02 handoff; adopted local-file upload workflow | Preserved narrow learner evidence and guided outcomes only; 0 full checkpoint passes |
| 4 | 2026-09-12 | Policy 4.1 / tracking 3.1 audit of uploaded revision 3: close harder-review and resumed-tier loopholes; add depth-specific gap closure, attempt lifecycle, complete queue/terminal tracking, source digests and exact parent identity; preserve all 80 objectives and S0001 evidence | No new learning evidence or checkpoint passes; D2 portions of G0001/G0002 moved to G0007/G0008 |
| 5 | 2026-09-12 | Complete S0002 session-end save of the explicitly reattached revision 4: add 36 scoped evidence rows, 26 attempt records, 17 D1 facet-work records, semantic/assistance corrections, and exact T12 handoff; close S0002 and retain S0001 as interrupted. Scope, rubric, curriculum bytes, and operating contract unchanged | 12 new primary topics sampled; 13/16 cumulative. Independent partial facets and guided outcomes preserved; 0 full checkpoint passes, no transfers/integration/retention passes |
| 6 | 2026-09-13 | Complete S0003 session-end save from revision 5: supersede the old unanswered T12 task only after a fresh T12 prompt was issued; add three scoped T12 evidence rows, four S0003 attempt dispositions, two D1 gap records, and an assessment-correction decision; record T15 as pending. Curriculum and operating contract unchanged | T12 sampled; 14/16 cumulative. Independent visited-state reasoning preserved, graph-topology gap isolated, omitted-target follow-up invalidated, solution-exposed stopping answer not overcredited; 0 full checkpoint passes |
| Merge 1 | 2026-09-15 | Track moved into merged file `interview_prep_roadmap` revision 1 as track PY. Curriculum bytes unchanged (digest verified); progress block unchanged except shared-counter pointers in Section 0.2 and this row. Pending S0003-A04 carried unchanged. Cross-track scheduling, identifiers, and saving now follow merged Part S and Section M | None; no evidence, gap, or denominator changed |
| Merged r2 | 2026-09-15 | Language preference recorded (DEC0015): Python confirmed for coding interviews; administrative, no study | None |
| Merged r3 | 2026-09-15 | Environment policy recorded (DEC0016): version and platform vary by company; default to portable Python and vary practice conditions; administrative, no study | None |
| Merged r4 | 2026-09-15 | DEC0022 scenario emphasis recorded; cross-track ratio changed to 1 PY : 2 PE by shared DEC0019. No PY scope, evidence, or denominator change | None |
| Merged r6 | 2026-09-15 | S0004 first merged study session: T15 and T05 completed W0, W1/L02 opened, and T01 repair evidence was recorded. Shared DEC0023 tightened probe methodology after answer leakage/filler and scope mistakes. Curriculum unchanged. | T05.2 D1 passed; T15.1 assisted; T01.1/T01.2 gained independent partial facets. No higher-depth, transfer, integration, or retention pass. |
| Merged r7 | 2026-09-16 | S0005 served T02, T06, and T08 in W1/L02. Curriculum unchanged; shared DEC0024 records the separate PE prompt corrections. | T06.1 D1 passed; T02.1 gained an independent processed-prefix facet; T08.2 gained independent candidate-range meaning while empty-range termination stayed assisted. |
| Merged r8 | 2026-09-18 | S0006 served T09, T13, T16, T03, and T07 in W1/L02. Shared DEC0025 sets TypeScript+Python practice format and DEC0026 records prompt/scheduler corrections. Save audit removed an erroneous PE evidence reference from PY:T06.4. Curriculum unchanged. | New independent narrow facets at T09.1, T16.1, T03.3, T07.1, and T07.2; T13.4 repeated-work distinction strengthened while memoization remained assisted. No new full D1 pass. |
| Merged r9 | 2026-09-19 | Mid-session S0007 save affected PE learning state only. Shared DEC0027 adds the common-idiom practice rule across both tracks, so future PY examples also avoid incidental uncommon syntax unless that syntax is itself relevant. PY curriculum and learning evidence unchanged. | None; no PY learning evidence or checkpoint state changed. |

**Earlier migration:** Version 2.0 / tracking schema 1.0 had no completed assessments or active study history to migrate. Its D00 diagnostic-area labels were retired in favour of direct topic/objective coverage, not converted into passes. T15.4 targets D2, T16.5 targets D4, and the other 78 objectives target D3. Topic transfer is separate from these objective targets.

**Revision 3 migration:** Objective IDs, their definitions, target depths, all six required integration areas, and the 240 required checkpoint cells are unchanged. No objective ID mapping is needed. W0 now means only the easiest Tier 1 diagnostic sweep; W1 completes Tier 1 repairs/verification; W2–W4 each contain their own diagnostic and repair phases. New tier/phase and per-topic diagnostic fields are scheduling data, not extra mastery requirements. Historical mixed-depth evidence is retained without authorizing new harder-tier work. S0001/L01 and T01's completed bounded visit are preserved; T02 remains unanswered. Sections 1–3 and 9 now supersede the old automatic challenge-up and carryover-lead policies. The learner's requested local-file workflow supersedes the assumption that a Project Source is the only handoff method.

**Revision 4 audit migration:** All 80 objective definitions and targets, all 10 existing evidence rows, the T01 completed visit, and the unanswered T02 task are preserved. G0001/G0002 now describe their D1 portions; their existing D2 portions are G0007/G0008. This separates closure timing without adding an assessment or making a pass. T01.4's runnable route is PROBE because its D1 is unknown; its D2 gap is retained. Administrative edits do not start S0002. This file now receives a defined curriculum digest and an exact uploaded-parent fingerprint. External technical references were not rechecked by this policy/state audit.

**Revision 5 source and validation note:** The explicitly reattached revision-4 source and the session-opening revision-4 upload were byte-identical; there is no competing revision-4 branch to merge. The new parent fingerprint identifies the complete reattached bytes. Its curriculum digest was verified on load and remains unchanged. The revision-3 ancestor itself was not supplied, so the older historical parent fingerprint is retained as unverified ancestry rather than asserted as independently checked. Any pre-existing older canonical-name file is preserved separately before the intended output is replaced. All historical S0001 evidence rows and all 80 objective definitions remain intact.

**Revision 6 source and validation note:** The attached revision-5 source was loaded directly as the parent (SHA-256 `061c773334038ee4f65ff8e04194a9e7a9c6fbbe1725c9c4a49cf585d2d0356a`). This save changes only revision metadata and `AI_PROGRESS`; the complete curriculum block is byte-identical to revision 5. Historical evidence and objective definitions are preserved, and no ambiguous or solution-exposed response is promoted to an independent pass.

**AI handoff summary:** PY remains in W1/L02 REPAIR_VERIFY with 2/80 D1 passes. T01, T02, T06, T08, T09, T13, T16, T03, and T07 have been served in this lap; ordinary breadth next reaches T11 after the due-review rule. Preserve S0006 independent facets for recursive contract, ordering clarification, complement state, and linked-reference preservation; memoization remains assisted. T05.2 review is due/overdue and T06.1 review is due 2026-09-19. Shared DEC0023–DEC0027 govern prompt integrity, practice language, and common-idiom example style.

<!-- END PY_PROGRESS -->

<!-- BEGIN PY_CURRICULUM -->

## 1. Curriculum tree and learning layers

### 1.1 Scope tree

The root is Python coding-interview competence. Families group related topics; each topic contains five stable objectives. Each objective can be approached at progressively deeper checkpoints. Sibling order is flexible. Do not confuse the suffix in `T08.3` with learning depth: it is an objective ID, not D3.

| Family | Branch | Topic children |
|---|---|---|
| F01 | Language and interview execution | T01, T16 |
| F02 | Linear data and boundary patterns | T02, T03, T04, T05 |
| F03 | Linear structures and references | T06, T07 |
| F04 | Ordering and priority | T08, T11 |
| F05 | Recursive, hierarchical, and connected state | T09, T10, T12 |
| F06 | Optimization and numeric techniques | T13, T14, T15 |

Every core topic is visible during the first diagnostic sweep. T01 and T16 are also observed throughout other work, but embedded observations only count when their specific objectives were demonstrated. Optional extensions do not displace basic coverage of active branches.

### 1.2 Diagnostic tiers and breadth waves

**Breadth-first applies to diagnostics as well as instruction.** Complete the easiest tier across the active curriculum, repair its gaps and verify its required scope, then begin the next harder tier across the curriculum. An easy answer in one branch is not permission to climb that branch ahead of the others.

| Difficulty tier | Diagnostic demand | Required scope before leaving the tier | Wave mapping |
|---|---|---|---|
| Tier 1 — Foundations | Easiest meaningful probes: explain purpose, predict or trace small code, identify simple state, operations, assumptions, or boundaries; no full implementation required | All 80 active D1 checkpoints independently verified; unknown or guided-only scope must be resolved | W0 = DIAGNOSE_ALL; W1 = REPAIR_VERIFY |
| Tier 2 — Routine application | Harder probes: independently implement or apply a labelled technique or reasoning model under ordinary constraints | All 80 active D2 checkpoints independently verified, with lower-tier requirements still valid | W2 = DIAGNOSE_ALL, then REPAIR_VERIFY |
| Tier 3 — Independent selection | Harder again: choose and reject approaches in unlabelled contexts, implement/apply independently, justify correctness and cost | All 79 required D3 checkpoints independently verified; T15.4 has no D3 requirement | W3 = DIAGNOSE_ALL, then REPAIR_VERIFY |
| Tier 4 — Transfer and integration | Meaningful changes to assumptions, representation, constraints, or output; combine skills and execute the interview loop | T16.5 D4, all 16 topic-transfer gates, and I01–I06 independently verified; no new D4 requirement for every objective | W4 = DIAGNOSE_ALL, then REPAIR_VERIFY |

Each tier follows **DIAGNOSE_ALL → REPAIR_VERIFY → TIER_GATE**. Begin its diagnostic phase with a bounded visit to each active topic, using prior qualifying evidence where it already covers the entire topic's current-tier obligation. Then rotate through unresolved current-tier objectives and facets: probe unknown scope, skip demonstrated material, repair observed gaps, and use fresh independent checks. Only after the gate is satisfied does the next tier open.

A diagnostic sweep is a placement pass, not a claim that all five objectives in each topic are already assessed. Remaining unknown objectives receive current-tier probes during REPAIR_VERIFY before any teaching. The 240 required checkpoint cells specify coverage, not a fixed number of questions; one manageable attempt can cover several compatible facets, and several short visits can establish one checkpoint. Never substitute a long 80-part exam for bounded visits.

A wave is a historical scheduling label, not a second difficulty scale. W0 and W1 together form Tier 1; there is no preliminary mixed-difficulty sweep before the easiest tier. A lap contains at most one ordinary primary visit per eligible topic and can span sessions. During repair laps, topics with no unresolved current-tier scope leave the active teaching queue instead of receiving filler lessons.

D1 requires the learner to explain or reason, not merely repeat a name after the AI. D2 requires independent execution at the relevant scope; for a reasoning-only objective, execution means applying the reasoning rather than writing irrelevant code. D3 includes unprompted technique selection and rejection of unsuitable alternatives where relevant. D4 changes an important assumption, representation, constraint, or output requirement and tests adaptation, not recognition of a paraphrase.

Depth is a pedagogical layer applied to an objective, not a replacement for its final target wording. A conceptual discussion of a difficult implementation objective can pass D1 while leaving D2 and D3 unassessed. Every required checkpoint must be supported at full checkpoint scope. The default target is D3; T15.4 targets D2 because its scope is recognizing a specialized operation contract rather than implementing advanced structures; T16.5 targets D4 because adaptation is its explicit outcome.

Delayed retention is a separate dimension, not a fifth difficulty tier. A same-session transfer does not demonstrate later retention. These are the learner's scheduling preferences, not a claim that one learning sequence is optimal for everyone.

### 1.3 Fixed depth-specific assessment scope

Before a probe, identify the objective facets and the current depth-specific success conditions; record the assessed and missing scope in the evidence/gap records. Do not move the standard after seeing a correct answer, add arbitrary variants, or interpret a terminal verb as a Tier 1 requirement. The existing objective definition bounds the scope: D1 checks purpose, representation/state, essential assumptions and a simple relevant boundary; D2 applies the labelled model or writes the small implementation where required; D3 selects and rejects approaches independently and supplies the relevant execution, correctness, and cost reasoning. T16.5 alone has a required objective D4; transfers/integration remain separate.

A simple prediction or trace may establish a D1 reasoning facet, not independent code-writing. A D1 pass does not require a memorized implementation or an unlabelled selection test. Conversely, merely naming a technique does not show the whole D1 projection. Cover the actual concept families in each objective across bounded visits; do not expand “full scope” to all possible problems or every variant of an explicitly alternative capability. Preserve the established facet contract across session handoffs.

## 2. Diagnostic-first placement and skipping

### 2.1 All-topic diagnostic phase at every tier

Start with the source record, the current tier/phase, and saved evidence. Begin at Tier 1 unless qualifying saved state has already cleared it. A familiarity report may help select a relevant prompt within the current tier but cannot trigger a harder-tier start, award a pass, or replace an unassisted assessment. Do not force a long intake questionnaire before the first useful probe.

During DIAGNOSE_ALL, visit every active topic at the current tier before the repair phase. For Tier 1, start with the easiest meaningful conceptual or code-reading probe for each branch, even when the topic's eventual implementation is advanced. Keep prompts small and ask for one manageable response at a time. Limit a primary visit to one probe and, when useful, one neutral clarification or same-tier follow-up. Do not raise the tier after a correct answer and do not turn a gap into a chain of increasingly guided exercises.

Use a brief interpretation of the answer, preserve known facets, note gaps and unknowns, then rotate. Short corrective feedback is allowed; repeated explanation-and-practice belongs in REPAIR_VERIFY after the all-topic sweep. A minimal prerequisite explanation may be given only when needed to make the current-tier diagnostic meaningful; record the assistance and do not count the assisted response as independent evidence. A learner-requested explanation is a bounded exception, not an automatic tier change.

A primary diagnostic obligation is resolved by a meaningful learner attempt, an explicitly recorded inability/decline, or existing independent evidence that already covers the complete topic scope at this tier. A prompt with no answer is PENDING, not sampled. A decline resolves a visit obligation but leaves knowledge unknown; it is not a score of zero and cannot satisfy the tier's mastery gate. Embedded observations count only for their actually demonstrated facets and do not automatically substitute for a whole primary topic visit.

The sweep may span sessions; retain its queue on a new upload. Generate the actual tasks in chat. A shared attempt can provide evidence for multiple objectives, but each outcome must be separately scoped. Prior evidence and unsolicited advanced reasoning can be recorded when valid, but neither authorizes the AI to solicit harder-tier diagnostics before the gate opens.

### 2.2 Gap-only repair and independent verification at the same tier

After the current tier's all-topic diagnostic sweep, enter REPAIR_VERIFY and rotate through its unresolved objectives. Before teaching an unverified facet, consult the ledger and probe the narrow uncertainty unless qualifying independent evidence or an already-observed gap makes a repeat diagnostic unnecessary. Do not label an unasked objective deficient. Preserve demonstrated scope and collect only missing evidence.

Use **probe or reuse evidence → skip known material / repair only the observed gap → fresh independent check → rotate**. A check cannot be labelled independent when the AI has just supplied the needed step, formula, invariant, or implementation and the learner merely reproduces it. Choose a genuinely fresh task and withhold substantive help; defer the check to a later breadth visit when immediate repetition would be answer rehearsal. Same-session independent performance can establish a checkpoint, but not delayed retention.

At most one bounded repair focus and one fresh check normally fit a visit. If the check reveals another gap, record it for a later same-tier lap rather than continuing to drill one branch. Difficulty may vary within the current tier, but never demand the next tier's checkpoint as the exit condition for this one. Once a checkpoint is P, remove its instruction from the queue and preserve its proof.

Routes below are decisions for the current tier and phase. A route attached to a future-tier gap does not make that work runnable early. The tier gate in Section 3 overrides any temptation to challenge up.

| Route | When it applies | AI action |
|---|---|---|
| PROBE | Coverage is unknown or the next relevant checkpoint has no adequate evidence | Test the narrow uncertainty before teaching it |
| LEARN | The learner has not demonstrated the checkpoint's core model or execution | Teach the smallest useful slice, then use a fresh independent check |
| GAP_ONLY | Meaningful facets are verified but some remain missing or uncertain | Preserve known facets; target only the gap, then check its interaction with the whole objective |
| VERIFY_SKIP | Prior work or a strong partial diagnostic suggests the target may already be met | Suspend unnecessary lessons; collect only the missing independent coverage or corroboration; do not count a pass yet |
| SKIP_INSTRUCTION | Every required checkpoint of the objective has qualifying evidence and no unresolved material contradiction | Remove its lessons from the teaching queue; retain applicable transfer and delayed-review obligations |
| RETEST | Later valid evidence materially contradicts a previously passed requirement | Recheck only affected checkpoints/facets; preserve unaffected passes and historical evidence |
| PAUSED | An explicit scope decision temporarily defers or excludes this objective/topic | Remove it from the active queue with a reason and revisit condition; never label it mastered |

A review becoming due does not itself change `P` to `R` or force lessons. Due review is a scheduling signal; an observed material failure is an evidence change. An isolated syntax slip the learner independently repairs is not automatically a conceptual failure.

### 2.3 Partial and full skips

A **partial skip** can be at topic, objective, checkpoint, or facet level. Knowing most of a topic does not mean restarting it to repair one boundary rule. A correct implementation with an incorrect complexity argument should preserve the implementation evidence and isolate the complexity gap; it must not earn a full-scope pass that includes complexity.

An **objective instruction skip** requires all required checkpoint cells to be `P`, with explicit evidence. One rich independent attempt may establish several checkpoints, but only the requirements actually observed. Higher-level performance does not automatically pass lower-level implementation work, sibling objectives, alternative representations, or prerequisites that were not demonstrated.

A **full topic instruction skip** requires all five objectives to meet target plus at least one independent, meaningfully changed-context transfer that tests the topic's central reasoning and any earlier uncertain boundary. If one transfer omits a material branch, add only the missing transfer coverage. Full skips can be established from qualifying existing evidence or diagnostics at an opened tier; do not schedule premature higher-tier assessments to manufacture a full skip. Later tiers must not force already-verified lessons. Delayed retention remains unassessed until actually tested later.

Self-reports, reading completion, recognition of a familiar solution, AI explanations, and assisted reconstruction can guide placement but cannot justify mastery credit. When the learner explicitly prefers to bypass unverified material, record a scope/scheduling exception rather than inventing evidence.

## 3. Breadth-first scheduler

### 3.1 Tier ceiling, frontier, and rotation rules

The **active working tier** is the currently permitted difficulty ceiling, not necessarily the highest tier ever opened. It applies to every newly assigned diagnostic, lesson, practice task, review, bonus, and transfer. The **teaching frontier** is the shallowest unresolved required checkpoint within opened scope. A future-dated review, a harder saved pass, or a closed historical wave does not authorize work beyond this ceiling.

When valid evidence contradicts a required earlier checkpoint, mark only affected proof R, suspend the higher-tier position, and move the working ceiling to the earliest incomplete required tier. Its established sweep obligations stay resolved; use REPAIR_VERIFY on the reopened scope rather than restarting all-topic diagnostics. Store the interrupted tier, phase, wave/lap roster, served/remaining entries, and pending task disposition in the suspended-position record; preserve multiple snapshots if interruptions nest. After each lower gate is restored, recompute the earliest required unresolved scope and restore the most recent still-valid saved position. A due review alone is not a contradiction. A newly selected extension or restored required scope uses the same backfill rule, with new diagnostic obligations only for the genuinely added scope.

During DIAGNOSE_ALL, eligible topics are the current tier's unresolved primary sweep obligations. Follow the saved family-mixed rotation. During REPAIR_VERIFY, ordinary eligible topics have unresolved current-tier scope. Required lower-tier contradictions first trigger the restore rule above. A due same-or-lower-tier review is a bounded documented exception, not a reason to populate the ordinary repair roster with already-clear topics. Within each topic, favour unvisited objectives and narrow gaps over repeated polishing of one successful facet. Compatible objectives can share a task when their individual evidence remains clear.

Before a second ordinary primary visit to a topic in a lap, every other eligible topic must have had a visit or an explicitly recorded valid block/carryover. A neutral correction of an ambiguous prompt remains the same attempt; it does not consume a learner failure or justify extra teaching. Do not use the unfinished-attempt label to extend a visit into several new exercises. At a phase transition, close the old lap and open the next lap number with the new phase's eligible queue; do not resample successful diagnostics merely because a label changed. Lxx numbers increase across this roadmap rather than resetting at W0/W1 or a save. Keep an immutable snapshot of each current lap roster; served, remaining, and explained evidence-covered/scope-removed entries must be pairwise disjoint and cover it. A temporary block stays visible with a revisit trigger and does not remove required scope from the tier gate. If only one unresolved topic remains, give it bounded later visits without filler for clear topics.

A session can contain one substantial attempt or several short visits. Breadth is enforced across the saved lap, not by forcing all 16 topics into one session. At a new session, keep the active tier, phase, and remaining-topic queue. A session ending does not reset the tier, erase partial evidence, or promote the learner.

### 3.2 Selecting the next action

1. Read the active tier, phase, gate state, and unfinished-attempt context. Resume an unanswered prompt only if it remains available and fits the tier ceiling. When its actual contents are unavailable, mark only its unfinished scope SUPERSEDED in the attempt register, preserve any valid answered-part evidence, and issue a fresh same-tier task under a new ID; do not reconstruct missing task details. Do not supersede a task merely because this file was uploaded for an audit.
2. In DIAGNOSE_ALL, select the next unresolved primary topic. Ask one small same-tier probe, interpret the answer, record assistance and scope, and rotate after at most one useful same-tier follow-up. Queue extended repairs rather than starting them immediately.
3. Once every active topic's current-tier sweep obligation is resolved, enter REPAIR_VERIFY. Reuse qualifying evidence, probe unknown facets, repair observed gaps, and use fresh independent checks. Keep a breadth queue and do not repeat lessons for already-demonstrated scope.
4. If a task actually needs a missing prerequisite, check or repair only that facet within the tier ceiling and retain the parent objective in the queue. Do not finish an entire prerequisite topic. Record any bounded scheduling exception.
5. Update evidence, ledger, preserved facets, gaps, per-tier diagnostic states, review needs, remaining rotation, and exact next action. Evaluate the phase or tier gate explicitly before changing difficulty.

Service at most one ordinary review-led primary visit before returning to current-tier breadth work. Reviews must fit the current working ceiling, even if they concern an older harder pass. Retain an above-ceiling due review as deferred-by-gate without moving its original due date or inventing a failure. A material lower-tier contradiction lowers both the diagnostic and teaching ceiling immediately under Section 3.1; merely blocking the next promotion while continuing harder current-tier tasks is not sufficient.

### 3.3 Phase exits and strict tier gates

**Diagnostic-phase exit:** All active topics have either a completed current-tier diagnostic visit, an explicitly recorded inability/decline, or existing independent evidence covering the topic's entire current-tier scope. A pending unanswered prompt does not qualify. This exit opens REPAIR_VERIFY at the same tier, not the next tier. W0 may be marked CLEARED for completing this sweep while Tier 1 remains in progress.

**Tier gate:** The active tier is CLEARED only after its diagnostic obligations are resolved and every required checkpoint at that tier is P, with required earlier checkpoints still valid. Unknown cells, partial facets, hints, guided corrections, and scheduled repairs cannot substitute for independent full-scope proof. For Tier 4, all required topic-transfer and integration coverage must also pass. These requirements do not add new objectives or increase target depths. Evaluate only required scope through the tier being cleared: a deeper-only gap, a policy decision, or a not-yet-due review is not a current-tier failure. Explicitly paused or carried required checkpoints remain in its denominator; only an authorized scope exclusion changes required coverage. Before declaring a pass, reconcile every relevant open gap with its exact resolving proof or retain the corresponding checkpoint as unresolved.

| Next activity | Required gate |
|---|---|
| Tier 1 REPAIR_VERIFY / W1 | Tier 1 all-topic diagnostic phase complete; unresolved facets remain visible |
| Tier 2 DIAGNOSE_ALL / W2 | Tier 1 CLEARED: all active D1 checkpoints P |
| Tier 3 DIAGNOSE_ALL / W3 | Tier 2 CLEARED: all active D2 checkpoints P and required lower-tier proof valid |
| Tier 4 DIAGNOSE_ALL / W4 | Tier 3 CLEARED: all required D3 checkpoints P and required lower-tier proof valid |
| Curriculum/readiness reporting | Requirements in Section 5.4; sampling or merely opening Tier 4 is not completion |

A blocked or carried item remains in the gate denominator. The AI must not automatically advance another branch one depth ahead, start an advanced diagnostic to relieve repetition, or mark a tier ADVANCED_WITH_CARRYOVER without explicit learner permission. This deliberately replaces the earlier one-depth lead allowance. Already-verified current-tier scope can be skipped without retesting; a tier fully supported by qualifying prior evidence can be cleared without ceremonial new assessments.

**Avoiding deadlock without silently bypassing the tier:** While one current-tier facet is blocked, work on other unresolved current-tier branches. When no other useful same-tier work remains, inspect the smallest real blocker, change the explanation or representation, or use a fresh appropriately simpler same-tier probe. After two unproductive repair visits, change the approach rather than repeating the same kind of task. Only the learner can authorize advancing with an unresolved required checkpoint; record such an exception as OVERRIDE_ACTIVE, not CLEARED.

Every formal carryover needs the objective/checkpoint, gap or dependency, preserved facets, minimum next action, and a revisit trigger no later than the next study session. Review it through an actual attempt or dependency check; silently moving its due date is not a revisit. Formal carryovers never unlock a harder tier by themselves. Ordinary gaps queued until the current tier's repair phase are not formal carryovers and do not require derailing the diagnostic sweep.

**Tier 4 has non-checkpoint work.** Its DIAGNOSE_ALL roster covers all 16 topic-transfer obligations, including T16.5's D4 adaptation scope where relevant. Its repair roster must include unresolved T16.5 D4, topic transfers, and I01–I06, even when every ordinary objective checkpoint is P. Keep integration items as explicit coverage items in the current queue rather than expecting a checkpoint-only selector to discover them. Rotate across unresolved topic and integration obligations before repeating one; a single independent attempt may satisfy several explicit claims without duplicate work. Once all Tier 4 requirements pass, record COMPLETE / maintenance review rather than constructing an empty new tier. No universal D4 objective requirement or mandatory extra mock count is introduced.

### 3.4 Scheduling exceptions

Allowed scheduling reasons are `PREREQUISITE_REPAIR`, `DUE_REVIEW`, `CARRYOVER`, `UNFINISHED_ATTEMPT`, or `LEARNER_OVERRIDE`. Record the affected objectives, reason, maximum scope/depth, and return condition in Section 0.9. Policy and file-workflow decisions may also be recorded there but are not assessment evidence.

A prerequisite repair, carryover, or unfinished attempt may change the order of a bounded visit; it does not raise the current-tier ceiling. A due review stays at or below the current working ceiling; retain any harder review as deferred-by-gate until the lower requirements are restored. Only an explicit LEARNER_OVERRIDE can authorize newly assigned diagnostics or teaching beyond an uncleared gate. Self-reported fluency, a strong answer, time pressure inferred by the AI, and a new session are not overrides. Retain all gaps, denominators, and required completion standards under an override.

## 4. Minimum prerequisites, not whole-topic locks

Tier 1 conceptual previews and W0 diagnostics have no whole-topic prerequisite mastery gate. Higher-tier work must first respect the shared tier gate; within an opened tier, verify only the language operations and objective facets the current work actually uses. The table below lists common dependencies to inspect, not mandatory course ordering. Existing evidence or a small direct probe may satisfy them.

| Target work | Minimal supporting skills to check | Avoid imposing this unnecessary lock |
|---|---|---|
| Basic Python execution in any topic | T01.1 representation and T01.4 boundary-safe control flow, at the needed scope | All of T01 at D3 before visiting any other topic |
| T02–T05 scans, hashing, pointers, windows | T02.1 traversal; T03.1/T03.2 only for hash-based state; T04.2 only when moving-boundary reasoning is used | Full mastery of arrays, hashing, and two pointers before a conceptual window preview |
| T06 monotonic structures | T06.1 operation semantics; T06.2 unresolved-state reasoning; boundary/eviction facets relevant to T06.5 | Full monotonic-stack mastery before using an ordinary queue |
| T07 linked structures | T01.1/T01.4 identity, mutation, and safe reference updates; T07.1 traversal; pointer reasoning as needed | Completing all of T04 and T06 first |
| T08 ordering and search | T02.1 indexing; T01.3 invariant/termination; a justified predicate for T08.3 | Finishing every sorting, interval, and sweep objective before basic binary search |
| T09 recursion/backtracking | T01.3 contracts; T09.1 base/progress; T09.2/T09.3 mutation ownership when used | Completing all linear-data patterns first |
| T10 tree traversal | T09.1/T09.2 for recursive traversal OR T06.1/T06.2 for an explicit stack OR T06.1/T06.3 for BFS | All backtracking or all tree objectives before one traversal |
| T11 heaps | T01.1 representation/comparison semantics; T11.2 heap entry operations; T08.1 only when comparing with sorting | Full binary search, intervals, or hashing before heap basics |
| T12 graphs | T12.1 model; T03.1/T03.2 for visited maps when used; the relevant stack/queue/recursion facets; T11.2 only for heap-based paths | Complete tree mastery before graph models or unweighted traversal |
| T13 DP | T13.1 state; T13.2/T13.3 dependencies; T09.1 for memoized recursion only; T02.1 for iterative state tables | Backtracking mastery before bottom-up DP |
| T14 greedy | T01.3 correctness; T08.1 ordering when used; T11 facets for heap variants; T13 only for a DP comparison | Full heap and DP mastery before greedy intuition or proof |
| T15 numeric/range work | Relevant T01 representation and T02 indexing; T03.4 or T15.3 prefix state for range comparisons | Advanced range data structures before arithmetic or prefix reasoning |
| T16 execution and selection | Only the algorithmic facets exercised by the current conversation | Finishing T01–T15 before practicing clarification, testing, or explanation |

Instantiate an actual block as an objective/checkpoint plus a named facet and reason in Section 0.6. Assess the facet directly where practical. A blocked implementation does not block a conceptual preview, and a gap in one prerequisite does not erase unrelated passed skills. If a dependency chain appears cyclic, check whether an OR route, conceptual slice, or nonessential dependency removes it before adding any teaching detour.

## 5. Evidence, scoring, and completion

### 5.1 Valid assessment evidence

Allowed modes: `DIAGNOSTIC`, `INDEPENDENT`, `TRANSFER`, `REVIEW`, `GUIDED`, `TEACHING`, and `REPORTED_EXPOSURE`. The first four can establish passes if the observed work is independent and full-scope. The latter three cannot.

Assistance values: `NONE`, `NEUTRAL_CLARIFICATION`, `HINT`, `GUIDED`, or `SOLUTION`. A neutral clarification resolves the problem contract without revealing the technique, invariant, transition, or repair. Only `NONE` and genuinely neutral clarification can support an independent pass. Assistance must be attributed separately when different objectives in the same attempt receive different help. Once substantive help is supplied for a task/facet, a later neutral message does not restore that task's independence. A fresh exit check gets its own attempt ID and no supplied key step. Disclosed use of solution-producing tools counts as assistance for the affected reasoning; do not infer undisclosed tool use from writing style. Permission to execute tests does not establish learner authorship of AI-written code.

| Score | Meaning at the named checkpoint and scope |
|---|---|
| 0 | A meaningful attempt demonstrates a material missing model or invalid approach |
| 1 | Partial understanding, incomplete scope, or successful work dependent on substantive help |
| 2 | Independently demonstrated the complete assessed checkpoint scope with sound reasoning and appropriate execution |
| NA | No assessable attempt, invalid/ambiguous task, reported exposure, or teaching only |

A partial facet may receive score 2 for that facet without passing the whole checkpoint. The evidence scope must say so; its ledger cell remains `G` or `U` as appropriate until full checkpoint requirements are covered. Several complementary independent evidence rows can establish complete checkpoint coverage. Do not average scores to hide a missing required facet.

For implementation objectives, inspect correctness, relevant boundaries, representation, and complexity as required by that checkpoint. Code reading alone cannot verify a requirement to independently write code. Sound language-agnostic reasoning can verify the reasoning facet without proving Python implementation; record the remaining Python-specific gap separately. For selection, do not reveal the topic/technique or suggest the key pattern before the attempt. Explain assessment expectations without leaking the answer, then disclose the assessed objective IDs after the response. Labelled practice is permitted at lower depths but is not unlabelled selection evidence. The saved rotation is an administrative plan, not a technique hint to print before a selection probe. If a topic announcement or hint supplies the intended approach, preserve any independently demonstrated application facets but do not award the unprompted-selection facet from that attempt; obtain it later in a genuinely unlabelled task.

Record whether code was actually executed, reviewed without execution, or described only. Code review can be evidence, but never claim tests passed unless they were run. Do not treat unseen execution as failure. Validate the AI's own prompt, expected answer, and critique before downgrading the learner; correct flawed assessments explicitly. Do not infer timed-interview performance from chat timestamps or self-paced work. Record measured versus learner-reported timing when timing matters.

### 5.2 Checkpoint state and derived outcomes

`U → G` follows an observed gap; `U/G/R → P` requires sufficient independent evidence. `P → R` requires a material contradiction or a documented change in the assessed contract that invalidates that proof. Do not downgrade a proven checkpoint merely because a harder optional variant failed. Teaching or reading alone never produces `P`. Preserve the original evidence when adding a retest record.

An objective meets its target only when **every required checkpoint through its target depth is P** and no relevant material contradiction remains unresolved. For a later failure, reopen only the affected checkpoint/facets; a lower checkpoint becomes `R` too only if the new evidence actually contradicts it. Above-target challenge evidence is optional and must not silently expand the completion target. Newly assigned challenges still respect the tier ceiling; qualifying earlier or unsolicited evidence can be retained without opening a later tier.

Topic placement is derived conservatively: `U` for unknown; `FOUNDATION_GAPS` when D1/D2 gaps dominate the remaining work; `MIXED` for uneven verified checkpoints; `VERIFYING_SKIP` for promising but incomplete target coverage; `TARGET_MET` when all objectives meet target; `SKIP_ALL_INSTRUCTION` only when the target and topic transfer requirements are both met. The detailed ledger, not this summary label, chooses instruction.

Do not equate these outcomes: a topic sampled, a lesson skipped, a checkpoint verified, a topic transfer passed, delayed retention verified, or interview readiness demonstrated. Report them separately. No model-generated probability of mastery substitutes for evidence.

### 5.3 Delayed review without reteaching everything

Schedule a light independent changed-context review after an objective first meets target or receives diagnostic instruction-skip status. Default due dates are 3 days after the first target pass, then 7 and 21 days after successive successful delayed reviews; adjust by evidence and learner constraints. These are scheduling defaults, not an asserted optimal spacing formula. Combine compatible due objectives in one fresh task where their individual outcomes remain assessable.

Dates are interpreted in the saved timezone and checked only during an active session; this file does not create reminders or background jobs. Overdue items remain visible. Record actual elapsed days between the earlier independent performance and the review. A different calendar date alone is insufficient: a cross-midnight continuation or immediate repeat is not delayed retention. By default, a qualifying delayed check is at least one day later and outside the same continuous practice sequence; scheduled 3/7/21-day reviews remain the ordinary policy. When elapsed time is unknown, record the review but do not claim delayed retention. Extend intervals only after successful independent review; after a material failure, isolate the gap and use a closer review after repair. During a long Tier 1 or Tier 2 phase, schedule a light lower-depth review after the first full checkpoint pass using the same default first interval, without waiting for the objective's terminal target. Store the exact objective/depth, last independent evidence/date, due date, and review stage in the gap/review records; the ledger's Review due is only the earliest unresolved review date for that objective. Combine overlapping review obligations instead of duplicating them. A review deferred by a lower gate retains its due date; it does not erase the pass.

### 5.4 Overall readiness

For the current active scope, report `CURRICULUM_TARGETS_MET` only after all objective targets and all active topic transfer gates pass with no unresolved material gaps. Report `INTERVIEW_PRACTICE_VERIFIED` separately after required I01–I06 coverage has qualifying mixed evidence, including genuinely observed interview-style execution at the selected target level. Report retention coverage separately; a first successful diagnostic is not durable mastery.

An excluded or deferred topic is not completed. Always show the active-scope result alongside total core scope so narrowing the denominator cannot create a misleading claim of full 80-objective completion. Until target level and interview conditions are confirmed, qualify readiness rather than inventing those conditions.

## 6. Core topics and stable objective definitions

The tables below specify learning outcomes, not a teaching order or exercise catalogue. Preserve these IDs and capability meanings on routine saves. All objectives target D3 except T15.4 (D2) and T16.5 (D4). Alternatives joined by "or" describe valid choices, not a silent requirement to implement every listed variant; assess the stated capability and its selection boundaries without inventing extra scope. W1/W2 address shallower slices of these same outcomes; W4 adds topic transfer rather than 80 mandatory new objectives.

### T01 — Python implementation, complexity, correctness, and testing

**Family:** F01. **Technique cues:** unspecified input size, a demand for complexity, mutable state, or a routine that looks correct but fails at a boundary.

**Common failure modes:** confusing names with copies; accidental shared mutable state; mutation during iteration; hidden quadratic operations; using recursion without considering call depth; asserting complexity without accounting for sorting, slicing, string construction, or hash-table operations.

| Objective | Target capability | Required depth |
|---|---|---|
| T01.1 | Choose a Python representation whose operations support the required access, update, ordering, and memory properties. | D3 |
| T01.2 | Derive time and auxiliary-space complexity from loops, calls, data-structure operations, and input-dependent work. | D3 |
| T01.3 | State and use an invariant, contract, or variant that supports a correctness argument. | D3 |
| T01.4 | Write clear, interview-appropriate Python with explicit boundary handling and no reliance on incidental language behaviour. | D3 |
| T01.5 | Design targeted tests covering empty, singleton, duplicate, extreme, invalid-if-relevant, and transition cases. | D3 |

### T02 — Arrays, strings, matrices, and direct scans

**Family:** F02. **Technique cues:** contiguous indexed data, local neighbor relationships, in-place updates, fixed dimensions, or a one/few-pass requirement.

**Common failure modes:** off-by-one bounds; revisiting work unnecessarily; assuming a string is mutable; aliasing matrix rows; wrong traversal direction for in-place updates; losing the original value before it is needed.

| Objective | Target capability | Required depth |
|---|---|---|
| T02.1 | Traverse one-dimensional data while maintaining the minimal required state. | D3 |
| T02.2 | Use direction, prefix/suffix state, or in-place transformation when it prevents redundant work. | D3 |
| T02.3 | Handle strings deliberately, including construction cost, normalization assumptions, and character/index distinctions. | D3 |
| T02.4 | Traverse and transform matrices with correct dimensions, neighbors, and boundary guards. | D3 |
| T02.5 | Explain when a direct scan is sufficient and when another pattern is justified by constraints. | D3 |

### T03 — Hashing, counting, and prefix-state techniques

**Family:** F02. **Technique cues:** duplicates, membership, pairing, frequencies, groups, history-dependent counts, or subarray conditions reducible to repeated state.

**Common failure modes:** updating counts in the wrong order; treating keys as ordered; using unhashable keys; failing to seed a base prefix state; deleting/retaining zero counts incorrectly; relying on average lookup without acknowledging the model.

| Objective | Target capability | Required depth |
|---|---|---|
| T03.1 | Select dictionaries, sets, `defaultdict`, `Counter`, or explicit maps based on the needed semantics. | D3 |
| T03.2 | Maintain frequency and membership state correctly across updates and removals. | D3 |
| T03.3 | Use complement or previously-seen state to replace a nested search when valid. | D3 |
| T03.4 | Model prefix sums or other prefix state so repeated states encode the desired relation. | D3 |
| T03.5 | Defend key construction, initialization, and complexity for a hash-based solution. | D3 |

### T04 — Two pointers and partitioning

**Family:** F02. **Technique cues:** ordered data, pair/triplet-style relationships, in-place partitioning, opposite-end decisions, or a requirement to avoid extra memory.

**Common failure modes:** moving the wrong pointer; missing equal-value handling; violating the partition invariant; double-counting; using two pointers without the monotonic/order property that makes it sound.

| Objective | Target capability | Required depth |
|---|---|---|
| T04.1 | Identify when ordering or a monotonic relation makes two pointers complete rather than heuristic. | D3 |
| T04.2 | Maintain left/right pointer invariants and justify each pointer movement. | D3 |
| T04.3 | Implement duplicate-safe pairing or multi-element selection without double-counting. | D3 |
| T04.4 | Partition or compact data in place while preserving the required region properties. | D3 |
| T04.5 | Distinguish two-pointer reasoning from sliding-window reasoning and choose appropriately. | D3 |

### T05 — Sliding windows and monotonic boundaries

**Family:** F02. **Technique cues:** contiguous ranges with a validity condition, longest/shortest qualifying segment, at-most/at-least constraints, or counts that can be updated incrementally.

**Common failure modes:** shrinking only once when repeated shrinking is needed; updating the answer at the wrong phase; losing a zero/nonzero transition; treating a non-monotonic condition as a window; failing to state why total pointer movement is linear.

| Objective | Target capability | Required depth |
|---|---|---|
| T05.1 | Define window state, validity, and the point at which an answer is eligible to update. | D3 |
| T05.2 | Implement fixed-size windows with correct enter/leave updates. | D3 |
| T05.3 | Implement variable-size windows when validity permits monotonic boundary movement. | D3 |
| T05.4 | Use frequency or aggregate state to express multiplicity-based window conditions. | D3 |
| T05.5 | Prove linear total boundary movement and identify conditions that invalidate the pattern. | D3 |

### T06 — Stacks, queues, and monotonic structures

**Family:** F03. **Technique cues:** nesting, deferred resolution, nearest greater/smaller relation, processing order, breadth-wise work, or maintaining candidates that become obsolete.

**Common failure modes:** using a list front operation with linear cost; confusing values with indices; failing to flush deferred items; popping the wrong equality case; forgetting that monotonic stacks encode unresolved candidates.

| Objective | Target capability | Required depth |
|---|---|---|
| T06.1 | Choose `list`, `collections.deque`, or another structure based on LIFO/FIFO operation costs. | D3 |
| T06.2 | Use a stack to validate, reduce, or resolve nested/deferred state with a clear invariant. | D3 |
| T06.3 | Use a queue to drive breadth-wise processing and track levels or distances deliberately. | D3 |
| T06.4 | Build a monotonic stack for next/previous relation or range-contribution reasoning. | D3 |
| T06.5 | Build a monotonic deque for a moving optimum and justify eviction rules. | D3 |

### T07 — Linked lists and pointer/reference manipulation

**Family:** F03. **Technique cues:** node-shaped input, rewiring, cycle/reference relation, fixed-distance positions, or destructive in-place transformation.

**Common failure modes:** losing the next reference; returning the wrong head; mishandling dummy nodes; incorrect slow/fast initialization; cycle logic that works only for one length; confusing node identity with value equality.

| Objective | Target capability | Required depth |
|---|---|---|
| T07.1 | Traverse linked structures safely and state the current/previous/next ownership invariant. | D3 |
| T07.2 | Reverse, splice, or partition links while preserving access to unprocessed nodes. | D3 |
| T07.3 | Use dummy/sentinel nodes to simplify head and deletion edge cases. | D3 |
| T07.4 | Apply slow/fast pointers to a valid structural relation and explain initialization choices. | D3 |
| T07.5 | Detect and reason about cycles, intersections, or distance relationships without unsafe assumptions. | D3 |

### T08 — Sorting, binary search, intervals, and sweep reasoning

**Family:** F04. **Technique cues:** ordering reveals structure, a monotonic yes/no predicate, overlaps, event boundaries, or an answer space that can be searched.

**Common failure modes:** binary search without a monotonic predicate; non-progressing bounds; mixing closed and half-open intervals; sorting without preserving needed identities; wrong tie-breaker; conflating searching data with searching an answer value.

| Objective | Target capability | Required depth |
|---|---|---|
| T08.1 | Decide when sorting exposes enough structure to simplify a problem and account for its cost. | D3 |
| T08.2 | Write boundary-safe binary search using a stated invariant and termination condition. | D3 |
| T08.3 | Search an answer space only when feasibility is monotonic and the check is correct. | D3 |
| T08.4 | Normalize interval endpoint semantics and merge, compare, or schedule intervals correctly. | D3 |
| T08.5 | Use sorted events or sweep state to count or optimize over changing activity. | D3 |

### T09 — Recursion, backtracking, and state-space search

**Family:** F05. **Technique cues:** a definition naturally contains smaller instances, all valid constructions are needed, choices branch, or constraints can prune partial states.

**Common failure modes:** missing base cases; mutable path aliasing; failing to undo state; duplicate generation; exponential exploration without pruning; recursion depth ignored where it materially matters.

| Objective | Target capability | Required depth |
|---|---|---|
| T09.1 | State a recursive contract, base cases, and progress measure before implementation. | D3 |
| T09.2 | Choose between return-value recursion and shared-state recursion deliberately. | D3 |
| T09.3 | Implement backtracking with correct choose/explore/unchoose state restoration. | D3 |
| T09.4 | Prune impossible or dominated partial states without excluding valid solutions. | D3 |
| T09.5 | Control duplicate generation, output ownership, and complexity of the search tree. | D3 |

### T10 — Trees and binary search trees

**Family:** F05. **Technique cues:** hierarchical input, subtree aggregation, ancestor/descendant relation, level structure, ordered BST invariant, or path constraints.

**Common failure modes:** returning the wrong sentinel for an empty subtree; global state leakage; comparing values when identity matters; invalid BST bounds; redoing subtree work; recursion order inconsistent with the intended output.

| Objective | Target capability | Required depth |
|---|---|---|
| T10.1 | Select DFS or BFS based on the needed output, state, memory, and early-exit properties. | D3 |
| T10.2 | Write recursive or iterative traversals with explicit node-state contracts. | D3 |
| T10.3 | Aggregate subtree information to solve height, balance, path, or ancestor-style conditions efficiently. | D3 |
| T10.4 | Apply BST ordering with proper bounds and use ordered traversal/search when justified. | D3 |
| T10.5 | Handle null children, skewed shape, duplicate policy, and identity-versus-value distinctions. | D3 |

### T11 — Heaps, priority queues, and streaming order

**Family:** F04. **Technique cues:** repeatedly need the current best candidate, maintain a bounded extreme set, merge ordered sources, schedule by priority, or process a stream with changing rank.

**Common failure modes:** assuming a heap API is available without checking the selected Python environment; wrong tuple tie-breakers; stale heap entries; using a heap when sorting once is simpler; not bounding heap size; confusing heap order with fully sorted order.

| Objective | Target capability | Required depth |
|---|---|---|
| T11.1 | Choose a heap over sorting or selection only when incremental priority operations justify it. | D3 |
| T11.2 | Use `heapq` correctly, including tuple ordering and a safe max-priority adaptation when needed. | D3 |
| T11.3 | Maintain a bounded heap for a top/bottom subset with correct size and replacement rules. | D3 |
| T11.4 | Merge or schedule ordered work using heap entries that retain source/state identity. | D3 |
| T11.5 | Explain stale-entry/lazy-deletion patterns and their complexity when direct deletion is unavailable. | D3 |

### T12 — Graph modelling and traversal

**Family:** F05. **Technique cues:** entities and relationships, reachability, dependency, components, routes, transformations, or states connected by valid moves.

**Common failure modes:** wrong graph model; marking visited too late; losing parent/distance state; treating directed edges as undirected; using DFS for shortest unweighted distance; ignoring disconnected components; mutation of an adjacency collection during traversal.

| Objective | Target capability | Required depth |
|---|---|---|
| T12.1 | Translate the input into an appropriate adjacency, implicit-neighbor, edge-list, or state graph model. | D3 |
| T12.2 | Traverse with DFS/BFS using visited state and termination conditions that match the problem. | D3 |
| T12.3 | Use multi-source BFS or layer distance when all unit-cost sources/edges justify it. | D3 |
| T12.4 | Detect dependency order or cycles with indegree/DFS-state reasoning and state the directed invariant. | D3 |
| T12.5 | Choose and implement a shortest-path or union/merge approach only under its required edge/structure assumptions. | D3 |

### T13 — Dynamic programming

**Family:** F06. **Technique cues:** overlapping subproblems, a choice with reusable optimal consequences, counting/optimization over prefixes or states, or recursion that repeats equivalent work.

**Common failure modes:** an undefined state; wrong initialization; mixing states from the same update round; premature optimization to one dimension; recurrence lacks coverage/disjointness; memo key omits relevant state; confusing a greedy-looking local choice with proof.

| Objective | Target capability | Required depth |
|---|---|---|
| T13.1 | Define a DP state whose value has a precise, complete meaning. | D3 |
| T13.2 | Derive transitions from exhaustive, non-overlapping last-choice or next-choice cases. | D3 |
| T13.3 | Set base cases, iteration order, and sentinel values consistent with dependencies. | D3 |
| T13.4 | Choose memoization or tabulation and justify memory optimization only after correctness is clear. | D3 |
| T13.5 | Reconstruct a choice, count, optimize, or validate feasibility while explaining time/space dimensions. | D3 |

### T14 — Greedy algorithms and proof boundaries

**Family:** F06. **Technique cues:** ordered choices, interval scheduling, resource assignment, local exchange intuition, or a priority rule that may preserve global optimality.

**Common failure modes:** choosing the most attractive local value without proof; missing tie rules; applying greedy to a problem that needs DP; failing to define a feasible partial solution; relying on tests rather than an exchange/stays-ahead argument.

| Objective | Target capability | Required depth |
|---|---|---|
| T14.1 | Identify a candidate greedy choice and the invariant it must preserve. | D3 |
| T14.2 | Provide an exchange, stays-ahead, cut, or reduction argument appropriate to the algorithm. | D3 |
| T14.3 | Implement ordering and tie-break rules that match the proof. | D3 |
| T14.4 | Distinguish greedy feasibility from greedy optimality and detect counterexample risk. | D3 |
| T14.5 | Compare a greedy approach against DP, heap, or sweep alternatives under changed constraints. | D3 |

### T15 — Bits, arithmetic, ranges, and specialized techniques

**Family:** F06. **Technique cues:** binary representation, parity/masks, compact state, cyclic indices, overflow-like bounds in other languages, numeric monotonicity, or range update/query structure.

**Common failure modes:** precedence mistakes; negative-number assumptions; failing to mask when a fixed-width model is required; inappropriate float comparisons; inclusive/exclusive range confusion; adding a specialized structure before a simpler scan/prefix method is sufficient.

| Objective | Target capability | Required depth |
|---|---|---|
| T15.1 | Use bit operations and masks with explicit representation and precedence reasoning. | D3 |
| T15.2 | Apply arithmetic identities, modular/cyclic indexing, and integer bounds without hidden assumptions. | D3 |
| T15.3 | Use prefix/difference techniques for static or batched range work when applicable. | D3 |
| T15.4 | Recognize when a range query/update data structure is warranted and state its operation contract. | D2 |
| T15.5 | Explain Python-specific numeric behaviour where it changes implementation or complexity decisions. | D3 |

### T16 — Interview execution, review, and mixed technique selection

**Family:** F01. **Technique cues:** any unlabelled prompt, a request to explain while coding, a follow-up, review feedback, or a change in requirements.

**Common failure modes:** coding before clarifying requirements; naming a pattern without verifying assumptions; silent complexity changes; no dry run; treating the first working solution as final; overexplaining implementation while omitting invariant/edge cases; failing to recover after a bug.

| Objective | Target capability | Required depth |
|---|---|---|
| T16.1 | Clarify input, output, mutation, ordering, error, and constraint assumptions proportionately. | D3 |
| T16.2 | Compare viable approaches, select one, and communicate the key invariant before coding. | D3 |
| T16.3 | Produce readable code in stages, narrating meaningful decisions without masking uncertainty. | D3 |
| T16.4 | Dry-run targeted cases, diagnose defects, and revise without discarding sound reasoning. | D3 |
| T16.5 | Handle follow-ups by identifying which assumption changed and adapting or rejecting the original technique accordingly. | D4 |

## 7. Python toolkit and implementation conventions

Use standard-library tools when they improve clarity without hiding the core skill being assessed. Match semantics and API availability to the learner's selected Python environment. Do not assume a platform version from the date of the session.

| Tool / feature | Scope to assess | Implementation cautions |
|---|---|---|
| list | Indexed storage, end append/pop, stack, mutation and copying | Account for front operations, slicing, and aliasing |
| str | Immutable text, construction, normalization assumptions | Account for copying and repeated construction |
| dict / set | Membership, mapping, counting, grouping, key design | Distinguish hashability and insertion order from sorted order; state the complexity model |
| collections.defaultdict / Counter | Accumulation and frequency state | Understand default creation and zero-count semantics |
| collections.deque | FIFO and operations at both ends | Choose ends deliberately and justify operation costs |
| heapq | Priority operations, bounded heaps, tuple entries, stale entries | Check available APIs; select an environment-compatible min/max-priority approach and valid tie-breakers |
| bisect | Boundaries in sorted sequences | Distinguish search cost from insertion cost |
| functools caching | Memoization with complete state | Include all relevant inputs in the key; inspect mutation and call depth |
| itertools | Controlled iteration and combinatorial helpers | Explain output size, laziness, and work performed |
| math / integers | Integer-safe arithmetic and numeric assumptions | Include representation size and precision where they materially affect the solution |

During code review, check mutation/ownership; distinctions between None, empty, and falsy values; iteration while mutating; shared defaults; overwritten references; recursion depth; comparison/tie rules; hidden copying/sorting/string work; and whether the stated model matches the actual implementation. Assess only the relevant facets; do not recite this checklist before every attempt.

## 8. Integration coverage, not fixed interview questions

Small mixed comparisons are allowed within the opened tier when their participating checkpoints permit them; do not reserve every conceptual comparison for W4. Do not use mixing to introduce a harder diagnostic tier early. Early discussion may build understanding without meeting the final integration gate. Final passes require independent technique selection and the scope in this table. No specific scenario, named exercise, fixed test fixture, or expected solution belongs in the source.

| Area | Combination to demonstrate | Curriculum coverage | Final evidence contract |
|---|---|---|---|
| I01 | Contiguous-data selection | T01–T05, T16 | Choose and reject scan, hashing, pointers, or windows from structural constraints; defend state, boundaries, and cost |
| I02 | Linear structures and ordering | T01–T02, T04, T06–T08, T16 | Select relevant stack/queue/list/sort/search/interval reasoning and preserve structural invariants |
| I03 | Recursive and hierarchical state | T01, T06, T09–T10, T16 | Define recursive or explicit state, control mutation, and handle nontrivial shape and base cases |
| I04 | Graph and priority reasoning | T01–T03, T06, T08, T11–T12, T16 | Model relationships and choose traversal, dependency, or priority strategy under justified assumptions |
| I05 | Optimization choice | T01–T02, T08–T09, T11, T13–T14, T16 | Distinguish DP, greedy, search, heap, or sweep approaches and defend correctness boundaries |
| I06 | Interview execution | T01–T16 as applicable across a portfolio | Clarify, compare, code, test, debug, and handle follow-ups in observed interview-style attempts; cover active branches across attempts, not all in one |
| I07 | Specialized transfer; optional | T01–T03, T08, T12–T15, T16 | Adapt a core technique when representation, numeric, or range constraints materially change |

Track the components actually observed across attempts. No single mixed success automatically passes all participating topics or all five objectives within them. Selection uncertainty must be genuine, not a technique label hidden only in the saved summary.

## 9. Session execution, saving, and validation

### 9.1 Ordinary session loop

Open with the saved tier, phase, and position in one sentence. Follow the current phase rather than restarting the curriculum or asking for an already-supplied preference. Keep the learner-facing exchange focused on one manageable response, without naming a selection-assessment technique in advance.

During **DIAGNOSE_ALL**, use **small same-tier probe → interpret and record → at most one useful same-tier clarification/follow-up → rotate**. Give brief feedback and queue extended repairs. After the all-topic sweep, switch to **REPAIR_VERIFY**: **probe unknown scope or reuse evidence → skip demonstrated material / repair the narrow gap → fresh independent check → rotate**. Repeat breadth laps at that tier until its gate is satisfied, then start the next harder tier's all-topic diagnostics.

Ask for or give assistance only as needed and record what was actually supplied. Do not count immediate reproduction of an explanation as an independent pass. An independent check can occur on a later visit when that better protects breadth or avoids rehearsal. Reuse valid evidence rather than manufacturing more attempts for a quota. A learner-requested explanation is allowed but does not erase prior evidence or automatically change tiers.

When a diagnostic phase is satisfied entirely by qualifying prior evidence, record the justified skip and evaluate the same gate rather than forcing a new lap. At a save or session end, summarize what was independently verified, which correct facets were preserved without a full pass, what remains guided or uncertain, and the exact tier/phase/topic at which to resume. A requested mid-session download saves progress without declaring the session complete. The next new session uses the next session ID while retaining the same tier/lap queue and partial evidence.

### 9.2 Complete replacement-file protocol

At an explicit save, requested download, or clear session end, the AI must:

1. Load the full source explicitly supplied for this task with this document_id and use that actual revision as the parent. Browser suffixes such as (1) do not change document identity. When several candidates exist, select a uniquely supported latest descendant; equal revision numbers with different bytes or competing branches require an explicit conflict record, not an optimistic merge. Preserve alternate copies; do not overwrite them as if they were identical. Do not reconstruct missing sections from search fragments and present them as a lossless routine save.
2. Commit only observed session evidence, scope/route decisions, and preference changes. Allocate new IDs without reusing existing ones. Update an existing attempt outcome when completing that same attempt; do not duplicate an independent pass for a repeat export.
3. Update checkpoint proofs, preserved facets, open gaps, reviews, topic summaries, integration coverage, active tier/phase and gate board, per-tier diagnostic coverage, wave/lap state, remaining rotation, unfinished work, and the exact next action. Keep curriculum definitions and rules unchanged during a routine progress save; separately document any explicitly requested policy revision.
4. For a distinct saved change, set previous_revision to the loaded revision, increment revision exactly once, set updated_on, and append one concise revision row. Set parent_file_sha256 to SHA-256 of the actual complete loaded parent bytes before editing. It fingerprints that parent, not the output itself. Preserve IDs of superseded/unanswered tasks in the attempt register and allocate new suffixes above every reserved ID, not only IDs appearing in scored evidence. Record the study session once. An identical re-download retains the same revision and evidence IDs; an additional real change in the same session may produce a new revision without a new session ID.
5. Validate the complete file, then return it as `python_coding_interview_roadmap.md`, not a diff, a progress-only extract, or a template the learner must complete. Reopen or stat the actual file before providing the download link. If file creation fails, say so and provide the complete text when feasible; do not offer a nonexistent download.
6. State the generated revision and tell the learner to keep the latest file locally and upload it at the next session, replacing the older working copy as appropriate. If they also use a Project Source, its replacement is a separate manual action. Do not claim that producing a local file updated a Project Source. Never rely on a promised later save.

A deliberate curriculum redesign or extension is a separate schema/scope change: increment the relevant version, document any ID mapping, preserve evidence and unresolved gaps, and never renumber existing objectives to fit a new route. Revision 3's requested tier-policy redesign is such a change; ordinary study sessions and progress exports are not.

**Session disposition.** A request to inspect, fix, save, download, or re-upload the roadmap is administrative unless actual study also occurs. Continue a still-active session in the same study conversation. When study starts in a genuinely new session, allocate the next unused S ID; preserve a previously open session as INTERRUPTED_AT_LAST_SAVE unless it was explicitly closed, without inventing a finish time or new outcome. Previously recorded answered-part claims keep their original attempt identity; a newly answered continuation or fresh replacement is recorded under its actual attempt and session, without backdating. For a task carried into a new session, retain the original issuing attempt as the source and use a new-session continuation attempt linked to it; preserve all earlier part-evidence. Update the live handoff fields rather than hardcoding a topic or S number into immutable curriculum rules.

**Digest definition and routine-save boundary.** curriculum_sha256 is SHA-256 of the exact UTF-8 bytes after the LF newline terminating the standalone BEGIN CURRICULUM marker and before the standalone END CURRICULUM marker, including intervening whitespace. Verify it on load. The parent fingerprint is verified for each new output against the complete parent actually loaded for that edit. If an older parent is not supplied on a later upload, its historical fingerprint remains provenance with unverified ancestry; that absence alone does not erase valid saved evidence or force a curriculum restart. Routine progress saves preserve those bytes and the operating contract; an authorized policy bug fix may edit them with a version/revision note and a recomputed digest. A mismatch must be investigated and disclosed, never silently normalized into a supposed successful check. Write the complete validated output to a temporary file and replace only the intended output path after validation; retain the loaded parent for comparison.

### 9.3 Validation checklist

| Invariant | Required check |
|---|---|
| Identity and structure | Correct document_id; exactly one opening and closing marker for each main block; no duplicated or truncated block |
| Scope | Exactly T01–T16, five core objectives each, IDs T01.1 through T16.5 unique in the definition table and ledger; same ID sets |
| Targets | Ledger targets match curriculum; 80 D1 + 80 D2 + 79 D3 + 1 D4 = 240 required checkpoints at default full scope |
| Evidence integrity | Every referenced evidence ID exists once; objective/checkpoint scope, score, independence, and execution claims match the observation |
| Pass integrity | Every P has enough full-scope independent proof; no guided, unknown, deferred, or merely exposed work becomes a pass |
| Skip integrity | Objective skip requires all required checkpoints; full-topic skip also requires transfer; retained reviews are visible |
| Gap integrity | Material contradictions reopen only affected requirements; preserved facets remain recorded; closed gaps have exit evidence |
| Breadth integrity | Remaining-topic queue matches the current tier/phase and completed primary visits; unanswered prompts are not sampled; ordinary repeat visits do not starve eligible siblings |
| Tier integrity | DIAGNOSE_ALL finishes across active topics before REPAIR_VERIFY; no newly assigned harder-tier work before the gate clears without an explicit learner override; queued gaps and carryovers do not bypass the gate |
| Carryover integrity | Formal carryovers retain denominators, preserved facets, minimum next action, and near-term revisit; no automatic one-depth advancement |
| Dependency integrity | Every block identifies an actual required facet and return condition, not an entire arbitrary prerequisite course |
| Derived counts | Topic board, per-tier diagnostic/gate board, dashboard, checkpoint totals, wave/phase coverage, objective totals, and integration totals agree with authoritative records |
| Scope honesty | Deferred/excluded scope has a decision record; active and total-core denominators are distinguishable; no quiet scope deletion |
| Handoff | A fresh AI using the uploaded local file can identify the session-ID rule, active tier/phase, gate state, next action, unresolved uncertainties, remaining rotation, due reviews, and any missing attempt context |
| Revision safety | Correct base revision and prior pointer; one revision-log row per distinct saved change; no duplicate session or evidence from a repeat export |
| Parent and curriculum hashes | parent_file_sha256 matches the complete uploaded parent; curriculum_sha256 matches its defined output block; routine saves preserve the block and operating contract |
| Attempt lifecycle | Every used/reserved attempt ID occurs once in the disposition register; evidence references an issued attempt; superseding unfinished scope preserves valid prior claims and never invents a failure |
| Reopening and review | Both diagnostic and teaching ceiling return to the earliest contradicted required tier; suspended queues survive; above-ceiling reviews are retained but not assigned |
| Depth-specific closure and terminal queue | A future-only gap does not block a shallower gate; a shallower pass does not close deeper obligations; Tier 4 transfers/integration remain schedulable after objective checkpoints are all passed |
| Content boundary | No hardcoded practice-problem catalogue, fixed problem links/list, named drills, stored question/answer pairs, or solution/test fixture content |
| Complete delivery | Full UTF-8 Markdown file exists, includes both blocks and all curriculum sections, and is returned as one replacement |

If validation fails, repair the file before delivering it or state the exact unresolved limitation. Never hide missing coverage by changing a target or denominator. Avoid fabricated confidence percentages.

### 9.4 Keeping the single file usable over time

Keep evidence summaries concise and omit chat transcripts. Preserve every proof currently supporting a pass or skip, every unresolved contradiction, the evidence establishing delayed review, and the IDs referenced elsewhere. Older unreferenced teaching notes and closed-session narrative may be condensed into a dated summary with preserved identifiers and outcomes. Do not collapse mixed objective outcomes into a generic claim that a topic was completed. Never require a second file to understand the current state.

## 10. Conditional extensions

These are curriculum areas, not extra members of the fixed 80-objective core. They enter the active breadth rotation only after an explicit scope selection and a documented versioned addition with non-conflicting extension IDs. Their introductory concepts can be previewed without silently expanding the core mastery requirements.

| Area | When relevant | Scope boundary |
|---|---|---|
| Tries and advanced string indexing | Prefix dictionaries or dense string constraints | Learn representation and trade-offs; do not assume a trie is the default |
| Union-find in depth | Connectivity under incremental merges | Extend the basic T12.5 scope with compression/rank reasoning when selected |
| Segment/Fenwick trees | Repeated dynamic range queries and updates | Extend T15.4 recognition to implementation only when selected; compare simpler alternatives first |
| Advanced graph algorithms | Specialized weighted paths, SCCs, MSTs, flows, or route constraints | Select role-relevant algorithms and their proof assumptions |
| Advanced DP families | Alignment, interval, digit, bitmask, or tree state spaces | Derive states and dependencies rather than adding a memorized pattern list |
| Concurrency / systems coding | Target interview explicitly includes it | Separate language/runtime contracts from ordinary algorithmic pattern fluency |
| Object-oriented / API design | Target interview includes implementation design | Assess contracts, modelling, and testability under separately declared scope |

## 11. Technical reference policy

Use official Python documentation for the selected interpreter version to verify built-in types, collections, heapq, bisect, functools caching, itertools, and numeric semantics when needed. Use primary algorithm references for disputed assumptions. These references support explanations and assessment accuracy; they are not assigned reading prerequisites, a curriculum ordering, or a practice-problem catalogue.

<!-- END PY_CURRICULUM -->

# Part PE — Product engineering interview track

Track PE is the former `product_engineering_interview_roadmap`. In this part, bare IDs such as T12 or X03 mean PE records. Its references to its own filename, revision numbering, saving, upload workflow, and the Python roadmap as a separate companion are superseded by Part S and Section M; everything about assessment and tier progression inside the track is unchanged.

**Source metadata (historical; merged metadata is authoritative):**

| Source field | Value at merge |
|---|---|
| document_id | product_engineering_interview_roadmap |
| curriculum_version | "1.0" |
| tracking_schema_version | "3.1" |
| revision | 2 |
| previous_revision | 1 |
| parent_file_sha256 | "36f4ee0685293269f5651833130b9aea9395fb9b0e8565e9c365ee3d146713bd" |
| updated_on | "2026-09-15" |
| curriculum_sha256 | "51651362065689e3b15f680f674bb6735d90949015930e4c0002c650943da257" |

**Easiest tier across all topics first. Repair and independently verify that tier. Only then begin harder diagnostics across all topics.**

This is the single durable source for curriculum, evidence, adaptive placement, scheduling, and session handoff. The learner studies in chat; the AI maintains this file and returns a complete replacement on an explicit save or at session end. The learner keeps the latest complete Markdown file locally and uploads it when starting a new session. No manual checkboxes, external tracker, or separate progress file are required. If a Project Source is also used, replacing it is a separate learner action.

The roadmap contains **20 core topics and 100 stable objective IDs** in six families, **9 role-specific extensions (X01–X09) with 27 objectives** that are not selected by default (X07–X09 added in merged revision 4), integration areas I01–I07, and environment-verification items ENV01–ENV06. Topic numbers are identifiers, not a lesson sequence. Specific questions, scenarios, code snippets, generated patches for critique, product briefs, hints, solutions, and mock-interview scripts are generated in chat and are never stored here.

This roadmap is a companion to `python_coding_interview_roadmap` (algorithms and Python implementation) and `system_design_interview_roadmap` (backend architecture and distributed-systems mechanics). It deliberately does not re-teach their content; Section 1.7 defines the boundary.

## AI operating contract

**Read before teaching.** Read the metadata, the entire progress block, Sections 1–6 of the curriculum, and the objectives relevant to the next action. Resume from saved evidence, the active tier and phase, and the remaining-topic queue. Do not assume a new chat means a beginner, and do not assume an unassessed skill is missing. Do not begin a conventional T01-to-T20 course.

**Use the learner's preference as the default.** Breadth-first, easy-to-hard diagnostic tiers are persistent requirements. All 20 core topics are active regardless of priority label; priority affects repair emphasis and default depth, never participation in a tier sweep. The AI chooses prompts and bounded visits within the current tier; the learner need not choose the next topic. The governing cycle is **DIAGNOSE_ALL → REPAIR_VERIFY → TIER_GATE → next tier**. A later explicit learner request may override a gate, but record the exact scope and end condition; never infer an override from a strong answer, a job title, or claimed experience.

**Rule precedence.** Current progress tables specify the resumable state; curriculum rules specify how it may change. Historical revision notes, old chat plans, future-tier routes, and a scheduled review never override the current strict tier gate. IDs and checkpoint codes belong to this document_id: here P means independently passed (as in the Python roadmap), whereas P in the system-design roadmap means partial. T-numbers overlap across all three roadmaps but refer to different topics. Never transfer a status, an attempt, or evidence by matching a short ID or a topic name alone; Section 1.7 governs cross-roadmap use.

**Distinguish scope, difficulty, and scheduling.** The curriculum tree organizes topics. D1–D4 describe checkpoint depth. Tiers organize easy-to-hard diagnostics and repairs across the tree. Waves use W0–W4 labels; a lap is one bounded visit per eligible topic. Prerequisite relationships concern only the facets a task actually needs; they do not authorize completing an entire topic before its siblings.

**Probe, then tailor.** Use existing qualifying evidence or a fresh, unassisted probe before explaining a skill. A diagnostic can earn the same credit as any independent assessment, but only for the scope actually demonstrated. Skip instruction at that exact scope; repair only the gaps. Unknown is not failed. An answer obtained after hints or an explanation is not an independent pass.

**Protect both breadth and difficulty.** During DIAGNOSE_ALL, give every active topic a bounded visit at the current tier before beginning the repair phase. During REPAIR_VERIFY, rotate across that tier's unresolved topics and facets. Do not issue a harder-tier diagnostic merely because the learner answered an easier probe well. Do not begin the next tier while required lower-tier scope is unknown, gapped, or awaiting an independent check, except under an explicit learner override.

**Respect the chat boundary.** Study happens in text. A chat-assessed pass certifies the chat projection defined in Section 1.6 and never claims browser rendering, keyboard or screen-reader behavior, profiling, test execution, or repository navigation that was not actually observed. Record environment-backed verification separately in Section 0.8.1.

**Separate administration from study.** Auditing, uploading, renaming, or saving this file does not start or end a study session and does not resolve an unanswered diagnostic. Read the saved session disposition; allocate a new session only when actual new study begins.

**Save the actual state.** On an explicit save, wrap-up, or clear end-of-session message, update the progress block and metadata, validate, and return this entire Markdown file. A mid-session save is not a new session or an automatic session end. Do not award credit for planning, exposure, AI-written work, or a downloaded file. Routine saves must not rewrite curriculum scope or assessment standards; a requested policy redesign is documented separately.

**Respect the handoff boundary.** State the generated revision and that the learner should keep that version locally and upload it in the next session, replacing an older working copy as appropriate. Generating a replacement does not update any Project Source automatically. Never promise an automatic save after the conversation has ended.

<!-- BEGIN PE_PROGRESS -->

## 0. AI-managed state

### 0.1 Learner profile and dashboard

| Field | Current value |
|---|---|
| Learning preference | BREADTH_FIRST_ADAPTIVE; strict easy-to-hard tiers; diagnose across all topics, repair gaps, independently verify, then advance. Carried from the learner's explicit decisions in the companion roadmaps and restated when this roadmap was requested |
| File maintenance | AI edits one complete Markdown file; learner keeps the latest local copy and uploads it at each new session; save on request or at session end |
| Timezone | America/Toronto (from companion roadmaps) |
| Career goal | Pivot from internal operational tooling to building customer-facing features in products the company sells, where the work affects revenue. Wants a durable direction rather than repeating current work (learner statement, 2026-09-15) |
| Target role variant / companies | Locked by DEC0017 (merged S0.1): full-stack product engineer, strongest on the frontend, on core customer-facing products at consumer, creative, prosumer, and AI product companies; stretch: consumer product teams at large tech. Specific companies not chosen. Canadian citizen, open to any location including the US |
| Background summary | Reported, not evidence. BSc Computer Science 2020. About 3 years as a software engineer on internal tools at a school district (React/TypeScript/Next.js ticketing with role-restricted access; device check-in/out web app integrating Google and Apple device management and barcode scanners; Django/React internal hub on Docker Compose; Python ETL and third-party integrations; SaaS vendor evaluation and cost analysis; migration of in-house systems and data to third-party platforms; AI-assisted and agentic development including MCP). Earlier short data-engineering (Python ETL, REST APIs, SQL, Tableau) and routing-algorithm roles. Personal projects: macOS MCP drawing overlay, LLM-based marketplace listing and monitoring app, nested React Flow canvas app. Use only to choose which facets to probe first; never to award credit or skip a probe |
| Target level | MID confirmed by DEC0006 from about 3.5 years of professional experience; SENIOR overlay not applied |
| Stack | Confirmed by DEC0009 and clarified by shared DEC0025: TypeScript and React for frontend/UI code and JavaScript-runtime examples; Python (Django or FastAPI style) for server code, sketches, and algorithm work. Avoid plain JavaScript practice unless JavaScript-specific syntax or an explicitly JS-only interview constraint is material. Shared DEC0027 additionally requires common idiomatic forms by default and excludes incidental uncommon-style syntax unless that syntax is itself relevant. Objectives remain concept-first |
| AI-tool policy of target interviews | Varies by employer; AI_EXPECTED overlay applied (DEC0007) while unaided skill stays required (Section 1.5) |
| Active scope | T01–T20 core (20 topics, 100 objectives) plus selected extensions X03, X07, X08, X09 (12 objectives) = 112 objectives. Overlays AI_EXPECTED and FRONTEND_HEAVY at MID level (DEC0018). X01, X02, X04–X06 NOT_SELECTED; I04 and I07 NOT_SELECTED; ENV items tracked, not gated |
| Diagnostic sweep | Tier 1 DIAGNOSE_ALL in progress; 23/24 roster entries sampled. S0007 completed a bounded X08 visit with independent closure-state evidence; X09 remains unvisited |
| Required checkpoint passes | 8/337; D1 8/112, D2 0/112, D3 0/107, D4 0/6. Core-only view: 8/299 |
| Objectives meeting their target | 0/112 (0/100 core, 0/12 extensions); a record of evidence, not an estimate of actual knowledge |
| Topics eligible to skip all instruction | 0/20 |
| Topic transfer checks | 0/20 verified |
| Integration coverage | 0/5 required areas verified (I01–I03, I05, I06); I04 and I07 not selected |
| Environment verification | 0/6 ENV items observed; reported separately, never a tier gate |
| Retention | NOT_ASSESSED; T01.2, T10.1, T13.1, and T20.1 D1 reviews due 2026-09-18 are now due/overdue and unserved without changing their passes; T06.4 D1 review is due 2026-09-19; new T11.1, T09.1, and T17.1 D1 reviews are due 2026-09-21 |
| Current curriculum phase | Tier 1 / DIAGNOSE_ALL / W0 / L01; easiest conceptual, reading, and critique probes |
| Current / most recently active session | S0007 OPEN at this requested mid-session save on 2026-09-19 |
| Last completed study session | S0006; 2026-09-17–2026-09-18. S0007 is active and has completed the PE X08 primary visit so far |
| Next new session ID | Shared S0007 is open. If study continues here, keep S0007; after it closes, the next genuinely new session is S0008 |
| Last saved study session | S0007; merged revision 9; 2026-09-19; mid-session save, not a session close |
| Prompt and feedback preference | Use complete scenarios with explicit contracts and one manageable question at a time. Shared DEC0023/DEC0024/DEC0026 require checking the actual objective, stating material assumptions and unfamiliar terminology before scoring, withholding hidden criteria, and invalidating ambiguous assistant prompts without learner penalty. Shared DEC0025 requires TypeScript for frontend/runtime code examples and Python for backend/algorithm code. Shared DEC0027 requires common idiomatic code by default; uncommon syntax is taught or tested only when it is itself relevant or realistically required |
| Self-reported familiarity | Work history suggests prior exposure relevant to T05, T10, T11, T12.5, T16.3, T20, and X03. This is REPORTED_EXPOSURE: it may order which facet to probe within a Tier 1 visit, but every topic still receives its probe and no status is pre-filled. No prior exposure reported for customer-facing product metrics, experimentation, or multi-tenant commercial SaaS (T02, T11.3, T12.1) |
| Stop condition | None. S0007 remains open; this revision is a learner-requested mid-session roadmap/policy save |

### 0.2 Breadth scheduler and resume packet

This section is operational state, not evidence of learning. Recompute it after relevant outcomes. A fresh chat must be able to resume from this packet without the old conversation. A wave, phase, or session change does not silently reset the remaining-topic queue.

| Field | Current value |
|---|---|
| Active tier / phase | Tier 1 / DIAGNOSE_ALL |
| Highest tier previously opened | Tier 1 |
| Suspended positions | None |
| Current lap roster | T01, T04, T10, T13, T18, T20, T02, T05, T11, T14, T19, T06, T12, T15, T03, T07, T16, T08, T17, T09, X03, X07, X08, X09 |
| Evidence-covered / explicitly removed entries this lap | None |
| Required scope not currently runnable | None; a temporary pause stays required and must have a revisit trigger |
| Active wave / lap | W0 / L01 |
| Current difficulty ceiling | D1; explain purpose, distinguish example from non-example, predict or trace a small supplied case, identify simple state, assumption, boundary, or risk. No full artifact production, no code writing, no unlabelled selection |
| Lap meaning | One bounded visit per eligible topic at the current tier/phase; several laps and sessions may be needed |
| Default topic rotation | T01, T04, T10, T13, T18, T20, T02, T05, T11, T14, T19, T06, T12, T15, T03, T07, T16, T08, T17, T09, X03, X07, X08, X09 (family-mixed; not a teaching order) |
| Remaining topics in current lap | X09 |
| Topics visited in current lap | T01, T04, T10, T13, T18, T20, T02, T05, T06, T14, T19, T12, T15, T11, T03, T07, T16, T08, T17, T09, X03, X07, X08 |
| Last primary topic / consecutive visits | X08 / 1 completed in S0007. S0007-A01 supplied valid closure-state evidence; the `++x` follow-up was invalidated as a style confound and does not create a second visit or learner gap |
| Shallowest outstanding required depth | D1 |
| Queued facet work | G0029–G0046 plus G0048. S0007 preserves an independent X08.1 closure-instance/state facet while other X08.1 runtime families remain unknown; the uncommon `++x` detour is excluded from learner-gap scoring. Other U objectives remain unknown, not failed |
| Carryover / blocked objectives | None |
| Due reviews | T01.2, T10.1, T13.1, and T20.1 D1 due 2026-09-18 are due/overdue and unserved; T06.4 D1 due 2026-09-19; T11.1, T09.1, and T17.1 D1 due 2026-09-21 |
| Active scheduling exceptions | None |
| Unfinished attempt | None. S0006-A18 is SUPERSEDED only because fresh same-scope S0007-A01 was actually issued; S0007-A02 is INVALIDATED as an uncommon-style confound, not left pending |
| Next action in this conversation | PE X08 is complete for the W0 sweep. After the shared scheduler gives PY its next turn, PE may service at most one due review and then sample the remaining W0 topic X09 |
| Next action after a new-session upload | If no later S0007 save exists, treat S0007 as interrupted at this mid-session save and allocate S0008. Do not repeat X08. Follow the shared ratio/review rules, then sample X09 as PE's only remaining W0 topic |
| Next decision rule | Honor at most one due review on the next PE review-led turn, then sample X09. Once X09 resolves, close W0/L01 and open PE W1/L02 at Tier 1; keep the D1 ceiling until all 112 D1 checkpoints are P |
| Tier 2 gate | LOCKED until all 112 active D1 checkpoints are P and relevant contradictions are resolved |
| Do not repeat | Do not repeat any of the 23 sampled W0 topics before X09 resolves, except bounded due reviews. Do not repeat X08 merely to recover the invalidated `++x` follow-up. Use TypeScript for frontend/runtime work under DEC0025 and common idiomatic syntax under DEC0027 |
| Save anchor | Track PE updated inside merged revision 9 from uploaded merged revision 8 parent `9a0ce0c35f765f3e3f235316efc9035cb6084ced16702bee848fec0e4f23346c`. Curriculum bytes are unchanged; next distinct merged save becomes revision 10 |
| Reserved next identifiers | S0007-A01–A02 and S0007-EV01 are allocated to PE in the open shared session; G0048 and shared DEC0027 are allocated. Next shared attempt A03, evidence EV02, gap G0049, and decision DEC0028. PE historical decisions remain track-qualified |
| Teaching-process correction | Shared DEC0023/DEC0024/DEC0026 remain active. DEC0027 adds a representative-idiom rule: do not let uncommon syntax become an accidental prerequisite for a different concept. S0007's prefix-increment detour is excluded from learner-gap scoring; future sessions must still service due reviews under the saved rules |

### 0.2.1 Tier and gate board

`DIAGNOSE_ALL` = the current tier's all-topic sweep; `REPAIR_VERIFY` = breadth-first probes of remaining unknowns, gap-only instruction, and fresh independent checks. `CLEARED` requires the complete tier gate, not just sampling. Later tiers are `LOCKED` until the earlier tier is cleared, unless an explicit learner override is documented. On a lower-tier reopening, its working state becomes ACTIVE / REPAIR_VERIFY and previously opened higher-tier rows become SUSPENDED, retaining their evidence and historical diagnostic coverage. CLEARED is a currently valid gate, not a historical completion label.

| Tier | Required scope | Diagnostic coverage | Phase / status | Gate evidence | Next transition |
|---|---|---|---|---|---|
| Tier 1 — Foundations | D1 across 112 active objectives (100 core + 12 extension) | 23/24 roster entries sampled; X08 sampled; X09 unvisited | DIAGNOSE_ALL; W0 / L01 | 8/112 D1; additional partial/assisted facets retained | Sample X09 after due-review scheduling; W1 opens only after all 24 obligations resolve |
| Tier 2 — Mechanism and labelled application | D2 across 112 active objectives | 0/24 tier-specific sweep obligations resolved | LOCKED | 0/112 D2 | Open W2 DIAGNOSE_ALL only after Tier 1 clears |
| Tier 3 — Independent selection and artifacts | D3 across the 107 active objectives targeting D3 or D4 | 0/24 tier-specific sweep obligations resolved | LOCKED | 0/107 D3 | Open W3 DIAGNOSE_ALL only after Tier 2 clears |
| Tier 4 — Adaptation, transfer, and integration | D4 for T01.4, T07.5, T16.4, T19.5, X03.3, X07.3; 20 core topic transfers; I01–I03, I05, I06 | 0/22 tier-specific sweep obligations resolved (20 topic transfers plus D4 diagnostics for X03 and X07) | LOCKED | 0/6 D4; 0/20 transfers; 0/5 integration areas | Open W4 DIAGNOSE_ALL only after Tier 3 clears |

### 0.3 Topic placement and breadth board

`Tier 1 diagnostic` records attention, not full objective coverage. Diagnostic states are U (not addressed), PENDING (issued but no usable answer), SAMPLED (a bounded valid attempt), NO_ATTEMPT (explicit decline or inability, with a reason and no invented failure score), and COVERED_FROM_EVIDENCE (valid independent coverage of the entire topic's required tier scope). SAMPLED, NO_ATTEMPT, and COVERED_FROM_EVIDENCE resolve a sweep obligation; only SAMPLED counts as an assessed visit. LOCKED marks a not-yet-opened tier. An embedded facet alone does not complete a primary diagnostic.

| Topic | Family | Priority | Scope | Tier 1 diagnostic | Tier 2 diagnostic | Tier 3 diagnostic | Tier 4 diagnostic | Placement | D1 | D2 | D3 | D4 | Full instruction skip | Last visit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T01 | F01 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | 0/1 | NO | S0004; T01.2 problem-versus-solution and assumption validation independently verified |
| T02 | F01 | P1 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/4 | — | NO | S0005; outcome metric and randomization-noise facets retained; guardrail/full experiment scope remains |
| T03 | F01 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0006; first vertical-slice formulation needed help, while revocation and link-security risk thinking were independent partial facets |
| T04 | F02 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/4 | — | NO | S0004; event propagation direction initially reversed, then corrected after instruction |
| T05 | F02 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0005; redundant synchronized-state risk understood after focused prompting; independent full D1 still open |
| T06 | F02 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | — | NO | S0005; T06.4 stale-response rule independently passed; T06.1 client/server validation facet partial |
| T07 | F02 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | 0/1 | NO | S0006; state-category terminology was taught first, then stale-cache and post-success cache update were applied correctly |
| T08 | F02 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/4 | — | NO | S0006; keyboard-operation concern independent, semantic-button/focusability correction taught |
| T09 | F02 | P0 (FRONTEND_HEAVY) | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/4 | — | NO | S0006; T09.1 main-thread bottleneck classification independently passed |
| T10 | F03 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | — | NO | S0004; T10.1 stable product-action boundary independently recognized |
| T11 | F03 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | — | NO | S0006; T11.1 independently distinguished workspace authorization/membership, authentication-session state, and commercial entitlement |
| T12 | F03 | P1 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0005; corrected recurring-subscription scenario identified grace-period and expiry state; broader lifecycle scope open |
| T13 | F04 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | — | NO | S0004; T13.1 unit-test layer selected independently for isolated deterministic logic |
| T14 | F04 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0005; entry-point search independently chosen; wider minimal feature map remains |
| T15 | F04 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | — | NO | S0006; independently identified a server-side permission regression when an owner check was removed despite hidden UI |
| T16 | F04 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | 0/1 | NO | S0006; independently distinguished deployed from released under a feature flag; risk-decoupling facet remains |
| T17 | F04 | P1 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/5 | — | NO | S0006; T17.1 independently prioritized successful downloads as direct feature-health telemetry over indirect JS error rate |
| T18 | F05 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | U | 0/5 | 0/5 | 0/5 | — | NO | S0004; independently identified loading and failure states; broader state-model scope remains unknown |
| T19 | F05 | P0 | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/5 | 0/5 | 0/5 | 0/1 | NO | S0005; thin vertical-slice model correctly applied after prior explanation; independent verification remains |
| T20 | F06 | P0 (AI_EXPECTED) | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | MIXED | 1/5 | 0/5 | 0/4 | — | NO | S0004; T20.1 passed, T20.4 verification instinct preserved with tool-certainty gap |
| X03 | Extension | Selected (DEC0008) | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | FOUNDATION_GAPS | 0/3 | 0/3 | 0/3 | 0/1 | NO | S0006; ambiguous product-failure prompt invalidated; fallback UX behavior correctly proposed after clarification/teaching |
| X07 | Extension | Selected (DEC0021) | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | U | 0/3 | 0/3 | 0/3 | 0/1 | NO | S0006; independently recognized collaborative canvas traffic as bidirectional client↔server communication; broader transport/reconnect scope remains |
| X08 | Extension | Selected (DEC0021) | ACTIVE | SAMPLED | LOCKED | LOCKED | LOCKED | U | 0/3 | 0/3 | 0/3 | — | NO | S0007; independent closure-instance/state facet retained. `++x` follow-up invalidated as uncommon-style confound under DEC0027 |
| X09 | Extension | Selected (DEC0021) | ACTIVE | U | LOCKED | LOCKED | LOCKED | U | 0/3 | 0/3 | 0/3 | — | NO | — |

### 0.4 Objective checkpoint ledger

One row per stable objective. Checkpoints: `U` = unassessed; `G` = observed gap or assisted-only result; `P` = independently verified at that checkpoint's complete scope; `R` = a previously verified checkpoint needs retest after a material contradiction; `—` = not required. A missing prerequisite is stored separately; it is not a failed assessment.

Routes: `PROBE`, `LEARN`, `GAP_ONLY`, `VERIFY_SKIP`, `SKIP_INSTRUCTION`, `RETEST`, or `PAUSED`. These are next-instruction decisions, not scores. A row can have strong known facets while its overall checkpoint is still `G`; preserve those facets in Section 0.6 so instruction remains narrow.

`Proof / gap refs` must identify evidence per passed checkpoint and any unresolved gap, in the form `D2=S0001-EV01`. Higher-depth performance can cover lower checkpoints only when their actual requirements were demonstrated; it does not authorize a harder-tier diagnostic before the gate opens. A blank review date means unscheduled. The 337 active required cells (299 core plus 38 for extensions X03, X07, X08, X09) are coverage checkpoints, not a quota of exercises.

| Objective | Target | D1 | D2 | D3 | D4 | Route | Proof / gap refs | Review due |
|---|---|---|---|---|---|---|---|---|
| T01.1 | D3 | U | U | U | — | PROBE | — | — |
| T01.2 | D3 | P | U | U | — | PROBE | D1=S0004-EV03 | 2026-09-18 |
| T01.3 | D3 | U | U | U | — | PROBE | — | — |
| T01.4 | D4 | U | U | U | U | PROBE | — | — |
| T01.5 | D3 | U | U | U | — | PROBE | — | — |
| T02.1 | D3 | G | U | U | — | GAP_ONLY | S0005-EV01; G0032 | — |
| T02.2 | D3 | U | U | U | — | PROBE | — | — |
| T02.3 | D3 | U | U | U | — | PROBE | — | — |
| T02.4 | D2 | G | U | — | — | GAP_ONLY | S0005-EV02; G0033 | — |
| T02.5 | D3 | U | U | U | — | PROBE | — | — |
| T03.1 | D3 | G | U | U | — | GAP_ONLY | S0006-EV05; G0040 | — |
| T03.2 | D3 | U | U | U | — | PROBE | — | — |
| T03.3 | D3 | U | U | U | — | PROBE | — | — |
| T03.4 | D3 | U | U | U | — | PROBE | — | — |
| T03.5 | D3 | U | U | U | — | PROBE | — | — |
| T04.1 | D2 | U | U | — | — | PROBE | — | — |
| T04.2 | D3 | G | U | U | — | GAP_ONLY | Initial propagation-direction gap S0004-EV04; guided correction S0004-EV05; G0029 | — |
| T04.3 | D3 | U | U | U | — | PROBE | — | — |
| T04.4 | D3 | U | U | U | — | PROBE | — | — |
| T04.5 | D3 | U | U | U | — | PROBE | — | — |
| T05.1 | D3 | U | U | U | — | PROBE | — | — |
| T05.2 | D3 | G | U | U | — | GAP_ONLY | S0005-EV03; G0034 | — |
| T05.3 | D3 | U | U | U | — | PROBE | — | — |
| T05.4 | D3 | U | U | U | — | PROBE | — | — |
| T05.5 | D3 | U | U | U | — | PROBE | — | — |
| T06.1 | D3 | G | U | U | — | GAP_ONLY | S0005-EV09; G0037 | — |
| T06.2 | D3 | U | U | U | — | PROBE | — | — |
| T06.3 | D3 | U | U | U | — | PROBE | — | — |
| T06.4 | D3 | P | U | U | — | PROBE | D1=S0005-EV05 | 2026-09-19 |
| T06.5 | D3 | U | U | U | — | PROBE | — | — |
| T07.1 | D3 | G | U | U | — | GAP_ONLY | S0006-EV07; G0041 | — |
| T07.2 | D3 | U | U | U | — | PROBE | — | — |
| T07.3 | D3 | U | U | U | — | PROBE | — | — |
| T07.4 | D3 | U | U | U | — | PROBE | — | — |
| T07.5 | D4 | U | U | U | U | PROBE | — | — |
| T08.1 | D3 | G | U | U | — | GAP_ONLY | Guided semantic-control correction S0006-EV11; G0043 | — |
| T08.2 | D3 | G | U | U | — | GAP_ONLY | Independent keyboard-interaction concern S0006-EV10; focusability/native behavior taught; G0044 | — |
| T08.3 | D3 | U | U | U | — | PROBE | — | — |
| T08.4 | D2 | U | U | — | — | PROBE | — | — |
| T08.5 | D3 | U | U | U | — | PROBE | — | — |
| T09.1 | D3 | P | U | U | — | PROBE | D1=S0006-EV14 | 2026-09-21 |
| T09.2 | D2 | U | U | — | — | PROBE | — | — |
| T09.3 | D3 | U | U | U | — | PROBE | — | — |
| T09.4 | D3 | U | U | U | — | PROBE | — | — |
| T09.5 | D3 | U | U | U | — | PROBE | — | — |
| T10.1 | D3 | P | U | U | — | PROBE | D1=S0004-EV07 | 2026-09-18 |
| T10.2 | D3 | U | U | U | — | PROBE | — | — |
| T10.3 | D3 | U | U | U | — | PROBE | — | — |
| T10.4 | D3 | U | U | U | — | PROBE | — | — |
| T10.5 | D3 | U | U | U | — | PROBE | — | — |
| T11.1 | D3 | P | U | U | — | PROBE | D1=S0006-EV04 | 2026-09-21 |
| T11.2 | D3 | U | U | U | — | PROBE | — | — |
| T11.3 | D3 | U | U | U | — | PROBE | — | — |
| T11.4 | D3 | U | U | U | — | PROBE | — | — |
| T11.5 | D3 | U | U | U | — | PROBE | — | — |
| T12.1 | D3 | G | U | U | — | GAP_ONLY | S0005-EV11; G0038 | — |
| T12.2 | D3 | U | U | U | — | PROBE | — | — |
| T12.3 | D3 | U | U | U | — | PROBE | — | — |
| T12.4 | D3 | U | U | U | — | PROBE | — | — |
| T12.5 | D3 | U | U | U | — | PROBE | — | — |
| T13.1 | D3 | P | U | U | — | PROBE | D1=S0004-EV08 | 2026-09-18 |
| T13.2 | D3 | U | U | U | — | PROBE | — | — |
| T13.3 | D3 | U | U | U | — | PROBE | — | — |
| T13.4 | D3 | U | U | U | — | PROBE | — | — |
| T13.5 | D3 | U | U | U | — | PROBE | — | — |
| T14.1 | D3 | U | U | U | — | PROBE | — | — |
| T14.2 | D3 | U | U | U | — | PROBE | — | — |
| T14.3 | D3 | U | U | U | — | PROBE | — | — |
| T14.4 | D3 | U | U | U | — | PROBE | — | — |
| T14.5 | D3 | U | U | U | — | PROBE | — | — |
| T15.1 | D3 | G | U | U | — | GAP_ONLY | Independent permission-regression facet S0006-EV01; G0039 | — |
| T15.2 | D3 | U | U | U | — | PROBE | — | — |
| T15.3 | D3 | U | U | U | — | PROBE | — | — |
| T15.4 | D3 | U | U | U | — | PROBE | — | — |
| T15.5 | D3 | U | U | U | — | PROBE | — | — |
| T16.1 | D3 | G | U | U | — | GAP_ONLY | Independent deploy-versus-release distinction S0006-EV08; G0042 | — |
| T16.2 | D3 | U | U | U | — | PROBE | — | — |
| T16.3 | D3 | U | U | U | — | PROBE | — | — |
| T16.4 | D4 | U | U | U | U | PROBE | — | — |
| T16.5 | D3 | U | U | U | — | PROBE | — | — |
| T17.1 | D3 | P | U | U | — | PROBE | D1=S0006-EV12 | 2026-09-21 |
| T17.2 | D3 | U | U | U | — | PROBE | — | — |
| T17.3 | D3 | U | U | U | — | PROBE | — | — |
| T17.4 | D3 | U | U | U | — | PROBE | — | — |
| T17.5 | D3 | U | U | U | — | PROBE | — | — |
| T18.1 | D3 | U | U | U | — | PROBE | Independent loading/error-state facets S0004-EV10; remaining D1 scope G0030 | — |
| T18.2 | D3 | U | U | U | — | PROBE | — | — |
| T18.3 | D3 | U | U | U | — | PROBE | — | — |
| T18.4 | D3 | U | U | U | — | PROBE | — | — |
| T18.5 | D3 | U | U | U | — | PROBE | — | — |
| T19.1 | D3 | U | U | U | — | PROBE | — | — |
| T19.2 | D3 | U | U | U | — | PROBE | — | — |
| T19.3 | D3 | G | U | U | — | GAP_ONLY | S0005-EV08; G0036 | — |
| T19.4 | D3 | U | U | U | — | PROBE | — | — |
| T19.5 | D4 | U | U | U | U | PROBE | — | — |
| T20.1 | D3 | P | U | U | — | PROBE | D1=S0004-EV11 | 2026-09-18 |
| T20.2 | D3 | U | U | U | — | PROBE | — | — |
| T20.3 | D2 | U | U | — | — | PROBE | — | — |
| T20.4 | D3 | G | U | U | — | GAP_ONLY | Independent verification instinct with overclaim about tool certainty S0004-EV12; G0031 | — |
| T20.5 | D3 | U | U | U | — | PROBE | — | — |
| X03.1 | D3 | G | U | U | — | GAP_ONLY | Invalid ambiguous attempt A14; guided fallback UX S0006-EV15; G0045 | — |
| X03.2 | D3 | U | U | U | — | PROBE | — | — |
| X03.3 | D4 | U | U | U | U | PROBE | — | — |
| X07.1 | D3 | U | U | U | — | PROBE | — | — |
| X07.2 | D3 | G | U | U | — | GAP_ONLY | Independent bidirectional-flow facet S0006-EV18; G0046 | — |
| X07.3 | D4 | U | U | U | U | PROBE | — | — |
| X08.1 | D3 | U | U | U | — | PROBE | Independent closure-instance/lexical-state facet S0007-EV01; remaining D1 runtime scope G0048 | — |
| X08.2 | D3 | U | U | U | — | PROBE | — | — |
| X08.3 | D3 | U | U | U | — | PROBE | — | — |
| X09.1 | D3 | U | U | U | — | PROBE | — | — |
| X09.2 | D3 | U | U | U | — | PROBE | — | — |
| X09.3 | D3 | U | U | U | — | PROBE | — | — |

### 0.5 Assessment evidence register

Create one row per objective with a distinct checkpoint/facet outcome. Several rows may share an attempt ID; several checkpoints may share a row only when the same score and assistance apply and each demonstrated scope is stated. Evidence ID format: `S0001-EV01`; attempt ID format: `S0001-A01`. Never store the question, supplied code, generated patch, or solution in this table. The observation column must state the artifact type (explanation, trace, code, spec, plan, review, critique) and whether anything was executed, rendered, or only described.

| Evidence ID | Attempt | Date | Objective | Checkpoint / demonstrated facets | Mode | Assistance | Score | Observation / execution status |
|---|---|---|---|---|---|---|---|---|
| S0004-EV03 | S0004-A02 | 2026-09-15 | T01.2 | D1 problem-versus-solution separation and assumption validation | DIAGNOSTIC | NONE | 2 | Independently restated the underlying user problem as caption creation taking too long and identified that generated-caption quality must be sufficient to actually save user time. Written explanation only. |
| S0004-EV04 | S0004-A03 | 2026-09-15 | T04.2 | D1 event propagation direction | DIAGNOSTIC | NONE | 0 | Initially predicted the ancestor handler before the clicked target and described propagation as outer-to-inner, showing a material mismatch for default click bubbling. Code was read only; nothing executed. |
| S0004-EV05 | S0004-A03 | 2026-09-15 | T04.2 | D1 assisted target/bubbling correction | GUIDED | SOLUTION | 1 | After the AI distinguished capture from default bubbling, the learner correctly restated target-first then parent/outward propagation for common bubbling events. Correct but not independent. |
| S0004-EV07 | S0004-A05 | 2026-09-15 | T10.1 | D1 stable product-action boundary versus incidental UI action | DIAGNOSTIC | NONE | 2 | Independently explained that an API named around a Save button becomes misleading when the product moves to autosave even if the backend behavior remains valid. Written explanation only. |
| S0004-EV08 | S0004-A06 | 2026-09-15 | T13.1 | D1 risk-based test-layer selection | DIAGNOSTIC | NONE | 2 | Independently chose a unit test for small deterministic arithmetic logic and explained that a browser end-to-end test adds unnecessary UI machinery for that behavior. No tests were executed. |
| S0004-EV10 | S0004-A09 | 2026-09-15 | T18.1 | D1 partial state-model facets: pending/loading and failure | DIAGNOSTIC | NONE | 2 | Independently identified a loading state and an explicit failure/status state for a slow or failed caption-generation request. This is strong facet evidence but did not sample the broader relevant state model, so the full D1 checkpoint remains U. |
| S0004-EV11 | S0004-A10 | 2026-09-15 | T20.1 | D1 AI claim treated as a hypothesis to inspect | DIAGNOSTIC | NONE | 2 | Independently rejected accepting an AI claim that a function was unused and proposed investigating repository references before deletion. This satisfies the foundational hypothesis-not-authority distinction. |
| S0004-EV12 | S0004-A10 | 2026-09-15 | T20.4 | D1 repository verification with overclaim about deterministic tooling | DIAGNOSTIC | NONE | 1 | Correctly proposed IDE/reference search as verification evidence, but claimed the IDE was guaranteed not to be wrong. The AI corrected that indexing, dynamic usage, generated code, or framework conventions can limit reference search. Fresh independent verification reasoning remains due. |

| S0005-EV01 | S0005-A01 | 2026-09-16 | T02.1 | D1 outcome-metric operationalization and noise caveat | DIAGNOSTIC | NONE | 2 | Proposed page-render to caption-complete time as a comparable outcome metric and independently noticed that unrelated idle time can contaminate it. Preserved the comparability rationale when contrasting an AI-button start with manual caption creation. Guardrail metrics were not supplied, so the checkpoint remains incomplete. |
| S0005-EV02 | S0005-A01 | 2026-09-16 | T02.4 | D1 randomization/noise-balancing facet | DIAGNOSTIC | NEUTRAL_CLARIFICATION | 2 | After clarification that normality is not required, correctly explained that unrelated distractions occurring in both randomized groups tend to cancel/balance in the comparison. Hypothesis, unit, treatment, guardrails, and major validity risks remain unverified. |
| S0005-EV03 | S0005-A02 | 2026-09-16 | T05.2 | D1 redundant synchronized-state reasoning | GUIDED | HINT | 1 | Initially focused on missing item identity. After the prompt isolated an `items`/`subtotal` divergence, correctly identified out-of-sync state, proposed removing stored subtotal, and raised recomputation cost; memoized derived state was then explained. Core model understood but key failure mode was supplied before the successful answer. |
| S0005-EV05 | S0005-A04 | 2026-09-16 | T06.4 | D1 stale-response overwrite rule | DIAGNOSTIC | NONE | 2 | Independently identified that an older query response can overwrite results for the current query and stated the correct invariant: results for an older query must not replace a newer query's UI state, regardless of completion order. The assistant had mislabeled the topic T11; evidence is correctly mapped to T06.4. |
| S0005-EV06 | S0005-A05 | 2026-09-16 | T14.1 | D1 unfamiliar-feature entry-point facet | DIAGNOSTIC | NONE | 2 | Independently chose to locate where the Save Profile button/feature is implemented rather than reading the repository linearly. Later discussion defended code inspection as a reasonable first move for an intermittent report. Data flow, tests, and boundaries remain unassessed. |
| S0005-EV08 | S0005-A08 | 2026-09-16 | T19.3 | D1 thin vertical-slice application after teaching | GUIDED | SOLUTION | 1 | On a fresh profile-photo scenario, chose the real end-to-end upload/store/refresh path over frontend polish and explained that it tests the core infrastructure/workflow first. The vertical-slice principle had just been explicitly taught, so this is assisted rather than independent. |
| S0005-EV09 | S0005-A09 | 2026-09-16 | T06.1 | D1 client-versus-server validation authority facet | DIAGNOSTIC | NEUTRAL_CLARIFICATION | 2 | After `trust` was neutrally defined as the server skipping its own check, independently said the server cannot rely on frontend validation because requests can be changed before reaching it. Follow-up discussion added direct-client bypass/CORS context. Broader form/submission-state scope remains unknown. |
| S0005-EV11 | S0005-A12 | 2026-09-16 | T12.1 | D1 recurring-subscription/grace-period state facet | DIAGNOSTIC | NONE | 2 | Under a corrected monthly-subscription scenario, independently identified that a single paid boolean cannot represent grace-period status or its remaining duration and proposed explicit premium/grace expiry dates. Broader plan/entitlement lifecycle and authoritative-state mapping remain unverified. |

| S0006-EV01 | S0006-A01 | 2026-09-17 | T15.1 | D1 security/permission regression-risk facet | DIAGNOSTIC | NONE | 2 | Independently identified that removing the server membership/owner check allows a non-owner to bypass a hidden UI button and call the delete endpoint directly. Inline route-handler syntax was explained separately and is not credited. Broader T15.1 risk categories remain unverified. |
| S0006-EV03 | S0006-A03 | 2026-09-17 | T06.1 | D1 client-versus-server validation authority, incidental repeat | DIAGNOSTIC | NONE | 2 | During an assistant scheduling mistake, independently stated that a direct API request can bypass browser-only validation. Valid evidence is retained under T06.1, but the attempt does not count as the scheduled T11 W0 visit and does not create a learner penalty. |
| S0006-EV04 | S0006-A04 | 2026-09-17 | T11.1 | D1 authentication/session, authorization/membership, and entitlement distinction | DIAGNOSTIC | NONE | 2 | Independently denied access to an Alpha report after workspace removal despite login and paid Pro entitlement, then correctly classified an expired login session as authentication/session state rather than authorization or entitlement. This completes the D1 distinction checkpoint. |
| S0006-EV05 | S0006-A05 | 2026-09-17 | T03.1 | D1 vertical-slice reasoning with assisted first slice and independent follow-up facets | GUIDED | MIXED | 1 | Initially proposed anonymous read-only viewing but omitted owner-side link creation; the complete owner-create → anonymous-open → read-only slice was then taught. Independently chose revocation as a useful next slice and raised link-tampering risk. Full independent vertical-slice formulation remains open. |
| S0006-EV07 | S0006-A07 | 2026-09-17 | T07.1 | D1 state-category application after terminology teaching | GUIDED | SOLUTION | 1 | The labels ephemeral UI state, durable server state, and client-cached server state were taught before classification. Afterward the learner correctly mapped all three, independently identified the cached client copy as stale after another tab changed the server value, and said a successful write should update/refetch the cache. Because the taxonomy was supplied first, the full checkpoint is not independent. |
| S0006-EV08 | S0006-A08 | 2026-09-17 | T16.1 | D1 deploy-versus-release distinction | DIAGNOSTIC | NONE | 2 | Independently answered that feature-flagged code already running in production is deployed but not released. The risk-reduction reason for decoupling deploy from release was not independently elicited, so the full D1 checkpoint remains gapped. |
| S0006-EV10 | S0006-A10 | 2026-09-17 | T08.2 | D1 keyboard-operation concern before semantic-control teaching | DIAGNOSTIC | NONE | 2 | Independently focused on keyboard users tabbing to controls and activating them with keys, but did not yet know that a plain div is normally outside the tab order. Preserve the keyboard-operation concern as a narrow independent facet. |
| S0006-EV11 | S0006-A10 | 2026-09-17 | T08.1 | D1 semantic-button/focusability correction | GUIDED | SOLUTION | 1 | After the AI explained native button semantics, the learner correctly restated that a keyboard user can tab to a button but not a plain div by default. Correct application is retained as assisted, not an independent semantic-HTML pass. |
| S0006-EV12 | S0006-A11 | 2026-09-17 | T17.1 | D1 feature-health telemetry tied to user-visible success | DIAGNOSTIC | NONE | 2 | Independently chose successful PDF downloads falling from 96% to 72% as the strongest signal because it directly measures the feature's intended user outcome, rather than relying on an indirect JavaScript error rate. This completes the D1 feature-health telemetry distinction. |
| S0006-EV14 | S0006-A13 | 2026-09-17 | T09.1 | D1 primary bottleneck classification from supplied evidence | DIAGNOSTIC | NONE | 2 | Independently classified a page with finished network requests and a long continuous JavaScript calculation as a main-thread/rendering problem. The reason was corrected only to remove the unnecessary assumption that the calculation must be for display; the core classification was already sound. |
| S0006-EV15 | S0006-A15 | 2026-09-18 | X03.1 | D1 fallback UX for slow model latency after clarification | GUIDED | HINT | 1 | After the preceding ambiguous `product failure` attempt was invalidated and latency/fallback UX was explained, proposed a visible `taking longer than expected` status with choices to wait or recover. The AI cautioned that refresh could duplicate work. Correct fallback thinking is retained as assisted. |
| S0006-EV18 | S0006-A17 | 2026-09-18 | X07.2 | D1 bidirectional real-time data-flow facet | DIAGNOSTIC | NONE | 2 | Independently classified a collaborative canvas as two-way client↔server communication and explained that the client must transmit its own interactions while receiving other users' interactions. Transport choice, reconnect, missed updates, optimistic mutation queues, and conflicts remain unassessed. |
| S0007-EV01 | S0007-A01 | 2026-09-19 | X08.1 | D1 closure-instance and captured-state isolation facet | DIAGNOSTIC | NONE | 2 | In a valid TypeScript factory returning a closure, independently predicted `11`, `12`, `101` and explained that separate factory calls create separate instances/state. The AI then supplied the more precise lexical-environment terminology. Preserve the independent closure/state reasoning; `this`, promise ordering, async error propagation, TypeScript utility typing, and same-call shared-environment breadth remain unverified. Code was read only; nothing executed. |

### 0.5.1 Attempt status register

Attempt disposition is not a score. Preserve one row for every issued assessment task, including unanswered and superseded tasks, so its ID cannot be lost or reused. States: PENDING, PARTIAL, COMPLETED, DECLINED, SUPERSEDED, INVALIDATED. COMPLETED may contain gaps or assistance. A replacement task gets a new ID; a neutral clarification of the same task does not. Never store the actual prompt, input, answer, or solution here.

| Attempt | Issuing session / date | Recorded scope | Disposition | Evidence retained | Continuation / replacement |
|---|---|---|---|---|---|
| S0004-A02 | S0004 / 2026-09-15 | T01.2 D1 problem framing and assumption validation | COMPLETED; independent | S0004-EV03 | T01 sweep obligation resolved |
| S0004-A03 | S0004 / 2026-09-15 | T04.2 D1 event target and propagation | COMPLETED; initial gap then guided repair | S0004-EV04, S0004-EV05 | T04 sweep obligation resolved; fresh independent check later |
| S0004-A05 | S0004 / 2026-09-15 | T10.1 D1 stable feature-level API boundary | COMPLETED; independent | S0004-EV07 | T10 sweep obligation resolved |
| S0004-A06 | S0004 / 2026-09-15 | T13.1 D1 test-layer selection | COMPLETED; independent | S0004-EV08 | T13 sweep obligation resolved |
| S0004-A08 | S0004 / 2026-09-15 | Prompt incorrectly labelled T18 but actually about filename-extension trust for uploaded files | INVALIDATED; assistant objective-scope error, no learner failure and no transfer credit | None | Replaced by correctly scoped T18 attempt S0004-A09 |
| S0004-A09 | S0004 / 2026-09-15 | T18.1 D1 user-visible pending and error states | COMPLETED; independent partial facets | S0004-EV10 | T18 sweep obligation resolved; broader state-model scope remains G0030 |
| S0004-A10 | S0004 / 2026-09-15 | T20.1/T20.4 D1 treatment and verification of an AI repository claim | COMPLETED; mixed outcome | S0004-EV11, S0004-EV12 | T20 sweep obligation resolved; T20.4 gap G0031 queued |
| S0004-A12 | S0004 / 2026-09-15 | Prompt incorrectly labelled T02 but actually about over-fetching unnecessary account data | INVALIDATED; assistant objective-scope error, no learner failure and no transfer credit | None | Replaced by correctly scoped T02 attempt S0004-A13 |
| S0004-A13 | S0004 / 2026-09-15 | T02.1 D1 operational outcome-metric definition for caption-creation time | PENDING; corrected prompt issued, no learner answer before explicit stop | None | On S0005, continue only if the prompt is visible; otherwise issue a fresh same-scope task and then supersede only this unfinished scope |

| S0005-A01 | S0005 / 2026-09-16 | T02.1 outcome metric plus T02.4 randomization/noise reasoning; fresh replacement for S0004-A13 | COMPLETED; independent partial facets | S0005-EV01, S0005-EV02 | T02 sweep obligation resolved; S0004-A13 is superseded without failure |
| S0005-A02 | S0005 / 2026-09-16 | T05.2 D1 source-of-truth versus derived state | COMPLETED; guided after focused sync-failure prompt | S0005-EV03 | T05 sweep obligation resolved; fresh independent check later |
| S0005-A04 | S0005 / 2026-09-16 | T06.4 D1 stale-response overwrite risk; assistant labelled it T11 in chat | COMPLETED; independent D1 checkpoint under corrected objective | S0005-EV05 | T06 sweep obligation resolved; does not count as a T11 visit |
| S0005-A05 | S0005 / 2026-09-16 | T14.1 D1 entry-point mapping in an unfamiliar repository | COMPLETED; independent partial facet | S0005-EV06 | T14 sweep obligation resolved |
| S0005-A07 | S0005 / 2026-09-16 | T19.3 initial vertical-slice A/B prompt | INVALIDATED for independence; assistant supplied which option matched breadth-first before learner answered | None | Replaced by changed-context A08; prior teaching still limits independence |
| S0005-A08 | S0005 / 2026-09-16 | T19.3 D1 changed-context vertical-slice choice | COMPLETED; correct but solution-exposed | S0005-EV08 | T19 sweep obligation resolved; verify independently later |
| S0005-A09 | S0005 / 2026-09-16 | T06.1 D1 client-side versus authoritative server validation | COMPLETED; independent narrow facet | S0005-EV09 | Extra second T06 visit in W0 due assistant scheduling drift; valid evidence retained without a second roster count |
| S0005-A11 | S0005 / 2026-09-16 | T12.1 single `paid` boolean without an explicit recurring-subscription model | INVALIDATED; material business-model assumption omitted, no learner failure | None | Corrected recurring monthly/grace-period task issued as A12 |
| S0005-A12 | S0005 / 2026-09-16 | T12.1 D1 recurring subscription and grace-period entitlement state | COMPLETED; independent partial facet | S0005-EV11 | T12 sweep obligation resolved |
| S0005-A13 | S0005 / 2026-09-16 | T15.1 D1 code-review risk identification on a permission-related diff | SUPERSEDED in S0006 only after fresh same-scope S0006-A01 was issued; no learner failure | None | Replacement S0006-A01 completed the W0 T15 visit; preserve this unanswered history without scoring it |

| S0006-A01 | S0006 / 2026-09-17 | T15.1 D1 supplied-diff risk identification; fresh replacement for unavailable S0005-A13 prompt | COMPLETED; independent permission-risk facet | S0006-EV01 | T15 W0 visit resolved; S0005-A13 is superseded only because this fresh same-scope task was actually issued |
| S0006-A03 | S0006 / 2026-09-17 | T06.1 D1 client-only validation bypass, accidentally issued while T11 was scheduled | COMPLETED; valid incidental T06.1 evidence, assistant scheduling drift | S0006-EV03 | Does not count as T11 or as a second T06 W0 roster visit; actual T11 is A04 |
| S0006-A04 | S0006 / 2026-09-17 | T11.1 D1 auth/session/authorization/membership/entitlement distinction | COMPLETED; independent D1 checkpoint | S0006-EV04 | T11 W0 visit resolved; review due 2026-09-21 |
| S0006-A05 | S0006 / 2026-09-17 | T03.1 D1 first end-to-end vertical slice and next-slice reasoning | COMPLETED; initial slice assisted, later revocation/risk facets independent | S0006-EV05 | T03 W0 visit resolved; independent vertical-slice formulation remains G0040 |
| S0006-A07 | S0006 / 2026-09-17 | T07.1 D1 client/server/cache state distinction and stale-copy consequence | COMPLETED; terminology taught before application | S0006-EV07 | T07 W0 visit resolved; fresh independent taxonomy check later |
| S0006-A08 | S0006 / 2026-09-17 | T16.1 D1 deploy-versus-release distinction | COMPLETED; independent distinction, incomplete risk facet | S0006-EV08 | T16 W0 visit resolved; G0042 remains |
| S0006-A10 | S0006 / 2026-09-17 | T08.1/T08.2 D1 semantic control and keyboard operation | COMPLETED; independent keyboard concern, semantic/focus correction taught | S0006-EV10, S0006-EV11 | T08 W0 visit resolved; G0043/G0044 remain |
| S0006-A11 | S0006 / 2026-09-17 | T17.1 D1 feature-level health telemetry tied to user success | COMPLETED; independent D1 checkpoint | S0006-EV12 | T17 W0 visit resolved; review due 2026-09-21 |
| S0006-A13 | S0006 / 2026-09-17 | T09.1 D1 performance-bottleneck classification | COMPLETED; independent D1 checkpoint | S0006-EV14 | T09 W0 visit resolved; review due 2026-09-21 |
| S0006-A14 | S0006 / 2026-09-17 | X03.1 D1 whether a correct-but-slow AI generation is a `product failure` | INVALIDATED; assistant wording was ambiguous between model/output failure and UX/reliability failure | None | No learner failure. Fresh fallback-UX scope issued as A15 |
| S0006-A15 | S0006 / 2026-09-18 | X03.1 D1 fallback UX for slow model latency | COMPLETED; correct after latency/fallback concept teaching | S0006-EV15 | X03 W0 visit resolved; G0045 remains for fresh independent failure-mode/latency-budget reasoning |
| S0006-A17 | S0006 / 2026-09-18 | X07.2 D1 directionality of collaborative real-time client/server flow | COMPLETED; independent narrow facet | S0006-EV18 | X07 W0 visit resolved; broader transport/reconnect/conflict scope remains G0046 |
| S0006-A18 | S0006 / 2026-09-18 | X08.1 D1 closure/runtime explanation, issued with an untyped JavaScript snippet | SUPERSEDED in S0007 only after fresh same-scope S0007-A01 was issued; no learner failure | None | S0007-A01 completed the X08 W0 visit under the TypeScript practice policy |
| S0007-A01 | S0007 / 2026-09-19 | X08.1 D1 closure-instance/captured-state behavior in TypeScript; fresh replacement for S0006-A18 | COMPLETED; independent narrow closure facet | S0007-EV01 | X08 W0 visit resolved; remaining X08.1 runtime families stay unknown |
| S0007-A02 | S0007 / 2026-09-19 | X08.1 closure sharing follow-up that used prefix increment `++x` and implicit-return syntax | INVALIDATED for checkpoint scoring; uncommon syntax unnecessarily confounded the closure concept | None | No learner failure or syntax gap. DEC0027 now requires common idiomatic forms unless unusual syntax is itself the objective |

### 0.6 Facet gaps, unknowns, and dependencies

A facet is a narrower component of an existing objective, not a new curriculum objective. Store what is already known as well as what remains. Kinds: `UNKNOWN_SCOPE`, `CONCEPT`, `SELECTION`, `ARTIFACT`, `IMPLEMENTATION`, `PRODUCT_JUDGMENT`, `EDGE_CASE`, `PLATFORM_SEMANTICS`, `COMMUNICATION`, `RETENTION`, or `DEPENDENCY`. Status: `OPEN`, `IN_REPAIR`, `BLOCKED`, `CARRYOVER`, or `CLOSED`. Gap IDs use `G0001`. A queued gap is not a formal carryover and does not bypass a tier gate. Give independently closable depths separate records. Closing a D1 gap cannot close its D2 sibling, and an open D2-only gap cannot block Tier 1. Reconcile stale OPEN records with resolving evidence before a gate decision.

| Gap ID | Objective / checkpoint | Kind | Demonstrated facets to preserve | Missing or uncertain facet | Evidence refs | Status | Minimal repair / independent exit check | Revisit trigger |
|---|---|---|---|---|---|---|---|---|
| G0029 | T04.2 / D1 | PLATFORM_SEMANTICS | After instruction, correctly distinguishes target-first bubbling from outer-to-target capture | Default click propagation was initially reversed; independent event-target/bubbling reasoning and default-action interaction still need a fresh check | S0004-EV04, S0004-EV05 | OPEN | Use a materially changed DOM interaction with no propagation-direction hint; ask only for target/order/default effect at D1 | Tier 1 REPAIR_VERIFY after the W0 sweep |
| G0030 | T18.1 / D1 | UNKNOWN_SCOPE | Independently identifies loading/pending and explicit failure states for a slow/failing request | Broader applicable state-model reasoning (for example success, empty, partial, unavailable, or permission-constrained states) was not sampled; absence of those facets is unknown, not failure | S0004-EV10 | OPEN | In Tier 1 REPAIR_VERIFY, probe a different feature and ask for the relevant state model without listing the states in advance | After the W0 sweep |
| G0031 | T20.4 / D1 | CONCEPT | Independently insists on checking an AI repository claim with IDE/reference evidence | Overstated the certainty of IDE/reference search; needs independent recognition that verification tools have scope/index/dynamic-use limits and may need corroborating code/tests/runtime evidence | S0004-EV12 | OPEN | Fresh D1 claim-verification scenario with incomplete tooling evidence; withhold the missing-evidence cue | Tier 1 REPAIR_VERIFY after the W0 sweep |

| G0032 | T02.1 / D1 | UNKNOWN_SCOPE | Independently defined a measurable outcome metric and identified a major noise source/comparability tradeoff | Guardrail metric(s) and the full operational metric contract remain unverified | S0005-EV01 | OPEN | Later ask only for a guardrail and any remaining operational definition without redoing the outcome metric | Tier 1 REPAIR_VERIFY after W0 |
| G0033 | T02.4 / D1 | UNKNOWN_SCOPE | Understands that random assignment tends to balance unrelated distractions without requiring a normal distribution | Hypothesis, randomization unit, treatment/control definition, and major validity risks remain unverified | S0005-EV02 | OPEN | Probe the missing experiment-design facets later; do not repeat the noise-balancing explanation | Tier 1 REPAIR_VERIFY after W0 |
| G0034 | T05.2 / D1 | CONCEPT | Correctly recognized out-of-sync duplicated state once the failure mode was isolated; proposed deriving subtotal and understood memoization as cache rather than a second source of truth | Independent source-of-truth/derived-state identification before the failure mode is supplied remains unverified | S0005-EV03 | OPEN | Fresh D1 state-model critique with no sync-bug hint | Tier 1 REPAIR_VERIFY after W0 |
| G0035 | T14.1 / D1 | UNKNOWN_SCOPE | Independently chooses a feature entry point rather than linear repository reading | Data flow, relevant tests, and boundary mapping remain unverified | S0005-EV06 | OPEN | Fresh unfamiliar-feature map asking for the next two evidence sources after the entry point | Tier 1 REPAIR_VERIFY after W0 |
| G0036 | T19.3 / D1 | CONCEPT | Correctly applies a thin end-to-end slice to test the real workflow first | The vertical-slice criterion was explicitly supplied immediately beforehand; independent risk/value selection remains unverified | S0005-EV08 | OPEN | Later use a materially different feature and withhold the thin-slice criterion | Tier 1 REPAIR_VERIFY after W0 |
| G0037 | T06.1 / D1 | UNKNOWN_SCOPE | Independently distinguishes client convenience validation from authoritative server validation | Broader form value, validation, and submission-state model remains unverified | S0005-EV09 | OPEN | Probe only the remaining form/submission-state facets; do not repeat the server-authority explanation | Tier 1 REPAIR_VERIFY after W0 |
| G0038 | T12.1 / D1 | UNKNOWN_SCOPE | Under explicit recurring-subscription assumptions, independently models grace-period status and expiry beyond one boolean | Broader subscription/plan/entitlement lifecycle and mapping to authoritative commercial state remain unverified | S0005-EV11 | OPEN | Probe a different lifecycle transition or plan/entitlement distinction with assumptions stated explicitly | Tier 1 REPAIR_VERIFY after W0 |
| G0039 | T15.1 / D1 | UNKNOWN_SCOPE | Independently identifies a material server-side permission regression and explains why hidden UI is not authorization | Other major review-risk categories and prioritization breadth within T15.1 were not sampled; inline callback syntax was teaching only | S0006-EV01 | OPEN | Later use a materially different supplied change and probe only remaining D1 risk-identification breadth | Tier 1 REPAIR_VERIFY after W0 |
| G0040 | T03.1 / D1 | CONCEPT | Revocation as a second slice and link-tampering risk were raised independently | First complete vertical slice needed assistance because owner-side share-link creation was omitted | S0006-EV05 | OPEN | Fresh feature, withhold vertical-slice criterion, ask for one smallest end-to-end slice | Tier 1 REPAIR_VERIFY after W0 |
| G0041 | T07.1 / D1 | UNKNOWN_SCOPE | After terminology teaching, correctly classifies ephemeral UI, durable server, and client-cached server state; independently identifies stale cache and cache update after success | Independent state-category distinction before labels/examples are supplied remains unverified | S0006-EV07 | OPEN | Fresh D1 state-classification scenario without defining the categories in the prompt | Tier 1 REPAIR_VERIFY after W0 |
| G0042 | T16.1 / D1 | UNKNOWN_SCOPE | Independently distinguishes deployed code from a released user-visible capability under a feature flag | Why/when decoupling deploy from release reduces risk remains unverified | S0006-EV08 | OPEN | Later ask for the risk-reduction purpose in a different release scenario without restating the answer | Tier 1 REPAIR_VERIFY after W0 |
| G0043 | T08.1 / D1 | PLATFORM_SEMANTICS | Correctly understands after teaching that a native button supplies appropriate interactive semantics/focusability | Independent semantic-element selection and accessible-name/relationship reasoning remain unverified | S0006-EV11 | OPEN | Fresh control-markup critique with no element recommendation supplied | Tier 1 REPAIR_VERIFY after W0 |
| G0044 | T08.2 / D1 | PLATFORM_SEMANTICS | Independently focuses on keyboard Tab/activation needs; later correctly restates that a plain div is not normally tabbable after teaching | Independent focus-order/visible-focus/unreachable-control reasoning remains incomplete | S0006-EV10, S0006-EV11 | OPEN | Fresh keyboard-only interaction trace without teaching focusability first | Tier 1 REPAIR_VERIFY after W0 |
| G0045 | X03.1 / D1 | CONCEPT | Correctly proposes visible slow-request status and wait/recovery options after latency/fallback UX explanation | Independent identification of model/product failure modes, latency budget breach, cost tradeoff, and fallback choice remains unverified; A14 ambiguity is no learner failure | S0006-EV15; S0006-A14 invalidated | OPEN | Fresh AI-feature scenario with explicit latency requirement and unambiguous failure criterion; withhold fallback answer | Tier 1 REPAIR_VERIFY after W0 |
| G0046 | X07.2 / D1 | UNKNOWN_SCOPE | Independently recognizes collaborative canvas communication as bidirectional and explains send-own/receive-others flow | Transport choice, reconnection/missed updates, optimistic mutation queue, and conflict-handling concepts remain unverified | S0006-EV18 | OPEN | Later probe one labelled real-time mechanism or reconnect boundary at D1 without requiring algorithm implementation | Tier 1 REPAIR_VERIFY after W0 |
| G0048 | X08.1 / D1 | UNKNOWN_SCOPE | Independently predicts separate closure state for separate factory calls and explains that each factory call creates distinct captured state | Remaining D1 runtime families are unverified: same-call closure sharing, `this` binding, promise/queued-work ordering, async error propagation, and relevant TypeScript typing. The S0007 `++x` confusion is excluded because the follow-up used uncommon incidental syntax rather than the target concept | S0007-EV01; S0007-A02 invalidated | OPEN | In Tier 1 REPAIR_VERIFY, probe one or more remaining runtime families using ordinary idiomatic TypeScript. Do not use prefix increment or other uncommon syntax unless that syntax is explicitly the target | After W0; preserve closure-instance facet |

### 0.7 Topic transfer and retention

An objective-level skip is independent of the topic-level transfer gate. Only call a topic `SKIP_ALL_INSTRUCTION` when all five objectives meet target and a qualifying changed-context transfer succeeds. New transfer diagnostics normally wait for Tier 4. Status codes: U (unknown), G (partial/assisted or observed gap), P (complete independent coverage), R (previous pass contradicted).

| Topic | Transfer status | Transfer evidence / covered scope | Delayed review status | Review evidence / due |
|---|---|---|---|---|
| T01 | U | — | U | — |
| T02 | U | — | U | — |
| T03 | U | — | U | — |
| T04 | U | — | U | — |
| T05 | U | — | U | — |
| T06 | U | — | U | — |
| T07 | U | — | U | — |
| T08 | U | — | U | — |
| T09 | U | — | U | — |
| T10 | U | — | U | — |
| T11 | U | — | U | — |
| T12 | U | — | U | — |
| T13 | U | — | U | — |
| T14 | U | — | U | — |
| T15 | U | — | U | — |
| T16 | U | — | U | — |
| T17 | U | — | U | — |
| T18 | U | — | U | — |
| T19 | U | — | U | — |
| T20 | U | — | U | — |
| X03 | — (no separate transfer gate; adaptation is covered by X03.3 at D4) | — | U | — |
| X07 | — (no separate transfer gate; adaptation is covered by X07.3 at D4) | — | U | — |
| X08 | — (no separate transfer gate) | — | U | — |
| X09 | — (no separate transfer gate) | — | U | — |

### 0.8 Integration coverage

These are coverage areas, not a question list. Register partial demonstrated combinations instead of inferring every component from one mixed attempt. I06 accumulates across attempts.

| Area | Scope | Status | Evidence refs / covered components | Remaining coverage / next action |
|---|---|---|---|---|
| I01 | ACTIVE | U | — | End-to-end feature slice |
| I02 | ACTIVE | U | — | Unfamiliar codebase change |
| I03 | ACTIVE | U | — | Frontend-heavy interactive feature |
| I04 | NOT_SELECTED | U | — | B2B SaaS permissions and commercial state; deselected by DEC0018 for consumer and creative targets |
| I05 | ACTIVE | U | — | Product-sense-to-implementation trade-off |
| I06 | ACTIVE | U | — | Production issue after release |
| I07 | NOT_SELECTED | U | — | Measured product iteration; select for product-led or growth targets |

### 0.8.1 Environment-backed verification

These items record skills that text chat cannot fully verify. They are reported under `PRACTICAL_ENVIRONMENT_VERIFIED` (Section 6.4) and never block a tier gate or convert a chat pass into a runtime claim. Status: U (not observed), G (partially observed), P (observed in a real environment with the learner's own work, described with what was run). Evidence from a learner's description of work done outside chat is REPORTED_EXPOSURE unless the relevant output (logs, test results, screenshots described by the learner, or a shared file) is reviewed.

| Item | Skill needing a real environment | Related objectives | Status | Evidence refs | Notes |
|---|---|---|---|---|---|
| ENV01 | Keyboard, focus, screen-reader, and rendered-layout checks in a browser | T06.5, T08.1–T08.3, T08.5, X08.3 | U | — | — |
| ENV02 | Browser performance profiling and field/lab metric measurement | T09.1, T09.3–T09.5 | U | — | — |
| ENV03 | Navigating and reproducing a bug in a real repository | T14.1–T14.5, I02 | U | — | — |
| ENV04 | Building and running a small full-stack feature or timed UI component | T19.1, T19.3, X08.3, I01, I03 | U | — | — |
| ENV05 | Steering an AI coding tool in a real repository and verifying its output | T20.1, T20.2, T20.4 | U | — | — |
| ENV06 | Writing and executing tests, including end-to-end tests | T13.1–T13.4 | U | — | — |

### 0.9 Scope decisions, carryovers, and scheduling exceptions

Keep distinct: a verified skip saves instruction; a temporary carryover postpones an unresolved checkpoint; an exclusion removes scope only by an explicit learner decision. Never count the latter two as mastery. Policy and file-workflow decisions are not learning evidence.

| Decision ID | Date / session | Type | Affected scope / depth | Reason and authority | Revisit / expiry | Status |
|---|---|---|---|---|---|---|
| DEC0001 | 2026-09-15 / structural | LEARNING_POLICY | All 20 topics and 100 objectives | Learner requested a product engineering roadmap whose breadth-first harness and learning philosophy match the companion Python and system-design roadmaps: easiest diagnostics across all topics first, then gap repairs, then the next harder tier, with strict tier gates | Persistent until explicitly changed by learner; no tier-bypass permission inferred | ACTIVE |
| DEC0002 | 2026-09-15 / structural | FILE_WORKFLOW | Entire canonical Markdown source | Same workflow as the companion roadmaps: learner keeps the download locally and uploads it on new sessions; AI returns a complete replacement on request or wrap-up | Persistent until learner changes storage workflow | ACTIVE |
| DEC0003 | 2026-09-15 / structural | SCOPE_DEFAULT | Target depths, priorities, extensions, I07 | Level, stack, company type, and AI policy were unconfirmed. Adopted profile MID_GENERALIST_WEB: research-recommended depths with level-conditional objectives set to their non-senior value; X01–X06 and I07 not selected | Revised by DEC0006–DEC0009; the MID default depths remain in force | REVISED |
| DEC0004 | 2026-09-15 / structural | CROSS_ROADMAP_BOUNDARY | All cross-references to companion roadmaps | Algorithm and backend-mechanism content stays in the companion roadmaps. Companion statuses are never imported as passes here (Section 1.7) | Persistent | ACTIVE |
| DEC0005 | 2026-09-15 / structural | ASSESSMENT_BOUNDARY | All objectives with environment-only facets | Chat passes certify the chat projection only; runtime, rendering, profiling, and repository-navigation evidence is tracked in 0.8.1 and not gated | Persistent unless the learner selects environment-backed study as required scope | ACTIVE |
| DEC0006 | 2026-09-15 / administrative | LEVEL_PROFILE | All core target depths | Learner supplied work history (about 3.5 years professional software and data engineering). MID level confirmed; SENIOR overlay not applied. Default target counts unchanged | Revisit if the learner targets senior roles or gains relevant experience; adding SENIOR follows the backfill rule | ACTIVE |
| DEC0007 | 2026-09-15 / administrative | OVERLAY | T12 and T20 priority | Learner wanted customer-facing, revenue-affecting product work and accepted AI_EXPECTED (T20 priority P0) and B2B_SAAS (T12 priority P0). Senior-only D4 changes did not apply at MID | B2B_SAAS part revised by DEC0018; AI_EXPECTED remains in force | REVISED |
| DEC0008 | 2026-09-15 / administrative | EXTENSION_SELECTION | X03.1–X03.3 | Select X03 LLM-powered product features at default targets D3/D3/D4. Adds X03 to the Tier 1 roster (last position) and 10 checkpoints: +3 D1, +3 D2, +3 D3, +1 D4. X03 has no separate topic-transfer requirement; X03.3 at D4 covers adaptation. X05 was recommended by B2B_SAAS but not selected to keep scope focused | Revisit if target roles are integration-heavy enterprise SaaS (consider X05) or growth teams (consider X02) | ACTIVE |
| DEC0009 | 2026-09-15 / administrative | STACK | All code-writing probes from Tier 2 onward | TypeScript and React for UI; Python for server code, matching the learner's Django experience and the companion Python roadmap. Concepts stay framework-neutral; framework APIs are examples | Revisit if target companies are predominantly TypeScript end to end | ACTIVE |
| DEC0018 | 2026-09-15 / administrative (merged file) | OVERLAY_AND_INTEGRATION | T04.4, T07.5, T09, T09.3, T12, I04 | Career target changed from B2B SaaS to consumer, creative, and AI product companies (shared DEC0017). Replace B2B_SAAS with FRONTEND_HEAVY per Section 2.4: T04.4 D2→D3, T09.3 D2→D3, T07.5 D3→D4, T09 priority P0; T12 back to P1. I04 deselected; Tier 4 and INTERVIEW_PRACTICE_VERIFIED now require I01–I03, I05, I06. No study had occurred, so no gate reopens | Revisit if targets move back toward B2B SaaS (restore B2B_SAAS and I04) | ACTIVE |
| DEC0021 | 2026-09-15 / administrative (merged file) | CURRICULUM_EXTENSION | New X07, X08, X09 (9 objectives); PE curriculum Section 9 and sources | Both supplied interview-loop research reports identified gaps the core does not state explicitly: dedicated frontend system design delivery including real-time and large-content rendering (X07); timed vanilla JavaScript/TypeScript UI coding separate from Python algorithm rounds (X08); and project deep-dive and behavioral narratives, which appear in nearly every loop and matter for a domain change (X09). Added as curriculum extensions with a recomputed PE curriculum digest, and selected at default targets: +9 D1, +9 D2, +9 D3, +1 D4 (337 active). Appended to the Tier 1 roster after X03. Core objectives unchanged | Revisit if target loops confirm no UI coding round (X08) or no deep-dive round (X09) | ACTIVE |

### 0.10 Session, wave, and phase history

One session row per actual study session. A save is not a new study session. A lap may cross several sessions. An unanswered prompt is not a failed attempt.

| Session | Date | Wave / lap / tier phase | Primary topics / objectives | Evidence IDs and concise outcome | Next handoff |
|---|---|---|---|---|---|
| S0004 | 2026-09-15; CLOSED by explicit stop/save | W0 / L01 / Tier 1 DIAGNOSE_ALL | Completed primary visits T01, T04, T10, T13, T18, T20; T02 corrected prompt issued but unanswered. Wrong-scope A08/A12 invalidated. | S0004-EV03–EV05, EV07–EV08, EV10–EV12. Four D1 passes (T01.2, T10.1, T13.1, T20.1); T04.2 guided repair; T18.1 partial independent states; T20.4 partial with certainty gap | S0005: resume/replace T02.1 first, then T05; preserve 6/24 sampled and do not repeat completed W0 visits |
| S0005 | 2026-09-16; CLOSED by explicit stop/save | W0 / L01 / Tier 1 DIAGNOSE_ALL | Completed visits T02, T05, T06, T14, T19, T12; T15 issued unanswered. T06 got one extra same-topic probe due assistant scheduling drift; a task labelled T11 was correctly remapped to T06.4. | S0005-EV01–EV03, EV05–EV06, EV08–EV09, EV11. T06.4 D1 passed; other new evidence is partial/assisted. T12 A11 invalidated for unstated subscription assumptions. | S0006: pending T15 first, then T11; 12/24 sampled |
| S0006 | 2026-09-17–2026-09-18; CLOSED by explicit save/update | W0 / L01 / Tier 1 DIAGNOSE_ALL | Completed visits T15, T11, T03, T07, T16, T08, T17, T09, X03, X07; X08 issued unanswered. One incidental T06 validation task did not count as a roster visit. X03 A14 invalidated for ambiguous failure wording. | S0006-EV01, EV03–EV05, EV07–EV08, EV10–EV12, EV14–EV15, EV18. D1 passes at T11.1, T09.1, T17.1; other new evidence partial/assisted. | S0007: replace pending X08 with TypeScript same-scope work, honor due reviews, then finish X09; 22/24 sampled |
| S0007 | 2026-09-19; OPEN at mid-session save | W0 / L01 / Tier 1 DIAGNOSE_ALL | Completed the X08 primary visit with a TypeScript closure task. A01 retained independent closure-state evidence; A02 was invalidated because prefix increment `++x` unnecessarily confounded the closure objective. | S0007-EV01. X08 sampled; no full X08.1 D1 pass. | Follow shared ratio/reviews, then sample X09; 23/24 sampled |

| Wave | Tier / phase meaning | Status | Verified coverage / exit evidence | Unresolved work | Next revisit |
|---|---|---|---|---|---|
| W0 | Tier 1 DIAGNOSE_ALL | IN_PROGRESS | 23/24 roster entries sampled; X08 sampled; X09 unvisited | One unresolved sweep obligation remains | After due-review scheduling, sample X09 |
| W1 | Tier 1 REPAIR_VERIFY | LOCKED | 8/112 D1 already verified during diagnostics; W1 itself not opened | Remaining D1 scope and G0029–G0046 | After all 24 W0 sweep obligations resolve |
| W2 | Tier 2 DIAGNOSE_ALL, then REPAIR_VERIFY | LOCKED | 0/112 D2 | Full tier sweep and D2 scope | After Tier 1 is CLEARED |
| W3 | Tier 3 DIAGNOSE_ALL, then REPAIR_VERIFY | LOCKED | 0/107 D3 | Full tier sweep and D3 scope | After Tier 2 is CLEARED |
| W4 | Tier 4 DIAGNOSE_ALL, then REPAIR_VERIFY | LOCKED | 0/6 D4; 0/20 transfers; 0/5 integration areas | Adaptation, transfer, and integration | After Tier 3 is CLEARED |

### 0.11 Revision and migration history

| Revision | Date | Change | Learning credit |
|---|---|---|---|
| 1 | 2026-09-15 | Initial generation. Curriculum 1.0 on the companion tracking schema 3.1. Scope derived from a supplied deep-research coverage specification (20 topics, 100 objectives, I01–I07, X01–X06) plus additional checks of PostHog's product-engineer handbook and hiring pages and secondary sources on Meta's product-architecture round. Level-conditional depths resolved to the MID_GENERALIST_WEB default | None |
| 2 | 2026-09-15 | Profile and scope decisions from the learner's work history and career goal: MID level, AI_EXPECTED and B2B_SAAS overlays, X03 selected, TypeScript/React plus Python stack. Added X03 ledger, board, and roster entries and updated all denominators (306 active checkpoints). Curriculum block and operating contract unchanged; contact details deliberately not stored | None; background recorded as reported exposure only |
| Merge 1 | 2026-09-15 | Track moved into merged file `interview_prep_roadmap` revision 1 as track PE. Curriculum bytes unchanged (digest verified); progress block unchanged except shared-counter pointers and this row. Section 1.7's Python-roadmap boundary now applies to track PY, relaxed only by merged Section M4 combined tasks | None |
| Merged r4 | 2026-09-15 | DEC0018 FRONTEND_HEAVY replaces B2B_SAAS and I04 is deselected; DEC0021 adds and selects X07–X09 (curriculum digest recomputed). 337 active checkpoints. Administrative, no study | None |
| Merged r5 | 2026-09-15 | Audit corrections: curriculum tier and readiness wording generalized from fixed default counts and I01–I06 to active targets and selected integration areas (digest recomputed); Tier 4 sweep obligations corrected to 22; X08.3 linked to ENV01 and ENV04. No scope, target, or evidence change | None |
| Merged r6 | 2026-09-15 | S0004 first PE study session inside the merged roadmap. Six W0 topics sampled, two wrong-scope prompts invalidated, T02 left pending, and shared DEC0023 added to prevent objective mismatch, answer leakage, and filler checks. Curriculum unchanged. | D1 passes at T01.2, T10.1, T13.1, T20.1; additional partial/assisted evidence at T04.2, T18.1, T20.4. No higher-tier, transfer, integration, environment, or retention pass. |
| Merged r7 | 2026-09-16 | S0005 sampled six more PE W0 topics and left T15 pending. Shared DEC0024 records the T11/T06 scope-label correction and invalidates the underspecified T12 boolean prompt. Curriculum unchanged. | T06.4 D1 passed; partial or assisted evidence added at T02.1/T02.4, T05.2, T06.1, T12.1, T14.1, and T19.3. No higher-tier, transfer, integration, environment, or retention pass. |
| Merged r8 | 2026-09-18 | S0006 sampled ten more PE W0 topics, leaving X08 pending and X09 unvisited. Shared DEC0025 sets TypeScript+Python practice format; DEC0026 records prompt/scheduler corrections. Save audit reconciled the already-earned T06.4 pass into the PE dashboard/ledger. Curriculum unchanged. | New D1 passes at T11.1, T09.1, and T17.1; narrower/assisted evidence at T15.1, T03.1, T07.1, T16.1, T08.1/T08.2, X03.1, and X07.2. No higher-tier, transfer, integration, environment, or retention pass. |
| Merged r9 | 2026-09-19 | Mid-session S0007 save: X08 W0 visit completed using TypeScript; S0006-A18 superseded after fresh replacement. Shared DEC0027 adds the common-idiom practice rule and invalidates the incidental `++x` closure follow-up as an assistant-side confound. Curriculum unchanged. | New independent narrow X08.1 closure-instance/state facet S0007-EV01; no full X08.1 D1 pass and no learner gap from uncommon increment syntax. |

**Source provenance note:** Employer and documentation references in Section 11 were reported by the supplied research specification as accessed on 2026-09-15. PostHog sources [27]–[30] and [59] and the secondary Meta sources [31]–[32] were checked directly during generation; the others were not independently re-fetched. Job postings are snapshots and may close.

**AI handoff summary:** PE remains in Tier 1 DIAGNOSE_ALL with 23/24 roster entries sampled and 8/112 D1 passes. S0007 completed the X08 W0 visit: preserve independent closure-instance/state reasoning from S0007-EV01, and do not score the invalidated `++x` detour as a learner gap. X09 is the only unvisited W0 topic. Shared DEC0025 requires TypeScript frontend/runtime practice and Python backend/algorithm practice; shared DEC0027 additionally requires common idiomatic forms unless unusual syntax is itself relevant. Follow due-review and 1:2 scheduling before X09.

<!-- END PE_PROGRESS -->

<!-- BEGIN PE_CURRICULUM -->


## 1. Role scope, evidence, and interview formats

### 1.1 What product engineering means here

**Definition used by this roadmap.** Product engineering is software engineering organized around owning product outcomes end to end: turning an incompletely specified user or business problem into a scoped experience, implementing the client and server changes it needs, shipping safely, observing what happened, and iterating. It is not limited to companies that sell software. B2B SaaS makes the work especially visible because of permissions, billing, integrations, and customer contact, but the same role family appears in consumer products, marketplaces, AI products, and internal tools [6][8][5]. PostHog frames product engineers as engineers who talk to users, decide what to build, and own product decisions, and treats the title as a mindset as much as a job label [27][28].

**Boundary for preparation.** Use ownership breadth and product judgment as the category boundary, not the literal title. "Full-stack" names technical layer breadth; "product engineer" adds ownership of ambiguity and outcomes. The explicit title is a weak signal about stack: OpenAI's Product Engineer, Cyber role is backend-leaning, while Granola and others advertise full-stack variants [2][3]. Select depth from the actual role description.

### 1.2 Evidence labels and role families

| Label | Meaning |
|---|---|
| **A — documented** | An employer's own statement about its role, interview, or hiring expectations. A job description establishes responsibilities, not interview format. Technical documentation grounds a recommendation but does not make it an employer scoring rule |
| **B — recommendation** | A learning priority, depth target, scope boundary, prerequisite, or practice emphasis inferred from the evidence |
| **C — constructed** | A generic practice or probe form generated for study (for example, "critique a supplied component"). Never presented as a real employer question |
| **Secondary** | Practitioner or interview-prep material, including former interviewers. Used only to corroborate patterns where no employer source was found; never labelled A |

| Role variant | Primary scope | What transfers from the core | Additional preparation | Evidence |
|---|---|---|---|---|
| Explicit Product Engineer | User or business problem through implementation, shipping, operation, and iteration; stack center varies | Nearly all core topics, especially T01, T03, T14, T16, T19 | Follow the listing's technical center of gravity | A [2][3][1][27] |
| SWE on a product team | Product features within a conventional SWE loop | Feature ownership, quality, UX, contracts | Keep algorithm and system-design preparation where the company uses its general loop | A [8][18][20] |
| Full-stack engineer | Client and server responsibility; does not by itself imply product autonomy | T04–T07, T10, T13, T14 | Chosen-stack fluency, cross-layer integration | A for breadth [7]; B for the autonomy distinction |
| Frontend engineer | UI architecture, interaction quality, accessibility, performance, frontend system design | T01, T13–T16, T18 | Deeper DOM/CSS, component architecture, frontend system design | A [17] |
| Growth engineer | Acquisition, activation, conversion, retention, onboarding | T01, T02, T16, T18 | Experiment design, funnel integrity, SEO where relevant (X02) | A [10] |
| Platform / infrastructure engineer | Internal capabilities that let others ship; not direct end-user feature ownership | T14–T17 | Mostly owned by the system-design roadmap | A [4] |
| Mobile product engineer | Product ownership on native or cross-platform clients | Product judgment, UI state, API use, testing, rollout | App lifecycle, offline state, store distribution, crash tooling (X01) | A/B |
| Forward-deployed engineer | Discovery, scoping, building, and deploying with specific customers | T01, T11, T12, T14 | Customer architecture, integration and security constraints (X05) | A [11] |
| Solutions engineer | Company-dependent; often evaluation, demos, integration, adoption | Product explanation, integration reasoning | GTM communication; less durable feature ownership | B; title semantics vary too much for a universal definition |
| AI engineer on LLM features | Model behavior, retrieval, tools, evaluation, cost and latency | Product framing, UX states, testing, metrics, rollout | Evaluation methodology, nondeterministic failure analysis (X03) | B [12] |

**B2B versus B2C.** Enterprise-oriented roles emphasize ambiguous business workflows, permissions, and safe rollout; consumer roles emphasize polished interaction, experimentation, and performance [6][7]. For B2B targets raise emphasis on T11, T12, and X05; for consumer targets raise T08, T09, T18, and consider X02.

### 1.3 Levels and default profile

| Level | Evidence-supported distinction | Recommended preparation depth (not an employer scoring rule) |
|---|---|---|
| Junior / early career | Microsoft's early-career guidance emphasizes base knowledge, critical thinking, problem solving, and learning ability [21] | D2 across P0 facets; D3 on routine implementation, debugging, testing, and scoping artifacts; D4 exceptional |
| Mid-level (default) | Amazon's SDE II guidance expects feature-lifecycle contribution, documentation of how software is built, tested, and operated, and trade-offs, with coding and design in the loop [19] | Default allocation in Section 2.4: D3 on most objectives, D4 on three adaptation objectives |
| Senior | Current product-minded senior roles describe ambiguous 0→1 ownership, product decisions, and cross-functional outcome responsibility [9][12] | Senior overlay in Section 2.4 plus at least one relevant extension |
| Staff / principal | Durable technical direction, reusable patterns, influence across teams; example role descriptions only | Senior overlay plus staff additions; do not equate staff readiness with harder frontend trivia |

**Default profile MID_GENERALIST_WEB.** Web-oriented, full-stack-leaning generalist at mid level, with no company-specific overlay. It exists so study can start before preferences are confirmed; it is not a claim about the learner's actual target.

**Experience boundary.** For project deep dives and senior preparation, separate "I built or operated this," "I contributed to this," and "I reasoned through this exercise." A strong chat exercise demonstrates reasoning, not delivery history. Never turn a constructed exercise into a fictional project story.

### 1.4 Interview-format map

No defensible frequency ranking exists in the evidence. The formats below guide coverage; specific prompts are generated in chat. A company's recruiter-provided loop always overrides this generic map for a real application.

| Format | Expected output and abilities | Modality | Applicability | Evidence |
|---|---|---|---|---|
| Practical feature build | A working feature or meaningful slice; requirement interpretation, prioritization, quality, explanation | Live pairing, project environment, or full work day | PE, full-stack, frontend; common at AI-native and product-led startups | A: Great Question uses a ~90-minute real-domain build with the candidate's AI tools [12]; PostHog's full-stack SuperDay builds a small backend-and-frontend service over a paid day, deliberately over-scoped to test prioritization [29][30] |
| Take-home plus review | Bounded artifact and defense of decisions | Asynchronous work, then discussion | PE and smaller companies | A: Plain lists take-home as one option [1]; Automattic uses realistic code tests before a paid trial [24][25] |
| Debugging / bug bash | Reproduce, localize, form hypotheses, minimal fix, verify | Live pairing in an existing codebase | Broadly transferable | A: Stripe documented a Bug Squash on a real historical bug (older guide; current status unverified) [23]; PostHog's SuperDay includes a debugging session without AI [30]; Junction includes live debugging [26] |
| Code review of a provided change | Prioritized review comments, then implementation and discussion | Async review then synchronous session | SWE, frontend, PE | A: GitLab's technical interview centers on a curated merge request [13] |
| Frontend / UI implementation | Component behavior, state and events, sometimes CSS and accessibility | Live editor or own environment | Frontend-heavy PE and frontend | A: Amazon FEE frontend coding [17]; Shopify's older guide documents pairing with web stacks [22] |
| Frontend system design | Client architecture covering UX, data flow, rendering, performance, accessibility, security, scalability | Diagram and conversation | Senior frontend and frontend-heavy PE | A: Amazon FEE [17] |
| Product architecture / product system design | Start from user experience and requirements; API contract, entities, data model, client-server flow; less emphasis on backend scaling | 45-minute diagram and conversation | Product-track SWE at large companies | Secondary: multiple practitioner sources, including a former Meta interviewer, describe Meta's Product Architecture round as the design option for "SWE, Product" candidates [31][32]. No current Meta employer page was verified, so this is not labelled A |
| API and feature-data design | Resource and action contract, authorization boundary, pagination, lifecycle | Spec or diagram discussion | Backend-leaning PE, full-stack | B/C: strong role-responsibility evidence [2][5]; separately named rounds not broadly verified |
| Product sense for engineers | User framing, prioritization, scope, trade-offs, collaboration | Case discussion | Explicit PE especially | A: Plain has a dedicated product-sense stage [1] |
| Project deep dive | Personal contribution, architecture, decisions, failures, impact | Conversation, optional diagrams | Nearly universal for experienced candidates | A: Plain [1]; Shopify's Technical Deep Dive [22] |
| Behavioral / collaboration | Ownership, feedback, communication, customer judgment | Structured conversation | All levels | A: Amazon and Microsoft [19][20]; Plain ways-of-working stage [1] |
| Paid work trial | Real or simulated work over hours to days | Paid day, week, or longer | Some small or remote companies; not universal | A: PostHog SuperDay [29]; Automattic [24]; Junction trial day [26] |
| Traditional algorithmic coding | Correct runnable solution, complexity, tests | Online assessment or live coding | Whenever the company uses its general SWE loop | A: Amazon and Microsoft [18][20]. Owned by the Python roadmap; presence is documented, frequency for PE titles is not |

**Heterogeneity, not a trend claim.** Some product-engineering employers explicitly avoid algorithm puzzles [12] while large companies retain them [18][20]. A product-facing title does not mean "no algorithms."

### 1.5 AI-tool policy in interviews

| Policy archetype | Verified example | Preparation consequence |
|---|---|---|
| Disallowed unless explicitly permitted | Anthropic: no Claude in take-homes or live interviews unless instructions say otherwise (updated July 2025) [16] | Unaided implementation and reasoning remain required; read each stage's rules |
| Allowed or encouraged with accountability | GitLab encourages transparent AI use but expects candidates to explain and own their work [14]; PostHog allows AI in the SuperDay build but requires walking through architecture and reasoning about the code, and disallows AI beyond autocomplete in its debugging session [30] | Reviewing, validating, and defending generated code become assessable alongside implementation |
| Expected as normal work | Great Question's Product Engineer process expects candidates to build with their own AI tooling [12] | Tool steering and validation judgment can matter more than unaided typing throughput |

GitLab's AI-native hiring working group proposes assessing design judgment, code comprehension, validation, and awareness of AI limitations, but its status is Proposed and must not be described as GitLab's current loop [15]. T20 is core because policy variance means the learner needs both unaided skill and AI-supervision judgment.

### 1.6 Chat assessability and environment-only facets

Study happens in text. Each objective has a **chat projection**: the part of its scope that can be demonstrated through explanation, trace, code writing, code reading, specification, plan, review, or critique of supplied material. Checkpoint passes certify that projection. Facets that need a real browser, profiler, test runner, repository, or AI tool are tracked as ENV items in Section 0.8.1 and never inferred from chat work.

| Format or skill | Chat assessability | Chat-compatible probe form (C) | Needs a real environment for |
|---|---|---|---|
| Product framing, metrics, slicing, proposals (T01–T03) | Strong | Short brief → written framing, metric spec, slice plan, or memo | Actual user research |
| Browser model, component state, forms, client-server state (T04–T07) | Strong | Trace supplied scenario; write or critique component logic | Rendering, devtools, timing-dependent behavior |
| Accessibility and responsiveness (T08) | Moderate | Critique supplied markup or CSS; describe focus path | Keyboard, screen reader, rendered layout (ENV01) |
| Frontend performance (T09) | Moderate | Diagnose a supplied waterfall, profile summary, or metric narrative | Real profiling (ENV02) |
| Feature API, permissions, SaaS lifecycle (T10–T12) | Strong | Contract, schema, permission matrix, or state-machine sketch | Query execution (not required) |
| Testing strategy (T13) | Strong | Test plan; critique supplied tests | Executing tests (ENV06) |
| Unfamiliar code and debugging (T14) | Moderate | Supplied files, logs, or traces → map and hypothesis log | Repository navigation and reproduction (ENV03) |
| Code review (T15) | Very strong | Review a supplied diff with prioritized comments | Running the change |
| Rollout, observability, UX states, end-to-end ownership (T16–T19) | Strong to very strong | Rollout plan, incident triage from supplied evidence, state model, integrated spec | Live tooling; runnable build (ENV04) |
| AI-assisted judgment (T20) | Partial | Review tutor-constructed "generated" code; write a validation plan; defend an explanation | Steering a real tool in a real repository (ENV05) |
| Paid work trial | Poor substitute | Simulate bounded artifacts only | Sustained real collaboration |

**Constructed artifacts.** When the tutor supplies code, logs, diffs, metrics, or "AI-generated" patches for critique, they are constructed practice material. The tutor must make them internally consistent and state the contract explicitly; a flaw in supplied material is the tutor's responsibility, not a learner gap.

### 1.7 Relationship to the companion roadmaps

| Companion roadmap | Owns | This roadmap's use |
|---|---|---|
| `python_coding_interview_roadmap` | Algorithms, data structures, Python implementation, complexity, code-level testing, interview execution for algorithmic rounds | Not re-taught. Referenced by topic name where a product task needs code-level testing (T13) or disciplined implementation (T14) |
| `system_design_interview_roadmap` | Backend request lifecycle, estimates, API contracts and low-level design, storage and schema, indexes, transactions, idempotency, caching internals, replication, partitioning, messaging, workflows, load and reliability, security and multitenancy, observability, evolution and migration | Not re-taught. T10, T11, T12, T16, and T17 assess only the product-feature application of these mechanisms. That roadmap explicitly excludes frontend rendering, mobile, and ML systems, which this roadmap partially covers |

**No status transfer.** A pass, gap, or attempt in a companion roadmap is never recorded as a checkpoint status here, even for an apparently identical concept, because the assessed projections differ. When a product task needs a backend mechanism, check only that facet directly within the current tier ceiling, or record a DEPENDENCY gap pointing to the companion topic by name. If the learner supplies a companion file, its evidence may inform which facet to probe first, like a self-report; it cannot award credit here.

**Content boundary.** When a product probe drifts into backend internals (for example, isolation levels or consumer-group ordering), stop at the product consequence and note that the mechanism belongs to the companion roadmap. When an interview target uses algorithmic rounds, say so and point to the Python roadmap rather than adding algorithm objectives here.

## 2. Curriculum tree and learning layers

### 2.1 Scope tree

The root is product-engineering interview competence. Families group related topics; each topic contains five stable objectives. Sibling order is flexible. The suffix in `T08.3` is an objective ID, not depth D3.

| Family | Branch | Topic children |
|---|---|---|
| F01 | Product judgment | T01, T02, T03 |
| F02 | Web experience engineering | T04, T05, T06, T07, T08, T09 |
| F03 | Feature architecture | T10, T11, T12 |
| F04 | Quality and operation | T13, T14, T15, T16, T17 |
| F05 | Product experience and ownership | T18, T19 |
| F06 | AI-assisted engineering judgment | T20 |

Every core topic is visible during the first diagnostic sweep. T01, T18, and T19 are also observed throughout other work, but embedded observations count only when their specific objectives were demonstrated. Extensions do not displace basic coverage of active branches.

### 2.2 Diagnostic tiers and breadth waves

**Breadth-first applies to diagnostics as well as instruction.** Complete the easiest tier across the active curriculum, repair its gaps and verify its required scope, then begin the next harder tier across the curriculum. An easy answer in one branch is not permission to climb that branch ahead of the others.

| Difficulty tier | Diagnostic demand | Required scope before leaving the tier | Wave mapping |
|---|---|---|---|
| Tier 1 — Foundations | Easiest meaningful probes: explain purpose, distinguish an example from a non-example, predict or trace a small supplied case, identify simple state, assumption, boundary, or risk. No full artifact production and no code writing required | All active D1 checkpoints independently verified (100 at the default allocation) | W0 = DIAGNOSE_ALL; W1 = REPAIR_VERIFY |
| Tier 2 — Mechanism and labelled application | Trace or apply a named mechanism or approach in a simple concrete case; small code, spec, or plan fragments where the objective requires them | All active D2 checkpoints independently verified (100 at the default allocation), with lower-tier proof still valid | W2 = DIAGNOSE_ALL, then REPAIR_VERIFY |
| Tier 3 — Independent selection and artifacts | Choose and reject approaches in unlabelled contexts and produce the required artifact with correctness, risk, and trade-off reasoning | All active D3 checkpoints independently verified (93 at the default allocation) | W3 = DIAGNOSE_ALL, then REPAIR_VERIFY |
| Tier 4 — Adaptation, transfer, and integration | Meaningful changes to assumptions, constraints, users, failures, or requirements; combine skills across layers | D4 for every active D4 target (T01.4, T16.4, and T19.5 at the default allocation); all 20 topic transfers; the selected required integration areas (I01–I06 by default) independently verified | W4 = DIAGNOSE_ALL, then REPAIR_VERIFY |

Each tier follows **DIAGNOSE_ALL → REPAIR_VERIFY → TIER_GATE**. Begin its diagnostic phase with a bounded visit to each active topic, using prior qualifying evidence where it already covers the entire topic's current-tier obligation. Then rotate through unresolved current-tier objectives and facets: probe unknown scope, skip demonstrated material, repair observed gaps, and use fresh independent checks. Only after the gate is satisfied does the next tier open.

A diagnostic sweep is a placement pass, not a claim that all five objectives in each topic are assessed. Remaining unknown objectives receive current-tier probes during REPAIR_VERIFY before any teaching. The required checkpoint cells (296 at the default allocation) specify coverage, not a number of questions; one manageable attempt can cover several compatible facets. Never substitute a long 100-part exam for bounded visits.

A wave is a scheduling label, not a second difficulty scale. W0 and W1 together form Tier 1. A lap contains at most one ordinary primary visit per eligible topic and can span sessions. During repair laps, topics with no unresolved current-tier scope leave the active teaching queue instead of receiving filler lessons.

Delayed retention is a separate dimension, not a fifth tier. These are the learner's scheduling preferences, not a claim that one learning sequence is optimal for everyone or that employers require it.

### 2.3 Depth definitions and fixed assessment scope

Depth applies consistently to code, design, and product-judgment objectives.

| Depth | Definition | Code-objective illustration (generic) | Product-judgment illustration (generic) |
|---|---|---|---|
| D1 — recognize and explain | State the concept's purpose in the learner's own words and distinguish a straightforward example from a non-example; repeating a name after the tutor is not enough | Recognize that two values that always change together should not be stored as separately synchronized state | Distinguish a user problem from a requested implementation |
| D2 — trace or apply a labelled mechanism | Given the named mechanism or approach, trace or apply it correctly in a simple concrete case | Given "optimistic update with rollback," trace pending → server rejection → restored state | Given an outcome-plus-guardrail pattern, apply it to a simple feature |
| D3 — independently choose and produce | Under stated constraints, select an approach without being told which, reject a plausible alternative, and produce the required artifact | Decide whether data belongs in local state or a server-state cache, and write or critique the component logic | From an ambiguous brief, independently define MVP, non-goals, metric, and acceptance criteria |
| D4 — adapt under a changed assumption | Re-evaluate and modify an earlier decision when a meaningful constraint, failure, scale, user segment, or requirement changes, preserving what can stay stable | Revise an optimistic workflow after learning the mutation is irreversible and can be rejected minutes later | Re-scope a feature when an enterprise permission requirement invalidates a single-user design, keeping the core outcome |

Before a probe, identify the objective facets and the depth-specific success conditions; record assessed and missing scope. Do not move the standard after seeing a correct answer, add arbitrary variants, or interpret a terminal verb as a Tier 1 requirement. D1 checks purpose, key distinctions, and a simple relevant boundary; D2 applies the labelled model; D3 selects, rejects, and produces; D4 adapts. A D1 pass never requires producing a complete artifact, and naming a technique alone does not show D1. A D3 artifact objective is not passed by a description of what the artifact would contain.

### 2.4 Target allocation and profile overlays

**Default allocation (profile MID_GENERALIST_WEB).** 90 objectives target D3. Seven target D2 because their default scope is literacy rather than specialist practice: T02.4, T04.1, T04.4, T08.4, T09.2, T09.3, T20.3. Three target D4 because adaptation is their explicit outcome: T01.4, T16.4, T19.5. Required checkpoints: 100 D1 + 100 D2 + 93 D3 + 3 D4 = **296**.

**Overlays.** An overlay changes targets only through an explicit learner decision recorded in Section 0.9. It never changes objective wording or IDs. Added scope follows the backfill rule in Section 4.1: raising a target after its tier has cleared creates new obligations only for the added checkpoint, which reopen the affected tier's gate for that scope alone.

| Overlay | Target changes |
|---|---|
| SENIOR | D4: T03.5, T07.5, T10.5, T13.5, T14.3, T15.4, T15.5, T16.3, T17.4, T18.5 |
| STAFF (in addition to SENIOR) | D4: T03.4, T11.5 |
| FRONTEND_HEAVY | D3: T04.4, T09.3; D4: T07.5; priority of T09 raised to P0 |
| GROWTH | D3: T02.4; priority of T02 raised to P0; recommend X02 |
| B2B_SAAS | Priority of T12 raised to P0; recommend X05; D4: T11.5 at senior or above |
| AI_EXPECTED | Priority of T20 raised to P0; D4: T20.5 at senior or above; recommend X03 if the role builds LLM features |
| JUNIOR | Default targets unchanged in the tracker; readiness reporting may treat D3 on non-routine objectives as stretch scope only by explicit decision, never by silently lowering denominators |

When overlays combine, take the higher target. Record the resulting counts in the dashboard and gate board.

## 3. Diagnostic-first placement and skipping

### 3.1 All-topic diagnostic phase at every tier

Start with the source record, the current tier/phase, and saved evidence. Begin at Tier 1 unless qualifying saved state has already cleared it. A familiarity report, job title, or companion-roadmap status may help select a relevant prompt within the current tier but cannot trigger a harder-tier start, award a pass, or replace an unassisted assessment. Do not force a long intake questionnaire before the first useful probe.

During DIAGNOSE_ALL, visit every active topic at the current tier before the repair phase. For Tier 1, start with the easiest meaningful conceptual, reading, or critique probe for each branch, even when the topic's eventual artifact is advanced. Keep prompts small and ask for one manageable response at a time. Limit a primary visit to one probe and, when useful, one neutral clarification or same-tier follow-up. Do not raise the tier after a correct answer and do not turn a gap into a chain of increasingly guided exercises.

Use a brief interpretation of the answer, preserve known facets, note gaps and unknowns, then rotate. Short corrective feedback is allowed; repeated explanation-and-practice belongs in REPAIR_VERIFY after the all-topic sweep. A minimal prerequisite explanation may be given only when needed to make the current-tier diagnostic meaningful; record the assistance and do not count the assisted response as independent evidence.

A primary diagnostic obligation is resolved by a meaningful learner attempt, an explicitly recorded inability or decline, or existing independent evidence covering the complete topic scope at this tier. A prompt with no answer is PENDING. A decline resolves a visit obligation but leaves knowledge unknown; it is not a score of zero and cannot satisfy the mastery gate. Embedded observations count only for their demonstrated facets.

The sweep may span sessions; retain its queue on a new upload. A shared attempt can provide evidence for multiple objectives, but each outcome must be separately scoped.

### 3.2 Gap-only repair and independent verification at the same tier

After the sweep, enter REPAIR_VERIFY and rotate through unresolved objectives. Before teaching an unverified facet, consult the ledger and probe the narrow uncertainty unless qualifying evidence or an already-observed gap makes a repeat diagnostic unnecessary. Do not label an unasked objective deficient.

Use **probe or reuse evidence → skip known material / repair only the observed gap → fresh independent check → rotate**. A check cannot be labelled independent when the tutor has just supplied the needed step, state model, contract, rollout rule, or artifact and the learner merely reproduces it. Choose a genuinely fresh scenario and withhold substantive help; defer the check to a later breadth visit when immediate repetition would be rehearsal. Same-session independent performance can establish a checkpoint, but not delayed retention.

At most one bounded repair focus and one fresh check normally fit a visit. If the check reveals another gap, record it for a later same-tier lap. Never demand the next tier's checkpoint as the exit condition for this one. Once a checkpoint is P, remove its instruction from the queue and preserve its proof.

| Route | When it applies | AI action |
|---|---|---|
| PROBE | Coverage is unknown or the next relevant checkpoint has no adequate evidence | Test the narrow uncertainty before teaching it |
| LEARN | The learner has not demonstrated the checkpoint's core model or artifact | Teach the smallest useful slice, then use a fresh independent check |
| GAP_ONLY | Meaningful facets are verified but some remain missing or uncertain | Preserve known facets; target only the gap, then check its interaction with the whole objective |
| VERIFY_SKIP | Prior work or a strong partial diagnostic suggests the target may already be met | Collect only the missing independent coverage; do not count a pass yet |
| SKIP_INSTRUCTION | Every required checkpoint has qualifying evidence and no unresolved contradiction | Remove lessons from the queue; retain transfer and delayed-review obligations |
| RETEST | Later valid evidence materially contradicts a previously passed requirement | Recheck only affected checkpoints/facets |
| PAUSED | An explicit scope decision temporarily defers this objective/topic | Remove it from the active queue with a reason and revisit condition; never label it mastered |

A review becoming due does not change `P` to `R` or force lessons. An isolated slip the learner independently repairs is not automatically a conceptual failure.

### 3.3 Partial and full skips

A **partial skip** can be at topic, objective, checkpoint, or facet level. A strong rollout plan with a missing abort criterion preserves the plan evidence and isolates the abort-criterion gap; it must not earn a full-scope pass that includes abort criteria.

An **objective instruction skip** requires all required checkpoint cells to be `P`, with explicit evidence. Higher-level performance does not automatically pass lower-level artifact work, sibling objectives, or prerequisites that were not demonstrated.

A **full topic instruction skip** requires all five objectives to meet target plus at least one independent, meaningfully changed-context transfer that tests the topic's central reasoning. Delayed retention remains unassessed until tested later.

Self-reports, professional experience claims, reading completion, recognition of a familiar pattern, tutor explanations, and assisted reconstruction can guide placement but cannot justify mastery credit. When the learner prefers to bypass unverified material, record a scope or scheduling exception rather than inventing evidence.

## 4. Breadth-first scheduler

### 4.1 Tier ceiling, frontier, and rotation rules

The **active working tier** is the permitted difficulty ceiling for every newly assigned diagnostic, lesson, practice task, review, and transfer. The **teaching frontier** is the shallowest unresolved required checkpoint within opened scope. A future-dated review, a harder saved pass, or a closed wave does not authorize work beyond the ceiling.

When valid evidence contradicts a required earlier checkpoint, mark only affected proof R, suspend the higher-tier position, and move the working ceiling to the earliest incomplete required tier. Its sweep obligations stay resolved; use REPAIR_VERIFY on the reopened scope. Store the interrupted tier, phase, lap roster, served and remaining entries, and pending task disposition as a suspended-position snapshot; preserve nested snapshots. After each lower gate is restored, restore the most recent still-valid position. **Backfill rule:** a newly selected extension, overlay, or restored scope uses the same mechanism, with new diagnostic obligations only for genuinely added scope.

During DIAGNOSE_ALL, eligible topics are the current tier's unresolved sweep obligations; follow the saved family-mixed rotation. During REPAIR_VERIFY, eligible topics have unresolved current-tier scope. Within each topic, favour unvisited objectives and narrow gaps over polishing one successful facet. Compatible objectives can share a task when their individual evidence remains clear; an integrated scenario is a natural way to do this in product work but must keep each objective's outcome separately scoped.

Before a second ordinary primary visit to a topic in a lap, every other eligible topic must have had a visit or an explicitly recorded block or carryover. A neutral correction of an ambiguous prompt remains the same attempt. At a phase transition, close the old lap and open the next lap number; do not resample successful diagnostics. Lap numbers increase across the roadmap. Served, remaining, and evidence-covered entries must be disjoint and cover the roster.

A session can contain one substantial attempt or several short visits. Breadth is enforced across the saved lap, not by forcing all 20 topics into one session. A session ending does not reset the tier, erase partial evidence, or promote the learner.

### 4.2 Selecting the next action

1. Read the active tier, phase, gate state, and unfinished-attempt context. Resume an unanswered prompt only if its contents remain available and it fits the ceiling. Otherwise mark only its unfinished scope SUPERSEDED, preserve valid answered-part evidence, and issue a fresh same-tier task under a new ID.
2. In DIAGNOSE_ALL, select the next unresolved primary topic. Ask one small same-tier probe, interpret, record assistance and scope, and rotate after at most one useful follow-up. Queue extended repairs.
3. Once every sweep obligation is resolved, enter REPAIR_VERIFY. Reuse qualifying evidence, probe unknown facets, repair observed gaps, and use fresh independent checks.
4. If a task needs a missing prerequisite facet, including one owned by a companion roadmap, check or repair only that facet within the ceiling and retain the parent objective in the queue.
5. Update evidence, ledger, preserved facets, gaps, diagnostic states, reviews, remaining rotation, and exact next action. Evaluate the phase or tier gate explicitly before changing difficulty.

Service at most one review-led primary visit before returning to current-tier breadth work. Reviews must fit the working ceiling; retain an above-ceiling due review as deferred-by-gate without moving its due date.

### 4.3 Phase exits and strict tier gates

**Diagnostic-phase exit:** all active topics have a completed current-tier visit, an explicitly recorded inability or decline, or existing independent evidence covering the topic's current-tier scope. A pending prompt does not qualify. This exit opens REPAIR_VERIFY at the same tier.

**Tier gate:** the active tier is CLEARED only after its diagnostic obligations are resolved and every required checkpoint at that tier is P, with required earlier checkpoints still valid. Unknown cells, partial facets, hints, guided corrections, scheduled repairs, and ENV status cannot substitute for independent full-scope chat proof. For Tier 4, all active D4 checkpoints, the 20 topic transfers, and the selected required integration areas (I01–I06 by default) must also pass. Paused or carried required checkpoints remain in the denominator; only an authorized scope exclusion changes it. Reconcile every open gap before declaring a pass.

| Next activity | Required gate |
|---|---|
| Tier 1 REPAIR_VERIFY / W1 | Tier 1 all-topic sweep complete |
| Tier 2 DIAGNOSE_ALL / W2 | Tier 1 CLEARED: all active D1 checkpoints P |
| Tier 3 DIAGNOSE_ALL / W3 | Tier 2 CLEARED: all active D2 checkpoints P and D1 proof valid |
| Tier 4 DIAGNOSE_ALL / W4 | Tier 3 CLEARED: all active D3 checkpoints P and earlier proof valid |
| Readiness reporting | Section 6.4; opening Tier 4 is not completion |

The AI must not advance another branch a depth ahead, start an advanced diagnostic to relieve repetition, or mark a tier ADVANCED_WITH_CARRYOVER without explicit learner permission.

**Avoiding deadlock:** while one facet is blocked, work on other unresolved current-tier branches. When no other useful work remains, inspect the smallest real blocker, change the representation (for example, from prose to a state table or a supplied timeline), or use a simpler same-tier probe. After two unproductive repair visits, change the approach. Only the learner can authorize advancing with an unresolved checkpoint; record it as OVERRIDE_ACTIVE, not CLEARED.

Every formal carryover needs the objective/checkpoint, gap or dependency, preserved facets, minimum next action, and a revisit trigger no later than the next study session. Carryovers never unlock a harder tier.

**Tier 4 has non-checkpoint work.** Its DIAGNOSE_ALL roster covers all 20 topic-transfer obligations plus a D4 diagnostic for each selected extension with a D4 target. Its repair roster includes unresolved D4 checkpoints, transfers, and the selected required integration areas, even when every ordinary checkpoint is P. Once all Tier 4 requirements pass, record COMPLETE / maintenance review.

### 4.4 Scheduling exceptions

Allowed reasons: `PREREQUISITE_REPAIR`, `DUE_REVIEW`, `CARRYOVER`, `UNFINISHED_ATTEMPT`, `INTERVIEW_DEADLINE`, or `LEARNER_OVERRIDE`. Record affected objectives, reason, maximum scope and depth, and return condition in Section 0.9. `INTERVIEW_DEADLINE` may reorder bounded visits toward a confirmed real interview's formats within the current ceiling; it never raises the ceiling by itself. Only an explicit LEARNER_OVERRIDE can authorize work beyond an uncleared gate. Self-reported fluency, a strong answer, inferred time pressure, and a new session are not overrides.

## 5. Minimum prerequisites, not whole-topic locks

Tier 1 diagnostics have no whole-topic prerequisite gate. Higher-tier work respects the shared tier gate; within an opened tier, verify only the facets the current work uses. The table lists common dependencies to inspect, not a course order.

| Target work | Minimal supporting facets to check | Avoid imposing this unnecessary lock |
|---|---|---|
| Any product-judgment artifact (T01–T03) | T01.1 framing; T01.3 scope only when slicing | Completing metrics or experimentation before scoping an MVP |
| Browser and UI behavior (T05–T08) | T04.2 events; T04.3 requests for async work; T04.4 only for effects and scheduling | All of T04 at D3 before a component preview |
| Client/server state (T07) | T05.2 source of truth; T04.3 request lifecycle | Full forms and routing mastery |
| Accessibility inside forms (T06.5) | T08.1–T08.2 facets | All of T08 before any form work |
| Frontend performance (T09) | T04.1/T04.4 for loading and main-thread reasoning; T05.2/T05.4 for render work | All component topics at D3 |
| Feature contracts and permissions (T10–T11) | Companion system-design facets only where the task uses them (API contract, schema, authorization) | Completing the companion system-design roadmap |
| SaaS lifecycle (T12) | T11.1 distinctions; companion idempotency/ordering facets only when a webhook task depends on them | Full messaging and workflow internals |
| Testing, debugging, review (T13–T15) | Only the feature facets the supplied code touches | Finishing all feature topics before practicing review or debugging |
| Rollout and observability (T16–T17) | T16.1 deploy versus release; T16.4 for mitigation choices | Migration mechanics mastery before a flag-based rollout |
| UX states and end-to-end work (T18–T19) | T01.5 acceptance states; facet-specific links such as T07.3 or T11.2 | Every contributing topic at target |
| AI-assisted judgment (T20) | The feature facets the generated code touches; T13/T14 verification techniques for T20.4 | Mastery of every topic the generated code mentions |

Instantiate an actual block as objective/checkpoint plus a named facet and reason in Section 0.6. A blocked artifact does not block a conceptual preview, and a gap in one prerequisite does not erase unrelated passes. If a dependency appears cyclic, check whether a conceptual slice or a nonessential link removes it.

## 6. Evidence, scoring, and completion

### 6.1 Valid assessment evidence

Allowed modes: `DIAGNOSTIC`, `INDEPENDENT`, `TRANSFER`, `REVIEW`, `GUIDED`, `TEACHING`, and `REPORTED_EXPOSURE`. The first four can establish passes if the observed work is independent and full-scope. The latter three cannot.

Assistance values: `NONE`, `NEUTRAL_CLARIFICATION`, `HINT`, `GUIDED`, or `SOLUTION`. A neutral clarification resolves the scenario contract (who the users are, what the constraint means, what the supplied code is supposed to do) without revealing the approach, state model, risk, or fix. Only `NONE` and genuine neutral clarification can support an independent pass. Once substantive help is supplied for a task or facet, a later neutral message does not restore independence. A fresh exit check gets its own attempt ID.

**AI-tool use by the learner.** Disclosed use of solution-producing tools counts as assistance for the affected reasoning; do not infer undisclosed tool use from writing style. For T20 objectives, the assessed facet is the learner's own inspection, verification, context selection, and defense; tutor-constructed generated code is the material under review, not assistance. An artifact the learner produced with an AI tool can support T20 evidence for how they steered and verified it, but not independent-authorship evidence for the underlying feature objectives.

| Score | Meaning at the named checkpoint and scope |
|---|---|
| 0 | A meaningful attempt demonstrates a material missing model or invalid approach |
| 1 | Partial understanding, incomplete scope, or success dependent on substantive help |
| 2 | Independently demonstrated the complete assessed checkpoint scope with sound reasoning and an appropriate artifact |
| NA | No assessable attempt, invalid or ambiguous task, reported exposure, or teaching only |

A partial facet may receive score 2 for that facet without passing the checkpoint; the ledger cell stays `G` or `U` until full scope is covered. Complementary independent rows can establish complete coverage. Do not average scores to hide a missing facet.

**Product-judgment objectives.** Many objectives have more than one defensible answer. Score the reasoning against the stated constraints: whether assumptions are explicit, alternatives considered, risks named, and the artifact complete for its checkpoint. Do not mark a learner down for choosing a different reasonable scope, metric, or rollout than the tutor would; mark them down for unstated assumptions, ignored constraints, or internally inconsistent artifacts.

**Code and artifact objectives.** Inspect correctness, relevant boundaries, UX states, permissions, and failure behavior as the checkpoint requires. Code reading alone cannot verify a requirement to independently write code. Record whether code was executed, rendered, reviewed without execution, or described only. Never claim tests passed or UI rendered unless observed.

**Selection objectives.** For D3 selection, do not reveal the topic or approach before the attempt. Labelled practice is permitted at lower depths but is not unlabelled selection evidence. The saved rotation is administrative and must not be printed as a hint. If a topic announcement supplies the approach, preserve application facets but not the unprompted-selection facet.

Validate the tutor's own scenario, supplied artifacts, expected answer, and critique before downgrading the learner; correct flawed assessments explicitly. Do not infer timed-interview performance from chat timestamps.

### 6.2 Checkpoint state and derived outcomes

`U → G` follows an observed gap; `U/G/R → P` requires sufficient independent evidence. `P → R` requires a material contradiction or a documented change in the assessed contract. Do not downgrade a proven checkpoint because an optional harder variant failed. Teaching or reading alone never produces `P`.

An objective meets its target only when every required checkpoint through its target depth is P and no material contradiction remains. Above-target evidence is optional and does not expand the target.

Topic placement is derived conservatively: `U`; `FOUNDATION_GAPS` when D1/D2 gaps dominate; `MIXED`; `VERIFYING_SKIP`; `TARGET_MET`; `SKIP_ALL_INSTRUCTION` only when targets and the transfer both pass. The ledger, not this label, chooses instruction.

Do not equate: a topic sampled, a lesson skipped, a checkpoint verified, a transfer passed, retention verified, environment skill observed, or interview readiness demonstrated. Report them separately. No model-generated probability of mastery substitutes for evidence.

### 6.3 Delayed review without reteaching everything

Schedule a light independent changed-context review after an objective first meets target or receives instruction-skip status. Defaults: 3 days after the first target pass, then 7 and 21 days after successive successful reviews; adjust by evidence and learner constraints. During a long Tier 1 or Tier 2 phase, schedule a light lower-depth review after the first full checkpoint pass using the same first interval. Combine compatible due objectives in one fresh task where individual outcomes remain assessable.

Dates use the saved timezone and are checked only during an active session; this file creates no reminders. A qualifying delayed check is at least one day later and outside the same continuous practice sequence. When elapsed time is unknown, record the review but do not claim delayed retention. After a material failure, isolate the gap and use a closer review after repair. A review deferred by a lower gate retains its due date.

### 6.4 Overall readiness

Report these separately for the active scope, always alongside the total core scope:

| Report | Requirement |
|---|---|
| `CURRICULUM_TARGETS_MET` | All objective targets and all 20 topic transfers pass with no unresolved material gaps |
| `INTERVIEW_PRACTICE_VERIFIED` | The selected required integration areas (I01–I06 by default) have qualifying mixed evidence, including observed interview-style execution in formats that match the learner's confirmed targets |
| `PRACTICAL_ENVIRONMENT_VERIFIED` | ENV items relevant to the confirmed target formats are P; reported only if the learner pursues environment-backed practice |
| Retention | Delayed-review coverage; a first successful diagnostic is not durable mastery |

An excluded or deferred topic is not completed. Until level, stack, and target formats are confirmed, qualify readiness rather than inventing those conditions. Readiness in this roadmap never implies readiness for algorithmic or backend system-design rounds; report those from the companion roadmaps.

## 7. Core topics and stable objective definitions

The cards specify learning outcomes, not a teaching order or exercise catalogue. Preserve IDs and capability meanings on routine saves. Targets shown are the default MID_GENERALIST_WEB allocation (Section 2.4). Alternatives joined by "or" describe valid choices, not a silent requirement to cover every variant. W1–W3 address shallower slices of these same outcomes; W4 adds adaptation and transfer rather than new objectives. Evidence labels in each card follow Section 1.2; priorities, depths, prerequisites, failure modes, and stop rules are B recommendations.

### T01 — Product problem framing and MVP scope

**Family:** F01 Product judgment. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** A: Plain assesses product sense and customer empathy in a dedicated stage [1]; PostHog describes product engineers as talking to users, deciding what to build, and owning product decisions [27][28]; current OpenAI product roles expect engineers to turn ambiguous needs into shipped outcomes [6][9].

**Technique cues:** An ambiguous request; "what should we build?"; incomplete requirements; more requested than the available time allows; a stakeholder proposing an implementation instead of a problem.

**Common failure modes:** Accepting the requested implementation as the problem; hidden assumptions; an MVP that removes the core user value; ignoring empty, error, and permission states; confusing a user persona with a buyer.

| Objective | Target capability | Required depth |
|---|---|---|
| T01.1 | Restate an ambiguous request as a user outcome, constraints, assumptions, and a success condition. | D3 |
| T01.2 | Separate the underlying problem from a proposed solution and identify which assumptions need validation. | D3 |
| T01.3 | Define an MVP slice with explicit non-goals while preserving the core user outcome. | D3 |
| T01.4 | Compare plausible scope choices using user value, delivery cost, technical risk, and reversibility. | D4 |
| T01.5 | Write acceptance criteria covering normal, empty, error, permission, and cancellation states that apply. | D3 |

**Facet prerequisites and cross-references:** T01.1–T01.3 need no prerequisite. T01.5 may cross-reference the system-design roadmap's requirements-and-invariants module only where a correctness condition is enforced server-side.

**Overlap with companion roadmaps:** New scope. The system-design roadmap's requirements module covers system qualities and invariants, not user-problem framing or MVP scoping.

**Tier 1 concept families:** Problem versus solution; user and job to be done; assumption; constraint; MVP; non-goal; acceptance criterion; reversibility; user versus buyer.

**Evidence form and chat projection:** Written product brief or mini-spec. Chat projection: strong; all facets are text artifacts. No environment-only facets.

**Not necessary at default scope:** Formal product-management frameworks, market sizing, roadmap portfolio theory, polished UX research practice.

**Reading references:** Plain Careers, product-sense stage description [1]; PostHog, "Things product engineers need to know", sections 1 and 3 [28].

### T02 — Product metrics, instrumentation, and experiment reasoning

**Family:** F01 Product judgment. **Priority:** P1 (P0 for growth or data-heavy targets). **Classification:** New core topic.

**Evidence basis:** A: PostHog lists tracking plans, funnels, retention, and experiment hypotheses as baseline product-engineer skills [28]; Microsoft Research documents controlled experiments and common metric-interpretation pitfalls [54][55]; OpenAI's Growth and ImageGen roles include experimentation and measurement [7][10].

**Technique cues:** "How will we know it worked?"; conversion, funnel, activation, retention; experiment or variant; rollout metric; a dashboard that disagrees with user reports.

**Common failure modes:** Vanity metrics; event names without defined semantics; changing the metric after seeing results; treating statistical significance as business importance; ignoring guardrails; experimenting on every change.

| Objective | Target capability | Required depth |
|---|---|---|
| T02.1 | Define one outcome metric and appropriate guardrail metrics for a feature in operational terms. | D3 |
| T02.2 | Produce an event and property instrumentation schema whose identifiers and event timing match the intended metric. | D3 |
| T02.3 | Critique telemetry for missing events, duplicate events, identity ambiguity, privacy risk, or survivorship bias. | D3 |
| T02.4 | Specify the hypothesis, randomization unit, treatment, metrics, and major validity risks of a basic online experiment. | D2 |
| T02.5 | Interpret an experiment summary conservatively, separating association, causal evidence, practical significance, and unresolved uncertainty. | D3 |

**Facet prerequisites and cross-references:** T02.2 can use T01.1. T02.4–T02.5 need basic probability and proportions, not the Python roadmap's algorithm topics.

**Overlap with companion roadmaps:** New scope. The system-design roadmap's observability module covers operational telemetry, not product metrics or experiments.

**Tier 1 concept families:** Outcome metric; guardrail metric; event; property; identity; exposure; hypothesis; randomization unit; treatment and control; practical versus statistical significance; when not to experiment.

**Evidence form and chat projection:** Metric definition, event schema, experiment critique. Chat projection: strong. No environment-only facets.

**Not necessary at default scope:** Sequential testing, variance reduction, causal-inference mathematics, and experimentation-platform engineering (X02 depth).

**Reading references:** Microsoft Research, "Online Experimentation at Microsoft" [54]; "A Dirty Dozen" metric pitfalls [55]; PostHog skills sections 4 and 9 [28].

### T03 — Work slicing, estimation, technical proposals, and decision communication

**Family:** F01 Product judgment. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** A: Current product roles emphasize autonomous ownership, ambiguity, and shipping [2][1][9]; PostHog expects persuasive RFCs and plans [28] and its SuperDay deliberately over-scopes the task to observe prioritization [29][30]; PostHog's technical screen looks for breaking big problems into smaller ones [59].

**Technique cues:** "How would you approach this?"; a deadline; a dependency; an unclear estimate; a request for a design memo; a scope that cannot fit the time available.

**Common failure modes:** Horizontal "frontend then backend" decomposition; false precision; no named unknowns; a proposal that is an implementation dump; inability to revise a decision when evidence changes.

| Objective | Target capability | Required depth |
|---|---|---|
| T03.1 | Decompose a feature into independently verifiable vertical slices rather than layer-only task lists. | D3 |
| T03.2 | Identify dependencies, unknowns, and risk-reduction work that could invalidate an estimate. | D3 |
| T03.3 | Give a bounded effort estimate or relative sizing with assumptions and uncertainty stated explicitly. | D3 |
| T03.4 | Write a concise technical proposal that records problem, chosen approach, alternatives, contracts, risks, and rollout. | D3 |
| T03.5 | Communicate a changed decision by explaining new evidence, trade-offs, and resulting scope without obscuring uncertainty. | D3 |

**Facet prerequisites and cross-references:** T03.1 uses T01.3. T03.4 may cross-reference the system-design roadmap's requirements, API-contract, and decision-record modules only for facets actually present.

**Overlap with companion roadmaps:** Thin overlap with the system-design roadmap's evolution/decision-records module; this topic owns feature-level slicing and communication, not architecture decision records.

**Tier 1 concept families:** Vertical slice; spike; dependency; unknown; estimate range; alternative; decision record; scope cut.

**Evidence form and chat projection:** Slice plan, estimate rationale, technical proposal, revised-decision note. Chat projection: strong. No environment-only facets.

**Not necessary at default scope:** Project-management certification, sprint-ceremony trivia, detailed organizational planning.

**Reading references:** PostHog, "Preparing for the engineering SuperDay", prioritization guidance [30]; PostHog skills section 2 [28].

### T04 — Browser and web-platform execution model

**Family:** F02 Web experience engineering. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** A: Amazon's front-end engineer loop explicitly assesses frontend coding and frontend system design [17]; MDN defines the DOM, event, and Fetch interfaces that framework behavior rests on [33][34].

**Technique cues:** Surprising event behavior; a loading race; "does this run in the browser or the server?"; a frozen UI; broken back-button or navigation behavior.

**Common failure modes:** Treating a Fetch rejection as the only failure (ignoring HTTP error statuses); confusing the DOM with a framework's virtual model; overriding native element semantics; weak intuition for main-thread blocking.

| Objective | Target capability | Required depth |
|---|---|---|
| T04.1 | Trace a user navigation from URL and request through document and resource loading to DOM construction and interactive rendering at interview-relevant resolution. | D2 |
| T04.2 | Predict event targeting, propagation, default behavior, and handler effects for common interactive DOM elements. | D3 |
| T04.3 | Trace a browser HTTP request through fetch resolution, status handling, cancellation, and client-visible failure states. | D3 |
| T04.4 | Explain how long-running JavaScript and asynchronous task scheduling can delay user interaction and rendering. | D2 |
| T04.5 | Choose native platform semantics for a basic link, button, form, history/navigation, or storage interaction before adding framework abstraction. | D3 |

**Facet prerequisites and cross-references:** T04.3 thinly cross-references the system-design roadmap's request-lifecycle module; do not require that whole module.

**Overlap with companion roadmaps:** The system-design roadmap covers the request path from the server's side; this topic owns the browser side.

**Tier 1 concept families:** DOM; event target, bubbling, and default action; request, response, and status; cancellation; event loop and tasks; navigation and history; native semantic elements.

**Evidence form and chat projection:** Explanation, trace, code reading or critique. Chat projection: strong for the model; actual devtools use is environment-only.

**Not necessary at default scope:** Browser-engine internals, TCP congestion control, HTTP/3 implementation, rendering-engine source.

**Reading references:** MDN, Document Object Model, concepts and usage [33]; MDN, Using the Fetch API [34].

### T05 — Component model and local UI state

**Family:** F02 Web experience engineering. **Priority:** P0. **Classification:** New core topic (framework-neutral; React as the mainstream example).

**Evidence basis:** B: Component-state reasoning is needed to produce the interactive artifacts in documented frontend and product roles [17][7]; PostHog expects production-quality UI from product engineers [28].

**Technique cues:** Stale state; duplicated state; an effect loop; a reusable widget; unclear parent/child ownership; state that resets unexpectedly.

**Common failure modes:** Storing every derived value; using effects for event-specific logic; two sources of truth; unstable component identity.

| Objective | Target capability | Required depth |
|---|---|---|
| T05.1 | Decompose a UI into components whose ownership boundaries follow behavior and data responsibilities rather than arbitrary visual nesting. | D3 |
| T05.2 | Distinguish source-of-truth state from derived values and remove redundant synchronized state. | D3 |
| T05.3 | Implement controlled data flow and event-driven state updates while making ownership explicit. | D3 |
| T05.4 | Distinguish render-time derivation, user-event logic, and synchronization with an external system, including cleanup where synchronization is required. | D3 |
| T05.5 | Predict when component state is preserved or reset and deliberately control identity when the user context changes. | D3 |

**Facet prerequisites and cross-references:** T05.3 needs T04.2. T05.4 needs T04.4.

**Overlap with companion roadmaps:** New scope; neither companion roadmap covers UI state.

**Tier 1 concept families:** Component boundary; props or inputs; local state; derived state; controlled component; event handler; effect or synchronization; identity and keys.

**Evidence form and chat projection:** Component code plus explanation. Chat projection: strong. Visual rendering is environment-only.

**Not necessary at default scope:** Framework compiler and reconciler internals, state-library internals.

**Reading references:** React, Managing State [35]; React, You Might Not Need an Effect [36].

### T06 — Forms, routing, and asynchronous interaction flows

**Family:** F02 Web experience engineering. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** B: Forms, navigation, and async UI are unavoidable in the feature-build and frontend formats documented by Amazon, Great Question, and PostHog [17][12][29]; W3C documents accessible form behavior [37].

**Technique cues:** A form or wizard; search-as-you-type; filter state that should survive reload; a double-submit bug; results that flash stale data.

**Common failure modes:** Disabling native form semantics; losing user input after an error; URL and UI drifting apart; a stale response overwriting a newer one; errors not announced or associated with fields.

| Objective | Target capability | Required depth |
|---|---|---|
| T06.1 | Model form value, validation, and submission states without conflating client convenience checks with authoritative server validation. | D3 |
| T06.2 | Implement or specify submit, pending, success, error, and retry behavior that prevents accidental duplicate actions and preserves useful user input. | D3 |
| T06.3 | Represent navigable product state appropriately in route, path, or query parameters so deep links and browser navigation remain meaningful. | D3 |
| T06.4 | Handle changing asynchronous inputs without allowing stale responses to overwrite the current UI. | D3 |
| T06.5 | Produce a form flow whose labels, errors, focus behavior, and keyboard operation remain understandable when validation fails. | D3 |

**Facet prerequisites and cross-references:** T06.1 and T06.5 need T04.2; T06.5 also needs T08.1–T08.2 facets when accessibility is assessed. T06.4 needs T04.3 and T05.4. Server validation may thinly reference the system-design roadmap's API-contract module.

**Overlap with companion roadmaps:** New scope on the client; server-side validation contracts belong to the system-design roadmap.

**Tier 1 concept families:** Controlled form; client versus server validation; pending state; duplicate submission; route and query state; cancellation and stale response; focus and error association.

**Evidence form and chat projection:** Component, state machine, or code. Chat projection: strong for logic, partial for focus behavior (real keyboard testing is environment-only).

**Not necessary at default scope:** Router internals, form-library APIs.

**Reading references:** W3C WAI Forms Tutorial, labeling, instructions, and notifications [37]; React, You Might Not Need an Effect, fetching data [36].

### T07 — Client/server state, caching, and optimistic interaction

**Family:** F02 Web experience engineering. **Priority:** P0. **Classification:** New core topic with thin cross-reference to backend caching.

**Evidence basis:** B: Interactive product work requires reconciling client views with server truth; OpenAI's consumer full-stack roles emphasize responsive interactive experiences backed by APIs [7]. TanStack Query documentation is used as an implementation reference only [44][45].

**Technique cues:** "Make it feel instant"; a stale list after a mutation; refetch behavior; pagination; cache invalidation; two tabs editing the same item.

**Common failure modes:** Treating server state as ordinary local state; optimistic success without rollback; invalidating everything blindly; cache keys that ignore filters.

| Objective | Target capability | Required depth |
|---|---|---|
| T07.1 | Distinguish ephemeral UI state, durable server state, and client-side cached representations of server state. | D3 |
| T07.2 | Choose a freshness, refetch, or invalidation strategy that matches the cost and staleness tolerance of a feature. | D3 |
| T07.3 | Design an optimistic mutation with visible pending state, rollback or reconciliation, and explicit handling of server rejection. | D3 |
| T07.4 | Define cache identity for filtered, paginated, or parameterized data so distinct server results do not alias. | D3 |
| T07.5 | Reason through overlapping requests or mutations and choose a user-visible conflict or reconciliation strategy. | D3 |

**Facet prerequisites and cross-references:** T07.1 needs T05.2. T07.2–T07.5 need T04.3. The system-design roadmap's caching/CDN module is a conceptual cross-reference only.

**Overlap with companion roadmaps:** Server-side caching, replication, and consistency internals belong to the system-design roadmap; this topic owns the client's view of server state.

**Tier 1 concept families:** Server state; cache key; stale versus fresh; invalidation; background refetch; optimistic state; rollback; reconciliation; conflicting edits.

**Evidence form and chat projection:** State trace, code, critique. Chat projection: strong. No environment-only facets.

**Not necessary at default scope:** Building a distributed cache, cache-coherence research, data-library internals.

**Reading references:** TanStack Query, Important Defaults [44]; TanStack Query, Optimistic Updates [45].

### T08 — Accessibility, responsive behavior, and internationalization readiness

**Family:** F02 Web experience engineering. **Priority:** P0 (internationalization depth is shallow). **Classification:** New core topic.

**Evidence basis:** A: Amazon's frontend design criteria include accessibility and usability [17]; W3C requires keyboard-operable functionality and accessible forms [38][37]; MDN documents responsive layout and locale-sensitive Intl APIs [40][41].

**Technique cues:** A modal, menu, or form; keyboard-only use; a phone-width layout; locale-dependent dates or currency; right-to-left text; overflowing labels.

**Common failure modes:** A div used as a button; mouse-only operation; removed focus indicators; fixed-width assumptions; string concatenation for localized messages.

| Objective | Target capability | Required depth |
|---|---|---|
| T08.1 | Choose semantic HTML and accessible names and relationships for common interactive controls before adding ARIA. | D3 |
| T08.2 | Trace keyboard focus through an interaction and repair unreachable controls, traps, or missing visible focus. | D3 |
| T08.3 | Implement or critique a layout so content reflows and remains usable across narrow and wide viewports without device-specific assumptions. | D3 |
| T08.4 | Format locale-sensitive dates, numbers, and text while avoiding assumptions about string length, language, or text direction. | D2 |
| T08.5 | Review a component and prioritize concrete accessibility, responsiveness, and localization-readiness defects. | D3 |

**Facet prerequisites and cross-references:** T08.1–T08.2 need T04.2 and T04.5. T08.3 needs basic HTML/CSS only.

**Overlap with companion roadmaps:** New scope. The system-design roadmap explicitly excludes frontend rendering.

**Tier 1 concept families:** Semantic element; accessible name; label; focus order and visible focus; keyboard operation; reflow; flexible layout; breakpoint; locale formatting; text expansion; text direction.

**Evidence form and chat projection:** Markup, CSS, or component critique. Chat projection: moderate. Real keyboard, screen-reader, and rendered-layout verification is environment-only (ENV01).

**Not necessary at default scope:** Memorizing WCAG criterion numbers, screen-reader expertise, the bidirectional-text algorithm, localization program management.

**Reading references:** W3C WAI, Accessibility Principles, operable interface [38]; WAI Forms Tutorial [37]; W3C WAI, How to Meet WCAG 2.2, keyboard and focus criteria [39]; MDN, Responsive web design [40]; MDN, Intl [41].

### T09 — Frontend and perceived performance

**Family:** F02 Web experience engineering. **Priority:** P1 (P0 for frontend-heavy or consumer targets). **Classification:** New core topic.

**Evidence basis:** A: Amazon includes performance in frontend system design [17]; OpenAI consumer full-stack roles call for responsiveness and performance work [7].

**Technique cues:** Slow first load; jank; input lag; a large JavaScript bundle; a request waterfall; poor Web Vitals.

**Common failure modes:** Optimizing without measurement; confusing lab data with field data; memoizing indiscriminately; shrinking bundles while ignoring interaction work.

| Objective | Target capability | Required depth |
|---|---|---|
| T09.1 | Classify a slow experience as primarily network/loading, main-thread/rendering, data-fetch sequencing, or unnecessary-work risk using supplied evidence. | D3 |
| T09.2 | Explain what LCP, INP, and CLS reveal and do not reveal about user experience. | D2 |
| T09.3 | Choose an appropriate lazy-loading, code-splitting, prefetching, or resource-priority tactic for a stated bottleneck. | D2 |
| T09.4 | Identify avoidable render or computation work and propose a simpler fix before applying memoization indiscriminately. | D3 |
| T09.5 | Define a before/after measurement plan and performance guardrail for a feature change. | D3 |

**Facet prerequisites and cross-references:** T09.1 uses T04.1 and T04.4. T09.4 uses T05.2 and T05.4. The system-design roadmap's workload/latency module is cross-referenced only for server contribution.

**Overlap with companion roadmaps:** Server latency and capacity belong to the system-design roadmap; this topic owns the client's contribution and perceived performance.

**Tier 1 concept families:** Critical resource; render-blocking; LCP; INP; CLS; main thread; code splitting; lazy loading; request waterfall; lab versus field data.

**Evidence form and chat projection:** Diagnosis from supplied evidence, optimization proposal, measurement plan. Chat projection: moderate. Real profiling is environment-only (ENV02).

**Not necessary at default scope:** Browser-engine profiling expertise, microbenchmark trivia.

**Reading references:** web.dev, Interaction to Next Paint [42]; web.dev, Optimize Largest Contentful Paint [43].

### T10 — Feature-level API contracts and product data modeling

**Family:** F03 Feature architecture. **Priority:** P0. **Classification:** Thin cross-reference to the system-design roadmap (product-specific angle only).

**Evidence basis:** A: OpenAI's Product Engineer role includes APIs and product systems [2]; full-stack roles bridge UI and services [7]; PostHog expects product engineers to define data models [28]. Secondary sources consistently describe Meta's product-architecture round as API- and data-model-centred [31][32].

**Technique cues:** A new CRUD feature; list, filter, or search; audit history; "what should the API look like?"; "the frontend needs...".

**Common failure modes:** RPC endpoints mirroring buttons; ambiguous error semantics; unstable pagination; authorization assumed in the UI only.

| Objective | Target capability | Required depth |
|---|---|---|
| T10.1 | Translate a user workflow into stable resource or action boundaries and identifiers without leaking incidental UI structure into every contract. | D3 |
| T10.2 | Specify request, response, validation, and error semantics that let the client distinguish actionable outcomes. | D3 |
| T10.3 | Define pagination, sorting, filtering, and search semantics precisely enough that client state can reproduce a result set. | D3 |
| T10.4 | Model ownership and lifecycle states such as draft, archived, soft-deleted, or historical records when the product requires them. | D3 |
| T10.5 | Revise a feature contract compatibly when a new requirement changes data shape or behavior. | D3 |

**Facet prerequisites and cross-references:** Cross-references the system-design roadmap's API-contract/low-level-design and storage/schema modules; T10.5 also references its evolution/migration module. Only feature-facing facets are assessed here.

**Overlap with companion roadmaps:** Highest overlap in this roadmap. Do not re-teach indexes, transactions, isolation, or storage engines. Assess whether the learner applies contract and schema ideas to a product feature.

**Tier 1 concept families:** Resource versus action; identifier; validation error versus server error; cursor versus offset page; filter, sort, and search; lifecycle state; backward compatibility.

**Evidence form and chat projection:** API or schema sketch. Chat projection: strong. Query execution is environment-only and not required.

**Not necessary at default scope:** Re-teaching database internals, distributed storage, or transaction mechanics.

**Reading references:** Secondary: Hello Interview, Meta product architecture preparation [31] (practitioner source, not employer guidance). Mechanism references live in the system-design roadmap.

### T11 — Authentication, sessions, authorization, and tenant-aware feature behavior

**Family:** F03 Feature architecture. **Priority:** P0. **Classification:** Thin cross-reference to the system-design roadmap (product-specific angle only).

**Evidence basis:** A: Current enterprise and product roles include permissions and audit concerns [2][6]; PostHog lists coding permissions logic as a product-engineer skill [28]; OWASP treats sessions and access control as distinct responsibilities [46][47].

**Technique cues:** Organizations or workspaces; admin versus member; "can edit"; session expired; invitations; plan-based access.

**Common failure modes:** Frontend-only checks; role names without defined permissions; accepting a tenant ID from the client without authorization; conflating permission with billing entitlement.

| Objective | Target capability | Required depth |
|---|---|---|
| T11.1 | Distinguish authentication, session state, authorization, tenant membership, and commercial entitlement in a feature flow. | D3 |
| T11.2 | Map a role or permission rule to both server enforcement and coherent UI affordances without treating hidden UI as authorization. | D3 |
| T11.3 | Detect missing tenant or object scoping in a feature contract or query and explain the resulting cross-tenant risk. | D3 |
| T11.4 | Design user-visible behavior for expired sessions, reauthentication, revoked access, and permission changes during an interaction. | D3 |
| T11.5 | Produce a least-privilege flow for a sensitive action including relevant audit and user-feedback requirements. | D3 |

**Facet prerequisites and cross-references:** Cross-references the system-design roadmap's security/authorization/multitenancy module. T11.4 uses T06.2.

**Overlap with companion roadmaps:** Security mechanisms and tenancy isolation architecture belong to the system-design roadmap; this topic owns how permissions shape a feature's contract and UX.

**Tier 1 concept families:** Identity; session; role; capability; tenant scope; object-level authorization; reauthentication; least privilege; entitlement versus permission.

**Evidence form and chat projection:** Permission matrix, flow critique. Chat projection: strong. No environment-only facets.

**Not necessary at default scope:** Cryptographic protocol design, OAuth/OIDC implementation internals, IAM platform architecture.

**Reading references:** OWASP Authentication Cheat Sheet [46]; OWASP Session Management Cheat Sheet [47].

### T12 — SaaS lifecycle and third-party product workflows

**Family:** F03 Feature architecture. **Priority:** P1 (P0 for B2B SaaS targets). **Classification:** New core topic with thin backend cross-references.

**Evidence basis:** A: PostHog lists billing, onboarding, and third-party integrations such as Stripe as product-engineer work [28]; OpenAI's Applied Foundations role names identity and payments as product layers [5]; Stripe documents subscription state as asynchronous and webhook-driven [48][49].

**Technique cues:** Subscription or plan gate; webhook; CSV import or export; "connect your account"; invitation email; onboarding flow.

**Common failure modes:** A single paid=true flag; assuming webhook ordering; silent partial import failure; integrations with no revoked-credential state; onboarding with no abandonment path.

| Objective | Target capability | Required depth |
|---|---|---|
| T12.1 | Model a subscription, plan, and entitlement lifecycle so product access corresponds to authoritative commercial state rather than a single boolean. | D3 |
| T12.2 | Specify webhook or event processing from the product-feature perspective, including duplicate delivery, out-of-order timing, and eventual UI reconciliation. | D3 |
| T12.3 | Design an onboarding, invitation, or notification flow with explicit completion, abandonment, and resend or recovery states. | D3 |
| T12.4 | Design import/export behavior with validation, progress, partial failure, and recoverability visible to the user. | D3 |
| T12.5 | Model the user lifecycle of a third-party integration from connect and authorize through degraded behavior, revoked access, and disconnect. | D3 |

**Facet prerequisites and cross-references:** T12.1 uses T11.1. T12.2 cross-references the system-design roadmap's idempotency, messaging/ordering, and workflow/outbox modules without teaching their internals.

**Overlap with companion roadmaps:** Delivery guarantees and workflow internals belong to the system-design roadmap; this topic owns product lifecycle states and user-visible behavior.

**Tier 1 concept families:** Subscription state; entitlement; asynchronous event; duplicate and out-of-order delivery; invitation; notification preference; import validation; integration authorization and revocation.

**Evidence form and chat projection:** State machine, API sketch, UX specification. Chat projection: strong. No environment-only facets.

**Not necessary at default scope:** Revenue recognition and accounting, payment-network internals, message-broker architecture.

**Reading references:** Stripe Docs, Subscriptions [48]; Stripe Docs, Using webhooks with subscriptions [49].

### T13 — Testing strategy for product code

**Family:** F04 Quality and operation. **Priority:** P0. **Classification:** New core topic with thin testing cross-reference.

**Evidence basis:** A: Microsoft expects candidates to test solutions and consider boundaries [20]; current product roles call out testing and safe rollout [2].

**Technique cues:** "How would you test this?"; a regression; a flaky end-to-end test; a refactor with no safety net.

**Common failure modes:** Pyramid dogma without risk reasoning; snapshots everywhere; assertions coupled to implementation; no negative or permission paths.

| Objective | Target capability | Required depth |
|---|---|---|
| T13.1 | Choose unit, component/integration, contract, or end-to-end coverage according to the behavior and failure being protected. | D3 |
| T13.2 | Produce a risk-based test plan covering critical success, failure, permission, and boundary paths without duplicating every behavior at every layer. | D3 |
| T13.3 | Isolate or control external dependencies so tests remain deterministic while retaining meaningful integration coverage. | D3 |
| T13.4 | Diagnose brittle or flaky UI tests caused by timing, shared state, or implementation-coupled selectors and propose a resilient alternative. | D3 |
| T13.5 | State explicitly what not to test and justify the omission from risk, ownership, and confidence. | D3 |

**Facet prerequisites and cross-references:** T13.2 uses whichever feature objective is under test. Cross-reference the Python roadmap's implementation/testing topic for code-level test design and the system-design roadmap's observability/testing module for system facets.

**Overlap with companion roadmaps:** Code-level test cases belong to the Python roadmap; this topic owns choosing test layers for product features.

**Tier 1 concept families:** Unit; integration or component; contract; end-to-end; fixture; isolation; user-facing locator; flakiness; regression.

**Evidence form and chat projection:** Test plan, tests, critique. Chat projection: strong. Running tests is environment-only (ENV06); never claim tests passed unless run.

**Not necessary at default scope:** Test-framework internals, exhaustive combinatorial testing, performance-test engineering.

**Reading references:** Playwright, Best Practices [50]; Playwright, Isolation [51].

### T14 — Reading unfamiliar code and debugging safely

**Family:** F04 Quality and operation. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** A: GitLab's technical interview gives candidates an unfamiliar merge request [13]; Stripe documented a Bug Squash work sample on a real historical bug [23]; PostHog's SuperDay includes a debugging session without AI beyond autocomplete [30]; Junction's product-engineer loop includes live debugging [26].

**Technique cues:** An unfamiliar repository; a production bug report; "where would you look first?"; a failing test.

**Common failure modes:** Reading everything linearly; shotgun changes; locking onto the first hypothesis; refactoring while debugging; no regression check.

| Objective | Target capability | Required depth |
|---|---|---|
| T14.1 | Build a minimal map of an unfamiliar feature by locating entry points, data flow, tests, and relevant boundaries without reading the repository linearly. | D3 |
| T14.2 | Reduce a reported defect to a reproducible symptom and state the smallest known failing condition. | D3 |
| T14.3 | Maintain competing debugging hypotheses and update them from code, log, or test evidence rather than changing code speculatively. | D3 |
| T14.4 | Implement a minimal fix that follows local conventions and avoids unrelated refactoring. | D3 |
| T14.5 | Verify the fix with targeted regression evidence and identify remaining uncertainty or broader follow-up work. | D3 |

**Facet prerequisites and cross-references:** Depends only on facets implicated by the bug. The Python roadmap's interview-execution topic is relevant to disciplined coding, not to repository navigation.

**Overlap with companion roadmaps:** New scope.

**Tier 1 concept families:** Entry point; call and data flow; reproduction; hypothesis; instrumentation; minimal diff; regression.

**Evidence form and chat projection:** Code-reading map from supplied files, hypothesis log, patch critique. Chat projection: moderate. Genuine repository navigation and reproduction are environment-only (ENV03).

**Not necessary at default scope:** Debugger command memorization, mastery of a particular monorepo tool.

**Reading references:** Stripe Atlas, Scaling engineering organizations, Bug Squash section [23]; GitLab Technical Interviews [13].

### T15 — Code review and maintainability judgment

**Family:** F04 Quality and operation. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** A: GitLab centers its technical interview on reviewing a merge request, then implementing and discussing changes [13]; PostHog lists giving and receiving code-review feedback as a core skill [28].

**Technique cues:** A PR or MR; a diff; "review this"; a proposed refactor.

**Common failure modes:** Lint-only review; an unranked wall of comments; style preference presented as a correctness defect; ignoring rollout and tests.

| Objective | Target capability | Required depth |
|---|---|---|
| T15.1 | Identify correctness, security/permission, accessibility, performance, testability, and maintainability risks in a supplied change. | D3 |
| T15.2 | Prioritize review feedback by user and production risk rather than presenting style issues as equivalent to correctness defects. | D3 |
| T15.3 | Write a concise, actionable review comment that explains consequence and desired property without unnecessary prescriptiveness. | D3 |
| T15.4 | Evaluate whether a proposed abstraction, naming choice, or refactor improves the local design enough to justify its complexity. | D3 |
| T15.5 | Expand review beyond changed lines when contract compatibility, tests, rollout, or data lifecycle create adjacent risk. | D3 |

**Facet prerequisites and cross-references:** Individual findings use only relevant facets, for example T08.1 for accessibility or T11.2 for authorization. Never lock T15 behind whole topics.

**Overlap with companion roadmaps:** New scope.

**Tier 1 concept families:** Severity; correctness; contract; readability; abstraction cost; regression risk; actionable feedback.

**Evidence form and chat projection:** Review comments with prioritization on a supplied diff. Chat projection: very strong. No environment-only facets.

**Not necessary at default scope:** Language style-guide trivia unless the target stack requires it.

**Reading references:** GitLab Technical Interviews, merge-request review workflow [13].

### T16 — Feature flags, incremental rollout, migration, and rollback

**Family:** F04 Quality and operation. **Priority:** P0. **Classification:** New core topic with thin backend migration cross-reference.

**Evidence basis:** A: PostHog treats safely testing in production as fundamental [28]; product roles emphasize safe rollout [2][6]; LaunchDarkly documents separating deploy from release and progressive rollouts [52][53]; Microsoft Research documents controlled rollout as risk management [56].

**Technique cues:** A risky launch; a schema change under a live feature; a beta cohort; "how do we roll back?".

**Common failure modes:** Using a flag as authorization; no rollback plan before launch; an irreversible schema break; releasing to everyone with no observation window; flags never cleaned up.

| Objective | Target capability | Required depth |
|---|---|---|
| T16.1 | Distinguish deploying code from releasing a user-visible capability and identify when decoupling them reduces risk. | D3 |
| T16.2 | Choose a flag, targeting, or rollout strategy appropriate to the blast radius and user identity of a feature. | D3 |
| T16.3 | Produce a compatibility-first migration plan when old and new application versions or data representations overlap. | D3 |
| T16.4 | Define rollback, kill-switch, and abort criteria before launch, including what cannot be safely rolled back. | D4 |
| T16.5 | Specify post-release validation and flag or migration cleanup so temporary release machinery does not become permanent debt. | D3 |

**Facet prerequisites and cross-references:** T16.3 cross-references the system-design roadmap's evolution/migration and storage modules. T16.4 may use its reliability/recovery module.

**Overlap with companion roadmaps:** Mixed-version migration mechanics belong to the system-design roadmap; this topic owns feature release decisions.

**Tier 1 concept families:** Deploy versus release; release flag; cohort; percentage rollout; compatibility window; kill switch; abort criterion; cleanup.

**Evidence form and chat projection:** Rollout and migration plan. Chat projection: very strong. No environment-only facets.

**Not necessary at default scope:** Flag-vendor administration, deployment-platform engineering.

**Reading references:** LaunchDarkly, Release flags [52]; LaunchDarkly, Progressive rollouts [53]; Microsoft Research, Safe Velocity [56]; PostHog skills section 8 [28].

### T17 — Feature observability and production-bug response

**Family:** F04 Quality and operation. **Priority:** P1. **Classification:** Thin cross-reference to the system-design roadmap (product-specific angle only).

**Evidence basis:** A: OpenAI's Product Engineer role includes observability and operating what is shipped [2]; PostHog expects product engineers to use error tracking, logs, and replays to diagnose issues [28].

**Technique cues:** A spike in errors; a support report; a funnel drop; a regression right after a release.

**Common failure modes:** Logs with no user context; debugging from averages only; fixing before limiting blast radius; declaring success because the deploy finished.

| Objective | Target capability | Required depth |
|---|---|---|
| T17.1 | Define feature-level telemetry that connects technical errors and latency to user-visible success or failure. | D3 |
| T17.2 | Use supplied logs, traces, errors, and product metrics to narrow the affected user population and likely boundary. | D3 |
| T17.3 | Triage a production defect by severity, scope, reproducibility, data or safety risk, and available mitigation. | D3 |
| T17.4 | Choose between rollback, disabling a feature, operational mitigation, and an immediate code fix based on blast radius and reversibility. | D3 |
| T17.5 | Specify post-fix validation and the minimum follow-up needed to prevent recurrence or improve diagnosis. | D3 |

**Facet prerequisites and cross-references:** Cross-references the system-design roadmap's observability/testing and reliability/recovery modules. T17.4 uses T16.4.

**Overlap with companion roadmaps:** Telemetry infrastructure, SLOs, and incident programs belong to the system-design roadmap; this topic owns feature-level health and response.

**Tier 1 concept families:** Symptom; user impact; scope; correlation; feature health; mitigation; rollback; validation.

**Evidence form and chat projection:** Telemetry plan, incident analysis from supplied evidence. Chat projection: strong for reasoning, partial for live tooling.

**Not necessary at default scope:** SRE capacity planning, tracing implementation, on-call program design.

**Reading references:** PostHog skills section 3, uncovering and fixing technical issues [28].

### T18 — Product UX states, resilience, and interaction polish

**Family:** F05 Product experience and ownership. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** A: PostHog expects product engineers to ship coherent experiences without a designer in the loop [28]; Amazon's frontend criteria include usability and UX [17]; OpenAI consumer roles emphasize polished experiences [7].

**Technique cues:** A loading spinner; an empty page; a destructive action; a timeout; a partial failure.

**Common failure modes:** Happy-path-only UI; permanent spinners; generic "something went wrong"; irreversible actions without confirmation or undo; lost form state on error.

| Objective | Target capability | Required depth |
|---|---|---|
| T18.1 | Enumerate the user-visible state model of a feature including loading, empty, success, error, partial, unavailable, and permission-constrained states that actually apply. | D3 |
| T18.2 | Choose feedback, confirmation, undo, or retry behavior proportional to an action's latency, reversibility, and consequence. | D3 |
| T18.3 | Design degraded or failure behavior that preserves user context and offers a meaningful recovery path. | D3 |
| T18.4 | Write or critique concise user-facing status and error copy that states what happened and what the user can do next without exposing internals. | D3 |
| T18.5 | Review an end-to-end flow for edge cases where otherwise-correct technical behavior produces confusing or unsafe UX. | D3 |

**Facet prerequisites and cross-references:** T18.1 uses T01.5. T18.3 may use T06.2 and T07.3. T18.5 uses only relevant feature facets.

**Overlap with companion roadmaps:** New scope.

**Tier 1 concept families:** Loading, empty, error, success, and partial states; pending state; confirmation; undo; retry; degraded state; affordance.

**Evidence form and chat projection:** State diagram, component, spec critique. Chat projection: very strong conceptually; visual polish is environment-only and not required.

**Not necessary at default scope:** Visual design systems, typography, animation craft (X04 or a design-engineer target).

**Reading references:** W3C WAI Forms Tutorial, user notifications [37]; PostHog skills section 7 [28].

### T19 — End-to-end feature ownership and cross-layer integration

**Family:** F05 Product experience and ownership. **Priority:** P0. **Classification:** New core topic.

**Evidence basis:** A: End-to-end ownership is the strongest recurring signal across explicit product-engineer and product-minded full-stack roles [2][1][7][27]; PostHog's full-stack SuperDay asks candidates to build a small backend-and-frontend service and ship a working core early [29][30]. Secondary sources describe Meta's product-architecture round as starting from user experience and working through API and data model [31][32].

**Technique cues:** "Build this feature end to end"; architecture plus UX; competing product and technical trade-offs.

**Common failure modes:** An architecture diagram disconnected from the user flow; server-first overdesign; no metric or release story; a design that cannot change one layer without redesigning all layers.

| Objective | Target capability | Required depth |
|---|---|---|
| T19.1 | Connect a product requirement to the necessary UI, contract, data, authorization, test, metric, and rollout artifacts without inventing unnecessary layers. | D3 |
| T19.2 | Identify cross-layer assumptions and failure propagation that could make individually correct components produce an incorrect product. | D3 |
| T19.3 | Choose a thin end-to-end slice that demonstrates the riskiest user value before broadening implementation. | D3 |
| T19.4 | Define how the team will decide after release whether the feature worked technically and for users. | D3 |
| T19.5 | Adapt the integrated design when one meaningful assumption changes, preserving what can remain stable and revising what must change. | D4 |

**Facet prerequisites and cross-references:** Facet-specific only: a permission-heavy task needs T11.2; optimistic UX needs T07.3; a rollout-sensitive task needs T16.4. No whole-topic lock.

**Overlap with companion roadmaps:** Backend scale mechanics belong to the system-design roadmap; this topic owns integration of product, client, and contract decisions.

**Tier 1 concept families:** Vertical slice; cross-layer contract; invariant; user outcome; deploy versus release; feedback loop.

**Evidence form and chat projection:** Integrated feature specification. Chat projection: very strong. A runnable build is environment-only (ENV04).

**Not necessary at default scope:** Re-teaching distributed-systems internals owned by the system-design roadmap.

**Reading references:** PostHog, Preparing for the engineering SuperDay [30]; secondary: IGotAnOffer, Meta product architecture interview [32].

### T20 — AI-assisted software-engineering judgment

**Family:** F06 AI-assisted engineering judgment. **Priority:** P1 (P0 where the target permits or expects AI in the technical exercise). **Classification:** New core topic.

**Evidence basis:** A: Interview policies range from prohibition by default (Anthropic [16]) to encouraged with accountability (GitLab [14]) to expected (Great Question [12]); PostHog allows AI in its SuperDay build but requires candidates to explain and defend the result, and bans it in the debugging session [30]; PostHog calls AI-assisted coding table stakes [28].

**Technique cues:** "AI tools allowed"; "use your normal tools"; a generated patch; agent-produced tests; an unfamiliar repository explored with AI.

**Common failure modes:** Prompt-and-accept; an explanation the candidate cannot defend; dumping huge undirected context; leaking secrets; attributing decisions to the model.

| Objective | Target capability | Required depth |
|---|---|---|
| T20.1 | Use an AI-generated orientation or implementation proposal as a hypothesis to inspect rather than as authoritative repository knowledge. | D3 |
| T20.2 | Review generated code for requirement fit, correctness, security and permissions, failure behavior, tests, and unnecessary complexity before accepting it. | D3 |
| T20.3 | Select and provide only the context required for the task while avoiding disclosure of credentials, secrets, or unrelated sensitive information. | D2 |
| T20.4 | Verify important generated claims through code, tests, documentation, or runtime evidence and explicitly distinguish verified facts from tool suggestions. | D3 |
| T20.5 | Explain the final design and code as the responsible engineer, including why generated alternatives were accepted, changed, or rejected. | D3 |

**Facet prerequisites and cross-references:** T20.2 depends only on the feature facets the generated code touches. T20.4 uses T13 and T14 techniques.

**Overlap with companion roadmaps:** New scope. Building LLM-powered product features is X03, not this topic.

**Tier 1 concept families:** Context selection; generated patch; validation; provenance; hallucinated repository fact; human ownership; interview tool policy.

**Evidence form and chat projection:** Critique of tutor-constructed generated code, validation plan, defended explanation. Chat projection: partial. Steering a real tool in a real repository is environment-only (ENV05).

**Not necessary at default scope:** Prompt folklore, multi-agent infrastructure, model training, LLM product evaluation (X03).

**Reading references:** GitLab, AI in the interview process [14]; Anthropic, Candidate AI Guidance [16]; PostHog SuperDay AI policy [30]; OpenAI, How OpenAI uses Codex [57].

## 8. Integration coverage, not fixed interview questions

Small cross-topic connections are allowed within the opened tier when their participating checkpoints permit; do not reserve every combination for W4. Do not use mixing to introduce a harder tier early. Final passes require independent selection and the scope below at terminal depth. No scenario, product brief, codebase, fixture, or expected solution belongs in this source.

| Area | Coverage focus | Relevant topics | Final evidence contract | Selection guidance |
|---|---|---|---|---|
| I01 | End-to-end feature slice | T01, T03, T05–T07, T10, T13, T16, T19 | From an ambiguous need, produce scope, UI state model, contract, test strategy, rollout, and success metric that are mutually consistent, and handle a follow-up change | Required; the broadest product-engineering synthesis |
| I02 | Unfamiliar codebase change | T13–T15, T17, T20 | Orient in supplied unfamiliar code, localize a defect or change point with hypotheses, propose a minimal change, review adjacent risk, and state regression evidence; optionally validate tool-generated suggestions | Required; reflects documented review and debugging formats [13][23][30] |
| I03 | Frontend-heavy interactive feature | T04–T09, T13, T18 | Stateful UI with async data and a form: events, state ownership, race handling, accessibility, responsiveness, performance risk, tests, and UX states defended together | Required; weight higher for frontend-heavy targets [17] |
| I04 | B2B SaaS permissions and commercial state | T10–T12, T16, T18–T19 | Tenant-safe feature gated by role and entitlement, with lifecycle events, degraded behavior, and rollout | Required by default; may be deselected for consumer or creative targets by a recorded scope decision |
| I05 | Product-sense-to-implementation trade-off | T01–T03, T18–T19 | Change technical scope when user evidence, deadline, or priority changes, and explain what was kept, cut, and why | Required; mirrors product-sense and over-scoped work-trial formats [1][30] |
| I06 | Production issue after release | T14, T16–T19 | Detect user harm from supplied signals, limit blast radius, debug, choose mitigation, verify, and communicate | Required |
| I07 | Measured product iteration | T02, T16–T19 | Instrument, release gradually, read outcome and health signals, and decide whether to iterate, with stated uncertainty | Optional; select for product-led or growth targets |

**Coverage accounting.** For each integrated attempt, record the exact objective IDs actually evaluated. Mark an area demonstrated only when its skills are independently coherent at terminal scope and its follow-up is handled. A mixed success does not pass every participating objective. Keep objective, integration, and environment coverage separate.

**Preserve distinctive coverage.** Do not substitute a clean greenfield design for I02's unfamiliar-code work, a backend-only design for I03's client concerns, or a consumer flow for I04's tenancy and entitlement concerns.

## 9. Role-specific extensions and exclusions

### 9.1 Extensions X01–X09

Extensions are not members of the fixed 100-objective core. They enter the breadth rotation only after an explicit scope selection recorded in Section 0.9, using the backfill rule in Section 4.1. When selected, add rows for their objectives to the ledger at the targets shown, extend the topic board, and update every denominator. Unselected extensions receive no required orientation.

| Extension | Select when | Objectives | Default targets when selected |
|---|---|---|---|
| X01 — Mobile / cross-platform product engineering | Native iOS/Android, React Native, Flutter, or desktop-client product roles | **X01.1** Model application lifecycle, navigation, and persistent/local state across suspend, resume, and relaunch. **X01.2** Design a feature for intermittent connectivity and synchronization without conflating local responsiveness with server truth. **X01.3** Plan distribution, crash monitoring, device permissions, and rollback/update constraints for a shipped mobile change | D3 / D3 / D3 |
| X02 — Growth and experimentation engineering | Growth, activation, monetization, lifecycle, or conversion teams [10] | **X02.1** Translate a growth objective into a funnel or activation model with explicit numerator, denominator, and guardrails. **X02.2** Design and critique a trustworthy online experiment beyond T02's baseline, including exposure and randomization integrity and interpretation pitfalls. **X02.3** Choose reversible implementation and measurement shortcuts appropriate to an experiment without creating unacceptable user, security, or data risk | D3 / D3 / D4 |
| X03 — LLM-powered product features | The role builds generative-AI features, agents, retrieval, or evaluations [12] | **X03.1** Design model interaction around explicit product failure modes, latency and cost budgets, and fallback UX rather than a happy-path prompt. **X03.2** Define an evaluation dataset and criteria that compare behavior across prompt, model, or system changes and distinguish offline quality from real user outcome. **X03.3** Diagnose a failing LLM workflow across context, retrieval or tool execution, model behavior, and downstream product logic, then choose the cheapest justified intervention | D3 / D3 / D4 |
| X04 — Design systems and frontend infrastructure | Design-system, UI-platform, or very frontend-heavy staff roles | **X04.1** Design a reusable component API that preserves semantics and accessibility while supporting intended variants. **X04.2** Evaluate consistency, theming and tokens, composition, and escape hatches without creating an unbounded abstraction layer. **X04.3** Plan a compatible migration and adoption strategy for a widely used UI primitive | D3 / D4 / D4 |
| X05 — B2B enterprise integrations | Enterprise SaaS, identity- or integration-heavy products, customer workflow platforms [6] | **X05.1** Model installation, configuration, credentials, authorization scope, tenant mapping, and revocation for an enterprise integration. **X05.2** Design reconciliation and operator UX when external systems are delayed, unavailable, or inconsistent. **X05.3** Scope an enterprise customization request into reusable product capability versus customer-specific work and justify the boundary | D3 / D4 / D4 |
| X06 — Developer-tools products | APIs, SDKs, CLIs, IDE tooling, developer platforms | **X06.1** Define a developer-facing API or SDK workflow whose defaults, error model, and documentation surface reduce misuse. **X06.2** Design local development feedback for partial configuration, authentication, and remote-service failure. **X06.3** Evaluate compatibility and migration impact where users integrate the product into their own code or CI | D3 / D3 / D4 |
| X07 — Frontend system design and real-time client architecture | Frontend-heavy, creative-tool, collaborative, or AI-product roles, and any loop with a frontend system design, UI architecture, or product architecture round [17][61][63] | **X07.1** Deliver a time-boxed frontend system design for a product surface: clarify requirements, then cover component and state architecture, client-server data flow and API contract, rendering strategy, performance and accessibility budgets, failure states, and instrumentation, prioritized by risk. **X07.2** Design client behavior for real-time or collaborative data: choose a transport (polling, server-sent events, or WebSockets), handle reconnection and missed updates, queue local mutations with optimistic state, and choose a conflict-handling approach (last-write-wins, server-authoritative merge, operational transformation, or CRDTs) by its trade-offs without implementing the algorithm. **X07.3** Design rendering for very large, frequently updating, or streamed content (for example virtualized lists, large canvases, or streamed AI responses) that controls memory, layout shift, and input latency, and adapt the design when a stated constraint changes | D3 / D3 / D4 |
| X08 — Timed JavaScript and TypeScript UI coding | Loops with a frontend or UI coding round, where the language shifts from the algorithm-round language to JavaScript or TypeScript [17] | **X08.1** Predict and explain JavaScript runtime behavior common in UI coding rounds: closures, `this` binding, promise resolution order relative to other queued work, and error propagation in async code, and type the relevant utilities in TypeScript. **X08.2** Implement common UI-round utilities in plain JavaScript or TypeScript (debounce or throttle, an event emitter, promise helpers, DOM traversal or event delegation) with correct edge cases and a small set of tests. **X08.3** Implement a small interactive component under a time box, both without a framework and in React, covering state, events, keyboard operation, and async data, and state what was cut to fit the time | D3 / D3 / D3 |
| X09 — Project deep dives and behavioral narratives | Any loop with a project deep dive, life-story, values, or leadership-principles round, and especially candidates changing domain [1][19][22] | **X09.1** Build accurate narratives of the learner's own past projects covering problem, personal contribution, decisions, trade-offs, outcome, and lessons, using only real facts and real or clearly qualified numbers. **X09.2** Answer follow-up probes on a narrative's technical depth, alternatives considered, and failures consistently, without inflating scope or ownership. **X09.3** Adapt the same true narratives to a stated format or value framework and to a product-company audience, emphasizing users, outcomes, and product judgment | D3 / D3 / D3 |

X03 evaluation work may use the OpenAI Evals API reference as one concrete model of criteria, data sources, and runs [58]; it is an implementation example, not required tooling.

**X07–X09 chat projection.** X07 and X09 are fully assessable in chat as written designs and narratives. X08.1–X08.2 are assessable as written code and predictions; the time-boxed, rendered, and keyboard-tested parts of X08.3 are environment-only (ENV01, ENV04) and never inferred from chat work. X09 assesses narrative skill on facts the learner supplies; the tutor must not invent experience, metrics, or outcomes, and Section 1.3's experience boundary applies.

### 9.2 Exclusions and stopping rules

| Deliberate exclusion | Reason |
|---|---|
| Algorithm and data-structure curriculum | Owned by the Python roadmap. Point to it when a target loop includes algorithmic rounds [18][20] |
| Database internals, indexes, isolation, replication, sharding, queues, workflow internals, load balancing, reliability architecture | Owned by the system-design roadmap; this roadmap asks only how they change a feature's contract, UX, or rollout |
| General API, schema, and security theory beyond feature application | Cross-referenced; T10–T12 assess application while building a product feature |
| Browser-engine internals | Only for browser, runtime, or frontend-infrastructure specialties |
| Pixel-perfect visual design and design-tool mastery | Product engineers need usability and implementation judgment, not product-designer competency |
| Deep statistical experimentation | T02 covers trustworthy product-level reasoning; advanced methods belong to X02 or a data curriculum |
| Native mobile and offline synchronization | Not universal to web product engineering; X01 |
| ML training, recommendation algorithms, model fine-tuning | No evidence supports these as common product-engineering interview prerequisites; X03 is application-oriented only |
| Vendor memorization | React, TanStack Query, Playwright, Stripe, and LaunchDarkly are reference implementations; objectives stay conceptual |
| A catalogue of every SaaS feature | Billing, entitlements, onboarding, import/export, and integrations are reusable lifecycle patterns in T12, not separate modules |
| Interview-frequency claims and invented employer questions | The evidence shows existence and diversity, not prevalence; generated probes are C and never attributed to employers |

**Curriculum integrity.** 20 core topics with 100 objective definitions, nine extensions with 27 objective definitions, I01–I07, and ENV01–ENV06. No fixed questions, briefs, codebases, generated patches, answer guides, or session scripts are stored. Future questions live in chat.

## 10. Session execution, saving, and validation

### 10.1 Ordinary session loop

Open with the saved tier, phase, and position in one sentence. Follow the current phase rather than restarting the curriculum or asking for an already-supplied preference. Keep the exchange focused on one manageable response, without naming a selection-assessment approach in advance. Scenarios must state users, constraints, and the contract explicitly enough that an ambiguity is not mistaken for a learner gap.

During **DIAGNOSE_ALL**: small same-tier probe → interpret and record → at most one useful same-tier clarification or follow-up → rotate. Give brief feedback and queue extended repairs. During **REPAIR_VERIFY**: probe unknown scope or reuse evidence → skip demonstrated material or repair the narrow gap → fresh independent check → rotate. Repeat laps at that tier until its gate is satisfied, then start the next tier's all-topic diagnostics.

Record assistance actually supplied. Do not count immediate reproduction of an explanation as independent. Reuse valid evidence rather than manufacturing attempts. A learner-requested explanation is allowed but does not erase prior evidence or change tiers.

At a save or session end, summarize what was independently verified, which facets were preserved without a full pass, what remains guided or uncertain, and the exact tier, phase, and topic at which to resume. A mid-session download saves progress without ending the session.

### 10.2 Complete replacement-file protocol

At an explicit save, requested download, or clear session end, the AI must:

1. Load the full source explicitly supplied with this document_id and use that revision as the parent. Browser suffixes such as (1) do not change identity. With several candidates, select a uniquely supported latest descendant; equal revisions with different bytes require an explicit conflict record, not an optimistic merge. Do not reconstruct missing sections from fragments.
2. Commit only observed session evidence, scope and route decisions, and preference changes. Allocate new IDs without reusing existing ones, including reserved IDs.
3. Update checkpoint proofs, preserved facets, gaps, reviews, topic summaries, integration and ENV coverage, tier/phase and gate board, diagnostic coverage, wave/lap state, remaining rotation, unfinished work, and the exact next action. Keep curriculum definitions unchanged during a routine save.
4. For a distinct saved change, set previous_revision to the loaded revision, increment revision exactly once, set updated_on, and append one revision row. Set parent_file_sha256 to SHA-256 of the complete loaded parent bytes before editing. An identical re-download keeps the same revision and IDs.
5. Validate the complete file, then return it as `product_engineering_interview_roadmap.md`, not a diff or extract. Confirm the file exists before linking it. If creation fails, say so and provide the text when feasible.
6. State the generated revision and tell the learner to keep the latest file locally and upload it next session. Replacing a Project Source is a separate manual action.

A deliberate curriculum redesign, extension selection, or overlay is a scope change: document it in Section 0.9, update denominators, preserve evidence and gaps, and never renumber existing objectives.

**Session disposition.** Inspecting, fixing, saving, or re-uploading the roadmap is administrative unless study also occurs. When study starts in a genuinely new session, allocate the next unused S ID; preserve a previously open session as INTERRUPTED_AT_LAST_SAVE unless explicitly closed. A task carried into a new session keeps its issuing attempt as the source and uses a new-session continuation attempt linked to it.

**Digest definition.** curriculum_sha256 is SHA-256 of the exact UTF-8 bytes after the LF terminating the standalone BEGIN CURRICULUM marker and before the standalone END CURRICULUM marker. Verify it on load. Routine progress saves preserve those bytes and the operating contract; an authorized policy change may edit them with a version note and recomputed digest. A mismatch must be investigated and disclosed, never silently normalized.

### 10.3 Validation checklist

| Invariant | Required check |
|---|---|
| Identity and structure | Correct document_id; exactly one opening and closing marker for each main block; no duplicated or truncated block |
| Scope | Exactly T01–T20 with five objectives each; IDs T01.1–T20.5 unique in definitions and ledger; same ID sets; selected extensions, if any, appear in both |
| Targets | Ledger targets match Section 7 plus recorded overlays and selected extensions; at default, 100 D1 + 100 D2 + 93 D3 + 3 D4 = 296 |
| Evidence integrity | Every referenced evidence ID exists once; scope, score, independence, and execution or rendering claims match the observation |
| Pass integrity | Every P has full-scope independent proof; no guided, unknown, exposed, AI-authored, or ENV-only work becomes a chat pass |
| Chat boundary | No evidence row claims execution, rendering, profiling, or repository navigation that was not observed; ENV status is separate |
| Skip integrity | Objective skip requires all required checkpoints; topic skip also requires transfer |
| Gap integrity | Contradictions reopen only affected requirements; preserved facets remain; closed gaps have exit evidence |
| Breadth integrity | Remaining queue matches the tier/phase and completed visits; unanswered prompts are not sampled; siblings are not starved |
| Tier integrity | DIAGNOSE_ALL finishes before REPAIR_VERIFY; no harder-tier work before the gate clears without an explicit override |
| Cross-roadmap integrity | No status, evidence, or attempt imported from a companion roadmap; dependency gaps name companion topics, not IDs |
| Dependency integrity | Every block identifies an actual facet and return condition |
| Derived counts | Topic board, gate board, dashboard, wave table, and integration and ENV totals agree with authoritative records |
| Scope honesty | Overlays, extensions, exclusions, and deferrals have decision records; denominators are consistent |
| Handoff | A fresh AI can identify the session-ID rule, tier/phase, gate state, next action, uncertainties, remaining rotation, due reviews, and missing attempt context |
| Revision safety | Correct parent revision and pointer; one revision row per saved change; no duplicate evidence from a repeat export |
| Hashes | parent_file_sha256 matches the loaded parent; curriculum_sha256 matches the curriculum block |
| Attempt lifecycle | Every used or reserved attempt ID occurs once in the disposition register; superseding never invents a failure |
| Content boundary | No stored questions, briefs, code, generated patches, answers, or fixtures |
| Complete delivery | Full UTF-8 Markdown with both blocks and all sections, returned as one replacement |

If validation fails, repair the file before delivering it or state the exact unresolved limitation. Never hide missing coverage by changing a target or denominator.

### 10.4 Keeping the single file usable over time

Keep evidence summaries concise and omit chat transcripts. Preserve every proof supporting a pass or skip, every unresolved contradiction, review evidence, and referenced IDs. Older unreferenced notes may be condensed into a dated summary with preserved identifiers. Never require a second file to understand the current state.

## 11. Technical reference policy and sources

### 11.1 Reference policy

Use official documentation (MDN, W3C WAI, web.dev, framework and library docs, OWASP, vendor docs) to verify platform semantics, accessibility requirements, metric definitions, and library behavior when needed during study. Use employer pages only for claims about that employer's roles or process, and re-check them before relying on them for a real application: hiring pages change and job postings close. References support explanations and assessment accuracy; they are not assigned reading prerequisites, a curriculum order, or a practice catalogue.

### 11.2 Sources

Access date for all sources: 2026-09-15. Sources [27]–[32] and [59] were checked directly when this file was generated; the rest are as reported by the supplied research specification. "Secondary" marks non-employer practitioner material.

**Employer role and hiring evidence**

1. Plain. Careers (process: project discussion, role-tailored technical exercise, product sense, ways of working). https://www.plain.com/careers
2. OpenAI. Product Engineer, Cyber. https://openai.com/careers/product-engineer-cyber-san-francisco/
3. Granola. Product Engineer — Full Stack. https://www.granola.ai/jobs/product-engineer-full-stack
4. incident.io. Platform Engineer. https://incident.io/careers/26af5e13-edee-41c3-9019-f886f404cd59
5. OpenAI. Full-Stack Software Engineer, Applied Foundations. https://openai.com/careers/full-stack-software-engineer-applied-foundations-san-francisco/
6. OpenAI. Software Engineer, Enterprise Verticals. https://openai.com/careers/software-engineer-enterprise-verticals-san-francisco/
7. OpenAI. Full Stack Software Engineer, ChatGPT ImageGen. https://openai.com/careers/full-stack-software-engineer-chatgpt-imagegen-san-francisco/
8. OpenAI. Software Engineer, ChatGPT Shopping. https://openai.com/careers/software-engineer-chatgpt-shopping-san-francisco/
9. OpenAI. Full-Stack Software Engineer, Emerging Products. https://openai.com/careers/full-stack-software-engineer-emerging-products-san-francisco/
10. OpenAI. Full Stack Software Engineer, Growth. https://openai.com/careers/full-stack-software-engineer-growth-san-francisco/
11. OpenAI. Forward Deployed Engineer, Seattle. https://openai.com/careers/forward-deployed-engineer-%28fde%29-seattle-seattle/
12. Great Question. Product Engineer (AI / Full-Stack), Canada remote; posting listed a September 30, 2026 deadline. https://jobs.ashbyhq.com/greatquestion/094067c8-29ec-4809-8617-06c7269593fb
13. GitLab Handbook. Technical Interviews. https://handbook.gitlab.com/handbook/hiring/interviewing/technical/
14. GitLab. AI in the interview process. https://about.gitlab.com/jobs/ai-interview-process/
15. GitLab Handbook. AI-Native Hiring Working Group (status: Proposed). https://handbook.gitlab.com/handbook/company/working-groups/ai-native-hiring/
16. Anthropic. Candidate AI Guidance (updated July 10, 2025). https://www.anthropic.com/candidate-ai-guidance
17. Amazon Jobs. Front-End Engineer Interview Prep. https://amazon.jobs/content/en/how-we-hire/fee-interview-prep
18. Amazon Jobs. Software Development Interview Topics. https://www.amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics
19. Amazon Jobs. SDE II Interview Prep. https://amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep
20. Microsoft Careers. Technical interviewing. https://careers.microsoft.com/v2/global/en/hiring-tips/technical-interviewing
21. Microsoft Careers. Student interviewing / early in profession. https://careers.microsoft.com/v2/global/en/hiring-tips/student-interviewing
22. Shopify Engineering. Nail Your Technical Shopify Interview (older guide; current applicability unverified). https://shopify.engineering/nail-your-technical-shopify-interview
23. Stripe Atlas. Scaling Engineering Organizations (Bug Squash; current loop status unverified). https://stripe.com/en-li/guides/atlas/scaling-eng
24. Automattic. How Automattic Hires. https://automattic.com/how-we-hire/
25. Automattic. How We Hire Developers. https://automattic.com/work-with-us/how-we-hire-developers/
26. Junction. Product Engineer, Support. https://jobs.ashbyhq.com/Junction/e1fc1b0c-7e17-467c-977b-947c509debb0
27. PostHog. Product Engineer Handbook: What is a product engineer? https://posthog.com/product-engineer/what-is-a-product-engineer
28. PostHog. Product Engineer Handbook: Things product engineers need to know. https://posthog.com/product-engineer/skills
29. PostHog Handbook (source). Engineering hiring, full-stack SuperDay task description. https://github.com/PostHog/posthog.com/blob/master/contents/handbook/people/hiring-process/engineering-hiring.md
30. PostHog Handbook. Preparing for the engineering SuperDay (AI policy, check-in, debugging session, prioritization). https://posthog.com/handbook/people/hiring-process/engineering-superday
31. Secondary. Hello Interview. Meta's Product Architecture Interview: How to Prepare (by a former Meta staff engineer and interviewer; May 2024). https://www.hellointerview.com/blog/how-to-prepare-meta-pa
32. Secondary. IGotAnOffer. How to crack the Meta product architecture interview (September 2024). https://igotanoffer.com/en/advice/meta-product-architecture-interview

**Technical references**

33. MDN Web Docs. Document Object Model. https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model
34. MDN Web Docs. Using the Fetch API. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
35. React. Managing State. https://react.dev/learn/managing-state
36. React. You Might Not Need an Effect. https://react.dev/learn/you-might-not-need-an-effect
37. W3C WAI. Forms Tutorial. https://www.w3.org/WAI/tutorials/forms/
38. W3C WAI. Accessibility Principles. https://www.w3.org/WAI/fundamentals/accessibility-principles/
39. W3C WAI. How to Meet WCAG 2.2 (Quick Reference). https://www.w3.org/WAI/WCAG22/quickref/
40. MDN Web Docs. Responsive web design. https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
41. MDN Web Docs. Intl. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
42. web.dev. Interaction to Next Paint (INP). https://web.dev/articles/inp
43. web.dev. Optimize Largest Contentful Paint. https://web.dev/articles/optimize-lcp
44. TanStack Query. Important Defaults. https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
45. TanStack Query. Optimistic Updates. https://tanstack.com/query/latest/docs/framework/optimistic-updates
46. OWASP Cheat Sheet Series. Authentication Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
47. OWASP Cheat Sheet Series. Session Management Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
48. Stripe Docs. Subscriptions. https://docs.stripe.com/subscriptions
49. Stripe Docs. Using webhooks with subscriptions. https://docs.stripe.com/billing/subscriptions/webhooks
50. Playwright. Best Practices. https://playwright.dev/docs/best-practices
51. Playwright. Isolation. https://playwright.dev/docs/browser-contexts
52. LaunchDarkly Docs. Release flags. https://launchdarkly.com/docs/home/flags/release
53. LaunchDarkly Docs. Progressive rollouts. https://launchdarkly.com/docs/home/releases/progressive-rollouts
54. Microsoft Research. Kohavi et al., Online Experimentation at Microsoft (2009). https://www.microsoft.com/en-us/research/publication/online-experimentation-at-microsoft/
55. Microsoft Research. Dmitriev et al., A Dirty Dozen: Twelve Common Metric Interpretation Pitfalls in Online Controlled Experiments (KDD 2017). https://www.microsoft.com/en-us/research/publication/a-dirty-dozen-twelve-common-metric-interpretation-pitfalls-in-online-controlled-experiments/
56. Microsoft Research. Fabijan et al., Safe Velocity: A Practical Guide to Software Deployment at Scale using Controlled Rollout (ICSE-SEIP 2019). https://www.microsoft.com/en-us/research/publication/safe-velocity-a-practical-guide-to-software-deployment-at-scale-using-controlled-rollout/
57. OpenAI. How OpenAI uses Codex. https://openai.com/business/guides-and-resources/how-openai-uses-codex/
58. OpenAI API Reference. Evals, create. https://developers.openai.com/api/reference/java/resources/evals/methods/create
59. PostHog Handbook. Preparing for the technical screen. https://posthog.com/handbook/people/hiring-process/engineering-tech-screen
60. Canva Engineering Blog. Yes, You Can Use AI in Our Interviews. In fact, we insist (June 11, 2025). https://www.canva.dev/blog/engineering/yes-you-can-use-ai-in-our-interviews/
61. Duolingo Blog. Your Guide to Engineering Interviews at Duolingo (August 20, 2024). https://blog.duolingo.com/interviewing-with-duolingos-engineering-team/
62. Meta Careers. Meta Jobs Hiring Process (current page; built-in AI assistant in coding and design environments). https://www.metacareers.com/hiring-process/
63. Linear. How we hire at Linear (April 28, 2026). https://linear.app/now/how-we-hire-at-linear
64. Anthropic Engineering. Designing AI-resistant technical evaluations (January 21, 2026). https://www.anthropic.com/engineering/AI-resistant-technical-evaluations
65. Secondary. Hello Interview. Meta's AI-Enabled Coding Interview: How to Prepare (updated August 2026). https://www.hellointerview.com/blog/meta-ai-enabled-coding

Sources [60]–[65] were added in merged revision 4 from two supplied deep-research reports on target interview loops; [60], [63], and [65] were checked directly, the others are as reported by the more rigorous of the two reports. [60], [62], [64], and [65] document AI-assisted interview formats and environments generally and support T14, T20, and X07 context rather than a single objective.

**Open questions carried from the research.** No standardized Product Engineer definition exists; product engineer versus full-stack is a semantic overlap; large companies may retain conventional SWE loops for product roles; AI interview policy genuinely conflicts across employers; GitLab's redesign is only proposed; Stripe's and Shopify's guides are older than the preferred window; Meta's Product Architecture round is supported only by secondary sources here; level boundaries are company-specific. Learner decisions that would most change emphasis: frontend versus backend center of gravity, B2B versus consumer, web versus mobile, AI-native versus conventional, growth versus feature team, level, and whether target companies use a general SWE loop or a dedicated practical loop.

<!-- END PE_CURRICULUM -->
