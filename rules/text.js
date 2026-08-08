/**
 * BidiForge — Text Rule
 * Plaintext BiDi rules for general text containers
 */

const CSS = `
/* General text elements plaintext bidi */
p, li, blockquote, h1, h2, h3, h4, h5, h6, dt, dd, td, th, caption, figcaption, summary, article, div, span, [class*="messageContent"], [class*="markup"] {
  unicode-bidi: plaintext;
}
tr, dl {
  unicode-bidi: plaintext;
}
[dir="rtl"] {
  direction: rtl !important;
  text-align: right !important;
}
[dir="ltr"] {
  direction: ltr !important;
  text-align: left !important;
}
`;

const JS = `
// Process general block text elements
function processTextElements(root) {
  var scope = root || document.body;
  if (!scope) return;
  
  var targets = scope.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6, dt, dd, summary, article, [class*="messageContent"], [class*="markup"], [id^="message-text-"]');
  for (var i = 0; i < targets.length; i++) {
    var el = targets[i];
    if (el.hasAttribute('data-bidiforge-processed')) continue;
    if (el.closest && el.closest('pre, code, kbd, samp, .monaco-editor, .CodeMirror, .terminal')) continue;
    
    var txt = (ownText(el) || el.textContent || '').trim();
    if (!txt) continue;
    
    var dir = firstStrong(txt);
    if (dir === 'rtl') {
      el.setAttribute('dir', 'rtl');
      if (el.style.textAlign !== 'right') el.style.textAlign = 'right';
    } else if (dir === 'ltr') {
      el.setAttribute('dir', 'ltr');
      if (el.style.textAlign === 'right') el.style.textAlign = '';
    }
    el.setAttribute('data-bidiforge-processed', 'true');
  }
}
`;

module.exports = {
  name: 'text',
  css: CSS.trim(),
  js: JS.trim(),
};
