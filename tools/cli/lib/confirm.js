import readline from 'readline';
import colors from 'colors';

/**
 * @function printWarningBox
 * @description Print a red bordered warning box with a title and wrapped lines of text
 *
 * @param {String} title box title
 * @param {Array<String>} lines lines of text to display
 * @param {Object} opts
 * @param {Number} opts.width optional.  inner width of the box.  Default 66
 */
function printWarningBox(title, lines=[], opts={}) {
  let width = opts.width || 66;
  let border = '═'.repeat(width);

  console.log();
  console.log(colors.bgRed.white.bold(`  ${title}  `));
  console.log(colors.red('╔'+border+'╗'));
  for( let line of wrapLines(lines, width-2) ) {
    console.log(colors.red('║') + colors.yellow(' '+line.padEnd(width-1)) + colors.red('║'));
  }
  console.log(colors.red('╚'+border+'╝'));
  console.log();
}

/**
 * @function wrapLines
 * @description Word wrap an array of lines to a max width
 *
 * @param {Array<String>} lines
 * @param {Number} width max line width
 *
 * @returns {Array<String>}
 */
function wrapLines(lines, width) {
  let out = [];
  for( let line of lines ) {
    if( line === '' ) {
      out.push('');
      continue;
    }
    let current = '';
    for( let word of line.split(' ') ) {
      if( (current+' '+word).trim().length > width ) {
        out.push(current);
        current = word;
      } else {
        current = (current+' '+word).trim();
      }
    }
    out.push(current);
  }
  return out;
}

/**
 * @function confirmYes
 * @description Prompt the user to type 'yes' to continue.  Resolves false on anything else.
 * Resolves false if stdin is not a TTY (use a --yes flag for non-interactive usage).
 *
 * @param {String} question prompt text
 *
 * @returns {Promise<Boolean>}
 */
function confirmYes(question) {
  if( !process.stdin.isTTY ) {
    console.error(colors.red('Confirmation required but stdin is not interactive. Use --yes to skip the prompt.'));
    return Promise.resolve(false);
  }

  return new Promise(resolve => {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    rl.question(colors.bold('  '+question+' '), answer => {
      rl.close();
      resolve(answer.trim() === 'yes');
    });
  });
}

export {printWarningBox, wrapLines, confirmYes};
