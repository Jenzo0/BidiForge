/**
 * BidiForge — Main CLI Entry & Interactive Engine (v3.3 Engine)
 * Universal BiDi Compatibility Layer for Electron
 * OpenCode-CLI Inspired TUI: 78-Char Cyberpunk Box Containers, Arrow Key Navigation, Multi-Select Checkboxes, Tips Footer
 * 
 * @version 3.3.0
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
const { promptSelect, promptMultiSelect, createSpinner, printBox, formatBoxLine, beep, C } = require('./ui/menu');

const VERSION = '3.3.0';
const DEVELOPER = 'Jenzo0';

/**
 * Print stylized Cyberpunk ASCII banner with 100% pixel-perfect 78-char symmetry
 */
function banner() {
  console.log('');
  console.log(`${C.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██████╗ ██╗██████╗ ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗${C.reset}           ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██╔══██╗██║██╔══██╗██║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝${C.reset}           ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██████╔╝██║██║  ██║██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ${C.reset}           ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██╔══██╗██║██║  ██║██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ${C.reset}           ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}██████╔╝██║██████╔╝██║██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗${C.reset}           ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║ ${C.yellow}${C.bold}╚═════╝ ╚═╝╚═════╝ ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝${C.reset}           ${C.cyan}║${C.reset}`);
  console.log(`${C.cyan}║                   ${C.white}${C.bold}Universal BiDi Compatibility Layer v${VERSION}${C.reset}${C.cyan}                    ║${C.reset}`);
  console.log(`${C.cyan}║                               ${C.yellow}Developer: ${DEVELOPER}${C.reset}${C.cyan}                                ║${C.reset}`);
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}`);
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
      beep();
    } else {
      console.log(`  ${C.green}✓ Patch Done!${C.reset}\n`);
      beep();
    }
  } catch (_) {
    console.log(`  ${C.green}✓ Patch Done!${C.reset}\n`);
    beep();
  }
}

/**
 * Main patch workflow with Animated Spinners & Safe Update Detection
 */
async function patch(target = null, relaunch = true, force = false) {
  logger.init();
  
  let apps = detector.detectAll();
  
  if (target && typeof target === 'string') {
    const query = target.toLowerCase();
    apps = apps.filter(a => a.name.toLowerCase().includes(query) || a.path.toLowerCase().includes(query));
  } else if (target && typeof target === 'object' && target.path) {
    apps = [target];
  } else if (Array.isArray(target)) {
    apps = target;
  }
  
  if (apps.length === 0) {
    console.log(`${C.yellow}✖ No matching Electron applications found.${C.reset}`);
    return { patched: 0, skipped: 0, failed: 0 };
  }
  
  const results = { patched: [], skipped: [], failed: [] };
  
  for (const appInfo of apps) {
    console.log(`${C.cyan}------------------------------------------------------------------------------${C.reset}`);
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
    const spinner = createSpinner('Extracting ASAR workspace...');
    try {
      spinner.update('[1/6] Extracting ASAR package...');
      const ext = await asar.extract(asarPath);
      if (!ext.success) throw new Error(`Extract failed: ${ext.error}`);
      tempDir = ext.tempPath;
      
      spinner.update('[2/6] Analyzing application structure...');
      const classification = classifier.classify(tempDir);
      if (classification.confidence < 50) {
        throw new Error('Low structure confidence - incompatible app layout');
      }
      
      spinner.update('[3/6] Creating SHA-256 backup vault snapshot...');
      const bak = backup.create(asarPath, appInfo);
      if (!bak.success) throw new Error(`Backup failed: ${bak.error}`);
      vault.createSnapshot(asarPath, appInfo);
      
      spinner.update('[4/6] Injecting BiDi engine (Developer: Jenzo0)...');
      const inj = injector.inject(tempDir, appInfo);
      if (!inj.success) throw new Error(`Inject failed: ${inj.error}`);
      
      spinner.update('[5/6] Repacking ASAR package atomically...');
      const packRes = await asar.pack(tempDir, asarPath);
      if (!packRes.success) {
        backup.rollback(appInfo.path);
        throw new Error(`Repack failed: ${packRes.error}`);
      }
      
      spinner.update('[6/6] Verifying patched ASAR integrity...');
      const val = asar.validate(asarPath);
      if (!val.valid) {
        backup.rollback(appInfo.path);
        throw new Error(`Validation failed: ${val.error}`);
      }
      
      spinner.succeed(`Successfully injected BiDi engine into ${appInfo.name}!`);
      
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
      spinner.fail(`Failed to patch ${appInfo.name}: ${e.message}`);
      console.log('');
      results.failed.push(appInfo);
    } finally {
      if (tempDir) asar.cleanup(tempDir);
    }
  }
  
  const summaryLines = [
    `${C.green}✓ Patched Applications: ${results.patched.length}${C.reset}`,
    `${C.yellow}• Skipped (Patched):    ${results.skipped.length}${C.reset}`,
    `${C.red}✖ Failed Applications:  ${results.failed.length}${C.reset}`,
  ];
  printBox(summaryLines, 'SUMMARY REPORT', 'All patched applications are now active with Arabic BiDi support');
  console.log('');
  
  return results;
}

/**
 * Scan installed applications and display 78-char Cyberpunk Boxed table with status badges
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
  
  const boxLines = [];
  apps.forEach((app, idx) => {
    const asarPath = path.join(app.path, 'resources', 'app.asar');
    const currentHash = fs.existsSync(asarPath) ? detector.getFileHash(asarPath) : '';
    const updateCheck = status.checkSafeUpdateStatus(app.path, currentHash, app.version, asarPath);
    
    let statusTag = '';
    if (updateCheck.state === 'PATCHED_VERIFIED') {
      statusTag = `${C.green}✓ Compatible${C.reset}  ${C.cyan}★ (Patched)${C.reset}`;
    } else if (updateCheck.state === 'APP_UPDATED') {
      statusTag = `${C.magenta}[VENDOR UPDATE DETECTED]${C.reset}  ${C.yellow}⚡ Auto-Repair Ready${C.reset}`;
    } else {
      statusTag = `${C.green}✓ Compatible${C.reset}`;
    }
    
    boxLines.push({
      text: `${C.cyan}[${idx + 1}]${C.reset} ${C.white}${C.bold}${app.name}${C.reset} (v${app.version})`,
      tag: statusTag,
    });
  });
  
  printBox(boxLines, 'DISCOVERED ELECTRON APPLICATIONS & STATUS', 'Select Option [2] in main menu to interactively patch applications');
  console.log('');
  return apps;
}

/**
 * Build option list with status tags for promptSelect
 */
function getAppSelectOptions(apps) {
  return apps.map((app, idx) => {
    const asarPath = path.join(app.path, 'resources', 'app.asar');
    const currentHash = fs.existsSync(asarPath) ? detector.getFileHash(asarPath) : '';
    const updateCheck = status.checkSafeUpdateStatus(app.path, currentHash, app.version, asarPath);
    
    let tag = '';
    if (updateCheck.state === 'PATCHED_VERIFIED') {
      tag = `${C.green}✓ Compatible${C.reset}  ${C.cyan}★ (Patched)${C.reset}`;
    } else if (updateCheck.state === 'APP_UPDATED') {
      tag = `${C.magenta}[VENDOR UPDATE DETECTED]${C.reset}  ${C.yellow}⚡ Auto-Repair Ready${C.reset}`;
    } else {
      tag = `${C.green}✓ Compatible${C.reset}`;
    }
    
    return {
      label: `${app.name} (v${app.version})`,
      tag: tag,
      value: app,
    };
  });
}

/**
 * Run BiDi Diagnostic Health Inspector on target application(s)
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

    const boxLines = [
      `Health Score: ${scoreColor}${report.score}/100 (${report.grade})${C.reset}  —  Status: ${scoreColor}${report.status}${C.reset}`,
      `Inspected At: ${new Date(report.inspectedAt).toLocaleString()}`,
      `────────────────────────────────────────────────────────────`,
    ];

    report.checks.forEach(check => {
      const symbol = check.passed ? `${C.green}✓${C.reset}` : `${C.red}✖${C.reset}`;
      boxLines.push(`${symbol} ${C.bold}${check.name}:${C.reset} ${check.detail}`);
    });

    printBox(boxLines, `HEALTH REPORT: ${report.appName} (v${report.appVersion})`, 'High score indicates optimal Arabic RTL injection');
    console.log('');
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
    
    const choices = [
      '⚡ Run Auto-Repair & Re-patch Updated Version (Recommended)',
      '• Skip Patching For Now',
      '* Cancel / Back to Main Menu',
    ];
    const idx = await promptSelect(choices, `Select action for ${app.name}:`, banner);
    if (idx === 0) {
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
    
    const choices = [
      '⚡ Force Re-patch (Apply fresh BiDi patch)',
      '🛡️ Rollback / Remove Patch (Restore original app backup)',
      '* Cancel / Back to Main Menu',
    ];
    const subChoice = await promptSelect(choices, `Select action for ${app.name}:`, banner);
    if (subChoice === 0) {
      await patch(app, true, true);
    } else if (subChoice === 1) {
      rollbackApp(app.name);
    }
    return;
  }

  const running = isAppRunning(app);
  if (running) {
    console.log(`\n  ${C.yellow}⚡ Notice: ${app.name} is currently running.${C.reset}`);
    console.log(`  ${C.dim}BidiForge will automatically terminate ${app.name}, apply the BiDi patch, and relaunch it.${C.reset}\n`);
  }

  const choices = [
    `🚀 Yes, apply BiDi patch to ${app.name}`,
    `* Cancel & Back to Main Menu`,
  ];
  const confirmIdx = await promptSelect(choices, `Confirm patching ${app.name} (v${app.version}):`, banner);
  if (confirmIdx === 0) {
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
    beep();
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
  beep();
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
 * Interactive Menu Workflow with Arrow Key Keyboard Navigation (↑/↓/Enter)
 */
async function interactiveMenu() {
  const menuOptions = [
    '⚡ [1] Fast Scan & List Compatible Applications',
    '⚙️ [2] Select Applications to Patch (Multi-Checkboxes [x])',
    '🚀 [3] Patch ALL Discovered Applications',
    '🔍 [4] Search Application by Name',
    '📂 [5] Patch Custom Application Path (Enter Path)',
    '🛡️ [6] Rollback Application (Restore Original Backup)',
    '🩺 [7] Run BiDi Diagnostic Health Inspector (--health)',
    '🔄 [8] Live Hot-Reload Watcher Engine (--watch)',
    '🖱️ [9] Register Windows Explorer Context Menu (Right-Click Patch)',
    '📦 [10] Snapshot Restore Vault Manager (Multi-Version Rollback)',
    '🧹 [11] Clean Temporary Files & Prune Old Backups',
    '🧪 [12] Run Diagnostic Test Suite',
    '❌ [0] Exit BidiForge',
  ];

  let running = true;
  while (running) {
    const selectedIdx = await promptSelect(menuOptions, 'BidiForge v3.3 Main Menu — OpenCode CLI TUI Engine:', banner);
    
    if (selectedIdx === -1 || selectedIdx === 12) {
      running = false;
      console.log(`\n${C.cyan}Thank you for using BidiForge!${C.reset}`);
      break;
    }
    
    switch (selectedIdx) {
      case 0: { // Scan
        banner();
        scan();
        break;
      }
        
      case 1: { // Interactive Multi-Select Checkbox App Selection
        banner();
        const apps = detector.detectAll();
        if (apps.length > 0) {
          const appChoices = getAppSelectOptions(apps);
          const selectedApps = await promptMultiSelect(appChoices, 'Select Applications to Patch (Space to toggle [x], Enter to confirm):', banner);
          if (selectedApps.length > 0) {
            await patch(selectedApps, true, false);
          }
        }
        break;
      }
      
      case 2: { // Patch ALL
        banner();
        await patch(null, true, false);
        break;
      }
        
      case 3: { // Search
        banner();
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const nameQuery = (await askQuestion(rl, `\n${C.yellow}Enter application name to search (e.g. discord, slack, obsidian): ${C.reset}`)).trim();
        if (nameQuery) {
          const apps = detector.detectAll().filter(a => a.name.toLowerCase().includes(nameQuery.toLowerCase()));
          if (apps.length > 0) {
            await handleAppSelection(rl, apps[0]);
          } else {
            console.log(`${C.red}[X] No matching applications found for "${nameQuery}".${C.reset}`);
          }
        }
        rl.close();
        break;
      }
      
      case 4: { // Custom Path
        banner();
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const customPath = (await askQuestion(rl, `\n${C.yellow}Enter direct application folder or ASAR file path: ${C.reset}`)).trim();
        if (customPath) await patchCustomPath(customPath);
        rl.close();
        break;
      }
      
      case 5: { // Rollback
        banner();
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const appName = (await askQuestion(rl, `\n${C.yellow}Enter application name or path to rollback: ${C.reset}`)).trim();
        if (appName) rollbackApp(appName);
        rl.close();
        break;
      }
      
      case 6: // Health
        runHealthInspection();
        break;

      case 7: { // Watch
        banner();
        const apps = scan();
        if (apps.length > 0) {
          const appChoices = getAppSelectOptions(apps);
          const appIdx = await promptSelect(appChoices, 'Select Application for Live Hot-Reload Watcher:', banner);
          if (appIdx >= 0 && appIdx < apps.length) {
            watcher.watch(apps[appIdx]);
            return;
          }
        }
        break;
      }

      case 8: { // Shell Integration
        banner();
        const regRes = shell.register();
        if (regRes.success) {
          console.log(`\n${C.green}✓ ${regRes.message}${C.reset}`);
          beep();
        } else {
          console.log(`\n${C.red}✖ Registration failed: ${regRes.error}${C.reset}`);
        }
        break;
      }

      case 9: { // Vault Manager
        banner();
        const snapshots = vault.listSnapshots();
        console.log(`\n${C.cyan}• Vault Snapshot Registry (${snapshots.length} snapshots)${C.reset}\n`);
        const snapshotLines = snapshots.map((s, idx) => ({
          text: `${C.cyan}[${idx+1}]${C.reset} ${C.white}${C.bold}${s.appName}${C.reset} (v${s.appVersion})`,
          tag: `${C.yellow}${s.id}${C.reset}`,
        }));
        printBox(snapshotLines, 'VAULT SNAPSHOTS', 'Use "node index.js vault restore <id>" to restore any snapshot');
        break;
      }

      case 10: // Cleanup
        cleanup();
        break;

      case 11: // Tests
        runTests();
        break;
    }
    
    if (running) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await askQuestion(rl, `\n${C.dim}Press Enter to return to main menu...${C.reset}`);
      rl.close();
    }
  }
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
            beep();
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
