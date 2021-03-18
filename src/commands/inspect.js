const fs = require('fs');
const path = require('path');

const { loadImage } = require('../load-image');

function inspect({ image }) {
  if (image) {
    image = path.resolve(image);
    const items = loadImage(image);
    console.log(items.map((item) => path.join(...item[0])).join('\n'));
  }
}

module.exports = inspect;
