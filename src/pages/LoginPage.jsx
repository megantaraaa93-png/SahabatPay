import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, CircleHelp, ArrowLeft, AlertCircle } from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { login } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [identifier, setIdentifier]       = useState('0812-3456-7890');
  const [password, setPassword]           = useState('123456');
  const [showPassword, setShowPassword]   = useState(false);
  const [errorMessage, setErrorMessage]   = useState('');
  const [isHelpOpen, setIsHelpOpen]       = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);

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
      if (isAudioMode) speakText('Masuk berhasil! Selamat datang kembali di SahabatPay.');
      navigate('/dashboard', { replace: true });
    } else {
      playErrorSound();
      setErrorMessage(result.message);
      if (isAudioMode) speakText(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col justify-center items-center px-4 py-8">
      {/* Prototype notice */}
      <div className="w-full max-w-md mb-4 text-center">
        <span className="sp-badge-forest text-xs py-1 px-3 rounded-lg">
          ⚠ PROTOTYPE SIMULASI — Akun demo siap digunakan
        </span>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {/* Back + Help row */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { stopSpeech(); navigate('/'); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-forest transition-all duration-200 p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
            aria-label="Kembali ke halaman pilihan mode"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Pilihan Mode</span>
          </button>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-muted hover:text-brand-forest transition-all duration-200 p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
            aria-label="Buka bantuan cara masuk akun"
          >
            <CircleHelp size={16} aria-hidden="true" />
            <span>Bantuan</span>
          </button>
        </div>

        {/* Audio Guide */}
        <div className="mb-5">
          <AudioGuideBar
            instructionText={guideText}
            isPlaying={isPlaying}
            onPlay={speakText}
            onStop={stopSpeech}
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-brand-border shadow-card-md p-6 md:p-8">
          {/* Brand header */}
          <div className="text-center mb-7">
            <Logo size="lg" className="mx-auto mb-4" />
            <h1 className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
              Masuk ke SahabatPay
            </h1>
            <p className={`text-brand-muted mt-1 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Satu Dompet, Semua Bisa.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="login-identifier"
              label="Nomor HP atau Email"
              type="text"
              placeholder="081234567890 atau nama@email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              icon={<User size={17} />}
              autoComplete="username"
              required
            />

            {/* Password field manual (show/hide toggle) */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}
              >
                Kata Sandi / PIN Demo
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" aria-hidden="true">
                  <Lock size={17} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi / PIN"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border border-brand-border bg-white text-brand-charcoal pl-10 pr-12
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest
                    placeholder:text-brand-muted/50
                    ${isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[44px]'}`}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-muted hover:text-brand-charcoal rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {errorMessage && (
              <div
                className="sp-alert-error flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-brand-coral" aria-hidden="true" />
                <p className="flex-1">{errorMessage}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              loading={isSubmitting}
              className="mt-1"
            >
              {isSubmitting ? 'Memeriksa...' : 'Masuk Sekarang'}
            </Button>
          </form>

          {/* Register link */}
          <div className="mt-6 pt-5 border-t border-brand-border text-center">
            <p className={`text-brand-muted ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Belum memiliki akun?{' '}
              <Link
                to="/register"
                onClick={stopSpeech}
                className="text-brand-forest font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest rounded"
              >
                Daftar Akun Baru
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Bantuan Masuk Akun">
        <div className="flex flex-col gap-3">
          <p className="text-brand-charcoal">
            Untuk kemudahan Anda dalam mencoba prototype ini, kami telah menyediakan akun demo siap pakai:
          </p>
          <div className="bg-brand-cream p-4 rounded-xl border border-brand-border">
            <p className="font-bold text-brand-charcoal mb-2">Akun Demo Resmi:</p>
            <p className="text-sm text-brand-charcoal">
              • Nomor HP:{' '}
              <strong className="text-brand-forest font-bold">0812-3456-7890</strong>
            </p>
            <p className="text-sm text-brand-charcoal mt-1">
              • PIN/Password:{' '}
              <strong className="text-brand-forest font-bold">123456</strong>
            </p>
          </div>
          <p className="text-xs text-brand-muted">
            Jika Anda baru saja mendaftar melalui halaman pendaftaran, Anda juga dapat masuk menggunakan nomor HP dan password yang baru Anda buat.
          </p>
        </div>
      </Modal>
    </div>
  );
}
