/**
 * BidiForge — Markdown Rule
 * Specific styling and isolation for Markdown structures
 */

const CSS = `
/* Markdown rendered blocks */
.markdown-body, .rendered-markdown, [class*="markdown"] {
  unicode-bidi: plaintext;
}
.markdown-body blockquote, [class*="markdown"] blockquote {
  unicode-bidi: plaintext;
}
`;

const JS = `
// Process markdown specific nodes
function processMarkdown(root) {
  var scope = root || document.body;
  if (!scope) return;
  
  var mdNodes = scope.querySelectorAll('.markdown-body, .rendered-markdown, [class*="markdown"]');
  for (var i = 0; i < mdNodes.length; i++) {
    var node = mdNodes[i];
    if (node.hasAttribute('data-bidiforge-md-processed')) continue;
    var txt = ownText(node).trim();
    if (txt) {
      var dir = firstStrong(txt);
      if (dir === 'rtl') {
        node.style.textAlign = 'right';
      }
    }
    node.setAttribute('data-bidiforge-md-processed', 'true');
  }
}
`;

module.exports = {
  name: 'markdown',
  css: CSS.trim(),
  js: JS.trim(),
};
