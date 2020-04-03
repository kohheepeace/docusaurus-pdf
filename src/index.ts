import chalk = require('chalk');
import puppeteer = require('puppeteer');

const { PDFRStreamForBuffer, createWriterToModify, PDFStreamForResponse } = require('hummus');
const { WritableStream } = require('memory-streams');
const fs = require('fs');

const mergePdfBuffers = (pdfBuffers: Array<Buffer>) => {
  const outStream = new WritableStream();                                                                                                                                             
  const [firstPdfRStream, ...restPdfRStreams] = pdfBuffers.map(pdfBuffer => new PDFRStreamForBuffer(pdfBuffer));
  const pdfWriter = createWriterToModify(firstPdfRStream, new PDFStreamForResponse(outStream));

  restPdfRStreams.forEach(pdfRStream => pdfWriter.appendPDFPagesFromPDF(pdfRStream));

  pdfWriter.end();
  outStream.end();
  
  return outStream.toBuffer();
};

const safeUrlAppend = (origin: String, path: String, file: String) => {
  return origin + (path.length > 0 ? '/' : '') + 
    path.substring(path.startsWith('/') ? 1 : 0, path.length - (path.endsWith('/') ? 1 : 0)) + 
    '/' + file;
}

let generatedPdfBuffers: Array<Buffer> = [];

export async function generatePdf(
  initialDocsUrl: string,
  filename = "docusaurus.pdf",
  baseUrl = ''
): Promise<void> {
  const browser = await puppeteer.launch();
  let page = await browser.newPage();

  const url = new URL(initialDocsUrl);
  const origin = url.origin;

  let nextPageUrl = initialDocsUrl;

  while (nextPageUrl) {
    console.log();
    console.log(chalk.cyan(`Generating PDF of ${nextPageUrl}`));
    console.log();

    await page.goto(`${nextPageUrl}`, {waitUntil: 'networkidle2'});
      
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
    await page.addStyleTag({url: safeUrlAppend(origin, baseUrl,'styles.css')});
    await page.addScriptTag({url: safeUrlAppend(origin, baseUrl, 'styles.js')});
    const pdfBuffer = await page.pdf({path: "", format: 'A4', printBackground: true, margin : {top: 25, right: 35, left: 35, bottom: 25}});

    generatedPdfBuffers.push(pdfBuffer);

    console.log(chalk.green("Success"));
  }
  await browser.close();

  const mergedPdfBuffer = mergePdfBuffers(generatedPdfBuffers);
  fs.writeFileSync(`${filename}`, mergedPdfBuffer);
}