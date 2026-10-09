import React from 'react';
import {
  CalendarCheck,
  Activity,
  Users,
  GraduationCap,
  Building2,
  Calendar,
  CheckSquare,
  MessageSquareHeart,
  Award,
  BarChart3,
  FileSpreadsheet,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { BOPSStore } from '../../services/storage';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (mod: string) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const isLoggedIn = BOPSStore.isLoggedIn();
  const currentUser = BOPSStore.getCurrentUser();
  const isManager = isLoggedIn && currentUser.role === 'manager';

  const menuItems = !isManager
    ? [
        {
          id: 'dashboard',
          label: 'Dashboard Phân tích',
          icon: BarChart3,
          badge: 'Sức khỏe & Care',
          description: 'Theo dõi học sinh ưu tiên, sức khỏe y tế & xu hướng',
        },
        {
          id: 'students',
          label: 'Học sinh nội trú toàn trường',
          icon: GraduationCap,
          description: 'Upload Excel & chỉnh sửa hồ sơ học sinh nội trú thuộc diện quản nhiệm',
        },
        {
          id: 'interactions',
          label: 'Tương tác 1-1 Học sinh',
          icon: MessageSquareHeart,
          badge: '≥1 HS/tuần',
          description: 'Tối thiểu nhập 1 HS/tuần để đạt điểm KPI chăm sóc (15%)',
        },
        {
          id: 'kpi',
          label: 'Đánh giá KPI & Xếp hạng',
          icon: Award,
          badge: 'Xem KQ',
          description: 'Xem hiệu suất KPI hằng ngày/tuần/tháng & nhận xét từ Quản lý',
        },
        {
          id: 'reports',
          label: 'Báo cáo Hằng ngày',
          icon: FileSpreadsheet,
          badge: 'Nộp báo cáo',
          description: 'Báo cáo ca trực, tình trạng học sinh & phòng KTX',
        },
      ]
    : [
        {
          id: 'today',
          label: 'Hôm nay (Today)',
          icon: CalendarCheck,
          badge: 'Chính',
          description: 'Lịch trực & điều hành ca cá nhân',
        },
        {
          id: 'operations',
          label: 'Trung tâm Vận hành',
          icon: Activity,
          badge: 'Live',
          description: 'Giám sát ca, chấm điểm & điều hành thời gian thực',
        },
        {
          id: 'teachers',
          label: 'Giáo viên Quản nhiệm',
          icon: Users,
          description: 'Danh sách nhân sự & khối lượng công việc',
        },
        {
          id: 'students',
          label: 'Học sinh nội trú toàn trường',
          icon: GraduationCap,
          description: 'Hồ sơ học sinh nội trú toàn trường & diện theo dõi đặc biệt',
        },
        {
          id: 'interactions',
          label: 'Tương tác 1-1',
          icon: MessageSquareHeart,
          badge: '≥1 HS/tuần',
          description: 'Nhật ký chăm sóc & tối thiểu 1 HS/tuần đạt điểm',
        },
        {
          id: 'kpi',
          label: 'Đánh giá KPI & Xếp hạng',
          icon: Award,
          badge: 'Admin chấm',
          description: 'Thống kê xếp hạng hằng ngày/tuần/tháng & đồng bộ từ Trung tâm Vận hành',
        },
        {
          id: 'rooms',
          label: 'Quản lý Phòng KTX',
          icon: Building2,
          description: 'Tình trạng vệ sinh & phân công',
        },
        {
          id: 'schedule',
          label: 'Phân công Lịch trực',
          icon: Calendar,
          description: 'Xếp lịch ca trực, đổi ca & sao chép tuần',
        },
        {
          id: 'dashboard',
          label: 'Dashboard Phân tích',
          icon: BarChart3,
          description: 'Biểu đồ KPI & thống kê tổng quan',
        },
        {
          id: 'reports',
          label: 'Báo cáo & Xuất File',
          icon: FileSpreadsheet,
          description: 'Xuất PDF / Excel / Báo cáo định kỳ',
        },
        {
          id: 'settings',
          label: 'Cấu hình Hệ thống',
          icon: Settings,
          description: 'Thời gian ca, trọng số KPI & quy định',
        },
      ];

  const handleSelect = (id: string) => {
    setActiveModule(id);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-transform duration-300 dark:border-slate-800 md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-black text-white text-xs tracking-wider shadow-lg shadow-blue-500/30">
            KTX
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">Quản trị Nội trú</h1>
            <p className="text-[11px] font-medium text-slate-400">Quản lý & Hiệu suất GVQN</p>
          </div>
        </div>

        {/* Current User Badge Card */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-500/40"
              />
              <div className="overflow-hidden">
                <div className="truncate text-xs font-bold text-slate-100">{currentUser.fullName}</div>
                <div className="truncate text-[10px] text-blue-400 font-medium">
                  {currentUser.role === 'manager' ? 'Trưởng Bộ phận Nội trú' : `${currentUser.teacherCode} • Workload ${currentUser.workloadIndex}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 ring-2 ring-slate-700 shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <div className="truncate text-xs font-bold text-slate-300">Chưa đăng nhập</div>
                <div className="truncate text-[10px] text-slate-500 font-medium">Vui lòng đăng nhập hệ thống</div>
              </div>
            </div>
          )}
        </div>

        {/* Teacher Role Notice */}
        {isLoggedIn && !isManager && (
          <div className="mx-3 mt-2 mb-1 rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
              <MessageSquareHeart className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
              <span>Quyền Giáo viên Quản nhiệm</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-300 leading-relaxed">
              Theo dõi sức khỏe HS trên <strong>Dashboard</strong>, quản lý hồ sơ học sinh (chỉ sửa học sinh do chính mình phụ trách/tải lên), nhập <strong>Tương tác 1-1</strong> và xem <strong>KPI</strong>.
            </p>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-blue-600 font-semibold text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="truncate text-xs">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="border-t border-slate-800 p-4 text-center">
          <div className="text-[11px] font-medium text-slate-400">
            THPT FPT Boarding System • v2.0
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Không dùng Excel • Tự động tính KPI
          </div>
        </div>
      </aside>
    </>
  );
};
