import { formatTanggal, formatTanggalSingkat } from './formatCurrency.js';

/**
 * Format standar riwayat transaksi SahabatPay.
 * Struktur data ini digunakan bersama oleh Top Up, Transfer, dan QRIS.
 *
 * @typedef {Object} Transaction
 * @property {string} id - ID unik transaksi (e.g. "SP-TRANSFER-1730812345678-ABCD")
 * @property {string} userId - ID atau nomor telepon user pemilik transaksi
 * @property {'top_up'|'transfer_in'|'transfer_out'|'qris_payment'} type - Tipe transaksi
 * @property {string} title - Judul ringkas transaksi
 * @property {string} description - Keterangan detail
 * @property {number} amount - Nilai nominal dalam Rupiah (selalu positif)
 * @property {'success'|'pending'|'failed'} status - Status transaksi
 * @property {string} paymentMethod - Metode pembayaran/sumber dana
 * @property {string} createdAt - Tanggal dan waktu ISO string
 * @property {Object} [metadata] - Data tambahan opsional (rekening, penerima, pengirim, dll)
 */

/**
 * Menghasilkan ID transaksi unik dengan prefix tipe transaksi.
 * @param {'top_up'|'transfer'|'qris'} typePrefix
 * @returns {string}
 */
export function generateTransactionId(typePrefix = 'top_up') {
  const prefix = typePrefix.toUpperCase().replace(/[^A-Z]/g, '');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SP-${prefix}-${timestamp}-${randomSuffix}`;
}

/**
 * Memvalidasi nominal transaksi.
 * @param {number|string} amount
 * @param {Object} [options]
 * @param {number} [options.minAmount=10000]
 * @param {number} [options.maxAmount=10000000]
 * @param {number} [options.currentBalance]
 * @returns {{ isValid: boolean, error?: string, parsedAmount: number }}
 */
export function validateTransactionAmount(amount, options = {}) {
  const { minAmount = 10000, maxAmount = 10000000, currentBalance } = options;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/\D/g, ''));

  if (isNaN(num) || num <= 0) {
    return {
      isValid: false,
      error: 'Nominal harus lebih besar dari Rp 0.',
      parsedAmount: 0,
    };
  }

  if (num < minAmount) {
    return {
      isValid: false,
      error: `Minimal nominal adalah Rp ${minAmount.toLocaleString('id-ID')}.`,
      parsedAmount: num,
    };
  }

  if (num > maxAmount) {
    return {
      isValid: false,
      error: `Maksimal nominal adalah Rp ${maxAmount.toLocaleString('id-ID')}.`,
      parsedAmount: num,
    };
  }

  if (typeof currentBalance === 'number' && num > currentBalance) {
    return {
      isValid: false,
      error: 'Saldo Anda tidak mencukupi untuk melakukan transaksi ini.',
      parsedAmount: num,
    };
  }

  return {
    isValid: true,
    parsedAmount: num,
  };
}

/**
 * Menyamarkan (mask) nomor handphone untuk privasi aksesibel.
 * Contoh: 0812-3456-7890 -> 0812-••••-7890
 * @param {string} phone
 * @returns {string}
 */
export function maskPhoneNumber(phone) {
  if (!phone) return '••••';
  const clean = String(phone).replace(/\s+/g, '');
  if (clean.length < 8) return clean;
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start}-••••-${end}`;
}

/**
 * Menormalisasi objek transaksi dari berbagai sumber (Top Up, Transfer, QRIS, maupun demo lama)
 * ke dalam bentuk standar terpadu tanpa mengubah data asli.
 *
 * @param {Object} txn
 * @returns {Object}
 */
export function normalizeTransaction(txn) {
  if (!txn) return null;

  // 1. Tentukan tipe transaksi standar
  let type = txn.type;
  if (!type) {
    if (txn.category === 'Top Up' || txn.description?.toLowerCase().includes('top up')) {
      type = 'top_up';
    } else if (txn.description?.toLowerCase().includes('qris')) {
      type = 'qris_payment';
    } else if (txn.description?.toLowerCase().includes('transfer dari')) {
      type = 'transfer_in';
    } else {
      type = 'transfer_out';
    }
  } else if (type === 'masuk') {
    type = 'top_up';
  } else if (type === 'keluar') {
    if (txn.description?.toLowerCase().includes('qris') || txn.category === 'Pembayaran') {
      type = 'qris_payment';
    } else {
      type = 'transfer_out';
    }
  }

  // 2. Tentukan arah arus dana (in = uang masuk / kredit, out = uang keluar / debit)
  const isIncome = type === 'top_up' || type === 'transfer_in';
  const direction = isIncome ? 'in' : 'out';

  // 3. Tentukan tanggal ISO
  const rawDate = txn.createdAt || txn.date || new Date().toISOString();

  // 4. Ekstrak data pihak terkait (merchant, penerima, pengirim, metode bayar)
  let relatedParty = '';
  let relatedPhone = '';
  const meta = txn.metadata || {};

  if (type === 'qris_payment') {
    relatedParty = meta.merchantName || txn.merchant?.merchantName || '';
    if (!relatedParty && txn.description) {
      // Ambil dari deskripsi jika ada "QRIS - Sumeleh Coffee"
      const parts = txn.description.split('-');
      if (parts.length > 1) relatedParty = parts[1].trim();
      else relatedParty = txn.description;
    }
    if (!relatedParty) relatedParty = 'Merchant QRIS';
  } else if (type === 'transfer_out') {
    relatedParty = meta.recipientName || '';
    relatedPhone = meta.recipientPhone || '';
    if (!relatedParty && txn.description?.includes('Transfer ke ')) {
      relatedParty = txn.description.replace('Transfer ke ', '').trim();
    }
    if (!relatedParty) relatedParty = 'Penerima Transfer';
  } else if (type === 'transfer_in') {
    relatedParty = meta.senderName || '';
    relatedPhone = meta.senderPhone || '';
    if (!relatedParty && txn.description?.includes('Transfer dari ')) {
      relatedParty = txn.description.replace('Transfer dari ', '').trim();
    }
    if (!relatedParty) relatedParty = 'Pengirim Transfer';
  } else if (type === 'top_up') {
    relatedParty = txn.paymentMethod || meta.methodName || 'Bank / Mitra SahabatPay';
  }

  const relatedPhoneMasked = relatedPhone ? maskPhoneNumber(relatedPhone) : '';

  // 5. Tentukan judul transaksi yang rapi
  let title = txn.title;
  if (!title) {
    if (type === 'top_up') title = 'Top Up Saldo';
    else if (type === 'transfer_out') title = 'Transfer Saldo';
    else if (type === 'transfer_in') title = 'Transfer Masuk';
    else if (type === 'qris_payment') title = 'Pembayaran QRIS';
    else title = 'Transaksi';
  }

  return {
    id: txn.id || 'SP-UNKNOWN',
    userId: txn.userId || '',
    type,
    direction,
    isIncome,
    title,
    description: txn.description || title,
    amount: typeof txn.amount === 'number' ? Math.abs(txn.amount) : 0,
    status: txn.status || 'success',
    paymentMethod: txn.paymentMethod || (isIncome ? 'Transfer Bank' : 'Saldo SahabatPay'),
    createdAt: rawDate,
    relatedParty,
    relatedPhone,
    relatedPhoneMasked,
    notes: meta.notes || txn.notes || '-',
    metadata: meta,
    raw: txn,
  };
}

/**
 * Mengelompokkan tanggal transaksi ke dalam label manusiawi:
 * "Hari Ini", "Kemarin", atau format tanggal lengkap (e.g. "3 November 2026").
 *
 * @param {string} dateString
 * @returns {string}
 */
export function formatTransactionGroupDate(dateString) {
  if (!dateString) return 'Lainnya';

  const txDate = new Date(dateString);
  if (isNaN(txDate.getTime())) return 'Tanggal Tidak Valid';

  const now = new Date();
  const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = today.getTime() - txDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari Ini';
  if (diffDays === 1) return 'Kemarin';

  return formatTanggalSingkat(dateString);
}

/**
 * Memfilter dan mengurutkan daftar transaksi berdasarkan berbagai kriteria:
 * - search: teks pencarian (merchant, penerima, pengirim, ID, keterangan, nominal)
 * - typeFilter: 'all' | 'top_up' | 'transfer_in' | 'transfer_out' | 'qris_payment'
 * - dateFilter: 'all' | 'today' | '7days' | '30days'
 * - sortOrder: 'newest' | 'oldest' | 'highest' | 'lowest'
 *
 * @param {Array<Object>} transactions
 * @param {Object} [filters]
 * @returns {Array<Object>}
 */
export function filterAndSortTransactions(transactions = [], filters = {}) {
  const {
    search = '',
    typeFilter = 'all',
    dateFilter = 'all',
    sortOrder = 'newest',
  } = filters;

  const normalizedList = transactions
    .map(normalizeTransaction)
    .filter(Boolean);

  const now = new Date();
  const cleanSearch = String(search).trim().toLowerCase();

  // 1. Filter
  const filtered = normalizedList.filter((item) => {
    // A. Filter Tipe
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }

    // B. Filter Waktu (berdasarkan createdAt)
    if (dateFilter !== 'all') {
      const itemDate = new Date(item.createdAt);
      if (!isNaN(itemDate.getTime())) {
        const diffMs = now.getTime() - itemDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === 'today') {
          const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (itemDay.getTime() !== today.getTime()) return false;
        } else if (dateFilter === '7days') {
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (dateFilter === '30days') {
          if (diffDays > 30 || diffDays < 0) return false;
        }
      }
    }

    // C. Filter Pencarian Teks
    if (cleanSearch) {
      const matchId = item.id.toLowerCase().includes(cleanSearch);
      const matchTitle = item.title.toLowerCase().includes(cleanSearch);
      const matchDesc = item.description.toLowerCase().includes(cleanSearch);
      const matchParty = item.relatedParty.toLowerCase().includes(cleanSearch);
      const searchDigits = cleanSearch.replace(/\D/g, '');
      const matchPhone = searchDigits.length >= 3 && item.relatedPhone
        ? item.relatedPhone.replace(/\D/g, '').includes(searchDigits)
        : false;
      const matchAmount = String(item.amount).includes(cleanSearch);
      const matchNotes = item.notes.toLowerCase().includes(cleanSearch);

      if (
        !matchId &&
        !matchTitle &&
        !matchDesc &&
        !matchParty &&
        !matchPhone &&
        !matchAmount &&
        !matchNotes
      ) {
        return false;
      }
    }

    return true;
  });

  // 2. Sort
  filtered.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;

    if (sortOrder === 'newest') return timeB - timeA;
    if (sortOrder === 'oldest') return timeA - timeB;
    if (sortOrder === 'highest') return b.amount - a.amount;
    if (sortOrder === 'lowest') return a.amount - b.amount;
    return timeB - timeA;
  });

  return filtered;
}

/**
 * Menghitung ringkasan agregat transaksi: total dana masuk dan total dana keluar secara terpisah.
 *
 * @param {Array<Object>} transactions - Array transaksi (bisa sudah dinormalisasi atau mentah)
 * @returns {{ totalCount: number, totalIn: number, totalOut: number, inCount: number, outCount: number }}
 */
export function calculateTransactionSummary(transactions = []) {
  let totalIn = 0;
  let totalOut = 0;
  let inCount = 0;
  let outCount = 0;

  transactions.forEach((t) => {
    const norm = normalizeTransaction(t);
    if (!norm) return;

    if (norm.isIncome) {
      totalIn += norm.amount;
      inCount++;
    } else {
      totalOut += norm.amount;
      outCount++;
    }
  });

  return {
    totalCount: transactions.length,
    totalIn,
    totalOut,
    inCount,
    outCount,
  };
}

/**
 * Mengelompokkan transaksi yang telah difilter ke dalam Map/Array grup tanggal:
 * [ { groupLabel: 'Hari Ini', items: [...] }, { groupLabel: 'Kemarin', items: [...] }, ... ]
 *
 * @param {Array<Object>} filteredTransactions
 * @returns {Array<{ groupLabel: string, items: Array<Object> }>}
 */
export function groupTransactionsByDate(filteredTransactions = []) {
  const groupsMap = new Map();

  filteredTransactions.forEach((txn) => {
    const groupLabel = formatTransactionGroupDate(txn.createdAt);
    if (!groupsMap.has(groupLabel)) {
      groupsMap.set(groupLabel, []);
    }
    groupsMap.get(groupLabel).push(txn);
  });

  const result = [];
  groupsMap.forEach((items, groupLabel) => {
    result.push({ groupLabel, items });
  });

  return result;
}
