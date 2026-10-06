import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Building2,
  GraduationCap,
  Award,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Pencil,
  Trash2,
  KeyRound,
  Copy,
  Check,
  LogIn,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { User, KPIRecord, TaskInstance, ScheduleAssignment } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import {
  WorkEvaluationModal,
  WorkEvaluationItem,
} from '../../components/common/WorkEvaluationModal';

export const TeacherList: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [kpis, setKPIs] = useState<KPIRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'account' | 'tasks' | 'interactions' | 'kpi'>('overview');
  
  // Account Handover Modal state
  const [handoverTeacher, setHandoverTeacher] = useState<User | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('123456');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  // Add Teacher Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeacherData, setNewTeacherData] = useState({
    fullName: '',
    teacherCode: '',
    email: '',
    phone: '',
    position: 'Giáo viên Quản nhiệm DomB',
    building: 'DomB',
    assignedFloors: ['Tầng 2'],
    password: '123456',
  });

  // Delete Teacher confirmation modal state
  const [teacherToDelete, setTeacherToDelete] = useState<User | null>(null);

  // Work Evaluation Modal state
  const [evaluationItem, setEvaluationItem] = useState<WorkEvaluationItem | null>(null);

  const handleOpenTaskEvaluation = (task: TaskInstance) => {
    setEvaluationItem({
      itemType: 'task',
      id: task.id,
      title: task.title || task.taskName,
      teacherId: task.teacherId,
      teacherName: task.teacherName,
      date: task.date,
      shift: task.shift,
      completionNote: task.note,
      proofPhotos: task.proofPhotos,
      status: task.status,
      verified: task.verified,
      evaluationCriteria: task.evaluationCriteria,
      deductedPoints: task.deductedPoints,
      evaluationNote: task.note,
    });
  };

  const handleOpenScheduleEvaluation = (sch: ScheduleAssignment) => {
    setEvaluationItem({
      itemType: 'schedule',
      id: sch.id,
      title: `Ca trực ${sch.positionName}`,
      teacherId: sch.teacherId,
      teacherName: sch.teacherName,
      date: sch.date,
      shift: sch.shift,
      completionNote: sch.completionNote || 'Báo cáo ca trực hoàn thành',
      proofPhotos: sch.proofPhotos,
      status: sch.status,
      verified: sch.status === 'verified',
      evaluationCriteria: sch.evaluationCriteria,
      deductedPoints: sch.deductedPoints,
      evaluationNote: sch.evaluationNote,
    });
  };

  const handleExecuteEvaluation = (evalData: {
    itemType: 'task' | 'schedule';
    itemId: string;
    evaluation: 'approved' | 'rejected';
    criteriaKey?: 'operation' | 'quality' | 'studentCare' | 'discipline';
    criteriaLabel?: string;
    deductedPoints?: number;
    reason?: string;
  }) => {
    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.evaluateWorkItem({
      itemType: evalData.itemType,
      itemId: evalData.itemId,
      managerName: currentUser.fullName,
      evaluation: evalData.evaluation,
      criteriaKey: evalData.criteriaKey,
      criteriaLabel: evalData.criteriaLabel,
      deductedPoints: evalData.deductedPoints,
      reason: evalData.reason,
    });
  };

  useEffect(() => {
    const loadData = () => {
      const allUsers = BOPSStore.getUsers();
      setTeachers(allUsers.filter((u) => u.role === 'teacher'));
      setKPIs(BOPSStore.getKPIs());
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  // Edit Teacher Modal state
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);

  const handleEditTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    BOPSStore.updateUser(editingTeacher);
    setEditingTeacher(null);
    if (selectedTeacher && selectedTeacher.id === editingTeacher.id) {
      setSelectedTeacher(editingTeacher);
    }
  };

  const handleDeleteTeacher = (teacher: User) => {
    setTeacherToDelete(teacher);
  };

  const confirmDeleteTeacher = () => {
    if (teacherToDelete) {
      BOPSStore.deleteUser(teacherToDelete.id);
      if (selectedTeacher?.id === teacherToDelete.id) {
        setSelectedTeacher(null);
      }
      setTeacherToDelete(null);
    }
  };

  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherData.fullName || !newTeacherData.teacherCode) return;

    BOPSStore.addUser({
      fullName: newTeacherData.fullName,
      teacherCode: newTeacherData.teacherCode,
      email: newTeacherData.email || `${newTeacherData.teacherCode.toLowerCase()}@school.edu.vn`,
      phone: newTeacherData.phone || '0988 123 456',
      role: 'teacher',
      position: newTeacherData.position,
      status: 'active',
      departmentId: 'dept-01',
      employmentDate: '2023-09-01',
      birthday: '1992-04-12',
      gender: 'nam',
      address: 'Hà Nội',
      nightShiftEligible: true,
      assignedRoomIds: ['rm-101'],
      assignedStudentIds: [],
      workloadIndex: 1.0,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
    });

    setIsAddModalOpen(false);
    setNewTeacherData({
      fullName: '',
      teacherCode: '',
      email: '',
      phone: '',
      position: 'Giáo viên Quản nhiệm',
      building: 'Tòa A - Nam',
      assignedFloors: ['Tầng 2'],
      password: '123456',
    });
  };

  const handleCopyCredentials = (teacher: User) => {
    const text = `[HỆ THỐNG KTX BOPS - THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP]
Giáo viên: ${teacher.fullName}
Mã GVQN: ${teacher.teacherCode}
Tài khoản đăng nhập (Tên viết tắt): ${teacher.username || teacher.teacherCode}
Email: ${teacher.email}
Mật khẩu đăng nhập: ${teacher.password || teacher.fullName}
Đường dẫn: Hệ thống Quản trị Nội trú BOPS`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleResetPassword = (teacher: User, customPass?: string) => {
    const passToSet = (customPass || resetPasswordInput || '123456').trim();
    if (!passToSet) return;

    const updated = {
      ...teacher,
      password: passToSet,
    };
    BOPSStore.updateUser(updated);

    if (selectedTeacher && selectedTeacher.id === teacher.id) {
      setSelectedTeacher(updated);
    }
    if (handoverTeacher && handoverTeacher.id === teacher.id) {
      setHandoverTeacher(updated);
    }

    setPasswordMsg(`Đã cập nhật mật khẩu cho ${teacher.fullName} thành: "${passToSet}"`);
    setTimeout(() => setPasswordMsg(null), 3500);
  };

  const handleQuickSwitchUser = (teacher: User) => {
    BOPSStore.setCurrentUser(teacher.id);
    alert(`Đã chuyển đăng nhập sang tài khoản Giáo viên ${teacher.fullName} (${teacher.teacherCode})`);
    setHandoverTeacher(null);
    setSelectedTeacher(null);
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTeacherKPI = (teacherId: string) => {
    return kpis.find((k) => k.teacherId === teacherId) || {
      totalScore: 90,
      rank: 'A' as const,
      workloadIndex: 1.0,
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Users className="h-4 w-4" />
            <span>Nhân sự Nội trú • Giáo viên Quản nhiệm</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Danh sách Giáo viên Quản nhiệm & Hệ số Khối lượng
          </h2>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã GV..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm GVQN Mới</span>
          </button>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const kpi = getTeacherKPI(teacher.id);
          return (
            <div
              key={teacher.id}
              onClick={() => {
                setSelectedTeacher(teacher);
                setActiveTab('overview');
              }}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <img
                  src={teacher.avatar}
                  alt={teacher.fullName}
                  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-blue-500/20 shrink-0"
                />

                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {teacher.fullName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {teacher.teacherCode}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHandoverTeacher(teacher);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                        title="Bàn giao tài khoản đăng nhập"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTeacher(teacher);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        title="Chỉnh sửa giáo viên"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTeacher(teacher);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                        title="Xóa giáo viên"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {teacher.position}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Layers className="h-3.5 w-3.5 text-blue-500" />
                      <span>Workload: <strong>{teacher.workloadIndex}</strong></span>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-blue-600">
                      <Award className="h-3.5 w-3.5" />
                      <span>{kpi.totalScore} Đ ({kpi.rank})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Teacher Profile Detail Modal */}
      <Modal
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        title={selectedTeacher?.fullName || ''}
        subtitle={`${selectedTeacher?.teacherCode} • ${selectedTeacher?.position}`}
        maxWidth="3xl"
      >
        {selectedTeacher && (
          <div className="space-y-6">
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              {[
                { id: 'overview', label: 'Tổng quan Hồ sơ' },
                { id: 'account', label: '🔑 Tài Khoản & Bàn Giao' },
                { id: 'tasks', label: 'Nhiệm vụ & Ca trực' },
                { id: 'interactions', label: 'Lịch sử Tương tác' },
                { id: 'kpi', label: 'Chi tiết KPI' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'account' && (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-300">
                      <KeyRound className="h-4 w-4 text-amber-600" />
                      <span>Thông Tin Bàn Giao Tài Khoản Đăng Nhập</span>
                    </div>
                    {copySuccess && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Đã sao chép!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-amber-200/80 dark:bg-slate-900 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Họ và tên Giáo viên</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedTeacher.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Tài khoản đăng nhập (Viết tắt)</span>
                      <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">{selectedTeacher.username || selectedTeacher.teacherCode}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Mật khẩu đăng nhập</span>
                      <span className="font-bold text-amber-700 dark:text-amber-300 text-sm">{selectedTeacher.password || selectedTeacher.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Mã GV & Email</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTeacher.teacherCode} • {selectedTeacher.email}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCopyCredentials(selectedTeacher)}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 font-bold text-white shadow-sm hover:bg-amber-700 transition"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao Chép Thẻ Bàn Giao (Để gửi Zalo / Email)</span>
                    </button>

                    <button
                      onClick={() => handleQuickSwitchUser(selectedTeacher)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-bold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span>Đăng Nhập Thử Tài Khoản Này</span>
                    </button>
                  </div>
                </div>

                {/* Change Password Card */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-slate-900 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    Cập Nhật Mật Khẩu Đăng Nhập
                  </h4>
                  {passwordMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-[11px] dark:bg-emerald-950 dark:text-emerald-300">
                      {passwordMsg}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="Mật khẩu mới..."
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleResetPassword(selectedTeacher)}
                      className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700 transition text-xs shrink-0"
                    >
                      Lưu Mật Khẩu Mới
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Hướng Dẫn Bàn Giao Tài Khoản Cho Giáo Viên
                  </h4>
                  <ol className="list-decimal list-inside text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
                    <li>Trưởng bộ phận bấm <strong>"Sao Chép Thẻ Bàn Giao"</strong> ở trên.</li>
                    <li>Gửi trực tiếp qua Zalo/Email cho giáo viên quản nhiệm.</li>
                    <li>Giáo viên mở hệ thống BOPS, bấm nút <strong>"Đăng nhập"</strong> ở góc trên bên phải.</li>
                    <li>Chọn mã GV <strong>{selectedTeacher.teacherCode}</strong> hoặc nhập email, sau đó nhập mật khẩu <strong>123456</strong>.</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email công vụ</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedTeacher.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Số điện thoại</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedTeacher.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ngày vào làm</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedTeacher.employmentDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Trực đêm</span>
                    <span className="font-semibold text-emerald-600">
                      {selectedTeacher.nightShiftEligible ? 'Đủ điều kiện' : 'Không'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Hệ số Khối lượng (Workload)</span>
                    <span className="font-extrabold text-blue-600">{selectedTeacher.workloadIndex}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">
                    Ghi chú khối lượng công việc
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    Giáo viên quản lý <strong>{selectedTeacher.assignedRoomIds.length || 6} phòng KTX</strong> và{' '}
                    <strong>{selectedTeacher.assignedStudentIds.length || 18} học sinh nội trú</strong>. Hệ số Workload Index{' '}
                    {selectedTeacher.workloadIndex} được tự động tính toán để Trưởng bộ phận đánh giá công bằng trên Dashboard.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-4 text-xs">
                {/* Lịch trực phân công */}
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Lịch Trực Phân Công ({BOPSStore.getSchedules().filter((s) => s.teacherId === selectedTeacher.id).length} Ca)
                  </h4>

                  <div className="space-y-2">
                    {BOPSStore.getSchedules()
                      .filter((s) => s.teacherId === selectedTeacher.id)
                      .slice(0, 5)
                      .map((sch) => (
                        <div
                          key={sch.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              Ca trực: {sch.positionName} ({sch.date})
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Ca {sch.shift} • Vị trí: {sch.positionName}
                              {sch.completionNote && <span className="block italic text-slate-600 mt-0.5">Báo cáo: "{sch.completionNote}"</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {sch.status === 'verified' || sch.evaluationStatus === 'approved' ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                Hoàn thành (Đã duyệt)
                              </span>
                            ) : sch.status === 'rejected' || sch.evaluationStatus === 'rejected' ? (
                              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-800">
                                Chưa tốt {sch.deductedPoints ? `(-${sch.deductedPoints}đ)` : ''}
                              </span>
                            ) : (
                              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                                Chờ duyệt / Đang trực
                              </span>
                            )}

                            <button
                              onClick={() => handleOpenScheduleEvaluation(sch)}
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm transition"
                            >
                              Duyệt / Chi tiết
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Danh sách Công việc / Task */}
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Nhiệm Vụ Vận Hành KTX ({BOPSStore.getTasks().filter((t) => t.teacherId === selectedTeacher.id).length} Nhiệm vụ)
                  </h4>

                  <div className="space-y-2">
                    {BOPSStore.getTasks()
                      .filter((t) => t.teacherId === selectedTeacher.id)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{task.taskName}</div>
                            <div className="text-[10px] text-slate-400">
                              {task.plannedStart} - {task.plannedEnd} • Ca {task.shift}
                            </div>
                            {task.evaluationCriteria && (
                              <div className="text-[10px] text-purple-600 font-semibold mt-0.5">
                                Đánh giá tiêu chí: {task.evaluationCriteria} {task.deductedPoints ? `(-${task.deductedPoints}đ KPI)` : ''}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              task.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                              task.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {task.status === 'verified' ? 'ĐÃ DUYỆT' : task.status === 'rejected' ? 'CHƯA TỐT' : 'ĐANG LÀM'}
                            </span>

                            <button
                              onClick={() => handleOpenTaskEvaluation(task)}
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm transition"
                            >
                              Duyệt Đánh Giá
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'interactions' && (
              <div className="space-y-2 text-xs">
                {BOPSStore.getInteractions()
                  .filter((i) => i.teacherId === selectedTeacher.id)
                  .map((inter) => (
                    <div
                      key={inter.id}
                      className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 dark:border-purple-950 dark:bg-slate-800"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">
                        {inter.studentName} - {inter.topic}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">{inter.summary}</p>
                      <div className="text-[10px] text-slate-400 mt-2">Ngày: {inter.interactionDate}</div>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'kpi' && (
              <div className="space-y-4 text-xs">
                {(() => {
                  const teacherKpi = getTeacherKPI(selectedTeacher.id);
                  return (
                    <>
                      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-md">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-blue-200">
                              Tổng điểm hiệu suất làm việc KPI
                            </span>
                            <div className="text-2xl font-black">{teacherKpi.totalScore} / 100 Điểm</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-blue-200 block">Xếp loại</span>
                            <span className="text-2xl font-black bg-white/20 px-3 py-1 rounded-xl inline-block mt-0.5">
                              Hạng {teacherKpi.rank}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown Table */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <h4 className="font-extrabold text-slate-900 dark:text-white mb-2">Chi Tiết Bộ Tiêu Chí Đánh Giá KPI:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-400 block font-bold">Vận hành ca</span>
                            <span className="text-sm font-extrabold text-blue-600">{teacherKpi.operationScore}/25</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-400 block font-bold">Chất lượng KTX</span>
                            <span className="text-sm font-extrabold text-emerald-600">{teacherKpi.qualityScore}/25</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-400 block font-bold">Chăm sóc HS</span>
                            <span className="text-sm font-extrabold text-purple-600">{teacherKpi.studentCareScore}/20</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-400 block font-bold">Đóng góp Sáng kiến</span>
                            <span className="text-sm font-extrabold text-amber-600">{teacherKpi.contributionScore}/15</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-400 block font-bold">Kỷ luật Quy trình</span>
                            <span className="text-sm font-extrabold text-rose-600">{teacherKpi.disciplineScore}/15</span>
                          </div>
                        </div>
                      </div>

                      {/* Penalty Log */}
                      {teacherKpi.penalties && teacherKpi.penalties.length > 0 && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-950 dark:bg-slate-900">
                          <h4 className="font-extrabold text-rose-900 dark:text-rose-300 mb-2">Lịch Sử Đánh Giá "Chưa Tốt" & Trừ Điểm KPI:</h4>
                          <div className="space-y-1.5">
                            {teacherKpi.penalties.map((pen, idx) => (
                              <div key={idx} className="flex justify-between items-center rounded-xl bg-white dark:bg-slate-800 p-2 border border-rose-100 dark:border-rose-900">
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">{pen.reason}</span>
                                  <span className="text-[10px] text-slate-400 block">{pen.time}</span>
                                </div>
                                <span className="font-black text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-lg text-xs">
                                  -{pen.pointsDeducted} Điểm
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Teacher Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Giáo Viên Quản Nhiệm Mới"
      >
        <form onSubmit={handleAddTeacherSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mã GVQN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: GV024"
                value={newTeacherData.teacherCode}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, teacherCode: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Họ và Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn A"
                value={newTeacherData.fullName}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, fullName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                placeholder="email@school.edu.vn"
                value={newTeacherData.email}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số điện thoại</label>
              <input
                type="tel"
                placeholder="09xx xxx xxx"
                value={newTeacherData.phone}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tòa KTX Quản lý</label>
              <select
                value={newTeacherData.building}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, building: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="DomB">Tòa DomB</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chức danh / Vị trí</label>
              <input
                type="text"
                value={newTeacherData.position}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, position: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Lưu & Tạo Tài Khoản
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal
        isOpen={!!editingTeacher}
        onClose={() => setEditingTeacher(null)}
        title="Chỉnh Sửa Thông Tin Giáo Viên Quản Nhiệm"
      >
        {editingTeacher && (
          <form onSubmit={handleEditTeacherSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mã GVQN
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.teacherCode || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, teacherCode: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.fullName}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingTeacher.email || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editingTeacher.phone || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tòa KTX Quản lý</label>
                <select
                  value={editingTeacher.assignedBuilding || 'DomB'}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, assignedBuilding: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="DomB">Tòa DomB</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chức danh / Vị trí</label>
                <input
                  type="text"
                  value={editingTeacher.position || ''}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, position: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hệ số khối lượng (Workload Index)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2.5"
                value={editingTeacher.workloadIndex || 1.0}
                onChange={(e) => setEditingTeacher({ ...editingTeacher, workloadIndex: parseFloat(e.target.value) || 1.0 })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteTeacher(editingTeacher);
                  setEditingTeacher(null);
                }}
                className="rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 px-3 py-2 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900 transition flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa Giáo viên này</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Cập Nhật
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Handover Account Modal */}
      <Modal
        isOpen={!!handoverTeacher}
        onClose={() => setHandoverTeacher(null)}
        title="Thẻ Bàn Giao Tài Khoản Đăng Nhập"
        subtitle={handoverTeacher ? `${handoverTeacher.fullName} (${handoverTeacher.teacherCode})` : ''}
      >
        {handoverTeacher && (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  Thông tin bàn giao chính thức
                </span>
                {copySuccess && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Đã sao chép!
                  </span>
                )}
              </div>

              <div className="space-y-2 rounded-xl bg-white p-3.5 border border-amber-200/80 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Họ và tên GV:</span>
                  <strong className="text-slate-900 dark:text-white">{handoverTeacher.fullName}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Tài khoản đăng nhập (Viết tắt):</span>
                  <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">{handoverTeacher.username || handoverTeacher.teacherCode}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Mật khẩu đăng nhập:</span>
                  <strong className="text-amber-700 dark:text-amber-300 font-bold">{handoverTeacher.password || handoverTeacher.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Mã GV / Email:</span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">{handoverTeacher.teacherCode} • {handoverTeacher.email}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleCopyCredentials(handoverTeacher)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 p-2.5 font-bold text-white shadow-md hover:bg-amber-700 transition"
              >
                <Copy className="h-4 w-4" />
                <span>Sao Chép Thẻ Bàn Giao (Để gửi Zalo / Email)</span>
              </button>

              <button
                onClick={() => handleQuickSwitchUser(handoverTeacher)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-2.5 font-bold text-white shadow-md hover:bg-blue-700 transition"
              >
                <LogIn className="h-4 w-4" />
                <span>Đăng Nhập Thử Tài Khoản Giáo Viên Này</span>
              </button>

              <button
                onClick={() => setHandoverTeacher(null)}
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Teacher Modal */}
      <ConfirmDeleteModal
        isOpen={!!teacherToDelete}
        onClose={() => setTeacherToDelete(null)}
        onConfirm={confirmDeleteTeacher}
        title="Xác nhận xóa tài khoản giáo viên"
        itemName={teacherToDelete ? `Giáo viên ${teacherToDelete.fullName} (${teacherToDelete.teacherCode})` : ''}
      />

      {/* Work Evaluation Modal */}
      <WorkEvaluationModal
        isOpen={!!evaluationItem}
        onClose={() => setEvaluationItem(null)}
        item={evaluationItem}
        onEvaluate={handleExecuteEvaluation}
      />
    </div>
  );
};
