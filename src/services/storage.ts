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
  INITIAL_SETTINGS,
} from '../data/mockData';
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseKey } from './supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * Các key CHỈ dùng cho client-side / UI state (được phép lưu trên browser của user)
 */
const CLIENT_STORAGE_KEYS = {
  CURRENT_USER_ID: 'bops_client_current_user_id',
  IS_LOGGED_IN: 'bops_client_is_logged_in',
};

// Dọn dẹp triệt để các key cache localStorage cũ (bops_*_v1) từng lưu dữ liệu mẫu
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const LEGACY_KEYS = [
      'bops_users_v1',
      'bops_students_v1',
      'bops_rooms_v1',
      'bops_positions_v1',
      'bops_schedules_v1',
      'bops_tasks_v1',
      'bops_interactions_v1',
      'bops_kpis_v1',
      'bops_evaluations_v1',
      'bops_reports_v1',
      'bops_notifications_v1',
      'bops_audit_logs_v1',
      'bops_settings_v1',
    ];
    for (const k of LEGACY_KEYS) {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('[BOPS Storage] Không thể dọn dẹp cache localStorage cũ:', e);
  }
}



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
  currentAuthUser: User | null;
  isAuthChecking: boolean;
  authError: string | null;
  syncError: string | null;
  isInitialized: boolean;
  isSyncing: boolean;
}

const state: AppDatabaseState = {
  users: [],
  students: [],
  rooms: [],
  positions: [],
  schedules: [],
  tasks: [],
  interactions: [],
  kpis: [],
  dailyEvaluations: [],
  dailyWorkReports: [],
  notifications: [],
  auditLogs: [],
  settings: { ...INITIAL_SETTINGS },
  currentAuthUser: null,
  isAuthChecking: true,
  authError: null,
  syncError: null,
  isInitialized: false,
  isSyncing: false,
};

export function clearBusinessData(): void {
  state.users = [];
  state.students = [];
  state.rooms = [];
  state.positions = [];
  state.schedules = [];
  state.tasks = [];
  state.interactions = [];
  state.kpis = [];
  state.dailyEvaluations = [];
  state.dailyWorkReports = [];
  state.notifications = [];
  state.auditLogs = [];
  state.settings = { ...INITIAL_SETTINGS };
  state.isInitialized = false;
  state.isSyncing = false;
  state.syncError = null;
}

// ============================================================================
// DATA CONVERTERS: TYPESCRIPT CAMELCASE <-> SUPABASE POSTGRESQL SNAKE_CASE
// ============================================================================
function userToDb(u: User) {
  return {
    id: u.id,
    teacher_code: u.teacherCode,
    full_name: u.fullName,
    username: u.username || null,
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
    auth_user_id: u.authUserId || null,
    updated_at: new Date().toISOString(),
  };
}

const USERS_SELECT_FIELDS = 'id, teacher_code, full_name, username, email, phone, avatar, role, position, status, department_id, employment_date, birthday, gender, address, night_shift_eligible, assigned_room_ids, assigned_student_ids, assigned_building, workload_index, auth_user_id, updated_at';

function dbToUser(row: any): User {
  return {
    id: row.id,
    teacherCode: row.teacher_code || '',
    fullName: row.full_name || '',
    username: row.username || undefined,
    password: undefined,
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
    authUserId: row.auth_user_id || undefined,
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
    gender: (row.gender === 'nữ' ? 'nữ' : 'nam') as 'nam' | 'nữ',
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
  const floorValue = Number(
    String(r.floor).replace(/^tầng\s*/i, '').trim()
  );

  if (!Number.isInteger(floorValue) || floorValue < 1 || floorValue > 99) {
    throw new Error(`Tầng phòng không hợp lệ: ${r.floor}`);
  }

  return {
    id: r.id,
    room_name: r.roomName,
    building: r.building,
    floor: floorValue,
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
    gender: (row.gender === 'nữ' ? 'nữ' : 'nam') as 'nam' | 'nữ',
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
// SUPABASE REALTIME & BUSINESS DATA SYNC (CHỈ CHẠY SAU KHI ĐĂNG NHẬP THÀNH CÔNG)
// ============================================================================
let activeSyncedUserId: string | null = null;
let isSyncInProgress = false;
let realtimeChannel: any = null;

export function teardownRealtimeSubscription(): void {
  if (realtimeChannel && supabase) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch (e) {
      console.warn('[BOPS Realtime] Lỗi khi hủy Realtime channel:', e);
    }
    realtimeChannel = null;
  }
}

async function fetchBusinessData(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const results = await Promise.allSettled([
    supabase.from('users').select(USERS_SELECT_FIELDS).order('id', { ascending: true }),
    supabase.from('students').select('*').order('student_code', { ascending: true }),
    supabase.from('rooms').select('*').order('room_name', { ascending: true }),
    supabase.from('positions').select('*').order('position_code', { ascending: true }),
    supabase.from('interactions').select('*').order('interaction_date', { ascending: false }),
    supabase.from('daily_work_reports').select('*').order('date', { ascending: false }),
    supabase.from('daily_evaluations').select('*').order('date', { ascending: false }),
    supabase.from('schedules').select('*').order('date', { ascending: false }),
    supabase.from('tasks').select('*').order('date', { ascending: false }),
    supabase.from('kpis').select('*').order('date', { ascending: false }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
    supabase.from('department_settings').select('*').eq('id', 'current_settings').maybeSingle(),
  ]);

  const [
    resUsers,
    resStudents,
    resRooms,
    resPositions,
    resInteractions,
    resReports,
    resEvals,
    resSchedules,
    resTasks,
    resKpis,
    resNotifs,
    resAudits,
    resSettings,
  ] = results;

  const tableNames = [
    'users', 'students', 'rooms', 'positions', 'interactions',
    'daily_work_reports', 'daily_evaluations', 'schedules', 'tasks',
    'kpis', 'notifications', 'audit_logs', 'department_settings'
  ];

  const failedTables: string[] = [];
  results.forEach((res, idx) => {
    if (res.status === 'rejected') {
      failedTables.push(`${tableNames[idx]} (lỗi kết nối: ${res.reason})`);
      console.error(`[BOPS Fetch] Lỗi kết nối truy vấn bảng ${tableNames[idx]}:`, res.reason);
    } else if (res.value.error) {
      failedTables.push(`${tableNames[idx]} (mã: ${res.value.error.code}, thông điệp: ${res.value.error.message})`);
      console.error(`[BOPS Fetch] Supabase trả về lỗi truy vấn bảng ${tableNames[idx]}:`, res.value.error);
    }
  });

  if (failedTables.length > 0) {
    state.syncError = `Phát hiện ${failedTables.length}/13 bảng không thể tải: ${failedTables.join(', ')}`;
    console.warn(`[BOPS Sync] Phát hiện ${failedTables.length}/13 bảng không thể tải dữ liệu từ Supabase:\n - ${failedTables.join('\n - ')}`);
  } else {
    state.syncError = null;
  }

  if (resUsers.status === 'fulfilled' && !resUsers.value.error && Array.isArray(resUsers.value.data)) {
    state.users = resUsers.value.data.map(dbToUser);
    console.info(`[BOPS Sync] Đã đồng bộ thành công ${state.users.length} tài khoản từ public.users.`);
  } else {
    const errorDetails = resUsers.status === 'rejected' ? resUsers.reason : resUsers.value.error?.message;
    console.error('[BOPS Sync] Không thể tải danh sách users từ Supabase:', errorDetails);
    if (state.users.length === 0 && state.currentAuthUser) {
      state.users = [state.currentAuthUser];
    }
  }
  if (resStudents.status === 'fulfilled' && !resStudents.value.error && resStudents.value.data) {
    state.students = resStudents.value.data.map(dbToStudent);
  }
  if (resRooms.status === 'fulfilled' && !resRooms.value.error && resRooms.value.data) {
    state.rooms = resRooms.value.data.map(dbToRoom);
  }
  if (resPositions.status === 'fulfilled' && !resPositions.value.error && resPositions.value.data) {
    state.positions = resPositions.value.data.map(dbToPosition);
  }
  if (resInteractions.status === 'fulfilled' && !resInteractions.value.error && resInteractions.value.data) {
    state.interactions = resInteractions.value.data.map(dbToInteraction);
  }
  if (resReports.status === 'fulfilled' && !resReports.value.error && resReports.value.data) {
    state.dailyWorkReports = resReports.value.data.map(dbToReport);
  }
  if (resEvals.status === 'fulfilled' && !resEvals.value.error && resEvals.value.data) {
    state.dailyEvaluations = resEvals.value.data.map(dbToEval);
  }
  if (resSchedules.status === 'fulfilled' && !resSchedules.value.error && resSchedules.value.data) {
    state.schedules = resSchedules.value.data.map(dbToSchedule);
  }
  if (resTasks.status === 'fulfilled' && !resTasks.value.error && resTasks.value.data) {
    state.tasks = resTasks.value.data.map(dbToTask);
  }
  if (resKpis.status === 'fulfilled' && !resKpis.value.error && resKpis.value.data) {
    state.kpis = resKpis.value.data.map(dbToKpi);
  }
  if (resNotifs.status === 'fulfilled' && !resNotifs.value.error && resNotifs.value.data) {
    state.notifications = resNotifs.value.data.map(dbToNotif);
  }
  if (resAudits.status === 'fulfilled' && !resAudits.value.error && resAudits.value.data) {
    state.auditLogs = resAudits.value.data.map(dbToAudit);
  }
  if (resSettings.status === 'fulfilled' && !resSettings.value.error && resSettings.value.data) {
    state.settings = dbToSettings(resSettings.value.data);
  }
}

function setupRealtimeSubscription(): void {
  if (!supabase || !isSupabaseConfigured) return;

  // Hủy subscription cũ nếu có để tránh đăng ký trùng lặp
  teardownRealtimeSubscription();

  try {
    realtimeChannel = supabase
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
    console.error('[BOPS Realtime] Lỗi khi thiết lập Realtime channel:', err);
  }
}

/**
 * Khởi tạo đồng bộ dữ liệu nghiệp vụ và Realtime cho người dùng đã xác thực.
 * Chống trùng lặp khi được gọi đồng thời qua syncBusinessPromise lock.
 */
let syncBusinessPromise: Promise<void> | null = null;

export async function syncBusinessDataAndRealtime(user: User): Promise<void> {
  if (activeSyncedUserId === user.id && state.isInitialized) {
    return;
  }
  if (syncBusinessPromise) {
    return syncBusinessPromise;
  }

  activeSyncedUserId = user.id;
  isSyncInProgress = true;
  state.isSyncing = true;
  notifySubscribers();

  syncBusinessPromise = (async () => {
    try {
      await fetchBusinessData();
      setupRealtimeSubscription();
      state.isInitialized = true;
    } catch (err) {
      console.error('[BOPS Sync] Lỗi trong quá trình tải dữ liệu nghiệp vụ:', err);
    } finally {
      isSyncInProgress = false;
      state.isSyncing = false;
      syncBusinessPromise = null;
      notifySubscribers();
    }
  })();

  return syncBusinessPromise;
}

export async function initializeDatabaseSync(): Promise<void> {
  if (state.currentAuthUser) {
    await syncBusinessDataAndRealtime(state.currentAuthUser);
  } else {
    console.warn('[BOPS] Bỏ qua initializeDatabaseSync vì chưa có phiên đăng nhập hợp lệ.');
  }
}

// ============================================================================
// SUPABASE AUTH SESSION MANAGEMENT (GIAI ĐOẠN C1 PILOT)
// ============================================================================
let authListenerRegistered = false;
let syncAuthSessionPromise: Promise<void> | null = null;
let isPasswordRecovery = false;

async function syncAuthSession(sessionUserId: string | null | undefined): Promise<void> {
  if (!sessionUserId || !supabase || !isSupabaseConfigured) {
    teardownRealtimeSubscription();
    activeSyncedUserId = null;
    isSyncInProgress = false;
    syncBusinessPromise = null;
    clearBusinessData();
    state.currentAuthUser = null;
    state.authError = null;
    return;
  }

  // Nếu người dùng này đã được xác thực và đồng bộ hoàn tất, không lặp lại
  if (
    state.currentAuthUser &&
    state.currentAuthUser.authUserId === sessionUserId &&
    state.isInitialized &&
    activeSyncedUserId === state.currentAuthUser.id
  ) {
    return;
  }

  // Khóa chống race condition: nếu đang có một Promise sync, dùng chung
  if (syncAuthSessionPromise) {
    return syncAuthSessionPromise;
  }

  syncAuthSessionPromise = (async () => {
    try {
      // 1. Kiểm tra trong state.users đã có hồ sơ liên kết với UID này chưa
      let matched = state.users.find((u) => u.authUserId === sessionUserId);

      // 2. Nếu chưa có trong RAM, CHỈ truy vấn đúng hồ sơ người dùng này từ public.users (có timeout 8s)
      if (!matched) {
        let queryTimer: any;
        const queryPromise = supabase
          .from('users')
          .select(USERS_SELECT_FIELDS)
          .eq('auth_user_id', sessionUserId)
          .maybeSingle();

        const queryTimeout = new Promise<never>((_, reject) => {
          queryTimer = setTimeout(() => reject(new Error('Quá thời gian tải hồ sơ cán bộ từ cơ sở dữ liệu (8s)')), 8000);
        });

        try {
          const { data: dbUser, error } = (await Promise.race([queryPromise, queryTimeout])) as any;
          if (error) {
            console.error('[BOPS Auth] Lỗi truy vấn hồ sơ liên kết (giữ session để thử lại sau):', error);
            state.authError = 'Không thể kết nối đến máy chủ để tải hồ sơ người dùng.';
            state.currentAuthUser = null;
            return;
          }

          if (dbUser) {
            matched = dbToUser(dbUser);
          }
        } catch (queryErr: any) {
          console.error('[BOPS Auth] Timeout/Ngoại lệ khi tải hồ sơ liên kết:', queryErr);
          state.authError = 'Quá thời gian tải hồ sơ người dùng từ cơ sở dữ liệu.';
          state.currentAuthUser = null;
          return;
        } finally {
          clearTimeout(queryTimer);
        }
      }

      if (matched) {
        state.currentAuthUser = matched;
        state.authError = null;
        // Khởi tạo đồng bộ dữ liệu nghiệp vụ và Realtime cho hồ sơ đã xác thực
        await syncBusinessDataAndRealtime(matched);
      } else {
        console.warn(`[BOPS Auth] Auth session có UID hợp lệ nhưng chưa có hồ sơ nghiệp vụ liên kết trong public.users (UID: ${sessionUserId.slice(0, 8)}...)`);
        teardownRealtimeSubscription();
        activeSyncedUserId = null;
        isSyncInProgress = false;
        syncBusinessPromise = null;
        clearBusinessData();
        state.currentAuthUser = null;
        state.authError = 'Tài khoản Auth chưa được liên kết với hồ sơ cán bộ/giáo viên FSC3 trong hệ thống.';
      }
    } catch (err: any) {
      console.error('[BOPS Auth] Ngoại lệ khi đồng bộ session:', err);
      state.currentAuthUser = null;
      state.authError = 'Lỗi kết nối khi đồng bộ phiên làm việc.';
    } finally {
      syncAuthSessionPromise = null;
    }
  })();

  return syncAuthSessionPromise;
}

export async function restoreAuthSession(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) {
    state.isAuthChecking = false;
    notifySubscribers();
    return;
  }

  // Phát hiện URL phục hồi mật khẩu (type=recovery)
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      isPasswordRecovery = true;
      state.authError = null;
    }
  }

  // Bộ hẹn giờ an toàn: tối đa 8s phải giải phóng isAuthChecking dù mạng có độ trễ
  const safetyTimer = setTimeout(() => {
    if (state.isAuthChecking) {
      console.warn('[BOPS Auth] Quá thời gian chờ khôi phục phiên (8s), tự động giải phóng cờ kiểm tra.');
      state.isAuthChecking = false;
      notifySubscribers();
    }
  }, 8000);

  try {
    // 1. Đăng ký listener onAuthStateChange một lần duy nhất
    if (!authListenerRegistered) {
      authListenerRegistered = true;
      supabase.auth.onAuthStateChange((event, session) => {
        console.info(`[BOPS Auth] onAuthStateChange nhận sự kiện: ${event}, user: ${session?.user?.id ? 'UID ' + session.user.id.slice(0, 8) + '...' : 'none'}`);

        if (event === 'PASSWORD_RECOVERY') {
          isPasswordRecovery = true;
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch {}
          if (session?.user?.id) {
            syncAuthSession(session.user.id).catch((e) => console.warn('[BOPS Auth] Lỗi recovery session:', e));
          }
          state.isAuthChecking = false;
          notifySubscribers();
          return;
        }

        if (event === 'SIGNED_OUT' || !session?.user?.id) {
          teardownRealtimeSubscription();
          activeSyncedUserId = null;
          isSyncInProgress = false;
          syncBusinessPromise = null;
          clearBusinessData();
          state.currentAuthUser = null;
          state.authError = null;
          state.isAuthChecking = false;
          isPasswordRecovery = false;
          notifySubscribers();
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION' ||
          event === 'USER_UPDATED'
        ) {
          // KHÔNG await syncAuthSession trong callback này để tránh deadlock nội bộ GoTrueClient -> getSession()
          if (session?.user?.id) {
            syncAuthSession(session.user.id)
              .catch((e) => console.warn('[BOPS Auth] Lỗi background syncAuthSession:', e))
              .finally(() => {
                state.isAuthChecking = false;
                notifySubscribers();
              });
          } else {
            state.isAuthChecking = false;
            notifySubscribers();
          }
        }
      });
    }

    // 2. Khôi phục session hiện tại từ client storage có timeout an toàn 5s
    let getSessionTimer: any;
    const sessionPromise = supabase.auth.getSession();
    const sessionTimeout = new Promise<{ data: { session: null }; error: any }>((resolve) => {
      getSessionTimer = setTimeout(() => {
        resolve({ data: { session: null }, error: new Error('Quá thời gian getSession ban đầu (5s)') });
      }, 5000);
    });

    const { data: { session }, error } = await Promise.race([sessionPromise, sessionTimeout]);
    clearTimeout(getSessionTimer);

    if (error) {
      console.warn('[BOPS Auth] Kết quả getSession ban đầu:', error.message || error);
    }

    if (session?.user?.id) {
      await syncAuthSession(session.user.id);
    } else {
      teardownRealtimeSubscription();
      activeSyncedUserId = null;
      isSyncInProgress = false;
      syncBusinessPromise = null;
      clearBusinessData();
      state.currentAuthUser = null;
    }
  } catch (err) {
    console.error('[BOPS Auth] Ngoại lệ khi khôi phục Auth session ban đầu:', err);
    state.currentAuthUser = null;
  } finally {
    clearTimeout(safetyTimer);
    state.isAuthChecking = false;
    notifySubscribers();
  }
}

// Khởi chạy khôi phục Auth Session khi module nạp (KHÔNG gọi initializeDatabaseSync trước đăng nhập)
if (typeof window !== 'undefined') {
  restoreAuthSession();
}

// ============================================================================
// BOPS STORE - CHÍNH THỨC SỬ DỤNG SUPABASE POSTGRESQL LÀM DATABASE CHÍNH
// ============================================================================
export const BOPSStore = {
  // --------------------------------------------------------------------------
  // USER SESSION / AUTHENTICATION (SUPABASE AUTH GIAI ĐOẠN C1)
  // --------------------------------------------------------------------------
  isLoggedIn(): boolean {
    return state.currentAuthUser !== null;
  },

  getCurrentUser(): User | null {
    return state.currentAuthUser;
  },

  isAuthChecking(): boolean {
    return state.isAuthChecking;
  },

  getAuthError(): string | null {
    return state.authError;
  },

  getSyncError(): string | null {
    return state.syncError;
  },

  isPasswordRecovery(): boolean {
    return isPasswordRecovery;
  },

  clearPasswordRecovery(): void {
    isPasswordRecovery = false;
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {}
    notifySubscribers();
  },

  async loginWithSupabaseAuth(
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      return {
        success: false,
        error: 'Chưa cấu hình Supabase Client. Vui lòng kiểm tra biến môi trường VITE_SUPABASE_URL!',
      };
    }

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !password) {
      return { success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu!' };
    }

    const maskedEmail = email.replace(/(?<=.{2}).(?=.*@)/g, '*');
    console.info(`[BOPS Auth] Bắt đầu xác thực Supabase Auth cho tài khoản: ${maskedEmail}`);

    try {
      // 1. Xác thực bằng Supabase Auth với timeout an toàn 12s
      let timer: any;
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Quá thời gian phản hồi từ máy chủ Supabase Auth (12s). Vui lòng thử lại!')),
          12000
        );
      });

      let authResult: any;
      try {
        authResult = await Promise.race([signInPromise, timeoutPromise]);
      } finally {
        clearTimeout(timer);
      }

      const { data, error } = authResult;

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
          msg = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Email tài khoản chưa được xác nhận trên Supabase Auth!';
        } else if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
          msg = 'Hệ thống đã nhận quá nhiều yêu cầu. Vui lòng thử lại sau ít phút!';
        }
        console.warn(`[BOPS Auth] Xác thực thất bại cho ${maskedEmail}: ${msg}`);
        return {
          success: false,
          error: `Đăng nhập không thành công: ${msg}`,
        };
      }

      if (!data?.session?.user) {
        console.warn(`[BOPS Auth] Xác thực không trả về session hợp lệ cho ${maskedEmail}`);
        return {
          success: false,
          error: 'Xác thực thành công nhưng không nhận được phiên làm việc hợp lệ từ Supabase Auth.',
        };
      }

      const authUid = data.session.user.id;
      console.info(`[BOPS Auth] Xác thực Supabase Auth thành công (UID: ${authUid.slice(0, 8)}...). Đang kiểm tra hồ sơ nghiệp vụ...`);

      // 2. Tra cứu hồ sơ người dùng trong public.users có auth_user_id khớp với Auth UID
      let matchedUser: User | null = null;
      let queryErrorMsg: string | null = null;

      try {
        let queryTimer: any;
        const queryPromise = supabase
          .from('users')
          .select(USERS_SELECT_FIELDS)
          .eq('auth_user_id', authUid)
          .maybeSingle();

        const queryTimeout = new Promise<never>((_, reject) => {
          queryTimer = setTimeout(() => reject(new Error('Quá thời gian tải hồ sơ cán bộ từ cơ sở dữ liệu (8s)')), 8000);
        });

        let queryResult: any;
        try {
          queryResult = await Promise.race([queryPromise, queryTimeout]);
        } finally {
          clearTimeout(queryTimer);
        }

        const { data: dbUser, error: queryErr } = queryResult as any;

        if (queryErr) {
          console.error('[BOPS Auth] Lỗi truy vấn hồ sơ liên kết trong users:', queryErr);
          queryErrorMsg = queryErr.message || 'Lỗi truy vấn cơ sở dữ liệu';
        } else if (dbUser) {
          matchedUser = dbToUser(dbUser);
          console.info(`[BOPS Auth] Đã tìm thấy hồ sơ liên kết: ${matchedUser.teacherCode} - ${matchedUser.fullName}`);
        }
      } catch (err: any) {
        console.error('[BOPS Auth] Exception khi tra cứu hồ sơ users:', err);
        queryErrorMsg = err?.message || 'Lỗi kết nối khi tải hồ sơ';
      }

      // 3. Xử lý trường hợp CHƯA CÓ hồ sơ liên kết (hoặc truy vấn lỗi):
      // Bắt buộc từ chối truy cập và đăng xuất an toàn ngay lập tức
      if (!matchedUser) {
        console.warn(`[BOPS Auth] Auth UID (${authUid.slice(0, 8)}...) chưa được liên kết với hồ sơ users cho email: ${maskedEmail}`);

        // Đăng xuất khỏi Supabase Auth trong tối đa 2.5s để dọn phiên sạch
        try {
          await Promise.race([
            supabase.auth.signOut(),
            new Promise((resolve) => setTimeout(resolve, 2500)),
          ]);
        } catch (signOutErr) {
          console.warn('[BOPS Auth] Lỗi signOut tài khoản chưa liên kết:', signOutErr);
        }

        teardownRealtimeSubscription();
        activeSyncedUserId = null;
        isSyncInProgress = false;
        syncBusinessPromise = null;
        clearBusinessData();
        state.currentAuthUser = null;
        notifySubscribers();

        if (queryErrorMsg) {
          return {
            success: false,
            error: `Đăng nhập Auth thành công nhưng lỗi kiểm tra hồ sơ: ${queryErrorMsg}. Vui lòng thử lại!`,
          };
        }

        let unlinkedInfo = '';
        try {
          let unlinkedTimer: any;
          const unlinkedPromise = supabase
            .from('users')
            .select('teacher_code, full_name')
            .ilike('email', email)
            .maybeSingle();

          const unlinkedTimeout = new Promise<any>((resolve) => {
            unlinkedTimer = setTimeout(() => resolve({ data: null }), 3000);
          });

          const { data: unlinkedTeacher } = await Promise.race([unlinkedPromise, unlinkedTimeout]);
          clearTimeout(unlinkedTimer);

          if (unlinkedTeacher) {
            unlinkedInfo = ` (Hồ sơ: ${unlinkedTeacher.teacher_code} - ${unlinkedTeacher.full_name})`;
          }
        } catch {}

        return {
          success: false,
          error: `Tài khoản (${email}) đã xác thực thành công trên Supabase Auth, nhưng hồ sơ cán bộ/giáo viên${unlinkedInfo} chưa được Quản lý kích hoạt liên kết auth_user_id trong hệ thống. Vui lòng nhờ Quản lý vào màn hình "Quản Lý Giáo Viên" và bấm nút "Cấp / Liên kết Auth" để kích hoạt quyền truy cập!`,
        };
      }

      // 4. Khi ĐÃ tìm thấy hồ sơ liên kết hợp lệ:
      state.currentAuthUser = matchedUser;
      state.authError = null;
      notifySubscribers();
      console.info(`[BOPS Auth] Đăng nhập hoàn tất thành công cho: ${matchedUser.fullName} (${matchedUser.role}).`);

      // Đồng bộ dữ liệu nghiệp vụ ngầm (không phong tỏa giao diện)
      syncBusinessDataAndRealtime(matchedUser).catch((e) => {
        console.warn('[BOPS Auth] Lỗi nền khi đồng bộ dữ liệu nghiệp vụ sau đăng nhập:', e);
      });

      return { success: true, user: matchedUser };
    } catch (err: any) {
      console.error('[BOPS Auth] Ngoại lệ đăng nhập:', err);
      return {
        success: false,
        error: err?.message || 'Lỗi kết nối khi thực hiện đăng nhập qua Supabase Auth. Vui lòng thử lại!',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      if (supabase && isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[BOPS Auth] Lỗi khi gọi signOut:', err);
    }
    teardownRealtimeSubscription();
    activeSyncedUserId = null;
    isSyncInProgress = false;
    syncBusinessPromise = null;
    syncAuthSessionPromise = null;
    isPasswordRecovery = false;
    clearBusinessData();
    state.currentAuthUser = null;
    state.authError = null;
    state.isInitialized = false;
    state.isSyncing = false;
    state.isAuthChecking = false;
    try {
      localStorage.removeItem(CLIENT_STORAGE_KEYS.CURRENT_USER_ID);
      localStorage.removeItem(CLIENT_STORAGE_KEYS.IS_LOGGED_IN);
    } catch {}
    notifySubscribers();
  },

  async updateCurrentUserPassword(
    newPasswordInput: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      return {
        success: false,
        error: 'Chưa cấu hình Supabase Client. Vui lòng kiểm tra biến môi trường!',
      };
    }

    // Kiểm tra có tài khoản đăng nhập hoặc phiên phục hồi mật khẩu (recovery session)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!state.currentAuthUser && !authUser) {
      return {
        success: false,
        error: 'Bạn chưa đăng nhập hoặc phiên đặt lại mật khẩu đã hết hạn!',
      };
    }

    const newPassword = newPasswordInput.trim();
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự để bảo đảm an toàn!',
      };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[BOPS Auth] Lỗi đổi mật khẩu Supabase Auth:', error);
        return {
          success: false,
          error: error.message || 'Không thể cập nhật mật khẩu trên Supabase Auth.',
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Không nhận được phản hồi tài khoản từ Supabase Auth.',
        };
      }

      // Xóa trạng thái recovery sau khi cập nhật thành công
      isPasswordRecovery = false;
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {}

      // Ghi audit log an toàn (không ghi mật khẩu)
      const current = state.currentAuthUser;
      if (current) {
        BOPSStore.addAuditLog(
          current.id,
          current.fullName,
          current.role,
          'Auth',
          'UPDATE_PASSWORD',
          `Người dùng "${current.fullName}" (${current.email || current.teacherCode}) đã tự đổi mật khẩu qua Supabase Auth.`
        );
      }

      notifySubscribers();
      return { success: true };
    } catch (err: any) {
      console.error('[BOPS Auth] Ngoại lệ khi cập nhật mật khẩu:', err);
      return {
        success: false,
        error: err?.message || 'Lỗi ngoại lệ khi đổi mật khẩu tài khoản.',
      };
    }
  },

  setCurrentUser(userId: string): void {
    // Vô hiệu hóa việc ép gán tài khoản qua localStorage ở giai đoạn C1
    console.warn('[BOPS Auth] setCurrentUser thủ công bị vô hiệu hóa trong cơ chế Supabase Auth.');
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
  },

  async addUser(
    userData: Omit<User, 'id'> & { id?: string }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    let newId = userData.id;
    if (!newId) {
      let maxNum = 0;
      for (const u of state.users) {
        const m = u.id?.match(/^u-gv-(\d+)$/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      newId = `u-gv-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const newUser: User = {
      ...userData,
      id: newId,
    };

    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .insert(userToDb(newUser));

      if (error) {
        console.error('[BOPS Add] Lỗi khi thêm user vào Supabase:', error);
        return {
          success: false,
          error: `Lỗi khi lưu hồ sơ vào cơ sở dữ liệu: ${error.message}`,
        };
      }
    }

    state.users.push(newUser);
    notifySubscribers();

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Teacher',
      'ADD_TEACHER',
      `Tạo tài khoản Giáo viên Quản nhiệm: ${newUser.fullName} (${newUser.teacherCode})`
    );

    return { success: true, user: newUser };
  },

  updateUser(updated: User): void {
    const prevUser = state.users.find((u) => u.id === updated.id);
    state.users = state.users.map((u) => (u.id === updated.id ? updated : u));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const { id: _id, ...userPayload } = userToDb(updated);
      supabase
        .from('users')
        .update(userPayload)
        .eq('id', updated.id)
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Update] Lỗi khi cập nhật user vào Supabase:', error);
            if (prevUser) {
              state.users = state.users.map((u) => (u.id === updated.id ? prevUser : u));
              notifySubscribers();
            }
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Teacher',
      'UPDATE_TEACHER',
      `Cập nhật hồ sơ tài khoản: ${updated.fullName} (${updated.teacherCode})`
    );
  },

  async provisionTeacherAuth(
    teacherId: string,
    email: string,
    initialPassword: string
  ): Promise<{ success: boolean; authUserId?: string; warning?: string; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, error: 'Chưa cấu hình Supabase Client!' };
    }

    const currentUser = BOPSStore.getCurrentUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, error: 'Chỉ Quản lý mới có quyền cấp tài khoản xác thực cho Giáo viên!' };
    }

    const teacher = state.users.find((u) => u.id === teacherId);
    if (!teacher) {
      return { success: false, error: 'Không tìm thấy hồ sơ giáo viên trong hệ thống!' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = initialPassword.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Email không hợp lệ (cần đúng định dạng @fpt.edu.vn)!' };
    }

    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'Mật khẩu khởi tạo phải có ít nhất 6 ký tự theo chuẩn Supabase Auth!' };
    }

    try {
      // 1. Kiểm tra xác thực hồ sơ giáo viên thực tế trên Supabase trước khi tạo Auth
      const { data: dbTeacher, error: checkErr } = await supabase
        .from('users')
        .select('id, full_name, teacher_code, email, auth_user_id')
        .eq('id', teacherId)
        .maybeSingle();

      if (checkErr) {
        return { success: false, error: `Lỗi kết nối khi xác minh hồ sơ giáo viên trên máy chủ: ${checkErr.message}` };
      }
      if (!dbTeacher) {
        return { success: false, error: 'Hồ sơ giáo viên không còn tồn tại trên cơ sở dữ liệu Supabase (có thể đã bị xóa)!' };
      }
      if (dbTeacher.auth_user_id) {
        return {
          success: false,
          authUserId: dbTeacher.auth_user_id,
          error: `Giáo viên này đã được liên kết với Auth User ID (${dbTeacher.auth_user_id}). Hệ thống ngăn chặn việc tạo tài khoản trùng hoặc ghi đè thông tin xác thực hiện tại!`,
        };
      }

      // 2. Khởi tạo isolated client KHÔNG lưu session để bảo toàn phiên đăng nhập của Quản lý
      const isolatedClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data: signUpData, error: signUpErr } = await isolatedClient.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: teacher.fullName,
            teacher_code: teacher.teacherCode,
            role: 'teacher',
          },
        },
      });

      if (signUpErr) {
        const errMsg = signUpErr.message.toLowerCase();
        if (errMsg.includes('user already registered') || errMsg.includes('already exists') || errMsg.includes('already registered')) {
          return {
            success: false,
            error: `Email (${cleanEmail}) đã tồn tại trên Supabase Auth. Bạn có thể sử dụng chức năng "Liên kết UID Auth" để gán trực tiếp Auth UID cho giáo viên này.`,
          };
        }
        return { success: false, error: `Lỗi đăng ký Supabase Auth: ${signUpErr.message}` };
      }

      const newAuthUid = signUpData?.user?.id;
      if (!newAuthUid) {
        return { success: false, error: 'Supabase Auth không trả về thông tin User ID hợp lệ!' };
      }

      // Phát hiện trạng thái chờ xác nhận email (nếu Supabase bật Require Email Confirmation)
      const isConfirmationPending = !signUpData?.session && !signUpData?.user?.confirmed_at;

      // 3. Quản lý cập nhật trường auth_user_id trên bảng public.users
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          auth_user_id: newAuthUid,
          email: cleanEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teacherId);

      if (updateErr) {
        console.error('[BOPS Auth] Lỗi khi cập nhật auth_user_id vào public.users:', updateErr);
        return {
          success: false,
          authUserId: newAuthUid,
          error: `Đã tạo tài khoản Auth (UID: ${newAuthUid}) nhưng lỗi khi liên kết hồ sơ public.users: ${updateErr.message}. Quản lý có thể dùng chức năng "Liên kết UID Auth" với mã UID trên để hoàn tất liên kết mà không cần tạo lại tài khoản.`,
        };
      }

      // 4. Cập nhật state in-memory
      state.users = state.users.map((u) =>
        u.id === teacherId ? { ...u, authUserId: newAuthUid, email: cleanEmail } : u
      );
      notifySubscribers();

      BOPSStore.addAuditLog(
        currentUser.id,
        currentUser.fullName,
        'manager',
        'Teacher',
        'PROVISION_AUTH',
        `Cấp tài khoản Supabase Auth cho GV: ${teacher.fullName} (${teacher.teacherCode}) - Email: ${cleanEmail}`
      );

      const warningText = isConfirmationPending
        ? 'Lưu ý: Dự án Supabase có thể đang bật "Confirm email". Giáo viên cần xác nhận email hoặc quản trị viên tắt kiểm tra này trên Supabase để đăng nhập ngay.'
        : undefined;

      return { success: true, authUserId: newAuthUid, warning: warningText };
    } catch (err: any) {
      console.error('[BOPS Auth] Ngoại lệ khi cấp tài khoản Auth:', err);
      return { success: false, error: err?.message || 'Lỗi ngoại lệ khi tạo tài khoản Auth.' };
    }
  },

  async linkTeacherAuthId(
    teacherId: string,
    authUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      return { success: false, error: 'Chưa cấu hình Supabase Client!' };
    }

    const currentUser = BOPSStore.getCurrentUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, error: 'Chỉ Quản lý mới có quyền liên kết tài khoản Auth!' };
    }

    const cleanUid = authUserId.trim();
    if (!cleanUid) {
      return { success: false, error: 'Vui lòng nhập Auth User ID (UUID) hợp lệ!' };
    }

    try {
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          auth_user_id: cleanUid,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teacherId);

      if (updateErr) {
        return { success: false, error: `Lỗi Supabase khi liên kết: ${updateErr.message}` };
      }

      state.users = state.users.map((u) =>
        u.id === teacherId ? { ...u, authUserId: cleanUid } : u
      );
      notifySubscribers();

      BOPSStore.addAuditLog(
        currentUser.id,
        currentUser.fullName,
        'manager',
        'Teacher',
        'LINK_AUTH_ID',
        `Liên kết Auth User ID (${cleanUid}) cho GV ID: ${teacherId}`
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi ngoại lệ khi liên kết.' };
    }
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    // 1. CHẶN BÁO XÓA THÀNH CÔNG GIẢ: Bắt buộc Supabase Client phải sẵn sàng kết nối
    if (!supabase || !isSupabaseConfigured) {
      return {
        success: false,
        error: 'Chưa cấu hình Supabase Client hoặc không có kết nối cơ sở dữ liệu. Thao tác xóa bị từ chối để bảo đảm an toàn dữ liệu!',
      };
    }

    const targetUser = state.users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'Không tìm thấy người dùng trong hệ thống!' };

    const currentUser = BOPSStore.getCurrentUser();
    if (currentUser && (userId === currentUser.id || (targetUser.authUserId && targetUser.authUserId === currentUser.authUserId))) {
      const msg = 'Không thể xóa tài khoản của chính mình đang đăng nhập!';
      console.warn('[BOPS Delete]', msg);
      return { success: false, error: msg };
    }

    // 2. Sao lưu các bản ghi liên quan hiện tại để phục vụ hoàn tác bù trừ (compensating rollback) nếu gặp lỗi
    const prevRooms = state.rooms.filter((r) => r.teacherId === userId);
    const prevStudents = state.students.filter((s) => s.teacherId === userId);
    const prevSchedules = state.schedules.filter((s) => s.teacherId === userId && s.status === 'scheduled');
    const prevTasks = state.tasks.filter((t) => t.teacherId === userId && t.status === 'pending');

    const rollbackCompensations = async (): Promise<{ success: boolean; errors: string[] }> => {
      const errors: string[] = [];
      try {
        if (prevRooms.length > 0) {
          for (const r of prevRooms) {
            const { error: rbRoomErr } = await supabase
              .from('rooms')
              .update({ teacher_id: r.teacherId, teacher_name: r.teacherName })
              .eq('id', r.id);
            if (rbRoomErr) {
              errors.push(`Khôi phục phòng ${r.roomName || r.id} thất bại: ${rbRoomErr.message}`);
            }
          }
        }
        if (prevStudents.length > 0) {
          for (const s of prevStudents) {
            const { error: rbStudentErr } = await supabase
              .from('students')
              .update({ teacher_id: s.teacherId, teacher_name: s.teacherName })
              .eq('id', s.id);
            if (rbStudentErr) {
              errors.push(`Khôi phục học sinh ${s.fullName || s.id} thất bại: ${rbStudentErr.message}`);
            }
          }
        }
        if (prevSchedules.length > 0) {
          for (const sc of prevSchedules) {
            const { error: rbScheduleErr } = await supabase
              .from('schedules')
              .update({
                teacher_id: sc.teacherId,
                teacher_name: sc.teacherName,
                teacher_code: sc.teacherCode || '',
              })
              .eq('id', sc.id);
            if (rbScheduleErr) {
              errors.push(`Khôi phục ca trực ${sc.date} (${sc.shift}) thất bại: ${rbScheduleErr.message}`);
            }
          }
        }
        if (prevTasks.length > 0) {
          for (const tk of prevTasks) {
            const { error: rbTaskErr } = await supabase
              .from('tasks')
              .update({
                teacher_id: tk.teacherId,
                teacher_name: tk.teacherName,
              })
              .eq('id', tk.id);
            if (rbTaskErr) {
              errors.push(`Khôi phục nhiệm vụ ${tk.taskName || tk.id} thất bại: ${rbTaskErr.message}`);
            }
          }
        }
      } catch (rollbackErr: any) {
        console.error('[BOPS Delete] Lỗi ngoại lệ khi thực hiện hoàn tác bù trừ (rollback):', rollbackErr);
        errors.push(`Lỗi ngoại lệ khi rollback: ${rollbackErr?.message || String(rollbackErr)}`);
      }

      if (errors.length > 0) {
        console.error('[BOPS Delete] Hoàn tác bù trừ (rollback) có lỗi:', errors);
      }
      return { success: errors.length === 0, errors };
    };

    const formatRollbackNotice = (rb: { success: boolean; errors: string[] }): string => {
      if (rb.success) {
        return 'Đã khôi phục các phân công liên quan về trạng thái ban đầu.';
      }
      return `CẢNH BÁO: Quá trình hoàn tác bù trừ (rollback) gặp lỗi ở một số bước: [${rb.errors.join('; ')}]. Cần kiểm tra lại dữ liệu phân công!`;
    };

    let syncWarning: string | undefined;

    try {
      // BƯỚC 1: Gỡ phân công phòng trên Supabase
      if (prevRooms.length > 0) {
        const { error: roomUnassignErr } = await supabase
          .from('rooms')
          .update({ teacher_id: '', teacher_name: 'Chưa phân công' })
          .eq('teacher_id', userId);

        if (roomUnassignErr) {
          console.error('[BOPS Delete] Lỗi khi gỡ phân công phòng:', roomUnassignErr);
          return {
            success: false,
            error: `Không thể gỡ phân công phòng của giáo viên: ${roomUnassignErr.message}. Thao tác xóa đã dừng để bảo vệ tính nhất quán dữ liệu.`,
          };
        }
      }

      // BƯỚC 2: Gỡ phân công học sinh trên Supabase
      if (prevStudents.length > 0) {
        const { error: studentUnassignErr } = await supabase
          .from('students')
          .update({ teacher_id: '', teacher_name: 'Chưa phân công' })
          .eq('teacher_id', userId);

        if (studentUnassignErr) {
          console.error('[BOPS Delete] Lỗi khi gỡ phân công học sinh:', studentUnassignErr);
          const rb = await rollbackCompensations();
          return {
            success: false,
            error: `Không thể gỡ phân công học sinh: ${studentUnassignErr.message}. ${formatRollbackNotice(rb)}`,
          };
        }
      }

      // BƯỚC 3: Gỡ phân công ca trực chưa diễn ra (status = 'scheduled') trên Supabase (giữ nguyên lịch sử ca trực đã xong)
      if (prevSchedules.length > 0) {
        const { error: scheduleUnassignErr } = await supabase
          .from('schedules')
          .update({ teacher_id: '', teacher_name: 'Chưa phân công', teacher_code: '' })
          .eq('teacher_id', userId)
          .eq('status', 'scheduled');

        if (scheduleUnassignErr) {
          console.error('[BOPS Delete] Lỗi khi gỡ phân công ca trực tương lai:', scheduleUnassignErr);
          const rb = await rollbackCompensations();
          return {
            success: false,
            error: `Không thể gỡ phân công lịch trực chưa diễn ra: ${scheduleUnassignErr.message}. ${formatRollbackNotice(rb)}`,
          };
        }
      }

      // BƯỚC 4: Gỡ phân công nhiệm vụ chưa hoàn thành (status = 'pending') trên Supabase (giữ nguyên lịch sử nhiệm vụ đã làm)
      if (prevTasks.length > 0) {
        const { error: taskUnassignErr } = await supabase
          .from('tasks')
          .update({ teacher_id: '', teacher_name: 'Chưa phân công' })
          .eq('teacher_id', userId)
          .eq('status', 'pending');

        if (taskUnassignErr) {
          console.error('[BOPS Delete] Lỗi khi gỡ phân công nhiệm vụ chưa làm:', taskUnassignErr);
          const rb = await rollbackCompensations();
          return {
            success: false,
            error: `Không thể gỡ phân công nhiệm vụ chưa hoàn thành: ${taskUnassignErr.message}. ${formatRollbackNotice(rb)}`,
          };
        }
      }

      // BƯỚC 5: Xóa tài khoản giáo viên trong public.users trên Supabase và xác minh phản hồi
      const { data: deletedRows, error: deleteErr } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .select('id');

      if (deleteErr) {
        console.error('[BOPS Delete] Lỗi khi xóa user khỏi Supabase:', deleteErr);
        const rb = await rollbackCompensations();
        return {
          success: false,
          error: `Lỗi Supabase khi xóa tài khoản: ${deleteErr.message}. ${formatRollbackNotice(rb)}`,
        };
      }

      if (!deletedRows || deletedRows.length === 0) {
        console.warn('[BOPS Delete] Supabase phản hồi 0 dòng bị xóa đối với user:', userId);
        const { data: checkUser, error: checkUserErr } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (checkUserErr) {
          console.error('[BOPS Delete] Lỗi khi truy vấn xác minh sự tồn tại của user sau lệnh DELETE:', checkUserErr);
          const rb = await rollbackCompensations();
          return {
            success: false,
            error: `Lệnh xóa trả về 0 dòng và không thể xác minh sự tồn tại của tài khoản do lỗi: ${checkUserErr.message}. ${formatRollbackNotice(rb)}`,
          };
        }

        if (checkUser) {
          console.error('[BOPS Delete] Tài khoản vẫn tồn tại trên Supabase dù lệnh delete không báo lỗi (chính sách RLS đã chặn DELETE):', userId);
          const rb = await rollbackCompensations();
          return {
            success: false,
            error: `Xóa không thành công: Tài khoản vẫn còn tồn tại trên cơ sở dữ liệu Supabase (chính sách bảo mật RLS đã từ chối thao tác xóa)! ${formatRollbackNotice(rb)}`,
          };
        }

        // Đã xác minh chắc chắn checkUser === null: tài khoản không còn tồn tại trên Supabase
        console.info('[BOPS Delete] Xác nhận tài khoản đã không còn trên Supabase. Đang tải lại danh sách users...', userId);
        const { data: freshUsers, error: freshUsersErr } = await supabase
          .from('users')
          .select(USERS_SELECT_FIELDS)
          .order('id', { ascending: true });

        if (freshUsersErr) {
          console.warn('[BOPS Delete] Tài khoản đã được xóa trên Supabase nhưng tải lại danh sách người dùng thất bại:', freshUsersErr);
          syncWarning = `Tài khoản đã được xóa trên cơ sở dữ liệu Supabase, nhưng không thể tải lại danh sách người dùng tự động: ${freshUsersErr.message}. Danh sách trong bộ nhớ đã được cập nhật, vui lòng tải lại trang (F5) để đồng bộ hoàn toàn!`;
        } else if (freshUsers) {
          state.users = freshUsers.map(dbToUser);
        }
      }
    } catch (err: any) {
      console.error('[BOPS Delete] Exception khi thực hiện chuỗi thao tác xóa user:', err);
      const rb = await rollbackCompensations();
      return {
        success: false,
        error: `Lỗi ngoại lệ khi xóa tài khoản: ${err?.message || String(err)}. ${formatRollbackNotice(rb)}`,
      };
    }

    // 3. CHỈ CẬP NHẬT TRẠNG THÁI RAM SAU KHI TẤT CẢ CÁC BƯỚC TRÊN SUPABASE HOÀN TẤT THÀNH CÔNG
    state.users = state.users.filter((u) => u.id !== userId);
    state.rooms = state.rooms.map((r) =>
      r.teacherId === userId ? { ...r, teacherId: '', teacherName: 'Chưa phân công' } : r
    );
    state.students = state.students.map((s) =>
      s.teacherId === userId ? { ...s, teacherId: '', teacherName: 'Chưa phân công' } : s
    );
    state.schedules = state.schedules.map((s) =>
      s.teacherId === userId && s.status === 'scheduled'
        ? { ...s, teacherId: '', teacherName: 'Chưa phân công', teacherCode: '' }
        : s
    );
    state.tasks = state.tasks.map((t) =>
      t.teacherId === userId && t.status === 'pending'
        ? { ...t, teacherId: '', teacherName: 'Chưa phân công' }
        : t
    );
    notifySubscribers();

    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Teacher',
      'DELETE_TEACHER',
      `Xóa tài khoản Giáo viên ID: ${userId} (${targetUser.fullName}) và gỡ phân công ${prevRooms.length} phòng, ${prevStudents.length} học sinh, ${prevSchedules.length} ca trực, ${prevTasks.length} nhiệm vụ.`
    );

    if (syncWarning) {
      return { success: true, message: syncWarning };
    }

    return { success: true };
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
      uploadedByUserId: studentData.uploadedByUserId || currentUser?.id || 'system',
      uploadedByUserName: studentData.uploadedByUserName || currentUser?.fullName || 'Hệ thống',
    };

    state.students.unshift(newStudent);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('students')
        .insert(studentToDb(newStudent))
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lỗi khi thêm học sinh vào Supabase:', error);
            state.students = state.students.filter((s) => s.id !== newStudent.id);
            notifySubscribers();
          }
        });
    }

    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
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
    const prevStudent = state.students.find((s) => s.id === student.id);
    state.students = state.students.map((s) => (s.id === student.id ? student : s));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const currentUser = BOPSStore.getCurrentUser();
      const isManager = currentUser?.role === 'manager';

      let payload: Record<string, any>;
      if (isManager) {
        const { id: _id, ...managerPayload } = studentToDb(student);
        payload = managerPayload;
      } else {
        // Whitelist trường được phép cho GVQN theo SQL RLS FSC3:
        // special_care, special_labels, health_note, note, last_interaction_date, interaction_count_this_month, updated_at
        payload = {
          special_care: Boolean(student.specialCare),
          special_labels: student.specialLabels || [],
          health_note: student.healthNote || null,
          note: student.note || null,
          last_interaction_date: student.lastInteractionDate || null,
          interaction_count_this_month: student.interactionCountThisMonth || 0,
          updated_at: new Date().toISOString(),
        };
      }

      supabase
        .from('students')
        .update(payload)
        .eq('id', student.id)
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Update] Lỗi khi cập nhật học sinh trong Supabase:', error);
            if (prevStudent) {
              state.students = state.students.map((s) => (s.id === student.id ? prevStudent : s));
              notifySubscribers();
            }
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Student',
      'UPDATE_STUDENT',
      `Cập nhật hồ sơ học sinh ${student.fullName} (${student.studentCode})`
    );
  },

  async deleteStudent(studentId: string): Promise<{ success: boolean; error?: string }> {
    // 1. Kiểm tra supabase và isSupabaseConfigured. Nếu chưa sẵn sàng, trả lỗi ngay, không thay đổi RAM và không ghi Audit Log.
    if (!supabase || !isSupabaseConfigured) {
      return {
        success: false,
        error: 'Cơ sở dữ liệu Supabase chưa được cấu hình hoặc dịch vụ chưa sẵn sàng. Thao tác xóa bị từ chối!',
      };
    }

    // 2. Lấy currentUser; chỉ cho phép currentUser.role === 'manager'. Nếu không đúng, trả lỗi ngay.
    const currentUser = BOPSStore.getCurrentUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return {
        success: false,
        error: 'Chỉ Quản lý (Manager) mới có quyền xóa hồ sơ học sinh. Thao tác bị từ chối!',
      };
    }

    // 3. Tìm học sinh trong state.students. Nếu không tồn tại, trả lỗi.
    const targetIndex = state.students.findIndex((s) => s.id === studentId);
    if (targetIndex === -1) {
      return { success: false, error: 'Không tìm thấy hồ sơ học sinh trong hệ thống!' };
    }

    // 4. Lưu targetStudent, targetIndex, prevSiblingId, nextSiblingId.
    const targetStudent = state.students[targetIndex];
    const prevSiblingId = state.students[targetIndex - 1]?.id;
    const nextSiblingId = state.students[targetIndex + 1]?.id;

    // 5. Tạo hàm rollbackRAM() để khôi phục học sinh về vị trí ban đầu:
    //    - Nếu ID đã tồn tại trong RAM thì không thêm lại.
    //    - Ưu tiên chèn sau prevSiblingId nếu còn tồn tại.
    //    - Nếu không, chèn trước nextSiblingId nếu còn tồn tại.
    //    - Nếu cả hai không còn, chèn tại targetIndex đã giới hạn trong phạm vi mảng.
    //    - Gọi notifySubscribers().
    const rollbackRAM = () => {
      if (state.students.some((s) => s.id === studentId)) return;

      const currentList = [...state.students];
      let insertIndex = -1;

      if (prevSiblingId) {
        const prevIdx = currentList.findIndex((s) => s.id === prevSiblingId);
        if (prevIdx !== -1) insertIndex = prevIdx + 1;
      }

      if (insertIndex === -1 && nextSiblingId) {
        const nextIdx = currentList.findIndex((s) => s.id === nextSiblingId);
        if (nextIdx !== -1) insertIndex = nextIdx;
      }

      if (insertIndex === -1) {
        insertIndex = Math.min(Math.max(targetIndex, 0), currentList.length);
      }

      currentList.splice(insertIndex, 0, targetStudent);
      state.students = currentList;
      notifySubscribers();
    };

    // 6. Xóa tạm học sinh khỏi RAM và gọi notifySubscribers().
    state.students = state.students.filter((s) => s.id !== studentId);
    notifySubscribers();

    // 7. Thực hiện: supabase.from('students').delete().eq('id', studentId).select('id, student_code, full_name, teacher_id')
    try {
      const { data: deletedRows, error: deleteErr } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .select('id, student_code, full_name, teacher_id');

      // 8. Nếu có deleteErr: rollback và trả lỗi.
      if (deleteErr) {
        console.error('[BOPS Delete] Lỗi truy vấn xóa học sinh trên Supabase:', deleteErr);
        rollbackRAM();
        return {
          success: false,
          error: `Lỗi máy chủ khi xóa học sinh: ${deleteErr.message}`,
        };
      }

      // 9. Nếu deletedRows rỗng:
      //    - Truy vấn lại học sinh bằng .select('id').eq('id', studentId).maybeSingle().
      //    - Nếu truy vấn xác minh có lỗi: rollback và trả lỗi.
      //    - Nếu học sinh vẫn tồn tại: rollback và trả lỗi, nêu rõ có thể bị RLS từ chối.
      //    - Nếu không tìm thấy học sinh: vẫn rollback và trả lỗi rằng không thể xác minh kết quả xóa. Tuyệt đối không tự coi là thành công và không tải lại toàn bộ danh sách.
      if (!deletedRows || deletedRows.length === 0) {
        console.warn('[BOPS Delete] Lệnh DELETE trả về 0 dòng đối với học sinh:', studentId);

        const { data: checkStudent, error: checkErr } = await supabase
          .from('students')
          .select('id')
          .eq('id', studentId)
          .maybeSingle();

        if (checkErr) {
          console.error('[BOPS Delete] Không thể xác minh bản ghi sau lệnh DELETE:', checkErr);
          rollbackRAM();
          return {
            success: false,
            error: `Lệnh xóa trả về 0 dòng và không thể xác minh trạng thái hồ sơ trên máy chủ (${checkErr.message}). Thao tác xóa đã bị hủy để bảo vệ dữ liệu!`,
          };
        }

        if (checkStudent) {
          console.error('[BOPS Delete] Hồ sơ học sinh vẫn tồn tại trên Supabase (chính sách RLS có thể đã từ chối quyền xóa):', studentId);
          rollbackRAM();
          return {
            success: false,
            error: 'Xóa không thành công: Hồ sơ học sinh vẫn tồn tại trên cơ sở dữ liệu (chính sách bảo mật RLS có thể đã từ chối quyền xóa)!',
          };
        }

        console.warn('[BOPS Delete] Lệnh DELETE trả về 0 dòng và không tìm thấy học sinh trên Supabase.');
        rollbackRAM();
        return {
          success: false,
          error: 'Xóa không thành công: Không thể xác minh kết quả xóa trên cơ sở dữ liệu Supabase (0 dòng bị ảnh hưởng). Hồ sơ học sinh đã được khôi phục trên giao diện!',
        };
      }

      // 10. Nếu xảy ra exception: rollback và trả lỗi (xử lý ở khối catch).
    } catch (err: any) {
      console.error('[BOPS Delete] Ngoại lệ khi xóa học sinh trên Supabase:', err);
      rollbackRAM();
      return {
        success: false,
        error: err?.message || 'Lỗi ngoại lệ mạng khi thực hiện xóa học sinh.',
      };
    }

    // 11. Chỉ khi deletedRows.length > 0, ghi Audit Log bằng currentUser và trả { success: true }.
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      'manager',
      'Student',
      'DELETE_STUDENT',
      `Xóa hồ sơ học sinh: ${targetStudent.fullName} (${targetStudent.studentCode})`
    );

    return { success: true };
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
        .insert(positionToDb(newPosition))
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lỗi khi thêm vị trí trực vào Supabase:', error);
            state.positions = state.positions.filter((p) => p.id !== newPosition.id);
            notifySubscribers();
          }
        });
    }

    return newPosition;
  },

  updatePosition(updatedPosition: Position): void {
    const prevPos = state.positions.find((p) => p.id === updatedPosition.id);
    state.positions = state.positions.map((p) => (p.id === updatedPosition.id ? updatedPosition : p));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const { id: _id, ...posPayload } = positionToDb(updatedPosition);
      supabase
        .from('positions')
        .update(posPayload)
        .eq('id', updatedPosition.id)
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Update] Lỗi khi cập nhật vị trí trực vào Supabase:', error);
            if (prevPos) {
              state.positions = state.positions.map((p) => (p.id === updatedPosition.id ? prevPos : p));
              notifySubscribers();
            }
          }
        });
    }
  },

  async deletePosition(positionId: string): Promise<{ success: boolean; error?: string }> {
    const targetPos = state.positions.find((p) => p.id === positionId);
    if (!targetPos) return { success: false, error: 'Không tìm thấy vị trí trực' };

    state.positions = state.positions.filter((p) => p.id !== positionId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('positions')
          .delete()
          .eq('id', positionId);

        if (error) {
          console.error('[BOPS Delete] Lỗi khi xóa vị trí trực khỏi Supabase:', error);
          if (!state.positions.some((p) => p.id === positionId)) {
            state.positions.push(targetPos);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xóa vị trí trực:', err);
        if (!state.positions.some((p) => p.id === positionId)) {
          state.positions.push(targetPos);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lỗi mạng khi xóa' };
      }
    }

    return { success: true };
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
        .insert(roomToDb(newRoom))
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lỗi khi thêm phòng vào Supabase:', error);
            state.rooms = state.rooms.filter((r) => r.id !== newRoom.id);
            notifySubscribers();
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Room',
      'ADD_ROOM',
      `Khai báo phòng KTX mới: ${newRoom.roomName} (${newRoom.building}) - Sức chứa: ${newRoom.capacity} HS`
    );

    return newRoom;
  },

  updateRoom(room: Room): void {
    const prevRoom = state.rooms.find((r) => r.id === room.id);
    state.rooms = state.rooms.map((r) => (r.id === room.id ? room : r));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const { id: _id, ...roomPayload } = roomToDb(room);
      supabase
        .from('rooms')
        .update(roomPayload)
        .eq('id', room.id)
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Update] Lỗi khi cập nhật phòng trong Supabase:', error);
            if (prevRoom) {
              state.rooms = state.rooms.map((r) => (r.id === room.id ? prevRoom : r));
              notifySubscribers();
            }
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Room',
      'UPDATE_ROOM',
      `Cập nhật phòng KTX ${room.roomName} (Sức chứa: ${room.capacity})`
    );
  },

  async deleteRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    const targetRoom = state.rooms.find((r) => r.id === roomId);
    if (!targetRoom) return { success: false, error: 'Không tìm thấy phòng' };

    // Kiểm tra xem phòng có học sinh đang ở không
    const studentsInRoom = state.students.filter((s) => s.roomId === roomId || s.roomName === targetRoom.roomName);
    if (studentsInRoom.length > 0) {
      const msg = `Phòng ${targetRoom.roomName} đang có ${studentsInRoom.length} học sinh. Vui lòng chuyển học sinh sang phòng khác trước khi xóa!`;
      console.warn('[BOPS Delete]', msg);
      return { success: false, error: msg };
    }

    state.rooms = state.rooms.filter((r) => r.id !== roomId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { data: deletedRows, error } = await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId)
          .select('id');

        if (error) {
          console.error('[BOPS Delete] Lỗi khi xóa phòng trên Supabase:', error);
          if (!state.rooms.some((r) => r.id === roomId)) {
            state.rooms.push(targetRoom);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }

        if (!deletedRows || deletedRows.length === 0) {
          console.warn('[BOPS Delete] Supabase phản hồi 0 dòng bị xóa đối với phòng:', roomId);
          const { data: checkRoom } = await supabase
            .from('rooms')
            .select('id')
            .eq('id', roomId)
            .maybeSingle();

          if (checkRoom) {
            console.error('[BOPS Delete] Phòng vẫn tồn tại trên Supabase dù lệnh delete không báo lỗi (chính sách RLS đã chặn DELETE):', roomId);
            if (!state.rooms.some((r) => r.id === roomId)) {
              state.rooms.push(targetRoom);
              notifySubscribers();
            }
            return {
              success: false,
              error: 'Xóa không thành công: Phòng vẫn còn tồn tại trên cơ sở dữ liệu Supabase (chính sách bảo mật RLS đã từ chối thao tác xóa)!',
            };
          } else {
            console.info('[BOPS Delete] Xác nhận phòng đã không còn trên Supabase. Đang đồng bộ lại danh sách...', roomId);
            const { data: freshRooms } = await supabase.from('rooms').select('*').order('room_name', { ascending: true });
            if (freshRooms) {
              state.rooms = freshRooms.map(dbToRoom);
              notifySubscribers();
            }
          }
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xóa phòng trên Supabase:', err);
        if (!state.rooms.some((r) => r.id === roomId)) {
          state.rooms.push(targetRoom);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lỗi kết nối khi xóa' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Room',
      'DELETE_ROOM',
      `Xóa phòng KTX: ${targetRoom.roomName} (${targetRoom.building})`
    );

    return { success: true };
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
          // Whitelist an toàn theo SQL RLS FSC3:
          // Chỉ sửa status, hygiene_status, last_inspected_at, correction_note
          // Tuyệt đối không thay đổi capacity, room_name, building, floor, occupied
          const hygienePayload = {
            status,
            hygiene_status: hygieneStatus,
            last_inspected_at: updated.lastInspectedAt,
            correction_note: note || null,
          };

          supabase
            .from('rooms')
            .update(hygienePayload)
            .eq('id', roomId)
            .then(({ error }) => {
              if (error) console.error('Lỗi khi cập nhật vệ sinh phòng:', error);
            });
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
        .insert(scheduleToDb(newSchedule))
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lỗi khi thêm ca trực vào Supabase:', error);
            state.schedules = state.schedules.filter((s) => s.id !== newSchedule.id);
            notifySubscribers();
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Schedule',
      'ADD_SCHEDULE',
      `Phân công ca trực mới ngày ${newSchedule.date} cho GV ${newSchedule.teacherName}`
    );

    return newSchedule;
  },

  addSchedules(newSchedules: ScheduleAssignment[]): void {
    if (newSchedules.length === 0) return;
    state.schedules = [...newSchedules, ...state.schedules];
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const payload = newSchedules.map(scheduleToDb);
      supabase
        .from('schedules')
        .insert(payload)
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lỗi khi thêm nhiều ca trực vào Supabase:', error);
            const newIds = new Set(newSchedules.map((s) => s.id));
            state.schedules = state.schedules.filter((s) => !newIds.has(s.id));
            notifySubscribers();
          }
        });
    }
  },

  updateSchedule(schedule: ScheduleAssignment): void {
    const prevSchedule = state.schedules.find((s) => s.id === schedule.id);
    state.schedules = state.schedules.map((s) => (s.id === schedule.id ? schedule : s));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const currentUser = BOPSStore.getCurrentUser();
      const isManager = currentUser?.role === 'manager';

      let payload: Record<string, any>;
      if (isManager) {
        const { id: _id, ...managerPayload } = scheduleToDb(schedule);
        payload = managerPayload;
      } else {
        // Theo SQL RLS FSC3: GVQN chỉ được cập nhật đề xuất đổi ca:
        // status = 'swapped', swap_with_teacher_id (bắt buộc khi đổi ca), swap_note
        // Tuyệt đối không cho GVQN sửa date, shift, teacher_id, evaluation_status, etc.
        payload = {
          status: schedule.status,
          swap_with_teacher_id: schedule.swapWithTeacherId || null,
          swap_note: schedule.swapNote || null,
        };
      }

      supabase
        .from('schedules')
        .update(payload)
        .eq('id', schedule.id)
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Update] Lỗi khi cập nhật ca trực:', error);
            if (prevSchedule) {
              state.schedules = state.schedules.map((s) => (s.id === schedule.id ? prevSchedule : s));
              notifySubscribers();
            }
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Schedule',
      'UPDATE_SCHEDULE',
      `Cập nhật ca trực ID: ${schedule.id} ngày ${schedule.date}`
    );
  },

  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    const target = state.schedules.find((s) => s.id === scheduleId);
    if (!target) return { success: false, error: 'Không tìm thấy ca trực' };

    state.schedules = state.schedules.filter((s) => s.id !== scheduleId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('schedules')
          .delete()
          .eq('id', scheduleId);

        if (error) {
          console.error('[BOPS Delete] Lỗi khi xóa ca trực trên Supabase:', error);
          if (!state.schedules.some((s) => s.id === scheduleId)) {
            state.schedules.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xóa ca trực:', err);
        if (!state.schedules.some((s) => s.id === scheduleId)) {
          state.schedules.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lỗi mạng khi xóa' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Schedule',
      'DELETE_SCHEDULE',
      `Xóa ca trực ID: ${scheduleId}`
    );

    return { success: true };
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
        .insert(taskToDb(newTask))
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lỗi khi thêm nhiệm vụ vào Supabase:', error);
            state.tasks = state.tasks.filter((t) => t.id !== newTask.id);
            notifySubscribers();
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Task',
      'ADD_TASK',
      `Giao nhiệm vụ: "${newTask.title || newTask.taskName}" cho GV ${newTask.teacherName}`
    );

    return newTask;
  },

  updateTask(updatedTask: TaskInstance): void {
    const prevTask = state.tasks.find((t) => t.id === updatedTask.id);
    state.tasks = state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      const { id: _id, ...taskPayload } = taskToDb(updatedTask);
      supabase
        .from('tasks')
        .update(taskPayload)
        .eq('id', updatedTask.id)
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Update] Lỗi khi cập nhật nhiệm vụ:', error);
            if (prevTask) {
              state.tasks = state.tasks.map((t) => (t.id === updatedTask.id ? prevTask : t));
              notifySubscribers();
            }
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Task',
      'UPDATE_TASK',
      `Cập nhật thông tin nhiệm vụ "${updatedTask.title || updatedTask.taskName}"`
    );
  },

  async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return { success: false, error: 'Không tìm thấy nhiệm vụ' };

    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) {
          console.error('[BOPS Delete] Lỗi khi xóa nhiệm vụ trên Supabase:', error);
          if (!state.tasks.some((t) => t.id === taskId)) {
            state.tasks.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xóa nhiệm vụ:', err);
        if (!state.tasks.some((t) => t.id === taskId)) {
          state.tasks.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lỗi mạng khi xóa' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Task',
      'DELETE_TASK',
      `Xóa nhiệm vụ ID: ${taskId}`
    );

    return { success: true };
  },

  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    note?: string,
    photos?: string[]
  ): void {
    const nowTime = new Date().toTimeString().substring(0, 5);
    const currentUser = BOPSStore.getCurrentUser();
    const isManager = currentUser?.role === 'manager';

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
          // Phân biệt quyền Quản lý và GVQN:
          // GVQN chỉ cập nhật các trường tiến độ/minh chứng theo whitelist: status, actual_start, actual_end, note, proof_photos (không có tasks.updated_at)
          // Quản lý được cập nhật toàn bộ trường
          let payload: Record<string, any>;
          if (isManager) {
            const { id: _id, ...managerPayload } = taskToDb(updated);
            payload = managerPayload;
          } else {
            payload = {
              status,
              actual_start: updated.actualStart || null,
              actual_end: updated.actualEnd || null,
              note: updated.note || null,
              proof_photos: updated.proofPhotos || [],
            };
          }

          supabase
            .from('tasks')
            .update(payload)
            .eq('id', taskId)
            .then(({ error }) => {
              if (error) console.error('Lỗi khi cập nhật tiến độ nhiệm vụ:', error);
            });
        }
        return updated;
      }
      return t;
    });
    notifySubscribers();

    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Task',
      'UPDATE_TASK_STATUS',
      `Cập nhật trạng thái nhiệm vụ "${taskId}" sang ${status.toUpperCase()}`
    );

    // Tách riêng luồng KPI: Chỉ tài khoản Quản lý mới được kích hoạt tính toán và ghi nhận KPI vào bảng kpis.
    // GVQN chỉ cập nhật tiến độ nhiệm vụ và không trực tiếp gọi hàm ghi KPI.
    if (isManager) {
      const affectedTask = state.tasks.find((t) => t.id === taskId);
      if (affectedTask) {
        BOPSStore.calculateKPIForTeacher(affectedTask.teacherId, affectedTask.date);
      }
    }
  },

  verifyTask(taskId: string, verifiedBy: string, approved: boolean): void {
    let affectedTask: TaskInstance | undefined;
    state.tasks = state.tasks.map((t) => {
      if (t.id === taskId) {
        const updated: TaskInstance = {
          ...t,
          verified: approved,
          verifiedBy,
          verifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: approved ? ('verified' as TaskStatus) : t.status,
        };
        affectedTask = updated;
        if (supabase && isSupabaseConfigured) {
          const { id: _id, ...taskPayload } = taskToDb(updated);
          supabase
            .from('tasks')
            .update(taskPayload)
            .eq('id', taskId)
            .then(
              ({ error }) => {
                if (error) {
                  console.error('Lỗi khi nghiệm thu nhiệm vụ:', error);
                } else {
                  // Chỉ tính lại KPI sau khi thao tác cập nhật task thành công
                  try {
                    const currentUser = BOPSStore.getCurrentUser();
                    const isManager = currentUser?.role === 'manager' || (currentUser?.role as string) === 'supervisor';
                    if (isManager && updated.teacherId && updated.date) {
                      BOPSStore.calculateKPIForTeacher(updated.teacherId, updated.date);
                    }
                  } catch (kpiErr) {
                    console.error('Lỗi tính KPI sau khi nghiệm thu (không gián đoạn luồng duyệt):', kpiErr);
                  }
                }
              },
              (err) => {
                console.error('Lỗi ngoại lệ khi nghiệm thu nhiệm vụ:', err);
              }
            );
        }
        return updated;
      }
      return t;
    });
    notifySubscribers();

    // Môi trường offline / dev chưa cấu hình Supabase: tính lại KPI nếu là Quản lý
    if (!supabase || !isSupabaseConfigured) {
      if (affectedTask && affectedTask.teacherId && affectedTask.date) {
        try {
          const currentUser = BOPSStore.getCurrentUser();
          const isManager = currentUser?.role === 'manager' || (currentUser?.role as string) === 'supervisor';
          if (isManager) {
            BOPSStore.calculateKPIForTeacher(affectedTask.teacherId, affectedTask.date);
          }
        } catch (kpiErr) {
          console.error('Lỗi tính KPI offline:', kpiErr);
        }
      }
    }
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
            const { id: _id, ...taskPayload } = taskToDb(updated);
            supabase
              .from('tasks')
              .update(taskPayload)
              .eq('id', params.itemId)
              .then(({ error }) => {
                if (error) console.error('Lỗi khi đánh giá nhiệm vụ:', error);
              });
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
            const { id: _id, ...schedulePayload } = scheduleToDb(updated);
            supabase
              .from('schedules')
              .update(schedulePayload)
              .eq('id', params.itemId)
              .then(({ error }) => {
                if (error) console.error('Lỗi khi đánh giá ca trực:', error);
              });
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

  async deleteInteraction(interactionId: string): Promise<{ success: boolean; error?: string }> {
    const target = state.interactions.find((i) => i.id === interactionId);
    if (!target) return { success: false, error: 'Không tìm thấy nhật ký tương tác' };

    state.interactions = state.interactions.filter((i) => i.id !== interactionId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('interactions')
          .delete()
          .eq('id', interactionId);

        if (error) {
          console.error('[BOPS Delete] Lỗi khi xóa tương tác trên Supabase:', error);
          if (!state.interactions.some((i) => i.id === interactionId)) {
            state.interactions.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xóa tương tác:', err);
        if (!state.interactions.some((i) => i.id === interactionId)) {
          state.interactions.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lỗi mạng khi xóa' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'teacher',
      'Interaction',
      'DELETE_INTERACTION_1ON1',
      `Xóa nhật ký tương tác 1-1 với học sinh ${target.studentName} (${target.topic})`
    );

    return { success: true };
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

    const currentUser = BOPSStore.getCurrentUser();
    const isManager = currentUser?.role === 'manager' || (currentUser?.role as string) === 'supervisor';

    if (supabase && isSupabaseConfigured && isManager) {
      const payload = kpis.map(kpiToDb);
      supabase
        .from('kpis')
        .upsert(payload, { onConflict: 'id' })
        .then(
          ({ error }) => {
            if (error) console.error('Lỗi khi lưu danh sách KPIs vào Supabase:', error);
          },
          (err) => {
            console.error('Lỗi ngoại lệ khi lưu danh sách KPIs vào Supabase:', err);
          }
        );
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

    const interactions = state.interactions.filter((i) => i.teacherId === teacherId);
    const hasWeeklyInteraction = interactions.length >= 1;

    const existingKpi = state.kpis.find((k) => k.teacherId === teacherId && k.date === date);

    // Kiểm tra xem Quản lý đã chấm điểm đánh giá thủ công trong Daily Evaluations hay chưa
    const manualEval = state.dailyEvaluations.find(
      (e) => e.teacherId === teacherId && e.date === date && e.status === 'evaluated'
    );

    let operationScore: number;
    let qualityScore: number;
    let studentCareScore: number;
    let contributionScore: number;
    let disciplineScore: number;
    let totalScore: number;
    let rank: 'A+' | 'A' | 'B' | 'C' | 'D';

    if (manualEval) {
      // Bảo toàn điểm số do Quản lý đã chấm thủ công, không bị ghi đè bởi công thức tự động
      operationScore = manualEval.operationScore;
      qualityScore = manualEval.qualityScore;
      studentCareScore = manualEval.studentCareScore;
      contributionScore = manualEval.contributionScore;
      disciplineScore = manualEval.disciplineScore;
      totalScore = manualEval.totalScore;
      rank = manualEval.rank;
    } else {
      // 1. Điểm Vận hành (Max 50)
      operationScore = 50;
      if (totalTasks > 0) {
        const completionRate = completedTasks / totalTasks;
        operationScore = Math.round(completionRate * 50);
      }

      // 2. Điểm Chất lượng (Max 20)
      const verifiedTasks = tasks.filter((t) => t.verified).length;
      qualityScore = 18;
      if (completedTasks > 0) {
        qualityScore = Math.round((verifiedTasks / completedTasks) * 20);
      }

      // 3. Điểm Chăm sóc Học sinh 1-1 (Max 15)
      // Quy định: Tuần có tối thiểu 1 HS tương tác 1-1 => Đạt 15đ trọng số
      studentCareScore = hasWeeklyInteraction ? 15 : 0;

      // 4. Điểm Đóng góp (Max 10)
      contributionScore = 10;

      // 5. Điểm Kỷ luật (Max 5)
      disciplineScore = 5;
      if (existingKpi && existingKpi.penalties) {
        const totalPenalties = existingKpi.penalties.reduce((sum, p) => sum + p.pointsDeducted, 0);
        disciplineScore = Math.max(0, 5 - totalPenalties);
      }

      totalScore = operationScore + qualityScore + studentCareScore + contributionScore + disciplineScore;

      rank = 'B';
      if (totalScore >= 97 && disciplineScore === 5) rank = 'A+';
      else if (totalScore >= 90) rank = 'A';
      else if (totalScore >= 80) rank = 'B';
      else if (totalScore >= 70) rank = 'C';
      else rank = 'D';
    }

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

    // Phân quyền RLS: Chỉ Quản lý mới được ghi nhận bản ghi KPI chính thức lên Supabase.
    // GVQN có thể thấy tiến độ hiển thị tức thời, nhưng không gửi ghi Supabase.
    const currentUser = BOPSStore.getCurrentUser();
    const isManager = currentUser?.role === 'manager' || (currentUser?.role as string) === 'supervisor';

    if (supabase && isSupabaseConfigured && isManager) {
      supabase
        .from('kpis')
        .upsert(kpiToDb(kpiRecord), { onConflict: 'id' })
        .then(
          ({ error }) => {
            if (error) console.error('Lỗi khi ghi nhận KPI vào Supabase:', error);
          },
          (err) => {
            console.error('Lỗi ngoại lệ khi ghi nhận KPI vào Supabase:', err);
          }
        );
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

  async deleteDailyEvaluation(id: string): Promise<{ success: boolean; error?: string }> {
    const target = state.dailyEvaluations.find((e) => e.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy phiếu đánh giá' };

    state.dailyEvaluations = state.dailyEvaluations.filter((e) => e.id !== id);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('daily_evaluations')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[BOPS Delete] Lỗi khi xóa phiếu đánh giá:', error);
          if (!state.dailyEvaluations.some((e) => e.id === id)) {
            state.dailyEvaluations.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xóa phiếu đánh giá:', err);
        if (!state.dailyEvaluations.some((e) => e.id === id)) {
          state.dailyEvaluations.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lỗi kết nối khi xóa' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'DailyEvaluation',
      'DELETE_EVALUATION',
      `Đã xóa phiếu đánh giá công việc ID: ${id}`
    );

    return { success: true };
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

  async deleteDailyWorkReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    const target = state.dailyWorkReports.find((r) => r.id === reportId);
    if (!target) return { success: false, error: 'Không tìm thấy báo cáo công việc' };

    state.dailyWorkReports = state.dailyWorkReports.filter((r) => r.id !== reportId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('daily_work_reports')
          .delete()
          .eq('id', reportId);

        if (error) {
          console.error('[BOPS Delete] Lỗi khi xóa báo cáo công việc:', error);
          if (!state.dailyWorkReports.some((r) => r.id === reportId)) {
            state.dailyWorkReports.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xóa báo cáo công việc:', err);
        if (!state.dailyWorkReports.some((r) => r.id === reportId)) {
          state.dailyWorkReports.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lỗi mạng khi xóa' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'DailyWorkReport',
      'DELETE_REPORT',
      `Đã xóa báo cáo công việc ngày ${target.date} (Ca: ${target.shift}) của GV ${target.teacherName}`
    );

    return { success: true };
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
      currentUser?.id || 'system',
      currentUser?.fullName || 'Hệ thống',
      currentUser?.role || 'manager',
      'Settings',
      'UPDATE_SETTINGS',
      'Cập nhật cấu hình quy định vận hành và công thức KPI hệ thống.'
    );
  },

  // Làm mới và đồng bộ lại toàn bộ dữ liệu từ Supabase
  async resetAllData(): Promise<void> {
    if (supabase && isSupabaseConfigured) {
      console.info('[BOPS] Đang làm mới và đồng bộ lại toàn bộ dữ liệu từ Supabase...');
      await fetchBusinessData();
      notifySubscribers();
      return;
    }
    console.warn('[BOPS] Chưa cấu hình kết nối Supabase, không thể làm mới dữ liệu.');
    notifySubscribers();
  },
};
