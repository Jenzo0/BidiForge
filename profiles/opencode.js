/**
 * BidiForge — OpenCode Profile
 * Compatibility profile for OpenCode Desktop (v1.18.x+)
 */

module.exports = {
  name: 'opencode',
  displayName: 'OpenCode AI Desktop',
  match: (appInfo) => /opencode/i.test(appInfo.name) || /opencode/i.test(appInfo.path),
  extraCSS: `
/* OpenCode specific composer & chat container adjustments */
.chat-container, .message-list {
  unicode-bidi: plaintext;
}
.prose {
  unicode-bidi: plaintext;
}
  `,
  extraJS: `
// OpenCode specific observer hints if needed
  `,
  composerSelectors: ['[contenteditable]', 'textarea', '.chat-input'],
  protectedSelectors: ['pre', 'code', '.monaco-editor', '.terminal-wrapper'],
};
