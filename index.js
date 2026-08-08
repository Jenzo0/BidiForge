/**
 * BidiForge — Main CLI Entry (v3.0 Engine)
 * Universal BiDi Compatibility Layer for Electron
 * 
 * @version 3.0.0
 * @author Jenzo
 */

const path = require('path');
const detector = require('./core/detector');
const classifier = require('./core/classifier');
const asar = require('./patcher/asar');
const backup = require('./patcher/backup');
const injector = require('./patcher/injector');
const status = require('./core/status');
const logger = require('./core/logger');

const VERSION = '3.0.0';

/**
 * Print banner
 */
function banner() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║            B I D I F O R G E              ║');
  console.log('║   Universal BiDi Compatibility Layer      ║');
  console.log('║           Version ' + VERSION + '                    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
}

/**
 * Main patch workflow
 */
async function patch(targetApp = null) {
  logger.init();
  banner();
  
  logger.info('Starting Universal Electron application scan...');
  
  let apps = detector.detectAll();
  if (targetApp) {
    apps = apps.filter(a => a.name.toLowerCase().includes(targetApp.toLowerCase()) || a.path.toLowerCase().includes(targetApp.toLowerCase()));
  }
  
  if (apps.length === 0) {
    logger.warn('No matching Electron applications found');
    return { patched: 0, skipped: 0, failed: 0 };
  }
  
  logger.info(`Found ${apps.length} Electron application(s)`);
  console.log('');
  
  const results = {
    patched: [],
    skipped: [],
    failed: [],
  };
  
  for (const app of apps) {
    console.log(`--------------------------------------------`);
    console.log(` Target: ${app.displayName} (v${app.version})`);
    console.log(` Path:   ${app.path}`);
    
    // Check if running
    if (app.isRunning) {
      logger.warn(`Application is currently running (${app.processName}). Please close it to patch.`);
      results.skipped.push({ app, reason: 'Application is running' });
      console.log('');
      continue;
    }
    
    // Check if re-patch is needed
    if (!status.needsRepatch(app.path, app.hash)) {
      logger.info(`Application is already patched with latest hash: ${app.displayName}`);
      results.skipped.push({ app, reason: 'Already patched' });
      console.log('');
      continue;
    }
    
    let extractResult = null;
    let backupResult = null;
    
    try {
      // Step 1: Extract to temp workspace
      logger.info('[1/6] Extracting ASAR workspace...');
      extractResult = await asar.extract(app.asarPath);
      if (!extractResult.success) {
        throw new Error('Failed to extract ASAR: ' + extractResult.error);
      }
      
      // Step 2: Classify runtime structure
      logger.info('[2/6] Analyzing application structure...');
      const classification = classifier.classify(extractResult.tempPath);
      if (classification.confidence < 50) {
        asar.cleanup(extractResult.tempPath);
        status.setUnsupported(app.path, app, 'Low classification confidence');
        results.skipped.push({ app, reason: 'Unsupported structure' });
        console.log('');
        continue;
      }
      
      // Step 3: Create safe SHA-256 backup
      logger.info('[3/6] Creating SHA-256 backup...');
      backupResult = backup.create(app.asarPath, app);
      if (!backupResult.success) {
        throw new Error('Failed to create backup: ' + backupResult.error);
      }
      
      // Step 4: Inject aggregated BiDi rules & profile
      logger.info('[4/6] Injecting BiDi engine...');
      const injectResult = injector.inject(extractResult.tempPath, app);
      if (!injectResult.success) {
        backup.restore(backupResult.backupName, app.asarPath);
        asar.cleanup(extractResult.tempPath);
        throw new Error('Injection failed: ' + injectResult.error);
      }
      
      // Step 5: Repack ASAR atomically
      logger.info('[5/6] Repacking ASAR package atomically...');
      const packResult = await asar.pack(extractResult.tempPath, app.asarPath);
      if (!packResult.success) {
        backup.restore(backupResult.backupName, app.asarPath);
        throw new Error('Repack failed: ' + packResult.error);
      }
      
      // Step 6: Verify ASAR integrity
      logger.info('[6/6] Verifying patched ASAR integrity...');
      const validationResult = asar.validate(app.asarPath);
      if (!validationResult.valid) {
        backup.restore(backupResult.backupName, app.asarPath);
        throw new Error('ASAR validation failed: ' + validationResult.error);
      }
      
      // Clean temporary extraction files
      asar.cleanup(extractResult.tempPath);
      
      // Update status registry
      const newHash = asar.hash(app.asarPath);
      status.setPatched(app.path, app, {
        hash: newHash,
        backup: backupResult.backupName,
      });
      
      logger.success(`Successfully patched ${app.displayName}!`);
      results.patched.push({ app, injectResult });
      
    } catch (e) {
      if (extractResult && extractResult.tempPath) {
        asar.cleanup(extractResult.tempPath);
      }
      logger.error(`Failed to patch ${app.displayName}: ${e.message}`);
      results.failed.push({ app, error: e.message });
    }
    console.log('');
  }
  
  // Summary report
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
 * Scan only and display status table
 */
function scan() {
  logger.init();
  banner();
  
  logger.info('Scanning for Electron applications...');
  console.log('');
  
  const apps = detector.detectAll();
  if (apps.length === 0) {
    logger.warn('No Electron applications found');
    return [];
  }
  
  console.log('Detected Applications:');
  console.log('────────────────────────────────────────────');
  
  for (const app of apps) {
    const statusInfo = status.get(app.path);
    const statusStr = statusInfo ? statusInfo.status : 'NEW';
    const runningStr = app.isRunning ? ' [RUNNING]' : '';
    
    console.log(`  ${statusStr.padEnd(12)} ${app.displayName} v${app.version}${runningStr}`);
    console.log(`              ${app.path}`);
    console.log('');
  }
  
  console.log('────────────────────────────────────────────');
  console.log(`Total: ${apps.length} application(s) detected`);
  console.log('');
  
  return apps;
}

/**
 * Rollback an app
 */
function rollbackApp(appPath) {
  logger.init();
  banner();
  
  logger.info(`Initiating rollback for: ${appPath}`);
  const result = backup.rollback(appPath);
  
  if (result.success) {
    status.setUnpatched(appPath, { name: path.basename(appPath), version: 'unknown' });
    logger.success('Rollback completed successfully');
  } else {
    logger.error('Rollback failed: ' + result.error);
  }
  return result;
}

/**
 * Clean temp files and old backups
 */
function cleanup() {
  logger.init();
  banner();
  
  logger.info('Cleaning up temporary workspaces & old backups...');
  
  const tempDir = process.env.TEMP || '/tmp';
  const fs = require('fs');
  let tempCleaned = 0;
  
  try {
    const entries = fs.readdirSync(tempDir);
    for (const entry of entries) {
      if (entry.startsWith('bidiforge-')) {
        try {
          fs.rmSync(path.join(tempDir, entry), { recursive: true, force: true });
          tempCleaned++;
        } catch (e) {}
      }
    }
  } catch (e) {}
  
  const backupResult = backup.cleanup(2);
  logger.success(`Cleaned ${tempCleaned} temporary workspace(s) and pruned ${backupResult.deleted.length} obsolete backup(s).`);
  
  return { temp: tempCleaned, backups: backupResult.deleted.length };
}

// CLI Command Parser
const args = process.argv.slice(2);
const command = args[0] || 'patch';

(async () => {
  try {
    switch (command) {
      case 'scan':
      case '--scan':
      case '-s':
        scan();
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
        scan();
        break;
        
      case 'repair':
      case '--repair':
        await patch(args[1]);
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
