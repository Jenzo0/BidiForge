# BidiForge — GUI Integration Contract (API & CLI Boundary)

> **Source of truth:** `core/bridge.js` (envelope + scan/status/health) and `index.js`
> (patch/repair/rollback/cleanup routing, exit codes). Refresh date: **2026-08-11**.
> This document supersedes the previous flat-envelope draft.

## Overview
This specification defines the machine-readable API and CLI integration contract between the **BidiForge Node.js Engine** and external graphical user interfaces (e.g. C# WinForms GUI, Electron GUI, or desktop wrappers).

---

## Command Invocation
External GUIs execute `node index.js [command] --json` via process stdout piping. Every JSON command prints **exactly one JSON object** to stdout, then exits with a semantic exit code. Do not parse the human TUI output — always append `--json`.

---

## Standard Response Envelope
Every JSON operation returns this envelope (built by `core/bridge.js` `createResponse()`):

```json
{
  "success": true,
  "operation": "scan",
  "version": "4.0.2",
  "timestamp": "2026-08-11T14:30:28.741Z",
  "data": { },
  "error": null
}
```

- `success` — `true` on success, `false` on failure.
- `operation` — command name (`scan`, `status`, `patch`, `repair`, `rollback`, `health`, `cleanup`).
- `version` — engine version (`4.0.2`).
- `timestamp` — ISO-8601 UTC timestamp of the response.
- `data` — payload object on success; **`null` on failure**.
- `error` — **`null` on success**; on failure: `{ "code": "OPERATION_FAILED" | ..., "message": "..." }`.

### Exit Codes
| Code | Meaning |
|---|---|
| `0` | Operation succeeded (`success: true`) |
| `1` | Operation execution failed (`OPERATION_FAILED` / `PATCH_FAILED` / `ROLLBACK_FAILED` / `UNHANDLED_EXCEPTION`) |
| `2` | Invalid arguments or command (`INVALID_ARGUMENTS` / `INVALID_COMMAND`) |
| `3` | Unsupported or app not found (`NO_APPS_FOUND`, or patch found zero apps) |

---

## Per-Command `data` Shapes

### 1. `scan` — `node index.js scan --json`
```json
{
  "success": true,
  "operation": "scan",
  "version": "4.0.2",
  "timestamp": "2026-08-11T14:30:28.741Z",
  "data": {
    "apps": [
      {
        "name": "Discord",
        "rawName": "discord",
        "path": "C:\\Users\\...\\app-1.0.9251",
        "version": "1.0.9251",
        "electronVersion": null,
        "runtime": "unknown",
        "profile": "discord",
        "status": "patched"
      }
    ]
  },
  "error": null
}
```
`status` ∈ `patched` / `update-detected` / `ready` / `unsupported`.

### 2. `status` — `node index.js status --json`
```json
{
  "success": true,
  "operation": "status",
  "version": "4.0.2",
  "timestamp": "2026-08-11T14:30:33.629Z",
  "data": {
    "engineVersion": "4.0.2",
    "discoveredAppsCount": 7,
    "activeTheme": "⚡ Cyberpunk Cyan (Default)",
    "snapshotVaultCount": 13,
    "shellIntegration": true,
    "apps": [
      { "name": "Discord", "version": "1.0.9251", "status": "patched" }
    ]
  },
  "error": null
}
```

### 3. `patch` — `node index.js patch [app] --json`
```json
{
  "success": true,
  "operation": "patch",
  "version": "4.0.2",
  "timestamp": "2026-08-11T14:30:00.000Z",
  "data": {
    "application": "Discord",
    "status": "patched",
    "backupCreated": true,
    "validated": true,
    "details": {
      "patched": [ { "name": "Discord", "version": "1.0.9251", "path": "C:\\Users\\..." } ],
      "skipped": [],
      "failed": []
    }
  },
  "error": null
}
```
- `application` — target name or `"ALL"` when no app was specified.
- `status` ∈ `patched` / `already-patched` / `failed`.
- On failure: `success: false`, `data: null`, `error: { code: "PATCH_FAILED", message: "Failed to patch <names>" }`, exit code `1`.

### 4. `repair` — `node index.js repair [app] --json`
Same shape and semantics as `patch`, with `"operation": "repair"`. Use `repair` to force re-patch or auto-repair after an app update (`APP_UPDATED` state).

### 5. `rollback` — `node index.js rollback <app> --json`
```json
{
  "success": true,
  "operation": "rollback",
  "version": "4.0.2",
  "timestamp": "2026-08-11T14:30:00.000Z",
  "data": {
    "application": "Discord",
    "status": "restored",
    "restoredState": true,
    "backup": { "success": true, "backupPath": "C:\\...\\backups\\Discord-1.0.9251-....asar.bak" }
  },
  "error": null
}
```
Missing target → `success: false`, `error: { code: "INVALID_ARGUMENTS", ... }`, exit `2`. Failure → `error: { code: "ROLLBACK_FAILED", ... }`, exit `1`.

### 6. `health [app]` — `node index.js health [app] --json`
```json
{
  "success": true,
  "operation": "health",
  "version": "4.0.2",
  "timestamp": "2026-08-11T14:30:00.000Z",
  "data": {
    "report": {
      "appName": "Discord",
      "appVersion": "1.0.9251",
      "score": 100,
      "grade": "A+",
      "status": "OPTIMAL",
      "checks": [
        { "name": "Engine Runtime Execution (Live)", "passed": true, "weight": 40, "detail": "..." }
      ],
      "inspectedAt": "2026-08-11T14:30:00.000Z"
    }
  },
  "error": null
}
```
**Health Score Model** (`core/inspector.js`) — 7 weighted checks summing to 100:
1. ASAR Bundle Integrity (10)
2. BiDi Engine Injected — static marker (10)
3. **Engine Runtime Execution (Live)** (40) — the injected engine is extracted from the ASAR, template-literal-unescaped, and executed in a sandboxed VM; passes only if it flips an Arabic element to `dir="rtl"`
4. Main-Process Hook ESM Compatibility (15)
5. RTL Input Composers & Editable Fields (10)
6. Subtree MutationObserver Engine (10)
7. Protected Code & Terminal Zones (5)

Grades: `A+ ≥90 OPTIMAL`, `A ≥75 HEALTHY`, `C ≥50 PARTIAL`, `F <50 UNPROTECTED`.
No apps found → `success: false`, `error: { code: "NO_APPS_FOUND", ... }`, exit `3`.

### 7. `cleanup` — `node index.js cleanup --json`
```json
{
  "success": true,
  "operation": "cleanup",
  "version": "4.0.2",
  "timestamp": "2026-08-11T14:30:00.000Z",
  "data": {
    "result": { "success": true, "deleted": [ "C:\\...\\tmp-workspace" ], "kept": [ "C:\\...\\backups\\app.asar.bak" ] }
  },
  "error": null
}
```

---

## Direct Module Import API
Node wrappers / IPC hosts can import the engine primitives directly:

```javascript
const { patch, scan, rollback, cleanup, VERSION } = require('./index');
```

The JSON bridge is also importable for custom integration:

```javascript
const bridge = require('./core/bridge');
bridge.createResponse('scan', true, { apps: [] });
// → { success, operation, version, timestamp, data, error }
```

---

## Changelog
- **2026-08-11** — Rewritten to match `core/bridge.js` + `index.js` exactly: standard envelope now includes `timestamp` + `error`; every payload is wrapped under `data`; `patch`/`repair` use `{ application, status, backupCreated, validated, details }` (was `{ results }`); `rollback` documented; health model updated to the 7-check live-execution model; exit codes documented.
