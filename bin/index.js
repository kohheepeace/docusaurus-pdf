#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const { generatePdf, generatePdfFromBuildSrources } = require('../lib');

program
  .version(require('../package.json').version)
  .name('docusaurus-pdf')
  .usage('<initialDocsUrl> [filename]')
  .description('Generate PDF from initial docs url')
  .arguments('<initialDocsUrl> [filename]')
  .action((initialDocsUrl, filename) => {
    generatePdf(initialDocsUrl, filename)
      .then((res) => {
        console.log(chalk.green('Finish generating PDF!'));
        process.exit(0);
      })
      .catch(err => {
        console.error(chalk.red(err.stack));
        process.exit(1)
      });
  });

program
  .command('from-build <dirPath> <uriFirstDocPage> [uriBasePath]')
  .description('Generate PDF from a docusaurus build artifact')
  .option('-o, --output-file [name]', 'Specify your file name. Default is docusaurus.pdf')
  .action((dirPath, uriFirstDocPage, uriBasePath, options) => {
    generatePdfFromBuildSrources(dirPath, uriFirstDocPage, uriBasePath, options.outputFile)
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
