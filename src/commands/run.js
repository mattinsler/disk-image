const fs = require('fs');
const path = require('path');

const { createVm } = require('../vm');

function run({ config, entrypoint, volume }) {
  const vm = createVm();

  if (config) {
    config = path.resolve(config);
    const configDir = path.dirname(config);
    config = JSON.parse(fs.readFileSync(config, 'utf-8'));
    Object.entries(config).forEach(([location, diskFile]) => vm.mount(location, path.resolve(configDir, diskFile)));
  } else if (volume) {
    const [location, image] = volume.split(':');
    vm.mount(location, path.resolve(image));
  }

  vm.execute(entrypoint);
}

if (require.main === module) {
  function usage(errText) {
    errText && console.log(`ERROR: ${errText}`);
    console.log('Usage: run-disk-image CONFIG_FILE ENTRYPOINT');
    process.exit(1);
  }

  process.argv.length !== 4 && usage();
  let [config, entrypoint] = process.argv.slice(2);
  config = path.resolve(config);
  !fs.existsSync(config) && usage(`Cannot find config file ${config}.`);

  run({ config, entrypoint });
}

module.exports = run;
