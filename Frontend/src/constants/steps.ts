export type OrderStep = {
  title: string;
  description: string;
  icon: 'dineIn' | 'grid' | 'phone' | 'card' | 'clock';
};

export const ORDER_STEPS: readonly OrderStep[] = [
  {
    title: 'Pilih Meja Anda',
    description: 'Pindai kode QR di meja atau pilih nomor meja Anda.',
    icon: 'dineIn',
  },
  {
    title: 'Lihat Menu',
    description: 'Pilih hidangan favorit Anda dalam hitungan detik.',
    icon: 'grid',
  },
  {
    title: 'Kirim Pesanan',
    description: 'Masukkan nama Anda lalu kirim. Kasir akan mengonfirmasinya.',
    icon: 'phone',
  },
  {
    title: 'Bayar di Kasir',
    description: 'Bayar dengan tunai, QRIS, atau kartu di meja kasir.',
    icon: 'card',
  },
  {
    title: 'Segera Disiapkan',
    description: 'Dapur segera memasak pesanan Anda setelah pembayaran dikonfirmasi.',
    icon: 'clock',
  },
];
