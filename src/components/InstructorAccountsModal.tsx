import React, { useState, useEffect } from 'react';
import { User, WE_SCHOOLS } from '../types';
import { Users, UserPlus, Trash2, X, Shield, GraduationCap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getClientStore, saveClientStore } from '../lib/firebaseStoreClient';

interface InstructorAccountsModalProps {
  onClose: () => void;
  currentUser: User;
}

export const InstructorAccountsModal: React.FC<InstructorAccountsModalProps> = ({
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New user form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState<string>('WE Applied Technology School - Toukh');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let loaded = false;
      try {
        const res = await fetch('/api/users');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setUsers(data);
            loaded = true;
          }
        }
      } catch (e) {}

      if (!loaded) {
        const store = await getClientStore();
        setUsers(store.users.map(({ password: _, ...rest }) => rest as User));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim() || !password.trim()) {
      setError('اسم المستخدم وكلمة المرور مطلوبان.');
      return;
    }

    try {
      setSubmitting(true);
      let created = false;

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
            name: name.trim() || username.trim(),
            school,
            department: 'Information Technology (IT)',
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'فشل إنشاء حساب المعلم.');
          }
          created = true;
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('JSON')) {
          throw apiErr;
        }
      }

      // If backend API returned HTML or failed, write directly to Firestore
      if (!created) {
        const store = await getClientStore();
        const existing = store.users.find(
          (u) => u.username.toLowerCase().trim() === username.toLowerCase().trim()
        );
        if (existing) {
          throw new Error('اسم المستخدم مستخدم بالفعل.');
        }

        const newUser: User = {
          id: `user-inst-${Date.now()}`,
          username: username.trim(),
          password: password.trim(),
          name: name.trim() || username.trim(),
          role: 'instructor',
          school,
          department: 'Information Technology (IT)',
          createdAt: new Date().toISOString(),
        };

        store.users.push(newUser);
        await saveClientStore(store);
      }

      setSuccessMsg(`تم إنشاء حساب المعلم "${username}" بنجاح!`);
      setUsername('');
      setPassword('');
      setName('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الحساب.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, targetUsername: string) => {
    if (userId === currentUser.id || targetUsername === 'admin') {
      alert('لا يمكن حذف حساب المسؤول الرئيسي.');
      return;
    }

    try {
      let deleted = false;
      try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok) deleted = true;
        }
      } catch (e) {}

      if (!deleted) {
        const store = await getClientStore();
        store.users = store.users.filter((u) => u.id !== userId);
        await saveClientStore(store);
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMsg(`تم حذف الحساب "${targetUsername}".`);
    } catch (err: any) {
      setError(err.message || 'فشل حذف الحساب');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden max-h-[90vh] flex flex-col text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5E2777] flex items-center justify-center border border-purple-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">إدارة حسابات المعلمين</h3>
              <p className="text-xs text-slate-500 font-medium">
                إنشاء حسابات فرعية لمعلمي مادة IT لتشغيل الكويزات على البروجيكتور
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5E2777]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Create Instructor Form */}
          <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#5E2777]" />
              <span>إضافة حساب معلم جديد</span>
            </h4>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    اسم المستخدم <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: toukh_it"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none text-slate-800 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    كلمة المرور <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="مثال: pass123"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none text-slate-800 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    اسم المعلم الكامل
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: م/ أحمد مصطفى"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    المدرسة / الفرع
                  </label>
                  <select
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none text-slate-800 cursor-pointer font-semibold"
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
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500">
                  يمتلك المعلم صلاحية عرض وتشغيل كويزات الأسابيع المفعلة داخل الفصول الدراسية.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#5E2777] hover:bg-[#4d1f63] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'جاري الإنشاء...' : 'إنشاء الحساب'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Accounts List */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              الحسابات المسجلة بالمنصة ({users.length})
            </h4>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">جاري تحميل الحسابات...</div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const isAdmin = user.role === 'admin';
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isAdmin
                              ? 'bg-[#5E2777] text-white'
                              : 'bg-purple-100 text-[#5E2777]'
                          }`}
                        >
                          {isAdmin ? <Shield className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{user.username}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                isAdmin
                                  ? 'bg-purple-100 text-[#5E2777]'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isAdmin ? 'مدير النظام' : 'معلم'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {user.name} • {user.school}
                          </div>
                        </div>
                      </div>

                      {!isAdmin && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          title="حذف حساب المعلم"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
