const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const message = require('./message');
console.log(chalk.green(path.join(__dirname, 'pineapple.txt')));
const pineapple = fs.readFileSync(path.join(__dirname, 'pineapple.txt'), 'utf8');

console.log(pineapple);
console.log(chalk.magenta(message));
