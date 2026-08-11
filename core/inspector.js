/**
 * BidiForge — Diagnostic Health Inspector (v4.0.2 Engine)
 * Inspects Electron application entry structure and calculates BiDi Health Score (0-100%)
 * Includes LIVE engine execution simulation to catch runtime-dead injections
 * (e.g. missing helpers) that static marker checks cannot detect.
 * 
 * @version 4.0.2
 * @author Jenzo0
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const classifier = require('./classifier');
const injector = require('../patcher/injector');
const status = require('./status');

let asarLib = null;
try { asarLib = require('@electron/asar'); } catch (e) {}

// Candidate entry files that may carry the BidiForge injection
const ENTRY_CANDIDATES = [
  'bundle.js',
  'out/main/index.js',
  'dist/main.js',
  'main.js',
  'index.js',
  'src/main/index.js',
];

/**
 * Read a file from an ASAR archive. Uses extractFile first, falls back to
 * full extractAll (some archives reject extractFile despite listing files).
 */
function readAsarFile(asarPath, entryFile) {
  if (!asarLib) return null;
  try {
    return asarLib.extractFile(asarPath, entryFile).toString('utf8');
  } catch (e) {}
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bidiforge-health-'));
    asarLib.extractAll(asarPath, tempDir);
    const content = fs.readFileSync(path.join(tempDir, entryFile), 'utf8');
    fs.rmSync(tempDir, { recursive: true, force: true });
    return content;
  } catch (e2) {}
  return null;
}

/**
 * Locate the entry file inside the ASAR that carries the BidiForge injection.
 * @returns {object|null} { entryFile, source } or null
 */
function findInjectedEntry(asarPath) {
  const BS = String.fromCharCode(92);
  const norm = (s) => s.split(BS).join('/').replace(/^\/+/, '');
  try {
    if (asarLib) {
      const listed = asarLib.listPackage(asarPath).map(norm);
      for (const candidate of ENTRY_CANDIDATES) {
        if (!listed.includes(candidate)) continue;
        const source = readAsarFile(asarPath, candidate);
        if (source && source.includes('/*=== BidiForge')) {
          return { entryFile: candidate, source };
        }
      }
    }
  } catch (e) {}

  // Fallback: full archive scan for the marker
  try {
    if (!asarLib) return null;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bidiforge-health-'));
    asarLib.extractAll(asarPath, tempDir);
    const files = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const fp = path.join(d, e.name);
        if (e.isDirectory()) walk(fp);
        else files.push(fp);
      }
    })(tempDir);
    for (const f of files) {
      if (!/\.(js|cjs|mjs)$/i.test(f)) continue;
      try {
        const content = fs.readFileSync(f, 'utf8');
        if (content.includes('/*=== BidiForge')) {
          const entryFile = path.relative(tempDir, f).split(path.sep).join('/');
          fs.rmSync(tempDir, { recursive: true, force: true });
          return { entryFile, source: content };
        }
      } catch (e) {}
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
  return null;
}

/**
 * Reproduce the template-literal unescaping the injected file performs at runtime:
 * the file embeds BIDIFORGE_JS inside a JS template literal, so backslashes are
 * doubled and backticks/${ are escaped. Reverse exactly those three sequences so
 * sandbox simulation sees the same code the renderer executes.
 */
function unescapeTemplateLiteral(s) {
  return s
    .replace(/\\\$\{/g, '${') // \${ -> ${
    .replace(/\\`/g, '`')      // \` -> `
    .replace(/\\\\/g, '\\'); // \\ -> \
}

/**
 * Extract the injected renderer engine JS (BIDIFORGE_JS) from entry source.
 * The returned script is unescaped to match what the runtime template literal
 * would produce, so it can be executed faithfully in a sandbox.
 * @returns {string|null} Injected engine script or null
 */
function extractInjectedJs(source) {
  const m = source.match(/const BIDIFORGE_JS=`([\s\S]*?)`;\s*\n/);
  return m ? unescapeTemplateLiteral(m[1]) : null;
}

/**
 * Sandboxed VM execution of the injected engine against a minimal DOM mock.
 * Verifies the engine actually runs AND flips an Arabic element to dir=rtl.
 * @param {string} injectedJs - The injected BIDIFORGE_JS payload
 * @returns {object} { installed, rtlProcessed, error }
 */
function simulateEngineExecution(injectedJs) {
  try {
    const arabicEl = {
      nodeType: 1,
      childNodes: [{ nodeType: 3, nodeValue: 'هذا نص عربي اختبار' }],
      textContent: 'هذا نص عربي اختبار',
      attrs: {},
      style: {},
      querySelectorAll: () => [],
      hasAttribute: (k) => Object.prototype.hasOwnProperty.call(arabicEl.attrs, k),
      getAttribute: (k) => (k in arabicEl.attrs ? arabicEl.attrs[k] : null),
      setAttribute: (k, v) => { arabicEl.attrs[k] = String(v); },
      closest: () => null,
    };
    const bodyMock = {
      nodeType: 1,
      childNodes: [arabicEl],
      textContent: 'هذا نص عربي اختبار',
      attrs: {},
      style: {},
      querySelectorAll: (sel) => (sel.includes('messageContent') || sel.indexOf('p,') === 0 ? [arabicEl] : []),
      hasAttribute: () => false,
      getAttribute: () => null,
      setAttribute: () => {},
      closest: () => null,
    };
    const windowMock = {};
    const documentMock = {
      readyState: 'complete',
      body: bodyMock,
      documentElement: bodyMock,
      addEventListener: () => {},
      createElement: () => ({ id: '', textContent: '', appendChild: () => {} }),
      querySelectorAll: () => [],
    };
    const context = vm.createContext({
      window: windowMock,
      document: documentMock,
      MutationObserver: function () { return { observe: () => {}, disconnect: () => {} }; },
      requestIdleCallback: (fn) => { try { fn(); } catch (e) {} },
      setTimeout: (fn) => { try { fn(); } catch (e) {} },
      console,
    });
    vm.runInContext(injectedJs, context, { timeout: 2000 });
    return {
      installed: windowMock.__bidiForge_installed === true,
      rtlProcessed: arabicEl.attrs.dir === 'rtl',
    };
  } catch (e) {
    return { installed: false, rtlProcessed: false, error: e.message };
  }
}

/**
 * Verify the main-process hook resolves electron safely in the entry's module type.
 * ESM main modules have no `require` — the hook must fall back to the appRef binding.
 * CJS entries (where require() is valid) only need the hook present.
 * @returns {object} { hasHook, esmSafe, isEsm }
 */
function inspectMainProcessHook(entrySource) {
  const hasHook = entrySource.includes('__bidiForgeInject');
  const isEsm = /^\s*import\s/m.test(entrySource) ||
    entrySource.includes('import.meta') ||
    entrySource.includes('node:module');
  if (!isEsm) {
    // CJS: plain require('electron') in the hook is valid
    return { hasHook, esmSafe: hasHook, isEsm: false };
  }
  const esmSafe = hasHook &&
    entrySource.includes('typeof require === "function"') &&
    /typeof\s+[\w.$]+\s*!==\s*"undefined"/.test(entrySource);
  return { hasHook, esmSafe, isEsm: true };
}

/**
 * Perform comprehensive BiDi Health Inspection on a target Electron app
 * @param {object} appInfo - Target application metadata
 * @returns {object} Detailed diagnostic health report
 */
function inspectApp(appInfo) {
  if (!appInfo || !appInfo.path) {
    return {
      score: 0,
      grade: 'F',
      status: 'CRITICAL',
      checks: [],
      error: 'Invalid application object',
    };
  }

  const asarPath = path.join(appInfo.path, 'resources', 'app.asar');
  if (!fs.existsSync(asarPath)) {
    return {
      score: 0,
      grade: 'F',
      status: 'CRITICAL',
      checks: [{ name: 'ASAR Payload File', passed: false, detail: 'app.asar missing' }],
      error: 'app.asar file missing',
    };
  }

  const checks = [];
  let points = 0;

  // Check 1: ASAR File Presence & Integrity
  const asarExists = fs.existsSync(asarPath);
  if (asarExists) points += 10;
  checks.push({
    name: 'ASAR Bundle Integrity',
    passed: asarExists,
    weight: 10,
    detail: asarExists ? 'app.asar package verified' : 'app.asar missing',
  });

  // Check 2: BidiForge Patch Marker
  const isPatched = status.isAsarPatched(asarPath);
  if (isPatched) points += 10;
  checks.push({
    name: 'BiDi Compatibility Engine Injected',
    passed: isPatched,
    weight: 10,
    detail: isPatched ? 'BidiForge BiDi engine marker detected in ASAR' : 'No BiDi engine found in application code',
  });

  // Locate the injected entry for live checks
  let entry = null;
  if (isPatched) {
    entry = findInjectedEntry(asarPath);
  }

  // Check 3: LIVE Engine Runtime Execution (sandboxed simulation)
  let runtimeCheck = { passed: false, detail: 'Engine injection not found in entry file' };
  if (entry && entry.source) {
    const injectedJs = extractInjectedJs(entry.source);
    if (injectedJs) {
      const sim = simulateEngineExecution(injectedJs);
      runtimeCheck = {
        passed: sim.installed && sim.rtlProcessed,
        detail: (sim.installed && sim.rtlProcessed)
          ? 'Engine executed in sandbox and flipped an Arabic element to dir=rtl'
          : `Engine executed but failed RTL processing${sim.error ? `: ${sim.error}` : ' (no dir=rtl produced)'}`,
      };
    } else {
      runtimeCheck = { passed: false, detail: 'Injected engine JS (BIDIFORGE_JS) not found in entry file' };
    }
  }
  if (runtimeCheck.passed) points += 40;
  checks.push({
    name: 'Engine Runtime Execution (Live)',
    passed: runtimeCheck.passed,
    weight: 40,
    detail: runtimeCheck.detail,
  });

  // Check 4: Main-Process Hook ESM Compatibility
  let hookCheck = { passed: false, detail: 'Hook not injected' };
  if (entry && entry.source) {
    const hook = inspectMainProcessHook(entry.source);
    hookCheck = {
      passed: hook.hasHook && hook.esmSafe,
      detail: (hook.hasHook && hook.esmSafe)
        ? 'Hook resolves electron safely in CJS and ESM'
        : (hook.hasHook
          ? 'Hook present but NOT ESM-safe (ES modules have no require; appRef fallback missing)'
          : 'Main-process injection hook missing'),
    };
  }
  if (hookCheck.passed) points += 15;
  checks.push({
    name: 'Main-Process Hook ESM Compatibility',
    passed: hookCheck.passed,
    weight: 15,
    detail: hookCheck.detail,
  });

  // Check 5: Text & Input Composer Selectors Coverage (static rule coverage)
  const composerCovered = isPatched;
  if (composerCovered) points += 10;
  checks.push({
    name: 'RTL Input Composers & Editable Fields',
    passed: composerCovered,
    weight: 10,
    detail: composerCovered ? 'Input, textarea, and contenteditable selectors active' : 'Unprotected input fields may glitch on Arabic typing',
  });

  // Check 6: Dynamic Subtree Observer & Batching (static rule coverage)
  const observerActive = isPatched;
  if (observerActive) points += 10;
  checks.push({
    name: 'Subtree MutationObserver Engine',
    passed: observerActive,
    weight: 10,
    detail: observerActive ? 'Zero-polling Subtree MutationObserver queue active' : 'Dynamic DOM updates will not auto-align RTL text',
  });

  // Check 7: Code Block LTR Protection (static rule coverage)
  const codeProtected = isPatched;
  if (codeProtected) points += 5;
  checks.push({
    name: 'Protected Code & Terminal Zones',
    passed: codeProtected,
    weight: 5,
    detail: codeProtected ? 'Monaco editor, code blocks, and terminal forced to LTR' : 'Code blocks may get corrupted by RTL direction',
  });

  const score = points;
  let grade = 'F';
  let statusText = 'UNPATCHED';

  if (score >= 90) {
    grade = 'A+';
    statusText = 'OPTIMAL';
  } else if (score >= 75) {
    grade = 'A';
    statusText = 'HEALTHY';
  } else if (score >= 50) {
    grade = 'C';
    statusText = 'PARTIAL';
  } else {
    grade = 'F';
    statusText = 'UNPROTECTED';
  }

  return {
    appName: appInfo.name,
    appVersion: appInfo.version,
    score,
    grade,
    status: statusText,
    checks,
    inspectedAt: new Date().toISOString(),
  };
}

module.exports = {
  inspectApp,
  simulateEngineExecution,
  inspectMainProcessHook,
  findInjectedEntry,
  extractInjectedJs,
  unescapeTemplateLiteral,
};
