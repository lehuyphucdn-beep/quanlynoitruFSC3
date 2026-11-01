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
  X,
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
  const isManager = isLoggedIn && currentUser?.role === 'manager';

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
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs tracking-wider">
              FSC3
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">Quản trị Nội trú</h1>
              <p className="text-[10px] text-slate-400">Hiệu suất & Vận hành GVQN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current User Badge Card */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/30">
          {isLoggedIn && currentUser ? (
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700"
              />
              <div className="overflow-hidden min-w-0">
                <div className="truncate text-xs font-semibold text-slate-100">{currentUser.fullName}</div>
                <div className="truncate text-[10px] text-blue-400">
                  {currentUser.role === 'manager' ? 'Ban Quản trị' : `${currentUser.teacherCode || 'GVQN'} • Workload ${currentUser.workloadIndex}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="truncate text-xs font-semibold text-slate-300">Chưa đăng nhập</div>
                <div className="truncate text-[10px] text-slate-500">Vui lòng đăng nhập hệ thống</div>
              </div>
            </div>
          )}
        </div>

        {/* Teacher Role Notice */}
        {isLoggedIn && !isManager && (
          <div className="mx-3 mt-2 mb-1 rounded-xl border border-blue-900/40 bg-blue-950/30 p-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-blue-300 text-[11px]">
              <MessageSquareHeart className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              <span>Quyền Giáo viên Quản nhiệm</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-300 leading-relaxed">
              Theo dõi sức khỏe HS trên <strong>Dashboard</strong>, quản lý hồ sơ học sinh (chỉ sửa học sinh do chính mình phụ trách/tải lên), nhập <strong>Tương tác 1-1</strong> và xem <strong>KPI</strong>.
            </p>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-blue-600 font-medium text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span className="truncate text-xs">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400'
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
