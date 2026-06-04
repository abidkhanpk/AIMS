const fs = require('fs');

const enKeys = {
  "dashboard": {
    "studentDashboard": "Student Dashboard",
    "trackProgress": "Track your academic progress across all subjects",
    "progress": "Progress",
    "welcomeBack": "Welcome back",
    "overallProgress": "Overall Progress",
    "noData": "No Data",
    "noProgressRecorded": "No progress recorded yet",
    "currentAssignments": "Current Assignments",
    "noAssignmentsFound": "No Assignments Found",
    "noAssignmentsMsg": "You don't have any assignments yet. Please contact your administrator to get assigned to subjects and teachers.",
    "subject": "Subject",
    "teacher": "Teacher",
    "schedule": "Schedule",
    "classDays": "Class Days",
    "status": "Status",
    "active": "Active",
    "inactive": "Inactive",
    "time": "Time",
    "duration": "Duration",
    "minutes": "minutes",
    "notSpecified": "Not specified",
    "noSubjectsAssigned": "No Subjects Assigned",
    "noSubjectsMsg": "You don't have any subjects assigned yet. Please contact your administrator.",
    "currentProgress": "Current Progress",
    "noProgressUpdates": "No progress updates yet",
    "teacherUpdateMsg": "Your teacher will update your progress soon",
    "progressHistory": "Progress History",
    "updates": "Updates",
    "date": "Date",
    "lesson": "Lesson",
    "attendance": "Attendance",
    "remarks": "Remarks",
    "testsAndExams": "Tests & Exams",
    "testResults": "Your tests & exam results",
    "trackMarks": "Track obtained marks, percentages, and remarks",
    "averageScore": "Average score",
    "noTestsRecorded": "No Tests Recorded",
    "teachersWillAddTests": "Your teachers will add test and exam results here once available.",
    "recentTests": "Recent Tests & Exams",
    "testExam": "Test/Exam",
    "type": "Type",
    "score": "Score",
    "percentage": "Percentage",
    "performance": "Performance",
    "exam": "Exam",
    "homework": "Homework",
    "other": "Other",
    "quiz": "Quiz",
    "reportCards": "Report Cards",
    "feeVouchers": "Fee Vouchers",
    "feeManagement": "Fee Management",
    "total": "Total",
    "noFeesFound": "No fees found",
    "title": "Title",
    "description": "Description",
    "amount": "Amount",
    "dueDate": "Due Date",
    "action": "Action",
    "payNow": "Pay Now"
  }
};

const urKeys = {
  "dashboard": {
    "studentDashboard": "سٹوڈنٹ ڈیش بورڈ",
    "trackProgress": "تمام مضامین میں اپنی تعلیمی پیشرفت کو ٹریک کریں",
    "progress": "پیشرفت",
    "welcomeBack": "خوش آمدید",
    "overallProgress": "مجموعی پیشرفت",
    "noData": "کوئی ڈیٹا نہیں",
    "noProgressRecorded": "ابھی تک کوئی پیشرفت ریکارڈ نہیں ہوئی",
    "currentAssignments": "موجودہ اسائنمنٹس",
    "noAssignmentsFound": "کوئی اسائنمنٹس نہیں ملیں",
    "noAssignmentsMsg": "آپ کی ابھی تک کوئی اسائنمنٹ نہیں ہے۔ براہ کرم مضامین اور اساتذہ کو تفویض کرنے کے لیے اپنے منتظم سے رابطہ کریں۔",
    "subject": "مضمون",
    "teacher": "استاد",
    "schedule": "شیڈول",
    "classDays": "کلاس کے دن",
    "status": "حالت",
    "active": "فعال",
    "inactive": "غیر فعال",
    "time": "وقت",
    "duration": "دورانیہ",
    "minutes": "منٹ",
    "notSpecified": "وضاحت نہیں کی گئی",
    "noSubjectsAssigned": "کوئی مضامین تفویض نہیں کیے گئے",
    "noSubjectsMsg": "آپ کو ابھی تک کوئی مضامین تفویض نہیں کیے گئے ہیں۔ براہ کرم اپنے منتظم سے رابطہ کریں۔",
    "currentProgress": "موجودہ پیشرفت",
    "noProgressUpdates": "ابھی تک پیشرفت کی کوئی اپ ڈیٹ نہیں",
    "teacherUpdateMsg": "آپ کے استاد جلد ہی آپ کی پیشرفت کو اپ ڈیٹ کریں گے",
    "progressHistory": "پیشرفت کی تاریخ",
    "updates": "اپ ڈیٹس",
    "date": "تاریخ",
    "lesson": "سبق",
    "attendance": "حاضری",
    "remarks": "ریمارکس",
    "testsAndExams": "ٹیسٹ اور امتحانات",
    "testResults": "آپ کے ٹیسٹ اور امتحان کے نتائج",
    "trackMarks": "حاصل کردہ نمبر، فیصد اور ریمارکس کو ٹریک کریں",
    "averageScore": "اوسط سکور",
    "noTestsRecorded": "کوئی ٹیسٹ ریکارڈ نہیں ہوا",
    "teachersWillAddTests": "آپ کے اساتذہ ٹیسٹ اور امتحان کے نتائج دستیاب ہونے پر یہاں شامل کریں گے۔",
    "recentTests": "حالیہ ٹیسٹ اور امتحانات",
    "testExam": "ٹیسٹ/امتحان",
    "type": "قسم",
    "score": "سکور",
    "percentage": "فیصد",
    "performance": "کارکردگی",
    "exam": "امتحان",
    "homework": "ہوم ورک",
    "other": "دیگر",
    "quiz": "کوئز",
    "reportCards": "رپورٹ کارڈز",
    "feeVouchers": "فیس واؤچرز",
    "feeManagement": "فیس مینجمنٹ",
    "total": "کل",
    "noFeesFound": "کوئی فیس نہیں ملی",
    "title": "عنوان",
    "description": "تفصیل",
    "amount": "رقم",
    "dueDate": "مقررہ تاریخ",
    "action": "عمل",
    "payNow": "ابھی ادا کریں"
  }
};

function addKeys(filePath, newKeys) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(newKeys)) {
    if (typeof value === 'object' && content[key]) {
      content[key] = { ...content[key], ...value };
    } else {
      content[key] = value;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
}

addKeys('public/locales/en/common.json', enKeys);
addKeys('public/locales/ur/common.json', urKeys);
