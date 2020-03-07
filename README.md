## Introduction
This is a PDF generator from docusaurus document.

## Usage
### 1. Start your docusaurus project
```sh
yarn start
```
   
### 2. Open new terminal windows
```sh
npx docusaurus-pdf <initialDocsUrl> [filename]
```

For example
```sh
npx docusaurus-pdf http://localhost:3001/docs/doc1 hoge.pdf
```

*NOTE!
- `initialDocsUrl` is required
- `filename` is optional.(default is `docusaurus.pdf`)

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
