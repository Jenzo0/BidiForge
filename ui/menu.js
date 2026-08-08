/**
 * BidiForge — Interactive CLI UI Engine (v3.3 Engine - Inspired by OpenCode CLI & TUI)
 * Cyberpunk Box Containers, Arrow key navigation (↑/↓), multi-select checkboxes, animated spinners, & status badges
 * 
 * @version 3.3.0
 * @author Jenzo0
 */

const readline = require('readline');

// ANSI terminal color codes & styling
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
  bgCyan: '\x1b[46;30;1m',
  bgBlue: '\x1b[44;37;1m',
};

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BOX_WIDTH = 78;

/**
 * Strip ANSI escape codes from string to get true visual string
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
 * Format a single line of text enclosed in a 78-char Cyberpunk Box with 100% border alignment
 * @param {string} content - Left line text
 * @param {string} tag - Optional right-aligned tag or badge
 * @param {number} boxWidth - Target box width
 * @returns {string} Formatted box line
 */
function formatBoxLine(content = '', tag = '', boxWidth = BOX_WIDTH) {
  const visContent = getVisualWidth(content);
  const visTag = getVisualWidth(tag);
  
  if (tag) {
    const totalVis = visContent + visTag;
    const padLen = Math.max(1, boxWidth - 4 - totalVis);
    return `${C.cyan}║${C.reset} ${content}${' '.repeat(padLen)}${tag} ${C.cyan}║${C.reset}`;
  } else {
    const padLen = Math.max(0, boxWidth - 4 - visContent);
    return `${C.cyan}║${C.reset} ${content}${' '.repeat(padLen)} ${C.cyan}║${C.reset}`;
  }
}

/**
 * Print a full Cyberpunk Box container with title and tips footer
 * @param {Array} lines - Array of line strings or objects { text, tag }
 * @param {string} title - Optional title header
 * @param {string} tip - Optional footer tip message
 */
function printBox(lines = [], title = '', tip = '') {
  console.log(`${C.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  if (title) {
    console.log(formatBoxLine(`${C.yellow}${C.bold}${title}${C.reset}`));
    console.log(`${C.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${C.reset}`);
  }
  lines.forEach(line => {
    if (typeof line === 'object') {
      console.log(formatBoxLine(line.text || line.label || '', line.tag || ''));
    } else {
      console.log(formatBoxLine(line));
    }
  });
  if (tip) {
    console.log(`${C.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${C.reset}`);
    console.log(formatBoxLine(`${C.yellow}💡 Tip:${C.reset} ${C.dim}${tip}${C.reset}`));
  }
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}`);
}

/**
 * Interactive Arrow-Key Menu Selector inside 78-char Cyberpunk Box Containers (↑ Up / ↓ Down / Enter / Esc)
 * @param {Array} options - List of string options or objects { label, tag, detail, value }
 * @param {string} promptText - Prompt header title
 * @param {function} headerFn - Optional banner/header function to call on render
 * @param {string} tipText - Footer shortcut tips
 * @returns {Promise<number>} Selected index
 */
function promptSelect(options, promptText = 'Select an option using ↑/↓ arrows and press Enter:', headerFn = null, tipText = 'Use ↑/↓ Arrow Keys to navigate, Enter to select, Esc to back') {
  return new Promise(resolve => {
    let selected = 0;
    
    // Check TTY capability
    if (!process.stdin.isTTY) {
      resolve(0);
      return;
    }

    process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();

    function render() {
      console.clear();
      if (typeof headerFn === 'function') {
        headerFn();
      }

      console.log(`${C.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
      console.log(formatBoxLine(`${C.yellow}${C.bold}${promptText}${C.reset}`));
      console.log(`${C.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${C.reset}`);

      options.forEach((opt, idx) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const tag = (typeof opt === 'object' && opt.tag) ? opt.tag : '';

        if (idx === selected) {
          const selText = `${C.cyan}${C.bold}❯ ${label}${C.reset}`;
          console.log(formatBoxLine(selText, tag));
        } else {
          const dimText = `  ${C.dim}${label}${C.reset}`;
          console.log(formatBoxLine(dimText, tag));
        }
      });

      console.log(`${C.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${C.reset}`);
      console.log(formatBoxLine(`${C.yellow}💡 Tips:${C.reset} ${C.dim}${tipText}${C.reset}`));
      console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}`);
    }

    render();

    function onKeypress(str, key) {
      if (!key) return;

      if (key.name === 'up') {
        selected = (selected - 1 + options.length) % options.length;
        render();
      } else if (key.name === 'down') {
        selected = (selected + 1) % options.length;
        render();
      } else if (key.name === 'return') {
        cleanup();
        resolve(selected);
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

    if (!process.stdin.isTTY) {
      resolve(options.map(o => o.value || o));
      return;
    }

    process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();

    function render() {
      console.clear();
      if (typeof headerFn === 'function') headerFn();

      console.log(`${C.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
      console.log(formatBoxLine(`${C.yellow}${C.bold}${promptText}${C.reset}`));
      console.log(`${C.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${C.reset}`);

      options.forEach((opt, idx) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const tag = (typeof opt === 'object' && opt.tag) ? opt.tag : '';
        const isChecked = checkedState[idx];
        const checkMark = isChecked ? `${C.green}[x]${C.reset}` : `${C.dim}[ ]${C.reset}`;

        if (idx === cursor) {
          const lineText = `${C.cyan}${C.bold}❯ ${checkMark} ${label}${C.reset}`;
          console.log(formatBoxLine(lineText, tag));
        } else {
          const lineText = `  ${checkMark} ${C.dim}${label}${C.reset}`;
          console.log(formatBoxLine(lineText, tag));
        }
      });

      console.log(`${C.cyan}╠══════════════════════════════════════════════════════════════════════════════╣${C.reset}`);
      console.log(formatBoxLine(`${C.yellow}💡 Tips:${C.reset} ${C.dim}Use ↑/↓ to navigate, Space to toggle [x], Enter to confirm, Esc to back${C.reset}`));
      console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}`);
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
 * Animated CLI Spinner helper for async operations
 */
function createSpinner(text = 'Processing...') {
  let frameIdx = 0;
  let currentText = text;
  let timer = null;

  if (process.stdout.isTTY) {
    timer = setInterval(() => {
      const frame = SPINNER_FRAMES[frameIdx % SPINNER_FRAMES.length];
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`  ${C.cyan}${frame}${C.reset} ${currentText}`);
      frameIdx++;
    }, 80);
  }

  return {
    update: (newText) => {
      currentText = newText;
    },
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
      console.log(`  ${C.green}✓${C.reset} ${msg || currentText}`);
      beep();
    },
    fail: (msg) => {
      if (timer) clearInterval(timer);
      if (process.stdout.isTTY) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      }
      console.log(`  ${C.red}✖${C.reset} ${msg || currentText}`);
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
  formatBoxLine,
  printBox,
  stripAnsi,
  getVisualWidth,
  beep,
  C,
};
