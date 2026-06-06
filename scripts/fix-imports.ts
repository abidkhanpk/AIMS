import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

const files = globSync('src/**/*.tsx');

let count = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('from "next-i18next"') || content.includes("from 'next-i18next'")) {
    const updated = content.replace(/from\s+['"]next-i18next['"]/g, "from 'react-i18next'");
    fs.writeFileSync(file, updated, 'utf8');
    count++;
  }
}
console.log(`Fixed imports in ${count} files.`);
