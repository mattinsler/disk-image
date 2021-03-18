const path = require('path');
const { Module } = require('module');

function patchModule({ isMounted, memfs }) {
  function resolveFile(file) {
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

  const originalFindPath = Module._findPath;
  Module._findPath = function (request, paths, isMain) {
    if (path.isAbsolute(request)) {
      return isMounted(request) ? resolve(request) : originalFindPath(request, paths, isMain);
    } else {
      if (isMounted(path.join(paths[0], request))) {
        for (let x = 0; x < paths.length; ++x) {
          const res = resolve(path.join(paths[x], request));
          if (res) {
            return res;
          }
        }
      } else {
        return originalFindPath(request, paths, isMain);
      }
    }

    return false;
  };
}

module.exports = { patchModule };
