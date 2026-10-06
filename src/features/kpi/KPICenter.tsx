import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  CheckCircle2,
  UserCheck,
  Search,
  Filter,
  Edit3,
  Clock,
  MessageSquareHeart,
  ShieldCheck,
  FileText,
  Building2,
  Trash2,
  ChevronRight,
  Sliders,
  Check,
  Star,
  Users,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { KPIRecord, User, DailyEvaluation } from '../../types';
import { Modal } from '../../components/common/Modal';

export const KPICenter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(BOPSStore.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(BOPSStore.getUsers());
  const [kpis, setKPIs] = useState<KPIRecord[]>([]);
  const [dailyEvaluations, setDailyEvaluations] = useState<DailyEvaluation[]>([]);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('day');

  // Selected date for viewing / evaluation
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Manager View Tabs
  const [managerTab, setManagerTab] = useState<'daily_evaluation' | 'ranking' | 'history'>('daily_evaluation');

  // Search & Filter
  const [searchTeacherQuery, setSearchTeacherQuery] = useState('');
  const [filterEvaluationStatus, setFilterEvaluationStatus] = useState<'all' | 'evaluated' | 'pending'>('all');

  // Admin Evaluation Modal State
  const [evaluatingTeacher, setEvaluatingTeacher] = useState<User | null>(null);
  const [evalForm, setEvalForm] = useState({
    operationScore: 48,
    qualityScore: 19,
    studentCareScore: 14,
    contributionScore: 9,
    disciplineScore: 5,
    strengths: '',
    improvements: '',
    generalComment: '',
  });

  const isManager = currentUser.role === 'manager';

  const loadData = () => {
    setCurrentUser(BOPSStore.getCurrentUser());
    setAllUsers(BOPSStore.getUsers());
    setKPIs(BOPSStore.getKPIs());
    setDailyEvaluations(BOPSStore.getDailyEvaluations());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  const teachers = allUsers.filter((u) => u.role === 'teacher');
  const sortedKPIs = [...kpis].sort((a, b) => b.totalScore - a.totalScore);

  // Find evaluations for selectedDate
  const evalsForSelectedDate = dailyEvaluations.filter((e) => e.date === selectedDate);

  // Status mapping for teachers on selectedDate
  const teachersWithEvalStatus = teachers.map((teacher) => {
    const existingEval = evalsForSelectedDate.find((e) => e.teacherId === teacher.id);
    const interactions = BOPSStore.getInteractions().filter((i) => i.teacherId === teacher.id);
    const kpi = kpis.find((k) => k.teacherId === teacher.id);

    return {
      teacher,
      evaluation: existingEval,
      isEvaluated: !!existingEval,
      interactionsCount: interactions.length,
      kpi,
    };
  });

  // Filter teachers
  const filteredTeacherList = teachersWithEvalStatus.filter((item) => {
    const matchesSearch =
      item.teacher.fullName.toLowerCase().includes(searchTeacherQuery.toLowerCase()) ||
      item.teacher.teacherCode.toLowerCase().includes(searchTeacherQuery.toLowerCase()) ||
      (item.teacher.position || '').toLowerCase().includes(searchTeacherQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterEvaluationStatus === 'evaluated') return item.isEvaluated;
    if (filterEvaluationStatus === 'pending') return !item.isEvaluated;
    return true;
  });

  const evaluatedCount = teachersWithEvalStatus.filter((t) => t.isEvaluated).length;
  const pendingCount = teachers.length - evaluatedCount;
  const avgScore =
    evaluatedCount > 0
      ? Math.round(
          evalsForSelectedDate.reduce((sum, e) => sum + e.totalScore, 0) / evaluatedCount
        )
      : 0;

  // Open modal for evaluating a teacher
  const handleOpenEvaluationModal = (teacher: User) => {
    setEvaluatingTeacher(teacher);
    const existing = dailyEvaluations.find(
      (e) => e.teacherId === teacher.id && e.date === selectedDate
    );

    if (existing) {
      setEvalForm({
        operationScore: existing.operationScore,
        qualityScore: existing.qualityScore,
        studentCareScore: existing.studentCareScore,
        contributionScore: existing.contributionScore,
        disciplineScore: existing.disciplineScore,
        strengths: existing.strengths || '',
        improvements: existing.improvements || '',
        generalComment: existing.generalComment || '',
      });
    } else {
      // Default standard good evaluation
      setEvalForm({
        operationScore: 48,
        qualityScore: 19,
        studentCareScore: 14,
        contributionScore: 9,
        disciplineScore: 5,
        strengths: 'Chủ động bàn giao ca đúng giờ, quản lý trật tự KTX ổn định.',
        improvements: 'Duy trì nhắc nhở học sinh tắt các thiết bị điện khi rời phòng.',
        generalComment: 'Thầy/Cô hoàn thành tốt ca trực hôm nay, tác phong chuẩn mực.',
      });
    }
  };

  // Quick Preset Helper
  const applyPreset = (preset: 'excellent' | 'good' | 'average' | 'needs_improvement') => {
    switch (preset) {
      case 'excellent':
        setEvalForm({
          operationScore: 50,
          qualityScore: 20,
          studentCareScore: 15,
          contributionScore: 10,
          disciplineScore: 5,
          strengths: 'Hoàn thành xuất sắc mọi nhiệm vụ ca trực, nền nếp KTX tốt, tương tác hỗ trợ học sinh nhiệt tình.',
          improvements: 'Tiếp tục duy trì phong độ và chia sẻ kinh nghiệm cho các đồng nghiệp mới.',
          generalComment: 'Đánh giá Xuất sắc. Tác phong mẫu mực, trách nhiệm cao với ca trực và học sinh.',
        });
        break;
      case 'good':
        setEvalForm({
          operationScore: 48,
          qualityScore: 19,
          studentCareScore: 14,
          contributionScore: 9,
          disciplineScore: 5,
          strengths: 'Bàn giao ca đúng giờ, kiểm tra vệ sinh phòng chu đáo, phối hợp tốt với tổ trực.',
          improvements: 'Lưu ý ghi nhận chi tiết hơn trong sổ nhật ký ca trực.',
          generalComment: 'Hoàn thành tốt công việc trong ngày, đạt tiêu chuẩn quản nhiệm nội trú.',
        });
        break;
      case 'average':
        setEvalForm({
          operationScore: 42,
          qualityScore: 17,
          studentCareScore: 13,
          contributionScore: 8,
          disciplineScore: 4,
          strengths: 'Có mặt đầy đủ trong ca trực, hỗ trợ điểm danh học sinh.',
          improvements: 'Cần kiểm tra kỹ vệ sinh khu vực hành lang trước khi bàn giao ca.',
          generalComment: 'Đạt yêu cầu cơ bản, cần chú ý nâng cao chất lượng kiểm tra phòng KTX.',
        });
        break;
      case 'needs_improvement':
        setEvalForm({
          operationScore: 35,
          qualityScore: 14,
          studentCareScore: 12,
          contributionScore: 6,
          disciplineScore: 3,
          strengths: 'Đã hoàn thành bàn giao ca.',
          improvements: 'Báo cáo ca trực trễ, chưa nhắc nhở học sinh giữ trật tự giờ tự học.',
          generalComment: 'Chưa đạt yêu cầu ca trực. Đề nghị rút kinh nghiệm và chấn chỉnh tác phong ngay ngày mai.',
        });
        break;
    }
  };

  // Submit Evaluation
  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingTeacher) return;

    BOPSStore.addOrUpdateDailyEvaluation({
      teacherId: evaluatingTeacher.id,
      teacherName: evaluatingTeacher.fullName,
      teacherCode: evaluatingTeacher.teacherCode,
      date: selectedDate,
      operationScore: Number(evalForm.operationScore),
      qualityScore: Number(evalForm.qualityScore),
      studentCareScore: Number(evalForm.studentCareScore),
      contributionScore: Number(evalForm.contributionScore),
      disciplineScore: Number(evalForm.disciplineScore),
      strengths: evalForm.strengths.trim(),
      improvements: evalForm.improvements.trim(),
      generalComment: evalForm.generalComment.trim() || 'Quản lý đã hoàn thành thẩm định ca trực.',
    });

    setEvaluatingTeacher(null);
  };

  const calculatedTotal =
    Number(evalForm.operationScore) +
    Number(evalForm.qualityScore) +
    Number(evalForm.studentCareScore) +
    Number(evalForm.contributionScore) +
    Number(evalForm.disciplineScore);

  let calculatedRank: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
  if (calculatedTotal >= 97 && Number(evalForm.disciplineScore) === 5) calculatedRank = 'A+';
  else if (calculatedTotal >= 90) calculatedRank = 'A';
  else if (calculatedTotal >= 80) calculatedRank = 'B';
  else if (calculatedTotal >= 70) calculatedRank = 'C';
  else calculatedRank = 'D';

  // For Teacher View: Current user's evaluation & KPI
  const myEvaluationToday = dailyEvaluations.find(
    (e) => e.teacherId === currentUser.id && e.date === selectedDate
  );
  const myRecentEvaluations = dailyEvaluations.filter((e) => e.teacherId === currentUser.id);
  const myKPI = kpis.find((k) => k.teacherId === currentUser.id) || {
    totalScore: 95,
    rank: 'A',
    operationScore: 48,
    qualityScore: 19,
    studentCareScore: 14,
    contributionScore: 9,
    disciplineScore: 5,
    workloadIndex: 1.0,
    interactionsCompletedThisWeek: 3,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Award className="h-4 w-4" />
            <span>KPI & Daily Performance System • Độc quyền Quản lý Thẩm định</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {isManager
              ? 'Thẩm Định & Đánh Giá Công Việc Hằng Ngày'
              : 'Hiệu Suất KPI & Đánh Giá Từ Quản Lý Thầy Lê Huy Phúc'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isManager
              ? 'Tài khoản Quản lý Thầy Lê Huy Phúc là tài khoản duy nhất chấm điểm và đánh giá chất lượng ca trực của từng thầy/cô.'
              : 'Toàn bộ công việc hằng ngày của Thầy/Cô được Quản lý Thầy Lê Huy Phúc trực tiếp thẩm định, đánh giá và đồng bộ KPI.'}
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngày:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none dark:text-white"
            />
          </div>
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="rounded-xl bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
            >
              Hôm nay
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: MANAGER VIEW (Thầy Lê Huy Phúc Only) */}
      {/* ============================================================== */}
      {isManager ? (
        <div className="space-y-6">
          {/* Navigation Tabs for Manager */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-2">
              <button
                onClick={() => setManagerTab('daily_evaluation')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                  managerTab === 'daily_evaluation'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <span>Admin Đánh Giá Từng Thầy/Cô ({selectedDate})</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {evaluatedCount} GV đã đánh giá
                </span>
              </button>

              <button
                onClick={() => setManagerTab('ranking')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                  managerTab === 'ranking'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <Award className="h-4 w-4" />
                <span>Bảng Xếp Hạng KPI Toàn Trường</span>
              </button>

              <button
                onClick={() => setManagerTab('history')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                  managerTab === 'history'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Lịch Sử Đánh Giá Quản Lý ({dailyEvaluations.length})</span>
              </button>
            </div>

            {/* Manager identity badge */}
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span>Người thẩm định: <strong>Thầy Lê Huy Phúc (Admin / Quản lý)</strong></span>
            </div>
          </div>

          {/* TAB 1: DAILY EVALUATION BY ADMIN LÊ HUY PHÚC */}
          {managerTab === 'daily_evaluation' && (
            <div className="space-y-6">
              {/* Daily Progress Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Phạm vi Đánh giá</span>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-2 text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    Giáo viên Quản nhiệm
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Toàn bộ nhân sự KTX DomB</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Đã Đánh Giá Ngày</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-600">
                    {evaluatedCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Đã lưu & đồng bộ KPI</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Chưa Đánh Giá</span>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-600">
                    {pendingCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Cần thẩm định hôm nay</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Điểm TB Ngày</span>
                    <Star className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-purple-600">
                    {avgScore > 0 ? `${avgScore} Đ` : 'Chưa có'}
                  </div>
                  <div className="text-[11px] text-slate-400">Thang điểm 100</div>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTeacherQuery}
                    onChange={(e) => setSearchTeacherQuery(e.target.value)}
                    placeholder="Tìm theo tên giáo viên, mã GV, tầng KTX..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    onClick={() => setFilterEvaluationStatus('all')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      filterEvaluationStatus === 'all'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({teachers.length})
                  </button>
                  <button
                    onClick={() => setFilterEvaluationStatus('pending')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      filterEvaluationStatus === 'pending'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Chưa đánh giá ({pendingCount})
                  </button>
                  <button
                    onClick={() => setFilterEvaluationStatus('evaluated')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      filterEvaluationStatus === 'evaluated'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Đã đánh giá ({evaluatedCount})
                  </button>
                </div>
              </div>

              {/* Teacher Evaluation Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeacherList.map(({ teacher, evaluation, isEvaluated, interactionsCount, kpi }) => {
                  return (
                    <div
                      key={teacher.id}
                      className={`relative rounded-3xl border p-5 transition-all shadow-sm ${
                        isEvaluated
                          ? 'border-emerald-200 bg-white dark:border-emerald-950 dark:bg-slate-900'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-blue-400'
                      }`}
                    >
                      {/* Teacher Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={teacher.avatar}
                            alt={teacher.fullName}
                            className="h-11 w-11 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {teacher.fullName}
                              </h4>
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {teacher.teacherCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {teacher.position}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isEvaluated ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {evaluation?.totalScore} Đ • Hạng {evaluation?.rank}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                            <Clock className="h-3.5 w-3.5" />
                            Chưa đánh giá
                          </span>
                        )}
                      </div>

                      {/* Info preview */}
                      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50 space-y-2">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <MessageSquareHeart className="h-3.5 w-3.5 text-purple-500" />
                            Tương tác 1-1 tuần này:
                          </span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {interactionsCount} lượt
                          </span>
                        </div>

                        {isEvaluated && evaluation && (
                          <>
                            <div className="border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                              <div className="grid grid-cols-5 text-center gap-1 text-[10px] font-semibold">
                                <div className="bg-blue-50 text-blue-700 rounded p-1 dark:bg-blue-950/50 dark:text-blue-300">
                                  VH: {evaluation.operationScore}
                                </div>
                                <div className="bg-emerald-50 text-emerald-700 rounded p-1 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  CL: {evaluation.qualityScore}
                                </div>
                                <div className="bg-purple-50 text-purple-700 rounded p-1 dark:bg-purple-950/50 dark:text-purple-300">
                                  CS: {evaluation.studentCareScore}
                                </div>
                                <div className="bg-indigo-50 text-indigo-700 rounded p-1 dark:bg-indigo-950/50 dark:text-indigo-300">
                                  ĐG: {evaluation.contributionScore}
                                </div>
                                <div className="bg-rose-50 text-rose-700 rounded p-1 dark:bg-rose-950/50 dark:text-rose-300">
                                  KL: {evaluation.disciplineScore}
                                </div>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-600 italic line-clamp-2 dark:text-slate-300">
                              "{evaluation.generalComment}"
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between dark:border-slate-800">
                        <span className="text-[10px] text-slate-400">
                          {isEvaluated ? `Đã ký duyệt bởi Thầy Phúc` : `Chờ Thầy Phúc chấm điểm`}
                        </span>

                        <button
                          onClick={() => handleOpenEvaluationModal(teacher)}
                          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                            isEvaluated
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{isEvaluated ? 'Sửa đánh giá' : 'Chấm điểm ngay'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: OVERALL KPI RANKINGS */}
          {managerTab === 'ranking' && (
            <div className="space-y-6">
              {/* Rules Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-slate-900">
                  <div className="font-bold text-blue-900 dark:text-blue-300">A. Vận hành (Max 50)</div>
                  <div className="text-lg font-black text-blue-700">50 Đ</div>
                  <div className="text-[10px] text-slate-500 mt-1">Nhiệm vụ cốt lõi, điểm danh, kiểm tra</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-slate-900">
                  <div className="font-bold text-emerald-900 dark:text-emerald-300">B. Chất lượng (Max 20)</div>
                  <div className="text-lg font-black text-emerald-700">20 Đ</div>
                  <div className="text-[10px] text-slate-500 mt-1">Đúng giờ, vệ sinh phòng, bàn giao</div>
                </div>
                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 dark:border-purple-900/40 dark:bg-slate-900">
                  <div className="font-bold text-purple-900 dark:text-purple-300">C. Chăm sóc HS (Max 15)</div>
                  <div className="text-lg font-black text-purple-700">15 Đ</div>
                  <div className="text-[10px] text-slate-500 mt-1">Tối thiểu nhập 1 HS/tuần (Không nhập: 0đ)</div>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-slate-900">
                  <div className="font-bold text-indigo-900 dark:text-indigo-300">D. Đóng góp (Max 10)</div>
                  <div className="text-lg font-black text-indigo-700">10 Đ</div>
                  <div className="text-[10px] text-slate-500 mt-1">Sự kiện, trực thay, hỗ trợ bộ phận</div>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/40 dark:bg-slate-900">
                  <div className="font-bold text-rose-900 dark:text-rose-300">E. Kỷ luật (Max 5)</div>
                  <div className="text-lg font-black text-rose-700">5 Đ</div>
                  <div className="text-[10px] text-slate-500 mt-1">Trừ điểm nếu đi muộn / bỏ vị trí</div>
                </div>
              </div>

              {/* KPI Table */}
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                    <tr>
                      <th className="p-4">Hạng</th>
                      <th className="p-4">Giáo viên</th>
                      <th className="p-4">Vận hành (50)</th>
                      <th className="p-4">Chất lượng (20)</th>
                      <th className="p-4">Chăm sóc (15)</th>
                      <th className="p-4">Đóng góp (10)</th>
                      <th className="p-4">Kỷ luật (5)</th>
                      <th className="p-4 text-center">Workload</th>
                      <th className="p-4 text-right">Tổng Điểm</th>
                      <th className="p-4 text-center">Xếp loại</th>
                      <th className="p-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedKPIs.map((kpi, idx) => {
                      const teacher = teachers.find((t) => t.id === kpi.teacherId);
                      return (
                        <tr
                          key={kpi.id}
                          className="hover:bg-slate-50/80 transition dark:hover:bg-slate-800/50"
                        >
                          <td className="p-4 font-black text-slate-900 dark:text-white">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {kpi.teacherName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {kpi.teacherCode}
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-blue-600">{kpi.operationScore}</td>
                          <td className="p-4 font-semibold text-emerald-600">{kpi.qualityScore}</td>
                          <td className="p-4 font-semibold text-purple-600">{kpi.studentCareScore}</td>
                          <td className="p-4 font-semibold text-indigo-600">{kpi.contributionScore}</td>
                          <td className="p-4 font-semibold text-rose-600">{kpi.disciplineScore}</td>
                          <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-200">
                            {kpi.workloadIndex}
                          </td>
                          <td className="p-4 text-right font-black text-base text-blue-600">
                            {kpi.totalScore} Đ
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                kpi.rank === 'A+'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-2 ring-amber-400/40'
                                  : kpi.rank === 'A'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              Hạng {kpi.rank}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {teacher && (
                              <button
                                onClick={() => handleOpenEvaluationModal(teacher)}
                                className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                              >
                                Đánh giá ngày
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EVALUATION HISTORY */}
          {managerTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Toàn Bộ Nhật Ký Đánh Giá Của Quản Lý Thầy Lê Huy Phúc
              </h3>
              <div className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {dailyEvaluations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Chưa có lịch sử đánh giá nào.
                  </div>
                ) : (
                  dailyEvaluations.map((ev) => (
                    <div key={ev.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {ev.teacherName} ({ev.teacherCode})
                          </span>
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Ngày {ev.date}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {ev.totalScore} Đ • Hạng {ev.rank}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <strong>Nhận xét:</strong> {ev.generalComment}
                        </p>
                        {ev.strengths && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            ✓ Ưu điểm: {ev.strengths}
                          </p>
                        )}
                        {ev.improvements && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">
                            ⚠️ Cần lưu ý: {ev.improvements}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          Thẩm định lúc: {new Date(ev.evaluatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => BOPSStore.deleteDailyEvaluation(ev.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 transition"
                          title="Xóa đánh giá này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* SECTION 2: TEACHER VIEW (Thầy/Cô Khác - CHỈ XEM HIỆU SUẤT)     */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Informative Banner */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 dark:border-blue-950 dark:from-blue-950/30 dark:to-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-600 p-2 text-white shadow-md shadow-blue-500/30 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Quy Định Đánh Giá Hiệu Suất Công Việc Giáo Viên
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Tài khoản Quản trị của <strong>Thầy Lê Huy Phúc</strong> là tài khoản duy nhất trực tiếp thẩm định và đánh giá công việc hằng ngày của từng Thầy/Cô. Thầy/Cô được phân quyền nhập <strong>Tương tác 1-1 Học sinh</strong> và theo dõi bảng điểm KPI xếp hạng minh bạch dưới đây.
                </p>
              </div>
            </div>
          </div>

          {/* Personal KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">Điểm KPI Tổng Thể</div>
              <div className="mt-2 text-3xl font-black text-blue-600">{myKPI.totalScore}</div>
              <div className="mt-1 text-[11px] font-bold text-emerald-600">
                Xếp loại: Hạng {myKPI.rank}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">Tương tác 1-1 Tuần Này</div>
              <div className="mt-2 text-3xl font-black text-purple-600">
                {myKPI.interactionsCompletedThisWeek}
                <span className="text-xs font-normal text-slate-400"> / 3 lượt</span>
              </div>
              <div className="mt-1 text-[11px] text-purple-600">
                {myKPI.interactionsCompletedThisWeek >= 3 ? '✓ Đạt chỉ tiêu tuần' : 'Cần bổ sung thêm'}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">Thứ Hạng Bộ Phận</div>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                #{sortedKPIs.findIndex((k) => k.teacherId === currentUser.id) + 1}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Bảng xếp hạng toàn trường</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">Workload Index</div>
              <div className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">
                {myKPI.workloadIndex}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Hệ số định mức ca</div>
            </div>
          </div>

          {/* Official Evaluation Card for Selected Date */}
          <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-md dark:border-indigo-950 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Ngày {selectedDate}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Phiếu Đánh Giá Công Việc Từ Quản Lý Thầy Lê Huy Phúc
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thẩm định chất lượng ca trực, kỷ luật & chăm sóc học sinh
                </p>
              </div>

              {myEvaluationToday && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-2xl dark:bg-emerald-950/60 dark:border-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                    ĐÃ KÝ DUYỆT: {myEvaluationToday.totalScore} Đ (HẠNG {myEvaluationToday.rank})
                  </span>
                </div>
              )}
            </div>

            {myEvaluationToday ? (
              <div className="mt-6 space-y-6">
                {/* 5 Criteria Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-2xl bg-blue-50/70 p-3 text-center dark:bg-blue-950/30">
                    <div className="text-[11px] text-slate-500 font-medium">Vận hành ca trực</div>
                    <div className="mt-1 text-xl font-black text-blue-700 dark:text-blue-300">
                      {myEvaluationToday.operationScore} <span className="text-xs font-normal">/ 50</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50/70 p-3 text-center dark:bg-emerald-950/30">
                    <div className="text-[11px] text-slate-500 font-medium">Chất lượng & Vệ sinh</div>
                    <div className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">
                      {myEvaluationToday.qualityScore} <span className="text-xs font-normal">/ 20</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-purple-50/70 p-3 text-center dark:bg-purple-950/30">
                    <div className="text-[11px] text-slate-500 font-medium">Chăm sóc & 1-1 HS</div>
                    <div className="mt-1 text-xl font-black text-purple-700 dark:text-purple-300">
                      {myEvaluationToday.studentCareScore} <span className="text-xs font-normal">/ 15</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-indigo-50/70 p-3 text-center dark:bg-indigo-950/30">
                    <div className="text-[11px] text-slate-500 font-medium">Đóng góp & Hỗ trợ</div>
                    <div className="mt-1 text-xl font-black text-indigo-700 dark:text-indigo-300">
                      {myEvaluationToday.contributionScore} <span className="text-xs font-normal">/ 10</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-rose-50/70 p-3 text-center dark:bg-rose-950/30">
                    <div className="text-[11px] text-slate-500 font-medium">Kỷ luật & Tác phong</div>
                    <div className="mt-1 text-xl font-black text-rose-700 dark:text-rose-300">
                      {myEvaluationToday.disciplineScore} <span className="text-xs font-normal">/ 5</span>
                    </div>
                  </div>
                </div>

                {/* Manager Comments */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Lời nhận xét & Chỉ đạo của Quản lý Thầy Lê Huy Phúc:
                    </span>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white italic">
                      "{myEvaluationToday.generalComment}"
                    </p>
                  </div>

                  {myEvaluationToday.strengths && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300">
                      <strong>✓ Ưu điểm ghi nhận:</strong> {myEvaluationToday.strengths}
                    </div>
                  )}

                  {myEvaluationToday.improvements && (
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>⚠️ Điểm cần lưu ý / khắc phục:</strong> {myEvaluationToday.improvements}
                    </div>
                  )}

                  <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>Người thẩm định: Thầy Lê Huy Phúc • Trưởng Bộ phận Nội trú</span>
                    <span>Ký duyệt: {new Date(myEvaluationToday.evaluatedAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
                <Clock className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Chưa Có Đánh Giá Cho Ngày {selectedDate}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Quản lý Thầy Lê Huy Phúc sẽ tiến hành thẩm định và chấm điểm công việc sau khi kết thúc ca trực hoặc tổng kết cuối ngày.
                </p>
              </div>
            )}
          </div>

          {/* Section: Bảng Xếp Hạng Toàn Bộ Phận */}
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Bảng Xếp Hạng Thi Đua KPI Toàn Trường
            </h3>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="p-4">Hạng</th>
                    <th className="p-4">Giáo viên</th>
                    <th className="p-4">Vận hành</th>
                    <th className="p-4">Chất lượng</th>
                    <th className="p-4">Chăm sóc</th>
                    <th className="p-4">Đóng góp</th>
                    <th className="p-4">Kỷ luật</th>
                    <th className="p-4 text-right">Tổng Điểm</th>
                    <th className="p-4 text-center">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedKPIs.map((kpi, idx) => {
                    const isMe = kpi.teacherId === currentUser.id;
                    return (
                      <tr
                        key={kpi.id}
                        className={`transition ${
                          isMe
                            ? 'bg-blue-50/70 font-semibold dark:bg-blue-950/40 ring-1 ring-blue-500/30'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-4 font-black">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isMe
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {kpi.teacherName}
                            {isMe && (
                              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {kpi.teacherCode}
                          </div>
                        </td>
                        <td className="p-4 text-blue-600 font-semibold">{kpi.operationScore}</td>
                        <td className="p-4 text-emerald-600 font-semibold">{kpi.qualityScore}</td>
                        <td className="p-4 text-purple-600 font-semibold">{kpi.studentCareScore}</td>
                        <td className="p-4 text-indigo-600 font-semibold">{kpi.contributionScore}</td>
                        <td className="p-4 text-rose-600 font-semibold">{kpi.disciplineScore}</td>
                        <td className="p-4 text-right font-black text-sm text-blue-600">
                          {kpi.totalScore} Đ
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                              kpi.rank === 'A+'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : kpi.rank === 'A'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            Hạng {kpi.rank}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADMIN LÊ HUY PHÚC ĐÁNH GIÁ CÔNG VIỆC HẰNG NGÀY          */}
      {/* ============================================================== */}
      {evaluatingTeacher && (
        <Modal
          isOpen={!!evaluatingTeacher}
          onClose={() => setEvaluatingTeacher(null)}
          title={`Thẩm Định Công Việc • ${evaluatingTeacher.fullName}`}
          subtitle={`Mã: ${evaluatingTeacher.teacherCode} • Ngày đánh giá: ${selectedDate} • Người chấm: Thầy Lê Huy Phúc`}
        >
          <form onSubmit={handleSubmitEvaluation} className="space-y-5">
            {/* Quick 1-Click Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Chọn Mẫu Đánh Giá Nhanh (1-Click)</span>
                <span className="text-[10px] font-normal text-slate-400">Tự động điền điểm & nhận xét mẫu</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('excellent')}
                  className="rounded-xl border border-amber-200 bg-amber-50/60 p-2 text-left hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 transition"
                >
                  <div className="font-extrabold text-amber-800 dark:text-amber-300 text-xs">
                    ⭐ Xuất sắc (100Đ)
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Hạng A+ • Chuẩn mực</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('good')}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 text-left hover:bg-emerald-100 dark:border-emerald-950 dark:bg-emerald-950/40 transition"
                >
                  <div className="font-extrabold text-emerald-800 dark:text-emerald-300 text-xs">
                    🌟 Tốt / Đạt (95Đ)
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Hạng A • Hoàn thành tốt</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('average')}
                  className="rounded-xl border border-blue-200 bg-blue-50/60 p-2 text-left hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 transition"
                >
                  <div className="font-extrabold text-blue-800 dark:text-blue-300 text-xs">
                    ⚠️ Nhắc nhở (84Đ)
                  </div>
                  <div className="text-[10px] text-blue-700 dark:text-blue-400">Hạng B • Cần lưu ý</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('needs_improvement')}
                  className="rounded-xl border border-rose-200 bg-rose-50/60 p-2 text-left hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 transition"
                >
                  <div className="font-extrabold text-rose-800 dark:text-rose-300 text-xs">
                    🚨 Cần Cải Thiện (70Đ)
                  </div>
                  <div className="text-[10px] text-rose-700 dark:text-rose-400">Hạng C • Báo cáo muộn</div>
                </button>
              </div>
            </div>

            {/* Score Sliders & Inputs */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Chấm Điểm 5 Tiêu Chí KPI
                </span>
                <div className="text-right">
                  <span className="text-lg font-black text-blue-600">{calculatedTotal}</span>
                  <span className="text-xs text-slate-400"> / 100 Đ </span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                      calculatedRank === 'A+'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : calculatedRank === 'A'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    Hạng {calculatedRank}
                  </span>
                </div>
              </div>

              {/* 1. Operation Score (Max 50) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    1. Vận hành ca trực & Tiến độ (0 - 50 Đ)
                  </span>
                  <span className="font-bold text-blue-600 font-mono">
                    {evalForm.operationScore} / 50
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={evalForm.operationScore}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, operationScore: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600"
                />
              </div>

              {/* 2. Quality Score (Max 20) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    2. Chất lượng kiểm tra & Vệ sinh KTX (0 - 20 Đ)
                  </span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {evalForm.qualityScore} / 20
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={evalForm.qualityScore}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, qualityScore: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* 3. Student Care Score (Max 15) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    3. Quản lý nền nếp & Chăm sóc 1-1 Học sinh (0 - 15 Đ)
                  </span>
                  <span className="font-bold text-purple-600 font-mono">
                    {evalForm.studentCareScore} / 15
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={evalForm.studentCareScore}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, studentCareScore: Number(e.target.value) })
                  }
                  className="w-full accent-purple-600"
                />
              </div>

              {/* 4. Contribution Score (Max 10) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    4. Đóng góp, Hỗ trợ trực thay & Tinh thần phối hợp (0 - 10 Đ)
                  </span>
                  <span className="font-bold text-indigo-600 font-mono">
                    {evalForm.contributionScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={evalForm.contributionScore}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, contributionScore: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* 5. Discipline Score (Max 5) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    5. Kỷ luật, Đúng giờ & Tác phong (0 - 5 Đ)
                  </span>
                  <span className="font-bold text-rose-600 font-mono">
                    {evalForm.disciplineScore} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={evalForm.disciplineScore}
                  onChange={(e) =>
                    setEvalForm({ ...evalForm, disciplineScore: Number(e.target.value) })
                  }
                  className="w-full accent-rose-600"
                />
              </div>
            </div>

            {/* Comment & Feedback Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nhận xét & Dặn dò của Thầy Lê Huy Phúc (Bắt buộc)
                </label>
                <textarea
                  rows={2}
                  required
                  value={evalForm.generalComment}
                  onChange={(e) => setEvalForm({ ...evalForm, generalComment: e.target.value })}
                  placeholder="Nhập nhận xét tổng kết về ca trực hôm nay..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    Ưu điểm nổi bật trong ngày (nếu có)
                  </label>
                  <input
                    type="text"
                    value={evalForm.strengths}
                    onChange={(e) => setEvalForm({ ...evalForm, strengths: e.target.value })}
                    placeholder="VD: Chủ động kiểm tra vệ sinh, tương tác HS tốt..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                    Điểm cần khắc phục / Nhắc nhở (nếu có)
                  </label>
                  <input
                    type="text"
                    value={evalForm.improvements}
                    onChange={(e) => setEvalForm({ ...evalForm, improvements: e.target.value })}
                    placeholder="VD: Chú ý nộp báo cáo ca đúng giờ..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEvaluatingTeacher(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
              >
                Lưu Đánh Giá & Đồng Bộ KPI
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
