/**
 * BidiForge — Engine v3.0
 * Universal BiDi Compatibility Layer for Electron apps
 * Aggregates rules from rules/ and profiles from profiles/
 * 
 * @version 3.0.0
 * @author Jenzo0
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
 * Load matching application profile from profiles/ (Specific profiles first, generic fallback last)
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
  
  // Universal fallback profile
  const genericPath = path.join(profilesDir, 'generic-electron.js');
  if (fs.existsSync(genericPath)) {
    try { return require(genericPath); } catch (e) {}
  }
  
  return { name: 'generic-electron', match: () => true, rules: {} };
}

/**
 * Generate combined CSS string from all active rules
 */
function generateCSS(appInfo = {}) {
  const rules = loadRules();
  const profile = loadProfile(appInfo);
  const cssParts = ['/* BidiForge BiDi Rules - Developer: Jenzo0 */'];
  
  for (const rule of rules) {
    if (rule.css) {
      const customConfig = (profile.rules && profile.rules[rule.name]) || {};
      const ruleCSS = typeof rule.css === 'function' ? rule.css(customConfig) : rule.css;
      if (ruleCSS) cssParts.push(ruleCSS);
    }
  }

  if (profile.extraCSS) {
    cssParts.push(profile.extraCSS);
  }
  
  return cssParts.join('\n\n');
}

/**
 * Generate combined client JS script from all active rules
 */
function generateJS(appInfo = {}) {
  const rules = loadRules();
  const profile = loadProfile(appInfo);
  const ruleJSParts = [];
  
  for (const rule of rules) {
    if (rule.js) {
      const customConfig = (profile.rules && profile.rules[rule.name]) || {};
      const ruleJS = typeof rule.js === 'function' ? rule.js(customConfig) : rule.js;
      if (ruleJS) ruleJSParts.push(ruleJS);
    }
  }

  if (profile.extraJS) {
    ruleJSParts.push(profile.extraJS);
  }
  
  return [
    '/* BidiForge BiDi Compatibility Engine v3.0.0 - Developer: Jenzo0 */',
    '(function(){',
    'if(window.__bidiForge_installed) return;',
    'window.__bidiForge_installed = true;',
    
    // Core BiDi helper utilities
    'var rtlRegex = new RegExp("[' + RTL_RANGES.join('') + ']");',
    'function isRTL(text){ return rtlRegex.test(text || ""); }',
    'function getFirstStrongChar(text){',
    '  var m = (text || "").match(/[' + RTL_RANGES.join('') + 'a-zA-Z]/);',
    '  return m ? m[0] : "";',
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
    '  var observer = new MutationObserver(function(mutations){',
    '    for(var i=0; i<mutations.length; i++){',
    '      var m = mutations[i];',
    '      if(m.type === "childList"){',
    '        for(var j=0; j<m.addedNodes.length; j++){',
    '          queueSubtree(m.addedNodes[j]);',
    '        }',
    '      } else if(m.type === "characterData"){',
    '        queueSubtree(m.target);',
    '      }',
    '    }',
    '  });',
    '  observer.observe(document.body || document.documentElement, {',
    '    childList: true,',
    '    subtree: true,',
    '    characterData: true,',
    '  });',
    '} catch(_){}',
    
    // Keyup listener for input fields
    'document.addEventListener("keyup", function(e){',
    '  if(e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)){',
    '    queueSubtree(e.target);',
    '  }',
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
  const rawCSS = generateCSS(appInfo);
  const rawJS = generateJS(appInfo);
  
  const css = rawCSS.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
  const js = rawJS.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
  
  return [
    '/*=== BidiForge v3.0 (Universal Engine) — Developer: Jenzo0 ===*/',
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
    if (start !== -1) {
      const end = result.indexOf(endMarker, start);
      if (end !== -1) {
        result = result.substring(0, start) + result.substring(end + endMarker.length);
        changed = true;
      }
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
