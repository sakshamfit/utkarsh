'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'booking.js', 'validation.js', 'interactions.js', 'site-config.js', 'assets/portrait.webp']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.copyFileSync(path.join(root, 'node_modules/libphonenumber-js/bundle/libphonenumber-min.js'), path.join(output, 'assets/phone-numbers.js'));
fs.copyFileSync(path.join(root, 'node_modules/libphonenumber-js/LICENSE'), path.join(output, 'assets/phone-numbers.LICENSE.txt'));
console.log('Built portfolio assets in public/.');
