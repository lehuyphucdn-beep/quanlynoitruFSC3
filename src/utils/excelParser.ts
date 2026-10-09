import { Student, SpecialLabel } from '../types';

export interface ParsedStudentPreview extends Omit<Student, 'id'> {
  previewId: string;
  isDuplicate: boolean;
  rawSpecialCareStatus?: 'yes' | 'no' | 'unspecified';
}

/**
 * Chuẩn hóa tên cột tiêu đề trong file Excel:
 * Bỏ dấu sao (*), bỏ nội dung trong ngoặc đơn, bỏ khoảng trắng thừa, chuyển chữ thường.
 * Ví dụ: "Mã học sinh (*)" -> "mã học sinh"
 *        "Họ và tên (*)" -> "họ và tên"
 *        "Lớp (*)" -> "lớp"
 */
export function normalizeHeader(raw: string): string {
  if (!raw) return '';
  return String(raw)
    .replace(/\(.*?\)/g, '') // Bỏ mọi nội dung trong ngoặc: (*), (Nam/Nữ)...
    .replace(/[*_]/g, '')     // Bỏ dấu sao, gạch dưới
    .replace(/\s+/g, ' ')     // Gom nhiều dấu cách thành 1
    .trim()
    .toLowerCase();
}

/**
 * Tìm chỉ số cột trong danh sách tiêu đề với cơ chế 2 bước:
 * Bước 1: Khớp chính xác (Exact match) sau khi chuẩn hóa.
 * Bước 2: Khớp chứa từ khóa (Contains match), kèm danh sách loại trừ (excludes) để tránh nhận nhầm.
 */
export function findColumnIndex(
  normalizedHeaders: string[],
  exactKeywords: string[],
  containsKeywords: string[],
  excludeKeywords: string[] = []
): number {
  // Bước 1: Ưu tiên Exact match tuyệt đối
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    if (!h) continue;
    if (exactKeywords.some((kw) => h === kw)) {
      return i;
    }
  }

  // Bước 2: Contains match (chỉ khi không chứa từ khóa loại trừ)
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    if (!h) continue;

    // Kiểm tra xem có dính từ khóa cấm không
    const hasExclusion = excludeKeywords.some((ex) => h.includes(ex));
    if (hasExclusion) continue;

    const matchesKeyword = containsKeywords.some((kw) => h.includes(kw));
    if (matchesKeyword) {
      return i;
    }
  }

  return -1;
}

/**
 * Chuẩn hóa ngày sinh an toàn từ các định dạng Excel phổ biến:
 * - DD/MM/YYYY hoặc DD-MM-YYYY -> YYYY-MM-DD
 * - YYYY-MM-DD hoặc YYYY/MM/DD -> YYYY-MM-DD
 * - JS Date object -> YYYY-MM-DD
 * - Số serial Excel (ví dụ 39956 cho ngày 23/05/2009) -> YYYY-MM-DD
 *
 * Tuyệt đối không fallback về ngày sinh mặc định (như 2008-01-01).
 * Nếu ô trống hoặc không parse được ngày hợp lệ -> trả về null.
 */
export function normalizeBirthday(raw: any): string | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  // 1. JavaScript Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Số serial Excel (number)
  if (typeof raw === 'number' && !isNaN(raw)) {
    if (raw > 1000 && raw < 100000) {
      const utcDays = Math.floor(raw - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      const y = dateInfo.getUTCFullYear();
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  const str = String(raw).trim();
  if (!str) return null;

  // 3. Chuỗi số nguyên serial Excel (ví dụ "39956")
  if (/^\d{4,5}$/.test(str)) {
    const num = parseInt(str, 10);
    if (num > 10000 && num < 100000) {
      return normalizeBirthday(num);
    }
    return null;
  }

  // 4. ISO format: YYYY-MM-DD hoặc YYYY/MM/DD hoặc YYYY.MM.DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // 5. Định dạng Việt Nam: DD/MM/YYYY hoặc DD-MM-YYYY hoặc DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

/**
 * Chuẩn hóa số điện thoại:
 * - Loại bỏ khoảng trắng, dấu chấm, dấu gạch nối
 * - Tự động bổ sung số 0 ở đầu nếu Excel lưu dạng số (9 chữ số)
 * - Chuyển đầu số +84 hoặc 84 về 0...
 */
export function normalizePhoneNumber(raw: any): string {
  if (raw === null || raw === undefined) return '';

  let cleaned = String(raw).trim().replace(/[\s.-]/g, '');
  if (!cleaned) return '';

  // Bỏ tiền tố quốc tế +84 hoặc 84
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Nếu Excel lưu dạng số và cắt mất số 0 ở đầu (9 chữ số, bắt đầu bằng 3, 5, 7, 8, 9)
  if (/^[35789]\d{8}$/.test(cleaned)) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Kiểm tra xem ghi chú sức khỏe có mang ý nghĩa "Bình thường" / không có vấn đề hay không.
 * Tránh tự động kích hoạt diện theo dõi đặc biệt đối với học sinh khỏe mạnh.
 */
export function isNormalHealthNote(note: string): boolean {
  if (!note) return true;
  const lower = note.toLowerCase().trim();
  const normalKeywords = [
    'bình thường',
    'binh thuong',
    'ổn định',
    'on dinh',
    'tốt',
    'tot',
    'khỏe mạnh',
    'khoe manh',
    'không',
    'khong',
    'không có',
    'khong co',
    'k',
    'ko',
    'none',
    'normal',
    'bình thường.',
    'bình thường, không có bệnh lý',
    'sức khỏe tốt',
  ];
  return normalKeywords.some((kw) => lower === kw || lower.startsWith(kw));
}

/**
 * Hàm phân tích mảng 2 chiều Excel (rows từ XLSX.utils.sheet_to_json({ header: 1 }))
 * thành danh sách học sinh chuẩn, tương thích với Student model.
 */
export function parseExcelRowsToStudents(
  rawRows: any[][],
  existingStudents: Student[],
  currentUserId?: string,
  currentUserName?: string
): {
  success: boolean;
  students: ParsedStudentPreview[];
  error?: string;
  totalParsed: number;
  duplicateCount: number;
} {
  if (!rawRows || rawRows.length < 2) {
    return {
      success: false,
      students: [],
      error: 'File Excel không có dữ liệu hoặc thiếu dòng tiêu đề!',
      totalParsed: 0,
      duplicateCount: 0,
    };
  }

  // Tìm dòng tiêu đề (chứa ít nhất "mã" hoặc "tên" hoặc "lớp")
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    const rowStr = (rawRows[i] || []).map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      (rowStr.includes('mã') || rowStr.includes('code')) &&
      (rowStr.includes('tên') || rowStr.includes('name') || rowStr.includes('họ'))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0; // Mặc định dòng đầu tiên nếu không phát hiện
  }

  const rawHeaders = (rawRows[headerRowIndex] || []).map((h) => String(h || '').trim());
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // 1. Cột Mã học sinh
  const codeIdx = findColumnIndex(
    normalizedHeaders,
    ['mã học sinh', 'mã hs', 'ma hoc sinh', 'ma hs', 'student code', 'code', 'mã'],
    ['mã hs', 'mã học sinh', 'student code', 'mã', 'code'],
    ['phụ huynh', 'giáo viên']
  );

  // 2. Cột Họ và tên học sinh (TUYỆT ĐỐI LOẠI TRỪ 'mã', 'code' để không bị nhận nhầm "mã học sinh" thành họ tên)
  const nameIdx = findColumnIndex(
    normalizedHeaders,
    ['họ và tên', 'họ tên', 'họ và tên học sinh', 'tên học sinh', 'ho va ten', 'ho ten', 'full name', 'fullname', 'họ tên hs'],
    ['họ và tên', 'họ tên', 'tên học sinh', 'full name', 'fullname', 'họ', 'tên'],
    ['mã', 'code', 'phụ huynh', 'ph', 'giáo viên', 'gv', 'cha', 'mẹ', 'lớp']
  );

  // 3. Cột Lớp
  const classIdx = findColumnIndex(
    normalizedHeaders,
    ['lớp', 'lop', 'class', 'lớp học', 'chi đội'],
    ['lớp', 'lop', 'class'],
    ['phòng', 'room', 'giáo viên']
  );

  // 4. Cột Phòng KTX
  const roomIdx = findColumnIndex(
    normalizedHeaders,
    ['phòng ktx', 'phòng', 'phong', 'phong ktx', 'room', 'phòng ở', 'ktx'],
    ['phòng', 'room', 'ktx'],
    ['lớp', 'học']
  );

  // 5. Cột Giới tính
  const genderIdx = findColumnIndex(
    normalizedHeaders,
    ['giới tính', 'gioi tinh', 'gender', 'phái', 'nam/nữ'],
    ['giới tính', 'gender', 'phái'],
    []
  );

  // 6. Cột Ngày sinh
  const dobIdx = findColumnIndex(
    normalizedHeaders,
    ['ngày sinh', 'ngay sinh', 'birthday', 'dob', 'năm sinh'],
    ['ngày sinh', 'sinh', 'birthday', 'dob'],
    []
  );

  // 7. Cột Phụ huynh (Hỗ trợ "Họ tên PH", "Họ tên phụ huynh", "Tên PH", "Phụ huynh", "Parent"...)
  const parentNameIdx = findColumnIndex(
    normalizedHeaders,
    [
      'họ tên ph',
      'họ và tên ph',
      'họ tên phụ huynh',
      'họ và tên phụ huynh',
      'tên ph',
      'tên phụ huynh',
      'phụ huynh',
      'ph',
      'cha mẹ',
      'cha',
      'mẹ',
      'parent name',
      'parent',
    ],
    ['họ tên ph', 'họ và tên ph', 'tên ph', 'tên phụ huynh', 'phụ huynh', 'parent', 'cha', 'mẹ'],
    ['điện thoại', 'sđt', 'sdt', 'phone', 'tel', 'mobile']
  );

  // 8. Cột SĐT Phụ huynh (Hỗ trợ "SĐT PH", "Số điện thoại phụ huynh", "Điện thoại PH"...)
  const phoneIdx = findColumnIndex(
    normalizedHeaders,
    [
      'sđt ph',
      'sdt ph',
      'số điện thoại ph',
      'điện thoại ph',
      'số điện thoại phụ huynh',
      'điện thoại phụ huynh',
      'sđt phụ huynh',
      'số điện thoại',
      'điện thoại',
      'sđt',
      'sdt',
      'phone',
      'parent phone',
    ],
    ['điện thoại', 'sđt', 'sdt', 'phone', 'hotline'],
    []
  );

  // 9. Cột Sức khỏe
  const healthIdx = findColumnIndex(
    normalizedHeaders,
    ['thông tin sức khỏe', 'sức khỏe', 'suc khoe', 'bệnh lý', 'dị ứng', 'y tế', 'health', 'medical'],
    ['sức khỏe', 'bệnh', 'dị ứng', 'y tế', 'health'],
    []
  );

  // 10. Cột Ghi chú
  const noteIdx = findColumnIndex(
    normalizedHeaders,
    ['ghi chú quản nhiệm', 'ghi chú', 'ghi chu', 'lưu ý', 'note'],
    ['ghi chú', 'lưu ý', 'note'],
    ['sức khỏe']
  );

  // 11. Cột Theo dõi đặc biệt
  const specialIdx = findColumnIndex(
    normalizedHeaders,
    ['theo dõi đặc biệt', 'diện theo dõi', 'đặc biệt', 'cần theo dõi', 'special care', 'special'],
    ['đặc biệt', 'theo dõi', 'special', 'ưu tiên'],
    []
  );

  // 12. Cột Phân loại diện theo dõi
  const labelIdx = findColumnIndex(
    normalizedHeaders,
    ['phân loại theo dõi', 'phân loại', 'nhãn', 'label', 'diện'],
    ['phân loại', 'nhãn', 'label'],
    []
  );

  // 13. Cột Giáo viên quản nhiệm / GV phụ trách
  const teacherIdx = findColumnIndex(
    normalizedHeaders,
    [
      'gv phụ trách',
      'giáo viên phụ trách',
      'giáo viên quản nhiệm',
      'gv quản nhiệm',
      'gvqn',
      'giáo viên',
      'gv',
      'quản nhiệm',
      'teacher',
      'assigned teacher',
    ],
    ['gv phụ trách', 'giáo viên phụ trách', 'giáo viên', 'quản nhiệm', 'gvqn', 'teacher'],
    []
  );

  if (codeIdx === -1 && nameIdx === -1) {
    return {
      success: false,
      students: [],
      error:
        'Không thể nhận diện cột "Mã học sinh" hoặc "Họ và tên" trong file. Vui lòng tải file mẫu để kiểm tra định dạng cột!',
      totalParsed: 0,
      duplicateCount: 0,
    };
  }

  const existingMap = new Map<string, Student>();
  existingStudents.forEach((s) => {
    if (s.studentCode) {
      existingMap.set(s.studentCode.trim().toLowerCase(), s);
    }
  });

  const parsedList: ParsedStudentPreview[] = [];
  let duplicateCount = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';
    const rawName = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';

    // Bỏ qua dòng trống hoàn toàn cả mã và tên
    if (!rawCode && !rawName) continue;

    const studentCode = (rawCode || `HS${1000 + r}`).toUpperCase();
    const existing = existingMap.get(studentCode.toLowerCase());
    const isDuplicate = !!existing;
    if (isDuplicate) duplicateCount++;

    // 1. Họ và tên
    let fullName = rawName;
    if (!fullName) {
      if (existing?.fullName) {
        fullName = existing.fullName;
      } else {
        fullName = `Học sinh ${studentCode}`;
      }
    }

    // 2. Lớp (không tự gán 10A1 đè lên lớp của học sinh cũ)
    const rawClass = classIdx >= 0 && row[classIdx] != null ? String(row[classIdx]).trim() : '';
    let className = rawClass;
    if (!className) {
      if (existing?.className) {
        className = existing.className;
      } else {
        className = '10A1';
      }
    }

    // 3. Phòng KTX (không tự gán DomB-101 đè lên phòng của học sinh cũ)
    const rawRoom = roomIdx >= 0 && row[roomIdx] != null ? String(row[roomIdx]).trim() : '';
    let roomName = rawRoom;
    let roomId = '';
    if (roomName) {
      roomId = roomName.startsWith('r-') ? roomName : `r-${roomName}`;
    } else if (existing?.roomName) {
      roomName = existing.roomName;
      roomId = existing.roomId || (roomName.startsWith('r-') ? roomName : `r-${roomName}`);
    } else {
      roomName = 'DomB-101';
      roomId = 'r-DomB-101';
    }

    // 4. Giới tính (nếu ô trống giữ giới tính cũ)
    let gender: 'nam' | 'nữ' = 'nam';
    if (genderIdx >= 0 && row[genderIdx] != null && String(row[genderIdx]).trim() !== '') {
      const gStr = String(row[genderIdx]).toLowerCase().trim();
      if (gStr.includes('nữ') || gStr.includes('nu') || gStr === 'f' || gStr === 'female') {
        gender = 'nữ';
      } else {
        gender = 'nam';
      }
    } else if (existing?.gender) {
      gender = existing.gender;
    }

    // 5. Ngày sinh (chuẩn hóa an toàn, không fallback về ngày giả, giữ ngày cũ nếu ô trống)
    let birthday = '';
    if (dobIdx >= 0 && row[dobIdx] != null && String(row[dobIdx]).trim() !== '') {
      const parsedDob = normalizeBirthday(row[dobIdx]);
      if (parsedDob) {
        birthday = parsedDob;
      } else if (existing?.birthday) {
        birthday = existing.birthday;
      }
    } else if (existing?.birthday) {
      birthday = existing.birthday;
    }

    // 6. Họ tên Phụ huynh (nếu ô trống giữ dữ liệu cũ)
    const rawParentName = parentNameIdx >= 0 && row[parentNameIdx] != null ? String(row[parentNameIdx]).trim() : '';
    const parentName = rawParentName || existing?.parentName || '';

    // 7. SĐT Phụ huynh (chuẩn hóa số 0 đầu, lọc ký tự thừa, nếu ô trống giữ dữ liệu cũ)
    const rawPhone = phoneIdx >= 0 && row[phoneIdx] != null ? String(row[phoneIdx]).trim() : '';
    let parentPhone = '';
    if (rawPhone) {
      parentPhone = normalizePhoneNumber(rawPhone) || rawPhone;
    } else if (existing?.parentPhone) {
      parentPhone = existing.parentPhone;
    }

    // 8. Sức khỏe (nếu ô trống giữ dữ liệu cũ)
    const rawHealth = healthIdx >= 0 && row[healthIdx] != null ? String(row[healthIdx]).trim() : '';
    let healthNote = '';
    if (rawHealth) {
      healthNote = isNormalHealthNote(rawHealth) ? '' : rawHealth;
    } else if (existing?.healthNote) {
      healthNote = existing.healthNote;
    }

    // 9. Ghi chú (nếu ô trống giữ dữ liệu cũ)
    const rawNote = noteIdx >= 0 && row[noteIdx] != null ? String(row[noteIdx]).trim() : '';
    const note = rawNote || existing?.note || '';

    // 10. Giáo viên phụ trách (không đè GV cũ bằng giá trị mặc định)
    const rawTeacher = teacherIdx >= 0 && row[teacherIdx] != null ? String(row[teacherIdx]).trim() : '';
    let teacherName = rawTeacher;
    let teacherId = '';
    if (teacherName) {
      teacherId = currentUserId || 'u-gv-001';
    } else if (existing?.teacherName) {
      teacherName = existing.teacherName;
      teacherId = existing.teacherId || currentUserId || 'u-gv-001';
    } else {
      teacherName = currentUserName || 'Giáo viên Quản nhiệm DomB';
      teacherId = currentUserId || 'u-gv-001';
    }

    // 11. Diện theo dõi đặc biệt & nhãn phân loại:
    // Nguồn quyết định duy nhất là cột "Theo dõi đặc biệt (Có/Không)"
    // Ô trống / không có cột: Giữ nguyên trạng thái cũ của học sinh
    let specialCareStatus: 'yes' | 'no' | 'unspecified' = 'unspecified';
    if (specialIdx >= 0 && row[specialIdx] != null && String(row[specialIdx]).trim() !== '') {
      const specStr = String(row[specialIdx]).toLowerCase().trim();
      if (
        !specStr.includes('không') &&
        !specStr.includes('khong') &&
        specStr !== 'no' &&
        specStr !== 'false' &&
        specStr !== '0' &&
        (specStr.includes('có') ||
          specStr.includes('yes') ||
          specStr === 'true' ||
          specStr.includes('x') ||
          specStr === '1' ||
          specStr.includes('đặc biệt'))
      ) {
        specialCareStatus = 'yes';
      } else if (
        specStr.includes('không') ||
        specStr.includes('khong') ||
        specStr === 'no' ||
        specStr === 'false' ||
        specStr === '0'
      ) {
        specialCareStatus = 'no';
      }
    }

    // Phân loại nhãn theo dõi từ cột phân loại (nếu có)
    const parsedLabels: SpecialLabel[] = [];
    if (labelIdx >= 0 && row[labelIdx]) {
      const lStr = String(row[labelIdx]).toLowerCase();
      if (lStr.includes('sức khỏe') || lStr.includes('y tế') || lStr.includes('bệnh')) {
        parsedLabels.push('health_issue');
      }
      if (lStr.includes('tâm lý') || lStr.includes('hòa nhập')) {
        parsedLabels.push('mental_support');
      }
      if (lStr.includes('học tập') || lStr.includes('sa sút')) {
        parsedLabels.push('academic_risk');
      }
      if (lStr.includes('kỷ luật') || lStr.includes('hành vi')) {
        parsedLabels.push('behavior_issue');
      }
      if (lStr.includes('phụ huynh') || lStr.includes('gia đình')) {
        parsedLabels.push('parent_request');
      }
    }

    let specialCare = false;
    let specialLabels: SpecialLabel[] = [];

    if (specialCareStatus === 'yes') {
      specialCare = true;
      if (parsedLabels.length > 0) {
        specialLabels = parsedLabels;
      } else if (existing?.specialLabels && existing.specialLabels.length > 0) {
        specialLabels = existing.specialLabels;
      } else {
        specialLabels = ['health_issue'];
      }
    } else if (specialCareStatus === 'no') {
      specialCare = false;
      specialLabels = [];
    } else {
      // Unspecified / ô trống / không có cột: Giữ nguyên từ existing nếu có
      if (existing) {
        specialCare = existing.specialCare;
        specialLabels = existing.specialLabels || [];
      } else {
        specialCare = false;
        specialLabels = [];
      }
    }

    // 12. Giữ nguyên người tải ban đầu & tương tác nếu là học sinh cũ
    const uploadedByUserId = existing?.uploadedByUserId || currentUserId || 'u-gv-001';
    const uploadedByUserName = existing?.uploadedByUserName || currentUserName || 'Giáo viên Quản nhiệm';
    const lastInteractionDate = existing?.lastInteractionDate;
    const interactionCountThisMonth = existing?.interactionCountThisMonth || 0;

    parsedList.push({
      previewId: `prev-${r}-${Date.now()}`,
      studentCode,
      fullName,
      gender,
      birthday,
      className,
      roomId,
      roomName,
      teacherId,
      teacherName,
      parentName,
      parentPhone,
      status: existing?.status || 'active',
      specialCare,
      specialLabels,
      healthNote,
      note,
      lastInteractionDate,
      interactionCountThisMonth,
      uploadedByUserId,
      uploadedByUserName,
      isDuplicate,
      rawSpecialCareStatus: specialCareStatus,
    });
  }

  return {
    success: true,
    students: parsedList,
    totalParsed: parsedList.length,
    duplicateCount,
  };
}
