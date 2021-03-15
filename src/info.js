const fs = require('fs');
const v8 = require('v8');
const zlib = require('zlib');

const diskImageFile = process.argv[2];

if (!fs.existsSync(diskImageFile)) {
  throw new Error(`Disk image file ${diskImageFile} does not exist.`);
}

const { roots, serve } = v8.deserialize(zlib.gunzipSync(fs.readFileSync(diskImageFile)));

function listFilesFromRoots(roots) {
  const files = [];

  function next(entry, parts = []) {
    if (!entry.entries || entry.entries.size === 0) {
      files.push('/' + parts.join('/'));
    } else {
      entry.entries.forEach((subEntry, pathPart) => {
        next(subEntry, [...parts, pathPart]);
      });
    }
  }

  next(roots.get(''));
  files.sort();

  return files;
}

console.log({
  files: listFilesFromRoots(roots),
  serve,
});
