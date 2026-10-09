import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Đọc biến môi trường theo chuẩn tĩnh của Vite:
// Vite sẽ biên dịch tĩnh thay thế trực tiếp chuỗi 'import.meta.env.VITE_*' bằng giá trị thực tế tại thời điểm build.
const supabaseUrl = (
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  ''
).trim();

const supabaseKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.info(`[BOPS - Supabase] Đã khởi tạo kết nối Supabase tới: ${supabaseUrl}`);
  } catch (err) {
    console.error('[BOPS - Supabase] Lỗi khi khởi tạo Supabase Client:', err);
  }
} else {
  console.warn(
    '[BOPS - Supabase] CHƯA CẤU HÌNH BIẾN MÔI TRƯỜNG VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'Ứng dụng đang chạy ở chế độ Offline / RAM fallback (dữ liệu mẫu). ' +
    `Hiện trạng: URL=${supabaseUrl ? 'Đã có' : 'RỖNG'}, KEY=${supabaseKey ? 'Đã có' : 'RỖNG'}`
  );
}

export const supabase = client;
