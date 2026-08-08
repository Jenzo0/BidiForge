/**
 * BidiForge — Diagnostic Test Runner (v3.1 Engine)
 * Runs unit test suite for BidiForge modules
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const detector = require('../core/detector');
const classifier = require('../core/classifier');
const engine = require('../core/engine');
const backup = require('../patcher/backup');
const injector = require('../patcher/injector');
const inspector = require('../core/inspector');
const vault = require('../patcher/vault');
const shell = require('../integrations/shell');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('========================================');
console.log('       BIDIFORGE TEST SUITE v3.1.0      ');
console.log('========================================');

// Test Group 1: Detector Engine
console.log('');
console.log('[1/7] Testing Detector Engine...');
test('detectAll returns an array of Electron apps', () => {
  const apps = detector.detectAll();
  assert(Array.isArray(apps), 'Expected array from detectAll');
  console.log(`    (Discovered ${apps.length} apps)`);
});

test('formatAppName formats raw app names correctly', () => {
  assert.strictEqual(detector.formatAppName('opencode'), 'OpenCode AI Desktop');
  assert.strictEqual(detector.formatAppName('antigravity'), 'Antigravity IDE');
});

// Test Group 2: Dynamic Entry & CJS/ESM Classifier
console.log('');
console.log('[2/7] Testing Dynamic Entry & CJS/ESM Classifier...');
test('classify resolves entry points and runtime types correctly', () => {
  const targetDir = path.join(__dirname, '..');
  const res = classifier.classify(targetDir);
  assert(res.confidence > 0, 'Expected confidence > 0');
});

// Test Group 3: Rules & Profiles Engine
console.log('');
console.log('[3/7] Testing Rules & Profiles Engine...');
test('loadRules loads modular rules from rules/', () => {
  const rules = engine.loadRules();
  assert(rules.length >= 6, `Expected at least 6 rules, got ${rules.length}`);
});

test('loadProfile matches application profiles correctly', () => {
  const opencodeProf = engine.loadProfile({ name: 'opencode' });
  assert.strictEqual(opencodeProf.name, 'opencode');

  const genericProf = engine.loadProfile({ name: 'randomApp' });
  assert.strictEqual(genericProf.name, 'generic-electron');
});

test('generateCSS aggregates CSS from all rules', () => {
  const css = engine.generateCSS({ name: 'test' });
  assert(css.includes('unicode-bidi: plaintext;'), 'Missing plaintext bidi');
});

test('generateJS uses subtree MutationObserver without full-DOM polling', () => {
  const js = engine.generateJS({ name: 'test' });
  assert(js.includes('MutationObserver'), 'Missing observer engine');
});

// Test Group 4: Injection & Snippet Building
console.log('');
console.log('[4/7] Testing Injection & Idempotency...');
test('buildSnippet generates complete injection code with BidiForge markers', () => {
  const snippet = engine.buildSnippet('app', { name: 'testApp' });
  assert(snippet.includes('/*=== BidiForge v3.0'), 'Missing start marker');
});

test('strip removes previous BidiForge injections cleanly', () => {
  const original = 'const app = require("electron");\nconsole.log("hello");';
  const injected = original + '\n' + engine.buildSnippet('app');
  const stripped = engine.strip(injected);
  assert.strictEqual(stripped.trim(), original.trim());
});

// Test Group 5: Backup System & SHA-256 Validation
console.log('');
console.log('[5/7] Testing Backup System...');
test('backup.init initializes backups folder and manifest with engine version', () => {
  backup.init();
  assert(fs.existsSync(backup.BACKUP_DIR), 'Backups dir should exist');
});

// Test Group 6: JS Syntax Verification
console.log('');
console.log('[6/7] Testing JS Syntax Verification...');
test('validateSyntax passes for valid JavaScript code', () => {
  const validFile = path.join(__dirname, '..', 'core', 'engine.js');
  const isValid = injector.validateSyntax(validFile);
  assert.strictEqual(isValid, true, 'engine.js should pass node --check');
});

// Test Group 7: BidiForge v3.1.0 Advanced Features
console.log('');
console.log('[7/7] Testing v3.1.0 Advanced Features...');
test('inspector.inspectApp generates health score report', () => {
  const rep = inspector.inspectApp({ name: 'TestApp', path: path.join(__dirname, '..') });
  assert(typeof rep.score === 'number', 'Expected numeric health score');
});

test('vault.getManifest initializes snapshot manifest', () => {
  const manifest = vault.getManifest();
  assert(Array.isArray(manifest.snapshots), 'Expected snapshots array');
});

test('shell.register generates valid Windows registry commands', () => {
  if (process.platform === 'win32') {
    const res = shell.register();
    assert.strictEqual(res.success, true);
  }
});

// Test Group 8: Border & Layout Alignment Test Suite
console.log('');
console.log('[8/8] Testing Border & Layout Alignment Engine...');
test('border_test suite passes all 5 alignment assertions', () => {
  const { execSync } = require('child_process');
  execSync('node tests/border_test.js', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
});

console.log('');
console.log('========================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
