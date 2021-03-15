const path = require('path');

const { createDiskImage } = require('./src');

const diskImage = createDiskImage();

diskImage.serve('/usr/local/src');

diskImage.add('/usr/local/src', path.join(__dirname, 'example'));
diskImage.add('/usr/local/src/node_modules', path.join(__dirname, 'node_modules'));

diskImage.writeToFile('example.disk');
