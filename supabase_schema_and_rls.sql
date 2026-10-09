-- ============================================================================
-- BOPS (Hệ Thống Quản Trị Giáo Viên Quản Nhiệm Ký Túc Xá FSC3)
-- SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Toàn bộ 11 bảng nghiệp vụ chuẩn hóa, bảo mật & đồng bộ Realtime
-- ============================================================================

-- BẬT EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. BẢNG TÀI KHOẢN GIÁO VIÊN & QUẢN LÝ (USERS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    teacher_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    role TEXT NOT NULL CHECK (role IN ('manager', 'teacher')),
    position TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'leave', 'resigned')),
    department_id TEXT,
    employment_date TEXT,
    birthday TEXT,
    gender TEXT CHECK (gender IN ('nam', 'nữ')),
    address TEXT,
    night_shift_eligible BOOLEAN DEFAULT true,
    assigned_room_ids TEXT[] DEFAULT '{}',
    assigned_student_ids TEXT[] DEFAULT '{}',
    assigned_building TEXT DEFAULT 'DomB',
    workload_index NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_teacher_code ON public.users(teacher_code);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_modify_manager" ON public.users;
CREATE POLICY "users_modify_manager" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. BẢNG HỌC SINH NỘI TRÚ TOÀN TRƯỜNG (STUDENTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    student_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('nam', 'nữ')),
    birthday TEXT,
    class_name TEXT,
    room_id TEXT,
    room_name TEXT,
    teacher_id TEXT,
    teacher_name TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated')),
    special_care BOOLEAN DEFAULT false,
    special_labels TEXT[] DEFAULT '{}',
    health_note TEXT,
    note TEXT,
    last_interaction_date TEXT,
    interaction_count_this_month INTEGER DEFAULT 0,
    uploaded_by_user_id TEXT,
    uploaded_by_user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_code ON public.students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_room_name ON public.students(room_name);
CREATE INDEX IF NOT EXISTS idx_students_special_care ON public.students(special_care);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_policy" ON public.students;
CREATE POLICY "students_policy" ON public.students
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. BẢNG PHÒNG KÝ TÚC XÁ (ROOMS)
-- Sức chứa hỗ trợ lên tới 30 học sinh/phòng
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    room_name TEXT NOT NULL,
    building TEXT NOT NULL DEFAULT 'DomB',
    floor INTEGER DEFAULT 1,
    capacity INTEGER DEFAULT 8 CHECK (capacity >= 1 AND capacity <= 30),
    occupied INTEGER DEFAULT 0,
    gender TEXT CHECK (gender IN ('nam', 'nữ')),
    teacher_id TEXT,
    teacher_name TEXT,
    status TEXT DEFAULT 'clean' CHECK (status IN ('clean', 'pending', 'dirty')),
    hygiene_status TEXT DEFAULT 'pass' CHECK (hygiene_status IN ('pass', 'needs_correction', 'critical')),
    last_inspected_at TEXT,
    correction_note TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building);
CREATE INDEX IF NOT EXISTS idx_rooms_teacher_id ON public.rooms(teacher_id);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_policy" ON public.rooms;
CREATE POLICY "rooms_policy" ON public.rooms
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. BẢNG VỊ TRÍ TRỰC (POSITIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.positions (
    id TEXT PRIMARY KEY,
    position_code TEXT NOT NULL,
    position_name TEXT NOT NULL,
    description TEXT,
    building TEXT DEFAULT 'DomB',
    floor INTEGER DEFAULT 1,
    required_teachers INTEGER DEFAULT 1,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_policy" ON public.positions;
CREATE POLICY "positions_policy" ON public.positions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. BẢNG PHÂN CÔNG LỊCH TRỰC (SCHEDULES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_code TEXT,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'lunch', 'afternoon', 'evening', 'night', 'weekend')),
    template_id TEXT,
    position_id TEXT,
    position_name TEXT,
    room_ids TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'working', 'completed', 'swapped', 'absent', 'verified', 'rejected')),
    swap_with_teacher_id TEXT,
    swap_approved_by TEXT,
    swap_note TEXT,
    completed_at TEXT,
    completion_note TEXT,
    proof_photos TEXT[] DEFAULT '{}',
    evaluation_status TEXT CHECK (evaluation_status IN ('pending_review', 'approved', 'rejected')),
    evaluation_criteria TEXT,
    deducted_points NUMERIC DEFAULT 0,
    evaluation_note TEXT,
    evaluated_by TEXT,
    evaluated_at TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON public.schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id ON public.schedules(teacher_id);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_policy" ON public.schedules;
CREATE POLICY "schedules_policy" ON public.schedules
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. BẢNG NHIỆM VỤ / CHECKLIST CA TRỰC (TASKS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    task_code TEXT NOT NULL,
    task_name TEXT NOT NULL,
    title TEXT,
    task_category TEXT DEFAULT 'routine' CHECK (task_category IN ('core', 'routine', 'additional', 'emergency')),
    shift TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    date TEXT NOT NULL,
    schedule_assignment_id TEXT,
    planned_start TEXT,
    planned_end TEXT,
    actual_start TEXT,
    actual_end TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'working', 'completed', 'late', 'skipped', 'cancelled', 'verified', 'rejected')),
    room_id TEXT,
    room_name TEXT,
    student_id TEXT,
    student_name TEXT,
    score NUMERIC DEFAULT 5,
    verified BOOLEAN DEFAULT false,
    verified_by TEXT,
    verified_at TEXT,
    note TEXT,
    proof_photos TEXT[] DEFAULT '{}',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    evaluation_criteria TEXT,
    deducted_points NUMERIC DEFAULT 0,
    evaluation_note TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tasks_teacher_date ON public.tasks(teacher_id, date);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_policy" ON public.tasks;
CREATE POLICY "tasks_policy" ON public.tasks
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. BẢNG TƯƠNG TÁC 1-1 HỌC SINH (INTERACTIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interactions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class_name TEXT,
    room_name TEXT,
    interaction_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER DEFAULT 20,
    location TEXT,
    topic TEXT NOT NULL,
    summary TEXT NOT NULL,
    observation TEXT,
    support_plan TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    follow_up_date TEXT,
    follow_up_status TEXT DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'done')),
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_interactions_teacher_id ON public.interactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_interactions_student_id ON public.interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON public.interactions(interaction_date);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_policy" ON public.interactions;
CREATE POLICY "interactions_policy" ON public.interactions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 8. BẢNG ĐÁNH GIÁ & XẾP HẠNG KPI (KPIS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kpis (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_code TEXT,
    date TEXT NOT NULL,
    operation_score NUMERIC DEFAULT 50,
    quality_score NUMERIC DEFAULT 20,
    student_care_score NUMERIC DEFAULT 15,
    contribution_score NUMERIC DEFAULT 10,
    discipline_score NUMERIC DEFAULT 5,
    total_score NUMERIC DEFAULT 100,
    rank TEXT DEFAULT 'A+' CHECK (rank IN ('A+', 'A', 'B', 'C', 'D')),
    workload_index NUMERIC DEFAULT 1.0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_total INTEGER DEFAULT 0,
    interactions_completed_this_week INTEGER DEFAULT 0,
    penalties JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_kpis_teacher_date ON public.kpis(teacher_id, date);

ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kpis_policy" ON public.kpis;
CREATE POLICY "kpis_policy" ON public.kpis
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 9. BẢNG ĐÁNH GIÁ VẬN HÀNH NGÀY (DAILY EVALUATIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_evaluations (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_code TEXT,
    evaluator_id TEXT DEFAULT 'u-mgr-01',
    evaluator_name TEXT DEFAULT 'Thầy Lê Huy Phúc',
    evaluated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    operation_score NUMERIC DEFAULT 50,
    quality_score NUMERIC DEFAULT 20,
    student_care_score NUMERIC DEFAULT 15,
    contribution_score NUMERIC DEFAULT 10,
    discipline_score NUMERIC DEFAULT 5,
    total_score NUMERIC DEFAULT 100,
    rank TEXT DEFAULT 'A+' CHECK (rank IN ('A+', 'A', 'B', 'C', 'D')),
    strengths TEXT,
    improvements TEXT,
    general_comment TEXT,
    status TEXT DEFAULT 'evaluated'
);

CREATE INDEX IF NOT EXISTS idx_daily_evals_teacher_date ON public.daily_evaluations(teacher_id, date);

ALTER TABLE public.daily_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_evals_policy" ON public.daily_evaluations;
CREATE POLICY "daily_evals_policy" ON public.daily_evaluations
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. BẢNG BÁO CÁO CÔNG VIỆC HẰNG NGÀY & KTX (DAILY WORK REPORTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_work_reports (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    shift TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_code TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    tasks_completion_rate INTEGER DEFAULT 100,
    completed_tasks_count INTEGER DEFAULT 0,
    total_tasks_count INTEGER DEFAULT 0,
    work_status TEXT DEFAULT 'completed',
    work_summary TEXT NOT NULL,
    handover_notes TEXT,
    suggestions_to_manager TEXT,
    student_incidents JSONB DEFAULT '[]'::jsonb,
    room_conditions JSONB DEFAULT '[]'::jsonb,
    admin_feedback TEXT,
    admin_feedback_at TEXT,
    admin_reviewed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_work_reports(date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_teacher_id ON public.daily_work_reports(teacher_id);

ALTER TABLE public.daily_work_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_reports_policy" ON public.daily_work_reports;
CREATE POLICY "daily_reports_policy" ON public.daily_work_reports
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 11. BẢNG THÔNG BÁO (NOTIFICATIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    receiver_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'system' CHECK (type IN ('shift', 'task', 'interaction', 'kpi', 'emergency', 'system')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    read BOOLEAN DEFAULT false,
    created_at TEXT NOT NULL,
    link_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON public.notifications(receiver_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;
CREATE POLICY "notifications_policy" ON public.notifications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. BẢNG NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    module TEXT NOT NULL,
    operation TEXT NOT NULL,
    details TEXT NOT NULL,
    old_data TEXT,
    new_data TEXT,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_policy" ON public.audit_logs
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 13. BẢNG CẤU HÌNH VẬN HÀNH CHUNG (DEPARTMENT SETTINGS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.department_settings (
    id TEXT PRIMARY KEY DEFAULT 'current_settings',
    department_name TEXT,
    school_name TEXT,
    academic_year TEXT,
    current_semester TEXT,
    current_week INTEGER,
    min_interactions_per_week INTEGER,
    max_interactions_per_week INTEGER,
    shift_times JSONB,
    kpi_weights JSONB,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.department_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "department_settings_policy" ON public.department_settings;
CREATE POLICY "department_settings_policy" ON public.department_settings
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- BẬT SUPABASE REALTIME ĐỂ MÁY KHÁC ĐỒNG BỘ TỨC THÌ
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_work_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.department_settings;
