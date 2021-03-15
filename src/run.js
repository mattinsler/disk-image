const fs = require('fs');
const v8 = require('v8');
const path = require('path');
const zlib = require('zlib');
const { Module } = require('module');
const MemoryFs = require('metro-memory-fs');

function log(...args) {
  if (!!process.env.DEBUG) {
    console.log(...args);
  }
}

// copyFile, copyFileSync ==> (src, dest)
// link, linkSync ==> (existingPath, newPath)
// rename, renameSync ==> (oldPath, newPath)
// symlink, symlinkSync ==> (target, path)

const SRC_DEST_MEHTODS = new Set([
  'copyFile',
  'copyFileSync',
  'link',
  'linkSync',
  'rename',
  'renameSync',
  'symlink',
  'symlinkSync',
]);

const FILE_DESCRIPTOR_METHODS = new Set([
  'close',
  'closeSync',
  'fchmod',
  'fchmodSync',
  'fchown',
  'fchownSync',
  'fdatasync',
  'fdatasyncSync',
  'fstat',
  'fstatSync',
  'fsync',
  'fsyncSync',
  'ftruncate',
  'ftruncateSync',
  'futimes',
  'futimesSync',
  'read',
  'readSync',
  'readv',
  'readvSync',
  'write',
  'writeSync',
  'writev',
  'writevSync',
]);

function patchModule(memfs, serveDirectories) {
  const directoriesToServe = [...serveDirectories].sort();

  function resolveFile(file) {
    log(`resolveFile(${file})`);
    if (memfs.existsSync(file) && !memfs.statSync(file).isDirectory()) {
      return file;
    }
    return false;
  }

  function resolveFileWithExtensions(file) {
    return [file, `${file}.js`, path.join(file, 'index.js')].find(resolveFile) || false;
  }

  function resolve(file) {
    const pkgJsonFile = path.join(file, 'package.json');
    if (memfs.existsSync(pkgJsonFile)) {
      const { main } = JSON.parse(memfs.readFileSync(pkgJsonFile, 'utf8'));
      if (main) {
        return resolveFileWithExtensions(path.join(file, main));
      } else {
        return resolveFile(path.join(file, 'index.js'));
      }
    }

    return resolveFileWithExtensions(file);
  }

  Module._findPath = function (request, paths, isMain) {
    log(`_findPath(${request}, ${paths}, ${isMain})`);

    if (path.isAbsolute(request)) {
      return resolve(request);
    } else {
      for (let x = 0; x < paths.length; ++x) {
        const res = resolve(path.join(paths[x], request));
        if (res) {
          return res;
        }
      }
    }

    return false;
  };

  function isServed(file) {
    log(`isServed(${file})`);
    return directoriesToServe.findIndex((dir) => file.startsWith(dir)) !== -1;
  }

  const originalfs = {};
  Object.keys(memfs).forEach((key) => {
    originalfs[key] = fs[key];

    fs[key] = (...args) => {
      log(key, args);

      if (FILE_DESCRIPTOR_METHODS.has(key)) {
        if (memfs._fds.has(args[0])) {
          return memfs[key].apply(memfs, args);
        } else {
          return originalfs[key].apply(originalfs, args);
        }
      } else if (SRC_DEST_MEHTODS.has(key)) {
        const srcIsServed = isServed(args[0]);
        const destIsServed = isServed(args[1]);
        if (srcIsServed !== destIsServed) {
          throw new Error(
            `Cannot handle fs methods where the src and dest are not either both within the served directories or both outside the served directories: ${args[0]} => ${args[1]}.`
          );
        }
        if (srcIsServed) {
          return memfs[key].apply(memfs, args);
        } else {
          return originalfs[key].apply(originalfs, args);
        }
      } else {
        if (isServed(args[0])) {
          return memfs[key].apply(memfs, args);
        } else {
          return originalfs[key].apply(originalfs, args);
        }
      }
    };
  });
}

if (process.argv.length < 4) {
  console.error('Usage: node run-disk-image.js DISK_IMAGE ENTRYPOINT');
  process.exit(1);
}

const diskImageFile = process.argv[2];
const entrypoint = process.argv[3];

if (!fs.existsSync(diskImageFile)) {
  throw new Error(`Disk image file ${diskImageFile} does not exist.`);
}

const { roots, serve } = v8.deserialize(zlib.gunzipSync(fs.readFileSync(diskImageFile)));
const memfs = new MemoryFs({ cwd: () => process.cwd(), platform: 'posix' });
memfs._roots = roots;
patchModule(memfs, serve);
Module._load(entrypoint, undefined, true);
