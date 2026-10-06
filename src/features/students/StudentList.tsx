import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Search,
  MessageSquareHeart,
  AlertTriangle,
  Building2,
  Phone,
  User,
  Calendar,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileUp,
  X,
  FileCheck,
  Check,
  HeartPulse,
  Brain,
  BookOpen,
  ShieldAlert,
  HelpCircle,
  Stethoscope,
  Info,
  Lock,
  Shield,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { Student, Interaction1on1, SpecialLabel, User as SystemUser } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';

export const StudentList: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<SystemUser>(BOPSStore.getCurrentUser());
  const [students, setStudents] = useState<Student[]>([]);
  const [interactions, setInteractions] = useState<Interaction1on1[]>([]);
  const [teachers, setTeachers] = useState<SystemUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'special'>('all');
  const [specialCategoryFilter, setSpecialCategoryFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Permission check: GV nào upload/phụ trách thì chỉ sửa được học sinh đó (Manager sửa tất cả)
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

  // Add Student state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Excel Import state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [parsedPreviewList, setParsedPreviewList] = useState<
    (Omit<Student, 'id'> & { previewId: string; isDuplicate: boolean })[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Student state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Initial New Student Form Data
  const [newStudentData, setNewStudentData] = useState({
    fullName: '',
    studentCode: '',
    className: '10A1',
    roomName: 'DomB-101',
    gender: 'nam' as 'nam' | 'nữ',
    birthday: '2008-05-15',
    parentName: '',
    parentPhone: '',
    teacherName: 'Bùi Ngọc Thắng',
    teacherId: 'u-gv-001',
    specialCare: false,
    specialLabels: [] as SpecialLabel[],
    healthNote: '',
    note: '',
  });

  useEffect(() => {
    const loadData = () => {
      setStudents(BOPSStore.getStudents());
      setInteractions(BOPSStore.getInteractions());
      const allTeachers = BOPSStore.getUsers().filter((u) => u.role === 'teacher');
      setTeachers(allTeachers);
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

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
        'Bùi Ngọc Thắng',
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
        'Tiền sử hen suyễn khi trời lạnh, dị ứng phấn hoa, có bình xịt cá nhân để ở phòng y tế/phòng KTX',
        'Cần giáo viên nhắc nhở giữ ấm khi thời tiết chuyển mùa',
        'Có',
        'Sức khỏe',
        'Nguyễn Thị Minh Phương',
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
        'Học sinh mới chuyển vào KTX, tính cách khép kín, cần tăng cường tương tác 1-1 hỗ trợ tâm lý',
        'Có',
        'Tâm lý',
        'Đoàn Ngọc Hiệp',
      ],
      [
        'HS1004',
        'Lê Thảo Vy',
        '11B3',
        'DomB-403',
        'Nữ',
        '2008-11-05',
        'Hoàng Thị Lan',
        '0918765432',
        'Tim bẩm sinh thể nhẹ, không tham gia vận động thể lực cường độ cao',
        'Trưởng phòng gương mẫu, chấp hành tốt nội quy',
        'Có',
        'Sức khỏe',
        'Trương Thị Phượng',
      ],
      [
        'HS1005',
        'Đặng Hoàng Nam',
        '12A1',
        'DomB-501',
        'Nam',
        '2007-06-18',
        'Đặng Văn Hùng',
        '0934567890',
        '',
        'Áp lực kỳ thi tốt nghiệp THPT, có biểu hiện thức khuya sa sút sức khỏe',
        'Có',
        'Học tập',
        'Lê Thị Minh Giang',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

    ws['!cols'] = [
      { wch: 18 }, // Mã học sinh
      { wch: 24 }, // Họ và tên
      { wch: 10 }, // Lớp
      { wch: 16 }, // Phòng KTX
      { wch: 14 }, // Giới tính
      { wch: 22 }, // Ngày sinh
      { wch: 22 }, // Họ tên Phụ huynh
      { wch: 22 }, // SĐT Phụ huynh
      { wch: 38 }, // Thông tin sức khỏe
      { wch: 36 }, // Ghi chú
      { wch: 26 }, // Theo dõi đặc biệt
      { wch: 28 }, // Phân loại theo dõi
      { wch: 24 }, // GV phụ trách
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh_Noi_Tru_THPT_FPT.xlsx');
  };

  // Process Excel File Upload
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

        // Determine header row index
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
          if (!rawName) continue; // Skip blank name rows

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

          // Automatic categorization into Special Care / Need Tracking
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

          const teacherName = teacherIdx >= 0 ? String(row[teacherIdx] || '').trim() : 'Bùi Ngọc Thắng';
          const matchedTeacher = teachers.find(
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
        console.error('Error reading excel file:', err);
        setUploadError(`Lỗi khi đọc file Excel: ${err.message || 'File không đúng định dạng chuẩn Excel (.xlsx, .xls)'}`);
        setParsedPreviewList([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (parsedPreviewList.length === 0) return;

    const result = BOPSStore.bulkImportStudents(
      parsedPreviewList.map(({ previewId, isDuplicate, ...rest }) => rest)
    );

    const specialCount = parsedPreviewList.filter((p) => p.specialCare).length;

    setUploadSuccessMessage(
      `Đã nhập thành công ${parsedPreviewList.length} học sinh (Thêm mới ${result.added} HS, cập nhật ${result.updated} HS trùng mã)! Trong đó có ${specialCount} học sinh được đưa vào danh sách cần theo dõi đặc biệt.`
    );

    setTimeout(() => {
      setIsExcelModalOpen(false);
      setParsedPreviewList([]);
      setUploadFileName(null);
      setUploadSuccessMessage(null);
      if (specialCount > 0) {
        setActiveTab('special');
      }
    }, 1800);
  };

  // Quick toggle Special Care status directly from row or profile
  const handleQuickToggleSpecialCare = (student: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    if (selectedStudent && selectedStudent.id === student.id) {
      setSelectedStudent(updated);
    }
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

  // Helper when typing Health Note in Add modal -> auto set specialCare to true
  const handleHealthNoteChangeInNew = (text: string) => {
    const currentLabels = newStudentData.specialLabels || [];
    const hasHealthLabel = currentLabels.includes('health_issue');
    const newLabels =
      text.trim().length > 0 && !hasHealthLabel
        ? ([...currentLabels, 'health_issue'] as SpecialLabel[])
        : currentLabels;

    setNewStudentData({
      ...newStudentData,
      healthNote: text,
      specialCare: text.trim().length > 0 ? true : newStudentData.specialCare,
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

  // Toggle label in Add modal
  const handleToggleSpecialLabelInNew = (labelKey: SpecialLabel) => {
    const currentLabels = newStudentData.specialLabels || [];
    const exists = currentLabels.includes(labelKey);
    const updated = exists ? currentLabels.filter((l) => l !== labelKey) : [...currentLabels, labelKey];
    setNewStudentData({
      ...newStudentData,
      specialLabels: updated,
      specialCare: updated.length > 0 ? true : newStudentData.specialCare,
    });
  };

  // Save changes to student
  const handleEditStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    // If health note exists or any special label is checked, ensure specialCare is true
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
    if (selectedStudent && selectedStudent.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }
  };

  // Save new student
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.fullName || !newStudentData.studentCode) return;

    const hasHealthIssue = Boolean(newStudentData.healthNote && newStudentData.healthNote.trim().length > 0);
    const hasLabels = Boolean(newStudentData.specialLabels && newStudentData.specialLabels.length > 0);
    let finalSpecialCare = newStudentData.specialCare || hasHealthIssue || hasLabels;
    let finalLabels = [...(newStudentData.specialLabels || [])];
    if (hasHealthIssue && !finalLabels.includes('health_issue')) {
      finalLabels.push('health_issue');
    }

    const matchedTeacher = teachers.find(
      (t) => t.fullName.toLowerCase() === newStudentData.teacherName.toLowerCase()
    );

    BOPSStore.addStudent({
      fullName: newStudentData.fullName,
      studentCode: newStudentData.studentCode,
      birthday: newStudentData.birthday || '2008-05-15',
      className: newStudentData.className || '10A1',
      roomId: `rm-${newStudentData.roomName || 'DomB-101'}`,
      roomName: newStudentData.roomName || 'DomB-101',
      teacherId: matchedTeacher?.id || newStudentData.teacherId || 'u-gv-001',
      teacherName: newStudentData.teacherName || 'Bùi Ngọc Thắng',
      gender: newStudentData.gender,
      parentName: newStudentData.parentName || 'Phụ huynh HS',
      parentPhone: newStudentData.parentPhone || '0901234567',
      status: 'active',
      specialCare: finalSpecialCare,
      specialLabels: finalLabels,
      healthNote: newStudentData.healthNote.trim() || undefined,
      note: newStudentData.note.trim() || undefined,
      interactionCountThisMonth: 0,
    });

    setIsAddModalOpen(false);
    setNewStudentData({
      fullName: '',
      studentCode: '',
      className: '10A1',
      roomName: 'DomB-101',
      gender: 'nam',
      birthday: '2008-05-15',
      parentName: '',
      parentPhone: '',
      teacherName: 'Bùi Ngọc Thắng',
      teacherId: 'u-gv-001',
      specialCare: false,
      specialLabels: [],
      healthNote: '',
      note: '',
    });
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
  };

  const confirmDeleteStudent = () => {
    if (studentToDelete) {
      BOPSStore.deleteStudent(studentToDelete.id);
      if (selectedStudent?.id === studentToDelete.id) {
        setSelectedStudent(null);
      }
      setStudentToDelete(null);
    }
  };

  // Filter students based on search query, active tab, and special care category
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.fullName.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      s.roomName.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      (s.teacherName && s.teacherName.toLowerCase().includes(q)) ||
      (s.healthNote && s.healthNote.toLowerCase().includes(q)) ||
      (s.note && s.note.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (activeTab === 'special') {
      if (!s.specialCare) return false;
      if (specialCategoryFilter === 'health') {
        return (
          Boolean(s.healthNote && s.healthNote.trim().length > 0) ||
          (s.specialLabels && s.specialLabels.includes('health_issue'))
        );
      }
      if (specialCategoryFilter === 'mental') {
        return s.specialLabels && s.specialLabels.includes('mental_support');
      }
      if (specialCategoryFilter === 'academic') {
        return s.specialLabels && s.specialLabels.includes('academic_risk');
      }
      if (specialCategoryFilter === 'behavior') {
        return s.specialLabels && s.specialLabels.includes('behavior_issue');
      }
      if (specialCategoryFilter === 'parent') {
        return s.specialLabels && s.specialLabels.includes('parent_request');
      }
      return true;
    }

    return true;
  });

  const specialStudentsCount = students.filter((s) => s.specialCare).length;
  const healthIssuesCount = students.filter(
    (s) =>
      s.specialCare &&
      (Boolean(s.healthNote && s.healthNote.trim().length > 0) ||
        (s.specialLabels && s.specialLabels.includes('health_issue')))
  ).length;

  const getStudentTimeline = (studentId: string) => {
    return interactions.filter((i) => i.studentId === studentId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <GraduationCap className="h-4 w-4" />
            <span>Hồ sơ Học sinh Nội trú DomB</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Quản lý Học sinh & Danh sách Cần Theo Dõi Đặc Biệt
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload danh sách học sinh bằng Excel, chỉnh sửa đầy đủ thông tin, theo dõi sát sao hồ sơ sức khỏe và ghi chú quản nhiệm.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Download Sample Excel Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 transition shrink-0 shadow-sm"
            title="Tải về file Excel mẫu chuẩn (.xlsx) để nhập danh sách học sinh"
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
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition shrink-0"
            title="Tải lên danh sách học sinh từ file Excel (.xlsx, .xls)"
          >
            <FileUp className="h-4 w-4" />
            <span>Upload File Excel</span>
          </button>

          {/* Add New Student Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm Học Sinh Mới</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Main Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Tất cả học sinh ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('special')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'special'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Học sinh Cần Theo Dõi ({specialStudentsCount})</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên, mã HS, phòng, bệnh, ghi chú..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white shadow-sm"
          />
        </div>
      </div>

      {/* Sub-filters when in "Cần theo dõi" tab */}
      {activeTab === 'special' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/60 dark:bg-rose-950/20 text-xs">
          <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1 mr-1">
            <Info className="h-3.5 w-3.5" />
            Lọc theo diện theo dõi:
          </span>
          <button
            onClick={() => setSpecialCategoryFilter('all')}
            className={`rounded-lg px-2.5 py-1 font-bold transition ${
              specialCategoryFilter === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-800 hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-300'
            }`}
          >
            Tất cả ({specialStudentsCount})
          </button>
          <button
            onClick={() => setSpecialCategoryFilter('health')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
              specialCategoryFilter === 'health'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-800 hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-300'
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>🩺 Vấn đề Sức khỏe ({healthIssuesCount})</span>
          </button>
          <button
            onClick={() => setSpecialCategoryFilter('mental')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
              specialCategoryFilter === 'mental'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-purple-800 hover:bg-purple-100 dark:bg-slate-800 dark:text-purple-300'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>🧠 Tâm lý & Hòa nhập</span>
          </button>
          <button
            onClick={() => setSpecialCategoryFilter('academic')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
              specialCategoryFilter === 'academic'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-800 hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>📚 Học tập</span>
          </button>
          <button
            onClick={() => setSpecialCategoryFilter('behavior')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
              specialCategoryFilter === 'behavior'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-red-800 hover:bg-red-100 dark:bg-slate-800 dark:text-red-300'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>⚠️ Kỷ luật & Hành vi</span>
          </button>
          <button
            onClick={() => setSpecialCategoryFilter('parent')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
              specialCategoryFilter === 'parent'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-blue-800 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300'
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>📞 Yêu cầu Phụ huynh</span>
          </button>
        </div>
      )}

      {/* Student List Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              <th className="p-3.5">Mã HS & Họ tên</th>
              <th className="p-3.5">Lớp & Phòng</th>
              <th className="p-3.5">GV Quản nhiệm</th>
              <th className="p-3.5">Phụ huynh & Liên lạc</th>
              <th className="p-3.5">Diện Theo Dõi & Sức Khỏe</th>
              <th className="p-3.5">Tương tác Cuối</th>
              <th className="p-3.5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                return (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/80 transition dark:hover:bg-slate-800/50"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {student.fullName}
                        </div>
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

                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {student.teacherName}
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {student.parentName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{student.parentPhone}</span>
                      </div>
                    </td>

                    {/* Sức khỏe & Diện theo dõi */}
                    <td className="p-3.5 max-w-xs">
                      {student.specialCare ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Cần theo dõi
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuickToggleSpecialCare(student, e)}
                              title="Bấm để tắt nhanh chế độ theo dõi"
                              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Nhãn phân loại */}
                          {student.specialLabels && student.specialLabels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {student.specialLabels.map((lbl) => (
                                <span
                                  key={lbl}
                                  className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
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

                          {/* Chi tiết sức khỏe nếu có */}
                          {student.healthNote && (
                            <div className="rounded-lg bg-rose-50/80 p-1.5 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/60 text-[10px] text-rose-800 dark:text-rose-300 leading-snug">
                              <strong>🩺 Y tế:</strong> {student.healthNote}
                            </div>
                          )}

                          {/* Ghi chú quản nhiệm nếu có */}
                          {student.note && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                              📝 {student.note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px]">Bình thường</span>
                          <button
                            type="button"
                            onClick={(e) => handleQuickToggleSpecialCare(student, e)}
                            className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                            title="Đưa vào danh sách cần theo dõi đặc biệt"
                          >
                            + Theo dõi
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {student.lastInteractionDate || 'Chưa tương tác'}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEditStudent(student) ? (
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
                              onClick={() => handleDeleteStudent(student)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Xóa hồ sơ học sinh"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <span
                            className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 cursor-not-allowed"
                            title={`Chỉ ${student.uploadedByUserName || student.teacherName || 'GV phụ trách/tải lên'} mới có quyền sửa học sinh này`}
                          >
                            <Lock className="h-3 w-3" />
                            <span>Chỉ xem</span>
                          </span>
                        )}

                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                        >
                          Hồ sơ
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

      {/* ========================================================================= */}
      {/* FULL STUDENT EDIT MODAL: SỬA ĐẦY ĐỦ THÔNG TIN NHƯ FILE UPLOAD           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Chỉnh Sửa Hồ Sơ Học Sinh Toàn Diện"
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Giới tính
                  </label>
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

            {/* Group 2: Dormitory & Teacher in charge */}
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
                      const matched = teachers.find((t) => t.fullName === selectedName);
                      setEditingStudent({
                        ...editingStudent,
                        teacherName: selectedName,
                        teacherId: matched?.id || editingStudent.teacherId,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {teachers.map((t) => (
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

            {/* Group 4: HEALTH & SPECIAL TRACKING (Khu vực trọng tâm theo yêu cầu của Thầy/Cô) */}
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/50 p-4 dark:border-rose-900/80 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-rose-600" />
                  <span className="text-sm">4. Hồ sơ Sức khỏe & Theo Dõi Đặc Biệt (Special Care)</span>
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
                  id="editSpecialCare"
                  checked={editingStudent.specialCare}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, specialCare: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 mt-0.5 cursor-pointer"
                />
                <label htmlFor="editSpecialCare" className="cursor-pointer">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Đưa vào danh sách "Học sinh Cần Theo Dõi" / "Theo Dõi Đặc Biệt"
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Tích chọn để hệ thống đánh dấu ưu tiên, hiển thị cảnh báo đỏ và đưa vào danh sách quản lý sát sao của GVQN.
                  </span>
                </label>
              </div>

              {/* Trường thông tin sức khỏe */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                    <span>Thông tin Sức khỏe / Y tế (Bệnh nền, dị ứng, thuốc uống, tim mạch, hen suyễn...):</span>
                  </span>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                    *Nhập thông tin sẽ tự động đưa vào danh sách theo dõi
                  </span>
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Tiền sử hen suyễn khi trời lạnh; dị ứng hải sản/đậu phộng; tim bẩm sinh hạn chế chạy bộ; cần uống thuốc theo chỉ định..."
                  value={editingStudent.healthNote || ''}
                  onChange={(e) => handleHealthNoteChangeInEdit(e.target.value)}
                  className="w-full rounded-xl border border-rose-200 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400"
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

              {/* Trường ghi chú chung của giáo viên */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Ghi chú & Lưu ý của Giáo viên Quản nhiệm:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận diễn biến tâm sinh lý, giao tiếp bạn bè, lưu ý khi đi ngủ..."
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
                  handleDeleteStudent(editingStudent);
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

      {/* ========================================================================= */}
      {/* STUDENT PROFILE MODAL: VIEW DETAILED PROFILE & INTERACTION TIMELINE        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent?.fullName || ''}
        subtitle={`${selectedStudent?.studentCode} • Lớp ${selectedStudent?.className} • ${selectedStudent?.roomName}`}
        maxWidth="3xl"
      >
        {selectedStudent && (
          <div className="space-y-6 text-xs">
            {/* Quick Action Header in Profile */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">Tình trạng diện theo dõi:</span>
                {selectedStudent.specialCare ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 text-[10px] flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Cần theo dõi đặc biệt
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                    Bình thường
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setEditingStudent({ ...selectedStudent });
                  setSelectedStudent(null);
                }}
                className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Chỉnh Sửa Toàn Bộ Hồ Sơ</span>
              </button>
            </div>

            {/* Health & Special Care Box in Profile if applicable */}
            {selectedStudent.specialCare && (
              <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 space-y-2">
                <div className="font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-1.5 text-xs">
                  <Stethoscope className="h-4 w-4 text-rose-600" />
                  <span>Hồ Sơ Y Tế & Chăm Sóc Sức Khỏe Đặc Biệt</span>
                </div>
                {selectedStudent.healthNote ? (
                  <p className="text-slate-800 dark:text-slate-200 font-semibold bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                    {selectedStudent.healthNote}
                  </p>
                ) : (
                  <p className="text-slate-500 italic">Chưa cập nhật chi tiết tiền sử bệnh án/y tế.</p>
                )}
                {selectedStudent.specialLabels && selectedStudent.specialLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedStudent.specialLabels.map((lbl) => (
                      <span
                        key={lbl}
                        className="rounded-lg px-2 py-0.5 text-[10px] font-bold bg-white text-purple-700 border border-purple-200 dark:bg-slate-800 dark:text-purple-300 dark:border-purple-800"
                      >
                        {lbl === 'health_issue'
                          ? '🩺 Vấn đề Sức khỏe'
                          : lbl === 'mental_support'
                          ? '🧠 Tâm lý & Hòa nhập'
                          : lbl === 'academic_risk'
                          ? '📚 Học tập'
                          : lbl === 'behavior_issue'
                          ? '⚠️ Kỷ luật & Nền nếp'
                          : lbl === 'parent_request'
                          ? '📞 Yêu cầu Phụ huynh'
                          : 'Khác'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Info Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div>
                <span className="text-slate-400 block text-[10px]">Giới tính & Ngày sinh</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 capitalize">
                  {selectedStudent.gender} • {selectedStudent.birthday || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Phụ huynh & SĐT</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {selectedStudent.parentName} ({selectedStudent.parentPhone})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Giáo viên Quản nhiệm</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {selectedStudent.teacherName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Lượt tương tác tháng</span>
                <span className="font-bold text-purple-600">
                  {selectedStudent.interactionCountThisMonth} Lượt
                </span>
              </div>
            </div>

            {selectedStudent.note && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5 dark:border-purple-950 dark:bg-slate-800">
                <span className="font-bold text-purple-900 dark:text-purple-300 block mb-1">
                  Ghi chú quan sát của Giáo viên Quản nhiệm:
                </span>
                <p className="text-slate-700 dark:text-slate-300">{selectedStudent.note}</p>
              </div>
            )}

            {/* Permanent Interaction Timeline */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                <MessageSquareHeart className="h-4 w-4 text-purple-600" />
                Lịch sử Tương tác 1-1 (Timeline Chăm sóc)
              </h4>

              <div className="space-y-3">
                {getStudentTimeline(selectedStudent.id).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-800">
                    Chưa có nhật ký tương tác 1-1 nào cho học sinh này.
                  </div>
                ) : (
                  getStudentTimeline(selectedStudent.id).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                        <span className="font-bold text-purple-700 dark:text-purple-400">
                          {item.topic}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.interactionDate} ({item.startTime} - {item.endTime})
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Nội dung:</strong> {item.summary}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          <strong>Quan sát:</strong> {item.observation}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          <strong>Hướng hỗ trợ:</strong> {item.supportPlan}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                        <span>Người thực hiện: {item.teacherName}</span>
                        <span>Địa điểm: {item.location}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* ADD NEW STUDENT MODAL                                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Học Sinh Nội Trú Mới"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mã Học sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: HS1025"
                value={newStudentData.studentCode}
                onChange={(e) => setNewStudentData({ ...newStudentData, studentCode: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Họ và Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Trần Bảo An"
                value={newStudentData.fullName}
                onChange={(e) => setNewStudentData({ ...newStudentData, fullName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lớp</label>
              <input
                type="text"
                value={newStudentData.className}
                onChange={(e) => setNewStudentData({ ...newStudentData, className: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng KTX</label>
              <input
                type="text"
                value={newStudentData.roomName}
                onChange={(e) => setNewStudentData({ ...newStudentData, roomName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Giới tính</label>
              <select
                value={newStudentData.gender}
                onChange={(e) => setNewStudentData({ ...newStudentData, gender: e.target.value as 'nam' | 'nữ' })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="nam">Nam</option>
                <option value="nữ">Nữ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tên Phụ huynh</label>
              <input
                type="text"
                placeholder="VD: Trần Văn Bình"
                value={newStudentData.parentName}
                onChange={(e) => setNewStudentData({ ...newStudentData, parentName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">SĐT Phụ huynh</label>
              <input
                type="tel"
                placeholder="09xx xxx xxx"
                value={newStudentData.parentPhone}
                onChange={(e) => setNewStudentData({ ...newStudentData, parentPhone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/20 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newSpecialCare"
                checked={newStudentData.specialCare}
                onChange={(e) => setNewStudentData({ ...newStudentData, specialCare: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="newSpecialCare" className="font-bold text-rose-900 dark:text-rose-300 cursor-pointer">
                Đưa vào danh sách "Học sinh Cần Theo Dõi" / "Theo Dõi Đặc Biệt"
              </label>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thông tin Sức khỏe / Bệnh lý (nếu có):
              </label>
              <textarea
                rows={2}
                placeholder="VD: Dị ứng thức ăn, tiền sử hen suyễn, bệnh tim bẩm sinh..."
                value={newStudentData.healthNote}
                onChange={(e) => handleHealthNoteChangeInNew(e.target.value)}
                className="w-full rounded-xl border border-rose-200 bg-white p-2 text-xs focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú / Lưu ý của Giáo viên:
              </label>
              <textarea
                rows={2}
                placeholder="VD: Tâm lý nhút nhát, cần theo dõi hòa nhập KTX..."
                value={newStudentData.note}
                onChange={(e) => setNewStudentData({ ...newStudentData, note: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition"
            >
              Lưu Hồ Sơ
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* CONFIRM DELETE MODAL                                                      */}
      {/* ========================================================================= */}
      <ConfirmDeleteModal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={confirmDeleteStudent}
        title="Xác nhận xóa hồ sơ học sinh"
        itemName={studentToDelete ? `Học sinh ${studentToDelete.fullName} (${studentToDelete.studentCode})` : ''}
      />

      {/* ========================================================================= */}
      {/* EXCEL UPLOAD MODAL WITH COMPREHENSIVE PREVIEW                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          setUploadError(null);
          setUploadSuccessMessage(null);
          setParsedPreviewList([]);
          setUploadFileName(null);
        }}
        title="Tải Lên Danh Sách Học Sinh Bằng File Excel"
        subtitle="Hỗ trợ file .xlsx, .xls, .csv • Tự động nhận diện cột sức khỏe, ghi chú và diện theo dõi"
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Step 1: Download Template Advice */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Bước 1: Sử dụng File Excel Mẫu Chuẩn Tương Thích 100%</span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
                Tải file mẫu về máy, điền đầy đủ các cột (Mã HS, Họ tên, Lớp, Phòng KTX, Sức khỏe, Ghi chú, Diện theo dõi). Các em có thông tin sức khỏe sẽ tự động được đưa vào danh sách cần theo dõi đặc biệt.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition shrink-0 self-start sm:self-center"
            >
              <Download className="h-4 w-4" />
              <span>Tải File Excel Mẫu (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Drag and Drop Upload Zone */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Bước 2: Chọn File Excel Danh Sách Học Sinh Cần Tải Lên
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
                onChange={handleFileInputChange}
                className="hidden"
              />

              {uploadFileName ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <FileCheck className="h-8 w-8" />
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {uploadFileName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Bấm để chọn file khác hoặc kéo thả file mới vào đây
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <FileUp className="h-8 w-8" />
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Kéo thả file Excel vào đây, hoặc <span className="text-purple-600 dark:text-purple-400 underline">Bấm để duyệt file</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Định dạng hỗ trợ: .xlsx, .xls, .csv (Tối đa 10MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {uploadError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Success Alert */}
          {uploadSuccessMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {/* Preview Table of Parsed Data */}
          {parsedPreviewList.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Xem Trước Dữ Liệu ({parsedPreviewList.length} Học Sinh Được Phát Hiện)
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Mới: {parsedPreviewList.filter((p) => !p.isDuplicate).length}
                  </span>
                  {parsedPreviewList.some((p) => p.isDuplicate) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Trùng mã (Cập nhật): {parsedPreviewList.filter((p) => p.isDuplicate).length}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                    Cần theo dõi: {parsedPreviewList.filter((p) => p.specialCare).length}
                  </span>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs shadow-inner">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-100 font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                    <tr>
                      <th className="p-2.5">STT</th>
                      <th className="p-2.5">Mã HS</th>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">Lớp</th>
                      <th className="p-2.5">Phòng KTX</th>
                      <th className="p-2.5">Giới tính</th>
                      <th className="p-2.5">Thông tin Sức khỏe / Y tế</th>
                      <th className="p-2.5">Ghi chú</th>
                      <th className="p-2.5">Diện Theo Dõi</th>
                      <th className="p-2.5 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedPreviewList.map((row, idx) => (
                      <tr key={row.previewId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                          {row.studentCode}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                          {row.fullName}
                        </td>
                        <td className="p-2.5">{row.className}</td>
                        <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">
                          {row.roomName}
                        </td>
                        <td className="p-2.5 capitalize">{row.gender}</td>
                        <td className="p-2.5 max-w-xs">
                          {row.healthNote ? (
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold line-clamp-2">
                              🩺 {row.healthNote}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5 max-w-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                          {row.note || '-'}
                        </td>
                        <td className="p-2.5">
                          {row.specialCare ? (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 whitespace-nowrap">
                              ⚠️ Cần theo dõi
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Bình thường</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.isDuplicate ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">
                              Cập nhật
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap">
                              Thêm mới
                            </span>
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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsExcelModalOpen(false);
                setUploadError(null);
                setUploadSuccessMessage(null);
                setParsedPreviewList([]);
                setUploadFileName(null);
              }}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={parsedPreviewList.length === 0}
              onClick={handleConfirmImport}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition ${
                parsedPreviewList.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-300 cursor-not-allowed dark:bg-slate-700'
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
