import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, ArrowLeft, Volume2, Keyboard, AlertCircle } from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';
import AccessiblePinInput from '../components/a11y/AccessiblePinInput';

export default function SetupPinPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { setupPin } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [useAccessibleInput, setUseAccessibleInput] = useState(isAudioMode);
  const [activeStep, setActiveStep] = useState(1); // 1 = PIN Pertama, 2 = Konfirmasi PIN
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PENTING: Sesuai aturan a11y & security: PIN tidak pernah dibacakan atau ditampilkan via audio
  const guideText =
    'Halaman Pembuatan PIN Transaksi SahabatPay. Langkah tiga dari tiga. Buat enam digit angka PIN rahasia untuk mengamankan transaksi Anda, lalu konfirmasikan pada kolom kedua. Demi keamanan Anda, angka PIN tidak akan pernah dibacakan melalui suara.';

  const handlePinInput = (val, setter) => {
    const numeric = val.replace(/\D/g, '').slice(0, 6);
    setter(numeric);
    if (errorMessage) setErrorMessage('');
  };

  const isWeakPin = (p) => {
    // Cek angka berulang seperti 111111, 000000
    if (/^(\d)\1{5}$/.test(p)) return true;
    // Cek urutan umum
    if (p === '123456' || p === '654321' || p === '012345') return true;
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pin.length < 6) {
      const err = 'PIN harus terdiri dari 6 digit angka.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    if (isWeakPin(pin)) {
      const err = 'Kombinasi PIN terlalu mudah ditebak (misal: 111111 atau 123456). Gunakan kombinasi angka lain.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    if (pin !== confirmPin) {
      const err = 'Konfirmasi PIN tidak cocok dengan PIN pertama.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    setIsSubmitting(true);
    const result = await setupPin(pin);
    setIsSubmitting(false);

    if (result.success) {
      playSuccessSound();
      if (isAudioMode) {
        speakText('PIN transaksi berhasil disimpan! Pendaftaran selesai. Selamat datang di Beranda SahabatPay.');
      }
      navigate('/dashboard', { replace: true });
    } else {
      playErrorSound();
      setErrorMessage(result.message);
      if (isAudioMode) {
        speakText(result.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Tombol kembali & Stepper */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              stopSpeech();
              navigate('/verification');
            }}
            className={`inline-flex items-center gap-1.5 font-semibold text-brand-charcoal hover:text-brand-forest transition-default px-2.5 py-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
              isEasyMode ? 'min-h-[64px] text-base' : 'text-sm'
            }`}
            aria-label="Kembali ke verifikasi OTP"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Kembali</span>
          </button>

          <div className="sp-badge-forest py-1 px-3">
            <span>Langkah 3 dari 3</span>
          </div>
        </div>

        {/* Audio Guide Bar */}
        <div className="mb-5">
          <AudioGuideBar
            instructionText={guideText}
            isPlaying={isPlaying}
            onPlay={speakText}
            onStop={stopSpeech}
          />
        </div>

        <Card className="!p-6 md:!p-8 shadow-card-md">
          <div className="text-center mb-6">
            <Logo size="lg" className="mx-auto mb-3" />
            <h1 className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
              Buat PIN Transaksi
            </h1>
            <p className={`text-brand-muted mt-2 font-medium ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              PIN ini digunakan untuk mengonfirmasi setiap transaksi finansial Anda.
            </p>

            {/* Stepper Visual */}
            <div className="flex items-center justify-center gap-2 mt-4" aria-hidden="true">
              <span className="w-8 h-2 rounded-full bg-brand-emerald" />
              <span className="w-8 h-2 rounded-full bg-brand-emerald" />
              <span className="w-8 h-2 rounded-full bg-brand-forest" />
            </div>

            {/* Toggle Mode Input Aksesibel */}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setUseAccessibleInput(!useAccessibleInput)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-brand-border bg-brand-cream/60 hover:bg-brand-cream text-brand-charcoal transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
                aria-pressed={useAccessibleInput}
              >
                {useAccessibleInput ? (
                  <>
                    <Keyboard size={14} className="text-brand-forest" />
                    <span>Ganti ke Papan Ketik Biasa</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={14} className="text-brand-emerald" />
                    <span>Mode Tombol Aksesibel (Ramah Tunanetra)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {useAccessibleInput ? (
              <div className="bg-brand-cream/50 p-4 rounded-2xl border border-brand-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                    {activeStep === 1 ? 'Langkah 1: Masukkan PIN Baru' : 'Langkah 2: Konfirmasi Ulang PIN'}
                  </span>
                  <span className="sp-badge-green text-xs">
                    {activeStep === 1 ? '1/2' : '2/2'}
                  </span>
                </div>

                {activeStep === 1 ? (
                  <div>
                    <p className="text-xs text-brand-muted mb-3">
                      Gunakan tombol navigasi atau volume di bawah untuk memilih 6 digit angka PIN Anda:
                    </p>
                    <AccessiblePinInput
                      pinLength={6}
                      disabled={isSubmitting}
                      onComplete={(enteredPin) => {
                        setPin(enteredPin);
                        if (isAudioMode) speakText('PIN pertama tersimpan. Sekarang masukkan konfirmasi PIN.');
                        setActiveStep(2);
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-brand-muted mb-3">
                      Masukkan kembali 6 digit angka PIN yang sama untuk verifikasi:
                    </p>
                    <AccessiblePinInput
                      pinLength={6}
                      disabled={isSubmitting}
                      onComplete={(enteredPin) => {
                        setConfirmPin(enteredPin);
                        if (isAudioMode) speakText('Konfirmasi PIN terisi. Klik tombol selesaikan pendaftaran.');
                      }}
                    />
                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setPin('');
                          setConfirmPin('');
                          setActiveStep(1);
                        }}
                        className="text-xs text-brand-forest font-semibold hover:underline"
                      >
                        Ulangi dari PIN pertama
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Input PIN Pertama */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="setup-pin"
                    className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-lg' : 'text-sm'}`}
                  >
                    PIN 6 Digit Angka
                  </label>
                  <input
                    id="setup-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => handlePinInput(e.target.value, setPin)}
                    placeholder="••••••"
                    className={`w-full rounded-xl border border-brand-border bg-white text-center font-mono tracking-widest text-2xl transition-default focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest ${
                      isEasyMode ? 'py-4 min-h-[64px]' : 'py-3 min-h-[48px]'
                    }`}
                    autoComplete="new-password"
                    aria-describedby="pin-security-hint"
                    required
                  />
                </div>

                {/* Konfirmasi PIN */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="setup-confirm-pin"
                    className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-lg' : 'text-sm'}`}
                  >
                    Ulangi PIN 6 Digit
                  </label>
                  <input
                    id="setup-confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                    placeholder="••••••"
                    className={`w-full rounded-xl border border-brand-border bg-white text-center font-mono tracking-widest text-2xl transition-default focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest ${
                      isEasyMode ? 'py-4 min-h-[64px]' : 'py-3 min-h-[48px]'
                    }`}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </>
            )}

            {/* Peringatan Keamanan */}
            <div
              id="pin-security-hint"
              className="sp-alert-warning flex items-start gap-2.5 text-xs"
            >
              <ShieldAlert size={18} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
              <p>
                <strong>Tips Keamanan:</strong> Hindari kombinasi tanggal lahir atau angka berurutan (misal: 123456). Demi kerahasiaan Anda, angka PIN tidak akan pernah dibacakan melalui suara.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                className="sp-alert-error flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle size={18} className="shrink-0 text-brand-coral mt-0.5" aria-hidden="true" />
                <p className="flex-1">{errorMessage}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              disabled={isSubmitting}
              className="mt-2"
            >
              {isSubmitting ? 'Menyimpan...' : 'Selesaikan Pendaftaran'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
