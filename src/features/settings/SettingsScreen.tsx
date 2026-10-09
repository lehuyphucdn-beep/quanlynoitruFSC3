import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Award,
  ShieldCheck,
  RotateCcw,
  Check,
  KeyRound,
  Search,
  User as UserIcon,
  Copy,
  Edit2,
  X,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { User } from '../../types';

export const SettingsScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>(BOPSStore.getUsers());
  const [searchAccount, setSearchAccount] = useState('');
  const [editingPasswords, setEditingPasswords] = useState<{ [id: string]: string }>({});
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setUsers(BOPSStore.getUsers());
    const unsub = subscribeToStore(load);
    return unsub;
  }, []);

  const handlePasswordInputChange = (userId: string, val: string) => {
    setEditingPasswords((prev) => ({ ...prev, [userId]: val }));
  };

  const handleSaveUserPassword = (user: User) => {
    const newPass = (editingPasswords[user.id] || '').trim();
    if (!newPass) return;

    const updated = { ...user, password: newPass };
    BOPSStore.updateUser(updated);

    setSavedSuccessMsg(`Đã cập nhật mật khẩu cho "${user.fullName}" thành: "${newPass}"`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const handleCopyAccount = (u: User) => {
    const pass = editingPasswords[u.id] || u.password || u.fullName;
    const text = `Tài khoản: ${u.username || u.teacherCode} | Mật khẩu: ${pass} | Tên: ${u.fullName}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchAccount.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      (u.teacherCode || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleResetData = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục dữ liệu hệ thống về trạng thái ban đầu không?')) {
      BOPSStore.resetAllData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Settings className="h-4 w-4" />
          <span>System Settings</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
          Cấu hình Quy định Vận hành & Quản lý Mật khẩu
        </h2>
      </div>

      <div className="max-w-4xl space-y-6 text-xs">
        {/* Account Password Manager Card */}
        <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm dark:border-amber-900/60 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600" />
                Quản Lý Mật Khẩu Đăng Nhập Tất Cả Tài Khoản ({users.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Xem và thay đổi trực tiếp mật khẩu của Quản lý và tất cả Giáo viên Quản nhiệm
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                placeholder="Tìm tên, mã GV, tài khoản..."
                className="w-full rounded-xl border border-amber-200 bg-white py-1.5 pl-8 pr-3 text-xs font-semibold focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {savedSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-900 font-bold text-xs dark:bg-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{savedSuccessMsg}</span>
            </div>
          )}

          {/* User Passwords List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredUsers.map((u) => {
              const currentPass = u.password || u.fullName;
              const inputValue = editingPasswords[u.id] ?? currentPass;
              const isModified = inputValue !== currentPass;

              return (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-amber-200/70 dark:bg-slate-800 dark:border-slate-700 hover:border-amber-400 transition shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar}
                      alt={u.fullName}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-amber-500/20 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-xs truncate flex items-center gap-1.5">
                        <span>{u.fullName}</span>
                        {u.role === 'manager' && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Quản lý
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        TK: <strong className="text-blue-600 dark:text-blue-400">{u.username || u.teacherCode}</strong> • Mã GV: {u.teacherCode || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Password Input & Save Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => handlePasswordInputChange(u.id, e.target.value)}
                        className={`w-36 sm:w-44 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold shadow-inner focus:outline-none ${
                          isModified
                            ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                            : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveUserPassword(u)}
                      disabled={!isModified || !inputValue.trim()}
                      className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition text-xs ${
                        isModified && inputValue.trim()
                          ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-md'
                          : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Lưu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyAccount(u)}
                      className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
                      title="Sao chép thông tin tài khoản"
                    >
                      {copiedId === u.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 font-semibold">
                Không tìm thấy tài khoản phù hợp với từ khóa "{searchAccount}"
              </div>
            )}
          </div>
        </div>

        {/* Shift Time Window Config */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Khung giờ Các Ca trực Nội trú
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl dark:bg-slate-800">
              <span className="font-bold block text-slate-800 dark:text-slate-200">Ca Sáng (Morning)</span>
              <span className="text-slate-500">06:00 - 11:30</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl dark:bg-slate-800">
              <span className="font-bold block text-slate-800 dark:text-slate-200">Ca Trưa (Lunch)</span>
              <span className="text-slate-500">11:30 - 14:00</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl dark:bg-slate-800">
              <span className="font-bold block text-slate-800 dark:text-slate-200">Ca Chiều (Afternoon)</span>
              <span className="text-slate-500 font-semibold text-blue-600 dark:text-blue-400">16:00 - 18:45</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl dark:bg-slate-800">
              <span className="font-bold block text-slate-800 dark:text-slate-200">Ca Tối (Evening)</span>
              <span className="text-slate-500 font-semibold text-blue-600 dark:text-blue-400">19:15 - 22:30</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl dark:bg-slate-800 col-span-2">
              <span className="font-bold block text-slate-800 dark:text-slate-200">Ca Đêm (Night Shift)</span>
              <span className="text-slate-500">22:30 - 06:00 (Hôm sau) • Được miễn ca sáng/trưa hôm sau</span>
            </div>
          </div>
        </div>

        {/* KPI Weighting Config */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Cấu hình Trọng số KPI (Tổng 100%)
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl dark:bg-slate-800">
              <span>A. Vận hành cốt lõi (Core Operation)</span>
              <span className="font-bold text-blue-600">50%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl dark:bg-slate-800">
              <span>B. Chất lượng & Nền nếp (Quality)</span>
              <span className="font-bold text-emerald-600">20%</span>
            </div>

            {/* C. Tương tác Học sinh 1-1 (Student Care) - Cấu hình Quy định */}
            <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/70 p-4 dark:border-purple-800 dark:bg-purple-950/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/80 pb-2 dark:border-purple-900">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white font-black text-xs">
                    C
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Tương tác Học sinh 1-1 (Student Care)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-200 px-2.5 py-0.5 text-[10px] font-black text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                    Trọng số: 15% (15 Điểm)
                  </span>
                </div>
              </div>

              {/* Chi tiết Quy định đạt điểm trọng số */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-1.5 font-black text-emerald-800 dark:text-emerald-300">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>ĐIỀU KIỆN ĐẠT ĐIỂM TRỌNG SỐ (15/15 ĐIỂM):</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed font-semibold">
                    Trong tuần đó <strong>tối thiểu nhập tương tác 1 học sinh</strong> (≥ 1 lượt tương tác 1-1) → Hệ thống ghi nhận <strong>Đạt điểm trọng số (15/15 điểm)</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-3 dark:border-rose-800 dark:bg-rose-950/40">
                  <div className="flex items-center gap-1.5 font-black text-rose-800 dark:text-rose-300">
                    <X className="h-4 w-4 text-rose-600" />
                    <span>ĐIỀU KIỆN KHÔNG ĐẠT (0 ĐIỂM):</span>
                  </div>
                  <p className="mt-1 text-[11px] text-rose-900 dark:text-rose-200 leading-relaxed font-semibold">
                    Nếu trong tuần đó <strong>không nhập tương tác học sinh nào (0 học sinh)</strong> → Hệ thống ghi nhận <strong>Không đạt (0 điểm)</strong> phần điểm trọng số này.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  • Áp dụng tự động đối soát trong KPI hằng ngày & hằng tuần của tất cả Giáo viên Quản nhiệm.
                </span>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  Chỉ tiêu tối thiểu: ≥ 1 HS / tuần
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl dark:bg-slate-800">
              <span>D. Đóng góp & Trực thay (Contribution)</span>
              <span className="font-bold text-indigo-600">10%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl dark:bg-slate-800">
              <span>E. Chấp hành Kỷ luật (Discipline)</span>
              <span className="font-bold text-rose-600">5%</span>
            </div>
          </div>
        </div>

        {/* System Reset */}
        <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-950 dark:bg-slate-900 space-y-3">
          <h3 className="font-bold text-rose-900 dark:text-rose-300 text-sm">
            Khôi phục Dữ liệu Mẫu Ban đầu
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Khôi phục toàn bộ danh sách 23 giáo viên, danh sách học sinh ưu tiên, phòng KTX và các nhiệm vụ checklist về trạng thái mặc định.
          </p>
          <button
            onClick={handleResetData}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-bold text-white shadow hover:bg-rose-700"
          >
            <RotateCcw className="h-4 w-4" />
            Khôi phục Dữ liệu Ban đầu
          </button>
        </div>
      </div>
    </div>
  );
};
