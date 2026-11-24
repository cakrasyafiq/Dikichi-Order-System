export const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.',
  TIMEOUT: 'Server terlalu lama merespons. Silakan coba lagi.',
  INVALID_RESPONSE: 'Server mengirimkan respons yang tidak terduga. Silakan coba lagi.',
  SERVER_ERROR: 'Layanan sedang tidak tersedia sementara. Silakan coba beberapa saat lagi.',
  SERVICE_UNAVAILABLE: 'Layanan sedang tidak tersedia sementara. Silakan coba beberapa saat lagi.',
  CATALOG_UNAVAILABLE:
    'Layanan menu tidak merespons. Pesanan Anda belum terkirim, silakan coba lagi.',
  RATE_LIMITED: 'Terlalu banyak percobaan. Silakan tunggu sebentar dan coba lagi.',
};

export const FALLBACK_ERROR_MESSAGE = 'Terjadi kesalahan. Silakan coba lagi.';
