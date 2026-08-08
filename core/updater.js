/**
 * BidiForge — GitHub Release & Version Checker (v3.4 Engine)
 * Checks for new BidiForge updates, releases, and patch manifests
 * 
 * @version 3.4.0
 * @author Jenzo0
 */

const https = require('https');

const CURRENT_VERSION = '3.4.0';
const GITHUB_REPO = 'Jenzo0/BidiForge';

/**
 * Check for newer version of BidiForge from GitHub API
 * @returns {Promise<object>} Version check result { hasUpdate, latestVersion, currentVersion, downloadUrl }
 */
function checkForUpdates() {
  return new Promise(resolve => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'BidiForge-CLI-Updater',
      },
      timeout: 3000,
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(body);
            const latestTag = (data.tag_name || '').replace(/^v/, '');
            const hasUpdate = isNewerVersion(CURRENT_VERSION, latestTag);
            resolve({
              hasUpdate,
              latestVersion: latestTag || CURRENT_VERSION,
              currentVersion: CURRENT_VERSION,
              downloadUrl: data.html_url || `https://github.com/${GITHUB_REPO}`,
            });
          } else {
            resolve({ hasUpdate: false, latestVersion: CURRENT_VERSION, currentVersion: CURRENT_VERSION });
          }
        } catch (_) {
          resolve({ hasUpdate: false, latestVersion: CURRENT_VERSION, currentVersion: CURRENT_VERSION });
        }
      });
    });

    req.on('error', () => {
      resolve({ hasUpdate: false, latestVersion: CURRENT_VERSION, currentVersion: CURRENT_VERSION });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ hasUpdate: false, latestVersion: CURRENT_VERSION, currentVersion: CURRENT_VERSION });
    });

    req.end();
  });
}

/**
 * Compare version semver strings
 */
function isNewerVersion(current, latest) {
  if (!latest) return false;
  const cParts = current.split('.').map(Number);
  const lParts = latest.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

module.exports = {
  checkForUpdates,
  CURRENT_VERSION,
};
