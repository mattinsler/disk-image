const fs = require('fs');
const path = require('path');
// const chalk = require('chalk');

const message = require('./message');
// console.log(chalk.green(path.join(__dirname, 'pineapple.txt')));
console.log(path.join(__dirname, 'pineapple.txt'));
// const pineapple = fs.readFileSync(path.join(__dirname, 'pineapple.txt'), 'utf8');
const pineapple = fs.readFileSync('/Users/mattinsler/projects/disk-image/example/pineapple.txt', 'utf-8');

console.log(pineapple);
// console.log(chalk.magenta(message));
console.log(message);
