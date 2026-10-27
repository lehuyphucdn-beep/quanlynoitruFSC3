import React, { useState, useEffect } from 'react';
import { KeyRound, Check, AlertCircle, X, ShieldCheck, Loader2, Info } from 'lucide-react';
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
  const currentUser = BOPSStore.getCurrentUser();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  // Kiểm tra tài khoản hợp lệ:
  // Người dùng chỉ được tự đổi mật khẩu cho chính mình thông qua phiên Supabase Auth đang hoạt động
  const isRecovery = BOPSStore.isPasswordRecovery();
  const activeUser = currentUser;

  const handleModalClose = () => {
    if (isRecovery) {
      BOPSStore.clearPasswordRecovery();
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!activeUser && !isRecovery) {
      setErrorMessage('Bạn chưa đăng nhập vào hệ thống. Vui lòng đăng nhập trước khi đổi mật khẩu!');
      return;
    }

    // Nếu modal được mở với targetUser không trùng với currentUser (ví dụ admin cố đổi cho người khác)
    if (targetUser && activeUser && targetUser.id !== activeUser.id) {
      setErrorMessage(
        'Bảo mật Supabase Auth: Quản lý không thể trực tiếp đổi mật khẩu tài khoản của người khác. Mỗi người dùng phải tự đổi mật khẩu của mình khi đã đăng nhập.'
      );
      return;
    }

    const cleanNewPass = newPassword.trim();
    if (!cleanNewPass) {
      setErrorMessage('Vui lòng nhập mật khẩu mới!');
      return;
    }

    if (cleanNewPass.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo chuẩn an toàn Supabase Auth!');
      return;
    }

    if (cleanNewPass !== confirmPassword.trim()) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!');
      return;
    }

    setIsSubmitting(true);

    try {
      // Gọi cập nhật trực tiếp qua Supabase Auth API
      const result = await BOPSStore.updateCurrentUserPassword(cleanNewPass);

      if (!result.success) {
        setErrorMessage(result.error || 'Đổi mật khẩu không thành công. Vui lòng thử lại!');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        activeUser
          ? `Đã cập nhật mật khẩu mới cho tài khoản "${activeUser.fullName}" qua Supabase Auth thành công!`
          : 'Đã cập nhật mật khẩu mới qua Supabase Auth thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập.'
      );
      setNewPassword('');
      setConfirmPassword('');
      setIsSubmitting(false);

      setTimeout(() => {
        setSuccessMessage(null);
        handleModalClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi ngoại lệ khi cập nhật mật khẩu!');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Close Button */}
        <button
          onClick={handleModalClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
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
              {isRecovery ? 'Khôi Phục Mật Khẩu' : 'Đổi Mật Khẩu Cá Nhân'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cập nhật trực tiếp lên hệ thống xác thực an toàn Supabase Auth
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            Mật khẩu mới được mã hóa an toàn qua <strong>Supabase Auth</strong>. Mật khẩu không bao giờ được lưu dưới dạng văn bản thô trong cơ sở dữ liệu hoặc trình duyệt.
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Active Account Information */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tài khoản đang thực hiện
            </label>
            {activeUser ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3 dark:bg-slate-800 dark:border-slate-700">
                <img
                  src={activeUser.avatar}
                  alt={activeUser.fullName}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-amber-500/30"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {activeUser.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Mã GV: {activeUser.teacherCode || 'N/A'} • {activeUser.email}
                  </div>
                </div>
              </div>
            ) : isRecovery ? (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/40 dark:border-amber-800">
                <ShieldCheck className="h-8 w-8 text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                    Phiên khôi phục mật khẩu từ liên kết Email
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-300">
                    Vui lòng đặt mật khẩu mới để hoàn tất khôi phục tài khoản
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
                Bạn chưa đăng nhập. Không thể thực hiện đổi mật khẩu!
              </div>
            )}
          </div>

          {/* New password input */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu mới (tối thiểu 6 ký tự)
            </label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                disabled={isSubmitting || (!activeUser && !isRecovery)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm disabled:opacity-50"
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
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                disabled={isSubmitting || (!activeUser && !isRecovery)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm disabled:opacity-50"
              />
              <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!activeUser && !isRecovery)}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 font-bold text-white shadow-md hover:bg-amber-700 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Lưu Mật Khẩu Mới</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
