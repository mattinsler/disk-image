const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/commands/run.js',
  output: {
    filename: 'run-disk-image.js',
    path: path.resolve(__dirname, 'bin'),
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /metro-memory-fs\/.*\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: ['@babel/plugin-proposal-class-properties'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      entryOnly: true,
      raw: true,
    }),
    {
      apply(compiler) {
        compiler.hooks.done.tap('On Done Plugin', () => {
          fs.chmodSync(path.resolve(__dirname, 'bin', 'run-disk-image.js'), 0o755);
        });
      },
    },
  ],
};
