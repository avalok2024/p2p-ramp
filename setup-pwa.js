const fs = require('fs');
const https = require('https');
const path = require('path');

const apps = ['user-app', 'merchant-app'];
const sizes = [192, 512];

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const app of apps) {
    const dir = path.join(__dirname, 'apps', app, 'public', 'icons');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const text = app === 'merchant-app' ? 'Pro' : 'RX';
    
    for (const size of sizes) {
      const url = `https://placehold.co/${size}x${size}/0f0f1a/6366f1.png?text=${text}`;
      const dest = path.join(dir, `icon-${size}.png`);
      console.log(`Downloading ${dest}...`);
      await download(url, dest);
    }
  }
  console.log('Done generating icons!');
}

run();
