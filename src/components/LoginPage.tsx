import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  School,
  Clock,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { User as UserType, WE_SCHOOLS } from '../types';
import { WeLogo } from './WeLogo';
import { getClientStore } from '../lib/firebaseStoreClient';

interface LoginPageProps {
  onLoginSuccess: (user: UserType, token: string) => void;
  sessionExpiredMessage?: string | null;
}

// School Arabic Labels mapping
const SCHOOL_ARABIC_NAMES: Record<string, string> = {
  'WE Applied Technology School - Toukh': 'مدرسة WE للتكنولوجيا التطبيقية - طوخ',
  'WE Applied Technology School - Asyut': 'مدرسة WE للتكنولوجيا التطبيقية - أسيوط',
  'WE Applied Technology School - Damanhour': 'مدرسة WE للتكنولوجيا التطبيقية - دمنهور',
  'WE Applied Technology School - Tor Sinai': 'مدرسة WE للتكنولوجيا التطبيقية - طور سيناء',
  'WE Applied Technology School - Qena': 'مدرسة WE للتكنولوجيا التطبيقية - قنا',
};

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  sessionExpiredMessage,
}) => {
  // Step: 'credentials' -> 'teacher_name' (for instructors)
  const [step, setStep] = useState<'credentials' | 'teacher_name'>('credentials');
  const [pendingUser, setPendingUser] = useState<{ user: UserType; token: string } | null>(null);

  // Credentials inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('WE Applied Technology School - Toukh');

  // Teacher Name input (for step 2)
  const [teacherName, setTeacherName] = useState(() => {
    try {
      return localStorage.getItem('we_last_teacher_name') || '';
    } catch (e) {
      return '';
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
        setLoading(false);
        return;
      }

      let loginOk = false;
      let userData: UserType | null = null;
      let tokenData: string = '';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
            school: selectedSchool,
          }),
        });

        const rawText = await res.text();
        if (rawText && rawText.trim()) {
          try {
            const data = JSON.parse(rawText);
            if (res.ok && data?.user) {
              loginOk = true;
              userData = data.user;
              tokenData = data.token;
            } else if (!res.ok && data?.error) {
              throw new Error(data.error);
            }
          } catch (jsonErr: any) {
            if (jsonErr.message && !jsonErr.message.includes('JSON') && !jsonErr.message.includes('token')) {
              throw jsonErr;
            }
          }
        }
      } catch (networkOrApiErr: any) {
        if (networkOrApiErr.message && !networkOrApiErr.message.includes('JSON') && !networkOrApiErr.message.includes('token') && !networkOrApiErr.message.includes('Failed to execute')) {
          throw networkOrApiErr;
        }
      }

      // If backend API returned HTML or serverless failed, authenticate directly via Cloud Firestore & LocalStorage
      if (!loginOk) {
        const store = await getClientStore();
        const found = store.users.find(
          (u) => u.username.toLowerCase().trim() === username.toLowerCase().trim()
        );

        if (!found) {
          throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }

        if (found.password && found.password !== password.trim()) {
          throw new Error('كلمة المرور غير صحيحة.');
        }

        // Branch verification
        if (found.school && selectedSchool) {
          const normalize = (s: string) => s.toLowerCase().replace(/[-_•]/g, ' ').replace(/\s+/g, ' ').trim();
          const userSchoolNorm = normalize(found.school);
          const reqSchoolNorm = normalize(selectedSchool);

          const branches = ['toukh', 'qena', 'asyut', 'damanhour', 'tor sinai', 'طوخ', 'قنا', 'أسيوط', 'دمنهور', 'طور سيناء'];
          const userBranch = branches.find((b) => userSchoolNorm.includes(b));
          const reqBranch = branches.find((b) => reqSchoolNorm.includes(b));

          if (userBranch && reqBranch && userBranch !== reqBranch) {
            throw new Error(`بيانات الدخول لا تتطابق مع الفرع المحدد. هذا الحساب مسجل ومخصص لـ (${found.school}). يرجى اختيار المدرسة الصحيحة من القائمة.`);
          }
        }

        const activeSchool = found.school || selectedSchool || WE_SCHOOLS[0];
        const { password: _, ...safeUser } = found;
        userData = {
          ...safeUser,
          school: activeSchool,
        };
        tokenData = `token_${safeUser.id}_${Date.now()}`;
      }

      if (userData) {
        // If user is instructor: ask for their personal name for this session!
        if (userData.role === 'instructor') {
          setPendingUser({ user: userData, token: tokenData });
          setStep('teacher_name');
          setError(null);
        } else {
          // Admin enters directly
          onLoginSuccess(userData, tokenData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm Teacher Name
  const handleTeacherNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      setError('يرجى إدخال اسم المعلم / المحاضر للمتابعة والدخول للمنصة.');
      return;
    }

    if (!pendingUser) return;

    const trimmedName = teacherName.trim();
    try {
      localStorage.setItem('we_last_teacher_name', trimmedName);
    } catch (e) {}

    const sessionUser: UserType = {
      ...pendingUser.user,
      name: trimmedName,
    };

    onLoginSuccess(sessionUser, pendingUser.token);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-slate-50 to-slate-100 text-slate-800 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official WE Logo */}
        <div className="flex justify-center mb-4">
          <WeLogo size="xl" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          مدارس WE للتكنولوجيا التطبيقية
        </h2>
        <p className="mt-1 text-base sm:text-lg text-[#5E2777] font-bold">
          مادة تكنولوجيا المعلومات (IT)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-purple-100 shadow-xl shadow-purple-900/5">
          {/* STEP 1: CREDENTIALS (USERNAME + PASSWORD) */}
          {step === 'credentials' && (
            <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
              {/* Auto-logout / Session expired notification */}
              {sessionExpiredMessage && !error && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 font-bold shadow-xs">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span className="leading-relaxed">{sessionExpiredMessage}</span>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* School Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-[#5E2777]" />
                  <span>المدرسة / الفرع:</span>
                </label>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-semibold"
                >
                  <option value="WE Applied Technology School - Toukh">
                    مدرسة WE للتكنولوجيا التطبيقية - طوخ
                  </option>
                  <option value="WE Applied Technology School - Asyut">
                    مدرسة WE للتكنولوجيا التطبيقية - أسيوط
                  </option>
                  <option value="WE Applied Technology School - Damanhour">
                    مدرسة WE للتكنولوجيا التطبيقية - دمنهور
                  </option>
                  <option value="WE Applied Technology School - Tor Sinai">
                    مدرسة WE للتكنولوجيا التطبيقية - طور سيناء
                  </option>
                  <option value="WE Applied Technology School - Qena">
                    مدرسة WE للتكنولوجيا التطبيقية - قنا
                  </option>
                </select>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#5E2777]" />
                  <span>اسم المستخدم (Username):</span>
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#5E2777]" />
                  <span>كلمة المرور (Password):</span>
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#5E2777] hover:bg-[#4d1f63] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-[#5E2777]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري التحقق من الحساب...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>تسجيل الدخول إلى المنصة</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: TEACHER NAME ENTRY (FOR INSTRUCTORS) */}
          {step === 'teacher_name' && pendingUser && (
            <form className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200" onSubmit={handleTeacherNameSubmit}>
              {/* Welcome Badge */}
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-purple-200 text-[#5E2777] flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  أهلاً بك يا أستاذنا في المنصة
                </h3>
                <p className="text-xs text-[#5E2777] font-bold mt-0.5">
                  {SCHOOL_ARABIC_NAMES[pendingUser.user.school] || pendingUser.user.school}
                </p>
                <div className="mt-2 text-[11px] text-slate-500 font-medium">
                  حساب الفرع المعتمد: <span className="font-mono font-bold text-slate-700">{pendingUser.user.username}</span>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 leading-relaxed text-right">
                <span className="font-bold text-slate-800">ملاحظة:</span> نظراً لأن هذا الحساب مشترك لمعلمي المادة بالفرع، يرجى كتابة اسمك الكريم ليظهر في أعلى الموقع وتُسجل به جلسات البروجيكتور وسجلات الفصول.
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Teacher Name Input */}
              <div className="text-right">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#5E2777]" />
                  <span>اسم المعلم / المحاضر الكامل: <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={teacherName}
                  onChange={(e) => {
                    setTeacherName(e.target.value);
                    setError(null);
                  }}
                  placeholder="مثال: م/ أبانوب وجيه أو أ/ أحمد مصطفى"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-bold text-right"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#5E2777] hover:bg-[#4d1f63] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-[#5E2777]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>تأكيد الاسم ومتابعة الدخول للمنصة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError(null);
                  }}
                  className="w-full py-2 px-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  الرجوع لتغيير الحساب أو الفرع
                </button>
              </div>
            </form>
          )}

          {/* Copyright badge on login */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <div className="font-bold text-slate-700">
              إعداد: م/ أبانوب وجيه (Eng. Abanob Wagih)
            </div>
            <div className="text-[11px] text-[#5E2777] font-semibold mt-0.5">
              مدرسة WE للتكنولوجيا التطبيقية - طوخ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
