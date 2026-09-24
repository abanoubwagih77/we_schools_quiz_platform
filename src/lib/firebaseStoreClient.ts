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
const LOCAL_STORAGE_STORE_KEY = 'we_it_full_database_v3';

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
  password: 'Bebo2000#',
  name: 'م/ أبانوب وجيه',
  role: 'admin',
  school: 'WE Applied Technology School - Toukh',
  department: 'Information Technology (IT)',
  createdAt: new Date().toISOString(),
};

const DEFAULT_USERS: User[] = [
  DEFAULT_ADMIN,
  {
    id: 'user-inst-1790094304445',
    username: 'toukh_it',
    password: '123456',
    name: 'Abanoub Wagih',
    role: 'instructor',
    school: 'WE Applied Technology School - Toukh',
    department: 'Information Technology (IT)',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SEED_QUIZZES: Quiz[] = [
  {
    id: 'quiz-we-1789822580580',
    title: 'Computer Networks & Fundamentals (Quiz 1)',
    topic: 'Computer Networks & OSI Model',
    folderId: 'folder-week-1',
    description: 'اختبار تقييمي في أساسيات الشبكات وطبقات OSI ومكونات الحاسب الآلي',
    subject: 'Information Technology (IT)',
    status: 'enabled',
    targetClasses: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
    questions: [
      {
        id: 'q-1789822559779',
        type: 'true_false',
        prompt: 'تعتبر طبقة Physical Layer في نموذج OSI مسؤولة عن نقل البيانات على شكل إشارات كهربائية أو ضوئية.',
        correctBoolean: true,
        timeLimitSeconds: 30,
        explanation: 'الطبقة الفيزيائية مسؤولة عن نقل البتات الخام عبر وسائط الاتصال السلكية أو اللاسلكية.',
      },
      {
        id: 'q-1789822567665',
        type: 'mcq',
        prompt: 'أي البروتوكولات التالية يعمل في طبقة Transport Layer لتأمين اتصال موثوق ومتحقق منه؟',
        options: ['UDP', 'TCP', 'IP', 'HTTP'],
        correctOptionIndex: 1,
        timeLimitSeconds: 45,
        explanation: 'بروتوكول TCP يوفر اتصالاً موثوقاً Connection-Oriented مع تأكيد الاستلام والتسلسل.',
      },
      {
        id: 'q-1789822567666',
        type: 'mcq',
        prompt: 'ما هو المنفذ الافتراضي لبروتوكول تصفح الويب الآمن HTTPS؟',
        options: ['80', '443', '21', '22'],
        correctOptionIndex: 1,
        timeLimitSeconds: 45,
        explanation: 'يستخدم بروتوكول HTTPS المنفذ 443 كمنفذ افتراضي مشفر بتقنية SSL/TLS.',
      },
    ],
    creatorName: 'م/ أبانوب وجيه',
    creatorSchool: 'WE Applied Technology School - Toukh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_DEFAULT_FOLDERS: WeekFolder[] = [
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

// In-memory cache
let cachedStore: DatabaseSchema | null = null;

export function invalidateClientCache(): void {
  cachedStore = null;
}

/**
 * Reads local storage backup if available
 */
function getLocalStoreBackup(): DatabaseSchema | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        return {
          users: parsed.users,
          folders: Array.isArray(parsed.folders) ? parsed.folders : [],
          quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          logs: Array.isArray(parsed.logs) ? parsed.logs : [],
        };
      }
    }
  } catch (e) {
    console.warn('[Store Cache] Failed to parse local storage backup:', e);
  }
  return null;
}

/**
 * Saves store to local storage backup immediately
 */
function saveLocalStoreBackup(store: DatabaseSchema): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('[Store Cache] Failed to write local storage backup:', e);
  }
}

/**
 * Normalizes question object to guarantee safety and valid fields
 */
export function normalizeQuestion(q: any, index = 0): QuizQuestion {
  const qType = q?.type || (Array.isArray(q?.options) && q.options.length > 0 ? 'mcq' : 'true_false');
  const base = {
    id: q?.id || `q-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
    type: qType,
    prompt: typeof q?.prompt === 'string' ? q.prompt : '',
    timeLimitSeconds: Number(q?.timeLimitSeconds) || 45,
    explanation: typeof q?.explanation === 'string' ? q.explanation : '',
  };

  if (qType === 'mcq') {
    return {
      ...base,
      type: 'mcq',
      options: Array.isArray(q?.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex: typeof q?.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
    };
  }

  if (qType === 'true_false') {
    return {
      ...base,
      type: 'true_false',
      correctBoolean: q?.correctBoolean !== undefined ? Boolean(q.correctBoolean) : true,
    };
  }

  if (qType === 'complete') {
    return {
      ...base,
      type: 'complete',
      correctAnswer: q?.correctAnswer || '',
      acceptableAnswers: Array.isArray(q?.acceptableAnswers) ? q.acceptableAnswers : [],
    };
  }

  if (qType === 'essay') {
    return {
      ...base,
      type: 'essay',
      modelAnswer: q?.modelAnswer || '',
      keyPoints: Array.isArray(q?.keyPoints) ? q.keyPoints : [],
    };
  }

  if (qType === 'matching') {
    return {
      ...base,
      type: 'matching',
      leftItems: Array.isArray(q?.leftItems) ? q.leftItems : [],
      rightItems: Array.isArray(q?.rightItems) ? q.rightItems : [],
      correctPairs: Array.isArray(q?.correctPairs) ? q.correctPairs : [],
    };
  }

  return base as QuizQuestion;
}

/**
 * Loads entire database from Cloud Firestore (with instantaneous LocalStorage fallback).
 */
export async function getClientStore(forceRefresh: boolean = false): Promise<DatabaseSchema> {
  if (cachedStore && !forceRefresh) {
    return cachedStore;
  }

  // 1. Instant check from Local Storage
  const localBackup = getLocalStoreBackup();
  if (localBackup && !cachedStore) {
    cachedStore = localBackup;
  }

  // 2. Fetch latest from Cloud Firestore
  try {
    const docRef = doc(firestore, STORE_COLLECTION, STORE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        // If folders is an array (even if 0 items), keep it as is! Do not override empty array with defaults.
        const folders = Array.isArray(data.folders) ? data.folders : (localBackup?.folders ?? INITIAL_DEFAULT_FOLDERS);
        const quizzes = Array.isArray(data.quizzes) ? data.quizzes.map((q: any) => ({
          ...q,
          questions: Array.isArray(q.questions) ? q.questions.map(normalizeQuestion) : [],
        })) : (localBackup?.quizzes ?? DEFAULT_SEED_QUIZZES);
        const users = Array.isArray(data.users) ? data.users : (localBackup?.users ?? DEFAULT_USERS);
        const sessions = Array.isArray(data.sessions) ? data.sessions : (localBackup?.sessions ?? []);
        const logs = Array.isArray(data.logs) ? data.logs : (localBackup?.logs ?? []);

        cachedStore = { users, folders, quizzes, sessions, logs };
        saveLocalStoreBackup(cachedStore);
        return cachedStore;
      }
    } else {
      // Document does not exist in Cloud Firestore yet
      if (localBackup) {
        // Push our existing local store to Cloud Firestore
        saveClientStore(localBackup).catch(() => {});
        return localBackup;
      }
    }
  } catch (err) {
    console.warn('[Firebase Store] Cloud read note (using local cache):', err);
  }

  // 3. Fallback if both Cloud and Local were empty
  if (!cachedStore) {
    cachedStore = {
      users: DEFAULT_USERS,
      folders: INITIAL_DEFAULT_FOLDERS,
      quizzes: DEFAULT_SEED_QUIZZES,
      sessions: [],
      logs: [],
    };
    saveLocalStoreBackup(cachedStore);
    saveClientStore(cachedStore).catch(() => {});
  }

  return cachedStore;
}

/**
 * Saves entire database directly to Cloud Firestore AND LocalStorage synchronously.
 */
export async function saveClientStore(store: DatabaseSchema): Promise<boolean> {
  cachedStore = store;
  // Always update local storage first so refresh never loses data
  saveLocalStoreBackup(store);

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

/**
 * Helper to check if a fetch response is valid JSON from an active API server
 */
function isApiJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return res.ok && ct.includes('application/json');
}

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

    if (isApiJsonResponse(qRes) && isApiJsonResponse(fRes) && isApiJsonResponse(sRes)) {
      const [q, f, s] = await Promise.all([
        qRes.json(),
        fRes.json(),
        sRes.json(),
      ]);

      if (Array.isArray(q) && Array.isArray(f) && Array.isArray(s)) {
        const store = await getClientStore();
        store.quizzes = q.map((quiz: any) => ({
          ...quiz,
          questions: Array.isArray(quiz.questions) ? quiz.questions.map(normalizeQuestion) : [],
        }));
        store.folders = f;
        store.sessions = s;
        saveClientStore(store).catch(() => {});
        return { quizzes: store.quizzes, folders: store.folders, sessions: store.sessions };
      }
    }
  } catch (_) {}

  // Fallback to Cloud Firestore / Local Cache
  const store = await getClientStore(true);
  return {
    quizzes: store.quizzes || [],
    folders: store.folders || [],
    sessions: store.sessions || [],
  };
}

/**
 * 2. Save or Update Quiz
 */
export async function apiSaveQuiz(
  quizData: Partial<Quiz>,
  editingQuizId?: string
): Promise<{ quiz: Quiz; isNew: boolean }> {
  // Sanitize questions
  const sanitizedQuestions = Array.isArray(quizData.questions)
    ? quizData.questions.map(normalizeQuestion)
    : [];

  const payload = {
    ...quizData,
    questions: sanitizedQuestions,
  };

  // Try backend API first
  try {
    const url = editingQuizId ? `/api/quizzes/${editingQuizId}` : '/api/quizzes';
    const method = editingQuizId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (isApiJsonResponse(res)) {
      const parsed = await res.json();
      if (parsed && parsed.id) {
        const store = await getClientStore();
        if (editingQuizId) {
          const idx = store.quizzes.findIndex((q) => q.id === editingQuizId);
          if (idx !== -1) store.quizzes[idx] = parsed;
          else store.quizzes.unshift(parsed);
        } else {
          store.quizzes.unshift(parsed);
        }
        await saveClientStore(store);
        return { quiz: parsed, isNew: !editingQuizId };
      }
    }
  } catch (_) {}

  // Cloud Firestore direct operation
  const store = await getClientStore();
  if (editingQuizId) {
    const idx = store.quizzes.findIndex((q) => q.id === editingQuizId);
    if (idx !== -1) {
      const updated: Quiz = {
        ...store.quizzes[idx],
        ...payload,
        updatedAt: new Date().toISOString(),
      } as Quiz;
      store.quizzes[idx] = updated;
      await saveClientStore(store);
      return { quiz: updated, isNew: false };
    }
  }

  // Create new or prepend if not found
  const newQuiz: Quiz = {
    id: editingQuizId || `quiz-we-${Date.now()}`,
    folderId: payload.folderId || (store.folders[0]?.id) || 'folder-week-1',
    title: (payload.title || 'اختبار جديد').trim(),
    topic: payload.topic || 'General IT',
    description: payload.description || '',
    subject: payload.subject || 'Information Technology (IT)',
    status: payload.status || 'enabled',
    targetClasses: payload.targetClasses || ['A1'],
    questions: sanitizedQuestions,
    creatorName: payload.creatorName || 'System Administrator',
    creatorSchool: payload.creatorSchool || WE_SCHOOLS[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.quizzes.unshift(newQuiz);
  await saveClientStore(store);
  return { quiz: newQuiz, isNew: !editingQuizId };
}

/**
 * 3. Delete Quiz
 */
export async function apiDeleteQuiz(quizId: string): Promise<void> {
  try {
    await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
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
    if (isApiJsonResponse(res)) {
      const parsed = await res.json();
      if (parsed && parsed.id) {
        const store = await getClientStore();
        const idx = store.quizzes.findIndex((q) => q.id === quizId);
        if (idx !== -1) {
          store.quizzes[idx] = parsed;
          await saveClientStore(store);
        }
        return parsed;
      }
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
    if (isApiJsonResponse(res)) {
      const parsed = await res.json();
      if (parsed && parsed.id) {
        const store = await getClientStore();
        store.quizzes.unshift(parsed);
        await saveClientStore(store);
        return parsed;
      }
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
    if (isApiJsonResponse(res)) {
      const parsed = await res.json();
      if (parsed && parsed.id) {
        const store = await getClientStore();
        if (editingFolderId) {
          const idx = store.folders.findIndex((f) => f.id === editingFolderId);
          if (idx !== -1) store.folders[idx] = parsed;
          else store.folders.push(parsed);
        } else {
          store.folders.push(parsed);
        }
        await saveClientStore(store);
        return parsed;
      }
    }
  } catch (_) {}

  const store = await getClientStore();
  if (editingFolderId) {
    const idx = store.folders.findIndex((f) => f.id === editingFolderId);
    if (idx !== -1) {
      const updated: WeekFolder = {
        ...store.folders[idx],
        ...folderData,
        updatedAt: new Date().toISOString(),
      };
      store.folders[idx] = updated;
      await saveClientStore(store);
      return updated;
    }
  }

  // Create new folder
  const newFolder: WeekFolder = {
    id: editingFolderId || `folder-week-${Date.now()}`,
    title: folderData.title.trim(),
    weekNumber: folderData.weekNumber || (store.folders.length + 1),
    description: folderData.description || '',
    status: folderData.status || 'enabled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.folders.push(newFolder);
  await saveClientStore(store);
  return newFolder;
}

/**
 * 7. Delete Week Folder
 */
export async function apiDeleteFolder(folderId: string): Promise<void> {
  try {
    await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
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
export async function apiToggleFolderStatus(
  folderId: string,
  currentStatus: 'enabled' | 'disabled'
): Promise<WeekFolder> {
  const nextStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
  try {
    const res = await fetch(`/api/folders/${folderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (isApiJsonResponse(res)) {
      const parsed = await res.json();
      if (parsed && parsed.id) {
        const store = await getClientStore();
        const idx = store.folders.findIndex((f) => f.id === folderId);
        if (idx !== -1) {
          store.folders[idx] = parsed;
          await saveClientStore(store);
        }
        return parsed;
      }
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
    if (isApiJsonResponse(res)) {
      const data = await res.json();
      if (data && data.session && Array.isArray(data.questions)) {
        const normalized = data.questions.map(normalizeQuestion);
        const store = await getClientStore();
        store.sessions.unshift(data.session);
        await saveClientStore(store);
        return { session: data.session, questions: normalized };
      }
    }
  } catch (_) {}

  // Cloud Firestore fallback
  const store = await getClientStore();
  const quiz = store.quizzes.find((q) => q.id === config.quizId);
  if (!quiz) throw new Error('الاختبار المطلوب غير موجود في بنك الاختبارات.');

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
    throw new Error('لا توجد أسئلة مضافة في هذا الاختبار لعرضها على البروجيكتور.');
  }

  const normalizedQuestions = quiz.questions.map(normalizeQuestion);
  const shuffled = config.randomize ? shuffleArray(normalizedQuestions) : [...normalizedQuestions];
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
export async function apiGetSession(
  sessionId: string,
  reviewMode = false
): Promise<{ session: QuizSession; questions: QuizQuestion[] }> {
  try {
    const url = reviewMode ? `/api/sessions/${sessionId}/review` : `/api/sessions/${sessionId}`;
    const method = reviewMode ? 'POST' : 'GET';
    const res = await fetch(url, { method });
    if (isApiJsonResponse(res)) {
      const data = await res.json();
      if (data && data.session) {
        return {
          session: data.session,
          questions: Array.isArray(data.questions) ? data.questions.map(normalizeQuestion) : [],
        };
      }
    }
  } catch (_) {}

  const store = await getClientStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('جلسة الاختبار غير موجودة');

  const quiz = store.quizzes.find((q) => q.id === session.quizId);
  const questions = quiz ? quiz.questions.map(normalizeQuestion) : [];

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
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
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
    await fetch('/api/sessions', { method: 'DELETE' });
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

/**
 * 14. Update User Credentials (Password, Username, School, Name)
 */
export async function apiUpdateUserCredentials(params: {
  userId: string;
  currentPassword?: string;
  newUsername: string;
  newPassword?: string;
  newSchool?: string;
  newName?: string;
}): Promise<User> {
  // Try backend first
  try {
    const res = await fetch('/api/auth/update-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (isApiJsonResponse(res)) {
      const data = await res.json();
      if (data && data.user) {
        const store = await getClientStore();
        const idx = store.users.findIndex((u) => u.id === params.userId);
        if (idx !== -1) {
          store.users[idx] = {
            ...store.users[idx],
            username: params.newUsername.trim(),
            password: params.newPassword?.trim() || store.users[idx].password,
            school: params.newSchool || store.users[idx].school,
            name: params.newName || store.users[idx].name,
          };
          await saveClientStore(store);
        }
        return data.user;
      }
    }
  } catch (_) {}

  // Direct Cloud Firestore / Local update
  const store = await getClientStore();
  const idx = store.users.findIndex((u) => u.id === params.userId);
  if (idx === -1) throw new Error('الحساب غير موجود.');

  const existing = store.users[idx];
  if (params.currentPassword && existing.password && existing.password !== params.currentPassword.trim()) {
    throw new Error('كلمة المرور الحالية غير صحيحة.');
  }

  const updated: User = {
    ...existing,
    username: params.newUsername.trim(),
    password: params.newPassword?.trim() || existing.password,
    school: params.newSchool || existing.school,
    name: params.newName || existing.name,
  };

  store.users[idx] = updated;
  await saveClientStore(store);

  const { password: _, ...safeUser } = updated;
  return safeUser as User;
}

/**
 * 15. Create Instructor User
 */
export async function apiCreateUser(userData: {
  username: string;
  password?: string;
  name: string;
  school: string;
  department?: string;
}): Promise<User> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (isApiJsonResponse(res)) {
      const data = await res.json();
      if (data && data.id) {
        const store = await getClientStore();
        store.users.push(data);
        await saveClientStore(store);
        return data;
      }
    }
  } catch (_) {}

  const store = await getClientStore();
  const conflict = store.users.find(
    (u) => u.username.toLowerCase() === userData.username.trim().toLowerCase()
  );
  if (conflict) {
    throw new Error('اسم المستخدم مسجل بالفعل لحساب آخر.');
  }

  const newUser: User = {
    id: `user-inst-${Date.now()}`,
    username: userData.username.trim(),
    password: userData.password?.trim() || '123456',
    name: userData.name.trim() || userData.username.trim(),
    role: 'instructor',
    school: userData.school || WE_SCHOOLS[0],
    department: userData.department || 'Information Technology (IT)',
    createdAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  await saveClientStore(store);

  const { password: _, ...safeUser } = newUser;
  return safeUser as User;
}

/**
 * 16. Delete Instructor User
 */
export async function apiDeleteUser(userId: string): Promise<void> {
  try {
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
  } catch (_) {}

  const store = await getClientStore();
  store.users = store.users.filter((u) => u.id !== userId);
  await saveClientStore(store);
}
