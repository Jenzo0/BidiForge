/**
 * BidiForge — Logger
 * Structured logging system
 * 
 * @version 4.0.2
 * @author Jenzo
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

let currentSession = null;

/**
 * Initialize logging
 */
function init() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  currentSession = `session-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
}

/**
 * Log message
 */
function log(level, message, data = {}) {
  if (!currentSession) init();
  
  const timestamp = new Date().toISOString();
  
  const line = `[${timestamp}] [${level}] ${message}` + 
    (Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : '') + '\n';
  
  const logPath = path.join(LOGS_DIR, currentSession);
  fs.appendFileSync(logPath, line);
  
  // Also output to console
  const prefix = level === 'ERROR' ? '✗' : level === 'WARN' ? '⚠' : level === 'SUCCESS' ? '✓' : '•';
  console.log(`${prefix} ${message}`);
}

function info(message, data) { log('INFO', message, data); }
function success(message, data) { log('SUCCESS', message, data); }
function warn(message, data) { log('WARN', message, data); }
function error(message, data) { log('ERROR', message, data); }

function getLogPath() {
  return currentSession ? path.join(LOGS_DIR, currentSession) : null;
}

module.exports = {
  init,
  log,
  info,
  success,
  warn,
  error,
  getLogPath,
  LOGS_DIR,
};
