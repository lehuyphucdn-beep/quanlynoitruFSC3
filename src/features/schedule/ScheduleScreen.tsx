import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Sparkles,
  ArrowLeftRight,
  Copy,
  Edit2,
  Trash2,
  Search,
  ArrowRight,
  Shuffle,
  CheckCircle2,
  Check,
  Layers,
  Filter,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { ScheduleAssignment, User, Position, ShiftType } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import {
  WorkEvaluationModal,
  WorkEvaluationItem,
} from '../../components/common/WorkEvaluationModal';

// Shift definitions matching System Configuration
const SHIFT_OPTIONS: { value: ShiftType; label: string; time: string; color: string; badge: string }[] = [
  {
    value: 'morning',
    label: 'Ca Sáng',
    time: '06:00 - 07:30',
    color: 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  {
    value: 'lunch',
    label: 'Ca Trưa',
    time: '11:00 - 12:15',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  {
    value: 'afternoon',
    label: 'Ca Chiều',
    time: '16:00 - 18:45',
    color: 'border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  {
    value: 'evening',
    label: 'Ca Tối',
    time: '19:15 - 22:30',
    color: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  },
  {
    value: 'night',
    label: 'Ca Đêm',
    time: '22:30 - 06:00',
    color: 'border-purple-200 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
];

// Helper to add days to YYYY-MM-DD
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().substring(0, 10);
}

// Helper to get shift details
function getShiftInfo(shift: ShiftType) {
  return SHIFT_OPTIONS.find((s) => s.value === shift) || {
    value: shift,
    label: `Ca ${shift}`,
    time: 'Ca trực',
    color: 'border-slate-200 bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-white',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  };
}

export const ScheduleScreen: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(BOPSStore.getCurrentUser());
  const [teachers, setTeachers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);

  // Permission check: Only Manager and 02 authorized teachers (Nguyễn Ngọc Tuấn & Huỳnh Hoàng Khương) can access schedule editing actions
  const isManager = currentUser.role === 'manager';
  const isAllowedTeacher =
    currentUser.username === 'nnt' ||
    currentUser.username === 'hhk' ||
    currentUser.fullName?.toLowerCase().includes('nguyễn ngọc tuấn') ||
    currentUser.fullName?.toLowerCase().includes('nguyen ngoc tuan') ||
    currentUser.fullName?.toLowerCase().includes('huỳnh hoàng khương') ||
    currentUser.fullName?.toLowerCase().includes('huynh hoang khuong');

  const canEditSchedule = isManager || isAllowedTeacher;

  // Search & Filter
  const [searchKeyword, setSearchKeyword] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [weekFilter, setWeekFilter] = useState<'current' | 'next' | 'all'>('current');

  // Swap Modal
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ScheduleAssignment | null>(null);
  const [swapTargetTeacherId, setSwapTargetTeacherId] = useState('');
  const [swapNote, setSwapNote] = useState('');

  // Add Schedule Shift Modal
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState({
    teacherId: '',
    shift: 'morning' as ShiftType,
    positionName: 'Trực Cổng Chính KTX A',
    positionId: 'pos-01',
    date: '2026-07-26',
  });

  // Edit Schedule Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editScheduleData, setEditScheduleData] = useState<ScheduleAssignment | null>(null);

  // Work Evaluation Modal state for Manager
  const [evaluationItem, setEvaluationItem] = useState<WorkEvaluationItem | null>(null);

  // Shift Completion state for GVQN
  const [shiftToComplete, setShiftToComplete] = useState<ScheduleAssignment | null>(null);
  const [shiftCompletionNote, setShiftCompletionNote] = useState<string>('');

  const handleOpenEvaluationModal = (item: ScheduleAssignment) => {
    setEvaluationItem({
      itemType: 'schedule',
      id: item.id,
      title: `Ca trực ${item.positionName}`,
      teacherId: item.teacherId,
      teacherName: item.teacherName,
      date: item.date,
      shift: item.shift,
      completionNote: item.completionNote || 'Đã hoàn thành ca trực đúng quy định.',
      proofPhotos: item.proofPhotos,
      status: item.status,
      verified: item.status === 'verified',
      evaluationCriteria: item.evaluationCriteria,
      deductedPoints: item.deductedPoints,
      evaluationNote: item.evaluationNote,
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

  const handleConfirmShiftCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftToComplete) return;

    const nowTime = new Date().toTimeString().substring(0, 5);
    const updated: ScheduleAssignment = {
      ...shiftToComplete,
      status: 'completed',
      completedAt: nowTime,
      completionNote: shiftCompletionNote || 'GVQN đã lưu hoàn thành ca trực và bàn giao công việc.',
      evaluationStatus: 'pending_review',
    };

    BOPSStore.updateSchedule(updated);

    // Notify manager
    BOPSStore.addNotification({
      receiverId: 'manager',
      title: `GV ${currentUser.fullName} đã lưu hoàn thành ca trực`,
      content: `Ca trực ${shiftToComplete.positionName} ngày ${shiftToComplete.date} (${shiftToComplete.shift}) đã được báo hoàn thành. Vui lòng xem xét duyệt đánh giá.`,
      type: 'shift',
      priority: 'medium',
    });

    setShiftToComplete(null);
    setShiftCompletionNote('');
  };

  // Next Week Schedule Copy Modal ("Chia Lịch Trực Tuần Tiếp Theo")
  const [isNextWeekModalOpen, setIsNextWeekModalOpen] = useState(false);
  const [sourceStartDate, setSourceStartDate] = useState('2026-07-26');
  const [targetStartDate, setTargetStartDate] = useState('2026-08-02');
  const [copyStrategy, setCopyStrategy] = useState<'exact' | 'rotate' | 'empty'>('exact');
  const [nextWeekPreview, setNextWeekPreview] = useState<ScheduleAssignment[]>([]);

  useEffect(() => {
    const loadData = () => {
      const u = BOPSStore.getCurrentUser();
      setCurrentUser(u);
      const allTeachers = BOPSStore.getUsers().filter((x) => x.role === 'teacher');
      setTeachers(allTeachers);
      setPositions(BOPSStore.getPositions());
      const loadedSchedules = BOPSStore.getSchedules();
      setAssignments(loadedSchedules);

      if (allTeachers.length > 0 && !newScheduleData.teacherId) {
        setNewScheduleData((prev) => ({ ...prev, teacherId: allTeachers[0].id }));
      }
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  // Handle manual shift creation
  const handleCreateScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleData.teacherId) return;

    const teacher = teachers.find((t) => t.id === newScheduleData.teacherId);
    if (!teacher) return;

    BOPSStore.addSchedule({
      date: newScheduleData.date,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      teacherCode: teacher.teacherCode,
      shift: newScheduleData.shift,
      templateId: 'tmpl-custom',
      positionId: newScheduleData.positionId || 'pos-custom',
      positionName: newScheduleData.positionName,
      roomIds: [],
      status: 'scheduled',
    });

    setIsAddScheduleOpen(false);
  };

  // Handle editing an assignment
  const handleUpdateScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editScheduleData) return;

    BOPSStore.updateSchedule(editScheduleData);
    setIsEditModalOpen(false);
    setEditScheduleData(null);
  };

  // Delete confirmation modal state
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleAssignment | null>(null);

  // Handle deleting an assignment
  const handleDeleteSchedule = (schedule: ScheduleAssignment) => {
    setScheduleToDelete(schedule);
  };

  const confirmDeleteSchedule = () => {
    if (scheduleToDelete) {
      BOPSStore.deleteSchedule(scheduleToDelete.id);
      setAssignments(BOPSStore.getSchedules());
      setScheduleToDelete(null);
    }
  };

  // Handle swap shift request
  const handleRequestSwap = () => {
    if (!selectedAssignment || !swapTargetTeacherId) return;

    const targetTeacher = teachers.find((t) => t.id === swapTargetTeacherId);
    if (!targetTeacher) return;

    const updated = {
      ...selectedAssignment,
      status: 'swapped' as const,
      swapWithTeacherId: targetTeacher.id,
      swapNote,
    };

    BOPSStore.updateSchedule(updated);

    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Schedule',
      'REQUEST_SWAP_SHIFT',
      `Đổi ca trực ngày ${selectedAssignment.date} (${selectedAssignment.positionName}) cho ${targetTeacher.fullName}`
    );

    setShowSwapModal(false);
    setSelectedAssignment(null);
  };

  // Generate Next Week Preview when Next Week Modal Opens or Options Change
  const generateNextWeekPreview = () => {
    // Get source week assignments (assignments falling within 7 days from sourceStartDate)
    const sourceEndDate = addDays(sourceStartDate, 6);
    const sourceItems = assignments.filter(
      (a) => a.date >= sourceStartDate && a.date <= sourceEndDate
    );

    const itemsToCopy = sourceItems.length > 0 ? sourceItems : assignments;

    if (itemsToCopy.length === 0) {
      setNextWeekPreview([]);
      return;
    }

    const generated: ScheduleAssignment[] = itemsToCopy.map((item, index) => {
      // Calculate day offset relative to sourceStartDate
      const dateDiffMs = new Date(item.date).getTime() - new Date(sourceStartDate).getTime();
      const dayOffset = Math.round(dateDiffMs / (1000 * 60 * 60 * 24));
      const targetDate = addDays(targetStartDate, Math.max(0, dayOffset));

      let assignedTeacher = teachers.find((t) => t.id === item.teacherId) || teachers[0];

      if (copyStrategy === 'rotate' && teachers.length > 1) {
        // Shift teacher index by 1 or rotation logic
        const currentIdx = teachers.findIndex((t) => t.id === item.teacherId);
        const nextIdx = (currentIdx >= 0 ? currentIdx + 1 : index) % teachers.length;
        assignedTeacher = teachers[nextIdx];
      }

      return {
        id: `next-preview-${index}-${Date.now()}`,
        date: targetDate,
        teacherId: assignedTeacher ? assignedTeacher.id : item.teacherId,
        teacherName: assignedTeacher ? assignedTeacher.fullName : item.teacherName,
        teacherCode: assignedTeacher ? assignedTeacher.teacherCode : item.teacherCode,
        shift: item.shift,
        templateId: 'tmpl-nextweek',
        positionId: item.positionId,
        positionName: item.positionName,
        roomIds: item.roomIds || [],
        status: 'scheduled',
      };
    });

    setNextWeekPreview(generated);
  };

  const handleOpenNextWeekModal = () => {
    setIsNextWeekModalOpen(true);
    generateNextWeekPreview();
  };

  // Apply generated next week preview to store
  const handleConfirmNextWeekSchedule = () => {
    if (nextWeekPreview.length === 0) {
      alert('Không có ca trực nào để áp dụng!');
      return;
    }

    // Save all preview assignments to BOPSStore
    const newItems: ScheduleAssignment[] = nextWeekPreview.map((item, idx) => ({
      ...item,
      id: `sched-nw-${Date.now()}-${idx}`,
    }));

    const currentSchedules = BOPSStore.getSchedules();
    BOPSStore.saveSchedules([...newItems, ...currentSchedules]);

    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Schedule',
      'COPY_WEEK_SCHEDULE',
      `Tạo và chia lịch trực tuần mới bắt đầu từ ${targetStartDate} (${newItems.length} ca trực)`
    );

    setIsNextWeekModalOpen(false);
    setWeekFilter('next');
  };

  // Helper to update individual entry in nextWeekPreview
  const handleUpdatePreviewRow = (
    index: number,
    field: keyof ScheduleAssignment,
    value: string
  ) => {
    setNextWeekPreview((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        if (field === 'teacherId') {
          const t = teachers.find((x) => x.id === value);
          return {
            ...item,
            teacherId: value,
            teacherName: t ? t.fullName : item.teacherName,
            teacherCode: t ? t.teacherCode : item.teacherCode,
          };
        }

        return { ...item, [field]: value };
      })
    );
  };

  // Helper to add a custom empty row to next week preview
  const handleAddPreviewRow = () => {
    if (teachers.length === 0) return;
    const defaultTeacher = teachers[0];

    const newRow: ScheduleAssignment = {
      id: `preview-add-${Date.now()}`,
      date: targetStartDate,
      teacherId: defaultTeacher.id,
      teacherName: defaultTeacher.fullName,
      teacherCode: defaultTeacher.teacherCode,
      shift: 'morning',
      templateId: 'tmpl-custom',
      positionId: positions[0]?.id || 'pos-01',
      positionName: positions[0]?.positionName || 'Trực Cổng Chính KTX A',
      roomIds: [],
      status: 'scheduled',
    };

    setNextWeekPreview((prev) => [...prev, newRow]);
  };

  // Helper to remove row from next week preview
  const handleRemovePreviewRow = (index: number) => {
    setNextWeekPreview((prev) => prev.filter((_, i) => i !== index));
  };

  // Filtered Assignments list for main view
  const filteredAssignments = assignments.filter((item) => {
    // Week filter logic
    if (weekFilter === 'current') {
      if (item.date > '2026-08-01') return false;
    } else if (weekFilter === 'next') {
      if (item.date < '2026-08-02') return false;
    }

    // Shift filter
    if (shiftFilter !== 'all' && item.shift !== shiftFilter) return false;

    // Search keyword
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = item.teacherName.toLowerCase().includes(kw);
      const matchCode = item.teacherCode.toLowerCase().includes(kw);
      const matchPos = item.positionName.toLowerCase().includes(kw);
      const matchDate = item.date.includes(kw);
      if (!matchName && !matchCode && !matchPos && !matchDate) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <Calendar className="h-4 w-4" />
            <span>Quản Lý Lịch Trực Quản Nhiệm</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Phân Công Ca Trực & Chia Lịch Trực Lĩnh Hoạt
          </h2>
        </div>

        {canEditSchedule && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Main Action: Chia Lịch Trực Tuần Tiếp Theo */}
            <button
              onClick={handleOpenNextWeekModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              Chia Lịch Trực Tuần Tiếp Theo
            </button>

            {/* Action: Phân Công Ca Trực Mới */}
            <button
              onClick={() => setIsAddScheduleOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Phân Công Ca Trực Mới
            </button>
          </div>
        )}
      </div>

      {/* System Shift Catalogs Summary */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            Khung Ca Trực Hệ Thống (5 Ca Chuẩn Nội Trú)
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">Cấu hình đồng bộ hệ thống</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SHIFT_OPTIONS.map((shift) => (
            <div
              key={shift.value}
              className={`rounded-2xl border p-3 text-xs transition-all ${shift.color}`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>{shift.label}</span>
                <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-mono text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {shift.time}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] opacity-80">
                Gắn liền checklist tự động ca {shift.label.toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Week Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-bold">
            <button
              onClick={() => setWeekFilter('current')}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                weekFilter === 'current'
                  ? 'bg-white text-purple-700 shadow dark:bg-slate-900 dark:text-purple-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Tuần Này (26/07 - 01/08)
            </button>
            <button
              onClick={() => setWeekFilter('next')}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                weekFilter === 'next'
                  ? 'bg-white text-purple-700 shadow dark:bg-slate-900 dark:text-purple-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Tuần Tới (02/08 - 08/08)
            </button>
            <button
              onClick={() => setWeekFilter('all')}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                weekFilter === 'all'
                  ? 'bg-white text-purple-700 shadow dark:bg-slate-900 dark:text-purple-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Tất Cả Ca Trực
            </button>
          </div>

          {/* Search Box & Shift Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm GV, vị trí, ngày..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-48 sm:w-60 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Tất cả Ca Trực</option>
              {SHIFT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} ({s.time})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Schedule List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            Danh Sách Phân Công Lịch Trực ({filteredAssignments.length} Ca)
          </h3>
          <span className="text-xs text-slate-400">Tự động gắn thông tin checklist vận hành</span>
        </div>

        <div className="mt-4 space-y-3">
          {filteredAssignments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có phân công ca trực nào phù hợp với bộ lọc hiện tại.
              {canEditSchedule && (
                <>
                  <br />
                  <button
                    onClick={handleOpenNextWeekModal}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Chia Lịch Trực Tuần Tiếp Theo Ngay
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredAssignments.map((item) => {
              const shiftInfo = getShiftInfo(item.shift);
              return (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 hover:border-purple-300 dark:border-slate-800 dark:hover:border-purple-800 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {item.teacherName} ({item.teacherCode})
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${shiftInfo.badge}`}
                      >
                        {shiftInfo.label} • {shiftInfo.time}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.date}
                      </span>
                      {item.status === 'swapped' && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Đã đề xuất đổi ca
                        </span>
                      )}
                      {(item.status === 'verified' || item.evaluationStatus === 'approved') && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          Đã Duyệt: Hoàn Thành
                        </span>
                      )}
                      {(item.status === 'rejected' || item.evaluationStatus === 'rejected') && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                          Chưa Tốt {item.deductedPoints ? `(-${item.deductedPoints}đ KPI)` : ''}
                        </span>
                      )}
                      {(item.status === 'completed' || item.evaluationStatus === 'pending_review') && item.status !== 'verified' && item.status !== 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300">
                          <Check className="h-3 w-3 text-blue-600" />
                          GV Đã Báo Hoàn Thành • Chờ Duyệt
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Vị trí: <strong className="text-slate-900 dark:text-white">{item.positionName}</strong>
                    </div>

                    {item.completionNote && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl mt-1 border border-slate-100 dark:border-slate-800">
                        <strong className="text-slate-700 dark:text-slate-300">Báo cáo GVQN:</strong> "{item.completionNote}"
                      </div>
                    )}

                    {item.evaluationNote && (
                      <div className={`text-[11px] p-2 rounded-xl mt-1 font-medium ${
                        item.evaluationStatus === 'rejected' || item.status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}>
                        <strong>Nhận xét Quản lý:</strong> "{item.evaluationNote}" {item.evaluationCriteria ? `[Tiêu chí: ${item.evaluationCriteria}]` : ''}
                      </div>
                    )}

                    {item.swapNote && (
                      <div className="text-[11px] text-slate-500 italic">
                        Ghi chú đổi ca: {item.swapNote}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Manager Action: Báo hoàn thành ca trực (Chỉ tài khoản Quản lý) */}
                    {currentUser.role === 'manager' &&
                      item.status !== 'completed' &&
                      item.status !== 'verified' &&
                      item.status !== 'rejected' && (
                        <button
                          onClick={() => {
                            setShiftToComplete(item);
                            setShiftCompletionNote('');
                          }}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Báo Hoàn Thành
                        </button>
                      )}

                    {/* Manager/All Action: Duyệt / Đánh giá ca trực hoặc Xem Chi Tiết */}
                    <button
                      onClick={() => handleOpenEvaluationModal(item)}
                      className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 transition"
                    >
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                      <span>{currentUser.role === 'manager' ? 'Duyệt / Đánh giá' : 'Xem Chi Tiết'}</span>
                    </button>

                    {/* Swap Button: Đổi ca */}
                    <button
                      onClick={() => {
                        setSelectedAssignment(item);
                        setShowSwapModal(true);
                      }}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                      Đổi ca
                    </button>

                    {/* Manager & Authorized Edit & Delete */}
                    {canEditSchedule && (
                      <>
                        <button
                          onClick={() => {
                            setEditScheduleData(item);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          title="Sửa phân công ca trực"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteSchedule(item)}
                          className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400"
                          title="Xóa ca trực"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: Phân Công Ca Trực Mới */}
      <Modal
        isOpen={isAddScheduleOpen}
        onClose={() => setIsAddScheduleOpen(false)}
        title="Phân Công Ca Trực Mới"
        subtitle="Chọn giáo viên, ngày và ca trực đầy đủ cấu hình hệ thống"
      >
        <form onSubmit={handleCreateScheduleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chọn Giáo Viên Quản Nhiệm <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={newScheduleData.teacherId}
              onChange={(e) => setNewScheduleData({ ...newScheduleData, teacherId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.teacherCode}) - {t.position}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày Trực <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newScheduleData.date}
                onChange={(e) => setNewScheduleData({ ...newScheduleData, date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ca Trực Hệ Thống <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={newScheduleData.shift}
                onChange={(e) =>
                  setNewScheduleData({
                    ...newScheduleData,
                    shift: e.target.value as ShiftType,
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-purple-700 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-purple-300"
              >
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({s.time})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Vị Trí Phân Công
            </label>
            <select
              value={newScheduleData.positionName}
              onChange={(e) => {
                const pos = positions.find((p) => p.positionName === e.target.value);
                setNewScheduleData({
                  ...newScheduleData,
                  positionName: e.target.value,
                  positionId: pos ? pos.id : 'pos-custom',
                });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white mb-2"
            >
              {positions.map((pos) => (
                <option key={pos.id} value={pos.positionName}>
                  {pos.positionName} ({pos.requiredTeachers} GV)
                </option>
              ))}
              <option value="Trực Vị Trí Tùy Chỉnh">Trực Vị Trí Tùy Chỉnh...</option>
            </select>

            <input
              type="text"
              required
              placeholder="VD: Trực Cổng Chính KTX A / Tuần tra Tầng 2 KTX B"
              value={newScheduleData.positionName}
              onChange={(e) => setNewScheduleData({ ...newScheduleData, positionName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddScheduleOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-purple-700"
            >
              Xác Nhận Phân Công
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Chia Lịch Trực Tuần Tiếp Theo (Sao chép & Tùy chỉnh linh hoạt) */}
      <Modal
        isOpen={isNextWeekModalOpen}
        onClose={() => setIsNextWeekModalOpen(false)}
        title="Chia Lịch Trực Tuần Tiếp Theo"
        subtitle="Tự động nhân bản lịch trực tuần và tùy chỉnh thông tin linh hoạt trước khi lưu"
      >
        <div className="space-y-5 text-xs">
          {/* Controls: Source Week, Target Week, Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tuần Nguồn (Mẫu)
              </label>
              <input
                type="date"
                value={sourceStartDate}
                onChange={(e) => {
                  setSourceStartDate(e.target.value);
                  setTimeout(generateNextWeekPreview, 50);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Tuần hiện tại (26/07 - 01/08)
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tuần Áp Dụng (Tuần Tới)
              </label>
              <input
                type="date"
                value={targetStartDate}
                onChange={(e) => {
                  setTargetStartDate(e.target.value);
                  setTimeout(generateNextWeekPreview, 50);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-purple-700 dark:text-purple-300 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Bắt đầu từ +7 ngày
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phương Thức Chia Lịch
              </label>
              <select
                value={copyStrategy}
                onChange={(e) => {
                  setCopyStrategy(e.target.value as 'exact' | 'rotate' | 'empty');
                  setTimeout(generateNextWeekPreview, 50);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="exact">🔄 Sao Chép Nguyên Bản (+7 Ngày)</option>
                <option value="rotate">🔀 Tự Động Xoay Ca Giáo Viên</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Có thể chỉnh sửa thủ công từng ca ở dưới
              </span>
            </div>
          </div>

          {/* Interactive Preview List Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                Danh Sách Ca Trực Tuần Tới ({nextWeekPreview.length} ca)
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Cho Phép Tùy Chỉnh
              </span>
            </div>

            <button
              onClick={handleAddPreviewRow}
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5 text-purple-600" />
              Thêm Ca Trực
            </button>
          </div>

          {/* Preview Table with Inline Customization */}
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 border border-slate-200 rounded-2xl p-2 dark:border-slate-800">
            {nextWeekPreview.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không tìm thấy ca trực mẫu ở tuần nguồn. Bấm "Thêm Ca Trực" để tạo mới.
              </div>
            ) : (
              nextWeekPreview.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900/90 text-xs"
                >
                  {/* Date Column */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5 sm:hidden">
                      Ngày trực:
                    </label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => handleUpdatePreviewRow(idx, 'date', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-mono text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Teacher Column */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5 sm:hidden">
                      Giáo viên:
                    </label>
                    <select
                      value={item.teacherId}
                      onChange={(e) => handleUpdatePreviewRow(idx, 'teacherId', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.teacherCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Shift Column */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5 sm:hidden">
                      Ca trực:
                    </label>
                    <select
                      value={item.shift}
                      onChange={(e) => handleUpdatePreviewRow(idx, 'shift', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold text-purple-700 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-purple-300"
                    >
                      {SHIFT_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Position Column */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-semibold mb-0.5 sm:hidden">
                      Vị trí:
                    </label>
                    <input
                      type="text"
                      value={item.positionName}
                      onChange={(e) => handleUpdatePreviewRow(idx, 'positionName', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-medium text-slate-800 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Delete Row Action */}
                  <div className="sm:col-span-1 text-right shrink-0">
                    <button
                      onClick={() => handleRemovePreviewRow(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"
                      title="Xóa ca này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Confirm & Save Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Tổng cộng: <strong className="text-purple-600">{nextWeekPreview.length} ca trực</strong> sẽ được tạo
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNextWeekModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmNextWeekSchedule}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
              >
                <Check className="h-4 w-4" />
                Xác Nhận & Lưu Lịch Trực Tuần Mới
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Sửa Ca Trực */}
      {editScheduleData && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Sửa Phân Công Ca Trực"
        >
          <form onSubmit={handleUpdateScheduleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giáo Viên
              </label>
              <select
                value={editScheduleData.teacherId}
                onChange={(e) => {
                  const t = teachers.find((x) => x.id === e.target.value);
                  setEditScheduleData({
                    ...editScheduleData,
                    teacherId: e.target.value,
                    teacherName: t ? t.fullName : editScheduleData.teacherName,
                    teacherCode: t ? t.teacherCode : editScheduleData.teacherCode,
                  });
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.teacherCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày Trực</label>
                <input
                  type="date"
                  required
                  value={editScheduleData.date}
                  onChange={(e) => setEditScheduleData({ ...editScheduleData, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ca Trực</label>
                <select
                  value={editScheduleData.shift}
                  onChange={(e) =>
                    setEditScheduleData({
                      ...editScheduleData,
                      shift: e.target.value as ShiftType,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-purple-700 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-purple-300"
                >
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.time})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vị Trí Phân Công
              </label>
              <input
                type="text"
                required
                value={editScheduleData.positionName}
                onChange={(e) => setEditScheduleData({ ...editScheduleData, positionName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-purple-700"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Đề xuất đổi ca */}
      <Modal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        title="Đề xuất Đổi ca trực"
        subtitle={selectedAssignment?.positionName}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chọn Giáo viên nhận ca trực thay
            </label>
            <select
              value={swapTargetTeacherId}
              onChange={(e) => setSwapTargetTeacherId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Chọn giáo viên --</option>
              {teachers
                .filter((t) => t.id !== currentUser.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.teacherCode})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Lý do đổi ca
            </label>
            <textarea
              rows={3}
              value={swapNote}
              onChange={(e) => setSwapNote(e.target.value)}
              placeholder="Nhập lý do đổi ca (e.g. Trùng lịch khám bệnh, việc gia đình...)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowSwapModal(false)}
              className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
            >
              Hủy
            </button>
            <button
              onClick={handleRequestSwap}
              className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-md hover:bg-blue-700"
            >
              Gửi Yêu cầu Đổi ca
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!scheduleToDelete}
        onClose={() => setScheduleToDelete(null)}
        onConfirm={confirmDeleteSchedule}
        title="Xác nhận xóa ca trực"
        itemName={
          scheduleToDelete
            ? `Ca trực ngày ${scheduleToDelete.date} (${scheduleToDelete.teacherName} - ${scheduleToDelete.positionName})`
            : ''
        }
      />

      {/* GVQN Báo Hoàn Thành Ca Trực Modal */}
      <Modal
        isOpen={!!shiftToComplete}
        onClose={() => setShiftToComplete(null)}
        title="Báo Hoàn Thành Ca Trực Nội Trú"
        subtitle={shiftToComplete ? `${shiftToComplete.positionName} • Ngày ${shiftToComplete.date}` : ''}
      >
        <form onSubmit={handleConfirmShiftCompletion} className="space-y-4 text-xs">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
            <span className="font-bold block mb-1">Xác nhận hoàn thành ca trực</span>
            <span>Sau khi lưu, trạng thái ca trực sẽ gửi đến Người quản trị để xem xét duyệt "Hoàn thành" hoặc "Chưa tốt".</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú báo cáo ca trực & Bàn giao:
            </label>
            <textarea
              rows={3}
              value={shiftCompletionNote}
              onChange={(e) => setShiftCompletionNote(e.target.value)}
              placeholder="VD: Ca trực diễn ra an toàn, học sinh điểm danh đầy đủ, nền nếp KTX tốt..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 font-medium text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShiftToComplete(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Lưu Hoàn Thành Ca Trực
            </button>
          </div>
        </form>
      </Modal>

      {/* Work Evaluation Modal for Manager */}
      <WorkEvaluationModal
        isOpen={!!evaluationItem}
        onClose={() => setEvaluationItem(null)}
        item={evaluationItem}
        onEvaluate={handleExecuteEvaluation}
      />
    </div>
  );
};
