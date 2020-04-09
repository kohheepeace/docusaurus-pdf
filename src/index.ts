import chalk = require('chalk');
import puppeteer = require('puppeteer');
import express = require('express');
import { AddressInfo } from 'net';

const { PDFRStreamForBuffer, createWriterToModify, PDFStreamForResponse } = require('hummus');
const { WritableStream } = require('memory-streams');
const fs = require('fs');
let generatedPdfBuffers: Array<Buffer> = [];

const mergePdfBuffers = (pdfBuffers: Array<Buffer>) => {
  const outStream = new WritableStream();
  const [firstPdfRStream, ...restPdfRStreams] = pdfBuffers.map(pdfBuffer => new PDFRStreamForBuffer(pdfBuffer));
  const pdfWriter = createWriterToModify(firstPdfRStream, new PDFStreamForResponse(outStream));

  restPdfRStreams.forEach(pdfRStream => pdfWriter.appendPDFPagesFromPDF(pdfRStream));

  pdfWriter.end();
  outStream.end();

  return outStream.toBuffer();
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
    && arg.address && typeof(arg.address) == 'string'
    && arg.family && typeof(arg.family) == 'string'
    && arg.port && typeof(arg.port) == 'number';
}

export async function generatePdf(
  initialDocsUrl: string,
  filename = "docusaurus.pdf"
): Promise<void> {
  const browser = await puppeteer.launch();
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

  const mergedPdfBuffer = mergePdfBuffers(generatedPdfBuffers);
  fs.writeFileSync(`${filename}`, mergedPdfBuffer);
}

export async function generatePdfFromBuildSrources(
  buildDirPath: string,
  basePath: string, // add another prop for firstFileName
  filename = "docusaurus.pdf"
): Promise<void> {
  if (basePath && !basePath.startsWith('/')) {
    basePath = '/' + basePath;
  } else if (!basePath) {
    basePath = '/'
  }

  let app = express();
  app.use(basePath, express.static(buildDirPath));

  let httpServer = await app.listen();
  let address = httpServer.address();
  if (!address || !isAddressInfo(address)) {
    httpServer.close();
    throw new Error("Something went wrong spinning up the express webserver.");
  }
  
  await generatePdf(`http://127.0.0.1:${address.port}${basePath}`, filename)
    .then(() => httpServer.close());
}
