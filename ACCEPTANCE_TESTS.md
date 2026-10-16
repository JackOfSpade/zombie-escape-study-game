# Acceptance Tests — Zombie Study Escape

These are tests for the **future implementation**, not a report of tests already executed. See `GAME_DESIGN_HANDOFF.md` for requirements and configurable defaults. Use the bundled roadmap as the authoritative educational fixture. Seed randomness in tests; do not make probabilistic expectations flaky.

## A. Run structure and physical world

| ID | Setup / action | Required result |
|---|---|---|
| A01 | Start a new run. | Short playable outside chase leads survivors into Floor 1’s main entrance; the main door supplies finite preparation time. |
| A02 | Track every spawned zombie through several floors. | Every zombie originates outside the main entrance and travels through connected physical routes; no upstairs spawn/teleport. |
| A03 | Secure every existing path into a room, then wait. | No zombie appears inside the room; arrival requires a real breach or unblocked path. |
| A04 | Leave a floor offscreen, then return. | Zombie positions and furniture damage reflect elapsed simulation, not a reset or a convenient new horde position. |
| A05 | Open a puzzle, private tutor, group chat, inventory, or curriculum view during a live run. | Gameplay does not automatically pause because of study interaction. |
| A06 | Finish a challenge and have a non-contributor follow through the same animated door. | Only authorized survivors cross the credential boundary. |
| A07 | Have a zombie reach a survivor-controlled stair checkpoint. | Zombie progression follows physical attack/traversal rules, not human puzzle/credential requirements. |
| A08 | Generate a floor, inspect it, leave, and return. | Exposed topology, terminals, question identity, and placed furniture remain stable. |
| A09 | Fill a helicopter with four passengers while more survivors remain alive. | No fifth boarding; later helicopter pickups remain available. |
| A10 | Several survivors attempt the last helicopter seat simultaneously. | Exactly one valid atomic boarding claim wins; no duplicate seat or teleporting reservation. |
| A11 | Miss the first aircraft with zombies still below. | The run is not automatically lost; rooftop waiting/defense and later extraction work. |

## B. Furniture, preparation, and sound

| ID | Setup / action | Required result |
|---|---|---|
| B01 | Damage a fridge, move/rotate it, and recruit another mover. | Damage is retained; no health or resistance increase caused by the helper. |
| B02 | Destroy furniture, leave the floor, return. | The same object remains destroyed; no within-run respawn. |
| B03 | Compare moving heavy furniture with one versus two physically positioned helpers. | Handling can be faster with real participation; benefit is spatially bounded and not an HP multiplier. |
| B04 | Two survivors secure separate entrances simultaneously. | Parallel work genuinely reduces elapsed preparation time. |
| B05 | Briefly touch a nearly placed barricade or move it out/back repeatedly. | No artificial fortification bonus or contribution farming. |
| B06 | Block a three-tile opening with fridge/chair/fridge and destroy the chair. | The resulting gap is traversable if physically wide enough; no shared-health wall abstraction. |
| B07 | Place a wide sofa versus a narrow fridge at a wide entrance. | Collision uses actual footprint/orientation, not “heavy equals full coverage.” |
| B08 | Queue many zombies behind one narrow attack position. | Only contacting attackers contribute direct damage. |
| B09 | Give a survivor a clear vault route over another survivor’s barricade. | The survivor can vault; zombies cannot. Vulnerability and destination checks still apply. |
| B10 | Attempt to vault into an occupied/invalid landing position. | No wall clipping, trapped invalid coordinates, or fake successful traversal. |
| B11 | Put zombies behind an intact sealing barricade. | Zombie/impact sounds become heavily muffled; damage stays visually readable without numeric health/time bars. |
| B12 | Break the only sound-blocking barricade. | A pronounced break cue and newly unoccluded zombie sound create the intended contrast. |
| B13 | Break an outer barricade while an inner intact barricade still separates the listener. | Remaining occlusion persists; no global full-volume toggle through all defenses. |
| B14 | Leave another entrance open around a barricade. | Sound/paths can pass through the open route; “fortified room” is not an overriding global state. |
| B15 | Generate a long-study room over multiple seeds using ordinary, imperfect setup policies. | Multiple credible defensive configurations exist; preparation need not be optimal, and exact survival is not guaranteed. |
| B16 | Use a deliberately poor setup or receive an unlucky long question. | The player may fail without the engine secretly weakening zombies; intellectual work survives. |

## C. Puzzle identity, rewards, and persistence

| ID | Setup / action | Required result |
|---|---|---|
| C01 | Type code/notes, discuss with tutor, walk out of terminal range, return. | Identical question, draft, chat, submissions, and progress return; no confirmation penalty. |
| C02 | Type movement-key letters while editing, then use the emergency exit action. | Typing does not accidentally move the survivor; explicit escape immediately returns movement control. |
| C03 | Complete four parts at Container A, then visit Door B. | Door B does not inherit the nearly complete puzzle. |
| C04 | Move between available stations within one collaborative cluster. | Both show the same encounter and shared workspace. |
| C05 | Submit, then immediately run while completion evaluation is pending. | Movement is available; the result applies to the captured version without requiring stationary waiting. |
| C06 | Make newer edits before an older completion response returns. | The evaluated version is identifiable; no stale write overwrites newer text. Successful completion freezes its accepted revision. |
| C07 | Deliver the same accepted completion callback several times. | One consumption/reward transaction, one finite loot opening, one credential grant per qualified survivor. |
| C08 | Complete one shared puzzle through any linked station. | All linked stations are consumed for the run; no other fresh puzzle appears at a sibling station. |
| C09 | Join an already consumed terminal and view its history. | No new participation, reward, or stair access is earned by reopening it. |
| C10 | Contributor leaves to escape before a teammate finishes. | Legitimate prior contribution is retained; default eligible living contributor receives earned access remotely. |
| C11 | Die after substantial valid partial work, then start another run. | Valid independent facets and drafts persist; run access, loot, and geometry do not transfer. |
| C12 | Schedule an eligible continuation of the unfinished scope. | Earlier valid steps may be supplied; only missing work is asked. Supplied approach is not counted as fresh independent selection. |
| C13 | Change assumptions in a continuation. | Prior proof/context is reused only where applicable, not blindly copied into an incompatible question. |
| C14 | Restart the application from a run save. | Same encounter identities, RNG/timers, consumed terminals, and committed rewards; no free reroll. |
| C15 | Fill inventory and open another container. | Carry capacity still applies; no reward duplication for shared participants. |
| C16 | Expire a bubble while surrounded. | Zombies were excluded while active; expiry provides the chosen escape-oriented knockback/stagger, not default mass killing or a permanent safe zone. |

## D. Shared cooperation without artificial taxes

| ID | Setup / action | Required result |
|---|---|---|
| D01 | Human barricades usefully; NPCs solve the shared question. | Human qualifies for world reward and personal access without an extra exam; no automatic academic pass. |
| D02 | One survivor starts solving while teammates fortify. | Valid task division; no requirement to wait for all barricades/all players. |
| D03 | A late survivor supplies the decisive correct bug fix in seconds. | Useful contribution can qualify without an elapsed-time quota. |
| D04 | A late survivor merely opens chat or writes “yes.” | Presence/empty acknowledgment alone does not qualify as useful contribution. |
| D05 | Barricade a real approach before zombies arrive. | Useful protective work can qualify before an actual attack. |
| D06 | One survivor attempts a large shared room alone. | No required-party-count lock; possible success/failure depends on work, defenses, skill match, and pressure. |
| D07 | A late survivor vaults into an existing fortified room with an unconsumed opportunity. | This opportunistic use is allowed; no hidden morality tax. |
| D08 | NPCs face an unviable cooperative plan with an idle partner. | They can reconsider/retreat rather than being scripted to sacrifice themselves indefinitely. |
| D09 | Human uses extensive private/group help but completes useful work. | No reduced gameplay reward, tutoring charge, or hint cooldown. Assistance affects evidence scope only. |

## E. NPC work and selective conversation

| ID | Setup / action | Required result |
|---|---|---|
| E01 | NPC retains an unfinished puzzle and starts looping zombies. | Reduced, nonzero thought progress where appropriate; no full-rate stationary work. |
| E02 | Running NPC reaches an idea milestone. | It cannot remotely type/test/submit without a permitted interaction; thought is distinguished from terminal action. |
| E03 | NPC abandons several puzzles. | It does not advance every puzzle simultaneously at full background rate. |
| E04 | Let an NPC-only group work unobserved. | World progress can advance without continuous dialogue calls; simulated outcomes are not human academic evidence or claimed actual execution. |
| E05 | Open that group’s chat for the first time. | Generated catch-up matches actual activities/milestones/artifacts, including interruptions. |
| E06 | Close for several minutes, reopen. | New grounded history is appended; earlier visible messages remain identical. |
| E07 | Rapidly toggle open/closed without new events. | No extra reasoning, hints, dialogue rerolls, or duplicate catch-up entries. |
| E08 | Keep chat open without sending a message. | NPC simulation/actions continue; no autonomous repeated LLM chatter. |
| E09 | Send one message while all NPCs are seated and available. | Only a relevant subset responds; availability does not force everyone to speak. |
| E10 | Repeat varied seeded conversations about one expert’s strongest topic. | That expert is not deterministically the only responder; other plausible speakers participate through context/skill/personality/randomness. |
| E11 | Directly ask one NPC a question. | Direct address meaningfully influences selection; no mandatory full-cast reply. |
| E12 | Choose two responders for one turn. | Replies are complementary/coherent, not duplicate independent “great idea” messages. |
| E13 | A less-skilled NPC is selected. | It can ask, offer a partial thought, or be mistaken; selection does not magically grant perfect expertise. |
| E14 | A scheduled speaker dies or urgently flees while generation is pending. | Stale casual reply is suppressed or adapted to actual event order. |
| E15 | An NPC claims to edit or test code. | Matching attributable artifact/result exists, or wording correctly describes only a plan; no fabricated execution. |
| E16 | Generate catch-up after the human independently solved a facet earlier. | Fictional backdated NPC timestamps do not retroactively taint the human’s prior independent work; first human exposure is tracked. |
| E17 | Close/reopen after receiving a substantive hint. | The hint’s assistance history remains; reopening does not restore independence. |
| E18 | Work events occur while the player watches an otherwise silent chat. | Later history does not invent timestamped chat messages allegedly shown in that interval. |
| E19 | NPC and human concurrently change the same code region. | Conflict/version handling preserves authorship and prevents silent overwrite. |
| E20 | Inspect silence from unselected NPCs. | No fake “NPC did not respond” filler bubbles. |

## F. Curriculum and assessment integrity

| ID | Setup / action | Required result |
|---|---|---|
| F01 | Import the bundled revision-9 roadmap. | Preserve 80 PY/112 PE active objectives, 240/337 checkpoints, existing 2/80 and 8/112 D1 passes, remaining queues, and protected blocks. |
| F02 | Open this handoff or run an import-only operation. | No study session/attempt or new pass is fabricated. |
| F03 | Start actual study from the supplied snapshot. | Apply its session/resume rules, due review, and 1 PY:2 PE scheduling; do not restart introductory sweeps. |
| F04 | Human reaches a high floor while still academically in Tier 1. | Newly assigned work stays within the allowed tier; no implementation/depth escalation solely from survival progress. |
| F05 | Open a rare container or enter a large group room. | Reward rarity/party size does not change the allowed academic ceiling. |
| F06 | Preview several candidate terminals. | No fictitious visits or ratio advancement for unopened/unanswered generated tasks. |
| F07 | Randomize candidate questions. | Saved breadth, next visit, review rules, and phase constraints remain authoritative; not unrestricted same-tier topic sampling. |
| F08 | Join a pre-existing group with a non-eligible formal task. | Shared question stays unchanged; do not silently remap or solicit out-of-ceiling work as the human’s next scheduled assessment. |
| F09 | Group succeeds but the human only defended. | World reward commits; post-completion assessment gives no invented technical mastery and no extra passage exam. |
| F10 | Human independently explains one facet, later receives help on another. | Preserve genuinely independent scope; attribute assistance only where it applies. |
| F11 | NPC provides the algorithm, human repeats it. | No independent selection pass. |
| F12 | Human’s useful implementation/test contribution is absent from chat text. | Assessor sees attributed artifacts and does not overlook it because the transcript alone is short. |
| F13 | A partial facet is correct but other required scope is unassessed. | Keep facet evidence; do not pass the entire checkpoint. |
| F14 | Tutor supplies the answer, followed by a neutral-sounding re-ask. | Prior substantive assistance still applies; no “independence reset.” |
| F15 | Review due date passes without review. | Existing pass is not automatically downgraded; due status remains. |
| F16 | Same-session or accelerated game-time repetition occurs. | Do not label it delayed retention without the roadmap’s real elapsed-time conditions. |
| F17 | Code is discussed but not run. | Record reviewed/described status; no fabricated tests, rendering, measured speed, or ENV pass. |
| F18 | A generated PE question permits two defensible approaches. | Evaluate stated constraints/reasoning, not exact agreement with one model’s preference. |
| F19 | A question omits a material assumption or has a bad expected answer. | Preserve work, correct/invalidate assistant-origin error, and avoid a learner failure. |
| F20 | Assess a project narrative in X09. | Use the human’s real supplied experience; no fictional company/project/metric/ownership credit. |
| F21 | Two assessment responses return in reversed order or duplicate. | Apply once, reconcile ledger versions, preserve independent evidence from both. |
| F22 | Completion succeeds during a chase. | World reward is not delayed until the separate individual mastery assessment finishes. |
| F23 | Model suggests unknown objective IDs or deleting requirements. | Validation rejects unsupported changes; no denominator manipulation. |
| F24 | Export a study update. | Complete merged file with both tracks, valid IDs/digests/resume state; raw question/chat catalogue stays outside the curriculum. |

## G. The Surge and presentation

| ID | Setup / action | Required result |
|---|---|---|
| G01 | New run with no deaths. | One saved randomized quiet delay is sampled; expiry begins the warning. |
| G02 | Death occurs during CALM before eligibility. | Anchor/delay update follows the later-of-death/event-end rule; no immediate Surge caused by death. |
| G03 | Prior Surge ends. | New interval starts from the latest relevant event/end, not the old run-start timer. |
| G04 | Death occurs during ACTIVE. | Active duration does not terminate, extend, or reroll. |
| G05 | Reload a save during WARNING or ACTIVE. | Same scheduled event/duration/RNG state resumes; no stacking or reroll exploit. |
| G06 | Warning begins behind intact barricades. | Recognizable escalating event cue remains perceptible; default experience needs no text banner. |
| G07 | Activate The Surge while editing code/chat. | Whole-game palette including puzzle text and syntax colors changes; drafts, focus/cursor, question, and controls stay intact. |
| G08 | Compare pre/post activation mechanics. | Only declared zombie speed/damage modifiers change; no academic, map, inventory, or survivor-speed change. |
| G09 | New zombies enter Floor 1 during ACTIVE. | They receive current modifiers, using the same physical origin rule. |
| G10 | End ACTIVE, then trigger another later Surge. | Base modifiers restored; no accidental permanent/multiplicative accumulation. |
| G11 | Use dark-floor visibility before/after palette change. | No hidden enemy/light-radius information leak; study UI remains readable. |
| G12 | Enable visual/caption/reduced-flash accessibility options. | Event meaning remains available without requiring the default audio-only recognition or visual distortion. |

## H. Integration and source protection

| ID | Setup / action | Required result |
|---|---|---|
| H01 | Terminal AI uses a development stub. | Clearly labeled; no claim of a working live Study Mode bridge or real curriculum mastery. |
| H02 | Disconnect/reconnect the real bridge during a session. | Preserve prompt/draft/transcript/request identity; no silent replacement with a different tutor. |
| H03 | Completion/tutor request times out. | Player can move; work is retained; retry is correlated; no invented answer/pass. |
| H04 | NPC/puzzle/code text requests arbitrary engine or ledger changes. | Treat it as untrusted content; only validated scoped actions can mutate authority. |
| H05 | User or generated code tries to access host credentials/network/files outside permissions. | Isolated runner denies it; authoritative game process is not exposed. |
| H06 | Verify this handoff’s bundled source. | Whole-file and protected-block hashes match `SOURCE_INTEGRITY.json`; source bytes were not changed by handoff packaging. |

## Evaluation notes

For stochastic chat, test seeded controlled cases plus distributional checks across many seeds; do not require an exact speaker on every unseeded turn. For balance, report distributions of preparation time, protected focus windows, escape rates, late-survivor outcomes, and learning engagement. A successful unit test does not prove fun or balance.

Prototype stubs should make mechanics testable without writing synthetic scores to the learner’s real ledger. Preserve a separate test profile. Record which tests pass, fail, or remain unimplemented; do not present this checklist itself as evidence of completion.
