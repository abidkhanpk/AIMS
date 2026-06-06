const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('next-i18next/serverSideTranslations')) {
    content = content.replace(
      "import { serverSideTranslations } from 'next-i18next/serverSideTranslations';",
      "import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';"
    );
    fs.writeFileSync(file, content);
    console.log(`Fixed import in ${file}`);
  }
});
