/**
 * BidiForge — Main CLI Entry & Interactive Engine (v3.1 Engine)
 * Universal BiDi Compatibility Layer for Electron
 * 
 * @version 3.1.0
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
const inspector = require('./core/inspector');
const watcher = require('./core/watcher');
const shell = require('./integrations/shell');
const vault = require('./patcher/vault');

const VERSION = '3.1.0';
const DEVELOPER = 'Jenzo0';

// ANSI terminal color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36;1m',
  green: '\x1b[32;1m',
  yellow: '\x1b[33;1m',
  red: '\x1b[31;1m',
  magenta: '\x1b[35;1m',
  white: '\x1b[37;1m',
  blue: '\x1b[34;1m',
};

/**
 * Print stylized Cyberpunk ASCII banner with 100% pixel-perfect symmetry
 */
function banner() {
  console.log('');
  console.log(`${C.cyan}╔══════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██████╗ ██╗██████╗ ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗${C.reset} ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██╔══██╗██║██╔══██╗██║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝${C.reset} ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██████╔╝██║██║  ██║██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ${C.reset} ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██╔══██╗██║██║  ██║██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ${C.reset} ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██████╔╝██║██████╔╝██║██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗${C.reset} ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}╚═════╝ ╚═╝╚═════╝ ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝${C.reset} ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║            ${C.white}${C.bold}Universal BiDi Compatibility Layer v${VERSION}${C.reset}${C.cyan}             ║${C.reset}`);
  console.log(`${C.cyan}║                        ${C.yellow}Developer: ${DEVELOPER}${C.reset}${C.cyan}                         ║${C.reset}`);
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
}

/**
 * Check if target application process is currently running
 */
function isAppRunning(appInfo) {
  if (!appInfo || !appInfo.name) return false;
  let exeNames = [];
  const baseName = appInfo.name.replace(/[^a-zA-Z0-9_-]/g, '');
  exeNames.push(`${baseName}.exe`);
  exeNames.push(`${appInfo.name}.exe`);
  
  if (/discord/i.test(appInfo.name)) exeNames.push('Discord.exe');
  if (/opencode/i.test(appInfo.name)) exeNames.push('OpenCode.exe', '@opencode-aidesktop.exe');
  if (/antigravity/i.test(appInfo.name)) exeNames.push('Antigravity.exe');
  if (/obsidian/i.test(appInfo.name)) exeNames.push('Obsidian.exe');
  if (/vscode|code/i.test(appInfo.name)) exeNames.push('Code.exe');
  if (/cursor/i.test(appInfo.name)) exeNames.push('Cursor.exe');
  if (/slack/i.test(appInfo.name)) exeNames.push('Slack.exe');

  for (const exe of exeNames) {
    try {
      const output = execSync(`tasklist /FI "IMAGENAME eq ${exe}"`, { stdio: 'pipe' }).toString();
      if (output.toLowerCase().includes(exe.toLowerCase())) {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

/**
 * Kill running application process to release ASAR file locks
 */
function killAppProcess(appInfo) {
  if (!appInfo || !appInfo.name) return false;
  
  let exeNames = [];
  const baseName = appInfo.name.replace(/[^a-zA-Z0-9_-]/g, '');
  exeNames.push(`${baseName}.exe`);
  exeNames.push(`${appInfo.name}.exe`);
  
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
        console.log(`  ${C.yellow}⚡ Terminating open process ${exe} to release file lock...${C.reset}`);
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
      console.log(`  ${C.cyan}🚀 Relaunching ${appInfo.name}...${C.reset}`);
      const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
      child.unref();
      console.log(`  ${C.green}✓ Patch Done & ${appInfo.name} Relaunched!${C.reset}\n`);
    } else {
      console.log(`  ${C.green}✓ Patch Done!${C.reset}\n`);
    }
  } catch (_) {
    console.log(`  ${C.green}✓ Patch Done!${C.reset}\n`);
  }
}

/**
 * Main patch workflow with Safe Update Detection & Auto Repair
 */
async function patch(target = null, relaunch = true, force = false) {
  logger.init();
  
  let apps = detector.detectAll();
  
  if (target && typeof target === 'string') {
    const query = target.toLowerCase();
    apps = apps.filter(a => a.name.toLowerCase().includes(query) || a.path.toLowerCase().includes(query));
  } else if (target && typeof target === 'object' && target.path) {
    apps = [target];
  }
  
  if (apps.length === 0) {
    console.log(`${C.yellow}✖ No matching Electron applications found.${C.reset}`);
    return { patched: 0, skipped: 0, failed: 0 };
  }
  
  const results = { patched: [], skipped: [], failed: [] };
  
  for (const appInfo of apps) {
    console.log(`${C.cyan}--------------------------------------------${C.reset}`);
    console.log(` ${C.bold}Target:${C.reset} ${C.white}${appInfo.name}${C.reset} (v${appInfo.version})`);
    
    const asarPath = path.join(appInfo.path, 'resources', 'app.asar');
    if (!fs.existsSync(asarPath)) {
      console.log(`  ${C.red}✖ ASAR file not found for ${appInfo.name}${C.reset}`);
      results.failed.push(appInfo);
      continue;
    }

    const currentHash = detector.getFileHash(asarPath);
    const updateCheck = status.checkSafeUpdateStatus(appInfo.path, currentHash, appInfo.version, asarPath);

    if (updateCheck.state === 'PATCHED_VERIFIED' && !force) {
      console.log(`  ${C.yellow}YES → Already patched (SHA-256 hash & file marker verified)${C.reset}\n`);
      results.skipped.push(appInfo);
      continue;
    }

    if (updateCheck.state === 'APP_UPDATED') {
      console.log(`  ${C.magenta}⚡ Safe Update Detection: Application update detected for ${appInfo.name}!${C.reset}`);
      console.log(`  ${C.yellow}🔄 Auto-Repair triggered: Re-analyzing and patching updated ASAR structure...${C.reset}`);
    }

    killAppProcess(appInfo);
    
    let tempDir = null;
    try {
      console.log(`  ${C.dim}• [1/6] Extracting ASAR workspace...${C.reset}`);
      const ext = await asar.extract(asarPath);
      if (!ext.success) throw new Error(`Extract failed: ${ext.error}`);
      tempDir = ext.tempPath;
      
      console.log(`  ${C.dim}• [2/6] Analyzing application structure...${C.reset}`);
      const classification = classifier.classify(tempDir);
      if (classification.confidence < 50) {
        throw new Error('Low structure confidence - incompatible app layout');
      }
      
      console.log(`  ${C.dim}• [3/6] Creating SHA-256 backup vault snapshot...${C.reset}`);
      const bak = backup.create(asarPath, appInfo);
      if (!bak.success) throw new Error(`Backup failed: ${bak.error}`);
      vault.createSnapshot(asarPath, appInfo);
      
      console.log(`  ${C.dim}• [4/6] Injecting BiDi engine (Developer: Jenzo0)...${C.reset}`);
      const inj = injector.inject(tempDir, appInfo);
      if (!inj.success) throw new Error(`Inject failed: ${inj.error}`);
      
      console.log(`  ${C.dim}• [5/6] Repacking ASAR package atomically...${C.reset}`);
      const packRes = await asar.pack(tempDir, asarPath);
      if (!packRes.success) {
        backup.rollback(appInfo.path);
        throw new Error(`Repack failed: ${packRes.error}`);
      }
      
      console.log(`  ${C.dim}• [6/6] Verifying patched ASAR integrity...${C.reset}`);
      const val = asar.validate(asarPath);
      if (!val.valid) {
        backup.rollback(appInfo.path);
        throw new Error(`Validation failed: ${val.error}`);
      }
      
      const newHash = detector.getFileHash(asarPath);
      status.setPatched(appInfo.path, appInfo, {
        hash: newHash,
        backup: bak.backupPath,
      });
      
      results.patched.push(appInfo);
      
      if (relaunch) {
        relaunchAppProcess(appInfo);
      } else {
        console.log(`  ${C.green}✓ Successfully patched ${appInfo.name}!${C.reset}\n`);
      }
    } catch (e) {
      console.log(`  ${C.red}✖ Failed to patch ${appInfo.name}: ${e.message}${C.reset}\n`);
      results.failed.push(appInfo);
    } finally {
      if (tempDir) asar.cleanup(tempDir);
    }
  }
  
  console.log('════════════════════════════════════════════');
  console.log(`             ${C.bold}SUMMARY REPORT${C.reset}                `);
  console.log('════════════════════════════════════════════');
  console.log(`  ${C.green}✓ Patched:  ${results.patched.length}${C.reset}`);
  console.log(`  ${C.yellow}• Skipped:  ${results.skipped.length}${C.reset}`);
  console.log(`  ${C.red}✖ Failed:   ${results.failed.length}${C.reset}`);
  console.log('════════════════════════════════════════════\n');
  
  return results;
}

/**
 * Scan installed applications and display clean formatted table
 */
function scan() {
  logger.init();
  
  console.log(`${C.cyan}• Starting Universal Electron application scan...${C.reset}`);
  const apps = detector.detectAll();
  console.log(`${C.green}• Found ${apps.length} Electron application(s)${C.reset}\n`);
  
  if (apps.length === 0) {
    console.log(`${C.yellow}No Electron applications discovered on this system.${C.reset}`);
    return apps;
  }
  
  console.log(`${C.bold}Discovered Compatible Applications:${C.reset}`);
  console.log(`${C.cyan}────────────────────────────────────────────────────────────${C.reset}`);
  
  apps.forEach((app, idx) => {
    const asarPath = path.join(app.path, 'resources', 'app.asar');
    const currentHash = fs.existsSync(asarPath) ? detector.getFileHash(asarPath) : '';
    const updateCheck = status.checkSafeUpdateStatus(app.path, currentHash, app.version, asarPath);
    
    let statusDisplay = '';
    
    if (updateCheck.state === 'PATCHED_VERIFIED') {
      statusDisplay = `${C.green}✓ Compatible${C.reset}  ${C.cyan}★ (Patched)${C.reset}`;
    } else if (updateCheck.state === 'APP_UPDATED') {
      statusDisplay = `${C.magenta}[VENDOR UPDATE DETECTED]${C.reset}  ${C.yellow}⚡ Auto-Repair Ready${C.reset}`;
    } else {
      statusDisplay = `${C.green}✓ Compatible${C.reset}`;
    }
    
    console.log(`  ${C.cyan}[${idx + 1}]${C.reset} ${C.white}${C.bold}${app.name}${C.reset} (v${app.version})   ${statusDisplay}`);
  });
  
  console.log(`${C.cyan}────────────────────────────────────────────────────────────${C.reset}\n`);
  return apps;
}

/**
 * Run BiDi Diagnostic Health Inspector on target application(s)
 * @param {string|object} target - Target application or query
 */
function runHealthInspection(target = null) {
  banner();
  console.log(`${C.cyan}• Running BiDi Diagnostic Health Inspector...${C.reset}\n`);
  
  let apps = detector.detectAll();
  if (target && typeof target === 'string') {
    apps = apps.filter(a => a.name.toLowerCase().includes(target.toLowerCase()) || a.path.toLowerCase().includes(target.toLowerCase()));
  } else if (target && typeof target === 'object' && target.path) {
    apps = [target];
  }

  if (apps.length === 0) {
    console.log(`${C.yellow}✖ No applications found for health inspection.${C.reset}`);
    return;
  }

  for (const app of apps) {
    const report = inspector.inspectApp(app);
    const scoreColor = report.score >= 80 ? C.green : (report.score >= 50 ? C.yellow : C.red);

    console.log(`${C.cyan}══════════════════════════════════════════════════════════════${C.reset}`);
    console.log(` ${C.bold}App:${C.reset} ${C.white}${report.appName}${C.reset} (v${report.appVersion})`);
    console.log(` ${C.bold}Health Score:${C.reset} ${scoreColor}${report.score}/100 (${report.grade})${C.reset}  —  ${C.bold}Status:${C.reset} ${scoreColor}${report.status}${C.reset}`);
    console.log(`${C.cyan}────────────────────────────────────────────────────────────${C.reset}`);

    report.checks.forEach(check => {
      const symbol = check.passed ? `${C.green}✓${C.reset}` : `${C.red}✖${C.reset}`;
      console.log(`  ${symbol} ${C.bold}${check.name}:${C.reset} ${check.detail}`);
    });
    console.log(`${C.cyan}══════════════════════════════════════════════════════════════${C.reset}\n`);
  }
}

/**
 * Unified application selection handler
 */
async function handleAppSelection(rl, app) {
  if (!app) return;
  
  const asarPath = path.join(app.path, 'resources', 'app.asar');
  const currentHash = fs.existsSync(asarPath) ? detector.getFileHash(asarPath) : '';
  const updateCheck = status.checkSafeUpdateStatus(app.path, currentHash, app.version, asarPath);

  if (updateCheck.state === 'APP_UPDATED') {
    console.log(`\n  ${C.magenta}${C.bold}⚡ Vendor Application Update Detected!${C.reset}`);
    console.log(`  ${C.white}${app.name}${C.reset} was updated by vendor (${updateCheck.oldVersion ? 'v' + updateCheck.oldVersion : 'older'} ➔ v${app.version}).`);
    if (updateCheck.patchedAt) {
      console.log(`  ${C.dim}Previous Patch Date: ${new Date(updateCheck.patchedAt).toLocaleString()}${C.reset}`);
    }
    console.log('');
    console.log(`  ${C.cyan}[1]${C.reset} ${C.white}Run Auto-Repair & Re-patch Updated Version (Recommended)${C.reset}`);
    console.log(`  ${C.yellow}[2]${C.reset} ${C.dim}Skip Patching For Now${C.reset}`);
    console.log(`  ${C.yellow}[*]${C.reset} ${C.dim}Back to Main Menu${C.reset}\n`);

    const ans = (await askQuestion(rl, `${C.yellow}Select an action [1-2, *]: ${C.reset}`)).trim();
    if (ans === '1') {
      await patch(app, true, true);
    }
    return;
  }

  if (updateCheck.state === 'PATCHED_VERIFIED') {
    console.log(`\n  ${C.yellow}${C.bold}YES → Already patched${C.reset}`);
    console.log(`  ${C.white}${app.name}${C.reset} (v${app.version}) is currently patched & verified.`);
    if (updateCheck.patchedAt) {
      console.log(`  ${C.dim}Patch Date: ${new Date(updateCheck.patchedAt).toLocaleString()}${C.reset}`);
    }
    console.log('');
    console.log(`  ${C.cyan}[1]${C.reset} ${C.white}Force Re-patch (Apply fresh BiDi patch)${C.reset}`);
    console.log(`  ${C.red}[2]${C.reset} ${C.red}Rollback / Remove Patch (Restore original app backup)${C.reset}`);
    console.log(`  ${C.yellow}[*]${C.reset} ${C.dim}Cancel / Back to Main Menu${C.reset}\n`);

    const subChoice = (await askQuestion(rl, `${C.yellow}Select an action [1-2, *]: ${C.reset}`)).trim();
    if (subChoice === '1') {
      await patch(app, true, true);
    } else if (subChoice === '2') {
      rollbackApp(app.name);
    }
    return;
  }

  const running = isAppRunning(app);
  if (running) {
    console.log(`\n  ${C.yellow}⚡ Notice: ${app.name} is currently running.${C.reset}`);
    console.log(`  ${C.dim}BidiForge will automatically terminate ${app.name}, apply the BiDi patch, and relaunch it.${C.reset}\n`);
  }

  const confirmSingle = (await askQuestion(rl, `${C.yellow}[?] Are you sure you want to patch ${app.name} (v${app.version})? [Y/n]: ${C.reset}`)).trim();
  if (confirmSingle.toLowerCase() !== 'n') {
    await patch(app, true, false);
  }
}

/**
 * Patch custom path specified by user
 */
async function patchCustomPath(customPath) {
  if (!customPath || !fs.existsSync(customPath)) {
    console.log(`${C.red}[X] ERROR: Specified path does not exist.${C.reset}`);
    return;
  }
  
  let appDir = customPath;
  if (customPath.endsWith('.asar')) {
    appDir = path.dirname(path.dirname(customPath));
  }
  
  const appInfo = detector.detectElectronApp(appDir);
  if (!appInfo) {
    console.log(`${C.red}[X] ERROR: Could not detect valid Electron application structure at specified path.${C.reset}`);
    return;
  }
  
  console.log(`${C.green}✓ Compatible Electron Structure Detected: ${appInfo.name} (v${appInfo.version})${C.reset}`);
  await patch(appInfo, true, true);
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
    console.log(`${C.green}✓ Successfully restored original backup for ${targetApp}!${C.reset}`);
  } else {
    console.log(`${C.red}[X] Rollback failed: ${res.error}${C.reset}`);
  }
}

/**
 * Cleanup temp files and old backups
 */
function cleanup() {
  logger.init();
  banner();
  
  console.log(`${C.cyan}• Cleaning up temporary workspaces & old backups...${C.reset}`);
  const res = backup.cleanup();
  console.log(`${C.green}✓ Cleaned obsolete backups (Kept: ${res.kept}).${C.reset}`);
}

/**
 * Run diagnostic test suite
 */
function runTests() {
  banner();
  console.log(`${C.cyan}• Running Automated Test Suite...${C.reset}`);
  try {
    execSync('node tests/runner.js', { stdio: 'inherit' });
  } catch (e) {
    console.log(`${C.red}[X] Diagnostic tests failed.${C.reset}`);
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
    console.log(`${C.cyan}══════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`                         ${C.bold}MAIN MENU${C.reset}                            `);
    console.log(`${C.cyan}══════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`  ${C.cyan}[1]${C.reset} ${C.white}Fast Scan & List Compatible Applications${C.reset}`);
    console.log(`  ${C.cyan}[2]${C.reset} ${C.white}Select Application to Patch (Interactive)${C.reset}`);
    console.log(`  ${C.cyan}[3]${C.reset} ${C.white}Patch ALL Discovered Applications${C.reset}`);
    console.log(`  ${C.cyan}[4]${C.reset} ${C.white}Search Application by Name${C.reset}`);
    console.log(`  ${C.cyan}[5]${C.reset} ${C.white}Patch Custom Application Path (Enter Path)${C.reset}`);
    console.log(`  ${C.cyan}[6]${C.reset} ${C.white}Rollback Application (Restore Original Backup)${C.reset}`);
    console.log(`  ${C.cyan}[7]${C.reset} ${C.white}Clean Temporary Files & Prune Old Backups${C.reset}`);
    console.log(`  ${C.cyan}[8]${C.reset} ${C.white}Run Diagnostic Test Suite${C.reset}`);
    console.log(`  ${C.cyan}[9]${C.reset} ${C.white}Run BiDi Diagnostic Health Inspector (--health)${C.reset}`);
    console.log(`  ${C.cyan}[10]${C.reset} ${C.white}Register Windows Explorer Context Menu (Right-Click Patch)${C.reset}`);
    console.log(`  ${C.cyan}[11]${C.reset} ${C.white}Snapshot Restore Vault Manager (Multi-Version Rollback)${C.reset}`);
    console.log(`  ${C.yellow}[*]${C.reset} ${C.dim}Back to Main Menu${C.reset}`);
    console.log(`  ${C.red}[0]${C.reset} ${C.dim}Exit BidiForge${C.reset}`);
    console.log(`${C.cyan}══════════════════════════════════════════════════════════════${C.reset}`);
    
    const choice = (await askQuestion(rl, `${C.yellow}Select an option [0-11, *]: ${C.reset}`)).trim();
    console.log('');
    
    if (choice === '0') {
      running = false;
      console.log(`${C.cyan}Thank you for using BidiForge!${C.reset}`);
      break;
    }
    
    if (choice === '*') {
      console.clear();
      banner();
      continue;
    }
    
    switch (choice) {
      case '1': {
        const apps = scan();
        if (apps.length > 0) {
          console.log(`  ${C.yellow}[A]${C.reset} Patch ALL Discovered Applications`);
          console.log(`  ${C.yellow}[*]${C.reset} Back to Main Menu`);
          console.log(`  ${C.red}[0]${C.reset} Exit BidiForge\n`);
          
          const ans = (await askQuestion(rl, `${C.yellow}Select App Number [1-${apps.length}], A for ALL (* Back, 0 Exit): ${C.reset}`)).trim();
          if (ans === '0') { running = false; break; }
          if (ans === '*') break;
          
          if (ans.toUpperCase() === 'A') {
            const confirmAll = (await askQuestion(rl, `${C.yellow}[?] Are you sure you want to patch ALL ${apps.length} applications? [Y/n]: ${C.reset}`)).trim();
            if (confirmAll.toLowerCase() !== 'n') {
              await patch(null, true, false);
            }
          } else if (ans) {
            const num = parseInt(ans, 10);
            let targetApp = (num > 0 && num <= apps.length) ? apps[num - 1] : apps.find(a => a.name.toLowerCase().includes(ans.toLowerCase()));
            if (targetApp) await handleAppSelection(rl, targetApp);
          }
        }
        break;
      }
        
      case '2': {
        const apps = scan();
        if (apps.length > 0) {
          const ans = (await askQuestion(rl, `${C.yellow}Enter App Number [1-${apps.length}] (* Back, 0 Exit): ${C.reset}`)).trim();
          if (ans === '0') { running = false; break; }
          if (ans === '*') break;
          const num = parseInt(ans, 10);
          if (num > 0 && num <= apps.length) await handleAppSelection(rl, apps[num - 1]);
        }
        break;
      }
      
      case '3': {
        const confirmAll = (await askQuestion(rl, `${C.yellow}[?] Are you sure you want to patch ALL discovered applications? [Y/n]: ${C.reset}`)).trim();
        if (confirmAll.toLowerCase() !== 'n') await patch(null, true, false);
        break;
      }
        
      case '4': {
        const nameQuery = (await askQuestion(rl, `${C.yellow}Enter application name to search (e.g. discord, slack, obsidian) (* Back, 0 Exit): ${C.reset}`)).trim();
        if (nameQuery === '0') { running = false; break; }
        if (nameQuery === '*') break;
        if (nameQuery) {
          const apps = detector.detectAll().filter(a => a.name.toLowerCase().includes(nameQuery.toLowerCase()));
          if (apps.length > 0) await handleAppSelection(rl, apps[0]);
        }
        break;
      }
      
      case '5': {
        const customPath = (await askQuestion(rl, `${C.yellow}Enter direct application folder or ASAR file path (* Back, 0 Exit): ${C.reset}`)).trim();
        if (customPath === '0') { running = false; break; }
        if (customPath === '*') break;
        if (customPath) await patchCustomPath(customPath);
        break;
      }
      
      case '6': {
        const appName = (await askQuestion(rl, `${C.yellow}Enter application name or path to rollback (* Back, 0 Exit): ${C.reset}`)).trim();
        if (appName === '0') { running = false; break; }
        if (appName === '*') break;
        if (appName) rollbackApp(appName);
        break;
      }
      
      case '7':
        cleanup();
        break;
        
      case '8':
        runTests();
        break;
        
      case '9':
        runHealthInspection();
        break;
        
      case '10': {
        const regRes = shell.register();
        if (regRes.success) {
          console.log(`${C.green}✓ ${regRes.message}${C.reset}`);
        } else {
          console.log(`${C.red}✖ Registration failed: ${regRes.error}${C.reset}`);
        }
        break;
      }

      case '11': {
        const snapshots = vault.listSnapshots();
        console.log(`${C.cyan}• Vault Snapshot Registry (${snapshots.length} snapshots)${C.reset}\n`);
        snapshots.forEach((s, idx) => {
          console.log(`  ${C.cyan}[${idx+1}]${C.reset} ${C.white}${C.bold}${s.appName}${C.reset} (v${s.appVersion})  —  ID: ${C.yellow}${s.id}${C.reset}`);
          console.log(`      ${C.dim}Date: ${new Date(s.createdAt).toLocaleString()} | SHA-256: ${s.hash.slice(0, 16)}...${C.reset}`);
        });
        break;
      }
        
      default:
        console.log(`${C.red}Invalid selection. Please enter a choice between 0 and 11, or *.${C.reset}`);
    }
    
    if (running && choice !== '0') {
      await askQuestion(rl, `\n${C.dim}Press Enter to return to main menu...${C.reset}`);
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
        
      case 'health':
      case '--health':
        runHealthInspection(args[1] || null);
        break;

      case 'watch':
      case '--watch':
      case '-w':
        banner();
        watcher.watch(args[1] || null);
        break;

      case 'register-shell':
        banner();
        console.log(shell.register().message);
        break;

      case 'unregister-shell':
        banner();
        console.log(shell.unregister().message);
        break;

      case 'vault':
        banner();
        if (args[1] === 'restore' && args[2]) {
          const res = vault.restoreSnapshot(args[2]);
          if (res.success) {
            console.log(`${C.green}✓ Restored snapshot ${res.snapshot.id} for ${res.snapshot.appName}!${C.reset}`);
          } else {
            console.log(`${C.red}✖ Vault restoration failed: ${res.error}${C.reset}`);
          }
        } else {
          const list = vault.listSnapshots(args[1] || '');
          console.log(`Vault Snapshots (${list.length}):`);
          list.forEach(s => console.log(`  ${s.id} | ${s.appName} v${s.appVersion} | ${s.createdAt}`));
        }
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
        await patch(args[1] || null, true, true);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        banner();
        console.log('Usage: node index.js [command] [options]');
        console.log('');
        console.log('Commands:');
        console.log('  patch [app]         Patch all detected apps (or specific app)');
        console.log('  scan                Scan and list detected Electron apps');
        console.log('  health [app]        Run BiDi Diagnostic Health Inspector');
        console.log('  watch [app]         Start live hot-reload watcher');
        console.log('  register-shell      Add right-click menu in Windows Explorer');
        console.log('  unregister-shell    Remove right-click menu from Windows Explorer');
        console.log('  vault [restore <id>] Manage multi-version snapshot restore vault');
        console.log('  rollback <app>      Rollback specified app to original backup');
        console.log('  cleanup             Clean temporary files and prune old backups');
        console.log('  repair [app]        Force re-patch/repair target applications');
        console.log('  help                Show this help manual');
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
