/**
 * WE Applied Technology Schools - IT Unified Quiz System Types
 * Curriculum: Information Technology (IT)
 * Approved WE Schools: Asyut, Damanhour, Toukh, Tor Sinai, Qena
 * Target Classes: A1, A2, A3, A4, A5, A6
 */

export type TargetClass = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';

export const TARGET_CLASSES: TargetClass[] = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];

export const WE_SCHOOLS = [
  'WE Applied Technology School - Asyut',
  'WE Applied Technology School - Damanhour',
  'WE Applied Technology School - Toukh',
  'WE Applied Technology School - Tor Sinai',
  'WE Applied Technology School - Qena',
] as const;

export const WE_SCHOOL_SHORT_NAMES = [
  'Asyut',
  'Damanhour',
  'Toukh',
  'Tor Sinai',
  'Qena',
] as const;

export type QuestionType = 'mcq' | 'true_false' | 'essay' | 'matching' | 'complete';

export interface MatchingItem {
  id: string;
  text: string;
}

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  codeSnippet?: string;
  timeLimitSeconds: number; // e.g. 30, 45, 60, 90, 120s
  points?: number;
  explanation?: string;
}

export interface MCQQuestion extends BaseQuestion {
  type: 'mcq';
  options: [string, string, string, string];
  correctOptionIndex: number; // 0, 1, 2, 3
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correctBoolean: boolean;
}

export interface EssayQuestion extends BaseQuestion {
  type: 'essay';
  modelAnswer: string;
  keyPoints?: string[];
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  leftItems: MatchingItem[];
  rightItems: MatchingItem[];
  correctPairs: { leftId: string; rightId: string }[];
}

export interface CompleteQuestion extends BaseQuestion {
  type: 'complete';
  correctAnswer: string;
  acceptableAnswers?: string[];
}

export type QuizQuestion = MCQQuestion | TrueFalseQuestion | EssayQuestion | MatchingQuestion | CompleteQuestion;

export interface WeekFolder {
  id: string;
  title: string; // e.g., "Week 1: Introduction to Computer Networks"
  weekNumber?: number;
  description?: string;
  status: 'enabled' | 'disabled'; // Admin can enable / disable
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  folderId?: string; // Associated Week / Folder
  title: string;
  topic?: string;
  description: string;
  subject: string;
  targetClasses: TargetClass[];
  questions: QuizQuestion[];
  status?: 'enabled' | 'disabled';
  creatorName: string;
  creatorSchool: string;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'active' | 'completed' | 'reviewing';

export interface QuizSession {
  id: string;
  quizId: string;
  quizTitle: string;
  topic?: string;
  school: string;
  className: TargetClass;
  instructorId: string;
  instructorName: string;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  randomizedQuestionIds: string[];
  totalQuestions: number;
  currentQuestionIndex: number;
}

export type UserRole = 'admin' | 'instructor';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  school: string;
  department?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SystemLog {
  id: string;
  type: 'login' | 'quiz_start' | 'quiz_completed' | 'quiz_review';
  username: string;
  school: string;
  className?: TargetClass | string;
  quizTitle?: string;
  quizId?: string;
  details?: string;
  timestamp: string;
}

export interface SchoolClassRecord {
  className: TargetClass;
  quizzes: {
    quizId: string;
    quizTitle: string;
    sessionId: string;
    date: string;
    status: SessionStatus;
  }[];
}

export interface ActiveSchoolSummary {
  schoolName: string;
  totalSessions: number;
  testedClasses: TargetClass[];
  sessions: QuizSession[];
  lastActivity: string;
}
