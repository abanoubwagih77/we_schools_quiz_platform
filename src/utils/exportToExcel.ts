import * as XLSX from 'xlsx';
import { Quiz, QuizQuestion, WeekFolder } from '../types';

export interface ExportQuizOptions {
  quizzes: Quiz[];
  folders?: WeekFolder[];
  fileName?: string;
  specificQuizTitle?: string;
}

/**
 * Format questions into an Excel worksheet (.xlsx) and trigger download.
 */
export function exportQuizzesToExcel({
  quizzes,
  folders = [],
  fileName,
  specificQuizTitle,
}: ExportQuizOptions) {
  if (!quizzes || quizzes.length === 0) {
    alert('لا توجد أسئلة متاحة للتصدير حالياً.');
    return;
  }

  // Create folder lookup
  const folderMap = new Map<string, string>();
  folders.forEach((f) => {
    folderMap.set(f.id, f.title);
  });

  // Prepare table rows
  const rows: Record<string, any>[] = [];

  quizzes.forEach((quiz) => {
    const folderName = quiz.folderId ? folderMap.get(quiz.folderId) || 'بدون مجلد' : 'عام';
    const targetClassesStr = quiz.targetClasses && quiz.targetClasses.length > 0
      ? quiz.targetClasses.join(', ')
      : 'جميع الفصول (A1-A6)';

    quiz.questions.forEach((q: QuizQuestion, index: number) => {
      // Human-readable type
      let typeArabic = 'اختيار من متعدد (MCQ)';
      let optionsStr = '—';
      let correctAnswerStr = '—';

      if (q.type === 'mcq') {
        typeArabic = 'اختيار من متعدد (MCQ)';
        optionsStr = q.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n');
        correctAnswerStr = `${String.fromCharCode(65 + q.correctOptionIndex)}) ${q.options[q.correctOptionIndex] || ''}`;
      } else if (q.type === 'true_false') {
        typeArabic = 'صح أو خطأ (True / False)';
        optionsStr = 'A) TRUE\nB) FALSE';
        correctAnswerStr = q.correctBoolean ? 'TRUE (صح)' : 'FALSE (خطأ)';
      } else if (q.type === 'essay') {
        typeArabic = 'سؤال مقالي / مفهوم علمي (Essay)';
        optionsStr = 'سؤال مقالي - لا توجد خيارات متعددة';
        correctAnswerStr = q.modelAnswer || '—';
      } else if (q.type === 'matching') {
        typeArabic = 'توصيل ومطابقة (Matching)';
        const lefts = q.leftItems.map((it, i) => `${i + 1}. ${it.text}`).join(' | ');
        const rights = q.rightItems.map((it, i) => `${String.fromCharCode(65 + i)}. ${it.text}`).join(' | ');
        optionsStr = `العمود A: ${lefts}\nالعمود B: ${rights}`;
        correctAnswerStr = (q.correctPairs || []).map((p) => {
          const l = q.leftItems.find((x) => x.id === p.leftId)?.text || p.leftId;
          const r = q.rightItems.find((x) => x.id === p.rightId)?.text || p.rightId;
          return `(${l}) ↔ (${r})`;
        }).join('\n');
      }

      // Format time
      const timeSecs = q.timeLimitSeconds || 60;
      const mins = Math.floor(timeSecs / 60);
      const remSecs = timeSecs % 60;
      const timeStr = mins > 0 ? `${mins} دقيقة${remSecs > 0 ? ` و ${remSecs} ثانية` : ''}` : `${remSecs} ثانية`;

      rows.push({
        'م': rows.length + 1,
        'عنوان الاختبار': quiz.title,
        'المجلد الأسبوعي': folderName,
        'الموضوع / التوبيك': quiz.topic || 'General IT',
        'الفصول المخصصة': targetClassesStr,
        'رقم السؤال في الكويز': index + 1,
        'نوع السؤال': typeArabic,
        'نص السؤال (Question Text)': q.prompt,
        'خيارات الإجابة (Options)': optionsStr,
        'الإجابة النموذجية الصحيحة (Model Answer)': correctAnswerStr,
        'الشرح والتفسير العلمي (Explanation)': q.explanation || '—',
        'الوقت المحدد': timeStr,
        'الدرجة': q.points || 1,
        'المدرسة / الفرع': quiz.creatorSchool || 'مدرسة WE للتكنولوجيا التطبيقية بطوخ',
      });
    });
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Column widths
  worksheet['!cols'] = [
    { wch: 5 },   // Index
    { wch: 28 },  // Quiz Title
    { wch: 18 },  // Folder
    { wch: 22 },  // Topic
    { wch: 18 },  // Target Classes
    { wch: 12 },  // Q number
    { wch: 20 },  // Type
    { wch: 45 },  // Prompt
    { wch: 35 },  // Options
    { wch: 35 },  // Correct Answer
    { wch: 35 },  // Explanation
    { wch: 14 },  // Time
    { wch: 8 },   // Points
    { wch: 28 },  // School
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'بنك الأسئلة والمراجعة');

  // Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = specificQuizTitle ? specificQuizTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_') : 'WE_IT_Quiz_Bank';
  const outFileName = fileName || `${cleanTitle}_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, outFileName);
}
