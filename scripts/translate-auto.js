const fs = require('fs');
const path = require('path');

const urPath = path.join(__dirname, '../public/locales/ur/common.json');
const urJson = JSON.parse(fs.readFileSync(urPath, 'utf8'));

async function translate(text) {
  if (!text || typeof text !== 'string') return text;
  // If it's already Urdu, skip
  if (/[\u0600-\u06FF]/.test(text)) return text;
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0][0][0];
  } catch (e) {
    console.error(`Error translating: ${text}`, e);
    return text;
  }
}

async function run() {
  const auto = urJson.auto;
  const keys = Object.keys(auto);
  let count = 0;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = auto[key];
    
    if (typeof val === 'string' && !/[\u0600-\u06FF]/.test(val)) {
      const translated = await translate(val);
      auto[key] = translated;
      count++;
      if (count % 10 === 0) {
        console.log(`Translated ${count}/${keys.length}`);
        fs.writeFileSync(urPath, JSON.stringify(urJson, null, 2));
      }
      // Rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  fs.writeFileSync(urPath, JSON.stringify(urJson, null, 2));
  console.log(`Finished translating ${count} items.`);
}

run();
