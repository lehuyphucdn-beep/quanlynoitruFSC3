import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  X,
  Check,
  Share2,
  PlusSquare,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGenericGuide, setShowGenericGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
        title="Cài đặt ứng dụng"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cài App</span>
        <span className="sm:hidden">App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300 transition"
          title="Cài ứng dụng trên iPhone / iPad"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Cài App iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Cài đặt trên iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Thực hiện 2 bước trên trình duyệt Safari:
              </p>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <Share2 className="h-5 w-5 shrink-0 text-blue-600" />
                  <p>
                    <strong>Bước 1:</strong> Nhấn nút Chia sẻ (Share) trên thanh công cụ Safari.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <PlusSquare className="h-5 w-5 shrink-0 text-blue-600" />
                  <p>
                    <strong>Bước 2:</strong> Chọn Thêm vào Màn hình chính (Add to Home Screen).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="h-4 w-4 shrink-0" />
                Ứng dụng BOPS sẽ xuất hiện trên màn hình chính.
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-2xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowGenericGuide(true)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
        title="Hướng dẫn cài đặt ứng dụng"
      >
        <Download className="h-3.5 w-3.5 text-blue-600" />
        <span className="hidden sm:inline">Cài App</span>
      </button>

      {showGenericGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Cài đặt ứng dụng BOPS
              </h3>
              <button
                onClick={() => setShowGenericGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bạn có thể cài FSC3 thành ứng dụng để mở nhanh từ màn hình chính.
            </p>

            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <p>
                <strong>Trên máy tính:</strong> Mở Google Chrome, Microsoft Edge hoặc Cốc Cốc. Chọn biểu tượng cài đặt ứng dụng trên thanh địa chỉ.
              </p>
              <p>
                <strong>Trên Android:</strong> Mở trang bằng Chrome, nhấn menu (⋮), chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.
              </p>
              <p>
                <strong>Trên iPhone/iPad:</strong> Mở bằng Safari, nhấn Chia sẻ rồi chọn Thêm vào Màn hình chính.
              </p>
            </div>

            <button
              onClick={() => setShowGenericGuide(false)}
              className="w-full rounded-2xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
};