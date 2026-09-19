import fs from 'fs';
import path from 'path';
import { Quiz, QuizSession, User, SystemLog, WeekFolder, WE_SCHOOLS } from '../src/types';
import { loadDataFromCloud, saveDataToCloud } from './firebaseStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

export interface DatabaseSchema {
  users: User[];
  folders: WeekFolder[];
  quizzes: Quiz[];
  sessions: QuizSession[];
  logs: SystemLog[];
}

const DEFAULT_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin',
    name: 'م/ أبانوب وجيه',
    role: 'admin',
    school: 'WE Applied Technology School - Toukh',
    department: 'Information Technology (IT)',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_FOLDERS: WeekFolder[] = [];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
    // Asynchronously synchronize with Cloud Firestore
    this.initCloudSync();
  }

  private async initCloudSync() {
    try {
      const cloudData = await loadDataFromCloud();
      if (cloudData && Array.isArray(cloudData.users) && cloudData.users.length > 0) {
        // Cloud has existing data - merge or replace local
        console.log('[Firebase Cloud Sync] Synchronized existing database from Cloud Firestore.');
        this.data = cloudData;
        this.saveLocalData(this.data);
      } else {
        // Cloud is empty, push initial local data to cloud
        console.log('[Firebase Cloud Sync] Initializing Cloud Firestore with initial store.');
        await saveDataToCloud(this.data);
      }
    } catch (e) {
      console.warn('[Firebase Cloud Sync] Background cloud init sync warning:', e);
    }
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) {
          // Ensure at least one admin user exists
          if (parsed.users.length === 0) {
            parsed.users = DEFAULT_USERS;
          }
          if (!Array.isArray(parsed.folders)) {
            parsed.folders = [];
          }
          if (!Array.isArray(parsed.quizzes)) {
            parsed.quizzes = [];
          } else {
            parsed.quizzes = parsed.quizzes.map((q: any) => ({
              ...q,
              folderId: q.folderId || undefined,
              status: q.status || 'enabled',
            }));
          }
          if (!Array.isArray(parsed.sessions)) {
            parsed.sessions = [];
          }
          if (!Array.isArray(parsed.logs)) {
            parsed.logs = [];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read db file, initializing with clean database:', e);
    }

    const initial: DatabaseSchema = {
      users: DEFAULT_USERS,
      folders: DEFAULT_FOLDERS,
      quizzes: [],
      sessions: [],
      logs: [],
    };
    this.saveData(initial);
    return initial;
  }

  private saveLocalData(data: DatabaseSchema) {
    try {
      this.ensureDataDirectory();
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
      console.error('Failed to write db file:', e);
    }
  }

  private saveData(data: DatabaseSchema) {
    // 1. Save locally to disk for instant zero-latency responses
    this.saveLocalData(data);

    // 2. Synchronize to Cloud Firestore in background for persistent global storage
    saveDataToCloud(data).catch((err) => {
      console.warn('[Firebase Cloud Sync] Failed background sync:', err);
    });
  }

  // --- Users & Roles ---
  public getUsers(): User[] {
    return this.data.users.map(({ password, ...rest }) => rest as User);
  }

  public getUsersWithPasswords(): User[] {
    return this.data.users;
  }

  public findUserByUsername(username: string): User | undefined {
    return this.data.users.find(
      (u) => u.username.toLowerCase().trim() === username.toLowerCase().trim()
    );
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createInstructorUser(userData: {
    username: string;
    password: string;
    name: string;
    school: string;
    department?: string;
  }): { success: boolean; user?: User; error?: string } {
    const trimmedUsername = userData.username.trim();
    if (!trimmedUsername) {
      return { success: false, error: 'Username cannot be empty' };
    }
    if (!userData.password || userData.password.length < 3) {
      return { success: false, error: 'Password must be at least 3 characters long' };
    }

    const existing = this.data.users.find(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser: User = {
      id: `user-inst-${Date.now()}`,
      username: trimmedUsername,
      password: userData.password.trim(),
      name: userData.name?.trim() || trimmedUsername,
      role: 'instructor',
      school: userData.school || WE_SCHOOLS[0],
      department: userData.department || 'Information Technology (IT)',
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.saveData(this.data);

    const { password, ...safeUser } = newUser;
    return { success: true, user: safeUser as User };
  }

  public deleteUser(userId: string): boolean {
    // Admin cannot be deleted
    const target = this.data.users.find((u) => u.id === userId);
    if (!target || target.role === 'admin' || target.username === 'admin') {
      return false;
    }
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== userId);
    if (this.data.users.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public updateUserCredentials(
    userId: string,
    newUsername: string,
    newPassword?: string,
    newSchool?: string,
    newName?: string
  ): { success: boolean; user?: User; error?: string } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) {
      return { success: false, error: 'Username cannot be empty' };
    }

    const conflict = this.data.users.find(
      (u) => u.id !== userId && u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (conflict) {
      return { success: false, error: 'This username is already taken by another account' };
    }

    user.username = trimmedUsername;
    if (newName && newName.trim()) {
      user.name = newName.trim();
    }
    if (newPassword && newPassword.trim()) {
      user.password = newPassword.trim();
    }
    if (newSchool && newSchool.trim()) {
      user.school = newSchool.trim();
    }

    this.saveData(this.data);
    const { password, ...safeUser } = user;
    return { success: true, user: safeUser as User };
  }

  // --- Folders (Weeks) ---
  public getFolders(): WeekFolder[] {
    return this.data.folders || [];
  }

  public getFolderById(id: string): WeekFolder | undefined {
    return this.data.folders.find((f) => f.id === id);
  }

  public createFolder(folderData: Omit<WeekFolder, 'id' | 'createdAt' | 'updatedAt'>): WeekFolder {
    const newFolder: WeekFolder = {
      id: `folder-week-${Date.now()}`,
      title: folderData.title.trim(),
      weekNumber: folderData.weekNumber || (this.data.folders.length + 1),
      description: folderData.description || '',
      status: folderData.status || 'enabled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.folders.push(newFolder);
    this.saveData(this.data);
    return newFolder;
  }

  public updateFolder(id: string, updates: Partial<WeekFolder>): WeekFolder | null {
    const idx = this.data.folders.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.data.folders[idx] = {
      ...this.data.folders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    return this.data.folders[idx];
  }

  public deleteFolder(id: string): boolean {
    const initialLen = this.data.folders.length;
    this.data.folders = this.data.folders.filter((f) => f.id !== id);
    if (this.data.folders.length !== initialLen) {
      // Also delete or unassign quizzes belonging to this folder
      this.data.quizzes = this.data.quizzes.filter((q) => q.folderId !== id);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Quizzes ---
  public getQuizzes(targetClass?: string, folderId?: string): Quiz[] {
    let list = this.data.quizzes;
    if (folderId) {
      list = list.filter((q) => q.folderId === folderId);
    }
    if (targetClass && targetClass !== 'ALL') {
      list = list.filter((q) => q.targetClasses.includes(targetClass as any));
    }
    return list;
  }

  public getQuizById(id: string): Quiz | undefined {
    return this.data.quizzes.find((q) => q.id === id);
  }

  public createQuiz(quiz: Quiz): Quiz {
    this.data.quizzes.unshift(quiz);
    this.saveData(this.data);
    return quiz;
  }

  public updateQuiz(id: string, updates: Partial<Quiz>): Quiz | null {
    const idx = this.data.quizzes.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    this.data.quizzes[idx] = {
      ...this.data.quizzes[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData(this.data);
    return this.data.quizzes[idx];
  }

  public deleteQuiz(id: string): boolean {
    const initialLen = this.data.quizzes.length;
    this.data.quizzes = this.data.quizzes.filter((q) => q.id !== id);
    if (this.data.quizzes.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Sessions ---
  public getSessions(): QuizSession[] {
    return this.data.sessions;
  }

  public getSessionById(id: string): QuizSession | undefined {
    return this.data.sessions.find((s) => s.id === id);
  }

  public createSession(session: QuizSession): QuizSession {
    this.data.sessions.unshift(session);
    this.saveData(this.data);
    return session;
  }

  public updateSession(id: string, updates: Partial<QuizSession>): QuizSession | null {
    const idx = this.data.sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.sessions[idx] = {
      ...this.data.sessions[idx],
      ...updates,
    };
    this.saveData(this.data);
    return this.data.sessions[idx];
  }

  public deleteSession(id: string): boolean {
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.id !== id);
    if (this.data.sessions.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public clearAllSessions(): boolean {
    this.data.sessions = [];
    this.saveData(this.data);
    return true;
  }

  public deleteSessionsBySchool(schoolName: string): boolean {
    const norm = schoolName.toLowerCase().trim();
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => {
      const sNorm = (s.school || '').toLowerCase().trim();
      return sNorm !== norm && !sNorm.includes(norm) && !norm.includes(sNorm);
    });
    // Also remove logs for this school
    if (Array.isArray(this.data.logs)) {
      this.data.logs = this.data.logs.filter((l) => {
        const lNorm = (l.school || '').toLowerCase().trim();
        return lNorm !== norm && !lNorm.includes(norm) && !norm.includes(lNorm);
      });
    }
    this.saveData(this.data);
    return true;
  }

  // --- Logs ---
  public getLogs(): SystemLog[] {
    return this.data.logs || [];
  }

  public clearLogs(): boolean {
    this.data.logs = [];
    this.saveData(this.data);
    return true;
  }

  public addLog(entry: Omit<SystemLog, 'id' | 'timestamp'>): SystemLog {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    if (!Array.isArray(this.data.logs)) {
      this.data.logs = [];
    }
    this.data.logs.unshift(newLog);
    if (this.data.logs.length > 1000) {
      this.data.logs = this.data.logs.slice(0, 1000);
    }
    this.saveData(this.data);
    return newLog;
  }
}

export const db = new Database();
