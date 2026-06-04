import * as fs from 'fs';
import * as path from 'path';

const extractedPath = path.join(__dirname, 'extracted-strings.json');
const urPath = path.join(__dirname, '../public/locales/ur/common.json');
const enPath = path.join(__dirname, '../public/locales/en/common.json');

const extracted = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

function mergeTo(file: string) {
    let current: Record<string, any> = {};
    if (fs.existsSync(file)) {
        current = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    
    current['auto'] = extracted;
    
    fs.writeFileSync(file, JSON.stringify(current, null, 2));
    console.log(`Merged ${Object.keys(extracted).length} keys to ${file}`);
}

mergeTo(urPath);
mergeTo(enPath);
