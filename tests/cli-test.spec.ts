import { promisify } from "util";
import { promises as fsPromises } from "fs";
import { execFile } from "child_process";
import { join as pathJoin, resolve as pathResolve } from "path";

const promiseExecFile = promisify(execFile);

jest.setTimeout(60_000);

const TEST_OUTPUT = "./tests/output";
const TEST_SITE_DIR = "./tests/test-website";
// third-to-last docs path so should be faster
const DOCUSAURUS_TEST_LINK =
  "https://v2.docusaurus.io/docs/2.0.0-alpha.56/docusaurus.config.js";
const PUPPETEER_SETTINGS = [
  "--margin",
  "2cm 2cm 2cm 2cm",
  "--format",
  "A3",
  "--no-sandbox",
];

async function runDocusaurusPdf(
  args: Array<string>,
  { cmd = require.resolve("../bin/index.js"), cwd = process.cwd() } = {}
) {
  return await promiseExecFile("node", [cmd, ...args], { cwd });
}

async function isFile(path: string): Promise<boolean> {
  try {
    const stat = await fsPromises.stat(path);
    return stat.isFile();
  } catch (error) {
    return false;
    // throw error;
  }
}

async function rmdirRecursive(path: string): Promise<void> {
  let files;
  try {
    files = await fsPromises.readdir(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return; // dir already doesn't exist
    }
    throw error;
  }

  await Promise.all(
    files.map((file) => {
      return fsPromises.unlink(pathJoin(path, file));
    })
  );
  await fsPromises.rmdir(path);
}

describe("testing cli", () => {
  beforeAll(async () => {
    await rmdirRecursive(TEST_OUTPUT);
    await fsPromises.mkdir(TEST_OUTPUT);
  });

  describe("default", () => {
    test("should download docusaurus-website to default docusaurus.pdf", async () => {
      await runDocusaurusPdf([DOCUSAURUS_TEST_LINK], { cwd: TEST_OUTPUT });
      expect(await isFile(pathJoin(TEST_OUTPUT, "docusaurus.pdf"))).toBe(true);
    });
    test("should download docusaurus-website to specific location", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "specifc-loc-test.pdf");
      await runDocusaurusPdf([DOCUSAURUS_TEST_LINK, outputPath]);
      expect(await isFile(outputPath)).toBe(true);
    });
    test("should fail when using non-docusuarus url", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "should-fail.pdf");
      await expect(
        runDocusaurusPdf(["https://example.invalid", outputPath])
      ).rejects.toThrow();
      expect(await isFile(outputPath)).toBe(false);
    });
    test("should use puppeteer settings", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "docusaurus-a3.pdf");
      await runDocusaurusPdf([
        DOCUSAURUS_TEST_LINK,
        outputPath,
        ...PUPPETEER_SETTINGS,
      ]);
      expect(await isFile(outputPath)).toBe(true);
    });
    test("should fail with invalid margins", async () => {
      const outputPath = pathJoin(
        TEST_OUTPUT,
        "should-fail-invalid-margins.pdf"
      );
      await expect(
        runDocusaurusPdf([
          DOCUSAURUS_TEST_LINK,
          outputPath,
          "--margin",
          "2cm 2cm 2cm",
        ])
      ).rejects.toThrow();
      expect(await isFile(outputPath)).toBe(false);
    });
  });

  describe("from-build", () => {
    beforeAll(async () => {
      await promiseExecFile(
        require.resolve("@docusaurus/core/bin/docusaurus.js"),
        ["build"],
        { cwd: TEST_SITE_DIR }
      );
    });
    test("should create pdf from build dir", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "from-build.pdf");
      const buildDir = pathJoin(TEST_SITE_DIR, "build");
      const docsPath = "/docs-path";
      const baseUrl = "/base-url/";
      await runDocusaurusPdf([
        "from-build",
        buildDir,
        docsPath,
        baseUrl,
        "--output-file",
        outputPath,
      ]);
      expect(await isFile(outputPath)).toBe(true);
    });
    test("should still run even if incorrect docsPath/baseUrl slashes", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "from-build-slashes.pdf");
      const buildDir = pathJoin(TEST_SITE_DIR, "build");
      const docsPath = "docs-path/";
      const baseUrl = "base-url";
      await runDocusaurusPdf([
        "from-build",
        buildDir,
        docsPath,
        baseUrl,
        "--output-file",
        outputPath,
      ]);
      expect(await isFile(outputPath)).toBe(true);
    });
    test("should use puppeteer settings", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "from-build-a3.pdf");
      const buildDir = pathJoin(TEST_SITE_DIR, "build");
      const docsPath = "/docs-path";
      const baseUrl = "/base-url/";
      await runDocusaurusPdf([
        "from-build",
        buildDir,
        docsPath,
        baseUrl,
        "--output-file",
        outputPath,
        ...PUPPETEER_SETTINGS,
      ]);
      expect(await isFile(outputPath)).toBe(true);
    });
  });

  describe("from-build-config", () => {
    beforeAll(async () => {
      await promiseExecFile(
        require.resolve("@docusaurus/core/bin/docusaurus.js"),
        ["build"],
        { cwd: TEST_SITE_DIR }
      );
    });
    test("should create pdf from build dir", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "from-build-config.pdf");
      await runDocusaurusPdf(
        ["from-build-config", "--output-file", pathResolve(outputPath)],
        { cwd: TEST_SITE_DIR }
      );
      expect(await isFile(outputPath)).toBe(true);
    });
    test("should use puppeteer settings", async () => {
      const outputPath = pathJoin(TEST_OUTPUT, "from-build-config-a3.pdf");
      await runDocusaurusPdf(
        [
          "from-build-config",
          "--output-file",
          pathResolve(outputPath),
          ...PUPPETEER_SETTINGS,
        ],
        { cwd: TEST_SITE_DIR }
      );
      expect(await isFile(outputPath)).toBe(true);
    });
  });
});
