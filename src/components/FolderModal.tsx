import React, { useState } from 'react';
import { WeekFolder } from '../types';
import { FolderPlus, FolderEdit, X, Check, Lock, Unlock } from 'lucide-react';

interface FolderModalProps {
  folder?: WeekFolder | null;
  onClose: () => void;
  onSave: (data: { title: string; weekNumber?: number; description?: string; status: 'enabled' | 'disabled' }) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  folder,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(folder ? folder.title : '');
  const [weekNumber, setWeekNumber] = useState<number | undefined>(folder?.weekNumber || 1);
  const [description, setDescription] = useState(folder ? folder.description || '' : '');
  const [status, setStatus] = useState<'enabled' | 'disabled'>(folder ? folder.status : 'enabled');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى إدخال عنوان للمجلد الأسبوعي.');
      return;
    }
    onSave({
      title: title.trim(),
      weekNumber: Number(weekNumber) || undefined,
      description: description.trim(),
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5E2777] flex items-center justify-center border border-purple-200">
              {folder ? <FolderEdit className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {folder ? 'تعديل المجلد الأسبوعي' : 'إنشاء مجلد أسبوعي جديد'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تنظيم اختبارات مادة IT بحسب أسابيع الخطة الدراسية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم المجلد / الأسبوع <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="مثال: Week 1: Introduction to Computer Networks"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#5E2777] outline-none transition-all text-slate-800 font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الأسبوع (Week Number)
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={weekNumber || ''}
                onChange={(e) => setWeekNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#5E2777] outline-none transition-all text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة الإتاحة للمعلمين
              </label>
              <div className="flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatus('enabled')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    status === 'enabled'
                      ? 'bg-white text-[#5E2777] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5 text-[#5E2777]" />
                  <span>متاح ومفعل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('disabled')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    status === 'disabled'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>مغلق</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الوصف / أهداف التعلم (اختياري)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر لموضوعات هذا الأسبوع وما تتناوله أسئلة الكويز..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#5E2777] outline-none transition-all text-slate-800 resize-none"
            />
          </div>

          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 text-xs text-purple-900/80 leading-relaxed">
            <span className="font-bold text-slate-900">ملاحظة:</span> عند ضبط المجلد على{' '}
            <span className="font-semibold text-rose-600">مغلق</span>، سيظهر للمعلمين كمجلد معطل ولا يمكنهم تشغيل الكويزات بداخله على شاشات الفصول حتى تقوم بإعادة تفعيله.
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#5E2777] hover:bg-[#4d1f63] rounded-xl shadow-md shadow-[#5E2777]/20 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{folder ? 'حفظ التعديلات' : 'إنشاء المجلد الأسبوعي'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
