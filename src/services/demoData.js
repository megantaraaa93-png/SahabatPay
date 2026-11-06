/**
 * Data demo untuk prototype SahabatPay.
 * PERINGATAN: Ini bukan data nyata. Hanya untuk simulasi prototype.
 */

export const demoUser = {
  name: 'Andi Pratama',
  email: 'andi.pratama@demo.com',
  phone: '0812-3456-7890',
  avatar: null,
};

export const demoBalance = 2750000;

export const demoTransactions = [
  {
    id: 'txn-001',
    type: 'masuk',
    category: 'Top Up',
    description: 'Top Up via Bank Demo',
    amount: 500000,
    date: '2026-11-05T10:30:00',
    icon: 'ArrowDownLeft',
  },
  {
    id: 'txn-002',
    type: 'keluar',
    category: 'Transfer',
    description: 'Transfer ke Budi Santoso',
    amount: 150000,
    date: '2026-11-04T14:15:00',
    icon: 'ArrowUpRight',
  },
  {
    id: 'txn-003',
    type: 'keluar',
    category: 'Pembayaran',
    description: 'Pembayaran QRIS - Warung Makan',
    amount: 35000,
    date: '2026-11-04T12:00:00',
    icon: 'QrCode',
  },
  {
    id: 'txn-004',
    type: 'masuk',
    category: 'Top Up',
    description: 'Top Up via Minimarket',
    amount: 200000,
    date: '2026-11-03T09:45:00',
    icon: 'ArrowDownLeft',
  },
  {
    id: 'txn-005',
    type: 'keluar',
    category: 'Transfer',
    description: 'Transfer ke Citra Dewi',
    amount: 75000,
    date: '2026-11-02T16:30:00',
    icon: 'ArrowUpRight',
  },
];

export const demoInsight = {
  totalPemasukan: 700000,
  totalPengeluaran: 260000,
  kategoriBesar: 'Transfer',
  persentaseTransfer: 58,
};
