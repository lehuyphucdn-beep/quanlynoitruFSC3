import React, { useState, useEffect } from 'react';
import {
  MessageSquareHeart,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  FileText,
  User,
  GraduationCap,
  Sparkles,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  BarChart3,
  Filter,
  Bell,
  HeartPulse,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { Interaction1on1, Student, User as UserType } from '../../types';
import { Modal } from '../../components/common/Modal';

export const InteractionCenter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType>(BOPSStore.getCurrentUser());
  const [interactions, setInteractions] = useState<Interaction1on1[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<UserType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'list'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for creating a new interaction
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState('');
  const [observation, setObservation] = useState('');
  const [supportPlan, setSupportPlan] = useState('');
  const [location, setLocation] = useState('Phòng Quản nhiệm Tầng 3');
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('20:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  useEffect(() => {
    const loadData = () => {
      const u = BOPSStore.getCurrentUser();
      setCurrentUser(u);
      setInteractions(BOPSStore.getInteractions());
      setStudents(BOPSStore.getStudents());
      const teachers = BOPSStore.getUsers().filter((usr) => usr.role === 'teacher');
      setAllTeachers(teachers);
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  const isManager = currentUser.role === 'manager';

  // Permission filter for student access:
  // Teacher can only interact with / view their own students
  // Manager can view / interact with all students
  const canTeacherAccessStudent = (s: Student) => {
    if (isManager) return true;
    if (s.uploadedByUserId === currentUser.id) return true;
    if (s.teacherId === currentUser.id) return true;
    if (
      s.teacherName &&
      currentUser.fullName &&
      s.teacherName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()
    ) {
      return true;
    }
    if (
      currentUser.teacherCode &&
      (s.teacherName?.toLowerCase().includes(currentUser.teacherCode.toLowerCase()) ||
        s.uploadedByUserName?.toLowerCase().includes(currentUser.teacherCode.toLowerCase()))
    ) {
      return true;
    }
    return false;
  };

  const availableStudentsForCurrentTeacher = students.filter(canTeacherAccessStudent);
  // In case teacher has no explicitly assigned students yet, fallback to all so they can select
  const studentChoices =
    isManager || availableStudentsForCurrentTeacher.length > 0
      ? availableStudentsForCurrentTeacher
      : students;

  // Interaction logs visible to current user:
  // Teacher: ONLY sees interactions performed by themselves
  // Manager: SEES ALL interactions of all teachers
  const baseVisibleInteractions = isManager
    ? interactions
    : interactions.filter(
        (i) =>
          i.teacherId === currentUser.id ||
          (currentUser.fullName &&
            i.teacherName?.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase())
      );

  // Filtered by Admin teacher selector, priority selector & search query
  const filteredInteractions = baseVisibleInteractions.filter((i) => {
    if (isManager && selectedTeacherFilter !== 'all') {
      const matchedTeacher = allTeachers.find((t) => t.id === selectedTeacherFilter);
      if (matchedTeacher) {
        const matchId = i.teacherId === matchedTeacher.id;
        const matchName =
          i.teacherName?.trim().toLowerCase() === matchedTeacher.fullName.trim().toLowerCase();
        if (!matchId && !matchName) return false;
      }
    }

    if (selectedPriorityFilter !== 'all' && i.priority !== selectedPriorityFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStudent = i.studentName.toLowerCase().includes(q);
      const matchTopic = i.topic.toLowerCase().includes(q);
      const matchSummary = i.summary.toLowerCase().includes(q);
      const matchTeacher = i.teacherName?.toLowerCase().includes(q) || false;
      const matchClass = i.className?.toLowerCase().includes(q) || false;
      const matchRoom = i.roomName?.toLowerCase().includes(q) || false;
      return matchStudent || matchTopic || matchSummary || matchTeacher || matchClass || matchRoom;
    }

    return true;
  });

  // Calculate teacher-specific KPI progress (Current week target: >= 1 student)
  const teacherInteractionsThisWeek = interactions.filter(
    (i) =>
      i.teacherId === currentUser.id ||
      (currentUser.fullName &&
        i.teacherName?.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase())
  );
  const teacherAchievedTarget = teacherInteractionsThisWeek.length >= 1;

  // ADMIN ANALYTICS: Track progress across all teachers
  const teacherProgressStats = allTeachers.map((t) => {
    const teacherLogs = interactions.filter(
      (i) =>
        i.teacherId === t.id ||
        (t.fullName && i.teacherName?.trim().toLowerCase() === t.fullName.trim().toLowerCase())
    );
    const uniqueStudents = new Set(teacherLogs.map((l) => l.studentId)).size;
    const achieved = teacherLogs.length >= 1;
    return {
      teacher: t,
      count: teacherLogs.length,
      studentCount: uniqueStudents,
      achieved,
      lastInteraction: teacherLogs.length > 0 ? teacherLogs[teacherLogs.length - 1] : null,
    };
  });

  const totalTeachers = allTeachers.length;
  const achievedTeachersCount = teacherProgressStats.filter((tp) => tp.achieved).length;
  const pendingTeachersCount = totalTeachers - achievedTeachersCount;
  const completionPercentage =
    totalTeachers > 0 ? Math.round((achievedTeachersCount / totalTeachers) * 100) : 0;

  // Breakdown by priority for admin
  const criticalCount = interactions.filter((i) => i.priority === 'critical').length;
  const highCount = interactions.filter((i) => i.priority === 'high').length;
  const mediumCount = interactions.filter((i) => i.priority === 'medium').length;
  const lowCount = interactions.filter((i) => i.priority === 'low').length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemindTeacher = (teacher: UserType) => {
    BOPSStore.addNotification({
      receiverId: teacher.id,
      title: 'Nhắc nhở chỉ tiêu Tương tác 1-1',
      content: `Thầy/Cô ${teacher.fullName} chưa nhập tương tác học sinh 1-1 trong tuần này. Vui lòng thực hiện tối thiểu 1 học sinh để đạt 15 điểm trọng số KPI (Mục C).`,
      type: 'interaction',
      priority: 'high',
    });
    showToast(`Đã gửi thông báo nhắc nhở chỉ tiêu tương tác 1-1 đến "${teacher.fullName}"`);
  };

  const handleRemindAllPending = () => {
    const pending = teacherProgressStats.filter((tp) => !tp.achieved);
    pending.forEach((tp) => {
      BOPSStore.addNotification({
        receiverId: tp.teacher.id,
        title: 'Nhắc nhở chỉ tiêu Tương tác 1-1 tuần',
        content: `Thầy/Cô ${tp.teacher.fullName} lưu ý hoàn thành tối thiểu 1 lượt tương tác học sinh 1-1 trong tuần để đạt 15 điểm KPI trọng số.`,
        type: 'interaction',
        priority: 'high',
      });
    });
    showToast(`Đã gửi thông báo nhắc nhở đến tất cả ${pending.length} GVQN chưa đạt chỉ tiêu`);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !topic.trim() || !summary.trim() || !supportPlan.trim()) {
      alert('Vui lòng điền đầy đủ: Chọn học sinh, Chủ đề, Tóm tắt trao đổi và Kế hoạch hỗ trợ!');
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const todayDate = new Date().toISOString().substring(0, 10);

    BOPSStore.addInteraction({
      teacherId: currentUser.id,
      teacherName: currentUser.fullName,
      studentId: student.id,
      studentName: student.fullName,
      className: student.className,
      roomName: student.roomName,
      interactionDate: todayDate,
      startTime,
      endTime,
      durationMinutes: 30,
      location,
      topic: topic.trim(),
      summary: summary.trim(),
      observation: observation.trim(),
      supportPlan: supportPlan.trim(),
      priority,
    });

    setShowAddModal(false);
    showToast(`Đã lưu thành công nhật ký tương tác 1-1 cho học sinh "${student.fullName}"`);

    // Reset form
    setSelectedStudentId('');
    setTopic('');
    setSummary('');
    setObservation('');
    setSupportPlan('');
    setPriority('medium');
  };

  const handleDeleteInteraction = (item: Interaction1on1) => {
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa nhật ký tương tác 1-1 của học sinh "${item.studentName}" (Chủ đề: ${item.topic}) không?`
      )
    ) {
      BOPSStore.deleteInteraction(item.id);
      showToast(`Đã xóa nhật ký tương tác của học sinh "${item.studentName}"`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-purple-900 px-5 py-3 text-xs font-bold text-white shadow-2xl animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <MessageSquareHeart className="h-4 w-4" />
            <span>Student Care 1-1 • Hồ sơ Chăm sóc Học sinh</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {isManager
              ? 'Trung Tâm Giám Sát & Phân Tích Tương Tác 1-1 Toàn Trường'
              : 'Nhật Ký Tương Tác 1-1 & Chăm Sóc Học Sinh Của Thầy/Cô'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isManager
              ? 'Tài khoản Quản lý xem toàn bộ nhật ký của tất cả GVQN, theo dõi tiến độ chỉ tiêu tuần và phân tích dữ liệu tổng thể.'
              : 'Thầy/Cô chỉ theo dõi và nhập dữ liệu học sinh thuộc diện quản nhiệm của mình. Dữ liệu được đồng bộ trực tiếp lên hệ thống quản lý.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isManager && (
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => setActiveAdminTab('overview')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeAdminTab === 'overview'
                    ? 'bg-white text-purple-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Phân tích Tổng quan</span>
              </button>
              <button
                onClick={() => setActiveAdminTab('list')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeAdminTab === 'list'
                    ? 'bg-white text-purple-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Nhật ký Tất cả GV ({interactions.length})</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nhập Tương tác 1-1</span>
          </button>
        </div>
      </div>

      {/* TEACHER VIEW: Progress & Compliance Card */}
      {!isManager && (
        <div className="rounded-3xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-purple-50/40 p-5 shadow-sm dark:border-purple-950 dark:from-purple-950/30 dark:via-slate-900 dark:to-purple-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white font-black text-xs">
                  C
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Chỉ Tiêu Tương Tác Học Sinh 1-1 (Mục C - Trọng Số KPI 15 Điểm)
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Quy định hệ thống: Tuần đó <strong>tối thiểu nhập tương tác 1 học sinh</strong> để đạt trọn vẹn <strong>15 điểm trọng số</strong>. Nếu không nhập (0 học sinh) sẽ <strong>không đạt (0 điểm)</strong>.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-purple-100 dark:border-slate-700 shrink-0">
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Tiến độ tuần này</div>
                <div className="text-2xl font-black text-purple-600">
                  {teacherInteractionsThisWeek.length} / 1 HS
                </div>
              </div>
              <div className="border-l pl-3 border-purple-100 dark:border-slate-700">
                {teacherAchievedTarget ? (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Đạt 15đ Trọng số
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-3 py-1 text-xs font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Chưa đạt (0đ)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN OVERVIEW DASHBOARD: Full School Analytics */}
      {isManager && activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Tiến độ GVQN đạt chỉ tiêu */}
            <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-bold">GVQN Đạt Chỉ Tiêu Tuần</span>
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-600">
                  {achievedTeachersCount}/{totalTeachers}
                </span>
                <span className="text-xs font-bold text-slate-500">GV ({completionPercentage}%)</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {pendingTeachersCount > 0 ? (
                  <span className="text-rose-600 font-bold dark:text-rose-400">
                    Còn {pendingTeachersCount} GV chưa nhập (0đ KPI)
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold">100% GV đã hoàn thành chỉ tiêu</span>
                )}
              </div>
            </div>

            {/* 2. Tổng số lượt tương tác 1-1 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-bold">Tổng Lượt Tương Tác 1-1</span>
                <MessageSquareHeart className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-600">{interactions.length}</span>
                <span className="text-xs font-bold text-slate-500">lượt trao đổi</span>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Toàn bộ dữ liệu chăm sóc học sinh từ 23 Giáo viên Quản nhiệm
              </p>
            </div>

            {/* 3. Phân loại Khẩn cấp & Cần chú ý */}
            <div className="rounded-3xl border border-rose-200 bg-rose-50/30 p-5 shadow-sm dark:border-rose-950 dark:bg-slate-900">
              <div className="flex items-center justify-between text-rose-700 text-xs">
                <span className="font-bold">Mức Độ Cần Chú Ý Cao</span>
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600">
                  {criticalCount + highCount}
                </span>
                <span className="text-xs font-bold text-slate-500">trường hợp</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className="rounded-lg bg-rose-600 px-2 py-0.5 font-bold text-white">
                  {criticalCount} Khẩn cấp
                </span>
                <span className="rounded-lg bg-amber-500 px-2 py-0.5 font-bold text-white">
                  {highCount} Ưu tiên cao
                </span>
              </div>
            </div>

            {/* 4. Tổng số học sinh được hỗ trợ */}
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-bold">Học Sinh Được Hỗ Trợ</span>
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600">
                  {new Set(interactions.map((i) => i.studentId)).size}
                </span>
                <span className="text-xs font-bold text-slate-500">học sinh</span>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Học sinh nhận sự đồng hành tâm lý, nền nếp và hòa nhập KTX
              </p>
            </div>
          </div>

          {/* Bảng Giám Sát Tiến Độ Từng Giáo Viên Quản Nhiệm (KPI Mục C) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  Bảng Theo Dõi Tiến Độ Chỉ Tiêu Tương Tác 1-1 Theo Từng GVQN
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đối soát chỉ tiêu tuần: Tối thiểu 1 HS tương tác 1-1 = Đạt 15đ trọng số (Không nhập = 0đ)
                </p>
              </div>

              {pendingTeachersCount > 0 && (
                <button
                  type="button"
                  onClick={handleRemindAllPending}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-600 transition"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Nhắc nhở {pendingTeachersCount} GV chưa đạt</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider dark:border-slate-800">
                    <th className="py-2.5 px-3">Giáo viên Quản nhiệm</th>
                    <th className="py-2.5 px-3">Mã GV</th>
                    <th className="py-2.5 px-3 text-center">Số Lượt Tương Tác</th>
                    <th className="py-2.5 px-3 text-center">Số HS Đã Chăm Sóc</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái Mục C (15đ)</th>
                    <th className="py-2.5 px-3">Tương tác gần nhất</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {teacherProgressStats.map((item) => (
                    <tr
                      key={item.teacher.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.teacher.avatar}
                            alt={item.teacher.fullName}
                            className="h-7 w-7 rounded-full object-cover ring-1 ring-purple-300 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.teacher.fullName}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {item.teacher.buildingResponsible || 'Khối KTX'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.teacher.teacherCode || 'N/A'}
                      </td>

                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg ${
                            item.count > 0
                              ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}
                        >
                          {item.count} lượt
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.studentCount} HS
                      </td>

                      <td className="py-3 px-3 text-center">
                        {item.achieved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Đạt 15đ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <XCircle className="h-3 w-3 text-rose-600" />
                            Không đạt (0đ)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {item.lastInteraction ? (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.lastInteraction.studentName}
                            </span>{' '}
                            <span className="text-[10px] text-slate-400">
                              ({item.lastInteraction.interactionDate})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có nhật ký</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacherFilter(item.teacher.id);
                              setActiveAdminTab('list');
                            }}
                            className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300"
                            title="Xem các nhật ký của GV này"
                          >
                            Xem nhật ký
                          </button>
                          {!item.achieved && (
                            <button
                              type="button"
                              onClick={() => handleRemindTeacher(item.teacher)}
                              className="rounded-lg bg-amber-50 p-1 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300"
                              title="Gửi thông báo nhắc nhở"
                            >
                              <Bell className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED LOGS VIEW (Visible always for Teacher, and in 'list' tab for Admin) */}
      {(!isManager || activeAdminTab === 'list') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isManager
                    ? 'Tìm theo tên học sinh, lớp, phòng, chủ đề, tên giáo viên...'
                    : 'Tìm theo tên học sinh của Thầy/Cô, chủ đề tư vấn...'
                }
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Admin Filter: By Teacher */}
            {isManager && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">Lọc theo GV:</span>
                <select
                  value={selectedTeacherFilter}
                  onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="all">-- Tất cả {allTeachers.length} Giáo viên --</option>
                  {allTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.teacherCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">Ưu tiên:</span>
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="all">Tất cả mức độ</option>
                <option value="critical">🚨 Khẩn cấp (Critical)</option>
                <option value="high">⚠️ Ưu tiên cao (High)</option>
                <option value="medium">🔹 Trung bình (Medium)</option>
                <option value="low">Tiêu chuẩn (Low)</option>
              </select>
            </div>
          </div>

          {/* Result Count and Active Filters Notice */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Hiển thị <strong>{filteredInteractions.length}</strong> nhật ký tương tác 1-1
              {selectedTeacherFilter !== 'all' && (
                <span className="ml-1 text-purple-600 font-bold">
                  (Đang lọc theo:{' '}
                  {allTeachers.find((t) => t.id === selectedTeacherFilter)?.fullName})
                </span>
              )}
            </span>
            {selectedTeacherFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTeacherFilter('all')}
                className="text-purple-600 hover:underline font-bold text-[11px]"
              >
                Xem tất cả giáo viên
              </button>
            )}
          </div>

          {/* Timeline List */}
          <div className="space-y-4">
            {filteredInteractions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-400 dark:border-slate-800 space-y-2">
                <MessageSquareHeart className="mx-auto h-8 w-8 text-slate-400" />
                <div className="font-bold text-sm text-slate-600 dark:text-slate-300">
                  Chưa có nhật ký tương tác 1-1 nào phù hợp với bộ lọc
                </div>
                <p className="text-xs max-w-md mx-auto">
                  {isManager
                    ? 'Chưa có nhật ký tương tác nào từ các giáo viên được chọn.'
                    : 'Thầy/Cô chưa có nhật ký tương tác 1-1 nào. Hãy bấm "+ Nhập Tương tác 1-1" ở trên để ghi nhận ngay!'}
                </p>
              </div>
            ) : (
              filteredInteractions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {item.studentName} ({item.className})
                        </span>
                        <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {item.roomName}
                        </span>
                        {item.priority === 'critical' && (
                          <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            🚨 KHẨN CẤP
                          </span>
                        )}
                        {item.priority === 'high' && (
                          <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            ⚠️ Ưu tiên cao
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs font-bold text-purple-600 dark:text-purple-400">
                        Chủ đề: {item.topic}
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-400">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-end gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-purple-500" />
                        <span>{item.interactionDate}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {item.startTime} - {item.endTime} • {item.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">
                        Tóm tắt trao đổi với học sinh:
                      </strong>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    {item.observation && (
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200">
                          Quan sát của Giáo viên:
                        </strong>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {item.observation}
                        </p>
                      </div>
                    )}

                    <div className="rounded-2xl bg-purple-50/70 p-3 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                      <strong className="text-purple-800 dark:text-purple-300">
                        Kế hoạch Hỗ trợ (Support Plan):
                      </strong>
                      <p className="text-slate-700 dark:text-slate-200 mt-0.5 font-medium leading-relaxed">
                        {item.supportPlan}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span>
                        Giáo viên thực hiện:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">
                          {item.teacherName}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Mức độ ưu tiên:{' '}
                        <strong className="text-purple-600 dark:text-purple-400 font-bold uppercase">
                          {item.priority}
                        </strong>
                      </span>
                    </div>

                    {/* Only the teacher who created the interaction OR the Admin can delete */}
                    {(isManager || item.teacherId === currentUser.id) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteInteraction(item)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900 transition shadow-sm"
                        title="Xóa nhật ký tương tác này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Thêm Tương tác 1-1 Mới */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nhập Tương Tác 1-1 Chăm Sóc Học Sinh"
        subtitle={
          isManager
            ? 'Hồ sơ chăm sóc học sinh nội trú toàn trường (Tài khoản Quản lý)'
            : `Thầy/Cô ${currentUser.fullName} nhập hồ sơ chăm sóc học sinh (Chỉ tiêu KPI tuần: ≥ 1 HS)`
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chọn Học sinh * {isManager ? '(Học sinh nội trú toàn trường)' : `(${studentChoices.length} học sinh)`}
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 font-semibold focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Chọn học sinh cần tương tác 1-1 --</option>
              {studentChoices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentCode}) - Lớp {s.className} - Phòng {s.roomName}
                  {s.specialCare ? ' [⚠️ Cần theo dõi]' : ''}
                </option>
              ))}
            </select>
            {!isManager && availableStudentsForCurrentTeacher.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Lưu ý: Thầy/Cô chưa có học sinh gán riêng. Đang hiển thị danh sách chung để Thầy/Cô chọn tương tác.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
              >
                <option value="low">Tiêu chuẩn (Low)</option>
                <option value="medium">Trung bình (Medium)</option>
                <option value="high">Ưu tiên cao (High)</option>
                <option value="critical">Khẩn cấp (Critical)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giờ bắt đầu
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="19:30"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giờ kết thúc
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="20:00"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Địa điểm tương tác
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Phòng Quản nhiệm Tầng 3, Sảnh sinh hoạt chung KTX"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chủ đề tương tác *
            </label>
            <input
              required
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Tư vấn tâm lý áp lực học tập, hòa nhập bạn cùng phòng, động viên sức khỏe..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung tóm tắt trao đổi *
            </label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Tóm tắt ngắn gọn nội dung học sinh chia sẻ, vướng mắc gặp phải..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quan sát & Đánh giá của Giáo viên
            </label>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Nhận xét thái độ, tâm lý, sức khỏe, cử chỉ của học sinh trong buổi trao đổi..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-bold text-purple-700 dark:text-purple-400 mb-1">
              Kế hoạch Hỗ trợ Học sinh (Support Plan) *
            </label>
            <textarea
              required
              rows={2}
              value={supportPlan}
              onChange={(e) => setSupportPlan(e.target.value)}
              placeholder="Đề xuất hành động tiếp theo (phối hợp GVCN, liên hệ phụ huynh, phân công bạn giúp đỡ...)"
              className="w-full rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 text-slate-900 dark:border-purple-900 dark:bg-slate-800 dark:text-white leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-md hover:bg-purple-700 transition"
            >
              Lưu Tương Tác 1-1
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
