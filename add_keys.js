const fs = require('fs');

function addKeys(filePath, newKeys) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(newKeys)) {
    if (typeof value === 'object') {
      content[key] = { ...content[key], ...value };
    } else {
      content[key] = value;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
}

const enKeys = {
  "menu": {
    "home": "Home",
    "individuals": "Individuals",
    "teachers": "Teachers",
    "parents": "Relatives",
    "students": "Students",
    "academic": "Academic",
    "progress": "Progress",
    "attendanceReports": "Attendance Reports",
    "reportCards": "Report Cards",
    "tests": "Tests & Exams",
    "financials": "Financials",
    "fees": "Fee",
    "feeVerification": "Fee Verification",
    "salaries": "Salaries",
    "parentRemarks": "Parent Remarks",
    "system": "System",
    "auditLogs": "Audit Logs",
    "academySettings": "Academy Settings",
    "menu": "Menu"
  }
};

const urKeys = {
  "menu": {
    "home": "ہوم",
    "individuals": "افراد",
    "teachers": "اساتذہ",
    "parents": "رشتہ دار",
    "students": "طلباء",
    "academic": "تعلیمی",
    "progress": "پیش رفت",
    "attendanceReports": "حاضری کی رپورٹیں",
    "reportCards": "رپورٹ کارڈز",
    "tests": "ٹیسٹ اور امتحانات",
    "financials": "مالیات",
    "fees": "فیس",
    "feeVerification": "فیس کی تصدیق",
    "salaries": "تنخواہیں",
    "parentRemarks": "والدین کے ریمارکس",
    "system": "سسٹم",
    "auditLogs": "آڈٹ لاگز",
    "academySettings": "اکیڈمی کی ترتیبات",
    "menu": "مینو"
  }
};

addKeys('public/locales/en/common.json', enKeys);
addKeys('public/locales/ur/common.json', urKeys);
