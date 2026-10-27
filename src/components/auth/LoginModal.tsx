import React, { useState } from 'react';
import {
  LogIn,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { User } from '../../types';
import { BOPSStore } from '../../services/storage';
import { ChangePasswordModal } from './ChangePasswordModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User | null;
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
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = usernameInput.trim();
    const pass = passwordInput.trim();

    if (!email) {
      setErrorMessage('Vui lòng nhập Email FPT (@fpt.edu.vn)!');
      return;
    }

    if (!pass) {
      setErrorMessage('Vui lòng nhập mật khẩu!');
      return;
    }

    setIsLoading(true);

    try {
      const res = await BOPSStore.loginWithSupabaseAuth(email, pass);

      if (!res.success || !res.user) {
        setErrorMessage(res.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin!');
        setIsLoading(false);
        return;
      }

      setLoggedInUser(res.user);
      setIsLoading(false);

      setTimeout(() => {
        setLoggedInUser(null);
        setUsernameInput('');
        setPasswordInput('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối khi xác thực. Vui lòng thử lại!');
    } finally {
      // Đảm bảo nút đăng nhập không bao giờ bị treo
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsLoading(false);
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
            {/* Pilot Banner */}
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-blue-900 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-200">
              <div className="font-extrabold flex items-center gap-1.5 text-[11px]">
                <KeyRound className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Chế độ xác thực: Supabase Auth (Giai đoạn C1)</span>
              </div>
              <p className="mt-0.5 text-[10px] text-blue-700 dark:text-blue-300">
                Tài khoản thí điểm đã kích hoạt: <strong className="font-mono">anhntl78@fpt.edu.vn</strong> (GV023)
              </p>
            </div>

            {/* Email input */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Đăng Nhập FPT (@fpt.edu.vn)
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="ví dụ: anhntl78@fpt.edu.vn"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm disabled:opacity-60"
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
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm disabled:opacity-60"
                />
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Đăng Nhập</span>
                  </>
                )}
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
