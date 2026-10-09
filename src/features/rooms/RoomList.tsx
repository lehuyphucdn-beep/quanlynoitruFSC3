import React, { useState, useEffect } from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Layers,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
  Bed,
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { Room, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';

export const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hygieneFilter, setHygieneFilter] = useState<'all' | 'pass' | 'needs_correction'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Add Room modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Delete Room Modal state
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const [newRoomData, setNewRoomData] = useState({
    roomName: '',
    building: 'DomB',
    floor: 'Tầng 1',
    capacity: 8, // Support up to 30
    assignedTeacherId: 'u-gv-001',
    assignedTeacherName: 'Bùi Ngọc Thắng',
  });

  useEffect(() => {
    const loadData = () => {
      setRooms(BOPSStore.getRooms());
      setStudents(BOPSStore.getStudents());
    };

    loadData();
    const unsubscribe = subscribeToStore(loadData);
    return unsubscribe;
  }, []);

  const handleEditRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    // Validate capacity between 1 and 30
    const finalCapacity = Math.max(1, Math.min(30, Number(editingRoom.capacity) || 8));
    const updated = {
      ...editingRoom,
      capacity: finalCapacity,
    };

    BOPSStore.updateRoom(updated);
    setEditingRoom(null);
    if (selectedRoom && selectedRoom.id === editingRoom.id) {
      setSelectedRoom(updated);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    setRoomToDelete(room);
  };

  const confirmDeleteRoom = () => {
    if (roomToDelete) {
      BOPSStore.deleteRoom(roomToDelete.id);
      if (selectedRoom?.id === roomToDelete.id) {
        setSelectedRoom(null);
      }
      setRoomToDelete(null);
    }
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomData.roomName.trim()) return;

    const finalCapacity = Math.max(1, Math.min(30, Number(newRoomData.capacity) || 8));

    BOPSStore.addRoom({
      roomName: newRoomData.roomName.trim(),
      building: newRoomData.building,
      floor: newRoomData.floor,
      capacity: finalCapacity,
      occupied: 0,
      gender: 'nam',
      teacherId: newRoomData.assignedTeacherId || 'u-gv-001',
      teacherName: newRoomData.assignedTeacherName || 'Bùi Ngọc Thắng',
      status: 'clean',
      hygieneStatus: 'pass',
      lastInspectedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    });

    setIsAddModalOpen(false);
    setNewRoomData({
      roomName: '',
      building: 'DomB',
      floor: 'Tầng 1',
      capacity: 8,
      assignedTeacherId: 'u-gv-001',
      assignedTeacherName: 'Bùi Ngọc Thắng',
    });
  };

  const getRoomStudents = (roomId: string, roomName?: string) => {
    return students.filter(
      (s) => s.roomId === roomId || (roomName && s.roomName && s.roomName.trim().toLowerCase() === roomName.trim().toLowerCase())
    );
  };

  const filteredRooms = rooms.filter((r) => {
    if (selectedBuilding !== 'all' && r.building !== selectedBuilding) return false;

    if (hygieneFilter !== 'all') {
      if (hygieneFilter === 'pass' && r.hygieneStatus !== 'pass') return false;
      if (hygieneFilter === 'needs_correction' && r.hygieneStatus === 'pass') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoom = r.roomName.toLowerCase().includes(q);
      const matchBuilding = r.building.toLowerCase().includes(q);
      const matchFloor = (r.floor || '').toLowerCase().includes(q);
      const matchTeacher = (r.teacherName || '').toLowerCase().includes(q);
      const roomStudents = getRoomStudents(r.id, r.roomName);
      const matchStudent = roomStudents.some(
        (s) => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
      );

      return matchRoom || matchBuilding || matchFloor || matchTeacher || matchStudent;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Building2 className="h-4 w-4" />
            <span>Khu Nội Trú & Phòng Ở Học Sinh</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Quản Lý Phòng KTX & Nền Nếp Sinh Hoạt Học Sinh
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi sức chứa (hỗ trợ tối đa lên đến 30 học sinh/phòng), tình trạng cơ sở vật chất, vệ sinh phòng và phân công quản nhiệm.
          </p>
        </div>

        {/* Add Room Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 shrink-0 transition"
        >
          <Plus className="h-4 w-4" />
          <span>+ Khai Báo Phòng KTX Mới</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên phòng (DomB-101, A-302...), tầng, tên GV, hoặc tên học sinh..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Building Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['all', 'DomB', 'KTX A', 'KTX B', 'KTX C'].map((bldg) => (
            <button
              key={bldg}
              onClick={() => setSelectedBuilding(bldg)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedBuilding === bldg
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {bldg === 'all' ? 'Tất cả KTX' : bldg}
            </button>
          ))}
        </div>

        {/* Hygiene Filter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-bold text-slate-500">Vệ sinh:</span>
          <select
            value={hygieneFilter}
            onChange={(e) => setHygieneFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pass">Đạt vệ sinh</option>
            <option value="needs_correction">Cần kiện toàn / Vi phạm</option>
          </select>
        </div>
      </div>

      {/* Result Count Notice */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Đang hiển thị <strong>{filteredRooms.length}</strong> phòng KTX
          {selectedBuilding !== 'all' && ` (Khu ${selectedBuilding})`}
        </span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          Quy chuẩn sức chứa: 1 - 30 học sinh/phòng
        </span>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const roomStudents = getRoomStudents(room.id, room.roomName);
          const isCritical = room.hygieneStatus === 'critical' || room.hygieneStatus === 'needs_correction';
          const isOverCapacity = roomStudents.length > room.capacity;
          const isFull = roomStudents.length === room.capacity;

          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={`cursor-pointer rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${
                isCritical
                  ? 'border-rose-300 bg-rose-50/20 dark:border-rose-900 dark:bg-slate-900'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span>{room.roomName}</span>
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {room.building}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {room.floor || 'Tầng 1'} • GV: <strong className="text-slate-700 dark:text-slate-300">{room.teacherName || 'Chưa phân công'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                      room.hygieneStatus === 'pass'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {room.hygieneStatus === 'pass' ? 'Đạt vệ sinh' : 'Cần chấn chỉnh'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRoom(room);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Chỉnh sửa phòng"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Xóa phòng"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Occupancy & Capacity Progress */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <Bed className="h-3.5 w-3.5 text-slate-400" />
                    <span>Sức chứa phòng:</span>
                  </span>
                  <div className="text-right">
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      {roomStudents.length} / {room.capacity}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1">HS</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isOverCapacity
                        ? 'bg-rose-600'
                        : isFull
                        ? 'bg-emerald-500'
                        : 'bg-blue-600'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((roomStudents.length / Math.max(1, room.capacity)) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  {isOverCapacity ? (
                    <span className="font-bold text-rose-600">
                      ⚠️ Vượt sức chứa ({roomStudents.length - room.capacity} HS)
                    </span>
                  ) : isFull ? (
                    <span className="font-bold text-emerald-600">✓ Đã đủ số lượng</span>
                  ) : (
                    <span className="text-slate-500">
                      Còn trống: <strong className="text-blue-600">{room.capacity - roomStudents.length}</strong> giường
                    </span>
                  )}
                  <span className="text-slate-400">Tối đa: 30 HS</span>
                </div>

                {room.correctionNote && (
                  <p className="rounded-xl bg-rose-50 p-2 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {room.correctionNote}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-400 dark:border-slate-800 space-y-2">
          <Building2 className="mx-auto h-8 w-8 text-slate-400" />
          <div className="font-bold text-sm text-slate-600 dark:text-slate-300">
            Không tìm thấy phòng KTX nào phù hợp
          </div>
          <p className="text-xs">
            Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm "+ Khai Báo Phòng KTX Mới" để tạo phòng.
          </p>
        </div>
      )}

      {/* Room Detail Modal */}
      <Modal
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom?.roomName || ''}
        subtitle={`${selectedRoom?.building} • Tầng ${selectedRoom?.floor} • GV Phụ trách: ${selectedRoom?.teacherName} • Sức chứa: ${selectedRoom?.capacity} học sinh`}
      >
        {selectedRoom && (
          <div className="space-y-6 text-xs">
            {/* Quick Actions */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Trạng thái vệ sinh hiện tại:</div>
                <div className="text-slate-500">{selectedRoom.correctionNote || 'Phòng đạt yêu cầu sạch sẽ.'}</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    BOPSStore.updateRoomHygiene(selectedRoom.id, 'clean', 'pass', undefined);
                    setSelectedRoom(null);
                  }}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white shadow hover:bg-emerald-700"
                >
                  Đánh dấu Đạt
                </button>
                <button
                  onClick={() => {
                    BOPSStore.updateRoomHygiene(selectedRoom.id, 'dirty', 'needs_correction', 'Cần nhắc nhở gấp chăn gối & dọn vệ sinh.');
                    setSelectedRoom(null);
                  }}
                  className="rounded-xl bg-rose-600 px-3.5 py-1.5 font-bold text-white shadow hover:bg-rose-700"
                >
                  Báo Vi phạm
                </button>
              </div>
            </div>

            {/* Students List in this room */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Danh sách Học sinh ở Phòng ({getRoomStudents(selectedRoom.id, selectedRoom.roomName).length} / {selectedRoom.capacity})
                </h4>
                {getRoomStudents(selectedRoom.id, selectedRoom.roomName).length > selectedRoom.capacity && (
                  <span className="text-[11px] font-bold text-rose-600">
                    ⚠️ Vượt sức chứa quy định ({selectedRoom.capacity} HS)
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {getRoomStudents(selectedRoom.id, selectedRoom.roomName).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {student.fullName} ({student.studentCode})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Lớp: {student.className} • Phụ huynh: {student.parentPhone || 'Chưa có SĐT'}
                      </div>
                    </div>
                    {student.specialCare && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        Cần theo dõi
                      </span>
                    )}
                  </div>
                ))}

                {getRoomStudents(selectedRoom.id, selectedRoom.roomName).length === 0 && (
                  <div className="p-4 text-center text-slate-400 italic">
                    Chưa có học sinh nào được xếp vào phòng này.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Khai Báo Phòng KTX Mới"
        subtitle="Hỗ trợ cấu hình sức chứa tối đa lên đến 30 học sinh nội trú"
      >
        <form onSubmit={handleAddRoomSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên Phòng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: DomB-108 hoặc A-302"
                value={newRoomData.roomName}
                onChange={(e) => setNewRoomData({ ...newRoomData, roomName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tòa KTX</label>
              <select
                value={newRoomData.building}
                onChange={(e) => setNewRoomData({ ...newRoomData, building: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="DomB">DomB</option>
                <option value="KTX A">KTX A (Nam)</option>
                <option value="KTX B">KTX B (Nữ)</option>
                <option value="KTX C">KTX C (Quốc tế)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tầng</label>
              <input
                type="text"
                placeholder="VD: Tầng 3"
                value={newRoomData.floor}
                onChange={(e) => setNewRoomData({ ...newRoomData, floor: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sức chứa tối đa (1 - 30 học sinh) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={30}
                required
                value={newRoomData.capacity}
                onChange={(e) =>
                  setNewRoomData({
                    ...newRoomData,
                    capacity: Math.max(1, Math.min(30, Number(e.target.value))),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Hỗ trợ tối đa 30 học sinh/phòng</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Giáo viên phụ trách</label>
            <select
              value={newRoomData.assignedTeacherId}
              onChange={(e) => {
                const u = BOPSStore.getUsers().find((x) => x.id === e.target.value);
                setNewRoomData({
                  ...newRoomData,
                  assignedTeacherId: e.target.value,
                  assignedTeacherName: u ? u.fullName : 'Chưa phân công',
                });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {BOPSStore.getUsers()
                .filter((u) => u.role === 'teacher')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.teacherCode})
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Tạo Phòng KTX
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        isOpen={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        title="Chỉnh Sửa Thông Tin Phòng KTX"
        subtitle="Cập nhật tên phòng, tòa KTX và sức chứa lên đến 30 học sinh"
      >
        {editingRoom && (
          <form onSubmit={handleEditRoomSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Phòng
                </label>
                <input
                  type="text"
                  required
                  value={editingRoom.roomName}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tòa KTX</label>
                <select
                  value={editingRoom.building}
                  onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="DomB">DomB</option>
                  <option value="KTX A">KTX A (Nam)</option>
                  <option value="KTX B">KTX B (Nữ)</option>
                  <option value="KTX C">KTX C (Quốc tế)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tầng</label>
                <input
                  type="text"
                  value={editingRoom.floor}
                  onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sức chứa tối đa (1 - 30 học sinh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={editingRoom.capacity}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      capacity: Math.max(1, Math.min(30, Number(e.target.value))),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Hỗ trợ tối đa 30 học sinh</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Giáo viên phụ trách</label>
              <select
                value={editingRoom.teacherId || editingRoom.assignedTeacherId}
                onChange={(e) => {
                  const u = BOPSStore.getUsers().find((x) => x.id === e.target.value);
                  setEditingRoom({
                    ...editingRoom,
                    teacherId: e.target.value,
                    assignedTeacherId: e.target.value,
                    teacherName: u ? u.fullName : 'Chưa phân công',
                    assignedTeacherName: u ? u.fullName : 'Chưa phân công',
                  });
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {BOPSStore.getUsers()
                  .filter((u) => u.role === 'teacher')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.teacherCode})
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={confirmDeleteRoom}
        title={`Xóa Phòng KTX "${roomToDelete?.roomName}"`}
        message="Bạn có chắc chắn muốn xóa phòng KTX này không? Hành động này sẽ không thể hoàn tác."
      />
    </div>
  );
};
