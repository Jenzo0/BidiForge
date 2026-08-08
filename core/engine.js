/**
 * BidiForge — Engine v3.0
 * Universal BiDi Compatibility Layer for Electron apps
 * Aggregates rules from rules/ and profiles from profiles/
 * 
 * @version 3.0.0
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');

const N10 = String.fromCharCode(10);

// RTL character ranges (Arabic, Hebrew, Persian, etc.)
const RTL_RANGES = [
  '\\u0591-\\u05FF',  // Hebrew
  '\\u0600-\\u06FF',  // Arabic
  '\\u0750-\\u077F',  // Arabic Supplement
  '\\u08A0-\\u08FF',  // Arabic Extended-A
  '\\uFB50-\\uFDFF',  // Arabic Presentation Forms-A
  '\\uFE70-\\uFEFF',  // Arabic Presentation Forms-B
];

/**
 * Load all rule modules from rules/
 */
function loadRules() {
  const rulesDir = path.join(__dirname, '..', 'rules');
  const rules = [];
  
  if (fs.existsSync(rulesDir)) {
    const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const rule = require(path.join(rulesDir, file));
        if (rule && rule.name) {
          rules.push(rule);
        }
      } catch (e) {}
    }
  }
  return rules;
}

/**
 * Load matching application profile from profiles/
 */
function loadProfile(appInfo = {}) {
  const profilesDir = path.join(__dirname, '..', 'profiles');
  
  if (fs.existsSync(profilesDir)) {
    const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.js') && f !== 'generic-electron.js');
    for (const file of files) {
      try {
        const profile = require(path.join(profilesDir, file));
        if (profile && typeof profile.match === 'function' && profile.match(appInfo)) {
          return profile;
        }
      } catch (e) {}
    }
  }
  
  try {
    return require(path.join(profilesDir, 'generic-electron.js'));
  } catch (e) {
    return { name: 'generic-electron', extraCSS: '', extraJS: '' };
  }
}

/**
 * Generate aggregate CSS from rules and profile
 */
function generateCSS(appInfo = {}) {
  const rules = loadRules();
  const profile = loadProfile(appInfo);
  
  const cssParts = rules.map(r => r.css).filter(Boolean);
  if (profile.extraCSS) cssParts.push(profile.extraCSS);
  
  return cssParts.join(N10 + N10);
}

/**
 * Generate high-performance runtime JS engine with subtree-targeted MutationObserver
 */
function generateJS(appInfo = {}) {
  const rules = loadRules();
  const profile = loadProfile(appInfo);
  const rtlPattern = RTL_RANGES.join('');
  
  const ruleJSParts = rules.map(r => r.js).filter(Boolean);
  if (profile.extraJS) ruleJSParts.push(profile.extraJS);

  return [
    '(function(){',
    'if(window.__bidiForge)return;',
    `window.__bidiForge={version:"3.0.0",app:"${appInfo.name||'generic'}",profile:"${profile.name||'generic'}",status:"active"};`,
    
    `var RTL=/[${rtlPattern}]/;`,
    
    // Helper: first strong character
    'function firstStrong(t){',
    '  if(!t)return null;',
    '  for(var i=0;i<t.length;i++){',
    '    var ch=t[i];',
    '    if(RTL.test(ch))return "rtl";',
    '    if(/[A-Za-z0-9]/.test(ch))return "ltr";',
    '  }',
    '  return null;',
    '}',
    
    // Helper: extract direct text nodes
    'function ownText(e){',
    '  var s="",c=e.childNodes;',
    '  for(var i=0;i<c.length;i++){',
    '    if(c[i].nodeType===3)s+=c[i].textContent;',
    '  }',
    '  return s;',
    '}',
    
    // Inject rule functions
    ruleJSParts.join(N10 + N10),
    
    // Walk target root element or subtree
    'function walk(root){',
    '  var target = root || document.body;',
    '  if(!target)return;',
    '  try {',
    '    processTextElements(target);',
    '    processLists(target);',
    '    processTables(target);',
    '    processComposers(target);',
    '    processMarkdown(target);',
    '    processProtectedZones(target);',
    '  } catch(_){}',
    '}',
    
    // Subtree queue & batching for high performance (no full-DOM polling)
    'var pendingSubtrees = [];',
    'var batchTimer = null;',
    
    'function processPendingSubtrees(){',
    '  batchTimer = null;',
    '  var queue = pendingSubtrees;',
    '  pendingSubtrees = [];',
    '  for(var i=0; i<queue.length; i++){',
    '    var node = queue[i];',
    '    if(node && node.nodeType === 1 && document.documentElement.contains(node)){',
    '      walk(node);',
    '    }',
    '  }',
    '}',
    
    'function queueSubtree(node){',
    '  if(!node) return;',
    '  var element = node.nodeType === 1 ? node : node.parentElement;',
    '  if(!element) return;',
    '  if(element.closest && element.closest("pre, code, .monaco-editor, .terminal")) return;',
    '  if(pendingSubtrees.indexOf(element) === -1){',
    '    pendingSubtrees.push(element);',
    '  }',
    '  if(!batchTimer){',
    '    if(typeof requestIdleCallback === "function"){',
    '      batchTimer = requestIdleCallback(processPendingSubtrees, { timeout: 100 });',
    '    } else {',
    '      batchTimer = setTimeout(processPendingSubtrees, 60);',
    '    }',
    '  }',
    '}',
    
    // Initial execution on DOM ready
    'if(document.readyState==="loading"){',
    '  document.addEventListener("DOMContentLoaded",function(){walk(document.body);});',
    '}else{',
    '  walk(document.body);',
    '}',
    
    // Optimized Subtree MutationObserver
    'try {',
    '  var obs = new MutationObserver(function(mutations){',
    '    for(var i=0; i<mutations.length; i++){',
    '      var m = mutations[i];',
    '      if(m.type === "attributes" && m.attributeName && m.attributeName.indexOf("data-bidiforge") === 0) continue;',
    '      if(m.type === "childList"){',
    '        for(var j=0; j<m.addedNodes.length; j++){',
    '          queueSubtree(m.addedNodes[j]);',
    '        }',
    '      } else if(m.target){',
    '        queueSubtree(m.target);',
    '      }',
    '    }',
    '  });',
    '  obs.observe(document.body || document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["dir", "style", "class"] });',
    '} catch(_){}',
    
    // Event listener for user typing input
    'document.addEventListener("input", function(ev){',
    '  if(ev.target) syncEditable(ev.target);',
    '}, true);',
    
    '})();',
  ].join(N10);
}

/**
 * Build injection snippet for Electron app
 * @param {string} appRef - Electron app reference
 * @param {object} appInfo - Target app info
 * @returns {string} Injection snippet
 */
function buildSnippet(appRef = 'app', appInfo = {}) {
  const css = generateCSS(appInfo);
  const js = generateJS(appInfo);
  
  return [
    '/*=== BidiForge v3.0 (Universal) ===*/',
    `const BIDIFORGE_CSS=\`${css}\`;`,
    `const BIDIFORGE_JS=\`${js}\`;`,
    `function __bidiForgeInject(wc){`,
    `  if(!wc)return;`,
    `  try{`,
    `    wc.insertCSS(BIDIFORGE_CSS);`,
    `    wc.executeJavaScript(BIDIFORGE_JS,true);`,
    `  }catch(_){}`,
    `}`,
    `try{`,
    `  const electronObj = require('electron');`,
    `  const appObj = (electronObj && electronObj.app) ? electronObj.app : (typeof ${appRef} !== 'undefined' ? ${appRef} : null);`,
    `  const wcObj = electronObj ? electronObj.webContents : null;`,
    `  if(wcObj && typeof wcObj.getAllWebContents === 'function'){`,
    `    wcObj.getAllWebContents().forEach(function(wc){ __bidiForgeInject(wc); });`,
    `  }`,
    `  if(appObj && typeof appObj.on === 'function'){`,
    `    appObj.on('web-contents-created', function(_, wc){`,
    `      __bidiForgeInject(wc);`,
    `      wc.on('dom-ready', function(){ __bidiForgeInject(wc); });`,
    `      wc.on('did-finish-load', function(){ __bidiForgeInject(wc); });`,
    `    });`,
    `  }`,
    `}catch(_){}`,
    '/*=== /BidiForge ===*/',
  ].join(N10);
}

/**
 * Strip existing BidiForge injection from code
 * @param {string} code - Source code
 * @returns {string} Cleaned code
 */
function strip(code) {
  const startMarker = '/*=== BidiForge';
  const endMarker = '/*=== /BidiForge ===*/';
  
  let result = code;
  let changed = true;
  
  while (changed) {
    changed = false;
    const start = result.indexOf(startMarker);
    const end = result.indexOf(endMarker);
    
    if (start !== -1 && end !== -1 && start < end) {
      result = result.slice(0, start) + result.slice(end + endMarker.length);
      changed = true;
    }
  }
  
  return result;
}

module.exports = {
  loadRules,
  loadProfile,
  generateCSS,
  generateJS,
  buildSnippet,
  strip,
  RTL_RANGES,
};
