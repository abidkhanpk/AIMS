const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');
files.push('src/components/Layout.tsx'); // just in case

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('next-i18next')) {
    content = content.replace(/import \{ useTranslation \} from 'next-i18next(\/pages)?';/g, "import { useTranslation } from 'react-i18next';");
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
