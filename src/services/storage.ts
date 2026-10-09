import {
  User,
  Student,
  Room,
  Position,
  ScheduleAssignment,
  TaskInstance,
  Interaction1on1,
  KPIRecord,
  DailyEvaluation,
  DailyWorkReport,
  NotificationItem,
  AuditLog,
  DepartmentSettings,
  TaskStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_STUDENTS,
  INITIAL_ROOMS,
  INITIAL_POSITIONS,
  INITIAL_SCHEDULE_ASSIGNMENTS,
  INITIAL_TASK_INSTANCES,
  INITIAL_INTERACTIONS,
  INITIAL_KPIS,
  INITIAL_DAILY_EVALUATIONS,
  INITIAL_DAILY_WORK_REPORTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
} from '../data/mockData';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Các key CHỈ dùng cho client-side / UI state (được phép lưu trên browser của user)
 */
const CLIENT_STORAGE_KEYS = {
  CURRENT_USER_ID: 'bops_client_current_user_id',
  IS_LOGGED_IN: 'bops_client_is_logged_in',
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error running store subscriber listener:', e);
    }
  });
}

// ============================================================================
// SINGLE SOURCE OF TRUTH (IN-MEMORY STATE SYNCHRONIZED WITH SUPABASE POSTGRESQL)
// Dữ liệu nghiệp vụ KHÔNG lưu vào localStorage. Toàn bộ đọc/ghi trực tiếp với Supabase.
// ============================================================================
interface AppDatabaseState {
  users: User[];
  students: Student[];
  rooms: Room[];
  positions: Position[];
  schedules: ScheduleAssignment[];
  tasks: TaskInstance[];
  interactions: Interaction1on1[];
  kpis: KPIRecord[];
  dailyEvaluations: DailyEvaluation[];
  dailyWorkReports: DailyWorkReport[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  settings: DepartmentSettings;
  isInitialized: boolean;
  isSyncing: boolean;
}

const state: AppDatabaseState = {
  users: [...INITIAL_USERS],
  students: [...INITIAL_STUDENTS],
  rooms: [...INITIAL_ROOMS],
  positions: [...INITIAL_POSITIONS],
  schedules: [...INITIAL_SCHEDULE_ASSIGNMENTS],
  tasks: [...INITIAL_TASK_INSTANCES],
  interactions: [...INITIAL_INTERACTIONS],
  kpis: [...INITIAL_KPIS],
  dailyEvaluations: [...INITIAL_DAILY_EVALUATIONS],
  dailyWorkReports: [...INITIAL_DAILY_WORK_REPORTS],
  notifications: [...INITIAL_NOTIFICATIONS],
  auditLogs: [...INITIAL_AUDIT_LOGS],
  settings: { ...INITIAL_SETTINGS },
  isInitialized: false,
  isSyncing: false,
};

// ============================================================================
// DATA CONVERTERS: TYPESCRIPT CAMELCASE <-> SUPABASE POSTGRESQL SNAKE_CASE
// ============================================================================
function userToDb(u: User) {
  return {
    id: u.id,
    teacher_code: u.teacherCode,
    full_name: u.fullName,
    username: u.username || null,
    password: u.password || null,
    email: u.email || null,
    phone: u.phone || null,
    avatar: u.avatar || null,
    role: u.role,
    position: u.position || null,
    status: u.status || 'active',
    department_id: u.departmentId || null,
    employment_date: u.employmentDate || null,
    birthday: u.birthday || null,
    gender: u.gender || null,
    address: u.address || null,
    night_shift_eligible: u.nightShiftEligible ?? true,
    assigned_room_ids: u.assignedRoomIds || [],
    assigned_student_ids: u.assignedStudentIds || [],
    assigned_building: u.assignedBuilding || 'DomB',
    workload_index: u.workloadIndex ?? 1.0,
    updated_at: new Date().toISOString(),
  };
}

function dbToUser(row: any): User {
  return {
    id: row.id,
    teacherCode: row.teacher_code || '',
    fullName: row.full_name || '',
    username: row.username || undefined,
    password: row.password || undefined,
    email: row.email || '',
    phone: row.phone || '',
    avatar: row.avatar || '',
    role: (row.role === 'manager' ? 'manager' : 'teacher') as 'manager' | 'teacher',
    position: row.position || '',
    status: (row.status || 'active') as any,
    departmentId: row.department_id || 'dept-01',
    employmentDate: row.employment_date || '',
    birthday: row.birthday || '',
    gender: (row.gender === 'nữ' ? 'nữ' : 'nam') as 'nam' | 'nữ',
    address: row.address || '',
    nightShiftEligible: row.night_shift_eligible !== false,
    assignedRoomIds: row.assigned_room_ids || [],
    assignedStudentIds: row.assigned_student_ids || [],
    assignedBuilding: row.assigned_building || 'DomB',
    workloadIndex: Number(row.workload_index) || 1.0,
  };
}

function positionToDb(p: Position) {
  return {
    id: p.id,
    position_code: p.positionCode,
    position_name: p.positionName,
    description: p.description || null,
    building: p.building || 'DomB',
    floor: p.floor ?? 1,
    required_teachers: p.requiredTeachers ?? 1,
    priority: p.priority || 'medium',
  };
}

function dbToPosition(row: any): Position {
  return {
    id: row.id,
    positionCode: row.position_code || '',
    positionName: row.position_name || '',
    description: row.description || '',
    building: row.building || 'DomB',
    floor: Number(row.floor) || 1,
    requiredTeachers: Number(row.required_teachers) || 1,
    priority: (row.priority || 'medium') as any,
  };
}

function settingsToDb(s: DepartmentSettings) {
  return {
    id: 'current_settings',
    department_name: s.departmentName,
    school_name: s.schoolName,
    academic_year: s.academicYear,
    current_semester: s.currentSemester,
    current_week: s.currentWeek,
    min_interactions_per_week: s.minInteractionsPerWeek,
    max_interactions_per_week: s.maxInteractionsPerWeek,
    shift_times: s.shiftTimes,
    kpi_weights: s.kpiWeights,
    updated_at: new Date().toISOString(),
  };
}

function dbToSettings(row: any): DepartmentSettings {
  return {
    departmentName: row.department_name || INITIAL_SETTINGS.departmentName,
    schoolName: row.school_name || INITIAL_SETTINGS.schoolName,
    academicYear: row.academic_year || INITIAL_SETTINGS.academicYear,
    currentSemester: row.current_semester || INITIAL_SETTINGS.currentSemester,
    currentWeek: Number(row.current_week) || INITIAL_SETTINGS.currentWeek,
    minInteractionsPerWeek: Number(row.min_interactions_per_week) || INITIAL_SETTINGS.minInteractionsPerWeek,
    maxInteractionsPerWeek: Number(row.max_interactions_per_week) || INITIAL_SETTINGS.maxInteractionsPerWeek,
    shiftTimes: row.shift_times || INITIAL_SETTINGS.shiftTimes,
    kpiWeights: row.kpi_weights || INITIAL_SETTINGS.kpiWeights,
  };
}

function studentToDb(s: Student) {
  return {
    id: s.id,
    student_code: s.studentCode,
    full_name: s.fullName,
    gender: s.gender,
    birthday: s.birthday,
    class_name: s.className,
    room_id: s.roomId,
    room_name: s.roomName,
    teacher_id: s.teacherId,
    teacher_name: s.teacherName,
    parent_name: s.parentName,
    parent_phone: s.parentPhone,
    status: s.status,
    special_care: s.specialCare,
    special_labels: s.specialLabels || [],
    health_note: s.healthNote || null,
    note: s.note || null,
    last_interaction_date: s.lastInteractionDate || null,
    interaction_count_this_month: s.interactionCountThisMonth || 0,
    uploaded_by_user_id: s.uploadedByUserId || null,
    uploaded_by_user_name: s.uploadedByUserName || null,
    updated_at: new Date().toISOString(),
  };
}

function dbToStudent(row: any): Student {
  return {
    id: row.id,
    studentCode: row.student_code || '',
    fullName: row.full_name || '',
    gender: row.gender || 'nam',
    birthday: row.birthday || '',
    className: row.class_name || '',
    roomId: row.room_id || '',
    roomName: row.room_name || '',
    teacherId: row.teacher_id || '',
    teacherName: row.teacher_name || '',
    parentName: row.parent_name || '',
    parentPhone: row.parent_phone || '',
    status: row.status || 'active',
    specialCare: Boolean(row.special_care),
    specialLabels: row.special_labels || [],
    healthNote: row.health_note || '',
    note: row.note || '',
    lastInteractionDate: row.last_interaction_date || '',
    interactionCountThisMonth: Number(row.interaction_count_this_month) || 0,
    uploadedByUserId: row.uploaded_by_user_id || undefined,
    uploadedByUserName: row.uploaded_by_user_name || undefined,
  };
}

function roomToDb(r: Room) {
  return {
    id: r.id,
    room_name: r.roomName,
    building: r.building,
    floor: r.floor,
    capacity: r.capacity,
    occupied: r.occupied,
    gender: r.gender,
    teacher_id: r.teacherId,
    teacher_name: r.teacherName,
    status: r.status,
    hygiene_status: r.hygieneStatus,
    last_inspected_at: r.lastInspectedAt || null,
    correction_note: r.correctionNote || null,
  };
}

function dbToRoom(row: any): Room {
  return {
    id: row.id,
    roomName: row.room_name,
    building: row.building || 'DomB',
    floor: Number(row.floor) || 1,
    capacity: Number(row.capacity) || 8,
    occupied: Number(row.occupied) || 0,
    gender: row.gender || 'nam',
    teacherId: row.teacher_id || '',
    teacherName: row.teacher_name || '',
    status: row.status || 'clean',
    hygieneStatus: row.hygiene_status || 'pass',
    lastInspectedAt: row.last_inspected_at || '',
    correctionNote: row.correction_note || '',
  };
}

function interactionToDb(i: Interaction1on1) {
  return {
    id: i.id,
    teacher_id: i.teacherId,
    teacher_name: i.teacherName,
    student_id: i.studentId,
    student_name: i.studentName,
    class_name: i.className,
    room_name: i.roomName,
    interaction_date: i.interactionDate,
    start_time: i.startTime,
    end_time: i.endTime,
    duration_minutes: i.durationMinutes,
    location: i.location,
    topic: i.topic,
    summary: i.summary,
    observation: i.observation,
    support_plan: i.supportPlan,
    priority: i.priority,
    follow_up_date: i.followUpDate || null,
    follow_up_status: i.followUpStatus || 'pending',
    attachments: i.attachments || [],
    created_at: i.createdAt,
  };
}

function dbToInteraction(row: any): Interaction1on1 {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    studentId: row.student_id,
    studentName: row.student_name,
    className: row.class_name || '',
    roomName: row.room_name || '',
    interactionDate: row.interaction_date,
    startTime: row.start_time || '19:30',
    endTime: row.end_time || '20:00',
    durationMinutes: Number(row.duration_minutes) || 20,
    location: row.location || '',
    topic: row.topic,
    summary: row.summary,
    observation: row.observation || '',
    supportPlan: row.support_plan || '',
    priority: row.priority || 'medium',
    followUpDate: row.follow_up_date || undefined,
    followUpStatus: row.follow_up_status || 'pending',
    attachments: row.attachments || [],
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function reportToDb(r: DailyWorkReport) {
  return {
    id: r.id,
    date: r.date,
    shift: r.shift,
    teacher_id: r.teacherId,
    teacher_name: r.teacherName,
    teacher_code: r.teacherCode,
    tasks_completion_rate: r.tasksCompletionRate,
    completed_tasks_count: r.completedTasksCount,
    total_tasks_count: r.totalTasksCount,
    work_status: r.workStatus,
    work_summary: r.workSummary,
    handover_notes: r.handoverNotes || null,
    suggestions_to_manager: r.suggestionsToManager || null,
    student_incidents: r.studentIncidents || [],
    room_conditions: r.roomConditions || [],
    admin_feedback: r.adminFeedback || null,
    admin_feedback_at: r.adminFeedbackAt || null,
    admin_reviewed: r.adminReviewed,
    created_at: r.createdAt,
  };
}

function dbToReport(row: any): DailyWorkReport {
  return {
    id: row.id,
    date: row.date,
    shift: row.shift,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    teacherCode: row.teacher_code || '',
    createdAt: row.created_at || new Date().toISOString(),
    tasksCompletionRate: Number(row.tasks_completion_rate) || 100,
    completedTasksCount: Number(row.completed_tasks_count) || 0,
    totalTasksCount: Number(row.total_tasks_count) || 0,
    workStatus: row.work_status || 'completed',
    workSummary: row.work_summary || '',
    handoverNotes: row.handover_notes || '',
    suggestionsToManager: row.suggestions_to_manager || '',
    studentIncidents: row.student_incidents || [],
    roomConditions: row.room_conditions || [],
    adminFeedback: row.admin_feedback || undefined,
    adminFeedbackAt: row.admin_feedback_at || undefined,
    adminReviewed: Boolean(row.admin_reviewed),
  };
}

function evalToDb(e: DailyEvaluation) {
  return {
    id: e.id,
    date: e.date,
    teacher_id: e.teacherId,
    teacher_name: e.teacherName,
    teacher_code: e.teacherCode,
    evaluator_id: e.evaluatorId,
    evaluator_name: e.evaluatorName,
    evaluated_at: e.evaluatedAt,
    operation_score: e.operationScore,
    quality_score: e.qualityScore,
    student_care_score: e.studentCareScore,
    contribution_score: e.contributionScore,
    discipline_score: e.disciplineScore,
    total_score: e.totalScore,
    rank: e.rank,
    strengths: e.strengths || null,
    improvements: e.improvements || null,
    general_comment: e.generalComment,
    status: e.status,
  };
}

function dbToEval(row: any): DailyEvaluation {
  return {
    id: row.id,
    date: row.date,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    teacherCode: row.teacher_code || '',
    evaluatorId: row.evaluator_id || 'u-mgr-01',
    evaluatorName: row.evaluator_name || 'Thầy Lê Huy Phúc',
    evaluatedAt: row.evaluated_at || new Date().toISOString(),
    operationScore: Number(row.operation_score) || 50,
    qualityScore: Number(row.quality_score) || 20,
    studentCareScore: Number(row.student_care_score) || 15,
    contributionScore: Number(row.contribution_score) || 10,
    disciplineScore: Number(row.discipline_score) || 5,
    totalScore: Number(row.total_score) || 100,
    rank: row.rank || 'A+',
    strengths: row.strengths || '',
    improvements: row.improvements || '',
    generalComment: row.general_comment || '',
    status: row.status || 'evaluated',
  };
}

function scheduleToDb(s: ScheduleAssignment) {
  return {
    id: s.id,
    date: s.date,
    teacher_id: s.teacherId,
    teacher_name: s.teacherName,
    teacher_code: s.teacherCode,
    shift: s.shift,
    template_id: s.templateId,
    position_id: s.positionId,
    position_name: s.positionName,
    room_ids: s.roomIds || [],
    status: s.status,
    swap_with_teacher_id: s.swapWithTeacherId || null,
    swap_approved_by: s.swapApprovedBy || null,
    swap_note: s.swapNote || null,
    completed_at: s.completedAt || null,
    completion_note: s.completionNote || null,
    proof_photos: s.proofPhotos || [],
    evaluation_status: s.evaluationStatus || null,
    evaluation_criteria: s.evaluationCriteria || null,
    deducted_points: s.deductedPoints || 0,
    evaluation_note: s.evaluationNote || null,
    evaluated_by: s.evaluatedBy || null,
    evaluated_at: s.evaluatedAt || null,
  };
}

function dbToSchedule(row: any): ScheduleAssignment {
  return {
    id: row.id,
    date: row.date,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    teacherCode: row.teacher_code || '',
    shift: row.shift,
    templateId: row.template_id || '',
    positionId: row.position_id || '',
    positionName: row.position_name || '',
    roomIds: row.room_ids || [],
    status: row.status || 'scheduled',
    swapWithTeacherId: row.swap_with_teacher_id || undefined,
    swapApprovedBy: row.swap_approved_by || undefined,
    swapNote: row.swap_note || undefined,
    completedAt: row.completed_at || undefined,
    completionNote: row.completion_note || undefined,
    proofPhotos: row.proof_photos || [],
    evaluationStatus: row.evaluation_status || undefined,
    evaluationCriteria: row.evaluation_criteria || undefined,
    deductedPoints: Number(row.deducted_points) || 0,
    evaluationNote: row.evaluation_note || undefined,
    evaluatedBy: row.evaluated_by || undefined,
    evaluatedAt: row.evaluated_at || undefined,
  };
}

function taskToDb(t: TaskInstance) {
  return {
    id: t.id,
    task_code: t.taskCode,
    task_name: t.taskName,
    title: t.title || t.taskName,
    task_category: t.taskCategory,
    shift: t.shift,
    teacher_id: t.teacherId,
    teacher_name: t.teacherName,
    date: t.date,
    schedule_assignment_id: t.scheduleAssignmentId || null,
    planned_start: t.plannedStart,
    planned_end: t.plannedEnd,
    actual_start: t.actualStart || null,
    actual_end: t.actualEnd || null,
    status: t.status,
    room_id: t.roomId || null,
    room_name: t.roomName || null,
    student_id: t.studentId || null,
    student_name: t.studentName || null,
    score: t.score || 5,
    verified: Boolean(t.verified),
    verified_by: t.verifiedBy || null,
    verified_at: t.verifiedAt || null,
    note: t.note || null,
    proof_photos: t.proofPhotos || [],
    priority: t.priority || 'medium',
    evaluation_criteria: t.evaluationCriteria || null,
    deducted_points: t.deductedPoints || 0,
    evaluation_note: t.evaluationNote || null,
  };
}

function dbToTask(row: any): TaskInstance {
  return {
    id: row.id,
    taskCode: row.task_code,
    taskName: row.task_name,
    title: row.title || row.task_name,
    taskCategory: row.task_category || 'routine',
    shift: row.shift,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    date: row.date,
    scheduleAssignmentId: row.schedule_assignment_id || undefined,
    plannedStart: row.planned_start || '06:00',
    plannedEnd: row.planned_end || '07:30',
    actualStart: row.actual_start || undefined,
    actualEnd: row.actual_end || undefined,
    status: row.status || 'pending',
    roomId: row.room_id || undefined,
    roomName: row.room_name || undefined,
    studentId: row.student_id || undefined,
    studentName: row.student_name || undefined,
    score: Number(row.score) || 5,
    verified: Boolean(row.verified),
    verifiedBy: row.verified_by || undefined,
    verifiedAt: row.verified_at || undefined,
    note: row.note || '',
    proofPhotos: row.proof_photos || [],
    priority: row.priority || 'medium',
    evaluationCriteria: row.evaluation_criteria || undefined,
    deductedPoints: Number(row.deducted_points) || 0,
    evaluationNote: row.evaluation_note || undefined,
  };
}

function kpiToDb(k: KPIRecord) {
  return {
    id: k.id,
    teacher_id: k.teacherId,
    teacher_name: k.teacherName,
    teacher_code: k.teacherCode,
    date: k.date,
    operation_score: k.operationScore,
    quality_score: k.qualityScore,
    student_care_score: k.studentCareScore,
    contribution_score: k.contributionScore,
    discipline_score: k.disciplineScore,
    total_score: k.totalScore,
    rank: k.rank,
    workload_index: k.workloadIndex,
    tasks_completed: k.tasksCompleted,
    tasks_total: k.tasksTotal,
    interactions_completed_this_week: k.interactionsCompletedThisWeek,
    penalties: k.penalties || [],
  };
}

function dbToKpi(row: any): KPIRecord {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    teacherCode: row.teacher_code || '',
    date: row.date,
    operationScore: Number(row.operation_score) || 50,
    qualityScore: Number(row.quality_score) || 20,
    studentCareScore: Number(row.student_care_score) || 15,
    contributionScore: Number(row.contribution_score) || 10,
    disciplineScore: Number(row.discipline_score) || 5,
    totalScore: Number(row.total_score) || 100,
    rank: row.rank || 'A+',
    workloadIndex: Number(row.workload_index) || 1.0,
    tasksCompleted: Number(row.tasks_completed) || 0,
    tasksTotal: Number(row.tasks_total) || 0,
    interactionsCompletedThisWeek: Number(row.interactions_completed_this_week) || 0,
    penalties: row.penalties || [],
  };
}

function notifToDb(n: NotificationItem) {
  return {
    id: n.id,
    receiver_id: n.receiverId,
    title: n.title,
    content: n.content,
    type: n.type,
    priority: n.priority,
    read: n.read,
    created_at: n.createdAt,
    link_url: n.linkUrl || null,
  };
}

function dbToNotif(row: any): NotificationItem {
  return {
    id: row.id,
    receiverId: row.receiver_id,
    title: row.title,
    content: row.content,
    type: row.type || 'system',
    priority: row.priority || 'medium',
    read: Boolean(row.read),
    createdAt: row.created_at || new Date().toISOString(),
    linkUrl: row.link_url || undefined,
  };
}

function auditToDb(a: AuditLog) {
  return {
    id: a.id,
    user_id: a.userId,
    user_name: a.userName,
    user_role: a.userRole,
    module: a.module,
    operation: a.operation,
    details: a.details,
    old_data: a.oldData || null,
    new_data: a.newData || null,
    timestamp: a.timestamp,
  };
}

function dbToAudit(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    module: row.module,
    operation: row.operation,
    details: row.details,
    oldData: row.old_data || undefined,
    newData: row.new_data || undefined,
    timestamp: row.timestamp || new Date().toISOString(),
  };
}

// ============================================================================
// SUPABASE REALTIME & INITIAL FETCH
// Tải toàn bộ dữ liệu từ PostgreSQL ngay khi khởi động và lắng nghe thay đổi
// ============================================================================
export async function initializeDatabaseSync(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn(
      'Supabase chưa được cấu hình qua biến môi trường. Chạy với dữ liệu mẫu trong RAM.'
    );
    state.isInitialized = true;
    notifySubscribers();
    return;
  }

  if (state.isSyncing) return;
  state.isSyncing = true;

  try {
    // 1. Tải bảng users
    const { data: dbUsers, error: errUsers } = await supabase
      .from('users')
      .select('*')
      .order('teacher_code', { ascending: true });

    if (!errUsers && dbUsers && dbUsers.length > 0) {
      state.users = dbUsers.map(dbToUser);
    } else if (!errUsers && (!dbUsers || dbUsers.length === 0)) {
      const payload = INITIAL_USERS.map(userToDb);
      await supabase.from('users').insert(payload);
    }

    // 2. Tải bảng students
    const { data: dbStudents, error: errStudents } = await supabase
      .from('students')
      .select('*')
      .order('student_code', { ascending: true });

    if (!errStudents && dbStudents && dbStudents.length > 0) {
      state.students = dbStudents.map(dbToStudent);
    } else if (!errStudents && (!dbStudents || dbStudents.length === 0)) {
      // Seed dữ liệu khởi tạo lần đầu vào Supabase nếu bảng còn trống
      const payload = INITIAL_STUDENTS.map(studentToDb);
      await supabase.from('students').insert(payload);
    }

    // 3. Tải bảng rooms
    const { data: dbRooms, error: errRooms } = await supabase
      .from('rooms')
      .select('*')
      .order('room_name', { ascending: true });

    if (!errRooms && dbRooms && dbRooms.length > 0) {
      state.rooms = dbRooms.map(dbToRoom);
    } else if (!errRooms && (!dbRooms || dbRooms.length === 0)) {
      const payload = INITIAL_ROOMS.map(roomToDb);
      await supabase.from('rooms').insert(payload);
    }

    // 4. Tải bảng positions
    const { data: dbPositions, error: errPositions } = await supabase
      .from('positions')
      .select('*')
      .order('position_code', { ascending: true });

    if (!errPositions && dbPositions && dbPositions.length > 0) {
      state.positions = dbPositions.map(dbToPosition);
    } else if (!errPositions && (!dbPositions || dbPositions.length === 0)) {
      const payload = INITIAL_POSITIONS.map(positionToDb);
      await supabase.from('positions').insert(payload);
    }

    // 5. Tải bảng interactions
    const { data: dbInteractions, error: errInter } = await supabase
      .from('interactions')
      .select('*')
      .order('interaction_date', { ascending: false });

    if (!errInter && dbInteractions && dbInteractions.length > 0) {
      state.interactions = dbInteractions.map(dbToInteraction);
    } else if (!errInter && (!dbInteractions || dbInteractions.length === 0)) {
      const payload = INITIAL_INTERACTIONS.map(interactionToDb);
      await supabase.from('interactions').insert(payload);
    }

    // 6. Tải bảng daily_work_reports
    const { data: dbReports, error: errReports } = await supabase
      .from('daily_work_reports')
      .select('*')
      .order('date', { ascending: false });

    if (!errReports && dbReports && dbReports.length > 0) {
      state.dailyWorkReports = dbReports.map(dbToReport);
    } else if (!errReports && (!dbReports || dbReports.length === 0)) {
      const payload = INITIAL_DAILY_WORK_REPORTS.map(reportToDb);
      await supabase.from('daily_work_reports').insert(payload);
    }

    // 7. Tải bảng daily_evaluations
    const { data: dbEvals, error: errEvals } = await supabase
      .from('daily_evaluations')
      .select('*')
      .order('date', { ascending: false });

    if (!errEvals && dbEvals && dbEvals.length > 0) {
      state.dailyEvaluations = dbEvals.map(dbToEval);
    } else if (!errEvals && (!dbEvals || dbEvals.length === 0)) {
      const payload = INITIAL_DAILY_EVALUATIONS.map(evalToDb);
      await supabase.from('daily_evaluations').insert(payload);
    }

    // 8. Tải bảng schedules
    const { data: dbSchedules, error: errSchedules } = await supabase
      .from('schedules')
      .select('*')
      .order('date', { ascending: false });

    if (!errSchedules && dbSchedules && dbSchedules.length > 0) {
      state.schedules = dbSchedules.map(dbToSchedule);
    } else if (!errSchedules && (!dbSchedules || dbSchedules.length === 0)) {
      const payload = INITIAL_SCHEDULE_ASSIGNMENTS.map(scheduleToDb);
      await supabase.from('schedules').insert(payload);
    }

    // 9. Tải bảng tasks
    const { data: dbTasks, error: errTasks } = await supabase
      .from('tasks')
      .select('*')
      .order('date', { ascending: false });

    if (!errTasks && dbTasks && dbTasks.length > 0) {
      state.tasks = dbTasks.map(dbToTask);
    } else if (!errTasks && (!dbTasks || dbTasks.length === 0)) {
      const payload = INITIAL_TASK_INSTANCES.map(taskToDb);
      await supabase.from('tasks').insert(payload);
    }

    // 10. Tải bảng kpis
    const { data: dbKpis, error: errKpis } = await supabase
      .from('kpis')
      .select('*')
      .order('date', { ascending: false });

    if (!errKpis && dbKpis && dbKpis.length > 0) {
      state.kpis = dbKpis.map(dbToKpi);
    } else if (!errKpis && (!dbKpis || dbKpis.length === 0)) {
      const payload = INITIAL_KPIS.map(kpiToDb);
      await supabase.from('kpis').insert(payload);
    }

    // 11. Tải bảng notifications
    const { data: dbNotifs, error: errNotifs } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!errNotifs && dbNotifs && dbNotifs.length > 0) {
      state.notifications = dbNotifs.map(dbToNotif);
    } else if (!errNotifs && (!dbNotifs || dbNotifs.length === 0)) {
      const payload = INITIAL_NOTIFICATIONS.map(notifToDb);
      await supabase.from('notifications').insert(payload);
    }

    // 12. Tải bảng audit_logs
    const { data: dbAudits, error: errAudits } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200);

    if (!errAudits && dbAudits && dbAudits.length > 0) {
      state.auditLogs = dbAudits.map(dbToAudit);
    } else if (!errAudits && (!dbAudits || dbAudits.length === 0)) {
      const payload = INITIAL_AUDIT_LOGS.map(auditToDb);
      await supabase.from('audit_logs').insert(payload);
    }

    // 13. Tải bảng department_settings
    const { data: dbSettings, error: errSettings } = await supabase
      .from('department_settings')
      .select('*')
      .eq('id', 'current_settings')
      .maybeSingle();

    if (!errSettings && dbSettings) {
      state.settings = dbToSettings(dbSettings);
    } else if (!errSettings && !dbSettings) {
      await supabase.from('department_settings').insert(settingsToDb(INITIAL_SETTINGS));
    }

    // Đăng ký Realtime Channel để nhận cập nhật từ máy khác tức thì
    setupRealtimeSubscription();

    state.isInitialized = true;
    notifySubscribers();
  } catch (err) {
    console.error('Lỗi trong quá trình khởi tạo kết nối Supabase:', err);
  } finally {
    state.isSyncing = false;
  }
}

function setupRealtimeSubscription() {
  if (!supabase) return;

  try {
    supabase
      .channel('bops-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const u = dbToUser(payload.new);
          if (!state.users.some((x) => x.id === u.id)) {
            state.users.push(u);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const u = dbToUser(payload.new);
          state.users = state.users.map((x) => (x.id === u.id ? u : x));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.users = state.users.filter((x) => x.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newStudent = dbToStudent(payload.new);
          if (!state.students.some((s) => s.id === newStudent.id)) {
            state.students.unshift(newStudent);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = dbToStudent(payload.new);
          state.students = state.students.map((s) => (s.id === updated.id ? updated : s));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.students = state.students.filter((s) => s.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = dbToInteraction(payload.new);
          if (!state.interactions.some((i) => i.id === item.id)) {
            state.interactions.unshift(item);
            notifySubscribers();
          }
        } else if (payload.eventType === 'DELETE') {
          state.interactions = state.interactions.filter((i) => i.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_work_reports' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const rep = dbToReport(payload.new);
          const idx = state.dailyWorkReports.findIndex((r) => r.id === rep.id);
          if (idx >= 0) {
            state.dailyWorkReports[idx] = rep;
          } else {
            state.dailyWorkReports.unshift(rep);
          }
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.dailyWorkReports = state.dailyWorkReports.filter((r) => r.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_evaluations' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const ev = dbToEval(payload.new);
          const idx = state.dailyEvaluations.findIndex((e) => e.id === ev.id);
          if (idx >= 0) {
            state.dailyEvaluations[idx] = ev;
          } else {
            state.dailyEvaluations.unshift(ev);
          }
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const rm = dbToRoom(payload.new);
          if (!state.rooms.some((r) => r.id === rm.id)) {
            state.rooms.push(rm);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const rm = dbToRoom(payload.new);
          state.rooms = state.rooms.map((r) => (r.id === rm.id ? rm : r));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.rooms = state.rooms.filter((r) => r.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const p = dbToPosition(payload.new);
          if (!state.positions.some((x) => x.id === p.id)) {
            state.positions.push(p);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const p = dbToPosition(payload.new);
          state.positions = state.positions.map((x) => (x.id === p.id ? p : x));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.positions = state.positions.filter((x) => x.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = dbToSchedule(payload.new);
          if (!state.schedules.some((s) => s.id === item.id)) {
            state.schedules.unshift(item);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const item = dbToSchedule(payload.new);
          state.schedules = state.schedules.map((s) => (s.id === item.id ? item : s));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.schedules = state.schedules.filter((s) => s.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = dbToTask(payload.new);
          if (!state.tasks.some((x) => x.id === t.id)) {
            state.tasks.unshift(t);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const t = dbToTask(payload.new);
          state.tasks = state.tasks.map((x) => (x.id === t.id ? t : x));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.tasks = state.tasks.filter((x) => x.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpis' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const k = dbToKpi(payload.new);
          if (!state.kpis.some((x) => x.id === k.id)) {
            state.kpis.unshift(k);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const k = dbToKpi(payload.new);
          state.kpis = state.kpis.map((x) => (x.id === k.id ? k : x));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.kpis = state.kpis.filter((x) => x.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = dbToNotif(payload.new);
          if (!state.notifications.some((x) => x.id === n.id)) {
            state.notifications.unshift(n);
            notifySubscribers();
          }
        } else if (payload.eventType === 'UPDATE') {
          const n = dbToNotif(payload.new);
          state.notifications = state.notifications.map((x) => (x.id === n.id ? n : x));
          notifySubscribers();
        } else if (payload.eventType === 'DELETE') {
          state.notifications = state.notifications.filter((x) => x.id !== payload.old.id);
          notifySubscribers();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const a = dbToAudit(payload.new);
          if (!state.auditLogs.some((x) => x.id === a.id)) {
            state.auditLogs.unshift(a);
            notifySubscribers();
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_settings' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          state.settings = dbToSettings(payload.new);
          notifySubscribers();
        }
      })
      .subscribe();
  } catch (err) {
    console.error('Lỗi khi thiết lập Realtime channel:', err);
  }
}

// Gọi tự động khởi tạo kết nối Supabase khi import module
if (typeof window !== 'undefined') {
  initializeDatabaseSync();
}

// ============================================================================
// BOPS STORE - CHÍNH THỨC SỬ DỤNG SUPABASE POSTGRESQL LÀM DATABASE CHÍNH
// ============================================================================
export const BOPSStore = {
  // --------------------------------------------------------------------------
  // USER SESSION / CLIENT STATE (Chỉ lưu Session ID cục bộ trên trình duyệt)
  // --------------------------------------------------------------------------
  isLoggedIn(): boolean {
    try {
      return localStorage.getItem(CLIENT_STORAGE_KEYS.IS_LOGGED_IN) === 'true';
    } catch {
      return false;
    }
  },

  getCurrentUser(): User {
    let currentId = 'u-gv-001';
    try {
      currentId = localStorage.getItem(CLIENT_STORAGE_KEYS.CURRENT_USER_ID) || 'u-gv-001';
    } catch {}
    const user = state.users.find((u) => u.id === currentId);
    return user || state.users[0];
  },

  setCurrentUser(userId: string): void {
    try {
      localStorage.setItem(CLIENT_STORAGE_KEYS.CURRENT_USER_ID, userId);
      localStorage.setItem(CLIENT_STORAGE_KEYS.IS_LOGGED_IN, 'true');
    } catch {}
    notifySubscribers();
  },

  logout(): void {
    try {
      localStorage.setItem(CLIENT_STORAGE_KEYS.IS_LOGGED_IN, 'false');
    } catch {}
    notifySubscribers();
  },

  // --------------------------------------------------------------------------
  // 1. USERS & TEACHERS
  // --------------------------------------------------------------------------
  getUsers(): User[] {
    return state.users;
  },

  saveUsers(users: User[]): void {
    state.users = users;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = users.map(userToDb);
      supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu users vào Supabase:', error);
        });
    }
  },

  addUser(userData: Omit<User, 'id'> & { id?: string }): User {
    const newUser: User = {
      ...userData,
      id: userData.id || `u-gv-${String(state.users.length + 1).padStart(3, '0')}`,
    };
    state.users.push(newUser);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('users')
        .upsert(userToDb(newUser), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi thêm user vào Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Teacher',
      'ADD_TEACHER',
      `Tạo tài khoản Giáo viên Quản nhiệm: ${newUser.fullName} (${newUser.teacherCode})`
    );

    return newUser;
  },

  updateUser(updated: User): void {
    state.users = state.users.map((u) => (u.id === updated.id ? updated : u));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('users')
        .upsert(userToDb(updated), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi cập nhật user vào Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Teacher',
      'UPDATE_TEACHER',
      `Cập nhật hồ sơ tài khoản: ${updated.fullName} (${updated.teacherCode})`
    );
  },

  deleteUser(userId: string): void {
    state.users = state.users.filter((u) => u.id !== userId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('Lỗi khi xóa user khỏi Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Teacher',
      'DELETE_TEACHER',
      `Xóa tài khoản Giáo viên ID: ${userId}`
    );
  },

  // --------------------------------------------------------------------------
  // 2. STUDENTS (HỌC SINH NỘI TRÚ TOÀN TRƯỜNG - GHI/ĐỌC TRỰC TIẾP SUPABASE)
  // --------------------------------------------------------------------------
  getStudents(): Student[] {
    return state.students;
  },

  saveStudents(students: Student[]): void {
    state.students = students;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = students.map(studentToDb);
      supabase
        .from('students')
        .upsert(payload, { onConflict: 'student_code' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu học sinh vào Supabase:', error);
        });
    }
  },

  addStudent(studentData: Omit<Student, 'id'> & { id?: string }): Student {
    const currentUser = BOPSStore.getCurrentUser();
    const newStudent: Student = {
      ...studentData,
      id: studentData.id || `st-${Date.now()}`,
      uploadedByUserId: studentData.uploadedByUserId || currentUser.id,
      uploadedByUserName: studentData.uploadedByUserName || currentUser.fullName,
    };

    state.students.unshift(newStudent);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('students')
        .upsert(studentToDb(newStudent), { onConflict: 'student_code' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi thêm học sinh vào Supabase:', error);
        });
    }

    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Student',
      'ADD_STUDENT',
      `Thêm học sinh nội trú mới: ${newStudent.fullName} (${newStudent.studentCode})`
    );

    return newStudent;
  },

  bulkImportStudents(
    newStudents: (Omit<Student, 'id'> & {
      id?: string;
      rawSpecialCareStatus?: 'yes' | 'no' | 'unspecified';
    })[]
  ): { added: number; updated: number } {
    const currentUser = BOPSStore.getCurrentUser();
    let added = 0;
    let updated = 0;

    const updatedList = [...state.students];
    const recordsToSync: Student[] = [];

    newStudents.forEach((ns) => {
      const idx = updatedList.findIndex(
        (s) => s.studentCode.trim().toLowerCase() === ns.studentCode.trim().toLowerCase()
      );

      const defaultUploaderId = ns.uploadedByUserId || currentUser.id;
      const defaultUploaderName = ns.uploadedByUserName || currentUser.fullName;

      if (idx >= 0) {
        const existing = updatedList[idx];

        // 1. Giữ nguyên ID hiện tại
        const id = existing.id;

        // 2. Họ và tên: Cập nhật nếu hợp lệ, không dùng tên placeholder
        const fullName =
          ns.fullName && ns.fullName.trim() !== '' && !ns.fullName.startsWith('Học sinh ')
            ? ns.fullName.trim()
            : existing.fullName;

        // 3. Giới tính
        const gender = ns.gender || existing.gender || 'nam';

        // 4. Ngày sinh: Cập nhật nếu có giá trị hợp lệ, nếu trống giữ nguyên ngày sinh cũ
        const birthday =
          ns.birthday && ns.birthday.trim() !== '' ? ns.birthday.trim() : existing.birthday;

        // 5. Lớp: Cập nhật nếu có giá trị hợp lệ, nếu trống giữ nguyên lớp cũ
        const className =
          ns.className && ns.className.trim() !== '' ? ns.className.trim() : existing.className;

        // 6. Phòng KTX & Mã phòng: Cập nhật nếu có, nếu trống giữ nguyên phòng cũ
        const roomName =
          ns.roomName && ns.roomName.trim() !== '' ? ns.roomName.trim() : existing.roomName;
        const roomId =
          ns.roomId && ns.roomId.trim() !== ''
            ? ns.roomId.trim()
            : (roomName ? (roomName.startsWith('r-') ? roomName : `r-${roomName}`) : existing.roomId);

        // 7. Giáo viên phụ trách & Mã GV: Cập nhật nếu có, nếu trống giữ nguyên GV cũ
        const teacherName =
          ns.teacherName && ns.teacherName.trim() !== ''
            ? ns.teacherName.trim()
            : existing.teacherName;
        const teacherId =
          ns.teacherId && ns.teacherId.trim() !== ''
            ? ns.teacherId.trim()
            : (existing.teacherId || currentUser.id);

        // 8. Thông tin Phụ huynh: Cập nhật nếu có, nếu trống giữ nguyên dữ liệu cũ
        const parentName =
          ns.parentName && ns.parentName.trim() !== ''
            ? ns.parentName.trim()
            : existing.parentName;
        const parentPhone =
          ns.parentPhone && ns.parentPhone.trim() !== ''
            ? ns.parentPhone.trim()
            : existing.parentPhone;

        // 9. Sức khỏe & Ghi chú: Cập nhật nếu có, nếu trống giữ nguyên dữ liệu cũ
        const healthNote =
          ns.healthNote && ns.healthNote.trim() !== ''
            ? ns.healthNote.trim()
            : (existing.healthNote || '');
        const note =
          ns.note && ns.note.trim() !== '' ? ns.note.trim() : (existing.note || '');

        // 10. Trạng thái học sinh
        const status = ns.status || existing.status || 'active';

        // 11. Theo dõi đặc biệt & Nhãn theo dõi:
        // - "Có" -> specialCare = true, cập nhật hoặc giữ nhãn
        // - "Không" -> specialCare = false, xóa nhãn
        // - Không có cột hoặc ô trống -> GIỮ NGUYÊN HOÀN TOÀN dữ liệu cũ
        let specialCare = existing.specialCare;
        let specialLabels = existing.specialLabels || [];

        if (ns.rawSpecialCareStatus === 'yes' || (ns.rawSpecialCareStatus === undefined && ns.specialCare === true)) {
          specialCare = true;
          if (ns.specialLabels && ns.specialLabels.length > 0) {
            specialLabels = ns.specialLabels;
          } else if (existing.specialLabels && existing.specialLabels.length > 0) {
            specialLabels = existing.specialLabels;
          } else {
            specialLabels = ['health_issue'];
          }
        } else if (ns.rawSpecialCareStatus === 'no') {
          specialCare = false;
          specialLabels = [];
        } else {
          specialCare = existing.specialCare;
          specialLabels = existing.specialLabels || [];
        }

        // 12. Giữ nguyên lịch sử tương tác và người tải ban đầu của bản ghi cũ
        const lastInteractionDate = existing.lastInteractionDate;
        const interactionCountThisMonth = existing.interactionCountThisMonth ?? 0;
        const origUploadedByUserId = existing.uploadedByUserId || defaultUploaderId;
        const origUploadedByUserName = existing.uploadedByUserName || defaultUploaderName;

        const updatedStudent: Student = {
          id,
          studentCode: existing.studentCode,
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
          status,
          specialCare,
          specialLabels,
          healthNote,
          note,
          lastInteractionDate,
          interactionCountThisMonth,
          uploadedByUserId: origUploadedByUserId,
          uploadedByUserName: origUploadedByUserName,
        };

        updatedList[idx] = updatedStudent;
        recordsToSync.push(updatedStudent);
        updated++;
      } else {
        const studentId = ns.id || `st-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const fresh: Student = {
          id: studentId,
          studentCode: ns.studentCode.trim().toUpperCase(),
          fullName: ns.fullName?.trim() || `Học sinh ${ns.studentCode}`,
          gender: ns.gender || 'nam',
          birthday: ns.birthday?.trim() || '',
          className: ns.className?.trim() || '10A1',
          roomName: ns.roomName?.trim() || 'DomB-101',
          roomId:
            ns.roomId ||
            (ns.roomName?.trim()
              ? ns.roomName.trim().startsWith('r-')
                ? ns.roomName.trim()
                : `r-${ns.roomName.trim()}`
              : 'r-DomB-101'),
          teacherName: ns.teacherName?.trim() || currentUser.fullName || 'Giáo viên Quản nhiệm DomB',
          teacherId: ns.teacherId || currentUser.id || 'u-gv-001',
          parentName: ns.parentName?.trim() || '',
          parentPhone: ns.parentPhone?.trim() || '',
          status: ns.status || 'active',
          specialCare: Boolean(ns.specialCare),
          specialLabels: ns.specialLabels || (ns.specialCare ? ['health_issue'] : []),
          healthNote: ns.healthNote?.trim() || '',
          note: ns.note?.trim() || '',
          lastInteractionDate: ns.lastInteractionDate || undefined,
          interactionCountThisMonth: ns.interactionCountThisMonth || 0,
          uploadedByUserId: defaultUploaderId,
          uploadedByUserName: defaultUploaderName,
        };
        updatedList.push(fresh);
        recordsToSync.push(fresh);
        added++;
      }
    });

    state.students = updatedList;
    notifySubscribers();

    // Đồng bộ lập tức sang Supabase PostgreSQL
    if (supabase && isSupabaseConfigured && recordsToSync.length > 0) {
      const payload = recordsToSync.map(studentToDb);
      supabase
        .from('students')
        .upsert(payload, { onConflict: 'student_code' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi import học sinh vào Supabase:', error);
        });
    }

    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Student',
      'IMPORT_EXCEL',
      `Nhập danh sách học sinh từ file Excel: Thêm mới ${added} HS, cập nhật an toàn ${updated} HS trùng mã.`
    );

    BOPSStore.addNotification({
      receiverId: currentUser.id,
      title: 'Nhập học sinh từ Excel thành công',
      content: `Đã xử lý danh sách học sinh: Thêm mới ${added} em, Cập nhật bảo toàn dữ liệu ${updated} em vào Supabase PostgreSQL.`,
      type: 'system',
      priority: 'medium',
    });

    return { added, updated };
  },

  updateStudent(student: Student): void {
    state.students = state.students.map((s) => (s.id === student.id ? student : s));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('students')
        .upsert(studentToDb(student), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi cập nhật học sinh trong Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Student',
      'UPDATE_STUDENT',
      `Cập nhật hồ sơ học sinh ${student.fullName} (${student.studentCode})`
    );
  },

  deleteStudent(studentId: string): void {
    state.students = state.students.filter((s) => s.id !== studentId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .then(({ error }) => {
          if (error) console.error('Lỗi khi xóa học sinh trên Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Student',
      'DELETE_STUDENT',
      `Xóa hồ sơ học sinh ID: ${studentId}`
    );
  },

  // --------------------------------------------------------------------------
  // 3. POSITIONS
  // --------------------------------------------------------------------------
  getPositions(): Position[] {
    return state.positions;
  },

  savePositions(positions: Position[]): void {
    state.positions = positions;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = positions.map(positionToDb);
      supabase
        .from('positions')
        .upsert(payload, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu vị trí trực vào Supabase:', error);
        });
    }
  },

  addPosition(positionData: Omit<Position, 'id'> & { id?: string }): Position {
    const newPosition: Position = {
      ...positionData,
      id: positionData.id || `pos-${Date.now()}`,
    };
    state.positions.push(newPosition);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('positions')
        .upsert(positionToDb(newPosition), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi thêm vị trí trực vào Supabase:', error);
        });
    }

    return newPosition;
  },

  updatePosition(updatedPosition: Position): void {
    state.positions = state.positions.map((p) => (p.id === updatedPosition.id ? updatedPosition : p));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('positions')
        .upsert(positionToDb(updatedPosition), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi cập nhật vị trí trực vào Supabase:', error);
        });
    }
  },

  deletePosition(positionId: string): void {
    state.positions = state.positions.filter((p) => p.id !== positionId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('positions')
        .delete()
        .eq('id', positionId)
        .then(({ error }) => {
          if (error) console.error('Lỗi khi xóa vị trí trực khỏi Supabase:', error);
        });
    }
  },

  // --------------------------------------------------------------------------
  // 4. ROOMS (PHÒNG KTX - SỨC CHỨA ĐẾN 30 HS)
  // --------------------------------------------------------------------------
  getRooms(): Room[] {
    return state.rooms;
  },

  saveRooms(rooms: Room[]): void {
    state.rooms = rooms;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = rooms.map(roomToDb);
      supabase
        .from('rooms')
        .upsert(payload, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu phòng vào Supabase:', error);
        });
    }
  },

  addRoom(roomData: Omit<Room, 'id'> & { id?: string }): Room {
    const newRoom: Room = {
      ...roomData,
      id: roomData.id || `room-${Date.now()}`,
    };
    state.rooms.push(newRoom);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('rooms')
        .upsert(roomToDb(newRoom), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi thêm phòng vào Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Room',
      'ADD_ROOM',
      `Khai báo phòng KTX mới: ${newRoom.roomName} (${newRoom.building}) - Sức chứa: ${newRoom.capacity} HS`
    );

    return newRoom;
  },

  updateRoom(room: Room): void {
    state.rooms = state.rooms.map((r) => (r.id === room.id ? room : r));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('rooms')
        .upsert(roomToDb(room), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi cập nhật phòng trong Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Room',
      'UPDATE_ROOM',
      `Cập nhật phòng KTX ${room.roomName} (Sức chứa: ${room.capacity})`
    );
  },

  deleteRoom(roomId: string): void {
    state.rooms = state.rooms.filter((r) => r.id !== roomId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
        .then(({ error }) => {
          if (error) console.error('Lỗi khi xóa phòng trên Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Room',
      'DELETE_ROOM',
      `Xóa phòng KTX ID: ${roomId}`
    );
  },

  updateRoomHygiene(
    roomId: string,
    status: 'clean' | 'dirty',
    hygieneStatus: 'pass' | 'needs_correction' | 'critical',
    note?: string
  ): void {
    state.rooms = state.rooms.map((r) => {
      if (r.id === roomId) {
        const updated: Room = {
          ...r,
          status,
          hygieneStatus,
          lastInspectedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          correctionNote: note,
        };
        if (supabase && isSupabaseConfigured) {
          supabase
            .from('rooms')
            .upsert(roomToDb(updated), { onConflict: 'id' })
            .then();
        }
        return updated;
      }
      return r;
    });
    notifySubscribers();
  },

  // --------------------------------------------------------------------------
  // 5. SCHEDULES (LỊCH TRỰC QUẢN NHIỆM)
  // --------------------------------------------------------------------------
  getSchedules(): ScheduleAssignment[] {
    return state.schedules;
  },

  saveSchedules(schedules: ScheduleAssignment[]): void {
    state.schedules = schedules;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = schedules.map(scheduleToDb);
      supabase
        .from('schedules')
        .upsert(payload, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu lịch trực vào Supabase:', error);
        });
    }
  },

  addSchedule(data: Omit<ScheduleAssignment, 'id'> & { id?: string }): ScheduleAssignment {
    const newSchedule: ScheduleAssignment = {
      ...data,
      id: data.id || `sched-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    state.schedules.unshift(newSchedule);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('schedules')
        .upsert(scheduleToDb(newSchedule), { onConflict: 'id' })
        .then();
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Schedule',
      'ADD_SCHEDULE',
      `Phân công ca trực mới ngày ${newSchedule.date} cho GV ${newSchedule.teacherName}`
    );

    return newSchedule;
  },

  updateSchedule(schedule: ScheduleAssignment): void {
    state.schedules = state.schedules.map((s) => (s.id === schedule.id ? schedule : s));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('schedules')
        .upsert(scheduleToDb(schedule), { onConflict: 'id' })
        .then();
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Schedule',
      'UPDATE_SCHEDULE',
      `Cập nhật ca trực ID: ${schedule.id} ngày ${schedule.date}`
    );
  },

  deleteSchedule(scheduleId: string): void {
    state.schedules = state.schedules.filter((s) => s.id !== scheduleId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId)
        .then();
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Schedule',
      'DELETE_SCHEDULE',
      `Xóa ca trực ID: ${scheduleId}`
    );
  },

  // --------------------------------------------------------------------------
  // 6. TASKS (NHIỆM VỤ / CHECKLIST CA TRỰC)
  // --------------------------------------------------------------------------
  getTasks(): TaskInstance[] {
    return state.tasks;
  },

  saveTasks(tasks: TaskInstance[]): void {
    state.tasks = tasks;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = tasks.map(taskToDb);
      supabase
        .from('tasks')
        .upsert(payload, { onConflict: 'id' })
        .then();
    }
  },

  addTask(taskData: Omit<TaskInstance, 'id'> & { id?: string }): TaskInstance {
    const newTask: TaskInstance = {
      ...taskData,
      id: taskData.id || `task-${Date.now()}`,
    };
    state.tasks.unshift(newTask);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('tasks')
        .upsert(taskToDb(newTask), { onConflict: 'id' })
        .then();
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Task',
      'ADD_TASK',
      `Giao nhiệm vụ: "${newTask.title || newTask.taskName}" cho GV ${newTask.teacherName}`
    );

    return newTask;
  },

  updateTask(updatedTask: TaskInstance): void {
    state.tasks = state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('tasks')
        .upsert(taskToDb(updatedTask), { onConflict: 'id' })
        .then();
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Task',
      'UPDATE_TASK',
      `Cập nhật thông tin nhiệm vụ "${updatedTask.title || updatedTask.taskName}"`
    );
  },

  deleteTask(taskId: string): void {
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .then();
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Task',
      'DELETE_TASK',
      `Xóa nhiệm vụ ID: ${taskId}`
    );
  },

  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    note?: string,
    photos?: string[]
  ): void {
    const nowTime = new Date().toTimeString().substring(0, 5);
    state.tasks = state.tasks.map((t) => {
      if (t.id === taskId) {
        const updated: TaskInstance = {
          ...t,
          status,
          actualEnd: status === 'completed' ? nowTime : t.actualEnd,
          actualStart: status === 'working' && !t.actualStart ? nowTime : t.actualStart,
          note: note !== undefined ? note : t.note,
          proofPhotos: photos ? [...(t.proofPhotos || []), ...photos] : t.proofPhotos,
        };
        if (supabase && isSupabaseConfigured) {
          supabase
            .from('tasks')
            .upsert(taskToDb(updated), { onConflict: 'id' })
            .then();
        }
        return updated;
      }
      return t;
    });
    notifySubscribers();

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Task',
      'UPDATE_TASK_STATUS',
      `Cập nhật trạng thái nhiệm vụ "${taskId}" sang ${status.toUpperCase()}`
    );

    const affectedTask = state.tasks.find((t) => t.id === taskId);
    if (affectedTask) {
      BOPSStore.calculateKPIForTeacher(affectedTask.teacherId, affectedTask.date);
    }
  },

  verifyTask(taskId: string, verifiedBy: string, approved: boolean): void {
    state.tasks = state.tasks.map((t) => {
      if (t.id === taskId) {
        const updated: TaskInstance = {
          ...t,
          verified: approved,
          verifiedBy,
          verifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: approved ? ('verified' as TaskStatus) : t.status,
        };
        if (supabase && isSupabaseConfigured) {
          supabase
            .from('tasks')
            .upsert(taskToDb(updated), { onConflict: 'id' })
            .then();
        }
        return updated;
      }
      return t;
    });
    notifySubscribers();
  },

  evaluateWorkItem(params: {
    itemType: 'task' | 'schedule';
    itemId: string;
    managerName: string;
    evaluation: 'approved' | 'rejected';
    criteriaKey?: 'operation' | 'quality' | 'studentCare' | 'discipline';
    criteriaLabel?: string;
    deductedPoints?: number;
    reason?: string;
  }): void {
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let teacherId = '';
    let teacherName = '';
    let dateStr = new Date().toISOString().split('T')[0];
    let titleStr = '';

    if (params.itemType === 'task') {
      state.tasks = state.tasks.map((t) => {
        if (t.id === params.itemId) {
          teacherId = t.teacherId;
          teacherName = t.teacherName;
          dateStr = t.date;
          titleStr = t.title || t.taskName;
          const updated: TaskInstance = {
            ...t,
            verified: params.evaluation === 'approved',
            verifiedBy: params.managerName,
            verifiedAt: nowIso,
            evaluationCriteria: params.criteriaLabel,
            deductedPoints: params.deductedPoints || 0,
            evaluationNote: params.reason,
            status: params.evaluation === 'approved' ? 'verified' : 'rejected',
          };
          if (supabase && isSupabaseConfigured) {
            supabase
              .from('tasks')
              .upsert(taskToDb(updated), { onConflict: 'id' })
              .then();
          }
          return updated;
        }
        return t;
      });
    } else {
      state.schedules = state.schedules.map((s) => {
        if (s.id === params.itemId) {
          teacherId = s.teacherId;
          teacherName = s.teacherName;
          dateStr = s.date;
          titleStr = `${s.shift} - ${s.positionName}`;
          const updated: ScheduleAssignment = {
            ...s,
            evaluationStatus: params.evaluation === 'approved' ? 'approved' : 'rejected',
            evaluationCriteria: params.criteriaLabel,
            deductedPoints: params.deductedPoints || 0,
            evaluationNote: params.reason,
            evaluatedBy: params.managerName,
            evaluatedAt: nowIso,
            status: params.evaluation === 'approved' ? 'verified' : 'rejected',
          };
          if (supabase && isSupabaseConfigured) {
            supabase
              .from('schedules')
              .upsert(scheduleToDb(updated), { onConflict: 'id' })
              .then();
          }
          return updated;
        }
        return s;
      });
    }

    notifySubscribers();

    if (teacherId) {
      if (params.evaluation === 'rejected' && params.deductedPoints) {
        const kpis = BOPSStore.getKPIs();
        const existingKpi = kpis.find((k) => k.teacherId === teacherId && k.date === dateStr);
        if (existingKpi) {
          existingKpi.penalties = [
            ...(existingKpi.penalties || []),
            {
              reason: `Vi phạm/Chưa đạt: ${params.reason || params.criteriaLabel || 'Nội dung ca trực'}`,
              pointsDeducted: params.deductedPoints,
              time: nowIso,
            },
          ];
          existingKpi.disciplineScore = Math.max(0, existingKpi.disciplineScore - params.deductedPoints);
          existingKpi.totalScore = Math.max(
            0,
            existingKpi.operationScore +
              existingKpi.qualityScore +
              existingKpi.studentCareScore +
              existingKpi.contributionScore +
              existingKpi.disciplineScore
          );
          BOPSStore.saveKPIs(kpis);
        }
      }
      BOPSStore.calculateKPIForTeacher(teacherId, dateStr);

      BOPSStore.addNotification({
        receiverId: teacherId,
        title: `Quản lý đánh giá ca/nhiệm vụ: ${titleStr}`,
        content: `Thầy/Cô ${teacherName} được đánh giá: ${
          params.evaluation === 'approved'
            ? 'ĐẠT YÊU CẦU'
            : `CHƯA ĐẠT (${params.reason || 'Cần rút kinh nghiệm'})`
        }`,
        type: 'task',
        priority: params.evaluation === 'approved' ? 'low' : 'high',
      });

      const currentUser = BOPSStore.getCurrentUser();
      BOPSStore.addAuditLog(
        currentUser.id,
        currentUser.fullName,
        currentUser.role,
        'Evaluation',
        'EVALUATE_WORK_ITEM',
        `Đánh giá ca/nhiệm vụ "${titleStr}" của GV ${teacherName}: ${params.evaluation === 'approved' ? 'HOÀN THÀNH' : `CHƯA TỐT (-${params.deductedPoints || 2} điểm)`}`
      );
    }
  },

  // --------------------------------------------------------------------------
  // 7. INTERACTIONS (TƯƠNG TÁC 1-1 HỌC SINH - GHI/ĐỌC TRỰC TIẾP SUPABASE)
  // --------------------------------------------------------------------------
  getInteractions(): Interaction1on1[] {
    return state.interactions;
  },

  addInteraction(interactionData: Omit<Interaction1on1, 'id' | 'createdAt'>): Interaction1on1 {
    const newInteraction: Interaction1on1 = {
      ...interactionData,
      id: `inter-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    state.interactions.unshift(newInteraction);

    // Cập nhật ngày tương tác gần nhất và số lần trong tháng của học sinh
    state.students = state.students.map((s) => {
      if (s.id === interactionData.studentId) {
        return {
          ...s,
          lastInteractionDate: interactionData.interactionDate,
          interactionCountThisMonth: (s.interactionCountThisMonth || 0) + 1,
        };
      }
      return s;
    });

    notifySubscribers();

    // Đồng bộ lập tức sang Supabase PostgreSQL
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('interactions')
        .insert(interactionToDb(newInteraction))
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu tương tác 1-1 vào Supabase:', error);
        });

      // Cập nhật cả bảng students trong Supabase
      const st = state.students.find((s) => s.id === interactionData.studentId);
      if (st) {
        supabase
          .from('students')
          .update({
            last_interaction_date: st.lastInteractionDate,
            interaction_count_this_month: st.interactionCountThisMonth,
          })
          .eq('id', st.id)
          .then();
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Interaction',
      'ADD_INTERACTION_1ON1',
      `Nhập tương tác 1-1 với học sinh ${interactionData.studentName} (${interactionData.topic})`
    );

    BOPSStore.calculateKPIForTeacher(interactionData.teacherId, interactionData.interactionDate);

    return newInteraction;
  },

  deleteInteraction(interactionId: string): void {
    const target = state.interactions.find((i) => i.id === interactionId);
    state.interactions = state.interactions.filter((i) => i.id !== interactionId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('interactions')
        .delete()
        .eq('id', interactionId)
        .then(({ error }) => {
          if (error) console.error('Lỗi khi xóa tương tác trên Supabase:', error);
        });
    }

    if (target) {
      const currentUser = BOPSStore.getCurrentUser();
      BOPSStore.addAuditLog(
        currentUser.id,
        currentUser.fullName,
        currentUser.role,
        'Interaction',
        'DELETE_INTERACTION_1ON1',
        `Xóa nhật ký tương tác 1-1 với học sinh ${target.studentName} (${target.topic})`
      );
    }
  },

  // --------------------------------------------------------------------------
  // 8. KPIS
  // --------------------------------------------------------------------------
  getKPIs(): KPIRecord[] {
    return state.kpis;
  },

  saveKPIs(kpis: KPIRecord[]): void {
    state.kpis = kpis;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = kpis.map(kpiToDb);
      supabase
        .from('kpis')
        .upsert(payload, { onConflict: 'id' })
        .then();
    }
  },

  calculateKPIForTeacher(teacherId: string, date: string): KPIRecord {
    const tasks = state.tasks.filter((t) => t.teacherId === teacherId && t.date === date);
    const users = state.users;
    const teacher = users.find((u) => u.id === teacherId);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === 'completed' || t.status === 'verified'
    ).length;

    // 1. Điểm Vận hành (Max 50)
    let operationScore = 50;
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      operationScore = Math.round(completionRate * 50);
    }

    // 2. Điểm Chất lượng (Max 20)
    const verifiedTasks = tasks.filter((t) => t.verified).length;
    let qualityScore = 18;
    if (completedTasks > 0) {
      qualityScore = Math.round((verifiedTasks / completedTasks) * 20);
    }

    // 3. Điểm Chăm sóc Học sinh 1-1 (Max 15)
    // Quy định: Tuần có tối thiểu 1 HS tương tác 1-1 => Đạt 15đ trọng số
    const interactions = state.interactions.filter((i) => i.teacherId === teacherId);
    const hasWeeklyInteraction = interactions.length >= 1;
    const studentCareScore = hasWeeklyInteraction ? 15 : 0;

    // 4. Điểm Đóng góp (Max 10)
    const contributionScore = 10;

    // 5. Điểm Kỷ luật (Max 5)
    let disciplineScore = 5;

    const existingKpi = state.kpis.find((k) => k.teacherId === teacherId && k.date === date);
    if (existingKpi && existingKpi.penalties) {
      const totalPenalties = existingKpi.penalties.reduce((sum, p) => sum + p.pointsDeducted, 0);
      disciplineScore = Math.max(0, 5 - totalPenalties);
    }

    const totalScore = operationScore + qualityScore + studentCareScore + contributionScore + disciplineScore;

    let rank: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
    if (totalScore >= 97 && disciplineScore === 5) rank = 'A+';
    else if (totalScore >= 90) rank = 'A';
    else if (totalScore >= 80) rank = 'B';
    else if (totalScore >= 70) rank = 'C';
    else rank = 'D';

    const kpiRecord: KPIRecord = {
      id: existingKpi ? existingKpi.id : `kpi-${teacherId}-${date}`,
      teacherId,
      teacherName: teacher ? teacher.fullName : 'Giáo viên',
      teacherCode: teacher ? teacher.teacherCode : 'GV',
      date,
      operationScore,
      qualityScore,
      studentCareScore,
      contributionScore,
      disciplineScore,
      totalScore,
      rank,
      workloadIndex: teacher ? teacher.workloadIndex : 1.0,
      tasksCompleted: completedTasks,
      tasksTotal: totalTasks,
      interactionsCompletedThisWeek: interactions.length,
      penalties: existingKpi ? existingKpi.penalties : [],
    };

    const idx = state.kpis.findIndex((k) => k.id === kpiRecord.id);
    if (idx >= 0) {
      state.kpis[idx] = kpiRecord;
    } else {
      state.kpis.unshift(kpiRecord);
    }

    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('kpis')
        .upsert(kpiToDb(kpiRecord), { onConflict: 'id' })
        .then();
    }

    return kpiRecord;
  },

  // --------------------------------------------------------------------------
  // 9. DAILY EVALUATIONS (ĐÁNH GIÁ VẬN HÀNH NGÀY - GHI/ĐỌC TRỰC TIẾP SUPABASE)
  // --------------------------------------------------------------------------
  getDailyEvaluations(): DailyEvaluation[] {
    return state.dailyEvaluations;
  },

  saveDailyEvaluations(evals: DailyEvaluation[]): void {
    state.dailyEvaluations = evals;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = evals.map(evalToDb);
      supabase
        .from('daily_evaluations')
        .upsert(payload, { onConflict: 'id' })
        .then();
    }
  },

  addOrUpdateDailyEvaluation(
    evaluationData: Omit<DailyEvaluation, 'id' | 'evaluatedAt' | 'evaluatorId' | 'evaluatorName' | 'status' | 'totalScore' | 'rank'> & {
      totalScore?: number;
      rank?: 'A+' | 'A' | 'B' | 'C' | 'D';
    }
  ): DailyEvaluation {
    return BOPSStore.saveDailyEvaluation(evaluationData);
  },

  saveDailyEvaluation(
    evaluationData: Omit<DailyEvaluation, 'id' | 'evaluatedAt' | 'evaluatorId' | 'evaluatorName' | 'status' | 'totalScore' | 'rank'> & {
      totalScore?: number;
      rank?: 'A+' | 'A' | 'B' | 'C' | 'D';
    }
  ): DailyEvaluation {
    const totalScore =
      evaluationData.operationScore +
      evaluationData.qualityScore +
      evaluationData.studentCareScore +
      evaluationData.contributionScore +
      evaluationData.disciplineScore;

    let rank: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
    if (totalScore >= 97 && evaluationData.disciplineScore === 5) rank = 'A+';
    else if (totalScore >= 90) rank = 'A';
    else if (totalScore >= 80) rank = 'B';
    else if (totalScore >= 70) rank = 'C';
    else rank = 'D';

    const nowIso = new Date().toISOString();
    const existingIndex = state.dailyEvaluations.findIndex(
      (e) => e.teacherId === evaluationData.teacherId && e.date === evaluationData.date
    );

    const evaluationRecord: DailyEvaluation = {
      id: existingIndex >= 0 ? state.dailyEvaluations[existingIndex].id : `eval-${evaluationData.teacherId}-${evaluationData.date}`,
      date: evaluationData.date,
      teacherId: evaluationData.teacherId,
      teacherName: evaluationData.teacherName,
      teacherCode: evaluationData.teacherCode,
      evaluatorId: 'u-mgr-01',
      evaluatorName: 'Thầy Lê Huy Phúc',
      evaluatedAt: nowIso,
      operationScore: evaluationData.operationScore,
      qualityScore: evaluationData.qualityScore,
      studentCareScore: evaluationData.studentCareScore,
      contributionScore: evaluationData.contributionScore,
      disciplineScore: evaluationData.disciplineScore,
      totalScore,
      rank,
      strengths: evaluationData.strengths,
      improvements: evaluationData.improvements,
      generalComment: evaluationData.generalComment,
      status: 'evaluated',
    };

    if (existingIndex >= 0) {
      state.dailyEvaluations[existingIndex] = evaluationRecord;
    } else {
      state.dailyEvaluations.unshift(evaluationRecord);
    }

    notifySubscribers();

    // Ghi vào Supabase
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('daily_evaluations')
        .upsert(evalToDb(evaluationRecord), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu đánh giá ngày vào Supabase:', error);
        });
    }

    // Tự động đồng bộ sang bảng KPI
    const kpis = [...state.kpis];
    let kpiIndex = kpis.findIndex(
      (k) => k.teacherId === evaluationData.teacherId && k.date === evaluationData.date
    );
    if (kpiIndex >= 0) {
      kpis[kpiIndex] = {
        ...kpis[kpiIndex],
        operationScore: evaluationData.operationScore,
        qualityScore: evaluationData.qualityScore,
        studentCareScore: evaluationData.studentCareScore,
        contributionScore: evaluationData.contributionScore,
        disciplineScore: evaluationData.disciplineScore,
        totalScore,
        rank,
      };
      BOPSStore.saveKPIs(kpis);
    }

    // Gửi thông báo đến giáo viên
    BOPSStore.addNotification({
      receiverId: evaluationData.teacherId,
      title: 'Quản lý Thầy Lê Huy Phúc đã hoàn tất đánh giá KPI ngày',
      content: `Thầy/Cô ${evaluationData.teacherName} đạt ${totalScore}/100 điểm (Xếp hạng ${rank}) cho ngày làm việc ${evaluationData.date}. Nhận xét: "${evaluationData.generalComment}"`,
      type: 'kpi',
      priority: 'high',
    });

    BOPSStore.addAuditLog(
      'u-mgr-01',
      'Thầy Lê Huy Phúc',
      'manager',
      'DailyEvaluation',
      'EVALUATE_DAILY_WORK',
      `Thầy Lê Huy Phúc đánh giá công việc ngày ${evaluationData.date} cho GV ${evaluationData.teacherName}: ${totalScore}đ (${rank})`
    );

    return evaluationRecord;
  },

  deleteDailyEvaluation(id: string): void {
    state.dailyEvaluations = state.dailyEvaluations.filter((e) => e.id !== id);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('daily_evaluations')
        .delete()
        .eq('id', id)
        .then();
    }

    BOPSStore.addAuditLog(
      'u-mgr-01',
      'Thầy Lê Huy Phúc',
      'manager',
      'DailyEvaluation',
      'DELETE_EVALUATION',
      `Thầy Lê Huy Phúc đã xóa phiếu đánh giá công việc ID: ${id}`
    );
  },

  // --------------------------------------------------------------------------
  // 10. DAILY WORK REPORTS (BÁO CÁO CÔNG VIỆC HẰNG NGÀY & KTX - GHI/ĐỌC TRỰC TIẾP SUPABASE)
  // --------------------------------------------------------------------------
  getDailyWorkReports(): DailyWorkReport[] {
    return state.dailyWorkReports;
  },

  saveDailyWorkReports(reports: DailyWorkReport[]): void {
    state.dailyWorkReports = reports;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = reports.map(reportToDb);
      supabase
        .from('daily_work_reports')
        .upsert(payload, { onConflict: 'id' })
        .then();
    }
  },

  addOrUpdateDailyWorkReport(
    reportData: Omit<DailyWorkReport, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): DailyWorkReport {
    const reportId = reportData.id || `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = reportData.createdAt || new Date().toISOString();

    const fullReport: DailyWorkReport = {
      ...reportData,
      id: reportId,
      createdAt,
      adminReviewed: reportData.adminReviewed ?? false,
    };

    const idx = state.dailyWorkReports.findIndex((r) => r.id === reportId);
    if (idx >= 0) {
      state.dailyWorkReports[idx] = fullReport;
    } else {
      state.dailyWorkReports.unshift(fullReport);
    }

    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('daily_work_reports')
        .upsert(reportToDb(fullReport), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi gửi báo cáo ngày vào Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    if (currentUser.role === 'teacher') {
      const emergencyIncidentsCount = fullReport.studentIncidents.filter((i) => i.severity === 'emergency').length;
      BOPSStore.addNotification({
        receiverId: 'u-mgr-01',
        title: emergencyIncidentsCount > 0 ? '🚨 Cảnh báo khẩn cấp từ Báo cáo ngày' : 'Báo cáo ca trực mới',
        content: `GV ${fullReport.teacherName} đã gửi báo cáo ca ${fullReport.shift} ngày ${fullReport.date}.${
          emergencyIncidentsCount > 0 ? ` Có ${emergencyIncidentsCount} sự vụ học sinh khẩn cấp cần xem xét!` : ''
        }`,
        type: emergencyIncidentsCount > 0 ? 'emergency' : 'system',
        priority: emergencyIncidentsCount > 0 ? 'high' : 'medium',
      });
    }

    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'DailyWorkReport',
      'SUBMIT_DAILY_REPORT',
      `Gửi báo cáo công việc ngày ${fullReport.date} (Ca: ${fullReport.shift}) - ${fullReport.teacherName}`
    );

    return fullReport;
  },

  updateDailyWorkReportAdminFeedback(reportId: string, feedback: string): void {
    const idx = state.dailyWorkReports.findIndex((r) => r.id === reportId);
    if (idx >= 0) {
      state.dailyWorkReports[idx].adminFeedback = feedback;
      state.dailyWorkReports[idx].adminFeedbackAt = new Date().toISOString();
      state.dailyWorkReports[idx].adminReviewed = true;
      notifySubscribers();

      if (supabase && isSupabaseConfigured) {
        supabase
          .from('daily_work_reports')
          .update({
            admin_feedback: feedback,
            admin_feedback_at: state.dailyWorkReports[idx].adminFeedbackAt,
            admin_reviewed: true,
          })
          .eq('id', reportId)
          .then();
      }

      BOPSStore.addNotification({
        receiverId: state.dailyWorkReports[idx].teacherId,
        title: 'Quản lý Thầy Lê Huy Phúc phản hồi báo cáo ngày',
        content: `Thầy Phúc đã xem và gửi chỉ đạo cho báo cáo ca ${state.dailyWorkReports[idx].shift} ngày ${state.dailyWorkReports[idx].date}: "${feedback.substring(0, 80)}..."`,
        type: 'system',
        priority: 'high',
      });

      BOPSStore.addAuditLog(
        'u-mgr-01',
        'Thầy Lê Huy Phúc',
        'manager',
        'DailyWorkReport',
        'FEEDBACK_REPORT',
        `Thầy Lê Huy Phúc phản hồi và chỉ đạo báo cáo ID: ${reportId}`
      );
    }
  },

  toggleIncidentHandled(reportId: string, incidentId: string): void {
    const rep = state.dailyWorkReports.find((r) => r.id === reportId);
    if (rep) {
      const inc = rep.studentIncidents.find((i) => i.id === incidentId);
      if (inc) {
        inc.handled = !inc.handled;
        notifySubscribers();
        if (supabase && isSupabaseConfigured) {
          supabase
            .from('daily_work_reports')
            .update({ student_incidents: rep.studentIncidents })
            .eq('id', reportId)
            .then();
        }
      }
    }
  },

  toggleRoomHandled(reportId: string, roomCondId: string): void {
    const rep = state.dailyWorkReports.find((r) => r.id === reportId);
    if (rep) {
      const rm = rep.roomConditions.find((r) => r.id === roomCondId);
      if (rm) {
        rm.handled = !rm.handled;
        notifySubscribers();
        if (supabase && isSupabaseConfigured) {
          supabase
            .from('daily_work_reports')
            .update({ room_conditions: rep.roomConditions })
            .eq('id', reportId)
            .then();
        }
      }
    }
  },

  deleteDailyWorkReport(reportId: string): void {
    state.dailyWorkReports = state.dailyWorkReports.filter((r) => r.id !== reportId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('daily_work_reports')
        .delete()
        .eq('id', reportId)
        .then();
    }
  },

  // --------------------------------------------------------------------------
  // 11. NOTIFICATIONS
  // --------------------------------------------------------------------------
  getNotifications(): NotificationItem[] {
    return state.notifications;
  },

  addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): void {
    const item: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    state.notifications.unshift(item);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('notifications')
        .insert(notifToDb(item))
        .then();
    }
  },

  markNotificationRead(id: string): void {
    state.notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .then();
    }
  },

  // --------------------------------------------------------------------------
  // 12. AUDIT LOGS
  // --------------------------------------------------------------------------
  getAuditLogs(): AuditLog[] {
    return state.auditLogs;
  },

  addAuditLog(
    userId: string,
    userName: string,
    userRole: 'manager' | 'teacher',
    module: string,
    operation: string,
    details: string
  ): void {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      userId,
      userName,
      userRole,
      module,
      operation,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    state.auditLogs.unshift(newLog);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('audit_logs')
        .insert(auditToDb(newLog))
        .then();
    }
  },

  // --------------------------------------------------------------------------
  // 13. SETTINGS
  // --------------------------------------------------------------------------
  getSettings(): DepartmentSettings {
    return state.settings;
  },

  saveSettings(settings: DepartmentSettings): void {
    state.settings = settings;
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('department_settings')
        .upsert(settingsToDb(settings), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lỗi khi lưu cài đặt vào Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Settings',
      'UPDATE_SETTINGS',
      'Cập nhật cấu hình quy định vận hành và công thức KPI hệ thống.'
    );
  },

  // Khôi phục dữ liệu ban đầu
  resetAllData(): void {
    state.users = [...INITIAL_USERS];
    state.students = [...INITIAL_STUDENTS];
    state.rooms = [...INITIAL_ROOMS];
    state.positions = [...INITIAL_POSITIONS];
    state.schedules = [...INITIAL_SCHEDULE_ASSIGNMENTS];
    state.tasks = [...INITIAL_TASK_INSTANCES];
    state.interactions = [...INITIAL_INTERACTIONS];
    state.kpis = [...INITIAL_KPIS];
    state.dailyEvaluations = [...INITIAL_DAILY_EVALUATIONS];
    state.dailyWorkReports = [...INITIAL_DAILY_WORK_REPORTS];
    state.notifications = [...INITIAL_NOTIFICATIONS];
    state.auditLogs = [...INITIAL_AUDIT_LOGS];
    state.settings = { ...INITIAL_SETTINGS };
    notifySubscribers();
  },
};
