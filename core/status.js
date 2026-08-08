/**
 * BidiForge — Status Manager
 * Track patch status of applications
 * 
 * @version 3.0.0
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
  return status.apps[appPath] || null;
}

/**
 * Update app status
 */
function update(appPath, data) {
  init();
  const status = getAll();
  status.apps[appPath] = {
    ...(status.apps[appPath] || {}),
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  return status.apps[appPath];
}

/**
 * Set app as patched
 */
function setPatched(appPath, appInfo, patchInfo) {
  return update(appPath, {
    name: appInfo.name,
    version: appInfo.version,
    patchVersion: '3.0.0',
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
 * Check if needs re-patch (version changed)
 */
function needsRepatch(appPath, currentHash) {
  const existing = get(appPath);
  if (!existing) return true;
  if (existing.status !== 'PATCHED') return true;
  if (existing.hash !== currentHash) return true;
  return false;
}

module.exports = {
  init,
  getAll,
  get,
  update,
  setPatched,
  setUnpatched,
  setUnsupported,
  needsRepatch,
};
