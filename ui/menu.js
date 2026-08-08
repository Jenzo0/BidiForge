/**
 * BidiForge — Hermes Agent Card TUI Engine (v3.9.0 Engine)
 * Dynamic Card Width (100% Solid Straight Vertical Borders), Asterisk-Free Back Options, Distinct Tip Footer, & Animated Fast Scan
 * 
 * @version 3.9.0
 * @author Jenzo0
 */

const readline = require('readline');
const themeEngine = require('./theme');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const DEFAULT_MIN_CARD_WIDTH = 78;

/**
 * Smoothly refresh terminal screen in-place without buffer destruction or black screen
 */
function clearScreen() {
  if (process.stdout.isTTY) {
    // \x1b[2J = erase entire visible screen (NOT scrollback — avoids black screen bug)
    // \x1b[H  = move cursor to home position (0,0)
    // This combo properly clears the full viewport on Windows Terminal
    // without the infinite repetition bug from readline.cursorTo+clearScreenDown
    process.stdout.write('\x1b[2J\x1b[H');
  } else {
    console.clear();
  }
}

/**
 * Hide blinking cursor during TUI menu interaction
 */
function hideCursor() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?25l');
  }
}

/**
 * Restore blinking cursor on exit or cleanup
 */
function showCursor() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?25h');
  }
}

/**
 * Strip ANSI escape codes from string
 */
function stripAnsi(str) {
  return (str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Accurate terminal character width helper (Guarantees 100% straight vertical border lines)
 * Handles: Astral plane emoji (2 cols), BMP emoji+FE0F (2 cols), Variation Selector (0 cols)
 */
function getVisualWidth(str) {
  const clean = stripAnsi(str);
  let w = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.codePointAt(i);
    if (code > 0xFFFF) {
      // Astral Plane emoji (🚀 📂 🛡 🩺 🔄 🖱 📦 🧹 🧪 🎨 etc.) — 2 display columns
      w += 2;
      i++; // Skip low surrogate
    } else if (code === 0xFE0F) {
      // Variation Selector-16: makes previous BMP char render as emoji (2 cols)
      // Previous char was counted as 1, but with FE0F it renders as 2 → add 1 extra
      w += 1;
    } else {
      w += 1;
    }
  }
  return w;
}

/**
 * Format a single line enclosed inside a Hermes rounded card container with 100% straight vertical border
 */
function formatCardRow(leftText = '', rightTag = '', width = DEFAULT_MIN_CARD_WIDTH) {
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
 * Print Hermes Agent Rounded Card Container with dynamic width calculation for 100% solid straight vertical borders
 */
function printHermesCard(rows = [], title = '', subtitle = '', targetWidth = null) {
  const T = themeEngine.getTheme();

  // Dynamically calculate required card width based on content to guarantee 100% straight vertical borders
  let maxContentWidth = 0;
  rows.forEach(r => {
    const labelStr = typeof r === 'object' ? (r.text || r.label || '') : r;
    const tagStr = typeof r === 'object' ? (r.tag || '') : '';
    const visL = getVisualWidth(labelStr);
    const visT = getVisualWidth(tagStr);
    maxContentWidth = Math.max(maxContentWidth, visL + visT);
  });

  if (subtitle) {
    maxContentWidth = Math.max(maxContentWidth, getVisualWidth(subtitle));
  }

  const cardWidth = targetWidth || Math.max(DEFAULT_MIN_CARD_WIDTH, maxContentWidth + 6);
  
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
 * Print sleek vibrant footer prompt bar with distinct Tip styling
 */
function printPromptBar(tipText = '') {
  const T = themeEngine.getTheme();
  console.log('');
  if (tipText) {
    console.log(`${T.warning}${T.bold}✦ Tip:${T.reset} ${T.border}${tipText}${T.reset}`);
  }
  console.log(`${T.border}────────────────────────────────────────────────────────────────────────────${T.reset}`);
  console.log(`${T.title}${T.bold}❯${T.reset} ${T.dim}|${T.reset}`);
}

/**
 * Interactive Hermes Card Selector with Auto-Windowing Pagination & Full Logo Banner
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

    hideCursor();
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
      
      // Execute banner/header callback
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

        const termRows = process.stdout.rows || 24;
        const maxVisible = Math.max(5, Math.min(12, termRows - 14));

        let startIdx = 0;
        let endIdx = filtered.length;

        if (filtered.length > maxVisible) {
          startIdx = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
          endIdx = startIdx + maxVisible;
          if (endIdx > filtered.length) {
            endIdx = filtered.length;
            startIdx = Math.max(0, endIdx - maxVisible);
          }
        }

        if (startIdx > 0) {
          rows.push({ label: `${T.dim}  ▲ ${startIdx} more items above...${T.reset}` });
        }

        for (let idx = startIdx; idx < endIdx; idx++) {
          const item = filtered[idx];
          const rawLabel = typeof item.opt === 'string' ? item.opt : item.opt.label;
          
          // Remove asterisks (*) completely from back/cancel options across the entire tool
          const cleanLabel = rawLabel
            .replace(/^\*\s*/, '')
            .replace(/^⚡\s*\[\d+\]\s*/, '⚡ ')
            .replace(/^⚙️\s*\[\d+\]\s*/, '⚙️ ')
            .replace(/^🚀\s*\[\d+\]\s*/, '🚀 ')
            .replace(/^🔍\s*\[\d+\]\s*/, '🔍 ')
            .replace(/^📂\s*\[\d+\]\s*/, '📂 ')
            .replace(/^🛡️\s*\[\d+\]\s*/, '🛡️ ')
            .replace(/^🩺\s*\[\d+\]\s*/, '🩺 ')
            .replace(/^🔄\s*\[\d+\]\s*/, '🔄 ')
            .replace(/^🖱️\s*\[\d+\]\s*/, '🖱️ ')
            .replace(/^📦\s*\[\d+\]\s*/, '📦 ')
            .replace(/^🧹\s*\[\d+\]\s*/, '🧹 ')
            .replace(/^🧪\s*\[\d+\]\s*/, '🧪 ')
            .replace(/^🎨\s*\[\d+\]\s*/, '🎨 ')
            .replace(/^❌\s*\[\d+\]\s*/, '❌ ')
            .replace(/^\[\d+\]\s*/, '');
            
          const tag = (typeof item.opt === 'object' && item.opt.tag) ? item.opt.tag : '';

          if (idx === selectedIndex) {
            const selLabel = `${T.title}${T.bold}❯ ${cleanLabel}${T.reset}`;
            rows.push({ label: selLabel, tag });
          } else {
            const dimLabel = `  ${T.text}${cleanLabel}${T.reset}`;
            rows.push({ label: dimLabel, tag });
          }
        }

        if (endIdx < filtered.length) {
          rows.push({ label: `${T.dim}  ▼ ${filtered.length - endIdx} more items below...${T.reset}` });
        }
      }

      printHermesCard(rows, promptText, subtitleText || `Select option with ↑/↓ arrows and press Enter`);
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
      showCursor();
      process.stdin.removeListener('keypress', onKeypress);
      try { process.stdin.setRawMode(false); } catch (_) {}
      process.stdin.pause();
    }

    process.stdin.on('keypress', onKeypress);
  });
}

/**
 * Multi-Selection Checkbox Selector ([ ] / [x]) inside Hermes Rounded Card Container
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

    hideCursor();
    process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();

    function render() {
      clearScreen();
      if (typeof headerFn === 'function') {
        headerFn();
      }

      const rows = [];
      options.forEach((opt, idx) => {
        const rawLabel = typeof opt === 'string' ? opt : opt.label;
        const cleanLabel = rawLabel.replace(/^\*\s*/, '').replace(/^\[\d+\]\s*/, '');
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

      printHermesCard(rows, promptText, 'Use ↑/↓ to navigate, Space to toggle [x], Enter to confirm');
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
      showCursor();
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
  hideCursor,
  showCursor,
  stripAnsi,
  getVisualWidth,
  beep,
  C: themeEngine.getTheme(),
};
