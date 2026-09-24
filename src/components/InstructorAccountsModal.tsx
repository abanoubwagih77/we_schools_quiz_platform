import React, { useState, useEffect } from 'react';
import { User, WE_SCHOOLS } from '../types';
import { Users, UserPlus, Trash2, X, Shield, GraduationCap, CheckCircle2, AlertTriangle, School, Lock, Info, KeyRound, Save } from 'lucide-react';
import { getClientStore, saveClientStore, apiAdminUpdateUser } from '../lib/firebaseStoreClient';

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

  // New user form state: only username, password, and school
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState<string>('WE Applied Technology School - Toukh');
  const [submitting, setSubmitting] = useState(false);

  // Edit existing user modal/state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
            name: 'معلم مادة IT', // Generic default; teacher will enter their personal name at login
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

      // If backend API returned HTML or serverless unavailable, write directly to Cloud Firestore & LocalStorage
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
          name: 'معلم مادة IT',
          role: 'instructor',
          school,
          department: 'Information Technology (IT)',
          createdAt: new Date().toISOString(),
        };

        store.users.push(newUser);
        await saveClientStore(store);
      }

      setSuccessMsg(`تم إنشاء حساب الدخول "${username}" لفرع (${school}) بنجاح!`);
      setUsername('');
      setPassword('');
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

    if (!confirm(`هل أنت متأكد من رغبتك في حذف حساب "${targetUsername}"؟`)) {
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
      setSuccessMsg(`تم حذف الحساب "${targetUsername}" بنجاح.`);
    } catch (err: any) {
      setError(err.message || 'فشل حذف الحساب.');
    }
  };

  const handleStartEditUser = (user: User) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword('');
    setEditSchool(user.school || 'WE Applied Technology School - Toukh');
    setError(null);
    setSuccessMsg(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUsername.trim()) {
      setError('اسم المستخدم لا يمكن أن يكون فارغاً.');
      return;
    }

    setSavingEdit(true);
    setError(null);
    try {
      const updated = await apiAdminUpdateUser(editingUser.id, {
        username: editUsername.trim(),
        password: editPassword.trim() || undefined,
        school: editSchool,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, username: updated.username, school: updated.school } : u))
      );
      setSuccessMsg(`تم تحديث بيانات وكلمة مرور حساب (${updated.username}) بنجاح.`);
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحديث بيانات الحساب.');
    } finally {
      setSavingEdit(false);
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
              <h3 className="text-base font-black text-slate-900">إدارة حسابات معلمي الفروع</h3>
              <p className="text-xs text-slate-500 font-medium">
                إنشاء يوزر وباسورد موحد لكل فرع، ويسأل النظام المعلم عن اسمه عند تسجيل الدخول
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5E2777]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Info Notice about the new flow */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-start gap-2.5 text-purple-950 text-xs">
            <Info className="w-4 h-4 text-[#5E2777] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>آلية حسابات المعلمين:</strong> تقوم بإنشاء <strong>اسم مستخدم وكلمة مرور وفرع المدرسة</strong> فقط دون تحديد اسم معلم. وعندما يقوم أي معلم بالدخول باليوزر والباسورد، سيطلب منه النظام تلقائياً كتابة اسمه الشخصي لتسجيله في شاشة البروجيكتور وسجلات الاختبار المباشر.
            </div>
          </div>

          {/* Create Instructor Form */}
          <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#5E2777]" />
              <span>إنشاء حساب دخول جديد لفرع مدرسة</span>
            </h4>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    اسم المستخدم (Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: we_toukh_it أو it_teacher"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none text-slate-800 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    كلمة المرور (Password) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="مثال: Pass@2026"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none text-slate-800 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-[#5E2777]" />
                  <span>المدرسة / الفرع المخصص له الحساب:</span>
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

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500">
                  يمكن لجميع معلمي المادة في هذا الفرع استخدام هذا الحساب وتسجيل أسمائهم عند الدخول.
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
              الحسابات المسجلة ({users.length})
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
                            <span className="text-xs font-bold text-slate-900 font-mono">{user.username}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                isAdmin
                                  ? 'bg-purple-100 text-[#5E2777]'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isAdmin ? 'مدير النظام' : 'حساب معلمي الفرع'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {user.school} {isAdmin ? '• مدير المنصة' : '• يسأل المعلم عن اسمه عند الدخول'}
                          </div>
                        </div>
                      </div>

                      {!isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditUser(user)}
                            title="تعديل اليوزر أو كلمة المرور للحساب"
                            className="p-1.5 text-slate-400 hover:text-[#5E2777] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            title="حذف حساب المعلم"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Edit Account Modal / Overlay */}
        {editingUser && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl border border-purple-200 text-right animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-purple-100 mb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#5E2777]" />
                  <h4 className="text-sm font-black text-slate-900">
                    تعديل بيانات وكلمة مرور الحساب
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المستخدم (Username):
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كلمة المرور الجديدة (اتركها فارغة إذا لم ترد تغييرها):
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="كلمة مرور جديدة (اختياري)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المدرسة / الفرع:
                  </label>
                  <select
                    value={editSchool}
                    onChange={(e) => setEditSchool(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-[#5E2777] outline-none font-semibold cursor-pointer"
                  >
                    {WE_SCHOOLS.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 bg-[#5E2777] hover:bg-[#4d1f63] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-purple-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
