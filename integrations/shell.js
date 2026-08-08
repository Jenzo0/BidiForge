/**
 * BidiForge — Windows Shell Integration (v3.1 Engine)
 * Adds/removes "Patch Arabic BiDi with BidiForge" in Windows Explorer context menu
 * 
 * @version 3.1.0
 * @author Jenzo0
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Register BidiForge in Windows Explorer Context Menu
 * @returns {object} Result object
 */
function register() {
  try {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Windows Explorer integration is only supported on Windows OS' };
    }

    const batPath = path.join(__dirname, '..', 'BidiForge.bat');
    if (!fs.existsSync(batPath)) {
      return { success: false, error: 'BidiForge.bat launcher not found' };
    }

    const command = `"${batPath}" patch "%1"`;
    const regKeyDir = 'HKCU\\Software\\Classes\\Directory\\shell\\BidiForge';
    const regKeyFile = 'HKCU\\Software\\Classes\\*\\shell\\BidiForge';

    execSync(`reg add "${regKeyDir}" /ve /d "Patch Arabic BiDi with BidiForge" /f`, { stdio: 'pipe' });
    execSync(`reg add "${regKeyDir}\\command" /ve /d "${command}" /f`, { stdio: 'pipe' });

    execSync(`reg add "${regKeyFile}" /ve /d "Patch Arabic BiDi with BidiForge" /f`, { stdio: 'pipe' });
    execSync(`reg add "${regKeyFile}\\command" /ve /d "${command}" /f`, { stdio: 'pipe' });

    return {
      success: true,
      message: 'Successfully registered "Patch Arabic BiDi with BidiForge" in Windows Explorer context menu!',
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Unregister BidiForge from Windows Explorer Context Menu
 * @returns {object} Result object
 */
function unregister() {
  try {
    if (process.platform !== 'win32') {
      return { success: false, error: 'Windows Explorer integration is only supported on Windows OS' };
    }

    const regKeyDir = 'HKCU\\Software\\Classes\\Directory\\shell\\BidiForge';
    const regKeyFile = 'HKCU\\Software\\Classes\\*\\shell\\BidiForge';

    try { execSync(`reg delete "${regKeyDir}" /f`, { stdio: 'pipe' }); } catch (_) {}
    try { execSync(`reg delete "${regKeyFile}" /f`, { stdio: 'pipe' }); } catch (_) {}

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
