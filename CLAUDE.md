# Repository instructions for Claude Code

Read and follow [AGENTS.md](AGENTS.md), including the automated GameTest workflow. The Test Lab is for agents to create, load and run deterministic suites directly from the shell; no user-operated editor or browser session is required.

Start with `npm run --silent test:game -- --list --json -`. After gameplay changes, run `npm run --silent test:agents` and inspect `.artifacts/game-tests/report.json`. See [the scenario authoring guide](docs/GAME_TEST_LAB.md) for custom fixtures and replay commands.
