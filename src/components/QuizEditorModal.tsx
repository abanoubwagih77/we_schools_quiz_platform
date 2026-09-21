import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  HelpCircle,
  CheckCircle2,
  Save,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Folder,
} from 'lucide-react';
import {
  Quiz,
  QuizQuestion,
  TargetClass,
  TARGET_CLASSES,
  QuestionType,
  MCQQuestion,
  TrueFalseQuestion,
  EssayQuestion,
  MatchingQuestion,
  CompleteQuestion,
  User,
  WeekFolder,
} from '../types';
import { WeLogo } from './WeLogo';

interface QuizEditorModalProps {
  quiz: Quiz | null;
  folders: WeekFolder[];
  initialFolderId?: string;
  currentUser: User | null;
  onClose: () => void;
  onSave: (quizData: Partial<Quiz>) => void;
  isDark?: boolean;
}

const TOPIC_SUGGESTIONS = [
  'Computer Networks & OSI Model',
  'TCP/IP & IP Subnetting',
  'Operating Systems (Linux & Windows)',
  'Cybersecurity & Network Defense',
  'Hardware & System Architecture',
  'Databases & SQL Fundamentals',
  'Programming & Scripting (Python)',
  'Cloud Computing & Virtualization',
];

export const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  quiz,
  folders,
  initialFolderId,
  currentUser,
  onClose,
  onSave,
}) => {
  const [folderId, setFolderId] = useState<string>(
    quiz?.folderId || initialFolderId || folders[0]?.id || ''
  );
  const [title, setTitle] = useState(quiz?.title || '');
  const [topic, setTopic] = useState(quiz?.topic || TOPIC_SUGGESTIONS[0]);
  const [subject, setSubject] = useState(quiz?.subject || 'Information Technology (IT)');
  const [description, setDescription] = useState(quiz?.description || '');
  const [targetClasses, setTargetClasses] = useState<TargetClass[]>(
    quiz?.targetClasses || ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.questions || []);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleTargetClass = (cls: TargetClass) => {
    if (targetClasses.includes(cls)) {
      if (targetClasses.length === 1) {
        setErrorMsg('يجب اختيار فصل واحد على الأقل من فصول A1 إلى A6.');
        return;
      }
      setTargetClasses(targetClasses.filter((c) => c !== cls));
    } else {
      setTargetClasses([...targetClasses, cls].sort());
    }
  };

  const addQuestion = (type: QuestionType) => {
    const newId = `q-${Date.now()}`;
    let newQ: QuizQuestion;

    if (type === 'mcq') {
      newQ = {
        id: newId,
        type: 'mcq',
        prompt: '',
        timeLimitSeconds: 45,
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      };
    } else if (type === 'true_false') {
      newQ = {
        id: newId,
        type: 'true_false',
        prompt: '',
        timeLimitSeconds: 30,
        correctBoolean: true,
        explanation: '',
      };
    } else if (type === 'essay') {
      newQ = {
        id: newId,
        type: 'essay',
        prompt: '',
        timeLimitSeconds: 90,
        modelAnswer: '',
        keyPoints: [],
      };
    } else if (type === 'complete') {
      newQ = {
        id: newId,
        type: 'complete',
        prompt: 'Fill in the blank: ............',
        timeLimitSeconds: 45,
        correctAnswer: '',
        acceptableAnswers: [],
        explanation: '',
      };
    } else {
      newQ = {
        id: newId,
        type: 'matching',
        prompt: 'Match each item from Column A with its counterpart in Column B:',
        timeLimitSeconds: 60,
        leftItems: [
          { id: 'l1', text: '' },
          { id: 'l2', text: '' },
          { id: 'l3', text: '' },
        ],
        rightItems: [
          { id: 'r1', text: '' },
          { id: 'r2', text: '' },
          { id: 'r3', text: '' },
        ],
        correctPairs: [
          { leftId: 'l1', rightId: 'r1' },
          { leftId: 'l2', rightId: 'r2' },
          { leftId: 'l3', rightId: 'r3' },
        ],
        explanation: '',
      };
    }

    const updated = [...questions, newQ];
    setQuestions(updated);
    setActiveQuestionIndex(updated.length - 1);
    setErrorMsg(null);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      setErrorMsg('يجب أن يحتوي الاختبار على سؤال واحد على الأقل.');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, Math.min(activeQuestionIndex, updated.length - 1)));
  };

  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return;
    const item = questions[from];
    const rest = questions.filter((_, idx) => idx !== from);
    rest.splice(to, 0, item);
    setQuestions(rest);
    setActiveQuestionIndex(to);
  };

  const updateActiveQuestion = (patch: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[activeQuestionIndex] = {
      ...updated[activeQuestionIndex],
      ...patch,
    } as QuizQuestion;
    setQuestions(updated);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('يرجى كتابة عنوان للاختبار.');
      return;
    }

    if (questions.length === 0) {
      setErrorMsg('يرجى إضافة سؤال واحد على الأقل للاختبار.');
      return;
    }

    onSave({
      folderId,
      title: title.trim(),
      topic: topic.trim(),
      subject: subject.trim(),
      description: description.trim(),
      targetClasses,
      questions,
      creatorName: currentUser?.name || currentUser?.username || 'م/ أبانوب وجيه',
      creatorSchool: currentUser?.school || 'مدرسة WE للتكنولوجيا التطبيقية بطوخ',
    });
  };

  const activeQ = questions[activeQuestionIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border bg-white border-purple-100 text-slate-800 text-right">
        {/* Header */}
        <div className="h-16 px-6 border-b border-purple-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <WeLogo size="sm" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                {quiz ? 'تعديل اختبار مادة تكنولوجيا المعلومات (IT)' : 'إنشاء اختبار جديد لمادة IT'}
              </h3>
              <p className="text-[11px] text-purple-900/60 font-semibold">
                مدرسة WE للتكنولوجيا التطبيقية • إعداد أسئلة تفاعلية لشاشات البروجيكتور
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Right Column (in RTL): Quiz Metadata & Questions Navigator */}
          <div className="w-full md:w-80 border-l border-purple-100 bg-purple-50/30 p-4 overflow-y-auto space-y-4 shrink-0">
            {/* Week / Folder Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#5E2777]" />
                <span>المجلد الأسبوعي:</span>
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border bg-white border-slate-300 text-slate-800 font-semibold focus:border-[#5E2777] outline-none cursor-pointer"
              >
                {folders.length === 0 ? (
                  <option value="">بدون مجلد أسبوعي</option>
                ) : (
                  folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Quiz Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عنوان الاختبار <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: IT Quiz 1: Networking Basics"
                className="w-full px-3 py-2 rounded-xl text-xs border bg-white border-slate-300 text-slate-800 focus:border-[#5E2777] outline-none font-semibold"
              />
            </div>

            {/* Topic & Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الموضوع / موديول المنهج
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                list="topic-suggestions"
                placeholder="اختر أو اكتب الموضوع..."
                className="w-full px-3 py-2 rounded-xl text-xs border bg-white border-slate-300 text-slate-800 focus:border-[#5E2777] outline-none"
              />
              <datalist id="topic-suggestions">
                {TOPIC_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            {/* Target Classes Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الفصول المستهدفة (طوخ):
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TARGET_CLASSES.map((cls) => {
                  const isSelected = targetClasses.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleTargetClass(cls)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#5E2777] text-white border-[#5E2777] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Questions Navigator List */}
            <div className="pt-2 border-t border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  قائمة الأسئلة ({questions.length})
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pl-1">
                {questions.map((q, idx) => {
                  const isActive = idx === activeQuestionIndex;
                  return (
                    <div
                      key={q.id || idx}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`p-2 rounded-xl text-xs border transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#5E2777] text-white border-[#5E2777] shadow-xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] bg-black/10 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate text-[11px] font-medium" dir="ltr">
                          {q.prompt || 'Empty Question'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 mr-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(idx, idx - 1);
                          }}
                          disabled={idx === 0}
                          className="p-1 hover:bg-black/10 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(idx, idx + 1);
                          }}
                          disabled={idx === questions.length - 1}
                          className="p-1 hover:bg-black/10 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Question Buttons */}
              <div className="pt-3 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => addQuestion('mcq')}
                  className="py-1.5 px-2 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5E2777] font-bold text-[11px] rounded-lg border border-purple-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>اختيار من متعدد (MCQ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => addQuestion('true_false')}
                  className="py-1.5 px-2 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5E2777] font-bold text-[11px] rounded-lg border border-purple-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>صح أو خطأ (T/F)</span>
                </button>

                <button
                  type="button"
                  onClick={() => addQuestion('complete')}
                  className="py-1.5 px-2 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5E2777] font-bold text-[11px] rounded-lg border border-purple-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>أكمل الفراغ (Complete)</span>
                </button>

                <button
                  type="button"
                  onClick={() => addQuestion('matching')}
                  className="py-1.5 px-2 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5E2777] font-bold text-[11px] rounded-lg border border-purple-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>توصيل (Matching)</span>
                </button>

                <button
                  type="button"
                  onClick={() => addQuestion('essay')}
                  className="col-span-2 py-1.5 px-2 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5E2777] font-bold text-[11px] rounded-lg border border-purple-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>سؤال مقالي (Essay)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Left Column (in RTL): Active Question Editor */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {activeQ ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-purple-50 text-[#5E2777] rounded-lg text-xs font-bold border border-purple-200">
                       السؤال رقم {activeQuestionIndex + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {activeQ.type === 'mcq'
                        ? 'اختيار من متعدد'
                        : activeQ.type === 'true_false'
                        ? 'صح أو خطأ'
                        : activeQ.type === 'complete'
                        ? 'أكمل الفراغ (Complete)'
                        : activeQ.type === 'essay'
                        ? 'سؤال مقالي'
                        : 'توصيل'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-[#5E2777]" />
                      <span className="text-xs font-bold text-slate-600">وقت السؤال:</span>
                      <select
                        value={
                          [20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 600].includes(
                            activeQ.timeLimitSeconds || 45
                          )
                            ? activeQ.timeLimitSeconds || 45
                            : 'custom'
                        }
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            // keep current or default to 300
                            updateActiveQuestion({ timeLimitSeconds: activeQ.timeLimitSeconds || 300 });
                          } else {
                            updateActiveQuestion({ timeLimitSeconds: parseInt(e.target.value) });
                          }
                        }}
                        className="px-2 py-1 text-xs border rounded-lg bg-slate-50 border-slate-200 font-mono font-bold cursor-pointer"
                      >
                        <option value={20}>20 ثانية</option>
                        <option value={30}>30 ثانية</option>
                        <option value={45}>45 ثانية</option>
                        <option value={60}>60 ثانية (دقيقة)</option>
                        <option value={90}>90 ثانية (1.5 دقيقة)</option>
                        <option value={120}>120 ثانية (دقيقتان)</option>
                        <option value={180}>180 ثانية (3 دقائق)</option>
                        <option value={240}>240 ثانية (4 دقائق)</option>
                        <option value={300}>300 ثانية (5 دقائق)</option>
                        <option value={360}>360 ثانية (6 دقائق)</option>
                        <option value={420}>420 ثانية (7 دقائق)</option>
                        <option value={480}>480 ثانية (8 دقائق)</option>
                        <option value={600}>600 ثانية (10 دقائق)</option>
                        <option value="custom">وقت مخصص (ثوانٍ / دقائق)...</option>
                      </select>

                      {/* Custom seconds input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={5}
                          max={3600}
                          value={activeQ.timeLimitSeconds || 45}
                          onChange={(e) => {
                            const val = Math.max(5, parseInt(e.target.value) || 5);
                            updateActiveQuestion({ timeLimitSeconds: val });
                          }}
                          className="w-16 px-1.5 py-1 text-xs border rounded-lg bg-white border-slate-300 font-mono font-bold text-center"
                          title="عدد الثواني الإجمالي"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">
                          ثانية ({(Math.floor((activeQ.timeLimitSeconds || 45) / 60))} د و{' '}
                          {(activeQ.timeLimitSeconds || 45) % 60} ث)
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeQuestion(activeQuestionIndex)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Prompt input (English for IT content) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      نص السؤال بالإنجليزية (Question Prompt in English) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      مادة تكنولوجيا المعلومات باللغة الإنجليزية
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    dir="ltr"
                    value={activeQ.prompt}
                    onChange={(e) => updateActiveQuestion({ prompt: e.target.value })}
                    placeholder="Enter the IT question prompt in English (e.g. What is the default subnet mask for a Class C IP address?)..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#5E2777] outline-none text-slate-900 resize-none font-medium text-left"
                  />
                </div>

                {/* Specific Question Type Controls */}
                {/* 1. MCQ */}
                {activeQ.type === 'mcq' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      خيارات الإجابة بالإنجليزية (حدد زر الراديو للإجابة الصحيحة):
                    </label>
                    <div className="space-y-2">
                      {(activeQ as MCQQuestion).options.map((optText, optIdx) => {
                        const letter = ['A', 'B', 'C', 'D'][optIdx];
                        const isCorrect = (activeQ as MCQQuestion).correctOptionIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-400'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="mcq-correct"
                              checked={isCorrect}
                              onChange={() =>
                                updateActiveQuestion({ correctOptionIndex: optIdx } as any)
                              }
                              className="w-4 h-4 text-emerald-600 cursor-pointer"
                            />
                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0 font-mono">
                              {letter}
                            </span>
                            <input
                              type="text"
                              dir="ltr"
                              value={optText}
                              placeholder={`Option ${letter} in English...`}
                              onChange={(e) => {
                                const newOpts = [...(activeQ as MCQQuestion).options];
                                newOpts[optIdx] = e.target.value;
                                updateActiveQuestion({ options: newOpts } as any);
                              }}
                              className="flex-1 bg-white px-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none text-slate-800 text-left font-medium"
                            />
                            {isCorrect && (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>الإجابة الصحيحة</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. TRUE/FALSE */}
                {activeQ.type === 'true_false' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      حدد الإجابة الصحيحة للعبارة:
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => updateActiveQuestion({ correctBoolean: true } as any)}
                        className={`py-3 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                          (activeQ as TrueFalseQuestion).correctBoolean === true
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        ✓ True (صح)
                      </button>

                      <button
                        type="button"
                        onClick={() => updateActiveQuestion({ correctBoolean: false } as any)}
                        className={`py-3 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                          (activeQ as TrueFalseQuestion).correctBoolean === false
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        ✕ False (خطأ)
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. ESSAY */}
                {activeQ.type === 'essay' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        الإجابة النموذجية بالإنجليزية (Model Answer in English):
                      </label>
                      <textarea
                        rows={3}
                        dir="ltr"
                        value={(activeQ as EssayQuestion).modelAnswer}
                        onChange={(e) =>
                          updateActiveQuestion({ modelAnswer: e.target.value } as any)
                        }
                        placeholder="Type the model answer in English for the projector review..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-left"
                      />
                    </div>
                  </div>
                )}

                {/* 4. MATCHING */}
                {activeQ.type === 'matching' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      عناصر التوصيل بالإنجليزية (Matching Items):
                    </label>
                    <div className="grid grid-cols-2 gap-3" dir="ltr">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 block">Column A:</span>
                        {(activeQ as MatchingQuestion).leftItems.map((l, lIdx) => (
                          <input
                            key={l.id}
                            type="text"
                            dir="ltr"
                            placeholder={`Item ${lIdx + 1}`}
                            value={l.text}
                            onChange={(e) => {
                              const updatedLeft = [...(activeQ as MatchingQuestion).leftItems];
                              updatedLeft[lIdx] = { ...l, text: e.target.value };
                              updateActiveQuestion({ leftItems: updatedLeft } as any);
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none text-left"
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 block">Column B (Match):</span>
                        {(activeQ as MatchingQuestion).rightItems.map((r, rIdx) => (
                          <input
                            key={r.id}
                            type="text"
                            dir="ltr"
                            placeholder={`Match ${rIdx + 1}`}
                            value={r.text}
                            onChange={(e) => {
                              const updatedRight = [...(activeQ as MatchingQuestion).rightItems];
                              updatedRight[rIdx] = { ...r, text: e.target.value };
                              updateActiveQuestion({ rightItems: updatedRight } as any);
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none text-left"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. COMPLETE / FILL IN THE BLANK */}
                {activeQ.type === 'complete' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <span>الكلمة أو العبارة الصحيحة لإكمال الفراغ (Correct Answer / Word):</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={(activeQ as CompleteQuestion).correctAnswer || ''}
                        onChange={(e) =>
                          updateActiveQuestion({ correctAnswer: e.target.value } as any)
                        }
                        placeholder="e.g. Router, HTTPS, Transport Layer, 192.168.1.1"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[#5E2777] text-left"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        سيتم عرض هذه الإجابة النموذجية في وضع مراجعة البروجيكتور وعند تصدير ملفات الإكسيل.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        إجابات بديلة مقبولة (Acceptable Alternative Answers - مفصولة بفواصل):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={((activeQ as CompleteQuestion).acceptableAnswers || []).join(', ')}
                        onChange={(e) => {
                          const list = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          updateActiveQuestion({ acceptableAnswers: list } as any);
                        }}
                        placeholder="e.g. router, default gateway (optional)"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-left"
                      />
                    </div>
                  </div>
                )}

                {/* Explanation for students */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#5E2777]" />
                    <span>ملاحظة الشرح والتوضيح الفني بالإنجليزية (Technical Explanation):</span>
                  </label>
                  <textarea
                    rows={2}
                    dir="ltr"
                    value={activeQ.explanation || ''}
                    onChange={(e) => updateActiveQuestion({ explanation: e.target.value })}
                    placeholder="Provide a technical breakdown in English of why this answer is correct..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 resize-none text-left"
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                لم يتم اختيار أي سؤال. اضغط على أحد أزرار إضافة الأسئلة للبدء.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-purple-100 flex items-center justify-between shrink-0 bg-purple-50/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-[#5E2777] hover:bg-[#4d1f63] text-white text-xs font-bold rounded-xl shadow-md shadow-[#5E2777]/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ ونشر الاختبار</span>
          </button>
        </div>
      </div>
    </div>
  );
};
