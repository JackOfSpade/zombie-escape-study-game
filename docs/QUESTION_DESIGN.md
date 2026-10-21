# Development question design (PE track)

## Root cause of the old questions

`productPractice` used to pick one of a few shared feature cases per objective
family, append family-wide "addenda" (for example the T20 microservice note)
and paste the objective's raw curriculum scope as "Your task: …". The scope is
a broad capability statement, so a single terminal question became an
open-ended project, its rubric quoted the scope, and unrelated families shared
the same facts. Declared gaps were also appended as extra "cover it too" chores.

## Current design

- **Exact objective lookup.** `src/product-practice.ts` looks up the
  objective's own question with `Object.hasOwn` across the T07 state bank, the
  X09 narrative bank, `foundationQuestions`, `deliveryQuestions` and
  `aiPracticeQuestions`. All 112 PE objectives are covered. Unknown,
  prototype-named (`__proto__`, `toString`, …) or missing ids throw
  `Unsupported development question: …`; nothing is invented.
- **Small concrete artifacts.** Each prompt supplies its own snippet, trace,
  log, schema or facts and asks one main reasoning question.
- **Task/rubric alignment.** Rubric items grade only what the prompt asks. The
  rubric is cloned per call so a caller's edits cannot change the bank. Rubrics
  may contain expected answers; `presentProblem` in `src/ai.ts` records only
  `prompt` and `starter` for the player, not the rubric.
- **Depth 1 is code reading.** At D1, X08.2 (debounce) and X08.3 (tabs) use
  overrides: trace a supplied snippet and describe a fix in words; no
  implementation and an empty starter. X08.1 at D1 may describe its `once`
  typing instead of writing it. D2+ keeps genuine implementation intent.
- **Narratives stay truthful.** X09 asks are bounded to one slice of one real
  project and forbid invented facts, work or metrics.
- **T20.2 is checked against its code.** A test runs the shown generated code
  on stubs and confirms the two defects the rubric expects (any collaborator
  can revoke; a revoked token still authorizes reads).

## Development vs live

`devProblem` returns `provenance: "development"`, the exact scheduled contract
(unchanged scopes, scheduler, ledger and curriculum) and `starter: ""`. Its
random draws are unchanged. Live questions are written by the tutor under
`PROBE_STANCE`: one focused question whose correct answer genuinely depends on
its prerequisite facets, never a wider question or extra task. The synthetic
terminal demo (`scripts/terminal-mcp-app.mjs`) uses the same wording and still
describes gap descent and its single synthetic key.

## Limits

- A correct answer to one development question is practice evidence, never
  certification of full objective mastery.
- The static PE bank does not adapt to arbitrary declared gaps, so PE prompts
  no longer append gap lines. Python development traces keep their gap line.
- Previously captured questions, encounters and retries keep their stored
  problem text; only newly generated development questions change.

## Verification

```sh
npx tsc --noEmit -p .
npx tsx --test tests/practice-problem.test.ts
node --test tests/terminal-mcp-app.test.mjs
```
