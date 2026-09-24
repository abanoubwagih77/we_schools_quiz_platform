import React, { useState } from 'react';
import {
  X,
  Play,
  School,
  Shuffle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Quiz, TargetClass, WE_SCHOOLS, User } from '../types';

interface LivePlaySetupModalProps {
  quiz: Quiz | null;
  currentUser: User | null;
  onClose: () => void;
  onConfirmStart: (config: {
    quizId: string;
    school: string;
    className: TargetClass;
    randomize: boolean;
  }) => Promise<void> | void;
}

export const LivePlaySetupModal: React.FC<LivePlaySetupModalProps> = ({
  quiz,
  currentUser,
  onClose,
  onConfirmStart,
}) => {
  if (!quiz) return null;

  const isAdmin = currentUser?.role === 'admin';
  const defaultSchool = currentUser?.school || 'WE Applied Technology School - Toukh';

  const [selectedSchool, setSelectedSchool] = useState<string>(defaultSchool);
  const [selectedClass, setSelectedClass] = useState<TargetClass>(
    quiz.targetClasses[0] || 'A1'
  );
  const [randomize, setRandomize] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!quiz.questions || quiz.questions.length === 0) {
      setError('لا توجد أسئلة مضافة في هذا الاختبار لعرضها على شاشة البروجيكتور.');
      return;
    }
    setError(null);
    setIsStarting(true);
    try {
      await onConfirmStart({
        quizId: quiz.id,
        school: selectedSchool,
        className: selectedClass,
        randomize,
      });
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء تشغيل الجلسة على البروجيكتور');
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl transition-all border bg-white border-purple-100 text-slate-800 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-[#5E2777]">
              <Play className="w-5 h-5 fill-[#5E2777]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                بدء جلسة عرض على البروجيكتور
              </h3>
              <p className="text-xs text-slate-500 font-medium">عرض تفاعلي مباشر لشاشات فصول مدرسة WE</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Quiz Preview */}
        <div className="p-4 rounded-2xl border mb-5 bg-purple-50/40 border-purple-100">
          <div className="text-[11px] text-[#5E2777] font-bold uppercase tracking-wider mb-1">
            الاختبار المحدد:
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 mb-1 line-clamp-1">
            {quiz.title}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>الموضوع: <strong className="text-[#5E2777]">{quiz.topic || 'General IT'}</strong></span>
            <span>•</span>
            <span>عدد الأسئلة: <strong>{quiz.questions.length}</strong></span>
          </div>
        </div>

        {/* Selection Forms */}
        <div className="space-y-4 mb-6">
          {/* Select School */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-[#5E2777]" />
              <span>المدرسة / الفرع:</span>
            </label>
            {isAdmin ? (
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none transition-colors bg-slate-50 border-slate-300 text-slate-800 cursor-pointer font-semibold"
              >
                <option value="WE Applied Technology School - Toukh">
                  مدرسة WE للتكنولوجيا التطبيقية - طوخ
                </option>
                <option value="WE Applied Technology School - Asyut">
                  مدرسة WE للتكنولوجيا التطبيقية - أسيوط
                </option>
                <option value="WE Applied Technology School - Damanhour">
                  مدرسة WE للتكنولوجيا التطبيقية - دمنهور
                </option>
                <option value="WE Applied Technology School - Tor Sinai">
                  مدرسة WE للتكنولوجيا التطبيقية - طور سيناء
                </option>
                <option value="WE Applied Technology School - Qena">
                  مدرسة WE للتكنولوجيا التطبيقية - قنا
                </option>
              </select>
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border bg-slate-100 border-slate-200 text-slate-800 font-semibold">
                {selectedSchool}
              </div>
            )}
          </div>

          {/* Select Target Class (A1 - A6) */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#5E2777]" />
              <span>فصل العرض المحدد (Class Section):</span>
            </label>
            <div className="grid grid-cols-6 gap-2" dir="ltr">
              {quiz.targetClasses.map((cls) => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5E2777] text-white border-[#5E2777] shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Randomization Option */}
          <div
            className="p-3.5 rounded-xl border flex items-center justify-between cursor-pointer bg-slate-50 border-slate-200/80"
            onClick={() => setRandomize(!randomize)}
          >
            <div className="flex items-center gap-2.5">
              <Shuffle className="w-4 h-4 text-[#5E2777]" />
              <div>
                <div className="text-xs font-bold text-slate-800">
                  ترتيب عشوائي للأسئلة
                </div>
                <div className="text-[11px] text-slate-500">
                  يمنع حفظ ترتيب الأسئلة بين الفصول المختلفة
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={randomize}
              onChange={() => setRandomize(!randomize)}
              className="w-4 h-4 text-[#5E2777] rounded border-slate-300 focus:ring-[#5E2777] cursor-pointer"
            />
          </div>

          {/* Answer Protection Security Notice */}
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/80 flex items-start gap-2.5 text-purple-950">
            <ShieldCheck className="w-4 h-4 text-[#5E2777] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>حماية الإجابات النموذجية:</strong> يتم إخفاء الإجابات الصحيحة وشروحات الأسئلة تماماً أثناء العرض المباشر على الطلاب، وتُفتح حصراً بعد انتهاء وقت الاختبار في مرحلة المراجعة (Review Mode).
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isStarting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={isStarting}
            onClick={handleStart}
            className="px-6 py-2.5 bg-[#5E2777] hover:bg-[#4d1f63] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-[#5E2777]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري فتح شاشة البروجيكتور...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>تشغيل العرض على البروجيكتور</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
