/**
 * BidiForge — Main CLI Entry & Interactive Engine (v3.9.0 Engine)
 * Universal BiDi Compatibility Layer for Electron
 * Hermes Agent TUI Engine: Dynamic Card Width (100% Straight Borders), Animated Fast Scan, & Asterisk-Free Back Options
 * 
 * @version 3.9.0
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
const updater = require('./core/updater');
const themeEngine = require('./ui/theme');
const { promptSelect, promptMultiSelect, createSpinner, printHermesCard, formatCardRow, printPromptBar, clearScreen, beep } = require('./ui/menu');

const VERSION = '3.9.0';
const DEVELOPER = 'Jenzo0';
let _cachedAppsCount = null;

/**
 * Get cached count of discovered apps (scan only once per session)
 */
function getCachedAppsCount() {
  if (_cachedAppsCount === null) {
    _cachedAppsCount = detector.detectAll().length;
  }
  return _cachedAppsCount;
}

/**
 * Invalidate cached apps count (call after a new scan)
 */
function refreshAppsCache() {
  _cachedAppsCount = detector.detectAll().length;
  return _cachedAppsCount;
}

/**
 * Print Full ASCII Hero Banner with Split Logo Art & System Overview
 */
function banner() {
  const T = themeEngine.getTheme();
  const appsCount = getCachedAppsCount();

  console.log(`${T.title}${T.bold}  ██████╗ ██╗██████╗ ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗${T.reset}`);
  console.log(`${T.title}${T.bold}  ██╔══██╗██║██╔══██╗██║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝${T.reset}`);
  console.log(`${T.title}${T.bold}  ██████╔╝██║██║  ██║██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ${T.reset}`);
  console.log(`${T.title}${T.bold}  ██╔══██╗██║██║  ██║██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ${T.reset}`);
  console.log(`${T.title}${T.bold}  ██████╔╝██║██████╔╝██║██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗${T.reset}`);
  console.log(`${T.title}${T.bold}  ╚═════╝ ╚═╝╚═════╝ ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝${T.reset}`);
  console.log('');
  console.log(`${T.border}─────── BidiForge Engine v${VERSION} · Developer: ${DEVELOPER} · Universal BiDi ───────${T.reset}`);
  console.log('');

  const logoArt = [
    '       /\\       ',
    '      /  \\      ',
    '    /=======\\   ',
    '   / | || | \\  ',
    '  /_|_||_||_|_\\ ',
    '      | || |    ',
    '      |====|    ',
    '     // || \\\\   ',
  ];

  const sysInfo = [
    `${T.title}${T.bold}BidiForge Engine Overview${T.reset}`,
    `${T.dim}Discovered Apps:${T.reset}  ${T.success}${appsCount} Electron Apps Detected${T.reset}`,
    `${T.dim}BiDi Engine:${T.reset}       ${T.text}v${VERSION} Subtree MutationObserver${T.reset}`,
    `${T.dim}Active Theme:${T.reset}      ${T.border}${themeEngine.getTheme().name || 'Cyberpunk Cyan'}${T.reset}`,
    `${T.dim}Developer:${T.reset}         ${T.title}${DEVELOPER}${T.reset}`,
  ];

  for (let i = 0; i < Math.max(logoArt.length, sysInfo.length); i++) {
    const left = logoArt[i] ? `${T.border}${logoArt[i]}${T.reset}` : '                ';
    const right = sysInfo[i] || '';
    console.log(`  ${left}   ${right}`);
  }

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
  const T = themeEngine.getTheme();
  
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
        console.log(`  ${T.warning}⚡ Terminating open process ${exe} to release file lock...${T.reset}`);
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
  const T = themeEngine.getTheme();
  
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
      console.log(`  ${T.border}🚀 Relaunching ${appInfo.name}...${T.reset}`);
      const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
      child.unref();
      console.log(`  ${T.success}✓ Patch Done & ${appInfo.name} Relaunched!${T.reset}\n`);
      beep();
    } else {
      console.log(`  ${T.success}✓ Patch Done!${T.reset}\n`);
      beep();
    }
  } catch (_) {
    console.log(`  ${T.success}✓ Patch Done!${T.reset}\n`);
    beep();
  }
}

/**
 * Main patch workflow with Animated Spinners & Safe Update Detection
 */
async function patch(target = null, relaunch = true, force = false) {
  logger.init();
  const T = themeEngine.getTheme();
  
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
    console.log(`${T.warning}✖ No matching Electron applications found.${T.reset}`);
    return { patched: 0, skipped: 0, failed: 0 };
  }
  
  const results = { patched: [], skipped: [], failed: [] };
  
  for (const appInfo of apps) {
    console.log(` ${T.bold}Target:${T.reset} ${T.text}${appInfo.name}${T.reset} (v${appInfo.version})`);
    
    const asarPath = path.join(appInfo.path, 'resources', 'app.asar');
    if (!fs.existsSync(asarPath)) {
      console.log(`  ${T.danger}✖ ASAR file not found for ${appInfo.name}${T.reset}`);
      results.failed.push(appInfo);
      continue;
    }

    const currentHash = detector.getFileHash(asarPath);
    const updateCheck = status.checkSafeUpdateStatus(appInfo.path, currentHash, appInfo.version, asarPath);

    if (updateCheck.state === 'PATCHED_VERIFIED' && !force) {
      console.log(`  ${T.warning}YES → Already patched (SHA-256 hash & file marker verified)${T.reset}\n`);
      results.skipped.push(appInfo);
      continue;
    }

    if (updateCheck.state === 'APP_UPDATED') {
      console.log(`  ${T.accent}⚡ Safe Update Detection: Application update detected for ${appInfo.name}!${T.reset}`);
      console.log(`  ${T.warning}🔄 Auto-Repair triggered: Re-analyzing and patching updated ASAR structure...${T.reset}`);
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
        console.log(`  ${T.success}✓ Successfully patched ${appInfo.name}!${T.reset}\n`);
      }
    } catch (e) {
      spinner.fail(`Failed to patch ${appInfo.name}: ${e.message}`);
      console.log('');
      results.failed.push(appInfo);
    } finally {
      if (tempDir) asar.cleanup(tempDir);
    }
  }
  
  const summaryRows = [
    { label: `${T.success}✓ Patched Applications:${T.reset}`, tag: `${T.bold}${results.patched.length}${T.reset}` },
    { label: `${T.warning}• Skipped (Patched):${T.reset}`, tag: `${T.bold}${results.skipped.length}${T.reset}` },
    { label: `${T.danger}✖ Failed Applications:${T.reset}`, tag: `${T.bold}${results.failed.length}${T.reset}` },
  ];
  printHermesCard(summaryRows, '⚙️ Patch Summary Report', 'All patched applications active with Arabic BiDi');
  console.log('');
  
  return results;
}

/**
 * Build option list with status tags for promptSelect
 */
function getAppSelectOptions(apps) {
  const T = themeEngine.getTheme();
  return apps.map((app) => {
    const asarPath = path.join(app.path, 'resources', 'app.asar');
    const currentHash = fs.existsSync(asarPath) ? detector.getFileHash(asarPath) : '';
    const updateCheck = status.checkSafeUpdateStatus(app.path, currentHash, app.version, asarPath);
    
    let tag = '';
    if (updateCheck.state === 'PATCHED_VERIFIED') {
      tag = `${T.success}✓ Compatible${T.reset}  ${T.border}★ (Patched)${T.reset}`;
    } else if (updateCheck.state === 'APP_UPDATED') {
      tag = `${T.accent}[VENDOR UPDATE DETECTED]${T.reset}  ${T.warning}⚡ Auto-Repair Ready${T.reset}`;
    } else {
      tag = `${T.success}✓ Compatible${T.reset}`;
    }
    
    return {
      label: `${app.name} (v${app.version})`,
      tag: tag,
      value: app,
    };
  });
}

/**
 * Interactive Application Scan & Arrow Key Selection Handler with Live Spinner Animation
 */
async function scan() {
  logger.init();
  const T = themeEngine.getTheme();
  
  // Display animated scanning indicator (⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ Scanning Electron Applications...)
  clearScreen();
  banner();
  const spinner = createSpinner('Scanning Electron Applications...');
  await new Promise(r => setTimeout(r, 600));
  const apps = detector.detectAll();
  _cachedAppsCount = apps.length; // Update cache after fresh scan
  spinner.succeed(`Found ${apps.length} Electron Application(s)!`);
  
  if (apps.length === 0) {
    console.log(`${T.warning}No Electron applications discovered on this system.${T.reset}`);
    return apps;
  }
  
  const appChoices = getAppSelectOptions(apps);
  appChoices.push({ label: '↩ Back to Main Menu', tag: '' });

  const selectedIdx = await promptSelect(appChoices, '⚙️ Discovered Applications & Interactive Selector', banner, `Current: ${apps.length} Electron Applications Discovered`);
  
  if (selectedIdx >= 0 && selectedIdx < apps.length) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await handleAppSelection(rl, apps[selectedIdx]);
    rl.close();
  }
  return apps;
}

/**
 * Run BiDi Diagnostic Health Inspector on target application(s)
 */
function runHealthInspection(target = null) {
  banner();
  const T = themeEngine.getTheme();
  console.log(`${T.border}• Running BiDi Diagnostic Health Inspector...${T.reset}\n`);
  
  let apps = detector.detectAll();
  if (target && typeof target === 'string') {
    apps = apps.filter(a => a.name.toLowerCase().includes(target.toLowerCase()) || a.path.toLowerCase().includes(target.toLowerCase()));
  } else if (target && typeof target === 'object' && target.path) {
    apps = [target];
  }

  if (apps.length === 0) {
    console.log(`${T.warning}✖ No applications found for health inspection.${T.reset}`);
    return;
  }

  for (const app of apps) {
    const report = inspector.inspectApp(app);
    const scoreColor = report.score >= 80 ? T.success : (report.score >= 50 ? T.warning : T.danger);

    const rows = [
      { label: `Health Score: ${scoreColor}${report.score}/100 (${report.grade})${T.reset}`, tag: `Status: ${scoreColor}${report.status}${T.reset}` },
      { label: `Inspected At: ${new Date(report.inspectedAt).toLocaleString()}` },
    ];

    report.checks.forEach(check => {
      const symbol = check.passed ? `${T.success}✓${T.reset}` : `${T.danger}✖${T.reset}`;
      rows.push({ label: `${symbol} ${T.bold}${check.name}:${T.reset} ${check.detail}` });
    });

    printHermesCard(rows, `🩺 BiDi Health Report: ${report.appName} (v${report.appVersion})`, 'High score indicates optimal Arabic RTL injection');
    console.log('');
  }
}

/**
 * Unified application selection handler
 */
async function handleAppSelection(rl, app) {
  if (!app) return;
  const T = themeEngine.getTheme();
  
  const asarPath = path.join(app.path, 'resources', 'app.asar');
  const currentHash = fs.existsSync(asarPath) ? detector.getFileHash(asarPath) : '';
  const updateCheck = status.checkSafeUpdateStatus(app.path, currentHash, app.version, asarPath);

  if (updateCheck.state === 'APP_UPDATED') {
    console.log(`\n  ${T.accent}${T.bold}⚡ Vendor Application Update Detected!${T.reset}`);
    console.log(`  ${T.text}${app.name}${T.reset} was updated by vendor (${updateCheck.oldVersion ? 'v' + updateCheck.oldVersion : 'older'} ➔ v${app.version}).`);
    if (updateCheck.patchedAt) {
      console.log(`  ${T.dim}Previous Patch Date: ${new Date(updateCheck.patchedAt).toLocaleString()}${T.reset}`);
    }
    console.log('');
    
    const choices = [
      '⚡ Run Auto-Repair & Re-patch Updated Version (Recommended)',
      '• Skip Patching For Now',
      '↩ Cancel / Back to Main Menu',
    ];
    const idx = await promptSelect(choices, `⚙️ Update Action: ${app.name}`, banner);
    if (idx === 0) {
      await patch(app, true, true);
    }
    return;
  }

  if (updateCheck.state === 'PATCHED_VERIFIED') {
    console.log(`\n  ${T.warning}${T.bold}YES → Already patched${T.reset}`);
    console.log(`  ${T.text}${app.name}${T.reset} (v${app.version}) is currently patched & verified.`);
    if (updateCheck.patchedAt) {
      console.log(`  ${T.dim}Patch Date: ${new Date(updateCheck.patchedAt).toLocaleString()}${T.reset}`);
    }
    console.log('');
    
    const choices = [
      '⚡ Force Re-patch (Apply fresh BiDi patch)',
      '🛡️ Rollback / Remove Patch (Restore original app backup)',
      '↩ Cancel / Back to Main Menu',
    ];
    const subChoice = await promptSelect(choices, `⚙️ Patched App Options: ${app.name}`, banner);
    if (subChoice === 0) {
      await patch(app, true, true);
    } else if (subChoice === 1) {
      rollbackApp(app.name);
    }
    return;
  }

  const running = isAppRunning(app);
  if (running) {
    console.log(`\n  ${T.warning}⚡ Notice: ${app.name} is currently running.${T.reset}`);
    console.log(`  ${T.dim}BidiForge will automatically terminate ${app.name}, apply the BiDi patch, and relaunch it.${T.reset}\n`);
  }

  const choices = [
    `🚀 Yes, apply BiDi patch to ${app.name}`,
    `↩ Cancel & Back to Main Menu`,
  ];
  const confirmIdx = await promptSelect(choices, `⚙️ Confirm Patch: ${app.name}`, banner);
  if (confirmIdx === 0) {
    await patch(app, true, false);
  }
}

/**
 * Patch custom path specified by user
 */
async function patchCustomPath(customPath) {
  const T = themeEngine.getTheme();
  if (!customPath || !fs.existsSync(customPath)) {
    console.log(`${T.danger}[X] ERROR: Specified path does not exist.${T.reset}`);
    return;
  }
  
  let appDir = customPath;
  if (customPath.endsWith('.asar')) {
    appDir = path.dirname(path.dirname(customPath));
  }
  
  const appInfo = detector.detectElectronApp(appDir);
  if (!appInfo) {
    console.log(`${T.danger}[X] ERROR: Could not detect valid Electron application structure at specified path.${T.reset}`);
    return;
  }
  
  console.log(`${T.success}✓ Compatible Electron Structure Detected: ${appInfo.name} (v${appInfo.version})${T.reset}`);
  await patch(appInfo, true, true);
}

/**
 * Rollback app
 */
function rollbackApp(targetApp) {
  logger.init();
  banner();
  const T = themeEngine.getTheme();
  
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
    console.log(`${T.success}✓ Successfully restored original backup for ${targetApp}!${T.reset}`);
    beep();
  } else {
    console.log(`${T.danger}[X] Rollback failed: ${res.error}${T.reset}`);
  }
}

/**
 * Cleanup temp files and old backups
 */
function cleanup() {
  logger.init();
  banner();
  const T = themeEngine.getTheme();
  
  console.log(`${T.border}• Cleaning up temporary workspaces & old backups...${T.reset}`);
  const res = backup.cleanup();
  console.log(`${T.success}✓ Cleaned obsolete backups (Kept: ${res.kept}).${T.reset}`);
  beep();
}

/**
 * Run diagnostic test suite
 */
function runTests() {
  banner();
  const T = themeEngine.getTheme();
  console.log(`${T.border}• Running Automated Test Suite...${T.reset}`);
  try {
    execSync('node tests/runner.js', { stdio: 'inherit' });
  } catch (e) {
    console.log(`${T.danger}[X] Diagnostic tests failed.${T.reset}`);
  }
}

/**
 * Theme selection handler
 */
async function handleThemeSelection() {
  banner();
  const T = themeEngine.getTheme();
  const themes = themeEngine.listThemes();
  const choices = themes.map(t => ({
    label: t.name,
    tag: t.active ? `${T.success}★ Active${T.reset}` : '',
    value: t.key,
  }));
  choices.push({ label: '↩ Back to Main Menu', tag: '' });

  const idx = await promptSelect(choices, '🎨 Theme Switcher — Select Color Palette', banner);
  if (idx >= 0 && idx < themes.length) {
    themeEngine.setTheme(themes[idx].key);
    console.log(`\n  ${themeEngine.getTheme().success}✓ Theme changed to ${themes[idx].name}!${themeEngine.getTheme().reset}\n`);
    beep();
  }
}

/**
 * Prompt question helper for readline
 */
function askQuestion(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Interactive Menu Workflow with Arrow Key Keyboard Cursor Navigation ONLY
 */
async function interactiveMenu() {
  const menuOptions = [
    '⚡ Fast Scan & List Compatible Applications',
    '⚙️ Select Applications to Patch (Multi-Checkboxes [x])',
    '🚀 Patch ALL Discovered Applications',
    '🔍 Search Application by Name',
    '📂 Patch Custom Application Path (Enter Path)',
    '🛡️ Rollback Application (Restore Original Backup)',
    '🩺 Run BiDi Diagnostic Health Inspector (--health)',
    '🔄 Live Hot-Reload Watcher Engine (--watch)',
    '🖱️ Register Windows Explorer Context Menu (Right-Click Patch)',
    '📦 Snapshot Restore Vault Manager (Multi-Version Rollback)',
    '🧹 Clean Temporary Files & Prune Old Backups',
    '🧪 Run Diagnostic Test Suite',
    '🎨 Change CLI Color Theme Palette',
    '❌ Exit BidiForge',
  ];

  let running = true;
  while (running) {
    const selectedIdx = await promptSelect(menuOptions, '⚙️ BidiForge Main Menu — Select Option', banner, 'Current: 6 Electron Applications Discovered');
    
    if (selectedIdx === -1 || selectedIdx === 13) {
      running = false;
      console.log(`\n${themeEngine.getTheme().border}Thank you for using BidiForge!${themeEngine.getTheme().reset}`);
      break;
    }
    
    switch (selectedIdx) {
      case 0: { // Interactive Animated Scan & Direct Selector
        await scan();
        break;
      }
        
      case 1: { // Interactive Multi-Select Checkbox App Selection
        banner();
        const apps = detector.detectAll();
        if (apps.length > 0) {
          const appChoices = getAppSelectOptions(apps);
          const selectedApps = await promptMultiSelect(appChoices, '⚙️ Select Applications to Patch', banner);
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
        const nameQuery = (await askQuestion(rl, `\n${themeEngine.getTheme().warning}Enter application name to search (e.g. discord, slack, obsidian): ${themeEngine.getTheme().reset}`)).trim();
        if (nameQuery) {
          const apps = detector.detectAll().filter(a => a.name.toLowerCase().includes(nameQuery.toLowerCase()));
          if (apps.length > 0) {
            await handleAppSelection(rl, apps[0]);
          } else {
            console.log(`${themeEngine.getTheme().danger}[X] No matching applications found for "${nameQuery}".${themeEngine.getTheme().reset}`);
          }
        }
        rl.close();
        break;
      }
      
      case 4: { // Custom Path
        banner();
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const customPath = (await askQuestion(rl, `\n${themeEngine.getTheme().warning}Enter direct application folder or ASAR file path: ${themeEngine.getTheme().reset}`)).trim();
        if (customPath) await patchCustomPath(customPath);
        rl.close();
        break;
      }
      
      case 5: { // Rollback
        banner();
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const appName = (await askQuestion(rl, `\n${themeEngine.getTheme().warning}Enter application name or path to rollback: ${themeEngine.getTheme().reset}`)).trim();
        if (appName) rollbackApp(appName);
        rl.close();
        break;
      }
      
      case 6: // Health
        runHealthInspection();
        break;

      case 7: { // Watch
        banner();
        const apps = detector.detectAll();
        if (apps.length > 0) {
          const appChoices = getAppSelectOptions(apps);
          const appIdx = await promptSelect(appChoices, '⚙️ Select Application for Live Hot-Reload Watcher', banner);
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
          console.log(`\n${themeEngine.getTheme().success}✓ ${regRes.message}${themeEngine.getTheme().reset}`);
          beep();
        } else {
          console.log(`\n${themeEngine.getTheme().danger}✖ Registration failed: ${regRes.error}${themeEngine.getTheme().reset}`);
        }
        break;
      }

      case 9: { // Vault Manager
        banner();
        const snapshots = vault.listSnapshots();
        const rows = snapshots.map((s) => ({
          label: `${themeEngine.getTheme().text}${themeEngine.getTheme().bold}${s.appName}${themeEngine.getTheme().reset} (v${s.appVersion})`,
          tag: `${themeEngine.getTheme().warning}${s.id}${themeEngine.getTheme().reset}`,
        }));
        printHermesCard(rows, `📦 Vault Snapshot Registry (${snapshots.length} snapshots)`, 'Use "node index.js vault restore <id>" to restore any snapshot');
        printPromptBar('Use vault restore command to roll back to any historical snapshot');
        break;
      }

      case 10: // Cleanup
        cleanup();
        break;

      case 11: // Tests
        runTests();
        break;

      case 12: // Theme
        await handleThemeSelection();
        break;
    }
    
    if (running) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await askQuestion(rl, `\n${themeEngine.getTheme().dim}Press Enter to return to main menu...${themeEngine.getTheme().reset}`);
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
        await scan();
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

      case 'theme':
        if (args[1]) {
          if (themeEngine.setTheme(args[1])) {
            console.log(`✓ Theme updated to ${args[1]}`);
          } else {
            console.log(`✖ Unknown theme. Available: ${themeEngine.listThemes().map(t=>t.key).join(', ')}`);
          }
        } else {
          await handleThemeSelection();
        }
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
            console.log(`${themeEngine.getTheme().success}✓ Restored snapshot ${res.snapshot.id} for ${res.snapshot.appName}!${themeEngine.getTheme().reset}`);
            beep();
          } else {
            console.log(`${themeEngine.getTheme().danger}✖ Vault restoration failed: ${res.error}${themeEngine.getTheme().reset}`);
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
        await scan();
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
        console.log('  theme [name]        Switch CLI color palette theme');
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
