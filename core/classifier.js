/**
 * BidiForge — Runtime Structure Classifier (v4.0 Engine)
 * Classifies Electron app runtime type, entry point, and safe injection locations
 * 
 * @version 4.0.0
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');

/**
 * Classify Electron app runtime structure
 * @param {string} extractPath - Path to extracted asar workspace
 * @returns {object} Classification result
 */
function classify(extractPath) {
  const result = {
    runtimeType: 'unknown',      // CJS, ESM, or unknown
    entryPoint: null,            // Main entry file relative to ASAR root
    injectionPoint: null,        // Recommended injection point
    injectionMethod: null,       // 'import' or 'require'
    electronRef: null,           // How to reference 'app'
    structure: 'unknown',        // 'standard', 'compiled', 'bundled', etc.
    frameworks: [],              // Detected frameworks (React, Vue, etc.)
    confidence: 0,               // Confidence level 0-100
  };

  try {
    const pkgPath = path.join(extractPath, 'package.json');
    let pkg = null;
    if (fs.existsSync(pkgPath)) {
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      } catch (e) {}
    }

    // Determine entry file dynamically from package.json main field first
    let candidateEntry = null;
    if (pkg && pkg.main) {
      const normalizedMain = path.normalize(pkg.main).replace(/^[\/\\]/, '');
      if (fs.existsSync(path.join(extractPath, normalizedMain))) {
        candidateEntry = normalizedMain;
      }
    }

    // Fallback entry pattern lookups if package.json main is missing or points to invalid file
    if (!candidateEntry) {
      const fallbackPatterns = [
        'out/main/index.js',
        'dist/main.js',
        'main.js',
        'index.js',
        'src/main/index.js',
        'src/main.js',
        'app/main.js',
      ];
      for (const pattern of fallbackPatterns) {
        if (fs.existsSync(path.join(extractPath, pattern))) {
          candidateEntry = pattern;
          break;
        }
      }
    }

    if (!candidateEntry) {
      // Abort if no entry point can be resolved safely
      result.confidence = 0;
      return result;
    }

    result.entryPoint = candidateEntry;

    // Detect CJS vs ESM
    // Signal 1: package.json type field
    if (pkg && pkg.type === 'module') {
      result.runtimeType = 'ESM';
    } else if (pkg && pkg.type === 'commonjs') {
      result.runtimeType = 'CJS';
    }

    // Signal 2: File extension override
    const ext = path.extname(candidateEntry).toLowerCase();
    if (ext === '.mjs') result.runtimeType = 'ESM';
    if (ext === '.cjs') result.runtimeType = 'CJS';

    // Signal 3: Source code syntax inspection
    const entryFullPath = path.join(extractPath, candidateEntry);
    if (fs.existsSync(entryFullPath)) {
      const entryContent = fs.readFileSync(entryFullPath, 'utf8');

      // Check top-level import/export statements vs require
      const hasEsImport = /^\s*(import\s+.+?from\s+['"]|import\s+['"])/m.test(entryContent);
      const hasEsExport = /^\s*export\s+/m.test(entryContent);
      const hasCjsRequire = /require\s*\(\s*['"]/.test(entryContent);

      if (result.runtimeType === 'unknown') {
        if (hasEsImport || hasEsExport) {
          result.runtimeType = 'ESM';
          result.injectionMethod = 'import';
        } else if (hasCjsRequire) {
          result.runtimeType = 'CJS';
          result.injectionMethod = 'require';
        }
      }

      // Find electron reference pattern
      const electronImportMatch = entryContent.match(/import\s+(\w+)\s*,?\s*(?:\{[^}]*\})?\s*from\s*['"]electron['"]/);
      const electronRequireMatch = entryContent.match(/const\s+(\w+)\s*=\s*require\s*\(\s*['"]electron['"]\s*\)/);
      const electronRequireDestructMatch = entryContent.match(/const\s*\{\s*([^}]*app[^}]*)\}\s*=\s*require\s*\(\s*['"]electron['"]\s*\)/);

      if (electronImportMatch) {
        result.electronRef = electronImportMatch[1];
        result.injectionPoint = 'after-electron-import';
      } else if (electronRequireDestructMatch) {
        result.electronRef = 'app';
        result.injectionPoint = 'before-gotTheLock';
      } else if (electronRequireMatch) {
        result.electronRef = electronRequireMatch[1];
        result.injectionPoint = 'before-gotTheLock';
      }

      if (entryContent.includes('gotTheLock')) {
        result.injectionPoint = 'before-gotTheLock';
        result.structure = 'standard';
      }

      if (entryContent.includes('react') || entryContent.includes('React')) result.frameworks.push('React');
      if (entryContent.includes('vue') || entryContent.includes('Vue')) result.frameworks.push('Vue');
    }

    if (fs.existsSync(path.join(extractPath, 'out'))) result.structure = 'compiled';
    else if (fs.existsSync(path.join(extractPath, 'dist'))) result.structure = 'bundled';

    result.confidence = calculateConfidence(result);
  } catch (e) {}

  return result;
}

/**
 * Calculate classification confidence
 * @param {object} result - Classification result
 * @returns {number} Confidence score 0-100
 */
function calculateConfidence(result) {
  let score = 0;
  if (result.runtimeType !== 'unknown') score += 30;
  if (result.entryPoint) score += 30;
  if (result.injectionPoint || result.electronRef) score += 40;
  return score;
}

/**
 * Find safe injection position in code
 * @param {string} code - Source code
 * @param {object} classification - Classification result
 * @returns {object} Line insertion details
 */
function findInjectionPoint(code, classification) {
  const lines = code.split('\n');
  let lineNumber = 0;
  let insertBefore = false;
  let anchor = 'default';

  if (classification.injectionPoint === 'after-electron-import') {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('from "electron"') || lines[i].includes("from 'electron'")) {
        lineNumber = i + 1;
        insertBefore = false;
        anchor = 'electron-import';
        break;
      }
    }
  } else if (classification.injectionPoint === 'before-gotTheLock') {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('const gotTheLock')) {
        lineNumber = i;
        insertBefore = true;
        anchor = 'gotTheLock';
        break;
      }
    }
  }

  // Default insertion: top of file after strict directive / initial comments
  if (lineNumber === 0) {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed.startsWith('//') && 
          !trimmed.startsWith('/*') && 
          !trimmed.startsWith('*') && 
          !trimmed.startsWith('"use strict"') && 
          !trimmed.startsWith("'use strict'") && 
          trimmed.length > 0) {
        lineNumber = i;
        insertBefore = true;
        anchor = 'start';
        break;
      }
    }
  }

  return {
    lineNumber,
    insertBefore,
    anchor,
  };
}

module.exports = {
  classify,
  calculateConfidence,
  findInjectionPoint,
};
