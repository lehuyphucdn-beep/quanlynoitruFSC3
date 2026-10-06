import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  FileText,
  ShieldCheck,
  Building2,
  User,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { TaskInstance, TaskStatus, User as UserType } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import {
  WorkEvaluationModal,
  WorkEvaluationItem,
} from '../../components/common/WorkEvaluationModal';

export const TaskCenter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType>(BOPSStore.getCurrentUser());
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [teachers, setTeachers] = useState<UserType[]>([]);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Add Task Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskInstance | null>(null);

  const handleEditTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const teacher = teachers.find((t) => t.id === editingTask.teacherId);
    const updated = {
      ...editingTask,
      taskName: editingTask.title || editingTask.taskName,
      teacherName: teacher ? teacher.fullName : editingTask.teacherName,
    };
    BOPSStore.updateTask(updated);
    setEditingTask(null);
  };

  // Delete Task state
  const [taskToDelete, setTaskToDelete] = useState<TaskInstance | null>(null);

  // Evaluation Modal state
  const [evaluationItem, setEvaluationItem] = useState<WorkEvaluationItem | null>(null);

  const handleOpenEvaluationModal = (t: TaskInstance) => {
    setEvaluationItem({
      itemType: 'task',
      id: t.id,
      title: t.title || t.taskName,
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      date: t.date,
      shift: t.shift,
      completionNote: t.note,
      proofPhotos: t.proofPhotos,
      status: t.status,
      verified: t.verified,
      evaluationCriteria: t.evaluationCriteria,
      deductedPoints: t.deductedPoints,
      evaluationNote: t.note,
    });
  };

  const handleExecuteEvaluation = (evalData: {
    itemType: 'task' | 'schedule';
    itemId: string;
    evaluation: 'approved' | 'rejected';
    criteriaKey?: 'operation' | 'quality' | 'studentCare' | 'discipline';
    criteriaLabel?: string;
    deductedPoints?: number;
    reason?: string;
  }) => {
    BOPSStore.evaluateWorkItem({
      itemType: evalData.itemType,
      itemId: evalData.itemId,
      managerName: currentUser.fullName,
      evaluation: evalData.evaluation,
      criteriaKey: evalData.criteriaKey,
      criteriaLabel: evalData.criteriaLabel,
      deductedPoints: evalData.deductedPoints,
      reason: evalData.reason,
    });
  };

  const handleDeleteTask = (task: TaskInstance) => {
    setTaskToDelete(task);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      BOPSStore.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    taskCategory: 'routine' as 'routine' | 'hygiene' | 'security' | 'event' | 'discipline',
    teacherId: '',
    shift: 'morning' as 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night',
    plannedStart: '07:00',
    plannedEnd: '07:30',
    building: 'Tòa A - Nam',
    roomName: 'Tầng 2 - KTX A',
    weight: 1.0,
  });

  useEffect(() => {
    const loadData = () => {
      const u = BOPSStore.getCurrentUser();
      setCurrentUser(u);
      const allTasks = BOPSStore.getTasks();
      const allTeachers = BOPSStore.getUsers().filter((x) => x.role === 'teacher');
      setTeachers(allTeachers);

      if (allTeachers.length > 0 && !newTaskData.teacherId) {
        setNewTaskData((prev) => ({ ...prev, teacherId: allTeachers[0].id }));
      }

      if (u.role === 'teacher') {
        setTasks(allTasks.filter((t) => t.teacherId === u.id));
      } else {
        setTasks(allTasks);
      }
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title || !newTaskData.teacherId) return;

    const teacher = teachers.find((t) => t.id === newTaskData.teacherId);
    if (!teacher) return;

    BOPSStore.addTask({
      taskCode: `TSK-${Date.now().toString().slice(-4)}`,
      taskName: newTaskData.title,
      title: newTaskData.title,
      taskCategory: 'routine',
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      shift: newTaskData.shift,
      plannedStart: newTaskData.plannedStart,
      plannedEnd: newTaskData.plannedEnd,
      date: new Date().toISOString().substring(0, 10),
      roomName: newTaskData.roomName,
      status: 'pending',
      score: 10,
      verified: false,
      priority: 'medium',
    });

    setIsAddModalOpen(false);
    setNewTaskData({
      title: '',
      taskCategory: 'routine',
      teacherId: teachers[0]?.id || '',
      shift: 'morning',
      plannedStart: '07:00',
      plannedEnd: '07:30',
      building: 'Tòa A - Nam',
      roomName: 'Tầng 2 - KTX A',
      weight: 1.0,
    });
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedShiftFilter !== 'all' && t.shift !== selectedShiftFilter) return false;
    if (selectedCategoryFilter !== 'all' && t.taskCategory !== selectedCategoryFilter) return false;
    if (selectedStatusFilter !== 'all' && t.status !== selectedStatusFilter) return false;
    return true;
  });

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    BOPSStore.updateTaskStatus(taskId, status);
  };

  const handleVerifyTask = (taskId: string, approved: boolean) => {
    BOPSStore.verifyTask(taskId, currentUser.teacherCode || 'MANAGER', approved);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <CheckSquare className="h-4 w-4" />
            <span>Task Engine & Checklist</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Trung tâm Công việc & Kiểm tra Checklist
          </h2>
        </div>

        {/* Action & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Giao Checklist Mới</span>
          </button>

          {['all', 'morning', 'lunch', 'afternoon', 'evening', 'night'].map((sh) => (
            <button
              key={sh}
              onClick={() => setSelectedShiftFilter(sh)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition capitalize ${
                selectedShiftFilter === sh
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {sh === 'all' ? 'Tất cả Ca' : `Ca ${sh}`}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-slate-800">
            Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed' || task.status === 'verified';
            const isWorking = task.status === 'working';
            const isLate = task.status === 'late';

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-4 shadow-sm transition ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-950 dark:bg-slate-900'
                    : isWorking
                    ? 'border-blue-300 bg-blue-50/30 dark:border-blue-900 dark:bg-slate-900'
                    : isLate
                    ? 'border-rose-300 bg-rose-50/30 dark:border-rose-900 dark:bg-slate-900'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
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

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Phụ trách: <strong>{task.teacherName}</strong></span>
                      <span>• Trọng số KPI: +{task.score} Đ</span>
                    </div>

                    {task.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 p-2 rounded-xl mt-1 dark:bg-slate-800">
                        Ghi chú: {task.note}
                      </p>
                    )}

                    {task.proofPhotos && task.proofPhotos.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        {task.proofPhotos.map((p, idx) => (
                          <img
                            key={idx}
                            src={p}
                            alt="Minh chứng"
                            className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEvaluationModal(task)}
                      className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 font-bold text-xs shadow-sm transition"
                      title="Xem chi tiết & Duyệt đánh giá Hoàn thành / Chưa tốt"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{currentUser.role === 'manager' ? 'Duyệt / Đánh giá' : 'Chi tiết'}</span>
                    </button>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        task.status === 'verified'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : task.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isWorking
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {task.status === 'verified' ? 'Đã duyệt' : task.status === 'rejected' ? 'Chưa tốt' : task.status}
                    </span>

                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      title="Chỉnh sửa nhiệm vụ"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      title="Xóa nhiệm vụ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Giao Nhiệm Vụ / Checklist Mới"
      >
        <form onSubmit={handleAddTaskSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên Công Việc / Checklist <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Kiểm tra trật tự KTX sau 22h00"
              value={newTaskData.title}
              onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giáo Viên Đảm Nhận <span className="text-red-500">*</span>
              </label>
              <select
                value={newTaskData.teacherId}
                onChange={(e) => setNewTaskData({ ...newTaskData, teacherId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.teacherCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phân Loại</label>
              <select
                value={newTaskData.taskCategory}
                onChange={(e) =>
                  setNewTaskData({
                    ...newTaskData,
                    taskCategory: e.target.value as any,
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="routine">Routine (Thường quy)</option>
                <option value="hygiene">Hygiene (Vệ sinh / Nền nếp)</option>
                <option value="security">Security (An ninh / Điểm danh)</option>
                <option value="discipline">Discipline (Kỷ luật / Nhắc nhở)</option>
                <option value="event">Event (Sự kiện nội trú)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ca Trực</label>
              <select
                value={newTaskData.shift}
                onChange={(e) => setNewTaskData({ ...newTaskData, shift: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="morning">Ca Sáng</option>
                <option value="lunch">Ca Trưa</option>
                <option value="afternoon">Ca Chiều</option>
                <option value="evening">Ca Tối</option>
                <option value="night">Ca Đêm</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bắt đầu</label>
              <input
                type="time"
                value={newTaskData.plannedStart}
                onChange={(e) => setNewTaskData({ ...newTaskData, plannedStart: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kết thúc</label>
              <input
                type="time"
                value={newTaskData.plannedEnd}
                onChange={(e) => setNewTaskData({ ...newTaskData, plannedEnd: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tòa KTX</label>
              <input
                type="text"
                value={newTaskData.building}
                onChange={(e) => setNewTaskData({ ...newTaskData, building: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Khu vực / Tầng</label>
              <input
                type="text"
                value={newTaskData.roomName}
                onChange={(e) => setNewTaskData({ ...newTaskData, roomName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Giao Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Chỉnh Sửa Nhiệm Vụ / Checklist"
      >
        {editingTask && (
          <form onSubmit={handleEditTaskSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên Công Việc / Checklist <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editingTask.title || editingTask.taskName}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, title: e.target.value, taskName: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Giáo Viên Đảm Nhận
                </label>
                <select
                  value={editingTask.teacherId}
                  onChange={(e) => {
                    const t = teachers.find((x) => x.id === e.target.value);
                    setEditingTask({
                      ...editingTask,
                      teacherId: e.target.value,
                      teacherName: t ? t.fullName : editingTask.teacherName,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.teacherCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phân Loại</label>
                <select
                  value={editingTask.taskCategory}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      taskCategory: e.target.value as any,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="routine">Routine (Thường quy)</option>
                  <option value="hygiene">Hygiene (Vệ sinh / Nền nếp)</option>
                  <option value="security">Security (An ninh / Điểm danh)</option>
                  <option value="discipline">Discipline (Kỷ luật / Nhắc nhở)</option>
                  <option value="event">Event (Sự kiện nội trú)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ca Trực</label>
                <select
                  value={editingTask.shift}
                  onChange={(e) => setEditingTask({ ...editingTask, shift: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="morning">Ca Sáng</option>
                  <option value="lunch">Ca Trưa</option>
                  <option value="afternoon">Ca Chiều</option>
                  <option value="evening">Ca Tối</option>
                  <option value="night">Ca Đêm</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bắt đầu</label>
                <input
                  type="time"
                  value={editingTask.plannedStart}
                  onChange={(e) => setEditingTask({ ...editingTask, plannedStart: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kết thúc</label>
                <input
                  type="time"
                  value={editingTask.plannedEnd}
                  onChange={(e) => setEditingTask({ ...editingTask, plannedEnd: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Trạng thái</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="pending">Chờ thực hiện (Pending)</option>
                  <option value="working">Đang làm (Working)</option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                  <option value="verified">Đã kiểm duyệt (Verified)</option>
                  <option value="late">Trễ hạn (Late)</option>
                  <option value="missed">Bỏ sót (Missed)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng / Khu vực</label>
                <input
                  type="text"
                  value={editingTask.roomName || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, roomName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Cập Nhật
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Delete Task Modal */}
      <ConfirmDeleteModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDeleteTask}
        title="Xác nhận xóa nhiệm vụ"
        itemName={taskToDelete ? `Nhiệm vụ "${taskToDelete.title || taskToDelete.taskName}"` : ''}
      />

      {/* Work Evaluation Modal */}
      <WorkEvaluationModal
        isOpen={!!evaluationItem}
        onClose={() => setEvaluationItem(null)}
        item={evaluationItem}
        onEvaluate={handleExecuteEvaluation}
      />
    </div>
  );
};
