import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TodayScreen } from './features/today/TodayScreen';
import { OperationsCenter } from './features/operations/OperationsCenter';
import { TeacherList } from './features/teachers/TeacherList';
import { StudentList } from './features/students/StudentList';
import { RoomList } from './features/rooms/RoomList';
import { ScheduleScreen } from './features/schedule/ScheduleScreen';
import { InteractionCenter } from './features/interactions/InteractionCenter';
import { KPICenter } from './features/kpi/KPICenter';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { ReportExporter } from './features/reports/ReportExporter';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { BOPSStore, subscribeToStore } from './services/storage';
import { User } from './types';

export default function App() {
  const initialUser = BOPSStore.getCurrentUser();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(BOPSStore.isAuthChecking());
  const [authError, setAuthError] = useState<string | null>(BOPSStore.getAuthError());
  const [syncError, setSyncError] = useState<string | null>(BOPSStore.getSyncError());
  const [isRecovery, setIsRecovery] = useState<boolean>(BOPSStore.isPasswordRecovery());
  const [activeModule, setActiveModule] = useState<string>(
    initialUser?.role === 'teacher' ? 'interactions' : 'today'
  );
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const u = BOPSStore.getCurrentUser();
      const checking = BOPSStore.isAuthChecking();
      const err = BOPSStore.getAuthError();
      const sErr = BOPSStore.getSyncError();
      const loggedIn = BOPSStore.isLoggedIn();
      const rec = BOPSStore.isPasswordRecovery();

      setCurrentUser(u);
      setIsAuthChecking(checking);
      setAuthError(err);
      setSyncError(sErr);
      setIsRecovery(rec);

      if (u && u.role === 'teacher') {
        const allowedModules = ['interactions', 'kpi', 'dashboard', 'students', 'reports'];
        if (!allowedModules.includes(activeModule)) {
          setActiveModule('dashboard');
        }
      } else if (!loggedIn && activeModule !== 'today') {
        setActiveModule('today');
      }
    };

    const unsubscribe = subscribeToStore(handleUpdate);
    return unsubscribe;
  }, [activeModule]);

  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans antialiased`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          onOpenMobileSidebar={() => setIsOpenMobile(true)}
        />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="mx-auto max-w-7xl">
            {isAuthChecking ? (
              <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-4 animate-pulse">
                  <div className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin dark:border-blue-400 dark:border-t-transparent" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Đang đồng bộ phiên làm việc Supabase Auth...
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Hệ thống đang kiểm tra thông tin xác thực từ trình duyệt
                </p>
              </div>
            ) : !currentUser ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  {/* System Header */}
                  <div className="text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-400">
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>

                    <div>
                      <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        Hệ thống Quản trị Hiệu suất & Vận hành Nội trú - FSC3
                      </h2>
                      <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Nền tảng vận hành tập trung cho Giáo viên Quản nhiệm: điều phối ca trực, giám sát nề nếp, theo dõi sức khỏe học sinh và đánh giá hiệu suất minh bạch.
                      </p>
                    </div>
                  </div>

                  {/* Feature Highlights Grid */}
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 mb-2.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Ca Trực & Báo Cáo Ngày</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Theo dõi công việc ca trực, bàn giao ca và xuất báo cáo tổng hợp.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 mb-2.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Chăm Sóc & Sức Khỏe HS</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Ghi nhận tương tác 1-1, cảnh báo y tế khẩn cấp và nề nếp phòng ở.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 mb-2.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">KPI & Xếp Hạng Định Kỳ</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Thẩm định công tác hằng ngày, tuần, tháng với 5 tiêu chí chuẩn hóa.
                      </div>
                    </div>
                  </div>

                  {/* Login Call to Action */}
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Vui lòng sử dụng tài khoản email FPT (<strong className="text-slate-700 dark:text-slate-300">@fpt.edu.vn</strong>) được cấp để truy cập hệ thống.
                    </p>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('bops:open-login-modal'))}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>Đăng Nhập Hệ Thống</span>
                      </button>
                    </div>
                  </div>

                  {isRecovery && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                      <strong>Phiên khôi phục mật khẩu:</strong> Bạn đang mở liên kết đặt lại mật khẩu từ Email. Hộp thoại đổi mật khẩu đã sẵn sàng để bạn nhập mật khẩu mới!
                    </div>
                  )}

                  {authError && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                      <strong>Thông báo xác thực:</strong> {authError}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {syncError && (
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                    <div className="flex items-start sm:items-center gap-2">
                      <span className="font-bold shrink-0">⚠️ Cảnh báo kết nối Supabase:</span>
                      <span>{syncError} (Ứng dụng giữ nguyên dữ liệu hiện hành, không nạp dữ liệu mẫu).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => BOPSStore.resetAllData()}
                      className="rounded-lg bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-100 self-start sm:self-auto shrink-0 transition"
                    >
                      Thử đồng bộ lại
                    </button>
                  </div>
                )}
                {currentUser.role === 'teacher' ? (
                  <>
                    {activeModule === 'reports' && <ReportExporter />}
                    {activeModule === 'dashboard' && <DashboardScreen setActiveModule={setActiveModule} />}
                    {activeModule === 'students' && <StudentList />}
                    {activeModule === 'interactions' && <InteractionCenter />}
                    {activeModule === 'kpi' && <KPICenter />}
                    {activeModule !== 'reports' &&
                      activeModule !== 'dashboard' &&
                      activeModule !== 'students' &&
                      activeModule !== 'interactions' &&
                      activeModule !== 'kpi' && <ReportExporter />}
                  </>
                ) : (
                  <>
                    {activeModule === 'today' && <TodayScreen setActiveModule={setActiveModule} />}
                    {activeModule === 'operations' && <OperationsCenter setActiveModule={setActiveModule} />}
                    {activeModule === 'teachers' && <TeacherList />}
                    {activeModule === 'students' && <StudentList />}
                    {activeModule === 'rooms' && <RoomList />}
                    {activeModule === 'schedule' && <ScheduleScreen />}
                    {activeModule === 'interactions' && <InteractionCenter />}
                    {activeModule === 'kpi' && <KPICenter />}
                    {activeModule === 'dashboard' && <DashboardScreen setActiveModule={setActiveModule} />}
                    {activeModule === 'reports' && <ReportExporter />}
                    {activeModule === 'settings' && <SettingsScreen />}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
