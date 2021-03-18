const fs = require('fs');
const path = require('path');

const { createBuilder } = require('../builder');

function build({ output, target }) {
  const builder = createBuilder();

  if (target) {
    target = path.resolve(target);
    if (!fs.existsSync(target)) {
      throw new Error(`Target file or directory does not exist: ${target}.`);
    }
    builder.add('/', target);
  }

  if (output) {
    fs.writeFileSync(path.resolve(output), builder.toBuffer());
  } else {
    console.log(builder.build());
  }
}

module.exports = build;
