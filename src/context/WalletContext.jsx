import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  loadUserWallet,
  executeTopUp,
  executeTransfer,
  executeQrisPayment,
  recoverPendingTransactions,
  getWalletStorageKey,
} from '../services/walletService';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref untuk menghindari pemanggilan refresh berulang saat render loop
  const isRefreshingRef = useRef(false);

  // Muat data wallet setiap kali pengguna berubah atau saat login/logout
  const refreshWallet = useCallback(() => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      if (!isAuthenticated || !user) {
        setBalance(0);
        setTransactions([]);
        setUpdatedAt(null);
        setIsLoading(false);
        return;
      }

      // 1. Jalankan transaction recovery untuk memeriksa apakah ada transaksi menggantung
      recoverPendingTransactions();

      // 2. Muat data wallet mutakhir dari LocalStorage
      const data = loadUserWallet(user);
      setBalance(data.balance);
      setTransactions(data.transactions || []);
      setUpdatedAt(data.updatedAt);
    } catch (e) {
      console.warn('Error refreshing wallet:', e);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  // SINKRONISASI ANTAR-TAB:
  // Mendengarkan perubahan pada LocalStorage dari tab lain menggunakan Web Storage API
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const currentKey = getWalletStorageKey(user);

    const handleStorageChange = (event) => {
      // Hanya lakukan refresh jika key yang berubah berhubungan dengan:
      // 1. Wallet pengguna aktif ini
      // 2. Transaction journal
      // 3. User terdaftar (bisa menambah daftar penerima)
      if (
        event.key === currentKey ||
        event.key === 'sahabatpay_tx_journal' ||
        event.key === 'sahabatpay_registered_users'
      ) {
        refreshWallet();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, isAuthenticated, refreshWallet]);

  /**
   * Fungsi top up saldo
   * @param {number} amount
   * @param {string} paymentMethod
   * @param {Object} [details]
   */
  const topUp = useCallback(
    async (amount, paymentMethod, details = {}) => {
      if (!isAuthenticated || !user) {
        return { success: false, error: 'Silakan masuk terlebih dahulu.' };
      }

      // Simulasi delay jaringan perbankan mikro (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = executeTopUp(user, amount, paymentMethod, details);

      if (result.success) {
        setBalance(result.newBalance);
        setTransactions((prev) => [result.transaction, ...prev]);
        setUpdatedAt(new Date().toISOString());
      }

      return result;
    },
    [user, isAuthenticated]
  );

  /**
   * Fungsi transfer saldo antar-pengguna dengan dukungan Idempotency Key
   * @param {Object|string} recipientUser - Penerima terdaftar
   * @param {number} amount - Nominal transfer
   * @param {string} [notes] - Catatan
   * @param {string} [idempotencyKey] - Kunci idempotensi unik
   */
  const transfer = useCallback(
    async (recipientUser, amount, notes = '', idempotencyKey = null) => {
      if (!isAuthenticated || !user) {
        return { success: false, error: 'Silakan masuk terlebih dahulu.' };
      }

      // Simulasi delay jaringan transaksi (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = executeTransfer(user, recipientUser, amount, notes, idempotencyKey);

      if (result.success) {
        setBalance(result.newBalance);
        // Jika ini bukan pengulangan idempotent yang sudah ada di state
        if (!result.isIdempotentReplay) {
          setTransactions((prev) => [result.transaction, ...prev]);
        }
        setUpdatedAt(new Date().toISOString());
      }

      return result;
    },
    [user, isAuthenticated]
  );

  /**
   * Fungsi pembayaran QRIS simulasi
   * @param {string|Object} merchantInput
   * @param {number} amount
   * @param {string} [idempotencyKey]
   */
  const payQris = useCallback(
    async (merchantInput, amount, idempotencyKey = null) => {
      if (!isAuthenticated || !user) {
        return { success: false, error: 'Silakan masuk terlebih dahulu.' };
      }

      // Simulasi delay jaringan (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = executeQrisPayment(user, merchantInput, amount, idempotencyKey);

      if (result.success) {
        setBalance(result.newBalance);
        if (!result.isIdempotentReplay) {
          setTransactions((prev) => [result.transaction, ...prev]);
        }
        setUpdatedAt(new Date().toISOString());
      }

      return result;
    },
    [user, isAuthenticated]
  );

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        updatedAt,
        isLoading,
        topUp,
        transfer,
        payQris,
        refreshWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet harus digunakan di dalam WalletProvider');
  }
  return context;
}
