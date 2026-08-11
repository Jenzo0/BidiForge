/**
 * BidiForge — Live Hot-Reload Watcher (v4.0 Engine)
 * Watches rules/ and profiles/ directories and hot-reloads BiDi patches on target applications
 * 
 * @version 4.0.0
 * @author Jenzo0
 */

const fs = require('fs');
const path = require('path');

/**
 * Start watching rules and profiles for live hot-reload
 * @param {string|object} targetApp - Application to watch and hot-reload
 * @param {function} callback - Change callback
 */
function watch(targetApp, callback = null) {
  const watchDirs = [
    path.join(__dirname, '..', 'rules'),
    path.join(__dirname, '..', 'profiles'),
    path.join(__dirname, '..', 'profiles', 'custom'),
  ];

  let debounceTimer = null;
  const triggerReload = (eventType, filename) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(`\n⚡ [HOT-RELOAD] File change detected: ${filename || 'rule update'}`);
      console.log('🔄 Re-compiling and applying live BiDi engine patch...');
      try {
        const { patch } = require('../index');
        await patch(targetApp, true, true);
        if (typeof callback === 'function') callback(null, { filename });
      } catch (e) {
        console.log(`✖ [HOT-RELOAD ERROR] ${e.message}`);
        if (typeof callback === 'function') callback(e);
      }
    }, 500);
  };

  const watchers = [];
  for (const dir of watchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const w = fs.watch(dir, { recursive: true }, triggerReload);
        watchers.push(w);
      } catch (_) {}
    }
  }

  console.log('🚀 Live Hot-Reload Watcher active!');
  console.log('   Monitoring rules/ & profiles/ for changes... (Press Ctrl+C to stop)');

  return {
    stop: () => watchers.forEach(w => w.close()),
  };
}

module.exports = {
  watch,
};
