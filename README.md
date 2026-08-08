<div align="center">

```
  ██████╗ ██╗██████╗ ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
  ██╔══██╗██║██╔══██╗██║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
  ██████╔╝██║██║  ██║██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
  ██╔══██╗██║██║  ██║██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
  ██████╔╝██║██████╔╝██║██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
  ╚═════╝ ╚═╝╚═════╝ ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

# 🪬 BidiForge

**Universal BiDi Compatibility Layer for Electron Applications**

[![Version](https://img.shields.io/badge/Version-3.9.0-00d4ff?style=for-the-badge&logo=semanticrelease)](https://github.com/Jenzo0/BidiForge/releases)
[![Node](https://img.shields.io/badge/Node.js-16+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

*A powerful Windows CLI tool that patches Electron applications to render Arabic & RTL text flawlessly — in seconds, with zero breakage.*

[**Getting Started**](#-quick-start) · [**Features**](#-features) · [**Usage**](#-usage) · [**Architecture**](#-architecture) · [**Contributing**](#-contributing)

</div>

---

## 🌍 The Problem

Over **70% of modern desktop applications** are built on Electron — Discord, VS Code, Obsidian, Slack, Notion, and hundreds more. But most of them **completely fail** at rendering Right-to-Left (RTL) and Bidirectional (BiDi) text.

For **400+ million** Arabic, Hebrew, Persian, and Urdu speakers, this means:

| Without BidiForge | With BidiForge |
|---|---|
| `م ر ح ب ا` disconnected letters | `مرحبا` properly connected Arabic |
| `!dlrow ,olleH مرحبا` reversed mixed text | `مرحبا, Hello world!` natural BiDi flow |
| Broken UI alignment in RTL contexts | Pixel-perfect RTL layout injection |

**BidiForge surgically patches these apps at the ASAR level** — no source code access needed, no app rebuilds, no waiting for upstream fixes.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔍 Smart Auto-Discovery
Automatically scans your entire system and detects all installed Electron applications with version information.

### 💉 Surgical ASAR Patching
Injects optimized RTL CSS + BiDi JavaScript directly into the app's ASAR archive using a subtree MutationObserver engine — zero DOM polling.

### 🛡️ Safe Update Detection
Detects when an app vendor pushes an update that overwrites your patch and auto-repairs it instantly.

### 📦 Multi-Version Snapshot Vault
Create and restore multiple versioned snapshots of any app — like git for your patches.

</td>
<td width="50%">

### 🔥 Live Hot-Reload Watcher
Watch mode that automatically re-patches apps in real-time as configurations change.

### 🖱️ Windows Explorer Integration
Right-click any Electron app folder in Explorer → "Patch with BidiForge".

### 🩺 Diagnostic Health Inspector
Full diagnostic suite with scoring to verify patch integrity, structure compatibility, and BiDi injection status.

### 🎨 Themeable Hermes Agent TUI
Beautiful terminal interface with arrow-key navigation, animated spinners, dynamic card rendering, and multiple color themes.

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites
- **Windows 10/11** (x64)
- **[Node.js](https://nodejs.org/)** v16 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Jenzo0/BidiForge.git

# Navigate to the project
cd BidiForge

# Install dependencies
npm install

# Launch BidiForge
node index.js
```

Or double-click `BidiForge.bat` for instant launch!

---

## 💡 Usage

### Interactive TUI Mode (Recommended)

```bash
node index.js
```

This launches the **Hermes Agent TUI** — a fully interactive terminal interface with:
- ⬆️⬇️ Arrow key navigation
- 🔍 `/` to search/filter options
- `Space` to toggle multi-select checkboxes
- `Enter` to confirm selection
- `Esc` to go back

### CLI Commands

```bash
# Scan for all installed Electron apps
node index.js scan

# Patch a specific application
node index.js patch discord

# Patch all detected applications
node index.js patch

# Force re-patch (after manual app update)
node index.js repair discord

# Rollback to original (remove patch)
node index.js rollback discord

# Run diagnostic health check
node index.js health

# Start live hot-reload watcher
node index.js watch

# Change color theme
node index.js theme monokai

# Register Windows Explorer right-click menu
node index.js register-shell

# Manage snapshot vault
node index.js vault
node index.js vault restore <snapshot-id>

# Clean temporary files
node index.js cleanup
```

---

## 🎨 Color Themes

BidiForge ships with multiple built-in color themes:

| Theme | Style |
|-------|-------|
| **Cyberpunk Cyan** | Neon cyan borders with amber accents (default) |
| **Monokai** | Warm tones inspired by the classic editor theme |
| **Solarized Dark** | Ethan Schoonover's precision colors |
| **Dracula** | Purple-accented dark theme |
| **Nord** | Arctic, north-bluish color palette |
| **One Dark** | Atom editor's signature palette |

Switch themes anytime:
```bash
node index.js theme dracula
```

---

## 🏗️ Architecture

BidiForge operates through a sophisticated multi-stage pipeline:

<details>
<summary><b>Click to view architecture diagram</b></summary>

```
┌──────────────────────────────────────────────────────────┐
│                    BidiForge Engine                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────┐    ┌────────────┐    ┌──────────────┐     │
│   │Detector │───▶│ Classifier │───▶│   Injector    │     │
│   │ Engine  │    │  (CJS/ESM) │    │  (CSS + JS)  │     │
│   └─────────┘    └────────────┘    └──────┬───────┘     │
│        │                                   │             │
│        │          ┌────────────┐           │             │
│        └─────────▶│   Backup   │◀──────────┘             │
│                   │   System   │                         │
│                   └──────┬─────┘                         │
│                          │                               │
│                   ┌──────▼─────┐    ┌──────────────┐    │
│                   │  Snapshot  │    │   Watcher     │    │
│                   │   Vault    │    │  (Hot-Reload) │    │
│                   └────────────┘    └──────────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  UI Layer: Hermes Agent TUI (Cards, Spinners, Themes)    │
└──────────────────────────────────────────────────────────┘
```

</details>

### Project Structure

```
BidiForge/
├── index.js              # Main CLI entry & interactive menu
├── BidiForge.bat          # Windows double-click launcher
├── core/
│   ├── detector.js        # Electron app auto-discovery engine
│   ├── classifier.js      # CJS/ESM entry point classifier
│   ├── inspector.js       # Diagnostic health inspector
│   ├── logger.js          # Logging engine
│   ├── status.js          # Patch status & safe update tracker
│   ├── updater.js         # Update checker
│   └── watcher.js         # Live hot-reload watcher
├── patcher/
│   ├── asar.js            # ASAR extract/pack/validate engine
│   ├── backup.js          # Backup creation & rollback system
│   ├── injector.js        # BiDi CSS+JS injection engine
│   └── vault.js           # Multi-version snapshot vault
├── rules/                 # Modular BiDi CSS/JS rule definitions
├── profiles/              # App-specific patch profiles
├── integrations/
│   └── shell.js           # Windows Explorer context menu
├── ui/
│   ├── menu.js            # Hermes Agent TUI engine
│   └── theme.js           # Color theme engine
└── tests/
    └── runner.js           # Automated test suite
```

---

## 🧪 Testing

BidiForge includes a comprehensive automated test suite:

```bash
node tests/runner.js
```

```
========================================
       BIDIFORGE TEST SUITE v3.1.0      
========================================

  ✓ detectAll returns an array of Electron apps
  ✓ formatAppName formats raw app names correctly
  ✓ classify resolves entry points and runtime types correctly
  ✓ loadRules loads modular rules from rules/
  ✓ loadProfile matches application profiles correctly
  ✓ generateCSS aggregates CSS from all rules
  ✓ generateJS uses subtree MutationObserver without full-DOM polling
  ✓ buildSnippet generates complete injection code with BidiForge markers
  ✓ strip removes previous BidiForge injections cleanly
  ✓ backup.init initializes backups folder and manifest
  ✓ validateSyntax passes for valid JavaScript code
  ✓ inspector.inspectApp generates health score report
  ✓ vault.getManifest initializes snapshot manifest
  ✓ shell.register generates valid Windows registry commands

========================================
RESULTS: 14 PASSED, 0 FAILED
========================================
```

---

## 🤝 Contributing

Contributions make the open source community amazing. Any contributions you make are **greatly appreciated**.

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

---

## 🔒 Security

For security concerns and vulnerability reports, please see [SECURITY.md](SECURITY.md).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

### 💖 Made with passion by [Jenzo0](https://github.com/Jenzo0)

*"Forging a better desktop for everyone, right to left."*

**If BidiForge helped you, please consider giving it a ⭐ star!**

</div>
