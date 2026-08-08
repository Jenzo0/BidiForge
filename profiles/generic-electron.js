/**
 * BidiForge — Generic Electron Profile
 * Universal profile applicable to any standard Electron app
 */

module.exports = {
  name: 'generic-electron',
  displayName: 'Generic Electron Application',
  match: (appInfo) => true, // Fallback for all apps
  extraCSS: '',
  extraJS: '',
  composerSelectors: ['[contenteditable]', 'textarea', 'input[type=text]'],
  protectedSelectors: ['pre', 'code', 'kbd', 'samp'],
};
