const fs = require('fs');
const glob = require('glob');

const urJsonPath = 'public/locales/ur/common.json';
const enJsonPath = 'public/locales/en/common.json';
const urJson = JSON.parse(fs.readFileSync(urJsonPath, 'utf-8'));
const enJson = JSON.parse(fs.readFileSync(enJsonPath, 'utf-8'));

function hasKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === undefined || curr === null) return false;
    curr = curr[part];
  }
  return curr !== undefined;
}

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

const files = glob.sync('src/**/*.tsx');
const missing = new Map();
const tRegex = /t\(\s*(['\"\`])(.*?)\1\s*,\s*(['\"\`])(.*?)\3\s*\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[2];
    const fallback = match[4];
    if (!hasKey(urJson, key)) {
       missing.set(key, fallback);
    }
  }
}

// Add common ones we manually saw
missing.set('auto.markAllRead', 'Mark all read');
missing.set('auto.justNow', 'Just now');
missing.set('auto.minutesAgo', 'm ago');
missing.set('auto.hoursAgo', 'h ago');
missing.set('auto.daysAgo', 'd ago');
missing.set('auto.subRenewalDue', 'Subscription Renewal Due');
missing.set('auto.feeDueReminder', 'Fee Due Reminder');
missing.set('auto.subRenewalReminder', 'Subscription Renewal Reminder');
missing.set('auto.sysDev', 'System Developer');
missing.set('auto.subExpire1', 'Your monthly subscription will expire on');
missing.set('auto.subExpire2', 'Please renew to continue using the system.');
missing.set('auto.roles.ADMIN', 'Admin');
missing.set('auto.roles.TEACHER', 'Teacher');
missing.set('auto.roles.PARENT', 'Parent');
missing.set('auto.roles.STUDENT', 'Student');
missing.set('auto.roles.DEVELOPER', 'Developer');

console.log(`Found ${missing.size} missing strings.`);
fs.writeFileSync('scripts/missing-strings.json', JSON.stringify(Object.fromEntries(missing), null, 2));
