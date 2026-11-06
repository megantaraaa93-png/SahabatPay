import { demoUser } from './demoData.js';

/**
 * Service bersama untuk verifikasi akun pengguna di lingkungan prototype.
 * Digunakan secara konsisten oleh AuthContext dan walletService.
 */

const STORAGE_USERS_KEY = 'sahabatpay_registered_users';

/**
 * Mendapatkan seluruh daftar akun terdaftar di sistem prototype,
 * termasuk akun demo resmi.
 * @returns {Array<Object>}
 */
export function getAllRegisteredUsers() {
  const users = [];

  // 1. Akun demo resmi selalu tersedia sebagai akun terdaftar
  users.push({
    ...demoUser,
    isDemo: true,
    isVerified: true,
  });

  // 2. Ambil pengguna terdaftar dari LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => {
          if (u && typeof u === 'object' && u.phone) {
            // Hindari duplikasi akun demo jika tersimpan
            const cleanPhone = u.phone.replace(/\D/g, '');
            const demoCleanPhone = demoUser.phone.replace(/\D/g, '');
            if (cleanPhone !== demoCleanPhone) {
              users.push({
                ...u,
                isDemo: false,
              });
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn('Gagal membaca database user terdaftar:', e);
  }

  return users;
}

/**
 * Mencari akun terdaftar berdasarkan nomor telepon atau email.
 * @param {string} identifier - Nomor telepon atau email
 * @returns {Object|null}
 */
export function findRegisteredUser(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase();
  const digitsOnly = cleanId.replace(/\D/g, '');

  const all = getAllRegisteredUsers();

  return (
    all.find((u) => {
      const uPhoneDigits = u.phone ? String(u.phone).replace(/\D/g, '') : '';
      const uEmail = u.email ? String(u.email).trim().toLowerCase() : '';

      if (digitsOnly && uPhoneDigits === digitsOnly) return true;
      if (cleanId && uEmail === cleanId) return true;
      return false;
    }) || null
  );
}

/**
 * Memvalidasi apakah target adalah penerima transfer yang valid:
 * 1. Terdaftar di sistem.
 * 2. Bukan akun pengirim sendiri.
 *
 * @param {Object} senderUser - Akun pengirim aktif
 * @param {Object|string} recipient - Objek atau identifier penerima
 * @returns {{ isValid: boolean, recipientUser?: Object, error?: string }}
 */
export function validateRecipient(senderUser, recipient) {
  if (!senderUser) {
    return { isValid: false, error: 'Sesi pengirim tidak valid.' };
  }

  const senderPhoneDigits = senderUser.phone ? senderUser.phone.replace(/\D/g, '') : '';
  const recipientIdentifier = typeof recipient === 'object' ? recipient.phone || recipient.email : recipient;

  const found = findRegisteredUser(recipientIdentifier);
  if (!found) {
    return {
      isValid: false,
      error: 'Akun penerima tidak ditemukan atau belum terdaftar di SahabatPay.',
    };
  }

  const foundPhoneDigits = found.phone ? found.phone.replace(/\D/g, '') : '';

  if (senderPhoneDigits && foundPhoneDigits && senderPhoneDigits === foundPhoneDigits) {
    return {
      isValid: false,
      error: 'Anda tidak dapat mentransfer saldo ke akun Anda sendiri.',
    };
  }

  return {
    isValid: true,
    recipientUser: found,
  };
}
