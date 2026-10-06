import React, { useState, useEffect } from 'react';
import {
  Bell,
  Moon,
  Sun,
  LogIn,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { User } from '../../types';
import { LoginModal } from '../auth/LoginModal';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  toggleSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  activeModule: string;
  setActiveModule: (mod: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  toggleSidebar,
  onOpenMobileSidebar,
  activeModule,
  setActiveModule,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(BOPSStore.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(BOPSStore.getUsers());
  const [notifications, setNotifications] = useState(BOPSStore.getNotifications());
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      setCurrentUser(BOPSStore.getCurrentUser());
      setAllUsers(BOPSStore.getUsers());
      setNotifications(BOPSStore.getNotifications());
    });
    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.read && (n.receiverId === currentUser.id || n.receiverId === currentUser.role || n.receiverId === 'all')
  ).length;

  const currentDisplayTime = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const currentDateFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      {/* Left: Mobile menu button & Current Section Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          title="Mở menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Hệ thống Quản trị Nội trú
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {currentDateFormatted} • {currentDisplayTime}
          </span>
        </div>
      </div>

      {/* Right: Login Button, User Chip, Notifications, Dark Mode */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Info / Login / Logout Button */}
        {BOPSStore.isLoggedIn() ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="h-6 w-6 rounded-full object-cover ring-2 ring-blue-500/30"
              />
              <div className="text-left">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-[11px] leading-tight">
                  {currentUser.fullName}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">
                  {currentUser.role === 'manager' ? 'Quản lý' : currentUser.teacherCode}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900 transition"
              title="Đổi mật khẩu tài khoản"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden md:inline">Đổi MK</span>
            </button>
            <button
              onClick={() => {
                BOPSStore.logout();
                setIsLoginModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            title="Đăng nhập tài khoản"
          >
            <LogIn className="h-4 w-4" />
            <span>Đăng nhập</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Thông báo"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Thông báo hệ thống</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  {unreadCount} chưa đọc
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto py-2">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Không có thông báo mới</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => BOPSStore.markNotificationRead(n.id)}
                      className={`mb-2 cursor-pointer rounded-xl p-2.5 text-xs transition ${
                        !n.read
                          ? 'bg-blue-50/80 dark:bg-blue-950/40'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                        <span>{n.title}</span>
                        <span className="text-[10px] font-normal text-slate-400">{n.createdAt.split(' ')[1]}</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 line-clamp-2">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title={darkMode ? 'Chuyển Chế độ Sáng' : 'Chuyển Chế độ Tối'}
        >
          {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={allUsers}
        currentUser={currentUser}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        targetUser={currentUser}
      />
    </header>
  );
};
