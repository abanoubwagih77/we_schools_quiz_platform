import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuizList } from './components/QuizList';
import { LivePlaySetupModal } from './components/LivePlaySetupModal';
import { LiveProjectorScreen } from './components/LiveProjectorScreen';
import { QuizEditorModal } from './components/QuizEditorModal';
import { SessionsView } from './components/SessionsView';
import { SchoolActivityView } from './components/SchoolActivityView';
import { LoginPage } from './components/LoginPage';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { FolderModal } from './components/FolderModal';
import { InstructorAccountsModal } from './components/InstructorAccountsModal';
import { ChangeTeacherNameModal } from './components/ChangeTeacherNameModal';
import { Quiz, QuizSession, User, TargetClass, QuizQuestion, WeekFolder, WE_SCHOOLS } from './types';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { WeLogo } from './components/WeLogo';
import {
  apiFetchAllData,
  subscribeToStoreUpdates,
  apiSaveQuiz,
  apiDeleteQuiz,
  apiToggleQuizStatus,
  apiDuplicateQuiz,
  apiSaveFolder,
  apiDeleteFolder,
  apiToggleFolderStatus,
  apiStartLiveSession,
  apiGetSession,
  apiDeleteSession,
  apiClearAllSessions,
  apiFinishLiveSession,
} from './lib/firebaseStoreClient';

export default function App() {
  // User state: restore session from localStorage if available
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('we_quiz_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<WeekFolder[]>([]);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'sessions' | 'activity'>('quizzes');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Modals & Overlays
  const [setupQuizForLive, setSetupQuizForLive] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isCreatingNewQuiz, setIsCreatingNewQuiz] = useState<boolean>(false);
  const [targetFolderForNewQuiz, setTargetFolderForNewQuiz] = useState<string | undefined>(undefined);
  const [showAccountSettings, setShowAccountSettings] = useState<boolean>(false);
  const [showInstructorAccounts, setShowInstructorAccounts] = useState<boolean>(false);
  const [showChangeTeacherNameModal, setShowChangeTeacherNameModal] = useState<boolean>(false);

  // Folder modal
  const [folderModalOpen, setFolderModalOpen] = useState<boolean>(false);
  const [folderToEdit, setFolderToEdit] = useState<WeekFolder | null>(null);

  // Active Projector Screen state
  const [liveState, setLiveState] = useState<{
    session: QuizSession;
    questions: QuizQuestion[];
    isReviewMode: boolean;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Auto-logout after 5 minutes of continuous inactivity (unless live quiz / projector is active)
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 continuous minutes

  useEffect(() => {
    if (!currentUser) return;

    let lastActivityTime = Date.now();

    const registerActivity = () => {
      lastActivityTime = Date.now();
    };

    const trackedEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click',
    ];

    trackedEvents.forEach((evt) => {
      window.addEventListener(evt, registerActivity, { passive: true });
    });

    const triggerAutoLogout = () => {
      // Close any open modals
      setSetupQuizForLive(null);
      setEditingQuiz(null);
      setIsCreatingNewQuiz(false);
      setTargetFolderForNewQuiz(undefined);
      setShowAccountSettings(false);
      setShowInstructorAccounts(false);
      setFolderModalOpen(false);
      setFolderToEdit(null);
      setLiveState(null);

      // Perform clean logout
      setCurrentUser(null);
      setActiveTab('quizzes');
      try {
        localStorage.removeItem('we_quiz_user');
        localStorage.removeItem('we_quiz_token');
      } catch (e) {}

      setSessionExpiredNotice(
        'تم تسجيل الخروج تلقائياً لعدم وجود أي نشاط لمدة 5 دقائق متواصلة حفاظاً على أمان حسابك.'
      );
    };

    // Check every 5 seconds
    const intervalId = setInterval(() => {
      // If live projector screen or review is currently running, keep session active
      if (liveState) {
        lastActivityTime = Date.now();
        return;
      }

      if (Date.now() - lastActivityTime >= IDLE_TIMEOUT_MS) {
        triggerAutoLogout();
      }
    }, 5000);

    // Also check on tab focus/visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!liveState && Date.now() - lastActivityTime >= IDLE_TIMEOUT_MS) {
          triggerAutoLogout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      trackedEvents.forEach((evt) => {
        window.removeEventListener(evt, registerActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [currentUser, liveState]);

  // Fetch initial data (quizzes, folders, and sessions)
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await apiFetchAllData();
      setQuizzes(data.quizzes);
      setFolders(data.folders);
      setSessions(data.sessions);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    fetchData();

    // Live cross-device real-time sync with Cloud Firestore:
    // Any change (creating/editing a quiz, updating folders, running sessions) made on ANY computer/laptop
    // will instantly reflect right here in real time.
    const unsubscribe = subscribeToStoreUpdates(({ quizzes: liveQuizzes, folders: liveFolders, sessions: liveSessions }) => {
      setQuizzes(liveQuizzes);
      setFolders(liveFolders);
      setSessions(liveSessions);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Handle successful login
  const handleLoginSuccess = (user: User, token: string) => {
    setSessionExpiredNotice(null);
    setCurrentUser(user);
    // Always navigate directly to the quizzes and folders tab on login
    setActiveTab('quizzes');
    try {
      localStorage.setItem('we_quiz_user', JSON.stringify(user));
      localStorage.setItem('we_quiz_token', token);
    } catch (e) {
      console.error('Failed to save session to localStorage:', e);
    }
    showToast(`مرحباً بك ${user.name || user.username} في منصة اختبارات IT`);
  };

  // Handle logout
  const handleLogout = () => {
    setSessionExpiredNotice(null);
    setCurrentUser(null);
    setActiveTab('quizzes');
    try {
      localStorage.removeItem('we_quiz_user');
      localStorage.removeItem('we_quiz_token');
    } catch (e) {}
    showToast('تم تسجيل الخروج بنجاح.');
  };

  // Handle user credentials updated
  const handleUserUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('we_quiz_user', JSON.stringify(updatedUser));
    } catch (e) {}
    showToast('تم حفظ وتحديث بيانات الحساب بنجاح.');
  };

  // Handle teacher name change during session
  const handleSaveTeacherName = (newName: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, name: newName };
    setCurrentUser(updated);
    try {
      localStorage.setItem('we_quiz_user', JSON.stringify(updated));
      localStorage.setItem('we_last_teacher_name', newName);
    } catch (e) {}
    showToast(`تم تعيين اسم المعلم للجلسة الحالية: ${newName}`);
  };

  // START LIVE SESSION
  const handleConfirmStartLive = async (config: {
    quizId: string;
    school: string;
    className: TargetClass;
    randomize: boolean;
  }) => {
    try {
      const data = await apiStartLiveSession({
        quizId: config.quizId,
        school: config.school,
        className: config.className,
        randomize: config.randomize,
        instructorId: currentUser?.id || 'admin',
        instructorName: currentUser?.name || currentUser?.username || 'Instructor',
      });

      setSessions((prev) => [data.session, ...prev]);

      setLiveState({
        session: data.session,
        questions: data.questions,
        isReviewMode: false,
      });

      setSetupQuizForLive(null);
      showToast(`بدأ العرض المباشر على شاشة البروجيكتور لفصل ${config.className}`);
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء بدء الجلسة', 'error');
      throw err;
    }
  };

  // RE-OPEN AN EXISTING SESSION (Review mode)
  const handleOpenHistoricalSession = async (session: QuizSession, mode: 'live' | 'review') => {
    try {
      const data = await apiGetSession(session.id, mode === 'review');
      setLiveState({
        session: data.session,
        questions: data.questions,
        isReviewMode: mode === 'review',
      });
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء فتح الجلسة', 'error');
    }
  };

  // POST-QUIZ REVIEW UNLOCK
  const handleStartReviewFromLive = async () => {
    if (!liveState) return;
    try {
      const data = await apiGetSession(liveState.session.id, true);

      setLiveState({
        session: data.session,
        questions: data.questions,
        isReviewMode: true,
      });

      setSessions((prev) =>
        prev.map((s) => (s.id === data.session.id ? data.session : s))
      );

      showToast('تم فتح مراجعة الإجابات النموذجية على شاشة العرض.');
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء فتح المراجعة', 'error');
    }
  };

  // FINISH LIVE SESSION
  const handleFinishLiveSession = async () => {
    if (!liveState) return;
    try {
      await apiFinishLiveSession(liveState.session.id);
      setSessions((prev) =>
        prev.map((s) => (s.id === liveState.session.id ? { ...s, status: 'completed', completedAt: new Date().toISOString() } : s))
      );
    } catch (e) {}
  };

  // SAVE OR UPDATE QUIZ
  const handleSaveQuiz = async (quizData: Partial<Quiz>) => {
    try {
      const result = await apiSaveQuiz(
        {
          ...quizData,
          creatorName: currentUser?.name || currentUser?.username || 'Admin',
          creatorSchool: currentUser?.school || WE_SCHOOLS[0],
        },
        editingQuiz?.id
      );

      if (result.isNew) {
        setQuizzes((prev) => [result.quiz, ...prev]);
        showToast('تم حفظ وإنشاء الاختبار الجديد بنجاح.');
      } else {
        setQuizzes((prev) => prev.map((q) => (q.id === result.quiz.id ? result.quiz : q)));
        showToast('تم حفظ تعديلات الاختبار بنجاح.');
      }

      setEditingQuiz(null);
      setIsCreatingNewQuiz(false);
      setTargetFolderForNewQuiz(undefined);
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء حفظ الاختبار', 'error');
      throw err;
    }
  };

  // DUPLICATE QUIZ
  const handleDuplicateQuiz = async (quizId: string) => {
    try {
      const dup = await apiDuplicateQuiz(quizId);
      setQuizzes((prev) => [dup, ...prev]);
      showToast('تم نسخ الاختبار بنجاح.');
    } catch (err: any) {
      showToast(err.message || 'فشل تكرار الاختبار', 'error');
    }
  };

  // TOGGLE QUIZ STATUS
  const handleToggleQuizStatus = async (quizId: string, enabled: boolean) => {
    try {
      const updated = await apiToggleQuizStatus(quizId, enabled);
      setQuizzes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      showToast(`تم ${enabled ? 'تفعيل' : 'تعطيل'} الاختبار بنجاح.`);
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث حالة الاختبار', 'error');
    }
  };

  // TOGGLE FOLDER STATUS
  const handleToggleFolderStatus = async (folderId: string, currentStatus: 'enabled' | 'disabled') => {
    try {
      const updated = await apiToggleFolderStatus(folderId, currentStatus);
      setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast(`تم ${updated.status === 'enabled' ? 'تفعيل' : 'تعطيل'} المجلد الأسبوعي.`);
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء تغيير حالة المجلد', 'error');
    }
  };

  // DELETE SINGLE SESSION
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiDeleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast('تم حذف جلسة الاختبار بنجاح.');
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء حذف الجلسة', 'error');
    }
  };

  // CLEAR ALL SESSIONS
  const handleClearAllSessions = async () => {
    try {
      await apiClearAllSessions();
      setSessions([]);
      showToast('تم مسح جميع جلسات الاختبار بنجاح للبدء من جديد.');
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء مسح الجلسات', 'error');
    }
  };

  // DELETE QUIZ DIRECTLY (invoked after confirmation in QuizList)
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await apiDeleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      showToast('تم حذف الاختبار بنجاح.');
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء حذف الاختبار', 'error');
      throw err;
    }
  };

  // DELETE FOLDER DIRECTLY (invoked after confirmation in QuizList)
  const handleDeleteFolder = async (folderId: string) => {
    try {
      await apiDeleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setQuizzes((prev) =>
        prev.map((q) => (q.folderId === folderId ? { ...q, folderId: undefined } : q))
      );
      showToast('تم حذف المجلد الأسبوعي بنجاح.');
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء حذف المجلد', 'error');
      throw err;
    }
  };

  // SAVE FOLDER (Create or Update)
  const handleSaveFolder = async (data: {
    title: string;
    weekNumber?: number;
    description?: string;
    status: 'enabled' | 'disabled';
  }) => {
    try {
      const saved = await apiSaveFolder(data, folderToEdit?.id);
      if (folderToEdit) {
        setFolders((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
        showToast('تم حفظ التعديلات على المجلد الأسبوعي بنجاح.');
      } else {
        setFolders((prev) => [...prev, saved]);
        showToast('تم إنشاء المجلد الأسبوعي الجديد بنجاح.');
      }
      setFolderModalOpen(false);
      setFolderToEdit(null);
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء حفظ المجلد', 'error');
      throw err;
    }
  };

  // If user is not authenticated, show the Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        sessionExpiredMessage={sessionExpiredNotice}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border animate-in fade-in slide-in-from-top-4 duration-200 text-xs sm:text-sm font-semibold max-w-md">
          {notification.type === 'success' ? (
            <div className="bg-purple-50 border border-purple-200 text-[#5E2777] flex items-center gap-2 p-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[#5E2777] shrink-0" />
              <span>{notification.message}</span>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 p-2 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{notification.message}</span>
            </div>
          )}
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 mr-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCreateQuiz={() => {
          setEditingQuiz(null);
          setTargetFolderForNewQuiz(undefined);
          setIsCreatingNewQuiz(true);
        }}
        onOpenAccountSettings={() => setShowAccountSettings(true)}
        onOpenInstructorAccounts={() => setShowInstructorAccounts(true)}
        onChangeTeacherName={() => setShowChangeTeacherNameModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 border-3 border-[#5E2777] border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-slate-400 font-bold">
              جاري تحميل بنك الاختبارات والمجلدات الأسبوعية...
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'quizzes' && (
              <QuizList
                quizzes={quizzes}
                folders={folders}
                currentUser={currentUser}
                selectedClassFilter={selectedClassFilter}
                setSelectedClassFilter={setSelectedClassFilter}
                onPlayQuiz={(quiz) => setSetupQuizForLive(quiz)}
                onEditQuiz={(quiz) => {
                  setEditingQuiz(quiz);
                  setTargetFolderForNewQuiz(quiz.folderId);
                  setIsCreatingNewQuiz(true);
                }}
                onDuplicateQuiz={handleDuplicateQuiz}
                onDeleteQuiz={handleDeleteQuiz}
                onCreateQuizForFolder={(folderId: string) => {
                  setEditingQuiz(null);
                  setTargetFolderForNewQuiz(folderId);
                  setIsCreatingNewQuiz(true);
                }}
                onToggleFolderStatus={handleToggleFolderStatus}
                onCreateFolder={() => {
                  setFolderToEdit(null);
                  setFolderModalOpen(true);
                }}
                onEditFolder={(folder) => {
                  setFolderToEdit(folder);
                  setFolderModalOpen(true);
                }}
                onDeleteFolder={handleDeleteFolder}
                isDark={false}
              />
            )}

            {activeTab === 'sessions' && (
              <SessionsView
                sessions={currentUser.role === 'admin' ? sessions : sessions.filter((s) => s.school === currentUser.school)}
                quizzes={quizzes}
                currentUser={currentUser}
                onOpenSession={handleOpenHistoricalSession}
                onDeleteSession={currentUser.role === 'admin' ? handleDeleteSession : undefined}
                onClearAllSessions={currentUser.role === 'admin' ? handleClearAllSessions : undefined}
                isDark={false}
              />
            )}

            {activeTab === 'activity' && currentUser.role === 'admin' && (
              <SchoolActivityView
                onOpenSession={(sessionId) => {
                  const target = sessions.find((s) => s.id === sessionId);
                  if (target) handleOpenHistoricalSession(target, 'review');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Fullscreen Live Classroom Projector Screen */}
      {liveState && (
        <LiveProjectorScreen
          session={liveState.session}
          questions={liveState.questions}
          isReviewMode={liveState.isReviewMode}
          onExit={() => setLiveState(null)}
          onStartReview={handleStartReviewFromLive}
          onFinishSession={handleFinishLiveSession}
        />
      )}

      {/* Setup Modal for Live Classroom Play */}
      {setupQuizForLive && (
        <LivePlaySetupModal
          quiz={setupQuizForLive}
          currentUser={currentUser}
          onClose={() => setSetupQuizForLive(null)}
          onConfirmStart={handleConfirmStartLive}
        />
      )}

      {/* Quiz Editor Modal (Create or Edit) */}
      {isCreatingNewQuiz && (
        <QuizEditorModal
          quiz={editingQuiz}
          folders={folders}
          initialFolderId={targetFolderForNewQuiz}
          currentUser={currentUser}
          onClose={() => {
            setIsCreatingNewQuiz(false);
            setEditingQuiz(null);
            setTargetFolderForNewQuiz(undefined);
          }}
          onSave={handleSaveQuiz}
          isDark={false}
        />
      )}

      {/* Folder Modal (Create or Edit Week Folder) */}
      {folderModalOpen && (
        <FolderModal
          folder={folderToEdit}
          onClose={() => {
            setFolderModalOpen(false);
            setFolderToEdit(null);
          }}
          onSave={handleSaveFolder}
        />
      )}

      {/* Instructor Accounts Modal (Admin Only) */}
      {showInstructorAccounts && currentUser && (
        <InstructorAccountsModal
          currentUser={currentUser}
          onClose={() => setShowInstructorAccounts(false)}
        />
      )}

      {/* Account Settings Modal (Change Username, Password, School) */}
      {showAccountSettings && currentUser && (
        <AccountSettingsModal
          currentUser={currentUser}
          onClose={() => setShowAccountSettings(false)}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Change Teacher Name Modal (Session Identity) */}
      {showChangeTeacherNameModal && currentUser && (
        <ChangeTeacherNameModal
          currentUser={currentUser}
          onClose={() => setShowChangeTeacherNameModal(false)}
          onSave={handleSaveTeacherName}
        />
      )}

      {/* Branded Footer with Official WE Logo & Eng. Abanob Wagih Attribution */}
      <footer className="border-t border-purple-100 bg-white py-6 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 text-[#5E2777]">
            <WeLogo className="w-8 h-8" />
            <span className="font-bold text-sm tracking-tight">
              مدارس WE للتكنولوجيا التطبيقية — بنك أسئلة مادة تكنولوجيا المعلومات (IT)
            </span>
          </div>

          <div className="text-xs sm:text-sm font-black text-slate-800 mt-1">
            جميع الحقوق محفوظة © م/ أبانوب وجيه — مدرسة WE للتكنولوجيا التطبيقية بطوخ
          </div>

          <div className="text-[11px] font-mono text-[#5E2777] font-semibold" dir="ltr">
            Copyright &copy; Eng. Abanob Wagih - WE Applied Technology School - Toukh
          </div>
        </div>
      </footer>
    </div>
  );
}
