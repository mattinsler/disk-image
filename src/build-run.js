const fs = require('fs');
const path = require('path');

const source = `
const __imports = {};

__imports['metro-memory-fs'] = (function(module){
${fs.readFileSync(require.resolve('metro-memory-fs'), 'utf-8')}
return module;
})({}).exports;

(function(require){
${fs.readFileSync(path.join(__dirname, 'run.js'), 'utf-8')}
})(function(request) {
  return __imports[request] || require(request);
});
`;

console.log(source);
