const fs = require('fs');
const v8 = require('v8');
const zlib = require('zlib');

function decodeImage(buffer) {
  return v8.deserialize(zlib.gunzipSync(buffer));
}

function loadImage(file) {
  return decodeImage(fs.readFileSync(file));
}

module.exports = { decodeImage, loadImage };
