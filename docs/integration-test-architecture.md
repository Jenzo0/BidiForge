# BidiForge — Integration Test Architecture (Technical Specification)

## Overview
This document specifies the required end-to-end (E2E) integration test pipeline for BidiForge.

```
Electron Fixture App ➔ ASAR Extraction ➔ Classifier ➔ BiDi Injection ➔ Syntax Validation ➔ ASAR Repack ➔ Application Launch Test ➔ BidiForge Runtime Verification ➔ Rollback Verification
```

---

## E2E Test Pipeline Lifecycle

### 1. Minimal Electron Fixture App
- Create a lightweight test fixture (`tests/fixtures/sample-electron-app/`) containing standard `package.json`, `main.js`, and `index.html`.
- Pack fixture into `app.asar` using `@electron/asar`.

### 2. Extraction & Classification
- Call `asar.extract(asarPath)` to extract fixture workspace.
- Assert `classifier.classify(tempDir)` returns `confidence >= 50` and identifies `entryPoint` correctly.

### 3. Engine Injection & Syntax Validation
- Call `injector.inject(tempDir, appInfo)`.
- Assert `BidiForge` markers (`/*=== BidiForge`) exist in entry file.
- Assert `injector.validateSyntax(entryPath)` passes without syntax errors.

### 4. Atomic Repack & Integrity Verification
- Call `asar.pack(tempDir, asarPath)`.
- Assert `asar.validate(asarPath)` verifies valid ASAR header and `package.json`.

### 5. Headless Application Launch & Runtime Inspection
- Launch fixture using `electron` headless child process.
- Inspect `window.__bidiForge_installed === true` via webContents API.
- Assert Arabic text elements render with `dir="rtl"` and `unicode-bidi: plaintext`.

### 6. Rollback & Integrity Check
- Call `backup.rollback(appPath)`.
- Assert original `app.asar` hash matches original pre-patch SHA-256 hash.

---

## Future Implementation Guidelines
- Keep fixtures self-contained inside `tests/fixtures/`.
- Mock process launch calls in CI environments without GUI displays.
