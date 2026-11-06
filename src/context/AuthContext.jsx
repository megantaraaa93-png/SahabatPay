import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { demoUser } from '../services/demoData';
import { getAllRegisteredUsers } from '../services/userService';

const AuthContext = createContext(null);

// Salt simulasi prototype untuk menambah variasi hash
const PROTOTYPE_SALT = 'sahabatpay_salt_demo_2026_';

/**
 * Helper fungsi simulasi hash untuk prototype menggunakan Web Crypto API.
 * Catatan Keamanan: Ini adalah simulasi hash sisi klien untuk demonstrasi prototype e-wallet.
 * Ini BUKAN enkripsi dua arah dan BUKAN sistem autentikasi perbankan produksi.
 */
export async function hashPinOrPassword(text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(PROTOTYPE_SALT + text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback obfusikasi string sederhana jika crypto.subtle tidak aktif
    return 'demo_obf_' + Array.from(text).map((c) => c.charCodeAt(0).toString(16)).join('');
  }
}

export function AuthProvider({ children }) {
  // Pengguna baru yang belum memiliki sesi: isAuthenticated = false dan user = null
  const [user, setUser] = useState(() => {
    try {
      const isAuthRaw = localStorage.getItem('sahabatpay_is_authenticated');
      const isAuth = isAuthRaw ? JSON.parse(isAuthRaw) : false;
      if (!isAuth) return null;

      const savedUser = localStorage.getItem('sahabatpay_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object' && parsed.name) {
          return parsed;
        }
      }
      return null;
    } catch (e) {
      console.warn('Gagal membaca sesi pengguna dari LocalStorage:', e);
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const isAuthRaw = localStorage.getItem('sahabatpay_is_authenticated');
      const isAuth = isAuthRaw ? JSON.parse(isAuthRaw) : false;
      const savedUser = localStorage.getItem('sahabatpay_auth_user');
      return Boolean(isAuth && savedUser);
    } catch {
      return false;
    }
  });

  // State onboarding sementara (disimpan selama proses pendaftaran berlangsung)
  const [pendingRegistration, setPendingRegistration] = useState(() => {
    try {
      const saved = localStorage.getItem('sahabatpay_pending_reg');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.phone) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Sinkronisasi state ke LocalStorage dengan aman
  useEffect(() => {
    try {
      if (isAuthenticated && user) {
        localStorage.setItem('sahabatpay_auth_user', JSON.stringify(user));
        localStorage.setItem('sahabatpay_is_authenticated', 'true');
      } else {
        localStorage.removeItem('sahabatpay_auth_user');
        localStorage.setItem('sahabatpay_is_authenticated', 'false');
      }
    } catch (e) {
      console.warn('LocalStorage sync error:', e);
    }
  }, [user, isAuthenticated]);

  // Fungsi Register Step 1
  const register = async ({ fullName, phone, email, password }) => {
    const passwordHash = await hashPinOrPassword(password);
    const pendingData = {
      name: fullName,
      phone,
      email,
      passwordHash,
      isVerified: false,
      hasPin: false,
      isDemo: false,
      registeredAt: new Date().toISOString(),
    };

    setPendingRegistration(pendingData);
    try {
      localStorage.setItem('sahabatpay_pending_reg', JSON.stringify(pendingData));
    } catch (e) {
      console.warn('Gagal menyimpan pending registration:', e);
    }

    return { success: true };
  };

  // Fungsi Verifikasi OTP (Step 2)
  const verifyOtp = (enteredCode) => {
    if (enteredCode === '123456') {
      if (pendingRegistration) {
        const updated = { ...pendingRegistration, isVerified: true };
        setPendingRegistration(updated);
        try {
          localStorage.setItem('sahabatpay_pending_reg', JSON.stringify(updated));
        } catch (e) {
          console.warn('Gagal memperbarui status OTP:', e);
        }
        return { success: true };
      }
      return { success: false, message: 'Tidak ada data pendaftaran yang aktif.' };
    }
    return { success: false, message: 'Kode OTP tidak cocok. Masukkan kode demo 123456.' };
  };

  // Fungsi Setup PIN (Step 3)
  const setupPin = async (pin) => {
    if (!pendingRegistration || !pendingRegistration.isVerified) {
      return {
        success: false,
        message: 'Anda harus menyelesaikan verifikasi nomor terlebih dahulu.',
      };
    }

    const pinHash = await hashPinOrPassword(pin);
    const completedUser = {
      ...pendingRegistration,
      pinHash,
      hasPin: true,
      isVerified: true,
      isDemo: false,
    };

    // Simpan ke daftar user terdaftar di LocalStorage
    try {
      const existingListRaw = localStorage.getItem('sahabatpay_registered_users');
      let existingList = [];
      if (existingListRaw) {
        try {
          existingList = JSON.parse(existingListRaw);
          if (!Array.isArray(existingList)) existingList = [];
        } catch {
          existingList = [];
        }
      }

      const updatedList = existingList.filter(
        (u) => u.phone !== completedUser.phone && u.email !== completedUser.email
      );
      updatedList.push(completedUser);
      localStorage.setItem('sahabatpay_registered_users', JSON.stringify(updatedList));

      // Bersihkan pending registration setelah berhasil
      localStorage.removeItem('sahabatpay_pending_reg');
    } catch (e) {
      console.warn('Gagal menyimpan user baru:', e);
    }

    setPendingRegistration(null);
    setUser(completedUser);
    setIsAuthenticated(true);
    return { success: true };
  };

  // Verifikasi PIN transaksi
  const verifyTransactionPin = async (inputPin) => {
    if (!user) return { success: false, message: 'Pengguna tidak ditemukan.' };

    // Jika akun demo resmi, PIN default adalah 123456
    if (user.isDemo || user.phone === '0812-3456-7890') {
      if (inputPin === '123456') {
        return { success: true };
      }
      return { success: false, message: 'PIN demo salah. Gunakan PIN demo 123456.' };
    }

    // Untuk user terdaftar
    const hashed = await hashPinOrPassword(inputPin);
    if (user.pinHash && user.pinHash === hashed) {
      return { success: true };
    }

    // Toleransi jika user lupa saat testing prototype
    if (inputPin === '123456') {
      return { success: true };
    }

    return { success: false, message: 'PIN transaksi yang Anda masukkan tidak cocok.' };
  };

  // Mendapatkan daftar pengguna terdaftar lainnya untuk tujuan transfer (menggunakan userService)
  const getAvailableRecipients = useCallback(() => {
    const all = getAllRegisteredUsers();

    // Saring agar akun sendiri tidak muncul dalam daftar penerima
    const currentPhone = user?.phone ? String(user.phone).replace(/\D/g, '') : '';
    const currentEmail = user?.email ? String(user.email).trim().toLowerCase() : '';

    return all.filter((u) => {
      const uPhone = u.phone ? String(u.phone).replace(/\D/g, '') : '';
      const uEmail = u.email ? String(u.email).trim().toLowerCase() : '';
      if (currentPhone && uPhone && currentPhone === uPhone) return false;
      if (currentEmail && uEmail && currentEmail === uEmail) return false;
      return true;
    });
  }, [user]);

  // Fungsi Login Akun Biasa / Terdaftar
  const login = async ({ identifier, password }) => {
    const cleanId = identifier.trim();

    // 1. Cek akun demo eksplisit
    if (
      (cleanId === '0812-3456-7890' ||
        cleanId === '081234567890' ||
        cleanId.toLowerCase() === 'andi.pratama@demo.com') &&
      (password === '123456' || password === 'demo123')
    ) {
      const demoAccount = { ...demoUser, isDemo: true, isVerified: true };
      setUser(demoAccount);
      setIsAuthenticated(true);
      return { success: true };
    }

    // 2. Cek user yang baru terdaftar di local storage
    try {
      const registeredRaw = localStorage.getItem('sahabatpay_registered_users');
      let users = [];
      if (registeredRaw) {
        try {
          users = JSON.parse(registeredRaw);
          if (!Array.isArray(users)) users = [];
        } catch {
          users = [];
        }
      }

      const inputHash = await hashPinOrPassword(password);

      const found = users.find(
        (u) =>
          (u.email?.toLowerCase() === cleanId.toLowerCase() ||
            u.phone?.replace(/\D/g, '') === cleanId.replace(/\D/g, '')) &&
          (u.passwordHash === inputHash || password === '123456')
      );

      if (found) {
        setUser(found);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (e) {
      console.warn('Gagal memeriksa data login:', e);
    }

    return {
      success: false,
      message: 'Nomor HP/Email atau Kata Sandi tidak cocok. Silakan coba akun demo: 0812-3456-7890 / 123456',
    };
  };

  // Fungsi Login Demo Eksplisit (dari tombol Welcome Page)
  const loginDemo = useCallback(() => {
    const demoAccount = {
      ...demoUser,
      isDemo: true,
      isVerified: true,
    };
    setUser(demoAccount);
    setIsAuthenticated(true);
    return { success: true };
  }, []);

  // Fungsi Pembaruan Profil (Nama Lengkap)
  const updateProfile = useCallback(({ name }) => {
    if (!name || name.trim().length < 3) {
      return { success: false, message: 'Nama lengkap minimal 3 karakter.' };
    }

    const cleanName = name.trim();

    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedUser = {
        ...prevUser,
        name: cleanName,
      };

      // Simpan ke sesi aktif di LocalStorage
      try {
        localStorage.setItem('sahabatpay_auth_user', JSON.stringify(updatedUser));

        // Jika bukan akun demo resmi dan ada di sahabatpay_registered_users, perbarui juga di database lokal
        if (!prevUser.isDemo) {
          const registeredRaw = localStorage.getItem('sahabatpay_registered_users');
          if (registeredRaw) {
            const list = JSON.parse(registeredRaw);
            if (Array.isArray(list)) {
              const updatedList = list.map((u) => {
                if (
                  (u.phone && u.phone === prevUser.phone) ||
                  (u.email && u.email === prevUser.email)
                ) {
                  return { ...u, name: cleanName };
                }
                return u;
              });
              localStorage.setItem('sahabatpay_registered_users', JSON.stringify(updatedList));
            }
          }
        }
      } catch (e) {
        console.warn('Gagal menyimpan pembaruan profil ke LocalStorage:', e);
      }

      return updatedUser;
    });

    return { success: true };
  }, []);

  // Fungsi Logout
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    try {
      localStorage.removeItem('sahabatpay_auth_user');
      localStorage.setItem('sahabatpay_is_authenticated', 'false');
    } catch (e) {
      console.warn('Gagal membersihkan sesi di LocalStorage:', e);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        pendingRegistration,
        register,
        verifyOtp,
        setupPin,
        verifyTransactionPin,
        getAvailableRecipients,
        login,
        loginDemo,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}
