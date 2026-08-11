/**
 * BidiForge — Universal Electron Detector (v4.0 Engine)
 * High-performance, non-destructive discovery engine for Windows Electron apps
 * 
 * @version 4.0.0
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

let asar = null;
try {
  asar = require('@electron/asar');
} catch (e) {
  // Loaded on demand if needed
}

// Windows search roots
const SEARCH_ROOTS = [
  process.env.LOCALAPPDATA,
  process.env.APPDATA,
  process.env.ProgramFiles,
  process.env['ProgramFiles(x86)'],
].filter(Boolean);

/**
 * Fast read package.json from ASAR without unpacking full archive
 * @param {string} appAsar - Path to app.asar
 * @returns {object|null} Parsed package.json or null
 */
function readAsarPackageJson(appAsar) {
  try {
    if (!asar) asar = require('@electron/asar');
    const buf = asar.extractFile(appAsar, 'package.json');
    if (buf) {
      return JSON.parse(buf.toString('utf8'));
    }
  } catch (e) {
    // Ignore error and try fallbacks
  }
  return null;
}

/**
 * Detect runtime type (CJS vs ESM) from ASAR header/files
 * @param {string} appAsar - Path to app.asar
 * @returns {string} 'CJS', 'ESM', or 'unknown'
 */
function detectRuntimeType(appAsar) {
  try {
    if (!asar) asar = require('@electron/asar');
    const raw = asar.getRawHeader(appAsar);
    if (!raw || !raw.header || !raw.header.files) return 'unknown';

    const files = raw.header.files;
    if (files['out'] && files['out'].files && files['out'].files['main']) {
      try {
        const sample = asar.extractFile(appAsar, 'out/main/index.js').toString('utf8', 0, 500);
        return sample.includes('import ') ? 'ESM' : 'CJS';
      } catch (e) {}
    }

    if (files['dist'] && files['dist'].files) {
      return 'CJS';
    }

    if (files['main.js'] || files['index.js']) {
      const entryName = files['main.js'] ? 'main.js' : 'index.js';
      try {
        const sample = asar.extractFile(appAsar, entryName).toString('utf8', 0, 500);
        return sample.includes('import ') ? 'ESM' : 'CJS';
      } catch (e) {}
    }
  } catch (e) {}
  return 'unknown';
}

/**
 * Detect single Electron app directory
 * @param {string} dirPath - Directory path
 * @returns {object|null} App info object or null
 */
function detectElectronApp(dirPath) {
  try {
    const resourcesPath = path.join(dirPath, 'resources');
    if (!fs.existsSync(resourcesPath)) return null;

    const appAsar = path.join(resourcesPath, 'app.asar');
    if (!fs.existsSync(appAsar)) return null;

    // Get app info via fast ASAR header extraction
    const pkg = readAsarPackageJson(appAsar);
    
    let version = pkg ? (pkg.version || 'unknown') : 'unknown';
    let rawName = pkg ? (pkg.name || path.basename(dirPath)) : path.basename(dirPath);

    // Fallback executable version if pkg version unknown
    const exeFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.exe'));
    const exePath = exeFiles.length > 0 ? path.join(dirPath, exeFiles[0]) : null;

    if (version === 'unknown' && exePath) {
      try {
        const verOutput = execSync(
          `powershell -NoProfile -Command "(Get-Item -Path '${exePath.replace(/'/g, "''")}').VersionInfo.ProductVersion"`,
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        if (verOutput) version = verOutput;
      } catch (e) {}
    }

    const runtimeType = detectRuntimeType(appAsar);
    const hash = getFileHash(appAsar);
    const cleanName = formatAppName(rawName, dirPath);

    return {
      name: cleanName,
      rawName: rawName,
      displayName: cleanName,
      version: version,
      path: dirPath,
      asarPath: appAsar,
      resourcesPath: resourcesPath,
      exePath: exePath,
      runtimeType: runtimeType,
      hash: hash,
      detected: true,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Scan root directory recursively up to maxDepth
 * @param {string} root - Directory to scan
 * @param {number} depth - Current depth
 * @param {number} maxDepth - Max recursive depth
 * @returns {Array} Found apps
 */
function scanRoot(root, depth = 0, maxDepth = 2) {
  const results = [];
  if (depth > maxDepth || !fs.existsSync(root)) return results;

  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(root, entry.name);
      
      const detection = detectElectronApp(fullPath);
      if (detection) {
        results.push(detection);
        continue;
      }

      if (depth < maxDepth) {
        results.push(...scanRoot(fullPath, depth + 1, maxDepth));
      }
    }
  } catch (e) {
    // Ignore permission errors
  }

  return results;
}

/**
 * Detect all installed and running Electron apps
 * @returns {Array} List of detected Electron apps
 */
function detectAll() {
  const results = [];
  const seen = new Set();

  for (const root of SEARCH_ROOTS) {
    const apps = scanRoot(root);
    for (const app of apps) {
      if (!seen.has(app.path.toLowerCase())) {
        seen.add(app.path.toLowerCase());
        results.push(app);
      }
    }
  }

  // Cross-reference with running processes
  const runningApps = detectRunningElectron();
  for (const running of runningApps) {
    const existing = results.find(r => r.path.toLowerCase() === running.path.toLowerCase());
    if (existing) {
      existing.isRunning = true;
      existing.processName = running.processName;
    } else if (!seen.has(running.path.toLowerCase())) {
      seen.add(running.path.toLowerCase());
      results.push(running);
    }
  }

  return results;
}

/**
 * Detect running Electron processes via PowerShell
 * @returns {Array} Running apps list
 */
function detectRunningElectron() {
  const results = [];
  try {
    const output = execSync(
      'powershell -NoProfile -Command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName, Path | ConvertTo-Json"',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    let processes = [];
    try {
      const parsed = JSON.parse(output);
      processes = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return results;
    }

    for (const proc of processes) {
      if (!proc.Path) continue;
      const dir = path.dirname(proc.Path);
      const detection = detectElectronApp(dir);
      if (detection) {
        detection.isRunning = true;
        detection.processName = proc.ProcessName;
        results.push(detection);
      }
    }
  } catch (e) {}

  return results;
}

/**
 * Calculate SHA-256 hash (first 16 hex chars)
 * @param {string} filePath - Path to file
 * @returns {string} Hash string
 */
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Format raw app name and path into clean display name
 * @param {string} name - Raw app name
 * @param {string} dirPath - Optional directory path
 * @returns {string} Clean formatted name
 */
function formatAppName(name, dirPath = '') {
  const combined = (name + ' ' + dirPath).toLowerCase();
  
  if (combined.includes('discord')) return 'Discord';
  if (combined.includes('opencode')) return 'OpenCode AI Desktop';
  if (combined.includes('antigravity')) return 'Antigravity IDE';
  if (combined.includes('docker')) return 'Docker Desktop';
  if (combined.includes('obsidian')) return 'Obsidian';
  if (combined.includes('heroic')) return 'Heroic Games Launcher';
  if (combined.includes('code') || combined.includes('vscode')) return 'VS Code';
  if (combined.includes('cursor')) return 'Cursor';
  if (combined.includes('slack')) return 'Slack';

  return name
    .replace(/^@/, '')
    .replace(/[\/-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, s => s.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  detectAll,
  detectElectronApp,
  detectRunningElectron,
  scanRoot,
  getFileHash,
  formatAppName,
  SEARCH_ROOTS,
};
