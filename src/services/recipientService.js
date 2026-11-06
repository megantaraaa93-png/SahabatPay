import { findRegisteredUser } from './userService.js';

/**
 * Service pengelolaan Daftar Penerima Transfer Tersimpan (Saved Recipients).
 *
 * Penyimpanan terisolasi per akun: `sahabatpay_recipients_${userId}`
 * Tidak menyimpan PIN, password, atau data autentikasi penerima.
 */

const STORAGE_KEY_PREFIX = 'sahabatpay_recipients_';

/**
 * Mendapatkan storage key terisolasi per pengguna aktif.
 * @param {string} ownerUserId
 * @returns {string}
 */
function getStorageKey(ownerUserId) {
  if (!ownerUserId) throw new Error('ownerUserId wajib diisi.');
  return `${STORAGE_KEY_PREFIX}${ownerUserId}`;
}

/**
 * Memuat daftar penerima tersimpan dari LocalStorage.
 * @param {string} ownerUserId
 * @returns {Array<Object>}
 */
export function getSavedRecipients(ownerUserId) {
  try {
    const raw = localStorage.getItem(getStorageKey(ownerUserId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Menyimpan array penerima ke LocalStorage (private helper).
 * @param {string} ownerUserId
 * @param {Array<Object>} recipients
 */
function saveToStorage(ownerUserId, recipients) {
  try {
    localStorage.setItem(getStorageKey(ownerUserId), JSON.stringify(recipients));
  } catch (e) {
    console.warn('Gagal menyimpan daftar penerima:', e);
  }
}

/**
 * Menambahkan penerima baru ke daftar tersimpan.
 *
 * Validasi yang dilakukan:
 * 1. Nomor telepon penerima harus terdaftar di sistem (cek via userService).
 * 2. Penerima tidak boleh adalah pengirim sendiri.
 * 3. Tidak boleh ada nomor telepon yang sama sudah tersimpan.
 *
 * @param {string} ownerUserId - User ID pemilik daftar (pengirim aktif)
 * @param {string} ownerPhone - Nomor HP pemilik (untuk mencegah self-transfer)
 * @param {string} recipientPhone - Nomor HP penerima
 * @param {string} alias - Nama tampilan / alias penerima (bebas diisi pengirim)
 * @returns {{ success: boolean, recipient?: Object, error?: string }}
 */
export function addSavedRecipient(ownerUserId, ownerPhone, recipientPhone, alias) {
  if (!ownerUserId || !recipientPhone) {
    return { success: false, error: 'Parameter tidak lengkap.' };
  }

  const cleanPhone = String(recipientPhone).replace(/\D/g, '');
  if (cleanPhone.length < 9) {
    return { success: false, error: 'Nomor telepon penerima tidak valid.' };
  }

  // Validasi: penerima bukan diri sendiri
  const ownerClean = String(ownerPhone || '').replace(/\D/g, '');
  if (ownerClean && cleanPhone === ownerClean) {
    return { success: false, error: 'Anda tidak dapat menambahkan diri sendiri sebagai penerima.' };
  }

  // Validasi: penerima harus terdaftar di sistem
  const registeredUser = findRegisteredUser(recipientPhone);
  if (!registeredUser) {
    return {
      success: false,
      error: 'Nomor telepon ini belum terdaftar di SahabatPay. Pastikan penerima sudah memiliki akun.',
    };
  }

  const existing = getSavedRecipients(ownerUserId);

  // Validasi: tidak ada duplikasi nomor
  const alreadySaved = existing.find(
    (r) => String(r.phone).replace(/\D/g, '') === cleanPhone
  );
  if (alreadySaved) {
    return {
      success: false,
      error: `Nomor ini sudah tersimpan dengan nama "${alreadySaved.alias}".`,
    };
  }

  const cleanAlias = String(alias || registeredUser.name || 'Penerima').trim().slice(0, 50);

  const newRecipient = {
    id: `rcpt-${ownerUserId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ownerUserId,
    alias: cleanAlias,
    phone: registeredUser.phone, // Gunakan nomor dari data resmi terdaftar
    name: registeredUser.name, // Nama resmi dari sistem
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [...existing, newRecipient];
  saveToStorage(ownerUserId, updated);

  return { success: true, recipient: newRecipient };
}

/**
 * Memperbarui alias penerima tersimpan.
 * @param {string} ownerUserId
 * @param {string} recipientId
 * @param {string} newAlias
 * @returns {{ success: boolean, error?: string }}
 */
export function updateRecipientAlias(ownerUserId, recipientId, newAlias) {
  if (!ownerUserId || !recipientId) {
    return { success: false, error: 'Parameter tidak lengkap.' };
  }

  const cleanAlias = String(newAlias || '').trim().slice(0, 50);
  if (!cleanAlias) {
    return { success: false, error: 'Alias penerima tidak boleh kosong.' };
  }

  const existing = getSavedRecipients(ownerUserId);
  const idx = existing.findIndex((r) => r.id === recipientId);
  if (idx === -1) {
    return { success: false, error: 'Penerima tidak ditemukan.' };
  }

  existing[idx] = {
    ...existing[idx],
    alias: cleanAlias,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(ownerUserId, existing);
  return { success: true };
}

/**
 * Menghapus penerima dari daftar tersimpan.
 * @param {string} ownerUserId
 * @param {string} recipientId
 * @returns {{ success: boolean, error?: string }}
 */
export function deleteSavedRecipient(ownerUserId, recipientId) {
  if (!ownerUserId || !recipientId) {
    return { success: false, error: 'Parameter tidak lengkap.' };
  }

  const existing = getSavedRecipients(ownerUserId);
  const filtered = existing.filter((r) => r.id !== recipientId);

  if (filtered.length === existing.length) {
    return { success: false, error: 'Penerima tidak ditemukan.' };
  }

  saveToStorage(ownerUserId, filtered);
  return { success: true };
}

/**
 * Mencari penerima tersimpan berdasarkan nama alias (untuk Voice Command).
 * @param {string} ownerUserId
 * @param {string} query - Nama yang diucapkan atau diketik
 * @returns {Array<Object>} Daftar penerima yang cocok
 */
export function searchSavedRecipients(ownerUserId, query) {
  if (!ownerUserId || !query) return getSavedRecipients(ownerUserId);
  const q = String(query).toLowerCase().trim();
  const all = getSavedRecipients(ownerUserId);
  return all.filter(
    (r) =>
      r.alias?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q) ||
      r.phone?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
  );
}

/**
 * Memvalidasi kembali penerima tersimpan saat transfer akan dieksekusi.
 * Memastikan nomor masih terdaftar di sistem (tidak mengandalkan cache).
 * @param {string} phone
 * @returns {{ isValid: boolean, registeredUser?: Object, error?: string }}
 */
export function revalidateSavedRecipient(phone) {
  const user = findRegisteredUser(phone);
  if (!user) {
    return {
      isValid: false,
      error: 'Penerima tersimpan tidak lagi ditemukan di sistem SahabatPay. Silakan perbarui daftar penerima.',
    };
  }
  return { isValid: true, registeredUser: user };
}
