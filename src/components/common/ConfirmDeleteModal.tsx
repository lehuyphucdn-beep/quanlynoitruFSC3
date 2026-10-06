import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  message,
  itemName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl transition-all dark:border-rose-900/50 dark:bg-slate-900 z-10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
          <div className="rounded-2xl bg-rose-100 p-3 dark:bg-rose-950/80">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Thao tác này không thể hoàn tác</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 my-4 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          {message ? (
            message
          ) : (
            <span>
              Bạn chắc chắn xóa <strong className="text-slate-900 dark:text-white font-bold">{itemName || 'mục này'}</strong> khỏi hệ thống?
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Xác nhận Xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
