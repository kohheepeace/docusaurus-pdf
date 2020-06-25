import chalk = require('chalk');
import puppeteer = require('puppeteer');
import express = require('express');
import { AddressInfo } from 'net';
import { PDFDocument } from 'pdf-lib';

const fs = require('fs');
let generatedPdfBuffers: Array<Buffer> = [];

async function mergePdfBuffers(pdfBuffers: Array<Buffer>) {
  const outDoc = await PDFDocument.create();
  for (const pdfBuffer of pdfBuffers) {
    const docToAdd = await PDFDocument.load(pdfBuffer);
    const pages = await outDoc.copyPages(docToAdd, docToAdd.getPageIndices());
    for (const page of pages) {
      outDoc.addPage(page);
    }
  }

  return outDoc.save();
};

const getURL = (origin: string, filePath: string) => {
  return origin + "/" + filePath.substring(filePath.startsWith('/') ? 1 : 0);
}

const getStylesheetPathFromHTML = (html: string, origin: string) => {
  let regExp = /(?:|<link.*){1}href="(.*styles.*?\.css){1}"/g;
  let filePath = "";
  try {
    filePath = getFirstCapturingGroup(regExp, html);
  } catch {
    throw new Error("The href attribute of the 'styles*.css' file could not be found!");
  }
  return getURL(origin, filePath);
};

const getScriptPathFromHTML = (html: string, origin: string) => {
  let regExp = /(?:|<script.*){1}src="(.*styles.*?\.js){1}"/g;
  let filePath = "";
  try {
    filePath = getFirstCapturingGroup(regExp, html);
  } catch {
    throw new Error("The src attribute of the 'styles*.js' file could not be found!");
  }
  return getURL(origin, filePath);
};

const getFirstCapturingGroup = (regExp: RegExp, text: string) => {
  let match = regExp.exec(text);
  if (match && match[1]) {
    return match[1];
  } else {
    throw new ReferenceError("No capture group found in the provided text.")
  }
}

const isAddressInfo = (arg: any): arg is AddressInfo => {
  return arg
    && arg.address && typeof (arg.address) == 'string'
    && arg.family && typeof (arg.family) == 'string'
    && arg.port && typeof (arg.port) == 'number';
}

const getPathSegment = (path: string, slashIfEmpty: boolean = true) => {
  if (path && !path.trim().startsWith('/')) {
    return '/' + path.trim();
  } else if (!path && slashIfEmpty) {
    return '/';
  } else {
    return '';
  }
}

export async function generatePdf(
  initialDocsUrl: string,
  filename = "docusaurus.pdf",
  puppeteerArgs: Array<string>
): Promise<void> {
  const browser = await puppeteer.launch({ args: puppeteerArgs });
  let page = await browser.newPage();

  const url = new URL(initialDocsUrl);
  const origin = url.origin;

  let stylePath: string = "";
  let scriptPath: string = "";

  let nextPageUrl = initialDocsUrl;

  while (nextPageUrl) {
    console.log();
    console.log(chalk.cyan(`Generating PDF of ${nextPageUrl}`));
    console.log();

    await page.goto(`${nextPageUrl}`, { waitUntil: 'networkidle2' })
      .then((resp) => resp?.text())
      .then((html) => {
        if (!html) throw new Error(`Page could not be loaded! Did not get any HTML for ${nextPageUrl}`)
        stylePath = getStylesheetPathFromHTML(html, origin);
        scriptPath = getScriptPathFromHTML(html, origin);
      });

    try {
      nextPageUrl = await page.$eval('.pagination-nav__item--next > a', (element) => {
        return (element as HTMLLinkElement).href;
      });
    } catch (e) {
      nextPageUrl = "";
    }


    let html = await page.$eval('article', (element) => {
      return element.outerHTML;
    });


    await page.setContent(html);
    await page.addStyleTag({ url: stylePath });
    await page.addScriptTag({ url: scriptPath });
    const pdfBuffer = await page.pdf({ path: "", format: 'A4', printBackground: true, margin: { top: 25, right: 35, left: 35, bottom: 25 } });

    generatedPdfBuffers.push(pdfBuffer);

    console.log(chalk.green("Success"));
  }
  await browser.close();

  const mergedPdfBuffer = await mergePdfBuffers(generatedPdfBuffers);
  fs.writeFileSync(`${filename}`, mergedPdfBuffer);
}

export async function generatePdfFromBuildSources(
  buildDirPath: string,
  firstDocPath: string,
  baseUrl: string,
  filename: string = "docusaurus.pdf",
  puppeteerArgs: Array<string>
): Promise<void> {
  let app = express();

  let buildDirStat;
  try {
    buildDirStat = await fs.promises.stat(buildDirPath);
  } catch (error) {
    throw new Error(
      `Could not find docusaurus build directory at "${buildDirPath}". ` +
      'Have you run "docusaurus build"?');
  }
  if (!buildDirStat.isDirectory()) {
    throw new Error(`${buildDirPath} is not a docusaurus build directory.`);
  }

  baseUrl = getPathSegment(baseUrl, false);
  firstDocPath = getPathSegment(firstDocPath);

  let httpServer = await app.listen();
  let address = httpServer.address();
  if (!address || !isAddressInfo(address)) {
    httpServer.close();
    throw new Error("Something went wrong spinning up the express webserver.");
  }

  app.use(baseUrl, express.static(buildDirPath));

  try {
    await generatePdf(`http://127.0.0.1:${address.port}${baseUrl}${firstDocPath}`, filename, puppeteerArgs)
  } finally {
    httpServer.close();
  }
}
