#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const { generatePdf } = require('../lib');

program
  .version(require('../package.json').version)
  .name('docusaurus-pdf')
  .usage('<initialDocsUrl> [filename] [options]')
  .description('Generate PDF from initial docs url')
  .arguments('<initialDocsUrl> [filename]')
  .option("--dark", "generate dark mode pdf")
  .action((initialDocsUrl, filename, options) => {
    generatePdf(initialDocsUrl, filename, options.dark)
      .then((res) => {
        console.log(chalk.green('Finish generating PDF!'));
        process.exit(0);
      })
      .catch(err => {
        console.error(chalk.red(err.stack));
        process.exit(1)
      });
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}