# Test suite

The suite protects deterministic framework behavior and release boundaries with Bun's test runner.

## Commands

```bash
bun run test
bun run test:coverage
bun run verify
```

`bun run test:coverage` enforces a per-file minimum of 24% line coverage and 30% function coverage. The
baseline established when this policy was added was 86.66% aggregate line coverage and 87.74% aggregate
function coverage across loaded source files.

The per-file threshold is intentionally lower than the aggregate baseline because Bun applies it to every
loaded file. Host-facing services contain branches that require a complete SugarCube, ModLoader, IndexedDB,
Dialog, or WebAudio runtime.

## Coverage ownership

- `utils.test.ts` covers deterministic utility behavior and installed prototype helpers.
- Service tests cover public lifecycle, concurrency, persistence, and failure boundaries.
- Audio tests cover decode concurrency, player state, playlist navigation, and shuffle behavior.
- Package tests validate ZIP and modpack output, protocol structure, idempotent writes, and failure paths.
- Types-package tests validate generated declarations, maintained package sources, npm scope, and consumer compilation.

## Deliberate boundary

These tests do not claim to replace real-game validation. DOM rendering, Twee execution, SugarCube passage
lifecycle, and full ModLoader integration should be verified in the browser host. Add a focused regression
test here whenever a deterministic defect can be isolated from that host.
