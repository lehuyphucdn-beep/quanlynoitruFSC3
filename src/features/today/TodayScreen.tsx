import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Camera,
  FileText,
  Plus,
  Send,
  MessageSquareHeart,
  ChevronRight,
  Award,
  Sparkles,
  ShieldAlert,
  Flame,
  Building2,
  MapPin,
  CheckSquare,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { TaskInstance, TaskStatus, User } from '../../types';
import { Modal } from '../../components/common/Modal';

interface TodayScreenProps {
  setActiveModule: (mod: string) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ setActiveModule }) => {
  const [currentUser, setCurrentUser] = useState<User>(BOPSStore.getCurrentUser());
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<TaskInstance | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [showInteractionModal, setShowInteractionModal] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const u = BOPSStore.getCurrentUser();
      setCurrentUser(u);
      const allTasks = BOPSStore.getTasks();
      const userTasks = allTasks.filter((t) => t.teacherId === u.id);
      setTasks(userTasks);
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  const todayDateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const completedCount = tasks.filter((t) => t.status === 'completed' || t.status === 'verified').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'working').length;
  const lateCount = tasks.filter((t) => t.status === 'late').length;

  const currentKPI = BOPSStore.getKPIs().find((k) => k.teacherId === currentUser.id) || {
    totalScore: 96,
    rank: 'A',
    interactionsCompletedThisWeek: 2,
  };

  const handleStartTask = (taskId: string) => {
    BOPSStore.updateTaskStatus(taskId, 'working');
  };

  const handleOpenCompleteModal = (task: TaskInstance) => {
    setSelectedTaskForComplete(task);
    setCompletionNote('');
    setProofPhotoUrl('');
  };

  const handleConfirmCompletion = () => {
    if (!selectedTaskForComplete) return;
    BOPSStore.updateTaskStatus(
      selectedTaskForComplete.id,
      'completed',
      completionNote || undefined,
      proofPhotoUrl ? [proofPhotoUrl] : undefined
    );
    setSelectedTaskForComplete(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Daily Briefing Banner (Bản tin đầu ngày) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Bản tin Vận hành Đầu ngày</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Xin chào, {currentUser.fullName}!
            </h2>
            <p className="text-xs text-blue-100 max-w-xl">
              Hôm nay bạn có <strong className="text-amber-300">{tasks.length} nhiệm vụ</strong> được phân công theo lịch trực. Hãy thực hiện đúng mốc thời gian để duy trì điểm Reliability.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="text-center">
              <div className="text-xs font-semibold text-blue-200">KPI Tạm tính</div>
              <div className="text-2xl font-black text-amber-300">{currentKPI.totalScore}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white">
                Hạng {currentKPI.rank}
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-xs font-semibold text-blue-200">Workload Index</div>
              <div className="text-xl font-bold text-white">{currentUser.workloadIndex}</div>
              <div className="text-[10px] text-blue-200">Phòng & HS</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Progress Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Tổng Task hôm nay</span>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{tasks.length}</div>
          <div className="text-[11px] text-slate-400">Sinh tự động từ Lịch trực</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Đã hoàn thành</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{completedCount}</div>
          <div className="text-[11px] text-slate-400">Task đạt yêu cầu</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Đang chờ / Đang làm</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{pendingCount}</div>
          <div className="text-[11px] text-slate-400">Cần thực hiện trong ca</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Tương tác 1-1 Tuần</span>
            <MessageSquareHeart className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600">
            {currentKPI.interactionsCompletedThisWeek} <span className="text-xs font-normal text-slate-400">/ 1 HS</span>
          </div>
          <div className="text-[11px] text-slate-400">Tối thiểu nhập 1 HS/tuần (Không nhập: 0đ)</div>
        </div>
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline Task Center */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Timeline Công việc Ca trực ({todayDateStr})
            </h3>
            <button
              onClick={() => setActiveModule('operations')}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
            >
              Trung tâm Vận hành <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-slate-800">
              Chưa có nhiệm vụ nào được phân công cho hôm nay.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isCompleted = task.status === 'completed' || task.status === 'verified';
                const isWorking = task.status === 'working';
                const isLate = task.status === 'late';

                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/20'
                        : isWorking
                        ? 'border-blue-400 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : isLate
                        ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/30'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {task.plannedStart} - {task.plannedEnd}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              task.taskCategory === 'core'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {task.taskCategory}
                          </span>
                          {task.roomName && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Building2 className="h-3.5 w-3.5" />
                              {task.roomName}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {task.taskName}
                        </h4>

                        {task.note && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                            Ghi chú: {task.note}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Đã hoàn thành</span>
                          </div>
                        ) : isWorking ? (
                          <button
                            onClick={() => handleOpenCompleteModal(task)}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Xác nhận Hoàn thành
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
                          >
                            <Clock className="h-4 w-4" />
                            Bắt đầu làm
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Student Care Target & Daily Closing */}
        <div className="space-y-6">
          {/* Weekly 1-1 Interaction Target Card */}
          <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm dark:border-purple-950 dark:from-purple-950/30 dark:to-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
                  <MessageSquareHeart className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tương tác 1-1 Học sinh</h4>
                  <p className="text-[10px] text-slate-500">Tối thiểu nhập 1 HS/tuần (Mục C - 15đ)</p>
                </div>
              </div>
              <span className="text-sm font-black text-purple-600">
                {currentKPI.interactionsCompletedThisWeek} / 1 HS
              </span>
            </div>

            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-purple-100 dark:bg-purple-950">
                <div
                  className="h-2 rounded-full bg-purple-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentKPI.interactionsCompletedThisWeek / 3) * 100)}%` }}
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              Nhật ký tương tác 1-1 giúp xây dựng cơ sở dữ liệu chăm sóc học sinh xuyên suốt. Hãy trao đổi & lắng nghe học sinh hôm nay.
            </p>

            <button
              onClick={() => setActiveModule('interactions')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition"
            >
              <Plus className="h-4 w-4" />
              + Nhập Tương tác 1-1 Mới
            </button>
          </div>

          {/* Daily Closing Summary (Tổng kết cuối ngày) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daily Closing (Tổng kết ca)
            </h4>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Tiến độ Task:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {completedCount} / {tasks.length} hoàn thành
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">KPI Tạm tính:</span>
                <span className="font-bold text-blue-600">{currentKPI.totalScore} Điểm</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Vi phạm / Nhắc nhở:</span>
                <span className="font-bold text-emerald-600">0 Lần</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              Hệ thống tự động đồng bộ kết quả ca trực lên Dashboard và xuất báo cáo cho Trưởng bộ phận lúc 22:45.
            </p>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      <Modal
        isOpen={!!selectedTaskForComplete}
        onClose={() => setSelectedTaskForComplete(null)}
        title="Xác nhận Hoàn thành Nhiệm vụ"
        subtitle={selectedTaskForComplete?.taskName}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú hoàn thành (tùy chọn)
            </label>
            <textarea
              rows={3}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Nhập thông tin kiểm tra, tình hình phòng hoặc ghi chú ca trực..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Đính kèm ảnh minh chứng (nếu có)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={proofPhotoUrl}
                onChange={(e) => setProofPhotoUrl(e.target.value)}
                placeholder="Dán link URL ảnh minh chứng (e.g. Unsplash URL)"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() =>
                  setProofPhotoUrl(
                    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=300'
                  )
                }
                className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
              >
                Mẫu ảnh
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setSelectedTaskForComplete(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmCompletion}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Hoàn thành
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
