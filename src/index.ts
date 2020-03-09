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


let generatedPdfBuffers: Array<Buffer> = [];

export async function generatePdf(
  initialDocsUrl: string,
  filename = "docusaurus.pdf",
  isDark: boolean
): Promise<void> {
  const browser = await puppeteer.launch();
  let page = await browser.newPage();

  const url = new URL(initialDocsUrl);
  const origin = url.origin;
  let nextPageUrl = initialDocsUrl;

  const theme = isDark ? 'dark' : null;

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
  
    let article = await page.$eval('article', (element) => {
      return element.outerHTML;
    });

    // let height = await page.evaluate(() => document.documentElement.offsetHeight);
    // await page.pdf({path: 'my.pdf', height: height + 'px'});

    
    // const html = `<html data-theme=${theme}><div style="padding: 20px 35px; height: 100%;">${article}</div></html>`
    const html = `<html data-theme=${theme}><body><div style="padding: 20px 35px; background: red; height: 90vh; width: 100%; background: #F7F7F7; -webkit-print-color-adjust: exact;">${article}</div></body></html>`
    // const html = `<div style="padding: 20px 35px; background: red;">${article}</div>`
  
    console.log('html前だよ', html);
    await page.setContent(html);
    await page.addStyleTag({url: `${origin}/styles.css`});
    await page.addScriptTag({url: `${origin}/styles.js`});

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

    let htmlAfter = await page.$eval('html', (element) => {
      return element.outerHTML;
    });
    console.log('htmlあとだよ', htmlAfter);

    const pdfBuffer = await page.pdf({format: 'A4', printBackground: true});

    generatedPdfBuffers.push(pdfBuffer);

    console.log(chalk.green("Success"));
  }
  await browser.close();

  const mergedPdfBuffer = mergePdfBuffers(generatedPdfBuffers);
  fs.writeFileSync(`${filename}`, mergedPdfBuffer);
}