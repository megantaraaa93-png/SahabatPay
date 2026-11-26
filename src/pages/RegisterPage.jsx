import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { register } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors]             = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guideText =
    'Halaman Pendaftaran Akun SahabatPay. Langkah satu dari tiga. Lengkapi nama lengkap, nomor handphone, alamat email, kata sandi, dan konfirmasi kata sandi Anda. Jangan lupa menyetujui syarat dan ketentuan simulasi.';

  const handleChange = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.fullName.trim()) e.fullName = 'Nama lengkap wajib diisi.';
    else if (formData.fullName.trim().length < 3) e.fullName = 'Nama lengkap minimal 3 karakter.';
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) e.phone = 'Nomor handphone wajib diisi.';
    else if (cleanPhone.length < 9 || cleanPhone.length > 14) e.phone = 'Nomor handphone tidak valid (minimal 10 digit).';
    if (!formData.email.trim()) e.email = 'Alamat email wajib diisi.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Format alamat email belum tepat.';
    if (!formData.password) e.password = 'Kata sandi wajib diisi.';
    else if (formData.password.length < 6) e.password = 'Kata sandi minimal 6 karakter.';
    if (!formData.confirmPassword) e.confirmPassword = 'Wajib mengonfirmasi kata sandi.';
    else if (formData.confirmPassword !== formData.password) e.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
    if (!formData.agreeTerms) e.agreeTerms = 'Anda harus menyetujui ketentuan simulasi prototype ini.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      playErrorSound();
      if (isAudioMode) speakText(`Pendaftaran belum dapat diproses. ${Object.values(validationErrors)[0]}`);
      return;
    }
    setIsSubmitting(true);
    await register({ fullName: formData.fullName, phone: formData.phone, email: formData.email, password: formData.password });
    setIsSubmitting(false);
    playSuccessSound();
    if (isAudioMode) speakText('Data pendaftaran berhasil disimpan. Melanjutkan ke langkah verifikasi kode OTP.');
    navigate('/verification');
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Back + step indicator */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { stopSpeech(); navigate('/login'); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal hover:text-brand-forest transition-all duration-200 p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
            aria-label="Kembali ke halaman masuk"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Kembali</span>
          </button>
          <span className="sp-badge-forest">Langkah 1 dari 3</span>
        </div>

        {/* Audio Guide */}
        <div className="mb-5">
          <AudioGuideBar instructionText={guideText} isPlaying={isPlaying} onPlay={speakText} onStop={stopSpeech} />
        </div>

        <div className="bg-white rounded-2xl border border-brand-border shadow-card-md p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <Logo size="lg" className="mx-auto mb-4" />
            <h1 className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
              Daftar Akun Baru
            </h1>
            <p className={`text-brand-muted mt-1 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Bergabung bersama SahabatPay dan nikmati kemudahan transaksi inklusif.
            </p>
            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mt-4" aria-hidden="true">
              <span className="w-8 h-1.5 rounded-full bg-brand-forest" />
              <span className="w-8 h-1.5 rounded-full bg-brand-border" />
              <span className="w-8 h-1.5 rounded-full bg-brand-border" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="reg-fullname"
              label="Nama Lengkap"
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              icon={<User size={17} />}
              error={errors.fullName}
              required
            />
            <Input
              id="reg-phone"
              label="Nomor Handphone"
              type="tel"
              placeholder="Contoh: 081234567890"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              icon={<Phone size={17} />}
              hint="Kode OTP akan dikirimkan ke nomor ini (simulasi demo)."
              error={errors.phone}
              required
            />
            <Input
              id="reg-email"
              label="Alamat Email"
              type="email"
              placeholder="Contoh: nama@domain.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              icon={<Mail size={17} />}
              error={errors.email}
              required
            />

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" aria-hidden="true">
                  <Lock size={17} />
                </span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full rounded-xl border bg-white text-brand-charcoal pl-10 pr-12
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest
                    placeholder:text-brand-muted/50
                    ${isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[44px]'}
                    ${errors.password ? 'border-brand-coral bg-brand-coral/5' : 'border-brand-border'}`}
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
              {errors.password && (
                <p className="text-xs text-brand-coral font-medium flex items-center gap-1.5" role="alert">
                  <AlertCircle size={13} aria-hidden="true" /> {errors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-confirm-password" className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" aria-hidden="true">
                  <Lock size={17} />
                </span>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi Anda"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`w-full rounded-xl border bg-white text-brand-charcoal pl-10 pr-4
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest
                    placeholder:text-brand-muted/50
                    ${isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[44px]'}
                    ${errors.confirmPassword ? 'border-brand-coral bg-brand-coral/5' : 'border-brand-border'}`}
                  required
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-brand-coral font-medium flex items-center gap-1.5" role="alert">
                  <AlertCircle size={13} aria-hidden="true" /> {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Agree Terms */}
            <div className="mt-1">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="reg-agree-terms"
                  checked={formData.agreeTerms}
                  onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                  className={`mt-1 rounded accent-brand-forest focus:ring-brand-forest ${isEasyMode ? 'w-6 h-6' : 'w-4 h-4'}`}
                />
                <span className={`text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-xs leading-relaxed'}`}>
                  Saya menyetujui bahwa ini adalah{' '}
                  <strong className="font-bold">prototype simulasi</strong>, tidak menggunakan uang riil, dan tidak mengumpulkan data sensitif perbankan asli.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-xs text-brand-coral font-medium mt-1 flex items-center gap-1.5" role="alert">
                  <AlertCircle size={13} aria-hidden="true" /> {errors.agreeTerms}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              loading={isSubmitting}
              className="mt-3"
            >
              {isSubmitting ? 'Menyimpan...' : 'Lanjutkan ke Verifikasi'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-brand-border text-center">
            <p className={`text-brand-muted ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Sudah memiliki akun?{' '}
              <Link
                to="/login"
                onClick={stopSpeech}
                className="text-brand-forest font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest rounded"
              >
                Masuk di Sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
