#!/usr/bin/env node

/* eslint-disable no-process-exit */

const chalk = require("chalk");
const program = require("commander");
const {
  generatePdf,
  generatePdfFromBuildSources,
  generatePdfFromBuildWithConfig,
} = require("../lib");

function generatePdfOptions({ sandbox, margin, format, printBackground }) {
  return {
    puppeteerArgs: sandbox ? [] : ["--no-sandbox"],
    puppeteerPdfOpts: { margin, format, printBackground },
  };
}

function parseMargin(marginString) {
  const matches = [...marginString.match(/\d+\w{0,2}/g)];
  if (matches.length !== 4) {
    throw Error(
      `Was expecting exactly 4 margin specifiers, instead got ${matches.length}. Margin specifier was "${marginString}".`
    );
  }
  const [top, right, bottom, left] = matches;
  return { top, right, bottom, left };
}

program
  .version(require("../package.json").version)
  .name("docusaurus-pdf")
  .usage("<initialDocsUrl> [filename]")
  .description("Generate a PDF from a docusaurus website")
  .option("--no-sandbox", "Start puppeteer with --no-sandbox flag")
  .option(
    "--margin <margin>",
    "Set margins of the pdf document with units in order top, right, bottom, left (units px,in,mm,cm)",
    parseMargin,
    "25px 35px 25px 35px"
  )
  .option(
    "--format <format>",
    "Set the size of the page, e.g. (A4, Letter)",
    "A4"
  )
  .option("--no-print-background", "Disable printing the page background");

program
  .command("from-website <initialDocsUrl> [filename]", {
    isDefault: true,
  })
  .description("Generate PDF from an already hosted website")
  .action(async (initialDocsUrl, filename = "docusaurus.pdf") => {
    await generatePdf(
      initialDocsUrl,
      filename,
      generatePdfOptions(program.opts())
    );
    console.log(chalk.green("Finish generating PDF!"));
  });

program
  .command("from-build <dirPath> <firstDocPagePath> [baseUrl]")
  .description("Generate PDF from a docusaurus build artifact")
  .option(
    "-o, --output-file <name>",
    "Specify your file name.",
    "docusaurus.pdf"
  )
  .action(async (dirPath, firstDocPagePath, baseUrl, { outputFile }) => {
    await generatePdfFromBuildSources(
      dirPath,
      firstDocPagePath,
      baseUrl,
      outputFile,
      generatePdfOptions(program.opts())
    );
    console.log(chalk.green("Finish generating PDF!"));
  });

program
  .command("from-build-config [dirPath]")
  .description(
    "Generate PDF from a docusaurus build artifact, loading from a docusaurus.config.js file"
  )
  .option(
    "--site-dir <dir>",
    "The full path for the docusaurus site directory, relative to the current workspace." +
      " Equivalent to the siteDir in `npx docusaurus build`",
    "./"
  )
  .option(
    "-o, --output-file <name>",
    "Specify your file name",
    "docusaurus.pdf"
  )
  .action(async (dirPath = "build", { siteDir, outputFile }) => {
    await generatePdfFromBuildWithConfig(
      siteDir,
      dirPath,
      outputFile,
      generatePdfOptions(program.opts())
    );
    console.log(chalk.green("Finish generating PDF!"));
  });

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red(error.stack));
    process.exit(1);
  }
}

main();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
