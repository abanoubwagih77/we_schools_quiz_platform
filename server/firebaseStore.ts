import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { DatabaseSchema } from './db';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const BACKUP_COLLECTION = 'system_store';
const BACKUP_DOC_ID = 'we_it_main_store';

/**
 * Loads entire database schema from Cloud Firestore.
 * If not present or network unavailable, returns null so caller can fall back to local disk.
 */
export async function loadDataFromCloud(): Promise<DatabaseSchema | null> {
  try {
    const docRef = doc(firestoreDb, BACKUP_COLLECTION, BACKUP_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.users)) {
        return {
          users: data.users || [],
          folders: data.folders || [],
          quizzes: data.quizzes || [],
          sessions: data.sessions || [],
          logs: data.logs || [],
        };
      }
    }
  } catch (err) {
    console.warn('[Firebase Cloud Sync] Failed to load data from Cloud Firestore (will use local fallback):', err);
  }
  return null;
}

/**
 * Saves entire database schema to Cloud Firestore asynchronously.
 * This guarantees durable cloud persistence across container restarts or Vercel serverless teardowns.
 */
export async function saveDataToCloud(data: DatabaseSchema): Promise<boolean> {
  try {
    const docRef = doc(firestoreDb, BACKUP_COLLECTION, BACKUP_DOC_ID);
    // Sanitize any potential undefined values for Firestore compatibility
    const sanitized = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, {
      ...sanitized,
      lastSyncedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firebase Cloud Sync] Failed to sync to Cloud Firestore:', err);
    return false;
  }
}
