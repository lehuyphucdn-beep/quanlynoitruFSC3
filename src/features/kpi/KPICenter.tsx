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
  Info,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { KPIRecord, User, DailyEvaluation } from '../../types';
import { Modal } from '../../components/common/Modal';

export const KPICenter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(BOPSStore.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(BOPSStore.getUsers());
  const [kpis, setKPIs] = useState<KPIRecord[]>([]);
  const [dailyEvaluations, setDailyEvaluations] = useState<DailyEvaluation[]>([]);

  // Timeframe State: Hằng Ngày (day), Hằng Tuần (week), Hằng Tháng (month)
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

  // Helper to determine week bounds (Monday - Sunday) of selectedDate
  const getWeekRange = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monStr = monday.toISOString().split('T')[0];
    const sunStr = sunday.toISOString().split('T')[0];
    return { monStr, sunStr };
  };

  const { monStr, sunStr } = getWeekRange(selectedDate);
  const currentMonthPrefix = selectedDate.substring(0, 7); // 'YYYY-MM'

  // Dynamic ranking calculation based on timeframe: 'day' | 'week' | 'month'
  const rankedTeachers = teachers.map((teacher) => {
    const teacherEvals = dailyEvaluations.filter((e) => e.teacherId === teacher.id);
    const teacherInteractions = BOPSStore.getInteractions().filter((i) => i.teacherId === teacher.id);
    const fallbackKpi = kpis.find((k) => k.teacherId === teacher.id);

    if (timeframe === 'day') {
      const evalToday = teacherEvals.find((e) => e.date === selectedDate);
      if (evalToday) {
        return {
          teacher,
          operationScore: evalToday.operationScore,
          qualityScore: evalToday.qualityScore,
          studentCareScore: evalToday.studentCareScore,
          contributionScore: evalToday.contributionScore,
          disciplineScore: evalToday.disciplineScore,
          totalScore: evalToday.totalScore,
          rank: evalToday.rank,
          evaluatedShiftsCount: 1,
          isEvaluated: true,
          generalComment: evalToday.generalComment,
          strengths: evalToday.strengths,
          improvements: evalToday.improvements,
          evaluatedAt: evalToday.evaluatedAt,
        };
      }
      return {
        teacher,
        operationScore: fallbackKpi?.operationScore || 0,
        qualityScore: fallbackKpi?.qualityScore || 0,
        studentCareScore: fallbackKpi?.studentCareScore || 0,
        contributionScore: fallbackKpi?.contributionScore || 0,
        disciplineScore: fallbackKpi?.disciplineScore || 0,
        totalScore: fallbackKpi?.totalScore || 0,
        rank: (fallbackKpi?.rank || 'B') as 'A+' | 'A' | 'B' | 'C' | 'D',
        evaluatedShiftsCount: 0,
        isEvaluated: false,
        generalComment: 'Chưa có thẩm định trong ngày này từ Quản lý.',
        strengths: '',
        improvements: '',
        evaluatedAt: null,
      };
    }

    if (timeframe === 'week') {
      const evalsInWeek = teacherEvals.filter((e) => e.date >= monStr && e.date <= sunStr);
      // Student care weekly condition: >= 1 HS interaction => 15đ, 0 HS => 0đ
      const weeklyCareScore = teacherInteractions.length >= 1 ? 15 : 0;

      if (evalsInWeek.length > 0) {
        const count = evalsInWeek.length;
        const avgOp = Math.round(evalsInWeek.reduce((s, e) => s + e.operationScore, 0) / count);
        const avgQ = Math.round(evalsInWeek.reduce((s, e) => s + e.qualityScore, 0) / count);
        const avgCont = Math.round(evalsInWeek.reduce((s, e) => s + e.contributionScore, 0) / count);
        const avgDisc = Math.round(evalsInWeek.reduce((s, e) => s + e.disciplineScore, 0) / count);
        const total = Math.max(0, Math.min(100, avgOp + avgQ + weeklyCareScore + avgCont + avgDisc));

        let r: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
        if (total >= 97 && avgDisc === 5) r = 'A+';
        else if (total >= 90) r = 'A';
        else if (total >= 80) r = 'B';
        else if (total >= 70) r = 'C';
        else r = 'D';

        return {
          teacher,
          operationScore: avgOp,
          qualityScore: avgQ,
          studentCareScore: weeklyCareScore,
          contributionScore: avgCont,
          disciplineScore: avgDisc,
          totalScore: total,
          rank: r,
          evaluatedShiftsCount: count,
          isEvaluated: true,
          generalComment: `Tổng kết tuần (${monStr} đến ${sunStr}): Đã thẩm định ${count} ca trực.`,
          strengths: 'Duy trì nền nếp ca trực và chăm sóc học sinh nội trú toàn trường.',
          improvements: '',
          evaluatedAt: evalsInWeek[0].evaluatedAt,
        };
      }
      return {
        teacher,
        operationScore: fallbackKpi?.operationScore || 45,
        qualityScore: fallbackKpi?.qualityScore || 18,
        studentCareScore: weeklyCareScore,
        contributionScore: fallbackKpi?.contributionScore || 9,
        disciplineScore: fallbackKpi?.disciplineScore || 5,
        totalScore: Math.max(0, Math.min(100, (fallbackKpi?.operationScore || 45) + (fallbackKpi?.qualityScore || 18) + weeklyCareScore + 9 + 5)),
        rank: (fallbackKpi?.rank || 'B') as 'A+' | 'A' | 'B' | 'C' | 'D',
        evaluatedShiftsCount: 0,
        isEvaluated: false,
        generalComment: 'Đang chờ thẩm định các ca trực trong tuần này.',
        strengths: '',
        improvements: '',
        evaluatedAt: null,
      };
    }

    // timeframe === 'month'
    const evalsInMonth = teacherEvals.filter((e) => e.date.startsWith(currentMonthPrefix));
    if (evalsInMonth.length > 0) {
      const count = evalsInMonth.length;
      const avgOp = Math.round(evalsInMonth.reduce((s, e) => s + e.operationScore, 0) / count);
      const avgQ = Math.round(evalsInMonth.reduce((s, e) => s + e.qualityScore, 0) / count);
      const avgCare = Math.round(evalsInMonth.reduce((s, e) => s + e.studentCareScore, 0) / count);
      const avgCont = Math.round(evalsInMonth.reduce((s, e) => s + e.contributionScore, 0) / count);
      const avgDisc = Math.round(evalsInMonth.reduce((s, e) => s + e.disciplineScore, 0) / count);
      const total = Math.max(0, Math.min(100, avgOp + avgQ + avgCare + avgCont + avgDisc));

      let r: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
      if (total >= 97 && avgDisc === 5) r = 'A+';
      else if (total >= 90) r = 'A';
      else if (total >= 80) r = 'B';
      else if (total >= 70) r = 'C';
      else r = 'D';

      return {
        teacher,
        operationScore: avgOp,
        qualityScore: avgQ,
        studentCareScore: avgCare,
        contributionScore: avgCont,
        disciplineScore: avgDisc,
        totalScore: total,
        rank: r,
        evaluatedShiftsCount: count,
        isEvaluated: true,
        generalComment: `Tổng kết tháng ${currentMonthPrefix}: Đã thẩm định ${count} ca trực.`,
        strengths: 'Hoàn thành khối lượng công việc quản nhiệm tháng.',
        improvements: '',
        evaluatedAt: evalsInMonth[0].evaluatedAt,
      };
    }

    return {
      teacher,
      operationScore: fallbackKpi?.operationScore || 45,
      qualityScore: fallbackKpi?.qualityScore || 18,
      studentCareScore: fallbackKpi?.studentCareScore || 14,
      contributionScore: fallbackKpi?.contributionScore || 9,
      disciplineScore: fallbackKpi?.disciplineScore || 5,
      totalScore: fallbackKpi?.totalScore || 85,
      rank: (fallbackKpi?.rank || 'B') as 'A+' | 'A' | 'B' | 'C' | 'D',
      evaluatedShiftsCount: 0,
      isEvaluated: false,
      generalComment: 'Đang cập nhật đánh giá tháng từ hệ thống.',
      strengths: '',
      improvements: '',
      evaluatedAt: null,
    };
  });

  // Sort descending by totalScore
  const sortedRankedTeachers = [...rankedTeachers].sort((a, b) => b.totalScore - a.totalScore);

  // Current user's specific ranking & stats
  const myCurrentRankItem = sortedRankedTeachers.find((item) => item.teacher.id === currentUser.id);
  const myCurrentRankIndex = sortedRankedTeachers.findIndex((item) => item.teacher.id === currentUser.id);
  const myEvaluationToday = dailyEvaluations.find(
    (e) => e.teacherId === currentUser.id && e.date === selectedDate
  );

  // Status mapping for teachers on selectedDate (Manager View)
  const evalsForSelectedDate = dailyEvaluations.filter((e) => e.date === selectedDate);
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

  const evaluatedCount = teachersWithEvalStatus.filter((t) => t.isEvaluated).length;

  // Filter teachers for manager view
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

  // Open modal for evaluating a teacher (Admin)
  const handleOpenEvaluationModal = (teacher: User) => {
    setEvaluatingTeacher(teacher);
    const existing = dailyEvaluations.find(
      (e) => e.teacherId === teacher.id && e.date === selectedDate
    );

    const interactions = BOPSStore.getInteractions().filter((i) => i.teacherId === teacher.id);
    const carePts = interactions.length >= 1 ? 15 : 0;

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
      setEvalForm({
        operationScore: 48,
        qualityScore: 19,
        studentCareScore: carePts,
        contributionScore: 9,
        disciplineScore: 5,
        strengths: 'Chủ động bàn giao ca đúng giờ, quản lý trật tự KTX ổn định.',
        improvements: 'Duy trì nhắc nhở học sinh tắt các thiết bị điện khi rời phòng.',
        generalComment: 'Thầy/Cô hoàn thành tốt ca trực hôm nay, tác phong chuẩn mực.',
      });
    }
  };

  const applyPreset = (preset: 'excellent' | 'good' | 'average' | 'needs_improvement') => {
    const teacherInteractions = evaluatingTeacher
      ? BOPSStore.getInteractions().filter((i) => i.teacherId === evaluatingTeacher.id)
      : [];
    const carePts = teacherInteractions.length >= 1 ? 15 : 0;

    switch (preset) {
      case 'excellent':
        setEvalForm({
          operationScore: 50,
          qualityScore: 20,
          studentCareScore: carePts === 15 ? 15 : 12,
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
          studentCareScore: carePts,
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
          studentCareScore: Math.min(12, carePts),
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
          studentCareScore: 10,
          contributionScore: 6,
          disciplineScore: 3,
          strengths: 'Đã hoàn thành bàn giao ca.',
          improvements: 'Báo cáo ca trực trễ, chưa nhắc nhở học sinh giữ trật tự giờ tự học.',
          generalComment: 'Chưa đạt yêu cầu ca trực. Đề nghị rút kinh nghiệm và chấn chỉnh tác phong ngay ngày mai.',
        });
        break;
    }
  };

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

  const myInteractionsThisWeek = BOPSStore.getInteractions().filter((i) => i.teacherId === currentUser.id);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Award className="h-4 w-4" />
            <span>Hệ Thống Đánh Giá KPI & Xếp Hạng • Quản Trị Học Sinh Nội Trú Toàn Trường</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {isManager
              ? 'Thẩm Định & Bảng Xếp Hạng KPI Giáo Viên Quản Nhiệm'
              : 'Hiệu Suất KPI & Bảng Xếp Hạng Của Bạn'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isManager
              ? 'Điểm số được đồng bộ tự động từ Trung tâm Vận hành sau khi Admin kiểm tra thực tế & duyệt báo cáo hằng ngày.'
              : 'Thầy/Cô xem trực tiếp điểm số của mình và theo dõi bảng xếp hạng thi đua hằng ngày, hằng tuần, hằng tháng toàn trường.'}
          </p>
        </div>

        {/* Date Selector & Today button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngày đối soát:</span>
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
              className="rounded-xl bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
            >
              Hôm nay
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TIMEFRAME SWITCHER BAR: HẰNG NGÀY / HẰNG TUẦN / HẰNG THÁNG      */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
            Chu kỳ thống kê:
          </span>
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setTimeframe('day')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-bold transition ${
                timeframe === 'day'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Hằng Ngày (Daily)</span>
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-bold transition ${
                timeframe === 'week'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Hằng Tuần (Weekly)</span>
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-bold transition ${
                timeframe === 'month'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Hằng Tháng (Monthly)</span>
            </button>
          </div>
        </div>

        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {timeframe === 'day' && (
            <span>📅 Ngày đang xem: <strong className="text-slate-800 dark:text-white">{selectedDate}</strong></span>
          )}
          {timeframe === 'week' && (
            <span>🗓️ Tuần hiện tại: <strong className="text-slate-800 dark:text-white">{monStr}</strong> đến <strong className="text-slate-800 dark:text-white">{sunStr}</strong></span>
          )}
          {timeframe === 'month' && (
            <span>📊 Tháng hiện tại: <strong className="text-slate-800 dark:text-white">{currentMonthPrefix}</strong></span>
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
                <span>Thẩm Định Theo Ngày ({selectedDate})</span>
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
                <span>Bảng Xếp Hạng ({timeframe === 'day' ? 'Ngày' : timeframe === 'week' ? 'Tuần' : 'Tháng'})</span>
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
                <span>Nhật Ký Đánh Giá ({dailyEvaluations.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: DAILY EVALUATION LIST */}
          {managerTab === 'daily_evaluation' && (
            <div className="space-y-4">
              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTeacherQuery}
                    onChange={(e) => setSearchTeacherQuery(e.target.value)}
                    placeholder="Tìm theo tên giáo viên, mã GV..."
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Lọc trạng thái:</span>
                  <select
                    value={filterEvaluationStatus}
                    onChange={(e) =>
                      setFilterEvaluationStatus(e.target.value as 'all' | 'evaluated' | 'pending')
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="all">Tất cả ({teachers.length})</option>
                    <option value="evaluated">Đã thẩm định ({evaluatedCount})</option>
                    <option value="pending">Chờ thẩm định ({teachers.length - evaluatedCount})</option>
                  </select>
                </div>
              </div>

              {/* Teacher Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeacherList.map(({ teacher, evaluation, isEvaluated, interactionsCount }) => (
                  <div
                    key={teacher.id}
                    className={`rounded-3xl border p-5 transition shadow-sm ${
                      isEvaluated
                        ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-950 dark:bg-slate-900'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={teacher.avatar}
                          alt={teacher.fullName}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/20"
                        />
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {teacher.fullName}
                          </h4>
                          <div className="text-xs text-slate-500 font-mono">
                            {teacher.teacherCode} • {teacher.buildingResponsible || 'Khối KTX'}
                          </div>
                        </div>
                      </div>

                      {isEvaluated ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {evaluation?.totalScore} Đ • Hạng {evaluation?.rank}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Chờ chấm
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span>Tương tác 1-1 tuần này:</span>
                        <span className="font-bold text-purple-600">
                          {interactionsCount} HS {interactionsCount >= 1 ? '✓ Đạt' : 'Chưa đạt'}
                        </span>
                      </div>

                      {isEvaluated && evaluation && (
                        <div className="rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 space-y-1">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            Nhận xét của Quản lý:
                          </div>
                          <div className="text-slate-600 dark:text-slate-300 italic text-[11px]">
                            "{evaluation.generalComment}"
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleOpenEvaluationModal(teacher)}
                        className={`w-full rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                          isEvaluated
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>{isEvaluated ? 'Chỉnh Sửa Đánh Giá' : 'Chấm Điểm Ca Trực'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: RANKING TABLE (FOR MANAGER) */}
          {managerTab === 'ranking' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>
                    Bảng Xếp Hạng Thi Đua KPI Toàn Trường ({timeframe === 'day' ? 'Hằng Ngày' : timeframe === 'week' ? 'Hằng Tuần' : 'Hằng Tháng'})
                  </span>
                </h3>
                <span className="text-xs text-slate-500">
                  Tổng số: {sortedRankedTeachers.length} Giáo viên Quản nhiệm
                </span>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                    <tr>
                      <th className="p-4">Hạng</th>
                      <th className="p-4">Giáo viên</th>
                      <th className="p-4 text-center">Vận hành (50đ)</th>
                      <th className="p-4 text-center">Chất lượng (20đ)</th>
                      <th className="p-4 text-center">Chăm sóc 1-1 (15đ)</th>
                      <th className="p-4 text-center">Đóng góp (10đ)</th>
                      <th className="p-4 text-center">Kỷ luật (5đ)</th>
                      <th className="p-4 text-right">Tổng Điểm</th>
                      <th className="p-4 text-center">Xếp loại</th>
                      <th className="p-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedRankedTeachers.map((item, idx) => (
                      <tr
                        key={item.teacher.id}
                        className="hover:bg-slate-50/80 transition dark:hover:bg-slate-800/50"
                      >
                        <td className="p-4 font-black text-slate-900 dark:text-white">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              idx === 0
                                ? 'bg-amber-500 text-white shadow-sm'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-800'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.teacher.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.teacher.teacherCode}
                          </div>
                        </td>
                        <td className="p-4 text-center font-semibold text-blue-600">{item.operationScore}</td>
                        <td className="p-4 text-center font-semibold text-emerald-600">{item.qualityScore}</td>
                        <td className="p-4 text-center font-semibold text-purple-600">{item.studentCareScore}</td>
                        <td className="p-4 text-center font-semibold text-indigo-600">{item.contributionScore}</td>
                        <td className="p-4 text-center font-semibold text-rose-600">{item.disciplineScore}</td>
                        <td className="p-4 text-right font-black text-base text-blue-600">
                          {item.totalScore} Đ
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                              item.rank === 'A+'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-400/40'
                                : item.rank === 'A'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            Hạng {item.rank}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOpenEvaluationModal(item.teacher)}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                          >
                            Chấm điểm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {managerTab === 'history' && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-4">
                  Lịch Sử Đánh Giá & Đồng Bộ KPI Toàn Trường
                </h3>
                <div className="space-y-3">
                  {dailyEvaluations.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{ev.teacherName}</span>
                          <span className="font-mono text-slate-400">({ev.teacherCode})</span>
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Ngày {ev.date}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 italic">
                          "{ev.generalComment}"
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-sm text-blue-600">{ev.totalScore} Đ</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Hạng {ev.rank}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* SECTION 2: TEACHER VIEW (Giáo viên Quản nhiệm)                 */
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
                  Đánh Giá Hiệu Suất KPI & Xếp Hạng Học Sinh Nội Trú Toàn Trường
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Toàn bộ điểm số của Thầy/Cô được Quản lý <strong>Thầy Lê Huy Phúc</strong> trực tiếp thẩm định từ Trung tâm Vận hành. Thầy/Cô có thể theo dõi xếp hạng theo <strong>Hằng ngày, Hằng tuần hoặc Hằng tháng</strong> minh bạch dưới đây.
                </p>
              </div>
            </div>
          </div>

          {/* Personal KPI Summary Cards for Selected Timeframe */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">
                Điểm KPI Của Bạn ({timeframe === 'day' ? 'Ngày' : timeframe === 'week' ? 'Tuần' : 'Tháng'})
              </div>
              <div className="mt-2 text-3xl font-black text-blue-600">
                {myCurrentRankItem?.totalScore || 0}
                <span className="text-xs font-normal text-slate-400"> / 100 Đ</span>
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-600">
                Xếp loại: Hạng {myCurrentRankItem?.rank || 'B'}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">Tương tác 1-1 Tuần Này</div>
              <div className="mt-2 text-3xl font-black text-purple-600">
                {myInteractionsThisWeek.length}
                <span className="text-xs font-normal text-slate-400"> / 1 HS</span>
              </div>
              <div className="mt-1 text-[11px] font-bold">
                {myInteractionsThisWeek.length >= 1 ? (
                  <span className="text-emerald-600">✓ Đạt 15đ trọng số (Mục C)</span>
                ) : (
                  <span className="text-rose-600">⏳ Chưa đạt (0đ trọng số)</span>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">
                Thứ Hạng ({timeframe === 'day' ? 'Ngày' : timeframe === 'week' ? 'Tuần' : 'Tháng'})
              </div>
              <div className="mt-2 text-3xl font-black text-amber-600">
                #{myCurrentRankIndex >= 0 ? myCurrentRankIndex + 1 : '-'}
                <span className="text-xs font-normal text-slate-400"> / {teachers.length} GV</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Bảng thi đua toàn trường</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">Ca Trực Đã Thẩm Định</div>
              <div className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">
                {myCurrentRankItem?.evaluatedShiftsCount || 0}
                <span className="text-xs font-normal text-slate-400"> ca</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {timeframe === 'day' ? 'Trong ngày' : timeframe === 'week' ? 'Trong tuần' : 'Trong tháng'}
              </div>
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
                  Thẩm định ca trực, kỷ luật & chăm sóc học sinh nội trú toàn trường
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
                    <span>Người thẩm định: Thầy Lê Huy Phúc • Trưởng Bộ phận Quản nhiệm</span>
                    <span>
                      Ký duyệt: {myEvaluationToday.evaluatedAt ? new Date(myEvaluationToday.evaluatedAt).toLocaleString('vi-VN') : 'Đã duyệt'}
                    </span>
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
                  Quản lý Thầy Lê Huy Phúc sẽ tiến hành thẩm định và chấm điểm công việc từ Trung tâm Vận hành sau khi kết thúc ca trực hoặc sau khi kiểm tra thực tế & duyệt báo cáo ngày.
                </p>
              </div>
            )}
          </div>

          {/* Section: Bảng Xếp Hạng Thi Đua Hằng Ngày / Tuần / Tháng */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <span>
                  Bảng Xếp Hạng Thi Đua KPI ({timeframe === 'day' ? 'Hằng Ngày' : timeframe === 'week' ? 'Hằng Tuần' : 'Hằng Tháng'}) Toàn Trường
                </span>
              </h3>
              <span className="text-xs text-slate-500">
                Thứ hạng của bạn: <strong className="text-blue-600">#{myCurrentRankIndex >= 0 ? myCurrentRankIndex + 1 : '-'}</strong> / {teachers.length} GV
              </span>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="p-4">Hạng</th>
                    <th className="p-4">Giáo viên Quản nhiệm</th>
                    <th className="p-4 text-center">Vận hành (50đ)</th>
                    <th className="p-4 text-center">Chất lượng (20đ)</th>
                    <th className="p-4 text-center">Chăm sóc 1-1 (15đ)</th>
                    <th className="p-4 text-center">Đóng góp (10đ)</th>
                    <th className="p-4 text-center">Kỷ luật (5đ)</th>
                    <th className="p-4 text-right">Tổng Điểm</th>
                    <th className="p-4 text-center">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedRankedTeachers.map((item, idx) => {
                    const isMe = item.teacher.id === currentUser.id;
                    return (
                      <tr
                        key={item.teacher.id}
                        className={`transition ${
                          isMe
                            ? 'bg-blue-50/80 font-bold dark:bg-blue-950/50 ring-2 ring-blue-500/40'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-4 font-black">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isMe
                                ? 'bg-blue-600 text-white shadow-md'
                                : idx === 0
                                ? 'bg-amber-500 text-white'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-800'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{item.teacher.fullName}</span>
                            {isMe && (
                              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase shadow-sm">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.teacher.teacherCode} • {item.teacher.buildingResponsible || 'Khối KTX'}
                          </div>
                        </td>
                        <td className="p-4 text-center text-blue-600 font-semibold">{item.operationScore}</td>
                        <td className="p-4 text-center text-emerald-600 font-semibold">{item.qualityScore}</td>
                        <td className="p-4 text-center text-purple-600 font-semibold">{item.studentCareScore}</td>
                        <td className="p-4 text-center text-indigo-600 font-semibold">{item.contributionScore}</td>
                        <td className="p-4 text-center text-rose-600 font-semibold">{item.disciplineScore}</td>
                        <td className="p-4 text-right font-black text-sm text-blue-600">
                          {item.totalScore} Đ
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                              item.rank === 'A+'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-400/40'
                                : item.rank === 'A'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            Hạng {item.rank}
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
                <div className="text-[10px] text-slate-500 mt-1">
                  Chỉ tiêu: Tuần tối thiểu 1 HS tương tác 1-1 = Đạt 15đ (Không nhập: 0đ)
                </div>
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
