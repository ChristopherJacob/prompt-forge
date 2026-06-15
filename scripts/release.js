'use strict';

const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const swPath = path.join(__dirname, '../sw.js');
let sw = fs.readFileSync(swPath, 'utf8');

const newCacheName = 'prompt-forge-v' + pkg.version;
sw = sw.replace(/const CACHE_NAME = 'prompt-forge-v[^']+';/, "const CACHE_NAME = '" + newCacheName + "';");
fs.writeFileSync(swPath, sw, 'utf8');

console.log('sw.js CACHE_NAME set to', newCacheName);
