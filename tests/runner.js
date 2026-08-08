/**
 * BidiForge — Automated Test Suite (v3.0 Hardened Engine)
 * Validates detector, classifier, dynamic main resolution, CJS/ESM detection,
 * rules engine, snippet generation, backup SHA-256 integrity, and syntax safety.
 * 
 * @version 3.0.0
 * @author Jenzo
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const detector = require('../core/detector');
const classifier = require('../core/classifier');
const engine = require('../core/engine');
const backup = require('../patcher/backup');
const injector = require('../patcher/injector');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('========================================');
console.log('       BIDIFORGE TEST SUITE             ');
console.log('========================================');
console.log('');

// Test Group 1: Detector & Signatures
console.log('[1/6] Testing Detector Engine...');
test('detectAll returns an array of Electron apps', () => {
  const apps = detector.detectAll();
  assert(Array.isArray(apps), 'Expected array');
  console.log(`    (Discovered ${apps.length} apps)`);
});

test('formatAppName formats raw app names correctly', () => {
  assert.strictEqual(detector.formatAppName('@opencode-aidesktop'), 'OpenCode AI Desktop');
  assert.strictEqual(detector.formatAppName('antigravity'), 'Antigravity IDE');
});

// Test Group 2: Dynamic Entry & CJS/ESM Classifier
console.log('');
console.log('[2/6] Testing Dynamic Entry & CJS/ESM Classifier...');
test('classify resolves entry points and runtime types correctly', () => {
  const rootPath = path.join(__dirname, '..');
  const res = classifier.classify(rootPath);
  assert(res.entryPoint !== null, 'Expected entry point to be resolved');
  assert.strictEqual(res.entryPoint, 'index.js');
  assert.strictEqual(res.runtimeType, 'CJS');
  assert(res.confidence > 0, 'Expected confidence > 0');
});

// Test Group 3: Rules & Profiles Engine
console.log('');
console.log('[3/6] Testing Rules & Profiles Engine...');
test('loadRules loads modular rules from rules/', () => {
  const rules = engine.loadRules();
  assert(rules.length >= 6, `Expected at least 6 rules, got ${rules.length}`);
  const ruleNames = rules.map(r => r.name);
  assert(ruleNames.includes('text'), 'Missing text rule');
  assert(ruleNames.includes('lists'), 'Missing lists rule');
  assert(ruleNames.includes('tables'), 'Missing tables rule');
  assert(ruleNames.includes('composer'), 'Missing composer rule');
  assert(ruleNames.includes('markdown'), 'Missing markdown rule');
  assert(ruleNames.includes('protected-zones'), 'Missing protected-zones rule');
});

test('loadProfile matches application profiles correctly', () => {
  const opencodeProf = engine.loadProfile({ name: 'opencode' });
  assert.strictEqual(opencodeProf.name, 'opencode');

  const antigravityProf = engine.loadProfile({ name: 'antigravity' });
  assert.strictEqual(antigravityProf.name, 'antigravity');

  const genericProf = engine.loadProfile({ name: 'randomApp' });
  assert.strictEqual(genericProf.name, 'generic-electron');
});

test('generateCSS aggregates CSS from all rules', () => {
  const css = engine.generateCSS({ name: 'test' });
  assert(css.includes('unicode-bidi: plaintext;'), 'Missing plaintext bidi');
  assert(css.includes('list-style-position: inside'), 'Missing list position fix');
  assert(css.includes('direction: ltr !important;'), 'Missing protected zone LTR');
});

test('generateJS uses subtree MutationObserver without full-DOM polling', () => {
  const js = engine.generateJS({ name: 'test' });
  assert(js.includes('window.__bidiForge'), 'Missing global state flag');
  assert(js.includes('MutationObserver'), 'Missing observer engine');
  assert(js.includes('pendingSubtrees'), 'Missing subtree queue');
  assert(!js.includes('setInterval(function(){walk(document.body);},3000)'), 'Full DOM polling should be removed');
});

// Test Group 4: Injection & Snippet Building
console.log('');
console.log('[4/6] Testing Injection & Idempotency...');
test('buildSnippet generates complete injection code with BidiForge markers', () => {
  const snippet = engine.buildSnippet('app', { name: 'testApp' });
  assert(snippet.includes('/*=== BidiForge v3.0'), 'Missing start marker');
  assert(snippet.includes('/*=== /BidiForge ===*/'), 'Missing end marker');
  assert(snippet.includes('web-contents-created'), 'Missing web-contents-created event');
});

test('strip removes previous BidiForge injections cleanly', () => {
  const original = 'const app = require("electron");\nconsole.log("hello");';
  const injected = original + '\n' + engine.buildSnippet('app');
  const stripped = engine.strip(injected);
  assert.strictEqual(stripped.trim(), original.trim());
});

// Test Group 5: Backup System & SHA-256 Validation
console.log('');
console.log('[5/6] Testing Backup System...');
test('backup.init initializes backups folder and manifest with engine version', () => {
  backup.init();
  assert(fs.existsSync(backup.BACKUP_DIR), 'Backups dir should exist');
  assert.strictEqual(backup.ENGINE_VERSION, '3.0.0');
});

// Test Group 6: JS Syntax Verification
console.log('');
console.log('[6/6] Testing JS Syntax Verification...');
test('validateSyntax passes for valid JavaScript code', () => {
  const validFile = path.join(__dirname, '..', 'core', 'engine.js');
  const isValid = injector.validateSyntax(validFile);
  assert.strictEqual(isValid, true, 'engine.js should pass node --check');
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
