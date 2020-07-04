import chalk = require("chalk");
import puppeteer = require("puppeteer");
import express = require("express");
import { AddressInfo } from "net";
import { PDFDocument } from "pdf-lib";

import * as fs from "fs";
import * as path from "path";

const generatedPdfBuffers: Array<Buffer> = [];

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
}

const getURL = (origin: string, filePath: string) => {
  return origin + "/" + filePath.substring(filePath.startsWith("/") ? 1 : 0);
};

const getStylesheetPathFromHTML = (html: string, origin: string) => {
  const regExp = /(?:|<link.*){1}href="(.*styles.*?\.css){1}"/g;
  let filePath = "";
  try {
    filePath = getFirstCapturingGroup(regExp, html);
  } catch {
    throw new Error(
      "The href attribute of the 'styles*.css' file could not be found!"
    );
  }
  return getURL(origin, filePath);
};

const getScriptPathFromHTML = (html: string, origin: string) => {
  const regExp = /(?:|<script.*){1}src="(.*styles.*?\.js){1}"/g;
  let filePath = "";
  try {
    filePath = getFirstCapturingGroup(regExp, html);
  } catch {
    throw new Error(
      "The src attribute of the 'styles*.js' file could not be found!"
    );
  }
  return getURL(origin, filePath);
};

const getFirstCapturingGroup = (regExp: RegExp, text: string) => {
  const match = regExp.exec(text);
  if (match && match[1]) {
    return match[1];
  } else {
    throw new ReferenceError("No capture group found in the provided text.");
  }
};

function isObject(x: unknown): x is Record<PropertyKey, unknown> {
  return x !== null && typeof x === "object";
}

function hasOwnProperty<
  X extends Record<PropertyKey, unknown>,
  Y extends PropertyKey
>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

const isAddressInfo = (arg: unknown): arg is AddressInfo => {
  return (
    isObject(arg) &&
    hasOwnProperty(arg, "address") &&
    typeof arg.address == "string" &&
    hasOwnProperty(arg, "family") &&
    typeof arg.family == "string" &&
    hasOwnProperty(arg, "port") &&
    typeof arg.port == "number"
  );
};

export function getPathSegment(path: string, endSlash = true): string {
  path = path?.trim() ?? "";
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  if (endSlash && !path.endsWith("/")) {
    path = path + "/";
  } else if (!endSlash && path.endsWith("/")) {
    path = path.substring(0, path.length - 1); // remove "/"
  }
  return path;
}

export async function generatePdf(
  initialDocsUrl: string,
  filename = "docusaurus.pdf",
  puppeteerArgs: Array<string>
): Promise<void> {
  const browser = await puppeteer.launch({ args: puppeteerArgs });
  const page = await browser.newPage();

  const url = new URL(initialDocsUrl);
  const origin = url.origin;

  let stylePath = "";
  let scriptPath = "";

  let nextPageUrl = initialDocsUrl;

  while (nextPageUrl) {
    console.log();
    console.log(chalk.cyan(`Generating PDF of ${nextPageUrl}`));
    console.log();

    await page
      .goto(`${nextPageUrl}`, { waitUntil: "networkidle2" })
      .then((resp) => resp?.text())
      .then((html) => {
        if (!html)
          throw new Error(
            `Page could not be loaded! Did not get any HTML for ${nextPageUrl}`
          );
        stylePath = getStylesheetPathFromHTML(html, origin);
        scriptPath = getScriptPathFromHTML(html, origin);
      });

    try {
      nextPageUrl = await page.$eval(
        ".pagination-nav__item--next > a",
        (element) => {
          return (element as HTMLLinkElement).href;
        }
      );
    } catch (e) {
      nextPageUrl = "";
    }

    const html = await page.$eval("article", (element) => {
      return element.outerHTML;
    });

    await page.setContent(html);
    await page.addStyleTag({ url: stylePath });
    await page.addScriptTag({ url: scriptPath });
    const pdfBuffer = await page.pdf({
      path: "",
      format: "A4",
      printBackground: true,
      margin: { top: 25, right: 35, left: 35, bottom: 25 },
    });

    generatedPdfBuffers.push(pdfBuffer);

    console.log(chalk.green("Success"));
  }
  await browser.close();

  const mergedPdfBuffer = await mergePdfBuffers(generatedPdfBuffers);
  fs.writeFileSync(`${filename}`, mergedPdfBuffer);
}

interface LoadedConfig {
  firstDocPath: string;
  baseUrl: string;
}

async function loadConfig(siteDir: string): Promise<LoadedConfig> {
  const docusaurusConfigPath = path.join(siteDir, "docusaurus.config.js");
  try {
    await fs.promises.access(docusaurusConfigPath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`Could not read ${docusaurusConfigPath}`);
  }

  const config = await import(path.resolve(docusaurusConfigPath));
  const routeBasePaths = [];
  if (config.presets) {
    for (const [preset, options] of config.presets) {
      if (
        preset === "@docusaurus/preset-classic" &&
        options.docs?.routeBasePath
      ) {
        routeBasePaths.push(options.docs.routeBasePath);
      }
    }
  }
  if (config.plugins) {
    for (const [plugin, options] of config.plugins) {
      if (
        plugin === "@docusaurus/plugin-content-docs" &&
        options.routeBasePath
      ) {
        routeBasePaths.push(options.routeBasePath);
      }
    }
  }
  let firstDocPath = "docs"; // default from @docusaurus/plugin-content-docs
  if (routeBasePaths.length === 1) {
    firstDocPath = routeBasePaths[0];
  } else if (routeBasePaths.length > 1) {
    firstDocPath = routeBasePaths[routeBasePaths.length - 1];
    console.warn(
      `${chalk.yellow(
        "Warning"
      )}: Found multiple routeBasePath in ${docusaurusConfigPath}. Picking ${firstDocPath}.`
    );
  }
  const baseUrl = config.baseUrl ?? "/";
  return { firstDocPath, baseUrl };
}

export async function generatePdfFromBuildWithConfig(
  siteDir: string,
  buildDirPath: string,
  filename: string,
  puppeteerArgs: Array<string>
): Promise<void> {
  const { firstDocPath, baseUrl } = await loadConfig(siteDir);
  await generatePdfFromBuildSources(
    buildDirPath,
    firstDocPath,
    baseUrl,
    filename,
    puppeteerArgs
  );
}

export async function generatePdfFromBuildSources(
  buildDirPath: string,
  firstDocPath: string,
  baseUrl: string,
  filename: string,
  puppeteerArgs: Array<string>
): Promise<void> {
  const app = express();

  let buildDirStat;
  try {
    buildDirStat = await fs.promises.stat(buildDirPath);
  } catch (error) {
    throw new Error(
      `Could not find docusaurus build directory at "${buildDirPath}". ` +
        'Have you run "docusaurus build"?'
    );
  }
  if (!buildDirStat.isDirectory()) {
    throw new Error(`${buildDirPath} is not a docusaurus build directory.`);
  }

  baseUrl = getPathSegment(baseUrl, false);
  firstDocPath = getPathSegment(firstDocPath);

  const httpServer = await app.listen();
  const address = httpServer.address();
  if (!address || !isAddressInfo(address)) {
    httpServer.close();
    throw new Error("Something went wrong spinning up the express webserver.");
  }

  app.use(baseUrl, express.static(buildDirPath));

  try {
    await generatePdf(
      `http://127.0.0.1:${address.port}${baseUrl}${firstDocPath}`,
      filename,
      puppeteerArgs
    );
  } finally {
    httpServer.close();
  }
}
