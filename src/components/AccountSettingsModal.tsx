import React, { useState } from 'react';
import {
  X,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  School,
} from 'lucide-react';
import { User as UserType, WE_SCHOOLS } from '../types';

interface AccountSettingsModalProps {
  currentUser: UserType;
  onClose: () => void;
  onUserUpdated: (updatedUser: UserType) => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  currentUser,
  onClose,
  onUserUpdated,
}) => {
  const [newUsername, setNewUsername] = useState(currentUser.username || 'admin');
  const [selectedSchool, setSelectedSchool] = useState<string>(currentUser.school || 'WE Applied Technology School - Toukh');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newUsername.trim()) {
      setError('لا يمكن أن يكون اسم المستخدم فارغاً.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword: currentPassword.trim(),
          newUsername: newUsername.trim(),
          newPassword: newPassword.trim() || undefined,
          newSchool: selectedSchool,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث بيانات الحساب.');
      }

      setSuccess('تم تحديث وحفظ بيانات الحساب بنجاح.');
      if (data.user) {
        onUserUpdated(data.user);
      }
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث الحساب.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-xl transition-all border bg-white border-purple-100 text-slate-800 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-[#5E2777]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                إعدادات الحساب وكلمة المرور
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تعديل اسم المستخدم، فرع المدرسة، وتغيير كلمة المرور
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#5E2777]" />
              <span>اسم المستخدم:</span>
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-mono text-left"
              dir="ltr"
              required
            />
          </div>

          {/* School Selector (if admin or allowed) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-[#5E2777]" />
              <span>فرع مدرسة WE التابع له:</span>
            </label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              disabled={currentUser.role === 'instructor'}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
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
            {currentUser.role === 'instructor' && (
              <span className="text-[10px] text-slate-400 mt-1 block">
                تحديد الفرع يتم من خلال المشرف / مدير النظام.
              </span>
            )}
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>كلمة المرور الحالية (للتأكيد):</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="أدخل كلمة المرور الحالية"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-mono text-left"
              dir="ltr"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-bold block mb-2">
              تغيير كلمة المرور (اختياري — اتركها فارغة إذا أردت تعديل اسم المستخدم فقط):
            </span>

            {/* New Password */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور الجديدة:
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تأكيد كلمة المرور الجديدة:
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#5E2777] hover:bg-[#4d1f63] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-[#5E2777]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التغييرات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
