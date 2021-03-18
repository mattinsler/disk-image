const fs = require('fs');
const v8 = require('v8');
const path = require('path');
const zlib = require('zlib');

const { walk } = require('./walk');

function createBuilder() {
  const targets = [];

  function build() {
    const entries = [];
    const entryPathsSet = new Set(['']);

    function setEntry(pathParts, value) {
      const entryPath = pathParts.join('/');

      if (!entryPathsSet.has(entryPath)) {
        entryPathsSet.add(entryPath);
        entries.push([pathParts, value]);
      }
    }

    function addDirectory(pathParts, _actualPath, stat) {
      setEntry(pathParts, ['d', stat.mode || 0o777]);
    }

    function addFile(pathParts, actualPath, stat) {
      setEntry(pathParts, ['f', stat.mode || 0o666, stat.gid, stat.uid, fs.readFileSync(actualPath)]);
    }

    function mountDirectory(src, dst) {
      const dstParts = dst.split('/').filter(Boolean);
      addDirectory(dstParts, src, fs.statSync(src));

      walk(src, {
        directory(pathParts, actualPath, stat) {
          addDirectory([...dstParts, ...pathParts], actualPath, stat);
        },
        file(pathParts, actualPath, stat) {
          addFile([...dstParts, ...pathParts], actualPath, stat);
        },
      });
    }

    function mountFile(src, dst) {
      const dstParts = dst.split('/').filter(Boolean);
      addFile(dstParts, src, fs.statSync(src));
    }

    targets.forEach(({ dst, src }) => {
      if (fs.statSync(src).isDirectory()) {
        mountDirectory(src, dst);
      } else {
        mountFile(src, dst);
      }
    });

    entries.sort((l, r) => {
      const len = Math.min(l[0].length, r[0].length);

      for (let x = 0; x < len; ++x) {
        const res = l[0][x].localeCompare(r[0][x]);
        if (res !== 0) {
          return res;
        }
      }

      return l[0].length - r[0].length;
    });

    return entries;
  }

  return {
    add(dst, src) {
      if (!path.isAbsolute(src) || !path.isAbsolute(dst)) {
        throw new Error(`Source and destination must be an absolute path (${dst}).`);
      }
      targets.push({ dst, src });
    },
    build,
    toBuffer() {
      return zlib.gzipSync(v8.serialize(build()));
    },
  };
}

module.exports = { createBuilder };
