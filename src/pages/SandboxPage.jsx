import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  RotateCcw,
  Plus,
  Send,
  QrCode,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import AccessiblePinInput from '../components/a11y/AccessiblePinInput';
import GiantKeypad from '../components/a11y/GiantKeypad';
import { formatRupiah, formatTanggalSingkat } from '../utils/formatCurrency';

const SANDBOX_STORAGE_KEY = 'sahabatpay_sandbox_wallet_v1';
const INITIAL_SANDBOX_BALANCE = 1000000;
const SANDBOX_DEMO_PIN = '123456';

function loadSandboxState() {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.balance === 'number' && Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch {}
  return { balance: INITIAL_SANDBOX_BALANCE, transactions: [] };
}

/**
 * Mode Latihan (Sandbox Tutorial Mode)
 * Terisolasi sepenuhnya dari wallet utama pengguna.
 * Memungkinkan pengguna baru dan pendamping keluarga berlatih Top Up, Transfer, QRIS, dan PIN tanpa risiko.
 */
export default function SandboxPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [sandboxState, setSandboxState] = useState(() => loadSandboxState());
  const [activePractice, setActivePractice] = useState('transfer'); // 'top_up' | 'transfer' | 'qris' | 'pin'
  const [amountInput, setAmountInput] = useState('50000');
  const [targetName, setTargetName] = useState('Toko Latihan Sahabat');
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: string }

  // Modal PIN latihan
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(sandboxState));
    } catch {}
  }, [sandboxState]);

  const guideText = `Mode Latihan Sandbox SahabatPay. Saldo latihan Anda saat ini ${formatRupiah(
    sandboxState.balance
  )}. Semua saldo dan transaksi di halaman ini bersifat fiktif untuk latihan dan terpisah dari dompet utama Anda. PIN latihan adalah 1 2 3 4 5 6.`;

  const parsedAmount = amountInput ? parseInt(amountInput.replace(/\D/g, ''), 10) || 0 : 0;

  const handleResetSandbox = () => {
    const fresh = { balance: INITIAL_SANDBOX_BALANCE, transactions: [] };
    setSandboxState(fresh);
    setStatusMsg({
      type: 'success',
      text: 'Tutorial direset. Saldo latihan kembali menjadi Rp 1.000.000.',
    });
    playSuccessSound();
    if (isAudioMode) speakText('Mode latihan direset. Saldo latihan kembali satu juta rupiah.');
  };

  const handleStartPractice = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setStatusMsg(null);

    if (activePractice === 'pin') {
      setPinError('');
      setIsPinOpen(true);
      if (isAudioMode) speakText('Latihan memasukkan PIN enam digit. Gunakan PIN latihan 1 2 3 4 5 6.');
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount < 10000) {
      const err = 'Minimal nominal latihan adalah Rp 10.000.';
      setStatusMsg({ type: 'error', text: err });
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    if (activePractice !== 'top_up' && sandboxState.balance < parsedAmount) {
      const err = 'Saldo latihan tidak mencukupi. Lakukan latihan Top Up atau Reset Tutorial.';
      setStatusMsg({ type: 'error', text: err });
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    setPinError('');
    setIsPinOpen(true);
    if (isAudioMode) {
      speakText(
        `Konfirmasi latihan ${activePractice === 'top_up' ? 'Top Up' : activePractice === 'qris' ? 'QRIS' : 'Transfer'} sebesar ${formatRupiah(
          parsedAmount
        )}. Masukkan PIN latihan 1 2 3 4 5 6.`
      );
    }
  };

  const handlePinComplete = (enteredPin) => {
    if (enteredPin !== SANDBOX_DEMO_PIN) {
      playErrorSound();
      setPinError('PIN latihan salah. Gunakan PIN latihan: 123456.');
      if (isAudioMode) speakText('PIN latihan salah. Silakan masukkan 1 2 3 4 5 6.');
      return;
    }

    setIsPinOpen(false);
    playSuccessSound();

    if (activePractice === 'pin') {
      const msg = 'Latihan PIN berhasil! Anda sudah siap menggunakan PIN 6 digit dengan aman.';
      setStatusMsg({ type: 'success', text: msg });
      if (isAudioMode) speakText(msg);
      return;
    }

    const isTopUp = activePractice === 'top_up';
    const nextBalance = isTopUp
      ? sandboxState.balance + parsedAmount
      : sandboxState.balance - parsedAmount;

    const newTxn = {
      id: `SANDBOX-${Date.now()}`,
      type: activePractice,
      title: isTopUp
        ? '[SANDBOX] Latihan Top Up'
        : activePractice === 'qris'
        ? `[SANDBOX] Latihan QRIS - ${targetName}`
        : `[SANDBOX] Latihan Transfer - ${targetName}`,
      amount: parsedAmount,
      createdAt: new Date().toISOString(),
    };

    setSandboxState((prev) => ({
      balance: nextBalance,
      transactions: [newTxn, ...prev.transactions],
    }));

    const successText = `Simulasi latihan berhasil! Saldo latihan Anda kini ${formatRupiah(nextBalance)}.`;
    setStatusMsg({ type: 'success', text: successText });
    if (isAudioMode) speakText(successText);
  };

  return (
    <div className="flex flex-col gap-5 pb-10">
      <AudioGuideBar
        instructionText={guideText}
        isPlaying={isPlaying}
        onPlay={speakText}
        onStop={stopSpeech}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            stopSpeech();
            navigate('/dashboard');
          }}
          className={`inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white p-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'
          }`}
          aria-label="Kembali ke Beranda"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Beranda</span>
        </button>

        <span className="text-xs font-extrabold text-amber-900 bg-amber-100 border border-amber-300 py-1 px-3 rounded-full uppercase tracking-wider">
          SANDBOX / SIMULASI
        </span>

        <button
          type="button"
          onClick={handleResetSandbox}
          className={`inline-flex items-center gap-1.5 font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-3 text-sm' : 'text-xs px-2.5'
          }`}
          aria-label="Ulangi dan reset saldo latihan sandbox"
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      {/* Banner Isolasi Sandbox */}
      <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-medium flex items-start gap-2.5" role="note">
        <ShieldAlert size={18} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Mode Latihan Terpisah:</strong> Saldo dan riwayat di halaman ini 100% terpisah dari dompet utama Anda dan tidak terhubung ke layanan pembayaran apa pun. PIN Latihan: <strong className="font-mono">123456</strong>.
        </p>
      </div>

      {/* Kartu Saldo Sandbox */}
      <Card className="!p-5 bg-gradient-to-r from-amber-600 to-amber-500 text-white !border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center" aria-hidden="true">
            <GraduationCap size={26} />
          </div>
          <div>
            <p className="text-xs text-white/90 font-semibold uppercase tracking-wider">
              Saldo Latihan (SANDBOX)
            </p>
            <p className="text-2xl font-extrabold tracking-tight" aria-live="polite">
              {formatRupiah(sandboxState.balance)}
            </p>
          </div>
        </div>
      </Card>

      {/* Pilihan Latihan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="tablist" aria-label="Pilih jenis latihan sandbox">
        {[
          { id: 'transfer', label: 'Transfer', icon: Send },
          { id: 'qris', label: 'QRIS', icon: QrCode },
          { id: 'top_up', label: 'Top Up', icon: Plus },
          { id: 'pin', label: 'Latihan PIN', icon: Lock },
        ].map(({ id, label, icon: Icon }) => {
          const active = activePractice === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActivePractice(id);
                setStatusMsg(null);
              }}
              className={`rounded-2xl border font-bold flex items-center justify-center gap-1.5 transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                isEasyMode ? 'min-h-[64px] text-base px-3' : 'min-h-[46px] text-xs px-2.5'
              } ${
                active
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-gray-800 border-gray-300 hover:border-primary'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Latihan */}
      <Card className="!p-5 bg-white border-gray-200">
        <form onSubmit={handleStartPractice} className="flex flex-col gap-4">
          {activePractice === 'pin' ? (
            <div className="text-center py-2">
              <p className="font-bold text-gray-900 text-base">Latihan Input PIN 6 Digit</p>
              <p className="text-xs text-gray-600 mt-1">
                Berlatih menggunakan input PIN aksesibel (tombol layar, panah, atau volume) dengan kode latihan <strong className="font-mono">123456</strong>.
              </p>
            </div>
          ) : (
            <>
              {activePractice !== 'top_up' && (
                <div>
                  <label htmlFor="sandbox-target" className="block font-bold text-gray-800 text-sm mb-1">
                    {activePractice === 'qris' ? 'Nama Merchant Latihan' : 'Nama Penerima Latihan'}
                  </label>
                  <input
                    id="sandbox-target"
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    className={`w-full rounded-xl border border-gray-300 px-3 ${
                      isEasyMode ? 'py-3.5 text-base min-h-[56px]' : 'py-2.5 text-sm'
                    }`}
                  />
                </div>
              )}

              <div>
                <label htmlFor="sandbox-amount" className="block font-bold text-gray-800 text-sm mb-1">
                  Nominal Latihan (Rp)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[10000, 20000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountInput(String(val))}
                      className={`rounded-xl border font-bold text-xs ${
                        isEasyMode ? 'min-h-[52px]' : 'min-h-[40px]'
                      } ${
                        parsedAmount === val
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-gray-50 text-gray-800 border-gray-300'
                      }`}
                    >
                      {formatRupiah(val)}
                    </button>
                  ))}
                </div>
                <input
                  id="sandbox-amount"
                  type="text"
                  inputMode="numeric"
                  value={amountInput ? Number(amountInput.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                  onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, ''))}
                  className={`w-full rounded-xl border border-gray-300 px-3 font-bold ${
                    isEasyMode ? 'py-3.5 text-lg min-h-[56px]' : 'py-2.5 text-base'
                  }`}
                />
              </div>

              {isEasyMode && (
                <GiantKeypad value={amountInput} onChange={setAmountInput} />
              )}
            </>
          )}

          {statusMsg && (
            <div
              role="status"
              aria-live="polite"
              className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-green-50 border-green-300 text-green-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 text-secondary-dark mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              )}
              <p>{statusMsg.text}</p>
            </div>
          )}

          <Button type="submit" variant="primary" size={isEasyMode ? 'lg' : 'md'} fullWidth>
            {activePractice === 'pin' ? 'Mulai Latihan PIN' : 'Coba Transaksi Latihan'}
          </Button>
        </form>
      </Card>

      {/* Riwayat Sandbox Terisolasi */}
      <section aria-labelledby="heading-sandbox-history">
        <h2 id="heading-sandbox-history" className="font-bold text-gray-800 text-sm mb-2">
          Riwayat Latihan Sandbox ({sandboxState.transactions.length})
        </h2>
        {sandboxState.transactions.length === 0 ? (
          <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-xl p-4 text-center">
            Belum ada transaksi latihan. Coba lakukan simulasi di atas.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sandboxState.transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-gray-900">{tx.title}</p>
                  <p className="text-gray-500">{formatTanggalSingkat(tx.createdAt)}</p>
                </div>
                <span className={`font-extrabold ${tx.type === 'top_up' ? 'text-secondary-dark' : 'text-amber-700'}`}>
                  {tx.type === 'top_up' ? '+' : '-'} {formatRupiah(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal PIN Latihan */}
      <Modal
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        title="PIN Latihan Sandbox (123456)"
        showDefaultFooter={false}
      >
        <div className="flex flex-col gap-4 text-center">
          <p className="text-xs text-gray-600">
            Masukkan 6 digit PIN latihan (<strong className="font-mono">123456</strong>). Data ini tidak dikirim ke mana pun.
          </p>
          <AccessiblePinInput pinLength={6} onComplete={handlePinComplete} />
          {pinError && (
            <p className="text-xs text-red-700 font-semibold" role="alert">
              {pinError}
            </p>
          )}
          <Button variant="ghost" onClick={() => setIsPinOpen(false)}>
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
}
