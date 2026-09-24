import React, { useState } from 'react';
import { X, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';

interface ChangeTeacherNameModalProps {
  currentUser: UserType;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export const ChangeTeacherNameModal: React.FC<ChangeTeacherNameModalProps> = ({
  currentUser,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم المعلم للمتابعة.');
      return;
    }
    onSave(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-purple-100 p-6 text-right">
        <div className="flex items-center justify-between pb-4 border-b border-purple-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5E2777] flex items-center justify-center border border-purple-200">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">تعديل اسم المعلم للجلسة</h3>
              <p className="text-[11px] text-slate-500">
                فرع {currentUser.school}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المعلم / المحاضر: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="مثال: م/ أبانوب وجيه أو أ/ أحمد مصطفى"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E2777]/30 transition-all font-bold text-right"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              سيظهر هذا الاسم في أعلى المنصة، وعلى شاشة البروجيكتور، وفي سجلات الاختبارات.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#5E2777] hover:bg-[#4d1f63] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>حفظ الاسم</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
