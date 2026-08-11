/**
 * BidiForge — Status Manager & Safe Update Detection Engine
 * Track patch status of applications via direct ASAR inspection and SHA-256 hash manifest comparison
 * 
 * @version 4.0.0
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, '..', 'backups', 'status.json');

/**
 * Initialize status file
 */
function init() {
  const dir = path.dirname(STATUS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STATUS_FILE)) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ apps: {} }, null, 2));
  }
}

/**
 * Get all app statuses
 */
function getAll() {
  init();
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch (e) {
    return { apps: {} };
  }
}

/**
 * Get single app status
 */
function get(appPath) {
  const status = getAll();
  const apps = status.apps || {};
  return apps[appPath.toLowerCase()] || apps[appPath] || null;
}

/**
 * Update app status
 */
function update(appPath, data) {
  init();
  const status = getAll();
  if (!status.apps) status.apps = {};
  const key = appPath.toLowerCase();
  status.apps[key] = {
    ...(status.apps[key] || {}),
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  return status.apps[key];
}

/**
 * Inspect ASAR file directly for BidiForge patch marker
 * @param {string} asarPath - Path to app.asar
 * @returns {boolean} True if patch marker detected in ASAR
 */
function isAsarPatched(asarPath) {
  try {
    if (!asarPath || !fs.existsSync(asarPath)) return false;
    const buf = fs.readFileSync(asarPath);
    return buf.includes(Buffer.from('/*=== BidiForge')) || buf.includes(Buffer.from('__bidiForgeInject'));
  } catch (e) {
    return false;
  }
}

/**
 * Safe Update Detection: Compare current ASAR hash & direct file inspection against stored manifest
 * @param {string} appPath - Application path
 * @param {string} currentHash - Current ASAR SHA-256 hash
 * @param {string} currentVersion - Current app version
 * @param {string} asarPath - Direct ASAR file path
 * @returns {object} { state: 'NEW'|'PATCHED_VERIFIED'|'APP_UPDATED', message: string, patchedAt: string }
 */
function checkSafeUpdateStatus(appPath, currentHash, currentVersion = '', asarPath = '') {
  const filePatched = asarPath ? isAsarPatched(asarPath) : false;
  const existing = get(appPath);

  if (filePatched) {
    if (existing && existing.hash && currentHash && existing.hash !== currentHash) {
      return {
        state: 'APP_UPDATED',
        message: 'App updated by vendor (Auto-Repair recommended)',
        patchedAt: existing.patchedAt || existing.updatedAt || '',
      };
    }
    return {
      state: 'PATCHED_VERIFIED',
      message: 'Already patched & verified',
      patchedAt: existing ? (existing.patchedAt || existing.updatedAt || '') : '',
    };
  }

  if (existing && existing.status === 'PATCHED') {
    if (existing.hash && currentHash && existing.hash !== currentHash) {
      return {
        state: 'APP_UPDATED',
        message: 'App updated by vendor (Auto-Repair recommended)',
        patchedAt: existing.patchedAt || existing.updatedAt || '',
      };
    }
    return {
      state: 'PATCHED_VERIFIED',
      message: 'Already patched & verified',
      patchedAt: existing.patchedAt || existing.updatedAt || '',
    };
  }

  return { state: 'NEW', message: 'Ready to patch', patchedAt: '' };
}

/**
 * Set app as patched
 */
function setPatched(appPath, appInfo, patchInfo) {
  return update(appPath, {
    name: appInfo.name,
    version: appInfo.version,
    patchVersion: '4.0.0',
    status: 'PATCHED',
    patchedAt: new Date().toISOString(),
    hash: patchInfo.hash,
    backup: patchInfo.backup,
  });
}

/**
 * Set app as unpatched
 */
function setUnpatched(appPath, appInfo) {
  return update(appPath, {
    name: appInfo.name,
    version: appInfo.version,
    status: 'UNPATCHED',
    unpatchedAt: new Date().toISOString(),
  });
}

/**
 * Set app as unsupported
 */
function setUnsupported(appPath, appInfo, reason) {
  return update(appPath, {
    name: appInfo.name,
    version: appInfo.version,
    status: 'UNSUPPORTED',
    reason: reason,
  });
}

/**
 * Check if app needs re-patching or auto-repair based on manifest hash comparison & file inspection
 */
function needsRepatch(appPath, currentHash, asarPath = '') {
  const safeStatus = checkSafeUpdateStatus(appPath, currentHash, '', asarPath);
  return safeStatus.state !== 'PATCHED_VERIFIED';
}

module.exports = {
  init,
  getAll,
  read: getAll,
  readRegistry: getAll,
  get,
  update,
  isAsarPatched,
  checkSafeUpdateStatus,
  setPatched,
  setUnpatched,
  setUnsupported,
  needsRepatch,
};
