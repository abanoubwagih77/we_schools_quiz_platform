import React, { useState } from 'react';
import {
  History,
  School,
  Calendar,
  CheckCircle2,
  BookOpen,
  Tag,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { QuizSession } from '../types';

interface SessionsViewProps {
  sessions: QuizSession[];
  onOpenSession: (session: QuizSession, mode: 'live' | 'review') => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  isDark?: boolean;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions,
  onOpenSession,
  onDeleteSession,
  onClearAllSessions,
}) => {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<QuizSession | null>(null);

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

  return (
    <div className="space-y-6 text-right">
      {/* Overview Bar */}
      <div className="p-6 rounded-3xl border bg-white border-purple-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-slate-900">
              سجل جلسات الاختبارات ومراجعة الإجابات
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              مراجعة العروض المكتملة على البروجيكتور، استعراض تدفق الأسئلة، ومسح بيانات الاختبارات التجريبية عند الحاجة.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold border bg-purple-50 border-purple-200 text-[#5E2777] font-mono">
              إجمالي الجلسات: {sessions.length}
            </span>

            {onClearAllSessions && sessions.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="مسح كافة جلسات الاختبار التجريبية"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح كافة الجلسات</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="p-14 text-center rounded-3xl border bg-white border-purple-100 shadow-xs">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-50 text-[#5E2777] flex items-center justify-center border border-purple-100">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold mb-1 text-slate-900">
            لا توجد جلسات اختبار مسجلة حتى الآن
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
            عندما يقوم المعلم بتشغيل جلسة اختبار تفاعلية داخل الفصل الدراسي، سيتم أرشفة الجلسة هنا وتكون جاهزة للمراجعة التفاعلية.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessions.map((ses) => {
            const isCompleted = ses.status === 'completed';

            return (
              <div
                key={ses.id}
                className="rounded-3xl p-5 sm:p-6 flex flex-col justify-between border bg-white border-purple-100 hover:border-[#5E2777]/40 shadow-xs hover:shadow-sm transition-all text-right group"
              >
                <div>
                  {/* Class, Session ID, and Delete Button */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-purple-50 text-[#5E2777] border border-purple-200">
                      Class {ses.className}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                        {ses.id}
                      </span>
                      {onDeleteSession && (
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(ses)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف هذه الجلسة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quiz Title */}
                  <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-2">
                    {ses.quizTitle}
                  </h3>

                  {/* Topic badge */}
                  {ses.topic && (
                    <div className="mb-3">
                      <span className="text-[11px] font-semibold text-slate-500 inline-flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#5E2777]" />
                        <span>{ses.topic}</span>
                      </span>
                    </div>
                  )}

                  {/* School & Date */}
                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-1.5 truncate">
                      <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{ses.school}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px]" dir="ltr">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(ses.startedAt)}</span>
                    </div>
                  </div>

                  {/* Session Status Chip */}
                  <div className="p-2.5 rounded-xl border text-xs flex items-center justify-between mb-4 bg-slate-50 border-slate-200/80">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          isCompleted ? 'text-emerald-600' : 'text-amber-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-700">{isCompleted ? 'مكتملة' : 'نشطة'}</span>
                    </span>

                    <span className="font-mono text-[11px] text-slate-500 font-bold">
                      {ses.totalQuestions} أسئلة
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenSession(ses, 'review')}
                    className="flex-1 py-2.5 bg-[#5E2777] hover:bg-[#4d1f63] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-[#5E2777]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>مراجعة الإجابات النموذجية</span>
                  </button>
                  {onDeleteSession && (
                    <button
                      type="button"
                      onClick={() => setSessionToDelete(ses)}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="حذف الجلسة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal: Delete Single Session */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-right shadow-2xl border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              تأكيد حذف جلسة الاختبار
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              هل أنت متأكد من رغبتك في حذف جلسة الاختبار لفصل{' '}
              <strong className="text-slate-900">{sessionToDelete.className}</strong> (
              {sessionToDelete.quizTitle})؟ لن تتمكن من استرجاعها بعد الحذف.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSession) onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear All Sessions */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-right shadow-2xl border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              مسح كافة جلسات الاختبارات التجريبية
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              سيتم حذف جميع جلسات البروجيكتور المسجلة حالياً بالكامل ({sessions.length} جلسة) لتفريغ النظام والبدء من جديد. هل تريد المتابعة؟
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onClearAllSessions) onClearAllSessions();
                  setConfirmClearOpen(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                نعم، امسح كل الجلسات
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
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

