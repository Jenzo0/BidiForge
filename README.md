# BidiForge — Universal BiDi Compatibility Layer for Electron 🚀

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Electron-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

> **Universal BiDi Compatibility Layer for Electron**

**BidiForge** automatically detects and patches compatible Electron applications using structure-based analysis to fix and optimize **Right-to-Left (RTL)** and **Bi-Directional (BiDi)** text rendering (Arabic, Hebrew, Persian, etc.) on Windows, seamlessly with a single click.

---

## 📖 Table of Contents / جدول المحتويات
- [English Documentation](#english-documentation)
  - [Author & Credits](#-author--credits)
  - [What It Solves](#-what-it-solves)
  - [Supported Applications](#-supported-applications)
  - [Quick Start](#-quick-start)
  - [CLI Commands](#-cli-commands)
  - [Project Architecture](#-project-architecture)
  - [Safety & Rollback](#-safety--rollback)
  - [License](#-license)
- [التوثيق باللغة العربية](#التوثيق-باللغة-العربية)

---

## English Documentation

### 👤 Author & Credits
- **Developed:** Jenzo
- **Version:** v3.0.0 (Universal Architecture)
- **License:** Open Source under the MIT License

---

### 💡 What It Solves
Electron-based desktop apps (such as **Discord**, **VS Code**, **Cursor**, **OpenCode**, **Antigravity**, **Obsidian**, **Slack**, various **AI clients**, and **Internal Electron apps**) often suffer from broken BiDi/RTL text rendering:
- ❌ **Reversed Mixed Text:** English words, numbers, and URLs appearing inverted at the start of RTL sentences.
- ❌ **List Markers Misplacement:** Ordered list numbers (`1.` `2.`) and bullets (`•`) stuck on the left side despite RTL content.
- ❌ **Composer Alignment Issues:** Incorrect typing direction and text alignment inside chat inputs and textareas.
- ❌ **Unaligned Tables:** RTL Markdown and HTML tables failing to align to the right.

**The BidiForge Solution:**
- ✅ Dynamic first-strong character detection for natural BiDi isolation.
- ✅ Proper RTL alignment for paragraphs, headings, lists, and tables.
- ✅ **Strict LTR Preservation:** Code blocks, Monaco Editor, CodeMirror, diff viewers, and terminals remain 100% LTR isolated without any side effects.

---

### 🎯 Supported Applications
BidiForge is designed to support compatible Electron applications using structure-based detection:
- **Discord**
- **VS Code**
- **Cursor**
- **OpenCode AI Desktop**
- **Antigravity IDE**
- **Obsidian**
- **Slack**
- **AI clients** (Desktop LLM apps, streaming chat clients)
- **Internal Electron apps** (Company internal tools)
- **Compatible Electron applications running on Windows**

---

### ⚡ Quick Start

#### 1. One-Click Double-Click (Recommended):
Simply double-click the following file:
```cmd
BidiForge.bat
```
The tool automatically scans for installed Electron applications, creates a secure SHA-256 backup, injects the BiDi engine, and repacks the ASAR package atomically in seconds.

---

### 💻 CLI Commands

```bash
# Install dependencies (first time only)
npm install

# 1. Automatically detect and patch all installed Electron apps
npm start

# 2. Non-destructive scan and status check
npm run scan

# 3. Clean temporary workspaces and prune obsolete backups
npm run cleanup

# 4. Rollback a target application to its original backup
node index.js rollback <app-name-or-path>

# 5. Run the automated test suite
npm test
```

---

### 🏗️ Project Architecture

```text
bidiforge/
├── BidiForge.bat           # One-click Windows launcher
├── index.js                # Main CLI entry point
├── package.json            # Project definition & dependencies
├── LICENSE                 # MIT License
├── .gitignore              # Git ignore rules
│
├── core/                   # Core Engine
│   ├── detector.js         # Non-destructive fast ASAR & App scanner
│   ├── classifier.js       # Runtime type & entry point classifier (CJS/ESM)
│   ├── engine.js           # Rules aggregator & high-performance DOM observer
│   ├── status.js           # App status registry
│   └── logger.js           # Structured logging
│
├── patcher/                # Patcher Engine
│   ├── asar.js             # Atomic ASAR unpack/pack & header validation
│   ├── backup.js           # SHA-256 backup, manifest tracking & rollback
│   └── injector.js         # Code injection & syntax checker (node --check)
│
├── rules/                  # Modular BiDi Rules
│   ├── text.js             # Text blocks & headings
│   ├── lists.js            # Ordered & unordered list markers RTL positioning
│   ├── tables.js           # Content-aware table alignment
│   ├── composer.js         # Input fields & contenteditable plaintext isolation
│   ├── markdown.js         # Markdown elements
│   └── protected-zones.js  # LTR code zones (Monaco, CodeMirror, Terminals)
│
├── profiles/               # Application Profiles
│   ├── generic-electron.js # Universal fallback strategy
│   ├── opencode.js         # OpenCode Desktop profile
│   └── antigravity.js      # Antigravity IDE profile
│
└── tests/                  # Automated Test Suite
    └── runner.js           # 11/11 tests passing
```

---

### 🛡️ Safety & Rollback
- **Atomic Repacking:** Repacks to `app.asar.tmp` and validates headers before atomic replacement (`renameSync`), preventing corrupt installations.
- **SHA-256 Backups:** Creates verified backups before modifying any application.
- **Automatic Rollback:** Instantly restores original ASAR backup if syntax or structural validation fails.

---

### 📜 License
Licensed under the **[MIT License](LICENSE)**.

---
---

## التوثيق باللغة العربية

### 👤 المبرمج والمعلومات
- **Developed:** Jenzo
- **الوصف:** Universal BiDi Compatibility Layer for Electron
- **الإصدار الحالي:** v3.0.0 (Universal Architecture)
- **الترخيص:** مفتوح المصدر تحت رخصة MIT

---

### 💡 المشاكل التي تعالجها الأداة
تم تصميم BidiForge لدعم تطبيقات Electron المتوافقة باستخدام التحليل البنيوي لإصلاح مشاكل النصوص العربية والـ RTL (في تطبيقات مثل **Discord**, **VS Code**, **Cursor**, **OpenCode**, **Antigravity**, **Obsidian**, **Slack**, **عملاء الذكاء الاصطناعي**, و**تطبيقات Electron الداخلية**):
- ❌ **انعكاس النص المختلط:** ظهور الكلمات الإنجليزية أو الأرقام والروابط في بداية الجمل العربية بشكل غير صحيح.
- ❌ **مواقع القوائم (Lists & Markers):** ظهور أرقام القوائم (`1.` `2.`) والـ Bullets (`•`) على اليسار رغم أن النص عربي.
- ❌ **صناديق الكتابة (Composer / Input):** محاذاة مؤقتة خاطئة وتوجيه الكتابة من اليسار لليمين أثناء الكتابة بالعربية.
- ❌ **الجداول العربية:** عدم محاذاة الجداول العربية إلى اليمين.

**حل BidiForge:**
- ✅ كشف ديناميكي لاتجاه أول حرف قوي (First Strong Character Detection).
- ✅ محاذاة القوائم والجداول والفقرات العربية بشكل طبيعي للجهة اليمنى.
- ✅ حماية كاملة ومطلقة لمناطق الكود البرمجي (Monaco Editor, CodeMirror, Terminals, Code Blocks) لإبقائها LTR دائماً دون أي تأثير سلبي.

---

### 🎯 التطبيقات المدعومة
تعتمد الأداة على الكشف البنيوي العام لدعم تطبيقات Electron المتوافقة:
- **Discord**
- **VS Code**
- **Cursor**
- **OpenCode AI Desktop**
- **Antigravity IDE**
- **Obsidian**
- **Slack**
- **AI clients** (تطبيقات الشات والـ LLM)
- **Internal Electron apps** (التطبيقات الداخلية للشركات)
- **تطبيقات Electron المتوافقة على نظام ويندوز**

---

### ⚡ طريقة الاستخدام السريعة
ببساطة قم بتشغيل الملف التالي بالضغط المزدوج:
```cmd
BidiForge.bat
```
تقوم الأداة تلقائياً بفحص التطبيقات المثبتة، إنشاء نسخة احتياطية آمنة لكل تطبيق، وتطبيق محرك BiDi خلال ثوانٍ!

---

### 💻 أوامر السطر البرمجي (CLI Commands)

```bash
# تثبيت التبعيات (مرة واحدة فقط)
npm install

# 1. كشف وتطبيق الإصلاح على كل التطبيقات تلقائياً
npm start

# 2. فحص وتتبع حالة التطبيقات بدون تعديل
npm run scan

# 3. تنظيف الملفات المؤقتة وتقليم النسخ الاحتياطية القديمة
npm run cleanup

# 4. لاسترجاع النسخة الأصلية لتطبيق معين (Rollback)
node index.js rollback <اسم-التطبيق-أو-مساره>

# 5. تشغيل حزمة الاختبارات الآلية
npm test
```
