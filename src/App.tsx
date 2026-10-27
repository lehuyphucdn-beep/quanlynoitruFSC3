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
      const loggedIn = BOPSStore.isLoggedIn();
      const rec = BOPSStore.isPasswordRecovery();

      setCurrentUser(u);
      setIsAuthChecking(checking);
      setAuthError(err);
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
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} font-sans antialiased`}>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
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
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-w-lg w-full">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-4 shadow-sm">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Hệ thống Quản trị Nội trú THPT FPT (FSC3)
                  </h2>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Vui lòng bấm nút <strong>Đăng nhập</strong> ở thanh tiêu đề phía trên để bắt đầu ca trực hoặc truy cập các chức năng quản lý.
                  </p>

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

                  <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-left dark:border-blue-900/50 dark:bg-blue-950/30">
                    <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300">
                      Tài khoản thử nghiệm Supabase Auth:
                    </div>
                    <div className="mt-1 text-xs text-blue-800 dark:text-blue-200 font-mono">
                      Email: anhntl78@fpt.edu.vn
                    </div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                      Hồ sơ: Nguyễn Thị Lan Anh (GV023)
                    </div>
                  </div>
                </div>
              </div>
            ) : currentUser.role === 'teacher' ? (
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
          </div>
        </main>
      </div>
    </div>
  );
}
