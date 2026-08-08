# BidiForge — GUI Integration Contract (API & CLI Boundary)

## Overview
This specification defines the machine-readable API and CLI integration contract between the **BidiForge Node.js Engine** and future external graphical user interfaces (e.g. C# WinForms GUI, Electron GUI, or desktop wrappers).

---

## Command Invocation
External GUIs execute `node index.js [command] --json` via process stdout piping.

---

## Data Schema Contracts

### 1. `scan` / `status` Command
**Command:** `node index.js scan --json`
```json
{
  "success": true,
  "version": "4.0.0",
  "operation": "scan",
  "apps": [
    {
      "name": "Discord",
      "displayName": "Discord",
      "version": "1.0.9251",
      "path": "C:\\Users\\...\\app-1.0.9251",
      "asarPath": "C:\\Users\\...\\resources\\app.asar",
      "exePath": "C:\\Users\\...\\Discord.exe",
      "hash": "313ae281d3c73985",
      "detected": true
    }
  ]
}
```

### 2. `patch` Command
**Command:** `node index.js patch [app-name] --json`
```json
{
  "success": true,
  "version": "4.0.0",
  "operation": "patch",
  "results": {
    "patched": [
      { "name": "Discord", "version": "1.0.9251" }
    ],
    "skipped": [],
    "failed": []
  }
}
```

### 3. `rollback` Command
**Command:** `node index.js rollback <app-name> --json`
```json
{
  "success": true,
  "version": "4.0.0",
  "operation": "rollback",
  "result": {
    "success": true,
    "restored": true
  }
}
```

### 4. `health` Command
**Command:** `node index.js health [app-name] --json`
```json
{
  "success": true,
  "version": "4.0.0",
  "operation": "health",
  "report": {
    "appName": "Discord",
    "appVersion": "1.0.9251",
    "score": 100,
    "checks": [
      { "name": "ASAR Package Integrity", "passed": true, "weight": 25 }
    ]
  }
}
```

---

## Direct Module Import API
C# / Node IPC wrappers can import engine primitives directly:
```javascript
const { scan, patch, rollback, VERSION } = require('./index');
```
