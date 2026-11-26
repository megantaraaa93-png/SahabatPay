import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import { useA11y } from './A11yContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import { parseVoiceCommand, parseIndonesianAmount, normalizeText } from '../services/naturalLanguageParser';
import { matchRecipient } from '../services/voiceRecipientMatcher';
import { formatRupiah } from '../utils/formatCurrency';
import { validateTransactionAmount } from '../utils/transactionUtils';

export const VoiceTransactionContext = createContext(null);

export const TRANSACTION_STEPS = {
  IDLE: 'IDLE',
  // Transfer
  SELECTING_RECIPIENT: 'SELECTING_RECIPIENT',
  ENTERING_AMOUNT: 'ENTERING_AMOUNT',
  REVIEWING: 'REVIEWING',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  AWAITING_PIN: 'AWAITING_PIN',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  // Top Up
  SELECTING_METHOD: 'SELECTING_METHOD',
};

const DEFAULT_TOPUP_METHOD = {
  id: 'virtual_account',
  name: 'Virtual Account Instan (VA)',
  code: '8801-9923-4567-8901',
};

export function VoiceTransactionProvider({ children }) {
  const { user, verifyTransactionPin } = useAuth();
  const { balance, transfer, topUp } = useWallet();
  const { isAudioMode } = useA11y();
  const { speakText, playSuccessSound, playErrorSound } = useAudioGuidance();

  // State utama transaksi suara
  const [txState, setTxState] = useState({
    type: null, // 'TRANSFER' | 'TOP_UP'
    step: TRANSACTION_STEPS.IDLE,
    recipient: null, // { name, phone, alias, ... }
    amount: null,
    notes: '',
    paymentMethod: DEFAULT_TOPUP_METHOD,
    candidates: [], // jika ambigu
    error: null,
    result: null,
  });

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);

  // Ref untuk sinkronisasi state di dalam listener callback tanpa stale closure
  const txStateRef = useRef(txState);
  txStateRef.current = txState;

  const resetTransaction = useCallback((reason = null) => {
    setIsPinModalOpen(false);
    setPinAttempts(0);
    setTxState({
      type: null,
      step: TRANSACTION_STEPS.IDLE,
      recipient: null,
      amount: null,
      notes: '',
      paymentMethod: DEFAULT_TOPUP_METHOD,
      candidates: [],
      error: null,
      result: null,
    });
    if (reason && isAudioMode) {
      speakText(reason);
    }
  }, [isAudioMode, speakText]);

  /**
   * Memulai alur Transfer dengan parameter opsional
   */
  const initiateTransfer = useCallback((recipientParam = null, amountParam = null) => {
    if (!user) {
      playErrorSound();
      speakText('Silakan masuk ke akun terlebih dahulu untuk melakukan transfer.');
      return;
    }

    let resolvedRecipient = null;
    let candidates = [];

    // Jika penerima berupa objek utuh
    if (recipientParam && typeof recipientParam === 'object') {
      resolvedRecipient = recipientParam;
    } else if (recipientParam && typeof recipientParam === 'string') {
      // Cari dengan voiceRecipientMatcher
      const match = matchRecipient(recipientParam, user);
      if (match.status === 'EXACT' || match.status === 'SINGLE_MATCH') {
        resolvedRecipient = match.recipient;
      } else if (match.status === 'AMBIGUOUS') {
        candidates = match.matches;
      } else {
        // NOT_FOUND
        playErrorSound();
        speakText(`Penerima bernama ${recipientParam} tidak ditemukan di daftar kontak Anda.`);
        setTxState({
          type: 'TRANSFER',
          step: TRANSACTION_STEPS.SELECTING_RECIPIENT,
          recipient: null,
          amount: amountParam,
          notes: '',
          paymentMethod: null,
          candidates: [],
          error: `Penerima ${recipientParam} tidak ditemukan.`,
          result: null,
        });
        return;
      }
    }

    if (candidates.length > 1) {
      // Ambigu: minta klarifikasi
      const candidateNames = candidates.map((c) => c.name).slice(0, 3).join(' atau ');
      playSuccessSound();
      speakText(`Ditemukan beberapa penerima yang mirip: ${candidateNames}. Silakan sebutkan dengan lebih jelas.`);
      setTxState({
        type: 'TRANSFER',
        step: TRANSACTION_STEPS.SELECTING_RECIPIENT,
        recipient: null,
        amount: amountParam,
        notes: '',
        paymentMethod: null,
        candidates,
        error: null,
        result: null,
      });
      return;
    }

    if (!resolvedRecipient) {
      // Belum ada penerima
      playSuccessSound();
      speakText('Siapa nama penerima yang ingin Anda tuju?');
      setTxState({
        type: 'TRANSFER',
        step: TRANSACTION_STEPS.SELECTING_RECIPIENT,
        recipient: null,
        amount: amountParam,
        notes: '',
        paymentMethod: null,
        candidates: [],
        error: null,
        result: null,
      });
      return;
    }

    // Penerima ditemukan
    if (!amountParam || amountParam <= 0) {
      // Minta nominal
      playSuccessSound();
      speakText(`Penerima ${resolvedRecipient.name || resolvedRecipient.alias} dipilih. Berapa nominal yang ingin Anda transfer?`);
      setTxState({
        type: 'TRANSFER',
        step: TRANSACTION_STEPS.ENTERING_AMOUNT,
        recipient: resolvedRecipient,
        amount: null,
        notes: '',
        paymentMethod: null,
        candidates: [],
        error: null,
        result: null,
      });
      return;
    }

    // Validasi nominal dan saldo
    const val = validateTransactionAmount(amountParam, { minAmount: 10000, maxAmount: 10000000 });
    if (!val.isValid) {
      playErrorSound();
      speakText(`Nominal tidak valid: ${val.error}. Silakan sebutkan nominal baru minimal sepuluh ribu rupiah.`);
      setTxState({
        type: 'TRANSFER',
        step: TRANSACTION_STEPS.ENTERING_AMOUNT,
        recipient: resolvedRecipient,
        amount: null,
        notes: '',
        paymentMethod: null,
        candidates: [],
        error: val.error,
        result: null,
      });
      return;
    }

    if (amountParam > balance) {
      playErrorSound();
      speakText(`Saldo Anda tidak mencukupi untuk mentransfer ${formatRupiah(amountParam)}. Saldo Anda saat ini ${formatRupiah(balance)}.`);
      setTxState({
        type: 'TRANSFER',
        step: TRANSACTION_STEPS.ENTERING_AMOUNT,
        recipient: resolvedRecipient,
        amount: null,
        notes: '',
        paymentMethod: null,
        candidates: [],
        error: 'Saldo tidak mencukupi.',
        result: null,
      });
      return;
    }

    // Lengkap! Masuk ke AWAITING_CONFIRMATION
    playSuccessSound();
    speakText(
      `Konfirmasi: Anda akan mentransfer ${formatRupiah(amountParam)} ke ${resolvedRecipient.name || resolvedRecipient.alias}. Katakan Lanjut atau Setuju untuk konfirmasi, atau Batal untuk membatalkan.`
    );
    setTxState({
      type: 'TRANSFER',
      step: TRANSACTION_STEPS.AWAITING_CONFIRMATION,
      recipient: resolvedRecipient,
      amount: amountParam,
      notes: 'Transfer via Voice AI',
      paymentMethod: null,
      candidates: [],
      error: null,
      result: null,
    });
  }, [user, balance, playSuccessSound, playErrorSound, speakText]);

  /**
   * Memulai alur Top Up dengan nominal
   */
  const initiateTopUp = useCallback((amountParam = null) => {
    if (!user) {
      playErrorSound();
      speakText('Silakan masuk ke akun terlebih dahulu untuk melakukan isi saldo.');
      return;
    }

    if (!amountParam || amountParam <= 0) {
      playSuccessSound();
      speakText('Berapa nominal isi saldo yang Anda inginkan?');
      setTxState({
        type: 'TOP_UP',
        step: TRANSACTION_STEPS.ENTERING_AMOUNT,
        recipient: null,
        amount: null,
        notes: '',
        paymentMethod: DEFAULT_TOPUP_METHOD,
        candidates: [],
        error: null,
        result: null,
      });
      return;
    }

    const val = validateTransactionAmount(amountParam, { minAmount: 10000, maxAmount: 10000000 });
    if (!val.isValid) {
      playErrorSound();
      speakText(`Nominal isi saldo tidak valid: ${val.error}. Minimal sepuluh ribu rupiah.`);
      setTxState({
        type: 'TOP_UP',
        step: TRANSACTION_STEPS.ENTERING_AMOUNT,
        recipient: null,
        amount: null,
        notes: '',
        paymentMethod: DEFAULT_TOPUP_METHOD,
        candidates: [],
        error: val.error,
        result: null,
      });
      return;
    }

    // Masuk ke AWAITING_CONFIRMATION
    playSuccessSound();
    speakText(
      `Konfirmasi isi saldo sebesar ${formatRupiah(amountParam)} menggunakan ${DEFAULT_TOPUP_METHOD.name}. Katakan Setuju atau Lanjut untuk memproses, atau Batal untuk membatalkan.`
    );
    setTxState({
      type: 'TOP_UP',
      step: TRANSACTION_STEPS.AWAITING_CONFIRMATION,
      recipient: null,
      amount: amountParam,
      notes: '',
      paymentMethod: DEFAULT_TOPUP_METHOD,
      candidates: [],
      error: null,
      result: null,
    });
  }, [user, playSuccessSound, playErrorSound, speakText]);

  /**
   * Handler saat PIN selesai diinput pada keypad (AccessiblePinInput atau GiantKeypad)
   */
  const handlePinSubmit = useCallback(async (pinInput) => {
    const cur = txStateRef.current;
    if (cur.step !== TRANSACTION_STEPS.AWAITING_PIN) return;

    if (!pinInput || pinInput.length !== 6) {
      playErrorSound();
      speakText('PIN harus berjumlah enam digit.');
      return;
    }

    const isCorrect = await verifyTransactionPin(pinInput);
    if (!isCorrect) {
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      playErrorSound();

      if (nextAttempts >= 3) {
        speakText('PIN salah tiga kali. Transaksi dibatalkan demi keamanan.');
        resetTransaction();
      } else {
        speakText(`PIN salah. Anda memiliki ${3 - nextAttempts} kesempatan lagi. Silakan coba lagi.`);
      }
      return;
    }

    // PIN Benar -> Eksekusi Transaksi
    setIsPinModalOpen(false);
    setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.PROCESSING }));
    speakText('PIN berhasil diverifikasi. Memproses transaksi Anda...');

    if (cur.type === 'TRANSFER') {
      try {
        const idempotencyKey = `voice_tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const res = await transfer(cur.recipient, cur.amount, cur.notes, idempotencyKey);

        if (res.success) {
          playSuccessSound();
          const succMsg = `Transfer sebesar ${formatRupiah(cur.amount)} ke ${cur.recipient.name || cur.recipient.alias} berhasil dilakukan. Sisa saldo Anda ${formatRupiah(res.newBalance)}.`;
          speakText(succMsg);
          setTxState({
            type: 'TRANSFER',
            step: TRANSACTION_STEPS.SUCCESS,
            recipient: cur.recipient,
            amount: cur.amount,
            notes: cur.notes,
            paymentMethod: null,
            candidates: [],
            error: null,
            result: res,
          });
        } else {
          playErrorSound();
          speakText(`Transfer gagal: ${res.error || 'Terjadi kesalahan sistem.'}`);
          setTxState({
            type: 'TRANSFER',
            step: TRANSACTION_STEPS.FAILED,
            recipient: cur.recipient,
            amount: cur.amount,
            notes: cur.notes,
            paymentMethod: null,
            candidates: [],
            error: res.error,
            result: null,
          });
        }
      } catch (err) {
        playErrorSound();
        speakText('Terjadi kendala saat memproses transfer.');
        setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.FAILED, error: err.message }));
      }
    }
  }, [verifyTransactionPin, pinAttempts, transfer, playSuccessSound, playErrorSound, speakText, resetTransaction]);

  /**
   * Eksekusi Top Up setelah konfirmasi (Top up simulasi tidak membutuhkan PIN)
   */
  const executeTopUpProcess = useCallback(async () => {
    const cur = txStateRef.current;
    if (cur.type !== 'TOP_UP' || cur.step !== TRANSACTION_STEPS.PROCESSING) return;

    try {
      const res = await topUp(cur.amount, cur.paymentMethod.name, {
        methodId: cur.paymentMethod.id,
        code: cur.paymentMethod.code,
      });

      if (res.success) {
        playSuccessSound();
        speakText(`Pengisian saldo sebesar ${formatRupiah(cur.amount)} berhasil. Saldo Anda sekarang ${formatRupiah(res.newBalance)}.`);
        setTxState({
          type: 'TOP_UP',
          step: TRANSACTION_STEPS.SUCCESS,
          recipient: null,
          amount: cur.amount,
          notes: '',
          paymentMethod: cur.paymentMethod,
          candidates: [],
          error: null,
          result: res,
        });
      } else {
        playErrorSound();
        speakText(`Top up gagal: ${res.error}`);
        setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.FAILED, error: res.error }));
      }
    } catch (err) {
      playErrorSound();
      speakText('Terjadi kendala saat memproses pengisian saldo.');
      setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.FAILED, error: err.message }));
    }
  }, [topUp, playSuccessSound, playErrorSound, speakText]);

  /**
   * Mengolah input suara ketika transaksi sedang berlangsung atau menerima perintah baru
   * Mengembalikan `true` jika perintah ditangani oleh orchestrator, `false` jika diteruskan ke command registry normal.
   *
   * @param {string} rawText
   * @returns {boolean}
   */
  const handleVoiceInput = useCallback((rawText) => {
    const cur = txStateRef.current;
    const parsed = parseVoiceCommand(rawText);
    const clean = normalizeText(rawText);

    // 1. Jika pengguna memerintahkan pembatalan saat transaksi aktif
    if (parsed.intent === 'CANCEL') {
      if (cur.step !== TRANSACTION_STEPS.IDLE) {
        playSuccessSound();
        resetTransaction('Aktivitas transaksi suara telah dibatalkan.');
        return true;
      }
      return false; // biarkan handler registry menangani "batal" umum
    }

    // 2. Jika transaksi sedang IDLE, cek apakah ucapan adalah perintah transaksi langsung
    if (cur.step === TRANSACTION_STEPS.IDLE) {
      if (parsed.intent === 'TRANSFER') {
        initiateTransfer(parsed.recipientName, parsed.amount);
        return true;
      }
      if (parsed.intent === 'TOP_UP') {
        initiateTopUp(parsed.amount);
        return true;
      }
      return false; // bukan transaksi, teruskan ke registry
    }

    // 3. Jika sedang SELECTING_RECIPIENT
    if (cur.step === TRANSACTION_STEPS.SELECTING_RECIPIENT) {
      // Pengguna menyebut nama penerima baru
      const targetName = parsed.recipientName || clean.replace(/^(ke|untuk|kepada)\s+/i, '');
      initiateTransfer(targetName, cur.amount);
      return true;
    }

    // 4. Jika sedang ENTERING_AMOUNT
    if (cur.step === TRANSACTION_STEPS.ENTERING_AMOUNT) {
      const amt = parsed.amount || parseIndonesianAmount(clean);
      if (amt && amt > 0) {
        if (cur.type === 'TRANSFER') {
          initiateTransfer(cur.recipient, amt);
        } else if (cur.type === 'TOP_UP') {
          initiateTopUp(amt);
        }
        return true;
      }
      playErrorSound();
      speakText('Nominal belum terbaca dengan jelas. Silakan sebutkan nominal angka, misalnya lima puluh ribu rupiah.');
      return true;
    }

    // 5. Jika sedang AWAITING_CONFIRMATION
    if (cur.step === TRANSACTION_STEPS.AWAITING_CONFIRMATION) {
      if (parsed.intent === 'CONFIRM') {
        if (cur.type === 'TRANSFER') {
          // Masuk ke input PIN aman
          playSuccessSound();
          setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.AWAITING_PIN }));
          setIsPinModalOpen(true);
          speakText('Silakan masukkan enam digit PIN transaksi Anda secara rahasia melalui keypad di layar.');
          return true;
        }
        if (cur.type === 'TOP_UP') {
          playSuccessSound();
          setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.PROCESSING }));
          speakText('Memproses pengisian saldo...');
          setTimeout(() => executeTopUpProcess(), 100);
          return true;
        }
      }

      if (parsed.intent === 'CHANGE_AMOUNT') {
        setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.ENTERING_AMOUNT }));
        speakText('Silakan sebutkan nominal baru yang Anda inginkan.');
        return true;
      }

      if (parsed.intent === 'CHANGE_RECIPIENT' && cur.type === 'TRANSFER') {
        setTxState((prev) => ({ ...prev, step: TRANSACTION_STEPS.SELECTING_RECIPIENT, recipient: null }));
        speakText('Silakan sebutkan nama penerima baru.');
        return true;
      }

      // Ucapan lain saat konfirmasi
      playErrorSound();
      speakText('Katakan Lanjut atau Setuju untuk melanjutkan, atau katakan Batal untuk membatalkan.');
      return true;
    }

    // 6. Jika sedang AWAITING_PIN
    if (cur.step === TRANSACTION_STEPS.AWAITING_PIN) {
      // Keamanan mutlak: jangan tangani input suara sebagai PIN!
      playErrorSound();
      speakText('Demi keamanan saldo Anda, jangan menyuarakan PIN. Masukkan enam digit PIN menggunakan keypad pada layar.');
      return true;
    }

    // 7. Jika sedang SUCCESS atau FAILED
    if (cur.step === TRANSACTION_STEPS.SUCCESS || cur.step === TRANSACTION_STEPS.FAILED) {
      if (/^(tutup|selesai|oke|ok|kembali|beranda)$/i.test(clean)) {
        resetTransaction();
        return true;
      }
      // Mulai transaksi baru jika diucapkan
      if (parsed.intent === 'TRANSFER') {
        resetTransaction();
        initiateTransfer(parsed.recipientName, parsed.amount);
        return true;
      }
      if (parsed.intent === 'TOP_UP') {
        resetTransaction();
        initiateTopUp(parsed.amount);
        return true;
      }
    }

    return false;
  }, [initiateTransfer, initiateTopUp, resetTransaction, executeTopUpProcess, playSuccessSound, playErrorSound, speakText]);

  return (
    <VoiceTransactionContext.Provider
      value={{
        txState,
        isPinModalOpen,
        pinAttempts,
        initiateTransfer,
        initiateTopUp,
        handleVoiceInput,
        handlePinSubmit,
        resetTransaction,
        setIsPinModalOpen,
      }}
    >
      {children}
    </VoiceTransactionContext.Provider>
  );
}

export function useVoiceTransaction() {
  const context = useContext(VoiceTransactionContext);
  if (!context) {
    throw new Error('useVoiceTransaction must be used within a VoiceTransactionProvider');
  }
  return context;
}
