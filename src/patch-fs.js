const fs = require('fs');

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

function patchFs({ isMounted, memfs, originalfs }) {
  Object.keys(memfs).forEach((key) => {
    fs[key] = (...args) => {
      if (FILE_DESCRIPTOR_METHODS.has(key)) {
        if (memfs._fds.has(args[0])) {
          return memfs[key].apply(memfs, args);
        } else {
          return originalfs[key].apply(originalfs, args);
        }
      } else if (SRC_DEST_MEHTODS.has(key)) {
        const srcIsMounted = isMounted(args[0]);
        const destIsMounted = isMounted(args[1]);

        if (srcIsMounted !== destIsMounted) {
          throw new Error(
            `Cannot handle fs methods where the src and dest are not either both within the served directories or both outside the served directories: ${args[0]} => ${args[1]}.`
          );
        }

        if (srcIsMounted) {
          return memfs[key].apply(memfs, args);
        } else {
          return originalfs[key].apply(originalfs, args);
        }
      } else {
        if (isMounted(args[0])) {
          return memfs[key].apply(memfs, args);
        } else {
          return originalfs[key].apply(originalfs, args);
        }
      }
    };
  });
}

module.exports = { patchFs };
