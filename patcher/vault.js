/**
 * BidiForge — Vault Manager (v3.1 Engine)
 * Multi-version snapshot backup vault with SHA-256 integrity verification
 * 
 * @version 3.1.0
 * @author Jenzo0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VAULT_DIR = path.join(__dirname, '..', 'backups', 'vault');
const MANIFEST_FILE = path.join(VAULT_DIR, 'manifest.json');

/**
 * Initialize vault directory structure and manifest
 */
function init() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
  if (!fs.existsSync(MANIFEST_FILE)) {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify({ snapshots: [] }, null, 2));
  }
}

/**
 * Calculate SHA-256 hash of a file
 * @param {string} filePath - Path to file
 * @returns {string} SHA-256 hash string
 */
function getFileHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) return '';
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  } catch (e) {
    return '';
  }
}

/**
 * Read vault manifest
 * @returns {object} Manifest object containing snapshots array
 */
function getManifest() {
  init();
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  } catch (e) {
    return { snapshots: [] };
  }
}

/**
 * Save vault manifest
 * @param {object} manifest - Manifest object
 */
function saveManifest(manifest) {
  init();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * Create a new versioned snapshot in vault
 * @param {string} asarPath - Path to target app.asar
 * @param {object} appInfo - Application metadata
 * @returns {object} Creation result
 */
function createSnapshot(asarPath, appInfo = {}) {
  init();
  try {
    if (!fs.existsSync(asarPath)) {
      return { success: false, error: 'ASAR file not found' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotId = `snap_${appInfo.name || 'app'}_${timestamp}`;
    const targetFile = path.join(VAULT_DIR, `${snapshotId}.asar`);

    fs.copyFileSync(asarPath, targetFile);
    const hash = getFileHash(targetFile);

    const snapshot = {
      id: snapshotId,
      appName: appInfo.name || 'Unknown',
      appVersion: appInfo.version || '1.0.0',
      appPath: appInfo.path || path.dirname(path.dirname(asarPath)),
      asarPath: asarPath,
      snapshotPath: targetFile,
      hash: hash,
      createdAt: new Date().toISOString(),
      sizeBytes: fs.statSync(targetFile).size,
    };

    const manifest = getManifest();
    manifest.snapshots.unshift(snapshot);
    saveManifest(manifest);

    return {
      success: true,
      snapshot,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * List all snapshots for an application or all apps
 * @param {string} appNameOrPath - Optional search query
 * @returns {Array} Matching snapshot objects
 */
function listSnapshots(appNameOrPath = '') {
  const manifest = getManifest();
  if (!appNameOrPath) return manifest.snapshots;

  const query = appNameOrPath.toLowerCase();
  return manifest.snapshots.filter(s =>
    s.appName.toLowerCase().includes(query) ||
    s.appPath.toLowerCase().includes(query) ||
    s.id.toLowerCase().includes(query)
  );
}

/**
 * Restore a specific snapshot from vault
 * @param {string} snapshotId - Unique snapshot ID or index number
 * @returns {object} Restoration result
 */
function restoreSnapshot(snapshotId) {
  init();
  try {
    const manifest = getManifest();
    const snapshot = manifest.snapshots.find(s => s.id === snapshotId || s.id.includes(snapshotId));

    if (!snapshot) {
      return { success: false, error: `Snapshot not found: ${snapshotId}` };
    }

    if (!fs.existsSync(snapshot.snapshotPath)) {
      return { success: false, error: `Snapshot file missing from vault: ${snapshot.snapshotPath}` };
    }

    const currentHash = getFileHash(snapshot.snapshotPath);
    if (currentHash !== snapshot.hash) {
      return { success: false, error: 'Snapshot integrity check failed (SHA-256 mismatch)' };
    }

    fs.copyFileSync(snapshot.snapshotPath, snapshot.asarPath);
    return {
      success: true,
      snapshot,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  init,
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
  getManifest,
  getFileHash,
};
