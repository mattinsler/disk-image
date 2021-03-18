const { Module } = require('module');
const MemoryFs = require('metro-memory-fs');

const { patchFs } = require('./patch-fs');
const { decodeImage } = require('./load-image');
const { patchModule } = require('./patch-module');

const fs = require('fs');
const originalfs = Object.keys(fs).reduce((agg, k) => {
  agg[k] = fs[k];
  return agg;
}, {});

function createContext(mounts) {
  mounts = [...mounts].sort((l, r) => {
    const cmp = r.location.length - l.location.length;
    return cmp === 0 ? r.location.localeCompare(l.location) : cmp;
  });

  function findMount(file) {
    return mounts.find(({ location }) => file.startsWith(location));
  }

  const memfs = new MemoryFs({ cwd: () => process.cwd(), platform: 'posix' });

  function ensureDirectory(pathParts) {
    return pathParts.reduce((parent, part, idx) => {
      if (!parent.entries.has(part)) {
        let mode = 0o777;
        try {
          mode = originalfs.statSync('/' + pathParts.slice(0, idx).join('/')).mode;
        } catch (err) {}
        parent.entries.set(part, memfs._makeDir(mode));
      }
      return parent.entries.get(part);
    }, memfs._roots.get(''));
  }

  function setEntry(rootEntry, pathParts, value) {
    const entry = pathParts.slice(0, -1).reduce((parent, part) => parent.entries.get(part), rootEntry);
    entry.entries.set(pathParts[pathParts.length - 1], value);
  }

  function addDirectory(rootEntry, pathParts, mode) {
    setEntry(rootEntry, pathParts, memfs._makeDir(mode));
  }
  function addFile(rootEntry, pathParts, mode, gid, uid, content) {
    setEntry(rootEntry, pathParts, {
      content,
      gid,
      id: memfs._getId(),
      mode,
      uid,
      type: 'file',
      watchers: [],
    });
  }

  function ensureMounted(mount) {
    if (!mount.isMounted) {
      const imageItems = decodeImage(originalfs.readFileSync(mount.imageFile));
      const mountLocationEntry = ensureDirectory(mount.location.split('/').filter(Boolean));

      imageItems.forEach(([pathParts, [type, ...args]]) => {
        if (type === 'd') {
          addDirectory(mountLocationEntry, pathParts, ...args);
        } else if (type === 'f') {
          addFile(mountLocationEntry, pathParts, ...args);
        }
      });

      mount.isMounted = true;
    }
  }

  return {
    isMounted(file) {
      const mount = findMount(file);
      if (mount) {
        ensureMounted(mount);
        return true;
      }
      return false;
    },
    memfs,
    originalfs,
  };
}

function createVm() {
  const mounts = [];

  return {
    execute(entrypoint) {
      const context = createContext(mounts);
      patchFs(context);
      patchModule(context);
      Module._load(entrypoint, undefined, true);
    },
    mount(location, imageFile) {
      mounts.push({ location, imageFile });
    },
  };
}

module.exports = { createVm };
