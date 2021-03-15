const fs = require('fs');
const path = require('path');

const { createDiskImage } = require('../src');

function usage(err) {
  if (err) {
    console.error(err.stack);
  }
  console.error('Usage: disk-image CONFIG_FILE OUTPUT_FILE');
  process.exit(1);
}

if (process.argv.length !== 4) {
  usage();
}

if (!fs.existsSync(process.argv[2])) {
  usage(new Error(`Cannot find config file: ${process.argv[2]}.`));
}

const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

const diskImage = createDiskImage();

diskImage.serve(...(config.serve || []));

Object.entries(config.files || {}).forEach(([dst, src]) => diskImage.add(dst, path.resolve(src)));

diskImage.writeToFile(process.argv[3]);
