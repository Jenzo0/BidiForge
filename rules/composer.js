/**
 * BidiForge — Composer Rule
 * BiDi plaintext protection for input fields, textareas, and contenteditable elements
 */

const CSS = `
/* Input fields and contenteditable composer */
textarea, input[type=text], input:not([type]) {
  unicode-bidi: plaintext;
}
[contenteditable] {
  unicode-bidi: plaintext !important;
}
`;

const JS = `
// Process input fields and contenteditable composers
function syncEditable(e) {
  if (!e || (e.closest && e.closest('pre, code, .monaco-editor, .terminal'))) return;
  var val = (e.textContent || '') + (e.value || '');
  var dir = firstStrong(val);
  var want = dir || 'ltr';
  if (e.getAttribute('dir') !== want) {
    try { e.setAttribute('dir', want); } catch (_) {}
  }
  try { e.style.unicodeBidi = 'plaintext'; } catch (_) {}
}

function processComposers(root) {
  var scope = root || document.body;
  if (!scope) return;
  
  var eds = scope.querySelectorAll('[contenteditable], textarea, input[type=text], input:not([type])');
  for (var j = 0; j < eds.length; j++) {
    syncEditable(eds[j]);
  }
}
`;

module.exports = {
  name: 'composer',
  css: CSS.trim(),
  js: JS.trim(),
};
