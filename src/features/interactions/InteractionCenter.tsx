import React, { useState, useEffect } from 'react';
import {
  MessageSquareHeart,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  FileText,
  User,
  GraduationCap,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { Interaction1on1, Student, User as UserType } from '../../types';
import { Modal } from '../../components/common/Modal';

export const InteractionCenter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType>(BOPSStore.getCurrentUser());
  const [interactions, setInteractions] = useState<Interaction1on1[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState('');
  const [observation, setObservation] = useState('');
  const [supportPlan, setSupportPlan] = useState('');
  const [location, setLocation] = useState('Phòng Quản nhiệm Tầng 3');
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('20:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  useEffect(() => {
    const loadData = () => {
      const u = BOPSStore.getCurrentUser();
      setCurrentUser(u);
      setInteractions(BOPSStore.getInteractions());
      setStudents(BOPSStore.getStudents());
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  const userInteractions =
    currentUser.role === 'teacher'
      ? interactions.filter((i) => i.teacherId === currentUser.id)
      : interactions;

  const filteredInteractions = userInteractions.filter(
    (i) =>
      i.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !topic || !summary || !supportPlan) {
      alert('Vui lòng điền đầy đủ thông tin Tương tác 1-1, tóm tắt và kế hoạch hỗ trợ!');
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const todayDate = new Date().toISOString().substring(0, 10);

    BOPSStore.addInteraction({
      teacherId: currentUser.id,
      teacherName: currentUser.fullName,
      studentId: student.id,
      studentName: student.fullName,
      className: student.className,
      roomName: student.roomName,
      interactionDate: todayDate,
      startTime,
      endTime,
      durationMinutes: 30,
      location,
      topic,
      summary,
      observation,
      supportPlan,
      priority,
    });

    setShowAddModal(false);
    // Reset form
    setTopic('');
    setSummary('');
    setObservation('');
    setSupportPlan('');
  };

  const handleDeleteInteraction = (item: Interaction1on1) => {
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa nhật ký tương tác 1-1 của học sinh "${item.studentName}" (Chủ đề: ${item.topic}) không?`
      )
    ) {
      BOPSStore.deleteInteraction(item.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <MessageSquareHeart className="h-4 w-4" />
            <span>Student Care 1-1 • Hồ sơ Chăm sóc Học sinh</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Nhật ký Tương tác 1-1 & Kế hoạch Hỗ trợ Học sinh
          </h2>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition"
        >
          <Plus className="h-4 w-4" />
          + Nhập Tương tác 1-1 Mới
        </button>
      </div>

      {/* Target Progress Meter */}
      <div className="rounded-3xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-5 dark:border-purple-950 dark:from-purple-950/30 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Chỉ tiêu Tương tác 1-1 Học sinh (Mục C - KPI)
            </h3>
            <p className="text-xs text-slate-500">
              Quy định mới: Tối thiểu nhập tương tác 1 học sinh/tuần để đạt 15 điểm trọng số KPI (nếu không nhập: 0đ).
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-purple-600">
              {filteredInteractions.length} / 1 HS
            </span>
            <div className="text-[10px] text-slate-400">
              {filteredInteractions.length >= 1 ? '✓ Đã đạt 15đ trọng số' : '⏳ Chưa đạt (0đ)'}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo tên học sinh, chủ đề tư vấn..."
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {filteredInteractions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-slate-800">
            Chưa có nhật ký tương tác 1-1 nào. Hãy bấm "+ Nhập Tương tác 1-1 Mới" ở trên!
          </div>
        ) : (
          filteredInteractions.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-base">
                      {item.studentName} ({item.className})
                    </span>
                    <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {item.roomName}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                    Chủ đề: {item.topic}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">{item.interactionDate}</div>
                  <div>
                    {item.startTime} - {item.endTime} • {item.location}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Tóm tắt trao đổi:</strong>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{item.summary}</p>
                </div>

                {item.observation && (
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Quan sát & Đánh giá:</strong>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{item.observation}</p>
                  </div>
                )}

                <div>
                  <strong className="text-purple-700 dark:text-purple-400">Kế hoạch Hỗ trợ:</strong>
                  <p className="text-slate-700 dark:text-slate-200 mt-0.5 font-medium">{item.supportPlan}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span>Giáo viên thực hiện: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{item.teacherName}</strong></span>
                  <span>•</span>
                  <span>Mức độ ưu tiên: <strong className="text-purple-600 dark:text-purple-400 font-semibold">{item.priority.toUpperCase()}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteInteraction(item)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900 transition shadow-sm"
                  title="Xóa nhật ký tương tác này"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nhập Tương tác 1-1 Chăm sóc Học sinh"
        subtitle="Hồ sơ tương tác lưu trữ lâu dài trong cơ sở dữ liệu chăm sóc học sinh"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chọn Học sinh *
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Chọn học sinh --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentCode}) - Lớp {s.className} - {s.roomName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giờ bắt đầu
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="19:30"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giờ kết thúc
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="20:00"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Địa điểm tương tác
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Phòng Quản nhiệm Tầng 3, Sảnh sinh hoạt chung"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chủ đề tương tác *
            </label>
            <input
              required
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Tư vấn tâm lý áp lực học tập, định hướng sinh hoạt nhóm..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung tóm tắt *
            </label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Tóm tắt ngắn gọn nội dung học sinh chia sẻ..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quan sát của Giáo viên
            </label>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Nhận xét thái độ, tâm lý, sức khỏe của học sinh..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-purple-700 dark:text-purple-400 mb-1">
              Kế hoạch Hỗ trợ (Support Plan) *
            </label>
            <textarea
              required
              rows={2}
              value={supportPlan}
              onChange={(e) => setSupportPlan(e.target.value)}
              placeholder="Đề xuất hành động hỗ trợ tiếp theo (GVCN, bạn cùng phòng, tâm lý học đường...)"
              className="w-full rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 text-slate-900 dark:border-purple-900 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white shadow-md hover:bg-purple-700"
            >
              Lưu Tương tác 1-1
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
