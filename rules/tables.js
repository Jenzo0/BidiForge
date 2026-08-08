/**
 * BidiForge — Tables Rule
 * Direction and alignment detection for HTML and Markdown tables
 */

const CSS = `
/* Table RTL alignment */
table[dir="rtl"] {
  margin-left: auto !important;
  margin-right: 0 !important;
  direction: rtl !important;
  text-align: right !important;
}
table[dir="rtl"] th, table[dir="rtl"] td {
  text-align: right !important;
}
`;

const JS = `
// Process tables for dynamic direction
function processTables(root) {
  var scope = root || document.body;
  if (!scope) return;
  
  var tables = scope.querySelectorAll('table');
  for (var i = 0; i < tables.length; i++) {
    var tb = tables[i];
    if (tb.closest && tb.closest('pre, code, .monaco-editor, .terminal')) continue;
    
    var txt = (tb.textContent || '').trim();
    var dir = firstStrong(txt);
    if (dir && tb.getAttribute('dir') !== dir) {
      tb.setAttribute('dir', dir);
    }
  }
}
`;

module.exports = {
  name: 'tables',
  css: CSS.trim(),
  js: JS.trim(),
};
