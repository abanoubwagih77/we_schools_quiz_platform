import React, { useState } from 'react';
import { Quiz, TargetClass, TARGET_CLASSES, User, WeekFolder } from '../types';
import {
  Play,
  Edit3,
  Copy,
  Trash2,
  Clock,
  HelpCircle,
  PlusCircle,
  Search,
  BookOpen,
  Folder,
  FolderOpen,
  FolderPlus,
  Lock,
  Unlock,
  ArrowRight,
  ChevronLeft,
  Layers,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { exportQuizzesToExcel } from '../utils/exportToExcel';

interface QuizListProps {
  quizzes: Quiz[];
  folders: WeekFolder[];
  currentUser: User;
  selectedClassFilter: string;
  setSelectedClassFilter: (cls: string) => void;
  onPlayQuiz: (quiz: Quiz) => void;
  onEditQuiz: (quiz: Quiz) => void;
  onDuplicateQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onCreateQuizForFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: WeekFolder) => void;
  onToggleFolderStatus: (folderId: string, currentStatus: 'enabled' | 'disabled') => void;
  onDeleteFolder: (folderId: string) => void;
  isDark?: boolean;
}

export const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  folders,
  currentUser,
  selectedClassFilter,
  setSelectedClassFilter,
  onPlayQuiz,
  onEditQuiz,
  onDuplicateQuiz,
  onDeleteQuiz,
  onCreateQuizForFolder,
  onCreateFolder,
  onEditFolder,
  onToggleFolderStatus,
  onDeleteFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Deletion modals state
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<Quiz | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<WeekFolder | null>(null);

  const isAdmin = currentUser.role === 'admin';

  // Helper to calculate total quiz time in mm:ss
  const calculateTotalTime = (quiz: Quiz) => {
    const totalSeconds = quiz.questions.reduce((acc, q) => acc + (q.timeLimitSeconds || 60), 0);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs} ثانية`;
    return secs === 0 ? `${mins} دقيقة` : `${mins} د و ${secs} ث`;
  };

  const activeFolder = folders.find((f) => f.id === selectedFolderId);

  // Quizzes belonging to the active folder
  const currentFolderQuizzes = selectedFolderId
    ? quizzes.filter((q) => q.folderId === selectedFolderId)
    : quizzes;

  // Filter quizzes by search query and target class
  const filteredQuizzes = currentFolderQuizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.topic && quiz.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClass =
      selectedClassFilter === 'ALL' || quiz.targetClasses.includes(selectedClassFilter as TargetClass);

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner / Breadcrumb */}
      {selectedFolderId && activeFolder ? (
        /* Inside a specific folder view */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-purple-100 rounded-3xl shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedFolderId(null)}
              className="p-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-[#5E2777] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للمجلدات</span>
            </button>

            <div className="h-6 w-px bg-purple-100" />

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {activeFolder.title}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    activeFolder.status === 'enabled'
                      ? 'bg-purple-50 text-[#5E2777] border border-purple-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {activeFolder.status === 'enabled' ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>مفعل ومتاح</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>معطل ومغلق</span>
                    </>
                  )}
                </span>
              </div>
              {activeFolder.description && (
                <p className="text-xs text-slate-500 mt-0.5">{activeFolder.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() =>
                exportQuizzesToExcel({
                  quizzes: currentFolderQuizzes,
                  folders,
                  specificQuizTitle: activeFolder.title,
                })
              }
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="تصدير جميع أسئلة هذا المجلد بإجاباتها النموذجية إلى ملف إكسيل"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير الأسبوع (Excel)</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => onToggleFolderStatus(activeFolder.id, activeFolder.status)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeFolder.status === 'enabled'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-purple-50 text-[#5E2777] border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  {activeFolder.status === 'enabled' ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>تعطيل / قفل الأسبوع</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>إعادة تفعيل الأسبوع</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onCreateQuizForFolder(activeFolder.id)}
                  className="px-4 py-2 bg-[#5E2777] hover:bg-[#4d1f63] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إضافة اختبار لهذا الأسبوع</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Root View: Header with Title & Action */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              مجلدات منهج مادة IT الأسبوعية
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              اختر المجلد الأسبوعي للوصول لاختبارات تكنولوجيا المعلومات التفاعلية للفصول من A1 إلى A6.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportQuizzesToExcel({ quizzes, folders })}
              className="px-3.5 sm:px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              title="تصدير كافة الكويزات والأسئلة مع الإجابات النموذجية إلى ملف إكسيل"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير الاختبارات والأسئلة (Excel)</span>
            </button>

            {isAdmin && (
              <button
                onClick={onCreateFolder}
                className="px-4 py-2.5 bg-[#5E2777] hover:bg-[#4d1f63] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-[#5E2777]/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>إضافة مجلد أسبوع جديد</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Week Lock Warning for Instructors */}
      {selectedFolderId && activeFolder && activeFolder.status === 'disabled' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs sm:text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">هذا الأسبوع مغلق حالياً من قبل مدير النظام</div>
            <div className="text-rose-700/90 text-xs mt-0.5">
              لا يمكن للمعلمين بدء جلسات البروجيكتور لاختبارات هذا الأسبوع حتى يقوم المدير بإعادة تفعيله.
            </div>
          </div>
        </div>
      )}

      {/* When at root view: Show Week Folders Grid */}
      {!selectedFolderId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5E2777]" />
              <span>مجلدات الأسابيع الدراسية ({folders.length})</span>
            </h3>
          </div>

          {folders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-purple-100 shadow-xs">
              <Folder className="w-12 h-12 text-purple-200 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800 mb-1">لا توجد مجلدات أسبوعية مضافة حالياً</h4>
              <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto leading-relaxed">
                يمكنك إنشاء مجلدات أسبوعية (مثل: Week 1, Week 2) لتنظيم اختبارات مادة IT وتحديد صلاحيات فتحها للطلاب في الفصول.
              </p>
              {isAdmin && (
                <button
                  onClick={onCreateFolder}
                  className="px-4 py-2.5 bg-[#5E2777] hover:bg-[#4d1f63] text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>إنشاء أول مجلد أسبوعي</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((folder) => {
                const folderQuizCount = quizzes.filter((q) => q.folderId === folder.id).length;
                const isLocked = folder.status === 'disabled';

                return (
                  <div
                    key={folder.id}
                    className={`rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                      isLocked
                        ? 'bg-slate-50 border-slate-200/90 opacity-85'
                        : 'bg-white border-purple-100/80 hover:border-[#5E2777]/40 hover:shadow-md hover:shadow-purple-900/5'
                    }`}
                  >
                    <div>
                      {/* Top status & badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                            isLocked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-50 text-[#5E2777] border border-purple-200'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>معطل ومغلق</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-[#5E2777]" />
                              <span>مفعل</span>
                            </>
                          )}
                        </span>

                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                          {folderQuizCount} {folderQuizCount === 1 ? 'اختبار' : 'اختبارات'}
                        </span>
                      </div>

                      {/* Folder Title */}
                      <h4
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="text-base font-black text-slate-900 hover:text-[#5E2777] transition-colors cursor-pointer line-clamp-1 mb-1"
                      >
                        {folder.title}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[32px]">
                        {folder.description || 'لا يوجد وصف مضاف لهذا المجلد.'}
                      </p>
                    </div>

                    {/* Bottom actions */}
                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="flex-1 py-2 px-3 bg-purple-50 hover:bg-[#5E2777] hover:text-white text-[#5E2777] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>فتح المجلد</span>
                        <ChevronLeft className="w-3.5 h-3.5 mr-auto" />
                      </button>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {/* Toggle Lock / Unlock */}
                          <button
                            onClick={() => onToggleFolderStatus(folder.id, folder.status)}
                            title={isLocked ? 'تفعيل الأسبوع' : 'تعطيل الأسبوع'}
                            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                              isLocked
                                ? 'bg-purple-50 text-[#5E2777] border-purple-200 hover:bg-purple-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Folder */}
                          <button
                            onClick={() => onEditFolder(folder)}
                            title="تعديل بيانات المجلد"
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-[#5E2777] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Folder */}
                          <button
                            onClick={() => setDeleteFolderTarget(folder)}
                            title="حذف المجلد"
                            className="p-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* When inside a selected folder: Show Filter Bars & Quizzes */}
      {selectedFolderId && (
        <div className="space-y-5">
          {/* Search & Class Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white border border-purple-100 rounded-2xl shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اختبار بالاسم، الموضوع، أو الوصف..."
                className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#5E2777] outline-none text-slate-800 transition-all font-medium"
              />
            </div>

            {/* Target Classes Filter without any horizontal overflow or carousel */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedClassFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedClassFilter === 'ALL'
                    ? 'bg-[#5E2777] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                جميع الفصول
              </button>

              {TARGET_CLASSES.map((cls) => {
                const isSelected = selectedClassFilter === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => setSelectedClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#5E2777] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    فصل {cls}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quizzes List */}
          {currentFolderQuizzes.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-purple-100 shadow-xs">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-50 text-[#5E2777] flex items-center justify-center">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                لا توجد اختبارات مضافة في هذا الأسبوع بعد
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                {isAdmin
                  ? 'أضف أول اختبار لمادة IT داخل هذا المجلد الأسبوعي ليتمكن المعلمون من تشغيله للطلاب في فصول A1 إلى A6.'
                  : 'لم يقم مسؤول النظام بإضافة أي اختبارات في هذا الأسبوع حتى الآن.'}
              </p>
              {isAdmin && (
                <button
                  onClick={() => onCreateQuizForFolder(selectedFolderId)}
                  className="px-4 py-2.5 bg-[#5E2777] hover:bg-[#4d1f63] text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إنشاء اختبار جديد داخل هذا الأسبوع</span>
                </button>
              )}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200">
              <p className="text-xs font-bold text-slate-600">لا توجد اختبارات تطابق معايير البحث أو الفصل المختار</p>
              <p className="text-[11px] text-slate-400 mt-1">جرب اختيار "جميع الفصول" أو مسح نص البحث.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuizzes.map((quiz) => {
                const isFolderLocked = activeFolder?.status === 'disabled';
                const isQuizLocked = quiz.status === 'disabled' || isFolderLocked;

                return (
                  <div
                    key={quiz.id}
                    className="rounded-3xl p-5 bg-white border border-purple-100/90 hover:border-[#5E2777]/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Topic & Target Classes Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-[#5E2777] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 truncate">
                          {quiz.topic || 'Networking IT'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {quiz.targetClasses.slice(0, 3).map((cls) => (
                            <span
                              key={cls}
                              className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md"
                            >
                              {cls}
                            </span>
                          ))}
                          {quiz.targetClasses.length > 3 && (
                            <span className="text-[10px] font-mono text-slate-400">
                              +{quiz.targetClasses.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quiz Title */}
                      <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug line-clamp-1">
                        {quiz.title}
                      </h3>

                      {quiz.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                          {quiz.description}
                        </p>
                      )}

                      {/* Metadata row: Questions count & total time */}
                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-purple-50/40 border border-purple-100/60 text-slate-600 mb-4">
                        <span className="flex items-center gap-1.5 font-medium">
                          <HelpCircle className="w-3.5 h-3.5 text-[#5E2777]" />
                          <span>{quiz.questions.length} أسئلة</span>
                        </span>

                        <span className="flex items-center gap-1.5 font-mono font-bold text-[#5E2777]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{calculateTotalTime(quiz)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      {/* Primary CTA: Launch Live Projector */}
                      <button
                        onClick={() => onPlayQuiz(quiz)}
                        disabled={isQuizLocked && !isAdmin}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isQuizLocked && !isAdmin
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#5E2777] hover:bg-[#4d1f63] text-white shadow-[#5E2777]/20'
                        }`}
                      >
                        {isQuizLocked && !isAdmin ? (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>مغلق من قبل مسؤول النظام</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>عرض على البروجيكتور التفاعلي</span>
                          </>
                        )}
                      </button>

                      {/* Secondary Management Controls & Export */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() =>
                            exportQuizzesToExcel({
                              quizzes: [quiz],
                              folders,
                              specificQuizTitle: quiz.title,
                            })
                          }
                          title="تصدير أسئلة هذا الاختبار وإجاباتها النموذجية إلى شيت إكسيل"
                          className="flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تصدير إكسيل</span>
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onEditQuiz(quiz)}
                              title="تعديل الأسئلة والأوقات"
                              className="py-1.5 px-2.5 rounded-xl text-xs font-semibold border bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#5E2777] border-slate-200 hover:border-purple-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>

                            <button
                              onClick={() => onDuplicateQuiz(quiz.id)}
                              title="تكرار الاختبار"
                              className="py-1.5 px-2.5 rounded-xl text-xs font-semibold border bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#5E2777] border-slate-200 hover:border-purple-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>تكرار</span>
                            </button>

                            <button
                              onClick={() => setDeleteQuizTarget(quiz)}
                              title="حذف الاختبار"
                              className="py-1.5 px-2 rounded-xl text-xs font-semibold border bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Quiz Confirmation Modal */}
      {deleteQuizTarget && (
        <DeleteConfirmModal
          isOpen={true}
          title="تأكيد حذف الاختبار"
          message={`هل أنت متأكد من رغبتك في حذف اختبار "${deleteQuizTarget.title}" نهائياً مع كافة أسئلته؟`}
          confirmText="نعم، حذف الاختبار"
          onConfirm={() => {
            onDeleteQuiz(deleteQuizTarget.id);
            setDeleteQuizTarget(null);
          }}
          onClose={() => setDeleteQuizTarget(null)}
        />
      )}

      {/* Delete Folder Confirmation Modal */}
      {deleteFolderTarget && (
        <DeleteConfirmModal
          isOpen={true}
          title="تأكيد حذف المجلد الأسبوعي"
          message={`هل أنت متأكد من حذف مجلد "${deleteFolderTarget.title}"؟ سيتم فك ارتباط الاختبارات داخله وإلغاء المجلد نهائياً.`}
          confirmText="نعم، حذف المجلد"
          onConfirm={() => {
            onDeleteFolder(deleteFolderTarget.id);
            setDeleteFolderTarget(null);
            if (selectedFolderId === deleteFolderTarget.id) {
              setSelectedFolderId(null);
            }
          }}
          onClose={() => setDeleteFolderTarget(null)}
        />
      )}
    </div>
  );
};
