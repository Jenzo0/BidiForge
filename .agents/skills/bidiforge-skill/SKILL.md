---
name: bidiforge-skill
description: Comprehensive master skill for BidiForge — Electron Right-to-Left (RTL) & BiDi patching engine, Hermes TUI terminal UI, ASAR atomic repacker, machine-readable JSON API bridge, and diagnostic health inspector. Use when modifying, debugging, patching, testing, or integrating BidiForge with external tools or GUIs.
---

# 🪬 BidiForge Master Skill (`bidiforge-skill`)

## 1. Overview & Purpose
**BidiForge** is a high-reliability Windows CLI tool and engine that surgically patches Electron desktop applications at the ASAR package level to enable proper Right-to-Left (RTL) and Bidirectional (BiDi) text rendering for Arabic, Hebrew, Persian, and Urdu typography.

This skill serves as the authoritative operational guide, architecture blueprint, session audit, and troubleshooting reference for BidiForge v4.0.0+.

---

## 2. Session Audit: Problems Identified & Solutions Applied

### 🚨 Problem 1: Vertical TUI Box Border Misalignment (`0xFE0F` & Emoji Width)
- **Symptom**: Right-side box borders in the terminal UI (`ui/menu.js`) broke and misaligned by 1–2 columns when rendering emoji or variation selectors (`0xFE0F`).
- **Root Cause**: Standard `String.length` counts Unicode surrogate pairs and variation selectors as multiple characters, while terminals render them as single wide characters.
- **Solution**: Implemented `visualWidth()` helper function using `string-width` to strip ANSI escape codes and calculate exact terminal cell display widths before rendering borders.

### 🚨 Problem 2: Stacked TUI Menu Repetition & Arrow Key Prompt Triplication
- **Symptom**: Navigating back/forth between TUI menus or pressing arrow keys caused repeated logo headers and prompt duplication to pile up indefinitely in terminal scrollback.
- **Root Cause**: `console.clear()` was insufficient across various Windows shells (pwsh/cmd), leaving scrollback history intact.
- **Solution**: Implemented `clearScreen()` sequence emitting `\x1b[2J\x1b[3J\x1b[H` (clear screen + clear scrollback buffer + home cursor) on every menu render in `ui/menu.js`.

### 🚨 Problem 3: Cropped Logo Banner on Smaller Terminals
- **Symptom**: Large 8-line ASCII art logo got truncated on terminal windows under 30 rows.
- **Root Cause**: Static logo height exceeding available vertical viewport space.
- **Solution**: Implemented responsive auto-windowing in `ui/menu.js`: automatically collapses to a compact 3-line ASCII header when `process.stdout.rows < 30`.

### 🚨 Problem 4: ASAR Repack Hang & Injector Syntax Validation Failure
- **Symptom**: Patching hung at Step 5 (`Inject failed: Syntax validation failed` / `repacking atomically`).
- **Root Cause**: `validateSyntax()` in `patcher/injector.js` executed `node --check` without specifying module types, causing false syntax errors on ES Module (`import`/`export`) or Webpack bundle files. Additionally, Windows process file locks on `app.asar` caused atomic rename operations to fail.
- **Solution**:
  1. Updated `validateSyntax()` to attempt standard syntax check, fallback to `--input-type=module` for ESM files, and handle Windows file paths via `JSON.stringify()`.
  2. Implemented `safeRename()` in `patcher/asar.js` with exponential backoff retries (up to 5 attempts) and `copyFileSync` fallback if file locks persist.

### 🚨 Problem 5: Lack of Machine-Readable Boundary for External GUIs
- **Symptom**: External applications (like C# WinForms GUI) could not programmatically parse BidiForge results cleanly.
- **Solution**: Built `core/bridge.js` and added `--json` CLI flag handling in `index.js`. Returns standardized JSON envelopes (`success`, `operation`, `version`, `timestamp`, `data`, `error`) and semantic exit codes (0, 1, 2, 3).

---

## 3. Architecture & Key Components

```
BidiForge/
├── index.js              # Main CLI entry, TUI router, and --json API router
├── BidiForge.bat          # Windows double-click launcher
├── core/
│   ├── bridge.js          # Standardized JSON API bridge for external GUIs
│   ├── detector.js        # Electron app auto-discovery engine (AppData/ProgramFiles)
│   ├── classifier.js      # Entry point & runtime type classifier (CJS vs ESM)
│   ├── engine.js          # BiDi CSS/JS payload generator (MutationObserver subtree)
│   ├── inspector.js       # Diagnostic health inspector & scoring engine (0-100)
│   ├── status.js          # Safe update tracker & hash verifier
│   ├── watcher.js         # Hot-reload background watcher
│   └── logger.js          # Structured logging utility
├── patcher/
│   ├── asar.js            # ASAR extract/pack/validate with safeRename resilience
│   ├── injector.js        # Surgical code injector & ESM syntax validator
│   ├── backup.js          # Backup creation (.bidiforge-backup) & rollback system
│   └── vault.js           # Multi-version snapshot vault
├── rules/                 # Modular BiDi CSS & JS rules
├── profiles/              # App-specific overrides (Discord, Obsidian, Heroic, etc.)
├── integrations/
│   └── shell.js           # Windows Explorer context menu integration
├── ui/
│   ├── menu.js            # Hermes Agent TUI engine with scrollback purging
│   └── theme.js           # 6 built-in color themes (cyberpunk, matrix, dracula, etc.)
├── docs/
│   ├── integration-test-architecture.md
│   └── gui-integration-contract.md
└── tests/
    ├── runner.js          # Automated diagnostic test runner (16 assertions)
    ├── border_test.js     # TUI layout & visual width alignment tests
    └── json_contract_test.js # JSON API schema & CLI contract tests
```

---

## 4. Machine-Readable API Contract (`--json`)

External programs execute `node index.js [command] --json` via process piping.

### Standard Response Envelope
```json
{
  "success": true,
  "operation": "scan",
  "version": "4.0.0",
  "timestamp": "2026-08-09T22:40:00.000Z",
  "data": { ... },
  "error": null
}
```

### Exit Codes
- `0`: Operation succeeded (`success: true`)
- `1`: Operation execution failed (`code: OPERATION_FAILED`)
- `2`: Invalid arguments or command (`code: INVALID_COMMAND`)
- `3`: Unsupported or app not found (`code: NO_APPS_FOUND`)

---

## 5. Verification & Testing SOP

To verify BidiForge health and test suite:

```bash
# Run full automated test suite (16 tests across 9 groups)
npm test

# Test JSON contract output
node index.js scan --json
node index.js status --json
node index.js health --json

# Run TUI border alignment test directly
node tests/border_test.js
```

---

## 6. Compatibility Classifications

- **Verified & Tested**: Discord, OpenCode AI Desktop, Antigravity IDE, Obsidian, Heroic Games Launcher, Docker Desktop Frontend.
- **Generic Candidates**: Any standard Electron application (v12–v32) packaged with `resources/app.asar`.
- **Unsupported**: Non-Electron native desktop apps (Win32, WPF, UWP, C++).
