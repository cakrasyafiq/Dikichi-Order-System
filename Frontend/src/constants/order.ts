export const ORDER_LIMITS = {
  maxQuantity: 99,
  maxLines: 30,
  nameMaxLength: 50,
} as const;

export const TABLE_CODE_PATTERN = /^T-\d{2,3}$/;

export const API_VERSIONS = ['v1', 'v2'] as const;
export type ApiVersion = (typeof API_VERSIONS)[number];
export const DEFAULT_API_VERSION: ApiVersion = 'v1';

export const ORDER_STATUS_LABELS: Readonly<Record<string, string>> = {
  PENDING: 'Menunggu konfirmasi kasir',
  ACCEPTED: 'Diterima, menunggu pembayaran',
  PREPARING: 'Sedang disiapkan',
  READY: 'Siap disajikan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};
