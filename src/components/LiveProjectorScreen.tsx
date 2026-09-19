import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Clock,
  Sparkles,
  School,
  Award,
  X,
  Tag,
  FileSpreadsheet,
} from 'lucide-react';
import {
  QuizQuestion,
  QuizSession,
  MCQQuestion,
  TrueFalseQuestion,
  EssayQuestion,
  MatchingQuestion,
} from '../types';
import { soundFx } from '../utils/audio';
import { exportQuizzesToExcel } from '../utils/exportToExcel';

interface Props {
  session: QuizSession;
  questions: QuizQuestion[];
  isReviewMode: boolean;
  onExit: () => void;
  onStartReview: () => void;
  onFinishSession: () => void;
}

export const LiveProjectorScreen: React.FC<Props> = ({
  session,
  questions,
  isReviewMode,
  onExit,
  onStartReview,
  onFinishSession,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentQ = questions[currentIndex];
  const initialTimeLimit = currentQ ? currentQ.timeLimitSeconds || 60 : 60;

  // Update timer when question changes
  useEffect(() => {
    if (currentQ && !isReviewMode) {
      setTimeLeft(currentQ.timeLimitSeconds || 60);
      setIsPaused(false);
    }
  }, [currentIndex, isReviewMode, currentQ]);

  // Main countdown loop for Live Play Mode
  useEffect(() => {
    if (isReviewMode || isCompleted || isPaused || !currentQ) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoAdvance();
          return 0;
        }

        if (prev <= 6 && prev > 1 && soundEnabled) {
          soundFx.playTick(prev <= 3);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isReviewMode, isCompleted, isPaused, currentIndex, questions.length, soundEnabled, currentQ]);

  // Auto-advance
  const handleAutoAdvance = () => {
    if (currentIndex + 1 < questions.length) {
      if (soundEnabled) soundFx.playNextQuestion();
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      if (soundEnabled) soundFx.playFinishFanfare();
      triggerConfetti();
      onFinishSession();
    }
  };

  // Manual next/prev
  const goToNext = () => {
    if (currentIndex + 1 < questions.length) {
      if (soundEnabled) soundFx.playNextQuestion();
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Last question reached
      setIsCompleted(true);
      if (soundEnabled) soundFx.playFinishFanfare();
      triggerConfetti();
      if (!isReviewMode) {
        onFinishSession();
      }
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const resetCurrentTimer = () => {
    if (currentQ) {
      setTimeLeft(currentQ.timeLimitSeconds || 60);
      setIsPaused(false);
    }
  };

  const addExtraTime = (seconds: number) => {
    setTimeLeft((prev) => prev + seconds);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#5E2777', '#8E44AD', '#3B82F6', '#10B981'],
      });
    } catch (e) {}
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Export current session questions & model answers to Excel
  const handleExportCurrentToExcel = () => {
    exportQuizzesToExcel({
      quizzes: [
        {
          id: session.quizId,
          folderId: '',
          title: session.quizTitle,
          topic: session.topic || 'General IT',
          subject: 'IT',
          description: '',
          targetClasses: [session.className],
          questions: questions,
          creatorName: session.instructorName,
          creatorSchool: session.school,
          createdAt: session.startedAt,
          updatedAt: session.startedAt,
          status: 'enabled',
        },
      ],
      specificQuizTitle: `${session.quizTitle}_Class_${session.className}`,
    });
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!isReviewMode) setIsPaused((p) => !p);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        goToNext();
      } else if (e.key === 'r' || e.key === 'R') {
        resetCurrentTimer();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isReviewMode, isPaused, questions.length]);

  const progressPercent = Math.min(100, Math.max(0, (timeLeft / (initialTimeLimit || 60)) * 100));
  const isUrgent = timeLeft <= 10 && !isReviewMode;
  const isCritical = timeLeft <= 5 && !isReviewMode;

  // COMPLETED SCREEN: LIVE PLAY FINISHED
  if (isCompleted && !isReviewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 text-slate-800 flex items-center justify-center p-4 sm:p-8 select-none">
        <div className="w-full max-w-2xl bg-white border border-purple-100 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
          <div className="w-20 h-20 bg-purple-50 border border-purple-200 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#5E2777] shadow-xs">
            <Award className="w-10 h-10 animate-bounce" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900">
            اكتمل عرض جلسة الكويز بنجاح
          </h2>

          <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
            تم عرض جميع أسئلة الاختبار التفاعلي لطلاب فصل{' '}
            <strong className="inline-block px-2.5 py-0.5 bg-purple-50 text-[#5E2777] border border-purple-200 rounded-lg font-mono font-bold">
              Class {session.className}
            </strong>{' '}
            بـ <strong className="text-slate-900">{session.school}</strong>.
            <br />
            تم تسجيل الجلسة وتحديث موقف الفصل والمدرسة لحظياً.
          </p>

          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 mb-8 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-400 mb-0.5 font-bold">معرف الجلسة</div>
              <div className="font-mono text-[#5E2777] font-bold text-xs sm:text-sm">{session.id}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5 font-bold">عدد الأسئلة</div>
              <div className="font-bold text-slate-800 text-sm sm:text-base">{questions.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5 font-bold">المدرسة</div>
              <div className="font-bold text-[#5E2777] text-xs sm:text-sm truncate">
                {session.school.replace('WE Applied Technology School - ', 'مدرسة WE - ')}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStartReview}
              className="w-full sm:w-auto px-6 py-3 bg-[#5E2777] hover:bg-[#4d1f63] text-white font-bold text-sm sm:text-base rounded-2xl shadow-md shadow-[#5E2777]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-5 h-5" />
              <span>مراجعة الإجابات النموذجية مع الفصل</span>
            </button>

            <button
              onClick={handleExportCurrentToExcel}
              className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>تصدير لإكسيل (Excel)</span>
            </button>

            <button
              onClick={onExit}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>العودة للوحة التحكم</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED SCREEN: REVIEW MODE FINISHED
  if (isCompleted && isReviewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 text-slate-800 flex items-center justify-center p-4 sm:p-8 select-none">
        <div className="w-full max-w-2xl bg-white border border-purple-100 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900">
            اكتملت مراجعة الإجابات النموذجية بنجاح
          </h2>

          <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
            تمت مراجعة جميع أسئلة الاختبار وإجاباتها النموذجية والتفسيرات العلمية مع طلاب فصل{' '}
            <strong className="inline-block px-2.5 py-0.5 bg-purple-50 text-[#5E2777] border border-purple-200 rounded-lg font-mono font-bold">
              Class {session.className}
            </strong>{' '}
            بـ <strong className="text-slate-900">{session.school}</strong>.
          </p>

          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 mb-8 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-400 mb-0.5 font-bold">معرف الجلسة</div>
              <div className="font-mono text-[#5E2777] font-bold text-xs sm:text-sm">{session.id}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5 font-bold">الأسئلة المراجعة</div>
              <div className="font-bold text-slate-800 text-sm sm:text-base">{questions.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5 font-bold">المدرسة والفصل</div>
              <div className="font-bold text-[#5E2777] text-xs sm:text-sm truncate">
                {session.className} • {session.school.replace('WE Applied Technology School - ', 'مدرسة WE - ')}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleExportCurrentToExcel}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>تصدير الأسئلة والإجابات إلى إكسيل (Excel)</span>
            </button>

            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsCompleted(false);
              }}
              className="w-full sm:w-auto px-5 py-3 bg-purple-50 hover:bg-purple-100 text-[#5E2777] font-bold rounded-2xl border border-purple-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة المراجعة من البداية</span>
            </button>

            <button
              onClick={onExit}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>إنهاء والعودة للوحة التحكم</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-100 text-slate-800 flex flex-col select-none overflow-hidden"
    >
      {/* Top Projector Header Bar */}
      <header className="min-h-[4.5rem] py-2 bg-white border-b border-purple-100 px-4 sm:px-8 flex items-center justify-between shadow-xs shrink-0 gap-3">
        {/* School & Class Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-[#5E2777] shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800">{session.school}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-[#5E2777] font-bold">{session.id}</span>
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 flex-wrap">
              <span>{session.quizTitle}</span>
              <span className="px-2.5 py-0.5 bg-[#5E2777] text-white rounded-lg text-xs font-mono font-bold tracking-wider">
                Class {session.className}
              </span>
              {session.topic && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <Tag className="w-3 h-3 text-[#5E2777]" />
                  <span>{session.topic}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Indicator & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isReviewMode ? (
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-[#5E2777] border border-purple-200 flex items-center gap-2 text-xs font-bold shadow-xs">
                <BookOpen className="w-4 h-4 text-[#5E2777]" />
                <span className="hidden sm:inline">وضع مراجعة الإجابات النموذجية</span>
                <span className="sm:hidden">مراجعة</span>
              </div>

              <button
                onClick={handleExportCurrentToExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="تصدير أسئلة هذا الاختبار بإجاباتها النموذجية إلى ملف إكسيل"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">تصدير إكسيل</span>
              </button>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 text-xs font-bold shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>جلسة تفاعلية حية (Live)</span>
            </div>
          )}

          {/* Classroom Audio toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#5E2777]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة للبروجيكتور'}
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onExit}
            title="إنهاء العرض والخروج (Esc)"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">إنهاء العرض</span>
          </button>
        </div>
      </header>

      {/* Main Classroom Screen Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-6xl w-full mx-auto justify-between overflow-y-auto">
        {/* Question Card */}
        <div className="bg-white rounded-3xl border border-purple-100 shadow-sm p-6 sm:p-10 flex flex-col justify-between flex-1 my-auto">
          {/* Top of Card: Question Meta + Timer */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#5E2777] text-white rounded-xl text-xs sm:text-sm font-black font-mono">
                السؤال {currentIndex + 1} من {questions.length}
              </span>
              <span className="text-xs text-slate-500 font-bold">
                {currentQ.type === 'mcq' && 'Multiple Choice (اختيار من متعدد)'}
                {currentQ.type === 'true_false' && 'True / False (صح أو خطأ)'}
                {currentQ.type === 'essay' && 'Concept / Short Essay (مفهوم علمي)'}
                {currentQ.type === 'matching' && 'Matching Items (توصيل)'}
              </span>
            </div>

            {/* Projector Timer Badge */}
            {!isReviewMode ? (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-black text-lg sm:text-2xl transition-all shadow-xs ${
                  isCritical
                    ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse scale-105'
                    : isUrgent
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-purple-50 text-[#5E2777] border-purple-200'
                }`}
              >
                <Clock className={`w-5 h-5 ${isCritical ? 'animate-spin' : ''}`} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-purple-50 text-[#5E2777] border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>الإجابة النموذجية المعتمدة</span>
              </div>
            )}
          </div>

          {/* Center: Question Prompt (English for IT) */}
          <div className="my-auto py-4 space-y-6">
            <div
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-snug tracking-tight text-left"
              dir="ltr"
            >
              {currentQ.prompt}
            </div>

            {/* Render based on question type */}
            {currentQ.type === 'mcq' && renderMCQ(currentQ as MCQQuestion)}
            {currentQ.type === 'true_false' && renderTrueFalse(currentQ as TrueFalseQuestion)}
            {currentQ.type === 'essay' && renderEssay(currentQ as EssayQuestion)}
            {currentQ.type === 'matching' && renderMatching(currentQ as MatchingQuestion)}

            {/* Review mode Explanation */}
            {isReviewMode && currentQ.explanation && (
              <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200 text-right mt-6">
                <div className="text-xs font-bold text-[#5E2777] mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>الشرح والتفسير العلمي النموذجي:</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed font-medium">
                  {currentQ.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Bottom of Card: Live Timer Progress Bar */}
          {!isReviewMode && (
            <div className="pt-6 mt-4 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    isCritical
                      ? 'bg-rose-500'
                      : isUrgent
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-[#5E2777] to-purple-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Classroom Navigation Footer */}
      <footer className="min-h-[4.5rem] py-2 bg-white border-t border-purple-100 px-4 sm:px-8 flex items-center justify-between shadow-xs shrink-0 flex-wrap gap-3">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              currentIndex === 0
                ? 'opacity-40 bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          <button
            onClick={goToNext}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 bg-[#5E2777] hover:bg-[#4d1f63] text-white shadow-md shadow-[#5E2777]/20 transition-all cursor-pointer"
          >
            <span>
              {currentIndex + 1 === questions.length
                ? isReviewMode
                  ? 'إنهاء مراجعة الاختبار'
                  : 'إنهاء الاختبار'
                : 'السؤال التالي'}
            </span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Classroom Timer Controls */}
        {!isReviewMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isPaused
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'استئناف' : 'إيقاف مؤقت'}</span>
            </button>

            <button
              onClick={() => addExtraTime(15)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-all cursor-pointer"
              title="إضافة 15 ثانية إضافية للوقت"
            >
              +15 ثانية
            </button>

            <button
              onClick={resetCurrentTimer}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 shadow-xs transition-all cursor-pointer"
              title="إعادة ضبط العداد للسؤال الحالي"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Shortcuts hint */}
        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          مسافة: إيقاف/استئناف • الأسهم: تنقل • F: ملء الشاشة • Esc: خروج
        </div>
      </footer>
    </div>
  );

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.enabled = next;
  }

  // Question renderers
  function renderMCQ(q: MCQQuestion) {
    const letters = ['A', 'B', 'C', 'D'];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2" dir="ltr">
        {q.options.map((opt, idx) => {
          const isCorrect = isReviewMode && idx === q.correctOptionIndex;
          return (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                isCorrect
                  ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-50/60 border-slate-200 text-slate-800'
              }`}
            >
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-sm sm:text-base font-mono shrink-0 shadow-xs ${
                  isCorrect
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-slate-300 text-slate-700'
                }`}
              >
                {letters[idx]}
              </div>
              <div className="text-base sm:text-lg font-bold flex-1">{opt}</div>
              {isCorrect && (
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-lg shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Correct</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderTrueFalse(q: TrueFalseQuestion) {
    return (
      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto pt-4" dir="ltr">
        {[true, false].map((val) => {
          const isCorrect = isReviewMode && q.correctBoolean === val;
          return (
            <div
              key={String(val)}
              className={`p-6 sm:p-8 rounded-3xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                isCorrect
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-md text-emerald-950'
                  : 'bg-slate-50/60 border-slate-200 text-slate-800'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${
                  isCorrect
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-slate-300 text-slate-700'
                }`}
              >
                {val ? '✓' : '✗'}
              </div>
              <span className="text-xl sm:text-2xl font-black">{val ? 'TRUE' : 'FALSE'}</span>
              {isCorrect && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Correct Answer
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderEssay(q: EssayQuestion) {
    return (
      <div className="space-y-4 pt-2 text-left" dir="ltr">
        <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 text-slate-500 font-mono text-sm leading-relaxed min-h-[140px] flex items-center justify-center text-center">
          <div>
            <GraduationCap className="w-8 h-8 text-[#5E2777] mx-auto mb-2 opacity-60" />
            <div className="font-bold text-slate-700">Open-Ended Technical Question</div>
            <div className="text-xs text-slate-400 mt-1">
              Students write their solution on paper or answer orally before reviewing the model answer.
            </div>
          </div>
        </div>

        {isReviewMode && (
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-300 text-emerald-950 space-y-2">
            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Model Answer:</span>
            </div>
            <div className="text-base font-semibold leading-relaxed font-sans">
              {q.modelAnswer}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMatching(q: MatchingQuestion) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-left" dir="ltr">
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Column A</div>
          {q.leftItems.map((item, idx) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 font-bold text-sm text-slate-800 flex items-center gap-2.5"
            >
              <span className="w-6 h-6 rounded-lg bg-[#5E2777] text-white flex items-center justify-center text-xs font-mono">
                {idx + 1}
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Column B</div>
          {q.rightItems.map((item, idx) => {
            const letter = String.fromCharCode(65 + idx);
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 font-bold text-sm text-slate-800 flex items-center gap-2.5"
              >
                <span className="w-6 h-6 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center text-xs font-mono">
                  {letter}
                </span>
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>

        {isReviewMode && q.correctPairs && (
          <div className="md:col-span-2 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300">
            <div className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Correct Matching Key:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {q.correctPairs.map((pair, i) => {
                const leftIdx = q.leftItems.findIndex((l) => l.id === pair.leftId);
                const rightIdx = q.rightItems.findIndex((r) => r.id === pair.rightId);
                return (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-white border border-emerald-200 font-mono font-bold text-xs text-emerald-900 shadow-xs"
                  >
                    ({leftIdx + 1}) → ({String.fromCharCode(65 + rightIdx)})
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
};
