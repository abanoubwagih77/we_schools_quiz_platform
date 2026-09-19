import { firestore } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DatabaseSchema } from '../../server/db';
import { Quiz, QuizSession, User, WeekFolder } from '../types';

const STORE_COLLECTION = 'system_store';
const STORE_DOC_ID = 'we_it_main_store';

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

/**
 * Loads entire database from Cloud Firestore directly from the browser.
 */
export async function getClientStore(): Promise<DatabaseSchema> {
  try {
    const docRef = doc(firestore, STORE_COLLECTION, STORE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        return {
          users: data.users,
          folders: data.folders || [],
          quizzes: data.quizzes || [],
          sessions: data.sessions || [],
          logs: data.logs || [],
        };
      }
    }
  } catch (err) {
    console.warn('[Firebase Client Direct] Could not load from firestore:', err);
  }

  // Fallback if firestore document does not exist yet
  return {
    users: [DEFAULT_ADMIN],
    folders: [],
    quizzes: [],
    sessions: [],
    logs: [],
  };
}

/**
 * Saves entire database directly to Cloud Firestore from the browser.
 */
export async function saveClientStore(store: DatabaseSchema): Promise<boolean> {
  try {
    const docRef = doc(firestore, STORE_COLLECTION, STORE_DOC_ID);
    const sanitized = JSON.parse(JSON.stringify(store));
    await setDoc(docRef, {
      ...sanitized,
      lastSyncedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Firebase Client Direct] Failed to save store:', err);
    return false;
  }
}
