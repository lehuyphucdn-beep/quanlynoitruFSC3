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
} from 'lucide-react';
import { BOPSStore, subscribeToStore } from '../../services/storage';
import { Room, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';

export const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Add Room modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const handleEditRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    BOPSStore.updateRoom(editingRoom);
    setEditingRoom(null);
    if (selectedRoom && selectedRoom.id === editingRoom.id) {
      setSelectedRoom(editingRoom);
    }
  };

  // Delete Room Modal state
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

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
  const [newRoomData, setNewRoomData] = useState({
    roomName: 'A-301',
    building: 'KTX A',
    floor: 'Tầng 3',
    capacity: 6,
    assignedTeacherId: 'u-gv-001',
    assignedTeacherName: 'Nguyễn Văn A',
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

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomData.roomName) return;

    BOPSStore.addRoom({
      roomName: newRoomData.roomName,
      building: newRoomData.building,
      floor: newRoomData.floor,
      capacity: newRoomData.capacity,
      occupied: 0,
      gender: 'nam',
      teacherId: newRoomData.assignedTeacherId || 'usr-101',
      teacherName: newRoomData.assignedTeacherName || 'Nguyễn Văn An',
      status: 'clean',
      hygieneStatus: 'pass',
      lastInspectedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    });

    setIsAddModalOpen(false);
  };

  const filteredRooms = rooms.filter((r) => {
    if (selectedBuilding !== 'all' && r.building !== selectedBuilding) return false;
    return true;
  });

  const getRoomStudents = (roomId: string) => {
    return students.filter((s) => s.roomId === roomId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Building2 className="h-4 w-4" />
            <span>Khu Nội trú & Phòng ở</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Quản lý Tình trạng Phòng KTX & Nền nếp Vệ sinh
          </h2>
        </div>

        {/* Building Filter & Add Room */}
        <div className="flex items-center gap-2">
          {['all', 'DomB', 'KTX A', 'KTX B'].map((bldg) => (
            <button
              key={bldg}
              onClick={() => setSelectedBuilding(bldg)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                selectedBuilding === bldg
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {bldg === 'all' ? 'Tất cả KTX' : bldg}
            </button>
          ))}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm Phòng KTX</span>
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const roomStudents = getRoomStudents(room.id);
          const isCritical = room.hygieneStatus === 'critical' || room.hygieneStatus === 'needs_correction';

          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
                isCritical
                  ? 'border-rose-300 bg-rose-50/30 dark:border-rose-900 dark:bg-slate-900'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-base">
                    {room.roomName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {room.building} • Tầng {room.floor}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      room.hygieneStatus === 'pass'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : room.hygieneStatus === 'critical'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {room.hygieneStatus === 'pass' ? 'Đạt vệ sinh' : 'Cần kiện toàn'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRoom(room);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    title="Chỉnh sửa phòng"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room);
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                    title="Xóa phòng"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Sức chứa:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {room.occupied} / {room.capacity} Học sinh
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>GV Phụ trách:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {room.teacherName}
                  </span>
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

      {/* Room Detail Modal */}
      <Modal
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom?.roomName || ''}
        subtitle={`${selectedRoom?.building} • Tầng ${selectedRoom?.floor} • GV Phụ trách: ${selectedRoom?.teacherName}`}
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
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white shadow hover:bg-emerald-700"
                >
                  Đánh dấu Đạt
                </button>
                <button
                  onClick={() => {
                    BOPSStore.updateRoomHygiene(selectedRoom.id, 'dirty', 'needs_correction', 'Cần nhắc nhở gấp chăn gối.');
                    setSelectedRoom(null);
                  }}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white shadow hover:bg-rose-700"
                >
                  Báo Vi phạm
                </button>
              </div>
            </div>

            {/* Students List */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">
                Danh sách Học sinh ở Phòng ({getRoomStudents(selectedRoom.id).length})
              </h4>

              <div className="space-y-2">
                {getRoomStudents(selectedRoom.id).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {student.fullName} ({student.studentCode})
                      </div>
                      <div className="text-[10px] text-slate-400">Lớp: {student.className}</div>
                    </div>
                    {student.specialCare && (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                        Cần theo dõi
                      </span>
                    )}
                  </div>
                ))}
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
                placeholder="VD: A-302"
                value={newRoomData.roomName}
                onChange={(e) => setNewRoomData({ ...newRoomData, roomName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tòa KTX</label>
              <select
                value={newRoomData.building}
                onChange={(e) => setNewRoomData({ ...newRoomData, building: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sức chứa (giường)</label>
              <input
                type="number"
                min={1}
                max={12}
                value={newRoomData.capacity}
                onChange={(e) => setNewRoomData({ ...newRoomData, capacity: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
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
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Tạo Phòng
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        isOpen={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        title="Chỉnh Sửa Thông Tin Phòng KTX"
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
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tòa KTX</label>
                <select
                  value={editingRoom.building}
                  onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sức chứa (giường)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={editingRoom.capacity}
                  onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
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
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteRoom(editingRoom);
                  setEditingRoom(null);
                }}
                className="rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 px-3 py-2 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900 transition flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa Phòng KTX này</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Cập Nhật
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Delete Room Modal */}
      <ConfirmDeleteModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={confirmDeleteRoom}
        title="Xác nhận xóa phòng KTX"
        itemName={roomToDelete ? `Phòng ${roomToDelete.roomName} (${roomToDelete.building})` : ''}
      />
    </div>
  );
};
