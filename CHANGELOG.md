# Changelog

All notable changes to BidiForge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.2] — 2026-08-11

### 🐛 Fixed

- **Critical engine bug — Arabic text stayed left-aligned in every patched app.** The engine rules referenced two helper functions — `firstStrong()` and `ownText()` — that were **never defined** in `core/engine.js`. On first real text element, `firstStrong` threw a `ReferenceError` that was silently swallowed by the walker's `try/catch`, killing the whole engine. Static marker checks still reported `100/100` health while the engine was dead. Both helpers are now defined in the engine core (with unified `RTL_RANGES`).
- **ESM applications (e.g., OpenCode AI Desktop) got a dead injection hook.** The injected main-process snippet called `require('electron')` directly, but `require` does not exist in ES modules → `ReferenceError` → hook died silently. The snippet now falls back to the module's own `app`/`BrowserWindow` bindings when `require` is unavailable, so CJS and ESM apps both work.
- **Health Inspector can no longer be fooled by a static marker.** Previously all checks were variations of "is the marker present" — a dead engine scored 100/100. New **live engine-execution simulation**: extracts the injected BiDi JS from the ASAR, un-escapes the template literal, and executes it in an isolated VM with a mocked DOM, requiring it to actually flip an Arabic element to `dir="rtl"`. Also added a main-process hook ESM-compatibility check (7 checks, 100 points total).
- **Stale version drift cleaned across the whole codebase.** All `@version` JSDoc tags, engine headers, and functional constants (`VERSION`, `CURRENT_VERSION`, `ENGINE_VERSION`, `patchVersion`, injected engine marker) unified on `4.0.2`. `integrations/shell.js` still carried a `v3.7.2 Engine` header and `package-lock.json` still recorded `3.0.0` — both fixed.

### 🔒 Security

- `SECURITY.md` claimed supported versions `3.0.x` — corrected to `4.0.x`.
- `.gitignore` hardened: `backups/vault/` (full app ASAR snapshots) and helper scripts under `logs/` are no longer at risk of being committed with `git add -A`; `backups/vault/manifest.json` removed from git tracking.

### 📚 Documentation

- `docs/gui-integration-contract.md` fully rewritten to match the actual `core/bridge.js` implementation: envelope now documents `timestamp`/`error`, `patch` returns `data.application/status/backupCreated/validated/details`, `health` documents the 7-check report with `grade`/`status`/`inspectedAt`, exit codes 0/1/2/3, and current module exports.

### ✅ Verified

- Full suite: **21/21 tests passing**, including new regression tests that reproduce the exact broken-engine (missing helpers) and ESM-unsafe-hook scenarios.
- Live CDP verification on 4 real applications — Discord, Antigravity IDE, OpenCode AI Desktop, Freebuff Desktop — all show `dir="rtl"` applied to real Arabic content after repair.
- Health scoring re-verified on real apps: patched apps → `100 A+ OPTIMAL`, unpatchable app (Docker Frontend) → correctly rejected.

---

## [4.0.1] — 2026-08-10

### 🏗️ Added

- Machine-readable `--json` CLI boundary (`core/bridge.js`) with standardized envelope: `{ success, operation, version, timestamp, data, error }`.
- Comprehensive architecture & GUI integration specs.

### 🧹 Changed

- Engine stabilization audit: version alignment across test suite and launcher.

---

## [4.0.0] — 2026-08-08

### ✨ Added

- Global single-page TUI viewport layout (zero scrollback repetition).
- ES module syntax validation fix for patching ESM-packaged apps.
- Safe ASAR file-lock resilience (`safeRename`).
- Enhanced README with interface screenshots.

### 📦 Prior tagged releases

- **[v3.9.0]** — Dynamic card width with 100% straight vertical borders, animated Fast Scan spinner, asterisk-free back options, premium README with badges & architecture diagram, GitHub-ready release.
- **[v3.0.0]** — Initial tagged release of the BiDi compatibility layer.

[4.0.2]: https://github.com/Jenzo0/BidiForge/releases/tag/v4.0.2
[4.0.1]: https://github.com/Jenzo0/BidiForge/releases/tag/v4.0.1
[4.0.0]: https://github.com/Jenzo0/BidiForge/releases/tag/v4.0.0
[v3.9.0]: https://github.com/Jenzo0/BidiForge/releases/tag/v3.9.0
[v3.0.0]: https://github.com/Jenzo0/BidiForge/releases/tag/v3.0.0
