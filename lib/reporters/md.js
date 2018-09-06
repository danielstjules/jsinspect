let chalk        = require('chalk');
let BaseReporter = require('./base');

class MdReporter extends BaseReporter {
  /**
   * A Markdown reporter, which tries to fit jsinspect's output to something
   *
   * @constructor
   *
   * @param {Inspector} inspector Instance on which to register its listeners
   * @param {object}    opts      Options to set for the reporter
   */
  constructor(inspector, opts) {
    opts = opts || {};
    super(inspector, opts);

    const enabled = chalk.enabled;

    inspector.on('start', () => {
      chalk.enabled = false;
      this._writableStream.write(
        `\n## Check report (via [Jsinspect](https://github.com/danielstjules/jsinspect))\n\n`
      );
    });

    inspector.on('end', () => {
      chalk.enabled = enabled;
      this._writableStream.write('\n');
    });
  }

  /**
   * Returns an Markdown string
   *
   * @private
   *
   * @param   {Match}  match The inspector match to output
   * @returns {string} The formatted output
   */
  _getOutput(match) {
    let output = (this._found > 1) ? '\n' : '';
    let codeFragment = '';
    let instances = match.instances;
    let totalLines = this._getTotalLines(match);

    output += `#### ID: *${match.hash}*,  Duplicate-Lines: ${totalLines}\n\n`;
    instances.forEach((instance) => output += `- ${instance.filename}: ${instance.start.line}\n`);

    output += '\n\`\`\`js';
    let lastIndex = instances.length - 1;
    instances.forEach((instance, index) => {
      let location = this._getFormattedLocation(instance);
      let lines = this._getLines(instance);
      codeFragment += `\n// ${location}\n${chalk.grey(lines)}${index === lastIndex ? '' : '\n'}`;
    });
    output += `${codeFragment}\n\`\`\`\n\n---\n\n`;

    return output;
  }

  /**
   * Returns the total number of lines spanned by a match.
   *
   * @param   {Match} match
   * @returns {int}
   */
  _getTotalLines(match) {
    return match.instances.reduce((res, curr) => (res + curr.end.line - curr.start.line + 1), 0);
  }
}

module.exports = MdReporter;
