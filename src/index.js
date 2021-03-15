const fs = require('fs');
const v8 = require('v8');
const path = require('path');
const zlib = require('zlib');
const MemoryFs = require('metro-memory-fs');

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

function createDiskImage() {
  const mounts = [];
  const serveDirectories = [];

  function build() {
    const memfs = new MemoryFs({ platform: 'posix' });

    function setEntry(pathParts, value) {
      const entry = pathParts.slice(0, -1).reduce((parent, part) => parent.entries.get(part), memfs._roots.get(''));
      entry.entries.set(pathParts[pathParts.length - 1], value);
    }

    function mkdirp(parts) {
      parts.reduce((parent, part) => {
        if (!parent.entries.has(part)) {
          parent.entries.set(part, memfs._makeDir(0o777));
        }
        return parent.entries.get(part);
      }, memfs._roots.get(''));
    }

    function addDirectory(pathParts, _actualPath, stat) {
      setEntry(pathParts, memfs._makeDir(stat.mode));
    }

    function addFile(pathParts, actualPath, stat) {
      setEntry(pathParts, {
        content: fs.readFileSync(actualPath),
        gid: stat.gid,
        id: memfs._getId(),
        mode: stat.mode || 0o666,
        uid: stat.uid,
        type: 'file',
        watchers: [],
      });
    }

    function mountDirectory(src, dst) {
      const dstParts = dst.split('/').filter(Boolean);
      mkdirp(dstParts);

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
      const stat = fs.statSync(src);
      addFile(dstParts, actualPath, stat);
    }

    mounts.forEach(({ dst, src }) => {
      if (fs.statSync(src).isDirectory()) {
        mountDirectory(src, dst);
      } else {
        mountFile(src, dst);
      }
    });

    return {
      roots: memfs._roots,
      serve: serveDirectories,
    };
  }

  return {
    add(dst, src) {
      if (!path.isAbsolute(dst)) {
        throw new Error(`mount: destination must be an absolute path (${dst}).`);
      }
      mounts.push({ dst, src: path.resolve(src) });
    },
    build,
    serve(...dirs) {
      serveDirectories.push(...dirs);
    },
    writeToFile(file) {
      const buffer = zlib.gzipSync(v8.serialize(build()));
      return fs.writeFileSync(file, buffer);
    },
  };
}

module.exports = { createDiskImage };
