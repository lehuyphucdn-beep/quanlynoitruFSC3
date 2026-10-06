import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  ShieldAlert,
  Building2,
  User,
  Search,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  Filter,
  Eye,
  AlertCircle,
  Sparkles,
  Check,
  X,
  FileCheck,
  Activity,
  UserCheck,
  BedDouble,
  Lightbulb,
  Bell,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Edit,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import {
  DailyWorkReport,
  StudentIncidentReport,
  RoomConditionReport,
  Student,
  Room,
  User as SystemUser,
} from '../../types';
import { Modal } from '../../components/common/Modal';

export const ReportExporter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<SystemUser>(BOPSStore.getCurrentUser());
  const [reports, setReports] = useState<DailyWorkReport[]>(BOPSStore.getDailyWorkReports());
  const [students, setStudents] = useState<Student[]>(BOPSStore.getStudents());
  const [rooms, setRooms] = useState<Room[]>(BOPSStore.getRooms());
  const [users, setUsers] = useState<SystemUser[]>(BOPSStore.getUsers());

  const isManager = currentUser.role === 'manager';
  const todayStr = new Date().toISOString().split('T')[0];

  // Active view tab:
  // 'overview': Tổng hợp phân tích & Cảnh báo toàn trường
  // 'submit': Nộp báo cáo ca trực (GVQN)
  // 'my_reports': Lịch sử báo cáo của tôi
  // 'export': Xuất file Excel
  const [activeTab, setActiveTab] = useState<'overview' | 'submit' | 'my_reports' | 'export'>(
    isManager ? 'overview' : 'submit'
  );

  // Filters for Overview
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [incidentCategoryFilter, setIncidentCategoryFilter] = useState<string>('all');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<string>('all');
  const [searchIncident, setSearchIncident] = useState<string>('');

  // Selected Report Details Modal
  const [selectedReport, setSelectedReport] = useState<DailyWorkReport | null>(null);
  const [adminFeedbackInput, setAdminFeedbackInput] = useState<string>('');
  const [feedbackSuccessToast, setFeedbackSuccessToast] = useState<string | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // NEW REPORT FORM STATE (GVQN Nộp báo cáo ngày)
  // ---------------------------------------------------------------------------
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [newReportDate, setNewReportDate] = useState<string>(todayStr);
  const [newReportShift, setNewReportShift] = useState<DailyWorkReport['shift']>('afternoon');
  const [tasksRate, setTasksRate] = useState<number>(100);
  const [workStatus, setWorkStatus] = useState<DailyWorkReport['workStatus']>('completed');
  const [workSummary, setWorkSummary] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string>('');

  // Student Incidents in Form (BẮT BUỘC CÓ MÃ HS)
  const [formIncidents, setFormIncidents] = useState<StudentIncidentReport[]>([]);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState('');
  const [incidentForm, setIncidentForm] = useState<{
    studentCode: string;
    studentName: string;
    className: string;
    roomName: string;
    category: StudentIncidentReport['category'];
    severity: StudentIncidentReport['severity'];
    incidentDetail: string;
    initialActionTaken: string;
  }>({
    studentCode: '',
    studentName: '',
    className: '',
    roomName: '',
    category: 'health',
    severity: 'warning',
    incidentDetail: '',
    initialActionTaken: '',
  });

  // Room Conditions in Form
  const [formRooms, setFormRooms] = useState<RoomConditionReport[]>([]);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState<{
    roomName: string;
    building: string;
    hygieneStatus: RoomConditionReport['hygieneStatus'];
    facilityIssues: string;
    disciplineStatus: string;
    severity: RoomConditionReport['severity'];
  }>({
    roomName: 'DomB-101',
    building: 'DomB',
    hygieneStatus: 'good',
    facilityIssues: '',
    disciplineStatus: '',
    severity: 'normal',
  });

  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // EXPORT STATE
  // ---------------------------------------------------------------------------
  const [exportType, setExportType] = useState('daily_work_incidents');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    const load = () => {
      setCurrentUser(BOPSStore.getCurrentUser());
      setReports(BOPSStore.getDailyWorkReports());
      setStudents(BOPSStore.getStudents());
      setRooms(BOPSStore.getRooms());
      setUsers(BOPSStore.getUsers());
    };
    load();
    const unsub = subscribeToStore(load);
    return unsub;
  }, []);

  // Filter reports for the overview
  const reportsForSelectedDate = reports.filter((r) => {
    const matchDate = r.date === selectedDate;
    const matchShift = filterShift === 'all' || r.shift === filterShift;
    const matchTeacher = filterTeacher === 'all' || r.teacherId === filterTeacher;
    return matchDate && matchShift && matchTeacher;
  });

  // Aggregated data for selected date
  const allIncidentsForDate: (StudentIncidentReport & {
    reportId: string;
    teacherName: string;
    teacherCode: string;
    shift: string;
    reportDate: string;
  })[] = [];

  const allRoomConditionsForDate: (RoomConditionReport & {
    reportId: string;
    teacherName: string;
    shift: string;
    reportDate: string;
  })[] = [];

  reportsForSelectedDate.forEach((r) => {
    r.studentIncidents.forEach((inc) => {
      allIncidentsForDate.push({
        ...inc,
        reportId: r.id,
        teacherName: r.teacherName,
        teacherCode: r.teacherCode,
        shift: r.shift,
        reportDate: r.date,
      });
    });
    r.roomConditions.forEach((rm) => {
      allRoomConditionsForDate.push({
        ...rm,
        reportId: r.id,
        teacherName: r.teacherName,
        shift: r.shift,
        reportDate: r.date,
      });
    });
  });

  // Filter incidents by search & filters
  const filteredIncidents = allIncidentsForDate.filter((inc) => {
    const q = searchIncident.toLowerCase();
    const matchSearch =
      inc.studentCode.toLowerCase().includes(q) ||
      inc.studentName.toLowerCase().includes(q) ||
      inc.className.toLowerCase().includes(q) ||
      inc.roomName.toLowerCase().includes(q) ||
      inc.incidentDetail.toLowerCase().includes(q) ||
      inc.teacherName.toLowerCase().includes(q);

    const matchCategory =
      incidentCategoryFilter === 'all' || inc.category === incidentCategoryFilter;

    const matchSeverity =
      incidentSeverityFilter === 'all'
        ? true
        : incidentSeverityFilter === 'unhandled'
        ? !inc.handled
        : inc.severity === incidentSeverityFilter;

    return matchSearch && matchCategory && matchSeverity;
  });

  // Incident statistics for date
  const emergencyIncidentsCount = allIncidentsForDate.filter((i) => i.severity === 'emergency').length;
  const warningIncidentsCount = allIncidentsForDate.filter((i) => i.severity === 'warning').length;
  const healthIncidentsCount = allIncidentsForDate.filter((i) => i.category === 'health').length;
  const disciplineIncidentsCount = allIncidentsForDate.filter((i) => i.category === 'discipline').length;
  const mentalIncidentsCount = allIncidentsForDate.filter((i) => i.category === 'mental').length;
  const warningRoomsCount = allRoomConditionsForDate.filter((r) => r.severity !== 'normal').length;
  const roomFacilityIssueCount = allRoomConditionsForDate.filter((r) => !!r.facilityIssues).length;

  // Teacher submission tracker for today
  const allTeachers = users.filter((u) => u.role === 'teacher');
  const submittedTeacherIds = new Set(
    reports.filter((r) => r.date === selectedDate).map((r) => r.teacherId)
  );
  const teachersSubmitted = allTeachers.filter((t) => submittedTeacherIds.has(t.id));
  const teachersPending = allTeachers.filter((t) => !submittedTeacherIds.has(t.id));

  // My submitted reports (for teachers)
  const myReports = reports.filter((r) => r.teacherId === currentUser.id);

  // Handle student selection by code or matching student
  const handleStudentSelect = (student: Student) => {
    setIncidentForm((prev) => ({
      ...prev,
      studentCode: student.studentCode,
      studentName: student.fullName,
      className: student.className,
      roomName: student.roomName,
    }));
    setStudentSearchKeyword('');
  };

  const handleStudentCodeInput = (code: string) => {
    const trimmed = code.trim();
    const matched = students.find((s) => s.studentCode.toLowerCase() === trimmed.toLowerCase());
    if (matched) {
      setIncidentForm((prev) => ({
        ...prev,
        studentCode: matched.studentCode,
        studentName: matched.fullName,
        className: matched.className,
        roomName: matched.roomName,
      }));
    } else {
      setIncidentForm((prev) => ({
        ...prev,
        studentCode: code,
      }));
    }
  };

  const handleAddIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.studentCode.trim() || !incidentForm.incidentDetail.trim()) {
      alert('Vui lòng nhập Mã học sinh (*) và Chi tiết tình trạng học sinh (*)!');
      return;
    }

    const newInc: StudentIncidentReport = {
      id: `inc-${Date.now()}`,
      studentCode: incidentForm.studentCode.trim().toUpperCase(),
      studentName: incidentForm.studentName.trim() || 'Học sinh',
      className: incidentForm.className.trim() || '10A1',
      roomName: incidentForm.roomName.trim() || 'DomB-101',
      category: incidentForm.category,
      severity: incidentForm.severity,
      incidentDetail: incidentForm.incidentDetail.trim(),
      initialActionTaken:
        incidentForm.initialActionTaken.trim() || 'Đã kiểm tra và hỗ trợ ban đầu trong ca trực.',
      handled: false,
    };

    setFormIncidents([...formIncidents, newInc]);
    setIsIncidentModalOpen(false);
    setIncidentForm({
      studentCode: '',
      studentName: '',
      className: '',
      roomName: '',
      category: 'health',
      severity: 'warning',
      incidentDetail: '',
      initialActionTaken: '',
    });
  };

  const handleAddRoomCondition = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoom: RoomConditionReport = {
      id: `rm-cond-${Date.now()}`,
      roomName: roomForm.roomName,
      building: roomForm.building,
      hygieneStatus: roomForm.hygieneStatus,
      facilityIssues: roomForm.facilityIssues.trim(),
      disciplineStatus: roomForm.disciplineStatus.trim(),
      severity: roomForm.severity,
      handled: false,
    };

    setFormRooms([...formRooms, newRoom]);
    setIsRoomModalOpen(false);
    setRoomForm({
      roomName: 'DomB-101',
      building: 'DomB',
      hygieneStatus: 'good',
      facilityIssues: '',
      disciplineStatus: '',
      severity: 'normal',
    });
  };

  const handleSubmitDailyReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workSummary.trim()) {
      alert('Vui lòng nhập Tóm tắt công việc đã thực hiện trong ca trực!');
      return;
    }

    const report = BOPSStore.addOrUpdateDailyWorkReport({
      id: editingReportId || undefined,
      date: newReportDate,
      shift: newReportShift,
      teacherId: currentUser.id,
      teacherName: currentUser.fullName,
      teacherCode: currentUser.teacherCode || 'GVQN',
      tasksCompletionRate: tasksRate,
      completedTasksCount: Math.round((tasksRate / 100) * 8),
      totalTasksCount: 8,
      workStatus,
      workSummary,
      handoverNotes,
      suggestionsToManager: suggestions,
      studentIncidents: formIncidents,
      roomConditions: formRooms,
      adminReviewed: false,
    });

    setSubmitSuccessMessage(
      `Đã gửi báo cáo ngày ${report.date} (Ca: ${report.shift}) thành công lên Quản lý Thầy Lê Huy Phúc!`
    );

    // Reset form
    setEditingReportId(null);
    setWorkSummary('');
    setHandoverNotes('');
    setSuggestions('');
    setFormIncidents([]);
    setFormRooms([]);

    setTimeout(() => {
      setSubmitSuccessMessage(null);
      setSelectedDate(newReportDate);
      setActiveTab('overview');
    }, 1800);
  };

  const handleStartEditReport = (rep: DailyWorkReport) => {
    setEditingReportId(rep.id);
    setNewReportDate(rep.date);
    setNewReportShift(rep.shift);
    setTasksRate(rep.tasksCompletionRate);
    setWorkStatus(rep.workStatus);
    setWorkSummary(rep.workSummary);
    setHandoverNotes(rep.handoverNotes || '');
    setSuggestions(rep.suggestionsToManager || '');
    setFormIncidents(rep.studentIncidents || []);
    setFormRooms(rep.roomConditions || []);
    setActiveTab('submit');
  };

  // Admin submit feedback
  const handleSendAdminFeedback = (reportId: string) => {
    if (!adminFeedbackInput.trim()) return;
    BOPSStore.updateDailyWorkReportAdminFeedback(reportId, adminFeedbackInput);
    setFeedbackSuccessToast('Đã gửi phản hồi và chỉ đạo của Thầy Lê Huy Phúc đến giáo viên!');
    setAdminFeedbackInput('');
    const updated = BOPSStore.getDailyWorkReports().find((r) => r.id === reportId);
    if (updated) setSelectedReport(updated);
    setTimeout(() => setFeedbackSuccessToast(null), 3000);
  };

  // Toggle Handled status of incident
  const handleToggleIncident = (reportId: string, incidentId: string) => {
    BOPSStore.toggleIncidentHandled(reportId, incidentId);
  };

  // Toggle Handled status of room
  const handleToggleRoom = (reportId: string, roomCondId: string) => {
    BOPSStore.toggleRoomHandled(reportId, roomCondId);
  };

  // Admin send reminder to pending teachers
  const handleSendReminders = () => {
    teachersPending.forEach((t) => {
      BOPSStore.addNotification({
        receiverId: t.id,
        title: 'Nhắc nhở nộp báo cáo ca trực hằng ngày',
        content: `Thầy/Cô ${t.fullName} vui lòng hoàn thiện và gửi Báo cáo công việc + Tình trạng học sinh cho ca trực ngày hôm nay (${selectedDate}) lên Ban Quản lý.`,
        type: 'emergency',
        priority: 'high',
      });
    });
    setReminderToast(`Đã gửi thông báo nhắc nhở đến ${teachersPending.length} GVQN chưa nộp báo cáo!`);
    setTimeout(() => setReminderToast(null), 3500);
  };

  // Export File Function
  const handleExportData = (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    setExportSuccess(false);

    setTimeout(() => {
      if (format === 'excel') {
        let rows: any[] = [];
        let sheetName = 'BaoCao';

        if (exportType === 'daily_work_incidents') {
          sheetName = 'CanhBaoHocSinh';
          rows = allIncidentsForDate.map((inc, i) => ({
            STT: i + 1,
            'Mã Học Sinh': inc.studentCode,
            'Họ Và Tên': inc.studentName,
            Lớp: inc.className,
            'Phòng KTX': inc.roomName,
            'Phân Loại':
              inc.category === 'health'
                ? 'Sức khỏe y tế'
                : inc.category === 'mental'
                ? 'Tâm lý'
                : inc.category === 'discipline'
                ? 'Kỷ luật vi phạm'
                : inc.category === 'absence'
                ? 'Nghỉ ốm / Vắng mặt'
                : 'Khác',
            'Mức Độ':
              inc.severity === 'emergency'
                ? 'KHẨN CẤP'
                : inc.severity === 'warning'
                ? 'Cần theo dõi'
                : 'Bình thường',
            'Chi Tiết Tình Trạng': inc.incidentDetail,
            'Biện Pháp Xử Lý Ban Đầu': inc.initialActionTaken,
            'GVQN Báo Cáo': inc.teacherName,
            'Ca Trực': inc.shift,
            'Ngày Báo Cáo': inc.reportDate,
            'Trạng Thái Xử Lý': inc.handled ? 'Đã xử lý' : 'Đang theo dõi / Cần xử lý',
          }));
        } else if (exportType === 'room_conditions') {
          sheetName = 'CanhBaoPhongKTX';
          rows = allRoomConditionsForDate.map((rm, i) => ({
            STT: i + 1,
            'Phòng KTX': rm.roomName,
            'Tòa Nhà': rm.building || 'DomB',
            'Tình Trạng Vệ Sinh':
              rm.hygieneStatus === 'good' ? 'Sạch sẽ' : rm.hygieneStatus === 'average' ? 'Trung bình' : 'Kém',
            'Hư Hỏng CSVC / Thiết Bị': rm.facilityIssues || 'Không có',
            'Nền Nếp / Trật Tự': rm.disciplineStatus || 'Bình thường',
            'Mức Độ Cảnh Báo':
              rm.severity === 'critical'
                ? 'NGHIÊM TRỌNG'
                : rm.severity === 'warning'
                ? 'Cần khắc phục'
                : 'Bình thường',
            'GVQN Báo Cáo': rm.teacherName,
            'Ca Trực': rm.shift,
            'Ngày Báo Cáo': rm.reportDate,
            'Trạng Thái Xử Lý': rm.handled ? 'Đã khắc phục' : 'Chưa khắc phục',
          }));
        } else {
          sheetName = 'BaoCaoCaTruc';
          rows = reportsForSelectedDate.map((r, i) => ({
            STT: i + 1,
            'Ngày Báo Cáo': r.date,
            'Ca Trực': r.shift,
            'Giáo Viên Quản Nhiệm': r.teacherName,
            'Mã GV': r.teacherCode,
            'Tiến Độ (%)': r.tasksCompletionRate,
            'Trạng Thái Ca':
              r.workStatus === 'completed'
                ? 'Hoàn thành'
                : r.workStatus === 'in_progress'
                ? 'Đang thực hiện'
                : 'Còn vướng mắc',
            'Tóm Tắt Công Việc': r.workSummary,
            'Ghi Chú Bàn Giao': r.handoverNotes || '',
            'Kiến Nghị Lên Admin': r.suggestionsToManager || '',
            'Số Ca HS Phát Sinh': r.studentIncidents?.length || 0,
            'Số Phòng Sự Cố': r.roomConditions?.length || 0,
            'Chỉ Đạo Của Admin': r.adminFeedback || 'Chưa phản hồi',
          }));
        }

        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Thông báo': 'Không có dữ liệu' }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `Bao_Cao_${exportType}_${selectedDate}.xlsx`);
      }

      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    }, 1000);
  };

  // Filtered student candidates for student search in modal
  const filteredStudentSuggestions = studentSearchKeyword.trim()
    ? students
        .filter(
          (s) =>
            s.studentCode.toLowerCase().includes(studentSearchKeyword.toLowerCase()) ||
            s.fullName.toLowerCase().includes(studentSearchKeyword.toLowerCase()) ||
            s.roomName.toLowerCase().includes(studentSearchKeyword.toLowerCase())
        )
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Hệ Thống Báo Cáo Công Việc & Giám Sát Ký Túc Xá</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <span>Báo Cáo Công Việc Hằng Ngày & Cảnh Báo Live</span>
            {emergencyIncidentsCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white animate-pulse">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>{emergencyIncidentsCount} ca khẩn cấp</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mỗi GVQN báo cáo công việc và tình trạng học sinh (bắt buộc Mã HS) + phòng KTX. Admin Thầy Lê Huy Phúc theo dõi toàn bộ và chỉ đạo trực tiếp.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap items-center rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Phân Tích & Cảnh Báo</span>
            {(emergencyIncidentsCount > 0 || warningRoomsCount > 0) && (
              <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[9px] font-black">
                {emergencyIncidentsCount + warningRoomsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('submit')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition ${
              activeTab === 'submit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>{editingReportId ? 'Đang Sửa Báo Cáo' : 'Nộp Báo Cáo Ngày (GVQN)'}</span>
          </button>

          {!isManager && (
            <button
              onClick={() => setActiveTab('my_reports')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition ${
                activeTab === 'my_reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Báo Cáo Của Tôi ({myReports.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Global Toast for reminders */}
      {reminderToast && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-300 p-3.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 shadow-md">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            <span>{reminderToast}</span>
          </div>
          <button onClick={() => setReminderToast(null)} className="text-amber-700 hover:text-amber-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PHÂN TÍCH TỔNG HỢP & CẢNH BÁO CHO ADMIN & TOÀN BỘ                   */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Controls Bar: Chọn ngày & ca & GV */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Ngày Báo Cáo:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Ca trực:</span>
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="all">Tất cả ca trực</option>
                  <option value="morning">Ca Sáng (06:00 - 11:30)</option>
                  <option value="noon">Ca Trưa (11:30 - 14:00)</option>
                  <option value="afternoon">Ca Chiều (14:00 - 18:00)</option>
                  <option value="evening">Ca Tối (18:00 - 22:30)</option>
                  <option value="night">Ca Đêm (22:30 - 06:00)</option>
                  <option value="fullday">Ca Cả Ngày</option>
                </select>
              </div>

              {isManager && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">GVQN:</span>
                  <select
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="all">Tất cả GVQN</option>
                    {allTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.teacherCode || 'GVQN'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportData('excel')}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất Excel Ngày Này</span>
              </button>
            </div>
          </div>

          {/* Aggregated KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Báo Cáo Đã Nộp</span>
                <FileCheck className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-400">
                {reportsForSelectedDate.length} Báo cáo
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {teachersSubmitted.length}/{allTeachers.length} GVQN đã nộp ngày {selectedDate}
              </div>
            </div>

            <div className="rounded-3xl border-2 border-rose-300 bg-rose-50/80 p-4 dark:border-rose-900/80 dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>🚨 Cảnh Báo Khẩn Cấp HS</span>
                <HeartPulse className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-600">
                {emergencyIncidentsCount} Ca Khẩn
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 font-semibold">
                Cần can thiệp y tế / kỷ luật gấp
              </div>
            </div>

            <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>⚠️ Sự Vụ Cần Theo Dõi</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600">
                {warningIncidentsCount} Sự vụ
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {healthIncidentsCount} sức khỏe • {mentalIncidentsCount} tâm lý • {disciplineIncidentsCount} kỷ luật
              </div>
            </div>

            <div className="rounded-3xl border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-900/60 dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>🏢 Phòng KTX Có Sự Cố</span>
                <Building2 className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-purple-600">
                {warningRoomsCount} Phòng
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {roomFacilityIssueCount} phòng hỏng CSVC / vệ sinh kém
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* THEO DÕI TIẾN ĐỘ NỘP BÁO CÁO CỦA CÁC GVQN HÔM NAY                     */}
          {/* ===================================================================== */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    Tình Trạng Nộp Báo Cáo Ngày Của Các Giáo Viên Quản Nhiệm
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Theo dõi giáo viên đã nộp báo cáo ca trực và các thầy cô còn thiếu
                  </p>
                </div>
              </div>

              {isManager && teachersPending.length > 0 && (
                <button
                  onClick={handleSendReminders}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Nhắc Nhở {teachersPending.length} GV Chưa Nộp</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Đã nộp */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Đã nộp báo cáo ({teachersSubmitted.length})</span>
                  </span>
                </div>
                {teachersSubmitted.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Chưa có GVQN nào nộp báo cáo ca ngày này.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teachersSubmitted.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-xl border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-xs dark:bg-slate-900 dark:border-emerald-800 dark:text-emerald-300"
                      >
                        ✓ {t.fullName} ({t.teacherCode || 'GVQN'})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Chưa nộp */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>Chưa nộp báo cáo ({teachersPending.length})</span>
                  </span>
                </div>
                {teachersPending.length === 0 ? (
                  <p className="text-emerald-600 font-bold text-[11px]">
                    Tuyệt vời! 100% Giáo viên Quản nhiệm đã nộp đủ báo cáo ca ngày {selectedDate}.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teachersPending.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"
                      >
                        ⏳ {t.fullName} ({t.teacherCode || 'GVQN'})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* BẢNG CẢNH BÁO TÌNH TRẠNG HỌC SINH (BẮT BUỘC CÓ MÃ HS)               */}
          {/* ===================================================================== */}
          <div className="rounded-3xl border-2 border-rose-300 bg-white p-5 shadow-sm dark:border-rose-900/80 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-3 dark:border-rose-950">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-500/30">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>Khu Vực Cảnh Báo Tình Trạng Học Sinh Phát Sinh Trong Ngày</span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                      {allIncidentsForDate.length} Sự vụ
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bắt buộc có Mã HS • Tự động nhận diện hồ sơ để Admin Thầy Lê Huy Phúc và BGH theo dõi kịp thời
                  </p>
                </div>
              </div>

              {/* Tìm kiếm sự vụ */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchIncident}
                  onChange={(e) => setSearchIncident(e.target.value)}
                  placeholder="Tìm Mã HS, tên, phòng, bệnh..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Sub-filters for incidents */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-500">Lọc theo:</span>
              <button
                onClick={() => setIncidentSeverityFilter('all')}
                className={`rounded-xl px-2.5 py-1 font-bold transition ${
                  incidentSeverityFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Tất cả ({allIncidentsForDate.length})
              </button>
              <button
                onClick={() => setIncidentSeverityFilter('emergency')}
                className={`rounded-xl px-2.5 py-1 font-bold transition ${
                  incidentSeverityFilter === 'emergency'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                🚨 Khẩn cấp ({emergencyIncidentsCount})
              </button>
              <button
                onClick={() => setIncidentSeverityFilter('warning')}
                className={`rounded-xl px-2.5 py-1 font-bold transition ${
                  incidentSeverityFilter === 'warning'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                ⚠️ Cần theo dõi ({warningIncidentsCount})
              </button>
              <button
                onClick={() => setIncidentSeverityFilter('unhandled')}
                className={`rounded-xl px-2.5 py-1 font-bold transition ${
                  incidentSeverityFilter === 'unhandled'
                    ? 'bg-red-700 text-white'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                ⏳ Chưa xử lý ({allIncidentsForDate.filter((i) => !i.handled).length})
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={() =>
                  setIncidentCategoryFilter(incidentCategoryFilter === 'health' ? 'all' : 'health')
                }
                className={`rounded-xl px-2.5 py-1 font-bold transition ${
                  incidentCategoryFilter === 'health'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                🩺 Sức khỏe y tế ({healthIncidentsCount})
              </button>
              <button
                onClick={() =>
                  setIncidentCategoryFilter(incidentCategoryFilter === 'discipline' ? 'all' : 'discipline')
                }
                className={`rounded-xl px-2.5 py-1 font-bold transition ${
                  incidentCategoryFilter === 'discipline'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                ⚠️ Kỷ luật ({disciplineIncidentsCount})
              </button>
              <button
                onClick={() =>
                  setIncidentCategoryFilter(incidentCategoryFilter === 'mental' ? 'all' : 'mental')
                }
                className={`rounded-xl px-2.5 py-1 font-bold transition ${
                  incidentCategoryFilter === 'mental'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                🧠 Tâm lý ({mentalIncidentsCount})
              </button>
            </div>

            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không có sự vụ học sinh bất thường nào phù hợp với bộ lọc trong ngày {selectedDate}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Mã HS (*)</th>
                      <th className="p-3">Học sinh & Lớp</th>
                      <th className="p-3">Phòng KTX</th>
                      <th className="p-3">Phân loại</th>
                      <th className="p-3">Mức độ</th>
                      <th className="p-3">Chi tiết Tình trạng & Xử lý ban đầu</th>
                      <th className="p-3">GV Báo cáo</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        className={`hover:bg-slate-50/80 transition dark:hover:bg-slate-800/50 ${
                          inc.severity === 'emergency'
                            ? 'bg-rose-50/50 dark:bg-rose-950/20'
                            : inc.severity === 'warning'
                            ? 'bg-amber-50/30 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-black text-rose-700 dark:text-rose-400 text-xs">
                          {inc.studentCode}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{inc.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-medium">Lớp: {inc.className}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {inc.roomName}
                        </td>
                        <td className="p-3">
                          <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {inc.category === 'health'
                              ? '🩺 Sức khỏe y tế'
                              : inc.category === 'mental'
                              ? '🧠 Tâm lý'
                              : inc.category === 'discipline'
                              ? '⚠️ Kỷ luật'
                              : inc.category === 'absence'
                              ? '💤 Vắng mặt'
                              : '🔹 Khác'}
                          </span>
                        </td>
                        <td className="p-3">
                          {inc.severity === 'emergency' ? (
                            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[9px] font-black text-white shadow-sm flex items-center gap-1 w-fit animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              Khẩn cấp
                            </span>
                          ) : inc.severity === 'warning' ? (
                            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[9px] font-black text-white shadow-sm flex items-center gap-1 w-fit">
                              Cần theo dõi
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              Bình thường
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-sm">
                          <div className="text-slate-800 dark:text-slate-200 font-semibold leading-snug">
                            {inc.incidentDetail}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
                            <strong>Đã xử lý ban đầu:</strong> {inc.initialActionTaken}
                          </div>
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">{inc.teacherName}</span>
                          <span className="block text-[10px] text-slate-400">Ca: {inc.shift}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleIncident(inc.reportId, inc.id)}
                            className={`rounded-xl px-2.5 py-1 text-[10px] font-bold transition shadow-sm ${
                              inc.handled
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {inc.handled ? '✓ Đã xử lý' : '⏳ Cần xử lý'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* BẢNG CẢNH BÁO TÌNH TRẠNG PHÒNG KTX PHÁT SINH TRONG NGÀY             */}
          {/* ===================================================================== */}
          <div className="rounded-3xl border-2 border-purple-200 bg-white p-5 shadow-sm dark:border-purple-900/80 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3 dark:border-purple-950">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/30">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>Khu Vực Cảnh Báo Tình Trạng Phòng KTX (Vệ Sinh & Cơ Sở Vật Chất)</span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-black text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                      {allRoomConditionsForDate.length} Phòng
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Giám sát phòng KTX vệ sinh kém, rà soát hư hỏng thiết bị điện nước, quạt đèn để gọi kỹ thuật
                  </p>
                </div>
              </div>
            </div>

            {allRoomConditionsForDate.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tất cả các phòng KTX đều hoạt động bình thường, không có báo cáo sự cố trong ngày {selectedDate}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allRoomConditionsForDate.map((rm) => (
                  <div
                    key={rm.id}
                    className={`rounded-2xl border p-4 text-xs space-y-2 shadow-sm ${
                      rm.severity === 'critical'
                        ? 'border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20'
                        : rm.severity === 'warning'
                        ? 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20'
                        : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-purple-600" />
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {rm.roomName}
                        </span>
                        <span className="text-[10px] text-slate-400">({rm.building || 'DomB'})</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          rm.hygieneStatus === 'good'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rm.hygieneStatus === 'average'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Vệ sinh: {rm.hygieneStatus === 'good' ? 'Sạch' : rm.hygieneStatus === 'average' ? 'Trung bình' : 'Kém'}
                      </span>
                    </div>

                    {rm.facilityIssues && (
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-300 font-semibold text-[11px] flex items-start gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                        <span>Hư hỏng: {rm.facilityIssues}</span>
                      </div>
                    )}

                    {rm.disciplineStatus && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                        Nền nếp: {rm.disciplineStatus}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[10px] text-slate-400">
                      <span>GV: {rm.teacherName} (Ca {rm.shift})</span>
                      <button
                        onClick={() => handleToggleRoom(rm.reportId, rm.id)}
                        className={`rounded-lg px-2.5 py-1 font-bold transition shadow-xs ${
                          rm.handled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {rm.handled ? '✓ Đã khắc phục' : '⏳ Cần xử lý'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* DANH SÁCH CHI TIẾT TỪNG BẢN BÁO CÁO NGÀY CỦA TẤT CẢ GVQN              */}
          {/* ===================================================================== */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-600" />
                <span>Chi Tiết Báo Cáo Ca Trực Từng GVQN ({reportsForSelectedDate.length} Bản Báo Cáo)</span>
              </h3>
            </div>

            {reportsForSelectedDate.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có giáo viên nào gửi báo cáo ca cho ngày {selectedDate}.
              </div>
            ) : (
              <div className="space-y-3">
                {reportsForSelectedDate.map((rep) => (
                  <div
                    key={rep.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-3 transition hover:border-blue-400"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-sm">
                          {rep.teacherName} ({rep.teacherCode})
                        </span>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase">
                          Ca {rep.shift}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {rep.createdAt.replace('T', ' ').substring(0, 16)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Tiến độ: {rep.tasksCompletionRate}%
                        </span>
                        {rep.adminReviewed ? (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            ✓ Thầy Phúc đã phản hồi
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ⏳ Chờ Thầy Phúc xem
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedReport(rep);
                            setAdminFeedbackInput(rep.adminFeedback || '');
                          }}
                          className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1 font-bold text-white shadow-sm hover:bg-blue-700"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Xem & Chỉ đạo</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Tóm tắt ca:</strong> {rep.workSummary}
                    </p>

                    {rep.studentIncidents?.length > 0 && (
                      <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                        <HeartPulse className="h-3.5 w-3.5" />
                        <span>
                          {rep.studentIncidents.length} sự vụ học sinh: {rep.studentIncidents.map((i) => i.studentCode).join(', ')}
                        </span>
                      </div>
                    )}

                    {rep.handoverNotes && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <strong>Bàn giao ca:</strong> {rep.handoverNotes}
                      </div>
                    )}

                    {rep.adminFeedback && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 dark:border-blue-900 dark:bg-blue-950/40 text-[11px] text-blue-900 dark:text-blue-200">
                        <strong>Chỉ đạo của Thầy Lê Huy Phúc:</strong> "{rep.adminFeedback}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NỘP BÁO CÁO CÔNG VIỆC HẰNG NGÀY (GVQN)                             */}
      {/* ========================================================================= */}
      {activeTab === 'submit' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-600" />
                  <span>
                    {editingReportId ? 'Chỉnh Sửa Bản Báo Cáo Ngày' : 'Mẫu Báo Cáo Công Việc & Tình Trạng Học Sinh, Phòng KTX'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Giáo viên: <strong>{currentUser.fullName} ({currentUser.teacherCode || 'GVQN'})</strong> • Báo cáo sẽ gửi trực tiếp đến Quản lý Thầy Lê Huy Phúc.
                </p>
              </div>

              {editingReportId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReportId(null);
                    setWorkSummary('');
                    setHandoverNotes('');
                    setSuggestions('');
                    setFormIncidents([]);
                    setFormRooms([]);
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Hủy sửa / Tạo mới
                </button>
              )}
            </div>

            {submitSuccessMessage && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{submitSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDailyReport} className="space-y-6 text-xs">
              {/* PHẦN 1: THÔNG TIN CA & TIẾN ĐỘ CÔNG VIỆC */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Phần 1: Thông Tin Ca Trực & Tiến Độ Công Việc</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ngày báo cáo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newReportDate}
                      onChange={(e) => setNewReportDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ca trực <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newReportShift}
                      onChange={(e) => setNewReportShift(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    >
                      <option value="morning">Ca Sáng (06:00 - 11:30)</option>
                      <option value="noon">Ca Trưa (11:30 - 14:00)</option>
                      <option value="afternoon">Ca Chiều (14:00 - 18:00)</option>
                      <option value="evening">Ca Tối (18:00 - 22:30)</option>
                      <option value="night">Ca Đêm (22:30 - 06:00)</option>
                      <option value="fullday">Ca Trực Cả Ngày</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tiến độ hoàn thành nhiệm vụ ({tasksRate}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={tasksRate}
                      onChange={(e) => setTasksRate(Number(e.target.value))}
                      className="w-full mt-2 accent-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tóm tắt công việc đã thực hiện trong ca <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="VD: Điểm danh giờ ăn, kiểm tra vệ sinh phòng 101-106, rà soát học sinh vắng mặt, nhắc nhở giờ tự học tối..."
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ghi chú bàn giao ca trực tiếp theo
                    </label>
                    <textarea
                      rows={2}
                      placeholder="VD: Lưu ý phòng 204 có học sinh đau bụng nhẹ, phòng 102 xin phép học nhóm muộn..."
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Đề xuất / Khó khăn gửi Quản lý Thầy Lê Huy Phúc
                    </label>
                    <textarea
                      rows={2}
                      placeholder="VD: Đề xuất kiểm tra đường nước nóng tầng 2, xin bổ sung thuốc hạ sốt phòng y tế..."
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* PHẦN 2: TÌNH TRẠNG HỌC SINH TRONG NGÀY (BẮT BUỘC CÓ MÃ HS) */}
              <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-600" />
                    <span>Phần 2: Tình Trạng Học Sinh Phát Sinh Trong Ca (BẮT BUỘC CÓ MÃ HS)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIncidentForm({
                        studentCode: '',
                        studentName: '',
                        className: '',
                        roomName: '',
                        category: 'health',
                        severity: 'warning',
                        incidentDetail: '',
                        initialActionTaken: '',
                      });
                      setIsIncidentModalOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Thêm Học Sinh Có Vấn Đề</span>
                  </button>
                </div>

                {formIncidents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-rose-300 bg-white p-4 text-center text-slate-400 dark:bg-slate-900 dark:border-rose-900">
                    Chưa có học sinh nào được ghi nhận phát sinh tình trạng trong ca trực này. Bấm nút <strong>"+ Thêm Học Sinh Có Vấn Đề"</strong> nếu có em bị ốm, vi phạm hoặc cần hỗ trợ tâm lý.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formIncidents.map((inc, idx) => (
                      <div
                        key={inc.id}
                        className="rounded-xl border border-rose-200 bg-white p-3.5 dark:border-rose-900 dark:bg-slate-900 flex items-start justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-rose-700 dark:text-rose-400">
                              [{inc.studentCode}]
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {inc.studentName} ({inc.className} • {inc.roomName})
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                                inc.severity === 'emergency'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {inc.severity === 'emergency' ? 'Khẩn cấp' : 'Cần theo dõi'}
                            </span>
                            <span className="rounded px-1.5 py-0.2 text-[9px] font-semibold bg-slate-100 text-slate-700">
                              {inc.category === 'health'
                                ? 'Sức khỏe'
                                : inc.category === 'mental'
                                ? 'Tâm lý'
                                : inc.category === 'discipline'
                                ? 'Kỷ luật'
                                : 'Vắng mặt'}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">
                            <strong>Chi tiết:</strong> {inc.incidentDetail}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            <strong>Đã xử lý ban đầu:</strong> {inc.initialActionTaken}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormIncidents(formIncidents.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PHẦN 3: TÌNH TRẠNG PHÒNG KTX */}
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/40 p-4 dark:border-purple-900/60 dark:bg-purple-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-extrabold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span>Phần 3: Tình Trạng Phòng KTX (Vệ Sinh & Cơ Sở Vật Chất)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRoomModalOpen(true)}
                    className="flex items-center gap-1 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Ghi Nhận Phòng Có Sự Cố</span>
                  </button>
                </div>

                {formRooms.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-purple-300 bg-white p-4 text-center text-slate-400 dark:bg-slate-900 dark:border-purple-900">
                    Tất cả các phòng KTX phụ trách đều trong tình trạng bình thường, sạch sẽ.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formRooms.map((rm, idx) => (
                      <div
                        key={rm.id}
                        className="rounded-xl border border-purple-200 bg-white p-3.5 dark:border-purple-900 dark:bg-slate-900 flex items-start justify-between gap-3 shadow-sm"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            Phòng: {rm.roomName} ({rm.building}) • Vệ sinh: {rm.hygieneStatus}
                          </div>
                          {rm.facilityIssues && (
                            <div className="text-rose-600 font-semibold text-[11px]">
                              Hư hỏng thiết bị: {rm.facilityIssues}
                            </div>
                          )}
                          {rm.disciplineStatus && (
                            <div className="text-slate-500 text-[10px]">
                              Nền nếp: {rm.disciplineStatus}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormRooms(formRooms.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {editingReportId ? 'Lưu Cập Nhật Báo Cáo' : 'Gửi Báo Cáo Ca Trực Lên Quản Lý Thầy Lê Huy Phúc'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BÁO CÁO CỦA TÔI (CHO GIÁO VIÊN)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'my_reports' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <span>Lịch Sử Báo Cáo Ca Trực Của Thầy/Cô {currentUser.fullName}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xem lại tiến độ, học sinh đã ghi nhận và phản hồi chỉ đạo từ Quản lý Thầy Lê Huy Phúc
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingReportId(null);
                  setActiveTab('submit');
                }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nộp Báo Cáo Mới</span>
              </button>
            </div>

            {myReports.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Thầy/Cô chưa nộp báo cáo ca trực nào. Hãy chuyển sang tab "Nộp Báo Cáo Ngày" để gửi báo cáo đầu tiên!
              </div>
            ) : (
              <div className="space-y-3">
                {myReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          Ngày {rep.date} • Ca {rep.shift.toUpperCase()}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {rep.tasksCompletionRate}% hoàn thành
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Nộp: {rep.createdAt.replace('T', ' ').substring(0, 16)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {rep.adminReviewed ? (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            ✓ Thầy Phúc đã chỉ đạo
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ⏳ Chờ Thầy Phúc xem
                          </span>
                        )}
                        <button
                          onClick={() => handleStartEditReport(rep)}
                          className="flex items-center gap-1 rounded-xl border border-blue-200 bg-white px-3 py-1 font-bold text-blue-700 hover:bg-blue-50 dark:bg-slate-900"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Chỉnh sửa / Bổ sung</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Tóm tắt ca:</strong> {rep.workSummary}
                    </p>

                    {rep.studentIncidents?.length > 0 && (
                      <div className="space-y-1 bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900">
                        <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <HeartPulse className="h-3.5 w-3.5" />
                          <span>Học sinh phát sinh trong ca ({rep.studentIncidents.length}):</span>
                        </div>
                        {rep.studentIncidents.map((i) => (
                          <div key={i.id} className="text-[11px] text-slate-700 dark:text-slate-300">
                            • <strong className="font-mono text-rose-700">[{i.studentCode}]</strong>{' '}
                            {i.studentName} ({i.className} • {i.roomName}): {i.incidentDetail}
                          </div>
                        ))}
                      </div>
                    )}

                    {rep.adminFeedback && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-3 dark:border-blue-900 dark:bg-blue-950/40 text-[11px] text-blue-900 dark:text-blue-200">
                        <strong>Chỉ đạo của Quản lý Thầy Lê Huy Phúc:</strong> "{rep.adminFeedback}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: XUẤT FILE BÁO CÁO                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'export' && (
        <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-600" />
              <span>Trung Tâm Xuất File Báo Cáo Vận Hành & Học Sinh</span>
            </h3>
            <p className="text-slate-500 mt-1">Xuất dữ liệu đối soát theo chuẩn định dạng Excel .xlsx</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Chọn mẫu báo cáo cần xuất
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="daily_work_incidents">Báo cáo Tổng hợp Sự vụ Học sinh & Sức khỏe Ngày</option>
              <option value="room_conditions">Báo cáo Tình trạng Cơ sở vật chất & Vệ sinh Phòng KTX</option>
              <option value="all_teacher_reports">Báo cáo Ca trực Đầy đủ của Tất cả Giáo viên</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Ngày báo cáo
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {exportSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Đã khởi tạo và tải về thành công file báo cáo ({exportType}_{selectedDate}.xlsx)!</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              disabled={isExporting}
              onClick={() => handleExportData('excel')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-md hover:bg-emerald-700 transition"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isExporting ? 'Đang xuất file Excel...' : 'Tải Về File Báo Cáo Excel (.xlsx)'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM HỌC SINH CÓ VẤN ĐỀ (BẮT BUỘC MÃ HS)                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        title="Ghi Nhận Học Sinh Có Tình Trạng Phát Sinh Trong Ca"
        subtitle="Yêu cầu nhập Mã HS để hệ thống tự động nhận diện và cập nhật hồ sơ"
      >
        <form onSubmit={handleAddIncident} className="space-y-4 text-xs">
          {/* Ô nhập & Gợi ý Mã HS */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mã Học Sinh <span className="text-red-500">*</span> (Gõ mã HS hoặc tìm kiếm tên)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="VD: HS1002, HS1003, HS2025001..."
                value={incidentForm.studentCode}
                onChange={(e) => {
                  handleStudentCodeInput(e.target.value);
                  setStudentSearchKeyword(e.target.value);
                }}
                className="w-full rounded-xl border border-rose-300 bg-white p-2.5 font-mono font-black text-rose-700 focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-slate-900 dark:text-rose-400"
              />
            </div>

            {/* Quick Autocomplete dropdown if typing */}
            {filteredStudentSuggestions.length > 0 && (
              <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 z-10">
                {filteredStudentSuggestions.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => handleStudentSelect(s)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-slate-700"
                  >
                    <div>
                      <span className="font-mono font-black text-rose-700 dark:text-rose-400">
                        {s.studentCode}
                      </span>{' '}
                      - <span className="font-bold text-slate-800 dark:text-slate-100">{s.fullName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {s.className} • {s.roomName}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick suggestions from first 6 students */}
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-400 self-center mr-1">Gợi ý nhanh:</span>
              {students.slice(0, 5).map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => handleStudentSelect(s)}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700 hover:bg-rose-100 hover:text-rose-800 dark:bg-slate-800 dark:text-slate-300"
                >
                  {s.studentCode} ({s.fullName})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Họ và Tên Học Sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={incidentForm.studentName}
                onChange={(e) => setIncidentForm({ ...incidentForm, studentName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
              <input
                type="text"
                value={incidentForm.className}
                onChange={(e) => setIncidentForm({ ...incidentForm, className: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng KTX</label>
              <input
                type="text"
                value={incidentForm.roomName}
                onChange={(e) => setIncidentForm({ ...incidentForm, roomName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phân loại vấn đề
              </label>
              <select
                value={incidentForm.category}
                onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="health">🩺 Sức khỏe / Y tế (sốt, đau bụng, hen, dị ứng...)</option>
                <option value="mental">🧠 Tâm lý (buồn bã, khóc, bất an, stress, nhớ nhà)</option>
                <option value="discipline">⚠️ Kỷ luật (vi phạm giờ, điện thoại, ồn ào...)</option>
                <option value="absence">💤 Nghỉ ốm / Vắng mặt chưa về phòng</option>
                <option value="other">🔹 Khác</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mức độ nghiêm trọng
              </label>
              <select
                value={incidentForm.severity}
                onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="emergency">🚨 Khẩn cấp (Cần xử lý ngay lập tức)</option>
                <option value="warning">⚠️ Cần theo dõi sát trong ca</option>
                <option value="normal">Bình thường / Đã kiểm soát</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chi tiết tình trạng học sinh <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="VD: Em Ngọc sốt 38.5 độ lúc 15h, kêu đau đầu nhiều; hoặc vi phạm chơi game sau 22h30..."
              value={incidentForm.incidentDetail}
              onChange={(e) => setIncidentForm({ ...incidentForm, incidentDetail: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Biện pháp đã xử lý ban đầu của GVQN
            </label>
            <textarea
              rows={2}
              placeholder="VD: Đã đưa xuống phòng y tế đo nhiệt độ, uống thuốc hạ sốt và gọi điện thông báo cho mẹ..."
              value={incidentForm.initialActionTaken}
              onChange={(e) => setIncidentForm({ ...incidentForm, initialActionTaken: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsIncidentModalOpen(false)}
              className="rounded-xl border px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700 shadow-md"
            >
              Lưu Vào Báo Cáo
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: GHI NHẬN PHÒNG KTX CÓ SỰ CỐ                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title="Ghi Nhận Phòng KTX Có Vấn Đề Phát Sinh"
      >
        <form onSubmit={handleAddRoomCondition} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng KTX</label>
              <select
                value={roomForm.roomName}
                onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>
                    {r.roomNumber} ({r.building} - Tầng {r.floor})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tình trạng vệ sinh</label>
              <select
                value={roomForm.hygieneStatus}
                onChange={(e) => setRoomForm({ ...roomForm, hygieneStatus: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="good">Tốt / Sạch sẽ đạt chuẩn</option>
                <option value="average">Trung bình / Cần chấn chỉnh</option>
                <option value="poor">Kém / Rất bẩn, bừa bộn</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Hư hỏng trang thiết bị (nếu có)
            </label>
            <input
              type="text"
              placeholder="VD: Hỏng quạt trần, vỡ bóng đèn, rò rỉ vòi nước, kẹt khóa cửa..."
              value={roomForm.facilityIssues}
              onChange={(e) => setRoomForm({ ...roomForm, facilityIssues: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nền nếp & Trật tự phòng
            </label>
            <input
              type="text"
              placeholder="VD: Học sinh ồn ào sau 22h, để giày dép lộn xộn..."
              value={roomForm.disciplineStatus}
              onChange={(e) => setRoomForm({ ...roomForm, disciplineStatus: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mức độ cảnh báo</label>
            <select
              value={roomForm.severity}
              onChange={(e) => setRoomForm({ ...roomForm, severity: e.target.value as any })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="normal">Bình thường</option>
              <option value="warning">⚠️ Cần nhắc nhở / Khắc phục</option>
              <option value="critical">🚨 Khẩn cấp / Cần gọi kỹ thuật ngay</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="rounded-xl border px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white hover:bg-purple-700 shadow-md"
            >
              Lưu Phòng Vào Báo Cáo
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: XEM CHI TIẾT & CHỈ ĐẠO CỦA ADMIN (THẦY LÊ HUY PHÚC)                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={`Chi Tiết Báo Cáo Ca ${selectedReport?.shift?.toUpperCase()} - ${selectedReport?.teacherName}`}
        subtitle={`Ngày: ${selectedReport?.date} • Nộp lúc: ${selectedReport?.createdAt.replace('T', ' ').substring(0, 16)}`}
        maxWidth="3xl"
      >
        {selectedReport && (
          <div className="space-y-4 text-xs">
            {feedbackSuccessToast && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{feedbackSuccessToast}</span>
              </div>
            )}

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white block">Tóm tắt công việc trong ca:</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedReport.workSummary}</p>
            </div>

            {selectedReport.studentIncidents?.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span>Sự vụ học sinh ({selectedReport.studentIncidents.length}):</span>
                </span>
                <div className="space-y-2">
                  {selectedReport.studentIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900 dark:bg-slate-800 space-y-1"
                    >
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="font-mono text-rose-700 dark:text-rose-400">[{inc.studentCode}]</span>
                        <span>
                          {inc.studentName} ({inc.className} • {inc.roomName})
                        </span>
                        <span
                          className={`rounded px-2 py-0.2 text-[9px] font-black ${
                            inc.severity === 'emergency' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          }`}
                        >
                          {inc.severity === 'emergency' ? 'Khẩn cấp' : 'Cần theo dõi'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Chi tiết:</strong> {inc.incidentDetail}
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        <strong>Đã xử lý ban đầu:</strong> {inc.initialActionTaken}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport.roomConditions?.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span>Tình trạng phòng KTX ({selectedReport.roomConditions.length}):</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedReport.roomConditions.map((rm) => (
                    <div
                      key={rm.id}
                      className="rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 dark:border-purple-900 dark:bg-slate-800 text-[11px]"
                    >
                      <strong>Phòng {rm.roomName}</strong> • Vệ sinh: {rm.hygieneStatus}
                      {rm.facilityIssues && <div className="text-rose-600">Hỏng: {rm.facilityIssues}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Feedback Box */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/40 space-y-3">
              <div className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span>Ý Kiến Phản Hồi & Chỉ Đạo Của Quản Lý Thầy Lê Huy Phúc:</span>
              </div>

              {isManager ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Nhập ý kiến đánh giá, giải pháp xử lý sự cố hoặc lời khen ngợi chỉ đạo cho GVQN..."
                    value={adminFeedbackInput}
                    onChange={(e) => setAdminFeedbackInput(e.target.value)}
                    className="w-full rounded-xl border border-blue-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSendAdminFeedback(selectedReport.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Gửi Chỉ Đạo Trực Tiếp</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {selectedReport.adminFeedback ? (
                    <p className="font-semibold text-blue-900 dark:text-blue-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-200 dark:border-blue-900">
                      "{selectedReport.adminFeedback}"
                    </p>
                  ) : (
                    <p className="text-slate-400 italic">Quản lý Thầy Lê Huy Phúc đang xem xét báo cáo này.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
