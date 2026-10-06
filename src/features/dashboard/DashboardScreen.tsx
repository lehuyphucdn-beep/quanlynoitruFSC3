import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Building2,
  MessageSquareHeart,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  HeartPulse,
  AlertCircle,
  FileWarning,
  Brain,
  BookOpen,
  Phone,
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Download,
  FileUp,
  FileCheck,
  Check,
  Stethoscope,
  Info,
  Lock,
  User,
  Filter,
  Eye,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { Student, KPIRecord, User as SystemUser, SpecialLabel } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';

interface DashboardScreenProps {
  setActiveModule?: (mod: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ setActiveModule }) => {
  const [currentUser, setCurrentUser] = useState<SystemUser>(BOPSStore.getCurrentUser());
  const [tasks, setTasks] = useState(BOPSStore.getTasks());
  const [rooms, setRooms] = useState(BOPSStore.getRooms());
  const [kpis, setKPIs] = useState<KPIRecord[]>(BOPSStore.getKPIs());
  const [students, setStudents] = useState<Student[]>(BOPSStore.getStudents());
  const [users, setUsers] = useState<SystemUser[]>(BOPSStore.getUsers());

  // Scope: 'my_students' (default for teachers) vs 'all'
  const isManager = currentUser.role === 'manager';
  const [scopeFilter, setScopeFilter] = useState<'my_students' | 'all'>(
    isManager ? 'all' : 'my_students'
  );

  // Student Tracking Filters in Dashboard
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentActiveTab, setStudentActiveTab] = useState<'all' | 'special'>('special');
  const [studentSpecialFilter, setStudentSpecialFilter] = useState<string>('all');

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [viewingStudentProfile, setViewingStudentProfile] = useState<Student | null>(null);

  // Excel Upload state in Dashboard
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [parsedPreviewList, setParsedPreviewList] = useState<
    (Omit<Student, 'id'> & { previewId: string; isDuplicate: boolean })[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = () => {
      setCurrentUser(BOPSStore.getCurrentUser());
      setTasks(BOPSStore.getTasks());
      setRooms(BOPSStore.getRooms());
      setKPIs(BOPSStore.getKPIs());
      setStudents(BOPSStore.getStudents());
      setUsers(BOPSStore.getUsers());
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  // Permission check: giáo viên chỉ được sửa học sinh do chính mình phụ trách / tải lên
  const canEditStudent = (student?: Student | null): boolean => {
    if (!student || !currentUser) return false;
    if (currentUser.role === 'manager') return true;
    const isUploader = student.uploadedByUserId === currentUser.id;
    const isTeacherId = student.teacherId === currentUser.id;
    const isTeacherName =
      Boolean(student.teacherName && currentUser.fullName &&
      student.teacherName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());
    const isTeacherCode = Boolean(
      currentUser.teacherCode &&
      (student.teacherName?.toLowerCase().includes(currentUser.teacherCode.toLowerCase()) ||
       student.uploadedByUserName?.toLowerCase().includes(currentUser.teacherCode.toLowerCase()))
    );
    return isUploader || isTeacherId || isTeacherName || isTeacherCode;
  };

  // Base list based on scope
  const scopedStudents = students.filter((s) => {
    if (scopeFilter === 'my_students') {
      const isUploader = s.uploadedByUserId === currentUser.id;
      const isTeacherId = s.teacherId === currentUser.id;
      const isTeacherName =
        Boolean(s.teacherName && currentUser.fullName &&
        s.teacherName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase());
      const isTeacherCode = Boolean(
        currentUser.teacherCode &&
        (s.teacherName?.toLowerCase().includes(currentUser.teacherCode.toLowerCase()) ||
         s.uploadedByUserName?.toLowerCase().includes(currentUser.teacherCode.toLowerCase()))
      );
      return isUploader || isTeacherId || isTeacherName || isTeacherCode;
    }
    return true;
  });

  // Filter students by search and special category
  const filteredDashboardStudents = scopedStudents.filter((s) => {
    const q = studentSearchQuery.toLowerCase();
    const matchesQuery =
      s.fullName.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      s.roomName.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      (s.teacherName && s.teacherName.toLowerCase().includes(q)) ||
      (s.healthNote && s.healthNote.toLowerCase().includes(q)) ||
      (s.note && s.note.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (studentActiveTab === 'special') {
      if (!s.specialCare) return false;
      if (studentSpecialFilter === 'health') {
        return (
          Boolean(s.healthNote && s.healthNote.trim().length > 0) ||
          (s.specialLabels && s.specialLabels.includes('health_issue'))
        );
      }
      if (studentSpecialFilter === 'mental') {
        return s.specialLabels && s.specialLabels.includes('mental_support');
      }
      if (studentSpecialFilter === 'academic') {
        return s.specialLabels && s.specialLabels.includes('academic_risk');
      }
      if (studentSpecialFilter === 'behavior') {
        return s.specialLabels && s.specialLabels.includes('behavior_issue');
      }
      if (studentSpecialFilter === 'parent') {
        return s.specialLabels && s.specialLabels.includes('parent_request');
      }
      return true;
    }

    return true;
  });

  // Special Care Metrics in Dashboard
  const totalSpecialCount = scopedStudents.filter((s) => s.specialCare).length;
  const healthCount = scopedStudents.filter(
    (s) =>
      s.specialCare &&
      (Boolean(s.healthNote && s.healthNote.trim().length > 0) ||
        (s.specialLabels && s.specialLabels.includes('health_issue')))
  ).length;
  const mentalCount = scopedStudents.filter(
    (s) => s.specialCare && s.specialLabels && s.specialLabels.includes('mental_support')
  ).length;
  const academicCount = scopedStudents.filter(
    (s) => s.specialCare && s.specialLabels && s.specialLabels.includes('academic_risk')
  ).length;
  const behaviorCount = scopedStudents.filter(
    (s) => s.specialCare && s.specialLabels && s.specialLabels.includes('behavior_issue')
  ).length;
  const parentCount = scopedStudents.filter(
    (s) => s.specialCare && s.specialLabels && s.specialLabels.includes('parent_request')
  ).length;

  // Filter Low Performance / At-Risk Teachers (Score < 85 or rank 'Cần cải thiện')
  const lowPerformanceKPIs = kpis.filter(
    (k) => k.totalScore < 85 || k.rank.toLowerCase().includes('cần cải thiện') || k.rank.toLowerCase().includes('yếu')
  );

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const headers = [
      'Mã học sinh (*)',
      'Họ và tên (*)',
      'Lớp (*)',
      'Phòng KTX (*)',
      'Giới tính (Nam/Nữ)',
      'Ngày sinh (YYYY-MM-DD)',
      'Họ tên Phụ huynh',
      'Số điện thoại Phụ huynh',
      'Thông tin sức khỏe (Bệnh nền, dị ứng, thuốc...)',
      'Ghi chú quản nhiệm',
      'Theo dõi đặc biệt (Có/Không)',
      'Phân loại theo dõi (Sức khỏe, Tâm lý, Học tập, Kỷ luật, Yêu cầu PH)',
      'Giáo viên phụ trách',
    ];

    const sampleRows = [
      [
        'HS1001',
        'Nguyễn Gia Huy',
        '10A1',
        'DomB-101',
        'Nam',
        '2009-03-15',
        'Nguyễn Văn Thành',
        '0912345678',
        '',
        'Học sinh tích cực tham gia phong trào KTX',
        'Không',
        '',
        currentUser.fullName || 'Bùi Ngọc Thắng',
      ],
      [
        'HS1002',
        'Trần Bảo Ngọc',
        '10A2',
        'DomB-201',
        'Nữ',
        '2009-08-22',
        'Lê Thị Thu',
        '0987654321',
        'Tiền sử hen suyễn khi trời lạnh, dị ứng phấn hoa, có bình xịt cá nhân',
        'Cần giáo viên nhắc nhở giữ ấm khi thời tiết chuyển mùa',
        'Có',
        'Sức khỏe',
        currentUser.fullName || 'Nguyễn Thị Minh Phương',
      ],
      [
        'HS1003',
        'Phạm Minh Triết',
        '11B1',
        'DomB-302',
        'Nam',
        '2008-04-10',
        'Phạm Văn Dũng',
        '0903456789',
        '',
        'Học sinh mới chuyển vào KTX, tính cách khép kín, cần tăng cường tương tác 1-1',
        'Có',
        'Tâm lý',
        currentUser.fullName || 'Đoàn Ngọc Hiệp',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
      { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 38 }, { wch: 36 },
      { wch: 26 }, { wch: 28 }, { wch: 24 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh_Noi_Tru_THPT_FPT.xlsx');
  };

  // Process Excel File Upload in Dashboard
  const processUploadedFile = (file: File) => {
    setUploadError(null);
    setUploadSuccessMessage(null);
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!rawJson || rawJson.length <= 1) {
          setUploadError('File Excel không có dữ liệu học sinh hoặc chỉ chứa dòng tiêu đề!');
          setParsedPreviewList([]);
          return;
        }

        const headerRowIndex = rawJson.findIndex((r) => r && r.length > 0);
        if (headerRowIndex < 0) {
          setUploadError('Không tìm thấy dòng tiêu đề trong file Excel!');
          setParsedPreviewList([]);
          return;
        }

        const headers = rawJson[headerRowIndex].map((h) => String(h || '').trim().toLowerCase());

        const findCol = (keywords: string[]) => {
          return headers.findIndex((h) => keywords.some((kw) => h.includes(kw)));
        };

        const codeIdx = findCol(['mã', 'code']);
        const nameIdx = findCol(['họ và tên', 'họ tên', 'tên', 'name', 'học sinh']);
        const classIdx = findCol(['lớp', 'class']);
        const roomIdx = findCol(['phòng', 'room', 'ktx']);
        const genderIdx = findCol(['giới tính', 'gender', 'phái']);
        const dobIdx = findCol(['ngày sinh', 'birthday', 'dob', 'sinh']);
        const parentNameIdx = findCol(['phụ huynh', 'cha', 'mẹ', 'parent']);
        const phoneIdx = findCol(['điện thoại', 'sđt', 'sdt', 'phone']);
        const healthIdx = findCol(['sức khỏe', 'bệnh', 'dị ứng', 'y tế', 'health', 'medical']);
        const noteIdx = findCol(['ghi chú', 'lưu ý', 'note']);
        const specialIdx = findCol(['đặc biệt', 'theo dõi', 'special', 'care', 'ưu tiên']);
        const labelIdx = findCol(['nhãn', 'phân loại', 'loại', 'label']);
        const teacherIdx = findCol(['giáo viên', 'quản nhiệm', 'gv', 'teacher']);

        const parsedRows: (Omit<Student, 'id'> & { previewId: string; isDuplicate: boolean })[] = [];

        for (let i = headerRowIndex + 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0) continue;

          const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';
          const rawName = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
          if (!rawName) continue;

          const studentCode = rawCode || `HS${1000 + i}`;
          const isDuplicate = students.some(
            (s) => s.studentCode.trim().toLowerCase() === studentCode.toLowerCase()
          );

          const className = classIdx >= 0 ? String(row[classIdx] || '').trim() : '10A1';
          const roomName = roomIdx >= 0 ? String(row[roomIdx] || '').trim() : 'DomB-101';
          const rawGender = genderIdx >= 0 ? String(row[genderIdx] || '').trim().toLowerCase() : 'nam';
          const gender: 'nam' | 'nữ' =
            rawGender.includes('nữ') || rawGender.includes('nu') || rawGender.includes('female')
              ? 'nữ'
              : 'nam';
          const rawDob = dobIdx >= 0 ? String(row[dobIdx] || '').trim() : '2008-05-15';
          const parentName = parentNameIdx >= 0 ? String(row[parentNameIdx] || '').trim() : 'Phụ huynh HS';
          const parentPhone = phoneIdx >= 0 ? String(row[phoneIdx] || '').trim() : '0901234567';

          const healthNote = healthIdx >= 0 ? String(row[healthIdx] || '').trim() : '';
          const note = noteIdx >= 0 ? String(row[noteIdx] || '').trim() : '';

          const rawSpecial = specialIdx >= 0 ? String(row[specialIdx] || '').trim().toLowerCase() : '';
          const rawLabel = labelIdx >= 0 ? String(row[labelIdx] || '').trim().toLowerCase() : '';

          const hasExplicitSpecial =
            rawSpecial.includes('có') ||
            rawSpecial.includes('yes') ||
            rawSpecial === '1' ||
            rawSpecial.includes('true') ||
            rawSpecial.includes('x');

          const hasHealthInfo = healthNote.length > 0;
          const hasNoteworthyNotes =
            note.toLowerCase().includes('sức khỏe') ||
            note.toLowerCase().includes('hen') ||
            note.toLowerCase().includes('tim') ||
            note.toLowerCase().includes('dị ứng') ||
            note.toLowerCase().includes('tâm lý') ||
            note.toLowerCase().includes('căng thẳng') ||
            note.toLowerCase().includes('kỷ luật') ||
            note.toLowerCase().includes('theo dõi');

          const specialCare = hasExplicitSpecial || hasHealthInfo || hasNoteworthyNotes;

          const specialLabels: SpecialLabel[] = [];
          if (hasHealthInfo || rawLabel.includes('sức khỏe') || rawLabel.includes('health')) {
            specialLabels.push('health_issue');
          }
          if (rawLabel.includes('tâm lý') || rawLabel.includes('mental')) {
            specialLabels.push('mental_support');
          }
          if (rawLabel.includes('học tập') || rawLabel.includes('academic')) {
            specialLabels.push('academic_risk');
          }
          if (rawLabel.includes('kỷ luật') || rawLabel.includes('hành vi') || rawLabel.includes('behavior')) {
            specialLabels.push('behavior_issue');
          }
          if (rawLabel.includes('yêu cầu') || rawLabel.includes('phụ huynh') || rawLabel.includes('parent')) {
            specialLabels.push('parent_request');
          }

          if (specialCare && specialLabels.length === 0) {
            if (hasHealthInfo) specialLabels.push('health_issue');
            else specialLabels.push('other');
          }

          const teacherName = teacherIdx >= 0 ? String(row[teacherIdx] || '').trim() : '';
          const matchedTeacher = users.find(
            (t) => t.fullName.toLowerCase() === teacherName.toLowerCase()
          );

          parsedRows.push({
            previewId: `prev-${i}`,
            studentCode,
            fullName: rawName,
            className: className || '10A1',
            roomId: `rm-${roomName}`,
            roomName: roomName || 'DomB-101',
            gender,
            birthday: rawDob || '2008-05-15',
            parentName: parentName || 'Phụ huynh HS',
            parentPhone: parentPhone || '0901234567',
            status: 'active',
            specialCare,
            specialLabels,
            healthNote: healthNote || undefined,
            note: note || undefined,
            teacherId: currentUser.role === 'teacher' ? currentUser.id : (matchedTeacher?.id || 'u-gv-001'),
            teacherName: currentUser.role === 'teacher' ? currentUser.fullName : (teacherName || 'Bùi Ngọc Thắng'),
            uploadedByUserId: currentUser.id,
            uploadedByUserName: currentUser.fullName,
            interactionCountThisMonth: 0,
            isDuplicate,
          });
        }

        if (parsedRows.length === 0) {
          setUploadError('Không tìm thấy dòng học sinh hợp lệ nào trong file Excel!');
          setParsedPreviewList([]);
        } else {
          setParsedPreviewList(parsedRows);
          setUploadError(null);
        }
      } catch (err: any) {
        setUploadError(`Lỗi khi đọc file Excel: ${err.message || 'File không đúng định dạng chuẩn Excel (.xlsx, .xls)'}`);
        setParsedPreviewList([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (parsedPreviewList.length === 0) return;

    const result = BOPSStore.bulkImportStudents(
      parsedPreviewList.map(({ previewId, isDuplicate, ...rest }) => rest)
    );

    const specialCount = parsedPreviewList.filter((p) => p.specialCare).length;

    setUploadSuccessMessage(
      `Đã nhập thành công ${parsedPreviewList.length} học sinh (Thêm mới ${result.added} HS, cập nhật ${result.updated} HS)! Bạn có toàn quyền quản lý và chỉnh sửa các học sinh này.`
    );

    setTimeout(() => {
      setIsExcelModalOpen(false);
      setParsedPreviewList([]);
      setUploadFileName(null);
      setUploadSuccessMessage(null);
      if (specialCount > 0) {
        setStudentActiveTab('special');
      }
    }, 1800);
  };

  // Quick toggle Special Care directly
  const handleQuickToggleSpecialCare = (student: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditStudent(student)) {
      alert(`Bạn chỉ có quyền thao tác học sinh do chính mình phụ trách/tải lên! (${student.uploadedByUserName || student.teacherName})`);
      return;
    }

    const newSpecialCare = !student.specialCare;
    const currentLabels = student.specialLabels || [];
    const newLabels =
      newSpecialCare && currentLabels.length === 0
        ? (['health_issue'] as SpecialLabel[])
        : currentLabels;

    const updated: Student = {
      ...student,
      specialCare: newSpecialCare,
      specialLabels: newLabels,
    };

    BOPSStore.updateStudent(updated);
  };

  // Helper when typing Health Note in Edit modal -> auto set specialCare to true
  const handleHealthNoteChangeInEdit = (text: string) => {
    if (!editingStudent) return;
    const currentLabels = editingStudent.specialLabels || [];
    const hasHealthLabel = currentLabels.includes('health_issue');
    const newLabels =
      text.trim().length > 0 && !hasHealthLabel
        ? ([...currentLabels, 'health_issue'] as SpecialLabel[])
        : currentLabels;

    setEditingStudent({
      ...editingStudent,
      healthNote: text,
      specialCare: text.trim().length > 0 ? true : editingStudent.specialCare,
      specialLabels: newLabels,
    });
  };

  // Toggle label in Edit modal
  const handleToggleSpecialLabelInEdit = (labelKey: SpecialLabel) => {
    if (!editingStudent) return;
    const currentLabels = editingStudent.specialLabels || [];
    const exists = currentLabels.includes(labelKey);
    const updated = exists ? currentLabels.filter((l) => l !== labelKey) : [...currentLabels, labelKey];
    setEditingStudent({
      ...editingStudent,
      specialLabels: updated,
      specialCare: updated.length > 0 ? true : editingStudent.specialCare,
    });
  };

  // Save changes to student
  const handleEditStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (!canEditStudent(editingStudent)) {
      alert('Bạn không có quyền chỉnh sửa học sinh này! Chỉ giáo viên phụ trách hoặc người tải lên mới có quyền sửa.');
      return;
    }

    const hasHealthNote = Boolean(editingStudent.healthNote && editingStudent.healthNote.trim().length > 0);
    const hasLabels = Boolean(editingStudent.specialLabels && editingStudent.specialLabels.length > 0);
    const finalSpecialCare = editingStudent.specialCare || hasHealthNote || hasLabels;

    let finalLabels = [...(editingStudent.specialLabels || [])];
    if (hasHealthNote && !finalLabels.includes('health_issue')) {
      finalLabels.push('health_issue');
    }

    const updatedStudent: Student = {
      ...editingStudent,
      specialCare: finalSpecialCare,
      specialLabels: finalLabels,
      healthNote: editingStudent.healthNote?.trim() || undefined,
      note: editingStudent.note?.trim() || undefined,
    };

    BOPSStore.updateStudent(updatedStudent);
    setEditingStudent(null);
  };

  const confirmDeleteStudent = () => {
    if (studentToDelete) {
      if (!canEditStudent(studentToDelete)) {
        alert('Bạn không có quyền xóa học sinh này!');
        setStudentToDelete(null);
        return;
      }
      BOPSStore.deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  // Data for Charts
  const shiftCompletionData = [
    { shift: 'Ca Sáng', completed: 96, late: 4 },
    { shift: 'Ca Trưa', completed: 92, late: 8 },
    { shift: 'Ca Chiều', completed: 98, late: 2 },
    { shift: 'Ca Tối', completed: 95, late: 5 },
    { shift: 'Ca Đêm', completed: 100, late: 0 },
  ];

  const kpiTrendData = [
    { week: 'T1', avgScore: 88 },
    { week: 'T2', avgScore: 91 },
    { week: 'T3', avgScore: 94 },
    { week: 'T4', avgScore: 96 },
  ];

  const hygienePieData = [
    { name: 'Phòng Sạch đạt chuẩn', value: rooms.filter((r) => r.hygieneStatus === 'pass').length, color: '#10b981' },
    { name: 'Phòng Cần nhắc nhở', value: rooms.filter((r) => r.hygieneStatus === 'needs_correction').length, color: '#f59e0b' },
    { name: 'Phòng Kiện toàn gấp', value: rooms.filter((r) => r.hygieneStatus === 'critical').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <BarChart3 className="h-4 w-4" />
            <span>Executive Dashboard • Phân tích & Quản trị Sức khỏe Học sinh</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Dashboard Phân Tích & Theo Dõi Sức Khỏe Nội Trú
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi học sinh diện ưu tiên sức khỏe, cảnh báo rủi ro ca trực và chỉ số vận hành toàn diện.
          </p>
        </div>

        {/* User Scope & Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'teacher' ? (
            <div className="flex items-center rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setScopeFilter('my_students')}
                className={`rounded-xl px-3 py-1.5 font-bold transition ${
                  scopeFilter === 'my_students'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Học sinh của tôi ({scopedStudents.length})
              </button>
              <button
                onClick={() => setScopeFilter('all')}
                className={`rounded-xl px-3 py-1.5 font-bold transition ${
                  scopeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Toàn trường ({students.length})
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Phân quyền Quản lý: Toàn bộ KTX ({students.length} HS)</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span>Tháng 07/2026</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHU VỰC TRỌNG TÂM: THEO DÕI SỨC KHỎE & HỌC SINH CẦN THEO DÕI (SPECIAL CARE)*/}
      {/* ========================================================================= */}
      <div className="rounded-3xl border-2 border-rose-300/80 bg-white p-6 shadow-sm dark:border-rose-900/80 dark:bg-slate-900 space-y-6">
        {/* Module Title & Quick Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100 pb-4 dark:border-rose-950">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <Stethoscope className="h-4 w-4" />
              <span>Khu Vực Trọng Tâm • Theo Dõi Sức Khỏe & Ưu Tiên Chăm Sóc</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <span>Học Sinh Cần Theo Dõi & Sức Khỏe Y Tế Nội Trú</span>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                {totalSpecialCount} HS Cần Quan Tâm
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentUser.role === 'teacher'
                ? `Tài khoản ${currentUser.fullName} có quyền xem toàn diện và CHỈ thao tác chỉnh sửa học sinh do chính mình phụ trách/tải lên.`
                : 'Tài khoản Quản lý Thầy Lê Huy Phúc: Quản trị, giám sát và chỉnh sửa toàn bộ dữ liệu KTX.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Sample Template */}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition shadow-sm"
              title="Tải về file Excel mẫu chuẩn (.xlsx) để nhập học sinh"
            >
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tải File Mẫu Excel</span>
            </button>

            {/* Upload Excel Button */}
            <button
              onClick={() => {
                setIsExcelModalOpen(true);
                setUploadError(null);
                setUploadSuccessMessage(null);
                setParsedPreviewList([]);
                setUploadFileName(null);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              title="Tải lên danh sách học sinh từ file Excel"
            >
              <FileUp className="h-4 w-4" />
              <span>Upload File Excel</span>
            </button>
          </div>
        </div>

        {/* 6 Category Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => {
              setStudentActiveTab('special');
              setStudentSpecialFilter('all');
            }}
            className={`cursor-pointer rounded-2xl border p-3 transition shadow-sm ${
              studentActiveTab === 'special' && studentSpecialFilter === 'all'
                ? 'border-rose-500 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40'
                : 'border-slate-200 bg-slate-50/60 hover:border-rose-300 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>Cần Theo Dõi</span>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-600">{totalSpecialCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tổng số học sinh</div>
          </div>

          <div
            onClick={() => {
              setStudentActiveTab('special');
              setStudentSpecialFilter('health');
            }}
            className={`cursor-pointer rounded-2xl border p-3 transition shadow-sm ${
              studentActiveTab === 'special' && studentSpecialFilter === 'health'
                ? 'border-rose-500 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40'
                : 'border-slate-200 bg-slate-50/60 hover:border-rose-300 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>🩺 Sức Khỏe Y Tế</span>
              <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">{healthCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bệnh nền, hen, dị ứng</div>
          </div>

          <div
            onClick={() => {
              setStudentActiveTab('special');
              setStudentSpecialFilter('mental');
            }}
            className={`cursor-pointer rounded-2xl border p-3 transition shadow-sm ${
              studentActiveTab === 'special' && studentSpecialFilter === 'mental'
                ? 'border-purple-500 bg-purple-50 dark:border-purple-600 dark:bg-purple-950/40'
                : 'border-slate-200 bg-slate-50/60 hover:border-purple-300 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>🧠 Tâm Lý & Hòa Nhập</span>
              <Brain className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-purple-600">{mentalCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Lo âu, nhút nhát, stress</div>
          </div>

          <div
            onClick={() => {
              setStudentActiveTab('special');
              setStudentSpecialFilter('academic');
            }}
            className={`cursor-pointer rounded-2xl border p-3 transition shadow-sm ${
              studentActiveTab === 'special' && studentSpecialFilter === 'academic'
                ? 'border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40'
                : 'border-slate-200 bg-slate-50/60 hover:border-amber-300 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>📚 Nguy Cơ Học Tập</span>
              <BookOpen className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600">{academicCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sa sút, trễ bài tập</div>
          </div>

          <div
            onClick={() => {
              setStudentActiveTab('special');
              setStudentSpecialFilter('behavior');
            }}
            className={`cursor-pointer rounded-2xl border p-3 transition shadow-sm ${
              studentActiveTab === 'special' && studentSpecialFilter === 'behavior'
                ? 'border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/40'
                : 'border-slate-200 bg-slate-50/60 hover:border-red-300 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>⚠️ Kỷ Luật & Hành Vi</span>
              <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-red-600">{behaviorCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Xung đột, vi phạm giờ giấc</div>
          </div>

          <div
            onClick={() => {
              setStudentActiveTab('special');
              setStudentSpecialFilter('parent');
            }}
            className={`cursor-pointer rounded-2xl border p-3 transition shadow-sm ${
              studentActiveTab === 'special' && studentSpecialFilter === 'parent'
                ? 'border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40'
                : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>📞 Yêu Cầu Phụ Huynh</span>
              <Phone className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-blue-600">{parentCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Gia đình gửi gắm lưu ý</div>
          </div>
        </div>

        {/* Filter Toolbar: Main Tabs + Sub Filters + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Main Tab Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setStudentActiveTab('all')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  studentActiveTab === 'all'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tất cả ({scopedStudents.length})
              </button>
              <button
                onClick={() => setStudentActiveTab('special')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  studentActiveTab === 'special'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Học sinh Cần Theo Dõi ({totalSpecialCount})</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã HS, phòng, bệnh, ghi chú..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm"
            />
          </div>
        </div>

        {/* Sub-filters for Special Care */}
        {studentActiveTab === 'special' && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/60 dark:bg-rose-950/20 text-xs">
            <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1 mr-1">
              <Info className="h-3.5 w-3.5" />
              Lọc theo diện theo dõi:
            </span>
            <button
              onClick={() => setStudentSpecialFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-bold transition ${
                studentSpecialFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-rose-800 hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-300'
              }`}
            >
              Tất cả ({totalSpecialCount})
            </button>
            <button
              onClick={() => setStudentSpecialFilter('health')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                studentSpecialFilter === 'health'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-rose-800 hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-300'
              }`}
            >
              <HeartPulse className="h-3.5 w-3.5" />
              <span>🩺 Sức khỏe y tế ({healthCount})</span>
            </button>
            <button
              onClick={() => setStudentSpecialFilter('mental')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                studentSpecialFilter === 'mental'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-purple-800 hover:bg-purple-100 dark:bg-slate-800 dark:text-purple-300'
              }`}
            >
              <Brain className="h-3.5 w-3.5" />
              <span>🧠 Tâm lý & Hòa nhập ({mentalCount})</span>
            </button>
            <button
              onClick={() => setStudentSpecialFilter('academic')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                studentSpecialFilter === 'academic'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-amber-800 hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>📚 Học tập ({academicCount})</span>
            </button>
            <button
              onClick={() => setStudentSpecialFilter('behavior')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                studentSpecialFilter === 'behavior'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-red-800 hover:bg-red-100 dark:bg-slate-800 dark:text-red-300'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>⚠️ Kỷ luật & Hành vi ({behaviorCount})</span>
            </button>
            <button
              onClick={() => setStudentSpecialFilter('parent')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                studentSpecialFilter === 'parent'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-blue-800 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>📞 Yêu cầu PH ({parentCount})</span>
            </button>
          </div>
        )}

        {/* Student Table in Dashboard */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="p-3.5">Mã HS & Họ tên</th>
                <th className="p-3.5">Lớp & Phòng</th>
                <th className="p-3.5">GV Phụ trách / Người tải lên</th>
                <th className="p-3.5">Phụ huynh & SĐT</th>
                <th className="p-3.5">Diện Theo Dõi & Sức Khỏe</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDashboardStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Không có học sinh nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredDashboardStudents.map((student) => {
                  const canEdit = canEditStudent(student);
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition dark:hover:bg-slate-800/50"
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {student.fullName}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
                            {student.gender}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {student.studentCode} • Sinh: {student.birthday || 'N/A'}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {student.className}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{student.roomName}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {student.teacherName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Upload: {student.uploadedByUserName || student.teacherName}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-800 dark:text-slate-200">{student.parentName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{student.parentPhone}</div>
                      </td>

                      {/* Cột Sức khỏe & Diện Theo Dõi Trực Quan */}
                      <td className="p-3.5 max-w-sm">
                        {student.specialCare ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Cần theo dõi
                              </span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickToggleSpecialCare(student, e)}
                                  title="Tắt nhanh chế độ theo dõi"
                                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Dòng cảnh báo sức khỏe y tế màu đỏ */}
                            {student.healthNote && (
                              <div className="rounded-lg bg-rose-50/90 p-1.5 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-[10px] text-rose-800 dark:text-rose-300 leading-snug">
                                <strong>🩺 Sức khỏe:</strong> {student.healthNote}
                              </div>
                            )}

                            {/* Ghi chú quản nhiệm trích dẫn */}
                            {student.note && (
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                                📝 {student.note}
                              </div>
                            )}

                            {/* Các nhãn phân loại */}
                            {student.specialLabels && student.specialLabels.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {student.specialLabels.map((lbl) => (
                                  <span
                                    key={lbl}
                                    className="rounded px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                  >
                                    {lbl === 'health_issue'
                                      ? '🩺 Sức khỏe'
                                      : lbl === 'mental_support'
                                      ? '🧠 Tâm lý'
                                      : lbl === 'academic_risk'
                                      ? '📚 Học tập'
                                      : lbl === 'behavior_issue'
                                      ? '⚠️ Kỷ luật'
                                      : lbl === 'parent_request'
                                      ? '📞 Yêu cầu PH'
                                      : 'Khác'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[10px]">Bình thường</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickToggleSpecialCare(student, e)}
                                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                                title="Đưa vào danh sách cần theo dõi đặc biệt"
                              >
                                + Theo dõi
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Nút Thao tác: Kiểm tra phân quyền chính xác */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit ? (
                            <>
                              <button
                                onClick={() => setEditingStudent({ ...student })}
                                className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm"
                                title="Sửa đầy đủ thông tin học sinh (Bạn có quyền chỉnh sửa học sinh này)"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Sửa</span>
                              </button>
                              <button
                                onClick={() => setStudentToDelete(student)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Xóa học sinh"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span
                              className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 cursor-not-allowed"
                              title={`Chỉ ${student.uploadedByUserName || student.teacherName || 'GV phụ trách/tải lên'} mới có quyền sửa`}
                            >
                              <Lock className="h-3 w-3" />
                              <span>Chỉ xem</span>
                            </span>
                          )}

                          <button
                            onClick={() => setViewingStudentProfile(student)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Xem chi tiết hồ sơ"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CÁC BIỂU ĐỒ & CẢNH BÁO QUẢN TRỊ TRUYỀN THỐNG                               */}
      {/* ========================================================================= */}
      {/* WARNING ALERTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ALERT 1: Low Performance / At-Risk Teachers Warning (Admin only) */}
        {isManager && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm dark:border-rose-950 dark:bg-slate-900/90 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-200/80 pb-3 dark:border-rose-900">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-500/30">
                  <FileWarning className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <span>Cảnh Báo GVQN Hiệu Suất Đang Kém / Dưới Chuẩn</span>
                    <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[11px] font-extrabold text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                      {lowPerformanceKPIs.length} giáo viên
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Giáo viên có tổng điểm KPI dưới 85 hoặc vi phạm tiến độ ca trực
                  </p>
                </div>
              </div>

              {setActiveModule && (
                <button
                  onClick={() => setActiveModule('kpi')}
                  className="flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline dark:text-rose-300"
                >
                  <span>Chi tiết KPI</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {lowPerformanceKPIs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Tất cả Giáo viên Quản nhiệm đều đạt hiệu suất chuẩn (≥85 điểm) trong kỳ này.
                </div>
              ) : (
                lowPerformanceKPIs.map((kpi) => {
                  const teacherObj = users.find((u) => u.id === kpi.teacherId);
                  return (
                    <div
                      key={kpi.id}
                      className="rounded-2xl border border-rose-200 bg-white p-3 text-xs shadow-sm dark:border-rose-900/50 dark:bg-slate-800/90"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span className="font-extrabold text-rose-900 dark:text-rose-200">
                          {kpi.teacherName} ({teacherObj?.teacherCode || 'GVQN'})
                        </span>
                        <span className="font-black text-rose-600">{kpi.totalScore} / 100 Đ</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        {kpi.penaltyNote || 'Cần chấn chỉnh kiểm tra KTX và hoàn thành checklist ca trực.'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Card 2: Shift Completion Rate Chart */}
        <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${!isManager ? 'lg:col-span-2' : ''}`}>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">
            Tỉ lệ Hoàn thành Task theo Ca trực (%)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftCompletionData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="shift" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="#2563eb" radius={[6, 6, 0, 0]} name="Hoàn thành (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid Charts 2: KPI Score Trend & Room Hygiene */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">
            Xu hướng Điểm KPI Trung bình (4 Tuần gần nhất)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpiTrendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={3} name="Điểm TB" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">
            Phân bổ Tình trạng Vệ sinh Phòng KTX
          </h3>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hygienePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {hygienePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL STUDENT EDIT MODAL IN DASHBOARD                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Chỉnh Sửa Hồ Sơ Học Sinh (Dashboard Phân Tích)"
        subtitle={`Mã HS: ${editingStudent?.studentCode} • Cho phép sửa đầy đủ thông tin cá nhân, phòng KTX, sức khỏe và diện theo dõi`}
        maxWidth="2xl"
      >
        {editingStudent && (
          <form onSubmit={handleEditStudentSubmit} className="space-y-4 text-xs">
            {/* Group 1: Basic Identifiers */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="h-4 w-4 text-blue-600" />
                <span>1. Thông tin Định danh & Cá nhân</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Học sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.studentCode}
                    onChange={(e) => setEditingStudent({ ...editingStudent, studentCode: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.fullName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Giới tính</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, gender: e.target.value as 'nam' | 'nữ' })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="nam">Nam</option>
                    <option value="nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày sinh (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={editingStudent.birthday}
                    onChange={(e) => setEditingStudent({ ...editingStudent, birthday: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Group 2: Dormitory & Teacher */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>2. Phân Bổ Lớp, Phòng KTX & Giáo viên Quản nhiệm</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
                  <input
                    type="text"
                    value={editingStudent.className}
                    onChange={(e) => setEditingStudent({ ...editingStudent, className: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng KTX</label>
                  <input
                    type="text"
                    value={editingStudent.roomName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, roomName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Giáo viên Quản nhiệm
                  </label>
                  <select
                    value={editingStudent.teacherName}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matched = users.find((t) => t.fullName === selectedName);
                      setEditingStudent({
                        ...editingStudent,
                        teacherName: selectedName,
                        teacherId: matched?.id || editingStudent.teacherId,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {users.filter(u => u.role === 'teacher').map((t) => (
                      <option key={t.id} value={t.fullName}>
                        {t.fullName} ({t.teacherCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Group 3: Family Contact */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span>3. Thông tin Liên lạc Phụ huynh</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Họ tên Phụ huynh
                  </label>
                  <input
                    type="text"
                    value={editingStudent.parentName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại Phụ huynh
                  </label>
                  <input
                    type="tel"
                    value={editingStudent.parentPhone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Group 4: HEALTH & SPECIAL TRACKING (KHU VỰC TRỌNG TÂM THEO YÊU CẦU) */}
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/50 p-4 dark:border-rose-900/80 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-rose-600" />
                  <span className="text-sm">4. Hồ sơ Sức khỏe & Diện Theo Dõi Đặc Biệt (Special Care)</span>
                </div>
                {editingStudent.specialCare ? (
                  <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    Đang theo dõi
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Bình thường
                  </span>
                )}
              </div>

              {/* Checkbox đưa vào danh sách cần theo dõi */}
              <div className="flex items-start gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                <input
                  type="checkbox"
                  id="dashEditSpecialCare"
                  checked={editingStudent.specialCare}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, specialCare: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 mt-0.5 cursor-pointer"
                />
                <label htmlFor="dashEditSpecialCare" className="cursor-pointer">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Đưa vào danh sách "Học sinh Cần Theo Dõi" / "Theo Dõi Đặc Biệt"
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Tích chọn để hệ thống đánh dấu ưu tiên, hiển thị cảnh báo đỏ và đưa vào danh sách quản lý sát sao của GVQN.
                  </span>
                </label>
              </div>

              {/* Trường thông tin sức khỏe y tế */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                    <span>Thông tin Sức khỏe / Y tế (Bệnh nền, hen suyễn, dị ứng, tim mạch, thuốc uống...):</span>
                  </span>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                    *Nhập thông tin sẽ tự động đưa vào danh sách theo dõi
                  </span>
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Tiền sử hen suyễn khi thời tiết trở lạnh; dị ứng đậu phộng/hải sản; tim bẩm sinh thể nhẹ; thuốc uống theo toa..."
                  value={editingStudent.healthNote || ''}
                  onChange={(e) => handleHealthNoteChangeInEdit(e.target.value)}
                  className="w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Phân loại các lý do theo dõi */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Phân loại Diện Theo Dõi (Giáo viên tick chọn các mục liên quan):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={editingStudent.specialLabels?.includes('health_issue') || false}
                      onChange={() => handleToggleSpecialLabelInEdit('health_issue')}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">🩺 Sức khỏe y tế</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={editingStudent.specialLabels?.includes('mental_support') || false}
                      onChange={() => handleToggleSpecialLabelInEdit('mental_support')}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">🧠 Tâm lý & Hòa nhập</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={editingStudent.specialLabels?.includes('academic_risk') || false}
                      onChange={() => handleToggleSpecialLabelInEdit('academic_risk')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">📚 Sa sút học tập</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={editingStudent.specialLabels?.includes('behavior_issue') || false}
                      onChange={() => handleToggleSpecialLabelInEdit('behavior_issue')}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">⚠️ Kỷ luật & Hành vi</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={editingStudent.specialLabels?.includes('parent_request') || false}
                      onChange={() => handleToggleSpecialLabelInEdit('parent_request')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">📞 Yêu cầu Phụ huynh</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={editingStudent.specialLabels?.includes('other') || false}
                      onChange={() => handleToggleSpecialLabelInEdit('other')}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">🔹 Khác</span>
                  </label>
                </div>
              </div>

              {/* Trường ghi chú chung */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Ghi chú Quản nhiệm:
                </label>
                <textarea
                  rows={2}
                  placeholder="Tâm lý, nền nếp, quan hệ bạn bè, sinh hoạt phòng KTX..."
                  value={editingStudent.note || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setStudentToDelete(editingStudent);
                  setEditingStudent(null);
                }}
                className="rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 px-3 py-2 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900 transition flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa Hồ Sơ</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
                >
                  Lưu Cập Nhật Hồ Sơ
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Profile Detail View Modal */}
      <Modal
        isOpen={!!viewingStudentProfile}
        onClose={() => setViewingStudentProfile(null)}
        title={viewingStudentProfile?.fullName || ''}
        subtitle={`${viewingStudentProfile?.studentCode} • Lớp ${viewingStudentProfile?.className} • ${viewingStudentProfile?.roomName}`}
      >
        {viewingStudentProfile && (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/30 space-y-2">
              <div className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-rose-600" />
                <span>Hồ sơ Sức khỏe & Lưu ý Y tế</span>
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                {viewingStudentProfile.healthNote || 'Chưa có ghi chú y tế đặc biệt.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px]">Phụ huynh</span>
                <span className="font-semibold">{viewingStudentProfile.parentName} ({viewingStudentProfile.parentPhone})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">GV Quản nhiệm / Tải lên</span>
                <span className="font-semibold">{viewingStudentProfile.teacherName}</span>
              </div>
            </div>

            {viewingStudentProfile.note && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900">
                <span className="font-bold text-purple-900 dark:text-purple-300 block mb-1">Ghi chú quản nhiệm:</span>
                <p className="text-slate-700 dark:text-slate-300">{viewingStudentProfile.note}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              {canEditStudent(viewingStudentProfile) ? (
                <button
                  onClick={() => {
                    setEditingStudent({ ...viewingStudentProfile });
                    setViewingStudentProfile(null);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Chỉnh Sửa Hồ Sơ</span>
                </button>
              ) : (
                <span className="text-slate-400 text-xs italic flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Chỉ GV tải lên ({viewingStudentProfile.uploadedByUserName || viewingStudentProfile.teacherName}) mới được sửa
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={confirmDeleteStudent}
        title="Xác nhận xóa hồ sơ học sinh"
        itemName={studentToDelete ? `Học sinh ${studentToDelete.fullName} (${studentToDelete.studentCode})` : ''}
      />

      {/* Excel Upload Modal in Dashboard */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          setUploadError(null);
          setUploadSuccessMessage(null);
          setParsedPreviewList([]);
          setUploadFileName(null);
        }}
        title="Tải Lên Danh Sách Học Sinh Bằng File Excel (Dashboard)"
        subtitle="Học sinh bạn tải lên sẽ tự động thuộc quyền quản lý và chỉnh sửa của riêng tài khoản bạn"
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Step 1: Download Template */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Bước 1: Sử dụng File Excel Mẫu Chuẩn</span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
                Tải file mẫu về máy, điền đầy đủ các cột. Các em có thông tin sức khỏe sẽ tự động đưa vào danh sách theo dõi đặc biệt.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>Tải File Excel Mẫu (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Drag & Drop */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Bước 2: Chọn File Excel Danh Sách Học Sinh Cần Tải Lên
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processUploadedFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 cursor-pointer transition text-center ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/60 dark:border-purple-400 dark:bg-purple-950/30'
                  : uploadFileName
                  ? 'border-emerald-400 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20'
                  : 'border-slate-300 hover:border-purple-400 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processUploadedFile(file);
                }}
                className="hidden"
              />

              {uploadFileName ? (
                <div className="space-y-1.5">
                  <FileCheck className="h-8 w-8 text-emerald-600 mx-auto" />
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{uploadFileName}</div>
                  <div className="text-[11px] text-slate-500">Bấm để chọn file khác hoặc kéo thả file mới vào đây</div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <FileUp className="h-8 w-8 text-purple-600 mx-auto" />
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Kéo thả file Excel vào đây, hoặc <span className="text-purple-600 underline">Bấm để duyệt file</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Định dạng hỗ trợ: .xlsx, .xls, .csv</div>
                </div>
              )}
            </div>
          </div>

          {/* Error & Success */}
          {uploadError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccessMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedPreviewList.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="font-bold">Xem Trước ({parsedPreviewList.length} HS được phát hiện)</span>
                <span className="text-emerald-700 font-bold">
                  {currentUser.role === 'teacher' ? `Gán quyền sửa: ${currentUser.fullName}` : 'Quản lý toàn diện'}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white text-xs shadow-inner">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-100 font-bold uppercase text-slate-600 text-[10px]">
                    <tr>
                      <th className="p-2.5">Mã HS</th>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">Lớp</th>
                      <th className="p-2.5">Phòng</th>
                      <th className="p-2.5">Sức khỏe y tế</th>
                      <th className="p-2.5">Diện Theo Dõi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreviewList.map((row) => (
                      <tr key={row.previewId}>
                        <td className="p-2.5 font-mono font-bold">{row.studentCode}</td>
                        <td className="p-2.5 font-semibold">{row.fullName}</td>
                        <td className="p-2.5">{row.className}</td>
                        <td className="p-2.5">{row.roomName}</td>
                        <td className="p-2.5 text-rose-600 font-semibold max-w-xs truncate">
                          {row.healthNote ? `🩺 ${row.healthNote}` : '-'}
                        </td>
                        <td className="p-2.5">
                          {row.specialCare ? (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-800">
                              ⚠️ Cần theo dõi
                            </span>
                          ) : (
                            <span className="text-slate-400">Bình thường</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsExcelModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={parsedPreviewList.length === 0}
              onClick={handleConfirmImport}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white transition ${
                parsedPreviewList.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md' : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>Xác Nhận Nhập ({parsedPreviewList.length}) Học Sinh Vào Hệ Thống</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
