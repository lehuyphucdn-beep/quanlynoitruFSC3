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
 * CÃ¡c key CHá»ˆ dÃ¹ng cho client-side / UI state (Ä‘Æ°á»£c phÃ©p lÆ°u trÃªn browser cá»§a user)
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
// Dá»¯ liá»‡u nghiá»‡p vá»¥ KHÃ”NG lÆ°u vÃ o localStorage. ToÃ n bá»™ Ä‘á»c/ghi trá»±c tiáº¿p vá»›i Supabase.
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
    floor: Number(String(r.floor).replace(/^tầng\s*/i, '').trim()),
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
    evaluatorName: row.evaluator_name || 'Tháº§y LÃª Huy PhÃºc',
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
// SUPABASE REALTIME & BUSINESS DATA SYNC (CHá»ˆ CHáº Y SAU KHI ÄÄ‚NG NHáº¬P THÃ€NH CÃ”NG)
// ============================================================================
let activeSyncedUserId: string | null = null;
let isSyncInProgress = false;
let realtimeChannel: any = null;

export function teardownRealtimeSubscription(): void {
  if (realtimeChannel && supabase) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch (e) {
      console.warn('[BOPS Realtime] Lá»—i khi há»§y Realtime channel:', e);
    }
    realtimeChannel = null;
  }
}

async function fetchBusinessData(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const results = await Promise.allSettled([
    supabase.from('users').select(USERS_SELECT_FIELDS).order('teacher_code', { ascending: true }),
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
      failedTables.push(`${tableNames[idx]} (lá»—i káº¿t ná»‘i: ${res.reason})`);
      console.error(`[BOPS Fetch] Lá»—i káº¿t ná»‘i truy váº¥n báº£ng ${tableNames[idx]}:`, res.reason);
    } else if (res.value.error) {
      failedTables.push(`${tableNames[idx]} (mÃ£: ${res.value.error.code}, thÃ´ng Ä‘iá»‡p: ${res.value.error.message})`);
      console.error(`[BOPS Fetch] Supabase tráº£ vá» lá»—i truy váº¥n báº£ng ${tableNames[idx]}:`, res.value.error);
    }
  });

  if (failedTables.length > 0) {
    state.syncError = `PhÃ¡t hiá»‡n ${failedTables.length}/13 báº£ng khÃ´ng thá»ƒ táº£i: ${failedTables.join(', ')}`;
    console.warn(`[BOPS Sync] PhÃ¡t hiá»‡n ${failedTables.length}/13 báº£ng khÃ´ng thá»ƒ táº£i dá»¯ liá»‡u tá»« Supabase:\n - ${failedTables.join('\n - ')}`);
  } else {
    state.syncError = null;
  }

  if (resUsers.status === 'fulfilled' && !resUsers.value.error && resUsers.value.data) {
    state.users = resUsers.value.data.map(dbToUser);
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

  // Há»§y subscription cÅ© náº¿u cÃ³ Ä‘á»ƒ trÃ¡nh Ä‘Äƒng kÃ½ trÃ¹ng láº·p
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
    console.error('[BOPS Realtime] Lá»—i khi thiáº¿t láº­p Realtime channel:', err);
  }
}

/**
 * Khá»Ÿi táº¡o Ä‘á»“ng bá»™ dá»¯ liá»‡u nghiá»‡p vá»¥ vÃ  Realtime cho ngÆ°á»i dÃ¹ng Ä‘Ã£ xÃ¡c thá»±c.
 * Chá»‘ng trÃ¹ng láº·p khi Ä‘Æ°á»£c gá»i Ä‘á»“ng thá»i qua syncBusinessPromise lock.
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
      console.error('[BOPS Sync] Lá»—i trong quÃ¡ trÃ¬nh táº£i dá»¯ liá»‡u nghiá»‡p vá»¥:', err);
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
    console.warn('[BOPS] Bá» qua initializeDatabaseSync vÃ¬ chÆ°a cÃ³ phiÃªn Ä‘Äƒng nháº­p há»£p lá»‡.');
  }
}

// ============================================================================
// SUPABASE AUTH SESSION MANAGEMENT (GIAI ÄOáº N C1 PILOT)
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

  // Náº¿u ngÆ°á»i dÃ¹ng nÃ y Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c thá»±c vÃ  Ä‘á»“ng bá»™ hoÃ n táº¥t, khÃ´ng láº·p láº¡i
  if (
    state.currentAuthUser &&
    state.currentAuthUser.authUserId === sessionUserId &&
    state.isInitialized &&
    activeSyncedUserId === state.currentAuthUser.id
  ) {
    return;
  }

  // KhÃ³a chá»‘ng race condition: náº¿u Ä‘ang cÃ³ má»™t Promise sync, dÃ¹ng chung
  if (syncAuthSessionPromise) {
    return syncAuthSessionPromise;
  }

  syncAuthSessionPromise = (async () => {
    try {
      // 1. Kiá»ƒm tra trong state.users Ä‘Ã£ cÃ³ há»“ sÆ¡ liÃªn káº¿t vá»›i UID nÃ y chÆ°a
      let matched = state.users.find((u) => u.authUserId === sessionUserId);

      // 2. Náº¿u chÆ°a cÃ³ trong RAM, CHá»ˆ truy váº¥n Ä‘Ãºng há»“ sÆ¡ ngÆ°á»i dÃ¹ng nÃ y tá»« public.users
      if (!matched) {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select(USERS_SELECT_FIELDS)
          .eq('auth_user_id', sessionUserId)
          .maybeSingle();

        if (error) {
          console.error('[BOPS Auth] Lá»—i truy váº¥n há»“ sÆ¡ liÃªn káº¿t (giá»¯ session Ä‘á»ƒ thá»­ láº¡i sau):', error);
          state.authError = 'KhÃ´ng thá»ƒ káº¿t ná»‘i Ä‘áº¿n mÃ¡y chá»§ Ä‘á»ƒ táº£i há»“ sÆ¡ ngÆ°á»i dÃ¹ng.';
          state.currentAuthUser = null;
          return;
        }

        if (dbUser) {
          matched = dbToUser(dbUser);
        }
      }

      if (matched) {
        state.currentAuthUser = matched;
        state.authError = null;
        // Khá»Ÿi táº¡o Ä‘á»“ng bá»™ dá»¯ liá»‡u nghiá»‡p vá»¥ vÃ  Realtime cho há»“ sÆ¡ Ä‘Ã£ xÃ¡c thá»±c
        await syncBusinessDataAndRealtime(matched);
      } else {
        console.warn('[BOPS Auth] Auth session cÃ³ UID há»£p lá»‡ nhÆ°ng chÆ°a cÃ³ há»“ sÆ¡ nghiá»‡p vá»¥ liÃªn káº¿t trong public.users:', sessionUserId);
        teardownRealtimeSubscription();
        activeSyncedUserId = null;
        isSyncInProgress = false;
        syncBusinessPromise = null;
        clearBusinessData();
        state.currentAuthUser = null;
        state.authError = 'TÃ i khoáº£n Auth chÆ°a Ä‘Æ°á»£c liÃªn káº¿t vá»›i há»“ sÆ¡ cÃ¡n bá»™/giÃ¡o viÃªn FSC3 trong há»‡ thá»‘ng.';
      }
    } catch (err: any) {
      console.error('[BOPS Auth] Ngoáº¡i lá»‡ khi Ä‘á»“ng bá»™ session:', err);
      state.currentAuthUser = null;
      state.authError = 'Lá»—i káº¿t ná»‘i khi Ä‘á»“ng bá»™ phiÃªn lÃ m viá»‡c.';
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

  // PhÃ¡t hiá»‡n URL phá»¥c há»“i máº­t kháº©u (type=recovery)
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      isPasswordRecovery = true;
      state.authError = null;
    }
  }

  // Bá»™ háº¹n giá» an toÃ n: tá»‘i Ä‘a 8s pháº£i giáº£i phÃ³ng isAuthChecking dÃ¹ máº¡ng cÃ³ Ä‘á»™ trá»…
  const safetyTimer = setTimeout(() => {
    if (state.isAuthChecking) {
      console.warn('[BOPS Auth] QuÃ¡ thá»i gian chá» khÃ´i phá»¥c phiÃªn (8s), tá»± Ä‘á»™ng giáº£i phÃ³ng cá» kiá»ƒm tra.');
      state.isAuthChecking = false;
      notifySubscribers();
    }
  }, 8000);

  try {
    // 1. ÄÄƒng kÃ½ listener onAuthStateChange má»™t láº§n duy nháº¥t
    if (!authListenerRegistered) {
      authListenerRegistered = true;
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          isPasswordRecovery = true;
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch {}
          if (session?.user?.id) {
            await syncAuthSession(session.user.id);
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
          await syncAuthSession(session.user.id);
          state.isAuthChecking = false;
          notifySubscribers();
        }
      });
    }

    // 2. KhÃ´i phá»¥c session hiá»‡n táº¡i tá»« client storage
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[BOPS Auth] Lá»—i getSession:', error);
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
    console.error('[BOPS Auth] Ngoáº¡i lá»‡ khi khÃ´i phá»¥c Auth session ban Ä‘áº§u:', err);
    state.currentAuthUser = null;
  } finally {
    clearTimeout(safetyTimer);
    state.isAuthChecking = false;
    notifySubscribers();
  }
}

// Khá»Ÿi cháº¡y khÃ´i phá»¥c Auth Session khi module náº¡p (KHÃ”NG gá»i initializeDatabaseSync trÆ°á»›c Ä‘Äƒng nháº­p)
if (typeof window !== 'undefined') {
  restoreAuthSession();
}

// ============================================================================
// BOPS STORE - CHÃNH THá»¨C Sá»¬ Dá»¤NG SUPABASE POSTGRESQL LÃ€M DATABASE CHÃNH
// ============================================================================
export const BOPSStore = {
  // --------------------------------------------------------------------------
  // USER SESSION / AUTHENTICATION (SUPABASE AUTH GIAI ÄOáº N C1)
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
        error: 'ChÆ°a cáº¥u hÃ¬nh Supabase Client. Vui lÃ²ng kiá»ƒm tra biáº¿n mÃ´i trÆ°á»ng VITE_SUPABASE_URL!',
      };
    }

    const email = emailInput.trim();
    const password = passwordInput.trim();

    if (!email || !password) {
      return { success: false, error: 'Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ email vÃ  máº­t kháº©u!' };
    }

    try {
      // Äáº·t timeout 15s cho signInWithPassword Ä‘á»ƒ khÃ´ng bao giá» bá»‹ treo nÃºt
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('QuÃ¡ thá»i gian pháº£n há»“i tá»« mÃ¡y chá»§ xÃ¡c thá»±c (15s). Vui lÃ²ng thá»­ láº¡i!')),
          15000
        );
      });

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
          msg = 'Email hoáº·c máº­t kháº©u khÃ´ng chÃ­nh xÃ¡c. Vui lÃ²ng kiá»ƒm tra láº¡i!';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Email tÃ i khoáº£n chÆ°a Ä‘Æ°á»£c xÃ¡c nháº­n trÃªn Supabase Auth!';
        }
        return {
          success: false,
          error: `ÄÄƒng nháº­p khÃ´ng thÃ nh cÃ´ng: ${msg}`,
        };
      }

      if (!data.session?.user) {
        return {
          success: false,
          error: 'KhÃ´ng nháº­n Ä‘Æ°á»£c phiÃªn xÃ¡c thá»±c tá»« Supabase Auth.',
        };
      }

      const authUid = data.session.user.id;

      // Äá»“ng bá»™ thÃ´ng tin ngÆ°á»i dÃ¹ng vÃ  dá»¯ liá»‡u nghiá»‡p vá»¥
      await syncAuthSession(authUid);

      if (!state.currentAuthUser) {
        console.warn('[BOPS Auth] Auth UID chÆ°a Ä‘Æ°á»£c liÃªn káº¿t vá»›i há»“ sÆ¡ users:', authUid);
        await supabase.auth.signOut();
        teardownRealtimeSubscription();
        activeSyncedUserId = null;
        isSyncInProgress = false;
        syncBusinessPromise = null;
        clearBusinessData();
        state.currentAuthUser = null;
        notifySubscribers();
        return {
          success: false,
          error: 'TÃ i khoáº£n Auth xÃ¡c thá»±c thÃ nh cÃ´ng nhÆ°ng chÆ°a Ä‘Æ°á»£c liÃªn káº¿t vá»›i há»“ sÆ¡ cÃ¡n bá»™/giÃ¡o viÃªn FSC3 trong há»‡ thá»‘ng. Vui lÃ²ng liÃªn há»‡ Quáº£n lÃ½!',
        };
      }

      notifySubscribers();
      return { success: true, user: state.currentAuthUser };
    } catch (err: any) {
      console.error('[BOPS Auth] Ngoáº¡i lá»‡ Ä‘Äƒng nháº­p:', err);
      return {
        success: false,
        error: err?.message || 'Lá»—i ngoáº¡i lá»‡ khi thá»±c hiá»‡n Ä‘Äƒng nháº­p qua Supabase Auth.',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      if (supabase && isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[BOPS Auth] Lá»—i khi gá»i signOut:', err);
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
        error: 'ChÆ°a cáº¥u hÃ¬nh Supabase Client. Vui lÃ²ng kiá»ƒm tra biáº¿n mÃ´i trÆ°á»ng!',
      };
    }

    // Kiá»ƒm tra cÃ³ tÃ i khoáº£n Ä‘Äƒng nháº­p hoáº·c phiÃªn phá»¥c há»“i máº­t kháº©u (recovery session)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!state.currentAuthUser && !authUser) {
      return {
        success: false,
        error: 'Báº¡n chÆ°a Ä‘Äƒng nháº­p hoáº·c phiÃªn Ä‘áº·t láº¡i máº­t kháº©u Ä‘Ã£ háº¿t háº¡n!',
      };
    }

    const newPassword = newPasswordInput.trim();
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: 'Máº­t kháº©u má»›i pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»± Ä‘á»ƒ báº£o Ä‘áº£m an toÃ n!',
      };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[BOPS Auth] Lá»—i Ä‘á»•i máº­t kháº©u Supabase Auth:', error);
        return {
          success: false,
          error: error.message || 'KhÃ´ng thá»ƒ cáº­p nháº­t máº­t kháº©u trÃªn Supabase Auth.',
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'KhÃ´ng nháº­n Ä‘Æ°á»£c pháº£n há»“i tÃ i khoáº£n tá»« Supabase Auth.',
        };
      }

      // XÃ³a tráº¡ng thÃ¡i recovery sau khi cáº­p nháº­t thÃ nh cÃ´ng
      isPasswordRecovery = false;
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {}

      // Ghi audit log an toÃ n (khÃ´ng ghi máº­t kháº©u)
      const current = state.currentAuthUser;
      if (current) {
        BOPSStore.addAuditLog(
          current.id,
          current.fullName,
          current.role,
          'Auth',
          'UPDATE_PASSWORD',
          `NgÆ°á»i dÃ¹ng "${current.fullName}" (${current.email || current.teacherCode}) Ä‘Ã£ tá»± Ä‘á»•i máº­t kháº©u qua Supabase Auth.`
        );
      }

      notifySubscribers();
      return { success: true };
    } catch (err: any) {
      console.error('[BOPS Auth] Ngoáº¡i lá»‡ khi cáº­p nháº­t máº­t kháº©u:', err);
      return {
        success: false,
        error: err?.message || 'Lá»—i ngoáº¡i lá»‡ khi Ä‘á»•i máº­t kháº©u tÃ i khoáº£n.',
      };
    }
  },

  setCurrentUser(userId: string): void {
    // VÃ´ hiá»‡u hÃ³a viá»‡c Ã©p gÃ¡n tÃ i khoáº£n qua localStorage á»Ÿ giai Ä‘oáº¡n C1
    console.warn('[BOPS Auth] setCurrentUser thá»§ cÃ´ng bá»‹ vÃ´ hiá»‡u hÃ³a trong cÆ¡ cháº¿ Supabase Auth.');
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
          if (error) console.error('Lá»—i khi lÆ°u users vÃ o Supabase:', error);
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
        .insert(userToDb(newUser))
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lá»—i khi thÃªm user vÃ o Supabase:', error);
            state.users = state.users.filter((u) => u.id !== newUser.id);
            notifySubscribers();
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Teacher',
      'ADD_TEACHER',
      `Táº¡o tÃ i khoáº£n GiÃ¡o viÃªn Quáº£n nhiá»‡m: ${newUser.fullName} (${newUser.teacherCode})`
    );

    return newUser;
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
            console.error('[BOPS Update] Lá»—i khi cáº­p nháº­t user vÃ o Supabase:', error);
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
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Teacher',
      'UPDATE_TEACHER',
      `Cáº­p nháº­t há»“ sÆ¡ tÃ i khoáº£n: ${updated.fullName} (${updated.teacherCode})`
    );
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
  console.warn(
    '[BOPS Delete] Tài khoản đã được xóa trên Supabase nhưng tải lại danh sách users thất bại:',
    freshUsersErr
  );
  syncWarning = `Tài khoản đã được xóa trên Supabase nhưng không thể tải lại danh sách người dùng: ${freshUsersErr.message}. Vui lòng tải lại trang (F5) để đồng bộ!`;
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
  // 2. STUDENTS (Há»ŒC SINH Ná»˜I TRÃš TOÃ€N TRÆ¯á»œNG - GHI/Äá»ŒC TRá»°C TIáº¾P SUPABASE)
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
          if (error) console.error('Lá»—i khi lÆ°u há»c sinh vÃ o Supabase:', error);
        });
    }
  },

  addStudent(studentData: Omit<Student, 'id'> & { id?: string }): Student {
    const currentUser = BOPSStore.getCurrentUser();
    const newStudent: Student = {
      ...studentData,
      id: studentData.id || `st-${Date.now()}`,
      uploadedByUserId: studentData.uploadedByUserId || currentUser?.id || 'system',
      uploadedByUserName: studentData.uploadedByUserName || currentUser?.fullName || 'Há»‡ thá»‘ng',
    };

    state.students.unshift(newStudent);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      supabase
        .from('students')
        .insert(studentToDb(newStudent))
        .then(({ error }) => {
          if (error) {
            console.error('[BOPS Add] Lá»—i khi thÃªm há»c sinh vÃ o Supabase:', error);
            state.students = state.students.filter((s) => s.id !== newStudent.id);
            notifySubscribers();
          }
        });
    }

    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Student',
      'ADD_STUDENT',
      `ThÃªm há»c sinh ná»™i trÃº má»›i: ${newStudent.fullName} (${newStudent.studentCode})`
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

        // 1. Giá»¯ nguyÃªn ID hiá»‡n táº¡i
        const id = existing.id;

        // 2. Há» vÃ  tÃªn: Cáº­p nháº­t náº¿u há»£p lá»‡, khÃ´ng dÃ¹ng tÃªn placeholder
        const fullName =
          ns.fullName && ns.fullName.trim() !== '' && !ns.fullName.startsWith('Há»c sinh ')
            ? ns.fullName.trim()
            : existing.fullName;

        // 3. Giá»›i tÃ­nh
        const gender = ns.gender || existing.gender || 'nam';

        // 4. NgÃ y sinh: Cáº­p nháº­t náº¿u cÃ³ giÃ¡ trá»‹ há»£p lá»‡, náº¿u trá»‘ng giá»¯ nguyÃªn ngÃ y sinh cÅ©
        const birthday =
          ns.birthday && ns.birthday.trim() !== '' ? ns.birthday.trim() : existing.birthday;

        // 5. Lá»›p: Cáº­p nháº­t náº¿u cÃ³ giÃ¡ trá»‹ há»£p lá»‡, náº¿u trá»‘ng giá»¯ nguyÃªn lá»›p cÅ©
        const className =
          ns.className && ns.className.trim() !== '' ? ns.className.trim() : existing.className;

        // 6. PhÃ²ng KTX & MÃ£ phÃ²ng: Cáº­p nháº­t náº¿u cÃ³, náº¿u trá»‘ng giá»¯ nguyÃªn phÃ²ng cÅ©
        const roomName =
          ns.roomName && ns.roomName.trim() !== '' ? ns.roomName.trim() : existing.roomName;
        const roomId =
          ns.roomId && ns.roomId.trim() !== ''
            ? ns.roomId.trim()
            : (roomName ? (roomName.startsWith('r-') ? roomName : `r-${roomName}`) : existing.roomId);

        // 7. GiÃ¡o viÃªn phá»¥ trÃ¡ch & MÃ£ GV: Cáº­p nháº­t náº¿u cÃ³, náº¿u trá»‘ng giá»¯ nguyÃªn GV cÅ©
        const teacherName =
          ns.teacherName && ns.teacherName.trim() !== ''
            ? ns.teacherName.trim()
            : existing.teacherName;
        const teacherId =
          ns.teacherId && ns.teacherId.trim() !== ''
            ? ns.teacherId.trim()
            : (existing.teacherId || currentUser.id);

        // 8. ThÃ´ng tin Phá»¥ huynh: Cáº­p nháº­t náº¿u cÃ³, náº¿u trá»‘ng giá»¯ nguyÃªn dá»¯ liá»‡u cÅ©
        const parentName =
          ns.parentName && ns.parentName.trim() !== ''
            ? ns.parentName.trim()
            : existing.parentName;
        const parentPhone =
          ns.parentPhone && ns.parentPhone.trim() !== ''
            ? ns.parentPhone.trim()
            : existing.parentPhone;

        // 9. Sá»©c khá»e & Ghi chÃº: Cáº­p nháº­t náº¿u cÃ³, náº¿u trá»‘ng giá»¯ nguyÃªn dá»¯ liá»‡u cÅ©
        const healthNote =
          ns.healthNote && ns.healthNote.trim() !== ''
            ? ns.healthNote.trim()
            : (existing.healthNote || '');
        const note =
          ns.note && ns.note.trim() !== '' ? ns.note.trim() : (existing.note || '');

        // 10. Tráº¡ng thÃ¡i há»c sinh
        const status = ns.status || existing.status || 'active';

        // 11. Theo dÃµi Ä‘áº·c biá»‡t & NhÃ£n theo dÃµi:
        // - "CÃ³" -> specialCare = true, cáº­p nháº­t hoáº·c giá»¯ nhÃ£n
        // - "KhÃ´ng" -> specialCare = false, xÃ³a nhÃ£n
        // - KhÃ´ng cÃ³ cá»™t hoáº·c Ã´ trá»‘ng -> GIá»® NGUYÃŠN HOÃ€N TOÃ€N dá»¯ liá»‡u cÅ©
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

        // 12. Giá»¯ nguyÃªn lá»‹ch sá»­ tÆ°Æ¡ng tÃ¡c vÃ  ngÆ°á»i táº£i ban Ä‘áº§u cá»§a báº£n ghi cÅ©
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
          fullName: ns.fullName?.trim() || `Há»c sinh ${ns.studentCode}`,
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
          teacherName: ns.teacherName?.trim() || currentUser.fullName || 'GiÃ¡o viÃªn Quáº£n nhiá»‡m DomB',
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

    // Äá»“ng bá»™ láº­p tá»©c sang Supabase PostgreSQL
    if (supabase && isSupabaseConfigured && recordsToSync.length > 0) {
      const payload = recordsToSync.map(studentToDb);
      supabase
        .from('students')
        .upsert(payload, { onConflict: 'student_code' })
        .then(({ error }) => {
          if (error) console.error('Lá»—i khi import há»c sinh vÃ o Supabase:', error);
        });
    }

    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Student',
      'IMPORT_EXCEL',
      `Nháº­p danh sÃ¡ch há»c sinh tá»« file Excel: ThÃªm má»›i ${added} HS, cáº­p nháº­t an toÃ n ${updated} HS trÃ¹ng mÃ£.`
    );

    BOPSStore.addNotification({
      receiverId: currentUser.id,
      title: 'Nháº­p há»c sinh tá»« Excel thÃ nh cÃ´ng',
      content: `ÄÃ£ xá»­ lÃ½ danh sÃ¡ch há»c sinh: ThÃªm má»›i ${added} em, Cáº­p nháº­t báº£o toÃ n dá»¯ liá»‡u ${updated} em vÃ o Supabase PostgreSQL.`,
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
        // Whitelist trÆ°á»ng Ä‘Æ°á»£c phÃ©p cho GVQN theo SQL RLS FSC3:
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
            console.error('[BOPS Update] Lá»—i khi cáº­p nháº­t há»c sinh trong Supabase:', error);
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
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Student',
      'UPDATE_STUDENT',
      `Cáº­p nháº­t há»“ sÆ¡ há»c sinh ${student.fullName} (${student.studentCode})`
    );
  },

  async deleteStudent(studentId: string): Promise<{ success: boolean; error?: string }> {
    const targetStudent = state.students.find((s) => s.id === studentId);
    if (!targetStudent) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y há»c sinh' };

    // XÃ³a táº¡m thá»i trÃªn RAM
    state.students = state.students.filter((s) => s.id !== studentId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', studentId);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a há»c sinh trÃªn Supabase:', error);
          if (!state.students.some((s) => s.id === studentId)) {
            state.students.push(targetStudent);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a há»c sinh trÃªn Supabase:', err);
        if (!state.students.some((s) => s.id === studentId)) {
          state.students.push(targetStudent);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i káº¿t ná»‘i khi xÃ³a' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Student',
      'DELETE_STUDENT',
      `XÃ³a há»“ sÆ¡ há»c sinh: ${targetStudent.fullName} (${targetStudent.studentCode})`
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
          if (error) console.error('Lá»—i khi lÆ°u vá»‹ trÃ­ trá»±c vÃ o Supabase:', error);
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
            console.error('[BOPS Add] Lá»—i khi thÃªm vá»‹ trÃ­ trá»±c vÃ o Supabase:', error);
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
            console.error('[BOPS Update] Lá»—i khi cáº­p nháº­t vá»‹ trÃ­ trá»±c vÃ o Supabase:', error);
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
    if (!targetPos) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y vá»‹ trÃ­ trá»±c' };

    state.positions = state.positions.filter((p) => p.id !== positionId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('positions')
          .delete()
          .eq('id', positionId);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a vá»‹ trÃ­ trá»±c khá»i Supabase:', error);
          if (!state.positions.some((p) => p.id === positionId)) {
            state.positions.push(targetPos);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a vá»‹ trÃ­ trá»±c:', err);
        if (!state.positions.some((p) => p.id === positionId)) {
          state.positions.push(targetPos);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i máº¡ng khi xÃ³a' };
      }
    }

    return { success: true };
  },

  // --------------------------------------------------------------------------
  // 4. ROOMS (PHÃ’NG KTX - Sá»¨C CHá»¨A Äáº¾N 30 HS)
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
          if (error) console.error('Lá»—i khi lÆ°u phÃ²ng vÃ o Supabase:', error);
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
            console.error('[BOPS Add] Lá»—i khi thÃªm phÃ²ng vÃ o Supabase:', error);
            state.rooms = state.rooms.filter((r) => r.id !== newRoom.id);
            notifySubscribers();
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Room',
      'ADD_ROOM',
      `Khai bÃ¡o phÃ²ng KTX má»›i: ${newRoom.roomName} (${newRoom.building}) - Sá»©c chá»©a: ${newRoom.capacity} HS`
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
            console.error('[BOPS Update] Lá»—i khi cáº­p nháº­t phÃ²ng trong Supabase:', error);
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
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Room',
      'UPDATE_ROOM',
      `Cáº­p nháº­t phÃ²ng KTX ${room.roomName} (Sá»©c chá»©a: ${room.capacity})`
    );
  },

  async deleteRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    const targetRoom = state.rooms.find((r) => r.id === roomId);
    if (!targetRoom) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y phÃ²ng' };

    // Kiá»ƒm tra xem phÃ²ng cÃ³ há»c sinh Ä‘ang á»Ÿ khÃ´ng
    const studentsInRoom = state.students.filter((s) => s.roomId === roomId || s.roomName === targetRoom.roomName);
    if (studentsInRoom.length > 0) {
      const msg = `PhÃ²ng ${targetRoom.roomName} Ä‘ang cÃ³ ${studentsInRoom.length} há»c sinh. Vui lÃ²ng chuyá»ƒn há»c sinh sang phÃ²ng khÃ¡c trÆ°á»›c khi xÃ³a!`;
      console.warn('[BOPS Delete]', msg);
      return { success: false, error: msg };
    }

    state.rooms = state.rooms.filter((r) => r.id !== roomId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a phÃ²ng trÃªn Supabase:', error);
          if (!state.rooms.some((r) => r.id === roomId)) {
            state.rooms.push(targetRoom);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a phÃ²ng trÃªn Supabase:', err);
        if (!state.rooms.some((r) => r.id === roomId)) {
          state.rooms.push(targetRoom);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i káº¿t ná»‘i khi xÃ³a' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Room',
      'DELETE_ROOM',
      `XÃ³a phÃ²ng KTX: ${targetRoom.roomName} (${targetRoom.building})`
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
          // Whitelist an toÃ n theo SQL RLS FSC3:
          // Chá»‰ sá»­a status, hygiene_status, last_inspected_at, correction_note
          // Tuyá»‡t Ä‘á»‘i khÃ´ng thay Ä‘á»•i capacity, room_name, building, floor, occupied
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
              if (error) console.error('Lá»—i khi cáº­p nháº­t vá»‡ sinh phÃ²ng:', error);
            });
        }
        return updated;
      }
      return r;
    });
    notifySubscribers();
  },

  // --------------------------------------------------------------------------
  // 5. SCHEDULES (Lá»ŠCH TRá»°C QUáº¢N NHIá»†M)
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
          if (error) console.error('Lá»—i khi lÆ°u lá»‹ch trá»±c vÃ o Supabase:', error);
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
            console.error('[BOPS Add] Lá»—i khi thÃªm ca trá»±c vÃ o Supabase:', error);
            state.schedules = state.schedules.filter((s) => s.id !== newSchedule.id);
            notifySubscribers();
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Schedule',
      'ADD_SCHEDULE',
      `PhÃ¢n cÃ´ng ca trá»±c má»›i ngÃ y ${newSchedule.date} cho GV ${newSchedule.teacherName}`
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
            console.error('[BOPS Add] Lá»—i khi thÃªm nhiá»u ca trá»±c vÃ o Supabase:', error);
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
        // Theo SQL RLS FSC3: GVQN chá»‰ Ä‘Æ°á»£c cáº­p nháº­t Ä‘á» xuáº¥t Ä‘á»•i ca:
        // status = 'swapped', swap_with_teacher_id (báº¯t buá»™c khi Ä‘á»•i ca), swap_note
        // Tuyá»‡t Ä‘á»‘i khÃ´ng cho GVQN sá»­a date, shift, teacher_id, evaluation_status, etc.
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
            console.error('[BOPS Update] Lá»—i khi cáº­p nháº­t ca trá»±c:', error);
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
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Schedule',
      'UPDATE_SCHEDULE',
      `Cáº­p nháº­t ca trá»±c ID: ${schedule.id} ngÃ y ${schedule.date}`
    );
  },

  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    const target = state.schedules.find((s) => s.id === scheduleId);
    if (!target) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y ca trá»±c' };

    state.schedules = state.schedules.filter((s) => s.id !== scheduleId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('schedules')
          .delete()
          .eq('id', scheduleId);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a ca trá»±c trÃªn Supabase:', error);
          if (!state.schedules.some((s) => s.id === scheduleId)) {
            state.schedules.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a ca trá»±c:', err);
        if (!state.schedules.some((s) => s.id === scheduleId)) {
          state.schedules.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i máº¡ng khi xÃ³a' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Schedule',
      'DELETE_SCHEDULE',
      `XÃ³a ca trá»±c ID: ${scheduleId}`
    );

    return { success: true };
  },

  // --------------------------------------------------------------------------
  // 6. TASKS (NHIá»†M Vá»¤ / CHECKLIST CA TRá»°C)
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
            console.error('[BOPS Add] Lá»—i khi thÃªm nhiá»‡m vá»¥ vÃ o Supabase:', error);
            state.tasks = state.tasks.filter((t) => t.id !== newTask.id);
            notifySubscribers();
          }
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Task',
      'ADD_TASK',
      `Giao nhiá»‡m vá»¥: "${newTask.title || newTask.taskName}" cho GV ${newTask.teacherName}`
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
            console.error('[BOPS Update] Lá»—i khi cáº­p nháº­t nhiá»‡m vá»¥:', error);
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
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Task',
      'UPDATE_TASK',
      `Cáº­p nháº­t thÃ´ng tin nhiá»‡m vá»¥ "${updatedTask.title || updatedTask.taskName}"`
    );
  },

  async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    const target = state.tasks.find((t) => t.id === taskId);
    if (!target) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y nhiá»‡m vá»¥' };

    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a nhiá»‡m vá»¥ trÃªn Supabase:', error);
          if (!state.tasks.some((t) => t.id === taskId)) {
            state.tasks.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a nhiá»‡m vá»¥:', err);
        if (!state.tasks.some((t) => t.id === taskId)) {
          state.tasks.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i máº¡ng khi xÃ³a' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'Task',
      'DELETE_TASK',
      `XÃ³a nhiá»‡m vá»¥ ID: ${taskId}`
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
          // PhÃ¢n biá»‡t quyá»n Quáº£n lÃ½ vÃ  GVQN:
          // GVQN chá»‰ cáº­p nháº­t cÃ¡c trÆ°á»ng tiáº¿n Ä‘á»™/minh chá»©ng theo whitelist: status, actual_start, actual_end, note, proof_photos (khÃ´ng cÃ³ tasks.updated_at)
          // Quáº£n lÃ½ Ä‘Æ°á»£c cáº­p nháº­t toÃ n bá»™ trÆ°á»ng
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
              if (error) console.error('Lá»—i khi cáº­p nháº­t tiáº¿n Ä‘á»™ nhiá»‡m vá»¥:', error);
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
      `Cáº­p nháº­t tráº¡ng thÃ¡i nhiá»‡m vá»¥ "${taskId}" sang ${status.toUpperCase()}`
    );

    // TÃ¡ch riÃªng luá»“ng KPI: Chá»‰ tÃ i khoáº£n Quáº£n lÃ½ má»›i Ä‘Æ°á»£c kÃ­ch hoáº¡t tÃ­nh toÃ¡n vÃ  ghi nháº­n KPI vÃ o báº£ng kpis.
    // GVQN chá»‰ cáº­p nháº­t tiáº¿n Ä‘á»™ nhiá»‡m vá»¥ vÃ  khÃ´ng trá»±c tiáº¿p gá»i hÃ m ghi KPI.
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
                  console.error('Lá»—i khi nghiá»‡m thu nhiá»‡m vá»¥:', error);
                } else {
                  // Chá»‰ tÃ­nh láº¡i KPI sau khi thao tÃ¡c cáº­p nháº­t task thÃ nh cÃ´ng
                  try {
                    const currentUser = BOPSStore.getCurrentUser();
                    const isManager = currentUser?.role === 'manager' || (currentUser?.role as string) === 'supervisor';
                    if (isManager && updated.teacherId && updated.date) {
                      BOPSStore.calculateKPIForTeacher(updated.teacherId, updated.date);
                    }
                  } catch (kpiErr) {
                    console.error('Lá»—i tÃ­nh KPI sau khi nghiá»‡m thu (khÃ´ng giÃ¡n Ä‘oáº¡n luá»“ng duyá»‡t):', kpiErr);
                  }
                }
              },
              (err) => {
                console.error('Lá»—i ngoáº¡i lá»‡ khi nghiá»‡m thu nhiá»‡m vá»¥:', err);
              }
            );
        }
        return updated;
      }
      return t;
    });
    notifySubscribers();

    // MÃ´i trÆ°á»ng offline / dev chÆ°a cáº¥u hÃ¬nh Supabase: tÃ­nh láº¡i KPI náº¿u lÃ  Quáº£n lÃ½
    if (!supabase || !isSupabaseConfigured) {
      if (affectedTask && affectedTask.teacherId && affectedTask.date) {
        try {
          const currentUser = BOPSStore.getCurrentUser();
          const isManager = currentUser?.role === 'manager' || (currentUser?.role as string) === 'supervisor';
          if (isManager) {
            BOPSStore.calculateKPIForTeacher(affectedTask.teacherId, affectedTask.date);
          }
        } catch (kpiErr) {
          console.error('Lá»—i tÃ­nh KPI offline:', kpiErr);
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
                if (error) console.error('Lá»—i khi Ä‘Ã¡nh giÃ¡ nhiá»‡m vá»¥:', error);
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
                if (error) console.error('Lá»—i khi Ä‘Ã¡nh giÃ¡ ca trá»±c:', error);
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
              reason: `Vi pháº¡m/ChÆ°a Ä‘áº¡t: ${params.reason || params.criteriaLabel || 'Ná»™i dung ca trá»±c'}`,
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
        title: `Quáº£n lÃ½ Ä‘Ã¡nh giÃ¡ ca/nhiá»‡m vá»¥: ${titleStr}`,
        content: `Tháº§y/CÃ´ ${teacherName} Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡: ${
          params.evaluation === 'approved'
            ? 'Äáº T YÃŠU Cáº¦U'
            : `CHÆ¯A Äáº T (${params.reason || 'Cáº§n rÃºt kinh nghiá»‡m'})`
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
        `ÄÃ¡nh giÃ¡ ca/nhiá»‡m vá»¥ "${titleStr}" cá»§a GV ${teacherName}: ${params.evaluation === 'approved' ? 'HOÃ€N THÃ€NH' : `CHÆ¯A Tá»T (-${params.deductedPoints || 2} Ä‘iá»ƒm)`}`
      );
    }
  },

  // --------------------------------------------------------------------------
  // 7. INTERACTIONS (TÆ¯Æ NG TÃC 1-1 Há»ŒC SINH - GHI/Äá»ŒC TRá»°C TIáº¾P SUPABASE)
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

    // Cáº­p nháº­t ngÃ y tÆ°Æ¡ng tÃ¡c gáº§n nháº¥t vÃ  sá»‘ láº§n trong thÃ¡ng cá»§a há»c sinh
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

    // Äá»“ng bá»™ láº­p tá»©c sang Supabase PostgreSQL
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('interactions')
        .insert(interactionToDb(newInteraction))
        .then(({ error }) => {
          if (error) console.error('Lá»—i khi lÆ°u tÆ°Æ¡ng tÃ¡c 1-1 vÃ o Supabase:', error);
        });

      // Cáº­p nháº­t cáº£ báº£ng students trong Supabase
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
      `Nháº­p tÆ°Æ¡ng tÃ¡c 1-1 vá»›i há»c sinh ${interactionData.studentName} (${interactionData.topic})`
    );

    BOPSStore.calculateKPIForTeacher(interactionData.teacherId, interactionData.interactionDate);

    return newInteraction;
  },

  async deleteInteraction(interactionId: string): Promise<{ success: boolean; error?: string }> {
    const target = state.interactions.find((i) => i.id === interactionId);
    if (!target) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y nháº­t kÃ½ tÆ°Æ¡ng tÃ¡c' };

    state.interactions = state.interactions.filter((i) => i.id !== interactionId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('interactions')
          .delete()
          .eq('id', interactionId);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a tÆ°Æ¡ng tÃ¡c trÃªn Supabase:', error);
          if (!state.interactions.some((i) => i.id === interactionId)) {
            state.interactions.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a tÆ°Æ¡ng tÃ¡c:', err);
        if (!state.interactions.some((i) => i.id === interactionId)) {
          state.interactions.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i máº¡ng khi xÃ³a' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'teacher',
      'Interaction',
      'DELETE_INTERACTION_1ON1',
      `XÃ³a nháº­t kÃ½ tÆ°Æ¡ng tÃ¡c 1-1 vá»›i há»c sinh ${target.studentName} (${target.topic})`
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
            if (error) console.error('Lá»—i khi lÆ°u danh sÃ¡ch KPIs vÃ o Supabase:', error);
          },
          (err) => {
            console.error('Lá»—i ngoáº¡i lá»‡ khi lÆ°u danh sÃ¡ch KPIs vÃ o Supabase:', err);
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

    // Kiá»ƒm tra xem Quáº£n lÃ½ Ä‘Ã£ cháº¥m Ä‘iá»ƒm Ä‘Ã¡nh giÃ¡ thá»§ cÃ´ng trong Daily Evaluations hay chÆ°a
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
      // Báº£o toÃ n Ä‘iá»ƒm sá»‘ do Quáº£n lÃ½ Ä‘Ã£ cháº¥m thá»§ cÃ´ng, khÃ´ng bá»‹ ghi Ä‘Ã¨ bá»Ÿi cÃ´ng thá»©c tá»± Ä‘á»™ng
      operationScore = manualEval.operationScore;
      qualityScore = manualEval.qualityScore;
      studentCareScore = manualEval.studentCareScore;
      contributionScore = manualEval.contributionScore;
      disciplineScore = manualEval.disciplineScore;
      totalScore = manualEval.totalScore;
      rank = manualEval.rank;
    } else {
      // 1. Äiá»ƒm Váº­n hÃ nh (Max 50)
      operationScore = 50;
      if (totalTasks > 0) {
        const completionRate = completedTasks / totalTasks;
        operationScore = Math.round(completionRate * 50);
      }

      // 2. Äiá»ƒm Cháº¥t lÆ°á»£ng (Max 20)
      const verifiedTasks = tasks.filter((t) => t.verified).length;
      qualityScore = 18;
      if (completedTasks > 0) {
        qualityScore = Math.round((verifiedTasks / completedTasks) * 20);
      }

      // 3. Äiá»ƒm ChÄƒm sÃ³c Há»c sinh 1-1 (Max 15)
      // Quy Ä‘á»‹nh: Tuáº§n cÃ³ tá»‘i thiá»ƒu 1 HS tÆ°Æ¡ng tÃ¡c 1-1 => Äáº¡t 15Ä‘ trá»ng sá»‘
      studentCareScore = hasWeeklyInteraction ? 15 : 0;

      // 4. Äiá»ƒm ÄÃ³ng gÃ³p (Max 10)
      contributionScore = 10;

      // 5. Äiá»ƒm Ká»· luáº­t (Max 5)
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
      teacherName: teacher ? teacher.fullName : 'GiÃ¡o viÃªn',
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

    // PhÃ¢n quyá»n RLS: Chá»‰ Quáº£n lÃ½ má»›i Ä‘Æ°á»£c ghi nháº­n báº£n ghi KPI chÃ­nh thá»©c lÃªn Supabase.
    // GVQN cÃ³ thá»ƒ tháº¥y tiáº¿n Ä‘á»™ hiá»ƒn thá»‹ tá»©c thá»i, nhÆ°ng khÃ´ng gá»­i ghi Supabase.
    const currentUser = BOPSStore.getCurrentUser();
    const isManager = currentUser?.role === 'manager' || (currentUser?.role as string) === 'supervisor';

    if (supabase && isSupabaseConfigured && isManager) {
      supabase
        .from('kpis')
        .upsert(kpiToDb(kpiRecord), { onConflict: 'id' })
        .then(
          ({ error }) => {
            if (error) console.error('Lá»—i khi ghi nháº­n KPI vÃ o Supabase:', error);
          },
          (err) => {
            console.error('Lá»—i ngoáº¡i lá»‡ khi ghi nháº­n KPI vÃ o Supabase:', err);
          }
        );
    }

    return kpiRecord;
  },

  // --------------------------------------------------------------------------
  // 9. DAILY EVALUATIONS (ÄÃNH GIÃ Váº¬N HÃ€NH NGÃ€Y - GHI/Äá»ŒC TRá»°C TIáº¾P SUPABASE)
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
      evaluatorName: 'Tháº§y LÃª Huy PhÃºc',
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

    // Ghi vÃ o Supabase
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('daily_evaluations')
        .upsert(evalToDb(evaluationRecord), { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Lá»—i khi lÆ°u Ä‘Ã¡nh giÃ¡ ngÃ y vÃ o Supabase:', error);
        });
    }

    // Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ sang báº£ng KPI
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

    // Gá»­i thÃ´ng bÃ¡o Ä‘áº¿n giÃ¡o viÃªn
    BOPSStore.addNotification({
      receiverId: evaluationData.teacherId,
      title: 'Quáº£n lÃ½ Tháº§y LÃª Huy PhÃºc Ä‘Ã£ hoÃ n táº¥t Ä‘Ã¡nh giÃ¡ KPI ngÃ y',
      content: `Tháº§y/CÃ´ ${evaluationData.teacherName} Ä‘áº¡t ${totalScore}/100 Ä‘iá»ƒm (Xáº¿p háº¡ng ${rank}) cho ngÃ y lÃ m viá»‡c ${evaluationData.date}. Nháº­n xÃ©t: "${evaluationData.generalComment}"`,
      type: 'kpi',
      priority: 'high',
    });

    BOPSStore.addAuditLog(
      'u-mgr-01',
      'Tháº§y LÃª Huy PhÃºc',
      'manager',
      'DailyEvaluation',
      'EVALUATE_DAILY_WORK',
      `Tháº§y LÃª Huy PhÃºc Ä‘Ã¡nh giÃ¡ cÃ´ng viá»‡c ngÃ y ${evaluationData.date} cho GV ${evaluationData.teacherName}: ${totalScore}Ä‘ (${rank})`
    );

    return evaluationRecord;
  },

  async deleteDailyEvaluation(id: string): Promise<{ success: boolean; error?: string }> {
    const target = state.dailyEvaluations.find((e) => e.id === id);
    if (!target) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y phiáº¿u Ä‘Ã¡nh giÃ¡' };

    state.dailyEvaluations = state.dailyEvaluations.filter((e) => e.id !== id);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('daily_evaluations')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a phiáº¿u Ä‘Ã¡nh giÃ¡:', error);
          if (!state.dailyEvaluations.some((e) => e.id === id)) {
            state.dailyEvaluations.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a phiáº¿u Ä‘Ã¡nh giÃ¡:', err);
        if (!state.dailyEvaluations.some((e) => e.id === id)) {
          state.dailyEvaluations.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i káº¿t ná»‘i khi xÃ³a' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'DailyEvaluation',
      'DELETE_EVALUATION',
      `ÄÃ£ xÃ³a phiáº¿u Ä‘Ã¡nh giÃ¡ cÃ´ng viá»‡c ID: ${id}`
    );

    return { success: true };
  },

  // --------------------------------------------------------------------------
  // 10. DAILY WORK REPORTS (BÃO CÃO CÃ”NG VIá»†C Háº°NG NGÃ€Y & KTX - GHI/Äá»ŒC TRá»°C TIáº¾P SUPABASE)
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
          if (error) console.error('Lá»—i khi gá»­i bÃ¡o cÃ¡o ngÃ y vÃ o Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    if (currentUser.role === 'teacher') {
      const emergencyIncidentsCount = fullReport.studentIncidents.filter((i) => i.severity === 'emergency').length;
      BOPSStore.addNotification({
        receiverId: 'u-mgr-01',
        title: emergencyIncidentsCount > 0 ? 'ðŸš¨ Cáº£nh bÃ¡o kháº©n cáº¥p tá»« BÃ¡o cÃ¡o ngÃ y' : 'BÃ¡o cÃ¡o ca trá»±c má»›i',
        content: `GV ${fullReport.teacherName} Ä‘Ã£ gá»­i bÃ¡o cÃ¡o ca ${fullReport.shift} ngÃ y ${fullReport.date}.${
          emergencyIncidentsCount > 0 ? ` CÃ³ ${emergencyIncidentsCount} sá»± vá»¥ há»c sinh kháº©n cáº¥p cáº§n xem xÃ©t!` : ''
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
      `Gá»­i bÃ¡o cÃ¡o cÃ´ng viá»‡c ngÃ y ${fullReport.date} (Ca: ${fullReport.shift}) - ${fullReport.teacherName}`
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
        title: 'Quáº£n lÃ½ Tháº§y LÃª Huy PhÃºc pháº£n há»“i bÃ¡o cÃ¡o ngÃ y',
        content: `Tháº§y PhÃºc Ä‘Ã£ xem vÃ  gá»­i chá»‰ Ä‘áº¡o cho bÃ¡o cÃ¡o ca ${state.dailyWorkReports[idx].shift} ngÃ y ${state.dailyWorkReports[idx].date}: "${feedback.substring(0, 80)}..."`,
        type: 'system',
        priority: 'high',
      });

      BOPSStore.addAuditLog(
        'u-mgr-01',
        'Tháº§y LÃª Huy PhÃºc',
        'manager',
        'DailyWorkReport',
        'FEEDBACK_REPORT',
        `Tháº§y LÃª Huy PhÃºc pháº£n há»“i vÃ  chá»‰ Ä‘áº¡o bÃ¡o cÃ¡o ID: ${reportId}`
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
    if (!target) return { success: false, error: 'KhÃ´ng tÃ¬m tháº¥y bÃ¡o cÃ¡o cÃ´ng viá»‡c' };

    state.dailyWorkReports = state.dailyWorkReports.filter((r) => r.id !== reportId);
    notifySubscribers();

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('daily_work_reports')
          .delete()
          .eq('id', reportId);

        if (error) {
          console.error('[BOPS Delete] Lá»—i khi xÃ³a bÃ¡o cÃ¡o cÃ´ng viá»‡c:', error);
          if (!state.dailyWorkReports.some((r) => r.id === reportId)) {
            state.dailyWorkReports.push(target);
            notifySubscribers();
          }
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[BOPS Delete] Exception khi xÃ³a bÃ¡o cÃ¡o cÃ´ng viá»‡c:', err);
        if (!state.dailyWorkReports.some((r) => r.id === reportId)) {
          state.dailyWorkReports.push(target);
          notifySubscribers();
        }
        return { success: false, error: err?.message || 'Lá»—i máº¡ng khi xÃ³a' };
      }
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser?.id || 'system',
      currentUser?.fullName || 'Há»‡ thá»‘ng',
      currentUser?.role || 'manager',
      'DailyWorkReport',
      'DELETE_REPORT',
      `ÄÃ£ xÃ³a bÃ¡o cÃ¡o cÃ´ng viá»‡c ngÃ y ${target.date} (Ca: ${target.shift}) cá»§a GV ${target.teacherName}`
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
          if (error) console.error('Lá»—i khi lÆ°u cÃ i Ä‘áº·t vÃ o Supabase:', error);
        });
    }

    const currentUser = BOPSStore.getCurrentUser();
    BOPSStore.addAuditLog(
      currentUser.id,
      currentUser.fullName,
      currentUser.role,
      'Settings',
      'UPDATE_SETTINGS',
      'Cáº­p nháº­t cáº¥u hÃ¬nh quy Ä‘á»‹nh váº­n hÃ nh vÃ  cÃ´ng thá»©c KPI há»‡ thá»‘ng.'
    );
  },


  // LÃ m má»›i dá»¯ liá»‡u báº±ng cÃ¡ch Ä‘á»“ng bá»™ tá»« Supabase
  async resetAllData(): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      console.error(
        '[BOPS] KhÃ´ng thá»ƒ Ä‘á»“ng bá»™ dá»¯ liá»‡u: Supabase chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh.'
      );
      return;
    }

    try {
      await fetchBusinessData();

      if (state.syncError) {
        console.error(
          '[BOPS] Äá»“ng bá»™ dá»¯ liá»‡u chÆ°a hoÃ n táº¥t:',
          state.syncError
        );
        return;
      }

      notifySubscribers();
      console.info('[BOPS] ÄÃ£ táº£i láº¡i dá»¯ liá»‡u tá»« Supabase.');
    } catch (err) {
      console.error('[BOPS] Lá»—i khi Ä‘á»“ng bá»™ dá»¯ liá»‡u tá»« Supabase:', err);
      throw err;
    }
  },
};
