import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Clock,
  UserCheck,
  FileText,
  Calendar,
  X,
  MinusCircle,
  Building,
} from 'lucide-react';
import { User, TaskInstance, ScheduleAssignment } from '../../types';

export interface WorkEvaluationItem {
  itemType: 'task' | 'schedule';
  id: string;
  title: string;
  teacherId: string;
  teacherName: string;
  date: string;
  shift?: string;
  completedAt?: string;
  completionNote?: string;
  proofPhotos?: string[];
  status: string;
  verified?: boolean;
  evaluationCriteria?: string;
  deductedPoints?: number;
  evaluationNote?: string;
}

interface WorkEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkEvaluationItem | null;
  onEvaluate: (evaluationData: {
    itemType: 'task' | 'schedule';
    itemId: string;
    evaluation: 'approved' | 'rejected';
    criteriaKey?: 'operation' | 'quality' | 'studentCare' | 'discipline';
    criteriaLabel?: string;
    deductedPoints?: number;
    reason?: string;
  }) => void;
}

const CRITERIA_OPTIONS: {
  key: 'operation' | 'quality' | 'studentCare' | 'discipline';
  label: string;
  desc: string;
  defaultPts: number;
}[] = [
  {
    key: 'operation',
    label: 'Vận hành ca trực & Tiến độ',
    desc: 'Báo cáo trễ, sai vị trí, thiếu nội dung ca trực',
    defaultPts: 3,
  },
  {
    key: 'quality',
    label: 'Chất lượng kiểm tra & Vệ sinh KTX',
    desc: 'Không phát hiện lỗi vệ sinh phòng, bàn giao ca hời hợt',
    defaultPts: 3,
  },
  {
    key: 'studentCare',
    label: 'Quản lý nền nếp & Chăm sóc học sinh',
    desc: 'Bỏ sót học sinh vắng điểm danh, thiếu theo dõi học sinh biệt phái',
    defaultPts: 4,
  },
  {
    key: 'discipline',
    label: 'Kỷ luật, Tác phong & Trang phục',
    desc: 'Vi phạm giờ giấc ca trực, bỏ vị trí trực không báo cáo',
    defaultPts: 2,
  },
];

export const WorkEvaluationModal: React.FC<WorkEvaluationModalProps> = ({
  isOpen,
  onClose,
  item,
  onEvaluate,
}) => {
  if (!isOpen || !item) return null;

  const [evaluationType, setEvaluationType] = useState<'approved' | 'rejected'>('approved');
  const [selectedCriteria, setSelectedCriteria] = useState<
    'operation' | 'quality' | 'studentCare' | 'discipline'
  >('operation');
  const [deductedPoints, setDeductedPoints] = useState<number>(3);
  const [reason, setReason] = useState<string>('');

  const handleSelectCriteria = (key: 'operation' | 'quality' | 'studentCare' | 'discipline') => {
    setSelectedCriteria(key);
    const opt = CRITERIA_OPTIONS.find((c) => c.key === key);
    if (opt) setDeductedPoints(opt.defaultPts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opt = CRITERIA_OPTIONS.find((c) => c.key === selectedCriteria);

    onEvaluate({
      itemType: item.itemType,
      itemId: item.id,
      evaluation: evaluationType,
      criteriaKey: evaluationType === 'rejected' ? selectedCriteria : undefined,
      criteriaLabel: evaluationType === 'rejected' ? opt?.label : undefined,
      deductedPoints: evaluationType === 'rejected' ? Number(deductedPoints) : 0,
      reason: reason.trim() || (evaluationType === 'approved' ? 'Hoàn thành tốt' : 'Chưa đạt yêu cầu'),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 z-10 my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 text-slate-300 hover:bg-white/20 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300 mb-1">
            <Award className="h-4 w-4" />
            <span>Thẩm định & Đánh giá Chất lượng Công việc</span>
          </div>
          <h3 className="text-lg font-extrabold text-white">{item.title}</h3>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
              <UserCheck className="h-3.5 w-3.5 text-blue-300" />
              <span className="font-bold text-white">{item.teacherName}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
              <Calendar className="h-3.5 w-3.5 text-blue-300" />
              <span>{item.date}</span>
            </div>
            {item.shift && (
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl uppercase font-bold text-blue-200">
                <Clock className="h-3.5 w-3.5 text-blue-300" />
                <span>{item.shift}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Work Details Summary */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Báo cáo / Nội dung công việc từ GVQN
            </h4>

            {item.completionNote ? (
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                "{item.completionNote}"
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">GVQN chưa đính kèm ghi chú chi tiết.</p>
            )}

            {item.proofPhotos && item.proofPhotos.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Hình ảnh minh chứng ({item.proofPhotos.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {item.proofPhotos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt="Minh chứng"
                      className="h-16 w-20 object-cover rounded-lg border border-slate-200 shadow-sm"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Existing Evaluation Status if any */}
          {item.evaluationCriteria && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold block">Đánh giá trước đó: {item.evaluationCriteria}</span>
                <span>
                  Đã trừ {item.deductedPoints} điểm KPI. Ghi chú: "{item.evaluationNote}"
                </span>
              </div>
            </div>
          )}

          {/* Manager Evaluation Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Kết Quả Đánh Giá Của BGH / Quản Lý:
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEvaluationType('approved')}
                  className={`flex items-center justify-center gap-2 rounded-2xl p-3.5 border-2 transition text-xs font-extrabold ${
                    evaluationType === 'approved'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      evaluationType === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <span>HOÀN THÀNH (ĐẠT)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEvaluationType('rejected')}
                  className={`flex items-center justify-center gap-2 rounded-2xl p-3.5 border-2 transition text-xs font-extrabold ${
                    evaluationType === 'rejected'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <XCircle
                    className={`h-5 w-5 ${
                      evaluationType === 'rejected' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                    }`}
                  />
                  <span>CHƯA TỐT (TRỪ ĐIỂM)</span>
                </button>
              </div>
            </div>

            {/* Reject / Point Deduction Sub-Form */}
            {evaluationType === 'rejected' && (
              <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-rose-900 dark:text-rose-300 mb-1.5 flex items-center gap-1.5">
                    <MinusCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    Chọn Bộ Tiêu Chí Trừ Điểm KPI:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CRITERIA_OPTIONS.map((opt) => {
                      const isSelected = selectedCriteria === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => handleSelectCriteria(opt.key)}
                          className={`cursor-pointer rounded-xl p-3 border text-xs transition ${
                            isSelected
                              ? 'border-rose-500 bg-white dark:bg-slate-900 text-rose-900 dark:text-rose-200 font-bold shadow-sm ring-1 ring-rose-400'
                              : 'border-rose-200/60 bg-white/60 dark:bg-slate-900/50 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{opt.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              -{opt.defaultPts}đ
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-1 leading-tight">
                            {opt.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Số Điểm Trừ KPI:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={deductedPoints}
                      onChange={(e) => setDeductedPoints(Number(e.target.value))}
                      className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Lý Do & Nhận Xét Chi Tiết Của Quản Lý:
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Kiểm tra không sát sao, chưa hoàn thành việc điểm danh..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Approved Note */}
            {evaluationType === 'approved' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú khen thưởng / Nhận xét thêm (Không bắt buộc):
                </label>
                <input
                  type="text"
                  placeholder="VD: Thực hiện ca trực nghiêm túc, báo cáo đẩy đủ chuẩn giờ..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition ${
                  evaluationType === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {evaluationType === 'approved' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Lưu Phê Duyệt "Hoàn Thành"</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>Xác Nhận Đánh Giá "Chưa Tốt" & Trừ Điểm</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
