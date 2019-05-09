let path = require('path');
let { spawn } = require('child_process');

let lerna = path.join(__dirname, '../node_modules/.bin/lerna');

console.log('generating changelog...');

spawn(lerna, ['version', '--conventional-commits'], {
  stdio: 'inherit',
  env: Object.assign({}, process.env),
}).on('exit', process.exit);
