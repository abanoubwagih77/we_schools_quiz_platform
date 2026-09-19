import React, { useState, useEffect } from 'react';
import {
  School,
  CheckCircle2,
  XCircle,
  History,
  Layers,
  Users,
  RefreshCw,
  ExternalLink,
  Calendar,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  SystemLog,
  QuizSession,
  TargetClass,
  TARGET_CLASSES,
} from '../types';
import { getClientStore, saveClientStore } from '../lib/firebaseStoreClient';

interface ClassStat {
  tested: boolean;
  sessionCount: number;
  lastTested?: string;
  quizzes: string[];
}

interface ActiveSchoolSummary {
  schoolName: string;
  totalSessions: number;
  testedClasses: TargetClass[];
  classBreakdown?: Record<string, ClassStat>;
  sessions: QuizSession[];
  lastActivity: string;
}

interface SchoolActivityViewProps {
  onOpenSession?: (sessionId: string) => void;
}

export const SchoolActivityView: React.FC<SchoolActivityViewProps> = ({ onOpenSession }) => {
  const [data, setData] = useState<{
    schools: ActiveSchoolSummary[];
    logs: SystemLog[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      let loaded = false;
      try {
        const res = await fetch('/api/activity/school-summary');
        const txt = await res.text();
        if (res.ok && txt) {
          const json = JSON.parse(txt);
          if (json && json.schools) {
            setData(json);
            loaded = true;
          }
        }
      } catch (e) {}

      if (!loaded) {
        const store = await getClientStore();
        const schoolMap: Record<string, {
          totalSessions: number;
          testedClasses: Set<TargetClass>;
          classBreakdown: Record<string, ClassStat>;
          sessions: QuizSession[];
          lastActivity: string;
        }> = {};

        // Group sessions by school
        (store.sessions || []).forEach((s) => {
          const scName = s.school || 'Unknown School';
          if (!schoolMap[scName]) {
            schoolMap[scName] = {
              totalSessions: 0,
              testedClasses: new Set<TargetClass>(),
              classBreakdown: {},
              sessions: [],
              lastActivity: s.startedAt,
            };
          }
          const item = schoolMap[scName];
          item.totalSessions++;
          if (s.className) item.testedClasses.add(s.className);
          item.sessions.push(s);
          if (new Date(s.startedAt) > new Date(item.lastActivity)) {
            item.lastActivity = s.startedAt;
          }

          const cls = s.className || 'Unknown';
          if (!item.classBreakdown[cls]) {
            item.classBreakdown[cls] = { tested: true, sessionCount: 0, quizzes: [] };
          }
          item.classBreakdown[cls].sessionCount++;
          if (s.quizTitle && !item.classBreakdown[cls].quizzes.includes(s.quizTitle)) {
            item.classBreakdown[cls].quizzes.push(s.quizTitle);
          }
        });

        const schoolsList: ActiveSchoolSummary[] = Object.entries(schoolMap).map(([schoolName, val]) => ({
          schoolName,
          totalSessions: val.totalSessions,
          testedClasses: Array.from(val.testedClasses),
          classBreakdown: val.classBreakdown,
          sessions: val.sessions,
          lastActivity: val.lastActivity,
        }));

        setData({
          schools: schoolsList,
          logs: store.logs || [],
        });
      }
    } catch (e) {
      console.error('Failed to load school summary:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async (schoolName: string) => {
    try {
      setActionLoading(true);
      try {
        await fetch(`/api/activity/school/${encodeURIComponent(schoolName)}`, {
          method: 'DELETE',
        });
      } catch (e) {}

      const store = await getClientStore();
      store.sessions = store.sessions.filter((s) => s.school !== schoolName);
      store.logs = store.logs.filter((l) => l.school !== schoolName);
      await saveClientStore(store);

      await fetchSummary();
    } catch (e) {
      console.error('Failed to delete school activity:', e);
    } finally {
      setActionLoading(false);
      setSchoolToDelete(null);
    }
  };

  const handleClearAllActivity = async () => {
    try {
      setActionLoading(true);
      try {
        await fetch('/api/sessions', { method: 'DELETE' });
        await fetch('/api/activity/logs', { method: 'DELETE' });
      } catch (e) {}

      const store = await getClientStore();
      store.sessions = [];
      store.logs = [];
      await saveClientStore(store);

      await fetchSummary();
    } catch (e) {
      console.error('Failed to clear activity:', e);
    } finally {
      setActionLoading(false);
      setConfirmClearAll(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getLogTypeBadge = (type: SystemLog['type']) => {
    switch (type) {
      case 'login':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-[#5E2777] border border-purple-200">
            تسجيل دخول
          </span>
        );
      case 'quiz_start':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            بدء اختبار بروجيكتور
          </span>
        );
      case 'quiz_completed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            اكتمال الاختبار
          </span>
        );
      case 'quiz_review':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            مراجعة الإجابات
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
            إجراء نظام
          </span>
        );
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-[#5E2777] border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-slate-400 font-bold">
          جاري استرجاع سجلات الفصول الحقيقية المعتمدة...
        </div>
      </div>
    );
  }

  const schoolsList = data?.schools || [];
  const logsList = data?.logs || [];

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner & Overview */}
      <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#5E2777] border border-purple-200">
                سجلات نشاط المدارس والفصول المعتمدة
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">
              موقف الفصول والمدارس المعتمدة لحظياً
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl font-medium">
              يتم تجميع الاختبارات لكل مدرسة في بطاقة مستقلة، وتحديث فصولها المختبرة (من A1 إلى A6) فور إطلاق أي اختبار جديد دون تكرار.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={fetchSummary}
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5E2777] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-purple-200 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث البيانات</span>
            </button>

            {(schoolsList.length > 0 || logsList.length > 0) && (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200 shadow-xs"
                title="مسح كافة سجلات النشاط واختبارات المدارس للبدء من جديد"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح سجل النشاط التجريبي</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Schools Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-[#5E2777]" />
            <h3 className="text-base font-black text-slate-900">
              المدارس التي أجرت اختبارات فعلية ({schoolsList.length})
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            فصول A1 - A6
          </span>
        </div>

        {schoolsList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-purple-100 shadow-xs">
            <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 mb-1">
              لا توجد جلسات اختبار تم إجراؤها حتى الآن
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
              عندما يقوم المعلم بتشغيل كويز لفصل محدد في مدرسته (مثل مدرسة طوخ فصل A1)، ستظهر المدرسة والفصل وبيانات الجلسة المعتمدة هنا فوراً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {schoolsList.map((item) => {
              const testedClassesCount = item.testedClasses.length;

              return (
                <div
                  key={item.schoolName}
                  className="bg-white rounded-3xl border border-purple-100 p-6 shadow-xs flex flex-col justify-between space-y-5"
                >
                  <div>
                    {/* Header of School Card */}
                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-purple-100 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-[#5E2777] font-black text-sm shadow-xs">
                          WE
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-black text-slate-900">
                            {item.schoolName.replace('WE Applied Technology School - ', 'مدرسة WE للتكنولوجيا التطبيقية — ')}
                          </h4>
                          <span className="text-xs text-slate-500 font-semibold">
                            إجمالي الجلسات: {item.totalSessions} • اختبرت {testedClassesCount} من 6 فصول
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>نشطة</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSchoolToDelete(item.schoolName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="حذف بطاقة هذه المدرسة ومسح جلساتها التجريبية"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Classes Grid A1 -> A6 with Status */}
                    <div className="mb-5">
                      <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#5E2777]" />
                          <span>موقف فصول المدرسة (A1 - A6):</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {testedClassesCount}/6 فصول
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" dir="ltr">
                        {TARGET_CLASSES.map((cls) => {
                          const stat = item.classBreakdown ? item.classBreakdown[cls] : null;
                          const hasTested = stat ? stat.tested : item.testedClasses.includes(cls);
                          const sessionCount = stat ? stat.sessionCount : 0;

                          return (
                            <div
                              key={cls}
                              className={`p-2.5 rounded-xl border transition-all text-right ${
                                hasTested
                                  ? 'bg-purple-50/60 border-purple-200 text-[#5E2777]'
                                  : 'bg-slate-50 border-slate-200/80 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1" dir="rtl">
                                <span className="font-mono font-black text-xs">
                                  Class {cls}
                                </span>
                                {hasTested ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>تم الاختبار</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md">
                                    <XCircle className="w-3 h-3" />
                                    <span>لم يختبر</span>
                                  </span>
                                )}
                              </div>

                              {hasTested && sessionCount > 0 && (
                                <div className="text-[10px] text-slate-500 font-medium truncate" dir="rtl">
                                  {sessionCount} {sessionCount === 1 ? 'جلسة منتهية' : 'جلسات منتهية'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Executed Quizzes list */}
                    <div>
                      <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#5E2777]" />
                        <span>الجلسات المنفذة في هذا الفرع:</span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pl-1">
                        {item.sessions.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 rounded-xl bg-purple-50/20 border border-purple-100 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="truncate">
                              <div className="font-bold text-slate-800 truncate">
                                {s.quizTitle}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                                <span className="font-mono font-bold text-[#5E2777] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  Class {s.className}
                                </span>
                                <span>{formatDate(s.startedAt)}</span>
                              </div>
                            </div>

                            {onOpenSession && (
                              <button
                                onClick={() => onOpenSession(s.id)}
                                className="p-1.5 text-slate-400 hover:text-[#5E2777] rounded-lg hover:bg-white transition-colors cursor-pointer"
                                title="عرض ومراجعة الجلسة"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {item.lastActivity && (
                    <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>آخر نشاط امتحاني:</span>
                      </span>
                      <span className="font-mono text-slate-700 font-bold">{formatDate(item.lastActivity)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-purple-100 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#5E2777]" />
            <div>
              <h3 className="text-base font-black text-slate-900">
                سجل النظام وعمليات الدخول والتنفيذ (Audit Logs)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تسجيل زمني دقيق لكل عملية تسجيل دخول، وبدء جلسة كويز، ومراجعة الإجابات
              </p>
            </div>
          </div>
        </div>

        {logsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            لا توجد سجلات بالنظام بعد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-purple-100 text-slate-500 font-bold bg-purple-50/40">
                  <th className="py-2.5 px-3 rounded-r-xl">الوقت والتاريخ</th>
                  <th className="py-2.5 px-3">المدرسة / الفرع</th>
                  <th className="py-2.5 px-3">الحساب</th>
                  <th className="py-2.5 px-3">نوع الإجراء</th>
                  <th className="py-2.5 px-3 rounded-l-xl">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {logsList.map((log) => (
                  <tr key={log.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                      {log.school ? log.school.replace('WE Applied Technology School - ', 'مدرسة WE - ') : 'النظام الرئيسي'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#5E2777] font-bold" dir="ltr">
                      {log.username}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getLogTypeBadge(log.type)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate font-medium">
                      {log.details || log.quizTitle || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal: Delete Specific School Card */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-right shadow-2xl border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              تأكيد حذف بطاقة ونشاط المدرسة
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              هل أنت متأكد من حذف بطاقة ومسح كافة جلسات الاختبار وسجلات النشاط الخاصة بـ{' '}
              <strong className="text-slate-900">
                {schoolToDelete.replace('WE Applied Technology School - ', 'مدرسة WE - ')}
              </strong>
              ؟ سيتم إزالة هذه البطاقة من الشاشة بالكامل لتنظيف بيئة الاختبار.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDeleteSchool(schoolToDelete)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setSchoolToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear All School Activity */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-right shadow-2xl border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              تصفير وسجل نشاط المدارس التجريبي
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              سيتم مسح كافة بطاقات المدارس وجلسات البروجيكتور وسجلات النظام بالكامل للبدء على نظافة قبل الاستخدام الفعلي. هل تود الاستمرار؟
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleClearAllActivity}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'جاري التصفير...' : 'نعم، امسح كل السجلات'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmClearAll(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
