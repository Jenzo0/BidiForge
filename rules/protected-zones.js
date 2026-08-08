/**
 * BidiForge — Protected Zones Rule
 * Strict LTR preservation for code editors, terminals, diff viewers, and syntax highlight blocks
 */

const CSS = `
/* Protected Code & Editor LTR Zones */
pre, code, kbd, samp,
.monaco-editor, .monaco-diff-editor,
.CodeMirror, .terminal, .xterm,
[class*="highlight"], [class*="syntax"], [class*="code-block"] {
  unicode-bidi: isolate !important;
  direction: ltr !important;
  text-align: left !important;
}

pre *, code *, kbd *, samp *,
.monaco-editor *, .monaco-diff-editor *,
.CodeMirror *, .terminal *, .xterm * {
  unicode-bidi: isolate !important;
  direction: ltr !important;
}
`;

const JS = `
// Ensure protected zones retain LTR direction explicitly
function processProtectedZones(root) {
  var scope = root || document.body;
  if (!scope) return;
  
  var protectedNodes = scope.querySelectorAll('pre, code, kbd, samp, .monaco-editor, .CodeMirror, .terminal');
  for (var i = 0; i < protectedNodes.length; i++) {
    var p = protectedNodes[i];
    if (p.getAttribute('dir') !== 'ltr') {
      try { p.setAttribute('dir', 'ltr'); } catch (_) {}
    }
  }
}
`;

module.exports = {
  name: 'protected-zones',
  css: CSS.trim(),
  js: JS.trim(),
};
