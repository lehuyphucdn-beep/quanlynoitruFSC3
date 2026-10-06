import React, { useState } from 'react';
import {
  LogIn,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
} from 'lucide-react';
import { User } from '../../types';
import { BOPSStore } from '../../services/storage';
import { ChangePasswordModal } from './ChangePasswordModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc mã GVQN!');
      return;
    }

    if (!trimmedPass) {
      setErrorMessage('Vui lòng nhập mật khẩu!');
      return;
    }

    // Find matching user by username, teacherCode, email, id, or fullName
    const foundUser = users.find((u) => {
      const uName = (u.username || '').toLowerCase();
      const code = (u.teacherCode || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const full = (u.fullName || '').toLowerCase();
      const uid = (u.id || '').toLowerCase();

      return (
        uName === trimmedUser ||
        code === trimmedUser ||
        email === trimmedUser ||
        uid === trimmedUser ||
        full === trimmedUser
      );
    });

    if (!foundUser) {
      setErrorMessage('Tên đăng nhập không tồn tại trong hệ thống!');
      return;
    }

    // Verify password (matches u.password, or default '123456', or fullName)
    const expectedPass = foundUser.password || foundUser.fullName;
    const isPassValid =
      trimmedPass === expectedPass ||
      trimmedPass.toLowerCase() === expectedPass.toLowerCase() ||
      trimmedPass === '123456' ||
      trimmedPass.toLowerCase() === foundUser.fullName.toLowerCase();

    if (!isPassValid) {
      setErrorMessage('Mật khẩu không chính xác. Vui lòng kiểm tra lại!');
      return;
    }

    // Success login
    BOPSStore.setCurrentUser(foundUser.id);
    setLoggedInUser(foundUser);

    setTimeout(() => {
      setLoggedInUser(null);
      setUsernameInput('');
      setPasswordInput('');
      onClose();
    }, 1200);
  };

  const handleModalClose = () => {
    setErrorMessage(null);
    setLoggedInUser(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Close button */}
        <button
          onClick={handleModalClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <LogIn className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Đăng Nhập Hệ Thống
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản trị Nội trú • GVQN & Quản Lý
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success User Card info when logged in */}
        {loggedInUser ? (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 text-center space-y-3 animate-in zoom-in-95">
            <div className="flex justify-center">
              <img
                src={loggedInUser.avatar}
                alt={loggedInUser.fullName}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-emerald-500/30 shadow-md"
              />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Đăng nhập thành công!</span>
              </div>
              <div className="mt-1 font-bold text-slate-900 dark:text-white text-base">
                {loggedInUser.fullName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {loggedInUser.role === 'manager'
                  ? 'Quản Lý Nội Trú'
                  : `${loggedInUser.teacherCode} • ${loggedInUser.position}`}
              </div>
            </div>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4 text-xs">
            {/* Username / Code input */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tài khoản / Tên đăng nhập
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Nhập tên đăng nhập hoặc mã GV..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
                  autoFocus
                />
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setIsChangePassOpen(true)}
                  className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Đổi mật khẩu?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Nhập mật khẩu..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
                />
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md hover:bg-blue-700 transition"
              >
                <LogIn className="h-4 w-4" />
                <span>Đăng Nhập</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
      />
    </div>
  );
};
