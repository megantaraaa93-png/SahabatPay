import { demoBalance, demoTransactions } from './demoData.js';
import { generateTransactionId } from '../utils/transactionUtils.js';
import { findRegisteredUser, validateRecipient } from './userService.js';
import { validateMerchant } from './merchantService.js';

/**
 * Service untuk mengelola data wallet di LocalStorage.
 * Memastikan data antar pengguna terisolasi berdasarkan userId/phone.
 *
 * CATATAN ARSITEKTUR & KEAMANAN PROTOTYPE:
 * LocalStorage adalah penyimpanan key-value synchronous berbasis browser.
 * LocalStorage TIDAK memiliki jaminan transaksi ACID atomik seperti basis data perbankan produksi.
 * Untuk prototype ini, kita menerapkan pola Two-Phase Transaction Journaling dan Idempotency Cache
 * untuk mencegah transaksi ganda dan memfasilitasi pemulihan (recovery) saat sesi terganggu/crash.
 */

const STORAGE_PREFIX = 'sahabatpay_wallet_';
const JOURNAL_KEY = 'sahabatpay_tx_journal';
const IDEMPOTENCY_KEY_PREFIX = 'sahabatpay_idemp_';

/**
 * Mendapatkan identifier unik pengguna untuk key penyimpanan wallet.
 * @param {Object} user
 * @returns {string}
 */
export function getWalletStorageKey(user) {
  if (!user) return `${STORAGE_PREFIX}guest`;
  // Jika akun demo resmi
  if (user.isDemo || user.phone === '0812-3456-7890' || user.phone === '081234567890') {
    return `${STORAGE_PREFIX}demo`;
  }
  // User terdaftar biasa menggunakan nomor HP yang dinormalisasi
  const cleanPhone = (user.phone || user.email || 'user').replace(/\D/g, '');
  return `${STORAGE_PREFIX}${cleanPhone || 'user'}`;
}

/**
 * Menginisialisasi data wallet pengguna jika belum ada di LocalStorage.
 * @param {Object} user
 * @returns {{ userId: string, balance: number, transactions: Array, updatedAt: string }}
 */
export function loadUserWallet(user) {
  if (!user) {
    return { userId: 'guest', balance: 0, transactions: [], updatedAt: new Date().toISOString() };
  }

  const key = getWalletStorageKey(user);

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.balance === 'number' &&
        Array.isArray(parsed.transactions)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca wallet dari LocalStorage:', e);
  }

  // Jika belum ada di LocalStorage, inisialisasi data awal
  const isDemo = Boolean(user.isDemo || user.phone === '0812-3456-7890');

  const initialWallet = {
    userId: isDemo ? 'demo' : user.phone || user.email,
    balance: isDemo ? demoBalance : 0,
    transactions: isDemo ? normalizeDemoTransactions(user.phone || 'demo') : [],
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(initialWallet));
  } catch (e) {
    console.warn('Gagal menginisialisasi wallet di LocalStorage:', e);
  }

  return initialWallet;
}

/**
 * Menyimpan data wallet ke LocalStorage.
 * @param {Object} user
 * @param {{ balance: number, transactions: Array }} walletData
 */
export function saveUserWallet(user, walletData) {
  if (!user) return;
  const key = getWalletStorageKey(user);
  const dataToSave = {
    ...walletData,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('Gagal menyimpan wallet ke LocalStorage:', e);
  }
}

/* =========================================================================
   TRANSACTION JOURNALING & IDEMPOTENCY SYSTEM (PROTOTYPE RECOVERY)
   ========================================================================= */

/**
 * Membaca seluruh jurnal transaksi dari LocalStorage.
 * @returns {Array<Object>}
 */
export function getTransactionJournal() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Gagal membaca transaction journal:', e);
    return [];
  }
}

/**
 * Menyimpan atau memperbarui entri jurnal transaksi.
 * Status alur jurnal:
 * - 'pending' : Transaksi divalidasi dan dicatat, saldo belum dipotong
 * - 'sender_updated' : Saldo pengirim telah dipotong, penerima sedang diproses
 * - 'completed' : Kedua wallet pengirim dan penerima telah konsisten
 * - 'failed' : Transaksi gagal dan di-rollback
 *
 * @param {Object} journalEntry
 */
export function recordJournalEntry(journalEntry) {
  try {
    const journal = getTransactionJournal();
    const existingIndex = journal.findIndex((j) => j.txnId === journalEntry.txnId);

    const updatedEntry = {
      ...journalEntry,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      journal[existingIndex] = { ...journal[existingIndex], ...updatedEntry };
    } else {
      journal.push(updatedEntry);
    }

    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));

    // Jika memiliki idempotencyKey, simpan juga pointer cache idempotency
    if (journalEntry.idempotencyKey) {
      localStorage.setItem(
        `${IDEMPOTENCY_KEY_PREFIX}${journalEntry.idempotencyKey}`,
        JSON.stringify(updatedEntry)
      );
    }
  } catch (e) {
    console.warn('Gagal mencatat transaction journal:', e);
  }
}

/**
 * Memeriksa apakah idempotencyKey sudah pernah diproses.
 * @param {string} idempotencyKey
 * @returns {Object|null}
 */
export function checkIdempotency(idempotencyKey) {
  if (!idempotencyKey) return null;
  try {
    const raw = localStorage.getItem(`${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Memulihkan transaksi yang belum selesai (pending / sender_updated) akibat tab tertutup atau crash.
 * Proses recovery ini bersifat IDEMPOTEN: aman dipanggil berkali-kali tanpa risiko kredit ganda.
 *
 * Menggunakan pendekatan Forward-Settlement:
 * - Jika status 'sender_updated' (pengirim sudah dipotong, tapi penerima belum dikredit),
 *   recovery menyelesaikan kredit ke dompet penerima dan menandai 'completed'.
 * - Jika status 'pending' (belum ada dompet yang dipotong), transaksi ditandai 'failed'.
 *
 * @returns {number} Jumlah transaksi yang berhasil dipulihkan
 */
export function recoverPendingTransactions() {
  const journal = getTransactionJournal();
  const uncompleted = journal.filter(
    (j) => j.status === 'pending' || j.status === 'sender_updated'
  );

  if (uncompleted.length === 0) return 0;

  let recoveredCount = 0;

  uncompleted.forEach((entry) => {
    try {
      const senderUser = findRegisteredUser(entry.senderPhone);

      if (!senderUser) {
        // Jika akun pengirim tidak ditemukan lagi, tandai failed
        recordJournalEntry({ ...entry, status: 'failed', failureReason: 'Akun pengirim tidak valid saat recovery' });
        return;
      }

      const senderWallet = loadUserWallet(senderUser);
      // Cek apakah transaksi sudah ada di riwayat pengirim
      const existsInSender = senderWallet.transactions.some((t) => t.id === entry.txnId);

      // JIKA INI TRANSAKSI QRIS
      if (entry.type === 'qris_payment') {
        if (entry.status === 'sender_updated' || entry.status === 'pending') {
          // Jika transaksi QRIS sudah terdebit di dompet pengirim, pastikan status jurnal menjadi completed
          if (existsInSender) {
            recordJournalEntry({
              ...entry,
              status: 'completed',
              recoveredAt: new Date().toISOString(),
            });
            recoveredCount++;
          } else {
            // Belum terdebit sama sekali, batalkan
            recordJournalEntry({
              ...entry,
              status: 'failed',
              failureReason: 'Proses pembayaran QRIS terhenti sebelum debit saldo',
            });
          }
        }
        return;
      }

      // JIKA INI TRANSAKSI TRANSFER ANTAR-PENGGUNA
      const recipientUser = findRegisteredUser(entry.recipientPhone);
      if (!recipientUser) {
        recordJournalEntry({ ...entry, status: 'failed', failureReason: 'Akun penerima tidak valid saat recovery' });
        return;
      }

      const recipientWallet = loadUserWallet(recipientUser);
      const existsInRecipient = recipientWallet.transactions.some((t) => t.id === entry.txnId);

      if (entry.status === 'sender_updated') {
        // Pengirim sudah dipotong di jurnal. Pastikan penerima juga ter-kredit jika belum ada di riwayatnya
        if (!existsInRecipient) {
          const recipientTxn = {
            id: entry.txnId,
            userId: recipientWallet.userId,
            type: 'transfer_in',
            title: 'Transfer Masuk',
            description: `Transfer dari ${senderUser.name}`,
            amount: entry.amount,
            status: 'success',
            paymentMethod: 'Saldo SahabatPay',
            createdAt: entry.createdAt,
            metadata: {
              senderName: senderUser.name,
              senderPhone: senderUser.phone,
              notes: entry.notes || '-',
              recovered: true,
            },
          };

          const updatedRecipientWallet = {
            ...recipientWallet,
            balance: recipientWallet.balance + entry.amount,
            transactions: [recipientTxn, ...recipientWallet.transactions],
            updatedAt: new Date().toISOString(),
          };
          saveUserWallet(recipientUser, updatedRecipientWallet);
        }

        // Tandai selesai di jurnal
        recordJournalEntry({
          ...entry,
          status: 'completed',
          recoveredAt: new Date().toISOString(),
        });
        recoveredCount++;
      } else if (entry.status === 'pending') {
        // Status masih pending dan belum ada potongan, tandai failed
        if (!existsInSender && !existsInRecipient) {
          recordJournalEntry({
            ...entry,
            status: 'failed',
            failureReason: 'Proses terhenti sebelum pemotongan saldo',
          });
        }
      }
    } catch (e) {
      console.warn(`Gagal memulihkan transaksi ${entry.txnId}:`, e);
    }
  });

  return recoveredCount;
}

/* =========================================================================
   EKSEKUSI TRANSAKSI TOP UP & TRANSFER
   ========================================================================= */

/**
 * Memproses transaksi Top Up:
 * - Menambah saldo
 * - Menambahkan catatan riwayat ke awal array transaksi
 * - Menyimpan pembaruan ke LocalStorage
 */
export function executeTopUp(user, amount, paymentMethod, details = {}) {
  if (!user) {
    return { success: false, error: 'Sesi pengguna tidak valid.' };
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return { success: false, error: 'Nominal top up tidak valid.' };
  }

  const currentWallet = loadUserWallet(user);
  const newBalance = currentWallet.balance + amount;

  const newTxn = {
    id: generateTransactionId('top_up'),
    userId: currentWallet.userId,
    type: 'top_up',
    title: 'Top Up Saldo',
    description: `Top Up via ${paymentMethod}`,
    amount,
    status: 'success',
    paymentMethod,
    createdAt: new Date().toISOString(),
    metadata: {
      ...details,
      previousBalance: currentWallet.balance,
      newBalance,
    },
  };

  const updatedWallet = {
    ...currentWallet,
    balance: newBalance,
    transactions: [newTxn, ...currentWallet.transactions],
    updatedAt: new Date().toISOString(),
  };

  saveUserWallet(user, updatedWallet);

  return {
    success: true,
    newBalance,
    transaction: newTxn,
  };
}

/**
 * Memproses transaksi Transfer Antar-Pengguna:
 * 1. Validasi Idempotency Key (cegah double billing)
 * 2. Validasi Identitas Pengirim & Validasi Penerima Terdaftar (cegah akun fiktif/hantu)
 * 3. Validasi Saldo Pengirim
 * 4. Catat Transaction Journal ('pending')
 * 5. Potong saldo pengirim & catat riwayat ('sender_updated')
 * 6. Tambah saldo penerima & catat riwayat ('completed')
 * 7. Mekanisme Rollback jika terjadi exception
 *
 * @param {Object} senderUser - Pengguna aktif pengirim
 * @param {Object|string} recipientInput - Objek penerima atau nomor HP
 * @param {number} amount - Nominal transfer
 * @param {string} [notes=''] - Catatan transfer
 * @param {string} [idempotencyKey] - Kunci idempotensi unik per transaksi
 * @returns {{ success: boolean, newBalance?: number, transaction?: Object, error?: string, isIdempotentReplay?: boolean }}
 */
export function executeTransfer(
  senderUser,
  recipientInput,
  amount,
  notes = '',
  idempotencyKey = null
) {
  // 1. Cek Idempotency Key jika disediakan
  if (idempotencyKey) {
    const existing = checkIdempotency(idempotencyKey);
    if (existing) {
      if (existing.status === 'completed' && existing.cachedResult) {
        // Kembalikan transaksi yang telah tersimpan sebelumnya tanpa memotong saldo kembali
        return {
          ...existing.cachedResult,
          isIdempotentReplay: true,
        };
      }
      if (existing.status === 'failed') {
        return {
          success: false,
          error: existing.failureReason || 'Transaksi dengan ID ini sebelumnya telah gagal.',
        };
      }
    }
  }

  // 2. Validasi Pengirim
  if (!senderUser || !senderUser.phone) {
    return { success: false, error: 'Sesi pengirim tidak valid.' };
  }

  const verifiedSender = findRegisteredUser(senderUser.phone);
  if (!verifiedSender) {
    return { success: false, error: 'Akun pengirim tidak terdaftar di sistem SahabatPay.' };
  }

  // 3. Validasi Penerima (harus benar-benar ada di daftar terdaftar, bukan akun fiktif, bukan diri sendiri)
  const recipientCheck = validateRecipient(verifiedSender, recipientInput);
  if (!recipientCheck.isValid || !recipientCheck.recipientUser) {
    return { success: false, error: recipientCheck.error || 'Akun penerima tidak valid.' };
  }

  const recipientUser = recipientCheck.recipientUser;

  // 4. Validasi Nominal
  if (typeof amount !== 'number' || amount <= 0) {
    return { success: false, error: 'Nominal transfer tidak valid.' };
  }

  // 5. Muat dompet & validasi saldo pengirim
  const senderWallet = loadUserWallet(verifiedSender);
  const recipientWallet = loadUserWallet(recipientUser);

  if (senderWallet.balance < amount) {
    return {
      success: false,
      error: `Saldo tidak mencukupi. Saldo Anda: Rp ${senderWallet.balance.toLocaleString('id-ID')}`,
    };
  }

  // 6. Buat detail transaksi dan jurnal staging
  const txnId = generateTransactionId('transfer');
  const timestamp = new Date().toISOString();

  const journalEntry = {
    txnId,
    idempotencyKey,
    senderPhone: verifiedSender.phone,
    senderName: verifiedSender.name,
    recipientPhone: recipientUser.phone,
    recipientName: recipientUser.name,
    amount,
    notes: notes || '-',
    status: 'pending',
    createdAt: timestamp,
  };

  // Catat jurnal awal (tahap 1: pending)
  recordJournalEntry(journalEntry);

  // Data transaksi untuk pengirim
  const senderTxn = {
    id: txnId,
    userId: senderWallet.userId,
    type: 'transfer_out',
    title: 'Transfer Saldo',
    description: `Transfer ke ${recipientUser.name}`,
    amount,
    status: 'success',
    paymentMethod: 'Saldo SahabatPay',
    createdAt: timestamp,
    metadata: {
      recipientName: recipientUser.name,
      recipientPhone: recipientUser.phone,
      notes: notes || '-',
      idempotencyKey,
      previousBalance: senderWallet.balance,
      newBalance: senderWallet.balance - amount,
    },
  };

  // Data transaksi untuk penerima
  const recipientTxn = {
    id: txnId,
    userId: recipientWallet.userId,
    type: 'transfer_in',
    title: 'Transfer Masuk',
    description: `Transfer dari ${verifiedSender.name}`,
    amount,
    status: 'success',
    paymentMethod: 'Saldo SahabatPay',
    createdAt: timestamp,
    metadata: {
      senderName: verifiedSender.name,
      senderPhone: verifiedSender.phone,
      notes: notes || '-',
      idempotencyKey,
      previousBalance: recipientWallet.balance,
      newBalance: recipientWallet.balance + amount,
    },
  };

  // Snapshot awal sebelum eksekusi untuk fasilitas rollback darurat
  const originalSenderRaw = localStorage.getItem(getWalletStorageKey(verifiedSender));
  const originalRecipientRaw = localStorage.getItem(getWalletStorageKey(recipientUser));

  try {
    // Tahap 2: Perbarui wallet pengirim
    const updatedSenderWallet = {
      ...senderWallet,
      balance: senderWallet.balance - amount,
      transactions: [senderTxn, ...senderWallet.transactions],
      updatedAt: timestamp,
    };
    saveUserWallet(verifiedSender, updatedSenderWallet);

    // Catat progress jurnal (tahap 2: sender_updated)
    recordJournalEntry({ ...journalEntry, status: 'sender_updated' });

    // Tahap 3: Perbarui wallet penerima
    const updatedRecipientWallet = {
      ...recipientWallet,
      balance: recipientWallet.balance + amount,
      transactions: [recipientTxn, ...recipientWallet.transactions],
      updatedAt: timestamp,
    };
    saveUserWallet(recipientUser, updatedRecipientWallet);

    const successResult = {
      success: true,
      newBalance: updatedSenderWallet.balance,
      transaction: senderTxn,
    };

    // Tahap 4: Tandai jurnal selesai (completed) dan cache response idempotency
    recordJournalEntry({
      ...journalEntry,
      status: 'completed',
      cachedResult: successResult,
    });

    return successResult;
  } catch (error) {
    console.error('Terjadi kesalahan penyimpanan transaksi transfer:', error);

    // Rollback darurat jika terjadi error di tengah proses penyimpanan
    try {
      if (originalSenderRaw) localStorage.setItem(getWalletStorageKey(verifiedSender), originalSenderRaw);
      if (originalRecipientRaw) localStorage.setItem(getWalletStorageKey(recipientUser), originalRecipientRaw);
    } catch (rbErr) {
      console.error('Gagal melakukan rollback:', rbErr);
    }

    recordJournalEntry({
      ...journalEntry,
      status: 'failed',
      failureReason: error?.message || 'Gagal menyimpan transaksi ke media penyimpanan',
    });

    return {
      success: false,
      error: 'Gagal memproses transaksi transfer. Saldo Anda tidak berubah.',
    };
  }
}

/**
 * Memproses transaksi Pembayaran QRIS Simulasi:
 * 1. Validasi Idempotency Key (cegah double charge)
 * 2. Validasi Identitas Pengguna Aktif
 * 3. Validasi Merchant (harus terdaftar dan aktif)
 * 4. Validasi Nominal (Rp 1.000 - Rp 10.000.000) & Saldo Pengguna
 * 5. Catat Transaction Journal ('pending')
 * 6. Potong Saldo Pengguna & Catat Mutasi bertipe 'qris_payment'
 * 7. Tandai status transaksi 'completed'
 *
 * @param {Object} user - Pengguna aktif yang melakukan scan/bayar
 * @param {string|Object} merchantInput - Kode QR, kode merchant, atau objek merchant
 * @param {number} amount - Nominal pembayaran
 * @param {string} [idempotencyKey] - Kunci idempotensi unik
 * @returns {{ success: boolean, newBalance?: number, transaction?: Object, error?: string, isIdempotentReplay?: boolean }}
 */
export function executeQrisPayment(user, merchantInput, amount, idempotencyKey = null) {
  // 1. Cek Idempotency Key
  if (idempotencyKey) {
    const existing = checkIdempotency(idempotencyKey);
    if (existing) {
      if (existing.status === 'completed' && existing.cachedResult) {
        return {
          ...existing.cachedResult,
          isIdempotentReplay: true,
        };
      }
      if (existing.status === 'failed') {
        return {
          success: false,
          error: existing.failureReason || 'Transaksi QRIS dengan ID ini sebelumnya telah gagal.',
        };
      }
    }
  }

  // 2. Validasi Pengguna
  if (!user || !user.phone) {
    return { success: false, error: 'Sesi pengguna tidak valid.' };
  }

  const verifiedUser = findRegisteredUser(user.phone);
  if (!verifiedUser) {
    return { success: false, error: 'Akun Anda tidak terdaftar di sistem SahabatPay.' };
  }

  // 3. Validasi Merchant melalui merchantService
  const merchantCheck = validateMerchant(merchantInput);
  if (!merchantCheck.isValid || !merchantCheck.merchant) {
    return { success: false, error: merchantCheck.error || 'Merchant QRIS tidak valid.' };
  }

  const merchant = merchantCheck.merchant;

  // 4. Validasi Nominal (Batas QRIS: Rp 1.000 - Rp 10.000.000)
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    Number.isNaN(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return { success: false, error: 'Nominal pembayaran tidak valid dan harus berupa bilangan bulat.' };
  }

  if (amount < 1000) {
    return { success: false, error: 'Minimal pembayaran QRIS adalah Rp 1.000.' };
  }

  if (amount > 10000000) {
    return { success: false, error: 'Maksimal pembayaran QRIS adalah Rp 10.000.000.' };
  }

  // 5. Muat dompet & validasi kecukupan saldo
  const userWallet = loadUserWallet(verifiedUser);
  if (userWallet.balance < amount) {
    return {
      success: false,
      error: `Saldo tidak mencukupi. Saldo Anda: Rp ${userWallet.balance.toLocaleString('id-ID')}`,
    };
  }

  // 6. Buat ID transaksi unik & detail transaksi
  const txnId = generateTransactionId('qris');
  const timestamp = new Date().toISOString();

  const journalEntry = {
    txnId,
    type: 'qris_payment',
    idempotencyKey,
    senderPhone: verifiedUser.phone,
    senderName: verifiedUser.name,
    merchantId: merchant.merchantId,
    merchantCode: merchant.merchantCode,
    merchantName: merchant.merchantName,
    amount,
    status: 'pending',
    createdAt: timestamp,
  };

  recordJournalEntry(journalEntry);

  const qrisTxn = {
    id: txnId,
    userId: userWallet.userId,
    type: 'qris_payment',
    title: 'Pembayaran QRIS',
    description: `QRIS - ${merchant.merchantName}`,
    amount,
    status: 'success',
    paymentMethod: 'Saldo SahabatPay',
    createdAt: timestamp,
    metadata: {
      merchantId: merchant.merchantId,
      merchantCode: merchant.merchantCode,
      merchantName: merchant.merchantName,
      merchantCategory: merchant.merchantCategory,
      merchantLocation: merchant.merchantLocation,
      adminFee: 0,
      totalPayment: amount,
      idempotencyKey,
      previousBalance: userWallet.balance,
      newBalance: userWallet.balance - amount,
    },
  };

  const originalUserRaw = localStorage.getItem(getWalletStorageKey(verifiedUser));

  try {
    const updatedWallet = {
      ...userWallet,
      balance: userWallet.balance - amount,
      transactions: [qrisTxn, ...userWallet.transactions],
      updatedAt: timestamp,
    };
    saveUserWallet(verifiedUser, updatedWallet);

    const successResult = {
      success: true,
      newBalance: updatedWallet.balance,
      transaction: qrisTxn,
      merchant,
    };

    recordJournalEntry({
      ...journalEntry,
      status: 'completed',
      cachedResult: successResult,
    });

    return successResult;
  } catch (error) {
    console.error('Terjadi kesalahan penyimpanan transaksi QRIS:', error);

    try {
      if (originalUserRaw) localStorage.setItem(getWalletStorageKey(verifiedUser), originalUserRaw);
    } catch (rbErr) {
      console.error('Gagal rollback QRIS:', rbErr);
    }

    recordJournalEntry({
      ...journalEntry,
      status: 'failed',
      failureReason: error?.message || 'Gagal menyimpan transaksi QRIS ke storage',
    });

    return {
      success: false,
      error: 'Gagal memproses pembayaran QRIS. Saldo Anda tidak berkurang.',
    };
  }
}

/**
 * Mengonversi format transaksi demo lama agar kompatibel dengan format standar.
 */
function normalizeDemoTransactions(userId) {
  return demoTransactions.map((dt) => ({
    id: dt.id,
    userId,
    type: dt.type === 'masuk' ? 'top_up' : 'transfer_out',
    title: dt.category === 'Top Up' ? 'Top Up Saldo' : dt.category,
    description: dt.description,
    amount: dt.amount,
    status: 'success',
    paymentMethod: dt.category === 'Top Up' ? 'Transfer Bank Demo' : 'Saldo SahabatPay',
    createdAt: dt.date,
  }));
}
