/**
 * BidiForge — Hermes Agent Card TUI Engine (v3.7 Engine)
 * Rounded embedded-title cards (╭─ Title ───╮), erased scrollback buffer, & Arrow key navigation ONLY
 * 
 * @version 3.7.0
 * @author Jenzo0
 */

const readline = require('readline');
const themeEngine = require('./theme');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const DEFAULT_CARD_WIDTH = 64;

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
 * Format a single line enclosed inside a Hermes rounded card container
 * @param {string} leftText - Left text content
 * @param {string} rightTag - Optional right-aligned status badge
 * @param {number} width - Card width
 * @returns {string} Formatted card line
 */
function formatCardRow(leftText = '', rightTag = '', width = DEFAULT_CARD_WIDTH) {
  const T = themeEngine.getTheme();
  const visLeft = getVisualWidth(leftText);
  const visRight = getVisualWidth(rightTag);
  
  if (rightTag) {
    const totalVis = visLeft + visRight;
    const padLen = Math.max(1, width - 4 - totalVis);
    return `${T.border}│${T.reset} ${leftText}${' '.repeat(padLen)}${rightTag} ${T.border}│${T.reset}`;
  } else {
    const padLen = Math.max(0, width - 4 - visLeft);
    return `${T.border}│${T.reset} ${leftText}${' '.repeat(padLen)} ${T.border}│${T.reset}`;
  }
}

/**
 * Print Hermes Agent Rounded Card Container with embedded title (╭─ Title ───╮)
 * @param {Array} rows - Array of row objects { label/text, tag } or strings
 * @param {string} title - Embedded title text
 * @param {string} subtitle - Optional current state / subtitle line
 * @param {number} cardWidth - Target card width
 */
function printHermesCard(rows = [], title = '', subtitle = '', cardWidth = DEFAULT_CARD_WIDTH) {
  const T = themeEngine.getTheme();
  
  // Calculate top border length
  const visTitle = getVisualWidth(title);
  const topBarLen = Math.max(2, cardWidth - 5 - visTitle);
  const topLine = `${T.border}╭─ ${T.reset}${T.title}${T.bold}${title}${T.reset} ${T.border}${'─'.repeat(topBarLen)}╮${T.reset}`;
  const botLine = `${T.border}╰${'─'.repeat(cardWidth - 2)}╯${T.reset}`;

  console.log(topLine);

  if (subtitle) {
    console.log(formatCardRow(`${T.dim}${subtitle}${T.reset}`, '', cardWidth));
    console.log(formatCardRow('', '', cardWidth));
  }

  rows.forEach(row => {
    if (typeof row === 'object') {
      console.log(formatCardRow(row.text || row.label || '', row.tag || '', cardWidth));
    } else {
      console.log(formatCardRow(row, '', cardWidth));
    }
  });

  console.log(botLine);
}

/**
 * Print sleek bottom prompt input bar (❯ |)
 */
function printPromptBar(tipText = '') {
  const T = themeEngine.getTheme();
  console.log('');
  if (tipText) {
    console.log(`${T.dim}✦ Tip: ${tipText}${T.reset}`);
  }
  console.log(`${T.border}────────────────────────────────────────────────────────────────────────────${T.reset}`);
  console.log(`${T.title}${T.bold}❯${T.reset} ${T.dim}|${T.reset}`);
}

/**
 * Interactive Hermes Card Selector (↑ Up / ↓ Down / Enter / Esc / Live Search /)
 * Enforces Arrow key cursor navigation ONLY (No numbers)
 * @param {Array} options - List of string options or objects { label, tag, value }
 * @param {string} promptText - Card title
 * @param {function} headerFn - Banner callback
 * @param {string} subtitleText - Card subtitle state
 * @returns {Promise<number>} Selected index
 */
function promptSelect(options, promptText = 'BidiForge Selection Menu', headerFn = null, subtitleText = '') {
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

      const filtered = getFilteredOptions();
      const rows = [];

      if (isSearchMode) {
        rows.push({
          label: `${T.title}/ Filter:${T.reset} ${T.bold}${searchQuery}_${T.reset}`,
          tag: `${T.dim}(Esc clear)${T.reset}`,
        });
        rows.push({ label: '' });
      }

      if (filtered.length === 0) {
        rows.push({ label: `${T.warning}✖ No items matching "${searchQuery}"${T.reset}` });
      } else {
        if (selectedIndex >= filtered.length) selectedIndex = 0;
        filtered.forEach((item, idx) => {
          const rawLabel = typeof item.opt === 'string' ? item.opt : item.opt.label;
          // Strip out legacy numbers [1], [2] to ensure 100% arrow key navigation only
          const cleanLabel = rawLabel.replace(/^⚡\s*\[\d+\]\s*/, '⚡ ').replace(/^⚙️\s*\[\d+\]\s*/, '⚙️ ').replace(/^🚀\s*\[\d+\]\s*/, '🚀 ').replace(/^🔍\s*\[\d+\]\s*/, '🔍 ').replace(/^📂\s*\[\d+\]\s*/, '📂 ').replace(/^🛡️\s*\[\d+\]\s*/, '🛡️ ').replace(/^🩺\s*\[\d+\]\s*/, '🩺 ').replace(/^🔄\s*\[\d+\]\s*/, '🔄 ').replace(/^🖱️\s*\[\d+\]\s*/, '🖱️ ').replace(/^📦\s*\[\d+\]\s*/, '📦 ').replace(/^🧹\s*\[\d+\]\s*/, '🧹 ').replace(/^🧪\s*\[\d+\]\s*/, '🧪 ').replace(/^🎨\s*\[\d+\]\s*/, '🎨 ').replace(/^❌\s*\[\d+\]\s*/, '❌ ').replace(/^\[\d+\]\s*/, '');
          const tag = (typeof item.opt === 'object' && item.opt.tag) ? item.opt.tag : '';

          if (idx === selectedIndex) {
            const selLabel = `${T.title}${T.bold}❯ ${cleanLabel}${T.reset}`;
            rows.push({ label: selLabel, tag });
          } else {
            const dimLabel = `  ${T.text}${cleanLabel}${T.reset}`;
            rows.push({ label: dimLabel, tag });
          }
        });
      }

      printHermesCard(rows, promptText, subtitleText || `Select option with ↑/↓ arrows and press Enter`, 66);
      printPromptBar(isSearchMode ? 'Type query to filter, Backspace to delete, Esc to cancel' : 'Use ↑/↓ to navigate, / to filter, Enter to select, Esc to back');
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
 * Multi-Selection Checkbox Selector ([ ] / [x]) inside Hermes Rounded Card Container
 * @param {Array} options - List of options { label, tag, value }
 * @param {string} promptText - Card title
 * @param {function} headerFn - Banner callback
 * @returns {Promise<Array>} Selected objects
 */
function promptMultiSelect(options, promptText = 'Select Applications to Patch', headerFn = null) {
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

      const rows = [];
      options.forEach((opt, idx) => {
        const rawLabel = typeof opt === 'string' ? opt : opt.label;
        const cleanLabel = rawLabel.replace(/^\[\d+\]\s*/, '');
        const tag = (typeof opt === 'object' && opt.tag) ? opt.tag : '';
        const isChecked = checkedState[idx];
        const checkMark = isChecked ? `${T.success}[x]${T.reset}` : `${T.dim}[ ]${T.reset}`;

        if (idx === cursor) {
          const lineText = `${T.title}${T.bold}❯ ${checkMark} ${cleanLabel}${T.reset}`;
          rows.push({ label: lineText, tag });
        } else {
          const lineText = `  ${checkMark} ${T.text}${cleanLabel}${T.reset}`;
          rows.push({ label: lineText, tag });
        }
      });

      printHermesCard(rows, promptText, 'Use ↑/↓ to navigate, Space to toggle [x], Enter to confirm', 66);
      printPromptBar('Space to toggle selection [x], Enter to execute patch on selected apps');
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
  printHermesCard,
  formatCardRow,
  printPromptBar,
  clearScreen,
  stripAnsi,
  getVisualWidth,
  beep,
  C: themeEngine.getTheme(),
};
