/**
 * BidiForge — Discord Profile
 * Compatibility profile for Discord Desktop
 */

module.exports = {
  name: 'discord',
  displayName: 'Discord Desktop',
  match: (appInfo) => /discord/i.test(appInfo.name) || /discord/i.test(appInfo.path),
  extraCSS: `
/* Discord specific message content and markup bidi fixes */
[class*="messageContent"], [class*="markup"], [class*="contents"], [id^="message-text-"] {
  unicode-bidi: plaintext !important;
}
[class*="messageContent"][dir="rtl"], [class*="markup"][dir="rtl"], [class*="contents"][dir="rtl"], [id^="message-text-"][dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
}
  `,
  extraJS: `
// Discord specific DOM observer hints
  `,
  composerSelectors: ['[contenteditable]', 'textarea', '[class*="slateTextArea"]'],
  protectedSelectors: ['pre', 'code', '[class*="codeBlock"]', '[class*="syntaxHeader"]'],
};
