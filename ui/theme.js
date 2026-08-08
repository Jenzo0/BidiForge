/**
 * BidiForge — Custom CLI Theme Engine (v3.4 Engine)
 * Manages color palettes, active theme selection, and persistence
 * 
 * @version 3.4.0
 * @author Jenzo0
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.bidiforge', 'config.json');

// Base ANSI Color Palette Definitions
const THEMES = {
  cyberpunk: {
    name: 'Cyberpunk Cyan (Default)',
    border: '\x1b[36;1m',   // Cyan
    title: '\x1b[33;1m',    // Gold/Yellow
    text: '\x1b[37;1m',     // White
    dim: '\x1b[2m',         // Dimmed
    accent: '\x1b[35;1m',   // Magenta
    success: '\x1b[32;1m',  // Green
    warning: '\x1b[33;1m',  // Yellow
    danger: '\x1b[31;1m',   // Red
    reset: '\x1b[0m',
    bold: '\x1b[1m',
  },
  matrix: {
    name: 'Neon Emerald Matrix',
    border: '\x1b[32;1m',   // Green
    title: '\x1b[36;1m',    // Cyan
    text: '\x1b[37;1m',     // White
    dim: '\x1b[2m',
    accent: '\x1b[33;1m',   // Gold
    success: '\x1b[32;1m',  // Green
    warning: '\x1b[33;1m',
    danger: '\x1b[31;1m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
  },
  dracula: {
    name: 'Dracula Purple',
    border: '\x1b[35;1m',   // Magenta/Purple
    title: '\x1b[36;1m',    // Cyan
    text: '\x1b[37;1m',     // White
    dim: '\x1b[2m',
    accent: '\x1b[33;1m',   // Yellow
    success: '\x1b[32;1m',  // Green
    warning: '\x1b[33;1m',
    danger: '\x1b[31;1m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
  },
  amber: {
    name: 'Gold Amber',
    border: '\x1b[33;1m',   // Gold/Amber
    title: '\x1b[36;1m',    // Cyan
    text: '\x1b[37;1m',     // White
    dim: '\x1b[2m',
    accent: '\x1b[35;1m',   // Purple
    success: '\x1b[32;1m',  // Green
    warning: '\x1b[33;1m',
    danger: '\x1b[31;1m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
  },
};

let currentThemeKey = 'cyberpunk';

/**
 * Load saved theme configuration from disk
 */
function loadThemeConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (data.theme && THEMES[data.theme]) {
        currentThemeKey = data.theme;
      }
    }
  } catch (_) {}
}

/**
 * Save theme preference to disk
 */
function saveThemeConfig(themeKey) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ theme: themeKey }, null, 2));
  } catch (_) {}
}

/**
 * Set current active theme
 */
function setTheme(themeKey) {
  if (THEMES[themeKey]) {
    currentThemeKey = themeKey;
    saveThemeConfig(themeKey);
    return true;
  }
  return false;
}

/**
 * Get active theme color palette
 */
function getTheme() {
  return THEMES[currentThemeKey] || THEMES.cyberpunk;
}

/**
 * Get list of available themes
 */
function listThemes() {
  return Object.keys(THEMES).map(key => ({
    key,
    name: THEMES[key].name,
    active: key === currentThemeKey,
  }));
}

loadThemeConfig();

module.exports = {
  getTheme,
  setTheme,
  listThemes,
  THEMES,
};
