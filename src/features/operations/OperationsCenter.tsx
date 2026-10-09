import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Search,
  Filter,
  Check,
  X,
  FileText,
  Clock,
  Building2,
  Phone,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Edit,
  RotateCcw,
  CheckSquare,
  Eye,
  MessageSquare,
  HelpCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { User, DailyEvaluation, ScheduleAssignment, KPIRecord } from '../../types';
import { Modal } from '../../components/common/Modal';
import { VietnamDatePicker } from '../../components/common/VietnamDatePicker';

interface OperationsCenterProps {
  setActiveModule?: (mod: string) => void;
}

// KPI Category Definition for Daily Evaluation
interface KPICategoryDefinition {
  key: 'operation' | 'quality' | 'studentCare' | 'contribution' | 'discipline';
  title: string;
  maxScore: number;
  iconText: string;
  color: string;
  presetViolations: {
    label: string;
    penalty: number;
  }[];
}

const KPI_CATEGORIES: KPICategoryDefinition[] = [
  {
    key: 'operation',
    title: '1. Vận hành ca trực (Tối đa 50đ)',
    maxScore: 50,
    iconText: '⏰',
    color: 'blue',
    presetViolations: [
      { label: 'Quên điểm danh', penalty: 10 },
      { label: 'Đi muộn ca trực / Bàn giao ca trễ', penalty: 5 },
      { label: 'Không tuần tra an ninh hành lang KTX đủ lượt', penalty: 5 },
      { label: 'Bàn giao ca trực sơ sài, thiếu thông tin', penalty: 5 },
      { label: 'Không nộp báo cáo ca trực đúng hạn', penalty: 5 },
    ],
  },
  {
    key: 'quality',
    title: '2. Chất lượng & Nền nếp KTX (Tối đa 20đ)',
    maxScore: 20,
    iconText: '🧹',
    color: 'emerald',
    presetViolations: [
      { label: 'Phòng KTX phụ trách để bẩn, rác chưa thu dọn', penalty: 5 },
      { label: 'Học sinh làm ồn, mất trật tự sau giờ giới nghiêm', penalty: 5 },
      { label: 'Chưa kiểm tra an toàn điện nước / CSVC phòng', penalty: 5 },
      { label: 'Không chấn chỉnh học sinh vi phạm nền nếp phòng', penalty: 5 },
    ],
  },
  {
    key: 'studentCare',
    title: '3. Chăm sóc HS & Tương tác 1-1 (Tối đa 15đ)',
    maxScore: 15,
    iconText: '🩺',
    color: 'rose',
    presetViolations: [
      { label: 'Bỏ sót học sinh ốm đau / cần chăm sóc y tế', penalty: 5 },
      { label: 'Chưa đạt chỉ tiêu nhật ký tương tác 1-1 tuần', penalty: 5 },
      { label: 'Không cập nhật hồ sơ học sinh diện theo dõi', penalty: 5 },
      { label: 'Thiếu sâu sát khi học sinh có biểu hiện bất an', penalty: 5 },
    ],
  },
  {
    key: 'contribution',
    title: '4. Đóng góp & Trách nhiệm (Tối đa 10đ)',
    maxScore: 10,
    iconText: '🤝',
    color: 'purple',
    presetViolations: [
      { label: 'Không tham gia hỗ trợ hoạt động ngoại khóa / KTX', penalty: 5 },
      { label: 'Thiếu tinh thần phối hợp hỗ trợ đồng đội trong ca', penalty: 5 },
    ],
  },
  {
    key: 'discipline',
    title: '5. Kỷ luật & Tác phong (Tối đa 5đ)',
    maxScore: 5,
    iconText: '⚖️',
    color: 'amber',
    presetViolations: [
      { label: 'Tác phong, trang phục chưa đúng quy định nhà trường', penalty: 2 },
      { label: 'Tự ý rời vị trí trực mà không báo cáo quản lý', penalty: 5 },
      { label: 'Ứng xử, giao tiếp chưa chuẩn mực với HS hoặc phụ huynh', penalty: 5 },
    ],
  },
];

export const OperationsCenter: React.FC<OperationsCenterProps> = ({ setActiveModule }) => {
  const [currentUser, setCurrentUser] = useState<User>(BOPSStore.getCurrentUser());
  const [teachers, setTeachers] = useState<User[]>([]);
  const [dailyEvaluations, setDailyEvaluations] = useState<DailyEvaluation[]>([]);
  const [schedules, setSchedules] = useState<ScheduleAssignment[]>([]);
  const [kpis, setKPIs] = useState<KPIRecord[]>([]);

  // Selected date state
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'incomplete' | 'pending'>('all');

  // Success Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for "Chưa Hoàn Thành" Evaluation
  const [evaluatingTeacher, setEvaluatingTeacher] = useState<User | null>(null);
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [scoreDeductions, setScoreDeductions] = useState<{
    operation: number;
    quality: number;
    studentCare: number;
    contribution: number;
    discipline: number;
  }>({
    operation: 0,
    quality: 0,
    studentCare: 0,
    contribution: 0,
    discipline: 0,
  });
  const [customComment, setCustomComment] = useState<string>('');
  const [improvements, setImprovements] = useState<string>('');

  // Load store data
  useEffect(() => {
    const loadData = () => {
      setCurrentUser(BOPSStore.getCurrentUser());
      setTeachers(BOPSStore.getUsers().filter((u) => u.role === 'teacher'));
      setDailyEvaluations(BOPSStore.getDailyEvaluations());
      setSchedules(BOPSStore.getSchedules());
      setKPIs(BOPSStore.getKPIs());
    };
    loadData();
    const unsub = subscribeToStore(loadData);
    return unsub;
  }, []);

  // Helpers to shift dates
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Get daily evaluation record for teacher on selected date
  const getTeacherEvaluation = (teacherId: string): DailyEvaluation | undefined => {
    return dailyEvaluations.find((e) => e.teacherId === teacherId && e.date === selectedDate);
  };

  // Get teacher's schedule on selected date
  const getTeacherSchedule = (teacherId: string): ScheduleAssignment | undefined => {
    return schedules.find((s) => s.teacherId === teacherId && s.date === selectedDate);
  };

  // Format date display
  const formatDateDisplay = (dateString: string) => {
    const d = new Date(dateString);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayOfWeek = dayNames[d.getDay()];
    const [year, month, day] = dateString.split('-');
    return `${dayOfWeek}, Ngày ${day}/${month}/${year}`;
  };

  // =========================================================================
  // FAST ACTION 1: ADMIN TICK "ĐÃ HOÀN THÀNH" (1-TOUCH)
  // =========================================================================
  const handleMarkCompleted = (teacher: User) => {
    BOPSStore.addOrUpdateDailyEvaluation({
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      teacherCode: teacher.teacherCode || 'GVQN',
      date: selectedDate,
      operationScore: 50,
      qualityScore: 20,
      studentCareScore: 15,
      contributionScore: 10,
      disciplineScore: 5,
      generalComment: `Admin Thầy Lê Huy Phúc xác nhận: Thầy/Cô ${teacher.fullName} đã hoàn thành tốt 100% nhiệm vụ công việc ca trực ngày ${selectedDate}.`,
      strengths: 'Chấp hành nghiêm túc quy trình trực, quản lý tốt nền nếp và sức khỏe học sinh.',
    });

    // Also mark related tasks or schedules for this day as verified if any
    const relatedSchedule = getTeacherSchedule(teacher.id);
    if (relatedSchedule) {
      BOPSStore.evaluateWorkItem({
        itemType: 'schedule',
        itemId: relatedSchedule.id,
        managerName: currentUser.fullName,
        evaluation: 'approved',
        reason: 'Quản lý duyệt hoàn thành nhiệm vụ ngày',
      });
    }

    // Gửi thông báo trực tiếp đến giáo viên
    BOPSStore.addNotification({
      receiverId: teacher.id,
      title: `Đánh giá ca trực ngày ${selectedDate} • Hoàn thành 100đ (Hạng A+)`,
      content: `Quản lý Thầy Lê Huy Phúc đã thẩm định ca trực ngày ${selectedDate} của Thầy/Cô: Hoàn thành tốt 100% nhiệm vụ. Điểm KPI đã được tự động đồng bộ sang mục Đánh giá KPI & Xếp hạng.`,
      type: 'kpi',
      priority: 'medium',
    });

    showToast(`✅ Đã xác nhận HOÀN THÀNH (100đ - A+) & gửi thông báo đến Thầy/Cô ${teacher.fullName}!`);
  };

  // =========================================================================
  // FAST ACTION 2: MARK ALL TEACHERS COMPLETED FOR TODAY
  // =========================================================================
  const handleMarkAllCompleted = () => {
    teachers.forEach((t) => {
      BOPSStore.addOrUpdateDailyEvaluation({
        teacherId: t.id,
        teacherName: t.fullName,
        teacherCode: t.teacherCode || 'GVQN',
        date: selectedDate,
        operationScore: 50,
        qualityScore: 20,
        studentCareScore: 15,
        contributionScore: 10,
        disciplineScore: 5,
        generalComment: `Quản lý Thầy Lê Huy Phúc duyệt hàng loạt: Hoàn thành tốt 100% nhiệm vụ ca trực ngày ${selectedDate}.`,
        strengths: 'Đảm bảo nghiêm túc kỷ luật và chăm sóc học sinh.',
      });

      BOPSStore.addNotification({
        receiverId: t.id,
        title: `Đánh giá ca trực ngày ${selectedDate} • Hoàn thành 100đ (Hạng A+)`,
        content: `Quản lý Thầy Lê Huy Phúc đã duyệt hoàn thành nhiệm vụ ca trực ngày ${selectedDate}. Điểm KPI: 100đ (Hạng A+).`,
        type: 'kpi',
        priority: 'medium',
      });
    });

    showToast(`🎉 Đã duyệt HOÀN THÀNH TẤT CẢ & gửi thông báo đến toàn bộ ${teachers.length} GVQN ngày ${selectedDate}!`);
  };

  // =========================================================================
  // ACTION 3: OPEN "CHƯA HOÀN THÀNH" MODAL
  // =========================================================================
  const handleOpenIncompleteModal = (teacher: User) => {
    setEvaluatingTeacher(teacher);
    const existing = getTeacherEvaluation(teacher.id);

    if (existing && existing.totalScore < 100) {
      // Load existing deductions
      setScoreDeductions({
        operation: 50 - existing.operationScore,
        quality: 20 - existing.qualityScore,
        studentCare: 15 - existing.studentCareScore,
        contribution: 10 - existing.contributionScore,
        discipline: 5 - existing.disciplineScore,
      });
      setCustomComment(existing.generalComment || '');
      setImprovements(existing.improvements || '');
      setSelectedViolations([]);
    } else {
      // Default initial deduction
      setScoreDeductions({
        operation: 5,
        quality: 0,
        studentCare: 0,
        contribution: 0,
        discipline: 0,
      });
      setSelectedViolations([]);
      setCustomComment('');
      setImprovements('');
    }
  };

  // Toggle Preset Violation
  const handleToggleViolation = (catKey: keyof typeof scoreDeductions, label: string, penalty: number) => {
    const exists = selectedViolations.includes(label);
    let updatedViolations: string[];
    let newDeductions = { ...scoreDeductions };

    if (exists) {
      updatedViolations = selectedViolations.filter((v) => v !== label);
      newDeductions[catKey] = Math.max(0, newDeductions[catKey] - penalty);
    } else {
      updatedViolations = [...selectedViolations, label];
      const maxForCat = KPI_CATEGORIES.find((c) => c.key === catKey)?.maxScore || 50;
      newDeductions[catKey] = Math.min(maxForCat, newDeductions[catKey] + penalty);
    }

    setSelectedViolations(updatedViolations);
    setScoreDeductions(newDeductions);

    // Auto update comment with violation names if empty
    if (!customComment || customComment.startsWith('Chưa hoàn thành:')) {
      if (updatedViolations.length > 0) {
        setCustomComment(`Chưa hoàn thành: ${updatedViolations.join(', ')}.`);
      } else {
        setCustomComment('');
      }
    }
  };

  // Submit Incomplete Evaluation
  const handleSubmitIncomplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingTeacher) return;

    const opScore = Math.max(0, 50 - scoreDeductions.operation);
    const qScore = Math.max(0, 20 - scoreDeductions.quality);
    const careScore = Math.max(0, 15 - scoreDeductions.studentCare);
    const contScore = Math.max(0, 10 - scoreDeductions.contribution);
    const discScore = Math.max(0, 5 - scoreDeductions.discipline);

    const totalDeducted =
      scoreDeductions.operation +
      scoreDeductions.quality +
      scoreDeductions.studentCare +
      scoreDeductions.contribution +
      scoreDeductions.discipline;

    const comment =
      customComment.trim() ||
      `Chưa hoàn thành công việc ngày ${selectedDate}: Trừ ${totalDeducted} điểm KPI theo các tiêu chí đã ghi nhận.`;

    BOPSStore.addOrUpdateDailyEvaluation({
      teacherId: evaluatingTeacher.id,
      teacherName: evaluatingTeacher.fullName,
      teacherCode: evaluatingTeacher.teacherCode || 'GVQN',
      date: selectedDate,
      operationScore: opScore,
      qualityScore: qScore,
      studentCareScore: careScore,
      contributionScore: contScore,
      disciplineScore: discScore,
      generalComment: comment,
      improvements: improvements.trim() || 'Cần rút kinh nghiệm và chấn chỉnh ngay trong ca trực tiếp theo.',
    });

    // Also update schedule/task as rejected with penalty
    const relatedSchedule = getTeacherSchedule(evaluatingTeacher.id);
    if (relatedSchedule) {
      BOPSStore.evaluateWorkItem({
        itemType: 'schedule',
        itemId: relatedSchedule.id,
        managerName: currentUser.fullName,
        evaluation: 'rejected',
        criteriaLabel: 'Nhiệm vụ ca trực & KPI',
        deductedPoints: totalDeducted,
        reason: comment,
      });
    }

    // Gửi thông báo trực tiếp đến giáo viên
    const finalScore = opScore + qScore + careScore + contScore + discScore;
    let finalRank = 'B';
    if (finalScore >= 97 && discScore === 5) finalRank = 'A+';
    else if (finalScore >= 90) finalRank = 'A';
    else if (finalScore >= 80) finalRank = 'B';
    else if (finalScore >= 70) finalRank = 'C';
    else finalRank = 'D';

    BOPSStore.addNotification({
      receiverId: evaluatingTeacher.id,
      title: `Đánh giá ca trực ngày ${selectedDate} • Chưa hoàn thành (-${totalDeducted}đ)`,
      content: `Quản lý Thầy Lê Huy Phúc ghi nhận: ${comment}. Điểm KPI của Thầy/Cô: ${finalScore}/100đ (Xếp hạng ${finalRank}). Yêu cầu: "${improvements.trim() || 'Rút kinh nghiệm và chấn chỉnh trong ca trực tiếp theo'}"`,
      type: 'kpi',
      priority: 'high',
    });

    showToast(`⚠️ Đã ghi nhận CHƯA HOÀN THÀNH (-${totalDeducted}đ) & gửi thông báo đến Thầy/Cô ${evaluatingTeacher.fullName}!`);
    setEvaluatingTeacher(null);
  };

  // Calculate live preview score in modal
  const previewOperation = Math.max(0, 50 - scoreDeductions.operation);
  const previewQuality = Math.max(0, 20 - scoreDeductions.quality);
  const previewCare = Math.max(0, 15 - scoreDeductions.studentCare);
  const previewContribution = Math.max(0, 10 - scoreDeductions.contribution);
  const previewDiscipline = Math.max(0, 5 - scoreDeductions.discipline);
  const previewTotal =
    previewOperation + previewQuality + previewCare + previewContribution + previewDiscipline;

  let previewRank = 'B';
  if (previewTotal >= 97 && previewDiscipline === 5) previewRank = 'A+';
  else if (previewTotal >= 90) previewRank = 'A';
  else if (previewTotal >= 80) previewRank = 'B';
  else if (previewTotal >= 70) previewRank = 'C';
  else previewRank = 'D';

  // =========================================================================
  // STATS FOR SELECTED DATE
  // =========================================================================
  const completedCount = teachers.filter((t) => {
    const ev = getTeacherEvaluation(t.id);
    return ev && ev.totalScore === 100;
  }).length;

  const incompleteCount = teachers.filter((t) => {
    const ev = getTeacherEvaluation(t.id);
    return ev && ev.totalScore < 100;
  }).length;

  const pendingCount = teachers.length - completedCount - incompleteCount;
  const completionPercent = teachers.length > 0 ? Math.round((completedCount / teachers.length) * 100) : 0;

  // Filtered teachers list
  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.fullName.toLowerCase().includes(q) ||
      (t.teacherCode || '').toLowerCase().includes(q) ||
      (t.phone || '').includes(q) ||
      (t.assignedRooms || []).some((r) => r.toLowerCase().includes(q));

    const ev = getTeacherEvaluation(t.id);
    const isCompleted = ev && ev.totalScore === 100;
    const isIncomplete = ev && ev.totalScore < 100;
    const isPending = !ev;

    let matchStatus = true;
    if (filterStatus === 'completed') matchStatus = !!isCompleted;
    else if (filterStatus === 'incomplete') matchStatus = !!isIncomplete;
    else if (filterStatus === 'pending') matchStatus = !!isPending;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-600/30 animate-bounce">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Activity className="h-4 w-4" />
            <span>Điều Hành Ca & Kiểm Tra Tiến Độ Trực Nhật</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <span>Trung Tâm Vận Hành - Kiểm Tra Công Việc Hằng Ngày</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Admin Check
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin kiểm tra danh sách GVQN theo ngày, tick chọn hoàn thành công việc hoặc ghi nhận chưa hoàn thành kèm các mục trừ điểm KPI & xếp hạng.
          </p>
        </div>

        {/* Quick Batch Complete Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllCompleted}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition active:scale-95"
            title="Duyệt hoàn thành 100% công việc cho tất cả giáo viên ngày hôm nay"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>✓ Tick Hoàn Thành Tất Cả GV ({teachers.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THANH ĐIỀU HƯỚNG NGÀY & BỘ LỌC KIỂM TRA CHO ADMIN                          */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Bộ chọn Ngày hiển thị */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày kiểm tra:</span>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={() => handleShiftDate(-1)}
                className="rounded-xl p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                title="Ngày hôm trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-3 py-1 font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>{formatDateDisplay(selectedDate)}</span>
              </div>

              <button
                onClick={() => handleShiftDate(1)}
                className="rounded-xl p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                title="Ngày tiếp theo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                selectedDate === todayStr
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Hôm nay
            </button>

            {/* Input chọn ngày trực tiếp */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Ô tìm kiếm nhanh GVQN */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã GV, phòng KTX..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Thống kê tiến độ kiểm tra ngày & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 mr-1">Bộ lọc:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Tất cả GV ({teachers.length})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filterStatus === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              ✅ Đã hoàn thành ({completedCount})
            </button>
            <button
              onClick={() => setFilterStatus('incomplete')}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filterStatus === 'incomplete'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              ❌ Chưa hoàn thành ({incompleteCount})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              ⏳ Chưa check ({pendingCount})
            </button>
          </div>

          <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-slate-400">
            <span>Tiến độ ngày:</span>
            <div className="flex items-center gap-2">
              <div className="w-28 h-2.5 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="font-bold text-emerald-600">{completionPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DANH SÁCH GIÁO VIÊN & CỘT TICK CHỌN HOÀN THÀNH / CHƯA HOÀN THÀNH          */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 dark:bg-slate-800/50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Bảng Kiểm Tra & Đánh Giá Công Việc Ngày Của Giáo Viên Quản Nhiệm
            </h3>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {filteredTeachers.length} Giáo viên
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Admin bấm tick để duyệt Hoàn thành ngay hoặc bấm Chưa hoàn thành để ghi nhận lỗi trừ điểm KPI
          </span>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Không tìm thấy giáo viên quản nhiệm nào phù hợp với điều kiện tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5">Giáo viên Quản nhiệm</th>
                  <th className="p-3.5">Khu vực KTX & Ca trực</th>
                  <th className="p-3.5 text-center">Trạng thái công việc ngày</th>
                  <th className="p-3.5 text-center w-64">Thao tác Admin Check</th>
                  <th className="p-3.5">Chi tiết ghi nhận / Điểm KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeachers.map((teacher, idx) => {
                  const ev = getTeacherEvaluation(teacher.id);
                  const sched = getTeacherSchedule(teacher.id);
                  const isCompleted = ev && ev.totalScore === 100;
                  const isIncomplete = ev && ev.totalScore < 100;
                  const isPending = !ev;

                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-slate-50/80 transition dark:hover:bg-slate-800/40 ${
                        isIncomplete
                          ? 'bg-rose-50/40 dark:bg-rose-950/15'
                          : isCompleted
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>

                      {/* GVQN */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-2xl font-black text-xs text-white shadow-sm ${
                              isIncomplete
                                ? 'bg-rose-600'
                                : isCompleted
                                ? 'bg-emerald-600'
                                : 'bg-blue-600'
                            }`}
                          >
                            {teacher.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                              <span>{teacher.fullName}</span>
                              <span className="font-mono font-bold text-[10px] text-blue-600 dark:text-blue-400">
                                ({teacher.teacherCode || 'GVQN'})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {teacher.phone || '0901.234.567'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Khu vực & Ca trực */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                            <Building2 className="h-3.5 w-3.5 text-purple-600" />
                            <span>
                              {teacher.assignedRooms && teacher.assignedRooms.length > 0
                                ? teacher.assignedRooms.slice(0, 3).join(', ') +
                                  (teacher.assignedRooms.length > 3
                                    ? ` (+${teacher.assignedRooms.length - 3})`
                                    : '')
                                : 'DomB - Tầng 1, 2'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>
                              {sched ? `Ca ${sched.positionName} (${sched.shift})` : 'Ca trực ngày thường'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Trạng thái công việc ngày */}
                      <td className="p-3.5 text-center">
                        {isCompleted ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>ĐÃ HOÀN THÀNH</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold mt-0.5">
                              100/100đ • Hạng A+
                            </span>
                          </div>
                        ) : isIncomplete ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              <span>CHƯA HOÀN THÀNH</span>
                            </span>
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-black mt-0.5">
                              {ev.totalScore}/100đ • Hạng {ev.rank}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>Chờ Admin Check</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* THAO TÁC ADMIN CHECK (TICK HOÀN THÀNH / CHƯA HOÀN THÀNH) */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút 1: Tick Đã Hoàn Thành */}
                          <button
                            onClick={() => handleMarkCompleted(teacher)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
                            }`}
                            title="Xác nhận hoàn thành tốt 100% nhiệm vụ ngày"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Đã Hoàn Thành</span>
                          </button>

                          {/* Nút 2: Chưa Hoàn Thành / Ghi Nhận Lỗi */}
                          <button
                            onClick={() => handleOpenIncompleteModal(teacher)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 ${
                              isIncomplete
                                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                                : 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300'
                            }`}
                            title="Nhập thông tin chưa hoàn thành và các mục trừ điểm KPI"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>{isIncomplete ? 'Sửa Lỗi KPI' : 'Chưa Hoàn Thành'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Chi tiết ghi nhận / Điểm KPI */}
                      <td className="p-3.5 max-w-xs">
                        {isIncomplete ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-rose-800 dark:text-rose-300 leading-snug">
                              {ev.generalComment}
                            </div>
                            {/* Breakdown of deducted categories */}
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {ev.operationScore < 50 && (
                                <span className="rounded bg-rose-100 px-1.5 py-0.2 font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  Vận hành: {ev.operationScore}/50đ (-{50 - ev.operationScore}đ)
                                </span>
                              )}
                              {ev.qualityScore < 20 && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  Vệ sinh/KTX: {ev.qualityScore}/20đ (-{20 - ev.qualityScore}đ)
                                </span>
                              )}
                              {ev.studentCareScore < 15 && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.2 font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  Chăm sóc HS: {ev.studentCareScore}/15đ (-{15 - ev.studentCareScore}đ)
                                </span>
                              )}
                              {ev.disciplineScore < 5 && (
                                <span className="rounded bg-red-200 px-1.5 py-0.2 font-black text-red-900 dark:bg-red-950 dark:text-red-200">
                                  Kỷ luật: {ev.disciplineScore}/5đ (-{5 - ev.disciplineScore}đ)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : isCompleted ? (
                          <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                            {ev.generalComment || 'Đã hoàn thành tốt và đầy đủ toàn bộ nhiệm vụ trong ngày.'}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa ghi nhận đánh giá</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NHẬP THÔNG TIN CHƯA HOÀN THÀNH & CÁC MỤC TRỪ ĐIỂM KPI & XẾP HẠNG   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!evaluatingTeacher}
        onClose={() => setEvaluatingTeacher(null)}
        title={`Ghi Nhận Chưa Hoàn Thành Công Việc - Thầy/Cô ${evaluatingTeacher?.fullName}`}
        subtitle={`Ngày: ${selectedDate} • Mã GV: ${evaluatingTeacher?.teacherCode || 'GVQN'}`}
        maxWidth="3xl"
      >
        {evaluatingTeacher && (
          <form onSubmit={handleSubmitIncomplete} className="space-y-5 text-xs">
            {/* Live KPI & Rank Summary Bar */}
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/70 p-4 dark:border-rose-900 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">
                  Kết Quả Đánh Giá KPI & Xếp Hạng Ngày Này:
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-rose-700 dark:text-rose-400">
                    {previewTotal}
                  </span>
                  <span className="text-sm font-bold text-slate-500">/ 100 Điểm</span>
                  <span
                    className={`ml-2 rounded-xl px-3 py-1 text-xs font-black text-white shadow-xs ${
                      previewRank === 'A+'
                        ? 'bg-emerald-600'
                        : previewRank === 'A'
                        ? 'bg-blue-600'
                        : previewRank === 'B'
                        ? 'bg-amber-600'
                        : previewRank === 'C'
                        ? 'bg-orange-600'
                        : 'bg-rose-600'
                    }`}
                  >
                    Xếp Hạng: {previewRank}
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-600 dark:text-slate-400">
                <div>
                  Tổng điểm bị trừ: <strong>-{100 - previewTotal} điểm</strong>
                </div>
                <div className="text-slate-400 mt-0.5">
                  Điểm và xếp hạng sẽ tự động đồng bộ sang mục KPI & Xếp Hạng toàn trường
                </div>
              </div>
            </div>

            {/* DANH SÁCH CÁC MỤC TƯƠNG ỨNG VỚI CÁC ĐIỂM TRONG KPI & XẾP HẠNG */}
            <div className="space-y-4">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm border-b pb-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Tick chọn các mục chưa hoàn thành / Lỗi vi phạm KPI:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {KPI_CATEGORIES.map((cat) => {
                  const deducted = scoreDeductions[cat.key];
                  const remaining = Math.max(0, cat.maxScore - deducted);

                  return (
                    <div
                      key={cat.key}
                      className={`rounded-2xl border p-3.5 space-y-2.5 transition ${
                        deducted > 0
                          ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20'
                          : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40'
                      }`}
                    >
                      {/* Tiêu đề mục KPI */}
                      <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{cat.iconText}</span>
                          <span>{cat.title}</span>
                        </span>
                        <span
                          className={`rounded-lg px-2 py-0.5 font-black text-[11px] ${
                            deducted > 0
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {remaining}/{cat.maxScore}đ {deducted > 0 && `(-${deducted}đ)`}
                        </span>
                      </div>

                      {/* Các lỗi vi phạm gợi ý để tick chọn nhanh */}
                      <div className="space-y-1.5 pt-1">
                        {cat.presetViolations.map((violation, vIdx) => {
                          const isChecked = selectedViolations.includes(violation.label);
                          return (
                            <label
                              key={vIdx}
                              className={`flex items-start gap-2 p-1.5 rounded-xl cursor-pointer transition text-[11px] ${
                                isChecked
                                  ? 'bg-rose-100/70 text-rose-900 font-bold dark:bg-rose-900/40 dark:text-rose-200'
                                  : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  handleToggleViolation(cat.key, violation.label, violation.penalty)
                                }
                                className="mt-0.5 h-3.5 w-3.5 rounded text-rose-600 accent-rose-600"
                              />
                              <span className="flex-1 leading-snug">
                                {violation.label}
                                <span className="ml-1 text-rose-600 dark:text-rose-400 font-bold">
                                  (-{violation.penalty}đ)
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Ô điều chỉnh điểm trừ tùy biến của mục này */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        <span className="text-slate-500 font-medium">Tự điều chỉnh điểm trừ:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setScoreDeductions({
                                ...scoreDeductions,
                                [cat.key]: Math.max(0, deducted - 1),
                              })
                            }
                            className="rounded-lg bg-slate-200 px-2 py-0.5 font-bold hover:bg-slate-300 dark:bg-slate-700"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={cat.maxScore}
                            value={deducted}
                            onChange={(e) =>
                              setScoreDeductions({
                                ...scoreDeductions,
                                [cat.key]: Math.min(
                                  cat.maxScore,
                                  Math.max(0, parseInt(e.target.value) || 0)
                                ),
                              })
                            }
                            className="w-12 text-center rounded-lg border border-slate-300 py-0.5 font-black text-rose-700 dark:bg-slate-800 dark:border-slate-600 dark:text-rose-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setScoreDeductions({
                                ...scoreDeductions,
                                [cat.key]: Math.min(cat.maxScore, deducted + 1),
                              })
                            }
                            className="rounded-lg bg-slate-200 px-2 py-0.5 font-bold hover:bg-slate-300 dark:bg-slate-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ô NHẬP NỘI DUNG CHI TIẾT CHƯA HOÀN THÀNH */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Chi tiết lý do chưa hoàn thành công việc & Chỉ đạo của Admin <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Nhập cụ thể sự việc chưa hoàn thành (Ví dụ: Thầy Thắng quên điểm danh học sinh phòng 102; học sinh tầng 2 làm ồn sau 22h30 chưa được chấn chỉnh...)"
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* YÊU CẦU KHẮC PHỤC */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Yêu cầu khắc phục trong ca tiếp theo:
              </label>
              <input
                type="text"
                placeholder="VD: Kiểm tra lại toàn bộ danh sách phòng KTX, bàn giao đầy đủ cho ca sau..."
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  // Quick shortcut: Cancel and mark 100% completed instead
                  if (evaluatingTeacher) {
                    handleMarkCompleted(evaluatingTeacher);
                    setEvaluatingTeacher(null);
                  }
                }}
                className="text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Hủy và Đổi thành "Đã Hoàn Thành (100đ)"
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEvaluatingTeacher(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 font-bold text-white shadow-md hover:bg-rose-700 transition active:scale-95"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Lưu Đánh Giá Chưa Hoàn Thành & Trừ Điểm KPI</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
