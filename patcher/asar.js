/**
 * BidiForge — ASAR Handler (v3.0 Engine)
 * Safe ASAR extraction, atomic repacking, and verification
 * 
 * @version 3.0.0
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

let asar = null;
try {
  asar = require('@electron/asar');
} catch (e) {}

/**
 * Ensure asar package is loaded; auto-install dependencies if missing
 */
function ensureAsar() {
  if (asar) return;
  
  try {
    asar = require('@electron/asar');
  } catch (e) {
    const rootDir = path.join(__dirname, '..');
    console.log('\n  \x1b[33;1m⚡ Dependencies missing: Auto-installing @electron/asar... (Please wait)\x1b[0m');
    try {
      execSync('npm install --no-audit --no-fund', { cwd: rootDir, stdio: 'pipe' });
      asar = require('@electron/asar');
      console.log('  \x1b[32;1m✓ Dependencies installed successfully!\x1b[0m\n');
    } catch (installErr) {
      throw new Error(`Missing dependency @electron/asar. Please run "npm install" in ${rootDir}`);
    }
  }
}

/**
 * Extract ASAR to a temporary workspace directory
 * @param {string} asarPath - Path to app.asar
 * @returns {object} Extraction result
 */
async function extract(asarPath) {
  ensureAsar();
  
  const tempDir = path.join(
    process.env.TEMP || '/tmp',
    `bidiforge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );
  
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    asar.extractAll(asarPath, tempDir);
    
    return {
      success: true,
      tempPath: tempDir,
      originalPath: asarPath,
    };
  } catch (e) {
    cleanup(tempDir);
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * Repack workspace directory to ASAR atomically (packs to .tmp then renames)
 * @param {string} dirPath - Source directory
 * @param {string} outputPath - Target ASAR path
 * @returns {object} Repack result
 */
async function pack(dirPath, outputPath) {
  ensureAsar();
  const tmpOutputPath = outputPath + '.bidiforge.tmp';
  
  try {
    if (fs.existsSync(tmpOutputPath)) {
      fs.unlinkSync(tmpOutputPath);
    }

    await asar.createPackage(dirPath, tmpOutputPath);
    
    if (!fs.existsSync(tmpOutputPath)) {
      throw new Error('Temporary ASAR file was not generated');
    }
    
    const raw = asar.getRawHeader(tmpOutputPath);
    if (!raw || !raw.header) {
      throw new Error('Repacked ASAR header validation failed');
    }

    fs.renameSync(tmpOutputPath, outputPath);
    const stats = fs.statSync(outputPath);
    
    return {
      success: true,
      outputPath,
      size: stats.size,
    };
  } catch (e) {
    if (fs.existsSync(tmpOutputPath)) {
      try { fs.unlinkSync(tmpOutputPath); } catch (_) {}
    }
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * Calculate SHA-256 hash of ASAR file
 * @param {string} asarPath - Path to ASAR
 * @returns {string} SHA-256 hash
 */
function hash(asarPath) {
  try {
    const content = fs.readFileSync(asarPath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Validate ASAR integrity
 * @param {string} asarPath - Path to ASAR
 * @returns {object} Validation result
 */
function validate(asarPath) {
  try {
    if (!fs.existsSync(asarPath)) {
      return { valid: false, error: 'File not found' };
    }
    
    ensureAsar();
    const raw = asar.getRawHeader(asarPath);
    if (!raw || !raw.header) {
      return { valid: false, error: 'Invalid ASAR header' };
    }
    
    const files = raw.header.files || {};
    return {
      valid: true,
      hasPackage: files['package.json'] !== undefined,
      filesCount: Object.keys(files).length,
    };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * Clean up temporary extraction folder
 * @param {string} tempPath - Path to remove
 */
function cleanup(tempPath) {
  if (tempPath && fs.existsSync(tempPath)) {
    try {
      fs.rmSync(tempPath, { recursive: true, force: true });
    } catch (e) {}
  }
}

module.exports = {
  extract,
  pack,
  hash,
  validate,
  cleanup,
  ensureAsar,
};
