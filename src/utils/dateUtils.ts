/**
 * Utility functions for consistent Vietnamese Date & 24-hour Time formatting
 * Chuẩn hiển thị: Ngày dd/MM/yyyy, Giờ 24h HH:mm:ss hoặc HH:mm
 * Bảo toàn định dạng ISO YYYY-MM-DD cho input type="date" và cơ sở dữ liệu Supabase.
 */

/**
 * Chuyển đổi chuỗi ngày YYYY-MM-DD hoặc ISO string sang định dạng chuẩn Việt Nam: dd/MM/yyyy
 * Không dùng toLocaleDateString có thể gây lệch múi giờ hoặc đảo tháng/ngày.
 */
export function formatDateVN(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Khớp định dạng YYYY-MM-DD (hoặc YYYY-MM-DDTHH:mm...)
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return `${day}/${month}/${year}`;
    }

    // Nếu đã ở dạng dd/MM/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // Nếu là đối tượng Date parse được
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return trimmed;
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return '';
}

/**
 * Định dạng thời gian 24 giờ: HH:mm:ss hoặc HH:mm
 */
export function formatTime24(
  timeInput: string | Date | null | undefined,
  includeSeconds = true
): string {
  if (!timeInput) return '';

  if (timeInput instanceof Date && !isNaN(timeInput.getTime())) {
    const hours = String(timeInput.getHours()).padStart(2, '0');
    const minutes = String(timeInput.getMinutes()).padStart(2, '0');
    if (!includeSeconds) return `${hours}:${minutes}`;
    const seconds = String(timeInput.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();

    // Khớp chuỗi ISO YYYY-MM-DDTHH:mm:ss
    const isoMatch = trimmed.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch) {
      const [, h, m, s] = isoMatch;
      return includeSeconds && s ? `${h}:${m}:${s}` : `${h}:${m}`;
    }

    // Khớp định dạng giờ HH:mm:ss hoặc HH:mm
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      const h = timeMatch[1].padStart(2, '0');
      const m = timeMatch[2];
      const s = timeMatch[3];
      if (includeSeconds && s) return `${h}:${m}:${s}`;
      if (!includeSeconds) return `${h}:${m}`;
      return `${h}:${m}:${s || '00'}`;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const hours = String(parsed.getHours()).padStart(2, '0');
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      if (!includeSeconds) return `${hours}:${minutes}`;
      const seconds = String(parsed.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  }

  return String(timeInput);
}

/**
 * Định dạng ngày giờ chuẩn Việt Nam: dd/MM/yyyy HH:mm
 */
export function formatDateTimeVN(
  dateTimeInput: string | Date | null | undefined,
  includeSeconds = false
): string {
  if (!dateTimeInput) return '';
  const datePart = formatDateVN(dateTimeInput);
  const timePart = formatTime24(dateTimeInput, includeSeconds);
  if (datePart && timePart) {
    return `${datePart} ${timePart}`;
  }
  return datePart || timePart || '';
}

/**
 * Lấy thứ trong tuần tiếng Việt chuẩn: Thứ Hai, Thứ Ba...
 */
export function getWeekdayVN(dateInput: string | Date): string {
  const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return '';
  const dayIndex = dateObj.getDay();
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[dayIndex] || '';
}
