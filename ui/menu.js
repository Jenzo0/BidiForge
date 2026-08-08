/**
 * BidiForge — Hermes Agent Card TUI Engine (v4.0.0 Engine)
 * Global Border & Layout Geometry Engine: Single-Page Viewport Control & Zero Scrollback Repetition
 * 
 * @version 4.0.0
 * @author Jenzo0
 */

const readline = require('readline');
const themeEngine = require('./theme');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const DEFAULT_MIN_CARD_WIDTH = 78;

/**
 * Refresh terminal screen: Purges both visible viewport and scrollback buffer cleanly
 * Eliminates repeated stacked cards when pressing arrow keys in Windows Terminal
 */
function clearScreen() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
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
 * Strip ANSI escape codes from string for accurate terminal width measurement
 */
function stripAnsi(str) {
  return (str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g, '');
}

/**
 * Helper to test if a Unicode codepoint renders as 2 display columns in terminals
 */
function isWideCodePoint(code) {
  if (code > 0xFFFF) return true;

  // Miscellaneous Symbols (⚡ U+26A1, ⚙ U+2699, ⚠️ U+26A0, ⛔ U+26D4, ⚓ U+2693, ⛵ U+2685, ⚛ U+269B, ⚖ U+2696, etc.)
  if (code >= 0x2600 && code <= 0x26FF) {
    if ([0x26A1, 0x2699, 0x26A0, 0x26D4, 0x26BD, 0x26BE, 0x26C4, 0x26C5, 0x2693, 0x2685, 0x2696, 0x269B, 0x26FA, 0x26FD].includes(code)) return true;
  }

  // Dingbats (❌ U+274C, ❓ U+2753, ❗ U+2757, ⭕ U+2755, ✂ U+2702, ✈ U+2708, ✉ U+2709, ✏ U+270F, ✒ U+2712, ✳ U+2733, ✴ U+2734, ❄ U+2744, ❇ U+2747)
  if (code >= 0x2700 && code <= 0x27BF) {
    if ([0x274C, 0x2753, 0x2757, 0x2755, 0x2702, 0x2708, 0x2709, 0x270F, 0x2712, 0x2705, 0x274E, 0x2795, 0x2796, 0x2797, 0x27B0, 0x27BF, 0x2733, 0x2734, 0x2744, 0x2747].includes(code)) return true;
  }

  // Miscellaneous Symbols and Arrows (⭐ U+2B50, ⬛ U+2B1B, ⬜ U+2B1C)
  if (code >= 0x2B00 && code <= 0x2BFF) {
    if ([0x2B50, 0x2B1B, 0x2B1C, 0x2B55].includes(code)) return true;
  }

  // Miscellaneous Technical (⌛ U+231B, ⏳ U+23F3, ⏰ U+23F0, ⏱ U+23F1, ⏲ U+23F2)
  if (code >= 0x2300 && code <= 0x23FF) {
    if ([0x231B, 0x23F3, 0x23F0, 0x23F1, 0x23F2, 0x23F8, 0x23F9, 0x23FA, 0x23E9, 0x23EA, 0x23EB, 0x23EC].includes(code)) return true;
  }

  // CJK Ideographs / Fullwidth
  if ((code >= 0x1100 && code <= 0x11FF) ||
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7A3) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6)) {
    return true;
  }

  return false;
}

/**
 * Accurate terminal character width helper (Guarantees 100% straight vertical border lines)
 * Handles: ANSI escape sequences, Astral plane emoji, BMP wide emoji, Variation Selectors, Zero-width joiners
 */
function getVisualWidth(str) {
  const clean = stripAnsi(str);
  let w = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.codePointAt(i);
    
    // Combining marks & zero-width joiners
    if (code === 0x200B || code === 0x200C || code === 0x200D || code === 0xFEFF) continue;
    if ((code >= 0x0300 && code <= 0x036F) || (code >= 0xFE20 && code <= 0xFE2F)) continue;

    if (code > 0xFFFF) {
      w += 2;
      i++; // Skip low surrogate
    } else if (code === 0xFE0F) {
      // Get actual previous codepoint even if previous char was a surrogate pair
      let prevCode = 0;
      if (i > 1 && clean.charCodeAt(i - 1) >= 0xDC00 && clean.charCodeAt(i - 1) <= 0xDFFF) {
        prevCode = clean.codePointAt(i - 2);
      } else if (i > 0) {
        prevCode = clean.codePointAt(i - 1);
      }
      if (!isWideCodePoint(prevCode)) {
        w += 1;
      }
    } else {
      w += isWideCodePoint(code) ? 2 : 1;
    }
  }
  return w;
}

/**
 * Truncate a string to fit within maxVisWidth without breaking ANSI or Emoji
 */
function truncateToVisualWidth(str, maxVisWidth) {
  const curVis = getVisualWidth(str);
  if (curVis <= maxVisWidth) return str;

  let clean = stripAnsi(str);
  while (clean.length > 0 && getVisualWidth(clean + '…') > maxVisWidth) {
    clean = clean.slice(0, -1);
  }
  return clean + '…';
}

/**
 * Format a single line enclosed inside a Hermes rounded card container with 100% straight vertical border
 */
function formatCardRow(leftText = '', rightTag = '', width = DEFAULT_MIN_CARD_WIDTH) {
  const T = themeEngine.getTheme();
  const innerWidth = width - 4; // 1 space left, 1 space right, 2 border chars = width - 4

  let visRight = getVisualWidth(rightTag);
  let visLeft = getVisualWidth(leftText);
  let safeLeft = leftText;

  if (visLeft + visRight > innerWidth) {
    const maxLeftVis = Math.max(1, innerWidth - visRight - 1);
    safeLeft = truncateToVisualWidth(leftText, maxLeftVis);
    visLeft = getVisualWidth(safeLeft);
  }

  const padLen = Math.max(0, innerWidth - visLeft - visRight);
  return `${T.border}│${T.reset} ${safeLeft}${' '.repeat(padLen)}${rightTag} ${T.border}│${T.reset}`;
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

  const termCols = (process.stdout.isTTY && process.stdout.columns) ? process.stdout.columns - 2 : 120;
  const computedWidth = targetWidth || Math.max(DEFAULT_MIN_CARD_WIDTH, maxContentWidth + 6);
  const cardWidth = Math.max(40, Math.min(computedWidth, termCols));
  
  // Safely truncate title to fit top bar width perfectly
  const maxTitleVis = cardWidth - 7;
  const safeTitle = truncateToVisualWidth(title, maxTitleVis);
  const visTitle = getVisualWidth(safeTitle);
  const topBarLen = Math.max(2, cardWidth - 5 - visTitle);

  const topLine = `${T.border}╭─ ${T.reset}${T.title}${T.bold}${safeTitle}${T.reset} ${T.border}${'─'.repeat(topBarLen)}╮${T.reset}`;
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
function printPromptBar(tipText = '', width = DEFAULT_MIN_CARD_WIDTH) {
  const T = themeEngine.getTheme();
  const dividerLen = Math.max(40, width);
  console.log('');
  if (tipText) {
    console.log(`${T.warning}${T.bold}✦ Tip:${T.reset} ${T.border}${tipText}${T.reset}`);
  }
  console.log(`${T.border}${'─'.repeat(dividerLen)}${T.reset}`);
  console.log(`${T.title}${T.bold}❯${T.reset} ${T.dim}|${T.reset}`);
}

/**
 * Interactive Hermes Card Selector with Auto-Windowing Pagination
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
      // Always purge scrollback and screen to prevent stacked card duplication on arrow keys
      clearScreen();
      
      // Execute banner/header callback ONLY if provided
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
        const maxVisible = Math.max(5, Math.min(10, termRows - 16));

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
  truncateToVisualWidth,
  beep,
  C: themeEngine.getTheme(),
};
