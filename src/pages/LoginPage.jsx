import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, HelpCircle, ArrowLeft } from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { login } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [identifier, setIdentifier] = useState('0812-3456-7890');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guideText =
    'Halaman Masuk SahabatPay. Silakan masukkan nomor handphone atau alamat email Anda, diikuti dengan password atau PIN akun. Anda dapat menekan tombol Masuk untuk melanjutkan ke Beranda, atau menekan tombol Butuh Bantuan jika mengalami kesulitan.';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      const err = 'Silakan masukkan nomor HP atau Email Anda.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    if (!password) {
      const err = 'Silakan masukkan kata sandi atau PIN Anda.';
      setErrorMessage(err);
      playErrorSound();
      if (isAudioMode) speakText(err);
      return;
    }

    setIsSubmitting(true);
    const result = await login({ identifier, password });
    setIsSubmitting(false);

    if (result.success) {
      playSuccessSound();
      if (isAudioMode) {
        speakText('Masuk berhasil! Selamat datang kembali di SahabatPay.');
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
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
      {/* Banner prototype notice */}
      <div className="w-full max-w-md mb-4 text-center">
        <p className="text-xs text-yellow-800 bg-yellow-100 border border-yellow-300 py-1.5 px-3 rounded-lg font-semibold inline-block">
          ⚠ PROTOTYPE SIMULASI — Akun demo siap digunakan
        </p>
      </div>

      <div className="w-full max-w-md">
        {/* Tombol kembali ke Welcome */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              stopSpeech();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-primary transition-default p-1 rounded-lg focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary"
            aria-label="Kembali ke halaman pilihan mode"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Pilihan Mode</span>
          </button>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-primary transition-default p-1 rounded-lg focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary"
            aria-label="Buka bantuan cara masuk akun"
          >
            <HelpCircle size={16} aria-hidden="true" />
            <span>Bantuan Masuk</span>
          </button>
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
          {/* Header dengan Logo Resmi SahabatPay */}
          <div className="text-center mb-6">
            <Logo size="lg" className="mx-auto mb-3 drop-shadow-md" />
            <h1 className={`font-bold text-gray-800 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
              Masuk ke SahabatPay
            </h1>
            <p className={`text-gray-600 mt-1 font-medium ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Satu Dompet, Semua Bisa.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="login-identifier"
              label="Nomor HP atau Email"
              type="text"
              placeholder="Contoh: 081234567890 / nama@email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              icon={<User size={18} />}
              autoComplete="username"
              required
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className={`font-semibold text-gray-800 ${isEasyMode ? 'text-lg' : 'text-sm'}`}
              >
                Kata Sandi / PIN Demo
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-hidden="true"
                >
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi/PIN demo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border bg-white text-gray-800 pl-10 pr-12 transition-default focus:ring-2 focus:ring-primary focus:border-primary ${
                    isEasyMode ? 'py-4 text-lg min-h-[64px]' : 'py-3 text-base min-h-[48px]'
                  } border-gray-300`}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-lg"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Announcement */}
            {errorMessage && (
              <div
                className="bg-red-50 border border-red-300 rounded-xl p-3 text-sm text-red-800 font-medium flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <span className="text-base" aria-hidden="true">
                  ⚠
                </span>
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
              {isSubmitting ? 'Memeriksa...' : 'Masuk Sekarang'}
            </Button>
          </form>

          {/* Link ke pendaftaran */}
          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <p className={`text-gray-700 font-medium ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Belum memiliki akun SahabatPay?{' '}
              <Link
                to="/register"
                onClick={stopSpeech}
                className="text-primary font-bold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded"
              >
                Daftar Akun Baru
              </Link>
            </p>
          </div>
        </Card>
      </div>

      {/* Modal Bantuan */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Bantuan Masuk Akun"
      >
        <div className="flex flex-col gap-3">
          <p className="text-gray-700">
            Untuk kemudahan Anda dalam mencoba prototype ini, kami telah menyediakan akun demo siap pakai:
          </p>
          <div className="bg-gray-100 p-3.5 rounded-xl border border-gray-300">
            <p className="font-bold text-gray-900">Akun Demo Resmi:</p>
            <p className="text-sm mt-1 text-gray-800">
              • Nomor HP: <strong className="text-primary font-bold">0812-3456-7890</strong>
            </p>
            <p className="text-sm text-gray-800">
              • PIN/Password: <strong className="text-primary font-bold">123456</strong>
            </p>
          </div>
          <p className="text-xs text-gray-600 font-medium">
            Jika Anda baru saja mendaftar melalui halaman pendaftaran, Anda juga dapat masuk menggunakan nomor HP dan password yang baru Anda buat.
          </p>
        </div>
      </Modal>
    </div>
  );
}
