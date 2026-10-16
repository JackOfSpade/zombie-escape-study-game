# Zombie Study Escape — Game Design & Coding Handoff

**Status:** Consolidated design, version 1.0  
**Prepared:** October 15, 2026, America/Toronto  
**Audience:** The AI coding instance implementing the game  
**Working title only:** Zombie Study Escape. “The Surge” is the agreed mutation-event name, not necessarily the game title.

> Build a real-time, 2D top-down zombie escape game in which the player earns protected time to study through physical preparation. One human and many intelligent NPC survivors climb a randomized building, solve curriculum-driven terminal puzzles, cooperate opportunistically, compete for four-seat helicopter pickups, and try not to be overtaken by a physically advancing horde.
>
> **The curriculum determines what is studied. The game determines the circumstances in which it is studied. Group success earns survival rewards; only the human’s demonstrated knowledge earns individual curriculum credit.**

## 0. Read this before implementing

This document consolidates a long design conversation. Later explicit decisions replace earlier proposals. The user accepts recommendations they did not reject, but that does **not** resurrect recommendations subsequently superseded. The supersession table in Section 22 is binding.

Three labels distinguish certainty:

- **LOCKED:** An explicit decision or accepted recommendation. Preserve its intent.
- **DEFAULT:** A concrete implementation interpretation supplied here to resolve an unspecified edge case. Configurable; not a claimed verbatim user requirement.
- **TUNABLE / DEFERRED:** Numbers, presentation details, or optional mechanics without final balance values. Do not mistake illustrative numbers for tested balance.

The gameplay requirements below come from the design conversation. Curriculum facts and learning rules come from the bundled `interview_prep_roadmap.md`, identified as **[R]**. References to [R] use its stable section headings; Appendix A provides a source map. Implementation schemas, algorithms, and test procedures in this handoff are proposed engineering specifications, not claims that a system has already been built or tested.

**Read order:** this document → [R] Part S and merge rules → both track operating contracts, progress blocks, tier/evidence rules → objectives relevant to the first implementation slice → `ACCEPTANCE_TESTS.md`.

Do not begin a study session, award learning credit, change roadmap revisions, or issue a diagnostic merely because this handoff was opened. Do not rewrite the study roadmap into a smaller game-friendly curriculum. The original uploaded source is included unchanged.

### 0.1 What this is not

This is not the abandoned Minecraft interruption system, software-company simulator, or Slavehack-inspired hacking sandbox. It is not a faithful Dead by Daylight clone. Educational questions need not make literal narrative sense. A coding/interview problem appearing at an access terminal is acceptable; immersion comes from survival, preparation, sound, lighting, competition, and persistent consequences.

Do not add a workday, tickets, corporate-management loop, cybersecurity syllabus, obligatory fantasy explanation for algorithms, or a conventional XP-based curriculum. Do not require real human multiplayer for the initial game. “Other players” in the design means intelligent AI-controlled survivors.

### 0.2 Priority order

1. Preserve the supplied curriculum, individual evidence, and learning continuity.
2. Keep free tutoring, readable questions, and persistent work usable under real-time pressure.
3. Maintain consistent spatial rules for zombies, furniture, access, and rewards.
4. Create tension and meaningful preparation/cooperation decisions.
5. Add generated variety, presentation polish, and scale without breaking the above.

A survival run may fail. A generated question may be harder for this learner than anticipated. Neither authorizes invented learning failures, erased work, or unearned curriculum promotion.

## 1. Player experience and run loop

### 1.1 Opening

**LOCKED:** Begin with a short playable chase outside the building. The human and many NPC survivors run from a zombie mob into **Floor 1 through the main entrance**. The main door closes and provides a finite initial delay. Survivors use that lead to find terminals, inspect the floor, and push furniture into defensive positions. The main entrance eventually breaches and zombies continue entering there.

Do not turn the opening into a long repeated tutorial. It should immediately establish normal-speed danger when exposed and the value of a barrier.

### 1.2 Repeating loop

**Explore → choose a solo or collaborative objective → inspect approaches → move furniture and/or begin solving → study with free tutor/group help → react to threats → finish or disengage → collect earned access/items → climb.**

Task division is emergent. One survivor may begin solving while others barricade; all may prepare first; an exceptionally fast solver may rush. No mandatory “barricading phase” or everyone-ready ceremony.

Optional containers offer equipment at a time/opportunity cost. The player decides whether one more reward is worth falling behind. Puzzles and floor layouts vary. A solo room is not guaranteed to be faster: a shared question may suit the group’s skill profiles better even at the same official depth.

### 1.3 End of run and helicopters

**LOCKED:** The rooftop is the escape destination. A helicopter carries **at most four passengers per trip**. Further helicopters return, so the first four fast survivors do not permanently doom everyone else. Remaining survivors wait and defend the roof if the horde is still far enough below.

**DEFAULT:** A run-scoped pickup schedule becomes relevant at the rooftop and exposes a useful estimate for the next pickup. Each aircraft has a finite boarding window; boarding is not contingent on filling all four seats. Once full, it may depart. Seat allocation is an atomic boarding action, not a remotely reserved reward for solving an earlier puzzle. NPCs occupy seats under the same rules. The final roof remains physically reachable by the advancing horde.

**TUNABLE:** Floor count, total survivors, helicopter interval, approach/departure durations, and boarding time. Prototype with fewer agents/floors; design for a visibly large population. Earlier examples of about 20–24 total survivors and 20 floors were illustrations, not fixed requirements.

**DEFAULT:** No survivor-on-survivor damage in the initial version. Competition is for time, desirable positions, finite loot, and seats—not an unrequested PvP combat system.

### 1.4 Between runs

Keep the learner’s roadmap, evidence, tutor history relevant to unfinished work, and recoverable drafts. Reset run-specific geography, furniture state, loot, access, and survival outcomes for a new run. Do not invent permanent skill-stat upgrades that stand in for actual knowledge. A fresh run creates new objects; furniture never respawns **within** a run.

## 2. World geometry, floors, and discovery

### 2.1 Perspective and randomized layout

**LOCKED:** 2D top-down gameplay with randomized floor plans, rooms, corridors, multiple approaches where appropriate, terminals, containers, furniture, and lighting. Some floors are partially lit; some can be pitch black. Discovery and navigation remain meaningful between questions.

Mix open circulation areas with defensible rooms and intermediate chokepoints. Do not make every floor a one-tile hallway, but do not generate every entrance as an unsealable open atrium either. Furniture must physically fit through the route needed to move it into place.

Possible room families, not academic difficulty labels:

| Room shape | Typical terminals | Defensive character |
|---|---:|---|
| Small office | 1 solo terminal | One narrow entrance; reasonable solo preparation |
| Small meeting room | 2 linked terminals | Shared puzzle; a partnership can divide work |
| Computer lab | 3–4 linked terminals | Wider/multiple approaches; parallel preparation valuable |
| Larger operations room | 5–6 linked terminals | More work surfaces and more exposed entrances |
| Exposed corridor/alcove | Solo or special terminal | Brief work or deliberate high-risk attempt |

Counts are **TUNABLE**. A room’s geometry and occupancy should not secretly enforce an exact group size. A lone survivor can solve a shared puzzle and fortify a large room if the circumstances allow it.

### 2.2 Defense-aware generation

**LOCKED:** Predict an approximate study-time range, then provide generous defensive opportunities appropriate to that range. Some real questions can take **30 minutes or more**. Do not make zombies unnaturally slow to accommodate them; do not quietly replace substantive questions with tiny reflex checks.

Use task format, current depth, unknown/assisted/verified facets, and recorded personal study behavior to inform estimates. Separate focused study time, teaching time, preparation time, chase interruptions, and model latency. A language model’s confident duration estimate is not a guarantee.

The generator should offer multiple reasonable configurations, surplus usable furniture, and layered fallbacks. Validate ordinary imperfect choices—not only a perfect placement solver. A fridge that takes a long time to move should, in an appropriate doorway, usually buy substantially more time than its preparation cost.

**Fairness boundary:** Ensure credible opportunities, not guaranteed survival. Luck, personal familiarity, imperfect defenses, new zombie arrivals, and The Surge may produce a bad run. Do not rescue a struggling player by secretly reducing local zombie speed or attack damage. An optional long puzzle in a poor location may simply be a bad tactical choice. Routine mandatory progression should not consistently require more time than any reasonable generated defense can supply.

### 2.3 Runtime changes and spatial consistency

Generate unseen content as needed, with stable seeds/state, but freeze any content that has become established. Never move a terminal, change a room’s exits, add furniture, or rewrite a question just because the player looks away. Validate stairs and collision connectivity, furniture transport, vault landing spaces, and reachable terminals before exposing the layout.

Enough terminal opportunities must exist for the expected population; waiting in a queue should not replace learning as the main activity. Not every station needs equal safety. Finite one-use terminals still create legitimate competition. Reject obvious initial topology/capacity softlocks; do not provide emergency respawning terminals as a routine cure.

## 3. Zombies: physical, continuous pursuit

### 3.1 Origin and movement

**LOCKED:** All zombies originate outside Floor 1’s main entrance. They enter there and physically travel through existing corridors/stairs. There are no upstairs spawns, teleporting enemies, indoor reinforcements, or surprise spawns in a secured room—including during The Surge.

Stair traversal may use an engine transition between floors, but it must represent actual entry, traversal time, and arrival at the connected staircase. Offscreen simulation must preserve causal travel and barricade damage.

Zombies move at threatening normal speeds. Survival comes primarily from preparation and distance, not a horde that needs half an hour to walk upstairs. They pursue, attack exposed survivors, break obstructing furniture, and seek viable alternatives. They need not be perfect omniscient shortest-path solvers with knowledge of unseen furniture.

### 3.2 Perception and last-resort looping

Use line of sight, sound, last-known positions, and searching rather than permanent knowledge of every survivor. Breaking pursuit can create a real opportunity to return to a terminal.

**LOCKED:** Looping/kiting is possible but is an emergency fallback, not the expected way to study for 30 minutes. Furniture, corners, and corridors can create loops. Avoid a harsh stamina mechanic that makes every chase inevitably expire. Reinforcements, poor positioning, breakable furniture, and mistakes provide danger.

The human can think about the question while moving, but the game does not assume that multitasking is easy or award learning based on movement time.

### 3.3 Contact-limited barricade attacks

Only zombies that can physically contact a barricade contribute direct attack damage. A hundred enemies queued behind one attacker do not all hit a one-tile object through each other. Wider exposed surfaces permit more simultaneous contact.

Use bounded contact slots/collision-aware attack positions. Unengaged zombies can queue, spread, or seek another accessible path. Do not implement a single global horde DPS value applied to every barricade.

### 3.4 Survivor access versus zombie traversal

Personal stairwell authorization controls survivor passage, not whether zombies can ever climb. Render that distinction coherently: an access checkpoint can reject unauthorized survivors while the horde attacks/traverses the physical route under its own rules. No zombie puzzle-solving, credential borrowing, or permanent zombie immunity from an electronic survivor lock.

## 4. Furniture and barricading

### 4.1 Finite physical objects

**LOCKED:** Common building furniture acts as barricades: fridges, sofas, desks, cabinets, bookshelves, and light objects such as chairs. Objects have footprint, orientation, weight/handling speed, durability, current damage, collision, and physical placement.

Furniture can be moved at any time subject to handling/access constraints. It never respawns during a run. Damage follows the object when moved. Destruction is permanent for that run. Moving, rotating, or recruiting a helper never repairs it.

Survivors choose how far and where to push/pull objects; no button that automatically fortifies the room. Use readable placement previews and forgiving alignment/snapping so precision-control frustration is not the principal challenge.

### 4.2 Furniture roles

| Example | Approximate footprint role | Handling | Defensive purpose |
|---|---|---|---|
| Chair | Narrow | Fast | Brief emergency delay, not a long-work substitute |
| Cabinet | Narrow | Moderate | Single doorway |
| Desk | Medium/wide | Moderate | Double doorway or inner layer |
| Sofa | Wide | Slow | Wider opening with substantial coverage |
| Refrigerator | Narrow/tall | Very slow | Durable narrow chokepoint |
| Heavy bookshelf | Wide/tall | Very slow | High-commitment wide blockage |

Exact tile widths and durability are **TUNABLE**. A fridge does not become three tiles wide merely because it is heavy. Sofas/bookshelves supply width; fridges supply durable narrow coverage. Permit rotation when space allows.

### 4.3 Wide openings and layering

A line `[fridge][chair][fridge]` across a three-tile opening is legitimately weak at the chair. Do not combine those objects into a shared health pool or force zombies to destroy all three before passing through the gap.

Provide reasonable ways to avoid that weakness: a sufficiently wide object, a narrower doorway farther inside, or successive defensive lines. Individual objects retain individual health. Room security is a result of blocked paths, not a “fortified” flag overriding collision.

Physical bracing/backing with other furniture may be represented if the mechanics genuinely model it. **DEFAULT for the first implementation:** rely on coverage, collision, and successive layers instead of inventing hidden installation-quality damage reductions.

### 4.4 Cooperation without durability bonuses

**LOCKED:** No artificial teamwork, fortification-quality, “more eyes,” or participant-count multiplier to health or damage resistance. The later shared-puzzle design replaces that proposal entirely.

Keep actual cooperative advantages: multiple survivors can handle heavy furniture more efficiently when physical access permits; different survivors can secure different entrances simultaneously. Cooperation has diminishing returns and spatial limits. A helper touching an object at the last instant gives no special modifier.

Large rooms naturally demand more preparation because they expose more entrances/attack surface. Solo preparation is still possible, not prohibited by a required-player count. A selfish partner may make the chosen plan unviable, but the builder can reconsider, retreat, or choose another room.

### 4.5 Vaulting

**LOCKED:** Every survivor can vault/climb barricades placed by any survivor. Zombies cannot vault them; they must break or route around them.

Use a brief, readable vulnerable traversal rather than instant invulnerability. Taller/awkward objects may take longer. Check the destination before starting; do not allow clipping through walls or landing inside collision. The prototype must not create an indestructible vault loop.

## 5. Sound, lighting, and readable study UI

### 5.1 Barricade sound isolation

**LOCKED:** An intact barrier separating the listener from zombies heavily muffles zombie sounds and their impacts—barely audible while studying. The break itself is full and dramatic. When the breach opens a sound path, zombie sounds return clearly. This contrast is a signature mechanic.

Implement stylized sound-path occlusion, not a claim of realistic sofa acoustics. An open alternative entrance allows sound through. Another intact barrier between listener and zombies still muffles the horde after the outer layer fails. An outer break can be clearly signaled, but it must not globally disable all remaining sound occlusion.

Deterioration is visible through shaking, cracking, bending, shifting, and fragments. Do not display exact health/time-to-break over furniture. Preserve the strong muffling until the breach; subtle material creaks can communicate danger without becoming a hidden numeric countdown. Audio mix may quiet ambient music while studying, but not obscure movement/control feedback.

### 5.2 Darkness

Generate working lights, emergency lights, partially dark floors, and pitch-black areas. Dynamic lighting/occlusion affects what the survivor can see. Flashlights, batteries, and flares are suitable resource candidates. Terminals may provide local light; any exact light radius/battery rule is tunable.

Do not reveal the whole floor to NPCs while restricting the player. The code editor, question, and chat must remain legible even on a dark floor.

### 5.3 Terminal layout and emergency controls

Show the puzzle/workspace with Terminal AI alongside it. Shared rooms additionally expose group chat and shared edits. Keep enough view of the world/threat directions for action; no full-screen study modal that disables escape.

Walking beyond interaction range closes the terminal UI and preserves work automatically. No confirmation and no abandonment penalty. Return restores the exact puzzle, draft, discussion, scroll/cursor state where practical, and results.

**DEFAULT input safeguard:** Provide a dedicated immediate “leave terminal / take movement control” action that works while an editor owns keyboard focus. Once moving, distance closes the interface. Do not interpret typing the letters W/A/S/D into code as a request to run. Conversely, never trap the player in a modal when danger arrives.

## 6. The Surge

### 6.1 Event identity and warning

**LOCKED:** Use **The Surge**, replacing Blood Moon. A distinctive escalating biological scream/pulse signals activation without a default text banner. Creative reference: the user-described escalating Scout warning in GTFO; palette-transition reference: the user-described Silent Hill transformation. These are mood references, not instructions to copy assets or exact effects.

Give a recognizable pre-activation buildup, climax, active soundscape, and recovery. The warning remains perceptible behind barricades because it is an event-wide cue, unlike ordinary occluded zombie sounds. Use original audio. Expose optional captions/visual indicators and reduced-flash presentation for accessibility; do not require text in the default experience.

### 6.2 Whole-game palette change

**LOCKED:** Transform the complete palette: environment, furniture, zombie colors, lighting hues, inventory, puzzle panels, code-editor background, syntax colors, question text, and tutor/group chat. This is an alternate authored theme, not a red overlay that makes text unreadable.

Do not alter the question, grading, cursor, draft, NPC learning rules, inventory effects, survivor handling, map geometry, collision, fog/visibility radius, light functionality, or spawn locations. Preserve usable contrast and state differentiation; shadows/dark floors remain dark. Palette changes must not leak enemies that were previously hidden.

### 6.3 Mechanical effect

All zombies receive temporary increases to movement speed and damage against survivors and barricades. Existing and newly entering zombies share the active modifiers. Only zombie capabilities change mechanically; their louder/more aggressive audiovisual behavior can change too.

No new spawn points, spawned upstairs waves, altered puzzle difficulty, faster NPC thinking, or surprise room destruction. Object damage already incurred remains after the event. Revert modifiers cleanly at the end; do not stack them multiplicatively on repeated activations.

### 6.4 Timing state machine

**LOCKED interpretation:** Each Surge has a randomly sampled but then fixed active duration. It does **not** last until someone dies. The inactivity reference is the more recent of the last survivor death and the previous Surge. Use the **previous Surge’s end** as the conservative reference, consistent with the latest accepted recommendation.

Accepted default scheduling uses one hidden randomized quiet-period delay rather than fresh per-frame probability rolls:

```text
run begins:
    anchor = runStart
    quietDelay = sample(config.quietDelayRange)
    state = CALM

while CALM:
    on survivor death:
        anchor = max(lastDeathTime, previousSurgeEndTime, runStart)
        quietDelay = sample(config.quietDelayRange)
    when now >= anchor + quietDelay:
        state = WARNING
        activeDuration = sample(config.activeDurationRange)

while WARNING:
    play recognizable escalating cue
    after warningDuration: state = ACTIVE; apply zombie modifiers

while ACTIVE:
    deaths do not end, extend, or reroll this Surge
    when activeDuration elapses: remove modifiers; record end; enter CALM
    anchor = max(lastDeathTime, surgeEndTime)
    quietDelay = sample(config.quietDelayRange)
```

**DEFAULT edge case:** Once the warning starts, commit to this event; a death during the cue does not cancel it. Record deaths for subsequent scheduling. All randomness uses saved run RNG state. No reset by opening menus, reopening chat, or reloading a save. “Survivor death” includes human/NPC deaths in the simulation, not evacuation or puzzle failure.

**TUNABLE starting values from the conversation:** Quiet delay around 7–12 minutes, warning around 10–15 seconds, active duration around 60–120 seconds. Earlier suggested zombie multipliers (+35% movement, +50% survivor damage, +75% barricade damage) are test candidates only, not validated balance. Do not retain the older 8-minute/15%-per-minute/extra-5-minute-cooldown proposal as a second overlapping rule.

The intended natural adjustment is that frequent deaths postpone further escalation and prolonged survival eventually triggers it. This does not prove perfect difficulty regulation; test late-run attrition and possible incentives to abandon others. Do not introduce a hidden sacrifice reward or silently replace the accepted timer.

## 7. Items, loot, and carrying limits

### 7.1 Finite optional rewards

**LOCKED:** Optional puzzles unlock containers with useful future-survival items. The player has a maximum carrying capacity so clearing many containers does not allow hoarding everything. Items must have situational trade-offs. Container contents are finite; a shared success does not duplicate the entire container for every participant.

**DEFAULT:** Use weight plus an understandable inventory layout; dropping/trading can be physical actions if implemented. Keep furniture as world objects, not backpack items. Exact carrying weight, slots, stack sizes, and drop allocation are tunable.

### 7.2 Agreed defensive directions

- Limited-use weapons/ammunition or durability can kill zombies. Without suitable items, exposed survivors rely on escape/looping, not a free unlimited combat solution.
- Repulsion items push zombies away without permanently clearing them.
- A temporary protective bubble blocks zombie entry, allowing a short focus window. Zombies accumulate outside. **At expiry, prefer a knockback burst**, not a default mass-kill effect. Provide a genuine chance to exit rather than leaving the player surrounded inside an impassable ring.
- Decoys can draw attention away; flashlights/flares address dark floors; healing supplies can support recovery if the chosen damage model permits it.

The bubble is not intended to cover a whole 30-minute problem. Its duration, radius, charge count, burst strength, and wall-aware escape behavior are tunable. If collision leaves no safe displacement, use a deliberate brief dispersal/stagger mechanism rather than falsely claiming knockback guarantees an exit in every geometry. Do not damage allies with the expiry effect by default.

**DEFERRED optional candidates previously discussed:** A scanner revealing nearby loot, rare access-bypass token, and other specialist utility items. A bypass token, if retained, can bypass one world checkpoint only; it never passes a curriculum checkpoint. Do not introduce a new hint currency, Terminal Insight, or tutoring penalty under another name. Broad reusable auto-solvers from the abandoned hacking concept are not part of this game.

## 8. Terminals, authorization, and one-time use

### 8.1 Two interaction types

**Solo terminal:** One puzzle/workspace belonging to that terminal, worked by one survivor. Small rooms often favor independent protection.

**Collaborative terminal cluster:** Several physical stations in the same room connect to **one shared puzzle, one workspace, one solution state, and one group discussion**. They are not separate questions whose results are added together.

Both can serve stairwell access or optional loot. The meaning of a completion is fixed when the encounter is created. Large rooms are not automatically assigned harder academic work; one applicable Tier 1 reasoning problem can be shared by several survivors without becoming a multi-file coding project.

### 8.2 Personal stairwell access

**LOCKED:** Completing a solo stairwell challenge grants its solver a personal credential. Completing a group stairwell challenge grants credentials to **all qualifying contributors, including defenders**. Access remains unlocked for those survivors for that checkpoint. Other survivors cannot tailgate through another person’s visual open-door animation or borrow their credential.

A defender does **not** need a compulsory post-completion exam, explanation, or tutorial before passage. That earlier suggestion was explicitly replaced. Academic credit remains separate; see Sections 9 and 12.

**DEFAULT:** Access is scoped by run, survivor, and checkpoint/floor-transition identifier. Returning through already earned relevant access should not force the same assessment again. A credential does not authorize every future floor. Cosmetic door state must not substitute for the credential check.

### 8.3 One-time lifecycle

```text
AVAILABLE → IN_PROGRESS → SUBMITTED_FOR_COMPLETION → COMPLETED_CONSUMED
                   ↑             |
                   └── needs work / retryable evaluation error
```

Walking away only detaches the interface; it does not revert the puzzle to AVAILABLE. Once successfully completed, the terminal is consumed for the run. A shared completion consumes the entire linked cluster, not just the station whose occupant submitted.

Keep a read-only record for contributors’ learning/history after consumption, not a new farmable puzzle. Late arrivals do not acquire credentials by opening a completed chat. Reconnects, duplicate completion messages, and multiple group submissions cannot create extra loot, rewards, or credentials.

**DEFAULT:** A physical station supports one seated/actively connected survivor at once; defenders need not occupy a station to qualify. A solo puzzle remains associated with its original solver and device during the run. An abandoned group station may be used by a new participant to join that same unsolved group puzzle, never to reset it. The linked-station count limits simultaneous terminal use, not necessarily the lifetime count of meaningful contributors to a room.

### 8.4 Abandon, return, and submit while escaping

**LOCKED:** Moving away saves the exact problem, code, notes, chat, completed substeps, and previous submissions at that instance. Return resumes it as-is. Another door/container does not inherit it, even if both address the same curriculum concept.

Submitting captures a versioned snapshot immediately. The survivor may move away while AI completion evaluation proceeds. A successful result grants the appropriate world reward without requiring them to stand still waiting; feedback from an unsuccessful result waits in the saved encounter. No tutor/AI latency freeze of the game.

A submitted snapshot can pass even if the current editor later contains newer work, but the result must identify exactly which revision passed. Once completion commits, freeze the accepted solution and reject stale writes/results rather than silently changing completed history.

## 9. Cooperation and contribution rewards

### 9.1 Why the shared puzzle matters

With independent questions, a defender can fall behind while others use the protection. With a shared question, the defender’s work preserves a result that also grants their access. Technical and physical work advance a common escape objective. No extra durability perk is needed.

**LOCKED:** Starting the puzzle before barricading is valid cooperation. Role division is not prescribed. Players/NPCs can switch between explanation, implementation, testing, defense, and escape as circumstances change.

### 9.2 Meaningful contribution

Qualifying examples include a useful explanation, a relevant test, implementation work, a decisive bug correction, or moving furniture to block an actual approach to the group’s study area. Preparation can qualify before the barricade is hit. A ten-second decisive contribution can be more valuable than several minutes of irrelevant activity.

Do not use a universal “must do 20%,” minimum seating time, last-hit award, or merely-entered-the-room flag. Touching a fridge, typing “yes,” repeating an already supplied answer, or submitting another person’s unchanged work is not automatically a useful contribution.

**DEFAULT evidence design:** Record attributable contribution events linked to the encounter: resulting defensive placement/path change, code diff, test artifact, or substantive reasoning. Validate physical contributions through world geometry/actions; evaluate semantic contributions against the actual shared work. Repeatedly moving an object out and back, taking another builder’s credit with a tiny nudge, or undoing useful work does not farm fresh contribution credit. Legitimate collaborative moves credit all actual helpers.

Apply the same substantive standard to human and NPC survivors. An incorrect but serious attempt is not a misconduct penalty; whether it materially advanced investigation depends on its evidence. Do not let NPC dialogue alone assert that the human deserves a reward.

### 9.3 Reward timing and membership

A challenge forms a temporary working group, not a permanent party. Survivors can join, leave, defend, return, or contribute from different stations. Useful contributions persist through temporary retreat.

**DEFAULT:** At accepted completion, freeze the qualifying contribution set up to the completed submission. Grant credentials to living eligible contributors even if they are currently away from the room. Death does not award an in-run escape credential to a replacement character; preserve educational evidence and historical contribution. Already earned credentials are not revoked because a contributor later leaves the group.

For containers, completion unlocks the finite contents; it does not create an identical loot copy for every contributor. Initial loot distribution can remain shared physical access for eligible contributors rather than a separate randomized reward instance per person. Exact anti-theft/allocation policy is tunable and should not be confused with learning credit.

### 9.4 Acceptable opportunism

A late survivor can vault someone else’s defenses and use an unconsumed available opportunity. This can help someone at the back of the pack and is acceptable. One-use terminals prevent repeatedly harvesting the same cleared room. Rushers may legitimately get ahead when their knowledge fits a question.

The goal is not mandatory charity or equal work. It is that technical and defensive contributions to a shared challenge are rational ways to progress. NPCs should not endlessly perform suicidal charitable fortification for an idle human; they can reconsider a plan or move elsewhere. Do not add a morality tax or generic teamwork XP system.

### 9.5 Important non-goal: preventing all non-study escape

A player can sometimes escape by contributing mainly to physical defense. That grants world progress but does not advance unverified educational checkpoints. The curriculum keeps the missing knowledge unresolved and schedules eligible work later. This is an accepted separation, **not** permission to silently add an individual quiz gate to stop it.

Use playtests to measure whether players actually engage with study. If pure-defense runs dominate and undermine the experience, report that finding and adjust opportunities transparently; do not fabricate mastery or introduce a hidden educational quota.

## 10. Curriculum director: authoritative study progression

### 10.1 Source and scope

**LOCKED:** Use the uploaded merged roadmap [R], not a newly invented syllabus. Its source filename was `Product_Engineer_Interview_Prep(1).md`; canonical identity is `document_id: interview_prep_roadmap`. The bundle carries a byte-identical copy as `interview_prep_roadmap.md`.

Current supplied snapshot: merged revision **9**, dated **2026-09-19**. This is saved history, not evidence of new learning during game design.

| Track | Active scope in supplied snapshot | Saved position |
|---|---|---|
| PY | 16 topics, 80 objectives; 240 required checkpoints | Tier 1 REPAIR_VERIFY, W1/L02; 2/80 D1 passed; initial 16-topic sweep complete |
| PE | 20 core topics plus X03, X07, X08, X09: 112 objectives; 337 required checkpoints | Tier 1 DIAGNOSE_ALL, W0/L01; 8/112 D1 passed; 23/24 roster entries sampled; X09 unvisited |

Sources: [R] S0.1–S0.2, PY 0.1–0.2, PE 0.1–0.2. The supplied scope totals 192 active objectives and 577 required checkpoint cells; these are coverage counts, **not** exercise quotas or an estimate of the learner’s ability.

The separate backend system-design roadmap is deferred, not silently added. PE uses frontend-heavy and AI-expected overlays at the confirmed mid-level target. Its selected integration areas and environment-only checks stay as recorded.

### 10.2 Preserve the actual study rules

- **1 PY : 2 PE**, measured over primary study visits, not floors, terminal openings, NPC completions, or elapsed minutes. Preserve saved remaining-topic queues and review exceptions. [R: M3, S0.2]
- Both tracks retain **DIAGNOSE_ALL → REPAIR_VERIFY → TIER_GATE**. Sampling a topic does not complete its checkpoints. [R: PY 1–3; PE 2–4]
- Complete the required current tier before soliciting harder-tier work. The shared tier-lead limit applies in addition to each track’s own gate; a shared ceiling that permits Tier 2 does not mean a track with incomplete Tier 1 may start Tier 2. [R: M3.3]
- A strong response, high game floor, good escape rate, many teammates, or rare container never authorizes a higher educational tier.
- Preserve independent facets, teach only missing scope, avoid unnecessary repetition, and use fresh independent checks rather than immediate answer rehearsal. [R: PY 2; PE 3]
- Due/overdue reviews do not erase passes. Reviews, transfer, and new tasks respect the opened ceiling; real elapsed time for retention is separate from accelerated in-game time. [R: PY 5.3; PE 6.3]
- Use idiomatic **Python** for algorithm/backend work and **TypeScript/React** for frontend/runtime work. Do not insert uncommon syntax merely to make an unrelated concept tricky. [R: DEC0025–DEC0027]
- D1 is explanation/prediction/trace/critique at the relevant scope; no compulsory full implementation. D2 applies the labelled mechanism. D3 requires independent selection and the appropriate artifact. D4 changes meaningful assumptions and tests adaptation. Follow the distinct PY and PE definitions rather than flattening them. [R: PY 1.2–1.3; PE 2.2–2.3]
- No automatic cross-track pass by similar topic names. Combined tasks must be eligible and explicitly scoped beforehand, with separate evidence for each track. [R: M4]

### 10.3 Curriculum-first variety and apparent freedom

The world offers choices of rooms, defense opportunities, solo/group work, loot, and routes. The curriculum constrains newly issued learning encounters. Randomize valid question inputs, representations, scenarios, and allowed remaining facets; do **not** sample indiscriminately from every objective at the current tier when that violates the saved visit order or breadth rules.

**DEFAULT integration:** The scheduler issues an `EligibleStudyContract` describing track, objective/facets, depth ceiling, phase, applicable visit/review constraints, and evidence already established. The encounter generator builds a valid randomized task from it. Gameplay choices choose a physical opportunity; they do not mutate the contract into unrelated academic work.

Previewing a terminal is not evidence. A pending unanswered diagnostic stays pending under the roadmap’s continuation/supersession rules. Physically leaving a question is not automatically a recorded learning failure or a license to reset its identity. Count valid human study visits according to [R]; an NPC-only success or a purely defensive contribution is not a fictitious human diagnostic visit.

For multiple offered opportunities, reserve and commit curriculum visits consistently. Do not advance the ratio three times because three unopened candidate terminals were generated. An attempt that was already issued remains bound to its source; resume it without a duplicate visit. Any scheduling exception must follow [R], not be smuggled in as “randomization.”

A human joining an existing group must not cause the shared question to rewrite itself. The director should arrange learnable opportunities in advance. If the group’s already established task is not eligible for the human’s next formal study visit, permit survival/defensive participation but do not silently relabel it as the scheduled checkpoint or use it to assign harder work. Preserve any unsolicited valid evidence only within the roadmap’s actual rules.

### 10.4 Full subject coverage without forcing the theme

Include Python algorithms/data structures **and** product framing, metrics, TypeScript/browser behavior, components, asynchronous state, accessibility, APIs/permissions, lifecycle flows, testing, unfamiliar code, review, rollout, observability, UX, end-to-end ownership, AI judgment, LLM features, frontend architecture, and project narratives as specified in [R].

Do not remove metrics, product trade-offs, or behavioral narrative objectives because zombies do not naturally ask them. They can remain terminal discussion/critique tasks.

**X09 boundary:** Narratives must concern the human’s real past work. NPCs can ask follow-ups or critique a supplied account, but cannot invent the learner’s projects, metrics, accomplishments, or ownership. A shared success in a narrative discussion is not permission to tell fictional interview stories. [R: PE X09, 1.3, 9.1]

### 10.5 Snapshot import and resume

Do not reset the player to a beginner. Preserve existing ledger states, partial evidence, gaps, identifiers, and dates. In the bundled snapshot the next actual human study visit is PY’s oldest due review, followed by ordinary PY breadth at T11 as rules permit; PE still needs X09 after due-review scheduling. Use live source state rather than hardcoding this forever. [R: S0.2]

S0007 is open in the saved mid-session file. A genuinely new study session follows its recorded S0008/interruption rule. The handoff itself starts no session. Never copy this snapshot’s counters into a new save without checking current/reserved identifiers.

## 11. Puzzle generation, completion, and validation

### 11.1 AI-generated tasks, stable once issued

**LOCKED:** Generate questions as play proceeds instead of hand-scripting an exhaustive question/answer catalogue. The Terminal AI/associated completion evaluator determines whether the task is complete. A manual deterministic answer bank is not required.

Persist the exact issued prompt, constraints, targeted facets, depth, permitted format, completion rubric, task version, and attached artifacts. AI generation does not mean questions can remain ephemeral. Without this state, return-to-terminal consistency is impossible.

Variety includes changed data, representations, boundary cases, and contexts. Do not claim “transfer” merely because names or numbers changed. A depth-appropriate explanation, visual manipulation, code reading, written implementation, test critique, or product decision can all be valid depending on [R].

### 11.2 Completion is not mastery

Keep two separate evaluations:

**World completion check:** Does this submitted group/solo work satisfy the fixed task contract sufficiently to finish the encounter? Assistance is allowed. This produces retry/needs-work/complete/invalid-or-uncertain, tied to a submission revision.

**Human learning assessment:** What did this person actually demonstrate, independently or with assistance, against the roadmap? This runs after completion and on preserved unfinished work at appropriate boundaries. It can award zero academic passes on a successful world encounter.

The completion check may be part of the bridged tutor workflow or a separate model call. The mastery assessment is a separate responsibility and evidence packet. Do not make users wait at a terminal for either network operation.

### 11.3 Reliability without an authored answer bank

Use structured scenario contracts and model review. When appropriate, generate test cases, reference behavior, traces, or a small reference implementation alongside the question; store them outside the learner-visible workspace. These are generated validation aids, not a manually authored catalogue.

Where runnable code is involved and a safe runner exists, actually run it and record results. Tests support behavior, not proof of asymptotic complexity or authorship. Open-ended PE reasoning must permit multiple defensible answers under stated constraints. No exact-string grading of a reasonable product decision.

When the completion evaluator is uncertain, contradictory, or the task is malformed, re-evaluate or repair the task contract transparently while retaining work. An AI-created ambiguity is not a learner failure. Do not announce a pass until supported; do not invent execution. Early prototypes can have explicit completion stubs for mechanics testing, but must label them and never write stub results into the real curriculum.

### 11.4 Pending evaluation and errors

Snapshot on submit; attach request ID, encounter ID, revision, and run/survivor identity. Handle timeouts, duplicate replies, cancellation, and retries idempotently. Preserve submissions before sending. Expose processing state without blocking movement or retyping the same answer.

No automatic pause, invulnerability, extra furniture, or zombie slowdown as compensation for ordinary model latency. Mitigate through pre-generation, local persistence, bounded context, and nonblocking interaction. If the real provider/bridge is unavailable, clearly expose the issue and preserve work; do not silently pretend a simulated tutor is the agreed live bridge or grant unsupported mastery.

## 12. AI assessment of the human after completion

### 12.1 Required evidence packet

**LOCKED:** Make an AI call after a collaborative puzzle is solved using the group-chat context to determine what the human learned or already knows. Include the actual contribution evidence, not conversation alone:

| Evidence | Purpose |
|---|---|
| Original stable question/constraints/rubric | Stops retrospective changes to the standard |
| Eligible objective IDs, depth, prior ledger/facets | Scopes credit to the curriculum |
| Human-authored messages, explanations, predictions | Evidence of reasoning |
| Attributed code/test edits and accepted revision | Captures work not described in chat |
| NPC messages, patches, and when shown | Identifies supplied solutions/help |
| Private Study Mode conversation and when shown | Identifies assistance affecting independence |
| Actual test/runtime outputs, if present | Distinguishes observed execution from claims |
| Contribution and attempt events | Links the work to the correct person/session |

A single structured call can evaluate several applicable facets; do not grade every keystroke with an LLM. It must distinguish human, NPC, tutor, generated starter code, and imported earlier work.

### 12.2 Evidence rules

**LOCKED:** Reward useful defense with world access, not algorithm mastery. Merely being present, reading an NPC answer, copying an answer, or clicking submit cannot pass an objective. Independent reasoning before later assistance can remain valid at that narrow scope. Assistance with one facet does not automatically invalidate unrelated independent facets, but an NPC/tutor supplying a key step affects any dependent facet. [R: M4, PY 5.1, PE 6.1]

A sound correction of a teammate, relevant test design, or independent implementation can be evidence. Mark only complete checkpoint scope as P; store partial facets separately and target the missing scope later. “Understood with help” is valuable learning but is not an independent pass. Do not average scores to conceal a missing facet. [R: PY 0.4–0.6/5.1; PE 0.4–0.6/6.1]

One late self-correction can clarify an earlier answer, but rewriting a message must not erase the history of prior help. A lack of measured execution/timing is unknown, not failure. Survival death is not academic failure. Future retention requires a genuine delayed check. No separate post-group exam is required for stairwell access.

### 12.3 Apply changes through a validated ledger transaction

The assessment proposes changes with evidence references; it does not directly rewrite arbitrary roadmap text. Validate objective existence, permitted depth, evidence authorship, assistance, full versus partial scope, task identity, and conflicts before committing.

Do not delete curriculum requirements or reduce denominators to make the game feel rewarding. Scope uncertain model decisions as unresolved and retain evidence for re-review. Serialize/merge assessment updates against a ledger version; never overwrite another completed assessment with an older snapshot.

At completion, grant **world rewards first through the completion transaction**. Enqueue the separate educational assessment and update the roadmap when the result is ready. This describes future application behavior, not work being run by this chat after delivery. The player keeps playing. Pending assessments may temporarily prevent unverified academic promotion; they never require remaining stationary.

### 12.4 Incomplete tasks also retain evidence

Do not wait for a solved puzzle to protect learning. Save contributions incrementally. On death, run end, or explicit save, assess relevant unfinished human work when appropriate so valid demonstrated facets survive. Do not trigger a new expensive mastery call on every brief step away from a terminal.

## 13. Three layers of persistence

### 13.1 Physical encounter state: exact same thing, same puzzle

Within a run, store the immutable encounter ID, terminal/cluster association, original prompt, draft, conversation, edits, completed parts, submission history, and contributor record. Walking away and returning restores that same state.

**Critical anti-transfer rule:** Four completed steps on Container A do not appear as four free steps on Door B. A new location has its own encounter. This applies even if both ask about the same concept. A shared cluster’s different terminals are one encounter, so moving between its available stations legitimately reconnects to the same shared workspace.

### 13.2 Durable educational state: actual learned facets

Across deaths and fresh runs, preserve verified independent facets, assisted progress, unknowns/gaps, and relevant assistance history. Do not re-teach already demonstrated material merely because the level reset.

If a five-stage task ended after step 4, place its unfinished educational scope in the curriculum’s eligible continuation queue. When that scope later comes up, a continuation can supply the earlier established context and ask only for step 5. This does not mean the very next unrelated terminal receives the nearly finished puzzle.

The original question/draft can be retained for a future continuation; a changed scenario is allowed only if the prior work remains applicable. Do not blindly copy a proof into a different contract. Never promote incorrect/uncertain prior steps to “established facts.”

Supplying prior steps is context, not new authorship. If the question explicitly supplies the algorithm, it cannot establish fresh unprompted selection; implementation/tests may still supply relevant new evidence. Do not make every question a five-step template: “4 of 5” is an example of preserving facets, not a fixed exercise format.

### 13.3 Crash/reload persistence

**DEFAULT:** Autosave world and encounter events plus RNG state; restore the same run after an application crash/suspend. This differs from starting a new run after death. Save checkpoints and event sequences atomically enough to avoid duplicate completion/loot. Reopening a crashed game should not reroll a more favorable puzzle or reset The Surge countdown.

Retain raw game conversations/artifacts in encounter storage. [R] deliberately excludes full prompts/solutions/transcripts from its concise evidence ledger. Export concise evidence and resume metadata to the roadmap, not the entire gameplay transcript. A valid full roadmap export must preserve both tracks and meet its save protocol. No cloud/Project Source update is implied by generating a local file.

## 14. Intelligent NPC survivors

### 14.1 Two layers, not one model call per movement

**LOCKED:** Use a lightweight ongoing simulation for movement, perception, survival decisions, inventory, furniture handling, puzzle attention, and technical progress. Use generative AI for observed conversation and the detailed artifacts/decisions that need it. Do not continuously run an LLM for every survivor.

Each NPC has a persistent identity and varied skill profile, not a universal solver level. Relevant traits can include topic-specific competence, implementation versus explanation/testing strengths, risk tolerance, cooperation preference, confidence, talkativeness, and familiarity with the current kind of problem. Personalities affect choices, not the physical rules.

NPCs share the human’s physical constraints: no map omniscience, teleportation, inventory overflow, invulnerability, obstacle cheating, permanent tool ownership copied from elsewhere, or instant use of unopened terminals. They can be wrong, get stuck, change an approach, leave an optional puzzle, ask for help, or choose a safer room.

### 14.2 Continuing thought while moving

**LOCKED:** If an NPC intends to return to the same unfinished puzzle, some reasoning progress continues while moving/looping, at a reduced rate. It does not forget its problem on disengagement, and it does not think at full stationary rate while dodging zombies.

Illustrative attention weights from prior discussion, all **TUNABLE**:

| Activity | Relative attention example |
|---|---:|
| Focused at terminal | 1.00 |
| Walking in a safe area while retaining the problem | 0.40 |
| Kiting/looping | 0.20 |
| Immediate danger | 0.05 |
| Incapacitated/dead | 0.00 |

Active furniture handling has its own low/intermediate rate; choose through testing. Do not progress every abandoned puzzle in parallel. The current retained intention identifies which task receives off-terminal thought.

Track conceptual thought separately from physically editing/testing/submitting: a running NPC may form a hypothesis but cannot type at a remote terminal or claim to have executed a test while unable to interact. It returns to materialize/submit work. If a teammate is still at the shared station, that teammate can act on information communicated through a valid interaction.

### 14.3 Progress model

Represent work through scoped milestones such as understanding the contract, forming a candidate approach, tracing state, creating a draft, identifying an unresolved boundary, testing, or revising. Respect the question’s depth: a D1 milestone is not an implementation requirement.

Skill, focus, prior group discoveries, mistakes, and interruptions influence transitions. Avoid “NPC always succeeds after exactly N seconds,” and avoid linear speed multiplication by group size. Multiple survivors can divide useful work or redundantly pursue the same approach. Communication has diminishing returns.

Where exact code is not yet observed, save stable semantic milestones/seeds and their dependencies; materialize consistent code or explanations on demand. Once an artifact exists, retain its actual version history. Do not turn a numeric progress percentage into retroactive claims of executed tests.

**DEFAULT for NPC-only completion:** The validated puzzle model can determine a simulated NPC solution outcome without generating an unseen full chat transcript. Mark that provenance as simulated world behavior, not human learning or actual runtime execution. If exact artifacts are later shown, materialize and validate them against that committed outcome; on a mismatch repair presentation or defer the claim rather than contradict visible history. Human-involved submissions must use the real recorded shared work.

### 14.4 Tactical decisions

NPCs consider perceived horde distance/routes, current defenses, time/space to move furniture, remaining puzzle work, skill match, teammates’ actual contributions, optional loot value, carrying limits, and extraction opportunities. They should not assume a precise answer-completion time or use hidden exact barricade health when the player cannot.

One may secure a narrow office alone; a pair may split entrances; another may start shared reasoning immediately; a rusher may finish and climb; a looter may fall behind. Cooperation is encouraged by shared benefit, not imposed through a morality score. Do not script NPCs to punish the human for asking their tutor for help.

## 15. NPC group chat: on demand, persistent, selective

### 15.1 The final conversation rule

**LOCKED, including the user’s latest clarification:** Even when all NPCs are seated, available, and reading group chat, **not everyone replies**. Topic skills influence who responds, but the most skilled NPC is not always the sole speaker. Relevance, personality, context, recent participation, and bounded randomness create a natural selection of speakers.

Do not display artificial “Maya: no response” messages for silent people. Silence is simply silence. Do not generate a round-robin response from the entire cast or have everybody independently praise the same idea.

### 15.2 Opening and reopening: retrospective catch-up

On first open, generate the missing NPC conversation from the encounter’s actual event history and current solution state. On later opens, generate only new, meaningful events since the last materialized history range; append to the saved transcript without rewriting prior messages.

Inputs must include more than elapsed time: who was present, each person’s activity/focus, actual milestones, mistakes, existing code, damage/threat events, departures/deaths, and established messages. Five minutes during a frantic chase should not generate five minutes of full-speed focused programming.

If nothing relevant happened, add nothing. Rapidly closing/reopening chat does not advance the puzzle, generate extra hints, or reroll better NPC reasoning. Persist an event cursor so a given interval is materialized once. Do not require invisible chat generation for NPC groups the player never opens.

For lengthy absences, provide a bounded catch-up of meaningful exchanges and accessible earlier history rather than an overwhelming wall of invented banter. Exact batching/truncation presentation is tunable; important solver state must not disappear.

### 15.3 While open: replies only to player messages

**LOCKED:** During an already-open session, human messages trigger AI reply generation. There is no periodic autonomous LLM chatter and no model repeatedly prompting itself as the NPCs.

NPCs still move, think, edit, and act according to the simulation. Visible workspace changes and ordinary game-state indicators can happen without generating new dialogue. When the human writes, relevant NPCs respond to current context. A reopened chat may materialize intervening unobserved work; it must not retcon a conversation into an interval the human watched in silence.

**DEFAULT chronology implementation:** Track open/closed intervals and a last-presented event sequence. For work completed during an open-but-silent interval, preserve it as a work event; the next human exchange may refer to it, and catch-up can state it as a summary. Do not fabricate timestamped NPC messages that supposedly appeared while the human was watching but were never rendered.

### 15.4 Choosing responders

Use a lightweight responder router before generating prose. Filter for alive, present/reachable, available enough, and plausibly informed NPCs. Then weight candidates by:

- direct address and connection to the artifact under discussion;
- topic competence, complementary knowledge, and current task ownership;
- conversation relevance and whether they have anything new to add;
- confidence, talkativeness, social style, and current survival urgency;
- recent participation to discourage one character monopolizing every turn;
- bounded seeded randomness so a knowledgeable non-expert sometimes speaks first.

**DEFAULT:** Most ordinary inputs produce one substantive response; some produce two complementary responses; some receive a brief uncertainty response or no immediate NPC answer when that is plausible. Do not hardcode those counts as an invariant. Direct questions should usually receive a relevant answer without making every nearby NPC answer. An expert may defer, be uncertain, or be occupied. A less-skilled NPC can ask a useful question, explain a familiar case, or propose a plausible mistake rather than magically gaining expertise.

Sample responders without replacement, then generate a coherent multi-speaker continuation in one call when practical. Do not make separate model calls that each believe they are the only participant. Final wording should account for responses already chosen for that turn.

Use natural short simulated response delays, not promises of instantaneous provider latency. Check conditions again before delivery: if a speaker died or urgently fled during generation, stale ordinary dialogue must not appear as if they are still casually sitting at the terminal.

### 15.5 Dialogue must match artifacts and authorship

If an NPC says it edited a function, show a corresponding attributed revision. If it has only an idea, phrase it as an idea. If it says a test passed, there must be actual runner evidence or clearly identified simulated NPC-only provenance; never use such a claim as human ENV evidence.

Resolve concurrent edits through proposals/version checks or a single authoritative shared-document transaction. Reject/rebase conflicts rather than silently overwriting the human’s code. Retain removed/revised edits in history for attribution.

### 15.6 Assistance exposure versus fictional message time

**DEFAULT essential evidence safeguard:** Store both the in-world time an NPC event occurred and the actual sequence/time when its generated message or code was first shown to the human. A catch-up message written later must not retroactively turn an earlier independent human solution into an assisted one merely because its displayed fictional timestamp is earlier.

Likewise, once a relevant hint is supplied to the human, closing/reopening chat does not erase that exposure. Record availability/delivery conservatively rather than claiming to know whether the person read every word. The curriculum assessor needs this sequence to evaluate independence honestly.

## 16. Terminal AI and the direct Study Mode bridge

### 16.1 Locked player-facing behavior

Every solo or shared terminal provides a private, **always-free, unlimited** Terminal AI using the user-specified direct **ChatGPT Study Mode bridge**. A separate coding/integration instance handles the actual bridge. Do not substitute a different product or redefine the integration in this design handoff.

There is no Terminal Insight, hint charge, recharge cooldown, communications battery, paid hint, reward reduction, or gameplay punishment for tutoring. Ordinary real-time play continues; the user spends only the natural interaction time. NPC group chat is also unrestricted/free from the player’s perspective. This does not assert anything about provider billing or capacity.

The tutor receives the current question, relevant human learning state, available workspace, and appropriate conversation context. It explains, asks questions, and helps the learner reason. Do not rely on an assumed guarantee that a tutor can never reveal a solution; track whatever assistance was actually supplied.

Private tutor discussion is not automatically posted to the NPC group. Only public contributions become group knowledge unless the player shares them. The private transcript remains available to the learning assessor for honest independence attribution.

### 16.2 Implementation boundary, not a claim of API availability

This handoff specifies an adapter contract, **not** a claim that a public `study_mode=true` API, iframe, endpoint, or existing bridge has been verified. The bridge mechanism and available capabilities are delegated to the integration owner. Inspect the actual environment and use an authorized, user-approved integration. No credentials, tokens, private chat logs, or account secrets belong in game artifacts or generated prompts beyond the actual needed context.

Support stable sessions, context updates, message correlation, reconnects, streaming/non-streaming responses as available, and persistence. A stub adapter is acceptable for the first mechanics prototype if clearly labeled and kept separate from real learning credit. The finished integration must not silently degrade into an unrelated generic chatbot.

Model calls do not control physics. Do not keep a terminal open or hold a survivor still until a tutor finishes talking.

## 17. Simulation, generation, and authority boundaries

### 17.1 Authoritative systems

| System | Responsibility | Must not do |
|---|---|---|
| World simulation | Time, movement, perception, collision, damage, furniture, inventory, stairs, extraction | Ask the model to decide each frame’s physical truth |
| Survival director | Surge schedule and declared world-pressure configuration | Change academic scope, spawn upstairs, silently rescue/target a learner |
| Curriculum director | Eligible visits, track balance, gates, reviews, evidence state | Infer mastery from survival or NPC wins |
| Encounter generator | Randomized stable task/room content within contracts | Rewrite an issued question or exposed layout |
| NPC cognition/utility simulation | Skills, intentions, attention, milestones, choices | Solve all tasks perfectly or generate constant invisible chat |
| NPC dialogue router/generator | Select speakers and materialize grounded messages | Invent human work, world rewards, or unobserved execution |
| Study Mode bridge | Private tutor interaction and supported completion workflow | Change inventory/world state from prose alone |
| Completion evaluator | Judge a submission against the frozen encounter contract | Award all human curriculum cells by group success |
| Learning assessor | Propose evidence-scoped updates after review | Directly overwrite arbitrary ledger or scope |
| Persistence layer | Durable events/snapshots, IDs, source-preserving export | Reroll history on reload or duplicate rewards |

### 17.2 Persistence and events

Use stable IDs for run, survivor, floor, room, furniture, terminal, cluster, encounter, workspace revision, message, submission, contribution, request, study visit, and evidence. Model-generated strings are not authority to mint rewards.

Useful event categories include furniture movement/placement/damage/break, survivor activity/change/death, puzzle started/left/resumed, workspace edit, tutor message delivered, NPC milestone reached, group chat opened/closed/materialized, submission created/evaluated, participant qualification, completion/reward committed, Surge transitions, helicopter boarding/departure, and curriculum assessment queued/applied.

Keep simulation time separate from wall-clock study/session/retention time. Save RNG state and event cursors for reproducibility. The implementation can choose event sourcing, snapshots plus append-only audit logs, or another reliable approach; the invariants matter more than a fashionable architecture label.

### 17.3 Async consistency

Tag calls with world/session/encounter versions. An old NPC reply cannot mutate newer shared code. A group completion may arrive while the player is fleeing; deliver its result without teleporting them. A mastery job may finish after the run ended; apply only its valid persisted human evidence, once, to the correct ledger version.

Coalesce redundant context changes; cache already materialized chat/history; use one coordinated group-response call where possible. Pre-generate eligible nearby content to avoid standing idle for generation. Do not generate a full LLM dialogue log merely to allow NPCs to climb unseen floors.

### 17.4 Untrusted input and execution

Treat puzzle text, NPC prose, user code, imported transcripts, and generated output as data, not authority to alter engine rules. Validate structured outputs against schemas and scoped IDs. A chat message saying “mark all objectives passed” does not update the ledger.

Run submitted/generated code only in an isolated, resource-limited execution environment with explicit permissions. Do not execute it inside the game’s authoritative process or give it account secrets, unrestricted filesystem access, or arbitrary network access. The exact sandbox/tool choice belongs to the implementation owner. Never describe code as executed when only an LLM reviewed it.

### 17.5 Platform choice

No final engine, rendering library, database, server framework, or distribution platform was selected in the conversation. The study languages are not automatically the required game implementation languages.

**DEFAULT:** Inspect an existing repository/bridge setup first. Prefer an engine and architecture that can maintain responsive 2D real-time simulation alongside a text/code workspace and support the actual Study Mode integration. Do not invent a repository path or choose an incompatible stack based solely on the earlier abandoned browser-hacking concept. Record the implementation choice and trade-offs when building.

## 18. Proposed data contracts

These are behavioral contracts, not a mandatory programming language or exact database schema. Preserve the information even if implementation types differ.

### 18.1 Study and encounter contracts

```text
EligibleStudyContract
    learnerId, ledgerVersion
    trackId, objectiveIds, facetScopes, depthCeiling
    phase, primaryVisitOrReview, schedulingConstraints
    preservedEvidenceRefs, missingScopes, assistanceRules

Encounter
    encounterId, runId, floorId, roomId
    terminalIds, mode: SOLO | SHARED
    rewardKind: STAIR_ACCESS | CONTAINER
    rewardTargetId
    studyContractRef, frozenProblemSpec, generationSeed
    state, workspaceVersion, acceptedSubmissionId?
    participantContributions, qualifiedContributors
    createdAt, completedAt?

Submission
    submissionId, encounterId, workspaceVersion
    submittedBy, authoredArtifactRefs, immutableContentSnapshot
    completionRequestId, evaluationStatus, evaluationEvidence
    rewardCommitId?
```

### 18.2 Authorship, assistance, and chat contracts

```text
ContributionEvent
    contributionId, encounterId, survivorId
    category: REASONING | CODE | TEST | DEFENSE | OTHER_USEFUL
    artifactOrWorldEventRefs, observedEffect, qualificationState
    simulationTime, eventSequence

ConversationEvent
    messageId, encounterId, channel: GROUP | PRIVATE_TUTOR
    authorId, authorKind: HUMAN | NPC | TUTOR
    content, sourceEventRefs, workspaceVersionRefs
    inWorldTime, generatedAt, firstPresentedToHumanSequence?
    provenance: LIVE_REPLY | CATCH_UP | IMPORTED | TUTOR

ChatMaterializationState
    encounterId, savedMessages
    lastMaterializedEventSequence, lastPresentedEventSequence
    openClosedIntervals, pendingRequestIds
    responderRngState, recentSpeakers

LearningAssessmentProposal
    assessmentId, learnerId, encounterId, sourceLedgerVersion
    evidenceCutoffSequence, relevantAttemptRefs
    perFacetFindings[]:
        trackId, objectiveId, depth, facetScope
        observedOutcome, assistance, executionStatus
        supportingEvidenceRefs, suppliedHelpRefs
        completeCheckpointScope: boolean
        remainingScope, rationale
    contradictions, uncertainty, proposedReviewChanges
```

The applied roadmap retains its existing U/G/P/R meanings, objective IDs, evidence/attempt counters, and required scope. The proposal above is an adapter format, not a new incompatible progress standard.

### 18.3 NPC and Surge contracts

```text
NPCState
    identity, skillProfile, personality
    perceivedWorld, inventory, health
    currentActivity, intendedEncounterId?
    attentionState, retainedHypothesisState, milestoneRefs
    currentTerminalId?, teammateKnowledge, rngState

SurgeState
    phase: CALM | WARNING | ACTIVE
    lastSurvivorDeathTime?, previousSurgeEndTime?
    quietAnchor, sampledQuietDelay
    warningStart?, sampledActiveDuration?, activeStart?
    appliedModifierSet, rngState
```

### 18.4 Save transactions that must be idempotent

Committing a puzzle completion, consuming linked terminals, qualifying contributors, granting individual credentials, generating finite loot access, recording helicopter seats, materializing a chat event range, and applying a learning assessment must each have stable transaction/request identifiers. Repeated callbacks cannot perform the operation twice.

## 19. Interaction examples for implementation tests

These are constructed acceptance scenarios, not new curriculum exercises or existing gameplay evidence.

### 19.1 Defender shares the win

Four survivors enter a shared lab. One starts reasoning, one writes/tests, two move furniture. The human is one of the defenders and makes no technical contribution. The shared solution passes. All four meaningful contributors get personal stair access; the cluster is consumed. The human’s academic checkpoint remains unresolved. No compulsory follow-up exam appears.

### 19.2 All NPCs are available, but only one responds

Three NPCs are seated and reading. The human raises a boundary case. The responder router chooses a moderately skilled NPC who has been investigating tests; the strongest algorithm specialist remains silent. Another run/turn can choose differently. One useful reply appears, not three acknowledgments. Skill affects plausibility without becoming exclusive speaking ownership.

### 19.3 Chat reopen does not generate extra progress

The human reads a group discussion, closes it, moves a sofa for several minutes, then reopens it. The simulation shows one NPC thinking, one interrupted by a chase, and one returning to the terminal. The new transcript reflects those events and appends to prior messages. Closing/reopening again immediately adds nothing and does not improve the solution.

### 19.4 Long puzzle and breach

The player has a question requiring extended thought. Furniture creates protected study time without changing zombie walking speed. Impacts are heavily muffled. The outside sofa breaks loudly; a second intact doorway barrier still muffles the horde. The player exits the editor immediately, moves away, and returns later to unchanged work. A submission can finish evaluating while the player is running.

### 19.5 Cross-run continuation without moving a lock

A container task has four valid established facets and an unfinished implementation. Leaving it for a stair terminal does not transfer those four steps. After death, a later curriculum-eligible continuation may supply the established context and assess the missing implementation. Previously supplied algorithm choice is not re-counted as independent selection.

### 19.6 Surge without sabotage to study

A hidden quiet delay expires. The recognizable scream ramps up; there is no default text banner. The entire world and code/chat palette transform at activation. Zombies move/hit harder for the sampled fixed interval. A survivor death does not end it. No enemy appears upstairs; no question or editor content changes. After the event, normal zombie modifiers return and a new quiet interval is anchored to the latest relevant event.

## 20. Build order and prototype boundaries

Do not attempt every generated question family, NPC personality, item, and visual effect before establishing a functioning run. Build an end-to-end slice, then expand; do not silently redefine the finished game to match prototype shortcuts.

### Milestone A — One defensible floor

A playable top-down survivor; connected entrance and stair route; normal-speed zombie pursuit; a few movable furniture types with finite damage and contact-limited attacks; survivor vaulting; one terminal UI with instant escape and exact resume; one solo and one shared encounter; visible barricade damage and sound occlusion/breach.

Use clearly identified development puzzles/tutor stubs when needed. Do not write them as real educational proof. Test a long-focus session and a fallback chase, not only five-second questions.

### Milestone B — Shared objectives and NPC behavior

Add several NPCs with movement/fortification/puzzle intentions, reduced thought while moving, shared workspace state, meaningful contribution records, one-time completion, defender access, finite loot, and variable responder selection. Add on-demand chat with persistent event cursors and no idle LLM messages.

### Milestone C — Curriculum and live integration

Import [R] losslessly; validate saved state and digests; generate only eligible tasks; integrate the actual user-specified Study Mode bridge through its adapter; completion evaluation and post-completion individual evidence assessment; partial-work continuation and exact source-preserving roadmap export. Keep gameplay rewards independent from mastery.

### Milestone D — Full escape structure

Opening chase, multiple randomized floors, continuing Floor 1 inflow, per-survivor access across floors, inventory/items, four-seat repeating helicopter pickups, The Surge, darkness, alternative full-game UI themes, durable run saves.

### Milestone E — Scale and balance

Increase NPC population and variety, broaden supported curriculum task formats, validate generated defenses across many seeds, measure interaction/model latency, test long questions and late-run Surges, refine sound/visual accessibility, and run strategy comparisons.

**Deliverable expectation for the coding instance:** working increment, run instructions, automated tests, known limitations, and clear identification of stubs. Do not claim full live AI integration, educational validity, balanced generation, or practical ENV verification without actual evidence.

## 21. Balance and quality evaluation

Compare rushers, solo fortifiers, cooperative groups, opportunistic free-riders, looters, and mixed-role survivors on the same seeded floors. Report both escape outcomes and human study engagement. No requirement that all strategies have equal win rates, but no strategy should dominate through a broken incentive or NPC cheating.

Measure:

- uninterrupted focus windows, chase interruptions, setup cost versus protected time;
- feasibility of reasonable imperfect barricade arrangements and effects of multiple attackers;
- time-to-solution ranges by format/objective/familiarity, not only overall averages;
- completion/learning credit divergence, partial evidence retained, assistant-origin grading errors;
- NPC contribution diversity, silence/response patterns, expert monopolization, repeated catch-up output;
- bridge/generation/grading latency and cost separated from simulated cognition;
- late-arrival terminal availability, four-seat evacuation contention, and tail-survivor survival;
- baseline versus Surge outcomes, including furniture destruction and repeat-event pressure;
- visual readability in normal, dark-floor, and Surge conditions; sound-cue recognition without default text.

These are implementation tests to perform, not completed empirical findings. Do not promise that AI generation provides endless meaningful novelty without enough varied mechanics and valid task generation.

### 21.1 Explicit limits and risks

The design does not guarantee that a particular 30-minute question will be solved within one run, that a solo fortification always holds, that a temporary bubble always creates safe geometry, or that AI assessment never errs. Preserve drafts and genuine learning, detect content errors, and provide credible survival options.

The four-seat helicopter adds competition but not a permanent four-winner cap. The Surge adds pressure but cannot overrule curriculum depth. The direct bridge is a required integration dependency whose mechanism is not established by this document. All exact balance values require testing.

## 22. Superseded proposals — do not reintroduce

| Earlier proposal | Final decision |
|---|---|
| Minecraft pauses every ten minutes for study | Abandoned; real-time standalone zombie escape |
| Startup/company management or hacking-world game | Abandoned; preserve curriculum-directed variety, not those settings |
| Every question must fit the fiction | Not required; curriculum content may appear directly at terminals |
| Learning difficulty rises with building floor | No; curriculum gates determine depth |
| Loop zombies as the normal long-study loop | Emergency fallback; barricading is primary |
| Zombies move extremely slowly to make study possible | No; preparation earns time |
| Zombies appear in upper floors/secured rooms | Never; all enter through Floor 1 main entrance |
| Three independent questions in one shared study room | Linked collaborative terminals share one puzzle/workspace/chat |
| Generic teamwork HP / fortification-quality bonus | Removed; only real handling efficiency, geometry, and physical defenses |
| Everyone must barricade before solving | Removed; free role division and parallel work |
| Private tutoring costs battery/charges/rewards | Removed; free unlimited Terminal AI |
| Terminal Insight / powerful hint cooldown | Removed entirely |
| Every NPC answers the player | Selective replies, including when everyone is available |
| The strongest NPC always handles its specialty’s chat | Skill-weighted, context-sensitive, stochastic selection |
| Autonomous periodic NPC messages while chat is open | Removed; live AI replies are triggered by human messages |
| Constant hidden LLM conversations for all NPCs | Lightweight simulation; materialize grounded dialogue on opening/reopening |
| Give AI only elapsed time and invent plausible progress | Include actual activities, milestones, artifacts, and event history |
| Group completion automatically grants human mastery | No; separate evidence-based individual assessment |
| Defender must pass a personal follow-up before stair access | Removed; meaningful defense qualifies for access without an extra exam |
| Half-completed container puzzle follows player to a different door | No; exact instance stays put; later-run learning continuation is distinct |
| Blood Moon with default warning text | The Surge with distinctive escalating audio; optional accessible visual/caption cue |
| Surge lasts until someone dies | Randomly sampled fixed active duration |
| Old per-minute chance rolls plus extra cooldown | Latest accepted randomized quiet-delay schedule since latest death/previous event end |
| Furniture resets damage when moved or respawns in a run | No; damage persists and destruction is permanent for that run |
| One helicopter only, four winners total | Four seats per trip; subsequent pickups |
| A curated manually written complete answer bank is required | AI-generated tasks/evaluation with stable specs and appropriate verification |
| Silent AI review counts as executed code/browser testing | Never; keep actual execution and ENV provenance explicit |

## 23. Decisions intentionally left to implementation and playtesting

The user authorized reasonable implementation judgment rather than repeated clarification. Choose and document defaults without changing locked rules.

Unfixed details: final game title, engine/platform, precise Study Mode bridge mechanism, floor/survivor counts, health/death/recovery model, exact controls, item catalogue and carrying numbers, loot allocation particulars, furniture dimensions/handling/durability, NPC skill distributions, zombie inflow/perception/attack values, room generator statistics, audio asset production, palette colors/contrast values, helicopter timing, Surge timing/multipliers, assessment provider/prompt details, code-runner technology, save backend, and development rollout.

Do not treat an unknown number as permission to omit its system. Keep these values in configuration; show where a prototype differs from the final design. Document any discovered incompatibility among locked rules rather than silently choosing convenience over curriculum or persistent state.

## Appendix A. Source map and provenance

**[R] `interview_prep_roadmap.md`** — byte-identical copy of the user’s uploaded `Product_Engineer_Interview_Prep(1).md`, revision 9, updated 2026-09-19.

| Handoff subject | Authoritative roadmap location |
|---|---|
| Snapshot, career/stack context, current next action | S0.1–S0.2; PY 0.1–0.2; PE 0.1–0.2 |
| Latest practice-language and idiom decisions | S0.3, DEC0025–DEC0027 |
| Ratio, visits, lead limit, cross-track scope | M3–M4 |
| Independent/assisted evidence and correct scopes | PY 5.1–5.2; PE 6.1–6.2 |
| Breadth-first phases and strict gates | PY 1–3; PE 2–4 |
| Partial facets and fresh independent checks | PY 2.2–2.3 and 0.6; PE 3.2–3.3 and 0.6 |
| Delayed retention and no invented review failures | PY 5.3; PE 6.3 |
| Actual execution versus chat, ENV boundaries | PE 1.6 and 0.8.1; both evidence sections |
| Selected extensions and real-project narrative limits | PE 0.1, 9.1, X03/X07/X08/X09; PE 1.3 |
| Full-file save, digests, identifiers, source preservation | M2, M5–M6; PY 9.2–9.3; PE 10.2–10.3 |

Original whole-file SHA-256: `645d41c58c9211a9a37e0ae749361ac4a6341aaa05336ffffe6050d6d68889ef`.

All three embedded protected-block digests were checked during handoff preparation and matched the provided metadata. That verifies these file blocks against this upload, not older unavailable ancestry or the external technical/employer sources listed in the roadmap. No curriculum/evidence was changed, and no study session was started.

The game mechanics come from the current conversation and are consolidated here; they are design requirements, not outside factual research. No claims about current GTFO/Dead by Daylight/Silent Hill mechanics, third-party APIs, interview policies, or framework versions need to be inferred from the creative references. The roadmap’s external sources are inherited source material, not newly re-verified research.

## Appendix B. Final implementation principle

**Make it rewarding to learn, useful to cooperate, possible to prepare, dangerous to be exposed, and safe to leave a puzzle without losing intellectual work. Never trade away curriculum integrity to make a game meter advance.**
