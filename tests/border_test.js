/**
 * BidiForge — Global Border & Layout Mathematical Alignment Test Suite
 * Verifies that all TUI card variants render with 100% deterministic, straight vertical borders.
 */

const assert = require('assert');
const themeEngine = require('../ui/theme');
const { formatCardRow, printHermesCard, getVisualWidth, stripAnsi, truncateToVisualWidth } = require('../ui/menu');

console.log('========================================');
console.log('   BIDIFORGE BORDER ALIGNMENT TEST      ');
console.log('========================================\n');

const T = themeEngine.getTheme();

// Test 1: getVisualWidth accuracy across ANSI, Unicode, Emoji, and Variation Selectors
console.log('[1/6] Testing Visual Width Calculation Engine...');

const widthTests = [
  { str: 'Hello World', expected: 11 },
  { str: '\x1b[31;1mHello World\x1b[0m', expected: 11 },
  { str: '⚡ Auto-Repair Ready', expected: 20 },
  { str: '\x1b[33;1m⚡ Auto-Repair Ready\x1b[0m', expected: 20 },
  { str: '✓ Compatible  ★ (Patched)', expected: 25 },
  { str: '🚀 Patch ALL Discovered Applications', expected: 36 },
  { str: '🛡️ Rollback Application', expected: 23 },
  { str: '⚙️ Settings', expected: 11 },
  { str: '🩺 Health Report', expected: 16 },
  { str: 'مرحبا بكم', expected: 9 },
];

widthTests.forEach(test => {
  const actual = getVisualWidth(test.str);
  assert.strictEqual(actual, test.expected, `Visual width mismatch for "${test.str}": got ${actual}, expected ${test.expected}`);
});
console.log('  ✓ Visual width engine passes for ANSI, Emoji, and Unicode strings.');

// Test 2: Truncation helper test
console.log('\n[2/6] Testing Visual Width Truncation Safeguard...');

const longStr = 'Super Long Application Name That Would Otherwise Exceed The Terminal Card Width Limit (v99.9.9)';
const truncated = truncateToVisualWidth(longStr, 30);
assert.strictEqual(getVisualWidth(truncated) <= 30, true, 'Truncated string visual width must not exceed target width');
assert.strictEqual(truncated.endsWith('…'), true, 'Truncated string must end with ellipsis');
console.log('  ✓ Visual width truncation safeguard passes.');

// Test 3: Mathematical determinism of formatCardRow for all status variants
console.log('\n[3/6] Testing Card Row Border Determinism across All Status Variants...');

const cardVariants = [
  { label: 'Discord (v1.0.9251)', tag: `${T.success}✓ Compatible  ${T.border}★ (Patched)${T.reset}` },
  { label: 'OpenCode AI Desktop (v1.18.15)', tag: `${T.success}✓ Compatible  ${T.border}★ (Patched)${T.reset}` },
  { label: 'Antigravity IDE (v2.5.0)', tag: `${T.success}✓ Compatible${T.reset}` },
  { label: 'Docker Desktop (v4.85.0)', tag: `${T.success}✓ Compatible${T.reset}` },
  { label: 'Obsidian (v1.13.4)', tag: `${T.accent}[VENDOR UPDATE DETECTED]  ${T.warning}⚡ Auto-Repair Ready${T.reset}` },
  { label: 'Heroic Games Launcher (v2.22.0)', tag: `${T.success}✓ Compatible${T.reset}` },
  { label: 'VS Code (v1.85.0)', tag: `${T.warning}⚡ Repairing...${T.reset}` },
  { label: 'Slack (v4.35.0)', tag: `${T.danger}✖ Failed${T.reset}` },
  { label: 'Notion (v3.2.0)', tag: `${T.border}🛡️ Rollback Available${T.reset}` },
  { label: 'Unusual App (v1.0.0)', tag: `${T.dim}• Unsupported${T.reset}` },
  { label: 'Super Long App Name That Exceeds Container Limits (v1.0.0)', tag: `${T.danger}✖ Unsupported${T.reset}` },
  { label: '↩ Back to Main Menu', tag: '' },
];

const testWidths = [78, 84, 90, 100, 120, 160];

testWidths.forEach(cardWidth => {
  cardVariants.forEach(variant => {
    const formattedRow = formatCardRow(variant.label, variant.tag, cardWidth);
    const cleanRow = stripAnsi(formattedRow);
    const visWidth = getVisualWidth(formattedRow);

    // Assert left border char
    assert.strictEqual(cleanRow.startsWith('│'), true, 'Row must start with left border char │');
    // Assert right border char
    assert.strictEqual(cleanRow.endsWith('│'), true, 'Row must end with right border char │');

    // Assert exact visual width of rendered row
    assert.strictEqual(visWidth, cardWidth, `Card row visual width mismatch for width ${cardWidth}: got ${visWidth}, expected ${cardWidth}`);
  });
});
console.log('  ✓ All status variants render with 100% identical visual width across multiple card sizes (80, 100, 120, 160 cols).');

// Test 4: Constant Left & Right Border Column Position Verification
console.log('\n[4/6] Testing Constant Left and Right Border Position Invariance...');

const cardWidth = 84;
const renderedRows = cardVariants.map(v => formatCardRow(v.label, v.tag, cardWidth));

renderedRows.forEach((r, idx) => {
  const clean = stripAnsi(r);
  assert.strictEqual(clean.startsWith('│'), true, `Row ${idx} must start with │`);
  assert.strictEqual(clean.endsWith('│'), true, `Row ${idx} must end with │`);
  assert.strictEqual(getVisualWidth(r), cardWidth, `Row ${idx} terminal display width must be exactly ${cardWidth}`);
});

console.log('  ✓ Left border X position is constant at visual column 0 across all rows.');
console.log(`  ✓ Right border X position is constant at visual column ${cardWidth - 1} across all rows.`);

// Test 5: ANSI escape sequences do not affect card width
console.log('\n[5/6] Testing ANSI Color Invariance...');

const plainRow = formatCardRow('App Name', 'Status Tag', 80);
const coloredRow = formatCardRow('\x1b[31;1mApp Name\x1b[0m', '\x1b[32;1;4mStatus Tag\x1b[0m', 80);

assert.strictEqual(getVisualWidth(plainRow), getVisualWidth(coloredRow), 'ANSI colors must not alter rendered visual width');
assert.strictEqual(getVisualWidth(coloredRow), 80, 'ANSI colored row visual width must be exactly 80');
console.log('  ✓ ANSI color invariance passed.');

// Test 6: Full Card Assembly Line-by-Line Alignment Verification
console.log('\n[6/6] Testing Full Card Assembly (Top, Content, Subtitle, Bottom Rows)...');

const capturedLines = [];
const originalLog = console.log;
console.log = (msg) => capturedLines.push(msg);

printHermesCard(cardVariants, '⚙️ BidiForge Main Menu — Select Option', 'Current: 6 Electron Applications Discovered', 84);

console.log = originalLog;

const expectedCardWidth = 84;
capturedLines.forEach((line, idx) => {
  const visW = getVisualWidth(line);
  assert.strictEqual(visW, expectedCardWidth, `Full card line ${idx} visual width mismatch: got ${visW}, expected ${expectedCardWidth}`);
});

console.log('  ✓ Full card assembly (top header, subtitle, rows, bottom line) verified at exact visual width 84.');

console.log('\n========================================');
console.log('   ALL BORDER ALIGNMENT TESTS PASSED!   ');
console.log('========================================\n');
