import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import {
  Quiz,
  QuizSession,
  User,
  TargetClass,
  TARGET_CLASSES,
  WE_SCHOOLS,
  QuizQuestion,
  MCQQuestion,
  TrueFalseQuestion,
  MatchingQuestion,
  EssayQuestion,
} from './src/types';

// Randomizer helper to shuffle questions per classroom session
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Strip answers from questions to protect session integrity
function sanitizeQuestionForLive(q: QuizQuestion): QuizQuestion {
  if (q.type === 'mcq') {
    const { correctOptionIndex, explanation, ...safe } = q as MCQQuestion;
    return safe as any;
  }
  if (q.type === 'true_false') {
    const { correctBoolean, explanation, ...safe } = q as TrueFalseQuestion;
    return safe as any;
  }
  if (q.type === 'essay') {
    const { modelAnswer, keyPoints, ...safe } = q as EssayQuestion;
    return safe as any;
  }
  if (q.type === 'matching') {
    const { correctPairs, explanation, ...safe } = q as MatchingQuestion;
    return safe as any;
  }
  return q;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Available WE Schools (strictly the 5 authorized schools)
  app.get('/api/schools', (req, res) => {
    res.json(WE_SCHOOLS);
  });

  // Target classes list
  app.get('/api/classes', (req, res) => {
    res.json(TARGET_CLASSES);
  });

  // Auth: Login with Username & Password
  app.post('/api/auth/login', (req, res) => {
    const { username, password, school } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }

    const userWithPass = db.getUsersWithPasswords().find(
      (u) => u.username.toLowerCase().trim() === username.toLowerCase().trim()
    );

    if (!userWithPass) {
      return res.status(401).json({ error: 'Invalid username or credentials.' });
    }

    if (userWithPass.password && userWithPass.password !== password) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    }

    // Strict school validation: verify user belongs to the requested school
    // If the account has an assigned school, they MUST match
    if (userWithPass.school && school) {
      const normalize = (s: string) => s.toLowerCase().replace(/[-_•]/g, ' ').replace(/\s+/g, ' ').trim();
      const userSchoolNorm = normalize(userWithPass.school);
      const reqSchoolNorm = normalize(school);

      // Check if both mention the same branch (toukh, qena, asyut, damanhour, tor sinai)
      const branches = ['toukh', 'qena', 'asyut', 'damanhour', 'tor sinai', 'طوخ', 'قنا', 'أسيوط', 'دمنهور', 'طور سيناء'];
      const userBranch = branches.find((b) => userSchoolNorm.includes(b));
      const reqBranch = branches.find((b) => reqSchoolNorm.includes(b));

      if (userBranch && reqBranch && userBranch !== reqBranch) {
        return res.status(401).json({
          error: `بيانات الدخول لا تتطابق مع الفرع المحدد. هذا الحساب مسجل ومخصص لـ (${userWithPass.school}). يرجى اختيار المدرسة الصحيحة من القائمة.`,
        });
      }
    }

    const activeSchool = userWithPass.school || school || WE_SCHOOLS[0];

    // Log login entry
    db.addLog({
      type: 'login',
      username: userWithPass.username,
      school: activeSchool,
      details: `Successful sign in as (${userWithPass.username} - ${userWithPass.role}) for (${activeSchool})`,
    });

    const { password: _, ...safeUser } = userWithPass;
    res.json({
      user: { ...safeUser, school: activeSchool },
      token: `token_${safeUser.id}_${Date.now()}`,
    });
  });

  // Auth: Update credentials (change username, password, school, name)
  app.post('/api/auth/update-credentials', (req, res) => {
    const { userId, currentPassword, newUsername, newPassword, newSchool, newName } = req.body;

    if (!userId || !newUsername) {
      return res.status(400).json({ error: 'User ID and new username are required.' });
    }

    const userWithPass = db.getUsersWithPasswords().find((u) => u.id === userId);
    if (!userWithPass) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (userWithPass.password && currentPassword !== undefined && userWithPass.password !== currentPassword) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const result = db.updateUserCredentials(userId, newUsername, newPassword, newSchool, newName);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to update credentials.' });
    }

    db.addLog({
      type: 'login',
      username: newUsername,
      school: newSchool || userWithPass.school,
      details: `Credentials updated for user (${newUsername})`,
    });

    res.json({
      success: true,
      message: 'Account profile updated successfully.',
      user: result.user,
    });
  });

  // Admin User Management: List all users
  app.get('/api/users', (req, res) => {
    res.json(db.getUsers());
  });

  // Admin User Management: Create new instructor account
  app.post('/api/users', (req, res) => {
    const { username, password, name, school, department } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = db.createInstructorUser({
      username,
      password,
      name,
      school: school || WE_SCHOOLS[0],
      department: department || 'Information Technology (IT)',
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    db.addLog({
      type: 'login',
      username: 'admin',
      school: school || WE_SCHOOLS[0],
      details: `Admin created new instructor account: (${username}) for (${school || WE_SCHOOLS[0]})`,
    });

    res.status(201).json(result.user);
  });

  // Admin User Management: Delete user
  app.delete('/api/users/:id', (req, res) => {
    const success = db.deleteUser(req.params.id);
    if (!success) {
      return res.status(400).json({ error: 'Cannot delete this account (admin or not found).' });
    }
    res.json({ message: 'Instructor account deleted successfully.' });
  });

  // Folders (Weeks): List all
  app.get('/api/folders', (req, res) => {
    res.json(db.getFolders());
  });

  // Folders (Weeks): Create new
  app.post('/api/folders', (req, res) => {
    const { title, weekNumber, description, status } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Folder / Week title is required.' });
    }
    const folder = db.createFolder({
      title: title.trim(),
      weekNumber: weekNumber || undefined,
      description: description || '',
      status: status || 'enabled',
    });
    res.status(201).json(folder);
  });

  // Folders (Weeks): Update (e.g. enable/disable, rename)
  app.put('/api/folders/:id', (req, res) => {
    const updated = db.updateFolder(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Folder not found.' });
    }
    res.json(updated);
  });

  // Folders (Weeks): Toggle status specifically
  app.put('/api/folders/:id/status', (req, res) => {
    const { status } = req.body;
    if (!status || (status !== 'enabled' && status !== 'disabled')) {
      return res.status(400).json({ error: 'Status must be either enabled or disabled.' });
    }
    const updated = db.updateFolder(req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Folder not found.' });
    }
    res.json(updated);
  });

  // Folders (Weeks): Delete
  app.delete('/api/folders/:id', (req, res) => {
    const success = db.deleteFolder(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Folder not found.' });
    }
    res.json({ message: 'Folder and its quizzes deleted successfully.' });
  });

  // Quizzes: List
  app.get('/api/quizzes', (req, res) => {
    const targetClass = req.query.class as string | undefined;
    const folderId = req.query.folderId as string | undefined;
    const quizzes = db.getQuizzes(targetClass, folderId);
    res.json(quizzes);
  });

  // Quizzes: Get single
  app.get('/api/quizzes/:id', (req, res) => {
    const quiz = db.getQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    res.json(quiz);
  });

  // Quizzes: Create new
  app.post('/api/quizzes', (req, res) => {
    const {
      folderId,
      title,
      topic,
      description,
      subject,
      targetClasses,
      questions,
      creatorName,
      creatorSchool,
      status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Quiz title is required.' });
    }

    if (!targetClasses || !Array.isArray(targetClasses) || targetClasses.length === 0) {
      return res.status(400).json({ error: 'Please select at least one target class (A1 to A6).' });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Please add at least one question to the quiz.' });
    }

    const newQuiz: Quiz = {
      id: `quiz-we-${Date.now()}`,
      folderId: folderId || 'folder-week-1',
      title: title.trim(),
      topic: topic ? topic.trim() : 'General IT',
      description: description || '',
      subject: subject || 'Information Technology (IT)',
      status: status || 'enabled',
      targetClasses,
      questions,
      creatorName: creatorName || 'System Administrator',
      creatorSchool: creatorSchool || WE_SCHOOLS[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.createQuiz(newQuiz);
    res.status(201).json(saved);
  });

  // Quizzes: Update existing
  app.put('/api/quizzes/:id', (req, res) => {
    const updated = db.updateQuiz(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    res.json(updated);
  });

  // Quizzes: Toggle status specifically
  app.put('/api/quizzes/:id/status', (req, res) => {
    const { status } = req.body;
    if (!status || (status !== 'enabled' && status !== 'disabled')) {
      return res.status(400).json({ error: 'Status must be either enabled or disabled.' });
    }
    const updated = db.updateQuiz(req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    res.json(updated);
  });

  // Quizzes: Delete
  app.delete('/api/quizzes/:id', (req, res) => {
    const success = db.deleteQuiz(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    res.json({ message: 'Quiz deleted successfully.' });
  });

  // Quizzes: Duplicate
  app.post('/api/quizzes/:id/duplicate', (req, res) => {
    const original = db.getQuizById(req.params.id);
    if (!original) {
      return res.status(404).json({ error: 'Original quiz not found.' });
    }

    const copy: Quiz = {
      ...original,
      id: `quiz-we-${Date.now()}`,
      title: `${original.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.createQuiz(copy);
    res.status(201).json(saved);
  });

  // Sessions: Start Live Session
  app.post('/api/sessions/start', (req, res) => {
    const { quizId, school, className, instructorId, instructorName } = req.body;

    if (!quizId || !school || !className) {
      return res.status(400).json({ error: 'Quiz, school, and target class are required to start.' });
    }

    const quiz = db.getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    // Check if the associated folder or quiz itself is disabled
    if (quiz.folderId) {
      const folder = db.getFolderById(quiz.folderId);
      if (folder && folder.status === 'disabled') {
        return res.status(403).json({
          error: 'This Week / Folder has been locked and disabled by the administrator. Sessions cannot be started.',
        });
      }
    }

    if (quiz.status === 'disabled') {
      return res.status(403).json({
        error: 'This specific quiz has been disabled by the administrator.',
      });
    }

    if (quiz.questions.length === 0) {
      return res.status(400).json({ error: 'This quiz has no questions to present.' });
    }

    const shuffledQuestions = shuffleArray(quiz.questions);
    const randomizedQuestionIds = shuffledQuestions.map((q) => q.id);

    const sessionId = `SES-${className}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newSession: QuizSession = {
      id: sessionId,
      quizId: quiz.id,
      quizTitle: quiz.title,
      topic: quiz.topic,
      school,
      className,
      instructorId: instructorId || 'admin',
      instructorName: instructorName || 'Instructor',
      status: 'active',
      startedAt: new Date().toISOString(),
      randomizedQuestionIds,
      totalQuestions: shuffledQuestions.length,
      currentQuestionIndex: 0,
    };

    db.createSession(newSession);

    // Audit log
    db.addLog({
      type: 'quiz_start',
      username: instructorName || 'Instructor',
      school,
      className,
      quizTitle: quiz.title,
      quizId: quiz.id,
      details: `Live quiz session started for class (${className}) at (${school})`,
    });

    const liveQuestions = shuffledQuestions.map(sanitizeQuestionForLive);

    res.status(201).json({
      session: newSession,
      questions: liveQuestions,
      quizInfo: {
        title: quiz.title,
        topic: quiz.topic,
        subject: quiz.subject,
        description: quiz.description,
      },
    });
  });

  // Sessions: List all
  app.get('/api/sessions', (req, res) => {
    res.json(db.getSessions());
  });

  // Sessions: Get single session
  app.get('/api/sessions/:id', (req, res) => {
    const session = db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const quiz = db.getQuizById(session.quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz for this session no longer exists.' });
    }

    const orderedQuestions = session.randomizedQuestionIds
      .map((qId) => quiz.questions.find((q) => q.id === qId))
      .filter((q): q is QuizQuestion => Boolean(q));

    const returnedQuestions = session.status === 'reviewing'
      ? orderedQuestions
      : orderedQuestions.map(sanitizeQuestionForLive);

    res.json({
      session,
      questions: returnedQuestions,
      quizInfo: {
        title: quiz.title,
        topic: quiz.topic,
        subject: quiz.subject,
        description: quiz.description,
      },
    });
  });

  // Sessions: Unlock Review Mode
  app.post('/api/sessions/:id/review', (req, res) => {
    const session = db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const quiz = db.getQuizById(session.quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz for this session no longer exists.' });
    }

    const updated = db.updateSession(req.params.id, {
      status: 'reviewing',
      completedAt: session.completedAt || new Date().toISOString(),
    });

    db.addLog({
      type: 'quiz_review',
      username: session.instructorName,
      school: session.school,
      className: session.className,
      quizTitle: session.quizTitle,
      quizId: session.quizId,
      details: `Classroom review mode unlocked for class (${session.className}) at (${session.school})`,
    });

    const orderedQuestions = session.randomizedQuestionIds
      .map((qId) => quiz.questions.find((q) => q.id === qId))
      .filter((q): q is QuizQuestion => Boolean(q));

    res.json({
      session: updated,
      questions: orderedQuestions,
    });
  });

  // Sessions: Finish Session
  app.post('/api/sessions/:id/finish', (req, res) => {
    const session = db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const updated = db.updateSession(req.params.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    db.addLog({
      type: 'quiz_completed',
      username: session.instructorName,
      school: session.school,
      className: session.className,
      quizTitle: session.quizTitle,
      quizId: session.quizId,
      details: `Session concluded for class (${session.className}) at (${session.school})`,
    });

    res.json(updated);
  });

  // Sessions: Delete a single session
  app.delete('/api/sessions/:id', (req, res) => {
    const success = db.deleteSession(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    res.json({ message: 'Session deleted successfully.' });
  });

  // Sessions: Delete all sessions (Reset test data)
  app.delete('/api/sessions', (req, res) => {
    db.clearAllSessions();
    res.json({ message: 'All sessions cleared successfully.' });
  });

  // School Activity: Delete specific school activity & sessions
  app.delete('/api/activity/school/:schoolName', (req, res) => {
    const schoolName = decodeURIComponent(req.params.schoolName);
    db.deleteSessionsBySchool(schoolName);
    res.json({ message: `Activity and test sessions for school ${schoolName} removed successfully.` });
  });

  // Audit Logs endpoint
  app.get('/api/activity/logs', (req, res) => {
    res.json(db.getLogs());
  });

  // Audit Logs: Clear logs (Reset test logs)
  app.delete('/api/activity/logs', (req, res) => {
    db.clearLogs();
    res.json({ message: 'Audit logs cleared successfully.' });
  });

  // School Activity Summary matrix (STRICTLY real active schools and classes only)
  app.get('/api/activity/school-summary', (req, res) => {
    const sessions = db.getSessions();
    const logs = db.getLogs();

    // Group sessions strictly by normalized school name
    const schoolsMap = new Map<string, QuizSession[]>();

    sessions.forEach((s) => {
      if (!s.school) return;
      const normalizedName = s.school.trim();
      const existing = schoolsMap.get(normalizedName) || [];
      existing.push(s);
      schoolsMap.set(normalizedName, existing);
    });

    const TARGET_CLASSES_LIST: TargetClass[] = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];

    // Construct summaries for schools that ACTUALLY have conducted at least 1 session
    const activeSchools = Array.from(schoolsMap.entries()).map(([schoolName, schoolSessions]) => {
      // Sort sessions descending by start time
      const sortedSessions = [...schoolSessions].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      // Class statistics mapping
      const classBreakdown: Record<string, {
        tested: boolean;
        sessionCount: number;
        lastTested?: string;
        quizzes: string[];
      }> = {};

      TARGET_CLASSES_LIST.forEach((cls) => {
        const matchingSessions = sortedSessions.filter((s) => s.className === cls);
        classBreakdown[cls] = {
          tested: matchingSessions.length > 0,
          sessionCount: matchingSessions.length,
          lastTested: matchingSessions[0]?.startedAt,
          quizzes: Array.from(new Set(matchingSessions.map((s) => s.quizTitle))),
        };
      });

      const testedClasses = TARGET_CLASSES_LIST.filter((cls) => classBreakdown[cls].tested);

      return {
        schoolName,
        totalSessions: schoolSessions.length,
        testedClasses,
        classBreakdown,
        sessions: sortedSessions,
        lastActivity: sortedSessions[0]?.startedAt || '',
      };
    });

    res.json({
      schools: activeSchools,
      logs: logs.slice(0, 100),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WE Applied Technology Schools Server running on http://localhost:${PORT}`);
  });
}

startServer();
