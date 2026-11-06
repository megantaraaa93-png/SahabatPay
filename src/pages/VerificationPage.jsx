import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RotateCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function VerificationPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { pendingRegistration, verifyOtp } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(isEasyMode ? 0 : 45); // Easy mode tidak menggunakan timer yang memaksa
  const [canResend, setCanResend] = useState(isEasyMode ? true : false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = useRef([]);

  const targetPhone = pendingRegistration?.phone || '0812-3456-7890';
  const guideText = `Halaman Verifikasi Kode OTP SahabatPay. Langkah dua dari tiga. Silakan masukkan enam digit kode verifikasi yang telah dikirimkan ke nomor ${targetPhone}. Untuk kebutuhan demo prototype ini, kode verifikasinya adalah 1, 2, 3, 4, 5, 6.`;

  // Countdown timer (hanya diaktifkan pada mode normal & audio, easy mode tetap santai)
  useEffect(() => {
    if (isEasyMode) {
      setCanResend(true);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown, isEasyMode]);

  // Handle per digit input
  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus digit berikutnya
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleAutoFillDemo = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
    setStatusMessage(null);
    if (isAudioMode) {
      speakText('Kode demo 123456 telah diisikan ke dalam formulir.');
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    setStatusMessage({
      type: 'info',
      text: 'Kode baru telah dikirimkan (Kode Demo: 123456).',
    });
    setCanResend(false);
    setCountdown(45);
    playSuccessSound();

    if (isAudioMode) {
      speakText('Kode verifikasi baru telah dikirimkan ke nomor handphone Anda. Kode demo adalah 123456.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const enteredCode = otp.join('');

    if (enteredCode.length < 6) {
      const err = 'Harap lengkapi 6 digit kode OTP.';
      setStatusMessage({ type: 'error', text: err });
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    setIsVerifying(true);
    const result = verifyOtp(enteredCode);
    setIsVerifying(false);

    if (result.success) {
      playSuccessSound();
      setStatusMessage({
        type: 'success',
        text: 'Verifikasi berhasil! Melanjutkan ke pembuatan PIN keamanan.',
      });
      if (isAudioMode) {
        speakText('Verifikasi nomor berhasil! Melanjutkan ke langkah terakhir yaitu pembuatan PIN transaksi.');
      }
      setTimeout(() => {
        navigate('/setup-pin', { replace: true });
      }, 700);
    } else {
      playErrorSound();
      setStatusMessage({ type: 'error', text: result.message });
      if (isAudioMode) {
        speakText(result.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Tombol kembali & Stepper */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              stopSpeech();
              navigate('/register');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-primary transition-default p-1 rounded-lg focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary"
            aria-label="Kembali ke formulir pendaftaran sebelumnya"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-dark bg-red-100 px-3 py-1 rounded-full border border-red-200">
            <span>Langkah 2 dari 3</span>
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

        <Card className="!p-6 md:!p-8 shadow-md">
          <div className="text-center mb-6">
            <Logo size="lg" className="mx-auto mb-3 drop-shadow-md" />
            <h1 className={`font-bold text-gray-800 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
              Verifikasi Nomor Handphone
            </h1>
            <p className={`text-gray-600 mt-2 font-medium ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Masukkan 6 digit kode OTP yang kami kirimkan ke:
            </p>
            <p className="font-bold text-gray-900 mt-1">{targetPhone}</p>

            {/* Hint Kode Demo */}
            <div className="mt-3 inline-block bg-green-50 border border-green-300 text-secondary-dark font-medium text-xs px-3.5 py-1.5 rounded-lg">
              Kode OTP Demo: <strong className="font-mono text-sm tracking-wider font-bold">123456</strong>
            </div>

            {/* Stepper Visual */}
            <div className="flex items-center justify-center gap-2 mt-4" aria-hidden="true">
              <span className="w-8 h-2 rounded-full bg-secondary" />
              <span className="w-8 h-2 rounded-full bg-primary" />
              <span className="w-8 h-2 rounded-full bg-gray-300" />
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              <label htmlFor="otp-digit-0" className="sr-only">
                Masukkan enam digit kode verifikasi OTP
              </label>

              {/* 6 Input Digit Kotak */}
              <div
                className="flex justify-center gap-2 sm:gap-3"
                role="group"
                aria-label="Enam kotak input kode OTP"
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e.target)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    aria-label={`Digit ke ${idx + 1}`}
                    className={`text-center font-bold font-mono rounded-xl border bg-white text-gray-900 transition-default focus:ring-2 focus:ring-primary focus:border-primary border-gray-300 ${
                      isEasyMode
                        ? 'w-12 h-16 text-2xl min-h-[64px]'
                        : 'w-11 h-14 text-xl sm:w-12 sm:h-14'
                    }`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {/* Tombol Cepat Isi Demo */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleAutoFillDemo}
                  className="text-xs font-semibold text-secondary-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary p-1.5 rounded"
                >
                  ⚡ Klik di sini untuk isi kode demo otomatis
                </button>
              </div>

              {/* Status Feedback Message */}
              {statusMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-sm font-medium ${
                    statusMessage.type === 'success'
                      ? 'bg-green-50 border-green-300 text-green-900'
                      : statusMessage.type === 'error'
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle size={18} className="shrink-0 text-secondary" aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={18} className="shrink-0 text-red-600" aria-hidden="true" />
                  )}
                  <p className="flex-1">{statusMessage.text}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size={isEasyMode ? 'lg' : 'md'}
                fullWidth
                disabled={isVerifying}
                className="mt-2"
              >
                {isVerifying ? 'Memverifikasi...' : 'Verifikasi Sekarang'}
              </Button>
            </div>
          </form>

          {/* Kirim Ulang OTP */}
          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <p className={`text-gray-700 font-medium ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Belum menerima kode SMS?
            </p>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                className="mt-1 text-primary font-bold hover:underline inline-flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded p-1"
                aria-label="Kirim ulang kode OTP"
              >
                <RotateCw size={14} aria-hidden="true" />
                <span>Kirim Ulang Kode OTP</span>
              </button>
            ) : (
              <p className="text-xs text-gray-600 mt-1 font-mono font-medium">
                Kirim ulang tersedia dalam <strong>{countdown} detik</strong>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
