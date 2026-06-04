const fs = require('fs');
const https = require('https');

const missingPath = 'scripts/missing-strings.json';
const urJsonPath = 'public/locales/ur/common.json';
const enJsonPath = 'public/locales/en/common.json';

const missingStrings = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
const urJson = JSON.parse(fs.readFileSync(urJsonPath, 'utf8'));
const enJson = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

function setKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (curr[part] === undefined) curr[part] = {};
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = value;
}

async function translateText(text, targetLang) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed[0].map(x => x[0]).join(''));
        } catch (e) {
          resolve(text);
        }
      });
    }).on('error', (e) => resolve(text));
  });
}

async function main() {
  const entries = Object.entries(missingStrings);
  let count = 0;
  
  for (const [key, fallback] of entries) {
    const urTranslation = await translateText(fallback, 'ur');
    setKey(urJson, key, urTranslation);
    setKey(enJson, key, fallback);
    
    count++;
    if (count % 10 === 0) {
      console.log(`Translated ${count}/${entries.length}`);
      fs.writeFileSync(urJsonPath, JSON.stringify(urJson, null, 2));
      fs.writeFileSync(enJsonPath, JSON.stringify(enJson, null, 2));
    }
    
    // throttle
    await new Promise(r => setTimeout(r, 200));
  }
  
  fs.writeFileSync(urJsonPath, JSON.stringify(urJson, null, 2));
  fs.writeFileSync(enJsonPath, JSON.stringify(enJson, null, 2));
  console.log(`Finished translating ${entries.length} missing items.`);
}

main().catch(console.error);
