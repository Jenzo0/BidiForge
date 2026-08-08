/**
 * BidiForge — Lists Rule
 * Ordered and unordered list marker RTL positioning
 */

const CSS = `
/* List elements inside positioning and RTL support */
ol, ul, li {
  list-style-position: inside !important;
}
ol[dir="rtl"], ul[dir="rtl"] {
  text-align: right !important;
  direction: rtl !important;
}
ol[dir="rtl"] li, ul[dir="rtl"] li {
  text-align: right !important;
}
`;

const JS = `
// Process lists for RTL markers and layout
function processLists(root) {
  var scope = root || document.body;
  if (!scope) return;
  
  var lists = scope.querySelectorAll('ol, ul');
  for (var i = 0; i < lists.length; i++) {
    var lst = lists[i];
    if (lst.closest && lst.closest('pre, code, .monaco-editor, .terminal')) continue;
    
    var txt = (lst.textContent || '').trim();
    var dir = firstStrong(txt);
    if (dir && lst.getAttribute('dir') !== dir) {
      lst.setAttribute('dir', dir);
    }
  }
}
`;

module.exports = {
  name: 'lists',
  css: CSS.trim(),
  js: JS.trim(),
};
