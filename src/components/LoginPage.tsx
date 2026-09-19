import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  School,
} from 'lucide-react';
import { User as UserType, WE_SCHOOLS } from '../types';
import { WeLogo } from './WeLogo';

interface LoginPageProps {
  onLoginSuccess: (user: UserType, token: string) => void;
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
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Default to Toukh as initial selection
  const [selectedSchool, setSelectedSchool] = useState<string>('WE Applied Technology School - Toukh');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          school: selectedSchool,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول. تأكد من البيانات.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
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
          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
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
                <span>اسم المستخدم:</span>
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
                <span>كلمة المرور:</span>
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
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول إلى المنصة</span>
                </>
              )}
            </button>
          </form>

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
