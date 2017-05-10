# rsvg-brunch

*Copyright 2017, Caleb Evans*  
*Released under the MIT License*

[![Build Status](https://travis-ci.org/caleb531/rsvg-brunch.svg?branch=master)](https://travis-ci.org/caleb531/rsvg-brunch)

This plugin enables you to generate PNG icons of various sizes from one or more
SVG files.

## Usage

### 1. Install system-wide librsvg

#### macOS  
```bash
brew install librsvg
```

#### Ubuntu
```bash
sudo apt-get install librsvg2-dev
```

#### RedHat / OpenSUSE
```bash
sudo yum install librsvg2-devel
```

#### Windows

See [this blog post][librsvg-win] for librsvg Windows binaries.

[librsvg-win]: http://opensourcepack.blogspot.com/2012/06/rsvg-convert-svg-image-conversion-tool.html

### 2. Set plugin options

In `brunch-config.js`, you can provide options which should be passed to the
plugin. 

```js
module.exports = {
  // ...
  plugins: {
    rsvg: {
      // A single "conversion" takes a single SVG file and generates one or more
      // output files (PNG by default)
      conversions: [{
        // The path to the input SVG file
        input: 'app/icons/app-icon.svg',
        // Default values for the below output files (as shown below, these
        // defaults can be overridden)
        outputDefaults: {path: 'icons/app-icon-{w}x{h}.png'},
        // A list of output files to generate
        output: [
          // If the height is not specified, it is assumed to be equal to the
          // width (or vice-versa)
          {width: 32, path: 'favicon.png'},
          {width: 180, path: 'apple-touch-icon.png'},
          // The path for the below icons will inherit from outputDefaults
          {width: 192},
          {width: 256},
          {width: 384},
          {width: 512}
        ]
      }]
    }
  }
  // ...
};
```

The above configuration will generate the following icons in the user's defined
public directory for the project (usually `public/`):

- `favicon.png` (size: 32 x 32)
- `apple-touch-icon.png` (size: 180 x 180)
- `icons/app-icon-192x192.png` (size: 192 x 192)
- `icons/app-icon-256x256.png` (size: 256 x 256)
- `icons/app-icon-384x384.png` (size: 384 x 384)
- `icons/app-icon-512x512.png` (size: 512 x 512)

### Path variables

You will have noticed above that any of the output paths can contain references
to that output file's width and height, enclosed in curly brackets. Available
variables are:

- `{width}` (alias: `{w}`)
- `{height}` (alias: `{h}`)
- `{format}` (alias: `{f}`)

### Configure Travis CI (if necessary)

Because rsvg-brunch requires librsvg to be installed, you'll need to add the
following to your `.travis.yml` if you use Travis CI:

```yml
addons:
  apt:
    sources:
    - ubuntu-toolchain-r-test
    packages:
    - g++-4.8
    - librsvg2-dev
env:
  - CXX=g++-4.8
```
