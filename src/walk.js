const fs = require('fs');
const path = require('path');

function walk(dir, callbacks, parts = []) {
  const filenames = fs.readdirSync(dir);

  callbacks.directory(parts, dir, fs.statSync(dir));

  filenames.forEach((filename) => {
    const file = path.join(dir, filename);
    const fileParts = [...parts, filename];

    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      walk(file, callbacks, fileParts);
    } else {
      callbacks.file(fileParts, file, stat);
    }
  });
}

module.exports = { walk };
