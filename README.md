<p align="center">
  <a href="https://www.npmjs.com/package/docusaurus-pdf">
    <img alt="npm version" src="https://img.shields.io/npm/v/docusaurus-pdf.svg"></a>
  <a href="#badge">
    <img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg"></a>
  <a href="https://github.com/KohheePeace/docusaurus-pdf/actions?query=workflow%3ATest">
    <img alt="Github Action: Test" src="https://github.com/KohheePeace/docusaurus-pdf/workflows/Test/badge.svg"></a>
</p>

## ⚠️ Caution!
Currently, this package is not catching up with docusaurus v2 and not actively developed, it is under MIT license, so feel free to fork and modify it.

## Introduction

This is a PDF generator from docusaurus document.

## *Note
- This plugin is not intended to be used during build process. But you can run it as a post build script. See the instructions below.
 

## Demo
This is generated PDF of official docusaurus website:
https://drive.google.com/file/d/19P3qSwLLUHYigrxH3QXIMXmRpTFi4pKB/view

## Usage
### Use with already hosted docusaurus instance (locally or somewhere in the net)
```sh
npx docusaurus-pdf <initialDocsUrl> [filename]
```

For example
```sh
npx docusaurus-pdf http://localhost:3000/myBaseUrl/docs/doc1 hoge.pdf
```

*NOTE!
- `initialDocsUrl` is required. You can spin up your dev-webserver of docusaurus with `yarn start` or use an already hosted page.
- `filename` is optional (default is `docusaurus.pdf`).

### Use with the build artifact of `docusaurus build`

```sh
npx docusaurus-pdf from-build [options] <dirPath> <firstDocPagePath> [baseUrl]
```

For example
```sh
npx docusaurus-pdf from-build build/ docs/doc1 /myBaseUrl/
```

You can also try to automatically load the `firstDocPagePath` and `baseUrl` from `docusaurus.config.js`:

```sh
npx docusaurus-pdf from-build-config
```

#### Parameters
- Mandatory: `dirPath` which points to the build directory created with `docusaurus build`.
- Mandatory: `firstDocPagePath` is the URL path segment (without `baseUrl`) of your first docs page you whish to have included in the PDF.
- Optional: If you have a `baseUrl` configured in your `docusaurus.config.js` then pass this value as `baseUrl`.
- Note: There is a optional parameter to set a custom filename. You can see further details using `npx docusaurus-pdf from-build --help`.

## Docker usage
All dependencies needed to create a PDF from your docusaurus site are bundled in our Dockerfile.

### Create PDF from build artifact
#### Run docusaurus-pdf with prebuild image
```sh
docker run --rm -it -v /someDir/my-docusaurus:/workspace maxys/docusaurus-pdf:latest from-build --no-sandbox -o /workspace/build/docs.pdf /workspace/build docs/doc1 myBaseUrl
```

#### Build Docker image locally
You can create the image locally without pulling `maxys/docusaurus-pdf:latest` from the Docker Hub with:

```sh
docker build -t "docusaurus-pdf" .
```

## Link of PDF
1. Move generated pdf file to `static/img` folder.
2. `<a>` tag with `target="_blank"`
```html
<a href={useBaseUrl('img/docusaurus.pdf')} target="_blank">
  Download PDF
</a>
```

## NOTE!
1. If this plugin cannot find next page link, PDF generation will stop.

![note](https://www.awesomescreenshot.com/upload//1017708/c590bbd9-04a0-4637-7bd3-6b5ba1a4258e.png)

2. Dark theme PDF cannot be generated correctly now.
