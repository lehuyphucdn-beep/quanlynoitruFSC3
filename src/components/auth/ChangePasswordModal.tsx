import React, { useState, useEffect } from 'react';
import { KeyRound, Check, AlertCircle, X, ShieldCheck, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { BOPSStore } from '../../services/storage';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const allUsers = BOPSStore.getUsers();
  const currentUser = BOPSStore.getCurrentUser();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (targetUser) {
      setSelectedUserId(targetUser.id);
    } else if (currentUser) {
      setSelectedUserId(currentUser.id);
    } else if (allUsers.length > 0) {
      setSelectedUserId(allUsers[0].id);
    }
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [isOpen, targetUser]);

  if (!isOpen) return null;

  const activeUser = allUsers.find((u) => u.id === selectedUserId) || targetUser || currentUser;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!activeUser) {
      setErrorMessage('Không tìm thấy tài khoản cần đổi mật khẩu!');
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu mới!');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 4 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!');
      return;
    }

    // Update user password
    const updatedUser: User = {
      ...activeUser,
      password: newPassword.trim(),
    };

    BOPSStore.updateUser(updatedUser);

    setSuccessMessage(`Đã cập nhật mật khẩu mới cho tài khoản "${activeUser.fullName}" thành công!`);
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Đổi Mật Khẩu Tài Khoản
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cập nhật mật khẩu đăng nhập vào hệ thống
            </p>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Account selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Chọn tài khoản cần đổi mật khẩu
            </label>
            {targetUser ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3 dark:bg-slate-800 dark:border-slate-700">
                <img
                  src={activeUser?.avatar}
                  alt={activeUser?.fullName}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-amber-500/30"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {activeUser?.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Mã GV: {activeUser?.teacherCode} • {activeUser?.email}
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
              >
                <optgroup label="Tài khoản Quản lý">
                  {allUsers
                    .filter((u) => u.role === 'manager')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} (Quản lý - {u.username || 'QL001'})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Giáo viên Quản nhiệm">
                  {allUsers
                    .filter((u) => u.role === 'teacher')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.teacherCode})
                      </option>
                    ))}
                </optgroup>
              </select>
            )}
          </div>

          {/* New password input */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
              />
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Confirm password input */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                type="text"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
              />
              <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Quick preset passwords */}
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block font-semibold mb-1">
              Gợi ý mật khẩu nhanh:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['123456', 'Fpt2026@', 'Gvqn123!'].map((pwd) => (
                <button
                  key={pwd}
                  type="button"
                  onClick={() => {
                    setNewPassword(pwd);
                    setConfirmPassword(pwd);
                  }}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  {pwd}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 font-bold text-white shadow-md hover:bg-amber-700 transition"
            >
              <KeyRound className="h-4 w-4" />
              <span>Lưu Mật Khẩu Mới</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
