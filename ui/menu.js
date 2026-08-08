/**
 * BidiForge — Hermes-Agent Inspired Full-TUI Engine (v3.6 Engine)
 * Sleek divider line layout (Zero box side walls), erased scrollback buffer, & Arrow key navigation ONLY
 * 
 * @version 3.6.0
 * @author Jenzo0
 */

const readline = require('readline');
const themeEngine = require('./theme');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const DEFAULT_WIDTH = 76;

/**
 * Wipe terminal screen AND scrollback buffer completely to prevent infinite scroll artifacts
 */
function clearScreen() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
  } else {
    console.clear();
  }
}

/**
 * Strip ANSI escape codes from string
 * @param {string} str - String with ANSI codes
 * @returns {string} Clean string
 */
function stripAnsi(str) {
  return (str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Get accurate visual width of string taking ANSI codes, emoji, and surrogate pairs into account
 * @param {string} str - String to measure
 * @returns {number} Display column width
 */
function getVisualWidth(str) {
  const clean = stripAnsi(str);
  let w = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDBFF) {
      w += 2;
      i++; // Skip low surrogate
    } else if (code > 0x2000) {
      w += 2; // Multi-byte emoji or wide symbol
    } else {
      w += 1;
    }
  }
  return w;
}

/**
 * Format a single clean line with left label & right-aligned status badge (No side box walls)
 * @param {string} label - Left label text
 * @param {string} tag - Right badge text
 * @param {number} width - Row width
 * @returns {string} Formatted line
 */
function formatRow(label = '', tag = '', width = DEFAULT_WIDTH) {
  const visLabel = getVisualWidth(label);
  const visTag = getVisualWidth(tag);
  
  if (tag) {
    const padLen = Math.max(1, width - visLabel - visTag - 2);
    return `  ${label}${' '.repeat(padLen)}${tag}`;
  } else {
    return `  ${label}`;
  }
}

/**
 * Print sleek horizontal divider sections (No box side walls)
 */
function printHeader(title = '') {
  const T = themeEngine.getTheme();
  console.log(`${T.border}════════════════════════════════════════════════════════════════════════════${T.reset}`);
  if (title) {
    console.log(`  ${T.title}${T.bold}${title}${T.reset}`);
    console.log(`${T.border}────────────────────────────────────────────────────────────────────────────${T.reset}`);
  }
}

function printFooter(tipText = '') {
  const T = themeEngine.getTheme();
  if (tipText) {
    console.log(`${T.border}────────────────────────────────────────────────────────────────────────────${T.reset}`);
    console.log(`  ${T.title}💡 Tip:${T.reset} ${T.dim}${tipText}${T.reset}`);
  }
  console.log(`${T.border}════════════════════════════════════════════════════════════════════════════${T.reset}`);
}

/**
 * Interactive Arrow-Key Menu Selector with Live Search (/ key) - Zero Box Walls
 * @param {Array} options - List of string options or objects { label, tag, value }
 * @param {string} promptText - Prompt header title
 * @param {function} headerFn - Banner callback
 * @param {string} tipText - Footer shortcut tips
 * @returns {Promise<number>} Selected index
 */
function promptSelect(options, promptText = 'Select an option using ↑/↓ arrows and press Enter:', headerFn = null, tipText = 'Use ↑/↓ Arrow Keys, / to search, Enter to select, Esc to back') {
  return new Promise(resolve => {
    let selectedIndex = 0;
    let searchQuery = '';
    let isSearchMode = false;
    const T = themeEngine.getTheme();

    if (!process.stdin.isTTY) {
      resolve(0);
      return;
    }

    process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();

    function getFilteredOptions() {
      if (!searchQuery) return options.map((opt, idx) => ({ opt, originalIndex: idx }));
      const q = searchQuery.toLowerCase();
      return options
        .map((opt, idx) => ({ opt, originalIndex: idx }))
        .filter(item => {
          const label = typeof item.opt === 'string' ? item.opt : item.opt.label;
          return label.toLowerCase().includes(q);
        });
    }

    function render() {
      clearScreen();
      if (typeof headerFn === 'function') {
        headerFn();
      }

      printHeader(promptText);

      if (isSearchMode) {
        console.log(`  ${T.title}/ Search Filter:${T.reset} ${T.bold}${searchQuery}_${T.reset}`);
        console.log(`${T.border}────────────────────────────────────────────────────────────────────────────${T.reset}`);
      }

      const filtered = getFilteredOptions();
      if (filtered.length === 0) {
        console.log(`  ${T.warning}✖ No items matching "${searchQuery}"${T.reset}`);
      } else {
        if (selectedIndex >= filtered.length) selectedIndex = 0;
        filtered.forEach((item, idx) => {
          const rawLabel = typeof item.opt === 'string' ? item.opt : item.opt.label;
          // Strip legacy numbers [1], [2] to guarantee 100% arrow-key only navigation
          const cleanLabel = rawLabel.replace(/^⚡\s*\[\d+\]\s*/, '⚡ ').replace(/^⚙️\s*\[\d+\]\s*/, '⚙️ ').replace(/^🚀\s*\[\d+\]\s*/, '🚀 ').replace(/^🔍\s*\[\d+\]\s*/, '🔍 ').replace(/^📂\s*\[\d+\]\s*/, '📂 ').replace(/^🛡️\s*\[\d+\]\s*/, '🛡️ ').replace(/^🩺\s*\[\d+\]\s*/, '🩺 ').replace(/^🔄\s*\[\d+\]\s*/, '🔄 ').replace(/^🖱️\s*\[\d+\]\s*/, '🖱️ ').replace(/^📦\s*\[\d+\]\s*/, '📦 ').replace(/^🧹\s*\[\d+\]\s*/, '🧹 ').replace(/^🧪\s*\[\d+\]\s*/, '🧪 ').replace(/^🎨\s*\[\d+\]\s*/, '🎨 ').replace(/^❌\s*\[\d+\]\s*/, '❌ ').replace(/^\[\d+\]\s*/, '');
          const tag = (typeof item.opt === 'object' && item.opt.tag) ? item.opt.tag : '';

          if (idx === selectedIndex) {
            const selLabel = `${T.bgActive} ❯ ${cleanLabel} ${T.reset}`;
            console.log(formatRow(selLabel, tag));
          } else {
            const dimLabel = `   ${T.dim}${cleanLabel}${T.reset}`;
            console.log(formatRow(dimLabel, tag));
          }
        });
      }

      printFooter(isSearchMode ? 'Type to filter, Backspace to delete, Esc to exit search' : tipText);
    }

    render();

    function onKeypress(str, key) {
      if (!key) return;

      const filtered = getFilteredOptions();

      if (isSearchMode) {
        if (key.name === 'escape') {
          isSearchMode = false;
          searchQuery = '';
          render();
        } else if (key.name === 'backspace') {
          searchQuery = searchQuery.slice(0, -1);
          if (searchQuery.length === 0) isSearchMode = false;
          selectedIndex = 0;
          render();
        } else if (key.name === 'return') {
          if (filtered.length > 0 && selectedIndex < filtered.length) {
            cleanup();
            resolve(filtered[selectedIndex].originalIndex);
          }
        } else if (key.name === 'up') {
          if (filtered.length > 0) selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
          render();
        } else if (key.name === 'down') {
          if (filtered.length > 0) selectedIndex = (selectedIndex + 1) % filtered.length;
          render();
        } else if (str && str.length === 1 && !key.ctrl && !key.meta) {
          searchQuery += str;
          selectedIndex = 0;
          render();
        }
        return;
      }

      if (key.name === 'up') {
        if (filtered.length > 0) selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
        render();
      } else if (key.name === 'down') {
        if (filtered.length > 0) selectedIndex = (selectedIndex + 1) % filtered.length;
        render();
      } else if (str === '/') {
        isSearchMode = true;
        searchQuery = '';
        render();
      } else if (key.name === 'return') {
        if (filtered.length > 0 && selectedIndex < filtered.length) {
          cleanup();
          resolve(filtered[selectedIndex].originalIndex);
        }
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        if (key.ctrl && key.name === 'c') process.exit();
        resolve(-1);
      }
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress);
      try { process.stdin.setRawMode(false); } catch (_) {}
      process.stdin.pause();
    }

    process.stdin.on('keypress', onKeypress);
  });
}

/**
 * Multi-Selection Checkbox Selector ([ ] / [x]) with Arrow Keys, Space to toggle, Enter to confirm
 * @param {Array} options - List of options { label, tag, value }
 * @param {string} promptText - Prompt header title
 * @param {function} headerFn - Banner callback
 * @returns {Promise<Array>} Selected objects
 */
function promptMultiSelect(options, promptText = 'Select applications to patch (Space to toggle, Enter to confirm):', headerFn = null) {
  return new Promise(resolve => {
    let cursor = 0;
    const checkedState = options.map(() => false);
    const T = themeEngine.getTheme();

    if (!process.stdin.isTTY) {
      resolve(options.map(o => o.value || o));
      return;
    }

    process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();

    function render() {
      clearScreen();
      if (typeof headerFn === 'function') headerFn();

      printHeader(promptText);

      options.forEach((opt, idx) => {
        const rawLabel = typeof opt === 'string' ? opt : opt.label;
        const cleanLabel = rawLabel.replace(/^\[\d+\]\s*/, '');
        const tag = (typeof opt === 'object' && opt.tag) ? opt.tag : '';
        const isChecked = checkedState[idx];
        const checkMark = isChecked ? `${T.success}[x]${T.reset}` : `${T.dim}[ ]${T.reset}`;

        if (idx === cursor) {
          const lineText = `${T.bgActive} ❯ ${checkMark} ${cleanLabel} ${T.reset}`;
          console.log(formatRow(lineText, tag));
        } else {
          const lineText = `   ${checkMark} ${T.dim}${cleanLabel}${T.reset}`;
          console.log(formatRow(lineText, tag));
        }
      });

      printFooter('Use ↑/↓ to navigate, Space to toggle [x], Enter to confirm, Esc to back');
    }

    render();

    function onKeypress(str, key) {
      if (!key) return;

      if (key.name === 'up') {
        cursor = (cursor - 1 + options.length) % options.length;
        render();
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % options.length;
        render();
      } else if (key.name === 'space') {
        checkedState[cursor] = !checkedState[cursor];
        render();
      } else if (key.name === 'return') {
        cleanup();
        const selectedValues = options.filter((_, i) => checkedState[i]).map(o => o.value || o);
        resolve(selectedValues);
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        if (key.ctrl && key.name === 'c') process.exit();
        resolve([]);
      }
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress);
      try { process.stdin.setRawMode(false); } catch (_) {}
      process.stdin.pause();
    }

    process.stdin.on('keypress', onKeypress);
  });
}

/**
 * Animated CLI Spinner helper
 */
function createSpinner(text = 'Processing...') {
  let frameIdx = 0;
  let currentText = text;
  let timer = null;
  const T = themeEngine.getTheme();

  if (process.stdout.isTTY) {
    timer = setInterval(() => {
      const frame = SPINNER_FRAMES[frameIdx % SPINNER_FRAMES.length];
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`  ${T.border}${frame}${T.reset} ${currentText}`);
      frameIdx++;
    }, 80);
  }

  return {
    update: (newText) => { currentText = newText; },
    stop: () => {
      if (timer) clearInterval(timer);
      if (process.stdout.isTTY) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      }
    },
    succeed: (msg) => {
      if (timer) clearInterval(timer);
      if (process.stdout.isTTY) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      }
      console.log(`  ${T.success}✓${T.reset} ${msg || currentText}`);
      beep();
    },
    fail: (msg) => {
      if (timer) clearInterval(timer);
      if (process.stdout.isTTY) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      }
      console.log(`  ${T.danger}✖${T.reset} ${msg || currentText}`);
    },
  };
}

/**
 * System audio chime notification beep
 */
function beep() {
  try {
    process.stdout.write('\u0007');
  } catch (_) {}
}

module.exports = {
  promptSelect,
  promptMultiSelect,
  createSpinner,
  formatRow,
  printHeader,
  printFooter,
  clearScreen,
  stripAnsi,
  getVisualWidth,
  beep,
  C: themeEngine.getTheme(),
};
