#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

yargs(hideBin(process.argv))
  .command(
    'build',
    'build an image',
    (yargs) => {
      yargs
        .option('output', {
          alias: 'o',
          type: 'string',
        })
        .option('target', {
          alias: 't',
          type: 'string',
        });
    },
    (argv) => {
      require('../src/commands/build')(argv);
    }
  )
  .command(
    'inspect image',
    'inspect an image',
    (yargs) => {
      yargs.positional('image', {
        type: 'string',
      });
    },
    (argv) => {
      require('../src/commands/inspect')(argv);
    }
  )
  .command(
    'run entrypoint',
    'mount images and run entrypoint',
    (yargs) => {
      yargs
        .positional('entrypoint', {
          type: 'string',
        })
        .option('config', {
          alias: 'c',
          type: 'string',
        })
        .option('volume', {
          alias: 'v',
          type: 'string',
        });
    },
    (argv) => {
      require('../src/commands/run')(argv);
    }
  )
  .strictCommands()
  .demandCommand(1).argv;
