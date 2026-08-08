/**
 * BidiForge — Main CLI Entry & Interactive Engine (v3.0 Engine)
 * Universal BiDi Compatibility Layer for Electron
 * 
 * @version 3.0.0
 * @author Jenzo0
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

const detector = require('./core/detector');
const classifier = require('./core/classifier');
const asar = require('./patcher/asar');
const backup = require('./patcher/backup');
const injector = require('./patcher/injector');
const status = require('./core/status');
const logger = require('./core/logger');

const VERSION = '3.0.0';
const DEVELOPER = 'Jenzo0';

/**
 * Print single professional ASCII banner with pixel-perfect alignment
 */
function banner() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      B I D I F O R G E                       ║');
  console.log('║         Universal BiDi Compatibility Layer v' + VERSION + '            ║');
  console.log('║                       Developer: ' + DEVELOPER + '                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

/**
 * Kill running application process to release ASAR file locks
 * @param {object} appInfo - Application metadata
 * @returns {boolean} True if a process was terminated
 */
function killAppProcess(appInfo) {
  if (!appInfo || !appInfo.name) return false;
  
  let exeNames = [];
  const baseName = appInfo.name.replace(/[^a-zA-Z0-9_-]/g, '');
  exeNames.push(`${baseName}.exe`);
  exeNames.push(`${appInfo.name}.exe`);
  
  // Specific process overrides
  if (/discord/i.test(appInfo.name)) exeNames.push('Discord.exe');
  if (/opencode/i.test(appInfo.name)) exeNames.push('OpenCode.exe', '@opencode-aidesktop.exe');
  if (/antigravity/i.test(appInfo.name)) exeNames.push('Antigravity.exe');
  if (/obsidian/i.test(appInfo.name)) exeNames.push('Obsidian.exe');
  if (/vscode|code/i.test(appInfo.name)) exeNames.push('Code.exe');
  if (/cursor/i.test(appInfo.name)) exeNames.push('Cursor.exe');
  if (/slack/i.test(appInfo.name)) exeNames.push('Slack.exe');

  let killedAny = false;
  for (const exe of exeNames) {
    try {
      const output = execSync(`tasklist /FI "IMAGENAME eq ${exe}"`, { stdio: 'pipe' }).toString();
      if (output.toLowerCase().includes(exe.toLowerCase())) {
        logger.info(`Terminating open process ${exe} to release file lock...`);
        execSync(`taskkill /F /IM "${exe}"`, { stdio: 'pipe' });
        killedAny = true;
      }
    } catch (_) {}
  }
  
  if (killedAny) {
    execSync('ping 127.0.0.1 -n 2 > nul', { stdio: 'pipe' });
  }
  
  return killedAny;
}

/**
 * Relaunch application process after patching
 * @param {object} appInfo - Application metadata
 */
function relaunchAppProcess(appInfo) {
  if (!appInfo || !appInfo.path) return;
  
  try {
    let exePath = null;
    const parentDir = path.dirname(appInfo.path);
    
    const candidates = [
      path.join(appInfo.path, `${appInfo.name}.exe`),
      path.join(parentDir, `${appInfo.name}.exe`),
      path.join(appInfo.path, 'Discord.exe'),
      path.join(parentDir, 'Discord.exe'),
      path.join(appInfo.path, 'Antigravity.exe'),
      path.join(appInfo.path, 'Obsidian.exe'),
    ];
    
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        exePath = cand;
        break;
      }
    }
    
    if (exePath && fs.existsSync(exePath)) {
      logger.info(`Relaunching ${appInfo.name}...`);
      const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
      child.unref();
      console.log(`  ✓ Patch Done & ${appInfo.name} Relaunched!`);
    } else {
      console.log(`  ✓ Patch Done!`);
    }
  } catch (_) {
    console.log(`  ✓ Patch Done!`);
  }
}

/**
 * Main patch workflow
 * @param {string|object} target - Target app name, path, or app object
 * @param {boolean} relaunch - Whether to auto-relaunch process
 */
async function patch(target = null, relaunch = true) {
  logger.init();
  
  let apps = detector.detectAll();
  
  if (target && typeof target === 'string') {
    const query = target.toLowerCase();
    apps = apps.filter(a => a.name.toLowerCase().includes(query) || a.path.toLowerCase().includes(query));
  } else if (target && typeof target === 'object' && target.path) {
    apps = [target];
  }
  
  if (apps.length === 0) {
    logger.warn('No matching Electron applications found');
    return { patched: 0, skipped: 0, failed: 0 };
  }
  
  const results = { patched: [], skipped: [], failed: [] };
  
  for (const appInfo of apps) {
    console.log('--------------------------------------------');
    console.log(` Target: ${appInfo.name} (${appInfo.version})`);
    console.log(` Path:   ${appInfo.path}`);
    
    const asarPath = path.join(appInfo.path, 'resources', 'app.asar');
    if (!fs.existsSync(asarPath)) {
      logger.error(`ASAR file not found for ${appInfo.name}`);
      results.failed.push(appInfo);
      continue;
    }

    killAppProcess(appInfo);
    
    let tempDir = null;
    try {
      logger.info('[1/6] Extracting ASAR workspace...');
      const ext = await asar.extract(asarPath);
      if (!ext.success) throw new Error(`Extract failed: ${ext.error}`);
      tempDir = ext.tempPath;
      
      logger.info('[2/6] Analyzing application structure...');
      const classification = classifier.classify(tempDir);
      if (classification.confidence < 50) {
        throw new Error('Low structure confidence - incompatible app layout');
      }
      
      logger.info('[3/6] Creating SHA-256 backup...');
      const bak = backup.create(asarPath, appInfo);
      if (!bak.success) throw new Error(`Backup failed: ${bak.error}`);
      
      logger.info('[4/6] Injecting BiDi engine...');
      const inj = injector.inject(tempDir, appInfo);
      if (!inj.success) throw new Error(`Inject failed: ${inj.error}`);
      
      logger.info('[5/6] Repacking ASAR package atomically...');
      const packRes = await asar.pack(tempDir, asarPath);
      if (!packRes.success) {
        backup.rollback(appInfo.path);
        throw new Error(`Repack failed: ${packRes.error}`);
      }
      
      logger.info('[6/6] Verifying patched ASAR integrity...');
      const val = asar.validate(asarPath);
      if (!val.valid) {
        backup.rollback(appInfo.path);
        throw new Error(`Validation failed: ${val.error}`);
      }
      
      status.update(appInfo.path, {
        name: appInfo.name,
        status: 'PATCHED',
        bidiForgeVersion: VERSION,
        appVersion: appInfo.version,
        entryPoint: inj.entryFile,
        appRef: inj.appRef,
      });
      
      results.patched.push(appInfo);
      
      if (relaunch) {
        relaunchAppProcess(appInfo);
      } else {
        console.log(`  ✓ Successfully patched ${appInfo.name}!`);
      }
    } catch (e) {
      logger.error(`Failed to patch ${appInfo.name}: ${e.message}`);
      results.failed.push(appInfo);
    } finally {
      if (tempDir) asar.cleanup(tempDir);
    }
  }
  
  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('                 SUMMARY                    ');
  console.log('════════════════════════════════════════════');
  console.log(`  Patched:  ${results.patched.length}`);
  console.log(`  Skipped:  ${results.skipped.length}`);
  console.log(`  Failed:   ${results.failed.length}`);
  console.log('════════════════════════════════════════════');
  console.log('');
  
  return results;
}

/**
 * Scan installed applications and display compatibility table
 */
function scan() {
  logger.init();
  
  console.log('• Starting Universal Electron application scan...');
  const apps = detector.detectAll();
  console.log(`• Found ${apps.length} Electron application(s)`);
  console.log('');
  
  if (apps.length === 0) {
    console.log('No Electron applications discovered.');
    return apps;
  }
  
  console.log('Discovered Compatible Applications:');
  console.log('────────────────────────────────────────────────────────────');
  
  const registry = status.getAll() || {};
  const appStatus = registry.apps || {};
  
  apps.forEach((app, idx) => {
    const key = app.path.toLowerCase();
    const reg = appStatus[key] || appStatus[app.path] || {};
    const st = reg.status || 'COMPATIBLE';
    const tag = st === 'PATCHED' ? '[PATCHED]' : '[COMPATIBLE]';
    console.log(`  [${idx + 1}] ${app.name} (v${app.version})  ${tag}`);
    console.log(`      Path: ${app.path}`);
  });
  
  console.log('────────────────────────────────────────────────────────────');
  console.log('');
  return apps;
}

/**
 * Patch custom path specified by user
 * @param {string} customPath - Path to app folder or asar file
 */
async function patchCustomPath(customPath) {
  if (!customPath || !fs.existsSync(customPath)) {
    console.log('[X] ERROR: Specified path does not exist.');
    return;
  }
  
  let appDir = customPath;
  if (customPath.endsWith('.asar')) {
    appDir = path.dirname(path.dirname(customPath));
  }
  
  const appInfo = detector.detectElectronApp(appDir);
  if (!appInfo) {
    console.log('[X] ERROR: Could not detect valid Electron application structure at specified path.');
    return;
  }
  
  console.log(`✓ Compatible Electron Structure Detected: ${appInfo.name} (v${appInfo.version})`);
  await patch(appInfo);
}

/**
 * Rollback app
 */
function rollbackApp(targetApp) {
  logger.init();
  banner();
  
  if (!targetApp) {
    console.log('Usage: node index.js rollback <app-name-or-path>');
    return;
  }
  
  const apps = detector.detectAll();
  const matched = apps.find(a => a.name.toLowerCase().includes(targetApp.toLowerCase()) || a.path.toLowerCase().includes(targetApp.toLowerCase()));
  
  const targetPath = matched ? matched.path : targetApp;
  const res = backup.rollback(targetPath);
  
  if (res.success) {
    status.update(targetPath, { status: 'RESTORED' });
    console.log(`✓ Successfully restored original backup for ${targetApp}!`);
  } else {
    console.log(`[X] Rollback failed: ${res.error}`);
  }
}

/**
 * Cleanup temp files and old backups
 */
function cleanup() {
  logger.init();
  banner();
  
  console.log('• Cleaning up temporary workspaces & old backups...');
  const res = backup.cleanup();
  console.log(`✓ Cleaned obsolete backups (Kept: ${res.kept}).`);
}

/**
 * Run diagnostic test suite
 */
function runTests() {
  banner();
  console.log('• Running Automated Test Suite...');
  try {
    execSync('node tests/runner.js', { stdio: 'inherit' });
  } catch (e) {
    console.log('[X] Diagnostic tests failed.');
  }
}

/**
 * Prompt question helper for readline
 */
function askQuestion(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Interactive Menu Workflow
 */
async function interactiveMenu() {
  banner();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let running = true;
  while (running) {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('                         MAIN MENU                            ');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  [1] Fast Scan & List Compatible Applications');
    console.log('  [2] Select Application to Patch (Interactive)');
    console.log('  [3] Patch ALL Discovered Applications');
    console.log('  [4] Search Application by Name');
    console.log('  [5] Patch Custom Application Path (Enter Path)');
    console.log('  [6] Rollback Application (Restore Original Backup)');
    console.log('  [7] Clean Temporary Files & Prune Old Backups');
    console.log('  [8] Run Diagnostic Test Suite');
    console.log('  [0] Exit');
    console.log('══════════════════════════════════════════════════════════════');
    
    const choice = (await askQuestion(rl, 'Select an option [0-8]: ')).trim();
    console.log('');
    
    switch (choice) {
      case '1': {
        const apps = scan();
        if (apps.length > 0) {
          const doPatch = (await askQuestion(rl, 'Do you want to patch any of the discovered applications now? [Y/n]: ')).trim();
          if (doPatch.toLowerCase() !== 'n') {
            const ans = (await askQuestion(rl, `Enter App Number [1-${apps.length}], App Name (e.g. discord), or A for ALL (0 to cancel): `)).trim();
            if (ans.toUpperCase() === 'A') {
              const confirmAll = (await askQuestion(rl, `Are you sure you want to patch ALL ${apps.length} applications? [Y/n]: `)).trim();
              if (confirmAll.toLowerCase() !== 'n') {
                await patch(null);
              }
            } else if (ans !== '0') {
              const num = parseInt(ans, 10);
              let targetApp = null;
              if (num > 0 && num <= apps.length) {
                targetApp = apps[num - 1];
              } else if (ans.length > 0) {
                targetApp = apps.find(a => a.name.toLowerCase().includes(ans.toLowerCase()));
              }
              
              if (targetApp) {
                const confirmSingle = (await askQuestion(rl, `Are you sure you want to patch ${targetApp.name}? [Y/n]: `)).trim();
                if (confirmSingle.toLowerCase() !== 'n') {
                  await patch(targetApp);
                }
              } else {
                console.log('[X] No matching application selected.');
              }
            }
          }
        }
        break;
      }
        
      case '2': {
        const apps = scan();
        if (apps.length > 0) {
          const ans = (await askQuestion(rl, `Enter App Number [1-${apps.length}] to patch (or A for All, 0 to cancel): `)).trim();
          if (ans.toUpperCase() === 'A') {
            const confirmAll = (await askQuestion(rl, `Are you sure you want to patch ALL ${apps.length} applications? [Y/n]: `)).trim();
            if (confirmAll.toLowerCase() !== 'n') {
              await patch(null);
            }
          } else if (ans !== '0') {
            const num = parseInt(ans, 10);
            if (num > 0 && num <= apps.length) {
              const targetApp = apps[num - 1];
              const confirmSingle = (await askQuestion(rl, `Are you sure you want to patch ${targetApp.name}? [Y/n]: `)).trim();
              if (confirmSingle.toLowerCase() !== 'n') {
                await patch(targetApp);
              }
            }
          }
        }
        break;
      }
      
      case '3': {
        const confirmAll = (await askQuestion(rl, 'Are you sure you want to patch ALL discovered applications? [Y/n]: ')).trim();
        if (confirmAll.toLowerCase() !== 'n') {
          await patch(null);
        }
        break;
      }
        
      case '4': {
        const nameQuery = (await askQuestion(rl, 'Enter application name to search (e.g. discord, slack, obsidian): ')).trim();
        if (nameQuery) {
          console.log(`• Starting Universal Electron application scan for "${nameQuery}"...`);
          const apps = detector.detectAll().filter(a => a.name.toLowerCase().includes(nameQuery.toLowerCase()));
          console.log(`• Found ${apps.length} matching application(s)`);
          console.log('');
          if (apps.length > 0) {
            apps.forEach((a, i) => console.log(`  [${i+1}] ${a.name} (${a.version}) - Path: ${a.path}`));
            const doPatch = (await askQuestion(rl, `\nAre you sure you want to patch ${apps[0].name}? [Y/n]: `)).trim();
            if (doPatch.toLowerCase() !== 'n') {
              await patch(nameQuery);
            }
          }
        }
        break;
      }
      
      case '5': {
        const customPath = (await askQuestion(rl, 'Enter direct application folder or ASAR file path: ')).trim();
        if (customPath) {
          await patchCustomPath(customPath);
        }
        break;
      }
      
      case '6': {
        const appName = (await askQuestion(rl, 'Enter application name or path to rollback: ')).trim();
        if (appName) {
          rollbackApp(appName);
        }
        break;
      }
      
      case '7':
        cleanup();
        break;
        
      case '8':
        runTests();
        break;
        
      case '0':
        running = false;
        console.log('Thank you for using BidiForge!');
        break;
        
      default:
        console.log('Invalid selection. Please enter a number between 0 and 8.');
    }
    
    if (running && choice !== '0') {
      await askQuestion(rl, '\nPress Enter to return to main menu...');
      console.clear();
      banner();
    }
  }
  
  rl.close();
}

/**
 * Main execution handler
 */
(async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await interactiveMenu();
    return;
  }
  
  const command = args[0].toLowerCase();
  
  try {
    switch (command) {
      case 'scan':
      case '--scan':
      case '-s':
        banner();
        scan();
        break;
        
      case 'patch':
      case '--patch':
        banner();
        await patch(args[1] || null);
        break;
        
      case 'rollback':
      case '--rollback':
      case '-r':
        if (args[1]) {
          rollbackApp(args[1]);
        } else {
          console.log('Usage: node index.js rollback <app-name-or-path>');
        }
        break;
        
      case 'cleanup':
      case '--cleanup':
      case '-c':
        cleanup();
        break;
        
      case 'status':
      case '--status':
        banner();
        scan();
        break;
        
      case 'repair':
      case '--repair':
        banner();
        await patch(args[1] || null);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        banner();
        console.log('Usage: node index.js [command] [options]');
        console.log('');
        console.log('Commands:');
        console.log('  patch [app]     Patch all detected apps (or specific app)');
        console.log('  scan            Scan and list detected Electron apps');
        console.log('  status          Display patch status registry');
        console.log('  rollback <app>  Rollback specified app to original backup');
        console.log('  cleanup         Clean temporary files and prune old backups');
        console.log('  repair [app]    Force re-patch/repair target applications');
        console.log('  help            Show this help manual');
        console.log('');
        break;
        
      default:
        banner();
        await patch(command !== 'patch' ? command : args[1]);
    }
  } catch (e) {
    logger.error('Fatal error during execution', { error: e.message });
    process.exit(1);
  }
})();

module.exports = {
  patch,
  scan,
  rollback: rollbackApp,
  cleanup,
  VERSION,
};
