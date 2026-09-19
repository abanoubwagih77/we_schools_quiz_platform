import { firestore } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Quiz,
  QuizSession,
  User,
  WeekFolder,
  SystemLog,
  TargetClass,
  WE_SCHOOLS,
  QuizQuestion,
} from '../types';

const STORE_COLLECTION = 'system_store';
const STORE_DOC_ID = 'we_it_main_store';

export interface DatabaseSchema {
  users: User[];
  folders: WeekFolder[];
  quizzes: Quiz[];
  sessions: QuizSession[];
  logs: SystemLog[];
}

const DEFAULT_ADMIN: User = {
  id: 'user-admin',
  username: 'admin',
  password: 'admin',
  name: 'م/ أبانوب وجيه',
  role: 'admin',
  school: 'WE Applied Technology School - Toukh',
  department: 'Information Technology (IT)',
  createdAt: new Date().toISOString(),
};

const DEFAULT_FOLDERS: WeekFolder[] = [
  {
    id: 'folder-week-1',
    title: 'الأسبوع الأول: أساسيات تكنولوجيا المعلومات والشبكات',
    weekNumber: 1,
    description: 'مفاهيم الشبكات ومكونات الحاسب الآلي وأنظمة التشغيل',
    status: 'enabled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to shuffle questions
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// In-memory cache for ultra-fast response
let cachedStore: DatabaseSchema | null = null;
let isSyncing = false;

/**
 * Loads entire database from Cloud Firestore (or local cache).
 */
export async function getClientStore(): Promise<DatabaseSchema> {
  if (cachedStore) {
    return cachedStore;
  }

  try {
    const docRef = doc(firestore, STORE_COLLECTION, STORE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        cachedStore = {
          users: data.users,
          folders: Array.isArray(data.folders) && data.folders.length > 0 ? data.folders : DEFAULT_FOLDERS,
          quizzes: Array.isArray(data.quizzes) ? data.quizzes : [],
          sessions: Array.isArray(data.sessions) ? data.sessions : [],
          logs: Array.isArray(data.logs) ? data.logs : [],
        };
        return cachedStore;
      }
    }
  } catch (err) {
    console.warn('[Firebase Store] Cloud read note (will initialize fallback):', err);
  }

  // Fallback if not yet initialized on Cloud Firestore
  cachedStore = {
    users: [DEFAULT_ADMIN],
    folders: DEFAULT_FOLDERS,
    quizzes: [],
    sessions: [],
    logs: [],
  };

  // Try to write default template in background
  saveClientStore(cachedStore).catch(() => {});

  return cachedStore;
}

/**
 * Saves entire database directly to Cloud Firestore.
 */
export async function saveClientStore(store: DatabaseSchema): Promise<boolean> {
  cachedStore = store;
  try {
    const docRef = doc(firestore, STORE_COLLECTION, STORE_DOC_ID);
    const sanitized = JSON.parse(JSON.stringify(store));
    await setDoc(
      docRef,
      {
        ...sanitized,
        lastSyncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('[Firebase Store] Cloud sync error:', err);
    return false;
  }
}

// --- Unified High-level Store Operations with Automatic Dual-Route (API + Cloud Firestore) ---

/**
 * 1. Fetch All Quizzes, Folders, Sessions
 */
export async function apiFetchAllData(): Promise<{
  quizzes: Quiz[];
  folders: WeekFolder[];
  sessions: QuizSession[];
}> {
  // Attempt backend API first
  try {
    const [qRes, fRes, sRes] = await Promise.all([
      fetch('/api/quizzes'),
      fetch('/api/folders'),
      fetch('/api/sessions'),
    ]);

    const parseJson = async (r: Response) => {
      try {
        const txt = await r.text();
        return txt && txt.trim() ? JSON.parse(txt) : null;
      } catch {
        return null;
      }
    };

    const q = await parseJson(qRes);
    const f = await parseJson(fRes);
    const s = await parseJson(sRes);

    if (Array.isArray(q) && Array.isArray(f) && Array.isArray(s)) {
      return { quizzes: q, folders: f, sessions: s };
    }
  } catch (_) {}

  // Fallback to Cloud Firestore
  const store = await getClientStore();
  return {
    quizzes: store.quizzes || [],
    folders: store.folders || [],
    sessions: store.sessions || [],
  };
}

/**
 * 2. Save or Update Quiz
 */
export async function apiSaveQuiz(quizData: Partial<Quiz>, editingQuizId?: string): Promise<{ quiz: Quiz; isNew: boolean }> {
  // Try backend API first
  try {
    const url = editingQuizId ? `/api/quizzes/${editingQuizId}` : '/api/quizzes';
    const method = editingQuizId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData),
    });
    const txt = await res.text();
    if (res.ok && txt) {
      const parsed = JSON.parse(txt);
      if (parsed && parsed.id) {
        return { quiz: parsed, isNew: !editingQuizId };
      }
    }
  } catch (_) {}

  // Cloud Firestore direct operation
  const store = await getClientStore();
  if (editingQuizId) {
    const idx = store.quizzes.findIndex((q) => q.id === editingQuizId);
    if (idx === -1) throw new Error('الاختبار غير موجود للتعديل.');
    const updated: Quiz = {
      ...store.quizzes[idx],
      ...quizData,
      updatedAt: new Date().toISOString(),
    } as Quiz;
    store.quizzes[idx] = updated;
    await saveClientStore(store);
    return { quiz: updated, isNew: false };
  } else {
    const newQuiz: Quiz = {
      id: `quiz-we-${Date.now()}`,
      folderId: quizData.folderId || store.folders[0]?.id || 'folder-week-1',
      title: (quizData.title || 'اختبار جديد').trim(),
      topic: quizData.topic || 'General IT',
      description: quizData.description || '',
      subject: quizData.subject || 'Information Technology (IT)',
      status: quizData.status || 'enabled',
      targetClasses: quizData.targetClasses || ['A1'],
      questions: quizData.questions || [],
      creatorName: quizData.creatorName || 'System Administrator',
      creatorSchool: quizData.creatorSchool || WE_SCHOOLS[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.quizzes.unshift(newQuiz);
    await saveClientStore(store);
    return { quiz: newQuiz, isNew: true };
  }
}

/**
 * 3. Delete Quiz
 */
export async function apiDeleteQuiz(quizId: string): Promise<void> {
  try {
    const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch (_) {}

  const store = await getClientStore();
  store.quizzes = store.quizzes.filter((q) => q.id !== quizId);
  await saveClientStore(store);
}

/**
 * 4. Toggle Quiz Status (enabled / disabled)
 */
export async function apiToggleQuizStatus(quizId: string, enabled: boolean): Promise<Quiz> {
  const nextStatus = enabled ? 'enabled' : 'disabled';
  try {
    const res = await fetch(`/api/quizzes/${quizId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const txt = await res.text();
    if (res.ok && txt) {
      const parsed = JSON.parse(txt);
      if (parsed && parsed.id) return parsed;
    }
  } catch (_) {}

  const store = await getClientStore();
  const idx = store.quizzes.findIndex((q) => q.id === quizId);
  if (idx !== -1) {
    store.quizzes[idx].status = nextStatus;
    store.quizzes[idx].updatedAt = new Date().toISOString();
    await saveClientStore(store);
    return store.quizzes[idx];
  }
  throw new Error('الاختبار غير موجود');
}

/**
 * 5. Duplicate Quiz
 */
export async function apiDuplicateQuiz(quizId: string): Promise<Quiz> {
  try {
    const res = await fetch(`/api/quizzes/${quizId}/duplicate`, { method: 'POST' });
    const txt = await res.text();
    if (res.ok && txt) {
      const parsed = JSON.parse(txt);
      if (parsed && parsed.id) return parsed;
    }
  } catch (_) {}

  const store = await getClientStore();
  const original = store.quizzes.find((q) => q.id === quizId);
  if (!original) throw new Error('الاختبار المراد نسخه غير موجود');

  const copy: Quiz = {
    ...original,
    id: `quiz-we-${Date.now()}`,
    title: `${original.title} (نسخة)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.quizzes.unshift(copy);
  await saveClientStore(store);
  return copy;
}

/**
 * 6. Save or Update Week Folder
 */
export async function apiSaveFolder(
  folderData: { title: string; weekNumber?: number; description?: string; status: 'enabled' | 'disabled' },
  editingFolderId?: string
): Promise<WeekFolder> {
  try {
    const url = editingFolderId ? `/api/folders/${editingFolderId}` : '/api/folders';
    const method = editingFolderId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folderData),
    });
    const txt = await res.text();
    if (res.ok && txt) {
      const parsed = JSON.parse(txt);
      if (parsed && parsed.id) return parsed;
    }
  } catch (_) {}

  const store = await getClientStore();
  if (editingFolderId) {
    const idx = store.folders.findIndex((f) => f.id === editingFolderId);
    if (idx === -1) throw new Error('المجلد غير موجود');
    const updated: WeekFolder = {
      ...store.folders[idx],
      ...folderData,
      updatedAt: new Date().toISOString(),
    };
    store.folders[idx] = updated;
    await saveClientStore(store);
    return updated;
  } else {
    const newFolder: WeekFolder = {
      id: `folder-week-${Date.now()}`,
      title: folderData.title.trim(),
      weekNumber: folderData.weekNumber,
      description: folderData.description || '',
      status: folderData.status || 'enabled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.folders.push(newFolder);
    await saveClientStore(store);
    return newFolder;
  }
}

/**
 * 7. Delete Week Folder
 */
export async function apiDeleteFolder(folderId: string): Promise<void> {
  try {
    const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch (_) {}

  const store = await getClientStore();
  store.folders = store.folders.filter((f) => f.id !== folderId);
  // Unlink any quizzes associated with this folder
  store.quizzes = store.quizzes.map((q) => (q.folderId === folderId ? { ...q, folderId: undefined } : q));
  await saveClientStore(store);
}

/**
 * 8. Toggle Folder Status (enabled / disabled)
 */
export async function apiToggleFolderStatus(folderId: string, currentStatus: 'enabled' | 'disabled'): Promise<WeekFolder> {
  const nextStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
  try {
    const res = await fetch(`/api/folders/${folderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const txt = await res.text();
    if (res.ok && txt) {
      const parsed = JSON.parse(txt);
      if (parsed && parsed.id) return parsed;
    }
  } catch (_) {}

  const store = await getClientStore();
  const idx = store.folders.findIndex((f) => f.id === folderId);
  if (idx !== -1) {
    store.folders[idx].status = nextStatus;
    store.folders[idx].updatedAt = new Date().toISOString();
    await saveClientStore(store);
    return store.folders[idx];
  }
  throw new Error('المجلد غير موجود');
}

/**
 * 9. Start Live Session (for Projector)
 */
export async function apiStartLiveSession(config: {
  quizId: string;
  school: string;
  className: TargetClass;
  randomize: boolean;
  instructorId: string;
  instructorName: string;
}): Promise<{ session: QuizSession; questions: QuizQuestion[] }> {
  try {
    const res = await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const txt = await res.text();
    if (res.ok && txt) {
      const data = JSON.parse(txt);
      if (data && data.session && data.questions) {
        return data;
      }
    }
  } catch (_) {}

  // Cloud Firestore fallback
  const store = await getClientStore();
  const quiz = store.quizzes.find((q) => q.id === config.quizId);
  if (!quiz) throw new Error('الاختبار غير موجود');

  if (quiz.status === 'disabled') {
    throw new Error('هذا الاختبار معطل من قبل مسؤول النظام ولا يمكن تشغيله حالياً.');
  }

  if (quiz.folderId) {
    const folder = store.folders.find((f) => f.id === quiz.folderId);
    if (folder && folder.status === 'disabled') {
      throw new Error('مجلد هذا الأسبوع مغلق حالياً من قبل مسؤول النظام.');
    }
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    throw new Error('لا توجد أسئلة في هذا الاختبار لعرضها.');
  }

  const shuffled = config.randomize ? shuffleArray(quiz.questions) : [...quiz.questions];
  const sessionId = `SES-${config.className}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const newSession: QuizSession = {
    id: sessionId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    topic: quiz.topic,
    school: config.school,
    className: config.className,
    instructorId: config.instructorId,
    instructorName: config.instructorName,
    status: 'active',
    startedAt: new Date().toISOString(),
    randomizedQuestionIds: shuffled.map((q) => q.id),
    totalQuestions: shuffled.length,
    currentQuestionIndex: 0,
  };

  store.sessions.unshift(newSession);
  store.logs.unshift({
    id: `log-${Date.now()}`,
    type: 'quiz_start',
    username: config.instructorName,
    school: config.school,
    className: config.className,
    quizTitle: quiz.title,
    quizId: quiz.id,
    details: `بدء تشغيل الاختبار على البروجيكتور لفصل ${config.className} بمدرسة ${config.school}`,
    timestamp: new Date().toISOString(),
  });

  await saveClientStore(store);

  return { session: newSession, questions: shuffled };
}

/**
 * 10. Fetch Single Session or Review Mode
 */
export async function apiGetSession(sessionId: string, reviewMode = false): Promise<{ session: QuizSession; questions: QuizQuestion[] }> {
  try {
    const url = reviewMode ? `/api/sessions/${sessionId}/review` : `/api/sessions/${sessionId}`;
    const method = reviewMode ? 'POST' : 'GET';
    const res = await fetch(url, { method });
    const txt = await res.text();
    if (res.ok && txt) {
      const data = JSON.parse(txt);
      if (data && data.session) return data;
    }
  } catch (_) {}

  const store = await getClientStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('جلسة الاختبار غير موجودة');

  const quiz = store.quizzes.find((q) => q.id === session.quizId);
  const questions = quiz ? quiz.questions : [];

  if (reviewMode) {
    session.status = 'reviewing';
    await saveClientStore(store);
  }

  return { session, questions };
}

/**
 * 11. Delete Single Session
 */
export async function apiDeleteSession(sessionId: string): Promise<void> {
  try {
    const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch (_) {}

  const store = await getClientStore();
  store.sessions = store.sessions.filter((s) => s.id !== sessionId);
  await saveClientStore(store);
}

/**
 * 12. Clear All Sessions
 */
export async function apiClearAllSessions(): Promise<void> {
  try {
    const res = await fetch('/api/sessions', { method: 'DELETE' });
    if (res.ok) return;
  } catch (_) {}

  const store = await getClientStore();
  store.sessions = [];
  await saveClientStore(store);
}

/**
 * 13. Finish Live Session
 */
export async function apiFinishLiveSession(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/sessions/${sessionId}/finish`, { method: 'POST' });
  } catch (_) {}

  const store = await getClientStore();
  const s = store.sessions.find((sess) => sess.id === sessionId);
  if (s) {
    s.status = 'completed';
    s.completedAt = new Date().toISOString();
    await saveClientStore(store);
  }
}
