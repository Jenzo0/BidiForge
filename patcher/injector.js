/**
 * BidiForge — Injector (v3.0 Engine)
 * Injects aggregated BiDi rules and profile engine into Electron main process
 * 
 * @version 3.0.0
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');
const engine = require('../core/engine');
const classifier = require('../core/classifier');

/**
 * Inject BiDi engine into extracted app workspace
 * @param {string} extractPath - Path to extracted ASAR
 * @param {object} appInfo - App metadata object
 * @returns {object} Injection result
 */
function inject(extractPath, appInfo = {}) {
  try {
    const classification = classifier.classify(extractPath);
    if (classification.confidence < 50) {
      return {
        success: false,
        error: 'Low classification confidence - unsafe to patch',
        classification,
      };
    }

    const entryFile = classification.entryPoint;
    const entryPath = path.join(extractPath, entryFile);
    if (!fs.existsSync(entryPath)) {
      return {
        success: false,
        error: `Entry file not found: ${entryFile}`,
      };
    }

    let code = fs.readFileSync(entryPath, 'utf8');
    
    // Strip previous injections
    code = engine.strip(code);
    
    // Determine app reference safely without assuming unverified defaults
    let appRef = classification.electronRef;
    
    if (!appRef) {
      if (classification.runtimeType === 'ESM') {
        if (/\bapp\b/.test(code)) {
          appRef = 'app';
        }
      } else {
        // CommonJS: inspect source for electron require variable or destructured app
        if (code.includes('electron_1.app')) {
          appRef = 'electron_1.app';
        } else if (/\b(?:const|var|let)\s+\{\s*app\s*\}\s*=\s*require\s*\(\s*['"]electron['"]\s*\)/.test(code)) {
          appRef = 'app';
        } else {
          const reqMatch = code.match(/(?:const|var|let)\s+([\w$]+)\s*=\s*require\s*\(\s*['"]electron['"]\s*\)/);
          if (reqMatch && reqMatch[1]) {
            appRef = `${reqMatch[1]}.app`;
          } else if (/\bapp\./.test(code)) {
            appRef = 'app';
          }
        }
      }
    }
    
    // Fail safely if no reliable Electron app reference can be proven
    if (!appRef) {
      return {
        success: false,
        error: 'Could not resolve a safe Electron app reference in main entry file',
        classification,
      };
    }
    
    // Build snippet with appInfo for profile customization
    const snippet = engine.buildSnippet(appRef, appInfo);
    
    // Find injection point
    const injectionPoint = classifier.findInjectionPoint(code, classification);
    const lines = code.split('\n');
    
    if (injectionPoint.insertBefore) {
      lines.splice(injectionPoint.lineNumber, 0, snippet);
    } else {
      lines.splice(injectionPoint.lineNumber + 1, 0, snippet);
    }
    
    const newCode = lines.join('\n');
    fs.writeFileSync(entryPath, newCode, 'utf8');
    
    // Syntax check
    const syntaxValid = validateSyntax(entryPath);
    if (!syntaxValid) {
      fs.writeFileSync(entryPath, code, 'utf8'); // Rollback
      return {
        success: false,
        error: 'Syntax validation failed after injection',
        classification,
      };
    }
    
    return {
      success: true,
      entryFile,
      appRef,
      injectionPoint: injectionPoint.anchor,
      classification,
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * Validate JavaScript syntax using node --check
 * @param {string} filePath - Path to file
 * @returns {boolean} True if valid
 */
function validateSyntax(filePath) {
  try {
    const { execSync } = require('child_process');
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Remove injection from app workspace
 * @param {string} extractPath - Path to extracted ASAR
 * @returns {object} Result
 */
function remove(extractPath) {
  try {
    const classification = classifier.classify(extractPath);
    const entryFile = classification.entryPoint;
    const entryPath = path.join(extractPath, entryFile);
    if (!fs.existsSync(entryPath)) {
      return { success: false, error: 'Entry file not found' };
    }
    
    let code = fs.readFileSync(entryPath, 'utf8');
    const newCode = engine.strip(code);
    if (code === newCode) {
      return { success: true, removed: false, message: 'No injection found' };
    }
    
    fs.writeFileSync(entryPath, newCode, 'utf8');
    return { success: true, removed: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Check if app workspace is already patched
 * @param {string} extractPath - Path to extracted ASAR
 * @returns {object} Result
 */
function isPatched(extractPath) {
  try {
    const classification = classifier.classify(extractPath);
    const entryFile = classification.entryPoint;
    const entryPath = path.join(extractPath, entryFile);
    if (!fs.existsSync(entryPath)) {
      return { patched: false };
    }
    
    const code = fs.readFileSync(entryPath, 'utf8');
    return { patched: code.includes('/*=== BidiForge') };
  } catch (e) {
    return { patched: false, error: e.message };
  }
}

module.exports = {
  inject,
  remove,
  isPatched,
  validateSyntax,
};
