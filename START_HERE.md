# Start Here — Handoff to the AI Coding Instance

This package is a consolidated specification for the user’s **2D top-down zombie-escape coding-study game**. It is not a request to resume the user’s study session or redesign the concept from scratch.

## Contents

- `GAME_DESIGN_HANDOFF.md`: complete agreed game design, final decisions, implementation defaults, system boundaries, persistence rules, and superseded proposals.
- `ACCEPTANCE_TESTS.md`: implementation test scenarios; these have not been executed against a game.
- `interview_prep_roadmap.md`: the user’s original merged Python/product-engineering curriculum, copied unchanged from `Product_Engineer_Interview_Prep(1).md`.
- `SOURCE_INTEGRITY.json`: source identity and verified protected-block hashes.
- `MANIFEST.sha256`: checksums for the package files.

## Paste this message into the coding conversation

> Implement the game specified in `GAME_DESIGN_HANDOFF.md`, using `interview_prep_roadmap.md` as the authoritative learning source and `ACCEPTANCE_TESTS.md` as the behavior checklist. Read the superseded-proposals table before making design choices. Do not bring back old mechanics just because they appeared earlier in the discussion.
>
> This is a real-time 2D top-down zombie escape game with one human and many smart NPC survivors. They climb procedurally generated building floors and escape on recurring four-seat helicopters. All zombies enter through Floor 1’s main entrance and travel upward physically. Players earn study time by moving finite, destructible furniture; normal-speed zombies remain dangerous. Looping is the emergency fallback. Intact barricades heavily muffle the horde; breaches are loud. The Surge has an escalating audio warning, full world/puzzle-UI palette transformation, and temporary zombie-only buffs on the specified randomized timer.
>
> Solo terminals and linked multi-terminal shared puzzles coexist. A shared room has ONE persistent puzzle/workspace/chat. Meaningful technical OR defensive contribution earns group rewards and personal stair access; no post-group personal exam and no artificial teamwork durability bonus. Terminals are one-use. Leaving a terminal preserves its puzzle exactly; nearly completed work cannot move to a different lock. Across runs, genuine learning facets survive and later eligible continuations can ask only for unfinished scope.
>
> Free unlimited Terminal AI connects through my direct ChatGPT Study Mode bridge; the integration details are delegated to the implementation/integration owner. Keep that boundary explicit rather than assuming a public endpoint. No hint currency, cooldown, Terminal Insight, or tutoring penalty. NPC group chat is also free.
>
> Simulate NPC physical/technical progress cheaply. Materialize grounded conversation only when chat opens/reopens, then append consistently. While already open, generate replies only to human messages. Even with everyone present and available, choose a plausible subset of respondents using skill, relevance, personality, recent turns, and randomness; do not make the best specialist the only speaker or make everybody reply.
>
> After shared completion, make a separate AI call using the transcript, attributed human edits/tests, private tutor assistance, and actual exposure timing to propose individual curriculum evidence. Validate those proposals before updating the roadmap. Group success does not prove human mastery. Keep strict curriculum tiers, the saved breadth order, due reviews, and the 1 PY : 2 PE primary-visit ratio. No learning advancement from floor number, death, NPC work, or survival reward.
>
> First inspect the available repository and bridge setup. Implement the smallest end-to-end slice from the build-order section before expanding. Where a numeric or technical choice is not fixed, select a configurable default and document it instead of reopening settled design. Keep prototype stubs clearly labeled and separate from real educational credit. Deliver runnable code, run instructions, tested behavior, and honest remaining limitations.

## Source handling

The bundled roadmap is revision 9, dated 2026-09-19. It is a saved snapshot, not a fresh reset of the learner. Opening this package starts no study session and awards no learning credit. Actual future study must follow the roadmap’s session-ID/resume rules.

Read relevant curriculum and progress sections rather than using the handoff’s abbreviated scope table as a replacement. Preserve the original; future legitimate updates must use its complete merged-file save protocol. The protected-block hashes were checked during packaging, but the roadmap’s inherited external sources and unavailable older ancestry were not independently reverified.

The game design is self-contained in this package; no access to the original conversation or the assistant’s memory is required. Exact balance values, the implementation stack, and the bridge mechanism are not asserted to have been built or verified here.
