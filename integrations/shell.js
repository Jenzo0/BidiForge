/**
 * BidiForge — Windows Shell Integration (v4.0.2 Engine)
 * Safe Windows Explorer Context Menu integration (NO double-click hijacking)
 * 
 * @version 4.0.2
 * @author Jenzo0
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Register BidiForge in Windows Explorer Context Menu safely
 * (Appears ONLY on Right-Click, NEVER overrides double-click default action)
 * @returns {object} Result object
 */
function register() {
  try {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Windows Explorer integration is only supported on Windows OS' };
    }

    // First purge any legacy keys to prevent double-click hijacking
    unregister();

    const batPath = path.join(__dirname, '..', 'BidiForge.bat');
    if (!fs.existsSync(batPath)) {
      return { success: false, error: 'BidiForge.bat launcher not found' };
    }

    const command = `"${batPath}" patch "%1"`;
    const bgCommand = `"${batPath}" patch "%V"`;
    
    // SAFE REGISTRY TARGETS (NO "Position = Top" to prevent double-click override)
    const targets = [
      { key: 'HKCU\\Software\\Classes\\Directory\\Background\\shell\\BidiForge', cmd: bgCommand, title: 'Patch Arabic BiDi with BidiForge ⚡' },
      { key: 'HKCU\\Software\\Classes\\Directory\\shell\\BidiForge', cmd: command, title: 'Patch Arabic BiDi with BidiForge ⚡' },
      { key: 'HKCU\\Software\\Classes\\exefile\\shell\\BidiForge', cmd: command, title: 'Patch Arabic BiDi with BidiForge ⚡' },
    ];

    for (const target of targets) {
      execSync(`reg add "${target.key}" /ve /d "${target.title}" /f`, { stdio: 'pipe' });
      // NEVER set Position=Top on exefile shell keys!
      execSync(`reg add "${target.key}\\command" /ve /d "${target.cmd}" /f`, { stdio: 'pipe' });
    }

    return {
      success: true,
      message: 'Successfully registered "Patch Arabic BiDi with BidiForge ⚡" in Windows Explorer context menu! (Appears on Right-Click ONLY, double-click is 100% safe)',
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Unregister BidiForge from Windows Explorer Context Menu completely
 * @returns {object} Result object
 */
function unregister() {
  try {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Windows Explorer integration is only supported on Windows OS' };
    }

    const keys = [
      'HKCU\\Software\\Classes\\Directory\\Background\\shell\\BidiForge',
      'HKCU\\Software\\Classes\\Directory\\shell\\BidiForge',
      'HKCU\\Software\\Classes\\exefile\\shell\\BidiForge',
      'HKCU\\Software\\Classes\\*\\shell\\BidiForge',
    ];

    for (const key of keys) {
      try { execSync(`reg delete "${key}" /f`, { stdio: 'pipe' }); } catch (_) {}
    }

    return {
      success: true,
      message: 'Successfully removed BidiForge from Windows Explorer context menu.',
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  register,
  unregister,
};
