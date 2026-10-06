import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface VietnamDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  className?: string;
}

const VIETNAMESE_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VIETNAMESE_DAY_FULL = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export const VietnamDatePicker: React.FC<VietnamDatePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD safely
  const parseSafeDate = (str: string): Date => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  const currentDateObj = parseSafeDate(value);
  const [viewYear, setViewYear] = useState(currentDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDateObj.getMonth());

  // Update view when value prop changes
  useEffect(() => {
    const d = parseSafeDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format DD/MM/YYYY for display
  const formatVietnameseDisplay = (str: string) => {
    if (!str) return 'Chọn ngày...';
    const parts = str.split('-');
    if (parts.length !== 3) return str;
    const [y, m, d] = parts;
    const dateObj = parseSafeDate(str);
    const dayOfWeek = VIETNAMESE_DAY_FULL[dateObj.getDay()] || '';
    return `${d}/${m}/${y} (${dayOfWeek})`;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const yStr = String(viewYear);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const newDateStr = `${yStr}-${mStr}-${dStr}`;
    onChange(newDateStr);
    setIsOpen(false);
  };

  const setQuickDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yStr = String(d.getFullYear());
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    onChange(`${yStr}-${mStr}-${dStr}`);
    setIsOpen(false);
  };

  // Generate calendar grid
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfWeek = (y: number, m: number) => new Date(y, m, 1).getDay(); // 0 is Sun

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const gridCells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) {
    gridCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(d);
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Main trigger button showing DD/MM/YYYY */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-white/20 bg-slate-800/80 px-3 py-2 text-xs font-bold text-white shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 shrink-0 text-blue-400" />
          <span className="truncate">{formatVietnameseDisplay(value)}</span>
        </div>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {/* Pop-up Calendar Dropdown */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-72 rounded-2xl border border-slate-700 bg-slate-900 p-3.5 shadow-2xl text-white">
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xs font-extrabold text-white">
              Tháng {viewMonth + 1} / {viewYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Date buttons */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setQuickDate(-1)}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition"
            >
              Hôm qua
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="rounded-lg bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50 px-2 py-1 text-[11px] font-bold text-blue-300 transition"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition"
            >
              Ngày mai
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 mb-1">
            {VIETNAMESE_DAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days grid */}
          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const isSelected =
                currentDateObj.getDate() === day &&
                currentDateObj.getMonth() === viewMonth &&
                currentDateObj.getFullYear() === viewYear;

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                      : isToday
                      ? 'border border-blue-400 text-blue-300 bg-blue-950/40'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Optional Native input fallback */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Định dạng: Ngày/Tháng/Năm</span>
            <label className="text-blue-400 hover:underline cursor-pointer">
              <span>Đổi năm</span>
              <input
                type="date"
                value={value}
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(e.target.value);
                    setIsOpen(false);
                  }
                }}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
