/**
 * BidiForge — Engine Bridge (v4.0.0 Engine)
 * Machine-Readable JSON API & Contract Bridge for Native GUI Integrations
 * 
 * @version 4.0.0
 * @author Jenzo0
 */

const fs = require('fs');
const path = require('path');
const detector = require('./detector');
const classifier = require('./classifier');
const engine = require('./engine');
const backup = require('../patcher/backup');
const statusTracker = require('./status');
const inspector = require('./inspector');
const vault = require('../patcher/vault');
const shell = require('../integrations/shell');
const themeEngine = require('../ui/theme');

const VERSION = '4.0.0';

/**
 * Format standardized JSON response envelope
 * @param {string} operation - Operation name
 * @param {boolean} success - Success status
 * @param {object|null} data - Data payload
 * @param {object|string|null} error - Error info
 * @returns {object} Standardized JSON response object
 */
function createResponse(operation, success, data = null, error = null) {
  let formattedError = null;
  if (!success) {
    if (typeof error === 'object' && error !== null && error.message) {
      formattedError = {
        code: error.code || 'OPERATION_FAILED',
        message: error.message,
      };
    } else {
      formattedError = {
        code: 'OPERATION_FAILED',
        message: String(error || 'An unknown error occurred during execution'),
      };
    }
  }

  return {
    success: Boolean(success),
    operation: operation || 'unknown',
    version: VERSION,
    timestamp: new Date().toISOString(),
    data: success ? (data || {}) : null,
    error: formattedError,
  };
}

/**
 * Resolve structured status for a discovered application
 */
function getAppStatus(app) {
  const asarPath = path.join(app.path, 'resources', 'app.asar');
  if (!fs.existsSync(asarPath)) {
    return 'unsupported';
  }

  const currentHash = detector.getFileHash(asarPath);
  const updateCheck = statusTracker.checkSafeUpdateStatus(app.path, currentHash, app.version, asarPath);

  if (updateCheck.state === 'PATCHED_VERIFIED') return 'patched';
  if (updateCheck.state === 'APP_UPDATED') return 'update-detected';
  if (updateCheck.state === 'UNPATCHED' || updateCheck.state === 'READY') return 'ready';
  
  return 'ready';
}

/**
 * Execute structured JSON Scan
 */
function handleScanJson() {
  const apps = detector.detectAll();
  const structuredApps = apps.map(app => {
    const profile = engine.loadProfile(app);
    return {
      name: app.displayName || app.name,
      rawName: app.rawName || app.name,
      path: app.path,
      version: app.version || 'unknown',
      electronVersion: app.electronVersion || null,
      runtime: app.runtimeType || 'unknown',
      profile: profile ? profile.name : 'generic-electron',
      status: getAppStatus(app),
    };
  });

  return createResponse('scan', true, { apps: structuredApps });
}

/**
 * Execute structured JSON Status
 */
function handleStatusJson() {
  const apps = detector.detectAll();
  const snapshots = vault.listSnapshots();
  const theme = themeEngine.getTheme();

  return createResponse('status', true, {
    engineVersion: VERSION,
    discoveredAppsCount: apps.length,
    activeTheme: theme.name || 'Cyberpunk Cyan',
    snapshotVaultCount: snapshots.length,
    shellIntegration: shell.isRegistered ? shell.isRegistered() : true,
    apps: apps.map(app => ({
      name: app.displayName || app.name,
      version: app.version || 'unknown',
      status: getAppStatus(app),
    })),
  });
}

/**
 * Execute structured JSON Health Inspection
 */
function handleHealthJson(targetApp) {
  const apps = detector.detectAll();
  let app = null;

  if (targetApp) {
    app = apps.find(a => a.name.toLowerCase().includes(targetApp.toLowerCase()) || a.path.toLowerCase().includes(targetApp.toLowerCase()));
    if (!app) {
      app = { name: targetApp, path: targetApp, version: 'unknown' };
    }
  } else {
    app = apps[0];
  }

  if (!app) {
    return {
      response: createResponse('health', false, null, { code: 'NO_APPS_FOUND', message: 'No applications found to inspect health' }),
      exitCode: 3,
    };
  }

  const report = inspector.inspectApp(app);
  return {
    response: createResponse('health', true, { report }),
    exitCode: 0,
  };
}

module.exports = {
  VERSION,
  createResponse,
  getAppStatus,
  handleScanJson,
  handleStatusJson,
  handleHealthJson,
};
