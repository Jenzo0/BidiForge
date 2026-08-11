/**
 * BidiForge — JSON Contract Engine Bridge Test Suite
 * Verifies machine-readable JSON outputs, exit codes, error handling, and CLI contract schema
 */

const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');

console.log('========================================');
console.log('  BIDIFORGE JSON ENGINE BRIDGE TESTS    ');
console.log('========================================\n');

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

// Test 1: scan --json returns valid JSON structure
test('scan --json returns valid JSON schema', () => {
  const stdout = execSync('node index.js scan --json', { cwd: rootDir, encoding: 'utf8' });
  const data = JSON.parse(stdout);
  
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.operation, 'scan');
  assert.strictEqual(data.version, '4.0.2');
  assert(data.timestamp, 'Missing timestamp');
  assert(Array.isArray(data.data.apps), 'Expected apps array');
  assert.strictEqual(data.error, null);
});

// Test 2: status --json returns valid engine overview JSON
test('status --json returns valid engine status JSON', () => {
  const stdout = execSync('node index.js status --json', { cwd: rootDir, encoding: 'utf8' });
  const data = JSON.parse(stdout);
  
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.operation, 'status');
  assert.strictEqual(data.version, '4.0.2');
  assert(typeof data.data.discoveredAppsCount === 'number', 'Expected numeric app count');
});

// Test 3: health --json returns valid diagnostic report JSON
test('health --json returns valid health report JSON', () => {
  const stdout = execSync('node index.js health --json', { cwd: rootDir, encoding: 'utf8' });
  const data = JSON.parse(stdout);
  
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.operation, 'health');
  assert(data.data.report, 'Expected health report payload');
  assert(typeof data.data.report.score === 'number', 'Expected numeric score');
});

// Test 4: invalid operation returns structured JSON failure
test('invalid operation returns structured JSON failure and exit code 2', () => {
  try {
    execSync('node index.js invalidCommandTest --json', { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' });
    assert.fail('Expected exit code 2');
  } catch (err) {
    const data = JSON.parse(err.stdout);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.operation, 'invalidcommandtest');
    assert.strictEqual(data.data, null);
    assert(data.error, 'Expected error object');
    assert.strictEqual(data.error.code, 'INVALID_COMMAND');
  }
});

// Test 5: verify existing human-readable help command still works
test('existing human-readable CLI help command still works', () => {
  const stdout = execSync('node index.js help', { cwd: rootDir, encoding: 'utf8' });
  assert(stdout.includes('Usage: node index.js'), 'Help output should be human readable');
  assert(stdout.includes('v4.0.2'), 'Header version should be present');
});

console.log('\n========================================');
console.log(`JSON CONTRACT RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
