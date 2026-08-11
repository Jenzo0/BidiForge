/**
 * BidiForge — Backup Manager (v4.0 Engine)
 * Safe backup, manifest tracking, SHA-256 verification, rollback, and cleanup
 * 
 * @version 4.0.0
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MANIFEST_FILE = path.join(BACKUP_DIR, 'manifest.json');
const ENGINE_VERSION = '4.0.0';

/**
 * Initialize backup directory and manifest
 */
function init() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  if (!fs.existsSync(MANIFEST_FILE)) {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify({ backups: [] }, null, 2));
  }
}

/**
 * Create a safe backup of ASAR file with metadata & SHA-256 validation
 * @param {string} asarPath - Path to original app.asar
 * @param {object} appInfo - Metadata object
 * @returns {object} Result
 */
function create(asarPath, appInfo = {}) {
  init();
  if (!fs.existsSync(asarPath)) {
    return { success: false, error: 'Source ASAR file not found' };
  }
  
  const appName = (appInfo.name || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const version = appInfo.version || 'unknown';
  const originalHash = getFileHash(asarPath);
  const hashShort = originalHash.substring(0, 8);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const backupName = `${appName}-${version}-${hashShort}-${timestamp}.asar.bak`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  try {
    fs.copyFileSync(asarPath, backupPath);
    const backupHash = getFileHash(backupPath);
    
    if (originalHash !== backupHash) {
      fs.unlinkSync(backupPath);
      return { success: false, error: 'Backup SHA-256 verification failed' };
    }
    
    const manifest = readManifest();
    manifest.backups.push({
      id: hashShort + '-' + Date.now(),
      appName: appInfo.name || appName,
      appVersion: version,
      appPath: appInfo.path || path.dirname(asarPath),
      originalPath: asarPath,
      backupPath: backupPath,
      backupName: backupName,
      originalHash: originalHash,
      size: fs.statSync(backupPath).size,
      timestamp: new Date().toISOString(),
      bidiForgeVersion: ENGINE_VERSION,
    });
    
    writeManifest(manifest);
    return {
      success: true,
      backupPath,
      backupName,
      hash: originalHash,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Restore a backup to target ASAR location
 * @param {string} backupName - Name of backup file
 * @param {string} targetPath - Path to restore to
 * @returns {object} Result
 */
function restore(backupName, targetPath) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) {
    return { success: false, error: 'Backup file not found' };
  }
  
  try {
    fs.copyFileSync(backupPath, targetPath);
    const backupHash = getFileHash(backupPath);
    const restoredHash = getFileHash(targetPath);
    
    if (backupHash !== restoredHash) {
      return { success: false, error: 'Restored ASAR hash mismatch' };
    }
    
    const manifest = readManifest();
    const b = manifest.backups.find(x => x.backupName === backupName);
    if (b) {
      b.restoredAt = new Date().toISOString();
      writeManifest(manifest);
    }
    
    return {
      success: true,
      restoredPath: targetPath,
      hash: restoredHash,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Rollback app to its most recent backup
 * @param {string} appPath - App directory path
 * @returns {object} Result
 */
function rollback(appPath) {
  const manifest = readManifest();
  const normalize = p => (p || '').toLowerCase().replace(/[\\/]/g, '/');
  const targetNorm = normalize(appPath);

  const matchedBackups = manifest.backups
    .filter(b => normalize(b.appPath) === targetNorm || normalize(b.originalPath).includes(targetNorm))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
  if (matchedBackups.length === 0) {
    return { success: false, error: 'No matching backup record found for ' + appPath };
  }
  
  const latest = matchedBackups[0];
  return restore(latest.backupName, latest.originalPath);
}

/**
 * Clean up old backups keeping keepCount per app
 * @param {number} keepCount - Number of recent backups to keep per app
 * @returns {object} Cleanup stats
 */
function cleanup(keepCount = 2) {
  init();
  const manifest = readManifest();
  const deleted = [];
  const byApp = {};
  
  for (const b of manifest.backups) {
    const key = b.appName + '-' + b.appVersion;
    if (!byApp[key]) byApp[key] = [];
    byApp[key].push(b);
  }
  
  for (const key of Object.keys(byApp)) {
    const list = byApp[key].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    for (let i = keepCount; i < list.length; i++) {
      const item = list[i];
      try {
        if (fs.existsSync(item.backupPath)) {
          fs.unlinkSync(item.backupPath);
        }
        deleted.push(item.backupName);
        const idx = manifest.backups.findIndex(x => x.id === item.id);
        if (idx >= 0) manifest.backups.splice(idx, 1);
      } catch (e) {}
    }
  }
  
  writeManifest(manifest);
  return { success: true, deleted, kept: manifest.backups.length };
}

/**
 * Calculate SHA-256 hash of file
 */
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (e) {
    return 'unknown';
  }
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  } catch (e) {
    return { backups: [] };
  }
}

function writeManifest(manifest) {
  try {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  } catch (e) {}
}

module.exports = {
  init,
  create,
  restore,
  rollback,
  cleanup,
  BACKUP_DIR,
  ENGINE_VERSION,
};
