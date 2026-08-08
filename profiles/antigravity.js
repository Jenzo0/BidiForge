/**
 * BidiForge — Antigravity Profile
 * Compatibility profile for Antigravity IDE (VS Code based)
 */

module.exports = {
  name: 'antigravity',
  displayName: 'Antigravity IDE',
  match: (appInfo) => /antigravity/i.test(appInfo.name) || /antigravity/i.test(appInfo.path),
  extraCSS: `
/* Antigravity IDE specific chat and sidebar adjustments */
.interactive-item-container, .rendered-markdown {
  unicode-bidi: plaintext;
}
  `,
  extraJS: `
// Antigravity specific observer hints if needed
  `,
  composerSelectors: ['[contenteditable]', 'textarea', '.monaco-inputbox input'],
  protectedSelectors: ['pre', 'code', '.monaco-editor', '.terminal-outer-container'],
};
