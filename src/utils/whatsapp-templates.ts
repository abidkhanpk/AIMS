/**
 * AIMS WhatsApp Message Templates
 * 
 * All AIMS-specific Urdu message templates for WhatsApp automation.
 * These are AIMS-specific and do NOT belong in the generic whatsapp-server.
 */

// ─── Types ────────────────────────────────────────────────────

export interface AdminWelcomeParams {
  password: string;
}

export interface FeeReminderParams {
  parentName: string;
  studentName: string;
  feeTitle: string;
  amount: number;
  currency: string;
  dueDate: string;
  courseName?: string;
}

export interface AttendanceAlertParams {
  parentName: string;
  studentName: string;
  date: string;
  courseName: string;
  teacherName?: string;
}

export interface ProgressReportParams {
  parentName: string;
  studentName: string;
  courseName: string;
  date: string;
  attendance: string;
  lesson?: string;
  homework?: string;
  remarks?: string;
  teacherName?: string;
}

export interface FeePaymentConfirmationParams {
  parentName: string;
  studentName: string;
  feeTitle: string;
  amount: number;
  currency: string;
  paidDate: string;
}

export interface NewParentWelcomeParams {
  parentName: string;
  studentName: string;
  email: string;
  password: string;
  academyName?: string;
}

export interface NewTeacherWelcomeParams {
  teacherName: string;
  email: string;
  password: string;
  academyName?: string;
}

export interface TestResultParams {
  parentName: string;
  studentName: string;
  courseName: string;
  testTitle: string;
  testType: string;
  obtainedMarks: number;
  maxMarks: number;
  percentage: number;
  remarks?: string;
  teacherName?: string;
}

// ─── Message Templates ────────────────────────────────────────

/**
 * Welcome message for new academy admin (sent by developer)
 */
export function adminWelcomeMessage({ password }: AdminWelcomeParams): string {
  return `السلام علیکم ورحمۃ اللہ وبرکاتہ

ایمز (AIMS) ایپ میں خوش آمدید!

آپ کا ایڈمن اکاؤنٹ کامیابی کے ساتھ بنا دیا گیا ہے۔ لاگ اِن کے لیے درج ذیل معلومات استعمال کریں:

لنک: https://aims.absons.net
یوزر نیم: آپ کا فراہم کردہ ای میل ایڈریس
پاس ورڈ: ${password}

براہِ کرم پہلی مرتبہ لاگ اِن کرنے کے فوراً بعد اپنا پاس ورڈ تبدیل کر لیں۔

لاگ اِن کرنے کے بعد آپ معلمین، طلبہ اور رشتہ داروں کے اکاؤنٹس اپنے ایڈمن اکاؤنٹ سے خود بنا سکیں گے۔

کسی بھی رہنمائی کی ضرورت ہو تو رابطہ کر سکتے ہیں۔

جزاکم اللہ خیراً`;
}

/**
 * Fee reminder message (sent by admin to parents)
 */
export function feeReminderMessage({
  parentName,
  studentName,
  feeTitle,
  amount,
  currency,
  dueDate,
  courseName,
}: FeeReminderParams): string {
  const courseInfo = courseName ? `\nمضمون: ${courseName}` : '';
  return `السلام علیکم ورحمۃ اللہ وبرکاتہ

محترم ${parentName}،

یہ آپ کو مطلع کرنے کے لیے ہے کہ آپ کے ${studentName} کی فیس واجب الادا ہے:

فیس: ${feeTitle}${courseInfo}
رقم: ${currency} ${amount}
آخری تاریخ: ${dueDate}

براہِ کرم بروقت ادائیگی کریں۔

جزاکم اللہ خیراً`;
}

/**
 * Attendance alert (sent by admin to parents when student is absent)
 */
export function attendanceAlertMessage({
  parentName,
  studentName,
  date,
  courseName,
  teacherName,
}: AttendanceAlertParams): string {
  const teacherInfo = teacherName ? `\nاستاد: ${teacherName}` : '';
  return `السلام علیکم ورحمۃ اللہ وبرکاتہ

محترم ${parentName}،

آپ کو مطلع کیا جاتا ہے کہ ${studentName} آج (${date}) ${courseName} کی کلاس میں غیر حاضر رہے۔${teacherInfo}

اگر کوئی وجہ ہو تو براہِ کرم آگاہ فرمائیں۔

جزاکم اللہ خیراً`;
}

/**
 * Progress report summary (sent by admin to parents)
 */
export function progressReportMessage({
  parentName,
  studentName,
  courseName,
  date,
  attendance,
  lesson,
  homework,
  remarks,
  teacherName,
}: ProgressReportParams): string {
  let msg = `السلام علیکم ورحمۃ اللہ وبرکاتہ

محترم ${parentName}،

${studentName} کی ${courseName} میں پیشرفت کی رپورٹ (${date}):

حاضری: ${attendance}`;

  if (lesson) msg += `\nسبق: ${lesson}`;
  if (homework) msg += `\nہوم ورک: ${homework}`;
  if (remarks) msg += `\nملاحظات: ${remarks}`;
  if (teacherName) msg += `\nاستاد: ${teacherName}`;

  msg += `\n\nجزاکم اللہ خیراً`;
  return msg;
}

/**
 * Fee payment confirmation (sent by admin to parents after payment is verified)
 */
export function feePaymentConfirmationMessage({
  parentName,
  studentName,
  feeTitle,
  amount,
  currency,
  paidDate,
}: FeePaymentConfirmationParams): string {
  return `السلام علیکم ورحمۃ اللہ وبرکاتہ

محترم ${parentName}،

${studentName} کی فیس کی ادائیگی موصول ہو گئی ہے:

فیس: ${feeTitle}
رقم: ${currency} ${amount}
تاریخِ ادائیگی: ${paidDate}

آپ کا شکریہ۔

جزاکم اللہ خیراً`;
}

/**
 * Welcome message for new parent (sent by admin)
 */
export function newParentWelcomeMessage({
  parentName,
  studentName,
  email,
  password,
  academyName,
}: NewParentWelcomeParams): string {
  const academy = academyName || 'AIMS';
  return `السلام علیکم ورحمۃ اللہ وبرکاتہ

محترم ${parentName}،

${academy} میں خوش آمدید! آپ کا والدین اکاؤنٹ کامیابی سے بنا دیا گیا ہے۔ آپ اپنے بچے ${studentName} کی پیشرفت دیکھ سکتے ہیں۔

لنک: https://aims.absons.net
یوزر نیم: ${email}
پاس ورڈ: ${password}

براہِ کرم پہلی مرتبہ لاگ اِن کرنے کے بعد اپنا پاس ورڈ تبدیل کر لیں۔

جزاکم اللہ خیراً`;
}

/**
 * Welcome message for new teacher (sent by admin)
 */
export function newTeacherWelcomeMessage({
  teacherName,
  email,
  password,
  academyName,
}: NewTeacherWelcomeParams): string {
  const academy = academyName || 'AIMS';
  return `السلام علیکم ورحمۃ اللہ وبرکاتہ

محترم ${teacherName}،

${academy} میں خوش آمدید! آپ کا استاد اکاؤنٹ کامیابی سے بنا دیا گیا ہے۔

لنک: https://aims.absons.net
یوزر نیم: ${email}
پاس ورڈ: ${password}

براہِ کرم پہلی مرتبہ لاگ اِن کرنے کے بعد اپنا پاس ورڈ تبدیل کر لیں۔

جزاکم اللہ خیراً`;
}

/**
 * Test result notification (sent by admin to parents)
 */
export function testResultMessage({
  parentName,
  studentName,
  courseName,
  testTitle,
  testType,
  obtainedMarks,
  maxMarks,
  percentage,
  remarks,
  teacherName,
}: TestResultParams): string {
  let msg = `السلام علیکم ورحمۃ اللہ وبرکاتہ

محترم ${parentName}،

${studentName} کے ${testType} کا نتیجہ:

مضمون: ${courseName}
عنوان: ${testTitle}
حاصل نمبر: ${obtainedMarks}/${maxMarks}
فیصد: ${percentage.toFixed(1)}%`;

  if (remarks) msg += `\nملاحظات: ${remarks}`;
  if (teacherName) msg += `\nاستاد: ${teacherName}`;

  msg += `\n\nجزاکم اللہ خیراً`;
  return msg;
}

/**
 * Custom message — just a pass-through
 */
export function customMessage(text: string): string {
  return text;
}

/**
 * Get message type label (for display in UI)
 */
export const MESSAGE_TYPE_LABELS: Record<string, { en: string; ur: string }> = {
  WELCOME_ADMIN: { en: 'Admin Welcome', ur: 'ایڈمن خوش آمدید' },
  FEE_REMINDER: { en: 'Fee Reminder', ur: 'فیس کی یاد دہانی' },
  ATTENDANCE_ALERT: { en: 'Attendance Alert', ur: 'حاضری کی اطلاع' },
  PROGRESS_REPORT: { en: 'Progress Report', ur: 'پیشرفت رپورٹ' },
  FEE_CONFIRMATION: { en: 'Fee Payment Confirmation', ur: 'فیس ادائیگی کی تصدیق' },
  WELCOME_PARENT: { en: 'Parent Welcome', ur: 'والدین خوش آمدید' },
  WELCOME_TEACHER: { en: 'Teacher Welcome', ur: 'استاد خوش آمدید' },
  TEST_RESULT: { en: 'Test Result', ur: 'ٹیسٹ کا نتیجہ' },
  CUSTOM: { en: 'Custom Message', ur: 'حسب ضرورت پیغام' },
};
