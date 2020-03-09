## Introduction
This is a PDF generator from docusaurus document.

## Usage
### 1. Start your docusaurus project
```sh
yarn start
```
   
### 2. Open new terminal windows
Run pdf generate command.
```sh
npx docusaurus-pdf <initialDocsUrl> [filename] [options]
```

For example
```sh
npx docusaurus-pdf http://localhost:3000/docs/doc1
```

Or full option example is...
```sh
npx docusaurus-pdf http://localhost:3000/docs/doc1 hoge.pdf --dark
```

*NOTE about options
- `initialDocsUrl` is required.
- `filename` is output filename. (optional. default is `docusaurus.pdf`).
- `--dark` is optional. (Generates dark mode PDF).

## Link of PDF
1. Move generated pdf file to `static/img` folder.
2. `<a>` tag with `target="_blank"`
```html
<a href={useBaseUrl('img/docusaurus.pdf')} target="_blank">
  Download PDF
</a>
```

## NOTE!
If this plugin cannot find next page link, PDF generation will stop.

![note](https://www.awesomescreenshot.com/upload//1017708/c590bbd9-04a0-4637-7bd3-6b5ba1a4258e.png)
