import React, { useState } from 'react';
import {
  Layers,
  History,
  Activity,
  LogOut,
  PlusCircle,
  KeyRound,
  ChevronDown,
  Users,
  Shield,
  GraduationCap,
  Menu,
  X,
  RotateCw,
  User,
  Lock,
} from 'lucide-react';
import { User as UserType } from '../types';
import { WeLogo } from './WeLogo';

interface HeaderProps {
  currentUser: UserType;
  activeTab: 'quizzes' | 'sessions' | 'activity';
  setActiveTab: (tab: 'quizzes' | 'sessions' | 'activity') => void;
  onCreateQuiz: () => void;
  onOpenAccountSettings: () => void;
  onOpenInstructorAccounts?: () => void;
  onChangeTeacherName?: () => void;
  onLogout: () => void;
}

function getSchoolBranchName(school?: string): string {
  if (!school) return '';
  const map: Record<string, string> = {
    'Toukh': 'طوخ',
    'Qena': 'قنا',
    'Asyut': 'أسيوط',
    'Damanhour': 'دمنهور',
    'Tor Sinai': 'طور سيناء',
    'WE Applied Technology School - Toukh': 'طوخ',
    'WE Applied Technology School - Qena': 'قنا',
    'WE Applied Technology School - Asyut': 'أسيوط',
    'WE Applied Technology School - Damanhour': 'دمنهور',
    'WE Applied Technology School - Tor Sinai': 'طور سيناء',
    'مدرسة WE للتكنولوجيا التطبيقية - طوخ': 'طوخ',
    'مدرسة WE للتكنولوجيا التطبيقية - قنا': 'قنا',
    'مدرسة WE للتكنولوجيا التطبيقية - أسيوط': 'أسيوط',
    'مدرسة WE للتكنولوجيا التطبيقية - دمنهور': 'دمنهور',
    'مدرسة WE للتكنولوجيا التطبيقية - طور سيناء': 'طور سيناء',
  };
  if (map[school]) return map[school];
  const parts = school.split('-');
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim();
    return map[last] || last;
  }
  return school;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onCreateQuiz,
  onOpenAccountSettings,
  onOpenInstructorAccounts,
  onChangeTeacherName,
  onLogout,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  const handleBrandClick = () => {
    // Reload page as explicitly requested
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-purple-100 text-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between min-h-[4.75rem] py-2.5 gap-2 sm:gap-4">
          {/* Logo & Brand Identity (Clickable to Reload) */}
          <button
            type="button"
            onClick={handleBrandClick}
            className="flex items-center gap-2.5 sm:gap-3 text-right group cursor-pointer focus:outline-none transition-transform active:scale-95 shrink-0"
            title="انقر لتحديث الصفحة والرجوع للرئيسية"
          >
            <div className="relative">
              <WeLogo size="md" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-purple-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                <RotateCw className="w-2.5 h-2.5 text-[#5E2777]" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-tight text-[#5E2777] group-hover:underline">
                مدرسة WE للتكنولوجيا التطبيقية {getSchoolBranchName(currentUser.school) ? `- ${getSchoolBranchName(currentUser.school)}` : ''}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                مادة تكنولوجيا المعلومات (IT)
              </span>
            </div>
          </button>

          {/* Navigation Tabs - Desktop View (Hidden on mobile/tablet) */}
          <nav className="hidden lg:flex items-center gap-1 bg-purple-50/70 p-1 rounded-2xl border border-purple-100">
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'quizzes'
                  ? 'bg-white text-[#5E2777] shadow-xs'
                  : 'text-slate-600 hover:text-[#5E2777]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>الكويزات والمجلدات</span>
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'sessions'
                  ? 'bg-white text-[#5E2777] shadow-xs'
                  : 'text-slate-600 hover:text-[#5E2777]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>جلسات البروجيكتور</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'activity'
                    ? 'bg-white text-[#5E2777] shadow-xs'
                    : 'text-slate-600 hover:text-[#5E2777]'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>نشاط المدارس والفصول</span>
              </button>
            )}
          </nav>

          {/* Left Actions Area */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Admin Desktop Buttons */}
            {isAdmin && (
              <div className="hidden sm:flex items-center gap-2">
                {onOpenInstructorAccounts && (
                  <button
                    onClick={onOpenInstructorAccounts}
                    title="إدارة حسابات المعلمين"
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#5E2777] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-purple-200/80 whitespace-nowrap"
                  >
                    <Users className="w-4 h-4 text-[#5E2777]" />
                    <span>المعلمون</span>
                  </button>
                )}

                <button
                  onClick={onCreateQuiz}
                  className="px-3.5 sm:px-4 py-2 bg-[#5E2777] hover:bg-[#4d1f63] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إنشاء اختبار</span>
                </button>
              </div>
            )}

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50/50 transition-all cursor-pointer"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isAdmin
                      ? 'bg-[#5E2777] text-white'
                      : 'bg-purple-100 text-[#5E2777]'
                  }`}
                >
                  {isAdmin ? <Shield className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                </div>

                <div className="hidden xl:block text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      {currentUser.name || currentUser.username}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                        isAdmin ? 'bg-purple-100 text-[#5E2777]' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isAdmin ? 'مدير' : 'معلم'}
                    </span>
                  </div>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-purple-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50 text-right">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <div className="text-xs font-bold text-slate-900">
                      {currentUser.name || currentUser.username}
                    </div>
                    <div className="text-[11px] text-[#5E2777] font-semibold truncate mt-0.5">
                      {currentUser.school}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="sm:hidden pb-1 mb-1 border-b border-slate-100">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onCreateQuiz();
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-purple-50 text-[#5E2777] cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>إنشاء اختبار جديد</span>
                      </button>

                      {onOpenInstructorAccounts && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onOpenInstructorAccounts();
                          }}
                          className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-purple-50 text-[#5E2777] cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>إدارة حسابات المعلمين</span>
                        </button>
                      )}
                    </div>
                  )}

                  {!isAdmin && onChangeTeacherName && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onChangeTeacherName();
                      }}
                      className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-50 text-[#5E2777] transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#5E2777]" />
                      <span>تعديل اسم المعلم للجلسة الحالية</span>
                    </button>
                  )}

                  {isAdmin ? (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenAccountSettings();
                      }}
                      className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-purple-50 text-slate-700 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#5E2777]" />
                      <span>إعدادات الحساب وكلمة المرور</span>
                    </button>
                  ) : (
                    <div className="px-3 py-2.5 my-1 text-[11px] text-slate-500 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed text-right">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-0.5">
                        <Lock className="w-3 h-3 text-[#5E2777]" />
                        <span>حساب مشترك لفرع المدرسة</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        تغيير كلمة المرور أو اليوزر متاح للادمن فقط للحفاظ على استقرار الحساب المشترك.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile / Tablet Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-purple-100 bg-purple-50/60 hover:bg-purple-100 text-[#5E2777] transition-all cursor-pointer"
              title="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Drawer / Sub-bar */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-purple-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => {
                  setActiveTab('quizzes');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                  activeTab === 'quizzes'
                    ? 'bg-[#5E2777] text-white shadow-xs'
                    : 'bg-purple-50/50 text-slate-700 hover:bg-purple-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>الكويزات والمجلدات الأسبوعية</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('sessions');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                  activeTab === 'sessions'
                    ? 'bg-[#5E2777] text-white shadow-xs'
                    : 'bg-purple-50/50 text-slate-700 hover:bg-purple-50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>جلسات البروجيكتور ومراجعة الإجابات</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('activity');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                    activeTab === 'activity'
                      ? 'bg-[#5E2777] text-white shadow-xs'
                      : 'bg-purple-50/50 text-slate-700 hover:bg-purple-50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>نشاط المدارس والفصول المعتمدة</span>
                </button>
              )}
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onCreateQuiz();
                  }}
                  className="py-2.5 px-3 bg-[#5E2777] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إنشاء اختبار</span>
                </button>

                {onOpenInstructorAccounts && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenInstructorAccounts();
                    }}
                    className="py-2.5 px-3 bg-purple-50 text-[#5E2777] border border-purple-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    <span>إدارة المعلمين</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
