# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2020-06-26

### Added

- Added `from-build-config` command to attempt to automatically load
  `baseUrl` and `firstDocsPath` from a `docusaurus.config.js` file
  [#16](https://github.com/KohheePeace/docusaurus-pdf/issues/16).

### Fixed

- Error when using `from-build` when passing a `baseUrl` or `firstDocsPath`
  with incorrect slashes [#11](https://github.com/KohheePeace/docusaurus-pdf/issues/11).

## [1.1.2] - 2020-06-16

### Fixed

- Replace dependency on HummusJS with pdf-lib [#14](https://github.com/KohheePeace/docusaurus-pdf/pull/14)

## [1.1.1] - 2020-04-25

### Added

- Docker configuration files [#7](https://github.com/KohheePeace/docusaurus-pdf/pull/7)

### Fixed

- Allow starting puppeteer in `no-sandbox` mode.

## [1.1.0] - 2020-04-12
### Added

- Added `from-build` command to create a PDF from a docusuaurs build directory
  [#4](https://github.com/KohheePeace/docusaurus-pdf/pull/4)

## [1.0.0] - 2020-04-09
### Changed

- Removed `baseUrl` parameter. 

## [0.1.2] - 2020-04-03
### Added

- Allow specifying `baseUrl`
